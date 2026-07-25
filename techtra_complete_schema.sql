-- =============================================================
-- TECHTRA SHOP — COMPLETE DATABASE SCHEMA
-- Project: https://pbuqcvlcqrxdammvbwvs.supabase.co
-- Created: 2026-07-12
-- -------------------------------------------------------------
-- Mục đích: File SQL tổng hợp DUY NHẤT cho toàn bộ dự án
-- (Postgres local cho backend Express + Supabase Postgres cho FE).
-- Tất cả các bảng đều idempotent (chạy nhiều lần OK) — dùng
-- IF NOT EXISTS / ON CONFLICT / ALTER … ADD IF NOT EXISTS.
--
-- Bao gồm:
--   1. product_groups            — Nhóm sản phẩm
--   2. products                  — Sản phẩm
--   3. product_shipping_services — Dịch vụ vận chuyển (J&T)
--   4. customers                 — Khách hàng
--   5. orders / order_items      — Đơn hàng + chi tiết
--   6. admins                    — Tài khoản admin
--   7. users                     — Tài khoản người dùng (auth)
--   8. posts                     — Bài viết / nội dung
--   9. homepage_banners          — Banner trang chủ
--  10. homepage_sections         — Section trang chủ
--  11. homepage_section_products — SP theo section
--  12. homepage_config           — Cấu hình trang chủ (Supabase)
--  13. homepage_values           — 4 thẻ giá trị thương hiệu
--  14. homepage_promo_banners    — 2 banner quảng cáo
--  15. homepage_articles         — Bài viết / tài liệu
--  16. homepage_blog             — Góc chia sẻ
--  17. homepage_picks            — Sắp xếp slider (legacy)
--  18. transactions              — Sổ quỹ / doanh thu
--  19. Triggers + Functions      — Tự sinh order_code, updated_at
--  20. RLS policies              — Mở quyền đọc/ghi cho anon
--  21. Storage bucket policies   — product-images, homepage-assets
--  22. Dữ liệu mẫu              — Admin, groups, sections, …
-- =============================================================


-- =============================================================
-- 0) EXTENSIONS
-- =============================================================
create extension if not exists "pgcrypto";  -- gen_random_uuid()


-- =============================================================
-- 0.1) QUYỀN TRUY CẬP SCHEMA PUBLIC  (FIX LỖI "permission denied for schema public")
-- -------------------------------------------------------------
-- Supabase mặc định TẮT quyền USAGE trên schema `public` đối với
-- role `anon` và `authenticated`. Dù đã tạo bảng + policy, FE vẫn
-- bị từ chối ở bước resolve schema. GRANT lại là fix.
-- =============================================================
grant usage on schema public to anon, authenticated, service_role;

-- Quyền trên tất cả bảng HIỆN TẠI + TƯƠNG LAI trong schema public
grant all privileges on all tables    in schema public to anon, authenticated, service_role;
grant all privileges on all sequences in schema public to anon, authenticated, service_role;
grant all privileges on all functions in schema public to anon, authenticated, service_role;

-- Áp dụng cho mọi bảng được tạo SAU này (Supabase tạo tự động cũng kế thừa)
alter default privileges in schema public
  grant all privileges on tables    to anon, authenticated, service_role;
alter default privileges in schema public
  grant all privileges on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all privileges on functions to anon, authenticated, service_role;


-- =============================================================
-- 1) product_groups
-- =============================================================
create table if not exists product_groups (
  id             serial primary key,
  name           varchar(255) not null,
  slug           varchar(255) unique not null,
  description    text,
  image_url      text,
  condition_type varchar(20)  default 'manual',        -- 'manual' | 'automatic'
  is_active      boolean      default true,
  is_slider      boolean      default false,           -- Trang chủ: bật cờ này để hiện trong slider
  is_sale        boolean      default false,           -- TRUE: hiện ở menu SALE; FALSE: hiện ở menu SẢN PHẨM
  sort_order     integer      default 0,
  product_count  integer      default 0,
  created_at     timestamp    default now(),
  updated_at     timestamp    default now()
);

-- Tương thích cột product_count cho backend Express
alter table product_groups
  add column if not exists product_count integer default 0,
  add column if not exists is_sale      boolean default false;

-- Index lọc slider nhanh
create index if not exists idx_product_groups_slider
  on product_groups (is_slider) where is_slider = true;
