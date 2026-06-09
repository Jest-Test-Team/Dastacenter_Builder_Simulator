const hre = require("hardhat");

// Quick end-to-end on-chain test:
// 1. connect with the minter wallet (must be contract owner)
// 2. mint a certificate with dummy data + on-chain data URI metadata
// 3. read it back (tokenURI, totalSupply, soulbound transfer should revert)
async function main() {
  const ADDR = process.env.NEXT_PUBLIC_SBT_CONTRACT_ADDRESS_POLYGON_AMOY;
  const minterKey = process.env.SBT_MINTER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  const provider = new hre.ethers.JsonRpcProvider(
    process.env.POLYGON_AMOY_RPC || "https://rpc-amoy.polygon.technology"
  );
  const wallet = new hre.ethers.Wallet(minterKey, provider);
  console.log("Contract:", ADDR);
  console.log("Minter   :", wallet.address);

  const sbt = await hre.ethers.getContractAt("DatacenterCertificateSBT", ADDR, wallet);

  const owner = await sbt.owner();
  console.log("Owner    :", owner, owner.toLowerCase() === wallet.address.toLowerCase() ? "(minter IS owner ✅)" : "(minter is NOT owner ❌)");

  // Build a tiny on-chain data URI (mirrors the testnet fallback path)
  const metadata = { name: "Test Cert", description: "e2e mint test", attributes: [] };
  const dataUri = "data:application/json;base64," + Buffer.from(JSON.stringify(metadata)).toString("base64");
  const blueprintHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test-blueprint-" + Date.now()));

  console.log("\nMinting...");
  const tx = await sbt.mintCertificate(wallet.address, blueprintHash, dataUri);
  const receipt = await tx.wait();
  console.log("✅ Mint tx:", tx.hash);

  const supply = await sbt.totalSupply();
  const tokenId = supply; // newest
  console.log("totalSupply now:", supply.toString());
  console.log("tokenURI(", tokenId.toString(), "):", (await sbt.tokenURI(tokenId)).slice(0, 60) + "...");
  console.log("ownerOf:", await sbt.ownerOf(tokenId));

  // Soulbound check: transfer must revert
  try {
    await sbt.transferFrom.staticCall(wallet.address, "0x000000000000000000000000000000000000dEaD", tokenId);
    console.log("❌ Soulbound check FAILED — transfer did not revert");
  } catch (e) {
    console.log("✅ Soulbound enforced — transfer reverts:", (e.shortMessage || e.message).slice(0, 80));
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
