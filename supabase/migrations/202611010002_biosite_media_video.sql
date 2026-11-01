-- P5b: video curto no hero do biosite (mp4), no mesmo bucket bio-media.
-- Mantem o limite de 5 MB e a regra de escrita (so agent+ do tenant dono, caminho fixo).
-- Apenas video/mp4 entra; outros formatos de video continuam fora.

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'video/mp4']
where id = 'bio-media';

create or replace function private.bio_media_can_write(_name text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select
    _name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[a-z0-9][a-z0-9._-]{0,80}\.(jpg|jpeg|png|webp|mp4)$'
    and private.is_member(split_part(_name, '/', 1)::uuid, 'agent')
    and exists (
      select 1 from public.biosites b
      where b.id = split_part(_name, '/', 2)::uuid
        and b.tenant_id = split_part(_name, '/', 1)::uuid
    );
$$;
