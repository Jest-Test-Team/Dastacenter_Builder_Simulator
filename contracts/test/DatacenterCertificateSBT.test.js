/**
 * DatacenterCertificateSBT tests.
 *
 * This contract is already deployed at 0x0e6dF52Ffc02095C8AdE30a7B2Fda67a9FFf88eB on
 * Polygon Amoy and Sepolia, and it had no tests. The properties that matter most
 * are the ones that cannot be fixed after deployment:
 *
 *  - soulbound enforcement — a certificate that can be sold is not a credential
 *  - onlyOwner minting — the server relays every mint with the owner key
 *  - one certificate per blueprint — the duplicate guard the mint API relies on
 *
 * Each is tested through every path an attacker would actually reach for, not
 * just the happy one.
 */

const { expect } = require('chai');
const { ethers } = require('hardhat');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const NAME = 'Datacenter Builder Certificate';
const SYMBOL = 'DCBC';
const BASE_URI = 'https://ipfs.io/ipfs/';
const ZERO = ethers.ZeroAddress;

const hashOf = (label) => ethers.keccak256(ethers.toUtf8Bytes(label));
const BLUEPRINT_A = hashOf('blueprint-a');
const BLUEPRINT_B = hashOf('blueprint-b');
const URI_A = 'QmMetadataA';

