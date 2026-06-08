# SBT Certificate System

This directory contains the Soulbound Token (SBT) certificate system that replaces the Credly integration.

## Architecture

### Smart Contract (`/contracts/DatacenterCertificateSBT.sol`)
- ERC-721 based Soulbound Token
- Non-transferable after minting
- Stores blueprint hash on-chain
- Metadata URI can point to IPFS, Arweave, or be stored on-chain

### Frontend Libraries (`/src/lib/sbt/`)

#### `chains.ts`
Multi-chain configuration supporting:
- Polygon Amoy Testnet (primary testnet)
- Polygon Mainnet
- Ethereum Mainnet & Sepolia Testnet
- BSC Mainnet & Testnet
- Arbitrum One
- Optimism
- Base

Deployment-time contract addresses are read from environment variables first:
- `NEXT_PUBLIC_SBT_CONTRACT_ADDRESS_POLYGON_AMOY`
- `NEXT_PUBLIC_SBT_CONTRACT_ADDRESS_<NETWORK>` for other supported chains

#### `metadata.ts`
Metadata storage management with automatic cost optimization:
- **IPFS**: Free (NFT.Storage) or cheap (~$0.001/file via Pinata)
- **Arweave**: Permanent storage (~$0.01/KB one-time)
- **On-chain**: Most secure for small files (<5KB)

Auto-selection logic:
- Testnet → Always IPFS (free, fast)
- Mainnet <5KB → On-chain (most secure)
- Mainnet ≥5KB → IPFS (cheap) or Arweave (permanent)

#### `client.ts`
Main interaction layer:
- `mintCertificate()` - Mint new SBT
- `hasCertificate()` - Check if blueprint already minted
- `getUserCertificates()` - Get all certs for an address
- `getCertificateInfo()` - Get cert details including metadata
- `estimateMintGas()` - Estimate gas cost before minting
- `getTestnetTokenReminder()` - Generate faucet reminder for testnets

#### `abi.ts`
Contract ABI for frontend interaction

## Deployment

### Prerequisites
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
```

### Deploy to Polygon Amoy
```bash
cd contracts
npx hardhat compile
npx hardhat run scripts/deploy.js --network polygon-amoy
```

### Deploy to other chains
Update `hardhat.config.js` with the target chain RPC and deploy:
```bash
npx hardhat run scripts/deploy.js --network polygon
npx hardhat run scripts/deploy.js --network sepolia
npx hardhat run scripts/deploy.js --network bsc-testnet
```

### Update contract addresses
After deployment, set the contract address override in `.env.local`:
```typescript
NEXT_PUBLIC_SBT_CONTRACT_ADDRESS_POLYGON_AMOY=0xYourDeployedAddress
```

## Environment Variables

Add to `.env.local`:

```bash
# For metadata storage (choose one or both)
NEXT_PUBLIC_NFT_STORAGE_KEY=your_nft_storage_key
NEXT_PUBLIC_PINATA_KEY=your_pinata_key

# For Arweave (optional, for permanent storage)
NEXT_PUBLIC_ARWEAVE_KEY=your_arweave_key

# For contract deployment
PRIVATE_KEY=your_deployer_private_key
POLYGON_AMOY_RPC=https://rpc-amoy.polygon.technology
POLYGONSCAN_API_KEY=your_polygonscan_api_key

# For the server-side mint relay
SBT_MINTER_PRIVATE_KEY=your_minter_private_key
NEXT_PUBLIC_SBT_CONTRACT_ADDRESS_POLYGON_AMOY=0xYourDeployedAddress
```

## Usage Example

```typescript
import { mintCertificate, getTestnetTokenReminder } from '@/lib/sbt';
import { useWalletClient, usePublicClient, useAccount } from 'wagmi';

// In component
const { address, chain } = useAccount();
const publicClient = usePublicClient();
const { data: walletClient } = useWalletClient();

// Check for testnet token reminder
const reminder = getTestnetTokenReminder(chain.id);
if (reminder) {
  alert(reminder);
}

// Mint certificate
const result = await mintCertificate(
  {
    recipientAddress: address,
    report,
    buildId,
    blueprintHash,
    recipientName,
    svgDataUri,
    chainId: chain.id,
  },
  walletClient,
  publicClient
);

console.log('Minted token:', result.tokenId);
console.log('Transaction:', result.explorerUrl);
```

## Cost Comparison (2026 estimates)

| Storage | Testnet | Mainnet (<5KB) | Mainnet (≥5KB) |
|---------|---------|----------------|----------------|
| **IPFS** | Free ✅ | ~$0.001 | ~$0.001 |
| **Arweave** | N/A | ~$0.05 | ~$0.10 |
| **On-chain** | ~$0.01 | ~$0.50-5 ✅ | ~$5-50 |

## Security

- All SBTs are non-transferable (soulbound)
- Blueprint hash stored on-chain prevents duplication
- Metadata integrity verified through content addressing (IPFS CID, Arweave txID)
- No admin mint function (only users can mint their own certificates)

## Verification

Anyone can verify a certificate by:
1. Reading the `blueprintHash` from the contract
2. Fetching the metadata URI
3. Comparing the blueprint hash in metadata with on-chain hash
4. Verifying the SVG certificate matches the blueprint
