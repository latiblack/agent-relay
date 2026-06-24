// Agent Relay - Premium Landing Page
// Full flow: Landing → Wallet → Guild → Passport → Dashboard → Agent Console

import React, { useState, useEffect } from 'react';
import { useWallet } from './hooks/useWallet';

const A = '#FF6F00';
const B = '#E05A00';
const C = '#0a0a0a';
const D = '#f1f5f9';
const E = 'rgba(241, 245, 249, 0.45)';
const F = 'rgba(255, 255, 255, 0.03)';
const G = 'rgba(255, 255, 255, 0.06)';
const H = 'rgba(255, 111, 0, 0.08)';
const I = 'rgba(255, 111, 0, 0.12)';

const RELAY_SERVER = import.meta.env.VITE_RELAY_SERVER || 'https://api.virtusub.xyz/relay';

function formatUserTag(identity) {
  if (!identity) return null;
  // Use nametag if available (e.g. @lati)
  if (identity.nametag) return identity.nametag.startsWith('@') ? identity.nametag : `@${identity.nametag}`;
  // Fall back to formatted address
  const addr = identity.directAddress;
  if (!addr) return null;
  const hex = addr.replace(/^direct:\/\//i, '').replace(/^0x/i, '');
  if (hex.length < 8) return addr.slice(0, 12);
  return `0x${hex.slice(0, 4)}...${hex.slice(-4)}`;
}

function App() {
  const wallet = useWallet();
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
    if (wallet.status === 'connected') setView('guild-select');
  };

  const handleGuildSelect = (guild) => {
    setSelectedGuild(guild);
  };

  const handleCreatePassport = async () => {
    if (!selectedGuild || !wallet.identity?.directAddress) return;
    try {
      const res = await fetch(`${RELAY_SERVER}/passport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: wallet.identity.directAddress, guild: selectedGuild }),
      });
      const data = await res.json();
      if (data.success) { setPassport(data.passport); setView('passport'); }
    } catch (err) { console.error('Failed to create passport:', err); }
  };

  if (view !== 'landing') {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px 80px', fontFamily: "'Mona Sans', sans-serif", backgroundColor: C, color: D, minHeight: '100vh' }}>
        <HeaderSmall onBack={() => setView('landing')} identity={wallet.identity} />
        {view === 'connect' && <ConnectView wallet={wallet} onConnect={handleWalletConnect} />}
        {view === 'guild-select' && <GuildSelectView onSelect={handleGuildSelect} onCreate={handleCreatePassport} selected={selectedGuild} />}
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
        borderBottom: scrolled ? '1px solid rgba(255,111,0,0.2)' : '1px solid transparent',
        boxShadow: scrolled ? '0 0 20px rgba(255,111,0,0.1), 0 0 40px rgba(255,111,0,0.04)' : 'none',
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
        <RelayNetworkBg />
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
          <button onClick={onStart} style={{
            ...btnGrad,
            animation: 'glowPulse 4s ease-in-out infinite',
          }}>
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

      {/* Features — Agent Handoff Protocol */}
      <section id="features" style={{ padding: '100px 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionLabel>HANDOFF PROTOCOL</SectionLabel>
          <h2 style={{
            fontFamily: "'Hubot Sans', sans-serif",
            fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 600, margin: '0 0 12px', letterSpacing: '-0.02em',
          }}>
            Identity flows through a relay chain.
          </h2>
          <p style={{ color: E, fontSize: 16, fontFamily: "'Mona Sans', sans-serif", maxWidth: 520, marginBottom: 60, lineHeight: 1.6 }}>
            Your wallet initiates the handshake. Each node passes your state to the next
            — no database, no backend, just peer-to-peer agent relays.
          </p>

          <div style={{ position: 'relative' }}>
            {/* Connecting relay line between cards */}
            <div style={{
              position: 'absolute', top: 60, left: '10%', right: '10%', height: 2,
              background: `linear-gradient(90deg, ${A}00 0%, ${A}30 15%, ${A}30 85%, ${A}00 100%)`,
              zIndex: 0,
            }} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, position: 'relative', zIndex: 1 }}>
              {[
                { num: '01', title: 'Identity Handshake', desc: 'Sphere wallet authenticates. No email, no password — your keys prove who you are.', icon: '🔑', status: 'handshake', metric: 'ED25519' },
                { num: '02', title: 'Gate Verification', desc: 'Agent queries SphereQuests via popup bridge. 100 XP threshold enforced autonomously.', icon: '⚡', status: 'verify', metric: '~1.2s' },
                { num: '03', title: 'Guild Assignment', desc: 'Master Agent registers you to a guild, assigns relay key, broadcasts your arrival on the DM network.', icon: '🏰', status: 'assign', metric: 'Nostr DM' },
                { num: '04', title: 'Passport Issued', desc: 'Relay gateway confirms. Your agents discover your passport and begin queuing quests.', icon: '🪪', status: 'ready', metric: 'active' },
              ].map((f, i) => (
                <div key={i} style={{
                  ...glassCard, padding: '28px 24px',
                  borderColor: i < 3 ? G : A,
                  position: 'relative', overflow: 'hidden',
                }}>
                  {/* Status bar at top */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16,
                    fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: f.status === 'ready' ? A : E,
                  }}>
                    <span style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: f.status === 'ready' ? A : f.status === 'assign' ? A : '#aaa',
                      opacity: f.status === 'ready' ? 1 : 0.4,
                      animation: f.status === 'ready' ? 'pulseNode 2s infinite' : 'none',
                    }} />
                    {f.status === 'handshake' && 'IDENTIFYING'}
                    {f.status === 'verify' && 'VERIFYING'}
                    {f.status === 'assign' && 'ASSIGNING'}
                    {f.status === 'ready' && '● ACTIVE'}
                  </div>

                  {/* Step counter + icon row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{
                      fontSize: 22, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
                      color: f.status === 'ready' ? A : E, letterSpacing: '-0.04em',
                    }}>{f.num}</div>
                    <div style={{
                      width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', background: H, fontSize: 18,
                    }}>{f.icon}</div>
                  </div>
                  <h3 style={{ fontFamily: "'Hubot Sans', sans-serif", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{f.title}</h3>
                  <p style={{ color: E, fontSize: 13, lineHeight: 1.6, margin: '0 0 14px', fontFamily: "'Mona Sans', sans-serif" }}>{f.desc}</p>
                  {/* Protocol metric badge */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: 'rgba(255,255,255,0.03)', borderRadius: 6,
                    padding: '4px 10px', fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                    color: A, border: '1px solid rgba(255,111,0,0.12)',
                  }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                    {f.metric}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Data flow status bar */}
          <div style={{
            ...glassCard, marginTop: 24, padding: '16px 24px',
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          }}>
            <span style={{ color: A }}>$ relay handshake --status</span>
            <span style={{ color: E }}>→</span>
            <StatusDot color={A} label="wallet" />
            <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
            <StatusDot color={A} label="gate" />
            <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
            <StatusDot color={A} label="guild" />
            <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
            <StatusDot color="#22c55e" label="passport ✓" />
          </div>
        </div>
      </section>

      {/* Quest Agents — Agent Status Console */}
      <section id="agents" style={{ padding: '100px 20px', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionLabel>AGENT STATUS</SectionLabel>
          <h2 style={{
            fontFamily: "'Hubot Sans', sans-serif",
            fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 600, margin: '0 0 12px', letterSpacing: '-0.02em',
          }}>
            Autonomous state machines, online.
          </h2>
          <p style={{ color: E, fontSize: 16, fontFamily: "'Mona Sans', sans-serif", maxWidth: 520, marginBottom: 60, lineHeight: 1.6 }}>
            Four independent agent processes — zero LLM calls, zero API spend.
            Every quest is negotiated peer-to-peer over Sphere SDK Nostr DMs.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {agents.map((a, i) => (
              <div key={i} style={{
                ...glassCard, borderTop: `2px solid ${A}40`,
                position: 'relative', overflow: 'hidden',
              }}>
                {/* Live agent status indicator */}
                <div style={{
                  position: 'absolute', top: 16, right: 16,
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: '#22c55e',
                }}>
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%', background: '#22c55e',
                    boxShadow: '0 0 6px rgba(34,197,94,0.6)',
                    animation: 'pulseNode 2s infinite',
                  }} />
                  LIVE
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: H, fontSize: 20,
                  }}>{a.icon}</div>
                  <div>
                    <div style={{ fontFamily: "'Hubot Sans', sans-serif", fontSize: 15, fontWeight: 600 }}>{a.name}</div>
                    <div style={{ fontSize: 10, color: A, fontFamily: "'JetBrains Mono', monospace", marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                      {a.protocol}
                    </div>
                  </div>
                </div>
                <p style={{ color: E, fontSize: 13, lineHeight: 1.6, margin: 0, fontFamily: "'Mona Sans', sans-serif" }}>{a.desc}</p>
                {/* Agent metadata bar */}
                <div style={{
                  marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)',
                  display: 'flex', gap: 12, fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.25)' }}>PID:{String(i+1).padStart(3,'0')}</span>
                  <span style={{ color: '#22c55e' }}>uptime 99.8%</span>
                  <span style={{ color: 'rgba(255,255,255,0.25)' }}>msgs 0</span>
                </div>
              </div>
            ))}
          </div>

          {/* Agent Message Feed — live agent-to-agent flow */}
          <div style={{
            ...glassCard, marginTop: 24, overflow: 'hidden', padding: 0,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)',
              background: 'rgba(255,111,0,0.03)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                <span style={{ color: A }}>$</span>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>comms --tail</span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 8, fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.25)',
              }}>
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                NOSTR
              </div>
            </div>
            <div style={{ padding: '10px 16px' }}>
              {[
                { from: 'VERIFICATION', to: 'PUZZLE' },
                { from: 'PUZZLE', to: 'LORE' },
                { from: 'LORE', to: 'TREASURY' },
                { from: 'TREASURY', to: 'VERIFICATION' },
              ].map((m, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                  borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10, lineHeight: 1.4,
                }}>
                  <span style={{ color: A, fontWeight: 600, fontSize: 9 }}>{m.from}</span>
                  <svg width="14" height="10" viewBox="0 0 24 12" fill="none">
                    <path d="M2 6h18M14 2l6 4-6 4" stroke="rgba(255,111,0,0.3)" strokeWidth="1.5"/>
                  </svg>
                  <span style={{ color: '#22c55e', fontSize: 9 }}>{m.to}</span>
                  <span style={{
                    marginLeft: 'auto', display: 'flex', gap: 3,
                  }}>
                    {[0,1,2].map(d => (
                      <span key={d} style={{
                        width: 3, height: 3, borderRadius: '50%',
                        background: `rgba(255,111,0,${0.2 + d * 0.2})`,
                        animation: i === 0 ? `pulseNode ${1 + d * 0.3}s infinite ${d * 0.2}s` : 'none',
                      }} />
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Guilds — Agent Deployment Nodes */}
      <section style={{ padding: '100px 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionLabel>DEPLOYMENT NODES</SectionLabel>
          <h2 style={{
            fontFamily: "'Hubot Sans', sans-serif",
            fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 600, margin: '0 0 12px', letterSpacing: '-0.02em',
          }}>
            Each guild runs its own Master Agent.
          </h2>
          <p style={{ color: E, fontSize: 16, fontFamily: "'Mona Sans', sans-serif", maxWidth: 480, marginBottom: 60, lineHeight: 1.6 }}>
            Your passport assigns you to a guild node. That node's Master Agent
            orchestrates quests, relays messages, and maintains your agent state.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {[
              { name: 'Explorer Guild', desc: 'Discovery & recon missions handled by Scout Agent', icon: '🔭', agents: 7, mode: 'active' },
              { name: 'Builder Guild', desc: 'Development & infrastructure by Forge Agent', icon: '⚒️', agents: 12, mode: 'active' },
              { name: 'Creator Guild', desc: 'Design & content by Muse Agent', icon: '🎨', agents: 5, mode: 'active' },
              { name: 'Research Guild', desc: 'Investigation & analysis by Oracle Agent', icon: '🔬', agents: 9, mode: 'active' },
            ].map((g, i) => (
              <div key={i} style={{
                ...glassCard, textAlign: 'center', padding: '32px 24px',
                position: 'relative', overflow: 'hidden',
              }}>
                {/* Guild header with agent count */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20,
                }}>
                  <div style={{
                    fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: E,
                    textAlign: 'left', lineHeight: 1.5,
                  }}>
                    <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>NODE</div>
                    <div style={{ color: A, fontWeight: 600 }}>G-{String(i+1).padStart(2,'0')}</div>
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'rgba(34,197,94,0.08)', borderRadius: 8,
                    padding: '4px 10px', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#22c55e',
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                    {g.agents} agents
                  </div>
                </div>

                <div style={{
                  width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 28, margin: '0 auto 16px', background: H,
                }}>{g.icon}</div>
                <h3 style={{ fontFamily: "'Hubot Sans', sans-serif", fontSize: 17, fontWeight: 600, marginBottom: 8 }}>{g.name}</h3>
                <p style={{ color: E, fontSize: 13, margin: '0 0 18px', fontFamily: "'Mona Sans', sans-serif" }}>{g.desc}</p>

                {/* Guild mode badge */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'rgba(255,255,255,0.03)', borderRadius: 9999,
                  padding: '4px 14px', fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: A, display: 'inline-block', opacity: 0.7 }} />
                  {g.mode === 'active' ? 'ACCEPTING MEMBERS' : 'FULL'}
                </div>
              </div>
            ))}
          </div>

          {/* Network relay status — shows guild interconnect */}
          <div style={{
            ...glassCard, marginTop: 24, padding: '20px 24px',
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: H, fontSize: 16,
              }}>🔗</div>
              <div>
                <div style={{ fontFamily: "'Hubot Sans', sans-serif", fontSize: 12, fontWeight: 600, marginBottom: 2 }}>
                  Cross-guild Master Agent Network
                </div>
                <div style={{ color: E, fontSize: 12, fontFamily: "'Mona Sans', sans-serif" }}>
                  Guilds relay quest intel between each other via Sphere SDK Nostr DMs.
                  Agents in different guilds can cooperate on shared objectives.
                </div>
              </div>
            </div>
            <div style={{
              display: 'flex', gap: 6,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            }}>
              {['EX', 'BU', 'CR', 'RE'].map(code => (
                <div key={code} style={{
                  background: H, borderRadius: 6, padding: '4px 10px',
                  color: A, fontWeight: 600,
                }}>{code}</div>
              ))}
              <div style={{
                background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '4px 10px',
                color: 'rgba(255,255,255,0.2)',
              }}>↻</div>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap — Protocol Iterations */}
      <section id="roadmap" style={{ padding: '100px 20px', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <SectionLabel>PROTOCOL ITERATIONS</SectionLabel>
          <h2 style={{
            fontFamily: "'Hubot Sans', sans-serif",
            fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 600, margin: '0 0 10px', letterSpacing: '-0.02em',
          }}>
            Autonomous agent network evolution.
          </h2>
          <p style={{ color: E, fontSize: 14, fontFamily: "'Mona Sans', sans-serif", marginBottom: 40, lineHeight: 1.6 }}>
            Each iteration adds agent capabilities, protocol upgrades, and new quest mechanics
            to the relay network.
          </p>

          {[
            { version: 'v1.0', phase: 'LIVE', title: 'Agent Console', desc: 'Real-time agent message viewer with WebSocket streaming. Watch your quest agents negotiate live over Nostr DMs.', done: true },
            { version: 'v2.0', phase: 'BETA', title: 'Guide Agent', desc: 'A narrated agent walks new players through the first quest flow.', done: false },
            { version: 'v3.0', phase: 'Q3', title: 'Quest State Machine', desc: 'Multi-agent orchestration with branching quest paths. Agents negotiate dynamically based on player choices and past outcomes.', done: false },
            { version: 'v4.0', phase: 'Q4', title: 'Astrid WASM Capsules', desc: 'Sandboxed agent execution for trustless operation. Agents run in WASM isolates with deterministic state transitions.', done: false },
          ].map((r, i) => (
            <div key={i} style={{
              display: 'flex', gap: 20, padding: '22px 0',
              borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              {/* Version badge */}
              <div style={{
                minWidth: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}>
                <div style={{
                  width: '100%', height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: r.done ? 'rgba(255,255,255,0.06)' : H,
                  borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                  color: r.done ? 'rgba(255,255,255,0.3)' : A,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>{r.version}</div>
                <div style={{
                  fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: r.done ? '#22c55e' : E, opacity: r.done ? 1 : 0.5,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {r.done ? '✓ deployed' : r.phase}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontFamily: "'Hubot Sans', sans-serif", fontSize: 15, fontWeight: 600 }}>{r.title}</span>
                  {r.done && (
                    <span style={{
                      fontSize: 8, background: 'rgba(34,197,94,0.1)', color: '#22c55e',
                      padding: '2px 8px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.08em',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>ACTIVE</span>
                  )}
                </div>
                <div style={{ color: E, fontSize: 13, lineHeight: 1.5, fontFamily: "'Mona Sans', sans-serif" }}>{r.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA — Agent Launch Sequence */}
      <section style={{ padding: '100px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 540, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: H, border: `1px solid ${I}`, borderRadius: 9999,
            padding: '5px 16px 5px 5px', marginBottom: 28, fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace", color: A, letterSpacing: '0.06em',
          }}>
            <span style={{
              background: `linear-gradient(135deg, ${A}, ${B})`, borderRadius: 9999,
              padding: '2px 10px', color: '#fff', fontSize: 9, fontWeight: 700,
            }}>INIT</span>
            Ready for agent deployment
          </div>
          <h2 style={{
            fontFamily: "'Hubot Sans', sans-serif",
            fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 600, marginBottom: 16, lineHeight: 1.2,
          }}>
            Deploy your agent squad to <br/>the Unicity network.
          </h2>
          <p style={{ color: E, fontSize: 15, marginBottom: 36, lineHeight: 1.6, fontFamily: "'Mona Sans', sans-serif" }}>
            One wallet connection deploys four autonomous agents, assigns them to a guild,
            and activates your passport — all without a single LLM API call.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={onStart} style={{
              ...btnGrad,
              animation: 'glowPulse 4s ease-in-out infinite',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Mona Sans', sans-serif" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Initialize Agent Relay
              </span>
            </button>
            <a href="#features" style={{
              ...btnOutline,
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
              fontFamily: "'Mona Sans', sans-serif",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
              Protocol Spec
            </a>
          </div>
        </div>
      </section>

      {/* Footer — Network Status Console */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.04)',
        background: 'rgba(10,10,10,0.6)',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{
          padding: '32px 20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
          maxWidth: 1100, margin: '0 auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <LogoMark size={20} />
            <span style={{ fontSize: 12, color: E, fontFamily: "'Mona Sans', sans-serif" }}>Agent Relay &mdash; Built on Unicity</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>agents 4/4</span>
            </span>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>network relay</span>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
            <span style={{ color: E }}>© 2026</span>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, fontFamily: "'Mona Sans', sans-serif" }}>
            {['X', 'Discord', 'GitHub', 'LinkedIn'].map(s => (
              <a key={s} href="#" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none', transition: 'color 0.2s', fontSize: 11 }}>{s}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

// ───────────────────────────────────────────────────
// INNER VIEWS
// ───────────────────────────────────────────────────

function HeaderSmall({ onBack, identity }) {
  const tag = identity ? formatUserTag(identity) : null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
      <button onClick={onBack} style={{
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10, color: D, padding: '8px 12px', cursor: 'pointer', fontSize: 14,
        fontFamily: "'Mona Sans', sans-serif",
      }}>← Back</button>
      <LogoMark size={22} />
      <span style={{ fontFamily: "'Hubot Sans', sans-serif", fontWeight: 600, fontSize: 14, letterSpacing: '0.1em' }}>AGENT RELAY</span>
      {tag && (
        <div style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
          background: H, border: `1px solid ${I}`, borderRadius: 8,
          padding: '4px 10px 4px 4px',
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            background: `linear-gradient(135deg, ${A}, ${B})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 7, fontWeight: 700, color: '#fff',
            fontFamily: "'JetBrains Mono', monospace",
          }}>{tag.replace(/^@/, '').slice(0, 4).toUpperCase()}</div>
          <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: A, fontWeight: 600 }}>{tag}</span>
        </div>
      )}
    </div>
  );
}

