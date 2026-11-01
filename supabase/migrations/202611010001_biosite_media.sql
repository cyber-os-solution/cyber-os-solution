-- P5a: midia do biosite (fotos) no Supabase Storage.
-- Bucket publico (a pagina publica serve a foto por URL https), escrita so por membros
-- do tenant dono do biosite, caminho fixo <tenant_id>/<biosite_id>/<arquivo>.
-- Limites de tipo e tamanho ficam no bucket (SVG fora de proposito: pode conter script).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bio-media', 'bio-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Valida o caminho e confere dono: formato exato, tenant = 1o trecho, biosite do mesmo tenant
-- e o usuario precisa ser agent ou acima nesse tenant.
create or replace function private.bio_media_can_write(_name text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select
    _name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[a-z0-9][a-z0-9._-]{0,80}\.(jpg|jpeg|png|webp)$'
    and private.is_member(split_part(_name, '/', 1)::uuid, 'agent')
    and exists (
      select 1 from public.biosites b
      where b.id = split_part(_name, '/', 2)::uuid
        and b.tenant_id = split_part(_name, '/', 1)::uuid
    );
$$;

create or replace function private.bio_media_can_read(_name text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select
    split_part(_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and private.is_member(split_part(_name, '/', 1)::uuid, 'viewer');
$$;

revoke all on function private.bio_media_can_write(text) from public, anon;
revoke all on function private.bio_media_can_read(text) from public, anon;
grant execute on function private.bio_media_can_write(text) to authenticated;
grant execute on function private.bio_media_can_read(text) to authenticated;

-- A leitura publica das imagens e feita pelo URL publico do bucket; nao ha policy para anon.
create policy bio_media_select on storage.objects for select to authenticated
  using (bucket_id = 'bio-media' and private.bio_media_can_read(name));
create policy bio_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'bio-media' and private.bio_media_can_write(name));
create policy bio_media_update on storage.objects for update to authenticated
  using (bucket_id = 'bio-media' and private.bio_media_can_write(name))
  with check (bucket_id = 'bio-media' and private.bio_media_can_write(name));
create policy bio_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'bio-media' and private.bio_media_can_write(name));
