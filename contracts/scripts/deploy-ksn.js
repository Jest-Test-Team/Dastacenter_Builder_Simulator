/**
 * Deploy the KSN civilization dividend token.
 *
 * The whole supply goes to the autonomous agent's treasury, which is a
 * DIFFERENT wallet from the certificate issuer — the agent that pays a dividend
 * should not be the party that minted the credential it pays against, or the
 * independence the demo claims is not real.
 *
 *   KSN_AGENT_ADDRESS=0x... npm run deploy:ksn -- --network sepolia
 *
 * If KSN_AGENT_ADDRESS is unset the script stops rather than defaulting to the
 * deployer: silently minting the treasury to the issuer is exactly the mistake
 * this file exists to prevent, and it would be invisible afterwards.
 */

const hre = require("hardhat");

// Whole tokens. Generous enough that a demo never runs dry mid-presentation.
const SUPPLY = 1_000_000_000n;

async function main() {
  const treasury = process.env.KSN_AGENT_ADDRESS;
  if (!treasury || !hre.ethers.isAddress(treasury)) {
    throw new Error(
      "Set KSN_AGENT_ADDRESS to the autonomous agent's wallet address before deploying.\n" +
        "It must not be the SBT minter wallet — the agent is meant to be independent of the issuer.",
    );
  }

  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  if (!deployer) {
    // hardhat.config.js builds `accounts` from PRIVATE_KEY, so an unset key
    // yields an empty signer list rather than an error — which used to surface
    // here as `Cannot read properties of undefined (reading 'address')`, a
    // message that tells you nothing about the actual cause.
    throw new Error(
      `No signer is configured for network "${hre.network.name}".\n` +
        "Set PRIVATE_KEY in .env.local at the repo root (hardhat.config.js reads it from there).\n" +
        "Any funded wallet works — the KSN token has no owner after deploy, so the deployer\n" +
        "retains no power over it. Deploying from the agent wallet itself is fine.",
    );
  }

  console.log("Deploying KsnDividendToken with account:", deployer.address);
  console.log("Network:", hre.network.name);
  console.log("Treasury (agent wallet):", treasury);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  if (balance === 0n) {
    throw new Error(`Deployer ${deployer.address} has no gas on ${hre.network.name}.`);
  }

  // The independence that matters is agent vs. the CERTIFICATE ISSUER, not
  // agent vs. deployer: this token has no owner once constructed, so whoever
  // deployed it keeps nothing. Check the real invariant by reading the SBT
  // contract's owner, rather than warning about a deployer that is harmless.
  const sbtAddress =
    process.env.NEXT_PUBLIC_SBT_CONTRACT_ADDRESS_SEPOLIA ||
    "0x0e6dF52Ffc02095C8AdE30a7B2Fda67a9FFf88eB";
  try {
    const sbt = new hre.ethers.Contract(
      sbtAddress,
      ["function owner() view returns (address)"],
      hre.ethers.provider,
    );
    const issuer = await sbt.owner();
    if (issuer.toLowerCase() === treasury.toLowerCase()) {
      console.warn(
        "\n⚠️  The treasury is the certificate ISSUER. An agent paying a dividend against\n" +
          "   a credential its own key minted is not independent, and the two addresses are\n" +
          "   one click apart on Etherscan. Use a different wallet for the agent.\n",
      );
    } else {
      console.log("Issuer independence: OK (issuer", issuer + ")");
    }
  } catch {
    console.log("Issuer independence: could not read the SBT owner; skipping the check.");
  }

  const KsnDividendToken = await hre.ethers.getContractFactory("KsnDividendToken");
  const token = await KsnDividendToken.deploy(treasury, SUPPLY);
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log("\n✅ KsnDividendToken deployed to:", address);
  console.log(`   Supply: ${SUPPLY.toString()} KSN, all held by the agent treasury.`);
  console.log("\nAdd this to .env.local AND to the `vars` block in wrangler.jsonc:");
  console.log(`NEXT_PUBLIC_KSN_TOKEN_ADDRESS_SEPOLIA=${address}`);
  console.log("\nThe agent also needs gas. Fund the treasury wallet with Sepolia ETH:");
  console.log(`   ${treasury}`);

  console.log("\nWaiting for block confirmations...");
  await token.deploymentTransaction().wait(5);

  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nVerifying contract on block explorer...");
    try {
      await hre.run("verify:verify", {
        address,
        constructorArguments: [treasury, SUPPLY],
      });
      console.log("✅ Contract verified!");
    } catch (err) {
      console.log("❌ Verification failed:", err.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
