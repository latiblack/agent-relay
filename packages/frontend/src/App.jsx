// Agent Relay - Premium Landing Page
// Full flow: Landing → Wallet → Guild → Passport → Dashboard → Agent Console

import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation, Navigate } from 'react-router-dom';
import { useWallet } from './hooks/useWallet';
import { useQuestConsole } from './hooks/useQuestConsole';

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

function MaskedKey({ value, color = A }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'JetBrains Mono', monospace" }}>
      <span style={{ fontSize: 13, fontWeight: 600, color, wordBreak: 'break-all', userSelect: revealed ? 'text' : 'none' }}>
        {revealed ? value : '••••••••••••'}
      </span>
      <span
        onClick={() => setRevealed(r => !r)}
        style={{ cursor: 'pointer', fontSize: 14, opacity: 0.6, hover: { opacity: 1 }, lineHeight: 1, color: E, flexShrink: 0, transition: 'opacity 0.15s' }}
        title={revealed ? 'Hide relay key' : 'Reveal relay key'}
      >
        {revealed ? '👁‍🗨' : '👁️'}
      </span>
    </span>
  );
}

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
  const [pendingDeepLink, setPendingDeepLink] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {/* Global keyframes — accessible from any route */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
      <Routes>
      <Route path="/home" element={<LandingPage scrolled={scrolled} />} />
      <Route path="/onboarding" element={<OnboardingPage wallet={wallet} onPassportReady={(p) => setPassport(p)} />} />
      <Route path="/app" element={<Navigate to="/overview" replace />} />
      {['overview', 'quests', 'guild-chat', 'profile'].map(sub => (
        <Route key={sub} path={`/${sub}`} element={
          wallet.identity && passport ? (
            <DashboardView
              passport={passport}
              wallet={wallet}
              identity={wallet.identity}
              pendingDeepLink={pendingDeepLink}
              setPendingDeepLink={setPendingDeepLink}
              onPassportUpdate={(updates) => setPassport(prev => prev ? { ...prev, ...updates } : null)}
            />
          ) : (
            <Navigate to="/onboarding" replace />
          )
        } />
      ))}
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
    </>
  );
}

// ───────────────────────────────────────────────────
// LANDING PAGE
// ───────────────────────────────────────────────────

