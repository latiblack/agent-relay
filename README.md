# 🤖 Agent Relay

**Multi-agent quest platform built on Unicity.** Users get a Unicity passport, join a guild, and watch AI agents negotiate quests over Sphere SDK peer-to-peer DMs.

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Verification│    │    Puzzle   │    │     Lore    │    │  Treasury   │
│    Agent    │◄──►│    Agent    │◄──►│    Agent    │◄──►│    Agent    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       ▲                 ▲                  ▲                    ▲
       │                 │                  │                    │
       └─────────────────┴────── Sphere SDK P2P DMs ────────────┘
                                 │
                          ┌──────┴──────┐
                          │  Relay API  │
                          │  :3104/:3105│
                          └──────┬──────┘
                                 │
                          ┌──────┴──────┐
                          │   Frontend  │
                          │ (Vite+React)│
                          └─────────────┘
```

## ✨ Flow

1. **Connect Wallet** — Sphere wallet via Sphere Connect SDK
2. **XP Gate** — 100 XP check via SphereQuests popup bridge
3. **Join Guild** — Explorer, Builder, Creator, or Research
4. **Get Passport** — Relay key + passport ID for agent access
5. **Agent Console** — Real-time stream of agent-to-agent mission negotiation

## 🧠 Quest Agents

All agents are **zero-LLM state machines** — pure logic + Sphere SDK P2P DMs:

| Agent | Role | Subprotocol |
|-------|------|-------------|
| **Verification** | Validates passports & relay keys | Key exchange |
| **Puzzle** | Presents puzzles, validates answers | Challenge/response |
| **Lore** | Advances narrative, provides context | Story progression |
| **Treasury** | Awards completion badges & on-chain rewards | Reward distribution |

## 🏗️ Architecture

```
agent-relay/
├── packages/
│   ├── frontend/          # Vite + React + Sphere Connect
│   │   └── src/
│   │       ├── App.jsx           # Main flow UI
│   │       ├── hooks/
│   │       │   ├── useWallet.js        # Sphere wallet connection
│   │       │   └── useSphereQuestsGate.js  # XP popup bridge
│   │       └── ...
│   └── relay-server/      # Node.js + Sphere SDK
│       └── src/
│           ├── index.js             # HTTP API + WebSocket bridge
│           ├── passport.js          # Passport/relay key generation
│           ├── quest-agent.js       # Base agent class
│           └── agents/
│               ├── verification-agent.js
│               ├── puzzle-agent.js
│               ├── lore-agent.js
│               └── treasury-agent.js
├── package.json           # npm workspaces root
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- [Sphere SDK](https://docs.unicity.network/sphere-sdk) compatible wallet
- SphereQuests account with 100+ XP (for gated features)

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

## 🌐 Deployment

- **Frontend** → Deploy `packages/frontend` to **Vercel** (SPA rewrites configured in `vercel.json`). Set `VITE_RELAY_SERVER` env var in Vercel dashboard.
- **Relay Server** → Deploy `packages/relay-server` to your own Node host (VPS, Fly.io, Railway, Render).

## 🧪 API

### Create Passport

```http
POST /passport
Content-Type: application/json

{
  "walletAddress": "0x...",
  "guild": "explorer"
}

→ {
  "success": true,
  "passport": {
    "passportId": "AR-a1b2c3d4",
    "relayKey": "x9k2-m4v7",
    "guild": "explorer",
    "walletAddress": "0x..."
  }
}
```

### WebSocket Bridge

Connect to `ws://<host>:3105` to stream agent-to-agent messages in real time.

## 🔮 Roadmap

- [ ] **In-app Guide Agent** — Cheap pooled LLM (Haiku/4o-mini) for player onboarding
- [ ] **Quest State Machine** — Full multi-agent orchestration with branching paths
- [ ] **Guild Leaderboards** — Reputation & completion tracking
- [ ] **Astrid WASM Migration** — Sandboxed agent capsules for trustless execution
- [ ] **Universal .md Protocol** — Any AI client can parse quests and submit answers

## 🛡️ License

MIT — built for the Unicity ecosystem.
