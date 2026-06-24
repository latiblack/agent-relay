// Agent Relay - Passport System with Supabase
// Persists passport data to Supabase Postgres

import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const DB_CONNECTION = process.env.DB_CONNECTION; // optional direct DB connection string

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
    // Auto-create the passports table if it doesn't exist
    if (this.supabase) {
      await this._ensureTable();
    }

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
        // Schema cache might be stale - recreate client and retry once
        if (err.message?.includes('Could not find the table')) {
          console.log('[PassportManager] Recreating supabase client to refresh schema cache...');
          this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
          await new Promise(r => setTimeout(r, 1000));
          try {
            const { data } = await this.supabase.from('passports').select('*');
            if (data) {
              for (const row of data) {
                const p = this._rowToPassport(row);
                this.passports.set(p.passportId, p);
                this.passports.set(p.relayKey, p);
              }
              console.log(`[PassportManager] Retry: loaded ${data.length} passports`);
            }
          } catch (retryErr) {
            console.error('[PassportManager] Retry also failed:', retryErr.message);
          }
        }
      }
    }
    return this;
  }

  async _ensureTable() {
    try {
      const { error } = await this.supabase
        .from('passports')
        .select('id', { count: 'exact', head: true });
      if (error && error.message?.includes('relation')) {
        console.log('[PassportManager] Creating passports table...');
        await this._createTableViaPsql();
        
        // Recreate supabase client to pick up new schema cache
        console.log('[PassportManager] Refreshing schema cache...');
        this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        
        // Verify table exists
        await new Promise(r => setTimeout(r, 1000));
        const { error: checkErr } = await this.supabase
          .from('passports')
          .select('id', { count: 'exact', head: true });
          
        if (checkErr && checkErr.message?.includes('relation')) {
          console.warn('[PassportManager] Could not create table automatically.');
          console.warn('[PassportManager] Run in Supabase SQL Editor: CREATE TABLE IF NOT EXISTS passports (id BIGSERIAL PRIMARY KEY, passport_id TEXT UNIQUE NOT NULL, relay_key TEXT UNIQUE NOT NULL, wallet_address TEXT NOT NULL, nametag TEXT, guild TEXT NOT NULL DEFAULT \'explorer\', quests_completed INTEGER DEFAULT 0, total_xp INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW());');
        } else {
          console.log('[PassportManager] passports table ready');
        }
      }
    } catch (err) {
      console.warn('[PassportManager] Table check error:', err.message);
    }
  }
  
  async _createTableViaPsql() {
    // Try using psql via child_process with PGPASSWORD env var
    const { spawn } = await import('child_process');
    
    const sql = `CREATE TABLE IF NOT EXISTS passports (
      id BIGSERIAL PRIMARY KEY,
      passport_id TEXT UNIQUE NOT NULL,
      relay_key TEXT UNIQUE NOT NULL,
      wallet_address TEXT NOT NULL,
      nametag TEXT,
      guild TEXT NOT NULL DEFAULT 'explorer',
      quests_completed INTEGER DEFAULT 0,
      total_xp INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`;
    
    const password = process.env.SUPABASE_DB_PASSWORD;
    if (!password) {
      console.log('[PassportManager] No SUPABASE_DB_PASSWORD set, skipping psql creation');
      return;
    }
    
    const host = process.env.SUPABASE_DB_HOST || 'aws-1-eu-north-1.pooler.supabase.com';
    const port = process.env.SUPABASE_DB_PORT || '6543';
    const user = process.env.SUPABASE_DB_USER || 'postgres.deginpwtznmdwnnnbwsj';
    
    return new Promise(resolve => {
      const p = spawn('psql', [
        `postgresql://${user}:${password}@${host}:${port}/postgres`,
        '-c', sql
      ], {
        env: { ...process.env, PGPASSWORD: password },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let err = '';
      p.stderr.on('data', d => err += d);
      p.on('close', code => {
        if (code === 0) console.log('[PassportManager] Table created via psql');
        else console.log(`[PassportManager] psql exit ${code}: ${err.slice(0, 100)}`);
        resolve();
      });
    });
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
