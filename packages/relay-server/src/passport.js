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
      await this._ensureGuildMessagesTable();
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
    const cached = this.passports.get(key);
    if (cached) return { valid: true, passport: cached };

    // Fallback: check Supabase (handles server restart where cache is cold)
    if (this.supabase) {
      // Try as passport_id first, then relay_key
      return this._lookupFromDb({ passport_id: key }).then((p) => {
        if (p) {
          this.passports.set(p.passportId, p);
          this.passports.set(p.relayKey, p);
          return { valid: true, passport: p };
        }
        // Try as relay_key
        return this._lookupFromDb({ relay_key: key }).then((p2) => {
          if (p2) {
            this.passports.set(p2.passportId, p2);
            this.passports.set(p2.relayKey, p2);
            return { valid: true, passport: p2 };
          }
          return { valid: false };
        });
      });
    }
    return { valid: false };
  }

  async _lookupFromDb(filter) {
    try {
      const { data } = await this.supabase
        .from('passports')
        .select('*')
        .match(filter)
        .single();
      return data ? this._rowToPassport(data) : null;
    } catch (err) {
      console.warn('[PassportManager] DB lookup failed:', err.message);
      return null;
    }
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
      avatarUrl: row.avatar_url || null,
    };
  }

  async updatePassport(passportId, fields) {
    // Update local cache
    const passport = this.passports.get(passportId);
    if (passport) {
      Object.assign(passport, fields);
      this.passports.set(passport.relayKey, passport);
    }
    // Update Supabase
    if (this.supabase) {
      const dbFields = {};
      if (fields.avatarUrl !== undefined) dbFields.avatar_url = fields.avatarUrl;
      if (fields.guild !== undefined) dbFields.guild = fields.guild;
      if (fields.nametag !== undefined) dbFields.nametag = fields.nametag;
      if (fields.questsCompleted !== undefined) dbFields.quests_completed = fields.questsCompleted;
      if (fields.totalXp !== undefined) dbFields.total_xp = fields.totalXp;
      if (Object.keys(dbFields).length > 0) {
        await this.supabase
          .from('passports')
          .update(dbFields)
          .eq('passport_id', passportId);
      }
    }
    return passport || this.passports.get(passportId);
  }

  // ── Guild Chat Messages ──────────────────────────

  async _ensureGuildMessagesTable() {
    if (!this.supabase) return;
    try {
      const { error } = await this.supabase
        .from('guild_messages')
        .select('id', { count: 'exact', head: true });
      if (error && error.message?.includes('relation')) {
        console.log('[PassportManager] Creating guild_messages table...');
        await this._createGuildMessagesTableViaPsql();
        this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (err) {
      console.warn('[PassportManager] guild_messages table check error:', err.message);
    }
  }

  async _createGuildMessagesTableViaPsql() {
    // Use pg library directly since psql may not be available
    const password = process.env.SUPABASE_DB_PASSWORD;
    if (!password) return;
    const projectRef = (process.env.SUPABASE_URL || '').match(/https:\/\/(.+)\.supabase\.co/)?.[1];
    if (!projectRef) {
      console.warn('[PassportManager] Could not determine project ref from SUPABASE_URL');
      return;
    }
    const host = process.env.SUPABASE_DB_HOST || `aws-1-eu-north-1.pooler.supabase.com`;
    const port = process.env.SUPABASE_DB_PORT || '6543';
    const user = process.env.SUPABASE_DB_USER || `postgres.${projectRef}`;

    const { default: pg } = await import('pg');
    const pool = new pg.Pool({
      host,
      port: parseInt(port),
      user,
      password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });

    const sql = `CREATE TABLE IF NOT EXISTS guild_messages (
      id BIGSERIAL PRIMARY KEY,
      guild TEXT NOT NULL DEFAULT 'explorer',
      user_tag TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_guild_messages_guild ON guild_messages(guild);
    CREATE INDEX IF NOT EXISTS idx_guild_messages_created ON guild_messages(created_at);`;

    try {
      await pool.query(sql);
      console.log('[PassportManager] guild_messages table created via pg');
    } catch (err) {
      console.warn('[PassportManager] Failed to create guild_messages table:', err.message);
    } finally {
      await pool.end();
    }
  }

  async saveGuildMessage(guild, userTag, message) {
    if (!this.supabase) return null;
    const { data, error } = await this.supabase
      .from('guild_messages')
      .insert({ guild, user_tag: userTag, message })
      .select('id, guild, user_tag, message, created_at')
      .single();
    if (error) {
      console.warn('[PassportManager] Failed to save guild message:', error.message);
      return null;
    }
    return data;
  }

  async getGuildMessages(guild, limit = 50) {
    if (!this.supabase) return [];
    const { data, error } = await this.supabase
      .from('guild_messages')
      .select('id, guild, user_tag, message, created_at')
      .eq('guild', guild)
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) {
      console.warn('[PassportManager] Failed to load guild messages:', error.message);
      return [];
    }
    return data.map(r => ({
      id: r.id,
      guild: r.guild,
      from: r.user_tag,
      message: r.message,
      time: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      system: false,
    }));
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
