// File used to deploy TokenX and TokenY contracts for testing purposes
const hre = require("hardhat");

async function main() {
  const supplyX = 100000;
  const supplyY = 10000;
  const metamaskAddress = "0x510b1130057b44a7af60c3cf257528821eb2465c";

  const TokenX = await hre.ethers.getContractFactory("TokenX");
  const tokenX = await TokenX.deploy(supplyX);

  const TokenY = await hre.ethers.getContractFactory("TokenX");
  const tokenY = await TokenX.deploy(supplyY);

  await tokenX.deployed();
  await tokenY.deployed();

  await tokenX.transfer(metamaskAddress, supplyX);

  console.log("TokenX deployed to:", tokenX.address);
  console.log("TokenY deployed to:", tokenY.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