create index if not exists idx_product_groups_sale
  on product_groups (is_sale) where is_sale = true;


-- =============================================================
-- 2) products
-- =============================================================
create table if not exists products (
  id            serial primary key,
  name          varchar(255)  not null,
  slug          varchar(255)  unique not null,
  description   text,
  group_id      integer       references product_groups(id) on delete set null,
  price         numeric(12,2) not null default 0,
  final_price   numeric(12,2),                        -- Giá sau giảm (tính sẵn)
  discount      numeric(5,2)  default 0,              -- % giảm
  stock         integer       default 0,
  sku           varchar(100)  unique,
  weight        numeric(10,2) default 0,
  weight_unit   varchar(5)    default 'g',
  height        numeric(8,2)  default 0,
  width         numeric(8,2)  default 0,
  length        numeric(8,2)  default 0,
  images        text[]        default '{}',            -- Mảng URL ảnh
  image_url     text,                                  -- Ảnh đại diện (cache lẫn với images[0])
  video_url     text,
  content_file  text,                                  -- URL file PDF / Word đính kèm
  pdf_name      varchar(255),
  brand         varchar(255),
  origin        varchar(255),
  material      varchar(255),
  barcode       varchar(100),
  gtin          varchar(100),
  category      varchar(255),
  rating        numeric(3,2)  default 5,
  reviews       integer       default 0,
  is_new        boolean       default false,
  is_active     boolean       default true,
  is_featured   boolean       default false,          -- Cờ "được phép" vào Danh mục nổi bật
  is_flash_sale boolean       default false,          -- Cờ "được phép" vào Flash sale
  percent_sold  integer       default 0,
  old_price     numeric(12,2),
  flash_sale_discount numeric(5,2),                   -- % giảm riêng cho Flash sale (null = không tham gia)
  flash_sale_end_at   timestamptz,                    -- Thời điểm kết thúc Flash sale
  cod_enabled   boolean       default true,
  shipping_type varchar(20)   default 'default',
  shipping_method varchar(20) default 'default',
  jt_fee_default numeric(10,2),
  is_calculating_fee boolean  default false,
  fee_error     text,
  status        varchar(20)   default 'active',        -- 'active'|'inactive'|'review'|'deleted'
  created_at    timestamp     default now(),
  updated_at    timestamp     default now()
);

-- Index lọc Flash sale
create index if not exists idx_products_flash_sale_discount
  on products (flash_sale_discount) where flash_sale_discount is not null;
create index if not exists idx_products_flash_sale_end_at
  on products (flash_sale_end_at);
create index if not exists idx_products_slug  on products (slug);
create index if not exists idx_products_group on products (group_id);


-- =============================================================
-- 3) product_shipping_services  (J&T theo từng sản phẩm)
-- =============================================================
create table if not exists product_shipping_services (
  id           serial primary key,
  product_id   integer references products(id) on delete cascade,
  service_code varchar(20)  not null,                 -- 'EZ' | 'FAST' | 'SUPER'
  service_name varchar(100),
  is_active    boolean default true
);


-- =============================================================
-- 4) customers  (Khách hàng mua hàng)
-- =============================================================
create table if not exists customers (
  id         serial primary key,
  name       varchar(255),
  email      varchar(255) unique,
  phone      varchar(20),
  password   varchar(255),                            -- bcrypt hash
  avatar_url text,
  address    text,
  province   varchar(100),
  district   varchar(100),
  ward       varchar(100),
  is_active  boolean   default true,
  created_at timestamp default now(),
  updated_at timestamp default now()
);


-- =============================================================
-- 5) orders + order_items
-- =============================================================
create table if not exists orders (
  id              serial primary key,
  order_code      varchar(50) unique,                 -- TC-YYYYMMDD-XXXX (tự sinh)
  customer_id     integer references customers(id) on delete set null,
  customer_name   varchar(255),                       -- Snapshot tên KH lúc đặt
  customer_phone  varchar(20),
  address         text,
  province        varchar(100),
  district        varchar(100),
  ward            varchar(100),
  total_price     numeric(12,2) default 0,
  shipping_fee    numeric(10,2) default 0,
  discount_amount numeric(10,2) default 0,
  final_price     numeric(12,2) default 0,            -- total - discount + ship
  payment_method  varchar(50)  default 'cod',         -- 'cod' | 'vnpay' | 'momo'
  payment_status  varchar(20)  default 'pending',     -- 'pending'|'paid'|'failed'
  status          varchar(30)  default 'pending',     -- 'pending'|'confirmed'|'shipping'|'done'|'cancelled'
  note            text,
  created_at      timestamp    default now(),
  updated_at      timestamp    default now()
);

