'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { EXAMPLE_PATH, waUrl } from '../../lib/site';

// Botao flutuante com conversa guiada: balao que chama, mensagens que chegam uma a uma,
// respostas prontas e, no fim, o link do WhatsApp com o texto ja escrito.
type Msg = { id: number; from: 'bot' | 'me'; text: string; link?: { href: string; label: string; interno?: boolean } };

const OPCOES = [
  {
    rotulo: 'Quero a minha página',
    resp: 'Perfeito! Conte o nome do seu negócio e o que você vende. Com isso montamos o seu modelo.',
    texto: 'Oi! Quero uma pagina do Pedidos na Bio para o meu negocio.',
    exemplo: false,
  },
  {
    rotulo: 'Quanto custa?',
    resp: 'Estamos em fase de lançamento e os valores ainda estão sendo definidos. Fale com a gente para conhecer as condições.',
    texto: 'Oi! Quero saber quanto custa a pagina do Pedidos na Bio.',
    exemplo: false,
  },
  {
    rotulo: 'Ver um exemplo',
    resp: 'Esta é a página da Gi, uma doceria que já usa. Abra e veja como o cliente faz o pedido.',
    texto: 'Oi! Vi o exemplo da Gi e quero uma pagina do Pedidos na Bio.',
    exemplo: true,
  },
] as const;

const BOAS_VINDAS = ['Oi! Aqui é a equipe do Pedidos na Bio.', 'Vamos criar a página do seu negócio? Escolha uma opção:'];
const TEASER = 'Oi! Posso ajudar a criar a página do seu negócio?';

function agora() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function WhatsAppChat() {
  const [shown, setShown] = useState(false);
  const [open, setOpen] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [opts, setOpts] = useState(false);
  const [texto, setTexto] = useState('');
  const idRef = useRef(0);
  const played = useRef(false);
  const timers = useRef<number[]>([]);
  const body = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const reduce = useRef(false);
  const escolhida = useRef('');

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, reduce.current ? Math.min(ms, 60) : ms));
  };
  const push = (m: Omit<Msg, 'id'>) => setMsgs((l) => [...l, { ...m, id: ++idRef.current }]);

  useEffect(() => {
    reduce.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max >= 0.25) setShown(true);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const all = timers.current;
    return () => { window.removeEventListener('scroll', onScroll); all.forEach(clearTimeout); };
  }, []);

  // balao que chama a atencao, uma vez por visita
  useEffect(() => {
    if (!shown || open) return;
    try { if (window.sessionStorage.getItem('pnb-chat-fechou')) return; } catch { /* sem storage */ }
    const t = window.setTimeout(() => setTeaser(true), 2500);
    return () => window.clearTimeout(t);
  }, [shown, open]);

  useEffect(() => { const b = body.current; if (b) b.scrollTop = b.scrollHeight; }, [msgs, typing, opts]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); toggle.current?.focus(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const bot = (text: string, ms: number, then?: () => void, link?: Msg['link']) => {
    setTyping(true);
    later(() => { setTyping(false); push({ from: 'bot', text, link }); then?.(); }, ms);
  };

  const abrir = () => {
    setOpen(true); setTeaser(false);
    window.setTimeout(() => card.current?.focus({ preventScroll: true }), 60);
    if (played.current) return;
    played.current = true;
    const a = BOAS_VINDAS[0] ?? '', b = BOAS_VINDAS[1] ?? '';
    later(() => bot(a, 900, () => later(() => bot(b, 1100, () => setOpts(true)), 350)), 250);
  };

  const fechar = () => { setOpen(false); toggle.current?.focus(); };
  const dispensar = () => {
    setTeaser(false);
    try { window.sessionStorage.setItem('pnb-chat-fechou', '1'); } catch { /* sem storage */ }
  };

  const escolher = (i: number) => {
    const o = OPCOES[i];
    if (!o) return;
    setOpts(false);
    escolhida.current = o.texto;
    push({ from: 'me', text: o.rotulo });
    const href = waUrl(o.texto);
    later(() => bot(o.resp, 1200, () => {
      if (o.exemplo) later(() => push({ from: 'bot', text: 'Gostou? Quando quiser, chame a gente:', link: href ? { href, label: 'Continuar no WhatsApp' } : undefined }), 500);
    }, o.exemplo ? { href: EXAMPLE_PATH, label: 'Abrir a página da Gi', interno: true } : href ? { href, label: 'Continuar no WhatsApp' } : undefined), 500);
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const v = texto.trim();
    if (!v) return;
    push({ from: 'me', text: v });
    setTexto('');
    const href = waUrl(escolhida.current ? `${escolhida.current}\n${v}` : v);
    if (!href) return;
    const w = window.open(href, '_blank', 'noopener,noreferrer');
    if (!w) window.location.href = href;
  };

  return (
    <div className={`h-chat${shown || open ? ' is-on' : ''}${open ? ' is-open' : ''}`}>
      <div className="h-chat-card" ref={card} role="dialog" aria-label="Conversa com a equipe do Pedidos na Bio" tabIndex={-1} hidden={!open}>
        <div className="h-chat-head">
          <span className="h-chat-av" aria-hidden="true">PB</span>
          <div><strong>Equipe Pedidos na Bio</strong><small>Continua no seu WhatsApp</small></div>
          <button type="button" className="h-chat-x" onClick={fechar} aria-label="Fechar conversa">×</button>
        </div>
        <div className="h-chat-body" ref={body} role="log" aria-live="polite">
          {msgs.map((m) => (
            <div key={m.id} className={m.from === 'me' ? 'h-chat-msg is-me' : 'h-chat-msg'}>
              {m.text}
              {m.link ? (
                m.link.interno
                  ? <Link className="h-chat-go" href={m.link.href}>{m.link.label} →</Link>
                  : <a className="h-chat-go" href={m.link.href} target="_blank" rel="noopener noreferrer">{m.link.label} →</a>
              ) : null}
              <time>{agora()}</time>
            </div>
          ))}
          {typing ? <div className="h-chat-msg is-dots" aria-label="digitando"><i /><i /><i /></div> : null}
          {opts ? (
            <div className="h-chat-opts">
              {OPCOES.map((o, i) => <button type="button" key={o.rotulo} onClick={() => escolher(i)}>{o.rotulo}</button>)}
            </div>
          ) : null}
        </div>
        <form className="h-chat-form" onSubmit={enviar}>
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva sua mensagem" aria-label="Sua mensagem" autoComplete="off" enterKeyHint="send" />
          <button type="submit" aria-label="Enviar pelo WhatsApp">➤</button>
        </form>
      </div>

      {teaser && !open ? (
        <div className="h-chat-teaser">
          <button type="button" onClick={abrir}>{TEASER}</button>
          <button type="button" className="h-chat-tx" onClick={dispensar} aria-label="Fechar aviso">×</button>
        </div>
      ) : null}

      <button type="button" ref={toggle} className="h-chat-btn" onClick={open ? fechar : abrir} aria-expanded={open} aria-label={open ? 'Fechar conversa' : 'Conversar com a equipe'}>
        <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M16 4C9.4 4 4 8.9 4 15c0 2.6 1 5 2.7 6.9L5.5 27.5l5.9-2.3c1.4.4 3 .7 4.6.7 6.6 0 12-4.9 12-11S22.600 4 16 4Zm-5 8.500h10v2H11v-2Zm0 4h7v2h-7v-2Z" />
        </svg>
        {teaser && !open ? <span className="h-chat-badge" aria-hidden="true">1</span> : null}
      </button>
    </div>
  );
}
