// Agent Relay - Regenerate agent nametags with shorter names
// Run with: node scripts/set-short-nametags.mjs

import { Sphere } from '@unicitylabs/sphere-sdk';
import { createNodeProviders } from '@unicitylabs/sphere-sdk/impl/nodejs';
import 'dotenv/config';

const AGENTS = [
  { name: 'verification', mnemonic: process.env.VERIFICATION_MNEMONIC, nametag: 'ar-verify' },
  { name: 'puzzle', mnemonic: process.env.PUZZLE_MNEMONIC, nametag: 'ar-puzzle' },
  { name: 'lore', mnemonic: process.env.LORE_MNEMONIC, nametag: 'ar-lore' },
  { name: 'treasury', mnemonic: process.env.TREASURY_MNEMONIC, nametag: 'ar-treasury' },
];

const DATA_DIR = process.env.DATA_DIR || './data';
const NETWORK = process.env.UNICITY_NETWORK || 'testnet';

async function main() {
  console.log('Setting short nametags for quest agents...\n');

  for (const agent of AGENTS) {
    if (!agent.mnemonic) {
      console.log(`  ${agent.name}: no mnemonic in .env, skipping`);
      continue;
    }

    const agentDir = `${DATA_DIR}/agents/${agent.name}`;
    const providers = createNodeProviders({
      network: NETWORK,
      dataDir: agentDir,
    });

    const { sphere } = await Sphere.init({
      ...providers,
      network: NETWORK,
      mnemonic: agent.mnemonic,
    });

    const nametag = agent.nametag;
    try {
      await sphere.registerNametag(nametag);
      console.log(`  @${nametag} — registered ✅`);
    } catch (e) {
      console.log(`  @${nametag} — ${e.message}`);
    }

    console.log(`  ${agent.name}: ${sphere.identity?.directAddress}\n`);
  }

  console.log('Done! Update constants.js with these nametags.');
  process.exit(0);
}

main().catch(console.error);
