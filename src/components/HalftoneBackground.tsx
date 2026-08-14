import React, { useEffect, useRef } from 'react';

export const HalftoneBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    let time = 0;

    const render = () => {
      time += 0.008;

      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      // Pure dark background
      ctx.fillStyle = '#080809';
      ctx.fillRect(0, 0, width, height);

      const spacing = 14;
      const cols = Math.ceil(width / spacing) + 2;
      const rows = Math.ceil(height / spacing) + 2;

      const centerX = width * 0.5;
      const centerY = height * 0.45;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * spacing;
          const y = j * spacing;

          const nx = (x - centerX) / (width * 0.5);
          const ny = (y - centerY) / (height * 0.5);

          const arch = ny + 0.4 * Math.sin(nx * 1.8) - 0.2 * (nx * nx);
          const distToArch = Math.abs(arch + 0.15 * Math.cos(nx * 3 + time * 0.5));

          const dx = x - mouseX;
          const dy = y - mouseY;
          const mouseDist = Math.sqrt(dx * dx + dy * dy);
          const mouseEffect = Math.max(0, 1 - mouseDist / 300);

          let intensity = Math.exp(-distToArch * 2.8) * 0.9;
          const wave = Math.sin(nx * 4 + ny * 3 - time * 1.2) * 0.12;
          intensity = Math.min(1, Math.max(0, intensity + wave * 0.15 + mouseEffect * 0.25));

          if (intensity < 0.04) intensity = 0.03;

          const maxRadius = spacing * 0.4;
          const radius = Math.max(0.5, intensity * maxRadius);
          const alpha = Math.min(1, Math.max(0.08, intensity * 0.7));

          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);

          if (intensity > 0.4) {
            // Bright white dots for high intensity
            ctx.fillStyle = `rgba(245, 245, 245, ${alpha * 0.8})`;
          } else if (intensity > 0.2) {
            // Mid-tone gray dots
            const val = Math.floor(40 + intensity * 100);
            ctx.fillStyle = `rgba(${val}, ${val}, ${val + 2}, ${alpha * 0.6})`;
          } else {
            // Subtle dark dots
            const darkVal = Math.floor(20 + intensity * 80);
            ctx.fillStyle = `rgba(${darkVal}, ${darkVal}, ${darkVal + 1}, ${alpha * 0.4})`;
          }

          ctx.fill();
        }
      }

      // Subtle white glow in center
      const gradient = ctx.createRadialGradient(
        width * 0.5, height * 0.45, 0,
        width * 0.5, height * 0.45, width * 0.35
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.02)');
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.005)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  );
};
