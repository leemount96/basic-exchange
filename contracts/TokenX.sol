// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


// Contract for TokenX used for testing
contract TokenX is ERC20 {
    constructor(uint256 initialSupply) ERC20("Token X", "TKNX") {
        _mint(msg.sender, initialSupply);
    }
}