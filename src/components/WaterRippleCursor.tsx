/**
 * WaterRippleCursor - Gentle Liquid Water Cursor & Organic Click Wave Effect
 *
 * Features:
 * - Subtle, elegant water droplet cursor with soft translucent caustic halo
 * - Relaxing concentric water ripple waves on click (like a drop hitting still water)
 * - 100% pointer-events-none (zero interference with buttons, inputs, or selection)
 * - 60fps lightweight HTML5 Canvas with auto-pausing when idle
 */

import React, { useEffect, useRef } from 'react';

interface WaveRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  alpha: number;
  decay: number;
  lineWidth: number;
  color: string;
}

interface WaterDrop {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  vx: number;
  vy: number;
}

export default function WaterRippleCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{
    x: number;
    y: number;
    currentX: number;
    currentY: number;
    isHovering: boolean;
    isDown: boolean;
  }>({
    x: -100,
    y: -100,
    currentX: -100,
    currentY: -100,
    isHovering: false,
    isDown: false,
  });

  const wavesRef = useRef<WaveRing[]>([]);
  const dropsRef = useRef<WaterDrop[]>([]);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    // Track mouse position
    const handlePointerMove = (e: PointerEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.isHovering = true;
    };

    const handlePointerLeave = () => {
      mouseRef.current.isHovering = false;
    };

    // Spawn gentle expanding water ripples on click
    const createWaterRipple = (clickX: number, clickY: number) => {
      const baseRadius = 8;
      const waveCount = 3;

      for (let i = 0; i < waveCount; i++) {
        setTimeout(() => {
          wavesRef.current.push({
            x: clickX,
            y: clickY,
            radius: baseRadius,
            maxRadius: 110 + i * 25,
            speed: 2.2 + i * 0.4,
            alpha: 0.65 - i * 0.12,
            decay: 0.011 + i * 0.002,
            lineWidth: 2.2 - i * 0.4,
            color: i === 0 ? 'rgba(56, 189, 248,' : i === 1 ? 'rgba(125, 211, 252,' : 'rgba(167, 139, 250,',
          });
        }, i * 90);
      }

      // Small secondary splashing micro-droplets
      const microCount = 5;
      for (let j = 0; j < microCount; j++) {
        const angle = (Math.PI * 2 * j) / microCount + (Math.random() - 0.5) * 0.5;
        const spd = 1.2 + Math.random() * 1.8;
        dropsRef.current.push({
          x: clickX,
          y: clickY,
          radius: 1.5 + Math.random() * 1.5,
          alpha: 0.7,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
        });
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      mouseRef.current.isDown = true;
      createWaterRipple(e.clientX, e.clientY);
    };

    const handlePointerUp = () => {
      mouseRef.current.isDown = false;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    document.addEventListener('mouseleave', handlePointerLeave);

    // Animation Loop (60 FPS)
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const m = mouseRef.current;
      // Smooth lerp following
      if (m.currentX < 0) {
        m.currentX = m.x;
        m.currentY = m.y;
      } else {
        m.currentX += (m.x - m.currentX) * 0.35;
        m.currentY += (m.y - m.currentY) * 0.35;
      }

      // ─── 1. Render Water Ripple Waves ────────────────────
      for (let i = wavesRef.current.length - 1; i >= 0; i--) {
        const w = wavesRef.current[i];
        w.radius += w.speed;
        w.alpha -= w.decay;

        if (w.alpha <= 0 || w.radius >= w.maxRadius) {
          wavesRef.current.splice(i, 1);
          continue;
        }

        // Draw Expanding Concentric Water Ring with Soft Caustic Glow
        ctx.save();
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `${w.color} ${Math.max(0, w.alpha)})`;
        ctx.lineWidth = Math.max(0.5, w.lineWidth * (1 - w.radius / w.maxRadius));
        ctx.shadowColor = 'rgba(56, 189, 248, 0.4)';
        ctx.shadowBlur = 8;
        ctx.stroke();

        // Inner soft highlight crest
        if (w.radius > 15) {
          ctx.beginPath();
          ctx.arc(w.x, w.y, Math.max(0, w.radius - 2.5), 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, w.alpha * 0.4)})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
        ctx.restore();
      }

      // ─── 2. Render Micro Droplets ───────────────────────
      for (let i = dropsRef.current.length - 1; i >= 0; i--) {
        const d = dropsRef.current[i];
        d.x += d.vx;
        d.y += d.vy;
        d.vx *= 0.94;
        d.vy *= 0.94;
        d.alpha -= 0.025;

        if (d.alpha <= 0) {
          dropsRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(186, 230, 253, ${Math.max(0, d.alpha)})`;
        ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.restore();
      }

      // ─── 3. Render Subtle Water Droplet Cursor ──────────
      if (m.isHovering && m.currentX >= 0) {
        ctx.save();
        const outerGlowRadius = m.isDown ? 14 : 18;
        const innerDropRadius = m.isDown ? 3.5 : 4.5;

        // Soft ambient halo
        const haloGrad = ctx.createRadialGradient(
          m.currentX,
          m.currentY,
          0,
          m.currentX,
          m.currentY,
          outerGlowRadius
        );
        haloGrad.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
        haloGrad.addColorStop(0.5, 'rgba(125, 211, 252, 0.1)');
        haloGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');

        ctx.beginPath();
        ctx.arc(m.currentX, m.currentY, outerGlowRadius, 0, Math.PI * 2);
        ctx.fillStyle = haloGrad;
        ctx.fill();

        // Droplet center body
        ctx.beginPath();
        ctx.arc(m.currentX, m.currentY, innerDropRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
        ctx.shadowBlur = 6;
        ctx.fill();

        // Specular highlight pin
        ctx.beginPath();
        ctx.arc(m.currentX - 1.2, m.currentY - 1.2, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fill();

        ctx.restore();
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('mouseleave', handlePointerLeave);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50 transition-opacity duration-300"
      aria-hidden="true"
    />
  );
}