function LandingPage({ scrolled }) {
  const navigate = useNavigate();
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
          <button onClick={() => navigate('/onboarding')} style={{
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
            <button onClick={() => navigate('/onboarding')} style={{
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
// ONBOARDING PAGE (Connect → Guild Select → Passport)
// ───────────────────────────────────────────────────

function OnboardingPage({ wallet, onPassportReady }) {
  const navigate = useNavigate();
  const [step, setStep] = useState('connect');
  const [passport, setPassport] = useState(null);
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [relayDown, setRelayDown] = useState(false);

  const handleWalletConnect = async () => {
    setStep('connect');
    setRelayDown(false);
    const identity = await wallet.connect();
    if (identity?.directAddress) {
      try {
        const res = await fetch(`${RELAY_SERVER}/passport/wallet/${encodeURIComponent(identity.directAddress)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.passport) {
            setPassport(data.passport);
            onPassportReady(data.passport);
            navigate('/overview');
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to check existing passport:', err);
        setRelayDown(true);
        return;
      }
      setStep('guild-select');
    }
  };

  const handleCreatePassport = async () => {
    if (!selectedGuild || !wallet.identity?.directAddress) return;
    try {
      const res = await fetch(`${RELAY_SERVER}/passport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: wallet.identity.directAddress, guild: selectedGuild, nametag: wallet.identity.nametag || null }),
      });
      const data = await res.json();
      if (data.success) {
        setPassport(data.passport);
        setStep('passport');
      }
    } catch (err) { console.error('Failed to create passport:', err); }
  };

  if (relayDown) {
    return <RelayDownView onRetry={() => { setRelayDown(false); handleWalletConnect(); }} />;
  }

  return (
    <div style={{
      maxWidth: 640, margin: '0 auto', padding: '40px 20px',
      fontFamily: "'Mona Sans', sans-serif", backgroundColor: C, color: D, minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
    }}>
      <HeaderSmall onBack={() => navigate('/home')} identity={wallet.identity} passport={passport} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {step === 'connect' && <ConnectView wallet={wallet} onConnect={handleWalletConnect} onPassportFound={(p) => { setPassport(p); onPassportReady(p); navigate('/overview'); }} />}
        {step === 'guild-select' && <GuildSelectView onSelect={setSelectedGuild} onCreate={handleCreatePassport} selected={selectedGuild} />}
        {step === 'passport' && <PassportView passport={passport} onEnter={() => { onPassportReady(passport); navigate('/overview'); }} />}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────
// INNER VIEWS
// ───────────────────────────────────────────────────

function HeaderSmall({ onBack, identity, passport }) {
  const tag = identity ? formatUserTag(identity) : null;
  const pfpUrl = passport?.avatarUrl;
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
            width: 24, height: 24, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
            background: pfpUrl ? 'transparent' : `linear-gradient(135deg, ${A}, ${B})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 7, fontWeight: 700, color: '#fff',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {pfpUrl ? (
              <img src={pfpUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              tag.replace(/^@/, '').slice(0, 4).toUpperCase()
            )}
          </div>
          <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: A, fontWeight: 600 }}>{tag}</span>
        </div>
      )}
    </div>
  );
}

function ConnectView({ wallet, onConnect, onPassportFound }) {
  const tag = wallet.identity ? formatUserTag(wallet.identity) : null;
  const [connectPassport, setConnectPassport] = useState(null);

  // Fetch passport data when wallet connects, so we can show existing PFP
  useEffect(() => {
    if (wallet.identity?.directAddress) {
      fetch(`${RELAY_SERVER}/passport/wallet/${encodeURIComponent(wallet.identity.directAddress)}`)
        .then(r => r.json())
        .then(d => { if (d.success && d.passport) { setConnectPassport(d.passport); onPassportFound?.(d.passport); } })
        .catch(() => {});
    }
  }, [wallet.identity?.directAddress]);

  const pfpUrl = connectPassport?.avatarUrl;

  if (wallet.identity) {
    return (
      <div style={glassCard}>
        <h2 style={{ fontFamily: "'Hubot Sans', sans-serif", fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Connected</h2>
        <div style={{
          marginTop: 16, padding: '12px 16px', background: H,
          border: `1px solid ${I}`, borderRadius: 10,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
            <svg width="48" height="48" style={{ position: 'absolute', top: -4, left: -4, pointerEvents: 'none' }}>
              <defs>
                <linearGradient id="connect-pfp-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={A} />
                  <stop offset="100%" stopColor={B} />
                </linearGradient>
              </defs>
              <rect x="1" y="1" width="46" height="46" rx="23" ry="23"
                fill="none" stroke="url(#connect-pfp-stroke)" strokeWidth="2.5" />
            </svg>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', overflow: 'hidden',
              background: pfpUrl ? 'transparent' : `linear-gradient(135deg, ${A}, ${B})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {pfpUrl ? (
                <img src={pfpUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                tag?.replace(/^@/, '').slice(0, 4).toUpperCase()
              )}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: A, fontWeight: 600 }}>{tag}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: "'Mona Sans', sans-serif" }}>
              {pfpUrl ? 'Passport active' : 'Sphere identity verified'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      {wallet.status === 'error' && (
        <p style={{ color: '#ff6b6b', fontSize: 13, marginBottom: 16, fontFamily: "'Mona Sans', sans-serif" }}>
          {wallet.error}
        </p>
      )}
      <div style={{
        width: 72, height: 72, margin: '0 auto 24px',
      }}>
        <svg viewBox="0 0 32 32" style={{ width: '100%', height: '100%' }}>
          <rect width="32" height="32" rx="6" fill="#0a0a0a"/>
          <circle cx="16" cy="16" r="14" stroke="#FF6F00" strokeWidth="1.5" opacity="0.3" fill="none"/>
          <circle cx="16" cy="16" r="8" fill="#FF6F00" opacity="0.15"/>
          <circle cx="16" cy="16" r="4" fill="#FF6F00"/>
        </svg>
      </div>
      <h1 style={{
        fontFamily: "'Hubot Sans', sans-serif", fontSize: 26, fontWeight: 600, marginBottom: 10,
      }}>Connect Your Wallet</h1>
      <p style={{ color: E, fontSize: 14, lineHeight: 1.6, maxWidth: 320, margin: '0 auto 32px', fontFamily: "'Mona Sans', sans-serif" }}>
        Link your Sphere wallet to create a passport and deploy agents on the Unicity network.
      </p>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 16px', background: H, border: `1px solid ${I}`, borderRadius: 9999,
        fontSize: 11, color: A, fontFamily: "'JetBrains Mono', monospace", marginBottom: 32,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
        Unicity Testnet2
      </div>
      <div
        onClick={wallet.status === 'connecting' ? undefined : onConnect}
        style={{
          width: '100%', maxWidth: 340, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16,
          padding: '18px 20px', background: wallet.status === 'connecting' ? 'rgba(255,111,0,0.06)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${wallet.status === 'connecting' ? I : G}`,
          borderRadius: 14, cursor: wallet.status === 'connecting' ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s', opacity: wallet.status === 'connecting' ? 0.5 : 1,
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `linear-gradient(135deg, ${A}, ${B})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
        }}>◈</div>
        <div style={{ textAlign: 'left', flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{wallet.status === 'connecting' ? 'Connecting...' : 'Sphere Wallet'}</div>
          <div style={{ fontSize: 11, color: E, marginTop: 2 }}>Connect via Sphere SDK</div>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 18 }}>→</div>
      </div>
      <div style={{ width: '100%', maxWidth: 340, margin: '20px auto 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          'Identity handshake via Nostr DMs',
          'Permissioned relay key generation',
          'Multi-agent quest activation',
        ].map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'rgba(241,245,249,0.35)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}

function GuildSelectView({ onSelect, onCreate, selected }) {
  const guilds = [
    { id: 'explorer', name: 'Explorer Guild', desc: 'Discovery and recon missions. First to test new quests.', icon: '🔭', color: A, members: 128, quests: 47, xp: '12.4k', iconClass: 'explorer' },
    { id: 'builder', name: 'Builder Guild', desc: 'Develop and maintain relay infrastructure.', icon: '⚙️', color: '#3b82f6', members: 94, quests: 31, xp: '9.8k', iconClass: 'builder' },
    { id: 'creator', name: 'Creator Guild', desc: 'Design quest narratives, puzzles, and lore.', icon: '🎨', color: '#a855f7', members: 76, quests: 23, xp: '7.2k', iconClass: 'creator' },
    { id: 'research', name: 'Research Guild', desc: 'Investigate agent behavior and quest analytics.', icon: '🔬', color: '#22c55e', members: 52, quests: 18, xp: '5.6k', iconClass: 'research' },
  ];
  return (
    <div style={{ padding: '0 4px' }}>
      <h1 style={{ fontFamily: "'Hubot Sans', sans-serif", fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Choose Your Guild</h1>
      <p style={{ color: E, fontSize: 13, marginBottom: 28, fontFamily: "'Mona Sans', sans-serif" }}>Your guild determines your role in the relay network.</p>
      {guilds.map((g) => (
        <div key={g.id}
          onClick={() => onSelect(g.id)}
          style={{
            padding: 20, borderRadius: 14, marginBottom: 12, cursor: 'pointer',
            background: selected === g.id ? 'rgba(255,111,0,0.06)' : 'rgba(255,255,255,0.03)',
            border: selected === g.id ? `1px solid ${A}` : '1px solid rgba(255,255,255,0.06)',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: `${g.color}1e`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
            }}>{g.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{g.name}</div>
              <div style={{ fontSize: 12, color: E, marginTop: 2 }}>{g.desc}</div>
            </div>
          </div>
          <div style={{
            display: 'flex', gap: 20, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)',
          }}>
            {[
              { val: g.members, lbl: 'MEMBERS' },
              { val: g.quests, lbl: 'QUESTS' },
              { val: g.xp, lbl: 'TOTAL XP' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: A }}>{s.val}</div>
                <div style={{ fontSize: 9, color: 'rgba(241,245,249,0.3)', letterSpacing: '0.06em', marginTop: 2 }}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <button
        onClick={onCreate}
        disabled={!selected}
        style={{
          width: '100%', ...btnGrad, marginTop: 8,
          opacity: selected ? 1 : 0.4,
          cursor: selected ? 'pointer' : 'not-allowed',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: "'Mona Sans', sans-serif" }}>
          {selected ? `Create Passport →` : 'Select a guild to continue'}
        </span>
      </button>
    </div>
  );
}

function PassportView({ passport, onEnter }) {
  return (
    <div style={{ textAlign: 'center', padding: '10px 0' }}>
      <h1 style={{ fontFamily: "'Hubot Sans', sans-serif", fontSize: 24, fontWeight: 600, marginBottom: 20 }}>Your Agent Passport</h1>
      <div style={{
        background: H, border: `1px solid ${I}`, borderRadius: 12, padding: 20, marginBottom: 16, textAlign: 'left',
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {[
          ['PASSPORT ID', passport.passportId, D],
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
        <div key="relay-key-row" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 0',
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: E, fontFamily: "'JetBrains Mono', monospace" }}>RELAY KEY</span>
          <MaskedKey value={passport.relayKey} color={A} />
        </div>
      </div>
      <p style={{ color: E, fontSize: 12, marginBottom: 16, fontFamily: "'Mona Sans', sans-serif" }}>Save your relay key — you'll need it to connect your AI agents.</p>
      <button onClick={onEnter} style={btnGrad}>Enter Agent Relay →</button>
    </div>
  );
}

function DashboardView({ passport, wallet, identity, pendingDeepLink, setPendingDeepLink, onPassportUpdate }) {
  const navigate = useNavigate();
  const location = useLocation();
  const page = location.pathname.replace(/^\//, '') || 'overview';
  const [menuOpen, setMenuOpen] = useState(false);
  const tag = identity ? formatUserTag(identity) : null;

  const { messages, connected, questState, clearMessages } = useQuestConsole(passport?.passportId);
  const [deployingQuest, setDeployingQuest] = useState(null);
  const [completedQuests, setCompletedQuests] = useState(() => {
    // Restore from localStorage on mount
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('agent-relay-completed');
        if (saved) return new Set(JSON.parse(saved));
      } catch {}
    }
    return new Set();
  });

  // On mount, restore completed quests from passport data
  useEffect(() => {
    if (passport?.questsCompleted > 0) {
      setCompletedQuests(prev => {
        const next = new Set(prev);
        next.add('signal-hunt-01');
        localStorage.setItem('agent-relay-completed', JSON.stringify([...next]));
        return next;
      });
    }
  }, [passport?.passportId, passport?.questsCompleted]);

  // Auto-refresh passport data (re-reads from server on mount / when stats change)
  const [passportData, setPassportData] = useState(null);
  useEffect(() => {
    if (passport) setPassportData(passport);
  }, [passport]);

  // Detect quest completion → persist to server → update local state
  const didComplete = useRef(false);
  useEffect(() => {
    if (questState?.phase === 'completed' && passport?.passportId && !didComplete.current) {
      didComplete.current = true;
      const qId = questState.data?.questId || 'signal-hunt-01';
      const xp = questState.data?.xpAwarded || 50;
      fetch(`${RELAY_SERVER}/quest/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passportId: passport.passportId, questId: qId, xpEarned: xp }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setCompletedQuests(prev => {
              const next = new Set([...prev, qId]);
              localStorage.setItem('agent-relay-completed', JSON.stringify([...next]));
              return next;
            });
            setPassportData(prev => prev ? {
              ...prev,
              questsCompleted: data.passport.questsCompleted,
              totalXp: data.passport.totalXp,
              uctBalance: data.passport.uctBalance,
            } : prev);
            onPassportUpdate?.({
              questsCompleted: data.passport.questsCompleted,
              totalXp: data.passport.totalXp,
              uctBalance: data.passport.uctBalance,
            });
            // Refresh wallet balance to show new UCT
            wallet?.fetchBalance?.();
          }
        })
        .catch(err => console.error('Failed to record completion:', err));
    }
    // Reset flag when a new quest starts
    if (questState?.phase === 'deploying' || questState?.phase === 'init') {
      didComplete.current = false;
    }
  }, [questState?.phase, passport?.passportId]);

  // Auto-deploy deep link quest when passport is ready
  useEffect(() => {
    if (pendingDeepLink && passport?.passportId) {
      deployQuest(pendingDeepLink);
      navigate('/quests');
      setPendingDeepLink(null);
    }
  }, [pendingDeepLink, passport?.passportId]);

  // Clear deploying state when WebSocket connects or messages arrive
  useEffect(() => {
    if (deployingQuest && (connected || messages.length > 0)) {
      setDeployingQuest(null);
      setDeployError(null);
    }
  }, [connected, messages.length > 0]);

  const [deployError, setDeployError] = useState(null);

  const deployQuest = async (questId) => {
    setDeployingQuest(questId);
    setDeployError(null);
    try {
      // Step 1: Charge 0.1 UCT (100000000000000000 wei = 0.1 UCT with 18 decimals)
      const UCT_DEPLOY_COST = '100000000000000000';
      const RELAY_TREASURY_TAG = '@agentrelay-treasury';
      
      if (wallet?.sendUct) {
        try {
          await wallet.sendUct(RELAY_TREASURY_TAG, UCT_DEPLOY_COST);
        } catch (payErr) {
            console.error('UCT payment failed:', payErr);
            // Permission denied typically means a stale wallet session — force reconnect
            const msg = payErr?.message || String(payErr);
            if (msg.includes('Permission denied')) {
              setDeployError('Wallet needs fresh permissions. Reconnecting...');
              setDeployingQuest(null);
              clearMessages();
              // Force fresh reconnect which prompts user to approve permissions again
              await wallet.forceReconnect();
              // Retry deploy after reconnect
              setDeployingQuest(questId);
              try {
                await wallet.sendUct(RELAY_TREASURY_TAG, UCT_DEPLOY_COST);
              } catch (retryErr) {
                console.error('Retry UCT payment failed:', retryErr);
                setDeployError(`Deploy payment failed: ${retryErr?.message || retryErr || 'Unknown error'}`);
                setDeployingQuest(null);
                clearMessages();
                return;
              }
            } else {
              setDeployError(`Deploy payment failed: ${payErr?.message || payErr || 'Unknown error'}`);
              setDeployingQuest(null);
              clearMessages();
              return;
            }
          }
      }
      
      clearMessages();
      const res = await fetch(`${RELAY_SERVER}/quest/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passportId: passport.passportId, questId, userTag: tag }),
      });
      // If the server responds with an error, clear loading state
      if (!res.ok) {
        console.error('Deploy failed:', res.status);
        setDeployingQuest(null);
      }
    } catch (err) {
      console.error('Failed to deploy quest:', err);
      setDeployingQuest(null);
    }
  };

  const submitAnswer = async (questId, answer) => {
    try {
      await fetch(`${RELAY_SERVER}/quest/submit-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passportId: passport.passportId, questId, answer }),
      });
    } catch (err) {
      console.error('Failed to submit answer:', err);
    }
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
    { id: 'quests', label: 'Quests', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
    { id: 'guild-chat', label: 'Guild Chat', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
    { id: 'profile', label: 'Profile', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  ];

  const pageTitle = navItems.find(n => n.id === page)?.label || 'Dashboard';

  return (
    <div style={{
      minHeight: 'calc(100vh - 80px)',
      fontFamily: "'Mona Sans', sans-serif",
      position: 'relative',
    }}>
      {/* Background dot grid */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 48,
        pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(255,111,0,0.06) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }} />
      {/* Terminal scan line overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 50,
        pointerEvents: 'none',
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
      }} />
      {/* Hamburger button / Logo toggle */}
      <div style={{
        position: 'fixed', top: 12, left: 12, zIndex: 200,
      }}>
        {menuOpen ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, height: 36,
            padding: '0 8px', cursor: 'pointer',
          }} onClick={() => setMenuOpen(false)}>
            <LogoMark size={18} />
            <span style={{ fontFamily: "'Hubot Sans', sans-serif", fontWeight: 600, fontSize: 12, letterSpacing: '0.08em', color: D }}>AGENT RELAY</span>
          </div>
        ) : (
          <button onClick={() => setMenuOpen(true)} style={{
            background: H, border: `1px solid ${I}`, borderRadius: 10,
            color: D, width: 36, height: 36, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Page title in top bar */}
      <div style={{
        textAlign: 'center', padding: '16px 0 0',
        fontFamily: "'Hubot Sans', sans-serif", fontSize: 13,
        fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)',
      }}>
        {pageTitle.toUpperCase()}
      </div>

      {/* Overlay backdrop */}
      {menuOpen && (
        <div onClick={() => setMenuOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 150,
          background: 'rgba(0,0,0,0.5)',
        }} />
      )}

      {/* Sidebar drawer */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 160,
        width: 220, background: '#0a0a0a',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
        transform: menuOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
      }}>
        {/* Sidebar header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '16px 16px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}>
          <button onClick={() => setMenuOpen(false)} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 18, padding: 0,
          }}>✕</button>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, padding: '8px 0' }}>
          {navItems.map(n => (
            <button key={n.id} onClick={() => { navigate('/' + n.id); setMenuOpen(false); }} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', width: '100%',
              background: page === n.id ? H : 'transparent',
              border: 'none', borderLeft: page === n.id ? `3px solid ${A}` : '3px solid transparent',
              color: page === n.id ? A : E, cursor: 'pointer', fontSize: 14, fontWeight: page === n.id ? 600 : 400,
              textAlign: 'left', fontFamily: "'Mona Sans', sans-serif", transition: 'all 0.15s',
            }}>
              <span style={{ opacity: page === n.id ? 1 : 0.4, display: 'inline-flex' }}>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </div>

        {/* User tag footer */}
        {tag && (
          <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                background: passport?.avatarUrl ? 'transparent' : `linear-gradient(135deg, ${A}, ${B})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8, fontWeight: 700, color: '#fff',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {passport?.avatarUrl ? (
                  <img src={passport.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  tag.replace(/^@/, '').slice(0, 4).toUpperCase()
                )}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: D, fontFamily: "'JetBrains Mono', monospace" }}>{tag}</div>
                <div style={{ fontSize: 10, color: E }}>{passport?.guild ? `${passport.guild.charAt(0).toUpperCase() + passport.guild.slice(1)} Guild` : 'no guild'}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{ padding: '48px 20px 40px', maxWidth: 800, margin: '0 auto' }}>
        {page === 'overview' && <OverviewPage passport={passportData || passport} tag={tag} wallet={wallet} />}
        {page === 'quests' && <QuestsPage onDeploy={deployQuest} messages={messages} connected={connected} questState={questState} passportId={passport?.passportId} onSubmitAnswer={submitAnswer} onBackToQuests={() => { clearMessages(); setDeployError(null); }} deployingQuest={deployingQuest} deployError={deployError} passport={passport} tag={tag} completedQuests={completedQuests} />}
        {page === 'guild-chat' && <GuildChatPage passport={passport} tag={tag} identity={identity} />}
        {page === 'profile' && <ProfilePage passport={passport} tag={tag} identity={identity} onPassportUpdate={onPassportUpdate} />}
      </div>
    </div>
  );
}

// ── Dashboard Pages ──────────────────────────────

function OverviewPage({ passport, tag, wallet }) {
  const uctBalance = wallet?.getUctBalance ? wallet.getUctBalance() : '—';
  const stats = [
    { label: 'Passport', value: passport?.passportId || '—', color: A },
    { label: 'Guild', value: passport?.guild ? `${passport.guild.charAt(0).toUpperCase() + passport.guild.slice(1)} Guild` : '—', color: D },
    { label: 'UCT Balance', value: `${uctBalance} UCT`, color: A },
    { label: 'Quests Done', value: passport?.questsCompleted || 0, color: D },
    { label: 'Total XP', value: passport?.totalXp || 0, color: D },
    { label: 'Relay Key', value: passport?.relayKey || '—', color: A },
    { label: 'Agent Status', value: '4/4 Online', color: '#22c55e' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
          <svg width="48" height="48" style={{ position: 'absolute', top: -4, left: -4, pointerEvents: 'none' }}>
            <defs>
              <linearGradient id="overview-pfp-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={A} />
                <stop offset="100%" stopColor={B} />
              </linearGradient>
            </defs>
            <rect x="1" y="1" width="46" height="46" rx="23" ry="23"
              fill="none" stroke="url(#overview-pfp-stroke)" strokeWidth="2.5" />
          </svg>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', overflow: 'hidden',
            background: passport?.avatarUrl ? 'transparent' : `linear-gradient(135deg, ${A}, ${B})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {passport?.avatarUrl ? (
              <img src={passport.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              tag?.replace(/^@/, '').slice(0, 4).toUpperCase() || '?'
            )}
          </div>
        </div>
        <h2 style={{ fontFamily: "'Hubot Sans', sans-serif", fontSize: 24, fontWeight: 600 }}>Overview</h2>
      </div>
      <p style={{ color: E, fontSize: 14, marginBottom: 28, fontFamily: "'Mona Sans', sans-serif" }}>Welcome back, {tag}. Your agents are standing by.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ ...glassCard, padding: '18px 16px' }}>
            <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: E, marginBottom: 6, letterSpacing: '0.06em' }}>{s.label}</div>
            {s.label === 'Relay Key' ? (
              <MaskedKey value={s.value === '—' ? '—' : s.value} color={s.color} />
            ) : (
              <div style={{ fontSize: 15, fontWeight: 600, color: s.color, fontFamily: "'JetBrains Mono', monospace", wordBreak: 'break-all' }}>{s.value}</div>
            )}
          </div>
        ))}
      </div>

      <div style={{ ...glassCard, padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <SectionLabel>AGENT ACTIVITY</SectionLabel>
          <span style={{ fontSize: 8, color: '#22c55e', fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            LIVE
          </span>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: 1.8 }}>
          <span style={{ color: A }}>[VERIFICATION]</span> <span style={{ color: 'rgba(255,255,255,0.25)' }}>Waiting for relay handshake...</span><br />
          <span style={{ color: A }}>[PUZZLE]</span> <span style={{ color: 'rgba(255,255,255,0.25)' }}>Scanning for quest triggers...</span><br />
          <span style={{ color: A }}>[LORE]</span> <span style={{ color: 'rgba(255,255,255,0.25)' }}>Awaiting narrative signal...</span><br />
          <span style={{ color: A }}>[TREASURY]</span> <span style={{ color: 'rgba(255,255,255,0.25)' }}>Standing by for rewards...</span>
        </div>
      </div>
    </div>
  );
}

