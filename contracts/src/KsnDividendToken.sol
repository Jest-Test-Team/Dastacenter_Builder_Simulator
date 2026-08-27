// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title KsnDividendToken
 * @dev The KSN civilization dividend, disbursed by an autonomous settlement agent
 *      to holders of a zero-knowledge facility credential.
 *
 * Deliberately minimal, and the omissions are the point:
 *
 * - **No owner, no minter, no pause.** The entire supply is minted once, to the
 *   treasury named at construction, and the constructor is the only code that
 *   can ever create a token. There is no privileged function left for anyone —
 *   including the deployer — to call afterwards.
 * - **No transfer hooks and no allowlist.** A dividend a third party can freeze
 *   is not a dividend.
 *
 * The agent that spends this treasury holds an ordinary key and has no special
 * standing in this contract: it can only move what it owns, exactly like any
 * other holder. That property is what makes the settlement claim checkable —
 * a reviewer can read this file and confirm the agent has no back door, rather
 * than taking the architecture diagram's word for it.
 */
contract KsnDividendToken is ERC20 {
    /**
     * @param treasury Receives the entire supply. This is the autonomous agent's
     *        wallet — deliberately not the certificate issuer, so the party that
     *        pays the dividend is independent of the party that minted the
     *        credential it is paid against.
     * @param supply Total supply, in whole tokens. Scaled by 10**18 here so the
     *        deploy script never has to hand-write the decimals.
     */
    constructor(address treasury, uint256 supply) ERC20("KSN Civilization Dividend", "KSN") {
        require(treasury != address(0), "KSN: treasury is the zero address");
        require(supply > 0, "KSN: supply is zero");
        _mint(treasury, supply * 10 ** decimals());
    }
}
