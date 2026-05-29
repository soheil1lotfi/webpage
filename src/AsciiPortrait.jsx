import { useEffect, useRef } from 'react';

const SPRING = 0.09;
const DAMPING = 0.78;
const REPEL_RADIUS = 80;
const REPEL_STRENGTH = 6000;

export default function AsciiPortrait({ art, fontSize = 8, style }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const fontSpec = `${fontSize}px Inconsolata, monospace`;
    let rafId;
    let active = true;
    let cleanupListeners;

    async function boot() {
      await document.fonts.ready;
      try { await document.fonts.load(fontSpec); } catch (_) {}

      const ctx = canvas.getContext('2d');
      ctx.font = fontSpec;
      const charW = ctx.measureText('M').width;
      const lineH = fontSize * 1.2;

      const lines = art.split('\n');
      const cols = Math.max(...lines.map(l => l.length));

      const dpr = window.devicePixelRatio || 1;
      const cssW = Math.ceil(charW * cols);
      const cssH = Math.ceil(lineH * lines.length);
      canvas.width  = cssW * dpr;
      canvas.height = cssH * dpr;
      canvas.style.width  = cssW + 'px';
      canvas.style.height = cssH + 'px';
      ctx.scale(dpr, dpr);

      const particles = [];
      for (let row = 0; row < lines.length; row++) {
        for (let col = 0; col < lines[row].length; col++) {
          const ch = lines[row][col];
          if (ch === ' ') continue;
          const ox = col * charW;
          const oy = row * lineH;
          particles.push({ ch, ox, oy, x: ox, y: oy, vx: 0, vy: 0 });
        }
      }

      let mx = -9999, my = -9999;
      const onMove = (e) => {
        const r = canvas.getBoundingClientRect();
        mx = e.clientX - r.left;
        my = e.clientY - r.top;
      };
      const onLeave = () => { mx = -9999; my = -9999; };
      canvas.addEventListener('mousemove', onMove);
      canvas.addEventListener('mouseleave', onLeave);
      cleanupListeners = () => {
        canvas.removeEventListener('mousemove', onMove);
        canvas.removeEventListener('mouseleave', onLeave);
      };

      const tick = () => {
        if (!active) return;
        ctx.clearRect(0, 0, cssW, cssH);
        ctx.font = fontSpec;
        ctx.fillStyle = '#111';
        ctx.textBaseline = 'top';

        for (const p of particles) {
          const dx = p.x - mx;
          const dy = p.y - my;
          const distSq = dx * dx + dy * dy;

          if (distSq < REPEL_RADIUS * REPEL_RADIUS && distSq > 0) {
            const dist = Math.sqrt(distSq);
            const force = REPEL_STRENGTH / distSq;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }

          p.vx += (p.ox - p.x) * SPRING;
          p.vy += (p.oy - p.y) * SPRING;
          p.vx *= DAMPING;
          p.vy *= DAMPING;
          p.x  += p.vx;
          p.y  += p.vy;

          ctx.fillText(p.ch, p.x, p.y);
        }

        rafId = requestAnimationFrame(tick);
      };

      rafId = requestAnimationFrame(tick);
    }

    boot().catch(console.error);

    return () => {
      active = false;
      cancelAnimationFrame(rafId);
      cleanupListeners?.();
    };
  }, [art, fontSize]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', cursor: 'none', ...style }}
    />
  );
}
