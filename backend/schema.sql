create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists public.internships (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  company text not null,
  location text,
  mode text,
  stipend text,
  skills text[] not null default '{}',
  source text not null default 'Unknown',
  apply_link text,
  posted_date date,
  deadline date,
  description text,
  dedupe_key text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.internships add column if not exists mode text;
alter table public.internships add column if not exists skills text[] not null default '{}';
alter table public.internships add column if not exists apply_link text;
alter table public.internships add column if not exists deadline date;
alter table public.internships add column if not exists description text;
alter table public.internships add column if not exists dedupe_key text;
alter table public.internships add column if not exists updated_at timestamp with time zone default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'internships' and column_name = 'link'
  ) then
    execute 'update public.internships set apply_link = coalesce(apply_link, link) where apply_link is null';
  end if;
end $$;

update public.internships set source = 'Unknown' where source is null;
update public.internships set updated_at = coalesce(updated_at, created_at, now()) where updated_at is null;
-- Earlier scraper imports stored the job title itself as a skill.
update public.internships
set skills = '{}'::text[]
where cardinality(skills) = 1
  and lower(trim(skills[1])) = lower(trim(title));

with candidates as (
  select
    id,
    case
      when apply_link is not null and trim(apply_link) not in ('', '#')
        then 'link:' || lower(trim(apply_link))
      else 'composite:' || lower(concat_ws('|', coalesce(title, ''), coalesce(company, ''), coalesce(source, 'Unknown')))
    end as candidate_key,
    row_number() over (
      partition by case
        when apply_link is not null and trim(apply_link) not in ('', '#')
          then 'link:' || lower(trim(apply_link))
        else 'composite:' || lower(concat_ws('|', coalesce(title, ''), coalesce(company, ''), coalesce(source, 'Unknown')))
      end
      order by created_at, id
    ) as duplicate_rank
  from public.internships
  where dedupe_key is null or trim(dedupe_key) = ''
)
update public.internships as internship
set dedupe_key = case
  when candidates.duplicate_rank = 1 then candidates.candidate_key
  else 'legacy:' || candidates.id::text
end
from candidates
where internship.id = candidates.id;

alter table public.internships alter column source set default 'Unknown';
alter table public.internships alter column source set not null;
alter table public.internships alter column updated_at set default now();
alter table public.internships alter column updated_at set not null;
alter table public.internships alter column dedupe_key set not null;

create unique index if not exists internships_dedupe_key_unique_idx
  on public.internships (dedupe_key);

create index if not exists internships_source_idx on public.internships (source);
create index if not exists internships_location_idx on public.internships (location);
create index if not exists internships_posted_date_idx on public.internships (posted_date desc);
create index if not exists internships_skills_gin_idx on public.internships using gin (skills);

create unique index if not exists internships_apply_link_unique_idx
  on public.internships (apply_link)
  where apply_link is not null and apply_link <> '' and apply_link <> '#';

create table if not exists public.saved_internships (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  internship_id uuid not null references public.internships(id) on delete cascade,
  saved_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, internship_id)
);

drop policy if exists "Users can manage their own saved internships" on public.saved_internships;
drop policy if exists "Users can read and manage their own saved internships" on public.saved_internships;
alter table public.saved_internships drop constraint if exists saved_internships_user_id_fkey;
alter table public.saved_internships alter column user_id type text using user_id::text;
alter table public.saved_internships add column if not exists saved_at timestamp with time zone default now();
alter table public.saved_internships alter column saved_at set not null;

do $$
begin
  if to_regprocedure('auth.uid()') is not null then
    execute 'alter table public.saved_internships enable row level security';
    execute 'create policy "Users can read and manage their own saved internships" on public.saved_internships for all to authenticated using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id)';
  else
    execute 'alter table public.saved_internships disable row level security';
  end if;
end $$;

create index if not exists saved_internships_user_id_idx
  on public.saved_internships (user_id, saved_at desc);

do $$
begin
  if to_regtype('public.application_status') is null then
    create type public.application_status as enum ('applied', 'interviewing', 'offer', 'rejected', 'withdrawn');
  end if;
end $$;

alter type public.application_status add value if not exists 'withdrawn';

create table if not exists public.applications (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  internship_id uuid not null references public.internships(id) on delete cascade,
  status public.application_status not null default 'applied',
  notes text,
  applied_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, internship_id)
);

drop policy if exists "Users can manage their own applications" on public.applications;
drop policy if exists "Users can read and manage their own applications" on public.applications;
alter table public.applications drop constraint if exists applications_user_id_fkey;
alter table public.applications alter column user_id type text using user_id::text;
alter table public.applications add column if not exists updated_at timestamp with time zone default now();
update public.applications set updated_at = coalesce(updated_at, applied_at, now()) where updated_at is null;
alter table public.applications alter column updated_at set default now();
alter table public.applications alter column updated_at set not null;

do $$
begin
  if to_regprocedure('auth.uid()') is not null then
    execute 'alter table public.applications enable row level security';
    execute 'create policy "Users can read and manage their own applications" on public.applications for all to authenticated using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id)';
  else
    execute 'alter table public.applications disable row level security';
  end if;
end $$;

create index if not exists applications_user_id_idx
  on public.applications (user_id, updated_at desc);

create table if not exists public.user_checklists (
  user_id text primary key,
  completed_task_ids text[] not null default '{}',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

drop policy if exists "Users can manage their own checklist" on public.user_checklists;
drop policy if exists "Users can read and manage their own checklist" on public.user_checklists;

do $$
begin
  if to_regprocedure('auth.uid()') is not null then
    execute 'alter table public.user_checklists enable row level security';
    execute 'create policy "Users can read and manage their own checklist" on public.user_checklists for all to authenticated using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id)';
  else
    execute 'alter table public.user_checklists disable row level security';
  end if;
end $$;

create table if not exists public.knowledge_documents (
  id uuid default gen_random_uuid() primary key,
  source_type text not null,
  source_id text not null,
  user_id text,
  chunk_index integer not null default 0,
  title text not null,
  content text not null,
  content_hash text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(768) not null,
  embedding_model text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.knowledge_documents
  add column if not exists chunk_index integer not null default 0;
alter table public.knowledge_documents
  add column if not exists content_hash text not null default '';

drop index if exists public.knowledge_documents_unique_source_idx;
create unique index if not exists knowledge_documents_unique_source_idx
  on public.knowledge_documents (source_type, source_id, coalesce(user_id, ''), chunk_index);

create index if not exists knowledge_documents_source_idx
  on public.knowledge_documents (source_type, source_id, chunk_index);

create index if not exists knowledge_documents_user_id_idx
  on public.knowledge_documents (user_id);

create index if not exists knowledge_documents_embedding_hnsw_idx
  on public.knowledge_documents using hnsw (embedding vector_cosine_ops);
