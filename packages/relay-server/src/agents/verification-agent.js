// Verification Agent (@agentrelay-verification)
// Validates relay keys and passports - zero LLM

import { QuestAgent } from '../quest-agent.js';
import { ACTIONS } from '../constants.js';

export class VerificationAgent extends QuestAgent {
  constructor(config) {
    super({ nametag: '@ar-verify', ...config });
    this.passports = new Map(); // In-memory; replace with Unicity storage
  }

  async init() {
    this.on(ACTIONS.VERIFY_KEY, (data) => this._verifyKey(data));
    this.on(ACTIONS.VERIFY_PASSPORT, (data) => this._verifyPassport(data));
    return super.init();
  }

  registerPassport(passport) {
    this.passports.set(passport.relayKey, passport);
    this.passports.set(passport.passportId, passport);
  }

  _verifyKey(data) {
    const { relayKey, passportId } = data || {};
    const passport = this.passports.get(relayKey) || this.passports.get(passportId);
    if (!passport) {
      return {
        action: 'verification_result',
        data: { verified: false, error: 'Invalid relay key or passport ID' },
      };
    }
    return {
      action: 'verification_result',
      data: {
        verified: true,
        passportId: passport.passportId,
        guild: passport.guild,
      },
    };
  }

  _verifyPassport(data) {
    const { passportId, walletAddress } = data || {};
    const passport = this.passports.get(passportId);
    if (!passport || passport.walletAddress !== walletAddress) {
      return {
        action: 'passport_verification',
        data: { verified: false, error: 'Passport not found or wallet mismatch' },
      };
    }
    return {
      action: 'passport_verification',
      data: { verified: true, passport },
    };
  }
}
