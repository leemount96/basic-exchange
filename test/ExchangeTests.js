const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Exchange", function () {
  let Exchange;
  let deployedExchange;

  let TokenX;
  let deployedX;
  let supplyX = 10000;

  let TokenY;
  let deployedY;
  let supplyY = 100000;

  let owner;
  let addr1;
  let addr2;
  let addrs;

  // runs before each test
  beforeEach(async function () {
    // get contract factory and signers
    Exchange = await ethers.getContractFactory("Exchange");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // deploy contract
    deployedExchange = await Exchange.deploy();

    // mint supplyX of TokenX and transfer to addr1
    TokenX = await ethers.getContractFactory("TokenX");
    deployedX = await TokenX.deploy(supplyX);
    await deployedX.transfer(addr1.address, supplyX);
    await deployedX.connect(addr1).approve(deployedExchange.address, supplyX);

    // mint supplyY of TokenY and transfer to addr2
    TokenY = await ethers.getContractFactory("TokenY");
    deployedY = await TokenY.deploy(supplyY);
    await deployedY.transfer(addr2.address, supplyY);
    await deployedY.connect(addr2).approve(deployedExchange.address, supplyY);
  })

  describe("Deployment", function () {
    it("Deployment should set the right owner of exchange", async function () {
      expect(await deployedExchange.owner()).to.equal(owner.address);
    });

    it("Check balance of each account is equal to total supply of respective tokens", async function () {
      const addr1BalanceX = await deployedX.balanceOf(addr1.address);
      const addr2BalanceY = await deployedY.balanceOf(addr2.address);

      expect(await deployedX.totalSupply()).to.equal(addr1BalanceX);
      expect(await deployedX.totalSupply()).to.equal(supplyX);

      expect(await deployedY.totalSupply()).to.equal(addr2BalanceY);
      expect(await deployedY.totalSupply()).to.equal(supplyY);
    })
  });

  describe("Offer Set Up & Modification", function (){
    let offerAmount = 999;
    let price = 1;

    beforeEach(async function () {
      // create offer on deployedExchange with offerAmount & price
      await deployedExchange.connect(addr1).createOffer(deployedX.address, deployedY.address, offerAmount, price);
    })

    it("Check offer was set up correctly", async function () {
      expect(await deployedX.balanceOf(deployedExchange.address)).to.equal(offerAmount);
      expect(await deployedX.balanceOf(addr1.address)).to.equal(supplyX - offerAmount);

      const [_amountX, _price] = await deployedExchange.connect(addr1).checkOffer();

      expect(_amountX).to.equal(offerAmount);
      expect(_price).to.equal(price);
    });

    it("Update price of an existing offer to a valid price", async function () {
      const newPrice = 2;
      
      await deployedExchange.connect(addr1).updatePrice(newPrice);

      const [_amountX, _price] = await deployedExchange.connect(addr1).checkOffer();
      expect(_amountX).to.equal(offerAmount);
      expect(_price).to.equal(newPrice);
    });

    it("Attempt to update price of an existing offer to an invalid price", async function () {
      const newPrice = 0;
      
      await expect(deployedExchange.connect(addr1).updatePrice(newPrice)).to.be.revertedWith("Price must be >0");
    });

    it("Attempt to update price from address that was not initializer", async function () {
      const newPrice = 2;

      await expect(deployedExchange.connect(addr2).updatePrice(newPrice)).to.be.revertedWith("Not owner of offer");
    });

    it("attempt to create an offer when one already exists", async function (){
      await expect(deployedExchange.connect(addr1).createOffer(deployedX.address, deployedY.address, offerAmount, price)).to.be.revertedWith("Already have offer listed");
    });

    it("attempt to create an offer from different address when one already exists", async function (){
      await expect(deployedExchange.connect(addr2).createOffer(deployedX.address, deployedY.address, offerAmount, price)).to.be.revertedWith("Already have offer listed");
    });
  });

  describe("Offer Cancellation", function (){
    let offerAmount = 999;
    let price = 1;

    beforeEach(async function () {
      // create offer on deployedExchange with offerAmount & price
      await deployedExchange.connect(addr1).createOffer(deployedX.address, deployedY.address, offerAmount, price);
    })

    it("Cancel outstanding offer", async function () {
      await deployedExchange.connect(addr1).cancelOffer();

      // tokens should have been returned to addr1 from exchange contract
      expect(await deployedX.balanceOf(deployedExchange.address)).to.equal(0);
      expect(await deployedX.balanceOf(addr1.address)).to.equal(supplyX);
    });

    it("Attempt to cancel offer from non-owner", async function (){
      await expect(deployedExchange.connect(addr2).cancelOffer()).to.be.revertedWith("Not owner of offer");
    });
  });

  describe("Calling functions post cancellation", function (){
    let offerAmount = 999;
    let price = 1;

    beforeEach(async function () {
      // create offer on deployedExchange with offerAmount & price
      await deployedExchange.connect(addr1).createOffer(deployedX.address, deployedY.address, offerAmount, price);

      // cancel the offer
      await deployedExchange.connect(addr1).cancelOffer();
    })

    it("Try to check and modify the cancelled offer", async function () {
      await expect(deployedExchange.connect(addr1).updatePrice(price)).to.be.revertedWith("No existing offer");
      await expect(deployedExchange.connect(addr1).checkOffer()).to.be.revertedWith("No existing offer");
      await expect(deployedExchange.connect(addr1).cancelOffer()).to.be.revertedWith("No existing offer");
    });

    it("After cancelling offer, create new offer", async function () {
      const newOfferAmount = 1234;
      const newPrice = 2;

      await deployedExchange.connect(addr1).createOffer(deployedX.address, deployedY.address, newOfferAmount, newPrice);

      expect(await deployedX.balanceOf(deployedExchange.address)).to.equal(newOfferAmount);
      expect(await deployedX.balanceOf(addr1.address)).to.equal(supplyX - newOfferAmount);

      const [_amountX, _price] = await deployedExchange.connect(addr1).checkOffer();

      expect(_amountX).to.equal(newOfferAmount);
      expect(_price).to.equal(newPrice);
    });
  });

  describe("Accept offer", function (){ 
    let offerAmount = 999;
    let price = 1;

    beforeEach(async function () {
      // create offer on deployedExchange with offerAmount & price
      await deployedExchange.connect(addr1).createOffer(deployedX.address, deployedY.address, offerAmount, price);
    })

    it("Try to accept offer with less than amount in exchange when price is 1", async function () {
      const acceptAmount = 500;
      
      await deployedExchange.connect(addr2).acceptOffer(acceptAmount);
      
      expect(await deployedX.balanceOf(deployedExchange.address)).to.equal(offerAmount - acceptAmount);
      expect(await deployedX.balanceOf(addr1.address)).to.equal(supplyX - offerAmount);
      expect(await deployedX.balanceOf(addr2.address)).to.equal(acceptAmount);
      
      expect(await deployedY.balanceOf(addr1.address)).to.equal(acceptAmount);
      expect(await deployedY.balanceOf(addr2.address)).to.equal(supplyY - acceptAmount);
    })

    it("Try to accept offer with full amount in exchange when price is 1, and check outstandingOffer is false", async function () {
      const acceptAmount = offerAmount;
      
      await deployedExchange.connect(addr2).acceptOffer(acceptAmount);
      
      expect(await deployedX.balanceOf(deployedExchange.address)).to.equal(0);
      expect(await deployedX.balanceOf(addr1.address)).to.equal(supplyX - offerAmount);
      expect(await deployedX.balanceOf(addr2.address)).to.equal(acceptAmount);
      
      expect(await deployedY.balanceOf(addr1.address)).to.equal(acceptAmount);
      expect(await deployedY.balanceOf(addr2.address)).to.equal(supplyY - acceptAmount);

      await expect(deployedExchange.connect(addr1).checkOffer()).to.be.revertedWith("No existing offer");
    })

    it("Try to accept offer twice when price is 1", async function () {
      const acceptAmountFirst = 500;
      const acceptAmountSecond = 250;
      
      await deployedExchange.connect(addr2).acceptOffer(acceptAmountFirst);
      await deployedExchange.connect(addr2).acceptOffer(acceptAmountSecond);
      
      expect(await deployedX.balanceOf(deployedExchange.address)).to.equal(offerAmount - acceptAmountFirst - acceptAmountSecond);
      expect(await deployedX.balanceOf(addr1.address)).to.equal(supplyX - offerAmount);
      expect(await deployedX.balanceOf(addr2.address)).to.equal(acceptAmountFirst + acceptAmountSecond);
      
      expect(await deployedY.balanceOf(addr1.address)).to.equal(acceptAmountFirst + acceptAmountSecond);
      expect(await deployedY.balanceOf(addr2.address)).to.equal(supplyY - acceptAmountFirst - acceptAmountSecond);
    })

    it("Try to accept offer with 0 amountY when price is 1", async function () {
      const acceptAmount = 0;
      
      await expect(deployedExchange.connect(addr2).acceptOffer(acceptAmount)).to.be.revertedWith("Must accept non-zero amount");
    })

    it("Try to accept offer with amount greater than offer when price is 1", async function () {
      const acceptAmount = offerAmount + 1;
      
      await expect(deployedExchange.connect(addr2).acceptOffer(acceptAmount)).to.be.revertedWith("Trade too large");
    })

    it("Update price to 2, accept offer", async function () {
      const newPrice = 2;
      const acceptAmount = 500

      await deployedExchange.connect(addr1).updatePrice(newPrice);
      await deployedExchange.connect(addr2).acceptOffer(acceptAmount);

      expect(await deployedX.balanceOf(deployedExchange.address)).to.equal(offerAmount - (acceptAmount/newPrice));
      expect(await deployedX.balanceOf(addr1.address)).to.equal(supplyX - offerAmount);
      expect(await deployedX.balanceOf(addr2.address)).to.equal((acceptAmount/newPrice));
      
      expect(await deployedY.balanceOf(addr1.address)).to.equal(acceptAmount);
      expect(await deployedY.balanceOf(addr2.address)).to.equal(supplyY - acceptAmount);
    })
  });
});
