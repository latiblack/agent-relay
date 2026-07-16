// Smoke test: deploy a quest against the live relay and capture real agent-to-agent traffic.
// Run:  node smoke-test.mjs   (relay must be running locally on RELAY_PORT/WSS_PORT)
import { WebSocket } from 'ws';
import crypto from 'crypto';

const RELAY = process.env.RELAY_HTTP || 'http://127.0.0.1:3104';
const WSS = process.env.RELAY_WS || 'ws://127.0.0.1:3105';
const API = RELAY.replace(/\/$/, '');

function post(path, body) {
  return fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json().catch(() => ({})));
}
function get(path) {
  return fetch(API.replace(/:\d+$/, ':3106') + path).then(r => r.json().catch(() => null));
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('=== AGENT RELAY SMOKE TEST ===');
  console.log(`relay http: ${API}\n`);

  // 1. Agent status BEFORE
  const before = await get('/agent-status').catch(() => null);
  console.log('[agent-status BEFORE]', JSON.stringify(before));

  // 2. Create a fresh passport
  const created = await post('/passport', {
    walletAddress: '0xsmoke' + crypto.randomBytes(8).toString('hex'),
    guild: 'explorer',
    nametag: 'SmokeTest',
  });
  const passportId = created.passport?.passportId || ('smoke-' + crypto.randomBytes(4).toString('hex'));
  console.log('[passport]', JSON.stringify(created).slice(0, 160));

  // Warm the passport cache (deploy validates synchronously from the in-memory Map;
  // a GET validate ensures it's present so deploy's first call doesn't race a cold cache).
  await fetch(API + '/passport/' + encodeURIComponent(passportId)).then(r => r.json()).catch(() => ({}));

  // 3. Open a WS console connection and auth
  const ws = new WebSocket(WSS);
  const messages = [];
  let authed = false;
  await new Promise((resolve, reject) => {
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'auth', passportId }));
    });
    ws.on('message', (raw) => {
      const m = JSON.parse(raw.toString());
      if (m.type === 'auth_ok') { authed = true; resolve(); }
      else if (m.type === 'agent_message') {
        messages.push(m);
        const ts = new Date(m.timestamp).toISOString().slice(11, 23);
        console.log(`  ${ts}  ${m.from} -> ${m.to}  ${m.message}`);
      }
    });
    ws.on('error', reject);
    setTimeout(() => reject(new Error('ws timeout')), 12000);
  });
  console.log(`\n[ws] authed=${authed}, deploying quest...\n`);

  // 4. Deploy the quest
  const deploy = await post('/quest/deploy', { passportId, questId: 'signal-hunt-01', userTag: 'SmokeTest' });
  console.log('[deploy]', JSON.stringify(deploy));

  // 5. Wait for the agent flow to stream
  await sleep(8000);
  ws.close();

  // 6. Agent status AFTER — proves counters incremented from real traffic
  const after = await get('/agent-status').catch(() => null);
  console.log('\n[agent-status AFTER]', JSON.stringify(after));
  if (before && after) {
    const inc = after.agents.map(a => {
      const b = before.agents.find(x => x.id === a.id)?.msgs || 0;
      return `${a.label}: +${a.msgs - b}`;
    });
    console.log('[delta]', inc.join(', '));
  }

  // 7. Verdict
  const real = messages.filter(m => m.from && m.from !== 'SYSTEM');
  console.log(`\n=== RESULT ===`);
  console.log(`total console events: ${messages.length}`);
  console.log(`agent-sourced events: ${real.length}`);
  const agentIds = new Set(real.map(m => m.from));
  console.log(`distinct agent senders: ${[...agentIds].join(', ') || '(none)'}`);
  if (real.length >= 3 && agentIds.size >= 2) {
    console.log('VERDICT: PASS — real agent-to-agent Nostr/console traffic observed.');
  } else {
    console.log('VERDICT: WEAK — too few agent messages to confirm autonomy.');
  }
}

main().catch(e => { console.error('SMOKE TEST FAILED:', e.message); process.exit(1); });
