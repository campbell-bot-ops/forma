'use client';

import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

const COLORS = [
  '#00f0ff', // Cyan
  '#ffaa00', // Amber
  '#ff3355', // Crimson
  '#00ff66', // Green
  '#3b82f6', // Blue
  '#a855f7', // Purple
  '#ffffff'  // White
];

export default function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];

    // Fit canvas to viewport
    const handleResize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Seed particles for initial burst
    const particleCount = 120;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height * 0.7, // burst from center bottom area
        size: Math.random() * 8 + 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        speedX: (Math.random() - 0.5) * 16,
        speedY: -(Math.random() * 12 + 8),
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }

    // Animation Loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, idx) => {
        // Apply physics
        p.x += p.speedX;
        p.y += p.speedY;
        p.speedY += 0.25; // gravity
        p.speedX *= 0.98; // friction
        p.rotation += p.rotationSpeed;
        
        // Fade out as they fall down
        if (p.speedY > 0) {
          p.opacity -= 0.015;
        }

        // Remove if invisible
        if (p.opacity <= 0 || p.y > canvas.height) {
          particles.splice(idx, 1);
          return;
        }

        // Draw particle
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      if (particles.length > 0) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50 w-full h-full"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