create table if not exists order_items (
  id           serial primary key,
  order_id     integer       references orders(id)   on delete cascade,
  product_id   integer       references products(id) on delete set null,
  product_name varchar(255),                          -- Snapshot tên SP
  product_sku  varchar(100),
  image_url    text,
  quantity     integer       not null default 1,
  unit_price   numeric(12,2) not null,
  discount     numeric(5,2)  default 0,
  subtotal     numeric(12,2) not null
);


-- =============================================================
-- 6) admins  (Đăng nhập /admin)
-- =============================================================
create table if not exists admins (
  id         serial primary key,
  name       varchar(255),
  email      varchar(255) unique not null,
  password   varchar(255) not null,                   -- bcrypt hash
  role       varchar(20)  default 'admin',            -- 'superadmin' | 'admin'
  is_active  boolean      default true,
  created_at timestamp    default now()
);


-- =============================================================
-- 7) users  (Đăng ký / đăng nhập shop — backend Express)
-- =============================================================
create table if not exists users (
  id            serial primary key,
  username      varchar(50) unique not null,
  email         varchar(255) unique not null,
  password_hash text not null,                        -- bcrypt hash
  full_name     varchar(255),
  is_active     boolean     default true,
  role          varchar(20) default 'user',           -- 'admin' | 'user'
  created_at    timestamp   default now(),
  updated_at    timestamp   default now()
);

create index if not exists idx_users_username on users (username);
create index if not exists idx_users_email    on users (email);


-- =============================================================
-- 8) posts  (Bài viết / nội dung)
-- =============================================================
create table if not exists posts (
  id           serial primary key,
  title        varchar(500) not null,
  slug         varchar(500) unique not null,
  content      text,
  thumbnail    text,
  status       varchar(20) default 'draft',           -- 'draft' | 'published'
  author_id    integer     references admins(id) on delete set null,
  published_at timestamp,
  created_at   timestamp   default now(),
  updated_at   timestamp   default now()
);


-- =============================================================
-- 9) homepage_banners
-- =============================================================
create table if not exists homepage_banners (
  id         serial primary key,
  title      varchar(255),
  image_url  text not null,
  link_url   text,
  sort_order integer  default 0,
  is_active  boolean  default true,
  created_at timestamp default now()
);


-- =============================================================
-- 10) homepage_sections + homepage_section_products
-- =============================================================
create table if not exists homepage_sections (
  id          serial primary key,
  section_key varchar(50) unique not null,            -- 'featured' | 'sale' | 'new_arrivals'
  title       varchar(255),
  is_active   boolean default true,
  sort_order  integer default 0
);

create table if not exists homepage_section_products (
  id         serial primary key,
  section_id integer references homepage_sections(id) on delete cascade,
  product_id integer references products(id)         on delete cascade,
  sort_order integer default 0
);


-- =============================================================
-- 11) homepage_config  (Cấu hình trang chủ — 1 dòng duy nhất)
-- =============================================================
create table if not exists homepage_config (
  id          int primary key default 1,
  background  jsonb not null default '{
    "type": "color",
    "color": "#6a11cb",
    "imageUrl": "",
    "videoUrl": ""
  }'::jsonb,
  hero        jsonb not null default '{
    "enabled": true,
    "imageUrl": "",
    "title": "Chào mừng đến với Techtra Shop",
    "subtitle": "Cửa hàng công nghệ — uy tín, chất lượng, giao hàng toàn quốc",
    "ctaText": "Khám phá ngay",
    "ctaLink": "/san-pham"
  }'::jsonb,
  sections    jsonb not null default '{
    "heroSlider":   true,
    "brandValues":  true,
    "categories":   true,
    "flashSale":    true,
    "bestSellers":  true,
    "promoBanners": true,
    "blog":         true,
    "newsletter":   true
  }'::jsonb,
  flash_sale  jsonb not null default '{
    "title": "Giờ Vàng Deal Xịn",
    "countdownSeconds": 10800,
    "enabled": true
  }'::jsonb,
  updated_at  timestamptz default now(),
  constraint single_row check (id = 1)
);

insert into homepage_config (id) values (1) on conflict (id) do nothing;


