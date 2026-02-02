-- Benzerlik araması: vektör uzaklığına göre en yakın dokümanları döner.
-- metadata JSONB üzerinden collection_name ve user_id filtrelemesi destekler.
-- Supabase SQL Editor'da çalıştırılmalıdır.

create or replace function public.match_documents(
  query_embedding vector,
  match_threshold float,
  match_count int,
  filter jsonb default '{}'::jsonb
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql
stable
as $$
  select
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) as similarity
  from public.documents d
  where
    (filter = '{}'::jsonb or d.metadata @> filter)
    and (1 - (d.embedding <=> query_embedding)) > match_threshold
  order by d.embedding <=> query_embedding
  limit match_count;
$$;

