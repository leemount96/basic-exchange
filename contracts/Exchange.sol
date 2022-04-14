//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// interface ERC20 {
//   function balanceOf(address owner) external view returns (unit);
//   function allowance(address owner, address spender) external view returns (unit);
//   function approve(address spender, uint value) external returns (bool);
//   function transfer(address to, uint value) external returns (bool);
//   function transferFrom(address from, address to, uint value) external returns (bool); 
// }

contract Exchange {
    address public tokenX;
    address public tokenY;
    uint256 public price;
    address public owner;
    address public initializer;
    bool public outstandingOffer = false;

    constructor() {
        console.log("Deploying a basic exchange for tokens X & Y");
        owner = msg.sender;
    }

    function createOffer(address _tokenX, address _tokenY, uint256 _amountX, uint256 _price) public {
        require(outstandingOffer == false, "Already have offer listed");
        require(_price > 0, "Price must be >0");

        tokenX = _tokenX;
        tokenY = _tokenY;
        price = _price;
        initializer = msg.sender;
        outstandingOffer = true;

        // Transfer amountX of tokenX to smart contract using ERC20 method
        ERC20(tokenX).transferFrom(initializer, address(this), _amountX);
    }

    function updatePrice(uint256 newPrice) public {
        require(msg.sender == initializer, "Not owner of offer");
        require(outstandingOffer == true, "No existing offer");
        require(newPrice > 0, "Price must be >0");

        console.log("Changing offer price from '%s' to '%s'", price, newPrice);
        price = newPrice;
    }

    function checkOffer() external view returns (uint256, uint256) {
        require(outstandingOffer == true, "No existing offer");
        
        return (ERC20(tokenX).balanceOf(address(this)), price);
    }

    function cancelOffer() public {
        require(msg.sender == initializer, "Not owner of offer");
        require(outstandingOffer == true, "No existing offer");
        
        console.log("Cancelling offer");

        // just need to set outstanding offer to false, other vars will be reset when creating new offer
        outstandingOffer = false;

        // transfer remaining tokens back to initializer
        ERC20(tokenX).transfer(initializer, ERC20(tokenX).balanceOf(address(this)));
    }

    function acceptOffer(uint256 amountY) public {
        require(outstandingOffer == true, "No existing offer");
        require(amountY > 0, "Must accept non-zero amount");

        // check there is enough of X to trade for amount Y
        require(amountY/price <= ERC20(tokenX).balanceOf(address(this)), "Trade too large");

        // transfer amountY of tokenY to initializer
        console.log("Attempting to transfer tokenY from accepter to offer initializer");
        ERC20(tokenY).transferFrom(msg.sender, initializer, amountY);

        // transfer amountY/price of tokenX to msg.sender
        console.log("Attempting to transfer tokenX from contract to accepter");
        ERC20(tokenX).transfer(msg.sender, amountY/price);

        // reduce amount of tokenX by the amount sent, set outstanding offer to false if result is 0
        if(ERC20(tokenX).balanceOf(address(this)) == 0){
            outstandingOffer = false;
        }
    }
}
