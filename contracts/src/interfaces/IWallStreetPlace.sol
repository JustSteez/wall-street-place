// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IWallStreetPlace {
    function SIZE() external view returns (uint256);
    function currentSeason() external view returns (uint256);
    function getCanvas(uint256 season) external view returns (bytes memory);
    function seasonWinner(uint256 season) external view returns (uint8);
    function teamTicker(uint8 teamId) external view returns (string memory);
}
