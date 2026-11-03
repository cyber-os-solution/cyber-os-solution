import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { contactHref, EXAMPLE_PATH, SITE_NAME, SITE_URL } from '../lib/site';
import { LazyVideo } from './_components/lazy-video';
import { WhatsAppFloat } from './_components/whatsapp-float';
import './home.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${SITE_NAME}: seu cardápio e seu WhatsApp em um link só`,
  description:
    'Crie a página do seu negócio para colocar na bio do Instagram: catálogo com preços, fotos e um botão que leva o cliente direto para o seu WhatsApp.',
  alternates: { canonical: '/' },
  openGraph: {
    title: `${SITE_NAME}: seu cardápio e seu WhatsApp em um link só`,
    description: 'Página do seu negócio para a bio do Instagram, com catálogo e botão de WhatsApp.',
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'pt_BR',
    type: 'website',
  },
};

const NICHOS = [
  { slug: 'casa-de-bolos', nome: 'Casa de bolos e doces' },
  { slug: 'sorveteria', nome: 'Sorveteria' },
  { slug: 'adega', nome: 'Adega' },
  { slug: 'moda-feminina', nome: 'Moda feminina' },
  { slug: 'perfumaria', nome: 'Perfumaria' },
  { slug: 'estetica', nome: 'Estética e beleza' },
  { slug: 'papelaria-livraria', nome: 'Papelaria e livraria' },
  { slug: 'utilidades', nome: 'Loja de utilidades' },
  { slug: 'material-construcao', nome: 'Material de construção' },
  { slug: 'ferramentaria', nome: 'Ferramentaria' },
  { slug: 'borracharia', nome: 'Borracharia' },
  { slug: 'imobiliaria', nome: 'Imobiliária' },
  { slug: 'distribuidora-agua', nome: 'Distribuidora de água' },
  { slug: 'igreja', nome: 'Igreja' },
  { slug: 'loja', nome: 'Loja' },
] as const;

const BENEFICIOS = [
  { id: 'destaque', titulo: 'Destaque', texto: 'Uma página bonita, com as suas fotos e até um vídeo curto no topo, pronta para abrir rápido no celular.' },
  { id: 'venda', titulo: 'Venda', texto: 'Catálogo com nome, foto e preço de cada produto. O cliente escolhe e pede pelo seu WhatsApp. Pix e cartão: em breve.' },
  { id: 'conecte', titulo: 'Conecte', texto: 'Um botão de WhatsApp que leva o cliente direto para a sua conversa, sem ele precisar procurar o número.' },
  { id: 'acompanhe', titulo: 'Acompanhe', texto: 'Contamos os cliques em cada botão para você saber o que o cliente procura. Relatório no painel: em breve.' },
] as const;

const PASSOS = [
  { n: '1', titulo: 'Você manda o básico', texto: 'Nome do negócio, fotos, produtos com preço e o seu WhatsApp.' },
  { n: '2', titulo: 'Nós montamos a página', texto: 'Escolhemos o modelo do seu nicho e publicamos o seu endereço.' },
  { n: '3', titulo: 'Você coloca na bio', texto: 'Copie o link, cole na bio do Instagram e comece a receber pedidos.' },
] as const;

const PERGUNTAS = [
  { p: 'Para quem é o Pedidos na Bio?', r: 'Para negócios locais que vendem pelo Instagram e pelo WhatsApp: doceria, adega, loja de roupas, material de construção, igreja, borracharia e muito mais.' },
  { p: 'Preciso ter um site?', r: 'Não. A página do seu negócio já é o seu endereço na internet, e cabe em um único link.' },
  { p: 'Como coloco no Instagram?', r: 'Você copia o link da sua página e cola no campo de site do seu perfil. Também funciona em TikTok, YouTube e no status do WhatsApp.' },
  { p: 'Quanto custa?', r: 'Estamos em fase de lançamento e os valores ainda estão sendo definidos. Fale com a gente para conhecer as condições.' },
  { p: 'Como o cliente faz o pedido?', r: 'Ele vê o catálogo, toca no botão e abre uma conversa no WhatsApp do seu negócio.' },
  { p: 'Posso trocar fotos, preços e o vídeo depois?', r: 'Sim. Hoje nós fazemos a troca para você. O painel para você mesmo editar está em desenvolvimento.' },
  { p: 'Posso criar páginas para os meus clientes?', r: 'Sim. Agências e profissionais podem montar páginas para vários negócios. Fale com a gente para saber como.' },
  { p: 'Funciona bem no celular?', r: 'Foi feito para o celular. As páginas são leves e abrem rápido, inclusive dentro do navegador do Instagram.' },
] as const;

