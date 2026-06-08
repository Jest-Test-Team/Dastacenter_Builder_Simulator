// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title DatacenterCertificateSBT
 * @dev Soulbound Token (SBT) for Datacenter Builder Simulator certificates
 * 
 * Features:
 * - Non-transferable (Soulbound)
 * - Unique tokenId per certificate
 * - Metadata stored on IPFS/Arweave/on-chain (configurable)
 * - Multi-chain compatible (Polygon, Ethereum, BSC, etc.)
 * - Gas-efficient minting
 */
contract DatacenterCertificateSBT is ERC721, Ownable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _tokenIds;
    
    // Mapping from tokenId to metadata URI (IPFS/Arweave hash)
    mapping(uint256 => string) private _tokenURIs;
    
    // Mapping from tokenId to blueprint hash (for verification)
    mapping(uint256 => bytes32) private _blueprintHashes;
    
    // Mapping from address to list of tokenIds (for querying user's certificates)
    mapping(address => uint256[]) private _userTokens;
    
    // Mapping from blueprintHash to tokenId (prevent duplicate certificates)
    mapping(bytes32 => uint256) private _blueprintToToken;
    
    // Base URI for metadata (can be IPFS gateway, Arweave, or custom)
    string private _baseTokenURI;
    
    // Events
    event CertificateMinted(
        address indexed recipient,
        uint256 indexed tokenId,
        bytes32 blueprintHash,
        string metadataURI
    );
    
    constructor(
        string memory name,
        string memory symbol,
        string memory baseTokenURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _baseTokenURI = baseTokenURI;
    }
    
    /**
     * @dev Mint a new certificate SBT
     * @param recipient The address to receive the certificate
     * @param blueprintHash The hash of the datacenter blueprint
     * @param metadataURI The IPFS/Arweave hash of the metadata
     */
    function mintCertificate(
        address recipient,
        bytes32 blueprintHash,
        string memory metadataURI
    ) external returns (uint256) {
        require(recipient != address(0), "Invalid recipient");
        require(blueprintHash != bytes32(0), "Invalid blueprint hash");
        require(_blueprintToToken[blueprintHash] == 0, "Certificate already exists for this blueprint");
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _safeMint(recipient, newTokenId);
        _tokenURIs[newTokenId] = metadataURI;
        _blueprintHashes[newTokenId] = blueprintHash;
        _userTokens[recipient].push(newTokenId);
        _blueprintToToken[blueprintHash] = newTokenId;
        
        emit CertificateMinted(recipient, newTokenId, blueprintHash, metadataURI);
        
        return newTokenId;
    }
    
    /**
     * @dev Get metadata URI for a token
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        
        string memory uri = _tokenURIs[tokenId];
        string memory base = _baseTokenURI;
        
        // If there is no base URI, return the token URI
        if (bytes(base).length == 0) {
            return uri;
        }
        
        // If both are set, concatenate
        if (bytes(uri).length > 0) {
            return string(abi.encodePacked(base, uri));
        }
        
        return "";
    }
    
    /**
     * @dev Get blueprint hash for a token
     */
    function getBlueprintHash(uint256 tokenId) external view returns (bytes32) {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        return _blueprintHashes[tokenId];
    }
    
    /**
     * @dev Get all certificates owned by an address
     */
    function getCertificates(address owner) external view returns (uint256[] memory) {
        return _userTokens[owner];
    }
    
    /**
     * @dev Check if a blueprint already has a certificate
     */
    function hasCertificate(bytes32 blueprintHash) external view returns (bool) {
        return _blueprintToToken[blueprintHash] != 0;
    }
    
    /**
     * @dev Get tokenId for a blueprint hash
     */
    function getTokenIdByBlueprint(bytes32 blueprintHash) external view returns (uint256) {
        return _blueprintToToken[blueprintHash];
    }
    
    /**
     * @dev Update base URI (only owner)
     */
    function setBaseURI(string memory baseTokenURI) external onlyOwner {
        _baseTokenURI = baseTokenURI;
    }
    
    /**
     * @dev Get total supply
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIds.current();
    }
    
    // ========== SOULBOUND OVERRIDES ==========
    // Prevent all transfers (except minting and burning)
    
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == address(0))
        // Allow burning (to == address(0))
        // Disallow all other transfers
        require(
            from == address(0) || to == address(0),
            "SBT: Soulbound tokens cannot be transferred"
        );
        
        return super._update(to, tokenId, auth);
    }
    
    /**
     * @dev Explicitly disable approvals
     */
    function approve(address, uint256) public virtual override {
        revert("SBT: Approvals are disabled");
    }
    
    /**
     * @dev Explicitly disable approvals
     */
    function setApprovalForAll(address, bool) public virtual override {
        revert("SBT: Approvals are disabled");
    }
}
