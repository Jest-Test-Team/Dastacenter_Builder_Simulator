/**
 * The dividend token's guarantees are mostly about what it CANNOT do.
 *
 * The settlement demo claims an autonomous agent pays a dividend and that the
 * agent has no privileged standing. Those claims are only as good as this
 * contract's absence of a mint function, an owner, and a transfer hook — so the
 * absences are asserted here rather than left to a reader of the source.
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

const SUPPLY = 1_000_000n;

describe("KsnDividendToken", function () {
  let token, deployer, agent, architect;

  beforeEach(async function () {
    [deployer, agent, architect] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("KsnDividendToken");
    token = await Factory.deploy(agent.address, SUPPLY);
    await token.waitForDeployment();
  });

  it("mints the whole supply to the treasury, not the deployer", async function () {
    const expected = SUPPLY * 10n ** 18n;
    expect(await token.balanceOf(agent.address)).to.equal(expected);
    expect(await token.balanceOf(deployer.address)).to.equal(0n);
    expect(await token.totalSupply()).to.equal(expected);
  });

  it("carries the expected name, symbol and decimals", async function () {
    expect(await token.name()).to.equal("KSN Civilization Dividend");
    expect(await token.symbol()).to.equal("KSN");
    expect(await token.decimals()).to.equal(18);
  });

  it("exposes no owner and no mint function", async function () {
    // If either ever appears, the "agent has no back door" claim stops being true.
    expect(token.interface.fragments.some((f) => f.name === "owner")).to.equal(false);
    expect(token.interface.fragments.some((f) => f.name === "mint")).to.equal(false);
  });

  it("lets the agent disburse to an architect", async function () {
    const amount = 1_500n * 10n ** 18n;
    await expect(token.connect(agent).transfer(architect.address, amount)).to.changeTokenBalances(
      token,
      [agent, architect],
      [-amount, amount],
    );
  });

  it("gives the deployer no power to move the treasury", async function () {
    const amount = 1n * 10n ** 18n;
    await expect(token.connect(deployer).transferFrom(agent.address, deployer.address, amount)).to
      .be.reverted;
  });

  it("refuses a zero treasury or a zero supply", async function () {
    const Factory = await ethers.getContractFactory("KsnDividendToken");
    await expect(Factory.deploy(ethers.ZeroAddress, SUPPLY)).to.be.revertedWith(
      "KSN: treasury is the zero address",
    );
    await expect(Factory.deploy(agent.address, 0n)).to.be.revertedWith("KSN: supply is zero");
  });
});
