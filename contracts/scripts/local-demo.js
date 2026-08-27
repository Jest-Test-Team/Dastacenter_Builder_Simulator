/**
 * Stand up the whole settlement loop on a local EVM.
 *
 * Deploys the SBT and the KSN token, mints one privacy credential to a known
 * account, and leaves the agent treasury funded — so the settlement agent can be
 * driven end to end, INCLUDING the transfer, with a real signature and a real
 * receipt, without spending Sepolia gas or waiting on a faucet.
 *
 * This is how you check the settle path after touching it. The chain lives only
 * as long as the node, and the addresses change on every run, which is why they
 * are printed as env lines to paste rather than committed anywhere.
 *
 *   npx hardhat node                                           # terminal 1
 *   npx hardhat run scripts/local-demo.js --network localhost  # terminal 2
 *   # export the printed vars, then start `npm run dev`
 */
const hre = require('hardhat');

// Hardhat's deterministic accounts.
const ARCHITECT = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; // #0, holds the credential
const AGENT = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; // #1, the agent treasury

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const Sbt = await hre.ethers.getContractFactory('DatacenterCertificateSBT');
  const sbt = await Sbt.deploy('Datacenter Builder Certificate', 'DBC', '');
  await sbt.waitForDeployment();
  const sbtAddress = await sbt.getAddress();

  const Ksn = await hre.ethers.getContractFactory('KsnDividendToken');
  const ksn = await Ksn.deploy(AGENT, 1_000_000n);
  await ksn.waitForDeployment();
  const ksnAddress = await ksn.getAddress();

  // A real privacy credential: threshold form, no exact score, noir backend.
  const metadata = {
    name: 'Elite Green Architect SBT',
    description: 'Proven in zero knowledge to score at least 85. The design itself is not disclosed.',
    attributes: [
      { trait_type: 'Level', value: 'Platinum' },
      { trait_type: 'Score', value: '>= 85' },
      { trait_type: 'Uptime Tier', value: 'IV' },
      { trait_type: 'Blueprint Hash', value: '' },
      { trait_type: 'Graph Commitment', value: '0x' + '3c'.repeat(32) },
      { trait_type: 'Proof Circuit', value: 'datacenter-score/v1' },
      { trait_type: 'Rule Pack', value: '0.1.0' },
      { trait_type: 'Proof Backend', value: 'noir' },
    ],
  };
  const blueprintHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes('local-demo-build'));
  metadata.attributes.find((a) => a.trait_type === 'Blueprint Hash').value = blueprintHash;
  const uri = 'data:application/json;base64,' + Buffer.from(JSON.stringify(metadata)).toString('base64');

  await (await sbt.mintCertificate(ARCHITECT, blueprintHash, uri)).wait();

  console.log('DEPLOYER=' + deployer.address);
  console.log('NEXT_PUBLIC_SBT_CONTRACT_ADDRESS_LOCALHOST=' + sbtAddress);
  console.log('NEXT_PUBLIC_KSN_TOKEN_ADDRESS_LOCALHOST=' + ksnAddress);
  console.log('ARCHITECT=' + ARCHITECT);
  console.log('AGENT_TREASURY_KSN=' + (await ksn.balanceOf(AGENT)).toString());
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
