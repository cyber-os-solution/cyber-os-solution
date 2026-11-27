import { createAdminClient } from '../../lib/biosite/admin-client';
import { deleteCatalogForm, saveCatalogForm, saveSectionForm } from './actions';

export const dynamic = 'force-dynamic';

const page = { fontFamily: 'system-ui, sans-serif', maxWidth: 880, margin: '0 auto', padding: 24, color: '#111827' } as const;
const box = { border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 16 } as const;
const btn = { padding: '8px 14px', borderRadius: 6, border: 0, background: '#1d4ed8', color: '#fff', cursor: 'pointer' } as const;

// Painel do cliente (agent edita secoes e catalogo). Sem sessao, nada aparece.
export default async function AdminPage() {
  const db = await createAdminClient();
  const { data: userData } = await db.auth.getUser();
  if (!userData.user) {
    return (
      <main style={page}>
        <h1>Painel do Biosite</h1>
        <p>Acesso somente pelo link enviado pelo seu integrador. Peça um novo link se o anterior expirou.</p>
      </main>
    );
  }

  const { data: biosites } = await db.from('biosites').select('id, slug, title, published').order('created_at');
  const site = biosites?.[0];
  const { data: sections } = site
    ? await db.from('bio_sections').select('id, section_type, position, enabled, config').eq('biosite_id', site.id).order('position')
    : { data: [] };
  const { data: items } = site
    ? await db.from('bio_catalog_items').select('id, slug, title, status, price').eq('biosite_id', site.id).order('position')
    : { data: [] };

  if (!site) {
    return (
      <main style={page}>
        <h1>Painel do Biosite</h1>
        <p>Nenhum biosite liberado para esta conta.</p>
      </main>
    );
  }

  return (
    <main style={page}>
      <h1>{site.title}</h1>
      <p>Página: /b/{site.slug} {site.published ? '(publicada)' : '(não publicada)'}</p>

      <h2>Seções</h2>
      {(sections ?? []).map((s) => (
        <form key={s.id} action={saveSectionForm} style={box}>
          <input type="hidden" name="sectionId" value={s.id} />
          <strong>
            {s.position + 1}. {s.section_type}
          </strong>{' '}
          <label>
            <input type="checkbox" name="enabled" defaultChecked={s.enabled} /> Mostrar
          </label>
          <p style={{ fontSize: 13, color: '#6b7280' }}>Conteúdo em JSON (campos válidos para este tipo; o restante é descartado ao salvar).</p>
          <textarea name="config" defaultValue={JSON.stringify(s.config, null, 2)} rows={6} style={{ width: '100%', fontFamily: 'monospace' }} />
          <div style={{ marginTop: 8 }}>
            <button type="submit" style={btn}>Salvar seção</button>
          </div>
        </form>
      ))}

      <h2>Catálogo</h2>
      {(items ?? []).map((it) => (
        <form key={it.id} action={deleteCatalogForm} style={{ ...box, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <input type="hidden" name="itemId" value={it.id} />
          <span>
            {it.title} · {it.slug} · {it.status}
            {it.price !== null ? ` · R$ ${it.price}` : ''}
          </span>
          <button type="submit" style={{ ...btn, background: '#b91c1c' }}>Apagar</button>
        </form>
      ))}

      <form action={saveCatalogForm} style={box}>
        <input type="hidden" name="biositeId" value={site.id} />
        <h3>Novo item</h3>
        <p>
          <input name="title" placeholder="Título" required maxLength={160} /> <input name="slug" placeholder="slug-do-item" required maxLength={80} />
        </p>
        <p>
          <input name="price" placeholder="Preço (ex.: 49,90)" /> <select name="status" defaultValue="draft"><option value="draft">Rascunho</option><option value="published">Publicado</option><option value="archived">Arquivado</option></select>
        </p>
        <p>
          <input name="summary" placeholder="Resumo" maxLength={1000} style={{ width: '100%' }} />
        </p>
        <p>
          <input name="coverUrl" placeholder="https://imagem" style={{ width: '100%' }} />
        </p>
        <button type="submit" style={btn}>Adicionar</button>
      </form>
    </main>
  );
}
