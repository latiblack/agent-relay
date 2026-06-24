# 🤖 Agent Relay

**Multi-agent quest platform built on Unicity.** Connect your Sphere wallet, join a guild, and watch four AI agents negotiate quests over Sphere SDK peer-to-peer DMs — zero LLM calls, zero API spend.

The agents are discoverable on the **Sphere Market** bulletin board, use **NIP-29 group chats** for guild communication, and can be launched via **`unicity://connect` deep links**.

```ascii
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Verification│    │    Puzzle   │    │     Lore    │    │  Treasury   │
│    Agent    │◄──►│    Agent    │◄──►│    Agent    │◄──►│    Agent    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       ▲                 ▲                  ▲                    ▲
       │                 │                  │                    │
       └─────────────────┴────── Sphere SDK P2P DMs ────────────┘
       │                 │                  │                    │
       └─────────────────┴─── Market Intents (bulletin board) ──┘
                                 │
                          ┌──────┴──────┐         ┌──────────────┐
                          │  Relay API  │◄───────►│ NIP-29 Guild │
                          │  :3104/:3105│         │  Group Chats │
                          └──────┬──────┘         └──────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
             ┌──────┴──────┐          ┌───────┴───────┐
             │   Frontend  │◄────────►│  Deep Links   │
             │ (Vite+React)│   quest  │ unicity://___ │
             └─────────────┘    param └───────────────┘
```

## ✨ Flow

1. **Connect Wallet** — Sphere wallet (any BIP39 mnemonic)
2. **Join Guild** — Explorer, Builder, Creator, or Research guild
3. **Get Passport** — Relay key + passport ID for agent access
4. **Pick a Quest** — Available quests listed from the on-chain Market
5. **Agent Console** — Real-time stream of agent-to-agent DM negotiation
6. **Solve & Earn** — Submit answers → agents validate → XP rewarded

### Deep Link Flow

Share quests with anyone via a link:
```
https://agent-quest-relay.vercel.app?quest=signal-hunt-01
```
or from Sphere wallet:
```
unicity://connect/launch?questId=signal-hunt-01&passportId=AR-XXXX
```

## 🧠 Quest Agents

All agents are **Sphere SDK identities** with their own mnemonics, nametags, and Nostr DMs:

| Agent | Nametag | Role | Market Intent |
|-------|---------|------|--------------|
| **Verification** | `@ar-verify` | Validates passports & relay keys | `verify_key` service |
| **Puzzle** | `@agentrelay-puzzle` | Presents puzzles, validates answers | Signal Hunt puzzle |
| **Lore** | `@agentrelay-lore` | Advances narrative, provides context | Story progression |
| **Treasury** | `@agentrelay-treasury` | Awards XP on completion | Reward claims |

