// Agent Relay - Relay Server Entry Point
// Manages Sphere identities for all quest agents and handles the WebSocket bridge

import 'dotenv/config';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { PassportManager } from './passport.js';
import { VerificationAgent } from './agents/verification-agent.js';
import { PuzzleAgent } from './agents/puzzle-agent.js';
import { LoreAgent } from './agents/lore-agent.js';
import { TreasuryAgent } from './agents/treasury-agent.js';

const NETWORK = process.env.UNICITY_NETWORK || 'testnet';
const DATA_DIR = process.env.DATA_DIR || './data';
const PORT = parseInt(process.env.RELAY_PORT || '3104', 10);
const WSS_PORT = parseInt(process.env.WSS_PORT || '3105', 10);

// ── Initialize components ───────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║     Agent Relay - Relay Server v0.1     ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`Network: ${NETWORK}`);
  console.log(`Data dir: ${DATA_DIR}`);

  // 1. Passport Manager
  const passportManager = new PassportManager({
    network: NETWORK,
    dataDir: DATA_DIR,
  });

  // 2. Quest Agents (each has its own Sphere identity)
  const verificationAgent = new VerificationAgent({
    network: NETWORK,
    dataDir: `${DATA_DIR}/agents/verification`,
    mnemonic: process.env.VERIFICATION_MNEMONIC,
  });

  const puzzleAgent = new PuzzleAgent({
    network: NETWORK,
    dataDir: `${DATA_DIR}/agents/puzzle`,
    mnemonic: process.env.PUZZLE_MNEMONIC,
  });

  const loreAgent = new LoreAgent({
    network: NETWORK,
    dataDir: `${DATA_DIR}/agents/lore`,
    mnemonic: process.env.LORE_MNEMONIC,
  });

  const treasuryAgent = new TreasuryAgent({
    network: NETWORK,
    dataDir: `${DATA_DIR}/agents/treasury`,
    mnemonic: process.env.TREASURY_MNEMONIC,
  });

  // 3. Start all agents
  console.log('\nStarting quest agents...');
  await Promise.all([
    verificationAgent.init(),
    puzzleAgent.init(),
    loreAgent.init(),
    treasuryAgent.init(),
  ]);
  console.log('All quest agents online');

  // Link verification agent to passport manager
  verificationAgent.registerPassport = (passport) => {
    verificationAgent.passports.set(passport.relayKey, passport);
    verificationAgent.passports.set(passport.passportId, passport);
  };

  // ── HTTP Server (API) ────────────────────────────

  const httpServer = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);

    try {
      // POST /passport - Create a new passport
      if (url.pathname === '/passport' && req.method === 'POST') {
        const body = await parseBody(req);
        const passport = await passportManager.createPassport({
          walletAddress: body.walletAddress,
          guild: body.guild,
          nametag: body.nametag,
        });
        verificationAgent.registerPassport(passport);
        res.writeHead(201);
        res.end(JSON.stringify({ success: true, passport }));
        return;
      }

      // GET /passport/:key - Validate a passport/relay key
      if (url.pathname.startsWith('/passport/') && req.method === 'GET') {
        const key = url.pathname.split('/passport/')[1];
        const result = passportManager.validatePassport(key);
        res.writeHead(result.valid ? 200 : 404);
        res.end(JSON.stringify(result));
        return;
      }

      // GET /health
      if (url.pathname === '/health') {
        res.end(JSON.stringify({ status: 'ok', agents: Object.keys(verificationAgent).length }));
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));

    } catch (err) {
      console.error('HTTP error:', err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
  });

  httpServer.listen(PORT, () => {
    console.log(`\nHTTP API on port ${PORT}`);
    console.log(`  POST /passport  - Create passport`);
    console.log(`  GET  /passport/:key - Validate passport`);
    console.log(`  GET  /health    - Health check`);
  });

  // ── WebSocket Server (Agent Console Bridge) ──────

  const wss = new WebSocketServer({ port: WSS_PORT });
  const userSessions = new Map();

  wss.on('connection', (ws, req) => {
    const sessionId = Math.random().toString(36).slice(2, 10);
    console.log(`[WS] User connected: ${sessionId}`);

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        switch (msg.type) {
          case 'auth':
            // Authenticate with passport
            userSessions.set(sessionId, { passportId: msg.passportId, guild: msg.guild });
            ws.send(JSON.stringify({ type: 'auth_ok', sessionId }));
            break;

          case 'relay':
            // Forward message to a quest agent
            // In production, the relay would use Sphere SDK DMs
            ws.send(JSON.stringify({
              type: 'agent_message',
              from: `@agentrelay-${msg.targetAgent}`,
              content: `[Simulated response from ${msg.targetAgent}]`,
              timestamp: Date.now(),
            }));
            break;

          default:
            ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${msg.type}` }));
        }
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: err.message }));
      }
    });

    ws.on('close', () => {
      userSessions.delete(sessionId);
      console.log(`[WS] User disconnected: ${sessionId}`);
    });
  });

  console.log(`\nWebSocket bridge on port ${WSS_PORT}`);
  console.log('\nAgent Relay is running. Press Ctrl+C to stop.');
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch (e) { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