function QuestsPage({ onDeploy, messages, connected, questState, passportId, onSubmitAnswer, onBackToQuests, deployingQuest, deployError, passport, tag, completedQuests = new Set() }) {
  const [answer, setAnswer] = useState('');
  const [activeQuest, setActiveQuest] = useState(null);
  const bottomRef = useRef(null);
  const quests = [
    { id: 'signal-hunt-01', title: 'Signal Hunt', desc: 'Collect clues from 5 agents to locate the hidden signal.', difficulty: 'Easy', reward: '50 XP + 1 UCT', cost: '0.1 UCT', status: 'available', agent: 'Puzzle' },
    { id: 'secret-market-01', title: 'Secret Market', desc: 'Agents negotiate prices for rare intel. Best offer wins.', difficulty: 'Medium', reward: '100 XP + 2 UCT', cost: '0.1 UCT', status: 'locked', agent: 'Treasury' },
    { id: 'lost-archive-01', title: 'Lost Archive', desc: 'Agents search decentralized records for a forgotten fragment.', difficulty: 'Medium', reward: '120 XP + 3 UCT', cost: '0.1 UCT', status: 'locked', agent: 'Lore' },
    { id: 'agent-escape-room-01', title: 'Agent Escape Room', desc: 'Combine clues from all 4 agents to unlock the exit.', difficulty: 'Hard', reward: '250 XP + 5 UCT', cost: '0.1 UCT', status: 'locked', agent: 'Verification' },
  ];

  useEffect(() => {
    if (questState?.phase) setActiveQuest(questState.questId || 'signal-hunt-01');
  }, [questState]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!answer.trim() || !activeQuest) return;
    onSubmitAnswer(activeQuest, answer.trim());
    setAnswer('');
  };

  const handleDeploy = (qId) => {
    setActiveQuest(qId);
    onDeploy(qId);
  };

  // ── Confirm a pending user action (user clicks to send their agent's message) ──
  const handleConfirmAction = () => {
    if (!pendingAction) return;
    typedSetRef.current.add(pendingAction.idx);
    setPendingAction(null);
  };

  // ── Sequential typing animation — single persistent interval (survives message arrivals) ──
  const [typingLen, setTypingLen] = useState(0);
  const [typingIdx, setTypingIdx] = useState(-1);
  const [pendingAction, setPendingAction] = useState(null); // {text, from, to, message} waiting for user confirm
  const typedSetRef = useRef(new Set());
  const messagesRef = useRef(messages);
  const holdUntilRef = useRef(0);
  const typingIdxRef = useRef(-1);
  const typingLenRef = useRef(0);
  messagesRef.current = messages;

  if (typingIdx !== typingIdxRef.current) typingIdxRef.current = typingIdx;
  if (typingLen !== typingLenRef.current) typingLenRef.current = typingLen;


  const isUserFrom = (from) => {
    const clean = (s) => (s || '').replace(/^@/, '').toLowerCase();
    const fromClean = clean(from);
    const tagClean = clean(tag);
    return fromClean === 'user' || fromClean === tagClean || fromClean === '';
  };

  // ── Reset on new quest ──
  useEffect(() => {
    if (messages.length === 0) {
      setPendingAction(null);
      setTypingIdx(-1);
      setTypingLen(0);
      typedSetRef.current = new Set();
      holdUntilRef.current = 0;
      typingIdxRef.current = -1;
      typingLenRef.current = 0;
    }
  }, [messages.length === 0]);

  // ── Typing ticker — single persistent interval ──
  useEffect(() => {
    const tick = () => {
      const msgs = messagesRef.current;
      // Find first untyped message with content
      let nextIdx = -1;
      for (let i = 0; i < msgs.length; i++) {
        if (!typedSetRef.current.has(i) && msgs[i]?.message) {
          nextIdx = i;
          break;
        }
      }
      if (nextIdx === -1) {
        if (typingIdxRef.current !== -1) {
          setTypingIdx(-1);
          setTypingLen(0);
        }
        return;
      }

      // If there's a pending user action, don't advance
      if (pendingAction) return;

      // Hold period
      if (holdUntilRef.current > Date.now()) return;

      const currentIdx = typingIdxRef.current;
      const currentLen = typingLenRef.current;
      const nextMsg = msgs[nextIdx];

      // If the next message is from the user → preload as pending action
      if (isUserFrom(nextMsg.from) && currentIdx === -1) {
        setPendingAction({
          idx: nextIdx,
          from: nextMsg.from,
          to: nextMsg.to,
          message: nextMsg.message,
          phase: nextMsg.phase,
        });
        return;
      }

      // Nothing currently typing, start agent message
      if (currentIdx === -1) {
        setTypingLen(0);
        setTypingIdx(nextIdx);
        return;
      }

      // If current message is done, clear
      if (typedSetRef.current.has(currentIdx)) {
        setTypingIdx(-1);
        return;
      }

      // Advance one char
      const msg = msgs[currentIdx]?.message;
      if (!msg) return;
      const nextLen = currentLen + 1;
      if (nextLen >= msg.length) {
        typedSetRef.current.add(currentIdx);
        holdUntilRef.current = Date.now() + 600;
      }
      setTypingLen(nextLen);
    };

    const interval = setInterval(tick, 55);
    return () => clearInterval(interval);
  }, [pendingAction]); // re-subscribe when pendingAction changes so it can be skipped

  const phaseColor = (p) => {
    const colors = { deploying: A, verifying: '#3b82f6', lore: '#a855f7', puzzle: A, lore_complete: '#a855f7', rewarding: '#22c55e', completed: '#22c55e', error: '#ef4444' };
    return colors[p] || 'rgba(255,255,255,0.25)';
  };

  const phaseLabel = (p) => {
    const labels = { deploying: 'Deploying', verifying: 'Verifying', lore: 'Narrative', puzzle: 'Puzzle Active', lore_complete: 'Closing', rewarding: 'Rewarding', completed: 'Complete', error: 'Error' };
    return labels[p] || p;
  };

  const isQuestActive = messages.length > 0;

  return (
    <div>
      {/* Full-screen loading overlay when deploying */}
      {deployingQuest && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(10,10,10,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 20,
        }}>
          <div style={{ animation: 'spin 0.8s linear infinite' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#FF6F00" strokeWidth="3" opacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="#FF6F00" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13, color: '#FF6F00', fontWeight: 600,
            letterSpacing: '0.08em',
          }}>
            APPROVE PAYMENT
          </div>
          <div style={{
            fontFamily: "'Mona Sans', sans-serif",
            fontSize: 13, color: 'rgba(255,255,255,0.5)',
            textAlign: 'center', maxWidth: 280, lineHeight: 1.5,
          }}>
            Check your wallet popup to approve<br/>the <strong style={{color: '#fbbf24'}}>0.1 UCT</strong> deploy fee
          </div>
          <div style={{
            fontFamily: "'Mona Sans', sans-serif",
            fontSize: 11, color: 'rgba(255,255,255,0.25)',
            marginTop: 8,
          }}>
            Return to this page after approving
          </div>
        </div>
      )}
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h2 style={{ fontFamily: "'Hubot Sans', sans-serif", fontSize: 24, fontWeight: 600, margin: 0 }}>Quests</h2>
        {isQuestActive && (
          <button onClick={() => { onBackToQuests(); setActiveQuest(null); }} style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
            color: E, borderRadius: 8, padding: '6px 14px', fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer',
          }}>
            ← All Quests
          </button>
        )}
      </div>

      {!isQuestActive ? (
        <>
          {deployError && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 10, padding: '12px 16px', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 12, color: '#ef4444', fontFamily: "'Mona Sans', sans-serif",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              <span>{deployError}</span>
            </div>
          )}
          <p style={{ color: E, fontSize: 14, marginBottom: 28, fontFamily: "'Mona Sans', sans-serif" }}>
            Your agents are ready. Pick a mission and deploy.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {quests.map((q, i) => {
              const isCompleted = completedQuests.has(q.id);
              return (
              <div key={i} style={{ ...glassCard, padding: '20px', opacity: q.status === 'locked' ? 0.5 : isCompleted ? 0.4 : 1, filter: isCompleted ? 'grayscale(0.8)' : 'none', pointerEvents: isCompleted ? 'none' : 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.2)' }}>{q.id}</span>
                      <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: isCompleted ? '#22c55e' : q.status === 'available' ? A : 'rgba(255,255,255,0.2)', background: isCompleted ? 'rgba(34,197,94,0.1)' : q.status === 'available' ? H : 'transparent', padding: '2px 8px', borderRadius: 4 }}>{isCompleted ? 'COMPLETED' : q.status.toUpperCase()}</span>
                    </div>
                    <h3 style={{ fontFamily: "'Hubot Sans', sans-serif", fontSize: 16, fontWeight: 600, margin: 0 }}>{q.title}</h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: A }}>{q.reward}</div>
                    <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: E, marginTop: 2 }}>{q.difficulty}</div>
                  </div>
                </div>
                <p style={{ color: E, fontSize: 13, lineHeight: 1.5, margin: '0 0 12px', fontFamily: "'Mona Sans', sans-serif" }}>{q.desc}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.25)' }}>Agent: {q.agent}</div>
                    {q.status === 'available' && !isCompleted && (
                      <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: '#fbbf24', marginTop: 2 }}>Cost: {q.cost}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isCompleted ? (
                      <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                        Done
                      </span>
                    ) : q.status === 'available' && (
                      <button onClick={() => handleDeploy(q.id)} disabled={!!deployingQuest} style={{ ...btnGrad, height: 32, padding: '0 16px', fontSize: 12, borderRadius: 8, opacity: deployingQuest ? 0.6 : 1, cursor: deployingQuest ? 'not-allowed' : 'pointer' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'Mona Sans', sans-serif" }}>
                          {deployingQuest ? 'Deploying...' : 'Deploy Agent'}
                          {deployingQuest ? (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ animation: 'spin 0.8s linear infinite' }}>
                              <circle cx="12" cy="12" r="10" stroke="currentColor" opacity="0.3" />
                              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                            </svg>
                          ) : (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                            </svg>
                          )}
                        </span>
                      </button>
                    )}
                    {q.status === 'locked' && (
                      <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.15)' }}>Complete previous quest →</span>
                    )}
                    <button
                      onClick={() => {
                        const link = `https://agent-quest-relay.vercel.app?quest=${q.id}`;
                        navigator.clipboard?.writeText(link);
                      }}
                      style={{
                        background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                        color: E, borderRadius: 6, padding: '4px 10px', fontSize: 10,
                        fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer',
                      }}
                      title="Copy quest deep link"
                    >
                      🔗 Share
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </>
      ) : (
        /* ── LIVE CONSOLE: Agent conversation + answer input ── */
        <div>
          {/* Quest status header */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: A, fontWeight: 600 }}>
              {activeQuest}
            </span>
            {questState?.phase && (
              <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: phaseColor(questState.phase), display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: phaseColor(questState.phase), display: 'inline-block' }} />
                {phaseLabel(questState.phase)}
              </span>
            )}
            <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: connected ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
              {connected ? '● LIVE' : '○ OFFLINE'}
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button onClick={() => {
                const text = messages.map(m => `${m.from} → ${m.to}: ${m.message}`).join('\n');
                navigator.clipboard?.writeText(text);
              }} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: E, borderRadius: 6, padding: '5px 10px', fontSize: 10, fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer' }}>
                📋 Copy Log
              </button>
            </div>
          </div>

          {/* Console feed */}
          <div style={{ ...glassCard, padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,111,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                <span style={{ color: A }}>$</span>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>agent-relay comms --tail</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8, fontFamily: "'JetBrains Mono', monospace", color: connected ? '#22c55e' : '#ef4444' }}>
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: connected ? '#22c55e' : '#ef4444', display: 'inline-block' }} />
                {connected ? 'STREAMING' : 'OFFLINE'}
              </div>
            </div>
            <div style={{ padding: '6px 16px', maxHeight: 340, overflow: 'auto', minHeight: 100 }}>
              {messages.length === 0 ? (
                <div style={{ padding: '30px 0', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>
                  Initializing agent handshake...
                </div>
              ) : (
                messages.map((m, i) => {
                  const isTyping = i === typingIdx;
                  const isDone = typedSetRef.current.has(i);
                  // Don't reveal messages before their turn in the animation
                  if (!isTyping && !isDone) return null;
                  const msgText = isTyping ? m.message.slice(0, typingLen) : m.message;
                  return (
                    <div key={i} style={{ display: 'flex', gap: 6, padding: '5px 0', borderBottom: i < messages.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, lineHeight: 1.5 }}>
                      <span style={{ color: 'rgba(255,255,255,0.12)', minWidth: 50, fontSize: 9 }}>{m.time}</span>
                      <span style={{ color: m.from === 'SYSTEM' ? '#22c55e' : phaseColor(m.phase), fontWeight: 600, minWidth: 85, fontSize: 10 }}>{m.from}</span>
                      <svg width="12" height="10" viewBox="0 0 24 12" fill="none" style={{ minWidth: 12 }}>
                        <path d="M2 6h18M14 2l6 4-6 4" stroke="rgba(255,111,0,0.3)" strokeWidth="1.5" />
                      </svg>
                      <span style={{ color: '#22c55e', minWidth: 85, fontSize: 10 }}>{m.to}</span>
                      <span style={{ color: m.phase === 'error' ? '#ef4444' : 'rgba(255,255,255,0.45)', flex: 1 }}>
                        {msgText}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Pending action — user must confirm their agent's next move */}
          {pendingAction ? (
            <div style={{ marginTop: 12, ...glassCard, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                <span style={{ color: A, fontWeight: 600 }}>{pendingAction.from}</span>
                <span style={{ color: 'rgba(255,255,255,0.25)', margin: '0 6px' }}>→</span>
                <span style={{ color: '#22c55e' }}>{pendingAction.to}</span>
                <div style={{ color: 'rgba(255,255,255,0.7)', marginTop: 4, fontSize: 11 }}>{pendingAction.message}</div>
              </div>
              <button onClick={handleConfirmAction} style={{ ...btnGrad, height: 36, padding: '0 20px', fontSize: 12, borderRadius: 8, whiteSpace: 'nowrap' }}>
                {pendingAction.message.startsWith('[VERIFY]') ? 'Verify →' :
                 pendingAction.message.startsWith('[REQUEST]') ? 'Request →' :
                 pendingAction.message.startsWith('[READY]') ? 'Ready →' :
                 pendingAction.message.startsWith('[ANSWER]') ? 'Submit →' :
                 pendingAction.message.startsWith('[CLAIM]') ? 'Claim →' :
                 'Confirm →'}
              </button>
            </div>
          ) : questState?.phase === 'puzzle' || questState?.phase === 'ready' ? (
            <form onSubmit={handleSubmit} style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={questState?.phase === 'puzzle' ? `Type answer for ${activeQuest}...` : 'Waiting for system...'}
                disabled={questState?.phase !== 'puzzle'}
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  color: D, fontSize: 13, fontFamily: "'JetBrains Mono', monospace",
                  outline: 'none', opacity: questState?.phase !== 'puzzle' ? 0.4 : 1,
                }}
              />
              <button type="submit" disabled={questState?.phase !== 'puzzle'} style={{
                ...btnGrad, height: 40, padding: '0 20px', fontSize: 13, borderRadius: 8,
                opacity: questState?.phase !== 'puzzle' ? 0.4 : 1,
              }}>
                Send
              </button>
            </form>
          ) : null}

          {/* Quest complete banner */}
          {questState?.phase === 'completed' && (
            <div style={{ marginTop: 16, padding: 16, ...glassCard, textAlign: 'center' }}>
              <span style={{ fontSize: 24, marginBottom: 8, display: 'block' }}>🏆</span>
              <div style={{ fontFamily: "'Hubot Sans', sans-serif", fontSize: 16, fontWeight: 600, color: '#22c55e' }}>
                Quest Complete!
              </div>
              <div style={{ fontSize: 12, color: E, fontFamily: "'Mona Sans', sans-serif", marginTop: 4 }}>
                Signal Hunt finished. All fragments collected.
              </div>
              <button onClick={() => { onBackToQuests(); setActiveQuest(null); }} style={{ ...btnGrad, height: 34, padding: '0 20px', fontSize: 12, borderRadius: 8, marginTop: 14 }}>
                Back to Quests
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProfilePage({ passport, tag, identity, onPassportUpdate }) {
  const [savedPfp, setSavedPfp] = useState(passport?.avatarUrl || null);
  const [pfpPreview, setPfpPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const pendingDataUrl = useRef(null);

  // Sync savedPfp when passport data updates
  useEffect(() => {
    if (passport?.avatarUrl) setSavedPfp(passport.avatarUrl);
  }, [passport?.avatarUrl]);

  const hasChanges = pfpPreview !== null;

  const details = [
    { label: 'PASSPORT ID', value: passport?.passportId, color: A },
    { label: 'RELAY KEY', value: passport?.relayKey, color: A },
    { label: 'WALLET', value: passport?.walletAddress || identity?.directAddress || '—', color: D, mono: true },
    { label: 'GUILD', value: passport?.guild ? `${passport.guild.charAt(0).toUpperCase() + passport.guild.slice(1)} Guild` : '—', color: D },
    { label: 'NETWORK', value: 'Unicity Testnet 2', color: D },
    { label: 'NAMETAG', value: tag || '—', color: A },
  ];

  const handlePfpClick = () => fileInputRef.current?.click();

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !passport?.passportId) return;
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
    pendingDataUrl.current = dataUrl;
    setPfpPreview(dataUrl);
    // Reset input so selecting the same file again triggers onChange
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!pendingDataUrl.current || !passport?.passportId) return;
    setUploading(true);
    try {
      const res = await fetch(`${RELAY_SERVER}/avatar/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passportId: passport.passportId, image: pendingDataUrl.current }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedPfp(data.avatarUrl);
        setPfpPreview(null);
        pendingDataUrl.current = null;
        onPassportUpdate?.({ avatarUrl: data.avatarUrl });
      } else {
        console.error('Upload failed:', data.error);
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setPfpPreview(null);
    pendingDataUrl.current = null;
  };

  const displayPfp = pfpPreview || savedPfp;

  return (
    <div>
      <h2 style={{ fontFamily: "'Hubot Sans', sans-serif", fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Profile</h2>
      <p style={{ color: E, fontSize: 14, marginBottom: 28, fontFamily: "'Mona Sans', sans-serif" }}>Your agent passport and identity details.</p>

      <div style={{ ...glassCard, marginBottom: 20 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24,
          padding: '20px 0 24px', borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}>
          {/* PFP with orange gradient stroke */}
          <div onClick={handlePfpClick} style={{
            position: 'relative', cursor: 'pointer', flexShrink: 0,
          }}>
            {/* Gradient stroke ring */}
            <svg width="64" height="64" style={{ position: 'absolute', top: -4, left: -4, pointerEvents: 'none' }}>
              <defs>
                <linearGradient id="pfp-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={A} />
                  <stop offset="100%" stopColor={B} />
                </linearGradient>
              </defs>
              <rect x="1" y="1" width="62" height="62" rx="31" ry="31"
                fill="none" stroke="url(#pfp-stroke)" strokeWidth="2.5" />
            </svg>
            {/* Avatar */}
            <div style={{
              width: 56, height: 56, borderRadius: '50%', overflow: 'hidden',
              background: displayPfp ? 'transparent' : `linear-gradient(135deg, ${A}, ${B})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 700, color: '#fff',
              fontFamily: "'JetBrains Mono', monospace",
              position: 'relative',
            }}>
              {displayPfp ? (
                <img src={displayPfp} alt="PFP" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                tag?.replace(/^@/, '').slice(0, 4).toUpperCase()
              )}
              {/* Hover overlay */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'rgba(0,0,0,0.4)', opacity: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, transition: 'opacity 0.2s',
              }} className="pfp-hover">📷</div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </div>
          <div>
            <div style={{ fontFamily: "'Hubot Sans', sans-serif", fontSize: 20, fontWeight: 600 }}>{tag}</div>
            <div style={{ color: E, fontSize: 13, marginTop: 2, fontFamily: "'Mona Sans', sans-serif" }}>{passport?.guild ? `${passport.guild.charAt(0).toUpperCase() + passport.guild.slice(1)} Guild` : 'No guild'}</div>
          </div>
        </div>
        {details.map((d, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 0', borderBottom: i < details.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
          }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: E, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>{d.label}</span>
            {d.label === 'RELAY KEY' ? (
              <MaskedKey value={d.value || '—'} color={d.color} />
            ) : (
              <span style={{ fontSize: 13, fontWeight: 500, color: d.color, fontFamily: "'JetBrains Mono', monospace", wordBreak: d.mono ? 'break-all' : 'normal', textAlign: 'right', maxWidth: '60%', marginLeft: 12 }}>{d.value || '—'}</span>
            )}
          </div>
        ))}
      </div>

      {hasChanges && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, justifyContent: 'flex-end' }}>
          <button onClick={handleCancel} disabled={uploading} style={{
            ...btnGrad, background: 'transparent', border: `1px solid ${I}`, color: E, flex: 1, maxWidth: 140,
            opacity: uploading ? 0.5 : 1, cursor: uploading ? 'not-allowed' : 'pointer',
          }}>Cancel</button>
          <button onClick={handleSave} disabled={uploading} style={{
            ...btnGrad, flex: 1, maxWidth: 200,
            opacity: uploading ? 0.7 : 1, cursor: uploading ? 'not-allowed' : 'pointer',
          }}>{uploading ? 'Saving...' : 'Save Changes'}</button>
        </div>
      )}

      {/* PFP hover style */}
      <style>{`
        .pfp-hover { opacity: 0; }
        div:hover > .pfp-hover { opacity: 1; }
      `}</style>
    </div>
  );
}

// ── Guild Chat ──────────────────────────────────

function GuildChatPage({ passport, tag, identity }) {
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [guildName, setGuildName] = useState(null);
  const wsRef = useRef(null);
  const chatBottomRef = useRef(null);

  // Initialize guild name from passport
  useEffect(() => {
    if (passport?.guild) {
      setGuildName(`${passport.guild.charAt(0).toUpperCase() + passport.guild.slice(1)} Guild`);
    }
  }, [passport]);

  // WebSocket connection for guild chat
  useEffect(() => {
    if (!passport?.passportId) return;
    const wsUrl = RELAY_SERVER.replace(/^http/, 'ws') + '/ws/guild-chat';
    let ws;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        // Send join message
        ws.send(JSON.stringify({ type: 'join', passportId: passport.passportId, userTag: tag, guild: passport.guild }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'history') {
            // Prepend history messages (sent on join)
            setChatMessages(data.messages || []);
            return;
          }

          if (data.type === 'chat' || data.message) {
            setChatMessages(prev => [...prev, {
              id: Date.now() + Math.random(),
              from: data.from || data.userTag || 'Agent',
              message: data.message || data.text || data.content || '',
              time: data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              system: false,
            }]);
          } else if (data.type === 'system' || data.system) {
            setChatMessages(prev => [...prev, {
              id: Date.now() + Math.random(),
              from: 'SYSTEM',
              message: data.message || data.text || '',
              time: data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              system: true,
            }]);
          }
        } catch {
          // Plain text message
          setChatMessages(prev => [...prev, {
            id: Date.now() + Math.random(),
            from: 'Relay',
            message: event.data,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            system: false,
          }]);
        }
      };

      ws.onclose = () => setWsConnected(false);
      ws.onerror = () => setWsConnected(false);
    } catch {
      setWsConnected(false);
    }

    return () => {
      if (ws) {
        ws.close();
        wsRef.current = null;
      }
    };
  }, [passport?.passportId]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const msg = chatInput.trim();
    wsRef.current.send(JSON.stringify({ type: 'chat', message: msg, userTag: tag }));
    // Don't add locally — server broadcasts back to everyone including sender
    setChatInput('');
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "'Hubot Sans', sans-serif", fontSize: 24, fontWeight: 600, margin: '0 0 4px' }}>
            {guildName || 'Guild Chat'}
          </h2>
          <div style={{ fontSize: 12, color: E, fontFamily: "'Mona Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: wsConnected ? '#22c55e' : '#ef4444',
              display: 'inline-block',
              boxShadow: wsConnected ? '0 0 6px rgba(34,197,94,0.6)' : 'none',
            }} />
            {wsConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>

      {/* Chat message area */}
      <div style={{
        ...glassCard, padding: 0, overflow: 'hidden', marginBottom: 12,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)',
          background: 'rgba(255,111,0,0.03)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
            <span style={{ color: A }}>$</span>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>guild-chat --live</span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 8, fontFamily: "'JetBrains Mono', monospace",
            color: wsConnected ? '#22c55e' : '#ef4444',
          }}>
            <span style={{
              width: 3, height: 3, borderRadius: '50%',
              background: wsConnected ? '#22c55e' : '#ef4444',
              display: 'inline-block',
            }} />
            {wsConnected ? 'STREAMING' : 'OFFLINE'}
          </div>
        </div>
        <div style={{ padding: '8px 16px', maxHeight: 380, overflow: 'auto', minHeight: 180 }}>
          {chatMessages.length === 0 ? (
            <div style={{
              padding: '50px 0', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, color: 'rgba(255,255,255,0.15)',
            }}>
              {wsConnected ? 'Connected. Messages will appear here...' : 'Waiting for connection...'}
            </div>
          ) : (
            chatMessages.map((m, i) => (
              <div key={m.id} style={{
                display: 'flex', gap: 8, padding: '7px 0',
                borderBottom: i < chatMessages.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: 1.5,
              }}>
                <span style={{ color: 'rgba(255,255,255,0.12)', minWidth: 44, fontSize: 9 }}>{m.time}</span>
                <span style={{
                  color: m.system ? '#22c55e' : A,
                  fontWeight: 600, minWidth: 70, fontSize: 10,
                }}>
                  {m.from}
                </span>
                <span style={{
                  color: m.system ? 'rgba(34,197,94,0.6)' : D,
                  flex: 1, wordBreak: 'break-word',
                }}>
                  {m.message}
                </span>
              </div>
            ))
          )}
          <div ref={chatBottomRef} />
        </div>
      </div>

      {/* Chat input */}
      <form onSubmit={handleChatSubmit} style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder={wsConnected ? 'Type a message...' : 'Connecting...'}
          disabled={!wsConnected}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 8,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            color: D, fontSize: 13, fontFamily: "'JetBrains Mono', monospace",
            outline: 'none', opacity: wsConnected ? 1 : 0.4,
          }}
        />
        <button type="submit" disabled={!wsConnected || !chatInput.trim()} style={{
          ...btnGrad, height: 40, padding: '0 20px', fontSize: 13, borderRadius: 8,
          opacity: wsConnected && chatInput.trim() ? 1 : 0.4,
        }}>
          Send
        </button>
      </form>
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
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
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

function RelayDownView({ onRetry }) {
  return (
    <div style={{
      maxWidth: 480, margin: '0 auto', padding: '40px 20px',
      fontFamily: "'Mona Sans', sans-serif", backgroundColor: C, color: D,
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center', textAlign: 'center',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 20,
        background: 'rgba(255,111,0,0.1)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 28, marginBottom: 24,
      }}>⚠️</div>
      <h2 style={{
        fontFamily: "'Hubot Sans', sans-serif", fontSize: 22, fontWeight: 600,
        margin: '0 0 8px', letterSpacing: '-0.02em',
      }}>Relay server offline</h2>
      <p style={{ color: E, fontSize: 14, lineHeight: 1.6, margin: '0 0 32px', maxWidth: 360 }}>
        The agent relay is temporarily unreachable. Your existing passport is safe —
        no new profile will be created. Try again in a moment.
      </p>
      <button onClick={onRetry} style={{
        ...btnGrad, fontFamily: "'Mona Sans', sans-serif",
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          Retry connection
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
        </span>
      </button>
    </div>
  );
}

export default App;
