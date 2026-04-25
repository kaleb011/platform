create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.drawing_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid null,
  file_name text not null,
  file_type text not null,
  storage_path text null,
  status text not null check (status in ('uploaded', 'converting', 'converted', 'analyzed', 'failed')),
  page_count integer not null default 0,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.drawing_pages (
  id uuid primary key default gen_random_uuid(),
  drawing_file_id uuid not null references public.drawing_files(id) on delete cascade,
  page_number integer not null,
  drawing_no text null,
  drawing_title text null,
  scale text null,
  png_path text null,
  overview_image_path text null,
  status text not null check (status in ('uploaded', 'converting', 'converted', 'analyzed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (drawing_file_id, page_number)
);

create table if not exists public.drawing_extraction_candidates (
  id uuid primary key default gen_random_uuid(),
  drawing_file_id uuid not null references public.drawing_files(id) on delete cascade,
  drawing_page_id uuid null references public.drawing_pages(id) on delete set null,
  extracted_type text not null,
  extracted_text text not null,
  normalized_value text null,
  quantity numeric null,
  unit text null,
  source_page integer null,
  source_bbox jsonb null,
  confidence numeric null,
  review_status text not null default 'pending'
    check (review_status in ('pending', 'accepted', 'rejected', 'edited', 'needs_standard_match')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.standard_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_year integer not null,
  file_path text null,
  page_count integer null,
  description text null,
  created_at timestamptz not null default now()
);

create table if not exists public.standard_items (
  id uuid primary key default gen_random_uuid(),
  standard_document_id uuid not null references public.standard_documents(id) on delete cascade,
  source_year integer not null,
  division text not null,
  chapter text not null,
  section text null,
  item_code text null,
  item_name text not null,
  unit text null,
  measurement_rule text null,
  description text null,
  notes text null,
  page_start integer null,
  page_end integer null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.standard_item_keywords (
  id uuid primary key default gen_random_uuid(),
  standard_item_id uuid not null references public.standard_items(id) on delete cascade,
  keyword text not null,
  drawing_term text null,
  created_at timestamptz not null default now()
);

create table if not exists public.estimate_item_matches (
  id uuid primary key default gen_random_uuid(),
  project_id uuid null,
  drawing_extraction_id uuid not null references public.drawing_extraction_candidates(id) on delete cascade,
  standard_item_id uuid not null references public.standard_items(id) on delete cascade,
  match_reason text null,
  confidence numeric null,
  review_status text not null default 'pending'
    check (review_status in ('pending', 'accepted', 'rejected', 'edited', 'needs_standard_match')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.estimate_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid null,
  drawing_file_id uuid null references public.drawing_files(id) on delete set null,
  drawing_page_id uuid null references public.drawing_pages(id) on delete set null,
  standard_item_id uuid null references public.standard_items(id) on delete set null,
  work_category text not null,
  item_name text not null,
  specification text null,
  quantity numeric not null,
  unit text not null,
  calculation_basis text null,
  source_note text null,
  review_status text not null default 'pending'
    check (review_status in ('pending', 'accepted', 'rejected', 'edited', 'needs_standard_match')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.schedule_forecast_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid null,
  estimate_item_id uuid null references public.estimate_items(id) on delete set null,
  work_category text not null,
  task_name text not null,
  planned_quantity numeric null,
  unit text null,
  planned_order integer null,
  estimated_duration_days numeric null,
  dependency_note text null,
  status text not null default 'draft'
    check (status in ('draft', 'linked', 'review_needed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_drawing_files_project_id on public.drawing_files(project_id);
create index if not exists idx_drawing_pages_file_id on public.drawing_pages(drawing_file_id);
create index if not exists idx_extraction_candidates_file_id on public.drawing_extraction_candidates(drawing_file_id);
create index if not exists idx_estimate_item_matches_extraction on public.estimate_item_matches(drawing_extraction_id);
create index if not exists idx_estimate_items_project_id on public.estimate_items(project_id);
create index if not exists idx_schedule_forecast_project_id on public.schedule_forecast_items(project_id);

drop trigger if exists set_drawing_files_updated_at on public.drawing_files;
create trigger set_drawing_files_updated_at
before update on public.drawing_files
for each row execute function public.set_updated_at();

drop trigger if exists set_drawing_pages_updated_at on public.drawing_pages;
create trigger set_drawing_pages_updated_at
before update on public.drawing_pages
for each row execute function public.set_updated_at();

drop trigger if exists set_extraction_candidates_updated_at on public.drawing_extraction_candidates;
create trigger set_extraction_candidates_updated_at
before update on public.drawing_extraction_candidates
for each row execute function public.set_updated_at();

drop trigger if exists set_standard_items_updated_at on public.standard_items;
create trigger set_standard_items_updated_at
before update on public.standard_items
for each row execute function public.set_updated_at();

drop trigger if exists set_estimate_item_matches_updated_at on public.estimate_item_matches;
create trigger set_estimate_item_matches_updated_at
before update on public.estimate_item_matches
for each row execute function public.set_updated_at();

drop trigger if exists set_estimate_items_updated_at on public.estimate_items;
create trigger set_estimate_items_updated_at
before update on public.estimate_items
for each row execute function public.set_updated_at();

drop trigger if exists set_schedule_forecast_items_updated_at on public.schedule_forecast_items;
create trigger set_schedule_forecast_items_updated_at
before update on public.schedule_forecast_items
for each row execute function public.set_updated_at();

comment on table public.standard_items is
  '2026 표준품셈 원문 전체를 직접 저장하지 않고, MVP에 필요한 샘플/전처리 항목만 적재한다.';
