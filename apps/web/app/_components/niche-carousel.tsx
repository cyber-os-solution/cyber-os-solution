'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';

type Nicho = { slug: string; nome: string };

// Carrossel de nichos: avanca um modelo a cada 4 s (padrao de carrossel na web), com setas nas laterais,
// arrasto no celular e pausa quando o mouse ou o foco estao nele. Volta ao inicio sem pulo (lista duplicada).
export function NicheCarousel({ nichos }: { nichos: readonly Nicho[] }) {
  const vp = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const api = useRef<{ go: (d: number) => void; hold: (v: boolean) => void } | null>(null);

  useEffect(() => {
    const el = track.current;
    const box = vp.current;
    if (!el || !box) return;
    const n = nichos.length;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let i = 0, held = false, visible = false, busy = false;

    const set = (v: number, animate: boolean) => {
      el.classList.toggle('no-anim', !animate);
      el.style.setProperty('--i', String(v));
      i = v;
    };
    const go = (d: number) => {
      if (busy && !reduce) return;
      if (d < 0 && i === 0) { set(n, false); void el.offsetWidth; }
      busy = true;
      set(i + d, true);
      if (reduce) { if (i >= n) set(i - n, false); busy = false; }
    };
    const onEnd = (e: TransitionEvent) => {
      if (e.target !== el) return;
      busy = false;
      if (i >= n) set(i - n, false);
    };
    el.addEventListener('transitionend', onEnd);

    const io = new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; });
    io.observe(box);
    const timer = window.setInterval(() => { if (!reduce && visible && !held && !document.hidden) go(1); }, 4000);

    // arrasto com o dedo ou o mouse
    let x0: number | null = null;
    const down = (e: PointerEvent) => { x0 = e.clientX; };
    const up = (e: PointerEvent) => {
      if (x0 === null) return;
      const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    };
    box.addEventListener('pointerdown', down);
    box.addEventListener('pointerup', up);
    box.addEventListener('pointercancel', () => { x0 = null; });

    api.current = { go, hold: (v) => { held = v; } };
    return () => {
      window.clearInterval(timer);
      io.disconnect();
      el.removeEventListener('transitionend', onEnd);
      box.removeEventListener('pointerdown', down);
      box.removeEventListener('pointerup', up);
    };
  }, [nichos.length]);

  const lista = (copia: boolean) => (
    <ul className="h-strip-set" aria-hidden={copia ? true : undefined}>
      {nichos.map((n) => (
        <li key={n.slug} className="h-niche">
          <Image src={`/home/niches/${n.slug}.webp`} alt="" width={720} height={540} unoptimized loading="eager" draggable={false} />
          <span>{n.nome}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div
      className="h-strip-wrap"
      onMouseEnter={() => api.current?.hold(true)}
      onMouseLeave={() => api.current?.hold(false)}
      onFocus={() => api.current?.hold(true)}
      onBlur={() => api.current?.hold(false)}
    >
      <div className="h-strip-vp" ref={vp}>
        <div className="h-strip-track" ref={track}>
          {lista(false)}
          {lista(true)}
        </div>
      </div>
      <button type="button" className="h-strip-btn is-prev" onClick={() => api.current?.go(-1)} aria-label="Modelo anterior">‹</button>
      <button type="button" className="h-strip-btn is-next" onClick={() => api.current?.go(1)} aria-label="Próximo modelo">›</button>
    </div>
  );
}