Each agent posts a **Market Intent** on startup, making them discoverable on the [Sphere Market](https://sphere.unicity.network/markets). Search for "quest" to find them.

## 💬 NIP-29 Guild Group Chats

Four guild chat rooms are created on server startup:

| Room | Purpose |
|------|---------|
| `explorer-guild` | Discovery & recon missions |
| `builder-guild` | Development & infrastructure |
| `creator-guild` | Design & content |
| `research-guild` | Investigation & analysis |

## 🏗️ Architecture

```
agent-relay/
├── packages/
│   ├── frontend/              # Vite + React (hosted on Vercel)
│   │   └── src/
│   │       ├── App.jsx                # Main flow UI
│   │       └── hooks/
│   │           ├── useWallet.js       # Sphere wallet connection
│   │           └── useQuestConsole.js # WS agent console
│   └── relay-server/          # Node.js backend (VPS)
│       └── src/
│           ├── index.js               # HTTP API + WebSocket bridge
│           ├── passport.js            # Passport/relay key + Supabase
│           ├── quest-agent.js         # Base agent class (Sphere SDK)
│           ├── quest-session.js       # Quest state machine
│           ├── quest-loader.js        # .md quest parser
│           ├── inapp-agent.js         # Per-user AI middleman
│           ├── constants.js           # Agent registry, quest defs
│           ├── agents/
│           │   ├── verification-agent.js
│           │   ├── puzzle-agent.js
│           │   ├── lore-agent.js
│           │   └── treasury-agent.js
│           └── quests/               # .md quest definition files
├── supabase/                  # DB schema for passport persistence
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- [Sphere SDK](https://sphere.unicity.network/developers) compatible wallet

### Local Development

```bash
# Clone the repo
git clone https://github.com/latiblack/agent-relay
cd agent-relay

# Install dependencies
npm install

# 1. Start the relay server (agents + API)
cd packages/relay-server
cp .env.example .env       # Add your agent mnemonics
npm run dev

# 2. Start the frontend (in another terminal)
cd packages/frontend
cp .env.example .env       # Set VITE_RELAY_SERVER=http://localhost:3104
npm run dev
```

Frontend runs on `http://localhost:3000`, relay server on `http://localhost:3104`.

### Environment Variables

#### Frontend (`packages/frontend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_RELAY_SERVER` | `http://localhost:3104` | Relay server API URL |

#### Relay Server (`packages/relay-server/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `UNICITY_NETWORK` | `testnet` | Unicity network target |
| `RELAY_PORT` | `3104` | HTTP API port |
| `WSS_PORT` | `3105` | WebSocket bridge port |
| `DATA_DIR` | `./data` | Wallet data directory |
| `VERIFICATION_MNEMONIC` | — | Sphere mnemonic for Verification Agent |
| `PUZZLE_MNEMONIC` | — | Sphere mnemonic for Puzzle Agent |
| `LORE_MNEMONIC` | — | Sphere mnemonic for Lore Agent |
| `TREASURY_MNEMONIC` | — | Sphere mnemonic for Treasury Agent |
| `IN_APP_MNEMONIC` | — | Sphere mnemonic for per-user InApp Agent |
| `SUPABASE_URL` | — | Supabase project URL (passport persistence) |
| `SUPABASE_SERVICE_KEY` | — | Supabase service role key |
| `CONNECT_DEEP_LINK_BASE` | `unicity://connect` | Deep link URL scheme |

## 🌐 Deployment

- **Frontend** → Deploy `packages/frontend` to **Vercel** (SPA rewrites configured in `vercel.json`). Set `VITE_RELAY_SERVER` env var.
- **Relay Server** → Deploy to your own Node host (VPS, Fly.io, Railway). Requires a Supabase project for passport persistence.

## 🧪 API

### Create Passport

```http
POST /passport
Content-Type: application/json

{ "walletAddress": "DIRECT://...", "guild": "explorer", "nametag": "@alice" }

→ {
  "success": true,
  "passport": {
    "passportId": "AR-a1b2c3d4",
    "relayKey": "x9k2-m4v7",
    "guild": "explorer",
    "walletAddress": "DIRECT://..."
  }
}
```

### Deploy Quest

```http
POST /quest/deploy
Content-Type: application/json

{ "passportId": "AR-a1b2c3d4", "questId": "signal-hunt-01" }

→ { "success": true, "data": { "questId": "signal-hunt-01", "quest": "Signal Hunt", "fragments": 5 } }
```

### Submit Answer

```http
POST /quest/submit-answer
Content-Type: application/json

{ "passportId": "AR-a1b2c3d4", "answer": "light" }

→ { "success": true }
```

### Explore Market (Sphere Bulletin Board)

```http
GET /quest/market/explore?q=quest&limit=10

→ {
  "source": "market",
  "count": 4,
  "intents": [ ... agent listings ... ],
  "localQuests": [ ... local quest defs ... ]
}
```

### Launch via Deep Link

```http
POST /connect/launch
Content-Type: application/json

{ "questId": "signal-hunt-01", "passportId": "AR-a1b2c3d4" }

→ {
  "success": true,
  "deepLink": "unicity://connect/launch?questId=signal-hunt-01&passportId=AR-a1b2c3d4",
  "data": { "questId": "signal-hunt-01", "quest": "Signal Hunt", "guild": "explorer" }
}
```

### Health Check

```http
GET /health

→ { "status": "ok", "agents": 4, "quests": 1, "sessions": 0 }
```

### WebSocket Bridge

Connect to `ws://<host>:3105` to stream agent-to-agent messages in real time.

## 🔮 Roadmap

- [x] **Pure Sphere SDK Identity** — All agents run as Sphere instances with Nostr DMs
- [x] **Market Intents** — Agents discoverable on the Sphere bulletin board
- [x] **NIP-29 Group Chats** — Guild chat rooms on the NIP-29 relay
- [x] **Deep Links** — `unicity://connect` URL scheme for quest launc
- [ ] **AgentSphere Listing** — Register on sphere.unicity.network/agents
- [ ] **In-app Guide Agent** — Cheap pooled LLM (Haiku/4o-mini) for player onboarding
- [ ] **Guild Leaderboards** — Reputation & completion tracking
- [ ] **Astrid WASM Migration** — Sandboxed agent capsules for trustless execution
- [ ] **Sponsored Missions** — Third-party quest submissions via Market Intents

## 🛡️ License

MIT — built for the Unicity ecosystem.
