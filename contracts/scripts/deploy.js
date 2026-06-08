const hre = require("hardhat");

async function main() {
  console.log("Deploying DatacenterCertificateSBT...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy parameters
  const name = "Datacenter Builder Certificate";
  const symbol = "DBC";
  const baseTokenURI = ""; // Empty for now, will use individual URIs

  const DatacenterCertificateSBT = await hre.ethers.getContractFactory("DatacenterCertificateSBT");
  const sbt = await DatacenterCertificateSBT.deploy(name, symbol, baseTokenURI);

  await sbt.deployed();

  console.log("✅ DatacenterCertificateSBT deployed to:", sbt.address);
  console.log("\nAdd this to your chains.ts:");
  console.log(`sbtContractAddress: '${sbt.address}',`);

  // Wait for block confirmations before verification
  console.log("\nWaiting for block confirmations...");
  await sbt.deployTransaction.wait(5);

  // Verify contract on block explorer (if not local network)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nVerifying contract on block explorer...");
    try {
      await hre.run("verify:verify", {
        address: sbt.address,
        constructorArguments: [name, symbol, baseTokenURI],
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
