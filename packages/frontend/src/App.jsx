// Agent Relay - Premium Landing Page
// Full flow: Landing → Wallet Connect → XP Gate → Guild → Passport → Dashboard

import React, { useState, useEffect } from 'react';
import { useWallet } from './hooks/useWallet';
import { useSphereQuestsGate } from './hooks/useSphereQuestsGate';

const A = '#FF6F00';
const B = '#E05A00';
const C = '#0a0a0a';
const D = '#f1f5f9';
const E = 'rgba(241, 245, 249, 0.45)';
const F = 'rgba(255, 255, 255, 0.03)';
const G = 'rgba(255, 255, 255, 0.06)';
const H = 'rgba(255, 111, 0, 0.08)';
const I = 'rgba(255, 111, 0, 0.12)';

const RELAY_SERVER = import.meta.env.VITE_RELAY_SERVER || 'http://localhost:3104';

function App() {
  const wallet = useWallet();
  const xpGate = useSphereQuestsGate();
  const [passport, setPassport] = useState(null);
  const [view, setView] = useState('landing');
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleWalletConnect = async () => {
    setView('connect');
    await wallet.connect();
    if (wallet.status === 'connected') setView('xp-gate');
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
        body: JSON.stringify({ walletAddress: wallet.identity.directAddress, guild }),
      });
      const data = await res.json();
      if (data.success) { setPassport(data.passport); setView('passport'); }
    } catch (err) { console.error('Failed to create passport:', err); }
  };

  if (view !== 'landing') {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px 80px', fontFamily: "'Mona Sans', sans-serif", backgroundColor: C, color: D, minHeight: '100vh' }}>
        <HeaderSmall onBack={() => setView('landing')} />
        {view === 'connect' && <ConnectView wallet={wallet} onConnect={handleWalletConnect} />}
        {view === 'xp-gate' && <XpGateView xpGate={xpGate} onCheck={handleXpCheck} />}
        {view === 'guild-select' && <GuildSelectView onSelect={handleGuildSelect} selected={selectedGuild} />}
        {view === 'passport' && <PassportView passport={passport} onEnter={() => setView('dashboard')} />}
        {view === 'dashboard' && <DashboardView />}
      </div>
    );
  }

  return <LandingPage onStart={handleWalletConnect} scrolled={scrolled} />;
}

// ───────────────────────────────────────────────────
// LANDING PAGE
// ───────────────────────────────────────────────────

