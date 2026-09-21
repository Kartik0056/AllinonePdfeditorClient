/**
 * SpaceBackground - Futuristic Interactive Deep-Space & Constellation Canvas
 * Features 3D twinkling stars, cybernetic constellation grid, cosmic nebula glows,
 * shooting stars, and mouse-reactive gravitational warp.
 */

import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  color: string;
  alpha: number;
  alphaSpeed: number;
  vx: number;
  vy: number;
}

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number;
  alpha: number;
  active: boolean;
}

const STAR_COLORS = [
  '#ffffff',
  '#93c5fd', // cyan-blue
  '#c084fc', // neon purple
  '#67e8f9', // electric cyan
  '#fde047', // subtle warm gold
  '#818cf8', // indigo
];

export default function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse coordinates for interactive warp
    const mouse = {
      x: width / 2,
      y: height / 2,
      targetX: width / 2,
      targetY: height / 2,
      radius: 180,
      active: false,
    };

    // Generate Stars
    const starCount = Math.min(180, Math.floor((width * height) / 8000));
    const stars: Star[] = [];

    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 2 + 0.5,
        size: Math.random() * 2 + 0.6,
        color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
        alpha: Math.random() * 0.8 + 0.2,
        alphaSpeed: (Math.random() * 0.02 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
      });
    }

    // Shooting Stars
    const shootingStars: ShootingStar[] = [];
    const spawnShootingStar = () => {
      if (Math.random() < 0.35 && shootingStars.length < 3) {
        shootingStars.push({
          x: Math.random() * width * 0.8,
          y: Math.random() * height * 0.4,
          length: Math.random() * 80 + 40,
          speed: Math.random() * 12 + 10,
          angle: (Math.PI / 4) + (Math.random() - 0.5) * 0.3,
          alpha: 1,
          active: true,
        });
      }
    };

    const shootingStarTimer = setInterval(spawnShootingStar, 3500);

    // Handle Resize
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Handle Mouse / Touch movement
    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // Render Loop
    const render = () => {
      // Smooth mouse easing
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // 1. Deep Space Cosmic Nebulae Glows
      const grad1 = ctx.createRadialGradient(
        width * 0.2, height * 0.25, 50,
        width * 0.2, height * 0.25, width * 0.45
      );
      grad1.addColorStop(0, 'rgba(79, 70, 229, 0.16)'); // Electric Indigo
      grad1.addColorStop(0.5, 'rgba(147, 51, 234, 0.08)'); // Neon Purple
      grad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const grad2 = ctx.createRadialGradient(
        width * 0.8, height * 0.65, 40,
        width * 0.8, height * 0.65, width * 0.5
      );
      grad2.addColorStop(0, 'rgba(6, 182, 212, 0.12)'); // Cyan
      grad2.addColorStop(0.6, 'rgba(59, 130, 246, 0.05)'); // Deep Blue
      grad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // 2. Interactive Constellation Lines (Connecting nearby stars)
      const maxDist = 95;
      ctx.lineWidth = 0.6;

      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const dx = stars[i].x - stars[j].x;
          const dy = stars[i].y - stars[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            const lineAlpha = (1 - dist / maxDist) * 0.22 * Math.min(stars[i].alpha, stars[j].alpha);
            ctx.strokeStyle = `rgba(129, 140, 248, ${lineAlpha})`;
            ctx.beginPath();
            ctx.moveTo(stars[i].x, stars[i].y);
            ctx.lineTo(stars[j].x, stars[j].y);
            ctx.stroke();
          }
        }
      }

      // 3. Render Stars & Gravitational Reaction
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];

        // Move stars slowly
        s.x += s.vx * s.z;
        s.y += s.vy * s.z;

        // Wrap edges
        if (s.x < 0) s.x = width;
        if (s.x > width) s.x = 0;
        if (s.y < 0) s.y = height;
        if (s.y > height) s.y = 0;

        // Twinkle
        s.alpha += s.alphaSpeed;
        if (s.alpha > 1) {
          s.alpha = 1;
          s.alphaSpeed = -Math.abs(s.alphaSpeed);
        } else if (s.alpha < 0.2) {
          s.alpha = 0.2;
          s.alphaSpeed = Math.abs(s.alphaSpeed);
        }

        // Mouse Gravitational Interaction
        let renderX = s.x;
        let renderY = s.y;
        let starSize = s.size;

        if (mouse.active) {
          const mdx = mouse.x - s.x;
          const mdy = mouse.y - s.y;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);

          if (mdist < mouse.radius) {
            const force = (1 - mdist / mouse.radius) * 15;
            renderX += (mdx / mdist) * force;
            renderY += (mdy / mdist) * force;
            starSize *= 1.3;

            // Connect nearby star to mouse cursor with subtle laser thread
            ctx.strokeStyle = `rgba(165, 180, 252, ${(1 - mdist / mouse.radius) * 0.25})`;
            ctx.beginPath();
            ctx.moveTo(renderX, renderY);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }

        // Draw star core
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.alpha;
        ctx.beginPath();
        ctx.arc(renderX, renderY, starSize, 0, Math.PI * 2);
        ctx.fill();

        // Star outer bloom/glow for brighter stars
        if (s.size > 1.4) {
          ctx.globalAlpha = s.alpha * 0.35;
          ctx.beginPath();
          ctx.arc(renderX, renderY, starSize * 2.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;

      // 4. Render Shooting Stars
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i];
        if (!ss.active) continue;

        ss.x += Math.cos(ss.angle) * ss.speed;
        ss.y += Math.sin(ss.angle) * ss.speed;
        ss.alpha -= 0.015;

        if (ss.alpha <= 0 || ss.x > width || ss.y > height) {
          shootingStars.splice(i, 1);
          continue;
        }

        const tailX = ss.x - Math.cos(ss.angle) * ss.length;
        const tailY = ss.y - Math.sin(ss.angle) * ss.length;

        const ssGrad = ctx.createLinearGradient(ss.x, ss.y, tailX, tailY);
        ssGrad.addColorStop(0, `rgba(255, 255, 255, ${ss.alpha})`);
        ssGrad.addColorStop(0.3, `rgba(147, 197, 253, ${ss.alpha * 0.8})`);
        ssGrad.addColorStop(1, 'rgba(99, 102, 241, 0)');

        ctx.strokeStyle = ssGrad;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(ss.x, ss.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        // Head spark
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ss.x, ss.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(shootingStarTimer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 block w-full h-full"
      style={{ opacity: 0.92 }}
    />
  );
}
