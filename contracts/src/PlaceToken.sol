// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @title PlaceToken ($PLACE)
/// @notice Fixed-supply utility token for Wall Street Place. It is only ever burned
///         (boosts, pixel protection, season snapshots); there is no mint function.
contract PlaceToken is ERC20, ERC20Burnable, ERC20Permit {
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 ether;

    constructor(address treasury) ERC20("Wall Street Place", "PLACE") ERC20Permit("Wall Street Place") {
        _mint(treasury, TOTAL_SUPPLY);
    }
}