export default function HomePage() {
  const contato = contactHref();

  return (
    <div className="home">
      <header className="h-nav">
        <Link className="h-logo" href="/">{SITE_NAME}</Link>
        <nav aria-label="Principal">
          <a href="#modelos">Modelos</a>
          <a href="#como">Como funciona</a>
          <a href="#perguntas">Perguntas</a>
        </nav>
        <a className="h-btn h-btn-sm" href={EXAMPLE_PATH}>Ver exemplo</a>
      </header>

      <main>
        <section className="h-hero">
          <div className="h-hero-text">
            <h1>Seu cardápio e seu WhatsApp, em um link só.</h1>
            <p>
              Crie a página do seu negócio para colocar na bio do Instagram: catálogo com preços,
              fotos e um botão que leva o cliente direto para o seu WhatsApp.
            </p>
            <div className="h-actions">
              {contato ? <a className="h-btn" href={contato} rel="noopener noreferrer">Quero a minha página</a> : null}
              <a className={contato ? 'h-btn h-btn-ghost' : 'h-btn'} href={EXAMPLE_PATH}>Ver página de exemplo</a>
            </div>
          </div>

          <div className="h-phone" aria-hidden="true">
            <div className="h-phone-screen">
              <LazyVideo src="/home/phone.mp4" poster="/home/phone.webp" className="h-phone-video" label="Brownies da Gi" />
              <div className="h-phone-body">
                <strong>Brownies da Gi</strong>
                <span>Casquinha crocante por fora, massa úmida por dentro.</span>
                <div className="h-phone-item"><span>Brownie tradicional</span><b>R$ 6</b></div>
                <div className="h-phone-item"><span>Brownie com recheio</span><b>R$ 12</b></div>
                <div className="h-phone-cta">Pedir no WhatsApp</div>
              </div>
            </div>
          </div>
        </section>

        <section className="h-section" aria-labelledby="beneficios">
          <h2 id="beneficios">Tudo o que o seu cliente precisa, em uma página</h2>
          <div className="h-cards">
            {BENEFICIOS.map((b) => (
              <article key={b.id} className="h-card">
                <h3>{b.titulo}</h3>
                <p>{b.texto}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="h-section" id="modelos" aria-labelledby="modelos-t">
          <h2 id="modelos-t">Modelos para o seu tipo de negócio</h2>
          <p className="h-sub">Deslize para ver. Cada nicho tem um modelo pronto com as cores e o jeito de vender dele.</p>
          <ul className="h-strip">
            {NICHOS.map((n) => (
              <li key={n.slug} className="h-niche">
                <Image src={`/home/niches/${n.slug}.webp`} alt="" width={720} height={540} unoptimized loading="lazy" />
                <span>{n.nome}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="h-section" aria-labelledby="movimento">
          <h2 id="movimento">Vídeo curto no topo, para chamar atenção</h2>
          <p className="h-sub">O vídeo toca sozinho, sem som, e é leve para não pesar no 4G.</p>
          <div className="h-videos">
            <LazyVideo src="/home/video/casa-de-bolos.mp4" poster="/home/video/casa-de-bolos.webp" className="h-vid" label="Exemplo de vídeo: confeitaria" />
            <LazyVideo src="/home/video/adega.mp4" poster="/home/video/adega.webp" className="h-vid" label="Exemplo de vídeo: adega" />
            <LazyVideo src="/home/phone.mp4" poster="/home/phone.webp" className="h-vid" label="Exemplo de vídeo: brownies" />
          </div>
        </section>

        <section className="h-section" id="como" aria-labelledby="como-t">
          <h2 id="como-t">Como funciona</h2>
          <ol className="h-steps">
            {PASSOS.map((s) => (
              <li key={s.n}>
                <span className="h-step-n">{s.n}</span>
                <h3>{s.titulo}</h3>
                <p>{s.texto}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="h-section" id="perguntas" aria-labelledby="perguntas-t">
          <h2 id="perguntas-t">Perguntas frequentes</h2>
          <div className="h-faq">
            {PERGUNTAS.map((q) => (
              <details key={q.p}>
                <summary>{q.p}</summary>
                <p>{q.r}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="h-final" aria-labelledby="final">
          <h2 id="final">Seu negócio na bio, do jeito que o cliente gosta</h2>
          <p className="h-url">pedidosnabio.com/b/<em>seu-negocio</em></p>
          <div className="h-actions h-actions-center">
            {contato ? <a className="h-btn" href={contato} rel="noopener noreferrer">Quero a minha página</a> : null}
            <a className={contato ? 'h-btn h-btn-ghost' : 'h-btn'} href={EXAMPLE_PATH}>Ver página de exemplo</a>
          </div>
        </section>
      </main>

      <footer className="h-footer">
        <span>© 2026 {SITE_NAME}</span>
        <a href={EXAMPLE_PATH}>Página de exemplo</a>
      </footer>

      {contato ? <WhatsAppFloat href={contato} label="Falar com a gente no WhatsApp" /> : null}
    </div>
  );
}
