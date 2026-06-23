// Generate Sphere mnemonics for quest agents
// Run with: node scripts/generate-identities.mjs

import { Sphere } from '@unicitylabs/sphere-sdk';
import { createNodeProviders } from '@unicitylabs/sphere-sdk/impl/nodejs';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const AGENTS = ['verification', 'puzzle', 'lore', 'treasury'];
const DATA_DIR = process.env.DATA_DIR || './data';
const NETWORK = process.env.UNICITY_NETWORK || 'testnet';

async function main() {
  console.log('Generating Sphere identities for quest agents...\n');

  for (const name of AGENTS) {
    const mnemonic = Sphere.generateMnemonic();
    const agentDir = path.resolve(DATA_DIR, 'agents', name);
    fs.mkdirSync(agentDir, { recursive: true });

    const providers = createNodeProviders({
      network: NETWORK,
      dataDir: agentDir,
    });

    const { sphere } = await Sphere.init({
      ...providers,
      network: NETWORK,
      mnemonic,
    });

    // Register nametag
    const nametag = `agentrelay-${name}`;
    try {
      await sphere.registerNametag(nametag);
      console.log(`  @${nametag} — registered ✅`);
    } catch (e) {
      console.log(`  @${nametag} — already taken or registration failed: ${e.message}`);
    }

    const identity = sphere.identity;
    console.log(`  Address: ${identity?.directAddress}`);
    console.log(`  Mnemonic: ${mnemonic}\n`);

    // Save to .env format
    const key = `${name.toUpperCase()}_MNEMONIC`;
    console.log(`  Add to .env: ${key}=${mnemonic}\n`);
  }

  console.log('Done. Copy the mnemonics above into your .env file.');
  process.exit(0);
}

main().catch(console.error);
