import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
}

interface ParticleFlowProps {
  className?: string;
  particleCount?: number;
  particleColor?: string;
  lineColor?: string;
  colors?: string[];
  maxDistance?: number;
  particleSize?: number;
  speed?: number;
}

export const ParticleFlow: React.FC<ParticleFlowProps> = ({
  className = '',
  particleCount = 60,
  particleColor = 'rgba(59, 130, 246, 0.8)',
  lineColor = 'rgba(59, 130, 246, 0.15)',
  colors,
  maxDistance = 150,
  particleSize = 2,
  speed = 0.5,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };

    const initParticles = () => {
      particlesRef.current = [];
      const colorPalette = colors || [particleColor];
      for (let i = 0; i < particleCount; i++) {
        const selectedColor = colorPalette[i % colorPalette.length];
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * speed,
          vy: (Math.random() - 0.5) * speed,
          size: Math.random() * particleSize + 1,
          opacity: Math.random() * 0.5 + 0.5,
          color: selectedColor,
        });
      }
    };

    const drawParticle = (p: Particle) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      // Handle both rgba and hex colors
      let fillColor = p.color;
      if (p.color.startsWith('#')) {
        // Convert hex to rgba with opacity
        const hex = p.color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        fillColor = `rgba(${r}, ${g}, ${b}, ${p.opacity * 0.8})`;
      } else if (p.color.includes('0.8')) {
        fillColor = p.color.replace('0.8', String(p.opacity * 0.8));
      }
      ctx.fillStyle = fillColor;
      ctx.fill();
    };

    const drawLine = (p1: Particle, p2: Particle, distance: number) => {
      const opacity = 1 - distance / maxDistance;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = lineColor.replace('0.15', String(opacity * 0.15));
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const updateParticle = (p: Particle) => {
      p.x += p.vx;
      p.y += p.vy;

      // Bounce off walls
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      // Keep within bounds
      p.x = Math.max(0, Math.min(canvas.width, p.x));
      p.y = Math.max(0, Math.min(canvas.height, p.y));
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;

      // Draw lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < maxDistance) {
            drawLine(particles[i], particles[j], distance);
          }
        }
      }

      // Draw and update particles
      particles.forEach((p) => {
        drawParticle(p);
        updateParticle(p);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    initParticles();
    animate();

    window.addEventListener('resize', () => {
      resizeCanvas();
      initParticles();
    });

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [particleCount, particleColor, lineColor, colors, maxDistance, particleSize, speed]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ zIndex: 0 }}
    />
  );
};

export default ParticleFlow;