-- =============================================================
-- 12) homepage_values  (4 thẻ giá trị thương hiệu)
-- =============================================================
create table if not exists homepage_values (
  id          uuid primary key default gen_random_uuid(),
  icon        text not null default 'fas fa-seedling',
  title       text not null,
  description text,
  sort_order  int  default 0,
  enabled     boolean default true,
  created_at  timestamptz default now()
);


-- =============================================================
-- 13) homepage_promo_banners  (2 banner quảng cáo trái/phải)
-- =============================================================
create table if not exists homepage_promo_banners (
  id         uuid primary key default gen_random_uuid(),
  position   text not null check (position in ('left', 'right')),
  tag        text,
  title      text not null,
  image_url  text,
  cta_text   text default 'Mua ngay',
  cta_link   text default '#',
  sort_order int  default 0,
  enabled    boolean default true,
  created_at timestamptz default now()
);


-- =============================================================
-- 14) homepage_articles  (Bài viết / tài liệu PDF, Word)
-- =============================================================
create table if not exists homepage_articles (
  id         uuid primary key default gen_random_uuid(),
  type       text not null check (type in ('link', 'file')),
  title      text not null,
  url        text,
  file_url   text,
  file_name  text,
  file_size  bigint,
  created_at timestamptz default now()
);


-- =============================================================
-- 15) homepage_blog  (Góc chia sẻ)
-- =============================================================
create table if not exists homepage_blog (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  author      text default 'Admin',
  image_url   text,
  link        text default '#',
  sort_order  int  default 0,
  enabled     boolean default true,
  created_at  timestamptz default now()
);


-- =============================================================
-- 16) homepage_picks  (Sắp xếp slider — legacy)
-- =============================================================
create table if not exists homepage_picks (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('slider', 'featured', 'flash_sale')),
  target_id    text not null,                         -- products.id (text/uuid) hoặc product_groups.id
  target_kind  text not null check (target_kind in ('product', 'group')),
  custom_title text,                                  -- Tiêu đề tuỳ chỉnh (ưu tiên hơn title gốc)
  custom_image text,                                  -- Ảnh tuỳ chỉnh (ưu tiên hơn ảnh gốc)
  sort_order   int  default 0,
  enabled      boolean default true,
  created_at   timestamptz default now()
);

create unique index if not exists uq_homepage_picks
  on homepage_picks (kind, target_id);
create index if not exists idx_homepage_picks_kind_order
  on homepage_picks (kind, sort_order);


-- =============================================================
-- 17) transactions  (Sổ quỹ / doanh thu — dashboard)
-- =============================================================
create table if not exists transactions (
  id          serial primary key,
  order_id    integer references orders(id) on delete set null,
  type        varchar(20)   not null,                 -- 'income' | 'expense' | 'refund'
  amount      numeric(12,2) not null,
  description text,
  created_at  timestamp     default now()
);


-- =============================================================
-- 18) TRIGGERS + FUNCTIONS
-- =============================================================

-- Tự sinh mã đơn hàng TC-YYYYMMDD-XXXX
create or replace function generate_order_code()
returns trigger as $$
begin
  new.order_code := 'TC-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(new.id::text, 4, '0');
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_order_code on orders;
create trigger trg_order_code
  before insert on orders
  for each row
  when (new.order_code is null)
  execute function generate_order_code();


-- Tự cập nhật updated_at khi UPDATE
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_product_groups_upd  on product_groups;
drop trigger if exists trg_products_upd        on products;
drop trigger if exists trg_customers_upd       on customers;
drop trigger if exists trg_orders_upd          on orders;
drop trigger if exists trg_users_upd           on users;
drop trigger if exists trg_posts_upd           on posts;

create trigger trg_product_groups_upd before update on product_groups for each row execute function update_updated_at();
create trigger trg_products_upd       before update on products       for each row execute function update_updated_at();
create trigger trg_customers_upd      before update on customers      for each row execute function update_updated_at();
create trigger trg_orders_upd         before update on orders         for each row execute function update_updated_at();
create trigger trg_users_upd          before update on users          for each row execute function update_updated_at();
create trigger trg_posts_upd          before update on posts          for each row execute function update_updated_at();


