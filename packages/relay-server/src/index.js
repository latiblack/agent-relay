// Agent Relay - Relay Server v0.2
// Quest state machine + WebSocket bridge + 4 Sphere SDK agents

import 'dotenv/config';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import crypto from 'crypto';
import { GroupVisibility } from '@unicitylabs/sphere-sdk';
import { PassportManager } from './passport.js';
import { VerificationAgent } from './agents/verification-agent.js';
import { PuzzleAgent } from './agents/puzzle-agent.js';
import { LoreAgent } from './agents/lore-agent.js';
import { TreasuryAgent } from './agents/treasury-agent.js';
import { QuestSessionManager, QUEST_PHASES } from './quest-session.js';
import { loadAllQuests } from './quest-loader.js';
import { InAppAgent } from './inapp-agent.js';
import { ACTIONS, QUESTS, AGENT_REGISTRY, GUILDS } from './constants.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NETWORK = process.env.UNICITY_NETWORK || 'testnet';
const DATA_DIR = process.env.DATA_DIR || './data';
const PORT = parseInt(process.env.RELAY_PORT || '3104', 10);
const WSS_PORT = parseInt(process.env.WSS_PORT || '3105', 10);

// ── WebSocket clients (Agent Console connections) ──
const wsClients = new Map(); // { passportId -> [ws, ...] }

// ── NIP-29 Group Chat Guild Rooms ─────────────────
const GUILD_GROUPS_FILE = path.join(DATA_DIR, 'guild-groups.json');
const guildGroupChats = new Map(); // guildName -> { groupId, relayUrl }

function getGuildGroupChat(guildName) {
  return guildGroupChats.get(guildName) || null;
}

