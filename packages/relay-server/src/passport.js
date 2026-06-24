// Agent Relay - Passport System with Supabase
// Persists passport data to Supabase Postgres

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export class PassportManager {
  constructor({ network = 'testnet', dataDir }) {
    this.network = network;
    this.dataDir = dataDir;
    this.passports = new Map(); // local cache for fast lookups
    this.supabase = null;

    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      console.log('[PassportManager] Supabase connected');
    } else {
      console.warn('[PassportManager] No Supabase credentials — using in-memory only');
    }
  }

  async init(agentMnemonic) {
    // Warm cache from Supabase on startup
    if (this.supabase) {
      try {
        const { data } = await this.supabase
          .from('passports')
          .select('*');
        if (data) {
          for (const row of data) {
            const passport = this._rowToPassport(row);
            this.passports.set(passport.passportId, passport);
            this.passports.set(passport.relayKey, passport);
          }
          console.log(`[PassportManager] Loaded ${data.length} passports from Supabase`);
        }
      } catch (err) {
        console.error('[PassportManager] Failed to warm cache:', err.message);
      }
    }
    return this;
  }

  async createPassport({ walletAddress, guild, nametag }) {
    const passportId = this._generatePassportId();
    const relayKey = this._generateRelayKey();

    const passport = {
      passportId,
      relayKey,
      walletAddress,
      guild,
      nametag: nametag || null,
      createdAt: Date.now(),
      questsCompleted: 0,
      totalXp: 0,
    };

    // Persist to Supabase
    if (this.supabase) {
      const { error } = await this.supabase
        .from('passports')
        .insert({
          passport_id: passportId,
          relay_key: relayKey,
          wallet_address: walletAddress,
          nametag: nametag || null,
          guild,
          quests_completed: 0,
          total_xp: 0,
        });
      if (error) {
        console.error('[PassportManager] Supabase insert error:', error.message);
        throw new Error(`Failed to save passport: ${error.message}`);
      }
    }

    // Local cache
    this.passports.set(passportId, passport);
    this.passports.set(relayKey, passport);

    return passport;
  }

  validatePassport(key) {
    const passport = this.passports.get(key);
    return passport
      ? { valid: true, passport }
      : { valid: false };
  }

  async recordCompletion(passportId, questId, xpEarned) {
    const passport = this.passports.get(passportId);
    if (!passport) return null;

    passport.questsCompleted++;
    passport.totalXp += xpEarned;

    // Update in Supabase
    if (this.supabase) {
      await this.supabase
        .from('passports')
        .update({
          quests_completed: passport.questsCompleted,
          total_xp: passport.totalXp,
        })
        .eq('passport_id', passportId);
    }

    return passport;
  }

  async getPassportByWallet(walletAddress) {
    // Check cache first
    for (const p of this.passports.values()) {
      if (p.walletAddress === walletAddress) return p;
    }
    // Fallback to Supabase query
    if (this.supabase) {
      const { data } = await this.supabase
        .from('passports')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();
      if (data) return this._rowToPassport(data);
    }
    return null;
  }

  _rowToPassport(row) {
    return {
      passportId: row.passport_id,
      relayKey: row.relay_key,
      walletAddress: row.wallet_address,
      nametag: row.nametag,
      guild: row.guild,
      createdAt: new Date(row.created_at).getTime(),
      questsCompleted: row.quests_completed,
      totalXp: row.total_xp,
    };
  }

  _generatePassportId() {
    const hex = Math.random().toString(16).slice(2, 10).toUpperCase();
    return `AR-${hex}`;
  }

  _generateRelayKey() {
    const a = Math.random().toString(36).slice(2, 6).toUpperCase();
    const b = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${a}-${b}`;
  }
}
