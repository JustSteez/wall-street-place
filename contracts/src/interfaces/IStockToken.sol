// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Minimal view of a Robinhood Stock Token (ERC-20 + ERC-8056 uiMultiplier).
interface IStockToken {
    function balanceOf(address account) external view returns (uint256);

    /// @dev ERC-8056: shares represented by one token, scaled by 1e18.
    function uiMultiplier() external view returns (uint256);
}
