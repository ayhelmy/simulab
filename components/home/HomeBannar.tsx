'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PublicHeader from '../public/PublicHeader';
import { getPlatformStats, type PlatformStats } from '@/lib/pageContent';

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    size: 6 + (i * 7) % 14,
    left: (i * 37 + 11) % 100,
    delay: (i * 0.4) % 6,
    dur: 5 + (i * 1.1) % 7,
    opacity: 0.06 + (i % 5) * 0.04,
}));

export default function HomeBanner() {
    const router = useRouter();
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 80);
        getPlatformStats().then(setStats).catch(() => { });
        return () => clearTimeout(t);
    }, []);

    return (
        <>
            <style>{`
        /* ── Entrance animations ─────────────────────────────────── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(36px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33%       { transform: translateY(-14px) rotate(3deg); }
          66%       { transform: translateY(-7px)  rotate(-2deg); }
        }
        @keyframes particleDrift {
          0%   { transform: translateY(0)    rotate(0deg);   opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(-90vh) rotate(360deg); opacity: 0; }
        }
@keyframes shimmer {
  0% {
    background-position: center -200%;
  }

  50% {
    background-position: center 200%;
  }

  100% {
    background-position: center 400%;
  }
}
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0   rgba(245,147,36,0.6); }
          70%  { box-shadow: 0 0 0 18px rgba(245,147,36,0);   }
          100% { box-shadow: 0 0 0 0   rgba(245,147,36,0);    }
        }
        @keyframes borderSpin {
          to { --angle: 360deg; }
        }
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes countUp {
          from { opacity: 0; transform: scale(0.7); }
          to   { opacity: 1; transform: scale(1); }
        }

        /* ── Hero wrapper ────────────────────────────────────────── */
        .hero-root {
          position: relative;
          width: 100%;
          height: 100vh;
          min-height: 600px;
          overflow: hidden;
          background: #000;
          display: flex;
          flex-direction: column;
        }

        /* ── Video ───────────────────────────────────────────────── */
        .hero-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          opacity: 0.55;
          z-index: 0;
        }

        /* ── Gradient overlay ────────────────────────────────────── */
        .hero-overlay {
          position: absolute;
          inset: 0;
          z-index: 1;
          background:
            linear-gradient(
              135deg,
              rgba(0, 0, 0, 0.78)   0%,
              rgba(95, 96, 97, 0.7) 40%,
              rgba(159, 161, 161, 0.22) 70%,
              rgba(245, 147, 36, 0.18) 100%
            );
        }

        /* Bottom fade so content doesn't feel cut off */
        .hero-overlay::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 220px;
          background: linear-gradient(to top, rgba(0,0,0,0.55), transparent);
        }

        /* ── Particles ───────────────────────────────────────────── */
        .hero-particles {
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          overflow: hidden;
        }
        .particle {
          position: absolute;
          bottom: -20px;
          border-radius: 50%;
          background: rgba(245, 147, 36, 0.55);
          animation: particleDrift linear infinite;
        }

        /* ── Content ─────────────────────────────────────────────── */
        .hero-content {
          position: relative;
          z-index: 10;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 0 24px 60px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .hero-content.visible { opacity: 1; }

        /* ── Logo row ─────────────────────────────────────────────── */
        .hero-logo-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          justify-content: center;
          flex-direction: column;
          gap: 14px;
        //   margin-bottom: 28px;
          animation: fadeUp 0.7s ease both;
          animation-delay: 0.1s;
        }
        .hero-logo-img {
          width: 140px;
        //   height: 126px;
          object-fit: contain;
      
        }
        .hero-brand {
          font-size: 48px;
          font-weight: 700;
          color: #fff;
          letter-spacing: 0.5px;
          text-shadow: 0 2px 12px rgba(0,0,0,0.5);
        }
        .hero-brand span {
          color: #F59324;
        }

        /* ── Headline ─────────────────────────────────────────────── */
        .hero-headline {
          font-size: clamp(36px, 6vw, 72px);
          font-weight: 650;
          line-height: 1.08;
          color: #fff;
          margin: 0 0 18px;
          max-width: 820px;
        //   text-shadow: 0 4px 24px rgba(0,0,0,0.5);
          animation: fadeUp 0.7s ease both;
          animation-delay: 0.25s;
        }
        .hero-headline .accent {
          background: linear-gradient(135deg, #F59324, #ffffff);
background-size: 100% 300%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 10s linear infinite;
        }

        /* ── Subheadline ──────────────────────────────────────────── */
        .hero-sub {
          font-size: clamp(15px, 2.2vw, 20px);
          color: rgba(255,255,255,0.82);
          max-width: 580px;
          line-height: 1.65;
          margin: 0 0 44px;
          animation: fadeUp 0.7s ease both;
          animation-delay: 0.4s;
        }

        /* ── CTA buttons ──────────────────────────────────────────── */
        .hero-cta {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          justify-content: center;
          animation: fadeUp 0.7s ease both;
          animation-delay: 0.55s;
          margin-bottom: 52px;
        }
        .btn-primary {
          position: relative;
          padding: 15px 36px;
          border: none;
          border-radius: 50px;
          background: linear-gradient(135deg, #F59324, #e07b15);
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          letter-spacing: 0.3px;
          box-shadow: 0 4px 24px rgba(245,147,36,0.45);
          transition: transform 0.18s, box-shadow 0.18s;
          animation: pulse-ring 2.5s ease-in-out infinite;
          overflow: hidden;
        }
        .btn-primary::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
          border-radius: inherit;
        }
        .btn-primary:hover {
          transform: translateY(-3px) scale(1.04);
          box-shadow: 0 8px 32px rgba(245,147,36,0.65);
        }
        .btn-primary:active { transform: translateY(0) scale(0.98); }

        .btn-outline {
          padding: 15px 36px;
          border: 2px solid rgba(255,255,255,0.6);
          border-radius: 50px;
          background: rgba(255,255,255,0.07);
          color: #fff;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: 0.3px;
          backdrop-filter: blur(8px);
          transition: transform 0.18s, background 0.18s, border-color 0.18s, box-shadow 0.18s;
        }
        .btn-outline:hover {
          background: rgba(255,255,255,0.18);
          border-color: #fff;
          transform: translateY(-3px);
          box-shadow: 0 6px 24px rgba(255,255,255,0.12);
        }
        .btn-outline:active { transform: translateY(0); }

        /* ── Stats bar ────────────────────────────────────────────── */
        .hero-stats {
          display: flex;
          gap: 48px;
          flex-wrap: wrap;
          justify-content: center;
          animation: fadeUp 0.7s ease both;
          animation-delay: 0.7s;
        }
        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .stat-value {
          font-size: 32px;
          font-weight: 800;
          color: #F59324;
          line-height: 1;
          text-shadow: 0 0 20px rgba(245,147,36,0.4);
          animation: countUp 0.5s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .stat-value:nth-child(1) { animation-delay: 0.75s; }
        .stat-value:nth-child(2) { animation-delay: 0.85s; }
        .stat-value:nth-child(3) { animation-delay: 0.95s; }
        .stat-label {
          font-size: 12px;
          font-weight: 500;
          color: rgba(255,255,255,0.6);
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        /* Divider between stat items */
        .stat-divider {
          width: 1px;
          height: 40px;
          background: rgba(255,255,255,0.15);
          align-self: center;
        }

        /* ── Scroll hint ──────────────────────────────────────────── */
        .scroll-hint {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          animation: fadeIn 1s ease both;
          animation-delay: 1.2s;
          opacity: 0;
        }
        .scroll-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: rgba(255,255,255,0.5);
          animation: float 1.5s ease-in-out infinite;
        }
        .scroll-dot:nth-child(2) { animation-delay: 0.2s; opacity: 0.4; }
        .scroll-dot:nth-child(3) { animation-delay: 0.4s; opacity: 0.2; }

        /* ── Responsive ───────────────────────────────────────────── */
        @media (max-width: 600px) {
          .hero-cta { flex-direction: column; align-items: center; }
          .hero-stats { gap: 24px; }
          .stat-divider { display: none; }
        }
      `}</style>

            <div className="hero-root">
                {/* PublicHeader sits on top of video */}


                {/* Video background */}
                <video
                    className="hero-video"
                    autoPlay
                    loop
                    muted
                    playsInline
                >
                    <source src="/VLE Video.mp4" type="video/mp4" />
                </video>

                {/* Gradient overlay */}
                <div className="hero-overlay" />

                {/* Floating particles */}
                <div className="hero-particles">
                    {PARTICLES.map((p) => (
                        <div
                            key={p.id}
                            className="particle"
                            style={{
                                width: p.size,
                                height: p.size,
                                left: `${p.left}%`,
                                opacity: p.opacity,
                                animationDuration: `${p.dur}s`,
                                animationDelay: `${p.delay}s`,
                            }}
                        />
                    ))}
                </div>

                {/* Hero content */}
                <div className={`hero-content${visible ? ' visible' : ''}`}>

                    {/* Logo + brand name */}
                    <div className="hero-logo-row">
                        <img
                            src="/BEDO-logo.png"
                            alt="BEDO logo"
                            className="hero-logo-img"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/Virtual-logo.png'; }}
                        />
                        <div className="hero-brand">
                            BEDO <span>Simu</span>Learn
                        </div>
                    </div>

                    {/* Headline */}
                    <h1 className="hero-headline">
                        Immersive 3D Simulation Platform.{' '}
                        <span className="accent">Anywhere, Anytime.</span>
                    </h1>

                    {/* Subheadline */}
                    <p className="hero-sub">
                        Bring the university lab experience to every student — powered by
                        interactive WebGL simulations, zero equipment needed.
                    </p>

                    {/* CTA buttons */}
                    <div className="hero-cta">
                        <button className="btn-primary" onClick={() => router.push('/public-catalog')}>
                            &nbsp; Explore Simulations &nbsp;
                        </button>
                        <button className="btn-outline" onClick={() => router.push('/login')}>
                            Login &nbsp;
                        </button>
                    </div>

                    {/* Stats */}
                    {stats && (
                        <div className="hero-stats">
                            <div className="stat-item">
                                <div className="stat-value">{stats.simulationsCount}+</div>
                                <div className="stat-label">Simulations</div>
                            </div>
                            <div className="stat-divider" />
                            <div className="stat-item">
                                <div className="stat-value">{stats.institutionsCount}+</div>
                                <div className="stat-label">Institutions</div>
                            </div>
                            <div className="stat-divider" />
                            <div className="stat-item">
                                <div className="stat-value">{stats.disciplinesCount}</div>
                                <div className="stat-label">Disciplines</div>
                            </div>
                            <div className="stat-divider" />
                            <div className="stat-item">
                                <div className="stat-value">{stats.uptime}</div>
                                <div className="stat-label">Uptime</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Scroll hint */}
                <div className="scroll-hint">
                    <div className="scroll-dot" />
                    <div className="scroll-dot" />
                    <div className="scroll-dot" />
                </div>
            </div>
        </>
    );
}
