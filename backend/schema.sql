-- Create internships table
create table public.internships (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  company text not null,
  location text,
  stipend text,
  link text,
  source text default 'Internshala',
  posted_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(link) -- prevent duplicates
);

-- Enable RLS
alter table public.internships enable row level security;
create policy "Public internships are viewable by everyone"
  on public.internships for select
  using ( true );

-- Create saved_internships table
create table public.saved_internships (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  internship_id uuid references public.internships not null,
  saved_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, internship_id)
);

-- Create applications table
create type application_status as enum ('applied', 'interviewing', 'offer', 'rejected');
create table public.applications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  internship_id uuid references public.internships not null,
  status application_status default 'applied',
  notes text,
  applied_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, internship_id)
);

-- RLS for user specific data
alter table public.saved_internships enable row level security;
create policy "Users can manage their own saved internships"
  on public.saved_internships for all
  using ( auth.uid() = user_id );

alter table public.applications enable row level security;
create policy "Users can manage their own applications"
  on public.applications for all
  using ( auth.uid() = user_id );