-- =============================================================
-- 19) ROW LEVEL SECURITY  (mở quyền cho anon trên Supabase)
-- =============================================================
alter table products               enable row level security;
alter table product_groups         enable row level security;
alter table customers              enable row level security;
alter table orders                 enable row level security;
alter table order_items            enable row level security;
alter table admins                 enable row level security;
alter table users                  enable row level security;
alter table posts                  enable row level security;
alter table homepage_banners       enable row level security;
alter table homepage_sections      enable row level security;
alter table homepage_section_products enable row level security;
alter table homepage_config        enable row level security;
alter table homepage_values        enable row level security;
alter table homepage_promo_banners enable row level security;
alter table homepage_articles      enable row level security;
alter table homepage_blog          enable row level security;
alter table homepage_picks         enable row level security;
alter table transactions           enable row level security;

-- ── Helper: tạo policy "allow_all_<table>" cho mọi bảng ─────────
do $$
declare
  t text;
  tbls text[] := array[
    'products', 'product_groups', 'customers', 'orders', 'order_items',
    'admins', 'users', 'posts',
    'homepage_banners', 'homepage_sections', 'homepage_section_products',
    'homepage_config', 'homepage_values', 'homepage_promo_banners',
    'homepage_articles', 'homepage_blog', 'homepage_picks', 'transactions'
  ];
begin
  foreach t in array tbls loop
    execute format('drop policy if exists "allow_all_%s" on %I', t, t);
    execute format(
      'create policy "allow_all_%s" on %I for all using (true) with check (true)',
      t, t
    );
  end loop;
end $$;


-- =============================================================
-- 20) STORAGE BUCKETS + POLICIES
-- Tạo 2 bucket public + mở quyền CRUD cho anon.
-- Lưu ý: Supabase lưu bucket ở schema `storage`, bảng `storage.buckets`.
-- =============================================================

-- ── 20.1 TẠO BUCKET (idempotent nhờ ON CONFLICT) ─────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images',  'product-images',  true, 52428800, null),  -- 50 MB, mọi MIME
  ('homepage-assets', 'homepage-assets', true, 52428800, null)
on conflict (id) do update
  set public          = excluded.public,
      file_size_limit = excluded.file_size_limit;

-- ── 20.2 XOÁ POLICY CŨ (nếu có) ─────────────────────────────────
drop policy if exists "Allow public upload"  on storage.objects;
drop policy if exists "Allow public read"    on storage.objects;
drop policy if exists "Allow public update"  on storage.objects;
drop policy if exists "Allow public delete"  on storage.objects;
drop policy if exists "Allow anon upload"    on storage.objects;
drop policy if exists "Allow anon select"    on storage.objects;

-- ── 20.3 TẠO POLICY MỚI (cho cả 2 bucket) ──────────────────────
-- Insert
create policy "Allow public upload"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id in ('product-images', 'homepage-assets'));

-- Select (đọc / lấy URL public)
create policy "Allow public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id in ('product-images', 'homepage-assets'));

-- Update (ghi đè file)
create policy "Allow public update"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id in ('product-images', 'homepage-assets'))
  with check (bucket_id in ('product-images', 'homepage-assets'));

-- Delete
create policy "Allow public delete"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id in ('product-images', 'homepage-assets'));


-- =============================================================
-- 21) DỮ LIỆU MẪU  (chạy lại nhiều lần đều OK)
-- =============================================================

-- Admin mặc định (password: admin123 — bcrypt hash placeholder, đổi ngay)
insert into admins (name, email, password, role) values
  ('Super Admin', 'admin@techtra.vn', '$2b$10$placeholder_hash_change_me', 'superadmin')
on conflict (email) do nothing;

-- User mặc định cho shop (password: user123 — placeholder)
insert into users (username, email, password_hash, full_name, role) values
  ('admin', 'admin@techtra.vn', '$2b$10$placeholder_admin_hash', 'Quản trị viên', 'admin'),
  ('user',  'user@techtra.vn',  '$2b$10$placeholder_user_hash',  'Khách hàng',    'user')
on conflict (username) do nothing;

-- Nhóm sản phẩm mẫu
insert into product_groups (name, slug, description, is_active, is_slider, sort_order) values
  ('Sản phẩm nổi bật',  'san-pham-noi-bat',  'Các sản phẩm bán chạy nhất', true, true,  1),
  ('Sản phẩm khuyến mãi','san-pham-khuyen-mai','Đang giảm giá',             true, false, 2),
  ('Trang chủ',          'trang-chu',          'Hiển thị trên trang chủ',   true, true,  3)
on conflict (slug) do nothing;

