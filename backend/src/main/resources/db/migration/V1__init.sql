-- Fresh database schema. No historical or sample content is imported.
create table admin_users (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  password_hash text not null,
  role text not null check (role in ('OWNER')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table blog_posts (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug text not null unique,
  category text not null,
  summary text not null,
  content_markdown text not null,
  blog_order integer default 0 not null,
  featured_on_home boolean default false not null,
  home_order integer default 0 not null,
  cover_image_url text,
  status text not null check (status in ('DRAFT', 'PUBLISHED', 'HIDDEN')),
  published_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index blog_posts_status_order_idx
  on blog_posts (status, blog_order asc, published_at desc);


create table comments (
  id uuid default gen_random_uuid() primary key,
  target_type text not null check (target_type in ('BLOG', 'GUESTBOOK')),
  target_id uuid,
  parent_id uuid references comments(id) on delete cascade,
  author_name text not null,
  content text not null,
  status text not null check (status in ('PENDING', 'APPROVED', 'HIDDEN')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint comments_target_shape check (
    (target_type = 'BLOG' and target_id is not null)
    or
    (target_type = 'GUESTBOOK' and target_id is null)
  )
);

create index comments_target_status_idx
  on comments (target_type, target_id, status, created_at desc);

create index comments_parent_idx
  on comments (parent_id);

create index blog_posts_home_featured_idx
  on blog_posts (status, featured_on_home, home_order asc, published_at desc);

create table media_assets (
  blog_post_id uuid references blog_posts(id) on delete cascade,
  id uuid default gen_random_uuid() primary key,
  url text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  created_at timestamptz default now() not null
);

create index media_assets_blog_post_created_idx on media_assets (blog_post_id, created_at desc);

create table resume_versions (
  id uuid default gen_random_uuid() primary key,
  label text not null,
  url text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  active boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create unique index resume_versions_one_active_idx
  on resume_versions (active)
  where active;

create index resume_versions_active_updated_idx
  on resume_versions (active, updated_at desc);

create table about_content (
  id uuid default gen_random_uuid() primary key,
  content_key text not null unique,
  portrait_image_url text default '' not null,
  wechat_qr_image_url text default '' not null,
  profile_details text default '[]' not null,
  resume_entries text default '[]' not null,
  contact_heading text default '' not null,
  contact_items text default '[]' not null,
  social_links text default '[]' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table gallery_works (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text default '' not null,
  location text default '' not null,
  taken_at text default '' not null,
  sort_order integer default 0 not null,
  status text not null check (status in ('DRAFT', 'PUBLISHED', 'HIDDEN')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index gallery_works_status_order_idx on gallery_works (status, sort_order, id);

create table gallery_photos (
  work_id uuid not null references gallery_works(id),
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text default '' not null,
  location text default '' not null,
  taken_at text default '' not null,
  sort_order integer default 0 not null,
  status text not null check (status in ('DRAFT', 'PUBLISHED', 'HIDDEN')),
  url text not null,
  thumbnail_url text default '' not null,
  medium_url text default '' not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index gallery_photos_status_sort_idx
  on gallery_photos (status, sort_order asc, updated_at desc);

create index gallery_photos_work_order_idx on gallery_photos (work_id, sort_order, id);

create table home_gallery_slots (
  id uuid default gen_random_uuid() primary key,
  slot_key text not null unique,
  uploaded_image_url text,
  uploaded_file_name text,
  uploaded_mime_type text,
  uploaded_size_bytes bigint,
  gallery_photo_id uuid references gallery_photos(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index home_gallery_slots_photo_idx
  on home_gallery_slots (gallery_photo_id);