function ConnectView({ wallet, onConnect }) {
  const tag = wallet.identity ? formatUserTag(wallet.identity) : null;
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
      {wallet.identity && (
        <div style={{
          marginTop: 16, padding: '12px 16px', background: H,
          border: `1px solid ${I}`, borderRadius: 10,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: `linear-gradient(135deg, ${A}, ${B})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff',
            fontFamily: "'JetBrains Mono', monospace",
          }}>{tag?.replace(/^@/, '').slice(0, 4).toUpperCase()}</div>
          <div>
            <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: A, fontWeight: 600 }}>{tag}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: "'Mona Sans', sans-serif" }}>Sphere identity verified</div>
          </div>
        </div>
      )}
    </div>
  );
}

function GuildSelectView({ onSelect, onCreate, selected }) {
  const guilds = [
    { id: 'explorer', name: 'Explorer Guild', desc: 'Discovery missions', icon: '🔭' },
    { id: 'builder', name: 'Builder Guild', desc: 'Development missions', icon: '⚒️' },
    { id: 'creator', name: 'Creator Guild', desc: 'Design & content', icon: '🎨' },
    { id: 'research', name: 'Research Guild', desc: 'Investigation', icon: '🔬' },
  ];
  return (
    <div style={glassCard}>
      <StepNum n={2} />
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
      {/* Continue button */}
      <button
        onClick={onCreate}
        disabled={!selected}
        style={{
          ...btnGrad, marginTop: 20, width: '100%',
          opacity: selected ? 1 : 0.35,
          cursor: selected ? 'pointer' : 'not-allowed',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: "'Mona Sans', sans-serif" }}>
          {selected ? `Join ${guilds.find(g => g.id === selected)?.name || 'Guild'}` : 'Select a guild to continue'}
          {selected && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>}
        </span>
      </button>
    </div>
  );
}

function PassportView({ passport, onEnter }) {
  return (
    <div style={glassCard}>
      <StepNum n={3} />
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
// RELAY NETWORK BACKGROUND
// ───────────────────────────────────────────────────

function RelayNetworkBg() {
  // Nodes array: { x, y, r, pulse?, label? }
  // ViewBox maps to 1000x800 coordinate space
  // Connecting lines form a relay/mesh network
  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
      zIndex: 0, opacity: 0.5,
    }}>
      <svg
        viewBox="0 0 1000 800"
        preserveAspectRatio="xMidYMid slice"
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
      >
        <defs>
          {/* Glow filter for nodes */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glowSmall">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          {/* Pulse animation - growing ring */}
          <style>{`
            @keyframes pulseRing {
              0% { opacity: 0.6; r: var(--r); }
              100% { opacity: 0; r: calc(var(--r) + 20); }
            }
            @keyframes pulseNode {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 0.8; }
            }
            @keyframes dashMove {
              0% { stroke-dashoffset: 0; }
              100% { stroke-dashoffset: -200; }
            }
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-6px); }
            }
            @keyframes glowPulse {
              0%, 100% { box-shadow: 0 0 12px rgba(255,111,0,0.06), 0 0 25px rgba(255,111,0,0.03); }
              50% { box-shadow: 0 0 20px rgba(255,111,0,0.15), 0 0 40px rgba(255,111,0,0.06); }
            }
            @keyframes glowPulseNav {
              0%, 100% { box-shadow: 0 0 15px rgba(255,111,0,0.06); }
              50% { box-shadow: 0 0 30px rgba(255,111,0,0.12); }
            }
            .glow-card {
              box-shadow: 0 0 12px rgba(255,111,0,0.06), 0 0 25px rgba(255,111,0,0.03) !important;
              animation: glowPulse 4s ease-in-out infinite !important;
            }
            .glow-border {
              border: 1px solid rgba(255,111,0,0.2) !important;
            }
            .relay-line { stroke: #FF6F00; stroke-opacity: 0.08; stroke-width: 1; fill: none; }
            .relay-line-active { stroke: #FF6F00; stroke-opacity: 0.2; stroke-width: 1.5; stroke-dasharray: 6 8; fill: none; animation: dashMove 3s linear infinite; }
            .relay-node-main { fill: #FF6F00; filter: url(#glow); }
            .relay-node-sm { fill: #FF6F00; opacity: 0.3; filter: url(#glowSmall); }
            .relay-pulse { fill: none; stroke: #FF6F00; stroke-width: 1.5; opacity: 0; animation: pulseRing 3s ease-out infinite; }
            .relay-pulse-2 { fill: none; stroke: #FF6F00; stroke-width: 1; opacity: 0; animation: pulseRing 4s ease-out infinite; }
            .relay-node-float { animation: float 4s ease-in-out infinite; }
            .relay-node-float-2 { animation: float 5s ease-in-out infinite 1s; }
            .relay-node-float-3 { animation: float 6s ease-in-out infinite 0.5s; }
          `}</style>
        </defs>

        {/* Background mesh grid lines */}
        <g opacity="0.03">
          {[0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map(x => (
            <line key={`v${x}`} x1={x} y1={0} x2={x} y2={800} stroke="#FF6F00" strokeWidth="0.5"/>
          ))}
          {[0, 100, 200, 300, 400, 500, 600, 700, 800].map(y => (
            <line key={`h${y}`} x1={0} y1={y} x2={1000} y2={y} stroke="#FF6F00" strokeWidth="0.5"/>
          ))}
        </g>

        {/* Relay lines - static network connections */}
        <g>
          <line x1="200" y1="250" x2="350" y2="180" className="relay-line"/>
          <line x1="200" y1="250" x2="300" y2="400" className="relay-line"/>
          <line x1="200" y1="250" x2="150" y2="500" className="relay-line"/>
          <line x1="350" y1="180" x2="500" y2="120" className="relay-line"/>
          <line x1="350" y1="180" x2="480" y2="350" className="relay-line"/>
          <line x1="300" y1="400" x2="480" y2="350" className="relay-line"/>
          <line x1="300" y1="400" x2="250" y2="550" className="relay-line"/>
          <line x1="150" y1="500" x2="250" y2="550" className="relay-line"/>
          <line x1="480" y1="350" x2="650" y2="280" className="relay-line"/>
          <line x1="500" y1="120" x2="700" y2="180" className="relay-line"/>
          <line x1="650" y1="280" x2="700" y2="180" className="relay-line"/>
          <line x1="650" y1="280" x2="800" y2="350" className="relay-line"/>
          <line x1="250" y1="550" x2="400" y2="600" className="relay-line"/>
          <line x1="400" y1="600" x2="550" y2="520" className="relay-line"/>
          <line x1="550" y1="520" x2="650" y2="280" className="relay-line"/>
          <line x1="550" y1="520" x2="800" y2="350" className="relay-line"/>
          <line x1="700" y1="180" x2="880" y2="220" className="relay-line"/>
          <line x1="800" y1="350" x2="880" y2="220" className="relay-line"/>
          <line x1="800" y1="350" x2="920" y2="500" className="relay-line"/>
          <line x1="550" y1="520" x2="750" y2="600" className="relay-line"/>
          <line x1="750" y1="600" x2="920" y2="500" className="relay-line"/>
          <line x1="100" y1="150" x2="200" y2="250" className="relay-line"/>
          <line x1="100" y1="150" x2="500" y2="120" className="relay-line"/>
          <line x1="100" y1="150" x2="150" y2="500" className="relay-line"/>
        </g>

        {/* Animated relay lines (dashed moving) */}
        <g>
          <line x1="200" y1="250" x2="350" y2="180" className="relay-line-active"/>
          <line x1="480" y1="350" x2="650" y2="280" className="relay-line-active"/>
          <line x1="550" y1="520" x2="800" y2="350" className="relay-line-active"/>
          <line x1="100" y1="150" x2="350" y2="180" className="relay-line-active"/>
        </g>

        {/* Pulse rings on main nodes */}
        <circle cx="200" cy="250" r="10" className="relay-pulse" style={{'--r': 10}}/>
        <circle cx="500" cy="120" r="8" className="relay-pulse-2" style={{'--r': 8}}/>
        <circle cx="650" cy="280" r="9" className="relay-pulse" style={{'--r': 9, animationDelay: '1s'}}/>
        <circle cx="250" cy="550" r="7" className="relay-pulse-2" style={{'--r': 7, animationDelay: '2s'}}/>

        {/* Main agent nodes (larger, glowing) */}
        <g className="relay-node-float">
          <circle cx="200" cy="250" r="12" className="relay-node-main" style={{animationDelay: '0s'}}/>
        </g>
        <g className="relay-node-float-2">
          <circle cx="500" cy="120" r="10" className="relay-node-main" style={{animationDelay: '0.5s'}}/>
        </g>
        <g className="relay-node-float-3">
          <circle cx="650" cy="280" r="11" className="relay-node-main" style={{animationDelay: '1s'}}/>
        </g>
        <g className="relay-node-float">
          <circle cx="250" cy="550" r="9" className="relay-node-main" style={{animationDelay: '1.5s'}}/>
        </g>
        <g className="relay-node-float-2">
          <circle cx="800" cy="350" r="8" className="relay-node-main" style={{animationDelay: '2s'}}/>
        </g>
        <g className="relay-node-float-3">
          <circle cx="100" cy="150" r="7" className="relay-node-main" style={{animationDelay: '0.8s'}}/>
        </g>

        {/* Secondary relay nodes (smaller) */}
        <circle cx="350" cy="180" r="4" className="relay-node-sm"/>
        <circle cx="300" cy="400" r="3.5" className="relay-node-sm"/>
        <circle cx="150" cy="500" r="3" className="relay-node-sm"/>
        <circle cx="480" cy="350" r="5" className="relay-node-sm"/>
        <circle cx="700" cy="180" r="4" className="relay-node-sm"/>
        <circle cx="550" cy="520" r="4.5" className="relay-node-sm"/>
        <circle cx="400" cy="600" r="3.5" className="relay-node-sm"/>
        <circle cx="880" cy="220" r="3" className="relay-node-sm"/>
        <circle cx="920" cy="500" r="4" className="relay-node-sm"/>
        <circle cx="750" cy="600" r="3" className="relay-node-sm"/>

        {/* Agent labels (SVG text - very subtle) */}
        <text x="172" y="278" fill="#FF6F00" opacity="0.15" fontSize="6" fontFamily="'JetBrains Mono', monospace" letterSpacing="2">VERIFICATION</text>
        <text x="472" y="148" fill="#FF6F00" opacity="0.15" fontSize="6" fontFamily="'JetBrains Mono', monospace" letterSpacing="2">PUZZLE</text>
        <text x="622" y="306" fill="#FF6F00" opacity="0.15" fontSize="6" fontFamily="'JetBrains Mono', monospace" letterSpacing="2">LORE</text>
        <text x="230" y="574" fill="#FF6F00" opacity="0.15" fontSize="6" fontFamily="'JetBrains Mono', monospace" letterSpacing="2">TREASURY</text>
      </svg>
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

function StatusDot({ color, label }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block' }} />
      <span style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
    </span>
  );
}

// ───────────────────────────────────────────────────
// STYLES
// ───────────────────────────────────────────────────

const glassCard = {
  background: F,
  border: `1px solid rgba(255,111,0,0.2)`,
  borderRadius: 16,
  padding: 28,
  boxShadow: '0 0 12px rgba(255,111,0,0.06), 0 0 25px rgba(255,111,0,0.03)',
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
