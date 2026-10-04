// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {PlaceToken} from "../src/PlaceToken.sol";
import {WallStreetPlace} from "../src/WallStreetPlace.sol";
import {SeasonSnapshot} from "../src/SeasonSnapshot.sol";
import {MockStockToken} from "../src/testnet/MockStockToken.sol";
import {PlaceFaucet} from "../src/testnet/PlaceFaucet.sol";

/// @notice Deploys Wall Street Place.
///
///   Testnet (mock stocks + faucets):
///     forge script script/Deploy.s.sol --sig "testnet()" --rpc-url robinhood_testnet --broadcast
///
///   Mainnet (real Robinhood Stock Tokens from config/teams.mainnet.json):
///     forge script script/Deploy.s.sol --sig "mainnet()" --rpc-url robinhood --broadcast
///
///   Env: PRIVATE_KEY (deployer). Mainnet also reads optional OWNER and TREASURY (use a multisig).
contract Deploy is Script {
    uint64 constant SEASON_DURATION = 7 days;
    uint64 constant COOLDOWN = 30 seconds;
    uint256 constant SKIP_COOLDOWN_COST = 10 ether;
    uint256 constant PROTECT_COST = 25 ether;
    uint256 constant SNAPSHOT_COST = 100 ether;
    uint96 constant MIN_SHARES = 0.01 ether; // hold at least 0.01 share to paint
    uint256 constant FAUCET_FUNDING = 10_000_000 ether;

    string[8] internal TICKERS = ["NVDA", "TSLA", "AAPL", "AMZN", "MSFT", "GOOGL", "META", "SPY"];

    struct Core {
        PlaceToken place;
        WallStreetPlace canvas;
        SeasonSnapshot snapshot;
    }

    function testnet() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        vm.startBroadcast(pk);

        Core memory core = _deployCore(deployer);
        PlaceFaucet faucet = new PlaceFaucet(core.place, deployer);
        core.place.transfer(address(faucet), FAUCET_FUNDING);

        address[] memory tokens = new address[](TICKERS.length);
        for (uint256 i; i < TICKERS.length; ++i) {
            MockStockToken t =
                new MockStockToken(string.concat("Test ", TICKERS[i]), string.concat("t", TICKERS[i]), deployer);
            core.canvas.addTeam(address(t), MIN_SHARES, TICKERS[i]);
            tokens[i] = address(t);
        }
        vm.stopBroadcast();

        _write("testnet", core, address(faucet), tokens);
    }

    function mainnet() external {
        require(block.chainid == 4663, "mainnet() is for Robinhood Chain (4663)");
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        // Recommended: a multisig for OWNER and TREASURY. Both default to the deployer.
        address finalOwner = vm.envOr("OWNER", deployer);
        address treasury = vm.envOr("TREASURY", deployer);
        string memory json = vm.readFile("config/teams.mainnet.json");
        address[] memory tokens = vm.parseJsonAddressArray(json, ".tokens");
        string[] memory tickers = vm.parseJsonStringArray(json, ".tickers");
        require(tokens.length > 0 && tokens.length <= 15 && tokens.length == tickers.length, "teams: 1..15");

        vm.startBroadcast(pk);
        Core memory core = _deployCore(deployer);
        for (uint256 i; i < tokens.length; ++i) {
            core.canvas.addTeam(tokens[i], MIN_SHARES, tickers[i]);
        }
        if (treasury != deployer) core.place.transfer(treasury, core.place.balanceOf(deployer));
        if (finalOwner != deployer) {
            core.canvas.transferOwnership(finalOwner); // Ownable2Step: OWNER must call acceptOwnership()
            core.snapshot.transferOwnership(finalOwner);
        }
        vm.stopBroadcast();

        _write("mainnet", core, address(0), tokens);
    }

    function _deployCore(address deployer) private returns (Core memory core) {
        core.place = new PlaceToken(deployer);
        core.canvas =
            new WallStreetPlace(deployer, core.place, SEASON_DURATION, COOLDOWN, SKIP_COOLDOWN_COST, PROTECT_COST);
        core.snapshot = new SeasonSnapshot(deployer, core.canvas, core.place, SNAPSHOT_COST);
    }

    function _write(string memory network, Core memory core, address faucet, address[] memory tokens) private {
        string memory obj = "deployment";
        vm.serializeUint(obj, "chainId", block.chainid);
        vm.serializeUint(obj, "deployedAtBlock", block.number);
        vm.serializeAddress(obj, "placeToken", address(core.place));
        vm.serializeAddress(obj, "canvas", address(core.canvas));
        vm.serializeAddress(obj, "snapshot", address(core.snapshot));
        vm.serializeAddress(obj, "placeFaucet", faucet);
        string memory out = vm.serializeAddress(obj, "teamTokens", tokens);
        string memory path = string.concat("deployments/", network, ".json");
        vm.writeJson(out, path);

        console2.log("PlaceToken     ", address(core.place));
        console2.log("WallStreetPlace", address(core.canvas));
        console2.log("SeasonSnapshot ", address(core.snapshot));
        console2.log("Written to", path);
    }
}
