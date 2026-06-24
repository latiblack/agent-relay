// Agent Relay - Relay Server v0.2
// Quest state machine + WebSocket bridge + 4 Sphere SDK agents

import 'dotenv/config';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { PassportManager } from './passport.js';
import { VerificationAgent } from './agents/verification-agent.js';
import { PuzzleAgent } from './agents/puzzle-agent.js';
import { LoreAgent } from './agents/lore-agent.js';
import { TreasuryAgent } from './agents/treasury-agent.js';
import { QuestSessionManager, QUEST_PHASES } from './quest-session.js';
import { loadAllQuests } from './quest-loader.js';
import { ACTIONS, QUESTS } from './constants.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NETWORK = process.env.UNICITY_NETWORK || 'testnet';
const DATA_DIR = process.env.DATA_DIR || './data';
const PORT = parseInt(process.env.RELAY_PORT || '3104', 10);
const WSS_PORT = parseInt(process.env.WSS_PORT || '3105', 10);

// ── WebSocket clients (Agent Console connections) ──
const wsClients = new Map(); // { passportId -> [ws, ...] }

function broadcastToConsole(passportId, message) {
  const clients = wsClients.get(passportId);
  if (!clients) return;
  const payload = JSON.stringify({ type: 'agent_message', ...message, timestamp: Date.now() });
  for (const ws of clients) {
    try { ws.send(payload); } catch { /* ignore */ }
  }
}

// ── Quest Orchestrator ─────────────────────────────
// Steps through the state machine, dispatching to each agent in order

async function runQuestOrchestrator(session, agents) {
  const { passport, questId } = session;
  const { verificationAgent, loreAgent, puzzleAgent, treasuryAgent } = agents;

  // Phase 1: Verify passport
  session.transitionTo(QUEST_PHASES.VERIFYING);
  broadcastToConsole(passport.passportId, {
    from: 'SYSTEM', to: '@ar-verify',
    message: `[INIT] Deploying quest: Signal Hunt`,
    phase: 'init',
  });

  // Simulate verification agent response (in production, this goes over Sphere SDK)
  await delay(800);
  const verifyResult = verificationAgent._verifyKey({ relayKey: passport.relayKey, passportId: passport.passportId });
  await session.handleAgentMessage('@ar-verify', verifyResult);
  broadcastToConsole(passport.passportId, {
    from: '@ar-verify', to: 'SYSTEM',
    message: verifyResult.data?.verified
      ? `[VERIFIED] Passport ${passport.passportId} | Guild: ${passport.guild}`
      : `[FAILED] ${verifyResult.data?.error}`,
    phase: 'verifying',
    data: verifyResult.data,
  });

  if (!verifyResult.data?.verified) {
    broadcastToConsole(passport.passportId, {
      from: 'SYSTEM', to: 'user',
      message: '[ABORT] Verification failed. Cannot proceed.',
      phase: 'error',
    });
    return;
  }

  // Phase 2: Lore intro
  session.transitionTo(QUEST_PHASES.LORE_INTRO);
  await delay(1000);
  const loreData = loreAgent._getStory({ questId, chapter: 'intro' });
  await session.handleAgentMessage('@agentrelay-lore', loreData);
  broadcastToConsole(passport.passportId, {
    from: '@agentrelay-lore', to: '@agentrelay-puzzle',
    message: `[LORE] ${loreData.data?.content || 'Narrative loaded.'}`,
    phase: 'lore_intro',
  });

  // Phase 3: Puzzle — present first clue
  session.transitionTo(QUEST_PHASES.PUZZLE);
  await delay(600);
  const quest = QUESTS[questId];
  if (quest?.fragments?.length) {
    broadcastToConsole(passport.passportId, {
      from: '@agentrelay-puzzle', to: 'user',
      message: `[PUZZLE] Fragment 1/5: ${quest.fragments[0].clue}`,
      phase: 'puzzle',
      data: { fragmentIndex: 0, collected: 0, total: quest.fragments.length },
    });
  }

  // More phases triggered by submit-answer HTTP endpoint
  broadcastToConsole(passport.passportId, {
    from: 'SYSTEM', to: 'user',
    message: `[READY] Quest ${questId} deployed. Submit answers via POST /quest/submit-answer`,
    phase: 'ready',
    data: { questId, totalFragments: quest?.fragments?.length || 0 },
  });
}

