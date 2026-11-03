'use client';

import { useEffect, useState } from 'react';

// Botao flutuante de WhatsApp. Aparece depois de 25% de rolagem (evita repetir o botao do topo).
// O href completo funciona mesmo sem JavaScript. Padrao inspirado no lp-whatsapp-integration (MIT).
export function WhatsAppFloat({ href, label }: { href: string; label: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setVisible(max > 0 && window.scrollY / max >= 0.25);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <a
      className={visible ? 'h-float is-on' : 'h-float'}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      tabIndex={visible ? 0 : -1}
    >
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M16 4C9.4 4 4 8.9 4 15c0 2.6 1 5 2.700 6.900L5.500 27.500l5.900-2.300c1.400.4 3 .7 4.600.7 6.600 0 12-4.900 12-11S22.600 4 16 4Zm-5 8.500h10v2H11v-2Zm0 4h7v2h-7v-2Z"/>
      </svg>
    </a>
  );
}
