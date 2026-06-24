// Agent Relay - Main App Component
// Handles the full user flow: Wallet Connect -> XP Gate -> Passport -> Dashboard
// Styled with Unicity SphereQuests design language

import React, { useState } from 'react';
import { useWallet } from './hooks/useWallet';
import { useSphereQuestsGate } from './hooks/useSphereQuestsGate';

const THEME = {
  bg: '#0a0a0a',
  cardBg: 'rgba(255, 255, 255, 0.03)',
  cardBorder: 'rgba(255, 255, 255, 0.06)',
  text: '#f1f5f9',
  textMuted: 'rgba(241, 245, 249, 0.45)',
  accent: '#FF6F00',
  accentBg: 'rgba(255, 111, 0, 0.08)',
  accentBorder: 'rgba(255, 111, 0, 0.12)',
  radius: '16px',
  radiusPill: '9999px',
};

function App() {
  const wallet = useWallet();
  const xpGate = useSphereQuestsGate();
  const [passport, setPassport] = useState(null);
  const [view, setView] = useState('connect');
  const [selectedGuild, setSelectedGuild] = useState(null);

  const RELAY_SERVER = import.meta.env.VITE_RELAY_SERVER || 'http://localhost:3104';

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
    setSelectedGuild(guild);
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

  const sectionLabel = (text) => (
    <div style={{
      fontSize: '10px',
      fontWeight: 700,
      letterSpacing: '0.28em',
      textTransform: 'uppercase',
      color: `${THEME.accent}`,
      opacity: 0.7,
      marginBottom: '12px',
    }}>
      {text}
    </div>
  );

  const stepNumber = (n) => (
    <div style={{
      fontSize: '11px',
      fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: '0.18em',
      color: THEME.textMuted,
      marginBottom: '6px',
    }}>
      {String(n).padStart(2, '0')}
    </div>
  );

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logo}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="15" stroke={THEME.accent} strokeWidth="1.5" opacity="0.3"/>
            <circle cx="16" cy="16" r="8" fill={THEME.accent} opacity="0.15"/>
            <circle cx="16" cy="16" r="4" fill={THEME.accent}/>
          </svg>
        </div>
        <h1 style={styles.title}>AGENT RELAY</h1>
        <p style={styles.subtitle}>Multi-agent quest platform on Unicity</p>
      </header>

      {view === 'connect' && (
        <div style={styles.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={styles.iconCircle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={THEME.accent} strokeWidth="1.5">
                <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>
            <div>
              {stepNumber(1)}
              <h2 style={styles.cardTitle}>Connect Your Wallet</h2>
            </div>
          </div>
          <p style={styles.text}>
            Your Sphere wallet is your identity across the Unicity ecosystem.
            No account needed — just connect and you're in.
          </p>
          {wallet.status === 'error' && (
            <p style={styles.error}>{wallet.error}</p>
          )}
          <button
            onClick={handleWalletConnect}
            disabled={wallet.status === 'connecting'}
            style={{
              ...styles.button,
              opacity: wallet.status === 'connecting' ? 0.5 : 1,
            }}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={styles.iconCircle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={THEME.accent} strokeWidth="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div>
              {stepNumber(2)}
              <h2 style={styles.cardTitle}>SphereQuests Gate</h2>
            </div>
          </div>
          {sectionLabel('REQUIREMENT')}
          <p style={styles.text}>
            You need at least <strong style={{ color: THEME.accent }}>100 XP</strong> on SphereQuests to enter the relay.
          </p>
          {xpGate.status === 'rejected' && (
            <div style={styles.warningBox}>
              <p style={styles.warning}>
                You only have {xpGate.xp || 0} XP. Complete more quests on{' '}
                <a href="https://quest.unicity.network" target="_blank" rel="noreferrer" style={styles.link}>
                  SphereQuests
                </a>{' '} and try again.
              </p>
            </div>
          )}
          {xpGate.status === 'error' && (
            <p style={styles.error}>{xpGate.error}</p>
          )}
          {xpGate.status === 'verified' && (
            <div style={styles.successBox}>
              <p style={styles.success}>✓ Verified! You have {xpGate.xp} XP.</p>
            </div>
          )}
          {xpGate.status !== 'verified' && (
            <button
              onClick={handleXpCheck}
              disabled={xpGate.status === 'checking'}
              style={{
                ...styles.button,
                opacity: xpGate.status === 'checking' ? 0.5 : 1,
              }}
            >
              {xpGate.status === 'checking' ? 'Checking...' : 'Verify My XP'}
            </button>
          )}
        </div>
      )}

      {view === 'guild-select' && (
        <div style={styles.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={styles.iconCircle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={THEME.accent} strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div>
              {stepNumber(3)}
              <h2 style={styles.cardTitle}>Choose Your Guild</h2>
            </div>
          </div>
          {sectionLabel('AFFILIATION')}
          <p style={styles.text}>Each guild has its own missions and Master Agent.</p>
          <div style={styles.guildGrid}>
            {[
              { id: 'explorer', name: 'Explorer Guild', desc: 'Discovery missions', icon: '🔭' },
              { id: 'builder', name: 'Builder Guild', desc: 'Development missions', icon: '⚒️' },
              { id: 'creator', name: 'Creator Guild', desc: 'Design & content', icon: '🎨' },
              { id: 'research', name: 'Research Guild', desc: 'Investigation', icon: '🔬' },
            ].map((g) => (
              <button
                key={g.id}
                onClick={() => handleGuildSelect(g.id)}
                style={{
                  ...styles.guildCard,
                  borderColor: selectedGuild === g.id ? THEME.accent : THEME.cardBorder,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.accent; e.currentTarget.style.borderOpacity = '0.5'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = selectedGuild === g.id ? THEME.accent : THEME.cardBorder; }}
              >
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>{g.icon}</div>
                <h3 style={styles.guildName}>{g.name}</h3>
                <p style={styles.guildDesc}>{g.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {view === 'passport' && passport && (
        <div style={styles.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={styles.iconCircle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={THEME.accent} strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18"/>
                <path d="M9 21V9"/>
              </svg>
            </div>
            <div>
              {stepNumber(4)}
              <h2 style={styles.cardTitle}>Your Agent Passport</h2>
            </div>
          </div>
          {sectionLabel('IDENTITY')}
          <div style={styles.passportBox}>
            <div style={styles.passportField}>
              <span style={styles.passportLabel}>PASSPORT ID</span>
              <span style={styles.passportValue}>{passport.passportId}</span>
            </div>
            <div style={styles.passportField}>
              <span style={styles.passportLabel}>RELAY KEY</span>
              <span style={{ ...styles.passportValue, color: THEME.accent }}>{passport.relayKey}</span>
            </div>
            <div style={styles.passportField}>
              <span style={styles.passportLabel}>GUILD</span>
              <span style={styles.passportValue}>{passport.guild}</span>
            </div>
            <div style={styles.passportField}>
              <span style={styles.passportLabel}>WALLET</span>
              <span style={styles.passportValue}>{passport.walletAddress?.slice(0, 20)}...</span>
            </div>
          </div>
          <p style={{ ...styles.text, fontSize: '12px', color: THEME.textMuted }}>
            Save your relay key — you'll need it to connect your AI agents.
          </p>
          <button
            onClick={() => setView('dashboard')}
            style={styles.button}
          >
            Enter Agent Relay →
          </button>
        </div>
      )}

      {view === 'dashboard' && (
        <div style={styles.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={styles.iconCircle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={THEME.accent} strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <h2 style={styles.cardTitle}>Agent Console</h2>
            </div>
          </div>
          {sectionLabel('ACTIVE')}
          <p style={styles.text}>
            Your passport is active. Quest agents are standing by.
          </p>
          <div style={styles.placeholderBox}>
            <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.3 }}>⊞</div>
            <p style={{ color: THEME.textMuted, fontSize: '13px' }}>
              Real-time agent messages will appear here
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '640px',
    margin: '0 auto',
    padding: '40px 20px 80px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    backgroundColor: THEME.bg,
    color: THEME.text,
    minHeight: '100vh',
  },
  header: {
    textAlign: 'center',
    marginBottom: '48px',
  },
  logo: {
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'center',
  },
  title: {
    fontSize: '28px',
    fontWeight: 800,
    letterSpacing: '0.15em',
    color: THEME.text,
    margin: '0 0 8px',
  },
  subtitle: {
    color: THEME.textMuted,
    fontSize: '13px',
    letterSpacing: '0.05em',
    fontFamily: "'JetBrains Mono', monospace",
  },
  card: {
    backgroundColor: THEME.cardBg,
    border: `1px solid ${THEME.cardBorder}`,
    borderRadius: THEME.radius,
    padding: '28px',
    marginBottom: '16px',
    backdropFilter: 'blur(8px)',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 700,
    margin: 0,
    lineHeight: 1.3,
  },
  text: {
    color: THEME.textMuted,
    lineHeight: 1.7,
    fontSize: '14px',
    marginBottom: '20px',
  },
  iconCircle: {
    width: '40px',
    height: '40px',
    borderRadius: THEME.radiusPill,
    backgroundColor: THEME.accentBg,
    border: `1px solid ${THEME.accentBorder}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  button: {
    backgroundColor: THEME.accent,
    color: '#fff',
    border: 'none',
    padding: '14px 32px',
    borderRadius: THEME.radiusPill,
    fontSize: '14px',
    fontWeight: 600,
    letterSpacing: '0.03em',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'inline-block',
  },
  guildGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    marginTop: '8px',
  },
  guildCard: {
    backgroundColor: THEME.cardBg,
    border: `1px solid ${THEME.cardBorder}`,
    borderRadius: THEME.radius,
    padding: '20px 16px',
    cursor: 'pointer',
    color: THEME.text,
    textAlign: 'left',
    transition: 'border-color 0.2s ease',
    fontFamily: "'Inter', sans-serif",
  },
  guildName: {
    fontSize: '14px',
    fontWeight: 600,
    margin: '0 0 4px',
  },
  guildDesc: {
    fontSize: '12px',
    color: THEME.textMuted,
    margin: 0,
  },
  passportBox: {
    backgroundColor: THEME.accentBg,
    border: `1px solid ${THEME.accentBorder}`,
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
  },
  passportField: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: `1px solid ${THEME.cardBorder}`,
  },
  passportLabel: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    color: THEME.textMuted,
    fontFamily: "'JetBrains Mono', monospace",
  },
  passportValue: {
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: "'JetBrains Mono', monospace",
    color: THEME.text,
  },
  placeholderBox: {
    backgroundColor: THEME.cardBg,
    border: `1px dashed ${THEME.cardBorder}`,
    borderRadius: THEME.radius,
    padding: '40px',
    textAlign: 'center',
  },
  error: {
    color: '#ff6b6b',
    fontSize: '13px',
    marginBottom: '12px',
  },
  warning: {
    color: THEME.text,
    fontSize: '13px',
    margin: 0,
  },
  warningBox: {
    backgroundColor: THEME.accentBg,
    border: `1px solid ${THEME.accentBorder}`,
    borderRadius: '10px',
    padding: '14px',
    marginBottom: '16px',
  },
  success: {
    color: THEME.accent,
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '12px',
  },
  successBox: {
    backgroundColor: THEME.accentBg,
    border: `1px solid ${THEME.accentBorder}`,
    borderRadius: '10px',
    padding: '14px',
    marginBottom: '16px',
  },
  link: {
    color: THEME.accent,
    textDecoration: 'underline',
  },
};

export default App;
