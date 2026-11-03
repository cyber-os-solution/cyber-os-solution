'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { LazyVideo } from './lazy-video';

// Celular 3D feito so com CSS 3D (perspective + preserve-3d) e um laco de animacao proprio.
// Arraste para girar (com inercia), passe o mouse para inclinar; a tela rola sozinha e troca de modelo.
const SLIDES = [
  {
    aba: 'Doceria', nome: 'Brownies da Gi', tag: 'Página real', img: '/home/phone.webp', video: '/home/phone.mp4',
    itens: [['Brownie tradicional', 'R$ 6'], ['Brownie com recheio', 'R$ 12']],
  },
  {
    aba: 'Casa de bolos', nome: 'Casa de bolos', tag: 'Modelo', img: '/home/niches/casa-de-bolos.webp', video: null,
    itens: [['Bolo de cenoura', 'R$ 38'], ['Bolo no pote', 'R$ 9'], ['Torta de limão', 'R$ 45']],
  },
  {
    aba: 'Adega', nome: 'Adega', tag: 'Modelo', img: '/home/niches/adega.webp', video: null,
    itens: [['Vinho tinto', 'R$ 62'], ['Kit queijos', 'R$ 48'], ['Espumante', 'R$ 70']],
  },
] as const;

const EDGES = [-4, -3, -2, -1, 0, 1, 2, 3, 4];

export function PhoneSpin() {
  const [active, setActive] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const rig = useRef<HTMLDivElement>(null);
  const pauseUntil = useRef(0);
  const visible = useRef(false);

  useEffect(() => {
    const el = rig.current;
    const st = stage.current;
    if (!el || !st) return;
    const D = Math.PI / 180;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ry = -16, vy = 0, rx = 4, clock = 0, last = 0, raf = 0, hover: number | null = null;
    let drag: { x: number; t: number } | null = null;

    const paint = () => {
      el.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      st.style.setProperty('--gp', `${(50 + Math.sin(ry * D) * 60).toFixed(1)}%`);
    };
    paint();
    if (reduce) return;

    const frame = (t: number) => {
      raf = 0;
      if (!visible.current) { last = 0; return; }
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 1 / 60;
      last = t; clock += dt;
      if (!drag) {
        const target = hover !== null ? -12 + hover * 24 : -14 + Math.sin(clock * 0.6) * 16;
        vy += (55 * (target - ry) - 11 * vy) * dt;
        ry += vy * dt;
      }
      rx = 4 + Math.sin(clock * 0.4) * 2;
      paint();
      raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf && visible.current) raf = requestAnimationFrame(frame); };

    const down = (e: PointerEvent) => {
      if (e.button > 0 || (e.target as Element).closest('button')) return;
      drag = { x: e.clientX, t: performance.now() };
      try { st.setPointerCapture(e.pointerId); } catch { /* sem captura */ }
      pauseUntil.current = Date.now() + 15000; kick();
    };
    const move = (e: PointerEvent) => {
      if (drag) {
        const now = performance.now(), dx = e.clientX - drag.x;
        ry += dx * 0.55;
        vy = (dx * 0.55) / Math.max(0.008, (now - drag.t) / 1000) * 0.5 + vy * 0.5;
        drag = { x: e.clientX, t: now };
        kick();
      } else if (e.pointerType === 'mouse') {
        const r = st.getBoundingClientRect();
        hover = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
        kick();
      }
    };
    const up = () => { if (!drag) return; drag = null; vy = Math.max(-900, Math.min(900, vy)); kick(); };
    const leave = () => { hover = null; };

    st.addEventListener('pointerdown', down);
    st.addEventListener('pointermove', move);
    st.addEventListener('pointerup', up);
    st.addEventListener('pointercancel', up);
    st.addEventListener('pointerleave', leave);
    const io = new IntersectionObserver(([entry]) => {
      visible.current = !!entry?.isIntersecting;
      if (visible.current) { last = 0; kick(); }
    });
    io.observe(st);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      st.removeEventListener('pointerdown', down);
      st.removeEventListener('pointermove', move);
      st.removeEventListener('pointerup', up);
      st.removeEventListener('pointercancel', up);
      st.removeEventListener('pointerleave', leave);
    };
  }, []);

  // troca de modelo sozinha (para quando a pessoa interage ou a secao sai da tela)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      if (visible.current && Date.now() > pauseUntil.current) setActive((n) => (n + 1) % SLIDES.length);
    }, 7000);
    return () => window.clearInterval(id);
  }, []);

  const slide = SLIDES[active] ?? SLIDES[0];

  return (
    <div className="h-p3d">
      <div className="h-p3d-stage" ref={stage}>
        <div className="h-p3d-chip is-a" aria-hidden="true">Sem app para instalar</div>
        <div className="h-p3d-chip is-b" aria-hidden="true">Pedido direto no WhatsApp</div>
        <div className="h-p3d-rig" ref={rig}>
          {EDGES.map((i) => (
            <div key={i} className="h-p3d-edge" style={{ '--i': i } as CSSProperties} aria-hidden="true" />
          ))}
          <div className="h-p3d-back" aria-hidden="true">
            <span className="h-p3d-cam"><i /><i /><i /></span>
          </div>
          <div className="h-p3d-front">
            <div className="h-p3d-screen">
              <span className="h-p3d-island" aria-hidden="true" />
              <div className="h-p3d-page" key={active} aria-hidden="true">
                {slide.video ? (
                  <LazyVideo src={slide.video} poster={slide.img} className="h-p3d-art" label={slide.nome} />
                ) : (
                  <Image className="h-p3d-art" src={slide.img} alt="" width={720} height={540} unoptimized />
                )}
                <div className="h-p3d-body">
                  <small>{slide.tag}</small>
                  <strong>{slide.nome}</strong>
                  {slide.itens.map(([nome, preco]) => (
                    <div className="h-p3d-item" key={nome}><span>{nome}</span><b>{preco}</b></div>
                  ))}
                  <div className="h-p3d-cta">Pedir no WhatsApp</div>
                  <div className="h-p3d-how"><b>1</b> Escolha <b>2</b> Toque <b>3</b> Fale no WhatsApp</div>
                  <div className="h-p3d-item"><span>Horário</span><b>Seg a sáb</b></div>
                </div>
              </div>
              <span className="h-p3d-glare" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
      <div className="h-p3d-tabs" role="group" aria-label="Modelos de página">
        {SLIDES.map((s, i) => (
          <button
            key={s.aba}
            type="button"
            className={i === active ? 'is-on' : ''}
            aria-pressed={i === active}
            onClick={() => { setActive(i); pauseUntil.current = Date.now() + 15000; }}
          >
            {s.aba}
          </button>
        ))}
      </div>
      <p className="h-p3d-hint">Arraste o celular para girar</p>
    </div>
  );
}