// ── Main ───────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║    Agent Relay - Relay Server v0.2       ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`Network: ${NETWORK}`);
  console.log(`Data dir: ${DATA_DIR}`);

  // Load quest definitions from .md files
  const questsDir = path.join(__dirname, '..', 'quests');
  const loadedQuests = loadAllQuests(questsDir);
  const questCount = Object.keys(loadedQuests).length;
  console.log(`Loaded ${questCount} quest(s) from ${questsDir}`);
  // Merge loaded quests into QUESTS constant (loaded quests override)
  for (const [id, quest] of Object.entries(loadedQuests)) {
    QUESTS[id] = quest;
  }

  // 1. Passport Manager
  const passportManager = new PassportManager({
    network: NETWORK,
    dataDir: DATA_DIR,
  });

  // 2. Quest Agents
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

  const agents = { verificationAgent, puzzleAgent, loreAgent, treasuryAgent };

  // 3. Quest Session Manager
  const sessionManager = new QuestSessionManager();

  // 4. Start all agents
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

  // ── HTTP Server ──────────────────────────────────

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
      // POST /passport — Create passport
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

      // GET /passport/:key — Validate passport/relay key
      if (url.pathname.startsWith('/passport/') && req.method === 'GET') {
        const key = url.pathname.split('/passport/')[1];
        const result = passportManager.validatePassport(key);
        res.writeHead(result.valid ? 200 : 404);
        res.end(JSON.stringify(result));
        return;
      }

      // POST /quest/deploy — Deploy a quest (start state machine)
      if (url.pathname === '/quest/deploy' && req.method === 'POST') {
        const body = await parseBody(req);
        const { passportId, questId } = body;
        const passport = passportManager.validatePassport(passportId)?.passport;
        if (!passport) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid passport' }));
          return;
        }
        const quest = QUESTS[questId];
        if (!quest) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: `Unknown quest: ${questId}` }));
          return;
        }

        // Create session
        const session = sessionManager.createSession({
          questId,
          passport,
          onMessage: (msg) => broadcastToConsole(passportId, msg),
        });

        // Fire-and-forget the orchestrator
        runQuestOrchestrator(session, agents).catch(err => {
          console.error('[Orchestrator] Error:', err);
          broadcastToConsole(passportId, {
            from: 'SYSTEM', to: 'user',
            message: `[ERROR] ${err.message}`,
            phase: 'error',
          });
        });

        res.end(JSON.stringify({
          success: true,
          data: {
            questId,
            quest: quest.title,
            phase: session.phase,
            fragments: quest.fragments?.length || 0,
          },
        }));
        return;
      }

      // POST /quest/submit-answer — Submit puzzle answer
      if (url.pathname === '/quest/submit-answer' && req.method === 'POST') {
        const body = await parseBody(req);
        const { passportId, questId, answer } = body;
        const session = sessionManager.getSession(passportId);
        if (!session) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'No active quest session' }));
          return;
        }

        // Route answer through Puzzle Agent
        const mockMsg = { senderNametag: 'user', senderPubkey: passportId };
        const result = puzzleAgent._handleAnswer({ questId, answer }, mockMsg);
        const handled = await session.handleAgentMessage('@agentrelay-puzzle', result);

        broadcastToConsole(passportId, {
          from: '@agentrelay-puzzle',
          to: result.data?.correct ? '@agentrelay-lore' : 'user',
          message: result.data?.correct
            ? '[SOLVED] All fragments collected! Signal decoded.'
            : result.data?.fragmentIndex !== undefined
              ? `[FRAGMENT ${result.data.fragmentIndex + 1}/${result.data.total}] Collected! Next: ${result.data.clue}`
              : `[INCORRECT] ${result.data?.hint || 'Try again.'}`,
          phase: 'puzzle',
          data: result.data,
        });

        // If correct, advance to lore_complete → rewarding
        if (result.data?.correct && handled?.next === QUEST_PHASES.LORE_COMPLETE) {
          await delay(800);
          session.transitionTo(QUEST_PHASES.LORE_COMPLETE);
          const completeLore = loreAgent._advanceStory({ questId, currentChapter: 'intro' });
          await session.handleAgentMessage('@agentrelay-lore', completeLore);
          broadcastToConsole(passportId, {
            from: '@agentrelay-lore', to: '@agentrelay-treasury',
            message: `[COMPLETE] ${completeLore.data?.content || 'Quest complete!'}`,
            phase: 'lore_complete',
          });

          await delay(800);
          session.transitionTo(QUEST_PHASES.REWARDING);
          const rewardMsg = { senderNametag: 'user', senderPubkey: passportId };
          const reward = treasuryAgent._claimReward({ questId }, rewardMsg);
          await session.handleAgentMessage('@agentrelay-treasury', reward);
          broadcastToConsole(passportId, {
            from: '@agentrelay-treasury', to: 'user',
            message: `[REWARD] +${reward.data?.xpAwarded || 0} XP awarded! Total: ${reward.data?.totalXp || 0} XP`,
            phase: 'rewarding',
            data: reward.data,
          });

          session.transitionTo(QUEST_PHASES.COMPLETED);
          broadcastToConsole(passportId, {
            from: 'SYSTEM', to: 'user',
            message: '[QUEST COMPLETE] Signal Hunt finished. Ready for next mission.',
            phase: 'completed',
          });
        }

        res.end(JSON.stringify({ success: true, data: result.data || result }));
        return;
      }

      // GET /quest/state/:passportId — Get current quest state
      if (url.pathname.startsWith('/quest/state/') && req.method === 'GET') {
        const pid = url.pathname.split('/quest/state/')[1];
        const session = sessionManager.getSession(pid);
        if (!session) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'No active quest session' }));
          return;
        }
        res.end(JSON.stringify({
          questId: session.questId,
          phase: session.phase,
          fragmentsCollected: session.fragmentsCollected.length,
          attempts: session.attempts,
          createdAt: session.createdAt,
        }));
        return;
      }

      // GET /health
      if (url.pathname === '/health') {
        res.end(JSON.stringify({
          status: 'ok',
          agents: 4,
          quests: Object.keys(QUESTS).length,
          sessions: sessionManager.sessions.size,
        }));
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
    console.log(`  POST /passport           - Create passport`);
    console.log(`  GET  /passport/:key      - Validate passport`);
    console.log(`  POST /quest/deploy       - Deploy quest (start state machine)`);
    console.log(`  POST /quest/submit-answer - Submit puzzle answer`);
    console.log(`  GET  /quest/state/:id    - Get quest state`);
    console.log(`  GET  /health             - Health check`);
  });

  // ── WebSocket Server (Agent Console) ──────────────

  const wss = new WebSocketServer({ port: WSS_PORT });

  wss.on('connection', (ws, req) => {
    let authenticatedPassport = null;

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        switch (msg.type) {
          case 'auth':
            authenticatedPassport = msg.passportId;
            if (!wsClients.has(msg.passportId)) {
              wsClients.set(msg.passportId, []);
            }
            wsClients.get(msg.passportId).push(ws);
            ws.send(JSON.stringify({ type: 'auth_ok', passportId: msg.passportId }));
            console.log(`[WS] Console connected: ${msg.passportId}`);
            break;

          case 'deploy':
            // Deploy a quest from the console
            if (authenticatedPassport) {
              ws.send(JSON.stringify({
                type: 'info',
                message: 'Use POST /quest/deploy to start a quest.',
              }));
            }
            break;

          default:
            ws.send(JSON.stringify({ type: 'error', message: `Unknown type: ${msg.type}` }));
        }
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: err.message }));
      }
    });

    ws.on('close', () => {
      if (authenticatedPassport && wsClients.has(authenticatedPassport)) {
        const clients = wsClients.get(authenticatedPassport);
        const idx = clients.indexOf(ws);
        if (idx !== -1) clients.splice(idx, 1);
        if (clients.length === 0) wsClients.delete(authenticatedPassport);
      }
      console.log('[WS] Console disconnected');
    });
  });

  console.log(`WebSocket bridge on port ${WSS_PORT}`);
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

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
