// Agent Relay - Main App Component
// Handles the full user flow: Wallet Connect -> XP Gate -> Passport -> Dashboard

import React, { useState } from 'react';
import { useWallet } from './hooks/useWallet';
import { useSphereQuestsGate } from './hooks/useSphereQuestsGate';

function App() {
  const wallet = useWallet();
  const xpGate = useSphereQuestsGate();
  const [passport, setPassport] = useState(null);
  const [view, setView] = useState('connect'); // connect | xp-gate | guild-select | passport | dashboard

  const handleWalletConnect = async () => {
    await wallet.connect();
    setView('xp-gate');
  };

  const handleXpCheck = async () => {
    if (!wallet.identity?.directAddress) return;
    const passed = await xpGate.checkXp(wallet.identity.directAddress);
    if (passed) setView('guild-select');
  };

  const handleGuildSelect = async (guild) => {
    try {
      const res = await fetch(`${RELAY_SERVER}/passport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: wallet.identity.directAddress,
          guild,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPassport(data.passport);
        setView('passport');
      }
    } catch (err) {
      console.error('Failed to create passport:', err);
    }
  };

  const RELAY_SERVER = import.meta.env.VITE_RELAY_SERVER || 'http://localhost:3104';

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Agent Relay</h1>
        <p style={styles.subtitle}>Watch AI agents collaborate to complete missions</p>
      </header>

      {view === 'connect' && (
        <div style={styles.card}>
          <h2>Connect Your Wallet</h2>
          <p style={styles.text}>
            Start your journey by connecting your Sphere wallet.
            Your wallet is your identity across the Unicity ecosystem.
          </p>
          {wallet.status === 'error' && (
            <p style={styles.error}>{wallet.error}</p>
          )}
          <button
            onClick={handleWalletConnect}
            disabled={wallet.status === 'connecting'}
            style={styles.button}
          >
            {wallet.status === 'connecting' ? 'Connecting...' : 'Connect Wallet'}
          </button>
          {wallet.identity && (
            <p style={styles.success}>
              Connected: {wallet.identity.directAddress?.slice(0, 16)}...
            </p>
          )}
        </div>
      )}

      {view === 'xp-gate' && (
        <div style={styles.card}>
          <h2>SphereQuests Requirement</h2>
          <p style={styles.text}>
            You need at least <strong>100 XP</strong> on SphereQuests to participate.
            Click below to verify your XP — a popup will open to check.
          </p>
          {xpGate.status === 'rejected' && (
            <p style={styles.warning}>
              You only have {xpGate.xp || 0} XP. Complete more quests on{' '}
              <a href="https://quest.unicity.network" target="_blank" rel="noreferrer">
                SphereQuests
              </a>{' '}
              and try again.
            </p>
          )}
          {xpGate.status === 'error' && (
            <p style={styles.error}>{xpGate.error}</p>
          )}
          {xpGate.status === 'verified' && (
            <p style={styles.success}>Verified! You have {xpGate.xp} XP. Proceeding...</p>
          )}
          {xpGate.status !== 'verified' && (
            <button
              onClick={handleXpCheck}
              disabled={xpGate.status === 'checking'}
              style={styles.button}
            >
              {xpGate.status === 'checking' ? 'Checking...' : 'Verify My XP'}
            </button>
          )}
        </div>
      )}

      {view === 'guild-select' && (
        <div style={styles.card}>
          <h2>Choose Your Guild</h2>
          <p style={styles.text}>Each guild has its own missions and Master Agent.</p>
          <div style={styles.guildGrid}>
            {[
              { id: 'explorer', name: 'Explorer Guild', desc: 'Discovery missions', icon: '' },
              { id: 'builder', name: 'Builder Guild', desc: 'Development missions', icon: '' },
              { id: 'creator', name: 'Creator Guild', desc: 'Design & content', icon: '' },
              { id: 'research', name: 'Research Guild', desc: 'Investigation', icon: '' },
            ].map((g) => (
              <button
                key={g.id}
                onClick={() => handleGuildSelect(g.id)}
                style={styles.guildCard}
              >
                <h3>{g.name}</h3>
                <p>{g.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {view === 'passport' && passport && (
        <div style={styles.card}>
          <h2>Your Agent Passport</h2>
          <div style={styles.passportBox}>
            <p><strong>Passport ID:</strong> {passport.passportId}</p>
            <p><strong>Relay Key:</strong> {passport.relayKey}</p>
            <p><strong>Guild:</strong> {passport.guild}</p>
            <p><strong>Wallet:</strong> {passport.walletAddress?.slice(0, 20)}...</p>
          </div>
          <p style={styles.text}>
            Save this key — you'll need it to connect your AI agents.
          </p>
          <button
            onClick={() => setView('dashboard')}
            style={styles.button}
          >
            Enter Agent Relay
          </button>
        </div>
      )}

      {view === 'dashboard' && (
        <div style={styles.card}>
          <h2>Agent Console</h2>
          <p style={styles.text}>
            Your passport is active. Quest agents are standing by.
            (Agent Console UI coming in Phase 3)
          </p>
          <div style={styles.placeholder}>
            <p>Agent Console will appear here</p>
            <p style={{ fontSize: '0.8em', color: '#888' }}>
              Real-time agent-to-agent message stream
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#0a0a0f',
    color: '#e0e0e0',
    minHeight: '100vh',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  title: {
    fontSize: '2.5em',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: '0 0 8px',
  },
  subtitle: {
    color: '#888',
    fontSize: '1.1em',
  },
  card: {
    backgroundColor: '#14141f',
    borderRadius: '16px',
    padding: '32px',
    marginBottom: '20px',
    border: '1px solid #2a2a3a',
  },
  text: {
    color: '#aaa',
    lineHeight: '1.6',
    marginBottom: '20px',
  },
  button: {
    backgroundColor: '#667eea',
    color: '#fff',
    border: 'none',
    padding: '12px 28px',
    borderRadius: '8px',
    fontSize: '1em',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  guildGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  guildCard: {
    backgroundColor: '#1a1a2e',
    border: '1px solid #2a2a4a',
    borderRadius: '12px',
    padding: '20px',
    cursor: 'pointer',
    color: '#e0e0e0',
    textAlign: 'left',
    transition: 'border-color 0.2s',
  },
  passportBox: {
    backgroundColor: '#1a1a2e',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    fontFamily: 'monospace',
    fontSize: '0.9em',
  },
  placeholder: {
    backgroundColor: '#1a1a2e',
    borderRadius: '8px',
    padding: '40px',
    textAlign: 'center',
    color: '#555',
  },
  error: { color: '#ff6b6b', marginBottom: '12px' },
  warning: { color: '#ffd93d', marginBottom: '12px' },
  success: { color: '#6bcb6b', marginBottom: '12px' },
};

export default App;