-- Section trang chủ mẫu (cho schema cũ homepage_sections)
insert into homepage_sections (section_key, title, is_active, sort_order) values
  ('featured',     'Sản phẩm nổi bật', true, 1),
  ('sale',         'Đang giảm giá',    true, 2),
  ('new_arrivals', 'Hàng mới về',      true, 3)
on conflict (section_key) do nothing;

-- Giá trị thương hiệu mẫu (homepage_values)
insert into homepage_values (icon, title, description, sort_order) values
  ('fas fa-seedling',     '100% Thiên Nhiên',   'Nguyên liệu thuần thực vật tinh khiết từ vườn dược liệu Việt Nam', 1),
  ('fas fa-shield-heart', 'Lành và Thật',       'Công thức tối giản, không chất bảo quản độc hại, cam kết công khai thành phần', 2),
  ('fas fa-industry',     'Nhà Máy Đạt CGMP',   'Quy trình sản xuất khép kín, vô trùng đạt chứng nhận CGMP ASEAN', 3),
  ('fas fa-baby',         'An Toàn Cho Bé & Bầu','Mỹ phẩm siêu lành tính, được khuyên dùng bởi các chuyên gia y tế', 4)
on conflict do nothing;

-- 2 banner quảng cáo mẫu
insert into homepage_promo_banners (position, tag, title, cta_text, cta_link, sort_order) values
  ('left',  'Quà tặng ngọt ngào',  'Combo Quà Tặng Cho Nửa Yêu Thương',  'Mua ngay',  '#', 1),
  ('right', 'Liệu pháp phục hồi',  'Chăm Sóc Tóc Dược Liệu Bưởi Đỏ',     'Khám phá',  '#', 2)
on conflict do nothing;

-- 3 bài blog mẫu
insert into homepage_blog (title, description, author, sort_order) values
  ('Top 5 Thành Phần Thiên Nhiên Giúp Phục Hồi Tóc Rụng Cực Nhạy',
   'Khám phá bí quyết chăm sóc tóc thảo dược an toàn hiệu quả từ tinh dầu bưởi, bồ kết, hương nhu cô đặc.',
   'Dược sĩ Cỏ Mềm', 1),
  ('Bầu Bí Vẫn Xinh Rạng Ngời Nhờ 4 Bước Chăm Da Tối Giản Này',
   'Mẹo thiết lập chu trình dưỡng da lành tính, cam kết 100% không chứa silicon, parabens và hóa chất độc hại.',
   'Skin Specialist', 2),
  ('Chiến Dịch Trồng Rừng Giữ Đất: Cỏ Mềm Đồng Hành Cùng Hành Tinh Xanh',
   'Hành trình phủ xanh các vạt đồi trống miền Trung với hơn 10,000 cây xanh và cam kết giảm thiểu rác thải nhựa.',
   'Green Life', 3)
on conflict do nothing;


-- =============================================================
-- 22) LÀM MỚI CACHE SCHEMA SUPABASE
-- =============================================================
notify pgrst, 'reload schema';


-- =============================================================
-- HẾT — Toàn bộ schema của dự án Techtra Shop đã sẵn sàng.
-- =============================================================
-- HƯỚNG DẪN SỬ DỤNG:
--  1. Chạy file này trong Supabase SQL Editor HOẶC
--     docker exec -i techtra-db psql -U postgres -d techtra < techtra_complete_schema.sql
--  2. Bucket Storage "product-images" và "homepage-assets" đã được
--     tạo tự động bởi file này — KHÔNG cần tạo thủ công nữa.
--  3. Đăng nhập Admin với:
--     email:    admin@techtra.vn
--     password: admin123    (hash placeholder — đổi bằng API register)
-- =============================================================
 alter table product_groups
    add column if not exists parent_id       integer references product_groups(id) on delete cascade,
    add column if not exists slider_text     text,
    add column if not exists intro_title     text,
    add column if not exists intro_subtitle  text,
    add column if not exists intro_image_url text;
  create index if not exists idx_product_groups_parent on product_groups (parent_id);

  
  alter table posts
    add column if not exists source_url       text,
    add column if not exists site_name        varchar(255),
    add column if not exists summary          text,
    add column if not exists excerpt_html     text,
    add column if not exists thumbnail_source text;

  create index if not exists idx_posts_source     on posts (source_url);
  create index if not exists idx_posts_status_pub on posts (status, published_at desc);