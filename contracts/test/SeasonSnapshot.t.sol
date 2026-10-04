// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {WallStreetPlace} from "../src/WallStreetPlace.sol";
import {SeasonSnapshot} from "../src/SeasonSnapshot.sol";
import {CanvasRenderer} from "../src/CanvasRenderer.sol";
import {PlaceToken} from "../src/PlaceToken.sol";
import {PlaceFaucet} from "../src/testnet/PlaceFaucet.sol";
import {MockStockToken} from "../src/testnet/MockStockToken.sol";

contract RendererHarness {
    function bmp(bytes memory canvas) external pure returns (bytes memory) {
        return CanvasRenderer.toBmp(canvas);
    }
}

contract SeasonSnapshotTest is Test {
    uint256 constant MINT_COST = 100 ether;

    address owner = makeAddr("owner");
    address alice = makeAddr("alice");

    PlaceToken place;
    WallStreetPlace canvas;
    SeasonSnapshot snapshot;
    MockStockToken nvda;

    function setUp() public {
        vm.warp(1_000_000);
        place = new PlaceToken(owner);
        canvas = new WallStreetPlace(owner, place, 7 days, 30, 10 ether, 25 ether);
        snapshot = new SeasonSnapshot(owner, canvas, place, MINT_COST);
        nvda = new MockStockToken("Test NVDA", "tNVDA", owner);

        vm.startPrank(owner);
        canvas.addTeam(address(nvda), 0, "NVDA");
        nvda.mint(alice, 1 ether);
        place.transfer(alice, 1_000 ether);
        vm.stopPrank();

        vm.startPrank(alice);
        place.approve(address(snapshot), type(uint256).max);
        canvas.place(0, 0, 5, 1);
        vm.stopPrank();
    }

    function test_mint_revertsForLiveOrFutureSeason() public {
        vm.startPrank(alice);
        vm.expectRevert(SeasonSnapshot.SeasonNotFinished.selector);
        snapshot.mint(1, MINT_COST);
        vm.expectRevert(SeasonSnapshot.SeasonNotFinished.selector);
        snapshot.mint(0, MINT_COST);
        vm.stopPrank();
    }

    function test_mint_burnsAndMintsFinishedSeason() public {
        vm.warp(block.timestamp + 7 days);
        canvas.rollSeason();

        uint256 supplyBefore = place.totalSupply();
        vm.prank(alice);
        uint256 id = snapshot.mint(1, MINT_COST);

        assertEq(id, 1);
        assertEq(snapshot.ownerOf(1), alice);
        assertEq(snapshot.seasonOf(1), 1);
        assertEq(snapshot.mintedPerSeason(1), 1);
        assertEq(place.totalSupply(), supplyBefore - MINT_COST);
    }

    function test_tokenURI_isOnChainJsonWithWinner() public {
        vm.warp(block.timestamp + 7 days);
        canvas.rollSeason();
        vm.prank(alice);
        snapshot.mint(1, MINT_COST);

        string memory uri = snapshot.tokenURI(1);
        assertEq(_prefix(uri, 29), "data:application/json;base64,");
        string memory json = string(_b64decode(_slice(uri, 29)));
        assertTrue(_contains(json, '"Winning Team","value":"NVDA"'));
        assertTrue(_contains(json, "data:image/svg+xml;base64,"));
    }

    function test_tokenURI_noWinnerShowsNone() public {
        vm.warp(block.timestamp + 7 days);
        canvas.rollSeason(); // season 1 has NVDA
        vm.warp(block.timestamp + 7 days);
        canvas.rollSeason(); // season 2 empty
        vm.prank(alice);
        snapshot.mint(2, MINT_COST);
        string memory json = string(_b64decode(_slice(snapshot.tokenURI(1), 29)));
        assertTrue(_contains(json, '"Winning Team","value":"None"'));
    }

    function test_mint_maxCostGuard() public {
        vm.warp(block.timestamp + 7 days);
        canvas.rollSeason();
        vm.prank(owner);
        snapshot.setMintCost(1_000 ether);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(SeasonSnapshot.CostAboveMax.selector, 1_000 ether, MINT_COST));
        snapshot.mint(1, MINT_COST);
    }

    function test_setMintCost_ownerAndBounded() public {
        vm.prank(alice);
        vm.expectRevert();
        snapshot.setMintCost(1);
        vm.startPrank(owner);
        snapshot.setMintCost(5 ether);
        assertEq(snapshot.mintCost(), 5 ether);
        vm.expectRevert(SeasonSnapshot.OutOfRange.selector);
        snapshot.setMintCost(10_001 ether);
        vm.stopPrank();
    }

    function test_renderer_bmpLayout() public {
        RendererHarness h = new RendererHarness();
        bytes memory c = new bytes(10_000);
        c[0] = bytes1(uint8(0x15)); // top-left: team 1, color 5
        c[9_999] = bytes1(uint8(0x1f)); // bottom-right: color 15
        bytes memory b = h.bmp(c);

        assertEq(b.length, 118 + 52 * 100);
        assertEq(uint8(b[0]), uint8(bytes1("B")));
        assertEq(uint8(b[1]), uint8(bytes1("M")));
        assertEq(uint8(b[28]), 4); // 4 bits per pixel
        // Rows are bottom-up: the first stored row is canvas y = 99.
        assertEq(uint8(b[118 + 49]), 0x0f); // x = 98,99 of y = 99 -> (0, 15)
        // Last stored row is canvas y = 0.
        assertEq(uint8(b[118 + 99 * 52]), 0x50); // x = 0,1 of y = 0 -> (5, 0)
        // Palette entry 5 is red (BGR 00 00 e5).
        assertEq(uint8(b[54 + 5 * 4 + 2]), 0xe5);
    }

    function test_previewSvg_liveSeason() public view {
        string memory svg = snapshot.previewSvg(1);
        assertTrue(_contains(svg, "data:image/bmp;base64,"));
    }

    function test_faucets() public {
        PlaceFaucet faucet = new PlaceFaucet(place, owner);
        vm.prank(owner);
        place.transfer(address(faucet), 10_000 ether);

        vm.startPrank(alice);
        uint256 before = place.balanceOf(alice);
        faucet.drip();
        assertEq(place.balanceOf(alice), before + 500 ether);
        vm.expectRevert(abi.encodeWithSelector(PlaceFaucet.DripCooldown.selector, block.timestamp + 12 hours));
        faucet.drip();

        nvda.faucet();
        assertEq(nvda.balanceOf(alice), 2 ether);
        vm.expectRevert(abi.encodeWithSelector(MockStockToken.FaucetCooldown.selector, block.timestamp + 1 hours));
        nvda.faucet();
        vm.stopPrank();

        vm.prank(owner);
        faucet.withdraw(owner, 1 ether);
    }

    // ------------------------------------------------------------ string helpers

    function _b64decode(string memory s) private pure returns (bytes memory out) {
        bytes memory b = bytes(s);
        uint256 pad;
        if (b.length > 0 && b[b.length - 1] == "=") ++pad;
        if (b.length > 1 && b[b.length - 2] == "=") ++pad;
        out = new bytes((b.length / 4) * 3 - pad);
        uint256 o;
        for (uint256 i; i < b.length; i += 4) {
            uint256 n = (_b64(b[i]) << 18) | (_b64(b[i + 1]) << 12) | (_b64(b[i + 2]) << 6) | _b64(b[i + 3]);
            for (uint256 k; k < 3 && o < out.length; ++k) {
                out[o++] = bytes1(uint8(n >> (16 - 8 * k)));
            }
        }
    }

    function _b64(bytes1 c) private pure returns (uint256) {
        uint8 v = uint8(c);
        if (v >= 65 && v <= 90) return v - 65;
        if (v >= 97 && v <= 122) return v - 71;
        if (v >= 48 && v <= 57) return v + 4;
        if (v == 43) return 62;
        if (v == 47) return 63;
        return 0; // '=' padding
    }

    function _prefix(string memory s, uint256 n) private pure returns (string memory) {
        bytes memory b = bytes(s);
        bytes memory out = new bytes(n);
        for (uint256 i; i < n; ++i) {
            out[i] = b[i];
        }
        return string(out);
    }

    function _slice(string memory s, uint256 start) private pure returns (string memory) {
        bytes memory b = bytes(s);
        bytes memory out = new bytes(b.length - start);
        for (uint256 i; i < out.length; ++i) {
            out[i] = b[start + i];
        }
        return string(out);
    }

    function _contains(string memory haystack, string memory needle) private pure returns (bool) {
        bytes memory h = bytes(haystack);
        bytes memory n = bytes(needle);
        if (n.length > h.length) return false;
        for (uint256 i; i <= h.length - n.length; ++i) {
            bool ok = true;
            for (uint256 j; j < n.length; ++j) {
                if (h[i + j] != n[j]) {
                    ok = false;
                    break;
                }
            }
            if (ok) return true;
        }
        return false;
    }
}
