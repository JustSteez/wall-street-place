// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {WallStreetPlace} from "../src/WallStreetPlace.sol";
import {SeasonSnapshot} from "../src/SeasonSnapshot.sol";
import {MockStockToken} from "../src/testnet/MockStockToken.sol";

/// @dev Mimics a vibe/vibe launch token: no burn function, and every transfer except the
///      curve's is locked until the curve graduates and calls unlockTransfers().
contract LockedLaunchToken is ERC20 {
    address public immutable curve;
    bool public transfersUnlocked;

    error TransfersLocked();

    constructor(address curve_) ERC20("WALL STREET PLACE", "PLACE") {
        curve = curve_;
        _mint(curve_, 1_000_000_000 ether);
    }

    function unlockTransfers() external {
        require(msg.sender == curve, "OnlyCurve");
        transfersUnlocked = true;
    }

    function _update(address from, address to, uint256 value) internal override {
        if (!transfersUnlocked && from != address(0) && from != curve) revert TransfersLocked();
        super._update(from, to, value);
    }
}

contract LaunchpadTokenTest is Test {
    address constant DEAD = 0x000000000000000000000000000000000000dEaD;
    uint256 constant SKIP_COST = 10 ether;
    uint256 constant PROTECT_COST = 25 ether;
    uint256 constant MINT_COST = 100 ether;

    address owner = makeAddr("owner");
    address curve = makeAddr("curve");
    address alice = makeAddr("alice");

    LockedLaunchToken place;
    WallStreetPlace canvas;
    SeasonSnapshot snapshot;
    MockStockToken nvda;

    function setUp() public {
        vm.warp(1_000_000);
        place = new LockedLaunchToken(curve);
        canvas = new WallStreetPlace(owner, IERC20(address(place)), 7 days, 30, SKIP_COST, PROTECT_COST);
        snapshot = new SeasonSnapshot(owner, canvas, IERC20(address(place)), MINT_COST);
        nvda = new MockStockToken("Test NVDA", "tNVDA", owner);

        vm.startPrank(owner);
        canvas.addTeam(address(nvda), 0, "NVDA");
        nvda.mint(alice, 1 ether);
        vm.stopPrank();

        // Alice buys PLACE from the curve (the curve can always send).
        vm.prank(curve);
        place.transfer(alice, 1_000 ether);

        vm.startPrank(alice);
        place.approve(address(canvas), type(uint256).max);
        place.approve(address(snapshot), type(uint256).max);
        vm.stopPrank();
    }

    function test_paintingWorksWhileTokenLocked() public {
        vm.prank(alice);
        canvas.place(1, 1, 5, 1);
        assertEq(canvas.teamPixels(1)[1], 1);
    }

    function test_paidActionsRevertWhileTokenLocked() public {
        vm.startPrank(alice);
        vm.expectRevert(LockedLaunchToken.TransfersLocked.selector);
        canvas.placeBoosted(1, 1, 5, 1, SKIP_COST);

        canvas.place(2, 2, 5, 1);
        vm.expectRevert(LockedLaunchToken.TransfersLocked.selector);
        canvas.protect(2, 2, PROTECT_COST);
        vm.stopPrank();
    }

    function test_paidActionsSendToDeadAfterGraduation() public {
        vm.prank(curve);
        place.unlockTransfers();

        vm.startPrank(alice);
        canvas.placeBoosted(1, 1, 5, 1, SKIP_COST);
        canvas.protect(1, 1, PROTECT_COST);
        vm.stopPrank();

        assertEq(place.balanceOf(DEAD), SKIP_COST + PROTECT_COST);
        assertEq(place.balanceOf(alice), 1_000 ether - SKIP_COST - PROTECT_COST);
        assertEq(place.balanceOf(address(canvas)), 0);
    }

    function test_snapshotMintSendsToDeadAfterGraduation() public {
        vm.prank(alice);
        canvas.place(1, 1, 5, 1);
        vm.warp(block.timestamp + 7 days);
        canvas.rollSeason();

        vm.prank(alice);
        vm.expectRevert(LockedLaunchToken.TransfersLocked.selector);
        snapshot.mint(1, MINT_COST);

        vm.prank(curve);
        place.unlockTransfers();
        vm.prank(alice);
        snapshot.mint(1, MINT_COST);
        assertEq(place.balanceOf(DEAD), MINT_COST);
        assertEq(snapshot.ownerOf(1), alice);
    }
}