function saveGuildGroupsToDisk() {
  try {
    const data = Object.fromEntries(guildGroupChats);
    const dir = path.dirname(GUILD_GROUPS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(GUILD_GROUPS_FILE, JSON.stringify(data, null, 2));
    console.log(`[GroupChat] Saved ${guildGroupChats.size} guild group(s) to disk`);
  } catch (err) {
    console.warn('[GroupChat] Failed to save guild groups to disk:', err.message);
  }
}

function loadGuildGroupsFromDisk() {
  try {
    if (!fs.existsSync(GUILD_GROUPS_FILE)) return false;
    const data = JSON.parse(fs.readFileSync(GUILD_GROUPS_FILE, 'utf-8'));
    for (const [name, info] of Object.entries(data)) {
      guildGroupChats.set(name, info);
    }
    console.log(`[GroupChat] Loaded ${guildGroupChats.size} guild group(s) from disk`);
    return guildGroupChats.size > 0;
  } catch (err) {
    console.warn('[GroupChat] Failed to load guild groups from disk:', err.message);
    return false;
  }
}

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

  // 2. Initialize passport manager (warms cache from Supabase)
  console.log('\nInitializing passport manager...');
  await passportManager.init(process.env.VERIFICATION_MNEMONIC);

  // 3. Quest Agents
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

  // Expose for market queries from HTTP handlers
  let agentsOnline = false;
  const getMarketModule = () => {
    // Try each agent's sphere market module
    for (const agent of Object.values(agents)) {
      if (agent.sphere?.market) return agent.sphere.market;
    }
    return null;
  };

  // 4. Quest Session Manager
  const sessionManager = new QuestSessionManager();

  // 5. In-App Agent instances (user's AI middleman)
  const inAppAgents = new Map(); // passportId -> InAppAgent

  // 6. Start all agents
  console.log('\nStarting quest agents...');
  await Promise.all([
    verificationAgent.init(),
    puzzleAgent.init(),
    loreAgent.init(),
    treasuryAgent.init(),
  ]);
  console.log('All quest agents online');
  agentsOnline = true;

  // Sync all existing passports from passport manager into verification agent
  // so existing users' relay keys are recognized on restart
  if (passportManager.passports) {
    for (const [key, passport] of passportManager.passports) {
      verificationAgent.passports.set(key, passport);
    }
    console.log(`[VerificationAgent] Synced ${passportManager.passports.size / 2} passport(s) from cache`);
  }

  // ── Create NIP-29 Group Chat Guild Rooms ──────────
  async function ensureGuildGroupChats(agents) {
    // Try loading cached groups from disk first — skip creation if we have them
    if (loadGuildGroupsFromDisk()) {
      console.log(`[GroupChat] Using cached guild groups from disk`);
      return;
    }

    const { verificationAgent } = agents;
    const gc = verificationAgent.sphere?.groupChat;
    if (!gc) {
      console.warn('[GroupChat] groupChat module not available — skipping guild room creation');
      return;
    }

    try {
      // Wait for connection if not yet ready
      if (!gc.getConnectionStatus()) {
        await new Promise((resolve) => {
          const readyTimeout = setTimeout(() => {
            console.warn('[GroupChat] Timeout waiting for groupchat:ready — proceeding anyway');
            resolve();
          }, 15000);
          verificationAgent.sphere.on('groupchat:ready', () => {
            clearTimeout(readyTimeout);
            console.log('[GroupChat] Module ready');
            resolve();
          });
        });
      }

      // Connect explicitly
      try { await gc.connect(); } catch (e) { /* already connected */ }

      // Check what groups already exist on the relay
      let existingGroups = [];
      try { existingGroups = await gc.fetchAvailableGroups(); } catch (e) { /* ignore */ }
      const existingGroupNames = new Map();
      for (const g of existingGroups) {
        if (g.name) existingGroupNames.set(g.name, g);
      }

      console.log(`[GroupChat] Found ${existingGroupNames.size} existing group(s) on relay`);
      console.log('[GroupChat] Creating/verifying guild chat rooms...');

      const guildNames = Object.values(GUILDS); // ['explorer', 'builder', 'creator', 'research']
      let created = 0;

      for (const guildName of guildNames) {
        const groupName = `${guildName}-guild`;

        // Check if group already exists on relay
        const existing = existingGroupNames.get(groupName);
        if (existing) {
          guildGroupChats.set(guildName, {
            groupId: existing.id,
            relayUrl: existing.relayUrl || gc.relayUrl,
          });
          console.log(`[GroupChat] ✓ Found existing room: ${groupName} (id: ${existing.id})`);
          continue;
        }

        // Create new group
        try {
          const group = await gc.createGroup({
            name: groupName,
            description: `${guildName.charAt(0).toUpperCase() + guildName.slice(1)} guild — quest chat room`,
            visibility: GroupVisibility.PUBLIC,
          });

          if (group) {
            guildGroupChats.set(guildName, {
              groupId: group.id,
              relayUrl: group.relayUrl,
            });
            console.log(`[GroupChat] ✓ Created guild room: ${groupName} (id: ${group.id})`);
            created++;
          } else {
            console.warn(`[GroupChat] ✗ Failed to create group: ${groupName} (no response)`);
          }
        } catch (err) {
          if (err.message?.includes('already exists')) {
            // Race condition — try fetching available groups again
            try {
              const refreshed = await gc.fetchAvailableGroups();
              const found = refreshed.find(g => g.name === groupName);
              if (found) {
                guildGroupChats.set(guildName, {
                  groupId: found.id,
                  relayUrl: found.relayUrl || gc.relayUrl,
                });
                console.log(`[GroupChat] ✓ Found existing room (retry): ${groupName} (id: ${found.id})`);
                continue;
              }
            } catch { /* fall through */ }
            console.warn(`[GroupChat] ✗ Group already exists but couldn't resolve: ${groupName}`);
          } else {
            console.error(`[GroupChat] Error creating group ${groupName}:`, err.message);
          }
        }
      }

      // Persist to disk so we don't need to recreate on restart
      saveGuildGroupsToDisk();

      console.log(`[GroupChat] ${guildGroupChats.size}/${guildNames.length} guild rooms ready (${created} new)`);
    } catch (err) {
      console.error('[GroupChat] Error ensuring guild rooms:', err.message);
    }
  }

  // Fire and forget — guild rooms are ensured asynchronously
  ensureGuildGroupChats(agents);

  // Link verification agent to passport manager
  verificationAgent.registerPassport = (passport) => {
    verificationAgent.passports.set(passport.relayKey, passport);
    verificationAgent.passports.set(passport.passportId, passport);
  };

  // ── HTTP Server ──────────────────────────────────

  const httpServer = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
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

      // GET /passport/wallet/:address — Lookup passport by wallet address
      if (url.pathname.startsWith('/passport/wallet/') && req.method === 'GET') {
        const address = decodeURIComponent(url.pathname.split('/passport/wallet/')[1]);
        const passport = await passportManager.getPassportByWallet(address);
        if (passport) {
          res.end(JSON.stringify({ success: true, passport }));
        } else {
          res.writeHead(404);
          res.end(JSON.stringify({ success: false, error: 'No passport found for this wallet' }));
        }
        return;
      }

      // GET /passport/:key — Validate passport/relay key
      if (url.pathname.startsWith('/passport/') && req.method === 'GET') {
        const key = url.pathname.split('/passport/')[1];
        const result = await passportManager.validatePassport(key);
        res.writeHead(result.valid ? 200 : 404);
        res.end(JSON.stringify(result));
        return;
      }

      // POST /avatar/upload — Upload profile picture
      if (url.pathname === '/avatar/upload' && req.method === 'POST') {
        const body = await parseBody(req);
        const { passportId, image } = body;
        if (!passportId || !image) {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'Missing passportId or image' }));
          return;
        }
        // Validate base64 image
        const match = image.match(/^data:image\/(png|jpeg|webp|gif);base64,(.+)$/);
        if (!match) {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'Invalid image format. Use data:image/*;base64,...' }));
          return;
        }
        const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `avatars/${passportId}-${crypto.randomBytes(8).toString('hex')}.${ext}`;

        try {
          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await passportManager.supabase
            .storage
            .from('avatars')
            .upload(filename, buffer, {
              contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
              upsert: false,
            });

          if (uploadError) {
            // If file exists, try overwrite
            const { data: uploadData2, error: uploadError2 } = await passportManager.supabase
              .storage
              .from('avatars')
              .upload(filename, buffer, {
                contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
                upsert: true,
              });
            if (uploadError2) throw uploadError2;
          }

          // Get public URL
          const { data: { publicUrl } } = passportManager.supabase
            .storage
            .from('avatars')
            .getPublicUrl(filename);

          // Update passport record
          await passportManager.updatePassport(passportId, { avatarUrl: publicUrl });

          res.end(JSON.stringify({ success: true, avatarUrl: publicUrl }));
        } catch (err) {
          res.writeHead(500);
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
      }

      // POST /quest/deploy — Deploy a quest. Spawns user's in-app agent.
      if (url.pathname === '/quest/deploy' && req.method === 'POST') {
        const body = await parseBody(req);
        const { passportId, questId, userTag } = body;
        const passportResult = await passportManager.validatePassport(passportId);
        const passport = passportResult?.passport;
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

        // Stop any existing agent for this user
        if (inAppAgents.has(passportId)) {
          inAppAgents.get(passportId).stop();
        }

        // Spawn in-app agent (user's AI middleman) — runs as its own Sphere identity
        const tag = userTag || passport.nametag || '@user';
        const agent = new InAppAgent({
          questId,
          quest,
          passport,
          userTag: tag,
          onMessage: (msg) => broadcastToConsole(passportId, msg),
          mnemonic: process.env.IN_APP_MNEMONIC,
          network: NETWORK,
          dataDir: DATA_DIR,
        });
        inAppAgents.set(passportId, agent);

        // Initialize Sphere SDK and then start
        agent.init()
          .then(() => agent.start())
          .catch(err => {
          console.error('[InAppAgent] Error:', err);
          broadcastToConsole(passportId, {
            from: 'SYSTEM', to: tag,
            message: `[ERROR] ${err.message}`,
            phase: 'error',
          });
        });

        res.end(JSON.stringify({
          success: true,
          data: {
            questId,
            quest: quest.title,
            fragments: quest.fragments?.length || 0,
          },
        }));
        return;
      }

      // POST /connect/launch — Launch quest via deep link (Connect wallet flow)
      if (url.pathname === '/connect/launch' && req.method === 'POST') {
        const body = await parseBody(req);
        const { questId, passportId } = body;

        if (!questId || !passportId) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'questId and passportId are required' }));
          return;
        }

        const passportResult = await passportManager.validatePassport(passportId);
        const passport = passportResult?.passport;
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

        // Build deep link URL for the Connect wallet flow
        const baseUrl = process.env.CONNECT_DEEP_LINK_BASE || 'unicity://connect';
        const deepLinkUrl = `${baseUrl}/launch?questId=${encodeURIComponent(questId)}&passportId=${encodeURIComponent(passportId)}`;

        // Spawn the in-app agent for this quest (same as /quest/deploy)
        if (inAppAgents.has(passportId)) {
          inAppAgents.get(passportId).stop();
        }

        const tag = passport.nametag || '@user';
        const agent = new InAppAgent({
          questId,
          quest,
          passport,
          userTag: tag,
          onMessage: (msg) => broadcastToConsole(passportId, msg),
          mnemonic: process.env.IN_APP_MNEMONIC,
          network: NETWORK,
          dataDir: DATA_DIR,
        });
        inAppAgents.set(passportId, agent);

        agent.init()
          .then(() => agent.start())
          .catch(err => {
            console.error('[InAppAgent] Error:', err);
            broadcastToConsole(passportId, {
              from: 'SYSTEM', to: tag,
              message: `[ERROR] ${err.message}`,
              phase: 'error',
            });
          });

        const questGroup = getGuildGroupChat(passport.guild);

        res.end(JSON.stringify({
          success: true,
          deepLink: deepLinkUrl,
          data: {
            questId,
            quest: quest.title,
            guild: passport.guild,
            guildGroupChat: questGroup || undefined,
          },
        }));
        return;
      }

      // POST /quest/submit-answer — User submits an answer. Routes through in-app agent.
      if (url.pathname === '/quest/submit-answer' && req.method === 'POST') {
        const body = await parseBody(req);
        const { passportId, answer } = body;
        const agent = inAppAgents.get(passportId);
        if (!agent) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'No active quest. Deploy a quest first.' }));
          return;
        }

        // Route through the in-app agent (it speaks to quest agents)
        await agent.handleUserInput(answer);

        res.end(JSON.stringify({ success: true }));
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

      // GET /quest/market/explore — Discover available quests from Market bulletin board
      if (url.pathname === '/quest/market/explore' && req.method === 'GET') {
        const searchQuery = url.searchParams.get('q') || 'quest';
        const market = getMarketModule();
        if (!market) {
          // Fallback: return locally defined quests
          res.end(JSON.stringify({
            success: true,
            source: 'local',
            quests: Object.entries(QUESTS).map(([id, q]) => ({
              id, title: q.title, guild: q.guild,
              difficulty: q.difficulty, description: q.description,
              fragments: q.fragments?.length || 0, reward: q.reward,
            })),
          }));
          return;
        }
        try {
          const result = await market.search(searchQuery, {
            filters: { category: 'quest' },
            limit: parseInt(url.searchParams.get('limit') || '20', 10),
          });
          res.end(JSON.stringify({
            success: true,
            source: 'market',
            count: result.count,
            intents: result.intents,
            localQuests: Object.entries(QUESTS).map(([id, q]) => ({
              id, title: q.title, guild: q.guild,
              difficulty: q.difficulty, description: q.description,
              fragments: q.fragments?.length || 0, reward: q.reward,
            })),
          }));
        } catch (err) {
          console.error('[Market] Search error:', err.message);
          // Fallback to local
          res.end(JSON.stringify({
            success: true,
            source: 'local',
            quests: Object.entries(QUESTS).map(([id, q]) => ({
              id, title: q.title, guild: q.guild,
              difficulty: q.difficulty, description: q.description,
              fragments: q.fragments?.length || 0, reward: q.reward,
            })),
          }));
        }
        return;
      }

      // GET /health
      if (url.pathname === '/health') {
        // Ping Supabase to prevent free-tier auto-pause (7-day inactivity)
        if (passportManager.supabase) {
          passportManager.supabase
            .from('passports')
            .select('id', { count: 'exact', head: true })
            .then(({ error }) => {
              if (error) console.warn('[Health] Supabase ping failed:', error.message);
            })
            .catch(() => {});
        }
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
    console.log(`  POST /connect/launch     - Launch quest via deep link`);
    console.log(`  GET  /quest/market/explore - Discover quests via Market bulletin board`);
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

  // ── Graceful Shutdown ──────────────────────────────
  const shutdown = async (signal) => {
    console.log(`\n[Shutdown] Received ${signal}. Shutting down gracefully...`);

    // Persist guild groups
    saveGuildGroupsToDisk();

    // Stop all in-app agents
    for (const [pid, agent] of inAppAgents) {
      try {
        agent.stop();
        console.log(`[Shutdown] Stopped in-app agent: ${pid}`);
      } catch (e) {
        console.warn(`[Shutdown] Error stopping in-app agent ${pid}:`, e.message);
      }
    }

    // Stop quest agents
    for (const [name, agent] of Object.entries(agents)) {
      try {
        if (typeof agent.stop === 'function') {
          await agent.stop();
          console.log(`[Shutdown] Stopped ${name}`);
        }
      } catch (e) {
        console.warn(`[Shutdown] Error stopping ${name}:`, e.message);
      }
    }

    // Close HTTP server
    try {
      await new Promise((resolve) => httpServer.close(resolve));
      console.log('[Shutdown] HTTP server closed');
    } catch (e) {
      console.warn('[Shutdown] Error closing HTTP server:', e.message);
    }

    // Close WebSocket server
    try {
      wss.close();
      console.log('[Shutdown] WebSocket server closed');
    } catch (e) {
      console.warn('[Shutdown] Error closing WebSocket server:', e.message);
    }

    console.log('[Shutdown] Goodbye.');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // ── Reconnection Watchdog ──────────────────────────
  // Periodically check agent connections and reconnect if needed
  const RECONNECT_INTERVAL = 30000; // 30 seconds
  const MAX_RECONNECT_ATTEMPTS = 5;

  async function checkAgentConnections() {
    const agentNames = ['verificationAgent', 'puzzleAgent', 'loreAgent', 'treasuryAgent'];

    for (const name of agentNames) {
      const agent = agents[name];
      if (!agent) continue;

      const sphere = agent.sphere;
      if (!sphere || !sphere.client) continue;

      const connected = sphere.client.connected || sphere.client.connecting;
      if (!connected) {
        console.warn(`[Reconnect] ${name} Sphere disconnected. Attempting reconnect...`);
        try {
          await sphere.client.connect();
          console.log(`[Reconnect] ${name} Sphere reconnected successfully`);
        } catch (err) {
          console.error(`[Reconnect] Failed to reconnect ${name}:`, err.message);
        }
      }
    }
  }

  // Start the reconnection watchdog
  const reconnectTimer = setInterval(checkAgentConnections, RECONNECT_INTERVAL);

  // Also attempt to re-create guild rooms if they were lost during reconnect
  async function reensureGuildGroups() {
    if (guildGroupChats.size === 0 && agents.verificationAgent?.sphere?.groupChat) {
      console.log('[GroupChat] No cached guild groups — attempting recreation...');
      await ensureGuildGroupChats(agents);
    }
  }

  // Run guild group recovery on a longer interval (every 5 min)
  const guildRecoveryTimer = setInterval(reensureGuildGroups, 300000);

  // Clear reconnect timers on shutdown (prevents hanging)
  const originalExit = shutdown;
  const shutdownWithTimers = async (signal) => {
    clearInterval(reconnectTimer);
    clearInterval(guildRecoveryTimer);
    await originalExit(signal);
  };

  // Override the shutdown handler to clean up timers first
  process.listeners('SIGINT').forEach((l) => process.removeListener('SIGINT', l));
  process.listeners('SIGTERM').forEach((l) => process.removeListener('SIGTERM', l));
  process.on('SIGINT', () => shutdownWithTimers('SIGINT'));
  process.on('SIGTERM', () => shutdownWithTimers('SIGTERM'));
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
