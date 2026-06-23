// Agent Relay - Passport System
// Generates passport IDs and relay keys, manages storage

import { Sphere } from '@unicitylabs/sphere-sdk';
import { createNodeProviders } from '@unicitylabs/sphere-sdk/impl/nodejs';
import { v4 as uuidv4 } from 'uuid';

export class PassportManager {
  constructor({ network = 'testnet', dataDir }) {
    this.network = network;
    this.dataDir = dataDir;
    this.sphere = null;
    this.passports = new Map(); // In-memory; replace with Neon/Postgres
  }

  async init(agentMnemonic) {
    const providers = createNodeProviders({
      network: this.network,
      dataDir: this.dataDir,
    });

    const { sphere } = await Sphere.init({
      ...providers,
      network: this.network,
      mnemonic: agentMnemonic,
    });

    this.sphere = sphere;
    return this;
  }

  /**
   * Generate a new passport for a user
   */
  async createPassport({ walletAddress, guild }) {
    const passportId = this._generatePassportId();
    const relayKey = this._generateRelayKey();

    const passport = {
      passportId,
      relayKey,
      walletAddress,
      guild,
      createdAt: Date.now(),
      questsCompleted: 0,
      totalXp: 0,
    };

    this.passports.set(passportId, passport);
    this.passports.set(relayKey, passport);

    // TODO: Store on Unicity as a Sphere L3 token
    // const token = await this.sphere.payments.mintFungibleToken(ASSET_COIN_ID, 1n);
    // Store passport data as token metadata via IPFS

    return passport;
  }

  /**
   * Validate a relay key or passport ID
   */
  validatePassport(key) {
    return this.passports.has(key)
      ? { valid: true, passport: this.passports.get(key) }
      : { valid: false };
  }

  /**
   * Record quest completion
   */
  recordCompletion(passportId, questId, xpEarned) {
    const passport = this.passports.get(passportId);
    if (!passport) return null;
    passport.questsCompleted++;
    passport.totalXp += xpEarned;
    return passport;
  }

  _generatePassportId() {
    const short = uuidv4().split('-')[0].toUpperCase();
    return `AR-${short}`;
  }

  _generateRelayKey() {
    const parts = [
      uuidv4().split('-')[0].slice(0, 4).toUpperCase(),
      uuidv4().split('-')[0].slice(0, 4).toUpperCase(),
    ];
    return parts.join('-');
  }
}
