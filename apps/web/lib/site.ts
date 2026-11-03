// Dados do site publico (home). Troque WHATSAPP_NUMBER pelo numero comercial (so digitos, com 55 + DDD).
// Enquanto estiver vazio, a home mostra apenas o botao "Ver exemplo".
export const SITE_NAME = 'Pedidos na Bio';
export const SITE_URL = 'https://pedidosnabio.com';
export const EXAMPLE_PATH = '/b/brownies-da-gi';
export const WHATSAPP_NUMBER = '5511967426682';

export function contactHref(): string | null {
  if (!/^\d{12,13}$/.test(WHATSAPP_NUMBER)) return null;
  const text = encodeURIComponent('Oi! Quero uma pagina do Pedidos na Bio para o meu negocio.');
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}

// Link do WhatsApp com texto ja escrito. Usado pelo chat da home.
export function waUrl(text: string): string | null {
  if (!/^\d{12,13}$/.test(WHATSAPP_NUMBER)) return null;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
