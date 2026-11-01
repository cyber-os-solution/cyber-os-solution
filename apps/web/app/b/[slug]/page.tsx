import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { safeUrl, sanitizeTheme, text, toSectionView, type SectionView } from '@cyber/biosite';
import { getPublicBiosite, getPublicCatalog } from '../../../lib/biosite/public';
import './biosite.css';

export const runtime = 'nodejs';
export const revalidate = 60; // pagina publica em cache por 60 s

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const site = await getPublicBiosite(slug);
  if (!site) return { title: 'Nao encontrado', robots: { index: false } };
  const hero = site.sections.map((s) => toSectionView(slug, s)).find((v) => v?.kind === 'hero');
  const description = hero?.kind === 'hero' && hero.subtitle ? hero.subtitle : undefined;
  return { title: site.title, ...(description ? { description } : {}) };
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

async function Catalog({ slug, title, limit }: { slug: string; title: string; limit: number }) {
  const items = await getPublicCatalog(slug, limit);
  if (items.length === 0) return null;
  return (
    <section className="bs-section">
      <h2>{title}</h2>
      <div className="bs-grid">
        {items.map((item) => {
          const cover = safeUrl(item.cover_url);
          return (
            <article className="bs-card" key={item.slug}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {cover ? <img src={cover} alt={item.title} loading="lazy" referrerPolicy="no-referrer" /> : null}
              <div>
                <strong>{item.title}</strong>
                {item.summary ? <small>{item.summary}</small> : null}
                {item.price !== null ? <span className="bs-price">{brl.format(item.price)}</span> : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Section({ view, slug }: { view: SectionView; slug: string }) {
  switch (view.kind) {
    case 'hero':
      return (
        <header className="bs-hero">
          {view.videoUrl ? (
            <video
              className="bs-hero-media"
              src={view.videoUrl}
              poster={view.imageUrl ?? undefined}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden="true"
              disablePictureInPicture
            />
          ) : view.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={view.imageUrl} alt="" referrerPolicy="no-referrer" />
          ) : null}
          {view.title ? <h1>{view.title}</h1> : null}
          {view.subtitle ? <p>{view.subtitle}</p> : null}
          {view.cta ? <a className="bs-btn" href={view.cta.href} rel="noopener noreferrer">{view.cta.label}</a> : null}
        </header>
      );
    case 'texto':
      return (
        <section className="bs-section">
          {view.title ? <h2>{view.title}</h2> : null}
          {view.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        </section>
      );
    case 'catalogo':
      return <Catalog slug={slug} title={view.title} limit={view.limit} />;
    case 'galeria':
      return view.images.length === 0 ? null : (
        <section className="bs-section">
          {view.title ? <h2>{view.title}</h2> : null}
          <div className="bs-gallery">
            {view.images.map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={img.url} src={img.url} alt={img.alt} loading="lazy" referrerPolicy="no-referrer" />
            ))}
          </div>
        </section>
      );
    case 'contato':
      return view.items.length === 0 ? null : (
        <section className="bs-section">
          <h2>{view.title}</h2>
          <ul className="bs-contact">
            {view.items.map((item) => (
              <li key={item.label}>
                <strong>{item.label}: </strong>
                {item.href ? <a href={item.href} rel="noopener noreferrer">{item.value}</a> : item.value}
              </li>
            ))}
          </ul>
        </section>
      );
    case 'links':
      return view.links.length === 0 ? null : (
        <section className="bs-section">
          {view.title ? <h2>{view.title}</h2> : null}
          <div className="bs-stack">
            {view.links.map((link) => (
              <a key={link.href} className="bs-btn" href={link.href} rel="nofollow noopener noreferrer">{link.label}</a>
            ))}
          </div>
        </section>
      );
  }
}

export default async function PublicBiositePage({ params }: Props) {
  const { slug } = await params;
  const site = await getPublicBiosite(slug);
  if (!site) notFound();

  const theme = sanitizeTheme(site.theme);
  const style = {
    '--bs-primary': theme.primary,
    '--bs-bg': theme.background,
    '--bs-text': theme.text,
    '--bs-font': theme.font,
    '--bs-radius': theme.radius,
  } as CSSProperties;

  const brandName = text(site.brand.name, 80);
  const logo = safeUrl(site.brand.logo_url);
  const views = site.sections.flatMap((s) => {
    const v = toSectionView(slug, s);
    return v ? [v] : [];
  });

  return (
    <main className="bs-root" style={style}>
      <div className="bs-wrap">
        {brandName || logo ? (
          <div className="bs-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logo ? <img src={logo} alt="" referrerPolicy="no-referrer" /> : null}
            {brandName ? <strong>{brandName}</strong> : null}
          </div>
        ) : null}
        {views.map((view) => <Section key={view.id} view={view} slug={slug} />)}
        {site.brand.hide_powered_by === true ? null : <footer className="bs-foot">Feito com CYBER-OS</footer>}
      </div>
    </main>
  );
}