describe('DatacenterCertificateSBT', function () {
  async function deploy(baseUri = BASE_URI) {
    const [owner, alice, bob, relayer] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('DatacenterCertificateSBT');
    const sbt = await Factory.deploy(NAME, SYMBOL, baseUri);
    await sbt.waitForDeployment();
    return { sbt, owner, alice, bob, relayer };
  }

  async function deployWithMint() {
    const context = await deploy();
    await context.sbt.mintCertificate(context.alice.address, BLUEPRINT_A, URI_A);
    return { ...context, tokenId: 1n };
  }

  async function deployWithoutBaseUri() {
    return deploy('');
  }

  describe('deployment', function () {
    it('sets name, symbol and owner', async function () {
      const { sbt, owner } = await loadFixture(deploy);
      expect(await sbt.name()).to.equal(NAME);
      expect(await sbt.symbol()).to.equal(SYMBOL);
      expect(await sbt.owner()).to.equal(owner.address);
    });

    it('starts empty, so token id 0 is never valid', async function () {
      const { sbt } = await loadFixture(deploy);
      expect(await sbt.totalSupply()).to.equal(0n);
      // The duplicate guard uses `_blueprintToToken[hash] == 0` as "absent", which
      // is only sound because ids start at 1. Lock that in.
      expect(await sbt.getTokenIdByBlueprint(BLUEPRINT_A)).to.equal(0n);
    });
  });

  describe('minting', function () {
    it('mints sequentially from 1 and records ownership', async function () {
      const { sbt, alice, bob } = await loadFixture(deploy);
      await sbt.mintCertificate(alice.address, BLUEPRINT_A, URI_A);
      await sbt.mintCertificate(bob.address, BLUEPRINT_B, 'QmMetadataB');

      expect(await sbt.totalSupply()).to.equal(2n);
      expect(await sbt.ownerOf(1)).to.equal(alice.address);
      expect(await sbt.ownerOf(2)).to.equal(bob.address);
      expect(await sbt.balanceOf(alice.address)).to.equal(1n);
    });

    it('emits CertificateMinted with the arguments the mint API parses', async function () {
      const { sbt, alice } = await loadFixture(deploy);
      // src/lib/sbt/server.ts reads tokenId out of this event to return it to the
      // client; a change to the signature silently breaks that parse.
      await expect(sbt.mintCertificate(alice.address, BLUEPRINT_A, URI_A))
        .to.emit(sbt, 'CertificateMinted')
        .withArgs(alice.address, 1n, BLUEPRINT_A, URI_A);
    });

    it('indexes certificates per user', async function () {
      const { sbt, alice } = await loadFixture(deploy);
      await sbt.mintCertificate(alice.address, BLUEPRINT_A, URI_A);
      await sbt.mintCertificate(alice.address, BLUEPRINT_B, 'QmMetadataB');
      expect(await sbt.getCertificates(alice.address)).to.deep.equal([1n, 2n]);
    });

    it('returns an empty list for an address with no certificates', async function () {
      const { sbt, bob } = await loadFixture(deploy);
      expect(await sbt.getCertificates(bob.address)).to.deep.equal([]);
    });

    it('stores the blueprint hash for later verification', async function () {
      const { sbt } = await loadFixture(deployWithMint);
      expect(await sbt.getBlueprintHash(1)).to.equal(BLUEPRINT_A);
    });
  });

  describe('access control', function () {
    it('rejects a mint from a non-owner', async function () {
      const { sbt, alice, bob } = await loadFixture(deploy);
      await expect(
        sbt.connect(alice).mintCertificate(bob.address, BLUEPRINT_A, URI_A),
      ).to.be.revertedWithCustomError(sbt, 'OwnableUnauthorizedAccount');
    });

    it('rejects setBaseURI from a non-owner', async function () {
      const { sbt, alice } = await loadFixture(deploy);
      await expect(sbt.connect(alice).setBaseURI('https://evil/')).to.be.revertedWithCustomError(
        sbt,
        'OwnableUnauthorizedAccount',
      );
    });

    it('lets a transferred owner mint, and stops the old one', async function () {
      const { sbt, owner, relayer, alice } = await loadFixture(deploy);
      await sbt.transferOwnership(relayer.address);
      await expect(sbt.connect(relayer).mintCertificate(alice.address, BLUEPRINT_A, URI_A)).to.not.be
        .reverted;
      await expect(
        sbt.connect(owner).mintCertificate(alice.address, BLUEPRINT_B, 'QmB'),
      ).to.be.revertedWithCustomError(sbt, 'OwnableUnauthorizedAccount');
    });
  });

  describe('input validation', function () {
    it('rejects the zero address as recipient', async function () {
      const { sbt } = await loadFixture(deploy);
      await expect(sbt.mintCertificate(ZERO, BLUEPRINT_A, URI_A)).to.be.revertedWith(
        'Invalid recipient',
      );
    });

    it('rejects an empty blueprint hash', async function () {
      const { sbt, alice } = await loadFixture(deploy);
      await expect(
        sbt.mintCertificate(alice.address, ethers.ZeroHash, URI_A),
      ).to.be.revertedWith('Invalid blueprint hash');
    });

    it('accepts an empty metadata URI — the contract does not police metadata', async function () {
      const { sbt, alice } = await loadFixture(deploy);
      await expect(sbt.mintCertificate(alice.address, BLUEPRINT_A, '')).to.not.be.reverted;
    });
  });

  describe('one certificate per blueprint', function () {
    it('rejects a second mint of the same blueprint, even to a different address', async function () {
      const { sbt, bob } = await loadFixture(deployWithMint);
      await expect(sbt.mintCertificate(bob.address, BLUEPRINT_A, 'QmOther')).to.be.revertedWith(
        'Certificate already exists for this blueprint',
      );
    });

    it('reports existence through hasCertificate, which the mint API checks first', async function () {
      const { sbt } = await loadFixture(deployWithMint);
      expect(await sbt.hasCertificate(BLUEPRINT_A)).to.equal(true);
      expect(await sbt.hasCertificate(BLUEPRINT_B)).to.equal(false);
    });

    it('maps a blueprint back to its token id', async function () {
      const { sbt } = await loadFixture(deployWithMint);
      expect(await sbt.getTokenIdByBlueprint(BLUEPRINT_A)).to.equal(1n);
    });

    it('does not consume a token id when a duplicate mint reverts', async function () {
      const { sbt, bob } = await loadFixture(deployWithMint);
      await expect(sbt.mintCertificate(bob.address, BLUEPRINT_A, 'QmOther')).to.be.reverted;
      expect(await sbt.totalSupply()).to.equal(1n);
      await sbt.mintCertificate(bob.address, BLUEPRINT_B, 'QmB');
      expect(await sbt.ownerOf(2)).to.equal(bob.address);
    });
  });

  describe('soulbound enforcement', function () {
    it('blocks transferFrom by the holder', async function () {
      const { sbt, alice, bob } = await loadFixture(deployWithMint);
      await expect(
        sbt.connect(alice).transferFrom(alice.address, bob.address, 1),
      ).to.be.revertedWith('SBT: Soulbound tokens cannot be transferred');
    });

    it('blocks both safeTransferFrom overloads', async function () {
      const { sbt, alice, bob } = await loadFixture(deployWithMint);
      await expect(
        sbt.connect(alice)['safeTransferFrom(address,address,uint256)'](
          alice.address,
          bob.address,
          1,
        ),
      ).to.be.revertedWith('SBT: Soulbound tokens cannot be transferred');
      await expect(
        sbt.connect(alice)['safeTransferFrom(address,address,uint256,bytes)'](
          alice.address,
          bob.address,
          1,
          '0x',
        ),
      ).to.be.revertedWith('SBT: Soulbound tokens cannot be transferred');
    });

    it('blocks the contract owner from moving someone else’s certificate', async function () {
      // The owner can mint, but must not be able to relocate an issued credential.
      const { sbt, owner, alice, bob } = await loadFixture(deployWithMint);
      await expect(
        sbt.connect(owner).transferFrom(alice.address, bob.address, 1),
      ).to.be.revertedWith('SBT: Soulbound tokens cannot be transferred');
    });

    it('disables approve outright, so no marketplace can be granted control', async function () {
      const { sbt, alice, bob } = await loadFixture(deployWithMint);
      await expect(sbt.connect(alice).approve(bob.address, 1)).to.be.revertedWith(
        'SBT: Approvals are disabled',
      );
      expect(await sbt.getApproved(1)).to.equal(ZERO);
    });

    it('disables setApprovalForAll', async function () {
      const { sbt, alice, bob } = await loadFixture(deployWithMint);
      await expect(sbt.connect(alice).setApprovalForAll(bob.address, true)).to.be.revertedWith(
        'SBT: Approvals are disabled',
      );
      expect(await sbt.isApprovedForAll(alice.address, bob.address)).to.equal(false);
    });

    it('still allows minting — the one permitted _update path', async function () {
      const { sbt, alice } = await loadFixture(deploy);
      await expect(sbt.mintCertificate(alice.address, BLUEPRINT_A, URI_A)).to.not.be.reverted;
    });
  });

  describe('metadata', function () {
    it('concatenates base URI and token URI', async function () {
      const { sbt } = await loadFixture(deployWithMint);
      expect(await sbt.tokenURI(1)).to.equal(`${BASE_URI}${URI_A}`);
    });

    it('returns the bare token URI when no base URI is configured', async function () {
      const { sbt, alice } = await loadFixture(deployWithoutBaseUri);
      await sbt.mintCertificate(alice.address, BLUEPRINT_A, 'ipfs://QmDirect');
      expect(await sbt.tokenURI(1)).to.equal('ipfs://QmDirect');
    });

    it('returns empty when a base URI is set but the token URI is blank', async function () {
      const { sbt, alice } = await loadFixture(deploy);
      await sbt.mintCertificate(alice.address, BLUEPRINT_A, '');
      expect(await sbt.tokenURI(1)).to.equal('');
    });

    it('reflects a base URI change across already-minted tokens', async function () {
      const { sbt } = await loadFixture(deployWithMint);
      await sbt.setBaseURI('https://arweave.net/');
      expect(await sbt.tokenURI(1)).to.equal(`https://arweave.net/${URI_A}`);
    });
  });

  describe('queries on non-existent tokens', function () {
    // OpenZeppelin v5's ownerOf reverts with ERC721NonexistentToken, so the
    // contract's own "Token does not exist" require is never reached. Pinning the
    // real behaviour here so a future OZ upgrade that changes it is caught.
    it('reverts tokenURI for an unminted id', async function () {
      const { sbt } = await loadFixture(deploy);
      await expect(sbt.tokenURI(999)).to.be.revertedWithCustomError(sbt, 'ERC721NonexistentToken');
    });

    it('reverts getBlueprintHash for an unminted id', async function () {
      const { sbt } = await loadFixture(deploy);
      await expect(sbt.getBlueprintHash(999)).to.be.revertedWithCustomError(
        sbt,
        'ERC721NonexistentToken',
      );
    });

    it('returns false/0 for an unknown blueprint rather than reverting', async function () {
      const { sbt } = await loadFixture(deploy);
      expect(await sbt.hasCertificate(hashOf('never-minted'))).to.equal(false);
      expect(await sbt.getTokenIdByBlueprint(hashOf('never-minted'))).to.equal(0n);
    });
  });

  describe('interfaces', function () {
    it('advertises ERC721 and ERC165 support', async function () {
      const { sbt } = await loadFixture(deploy);
      expect(await sbt.supportsInterface('0x80ac58cd')).to.equal(true); // ERC721
      expect(await sbt.supportsInterface('0x01ffc9a7')).to.equal(true); // ERC165
    });
  });
});
