/**
 * BubbleCursor - Ultra-Premium Liquid Water Bubble Cursor & Click Bubble-Bomb FX
 *
 * Features:
 * - Fluid translucent water droplet cursor with specular shine and caustics
 * - Dynamic trailing water bubbles emitted on mouse motion with natural buoyancy & wobble
 * - "Bubble Bomb" explosion on click with shockwave ripple and 30+ radiating splashing droplets
 * - 100% pointer-events-none (zero interference with DOM clicks/selection)
 * - 60fps lightweight HTML5 Canvas
 */

import React, { useEffect, useRef } from 'react';

interface Bubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  decay: number;
  wobbleSpeed: number;
  wobbleOffset: number;
  colorType: 'cyan' | 'purple' | 'blue' | 'white';
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

export default function BubbleCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number; prevX: number; prevY: number; isHovering: boolean; isDown: boolean }>({
    x: -100,
    y: -100,
    prevX: -100,
    prevY: -100,
    isHovering: false,
    isDown: false,
  });

  const bubblesRef = useRef<Bubble[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Color palettes for glistening iridescent water bubbles
    const bubbleColors = {
      cyan: { fill: 'rgba(56, 189, 248, 0.25)', stroke: 'rgba(186, 230, 253, 0.85)', rim: '#38bdf8' },
      blue: { fill: 'rgba(99, 102, 241, 0.22)', stroke: 'rgba(199, 210, 254, 0.8)', rim: '#6366f1' },
      purple: { fill: 'rgba(192, 132, 252, 0.22)', stroke: 'rgba(233, 213, 255, 0.85)', rim: '#c084fc' },
      white: { fill: 'rgba(255, 255, 255, 0.3)', stroke: 'rgba(255, 255, 255, 0.95)', rim: '#ffffff' },
    };

    // Track mouse movement & generate floating bubbles
    let lastEmitTime = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX: x, clientY: y } = e;
      const mouse = mouseRef.current;
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;
      mouse.x = x;
      mouse.y = y;

      // Check if hovering over clickable elements
      const target = e.target as HTMLElement | null;
      if (target) {
        mouse.isHovering = !!target.closest('button, a, input, select, textarea, [role="button"], .cursor-pointer, .dropzone');
      }

      // Calculate movement speed
      const dx = x - mouse.prevX;
      const dy = y - mouse.prevY;
      const speed = Math.hypot(dx, dy);

      const now = performance.now();
      // Emit floating trail bubbles proportional to movement speed
      if (now - lastEmitTime > 25 && speed > 2) {
        lastEmitTime = now;
        const count = Math.min(3, Math.floor(speed / 8) + 1);

        for (let i = 0; i < count; i++) {
          const types: ('cyan' | 'purple' | 'blue' | 'white')[] = ['cyan', 'purple', 'blue', 'white'];
          const colorType = types[Math.floor(Math.random() * types.length)];
          const r = 5 + Math.random() * 12;

          bubblesRef.current.push({
            x: x + (Math.random() - 0.5) * 16,
            y: y + (Math.random() - 0.5) * 16,
            vx: -dx * 0.12 + (Math.random() - 0.5) * 1.5,
            vy: -Math.abs(dy * 0.1) - 0.8 - Math.random() * 1.6, // natural buoyancy upward
            radius: 2,
            maxRadius: r,
            alpha: 0.85,
            decay: 0.012 + Math.random() * 0.015,
            wobbleSpeed: 0.04 + Math.random() * 0.06,
            wobbleOffset: Math.random() * Math.PI * 2,
            colorType,
          });
        }
      }
    };

    // Trigger Click "Bubble Bomb" Explosion!
    const handleMouseDown = (e: MouseEvent) => {
      const { clientX: x, clientY: y } = e;
      mouseRef.current.isDown = true;

      // 1. Water Ripple Ring
      ripplesRef.current.push({
        x,
        y,
        radius: 4,
        maxRadius: 75 + Math.random() * 25,
        alpha: 0.9,
        color: '#38bdf8',
      });
      ripplesRef.current.push({
        x,
        y,
        radius: 2,
        maxRadius: 50 + Math.random() * 20,
        alpha: 0.7,
        color: '#c084fc',
      });

      // 2. Bubble Bomb Particle Blast (24 to 32 splashing droplets/bubbles)
      const burstCount = 26;
      for (let i = 0; i < burstCount; i++) {
        const angle = (i / burstCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
        const blastSpeed = 3 + Math.random() * 8.5;
        const r = 4 + Math.random() * 14;
        const types: ('cyan' | 'purple' | 'blue' | 'white')[] = ['cyan', 'purple', 'blue', 'white'];
        const colorType = types[i % types.length];

        bubblesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * blastSpeed,
          vy: Math.sin(angle) * blastSpeed,
          radius: r * 0.5,
          maxRadius: r,
          alpha: 1,
          decay: 0.018 + Math.random() * 0.025,
          wobbleSpeed: 0.05 + Math.random() * 0.08,
          wobbleOffset: Math.random() * Math.PI * 2,
          colorType,
        });
      }
    };

    const handleMouseUp = () => {
      mouseRef.current.isDown = false;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown, { passive: true });
    window.addEventListener('mouseup', handleMouseUp, { passive: true });

    // Smooth Cursor Physics
    let curX = -100;
    let curY = -100;
    let time = 0;

    // Animation Loop
    const render = () => {
      time++;
      ctx.clearRect(0, 0, width, height);

      const mouse = mouseRef.current;
      // Smooth lerp cursor
      curX += (mouse.x - curX) * 0.28;
      curY += (mouse.y - curY) * 0.28;

      // ─── 1. Render Shockwave Ripples ───
      for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
        const rp = ripplesRef.current[i];
        rp.radius += (rp.maxRadius - rp.radius) * 0.12;
        rp.alpha -= 0.025;

        if (rp.alpha <= 0) {
          ripplesRef.current.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.radius, 0, Math.PI * 2);
        ctx.strokeStyle = rp.color;
        ctx.lineWidth = Math.max(1, 3 * rp.alpha);
        ctx.globalAlpha = rp.alpha;
        ctx.stroke();
      }

      // ─── 2. Render Water Bubbles ───
      for (let i = bubblesRef.current.length - 1; i >= 0; i--) {
        const b = bubblesRef.current[i];

        // Physics
        b.x += b.vx + Math.sin(time * b.wobbleSpeed + b.wobbleOffset) * 0.7;
        b.y += b.vy;
        b.vx *= 0.95; // drag
        b.vy += 0.03; // subtle gravity after burst
        if (b.vy < -2.2) b.vy = -2.2; // terminal upward buoyancy

        // Growth & decay
        if (b.radius < b.maxRadius) b.radius += (b.maxRadius - b.radius) * 0.2;
        b.alpha -= b.decay;

        if (b.alpha <= 0 || b.radius <= 0) {
          bubblesRef.current.splice(i, 1);
          continue;
        }

        const scheme = bubbleColors[b.colorType];

        ctx.save();
        ctx.globalAlpha = Math.max(0, b.alpha);

        // Bubble Body (Soft translucent gradient)
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(
          b.x - b.radius * 0.35,
          b.y - b.radius * 0.35,
          b.radius * 0.1,
          b.x,
          b.y,
          b.radius
        );
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        grad.addColorStop(0.6, scheme.fill);
        grad.addColorStop(1, scheme.stroke);
        ctx.fillStyle = grad;
        ctx.fill();

        // Bubble Rim
        ctx.strokeStyle = scheme.rim;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Gloss Specular Highlight (The water shine reflection dot)
        if (b.radius > 3) {
          ctx.beginPath();
          ctx.arc(
            b.x - b.radius * 0.38,
            b.y - b.radius * 0.38,
            Math.max(1, b.radius * 0.22),
            0,
            Math.PI * 2
          );
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fill();
        }

        ctx.restore();
      }

      // ─── 3. Render Main Glass Orb Cursor ───
      if (mouse.x > 0 && mouse.y > 0) {
        ctx.save();

        const baseRadius = mouse.isDown ? 8 : mouse.isHovering ? 20 : 13;
        const outerGlow = mouse.isHovering ? 32 : 20;

        // Ambient cyan water aura glow
        const glowGrad = ctx.createRadialGradient(curX, curY, 2, curX, curY, outerGlow);
        glowGrad.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
        glowGrad.addColorStop(0.7, 'rgba(192, 132, 252, 0.15)');
        glowGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.beginPath();
        ctx.arc(curX, curY, outerGlow, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();

        // Main Water Droplet Ring
        ctx.beginPath();
        ctx.arc(curX, curY, baseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = mouse.isHovering ? 'rgba(56, 189, 248, 0.95)' : 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = mouse.isHovering ? 2 : 1.5;
        ctx.stroke();

        // Inner Water Core Dot
        ctx.beginPath();
        ctx.arc(curX, curY, mouse.isHovering ? 3 : 2, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.fill();

        // Tiny liquid specular highlight
        ctx.beginPath();
        ctx.arc(curX - baseRadius * 0.35, curY - baseRadius * 0.35, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.fill();

        ctx.restore();
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[99999]"
      style={{ overflow: 'hidden' }}
    />
  );
}
