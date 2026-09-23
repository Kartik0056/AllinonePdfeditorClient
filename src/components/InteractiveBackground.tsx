import React, { useEffect, useRef } from 'react';
import { FileText, ShieldCheck, Award, Camera } from 'lucide-react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  pulseSpeed: number;
}

const PARTICLE_COLORS = [
  '#818cf8', // Indigo
  '#38bdf8', // Cyan
  '#c084fc', // Purple
  '#34d399', // Emerald
  '#fbbf24', // Amber
  '#f472b6', // Pink
];

export default function InteractiveBackground({
  mousePos,
}: {
  mousePos: { x: number; y: number };
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef(mousePos);
  mouseRef.current = mousePos;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Create 45 dynamic particles
    const particleCount = Math.min(50, Math.floor(window.innerWidth / 30));
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 2 + 1.2,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        alpha: Math.random() * 0.5 + 0.3,
        pulseSpeed: Math.random() * 0.02 + 0.01,
      });
    }

    let tick = 0;

    const render = () => {
      tick++;
      ctx.clearRect(0, 0, width, height);

      const mouseX = mouseRef.current.x;
      const mouseY = mouseRef.current.y;

      // Update & Draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Bounce
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Mouse avoidance/interactive force
        if (mouseX > 0 && mouseY > 0) {
          const dx = p.x - mouseX;
          const dy = p.y - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80) {
            const force = (80 - dist) / 80;
            p.x += (dx / dist) * force * 1.5;
            p.y += (dy / dist) * force * 1.5;
          }
        }

        // Draw particle
        const currentAlpha = p.alpha + Math.sin(tick * p.pulseSpeed) * 0.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0.15, Math.min(currentAlpha, 0.85));
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Connect to nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 125) {
            const lineAlpha = (1 - dist / 125) * 0.22;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = lineAlpha;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }

        // Connect to mouse cursor
        if (mouseX > 0 && mouseY > 0) {
          const mdx = p.x - mouseX;
          const mdy = p.y - mouseY;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mdist < 160) {
            const mouseLineAlpha = (1 - mdist / 160) * 0.45;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouseX, mouseY);
            ctx.strokeStyle = '#818cf8';
            ctx.globalAlpha = mouseLineAlpha;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1.0;
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* ─── BASE CANVAS (Deep stylish dark tone) ────────────────── */}
      <div className="absolute inset-0 bg-[#08090d]" />

      {/* ─── TOP RADIANT CELESTIAL BEAM ──────────────────────────── */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[450px] bg-gradient-to-b from-indigo-500/40 via-purple-600/25 to-transparent blur-[90px] rounded-full pointer-events-none opacity-95" />

      {/* ─── INTERACTIVE MOUSE SPOTLIGHT FLASHLIGHT ──────────────── */}
      {mousePos.x > -100 && (
        <div
          className="absolute inset-0 transition-opacity duration-200 pointer-events-none"
          style={{
            background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(99, 102, 241, 0.22), rgba(6, 182, 212, 0.10) 38%, transparent 75%)`,
          }}
        />
      )}

      {/* ─── 4 VIBRANT LIVING AURORA GLOW ORBS ───────────────────── */}
      {/* Orb 1: Royal Indigo / Cobalt Glow (Top Left) */}
      <div
        className="absolute -top-10 -left-16 w-[680px] h-[680px] rounded-full blur-[90px] animate-aurora-1 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.50) 0%, rgba(79, 70, 229, 0.30) 45%, transparent 70%)',
        }}
      />

      {/* Orb 2: Cyber Cyan / Mint Teal Glow (Top Right) */}
      <div
        className="absolute top-1/6 -right-20 w-[700px] h-[700px] rounded-full blur-[95px] animate-aurora-2 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.42) 0%, rgba(16, 185, 129, 0.25) 45%, transparent 70%)',
        }}
      />

      {/* Orb 3: Deep Magenta / Electric Violet (Mid-Left Hero) */}
      <div
        className="absolute top-1/2 left-1/5 w-[650px] h-[650px] rounded-full blur-[100px] animate-aurora-3 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.40) 0%, rgba(236, 72, 153, 0.25) 45%, transparent 70%)',
        }}
      />

      {/* Orb 4: Warm Gold / Amber Accent (Bottom Right) */}
      <div
        className="absolute bottom-16 right-1/4 w-[580px] h-[580px] rounded-full blur-[90px] animate-aurora-4 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.32) 0%, rgba(234, 88, 12, 0.18) 45%, transparent 70%)',
        }}
      />

      {/* ─── CYBER STUDIO GRID WITH MOVING LASER SWEEP ───────────── */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_25%,#000_70%,transparent_100%)] pointer-events-none">
        {/* Animated Sweeping Light Ray */}
        <div className="absolute inset-x-0 h-44 bg-gradient-to-b from-transparent via-primary-500/20 via-cyan-400/15 to-transparent animate-beam-sweep pointer-events-none" />
      </div>

      {/* ─── ARCHITECTURAL CONCENTRIC TECH RINGS ──────────────────── */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[760px] h-[760px] pointer-events-none flex items-center justify-center opacity-70">
        <div className="w-full h-full rounded-full border border-primary-500/25 animate-pulse-ring" />
        <div className="absolute w-[540px] h-[540px] rounded-full border border-dashed border-purple-500/30 animate-spin-ultra-slow" />
        <div
          className="absolute w-[350px] h-[350px] rounded-full border border-cyan-400/25 animate-pulse-ring"
          style={{ animationDelay: '-4s' }}
        />
      </div>

      {/* ─── INTERACTIVE PARTICLE CONSTELLATION CANVAS ───────────── */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* ─── FLOATING HOLOGRAPHIC STUDIO BADGES (DESKTOP) ─────────── */}
      <div className="hidden xl:block absolute inset-0 pointer-events-none">
        {/* Badge 1: Top-Left Floating Badge */}
        <div className="absolute top-28 left-8 2xl:left-16 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-surface-900/70 border border-primary-500/30 backdrop-blur-xl shadow-xl shadow-primary-500/10 animate-float-badge-1">
          <div className="w-7 h-7 rounded-xl bg-primary-500/20 border border-primary-500/40 flex items-center justify-center text-primary-300">
            <FileText className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="text-[11px] font-bold text-white tracking-tight">Direct In-Place Edit</div>
            <div className="text-[9px] text-primary-300 font-mono">Word-Style Zero Popups</div>
          </div>
        </div>

        {/* Badge 2: Top-Right Floating Badge */}
        <div className="absolute top-32 right-8 2xl:right-16 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-surface-900/70 border border-emerald-500/30 backdrop-blur-xl shadow-xl shadow-emerald-500/10 animate-float-badge-2">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="text-[11px] font-bold text-white tracking-tight">100% Private Sandbox</div>
            <div className="text-[9px] text-emerald-300 font-mono">Local WebAssembly Core</div>
          </div>
        </div>

        {/* Badge 3: Mid-Left Floating Badge */}
        <div
          className="absolute top-[480px] left-6 2xl:left-14 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-surface-900/70 border border-amber-500/30 backdrop-blur-xl shadow-xl shadow-amber-500/10 animate-float-badge-2"
          style={{ animationDelay: '-3s' }}
        >
          <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
            <Award className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="text-[11px] font-bold text-white tracking-tight">Certificate Studio</div>
            <div className="text-[9px] text-amber-300 font-mono">Guilloche & Wax Seals</div>
          </div>
        </div>

        {/* Badge 4: Mid-Right Floating Badge */}
        <div
          className="absolute top-[490px] right-6 2xl:right-14 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-surface-900/70 border border-cyan-500/30 backdrop-blur-xl shadow-xl shadow-cyan-500/10 animate-float-badge-1"
          style={{ animationDelay: '-2.5s' }}
        >
          <div className="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
            <Camera className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="text-[11px] font-bold text-white tracking-tight">Passport Photo Maker</div>
            <div className="text-[9px] text-cyan-300 font-mono">300 DPI A4 Print Sheets</div>
          </div>
        </div>
      </div>
    </div>
  );
}