function LandingPage({ onStart, scrolled }) {
  const agents = [
    { name: 'Verification', desc: 'Validates passports & relay keys', icon: '🛡️', protocol: 'Key exchange' },
    { name: 'Puzzle', desc: 'Presents challenges, validates answers', icon: '🧩', protocol: 'Challenge/response' },
    { name: 'Lore', desc: 'Advances narrative, reveals context', icon: '📜', protocol: 'Story progression' },
    { name: 'Treasury', desc: 'Awards badges & on-chain rewards', icon: '🏆', protocol: 'Reward distribution' },
  ];

  return (
    <div style={{ fontFamily: "'Mona Sans', sans-serif", backgroundColor: C, color: D, minHeight: '100vh', overflow: 'hidden' }}>
      {/* Fixed Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: scrolled ? '12px 24px' : '20px 24px',
        background: scrolled ? 'rgba(10,10,10,0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.04)' : '1px solid transparent',
        transition: 'all 0.3s ease', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoMark size={28} />
          <span style={{ fontFamily: "'Hubot Sans', sans-serif", fontWeight: 600, fontSize: 15, letterSpacing: '0.12em' }}>AGENT RELAY</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {['Features', 'Agents', 'Roadmap'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} style={{
              color: E, fontSize: 13, fontWeight: 500, textDecoration: 'none', padding: '6px 14px',
              borderRadius: 8, fontFamily: "'Mona Sans', sans-serif", transition: 'all 0.2s',
            }}>{item}</a>
          ))}
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center', padding: '120px 20px 80px', position: 'relative', textAlign: 'center',
      }}>
        <div style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,111,0,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '10%', right: '10%',
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,111,0,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: H, border: `1px solid ${I}`, borderRadius: 9999,
          padding: '6px 16px 6px 6px', marginBottom: 32, fontSize: 12,
          fontWeight: 500, color: D, letterSpacing: '0.03em', fontFamily: "'Mona Sans', sans-serif",
        }}>
          <span style={{
            background: `linear-gradient(135deg, ${A}, ${B})`, borderRadius: 9999,
            padding: '2px 10px', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
          }}>BETA</span>
          Multi-agent quest platform on Unicity
        </div>

        <h1 style={{
          fontFamily: "'Hubot Sans', sans-serif",
          fontSize: 'clamp(42px, 8vw, 80px)', fontWeight: 600, lineHeight: 1.05,
          letterSpacing: '-0.03em', margin: '0 0 24px', maxWidth: 800,
        }}>
          Your agents,{' '}
          <span style={{ background: `linear-gradient(135deg, ${A}, #FF9E40)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            on a mission
          </span>
          <br />for the Unicity network.
        </h1>

        <p style={{
          color: E, fontSize: 18, lineHeight: 1.6, maxWidth: 540, marginBottom: 48,
          fontFamily: "'Mona Sans', sans-serif", fontWeight: 400,
        }}>
          Connect your Sphere wallet, join a guild, and watch four AI agents negotiate,
          puzzle, and compete to complete quests — all over Sphere SDK peer-to-peer DMs.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={onStart} style={btnGrad}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Mona Sans', sans-serif" }}>
              Enter the Relay
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </span>
          </button>
          <a href="#features" style={{
            ...btnOutline,
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
            fontFamily: "'Mona Sans', sans-serif",
          }}>
            Learn more
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: '100px 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionLabel>FEATURES</SectionLabel>
          <h2 style={{
            fontFamily: "'Hubot Sans', sans-serif",
            fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 600, margin: '0 0 12px', letterSpacing: '-0.02em',
          }}>
            From wallet to quest, in four steps.
          </h2>
          <p style={{ color: E, fontSize: 16, fontFamily: "'Mona Sans', sans-serif", maxWidth: 480, marginBottom: 60, lineHeight: 1.6 }}>
            No accounts, no emails. Your Sphere wallet is all you need.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {[
              { num: '01', title: 'Connect Wallet', desc: 'Your Sphere wallet is your identity. One click, no accounts.', icon: '🔌' },
              { num: '02', title: 'XP Gate', desc: '100 XP on SphereQuests unlocks the relay. Verified via popup bridge.', icon: '⚡' },
              { num: '03', title: 'Join Guild', desc: 'Pick your guild — Explorer, Builder, Creator, or Research.', icon: '🏰' },
              { num: '04', title: 'Get Passport', desc: 'Receive your passport ID and relay key. Your agents await.', icon: '🪪' },
            ].map((f, i) => (
              <div key={i} style={glassCard}>
                <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: E, letterSpacing: '0.15em', marginBottom: 8 }}>{f.num}</div>
                <div style={{ fontSize: 28, marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{ fontFamily: "'Hubot Sans', sans-serif", fontSize: 17, fontWeight: 600, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ color: E, fontSize: 13.5, lineHeight: 1.6, margin: 0, fontFamily: "'Mona Sans', sans-serif" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quest Agents */}
      <section id="agents" style={{ padding: '100px 20px', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionLabel>AGENTS</SectionLabel>
          <h2 style={{
            fontFamily: "'Hubot Sans', sans-serif",
            fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 600, margin: '0 0 12px', letterSpacing: '-0.02em',
          }}>
            Four agents, zero LLM cost.
          </h2>
          <p style={{ color: E, fontSize: 16, fontFamily: "'Mona Sans', sans-serif", maxWidth: 520, marginBottom: 60, lineHeight: 1.6 }}>
            Every quest agent is a pure state machine — no API calls, no token spend,
            just Sphere SDK P2P DMs doing the work.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {agents.map((a, i) => (
              <div key={i} style={{ ...glassCard, borderTop: `2px solid ${A}30` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: H, fontSize: 20,
                  }}>{a.icon}</div>
                  <div>
                    <div style={{ fontFamily: "'Hubot Sans', sans-serif", fontSize: 15, fontWeight: 600 }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: A, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{a.protocol}</div>
                  </div>
                </div>
                <p style={{ color: E, fontSize: 13.5, lineHeight: 1.6, margin: 0, fontFamily: "'Mona Sans', sans-serif" }}>{a.desc}</p>
              </div>
            ))}
          </div>

          <div style={{
            ...glassCard, marginTop: 24, padding: '24px 28px',
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          }}>
            <div>
              <div style={{ fontFamily: "'Hubot Sans', sans-serif", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Sphere SDK P2P DM Transport</div>
              <div style={{ color: E, fontSize: 13, lineHeight: 1.5, fontFamily: "'Mona Sans', sans-serif" }}>
                All agent communication happens over Sphere SDK peer-to-peer direct messages over Nostr.
                No relays, no intermediaries, no gas costs.
              </div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '12px 20px',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: E, whiteSpace: 'nowrap',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              agent → agent → agent
            </div>
          </div>
        </div>
      </section>

      {/* Guilds */}
      <section style={{ padding: '100px 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionLabel>GUILDS</SectionLabel>
          <h2 style={{
            fontFamily: "'Hubot Sans', sans-serif",
            fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 600, margin: '0 0 12px', letterSpacing: '-0.02em',
          }}>
            Choose your allegiance.
          </h2>
          <p style={{ color: E, fontSize: 16, fontFamily: "'Mona Sans', sans-serif", maxWidth: 400, marginBottom: 60, lineHeight: 1.6 }}>
            Each guild has unique quests, a dedicated Master Agent, and its own leaderboard.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {[
              { name: 'Explorer Guild', desc: 'Discovery & recon missions', icon: '🔭' },
              { name: 'Builder Guild', desc: 'Development & infrastructure', icon: '⚒️' },
              { name: 'Creator Guild', desc: 'Design & content creation', icon: '🎨' },
              { name: 'Research Guild', desc: 'Investigation & analysis', icon: '🔬' },
            ].map((g, i) => (
              <div key={i} style={{ ...glassCard, textAlign: 'center', padding: '36px 24px' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 28, margin: '0 auto 16px', background: H,
                }}>{g.icon}</div>
                <h3 style={{ fontFamily: "'Hubot Sans', sans-serif", fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{g.name}</h3>
                <p style={{ color: E, fontSize: 13.5, margin: 0, fontFamily: "'Mona Sans', sans-serif" }}>{g.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section id="roadmap" style={{ padding: '100px 20px', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <SectionLabel>ROADMAP</SectionLabel>
          <h2 style={{
            fontFamily: "'Hubot Sans', sans-serif",
            fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 600, margin: '0 0 10px', letterSpacing: '-0.02em',
          }}>
            What's next.
          </h2>
          <p style={{ color: E, fontSize: 14, fontFamily: "'Mona Sans', sans-serif", marginBottom: 40, lineHeight: 1.6 }}>
            The path from MVP to full agent orchestration.
          </p>

          {[
            { phase: 'DONE', title: 'Agent Console', desc: 'Real-time agent message viewer with WebSocket streaming', done: true },
            { phase: 'Q2', title: 'Guide Agent', desc: 'Cheap pooled LLM (Haiku/4o-mini) for player onboarding', done: false },
            { phase: 'Q3', title: 'Quest State Machine', desc: 'Multi-agent orchestration with branching quest paths', done: false },
            { phase: 'Q4', title: 'Astrid WASM Capsules', desc: 'Sandboxed agent execution for trustless operation', done: false },
          ].map((r, i) => (
            <div key={i} style={{
              display: 'flex', gap: 20, padding: '20px 0',
              borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              opacity: r.done ? 0.5 : 1,
            }}>
              <div style={{
                minWidth: 48, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: r.done ? 'rgba(255,255,255,0.06)' : H,
                borderRadius: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: r.done ? E : A,
                fontFamily: "'JetBrains Mono', monospace",
              }}>{r.phase}</div>
              <div>
                <div style={{ fontFamily: "'Hubot Sans', sans-serif", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{r.title}</div>
                <div style={{ color: E, fontSize: 13.5, lineHeight: 1.5, fontFamily: "'Mona Sans', sans-serif" }}>{r.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '100px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <h2 style={{
            fontFamily: "'Hubot Sans', sans-serif",
            fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 600, marginBottom: 16, lineHeight: 1.2,
          }}>
            Ready to deploy your first agent squad?
          </h2>
          <p style={{ color: E, fontSize: 15, marginBottom: 36, lineHeight: 1.6, fontFamily: "'Mona Sans', sans-serif" }}>
            Connect your Sphere wallet and get your passport in under a minute.
          </p>
          <button onClick={onStart} style={btnGrad}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Mona Sans', sans-serif" }}>
              Connect Wallet
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '40px 20px', borderTop: '1px solid rgba(255,255,255,0.04)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
        maxWidth: 1100, margin: '0 auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoMark size={20} />
          <span style={{ fontSize: 12, color: E, fontFamily: "'Mona Sans', sans-serif" }}>Agent Relay &mdash; Built on Unicity</span>
        </div>
        <div style={{ display: 'flex', gap: 20, fontSize: 13, fontFamily: "'Mona Sans', sans-serif" }}>
          {['X', 'Discord', 'GitHub', 'LinkedIn'].map(s => (
            <a key={s} href="#" style={{ color: E, textDecoration: 'none', transition: 'color 0.2s' }}>{s}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}

// ───────────────────────────────────────────────────
// INNER VIEWS
// ───────────────────────────────────────────────────

function HeaderSmall({ onBack }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
      <button onClick={onBack} style={{
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10, color: D, padding: '8px 12px', cursor: 'pointer', fontSize: 14,
        fontFamily: "'Mona Sans', sans-serif",
      }}>← Back</button>
      <LogoMark size={22} />
      <span style={{ fontFamily: "'Hubot Sans', sans-serif", fontWeight: 600, fontSize: 14, letterSpacing: '0.1em' }}>AGENT RELAY</span>
    </div>
  );
}

function ConnectView({ wallet, onConnect }) {
  return (
    <div style={glassCard}>
      <StepNum n={1} />
      <h2 style={{ fontFamily: "'Hubot Sans', sans-serif", fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Connect Your Wallet</h2>
      <p style={{ color: E, fontSize: 14, lineHeight: 1.7, marginBottom: 24, fontFamily: "'Mona Sans', sans-serif" }}>
        Your Sphere wallet is your identity across the Unicity ecosystem.
        No account needed — just connect and you're in.
      </p>
      {wallet.status === 'error' && <p style={{ color: '#ff6b6b', fontSize: 13, marginBottom: 12, fontFamily: "'Mona Sans', sans-serif" }}>{wallet.error}</p>}
      <button onClick={onConnect} disabled={wallet.status === 'connecting'} style={{ ...btnGrad, opacity: wallet.status === 'connecting' ? 0.5 : 1 }}>
        {wallet.status === 'connecting' ? 'Connecting...' : 'Connect Wallet'}
      </button>
      {wallet.identity && <p style={{ color: A, fontSize: 13, fontWeight: 600, marginTop: 12, fontFamily: "'Mona Sans', sans-serif" }}>Connected: {wallet.identity.directAddress?.slice(0, 16)}...</p>}
    </div>
  );
}

function XpGateView({ xpGate, onCheck }) {
  return (
    <div style={glassCard}>
      <StepNum n={2} />
      <SectionLabel>REQUIREMENT</SectionLabel>
      <h2 style={{ fontFamily: "'Hubot Sans', sans-serif", fontSize: 18, fontWeight: 600, marginBottom: 16 }}>SphereQuests Gate</h2>
      <p style={{ color: E, fontSize: 14, lineHeight: 1.7, marginBottom: 20, fontFamily: "'Mona Sans', sans-serif" }}>
        You need at least <strong style={{ color: A }}>100 XP</strong> on SphereQuests to enter the relay.
      </p>
      {xpGate.status === 'rejected' && (
        <div style={{ background: H, border: `1px solid ${I}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <p style={{ color: D, fontSize: 13, margin: 0, fontFamily: "'Mona Sans', sans-serif" }}>You only have {xpGate.xp || 0} XP. Complete more quests and try again.</p>
        </div>
      )}
      {xpGate.status === 'error' && <p style={{ color: '#ff6b6b', fontSize: 13, marginBottom: 12, fontFamily: "'Mona Sans', sans-serif" }}>{xpGate.error}</p>}
      {xpGate.status === 'verified' && (
        <div style={{ background: H, border: `1px solid ${I}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <p style={{ color: A, fontSize: 13, fontWeight: 600, margin: 0, fontFamily: "'Mona Sans', sans-serif" }}>✓ Verified! You have {xpGate.xp} XP.</p>
        </div>
      )}
      {xpGate.status !== 'verified' && (
        <button onClick={onCheck} disabled={xpGate.status === 'checking'} style={{ ...btnGrad, opacity: xpGate.status === 'checking' ? 0.5 : 1 }}>
          {xpGate.status === 'checking' ? 'Checking...' : 'Verify My XP'}
        </button>
      )}
    </div>
  );
}

function GuildSelectView({ onSelect, selected }) {
  const guilds = [
    { id: 'explorer', name: 'Explorer Guild', desc: 'Discovery missions', icon: '🔭' },
    { id: 'builder', name: 'Builder Guild', desc: 'Development missions', icon: '⚒️' },
    { id: 'creator', name: 'Creator Guild', desc: 'Design & content', icon: '🎨' },
    { id: 'research', name: 'Research Guild', desc: 'Investigation', icon: '🔬' },
  ];
  return (
    <div style={glassCard}>
      <StepNum n={3} />
      <SectionLabel>AFFILIATION</SectionLabel>
      <h2 style={{ fontFamily: "'Hubot Sans', sans-serif", fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Choose Your Guild</h2>
      <p style={{ color: E, fontSize: 14, marginBottom: 20, fontFamily: "'Mona Sans', sans-serif" }}>Each guild has its own missions and Master Agent.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {guilds.map((g) => (
          <button key={g.id} onClick={() => onSelect(g.id)} style={{
            background: F, border: `1px solid ${selected === g.id ? A : G}`, borderRadius: 16, padding: '20px 16px',
            cursor: 'pointer', color: D, textAlign: 'left', transition: 'border-color 0.2s', fontFamily: "'Mona Sans', sans-serif",
          }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>{g.icon}</div>
            <div style={{ fontFamily: "'Hubot Sans', sans-serif", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{g.name}</div>
            <div style={{ fontSize: 12, color: E, fontFamily: "'Mona Sans', sans-serif" }}>{g.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function PassportView({ passport, onEnter }) {
  return (
    <div style={glassCard}>
      <StepNum n={4} />
      <SectionLabel>IDENTITY</SectionLabel>
      <h2 style={{ fontFamily: "'Hubot Sans', sans-serif", fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Your Agent Passport</h2>
      <div style={{
        background: H, border: `1px solid ${I}`, borderRadius: 12, padding: 20, marginBottom: 16,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {[
          ['PASSPORT ID', passport.passportId, D],
          ['RELAY KEY', passport.relayKey, A],
          ['GUILD', passport.guild, D],
          ['WALLET', `${passport.walletAddress?.slice(0, 20)}...`, D],
        ].map(([label, value, color]) => (
          <div key={label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: E, fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</span>
          </div>
        ))}
      </div>
      <p style={{ color: E, fontSize: 12, marginBottom: 16, fontFamily: "'Mona Sans', sans-serif" }}>Save your relay key — you'll need it to connect your AI agents.</p>
      <button onClick={onEnter} style={btnGrad}>Enter Agent Relay →</button>
    </div>
  );
}

function DashboardView() {
  return (
    <div style={glassCard}>
      <SectionLabel>ACTIVE</SectionLabel>
      <h2 style={{ fontFamily: "'Hubot Sans', sans-serif", fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Agent Console</h2>
      <p style={{ color: E, fontSize: 14, marginBottom: 20, fontFamily: "'Mona Sans', sans-serif" }}>Your passport is active. Quest agents are standing by.</p>
      <div style={{
        background: F, border: `1px dashed ${G}`, borderRadius: 16, padding: 40, textAlign: 'center',
      }}>
        <div style={{ fontSize: 32, opacity: 0.3, marginBottom: 12 }}>⊞</div>
        <p style={{ color: E, fontSize: 13, fontFamily: "'Mona Sans', sans-serif" }}>Real-time agent messages will appear here</p>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────
// SHARED COMPONENTS
// ───────────────────────────────────────────────────

function LogoMark({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="15" stroke={A} strokeWidth="1.5" opacity="0.3"/>
      <circle cx="16" cy="16" r="8" fill={A} opacity="0.15"/>
      <circle cx="16" cy="16" r="4" fill={A}/>
    </svg>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase',
      color: A, opacity: 0.7, marginBottom: 12, fontFamily: "'JetBrains Mono', monospace",
    }}>{children}</div>
  );
}

function StepNum({ n }) {
  return (
    <div style={{
      fontSize: 11, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.18em',
      color: E, marginBottom: 8,
    }}>{String(n).padStart(2, '0')}</div>
  );
}

// ───────────────────────────────────────────────────
// STYLES
// ───────────────────────────────────────────────────

const glassCard = {
  background: F,
  border: `1px solid ${G}`,
  borderRadius: 16,
  padding: 28,
};

const btnGrad = {
  background: `linear-gradient(135deg, ${A}, ${B})`,
  color: '#fff',
  border: 'none',
  padding: '0 28px',
  height: 48,
  borderRadius: 9999,
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: '0.02em',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: "'Mona Sans', sans-serif",
};

const btnOutline = {
  color: D,
  border: '1px solid rgba(255,255,255,0.12)',
  padding: '0 28px',
  height: 48,
  borderRadius: 9999,
  fontSize: 15,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: "'Mona Sans', sans-serif",
  background: 'transparent',
};

export default App;
