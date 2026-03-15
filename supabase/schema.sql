-- LearnFlow Database Schema
-- Apply via: Supabase Dashboard → SQL Editor

-- =============================================
-- Users (extends Supabase auth.users)
-- =============================================
create table if not exists public.profiles (
  id uuid references auth.users primary key,
  display_name text,
  anonymous_id text, -- für Migration von anonym → registriert
  created_at timestamptz default now()
);

-- Row Level Security
alter table public.profiles enable row level security;
create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- =============================================
-- Documents
-- =============================================
create table if not exists public.documents (
  id text primary key,
  user_id uuid references public.profiles(id),
  filename text not null,
  chapters_count int default 0,
  created_at timestamptz default now()
);

alter table public.documents enable row level security;
create policy "Users can read own documents"
  on public.documents for select using (auth.uid() = user_id);
create policy "Users can insert own documents"
  on public.documents for insert with check (auth.uid() = user_id);

-- =============================================
-- Chapters
-- =============================================
create table if not exists public.chapters (
  id text primary key,
  document_id text references public.documents(id) on delete cascade,
  chapter_num int not null,
  title text,
  word_count int default 0,
  duration_seconds int default 0,
  created_at timestamptz default now()
);

alter table public.chapters enable row level security;
create policy "Users can read chapters of own documents"
  on public.chapters for select
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.user_id = auth.uid()
    )
  );

-- =============================================
-- Learning Events (das Gold!)
-- =============================================
create table if not exists public.events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id),
  document_id text,
  chapter_id text,
  event_type text not null,
  data jsonb default '{}',
  created_at timestamptz default now()
);

alter table public.events enable row level security;
create policy "Users can read own events"
  on public.events for select using (auth.uid() = user_id);
create policy "Users can insert own events"
  on public.events for insert with check (auth.uid() = user_id);

-- =============================================
-- Indexes
-- =============================================
create index if not exists idx_events_user on public.events(user_id);
create index if not exists idx_events_type on public.events(event_type);
create index if not exists idx_events_created on public.events(created_at);
create index if not exists idx_chapters_doc on public.chapters(document_id);
create index if not exists idx_documents_user on public.documents(user_id);

-- =============================================
-- Auto-create profile on first login
-- =============================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
