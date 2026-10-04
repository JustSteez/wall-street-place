// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockStockToken
/// @notice TESTNET ONLY. Stand-in for a Robinhood Stock Token: a plain ERC-20 with an
///         ERC-8056 `uiMultiplier()` and a public faucet so anyone can join a team.
contract MockStockToken is ERC20, Ownable {
    uint256 public constant FAUCET_AMOUNT = 1 ether;
    uint256 public constant FAUCET_COOLDOWN = 1 hours;

    uint256 public uiMultiplier = 1e18;
    mapping(address => uint256) public nextFaucetAt;

    event UiMultiplierUpdated(uint256 oldMultiplier, uint256 newMultiplier);

    error FaucetCooldown(uint256 readyAt);

    constructor(string memory name_, string memory symbol_, address initialOwner)
        ERC20(name_, symbol_)
        Ownable(initialOwner)
    {}

    function faucet() external {
        uint256 readyAt = nextFaucetAt[msg.sender];
        if (block.timestamp < readyAt) revert FaucetCooldown(readyAt);
        nextFaucetAt[msg.sender] = block.timestamp + FAUCET_COOLDOWN;
        _mint(msg.sender, FAUCET_AMOUNT);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Simulate a corporate action (e.g. 4:1 split = multiply by 4).
    function setUiMultiplier(uint256 newMultiplier) external onlyOwner {
        emit UiMultiplierUpdated(uiMultiplier, newMultiplier);
        uiMultiplier = newMultiplier;
    }
}
