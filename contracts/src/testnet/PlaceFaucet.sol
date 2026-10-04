// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title PlaceFaucet
/// @notice TESTNET ONLY. Drips $PLACE so testers can try boosts, protection and snapshots.
contract PlaceFaucet is Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant DRIP_AMOUNT = 500 ether;
    uint256 public constant DRIP_COOLDOWN = 12 hours;

    IERC20 public immutable token;
    mapping(address => uint256) public nextDripAt;

    event Dripped(address indexed to, uint256 amount);

    error DripCooldown(uint256 readyAt);

    constructor(IERC20 token_, address initialOwner) Ownable(initialOwner) {
        token = token_;
    }

    function drip() external {
        uint256 readyAt = nextDripAt[msg.sender];
        if (block.timestamp < readyAt) revert DripCooldown(readyAt);
        nextDripAt[msg.sender] = block.timestamp + DRIP_COOLDOWN;
        token.safeTransfer(msg.sender, DRIP_AMOUNT);
        emit Dripped(msg.sender, DRIP_AMOUNT);
    }

    function withdraw(address to, uint256 amount) external onlyOwner {
        token.safeTransfer(to, amount);
    }
}
