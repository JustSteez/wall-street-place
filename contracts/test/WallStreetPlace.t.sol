// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {WallStreetPlace} from "../src/WallStreetPlace.sol";
import {PlaceToken} from "../src/PlaceToken.sol";
import {MockStockToken} from "../src/testnet/MockStockToken.sol";

/// @dev ERC-20 without uiMultiplier(), like a token that predates ERC-8056.
contract PlainToken is ERC20 {
    constructor() ERC20("Plain", "PLN") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract WallStreetPlaceTest is Test {
    uint64 constant SEASON = 7 days;
    uint64 constant COOLDOWN = 30;
    uint256 constant SKIP_COST = 10 ether;
    uint256 constant PROTECT_COST = 25 ether;

    address owner = makeAddr("owner");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address nobody = makeAddr("nobody");

    PlaceToken place;
    WallStreetPlace canvas;
    MockStockToken nvda;
    MockStockToken tsla;

    uint8 constant NVDA = 1;
    uint8 constant TSLA = 2;

    function setUp() public {
        vm.warp(1_000_000);
        place = new PlaceToken(owner);
        canvas = new WallStreetPlace(owner, place, SEASON, COOLDOWN, SKIP_COST, PROTECT_COST);
        nvda = new MockStockToken("Test NVDA", "tNVDA", owner);
        tsla = new MockStockToken("Test TSLA", "tTSLA", owner);

        vm.startPrank(owner);
        canvas.addTeam(address(nvda), 0.1 ether, "NVDA");
        canvas.addTeam(address(tsla), 0.1 ether, "TSLA");
        nvda.mint(alice, 1 ether);
        tsla.mint(bob, 1 ether);
        place.transfer(alice, 1_000 ether);
        place.transfer(bob, 1_000 ether);
        vm.stopPrank();

        vm.prank(alice);
        place.approve(address(canvas), type(uint256).max);
        vm.prank(bob);
        place.approve(address(canvas), type(uint256).max);
    }

    // ------------------------------------------------------------ deployment

    function test_constructor_startsSeasonOne() public view {
        assertEq(canvas.currentSeason(), 1);
        assertEq(canvas.seasonEndsAt(), block.timestamp + SEASON);
        assertEq(canvas.cooldown(), COOLDOWN);
        assertEq(canvas.owner(), owner);
        assertEq(canvas.teamCount(), 2);
    }

    function test_constructor_rejectsOutOfRangeConfig() public {
        vm.expectRevert(WallStreetPlace.OutOfRange.selector);
        new WallStreetPlace(owner, place, 1 minutes, COOLDOWN, SKIP_COST, PROTECT_COST);
        vm.expectRevert(WallStreetPlace.OutOfRange.selector);
        new WallStreetPlace(owner, place, SEASON, 1, SKIP_COST, PROTECT_COST);
        vm.expectRevert(WallStreetPlace.OutOfRange.selector);
        new WallStreetPlace(owner, place, SEASON, COOLDOWN, 1_001 ether, PROTECT_COST);
    }

    function test_placeToken_fixedSupplyToTreasury() public view {
        assertEq(place.totalSupply(), 1_000_000_000 ether);
        assertEq(place.balanceOf(owner), 1_000_000_000 ether - 2_000 ether);
    }

    // ------------------------------------------------------------ painting

    function test_place_writesPixelAndCountsTeam() public {
        vm.prank(alice);
        canvas.place(10, 20, 5, NVDA);

        (uint8 team, uint8 color) = canvas.getPixel(1, 10, 20);
        assertEq(team, NVDA);
        assertEq(color, 5);
        assertEq(canvas.teamPixels(1)[NVDA], 1);
        assertEq(canvas.leader(), NVDA);
        assertEq(canvas.nextPlaceAt(alice), block.timestamp + COOLDOWN);
    }

    function test_place_emitsEvent() public {
        vm.expectEmit(address(canvas));
        emit WallStreetPlace.PixelPlaced(1, 3, 4, 7, NVDA, alice, false);
        vm.prank(alice);
        canvas.place(3, 4, 7, NVDA);
    }

    function test_place_overwriteMovesPixelBetweenTeams() public {
        vm.prank(alice);
        canvas.place(0, 0, 1, NVDA);
        vm.prank(bob);
        canvas.place(0, 0, 2, TSLA);

        uint32[16] memory counts = canvas.teamPixels(1);
        assertEq(counts[NVDA], 0);
        assertEq(counts[TSLA], 1);
        (uint8 team, uint8 color) = canvas.getPixel(1, 0, 0);
        assertEq(team, TSLA);
        assertEq(color, 2);
    }

    function test_place_revertsForNonHolder() public {
        vm.prank(nobody);
        vm.expectRevert(abi.encodeWithSelector(WallStreetPlace.NotAHolder.selector, NVDA));
        canvas.place(0, 0, 1, NVDA);
    }

    function test_place_revertsForWrongTeam() public {
        vm.prank(alice); // holds NVDA, not TSLA
        vm.expectRevert(abi.encodeWithSelector(WallStreetPlace.NotAHolder.selector, TSLA));
        canvas.place(0, 0, 1, TSLA);
    }

    function test_place_revertsBelowMinShares() public {
        vm.prank(owner);
        nvda.mint(nobody, 0.05 ether);
        vm.prank(nobody);
        vm.expectRevert(abi.encodeWithSelector(WallStreetPlace.NotAHolder.selector, NVDA));
        canvas.place(0, 0, 1, NVDA);
    }

    function test_place_respectsUiMultiplier() public {
        // 0.05 tokens after a 4:1 split = 0.2 shares, above the 0.1 share minimum.
        vm.startPrank(owner);
        nvda.mint(nobody, 0.05 ether);
        nvda.setUiMultiplier(4e18);
        vm.stopPrank();

        assertEq(canvas.sharesOf(nobody, NVDA), 0.2 ether);
        vm.prank(nobody);
        canvas.place(0, 0, 1, NVDA);
    }

    function test_place_tokenWithoutMultiplierCountsOneToOne() public {
        PlainToken plain = new PlainToken();
        vm.prank(owner);
        canvas.addTeam(address(plain), 0, "PLN");
        plain.mint(nobody, 1);

        assertEq(canvas.sharesOf(nobody, 3), 1);
        vm.prank(nobody);
        canvas.place(0, 0, 1, 3);
    }

    function test_place_zeroBalanceNeverQualifiesEvenWithZeroMinimum() public {
        vm.prank(owner);
        canvas.setTeamMinShares(NVDA, 0);
        assertFalse(canvas.isHolder(nobody, NVDA));
    }

    function test_place_revertsOutOfBounds() public {
        vm.startPrank(alice);
        vm.expectRevert(WallStreetPlace.OutOfBounds.selector);
        canvas.place(100, 0, 1, NVDA);
        vm.expectRevert(WallStreetPlace.OutOfBounds.selector);
        canvas.place(0, 100, 1, NVDA);
        vm.stopPrank();
    }

    function test_place_revertsInvalidColor() public {
        vm.prank(alice);
        vm.expectRevert(WallStreetPlace.InvalidColor.selector);
        canvas.place(0, 0, 16, NVDA);
    }

    function test_place_revertsInvalidTeam() public {
        vm.startPrank(alice);
        vm.expectRevert(WallStreetPlace.InvalidTeam.selector);
        canvas.place(0, 0, 1, 0);
        vm.expectRevert(WallStreetPlace.InvalidTeam.selector);
        canvas.place(0, 0, 1, 3);
        vm.stopPrank();
    }

    function test_place_enforcesCooldown() public {
        vm.startPrank(alice);
        canvas.place(0, 0, 1, NVDA);
        vm.expectRevert(abi.encodeWithSelector(WallStreetPlace.CooldownActive.selector, block.timestamp + COOLDOWN));
        canvas.place(1, 0, 1, NVDA);

        vm.warp(block.timestamp + COOLDOWN);
        canvas.place(1, 0, 1, NVDA);
        vm.stopPrank();
    }

    // ------------------------------------------------------------ boosts

    function test_placeBoosted_skipsCooldownAndBurns() public {
        uint256 supplyBefore = place.totalSupply();
        vm.startPrank(alice);
        canvas.place(0, 0, 1, NVDA);
        canvas.placeBoosted(1, 0, 1, NVDA, SKIP_COST);
        vm.stopPrank();

        assertEq(place.balanceOf(alice), 1_000 ether - SKIP_COST);
        assertEq(place.totalSupply(), supplyBefore - SKIP_COST);
        assertEq(canvas.teamPixels(1)[NVDA], 2);
    }

    function test_placeBoosted_revertsWithoutAllowance() public {
        vm.prank(alice);
        place.approve(address(canvas), 0);
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, address(canvas), 0, SKIP_COST)
        );
        canvas.placeBoosted(0, 0, 1, NVDA, SKIP_COST);
    }

    function test_placeBoosted_stillRequiresHolding() public {
        vm.prank(owner);
        place.transfer(nobody, 100 ether);
        vm.startPrank(nobody);
        place.approve(address(canvas), type(uint256).max);
        vm.expectRevert(abi.encodeWithSelector(WallStreetPlace.NotAHolder.selector, NVDA));
        canvas.placeBoosted(0, 0, 1, NVDA, SKIP_COST);
        vm.stopPrank();
    }

    // ------------------------------------------------------------ protection

    function test_protect_blocksOverwriteUntilExpiry() public {
        vm.startPrank(alice);
        canvas.place(5, 5, 1, NVDA);
        canvas.protect(5, 5, PROTECT_COST);
        vm.stopPrank();
        uint64 until = uint64(block.timestamp + 1 hours);
        assertEq(canvas.protectedUntil(1, 5 * 100 + 5), until);
        assertEq(place.balanceOf(alice), 1_000 ether - PROTECT_COST);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(WallStreetPlace.PixelIsProtected.selector, until));
        canvas.place(5, 5, 2, TSLA);

        vm.warp(until);
        vm.prank(bob);
        canvas.place(5, 5, 2, TSLA);
    }

    function test_protect_requiresHoldingPixelTeam() public {
        vm.prank(alice);
        canvas.place(5, 5, 1, NVDA);
        vm.prank(bob); // TSLA holder cannot protect an NVDA pixel
        vm.expectRevert(abi.encodeWithSelector(WallStreetPlace.NotAHolder.selector, NVDA));
        canvas.protect(5, 5, PROTECT_COST);
    }

    function test_protect_revertsOnEmptyPixel() public {
        vm.prank(alice);
        vm.expectRevert(WallStreetPlace.EmptyPixel.selector);
        canvas.protect(9, 9, PROTECT_COST);
    }

    function test_protect_cannotStack() public {
        vm.startPrank(alice);
        canvas.place(5, 5, 1, NVDA);
        canvas.protect(5, 5, PROTECT_COST);
        vm.expectRevert(abi.encodeWithSelector(WallStreetPlace.AlreadyProtected.selector, block.timestamp + 1 hours));
        canvas.protect(5, 5, PROTECT_COST);
        vm.stopPrank();
    }

    // ------------------------------------------------------------ seasons

    function test_season_rollsOnFirstActionAfterEnd() public {
        vm.prank(alice);
        canvas.place(0, 0, 1, NVDA);
        vm.warp(block.timestamp + SEASON);

        vm.expectEmit(address(canvas));
        emit WallStreetPlace.SeasonEnded(1, NVDA);
        vm.prank(bob);
        canvas.place(0, 0, 2, TSLA);

        assertEq(canvas.currentSeason(), 2);
        assertEq(canvas.seasonWinner(1), NVDA);
        // Season 1 is frozen, season 2 starts blank except bob's pixel.
        (uint8 oldTeam,) = canvas.getPixel(1, 0, 0);
        assertEq(oldTeam, NVDA);
        assertEq(canvas.teamPixels(2)[NVDA], 0);
        assertEq(canvas.teamPixels(2)[TSLA], 1);
    }

    function test_rollSeason_publicAfterEnd() public {
        vm.expectRevert(WallStreetPlace.SeasonNotOver.selector);
        canvas.rollSeason();

        vm.warp(block.timestamp + SEASON);
        canvas.rollSeason();
        assertEq(canvas.currentSeason(), 2);
        assertEq(canvas.seasonWinner(1), 0); // nobody painted
        assertEq(canvas.seasonEndsAt(), block.timestamp + SEASON);
    }

    function test_season_tieGoesToLowerTeamId() public {
        vm.prank(bob);
        canvas.place(0, 0, 1, TSLA);
        vm.prank(alice);
        canvas.place(1, 0, 1, NVDA);
        assertEq(canvas.leader(), NVDA);
    }

    function test_protection_doesNotCarryIntoNextSeason() public {
        vm.startPrank(alice);
        canvas.place(5, 5, 1, NVDA);
        canvas.protect(5, 5, PROTECT_COST);
        vm.stopPrank();
        vm.warp(block.timestamp + SEASON); // > protection, but also new season
        vm.prank(bob);
        canvas.place(5, 5, 2, TSLA);
        assertEq(canvas.currentSeason(), 2);
    }

    // ------------------------------------------------------------ canvas view

    function test_getCanvas_matchesPixels() public {
        vm.prank(alice);
        canvas.place(0, 0, 3, NVDA);
        vm.warp(block.timestamp + COOLDOWN);
        vm.prank(alice);
        canvas.place(99, 99, 15, NVDA);
        vm.prank(bob);
        canvas.place(31, 0, 4, TSLA); // last byte of word 0
        vm.warp(block.timestamp + COOLDOWN);
        vm.prank(bob);
        canvas.place(32, 0, 6, TSLA); // first byte of word 1

        bytes memory c = canvas.getCanvas(1);
        assertEq(c.length, 10_000);
        assertEq(uint8(c[0]), (NVDA << 4) | 3);
        assertEq(uint8(c[9_999]), (NVDA << 4) | 15);
        assertEq(uint8(c[31]), (TSLA << 4) | 4);
        assertEq(uint8(c[32]), (TSLA << 4) | 6);
        assertEq(uint8(c[1]), 0);
    }

    function testFuzz_placeThenRead(uint8 x, uint8 y, uint8 color) public {
        x = uint8(bound(x, 0, 99));
        y = uint8(bound(y, 0, 99));
        color = uint8(bound(color, 0, 15));
        vm.prank(alice);
        canvas.place(x, y, color, NVDA);
        (uint8 team, uint8 c) = canvas.getPixel(1, x, y);
        assertEq(team, NVDA);
        assertEq(c, color);
        assertEq(uint8(canvas.getCanvas(1)[uint256(y) * 100 + x]), (NVDA << 4) | color);
    }

    // ------------------------------------------------------------ admin

    function test_admin_onlyOwner() public {
        vm.startPrank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        canvas.addTeam(address(1), 0, "X");
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        canvas.setCooldown(60);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        canvas.setCosts(0, 0);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        canvas.setSeasonDuration(1 days);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        canvas.setTeamMinShares(NVDA, 0);
        vm.stopPrank();
    }

    function test_addTeam_validation() public {
        vm.startPrank(owner);
        vm.expectRevert(WallStreetPlace.ZeroAddress.selector);
        canvas.addTeam(address(0), 0, "X");
        vm.expectRevert(WallStreetPlace.DuplicateTeam.selector);
        canvas.addTeam(address(nvda), 0, "NVDA");
        vm.expectRevert(WallStreetPlace.InvalidTicker.selector);
        canvas.addTeam(address(1), 0, "");
        vm.expectRevert(WallStreetPlace.InvalidTicker.selector);
        canvas.addTeam(address(1), 0, "ELEVENCHARS");

        vm.expectRevert(WallStreetPlace.InvalidTicker.selector);
        canvas.addTeam(address(1), 0, "nvda");
        vm.expectRevert(WallStreetPlace.InvalidTicker.selector);
        canvas.addTeam(address(1), 0, 'A"B');
        vm.expectRevert(WallStreetPlace.NotAToken.selector);
        canvas.addTeam(address(0xBEEF), 0, "EOA");
        address big = address(new PlainToken());
        vm.expectRevert(WallStreetPlace.OutOfRange.selector);
        canvas.addTeam(big, 2 ether, "BIG");

        for (uint256 i = 3; i <= 15; ++i) {
            canvas.addTeam(address(new PlainToken()), 0, "BRK.B");
        }
        address extra = address(new PlainToken());
        vm.expectRevert(WallStreetPlace.TooManyTeams.selector);
        canvas.addTeam(extra, 0, "T");
        vm.stopPrank();
    }

    function test_admin_settersUpdateAndBound() public {
        vm.startPrank(owner);
        canvas.setCooldown(60);
        assertEq(canvas.cooldown(), 60);
        canvas.setCosts(1 ether, 2 ether);
        assertEq(canvas.skipCooldownCost(), 1 ether);
        assertEq(canvas.protectCost(), 2 ether);
        canvas.setSeasonDuration(1 days);
        assertEq(canvas.seasonDuration(), 1 days);
        (, uint96 minShares,) = canvas.getTeam(NVDA);
        assertEq(minShares, 0.1 ether);
        canvas.setTeamMinShares(NVDA, 1 ether);
        (, minShares,) = canvas.getTeam(NVDA);
        assertEq(minShares, 1 ether);
        vm.expectRevert(WallStreetPlace.OutOfRange.selector);
        canvas.setTeamMinShares(NVDA, 1 ether + 1);

        vm.expectRevert(WallStreetPlace.OutOfRange.selector);
        canvas.setCooldown(2 days);
        vm.expectRevert(WallStreetPlace.OutOfRange.selector);
        canvas.setSeasonDuration(91 days);
        vm.expectRevert(WallStreetPlace.OutOfRange.selector);
        canvas.setCosts(0, 1_001 ether);
        vm.stopPrank();
    }

    function test_teamTicker() public view {
        assertEq(canvas.teamTicker(0), "");
        assertEq(canvas.teamTicker(NVDA), "NVDA");
    }

    // ------------------------------------------------------------ review fixes

    function test_maxCost_protectsAgainstCostIncrease() public {
        vm.prank(owner);
        canvas.setCosts(500 ether, 500 ether);
        vm.startPrank(alice);
        vm.expectRevert(abi.encodeWithSelector(WallStreetPlace.CostAboveMax.selector, 500 ether, SKIP_COST));
        canvas.placeBoosted(0, 0, 1, NVDA, SKIP_COST);
        canvas.place(0, 0, 1, NVDA);
        vm.expectRevert(abi.encodeWithSelector(WallStreetPlace.CostAboveMax.selector, 500 ether, PROTECT_COST));
        canvas.protect(0, 0, PROTECT_COST);
        vm.stopPrank();
        assertEq(place.balanceOf(alice), 1_000 ether);
    }

    function test_zeroCost_burnsNothingAndNeedsNoAllowance() public {
        vm.prank(owner);
        canvas.setCosts(0, 0);
        vm.prank(alice);
        place.approve(address(canvas), 0);
        vm.prank(alice);
        canvas.placeBoosted(0, 0, 1, NVDA, 0);
        assertEq(place.balanceOf(alice), 1_000 ether);
    }

    function test_multiplier_zeroOrAbsurdFallsBackToOne() public {
        vm.startPrank(owner);
        nvda.setUiMultiplier(0);
        assertEq(canvas.sharesOf(alice, NVDA), 1 ether);
        nvda.setUiMultiplier(1e31);
        assertEq(canvas.sharesOf(alice, NVDA), 1 ether);
        vm.stopPrank();
    }

    function test_season_keepsCadenceFromPreviousEnd() public {
        uint64 firstEnd = canvas.seasonEndsAt();
        vm.warp(firstEnd + 1 hours);
        canvas.rollSeason();
        assertEq(canvas.seasonEndsAt(), firstEnd + SEASON);
    }

    function test_season_skippedSeasonsRestartFromNow() public {
        vm.warp(block.timestamp + 3 * SEASON);
        canvas.rollSeason();
        assertEq(canvas.currentSeason(), 2);
        assertEq(canvas.seasonEndsAt(), block.timestamp + SEASON);
    }
}
