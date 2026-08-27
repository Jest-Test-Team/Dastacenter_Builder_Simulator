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

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying KsnDividendToken with account:", deployer.address);
  console.log("Network:", hre.network.name);
  console.log("Treasury (agent wallet):", treasury);

  if (treasury.toLowerCase() === deployer.address.toLowerCase()) {
    console.warn(
      "\n⚠️  The treasury is the deployer. The agent will not be independent of the issuer.\n",
    );
  }

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH");

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
