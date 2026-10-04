// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script} from "forge-std/Script.sol";
import {PlaceToken} from "../src/PlaceToken.sol";
import {WallStreetPlace} from "../src/WallStreetPlace.sol";
import {MockStockToken} from "../src/testnet/MockStockToken.sol";

/// @notice LOCAL ANVIL ONLY. Paints a demo scene so the UI has something to show.
///   forge script script/SeedLocal.s.sol --rpc-url http://127.0.0.1:8546 --broadcast
contract SeedLocal is Script {
    string constant MNEMONIC = "test test test test test test test test test test test junk";

    // Palette colour per team (index-aligned with deployment teamTokens).
    uint8[8] internal COLORS = [10, 5, 2, 6, 12, 13, 11, 8];

    function run() external {
        require(block.chainid == 46630 && _isLocal(), "local anvil only");
        string memory json = vm.readFile("deployments/testnet.json");
        WallStreetPlace canvas = WallStreetPlace(vm.parseJsonAddress(json, ".canvas"));
        PlaceToken place = PlaceToken(vm.parseJsonAddress(json, ".placeToken"));
        address[] memory teams = vm.parseJsonAddressArray(json, ".teamTokens");

        uint256 ownerKey = vm.deriveKey(MNEMONIC, 0);
        vm.startBroadcast(ownerKey);
        for (uint256 i; i < teams.length; ++i) {
            address painter = vm.addr(vm.deriveKey(MNEMONIC, uint32(i + 1)));
            MockStockToken(teams[i]).mint(painter, 5 ether);
            place.transfer(painter, 50_000 ether);
        }
        vm.stopBroadcast();

        for (uint256 i; i < teams.length; ++i) {
            uint256 key = vm.deriveKey(MNEMONIC, uint32(i + 1));
            vm.startBroadcast(key);
            place.approve(address(canvas), type(uint256).max);
            _paintBlock(canvas, uint8(i + 1), COLORS[i], i);
            vm.stopBroadcast();
        }
    }

    /// Each team claims a bar of a skyline: wider and taller for lower team ids.
    function _paintBlock(WallStreetPlace canvas, uint8 teamId, uint8 color, uint256 i) private {
        uint256 x0 = 4 + i * 12;
        uint256 height = 18 + ((i * 37) % 40);
        for (uint256 x = x0; x < x0 + 9; ++x) {
            for (uint256 y = 96 - height; y < 96; y += 2) {
                canvas.placeBoosted(x, y, color, teamId, 10 ether);
            }
        }
    }

    function _isLocal() private view returns (bool) {
        return block.coinbase == address(0) || block.number < 1_000_000;
    }
}
