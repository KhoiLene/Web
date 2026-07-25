-- =============================================================
-- TECHTRA SHOP — FULL DATABASE SCHEMA (tất cả chức năng đã code)
-- Project Supabase: https://pbuqcvlcqrxdammvbwvs.supabase.co
-- Updated: 2026-07-13
-- -------------------------------------------------------------
-- Mục đích: 1 file SQL DUY NHẤT cho toàn bộ dự án.
--   • Postgres cho backend Express  (chạy local bằng Docker)
--   • Supabase Postgres cho FE      (chạy trong SQL Editor)
-- Tất cả bảng/cột/policy đều idempotent — chạy nhiều lần OK.
--
-- Bao gồm (cập nhật đến 2026-07-13):
--   §0  Extensions + GRANT schema public (fix lỗi permission)
--   §1  product_groups           — Nhóm sản phẩm (có parent_id, slider_text, intro_*)
--   §2  products                 — Sản phẩm (mặc định ẨN khi tạo, có flash sale)
--   §3  price_list               — Bảng giá SKU (import vào products)
--   §4  product_shipping_services — Dịch vụ vận chuyển J&T
--   §5  customers                — Khách hàng
--   §6  orders / order_items     — Đơn hàng + chi tiết
--   §7  admins                   — Tài khoản admin
--   §8  users                    — Tài khoản người dùng (auth shop)
--   §9  posts                    — Bài viết / nội dung (có source_url, summary, excerpt_html)
--   §10 homepage_banners
--   §11 homepage_sections + homepage_section_products
--   §12 homepage_config          — Cấu hình trang chủ (background/hero/sections/flashSale)
--   §13 homepage_values          — 4 thẻ giá trị thương hiệu
--   §14 homepage_promo_banners   — 2 banner quảng cáo
--   §15 homepage_articles        — Bài viết / tài liệu (đã loại bỏ khỏi HomePage UI)
--   §16 homepage_blog            — Góc chia sẻ
--   §17 homepage_picks           — Sắp xếp slider (UNIQUE kind+target_id)
--   §18 transactions             — Sổ quỹ / doanh thu
--   §19 Triggers + Functions     — generate_order_code, update_updated_at
--   §20 RLS policies             — allow_all_<table> cho từng bảng
--   §21 Storage buckets + policies (product-images, homepage-assets)
--   §22 Dữ liệu mẫu
--   §23 Reload PostgREST cache
-- =============================================================


-- =============================================================
-- §0  EXTENSIONS + QUYỀN TRUY CẬP SCHEMA PUBLIC
-- =============================================================
create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- Supabase mặc định TẮT quyền USAGE trên schema `public` đối với role
-- `anon` và `authenticated`. Dù đã tạo bảng + policy, FE vẫn bị từ
-- chối ở bước resolve schema. GRANT lại là fix triệt để.
grant usage on schema public to anon, authenticated, service_role;

grant all privileges on all tables    in schema public to anon, authenticated, service_role;
grant all privileges on all sequences in schema public to anon, authenticated, service_role;
grant all privileges on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all privileges on tables    to anon, authenticated, service_role;
alter default privileges in schema public
  grant all privileges on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all privileges on functions to anon, authenticated, service_role;


-- =============================================================
-- §1  product_groups
-- =============================================================
create table if not exists product_groups (
  id             serial primary key,
  name           varchar(255) not null,
  slug           varchar(255) unique not null,
  description    text,
  image_url      text,
  condition_type varchar(20)  default 'manual',        -- 'manual' | 'automatic'
  is_active      boolean      default true,
  is_slider      boolean      default false,           -- Bật cờ này để hiện trong slider trang chủ
  sort_order     integer      default 0,
  product_count  integer      default 0,
  created_at     timestamp    default now(),
  updated_at     timestamp    default now()
);

-- Cột bổ sung cho nhóm: cha-con + slider/intro
alter table product_groups
  add column if not exists parent_id       integer references product_groups(id) on delete cascade,
  add column if not exists slider_text     text,
  add column if not exists intro_title     text,
  add column if not exists intro_subtitle  text,
  add column if not exists intro_image_url text;

create index if not exists idx_product_groups_slider
  on product_groups (is_slider) where is_slider = true;
create index if not exists idx_product_groups_parent
  on product_groups (parent_id);


-- =============================================================
-- §2  products
-- -------------------------------------------------------------
-- Lưu ý: is_active mặc định FALSE — SP mới tạo (kể cả import từ
-- price_list) sẽ ẨN trên web cho tới khi admin bật tay (yêu cầu
-- "sản phẩm mới chưa có đủ thông tin thì ẩn trên web").
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
  images        text[]        default '{}',            -- Mảng URL ảnh (ảnh[0] = ảnh chính)
  image_url     text,                                  -- Cache ảnh đại diện (= images[0])
  video_url     text,
  content_file  text,                                  -- URL file PDF/Word đính kèm
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
  -- ⚠ MẶC ĐỊNH FALSE: SP mới tạo ẩn trên web (xem chú thích đầu mục §2)
  is_active     boolean       default false,
  is_featured   boolean       default false,          -- Được phép vào "Danh mục nổi bật"
  is_flash_sale boolean       default false,          -- Được phép vào "Flash sale"
  percent_sold  integer       default 0,
  old_price     numeric(12,2),
  flash_sale_discount numeric(5,2),                   -- % giảm riêng cho Flash sale
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

create index if not exists idx_products_flash_sale_discount
  on products (flash_sale_discount) where flash_sale_discount is not null;
create index if not exists idx_products_flash_sale_end_at
  on products (flash_sale_end_at);
create index if not exists idx_products_slug       on products (slug);
create index if not exists idx_products_group      on products (group_id);
create index if not exists idx_products_status_act on products (status) where status = 'active';
create index if not exists idx_products_is_active  on products (is_active) where is_active = true;


-- =============================================================
-- §3  price_list  (bảng giá — 1 dòng = 1 SKU; import sang products)
-- =============================================================
create table if not exists price_list (
  id          serial primary key,
  sku         varchar(100) unique not null,
  product_id  integer references products(id)         on delete set null,
  name        varchar(255) not null,
  group_id    integer references product_groups(id)  on delete set null,
  group_name  varchar(255),
  price       numeric(12,2) not null default 0,
  discount    numeric(5,2)  default 0,
  final_price numeric(12,2),
  stock       integer       default 0,
  unit        varchar(20)   default 'cái',
  note        text,
  is_active   boolean       default true,
  sort_order  integer       default 0,
  created_at  timestamp     default now(),
  updated_at  timestamp     default now()
);

create index if not exists idx_price_list_sku    on price_list (sku);
create index if not exists idx_price_list_group  on price_list (group_id);
create index if not exists idx_price_list_active on price_list (is_active);


-- =============================================================
-- §4  product_shipping_services  (J&T theo từng sản phẩm)
-- =============================================================
create table if not exists product_shipping_services (
  id           serial primary key,
  product_id   integer references products(id) on delete cascade,
  service_code varchar(20)  not null,                 -- 'EZ' | 'FAST' | 'SUPER'
  service_name varchar(100),
  is_active    boolean default true
);


-- =============================================================
-- §5  customers  (Khách hàng mua hàng)
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
-- §6  orders + order_items
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
-- §7  admins  (Đăng nhập /admin)
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
-- §8  users  (Đăng ký / đăng nhập shop — backend Express)
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
-- §9  posts  (Bài viết / trang đọc báo)
-- -------------------------------------------------------------
-- Cột bổ sung (idempotent):
--   source_url        — link gốc bài báo (sau khi scrape)
--   site_name         — tên site: VnExpress, Tuổi Trẻ…
--   summary           — tóm tắt ngắn 2-3 dòng
--   excerpt_html      — nội dung HTML đã scrape (Readability)
--   thumbnail_source  — URL ảnh đại diện lấy từ scrape
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

alter table posts
  add column if not exists source_url       text,
  add column if not exists site_name        varchar(255),
  add column if not exists summary          text,
  add column if not exists excerpt_html     text,
  add column if not exists thumbnail_source text;

create index if not exists idx_posts_source     on posts (source_url);
create index if not exists idx_posts_status_pub on posts (status, published_at desc);


-- =============================================================
-- §9.1  news_categories  (Nhóm tin tức 2 cấp: cha → con → bài)
-- -------------------------------------------------------------
-- Bài viết (`posts.category_id`) tham chiếu tới id nhóm CON
-- (parent_id IS NOT NULL). Mỗi nhóm CON thuộc 1 nhóm CHA
-- (parent_id = root.id) hoặc là gốc (parent_id IS NULL).
-- Xoá nhóm cha → cascade xoá nhóm con.
-- Xoá nhóm con → bài viết set category_id = NULL (không cascade).
-- =============================================================
create table if not exists news_categories (
  id          serial primary key,
  name        varchar(255) not null,
  slug        varchar(255) unique not null,
  description text,
  icon        varchar(100),                          -- FontAwesome class (vd: 'fas fa-heart')
  image_url   text,                                  -- Ảnh minh hoạ nhóm
  parent_id   integer references news_categories(id) on delete cascade,
  sort_order  integer      default 0,
  is_active   boolean      default true,
  created_at  timestamp    default now(),
  updated_at  timestamp    default now()
);

create index if not exists idx_news_categories_parent on news_categories (parent_id);
create index if not exists idx_news_categories_active on news_categories (is_active) where is_active = true;
create index if not exists idx_news_categories_order  on news_categories (sort_order);

-- Cột mới cho `posts`: gắn nhóm + hỗ trợ upload file PDF/Word
alter table posts
  add column if not exists category_id integer references news_categories(id) on delete set null,
  add column if not exists file_url    text,
  add column if not exists file_name   varchar(255),
  add column if not exists file_size   bigint,
  add column if not exists post_type   varchar(20) default 'link';
  -- post_type: 'link' | 'file' | 'scraped' | 'manual'

create index if not exists idx_posts_category on posts (category_id);
create index if not exists idx_posts_type     on posts (post_type);


-- =============================================================
-- §10  homepage_banners
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
-- §11  homepage_sections + homepage_section_products
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
-- §12  homepage_config  (Cấu hình trang chủ — 1 dòng duy nhất)
-- -------------------------------------------------------------
-- Cấu trúc JSONB:
--   background : { type: 'color'|'image'|'video', color, imageUrl, videoUrl }
--   hero       : { enabled, imageUrl, title, subtitle, ctaText, ctaLink }
--   sections   : { heroSlider, brandValues, categories, flashSale,
--                  bestSellers, promoBanners, blog, newsletter }
--   flash_sale : { title, enabled }   ← KHÔNG còn countdownSeconds (mặc định)
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
    "enabled": true
  }'::jsonb,
  updated_at  timestamptz default now(),
  constraint single_row check (id = 1)
);

insert into homepage_config (id) values (1) on conflict (id) do nothing;


-- =============================================================
-- §13  homepage_values  (4 thẻ giá trị thương hiệu)
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
-- §14  homepage_promo_banners  (2 banner quảng cáo trái/phải)
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
-- §15  homepage_articles  (Bài viết / tài liệu PDF, Word)
-- -------------------------------------------------------------
-- Bảng vẫn còn trong DB vì có thể dùng lại; hiện tại HomePage UI
-- đã bỏ phần "Articles" (theo yêu cầu 2026-07-13) nhưng KHÔNG xóa
-- bảng để không phá dữ liệu cũ.
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
-- §16  homepage_blog  (Góc chia sẻ)
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
-- §17  homepage_picks  (Sắp xếp slider — featured/flash_sale/slider)
-- -------------------------------------------------------------
-- Ràng buộc UNIQUE (kind, target_id) để khi upsert trong admin không
-- bị thêm trùng 1 sản phẩm 2 lần vào cùng 1 block.
-- =============================================================
create table if not exists homepage_picks (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('slider', 'featured', 'flash_sale')),
  target_id    text not null,                         -- products.id (text/uuid) hoặc product_groups.id
  target_kind  text not null check (target_kind in ('product', 'group')),
  custom_title text,
  custom_image text,
  sort_order   int  default 0,
  enabled      boolean default true,
  created_at   timestamptz default now()
);

create unique index if not exists uq_homepage_picks
  on homepage_picks (kind, target_id);
create index if not exists idx_homepage_picks_kind_order
  on homepage_picks (kind, sort_order);


-- =============================================================
-- §18  transactions  (Sổ quỹ / doanh thu — dashboard)
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
-- §19  TRIGGERS + FUNCTIONS
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

drop trigger if exists trg_product_groups_upd    on product_groups;
drop trigger if exists trg_products_upd          on products;
drop trigger if exists trg_price_list_upd        on price_list;
drop trigger if exists trg_customers_upd         on customers;
drop trigger if exists trg_orders_upd            on orders;
drop trigger if exists trg_users_upd             on users;
drop trigger if exists trg_posts_upd             on posts;
drop trigger if exists trg_news_categories_upd   on news_categories;

create trigger trg_product_groups_upd    before update on product_groups   for each row execute function update_updated_at();
create trigger trg_products_upd          before update on products         for each row execute function update_updated_at();
create trigger trg_price_list_upd        before update on price_list       for each row execute function update_updated_at();
create trigger trg_customers_upd         before update on customers        for each row execute function update_updated_at();
create trigger trg_orders_upd            before update on orders           for each row execute function update_updated_at();
create trigger trg_users_upd             before update on users            for each row execute function update_updated_at();
create trigger trg_posts_upd             before update on posts            for each row execute function update_updated_at();
create trigger trg_news_categories_upd   before update on news_categories  for each row execute function update_updated_at();


-- =============================================================
-- §20  ROW LEVEL SECURITY  (mở quyền cho anon trên Supabase)
-- =============================================================
alter table products               enable row level security;
alter table product_groups         enable row level security;
alter table price_list             enable row level security;
alter table product_shipping_services enable row level security;
alter table customers              enable row level security;
alter table orders                 enable row level security;
alter table order_items            enable row level security;
alter table admins                 enable row level security;
alter table users                  enable row level security;
alter table posts                  enable row level security;
alter table news_categories        enable row level security;
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

-- Tạo policy "allow_all_<table>" cho từng bảng
do $$
declare
  t text;
  tbls text[] := array[
    'products', 'product_groups', 'price_list', 'product_shipping_services',
    'customers', 'orders', 'order_items',
    'admins', 'users', 'posts', 'news_categories',
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
-- §21  STORAGE BUCKETS + POLICIES
-- Tạo 2 bucket public + mở quyền CRUD cho anon.
-- Skip in standard PostgreSQL (Supabase-only feature)
-- =============================================================
do $
begin
  -- Check if storage schema exists (Supabase-specific)
  if exists (select 1 from information_schema.schemas where schema_name = 'storage') then
    -- 21.1 TẠO BUCKET (idempotent nhờ ON CONFLICT)
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values
      ('product-images',  'product-images',  true, 52428800, null),  -- 50 MB, mọi MIME
      ('homepage-assets', 'homepage-assets', true, 52428800, null)
    on conflict (id) do update
      set public          = excluded.public,
          file_size_limit = excluded.file_size_limit;

    -- 21.2 XOÁ POLICY CŨ (nếu có)
    drop policy if exists "Allow public upload"  on storage.objects;
    drop policy if exists "Allow public read"    on storage.objects;
    drop policy if exists "Allow public update"  on storage.objects;
    drop policy if exists "Allow public delete"  on storage.objects;
    drop policy if exists "Allow anon upload"    on storage.objects;
    drop policy if exists "Allow anon select"    on storage.objects;

    -- 21.3 TẠO POLICY MỚI (cho cả 2 bucket)
    create policy "Allow public upload"
      on storage.objects for insert
      to anon, authenticated
      with check (bucket_id in ('product-images', 'homepage-assets'));

    create policy "Allow public read"
      on storage.objects for select
      to anon, authenticated
      using (bucket_id in ('product-images', 'homepage-assets'));

    create policy "Allow public update"
      on storage.objects for update
      to anon, authenticated
      using (bucket_id in ('product-images', 'homepage-assets'))
      with check (bucket_id in ('product-images', 'homepage-assets'));

    create policy "Allow public delete"
      on storage.objects for delete
      to anon, authenticated
      using (bucket_id in ('product-images', 'homepage-assets'));
  end if;
end $;


-- =============================================================
-- §22  DỮ LIỆU MẪU  (chạy lại nhiều lần đều OK)
-- =============================================================

-- Admin mặc định (password: admin123 — đổi ngay)
insert into admins (name, email, password, role) values
  ('Super Admin', 'admin@techtra.vn', '$2b$10$placeholder_hash_change_me', 'superadmin')
on conflict (email) do nothing;

-- User mặc định cho shop
insert into users (username, email, password_hash, full_name, role) values
  ('admin', 'admin@techtra.vn', '$2b$10$placeholder_admin_hash', 'Quản trị viên', 'admin'),
  ('user',  'user@techtra.vn',  '$2b$10$placeholder_user_hash',  'Khách hàng',    'user')
on conflict (username) do nothing;

-- Nhóm sản phẩm mẫu
insert into product_groups (name, slug, description, is_active, is_slider, sort_order) values
  ('Sản phẩm nổi bật',   'san-pham-noi-bat',   'Các sản phẩm bán chạy nhất', true, true,  1),
  ('Sản phẩm khuyến mãi', 'san-pham-khuyen-mai', 'Đang giảm giá',             true, false, 2),
  ('Trang chủ',           'trang-chu',           'Hiển thị trên trang chủ',   true, true,  3)
on conflict (slug) do nothing;

-- Section trang chủ mẫu
insert into homepage_sections (section_key, title, is_active, sort_order) values
  ('featured',     'Sản phẩm nổi bật', true, 1),
  ('sale',         'Đang giảm giá',    true, 2),
  ('new_arrivals', 'Hàng mới về',      true, 3)
on conflict (section_key) do nothing;

-- Bảng giá mẫu (import vào products)
insert into price_list (sku, name, price, discount, final_price, stock, unit, sort_order) values
  ('SP001', 'Nước rửa bát Techtra 750ml', 89000,  10,  80100, 100, 'chai', 1),
  ('SP002', 'Bột giặt Techtra 3kg',       165000, 15, 140250,  60, 'túi',  2),
  ('SP003', 'Nước lau sàn Techtra 1L',    55000,  0,  55000, 200, 'chai', 3)
on conflict (sku) do nothing;

-- 4 thẻ giá trị thương hiệu mẫu
insert into homepage_values (icon, title, description, sort_order) values
  ('fas fa-seedling',     '100% Thiên Nhiên',   'Nguyên liệu thuần thực vật tinh khiết từ vườn dược liệu Việt Nam', 1),
  ('fas fa-shield-heart', 'Lành và Thật',       'Công thức tối giản, không chất bảo quản độc hại, cam kết công khai thành phần', 2),
  ('fas fa-industry',     'Nhà Máy Đạt CGMP',   'Quy trình sản xuất khép kín, vô trùng đạt chứng nhận CGMP ASEAN', 3),
  ('fas fa-baby',         'An Toàn Cho Bé & Bầu','Mỹ phẩm siêu lành tính, được khuyên dùng bởi các chuyên gia y tế', 4)
on conflict do nothing;

-- 2 banner quảng cáo mẫu
insert into homepage_promo_banners (position, tag, title, cta_text, cta_link, sort_order) values
  ('left',  'Quà tặng ngọt ngào',  'Combo Quà Tặng Cho Nửa Yêu Thương', 'Mua ngay',  '#', 1),
  ('right', 'Liệu pháp phục hồi',  'Chăm Sóc Tóc Dược Liệu Bưởi Đỏ',    'Khám phá',  '#', 2)
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

-- Nhóm tin tức mẫu (4 nhóm CHA — dùng làm mega-menu BÀI VIẾT)
insert into news_categories (name, slug, description, icon, parent_id, sort_order, is_active) values
  ('Chăm sóc cơ thể', 'cham-soc-co-the', 'Bí quyết chăm sóc cơ thể toàn diện',  'fas fa-spa',         NULL, 1, true),
  ('Chăm sóc da',     'cham-soc-da',     'Làm đẹp & dưỡng da chuẩn khoa học',   'fas fa-leaf',         NULL, 2, true),
  ('Chăm sóc tóc',    'cham-soc-toc',    'Phục hồi tóc hư tổn',                'fas fa-magic',        NULL, 3, true),
  ('Cẩm nang',        'cam-nang',        'Mẹo vặt & tin tức hữu ích',           'fas fa-book-open',    NULL, 4, true)
on conflict (slug) do nothing;

-- Nhóm CON mẫu (3 con cho "Chăm sóc cơ thể" — để demo cây 2 cấp)
insert into news_categories (name, slug, description, icon, parent_id, sort_order, is_active)
select v.name, v.slug, v.description, v.icon, p.id, v.sort_order, true
from (values
  ('Chăm sóc môi',         'cham-soc-moi',         'Dưỡng môi mềm mại',         'fas fa-kiss-wink-heart', 1),
  ('Chăm sóc tay & chân',  'cham-soc-tay-chan',    'Da tay chân mịn màng',      'fas fa-hand-paper',      2),
  ('Chăm sóc mẹ & bé',     'cham-soc-me-be',       'An toàn cho cả mẹ và bé',   'fas fa-baby',            3)
) as v(name, slug, description, icon, sort_order)
cross join lateral (
  select id from news_categories where slug = 'cham-soc-co-the' limit 1
) as p
where not exists (select 1 from news_categories nc where nc.slug = v.slug);


-- =============================================================
-- §23  LÀM MỚI CACHE SCHEMA SUPABASE
-- =============================================================
notify pgrst, 'reload schema';


-- =============================================================
-- HẾT — Toàn bộ schema Techtra Shop đã sẵn sàng.
-- =============================================================
-- HƯỚNG DẪN SỬ DỤNG:
--  1. Chạy file này trong Supabase SQL Editor HOẶC
--     docker exec -i techtra-db psql -U postgres -d techtra < techtra_full_schema.sql
--  2. Storage bucket "product-images" và "homepage-assets" đã tạo tự động.
--  3. Admin mặc định:
--     email:    admin@techtra.vn
--     password: admin123   (hash placeholder — đổi bằng API register)
--  4. Sau khi chạy:
--     • Nhớ reload PostgREST cache (dòng §23 đã làm)
--     • Trong admin: tab "Trên kệ" → chip "🙈 Đang ẩn" sẽ thấy
--       các SP mới (is_active=false) đang chờ bổ sung thông tin
-- =============================================================
-- =============================================================
-- FIX: TẠO LẠI BẢNG price_list  (chạy 1 lần duy nhất trong Supabase SQL Editor)
-- Project: https://pbuqcvlcqrxdammvbwvs.supabase.co
-- =============================================================
-- Nếu bảng đã tồn tại nhưng RLS chặn → đoạn này sẽ mở khóa.
-- Nếu bảng chưa từng tồn tại → đoạn này tạo mới từ đầu.

-- BƯỚC 1: Tháo mọi policy cũ + xóa bảng nếu đang tồn tại dở dang
-- (chỉ xóa nếu tồn tại, tránh lỗi nếu chưa có)
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'price_list') then
    -- Bảng đã tồn tại → tháo policy trước
    execute 'drop policy if exists "allow_all_price_list" on public.price_list';
    execute 'drop policy if exists "Allow public" on public.price_list';
    -- KHÔNG xóa bảng để giữ data nếu có. Nếu muốn xóa sạch, bỏ comment:
    -- execute 'drop table if exists public.price_list cascade';
  end if;
end $$;

-- BƯỚC 2: Tạo bảng (idempotent)
create table if not exists public.price_list (
  id           serial primary key,
  sku          varchar(100) unique not null,
  product_id   integer references public.products(id) on delete set null,
  name         varchar(255) not null,
  group_id     integer references public.product_groups(id) on delete set null,
  group_name   varchar(255),
  price        numeric(12,2) not null default 0,
  discount     numeric(5,2)  default 0,
  final_price  numeric(12,2),
  stock        integer       default 0,
  unit         varchar(20)   default 'cái',
  note         text,
  is_active    boolean       default true,
  sort_order   integer       default 0,
  created_at   timestamp     default now(),
  updated_at   timestamp     default now()
);

-- BƯỚC 3: Index (idempotent)
create index if not exists idx_price_list_sku    on public.price_list (sku);
create index if not exists idx_price_list_group  on public.price_list (group_id);
create index if not exists idx_price_list_active on public.price_list (is_active);

-- BƯỚC 4: Bật RLS
alter table public.price_list enable row level security;

-- BƯỚC 5: Tạo policy (chỉ tạo nếu chưa có policy nào)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'price_list'
  ) then
    execute 'create policy "allow_all_price_list"
             on public.price_list for all
             using (true) with check (true)';
  end if;
end $$;

-- BƯỚC 6: Trigger updated_at (chỉ tạo nếu hàm update_updated_at đã có)
do $$
begin
  if exists (select 1 from pg_proc where proname = 'update_updated_at') then
    execute 'drop trigger if exists trg_price_list_upd on public.price_list';
    execute 'create trigger trg_price_list_upd
             before update on public.price_list
             for each row execute function update_updated_at()';
  else
    raise notice 'Bỏ qua trigger: hàm update_updated_at chưa tồn tại (sẽ tự có khi chạy techtra_complete_schema.sql đầy đủ)';
  end if;
end $$;

-- BƯỚC 7: Seed dữ liệu mẫu
insert into public.price_list (sku, name, price, discount, final_price, stock, unit, sort_order)
values
  ('SP001', 'Nước rửa bát Techtra 750ml',  89000,  10,  80100, 100, 'chai', 1),
  ('SP002', 'Bột giặt Techtra 3kg',        165000, 15, 140250,  60, 'túi',  2),
  ('SP003', 'Nước lau sàn Techtra 1L',      55000,  0,  55000, 200, 'chai', 3)
on conflict (sku) do nothing;

-- BƯỚC 8: GRANT quyền cho anon / authenticated (phòng trường hợp schema public bị revoke)
grant all privileges on table public.price_list to anon, authenticated, service_role;
grant usage, select on sequence public.price_list_id_seq to anon, authenticated, service_role;

-- BƯỚC 9: KIỂM TRA — in ra thông tin bảng
select
  '✅ Tổng số dòng' as info,
  count(*)::text as value
from public.price_list
union all
select
  'Schema' as info,
  table_schema::text as value
from information_schema.tables
where table_name = 'price_list' and table_schema = 'public'
union all
select
  'RLS enabled' as info,
  (select row_security_active('public.price_list')::text)
union all
select
  'Policies' as info,
  (select count(*)::text from pg_policies where tablename = 'price_list' and schemaname = 'public');

-- BƯỚC 10: Reload PostgREST cache (skip if not available in standard PostgreSQL)
do $
begin
  perform pg_notify('pgrst', 'reload schema');
exception
  when others then
    -- Ignore if pgrst extension is not available (standard PostgreSQL)
    null;
end $;

-- Đợi 5–10 giây rồi refresh trang admin (Ctrl+Shift+R).
-- =============================================================
-- Bảng product_reviews: lưu đánh giá của khách hàng trên shop
-- =============================================================
create table if not exists product_reviews (
  id            bigserial    primary key,
  product_id    bigint       not null references products(id) on delete cascade,
  rating        integer      not null check (rating between 1 and 5),
  comment       text,
  reviewer_name varchar(120) default 'Khách hàng',
  is_approved   boolean      default true,
  created_at    timestamptz  default now()
);

create index if not exists idx_product_reviews_product
  on product_reviews (product_id, created_at desc);

-- View tổng hợp rating + số lượt đánh giá cho mỗi sản phẩm (tiện cho việc đồng bộ vào products.rating/reviews)
create or replace view v_product_rating as
  select product_id,
         count(*)        as review_count,
         avg(rating)::numeric(3,2) as avg_rating
  from product_reviews
  where is_approved = true
  group by product_id;


create table about_content (
  id bigint generated always as identity primary key,
  group_id bigint unique references upload_groups(id) on delete cascade,
  content text,
  updated_at timestamptz default now()
);

create table videos (
  id bigint generated always as identity primary key,
  group_id bigint references upload_groups(id) on delete set null,
  title text,
  url text,
  file_name text,
  file_size bigint,
  created_at timestamptz default now()
);
-- Bật RLS (nếu Supabase tự bật sẵn khi tạo bảng) và thêm policy cho phép đọc/ghi
-- Cách 1: Cho phép mọi thao tác với anon key (giống hầu hết bảng admin nội bộ khác)

alter table upload_groups enable row level security;
alter table about_content enable row level security;
alter table videos enable row level security;

create policy "Allow all for anon - upload_groups"
  on upload_groups for all
  using (true)
  with check (true);

create policy "Allow all for anon - about_content"
  on about_content for all
  using (true)
  with check (true);

create policy "Allow all for anon - videos"
  on videos for all
  using (true)
  with check (true);

-- Bảng nhóm upload (hỗ trợ cây 2 cấp: cha / con)
create table if not exists upload_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null,
  description text,
  icon        text,                 -- vd: 'fas fa-spa'
  parent_id   uuid references upload_groups(id) on delete cascade,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Slug là duy nhất trong phạm vi cùng 1 cha (cho phép trùng slug giữa các cha khác nhau)
create unique index if not exists upload_groups_slug_per_parent_uidx
  on upload_groups (parent_id, slug);

-- Nếu muốn slug duy nhất TOÀN BỘ (không phân biệt cha/con), dùng cái này thay cho index trên:
-- create unique index if not exists upload_groups_slug_uidx
--   on upload_groups (slug);

create index if not exists upload_groups_parent_id_idx
  on upload_groups (parent_id);

create index if not exists upload_groups_sort_order_idx
  on upload_groups (sort_order);

-- Tự động cập nhật updated_at mỗi khi update
create or replace function set_updated_at()drop table if exists upload_group cascade;
drop table if exists upload_groups cascade;
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_upload_groups_updated_at on upload_groups;
create trigger trg_upload_groups_updated_at
  before update on upload_groups
  for each row
  execute function set_updated_at();

  alter table product_groups
  add column code text;

-- Nếu muốn mã nhóm là duy nhất (không trùng)
create unique index product_groups_code_key
  on product_groups (code)
  where code is not null;

  ALTER TABLE products
ADD COLUMN is_bulky boolean NOT NULL DEFAULT false;

ALTER TABLE products
ADD COLUMN jt_services text[] DEFAULT '{}';

-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Thêm cấu hình "Banner popup thông báo" vào bảng homepage_config
-- ═══════════════════════════════════════════════════════════════════════════
-- Mục đích: lưu cấu hình modal popup hiện khi khách vào trang chủ
-- (bật/tắt, tiêu đề, ảnh, link, số ngày ẩn khi khách bấm "Không hiển thị lại").
--
-- Giả định bảng homepage_config đã tồn tại với các cột dạng jsonb tương tự
-- background / hero / sections / flash_sale (theo đúng pattern các cột cũ).
-- Nếu tên cột/bảng thực tế khác, chỉnh lại cho khớp trước khi chạy.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Thêm cột popup (jsonb) nếu chưa có, kèm giá trị mặc định
ALTER TABLE homepage_config
  ADD COLUMN IF NOT EXISTS popup jsonb NOT NULL DEFAULT jsonb_build_object(
    'enabled', false,
    'title', 'THÔNG BÁO',
    'imageUrl', '',
    'link', '',
    'dontShowDays', 7
  );

-- 2) Với các dòng cấu hình đã tồn tại từ trước khi có cột này, đảm bảo popup
--    không bị NULL (phòng trường hợp cột được thêm bằng cách khác không có
--    DEFAULT, hoặc dữ liệu cũ bị null hoá thủ công).
UPDATE homepage_config
SET popup = jsonb_build_object(
  'enabled', false,
  'title', 'THÔNG BÁO',
  'imageUrl', '',
  'link', '',
  'dontShowDays', 7
)
WHERE popup IS NULL;

-- 3) Comment mô tả cột để dễ tra cứu trong Supabase Studio
COMMENT ON COLUMN homepage_config.popup IS
  'Cấu hình popup thông báo hiện khi khách vào trang chủ: {enabled, title, imageUrl, link, dontShowDays}';

-- ═══════════════════════════════════════════════════════════════════════════
-- Storage: ảnh popup được upload qua homepageApi.uploadFile(file, "popup")
-- và dùng chung bucket/policy với các ảnh khác của trang chủ (background,
-- hero, promo, blog...). Nếu bucket đó đã có policy cho phép admin ghi và
-- public đọc theo prefix chung, KHÔNG cần thêm policy riêng cho "popup".
--
-- Nếu bucket của bạn giới hạn theo whitelist từng subfolder cụ thể (ví dụ
-- chỉ cho phép 'background/', 'hero/', 'promo/', 'blog/'), thêm 'popup/' vào
-- danh sách đó. Ví dụ mẫu (CHỈNH LẠI tên bucket + policy cho khớp thực tế):
--
-- create policy "Cho phép đọc public ảnh popup"
--   on storage.objects for select
--   using (bucket_id = 'homepage' and (storage.foldername(name))[1] = 'popup');
--
-- create policy "Cho phép admin upload ảnh popup"
--   on storage.objects for insert
--   with check (bucket_id = 'homepage' and (storage.foldername(name))[1] = 'popup');
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE product_groups
ADD COLUMN is_sale BOOLEAN DEFAULT FALSE;


-- -- =============================================================
-- -- Migration: J&T Express integration
-- -- Chạy 1 lần trên Supabase SQL Editor
-- -- Thêm cột vận đơn J&T vào orders + cập nhật view v_orders_full
-- -- =============================================================
-- --
-- -- Phụ thuộc:
-- --   - bảng orders(id, order_code, status, ...) — đã có
-- --   - view v_orders_full — đã có (sẽ CREATE OR REPLACE)
-- --
-- -- Cột mới:
-- --   jt_bill_code      — mã vận đơn J&T trả về
-- --   jt_waybill_no     — mã vận đơn nội bộ Techtra
-- --   jt_tracking_url   — URL tracking công khai
-- --   jt_service_code   — '01'=EZ, '02'=STD, '03'=FAST
-- --   jt_weight_grams   — trọng lượng đã gửi J&T
-- --   jt_shipping_fee   — phí J&T tính được
-- --   jt_status         — trạng thái J&T (created/pickup/transit/delivered/cancelled)
-- --   jt_last_trace     — lần tra cứu cuối (jsonb)
-- --   jt_created_at     — lúc tạo vận đơn
-- --   jt_pickup_id      — ID lệnh pickup
-- --   jt_cancel_reason  — lý do huỷ
-- -- =============================================================


-- -- =============================================================
-- -- 1. Thêm cột tracking vận đơn
-- -- =============================================================
-- alter table orders
--   add column if not exists jt_bill_code      varchar(100),
--   add column if not exists jt_waybill_no    varchar(100),
--   add column if not exists jt_tracking_url  text,
--   add column if not exists jt_service_code  varchar(10)  default '01',
--   add column if not exists jt_weight_grams  integer,
--   add column if not exists jt_shipping_fee  numeric(12,2) default 0,
--   add column if not exists jt_status        varchar(50),
--   add column if not exists jt_last_trace    jsonb,
--   add column if not exists jt_created_at    timestamp,
--   add column if not exists jt_pickup_id     varchar(100),
--   add column if not exists jt_cancel_reason text;

-- -- Index để tra cứu nhanh theo billCode
-- create index if not exists idx_orders_jt_bill on orders(jt_bill_code);
-- create index if not exists idx_orders_jt_status on orders(jt_status);

-- -- Comment giúp admin hiểu cột khi xem schema
-- comment on column orders.jt_bill_code     is 'Mã vận đơn J&T trả về (billCode/waybillNo)';
-- comment on column orders.jt_service_code  is 'Mã dịch vụ J&T: 01=EZ, 02=STD, 03=FAST';
-- comment on column orders.jt_status        is 'Trạng thái vận đơn: created / pickup / transit / delivered / cancelled';
-- comment on column orders.jt_tracking_url  is 'URL tra cứu công khai từ J&T';
-- comment on column orders.jt_last_trace    is 'Lần trace cuối (jsonb) — lưu response từ jtTraceOrder';


-- -- =============================================================
-- -- 2. Cập nhật view v_orders_full
-- --    Thêm 4 cột J&T + 1 cột derived jt_status_label
-- -- =============================================================
-- -- Lưu ý: view này được khai báo ở migration_loyalty_and_orders.sql dòng 249.
-- -- CREATE OR REPLACE này sẽ overwrite view cũ. Nếu sau này view bị sửa thêm,
-- -- cần cập nhật cả 2 chỗ.
-- create or replace view v_orders_full as
-- select
--   o.id,
--   o.order_code,
--   o.customer_id,
--   coalesce(o.customer_name, c.name)    as customer_name,
--   coalesce(o.customer_phone, c.phone)  as customer_phone,
--   c.email                              as customer_email,

--   o.address,
--   o.province,
--   o.district,
--   o.ward,

--   o.total_price,
--   o.shipping_fee,
--   o.discount_amount,
--   o.final_price,

--   o.payment_method,
--   o.payment_status,
--   o.status,
--   o.note,

--   -- Số lượng item + số SP
--   coalesce(items.item_count, 0)        as item_count,
--   coalesce(items.total_qty, 0)         as total_qty,

--   o.created_at,
--   o.updated_at,

--   -- Trạng thái COD: nếu payment_method='cod' và status='done' → đã nhận hàng thành công
--   case
--     when o.payment_method = 'cod' and o.status = 'done' then true
--     else false
--   end                                   as cod_delivered_success,

--   -- ═══════ J&T Express ═══════
--   o.jt_bill_code,
--   o.jt_waybill_no,
--   o.jt_tracking_url,
--   o.jt_service_code,
--   o.jt_weight_grams,
--   o.jt_shipping_fee,
--   o.jt_status,
--   o.jt_last_trace,
--   o.jt_created_at,
--   o.jt_pickup_id,
--   o.jt_cancel_reason,

--   -- Cột derived: giải mã jt_status sang text tiếng Việt
--   case o.jt_status
--     when 'created'   then 'Đã tạo vận đơn'
--     when 'pickup'    then 'Đã lấy hàng'
--     when 'transit'   then 'Đang vận chuyển'
--     when 'delivered' then 'Đã giao hàng'
--     when 'cancelled' then 'Đã huỷ vận đơn'
--     when 'returned'  then 'Hoàn hàng'
--     when null        then 'Chưa gửi J&T'
--     else o.jt_status
--   end                                   as jt_status_label,

--   -- Flag tiện: đã có billCode J&T chưa
--   (o.jt_bill_code is not null)          as has_jt_order

-- from orders o
-- left join customers c on c.id = o.customer_id
-- left join (
--   select
--     order_id,
--     count(*)            as item_count,
--     sum(quantity)       as total_qty
--   from order_items
--   group by order_id
-- ) items on items.order_id = o.id;

-- comment on view v_orders_full is 'Đơn hàng full data + flag cod_delivered_success + cột J&T (jt_bill_code, jt_status, jt_tracking_url, has_jt_order, jt_status_label). Admin donhang SELECT từ đây.';


-- -- =============================================================
-- -- 3. RLS: site_settings đã được enable RLS ở migration_loyalty_and_orders.sql.
-- --    Policy hiện tại:
-- --      - service_role: ALL (full quyền)
-- --      - anon/authenticated: SELECT
-- --    → Cần thêm policy cho phép admin (anon) INSERT/UPDATE để lưu config J&T.
-- -- =============================================================
-- drop policy if exists p_anon_write_site_settings on site_settings;
-- create policy p_anon_write_site_settings
--   on site_settings for insert to anon, authenticated with check (true);

-- drop policy if exists p_anon_update_site_settings on site_settings;
-- create policy p_anon_update_site_settings
--   on site_settings for update to anon, authenticated using (true) with check (true);


-- =============================================================
-- 4. Smoke test
-- =============================================================
-- select column_name, data_type
-- from information_schema.columns
-- where table_name = 'orders'
--   and column_name like 'jt_%'
-- order by column_name;

-- select * from v_orders_full limit 1;


-- =============================================================
-- Migration: Voucher public (cho tất cả KH)
-- Chạy 1 lần trên Supabase SQL Editor
-- Thêm cột is_public vào customer_vouchers
-- =============================================================
--
-- Mục đích: cho phép tạo voucher "public" — KHÔNG gắn với customer_id
-- cụ thể, bất kỳ ai nhập code khi checkout cũng dùng được.
-- Voucher cá nhân (rank silver/gold/platinum) giữ nguyên is_public=false.
-- =============================================================


-- =============================================================
-- 1. Thêm cột is_public
-- =============================================================
alter table customer_vouchers
  add column if not exists is_public boolean default false;

-- Cho phép customer_id NULL (voucher public không gắn với KH cụ thể)
alter table customer_vouchers
  alter column customer_id drop not null;

-- Index tìm voucher public nhanh theo code
create index if not exists idx_customer_vouchers_public
  on customer_vouchers (code)
  where is_public = true and is_active = true;

-- Comment
comment on column customer_vouchers.is_public is
  'TRUE: voucher public (customer_id IS NULL), ai cũng nhập code dùng được. FALSE: voucher cá nhân (gắn với customer_id).';

-- Rank NULL được phép với voucher public
alter table customer_vouchers
  alter column rank drop not null;


-- =============================================================
-- 2. View hỗ trợ: v_active_vouchers
--    Liệt kê voucher còn hạn + chưa dùng, kèm thông tin KH (nếu có)
-- =============================================================
create or replace view v_active_vouchers as
select
  v.id,
  v.code,
  v.is_public,
  v.rank,
  v.discount_type,
  v.discount_value,
  v.min_order,
  v.max_discount,
  v.expires_at,
  v.issued_at,
  v.used_at,
  v.is_active,
  v.note,
  v.customer_id,
  c.name                            as customer_name,
  c.phone                           as customer_phone,
  c.email                           as customer_email,
  case
    when v.used_at is not null then 'used'
    when v.expires_at is not null and v.expires_at < now() then 'expired'
    when v.is_active = false then 'inactive'
    else 'active'
  end                               as status
from customer_vouchers v
left join customers c on c.id = v.customer_id
where v.is_active = true;

comment on view v_active_vouchers is
  'Voucher còn hạn + chưa dùng (status: active/used/expired/inactive). Bao gồm cả voucher public (customer_id IS NULL).';


-- =============================================================
-- 3. RLS: customer_vouchers đã có policy
--    Thêm policy cho phép anon SELECT voucher (để shop checkout validate code)
-- =============================================================
drop policy if exists p_anon_read_vouchers on customer_vouchers;
create policy p_anon_read_vouchers
  on customer_vouchers for select to anon, authenticated using (true);


-- =============================================================
-- 4. Smoke test
-- =============================================================
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_name = 'customer_vouchers'
-- order by ordinal_position;
--
-- select * from v_active_vouchers limit 5;


-- =============================================================
-- Migration: Khách hàng thân thiết + Quản lý đơn hàng
-- Chạy 1 lần trên Supabase SQL Editor sau khi đã có schema
-- customers / orders / order_items (xem techtra_full_schema.sql §5, §6)
-- =============================================================
--
-- Phụ thuộc:
--   - bảng customers(id, name, email, phone)              ← đã có
--   - bảng orders(id, customer_id, status, final_price)    ← đã có
--   - bảng order_items(id, order_id, product_id, quantity) ← đã có
--   - bảng products(id, name, slug)                        ← đã có
--   - bảng categories hoặc product_groups                  ← không bắt buộc
--
-- Nguyên tắc:
--   • KHÔNG sửa schema customers/orders/order_items — chỉ thêm bảng phụ.
--   • Một KH có thể có SĐT hoặc Email (1 trong 2 có thể NULL).
--   • Tổng tiền chỉ tính khi orders.status = 'done' (nhận hàng thành công).
--     Riêng đơn ship COD: chỉ tính khi đã nhận hàng thành công.
--   • Tất cả tính toán tổng hợp (LTV, AOV, list SP) chạy bằng VIEW —
--     admin dashboard đọc VIEW, không cần trigger phức tạp.
-- =============================================================


-- =============================================================
-- 1. customer_stats
--    Mỗi KH 1 dòng. Lưu tổng hợp từ các đơn 'done'.
--    Có thể dùng trigger để cập nhật, hoặc refresh bằng job.
-- =============================================================
create table if not exists customer_stats (
  customer_id        integer primary key
                       references customers(id) on delete cascade,

  -- Đếm tổng quan
  total_orders       integer     default 0,             -- số đơn done
  total_products     integer     default 0,             -- tổng số SP đã mua (sum quantity)
  cancelled_orders   integer     default 0,             -- số đơn bị huỷ

  -- Tài chính
  ltv                numeric(14,2) default 0,           -- Lifetime Value (tổng final_price các đơn done)
  aov                numeric(14,2) default 0,           -- Average Order Value (ltv / total_orders)

  -- List sản phẩm đã mua (JSONB): [{ product_id, name, slug, qty, last_buy_at }]
  purchased_products jsonb        default '[]'::jsonb,

  -- Tracking
  first_purchase_at  timestamptz,
  last_purchase_at   timestamptz,

  updated_at         timestamptz default now()
);

comment on table  customer_stats is 'Tổng hợp KH thân thiết: số đơn, tổng SP, LTV, AOV, list SP đã mua. Refresh qua view + cron/RPC.';
comment on column customer_stats.ltv  is 'Tổng tiền đã chi (chỉ tính đơn status=done)';
comment on column customer_stats.aov  is 'LTV / total_orders';
comment on column customer_stats.purchased_products is 'JSONB: mỗi phần tử {product_id, name, slug, qty, last_buy_at}';


-- =============================================================
-- 2. customer_vouchers
--    Voucher phát cho KH thân thiết. Khi bật rank (loyalty_enabled)
--    sẽ tự động insert vào đây.
-- =============================================================
create table if not exists customer_vouchers (
  id            serial primary key,
  customer_id   integer     not null references customers(id) on delete cascade,

  code          varchar(50) unique,                     -- Mã voucher (VD: TC-VIP-...)
  rank          varchar(20) default 'bronze',           -- 'bronze'|'silver'|'gold'|'platinum'
  discount_type varchar(20) default 'percent',          -- 'percent'|'fixed'
  discount_value numeric(10,2) default 0,
  min_order     numeric(12,2) default 0,
  max_discount  numeric(12,2),

  -- Thời hạn
  issued_at     timestamptz default now(),
  expires_at    timestamptz,
  used_at       timestamptz,
  order_id      integer     references orders(id) on delete set null,

  -- Trạng thái
  is_active     boolean     default true,
  note          text
);

create index if not exists idx_customer_vouchers_customer
  on customer_vouchers (customer_id);
create index if not exists idx_customer_vouchers_active
  on customer_vouchers (is_active, expires_at)
  where is_active = true;

comment on table customer_vouchers is 'Voucher phát cho khách thân thiết (khi loyalty_enabled=true)';


-- =============================================================
-- 3. site_settings (key/value linh hoạt)
--    Công tắc bật/tắt rank + ngưỡng tier.
--    Admin đổi bằng cách UPDATE key.
-- =============================================================
create table if not exists site_settings (
  key         varchar(100) primary key,
  value       text,
  value_json  jsonb,                                    -- Dùng cho cấu hình dạng object
  description text,
  updated_at  timestamptz default now()
);

comment on table site_settings is 'Cấu hình hệ thống key/value. Công tắc bật rank khách thân thiết: key=loyalty_enabled';

-- Seed các key mặc định
insert into site_settings (key, value, value_json, description) values
  ('loyalty_enabled', 'false', null,
    'Bật/tắt chương trình khách thân thiết (true=hiện rank + auto-issue voucher)'),

  ('loyalty_tier_thresholds', null,
   '{
      "bronze":   { "min_ltv": 0,       "voucher": null },
      "silver":   { "min_ltv": 2000000, "voucher": { "type":"percent","value":5,  "min_order":500000, "max_discount":100000 } },
      "gold":     { "min_ltv": 5000000, "voucher": { "type":"percent","value":10, "min_order":1000000,"max_discount":300000 } },
      "platinum": { "min_ltv": 10000000,"voucher": { "type":"percent","value":15, "min_order":0,      "max_discount":500000 } }
    }'::jsonb,
    'Ngưỡng LTV cho từng hạng + quà tặng voucher khi đạt hạng'),

  ('loyalty_only_done_orders', 'true', null,
    'Chỉ tính đơn status=done vào LTV (true). Nếu false: tính cả đơn confirmed/shipping.'),

  ('loyalty_min_orders_for_rank', '1', null,
    'Số đơn done tối thiểu để được xét hạng (mặc định 1)'),

  ('loyalty_voucher_valid_days', '30', null,
    'Voucher có hiệu lực bao nhiêu ngày kể từ khi phát')
on conflict (key) do nothing;


-- =============================================================
-- 4. VIEW: v_customer_loyalty
--    Tổng hợp KH + stats + rank (tính real-time từ orders).
--    Admin all-customers sẽ SELECT từ VIEW này.
-- =============================================================
create or replace view v_customer_loyalty as
with order_done as (
  select
    o.customer_id,
    count(*)                                              as done_orders,
    coalesce(sum(o.final_price), 0)                       as ltv_raw,
    coalesce(sum(oi.quantity), 0)                         as products_qty,
    max(o.created_at)                                     as last_buy,
    min(o.created_at)                                     as first_buy,
    jsonb_agg(
      jsonb_build_object(
        'order_id',     o.id,
        'order_code',   o.order_code,
        'final_price',  o.final_price,
        'completed_at', o.updated_at
      ) order by o.updated_at desc
    ) filter (where o.id is not null)                     as orders_json
  from orders o
  left join order_items oi on oi.order_id = o.id
  where o.status = 'done'
  group by o.customer_id
),
order_cancelled as (
  select customer_id, count(*) as cancel_count
  from orders
  where status = 'cancelled'
  group by customer_id
),
purchased as (
  -- List sản phẩm đã mua (gom theo customer → product)
  select
    customer_id,
    jsonb_agg(
      jsonb_build_object(
        'product_id',   product_id,
        'name',         name,
        'slug',         slug,
        'image_url',    image_url,
        'qty',          qty,
        'last_buy_at',  last_buy_at
      )
      order by last_buy_at desc
    ) as products_json
  from (
    select
      o.customer_id,
      p.id          as product_id,
      p.name        as name,
      p.slug        as slug,
      p.image_url   as image_url,
      sum(oi.quantity)           as qty,
      max(o.created_at)          as last_buy_at
    from orders o
    join order_items oi on oi.order_id = o.id
    join products   p  on p.id = oi.product_id
    where o.status = 'done' and p.id is not null
    group by o.customer_id, p.id, p.name, p.slug, p.image_url
  ) inner_purchased
  group by customer_id
)
select
  c.id                              as customer_id,
  c.name                            as customer_name,
  c.email,
  c.phone,
  -- Theo yêu cầu: email hoặc phone có thể NULL — vẫn show
  case
    when c.phone is not null and c.email is not null then c.phone || ' / ' || c.email
    when c.phone is not null then c.phone
    when c.email is not null then c.email
    else '(chưa có SĐT/Email)'
  end                               as contact,
  coalesce(od.done_orders, 0)       as total_orders,
  coalesce(od.products_qty, 0)       as total_products,
  coalesce(oc.cancel_count, 0)      as cancelled_orders,
  coalesce(od.ltv_raw, 0)           as ltv,
  case
    when coalesce(od.done_orders, 0) > 0
      then round(od.ltv_raw / od.done_orders, 2)
    else 0
  end                               as aov,
  coalesce(p.products_json, '[]'::jsonb) as purchased_products,
  od.first_buy                      as first_purchase_at,
  od.last_buy                       as last_purchase_at,
  c.is_active,
  c.created_at                      as customer_since,
  -- Rank: tính theo ngưỡng trong site_settings
  case
    when coalesce(od.ltv_raw, 0) >= 10000000 then 'platinum'
    when coalesce(od.ltv_raw, 0) >=  5000000 then 'gold'
    when coalesce(od.ltv_raw, 0) >=  2000000 then 'silver'
    else 'bronze'
  end                               as rank,
  -- Công tắc: có nên hiện rank không?
  coalesce(
    (select value from site_settings where key = 'loyalty_enabled'),
    'false'
  )                                 as loyalty_enabled
from customers c
left join order_done        od on od.customer_id = c.id
left join order_cancelled   oc on oc.customer_id = c.id
left join purchased          p on p.customer_id = c.id;

comment on view v_customer_loyalty is 'Tổng hợp KH + LTV + AOV + rank. Đọc real-time từ orders, không cần trigger. Admin all-customers SELECT từ đây.';


-- =============================================================
-- 5. VIEW: v_orders_full
--    Đơn hàng full data cho admin donhang. Join KH + items.
-- =============================================================
create or replace view v_orders_full as
select
  o.id,
  o.order_code,
  o.customer_id,
  coalesce(o.customer_name, c.name)    as customer_name,
  coalesce(o.customer_phone, c.phone)  as customer_phone,
  c.email                              as customer_email,

  o.address,
  o.province,
  o.district,
  o.ward,

  o.total_price,
  o.shipping_fee,
  o.discount_amount,
  o.final_price,

  o.payment_method,
  o.payment_status,
  o.status,
  o.note,

  -- Số lượng item + số SP
  coalesce(items.item_count, 0)        as item_count,
  coalesce(items.total_qty, 0)         as total_qty,

  o.created_at,
  o.updated_at,

  -- Trạng thái COD: nếu payment_method='cod' và status='done' → đã nhận hàng thành công
  case
    when o.payment_method = 'cod' and o.status = 'done' then true
    else false
  end                                   as cod_delivered_success

from orders o
left join customers c on c.id = o.customer_id
left join (
  select
    order_id,
    count(*)            as item_count,
    sum(quantity)       as total_qty
  from order_items
  group by order_id
) items on items.order_id = o.id;

comment on view v_orders_full is 'Đơn hàng full data + flag cod_delivered_success. Admin donhang SELECT từ đây.';


-- =============================================================
-- 6. FUNCTION + TRIGGER: refresh customer_stats khi đơn done/cancel
--    Mỗi khi orders.status chuyển sang 'done' hoặc 'cancelled',
--    cập nhật lại customer_stats cho KH đó.
-- =============================================================
create or replace function fn_refresh_customer_stats(p_customer_id integer)
returns void
language plpgsql
as $$
declare
  v_orders      integer;
  v_products    integer;
  v_cancelled   integer;
  v_ltv         numeric(14,2);
  v_aov         numeric(14,2);
  v_first       timestamptz;
  v_last        timestamptz;
  v_purchased   jsonb;
begin
  -- Đếm đơn done + tổng tiền + tổng SP
  select
    count(*),
    coalesce(sum(oi.quantity), 0),
    coalesce(sum(o.final_price), 0),
    min(o.created_at),
    max(o.created_at)
  into v_orders, v_products, v_ltv, v_first, v_last
  from orders o
  left join order_items oi on oi.order_id = o.id
  where o.customer_id = p_customer_id and o.status = 'done';

  -- Đếm đơn huỷ
  select count(*) into v_cancelled
  from orders
  where customer_id = p_customer_id and status = 'cancelled';

  -- AOV
  v_aov := case when v_orders > 0 then round(v_ltv / v_orders, 2) else 0 end;

  -- List sản phẩm JSONB
  select coalesce(jsonb_agg(x order by (x->>'last_buy_at') desc), '[]'::jsonb)
  into v_purchased
  from (
    select jsonb_build_object(
      'product_id',   product_id,
      'name',         name,
      'slug',         slug,
      'image_url',    image_url,
      'qty',          qty,
      'last_buy_at',  last_buy_at
    ) as x
    from (
      select
        p.id          as product_id,
        p.name        as name,
        p.slug        as slug,
        p.image_url   as image_url,
        sum(oi.quantity)           as qty,
        to_char(max(o.created_at), 'YYYY-MM-DD"T"HH24:MI:SSOF') as last_buy_at
      from orders o
      join order_items oi on oi.order_id = o.id
      join products   p  on p.id = oi.product_id
      where o.customer_id = p_customer_id and o.status = 'done'
      group by p.id, p.name, p.slug, p.image_url
    ) inner_prod
  ) t;

  -- Upsert
  insert into customer_stats
    (customer_id, total_orders, total_products, cancelled_orders, ltv, aov,
     purchased_products, first_purchase_at, last_purchase_at, updated_at)
  values
    (p_customer_id, coalesce(v_orders,0), coalesce(v_products,0),
     coalesce(v_cancelled,0), coalesce(v_ltv,0), coalesce(v_aov,0),
     v_purchased, v_first, v_last, now())
  on conflict (customer_id) do update set
    total_orders       = excluded.total_orders,
    total_products     = excluded.total_products,
    cancelled_orders   = excluded.cancelled_orders,
    ltv                = excluded.ltv,
    aov                = excluded.aov,
    purchased_products = excluded.purchased_products,
    first_purchase_at  = excluded.first_purchase_at,
    last_purchase_at   = excluded.last_purchase_at,
    updated_at         = excluded.updated_at;
end;
$$;

create or replace function fn_orders_after_change()
returns trigger
language plpgsql
as $$
begin
  -- Chỉ refresh khi status thay đổi / insert / delete
  if (tg_op = 'INSERT' or tg_op = 'DELETE') then
    if new.customer_id is not null then
      perform fn_refresh_customer_stats(new.customer_id);
    elsif old.customer_id is not null then
      perform fn_refresh_customer_stats(old.customer_id);
    end if;
  elsif (tg_op = 'UPDATE' and (old.status is distinct from new.status)) then
    if new.customer_id is not null then
      perform fn_refresh_customer_stats(new.customer_id);
    end if;
    if old.customer_id is not null and old.customer_id is distinct from new.customer_id then
      perform fn_refresh_customer_stats(old.customer_id);
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_orders_refresh_stats on orders;
create trigger trg_orders_refresh_stats
  after insert or update or delete on orders
  for each row execute function fn_orders_after_change();


-- =============================================================
-- 7. RLS Policies (Supabase)
--    Bật RLS + cho phép anon đọc VIEW (admin đọc qua service_role)
-- =============================================================
alter table customer_stats     enable row level security;
alter table customer_vouchers  enable row level security;
alter table site_settings      enable row level security;

-- Cho phép service_role (admin) đọc/ghi tất cả
drop policy if exists p_service_all_customer_stats    on customer_stats;
drop policy if exists p_service_all_customer_vouchers on customer_vouchers;
drop policy if exists p_service_all_site_settings     on site_settings;

create policy p_service_all_customer_stats
  on customer_stats for all to service_role using (true) with check (true);
create policy p_service_all_customer_vouchers
  on customer_vouchers for all to service_role using (true) with check (true);
create policy p_service_all_site_settings
  on site_settings for all to service_role using (true) with check (true);

-- Cho phép anon/authenticated đọc (frontend có thể xem rank nếu cần)
drop policy if exists p_anon_read_site_settings on site_settings;
create policy p_anon_read_site_settings
  on site_settings for select to anon, authenticated using (true);


-- =============================================================
-- 8. HÀM tiện ích: bật/tắt rank + lấy ngưỡng tier
-- =============================================================
create or replace function fn_loyalty_set_enabled(p_enabled boolean)
returns void
language sql
as $$
  update site_settings
  set value = case when p_enabled then 'true' else 'false' end,
      updated_at = now()
  where key = 'loyalty_enabled';
$$;

create or replace function fn_loyalty_get_enabled()
returns boolean
language sql
stable
as $$
  select coalesce(
    (select value = 'true' from site_settings where key = 'loyalty_enabled'),
    false
  );
$$;

create or replace function fn_loyalty_get_thresholds()
returns jsonb
language sql
stable
as $$
  select coalesce(
    (select value_json from site_settings where key = 'loyalty_tier_thresholds'),
    '{}'::jsonb
  );
$$;

comment on function fn_loyalty_set_enabled    is 'Bật/tắt chương trình khách thân thiết (admin)';
comment on function fn_loyalty_get_enabled    is 'Check xem rank có đang bật không (frontend)';
comment on function fn_loyalty_get_thresholds is 'Lấy ngưỡng tier + voucher (frontend)';


-- =============================================================
-- 9. HÀM tiện ích: auto-issue voucher khi KH đạt rank mới
--    (Có thể gọi sau khi bật loyalty_enabled)
-- =============================================================
create or replace function fn_loyalty_issue_voucher(p_customer_id integer)
returns integer
language plpgsql
as $$
declare
  v_ltv          numeric(14,2);
  v_rank         varchar(20);
  v_tier         jsonb;
  v_voucher      jsonb;
  v_code         varchar(50);
  v_valid_days   integer;
  v_inserted_id  integer;
begin
  -- Check loyalty_enabled
  if not fn_loyalty_get_enabled() then
    return 0;
  end if;

  -- Lấy LTV
  select coalesce(sum(o.final_price), 0)
  into v_ltv
  from orders o
  where o.customer_id = p_customer_id and o.status = 'done';

  -- Tính rank
  v_rank := case
    when v_ltv >= 10000000 then 'platinum'
    when v_ltv >=  5000000 then 'gold'
    when v_ltv >=  2000000 then 'silver'
    else null  -- bronze: chưa đủ điều kiện phát voucher
  end;

  if v_rank is null then
    return 0;
  end if;

  -- Lấy ngưỡng
  v_tier := fn_loyalty_get_thresholds()->v_rank;
  v_voucher := v_tier->'voucher';
  if v_voucher is null then
    return 0;
  end if;

  -- Check KH chưa có voucher cùng rank đang active
  if exists (
    select 1 from customer_vouchers
    where customer_id = p_customer_id
      and rank = v_rank
      and is_active = true
      and (expires_at is null or expires_at > now())
  ) then
    return 0;
  end if;

  -- Sinh code
  v_code := 'TC-' || upper(v_rank) || '-' || p_customer_id || '-' ||
            to_char(now(), 'YYMMDDHH24MI');

  -- Lấy số ngày hiệu lực
  v_valid_days := coalesce(
    (select value::integer from site_settings where key = 'loyalty_voucher_valid_days'),
    30
  );

  -- Insert
  insert into customer_vouchers
    (customer_id, code, rank, discount_type, discount_value,
     min_order, max_discount, expires_at)
  values
    (p_customer_id, v_code, v_rank,
     v_voucher->>'type',
     (v_voucher->>'value')::numeric,
     coalesce((v_voucher->>'min_order')::numeric, 0),
     (v_voucher->>'max_discount')::numeric,
     now() + (v_valid_days || ' days')::interval)
  returning id into v_inserted_id;

  return v_inserted_id;
end;
$$;

comment on function fn_loyalty_issue_voucher is 'Tự động phát voucher cho KH khi đạt rank (gọi từ admin khi bật loyalty_enabled hoặc khi đơn done)';


-- =============================================================
-- 10. Trigger: auto-issue voucher khi đơn done + loyalty bật
-- =============================================================
create or replace function fn_orders_done_issue_voucher()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'done' and old.status is distinct from 'done' and new.customer_id is not null then
    perform fn_loyalty_issue_voucher(new.customer_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_done_issue_voucher on orders;
create trigger trg_orders_done_issue_voucher
  after update of status on orders
  for each row execute function fn_orders_done_issue_voucher();


-- =============================================================
-- 11. Hàm helper: Lấy danh sách đơn hàng của 1 KH (cho trang cá nhân)
-- =============================================================
create or replace function fn_customer_orders(
  p_customer_id integer,
  p_limit       integer default 20
)
returns table (
  order_id     integer,
  order_code   varchar,
  final_price  numeric,
  status       varchar,
  payment_method varchar,
  created_at   timestamp,
  item_count   bigint,
  total_qty    bigint
)
language sql
stable
as $$
  select
    o.id, o.order_code, o.final_price, o.status, o.payment_method, o.created_at,
    (select count(*) from order_items where order_id = o.id) as item_count,
    (select coalesce(sum(quantity),0) from order_items where order_id = o.id) as total_qty
  from orders o
  where o.customer_id = p_customer_id
  order by o.created_at desc
  limit p_limit;
$$;


-- =============================================================
-- 12. Verify
-- =============================================================
-- SELECT * FROM v_customer_loyalty ORDER BY ltv DESC LIMIT 10;
-- SELECT * FROM v_orders_full WHERE status = 'pending' ORDER BY created_at DESC;
-- SELECT fn_loyalty_get_enabled();
-- SELECT fn_loyalty_set_enabled(true);
-- SELECT fn_loyalty_issue_voucher(<customer_id>);

-- =============================================================
-- Migration: J&T Express integration
-- Chạy 1 lần trên Supabase SQL Editor
-- Thêm cột vận đơn J&T vào orders + cập nhật view v_orders_full
-- =============================================================
--
-- Phụ thuộc:
--   - bảng orders(id, order_code, status, ...) — đã có
--   - view v_orders_full — đã có (sẽ CREATE OR REPLACE)
--
-- Cột mới:
--   jt_bill_code      — mã vận đơn J&T trả về (billcode)
--   jt_txlogisticid   — mã đơn nội bộ Techtra gửi lên J&T (BẮT BUỘC để cancel/update sau này)
--   jt_tracking_url   — URL tracking công khai
--   jt_weight_kg      — trọng lượng đã gửi J&T (API J&T nhận đơn vị KG, không phải gram)
--   jt_shipping_fee   — phí J&T tính được
--   jt_status         — trạng thái J&T (created/pickup/transit/delivered/cancelled/returned)
--   jt_last_trace     — lần tra cứu cuối (jsonb)
--   jt_created_at     — lúc tạo vận đơn
--   jt_cancel_reason  — lý do huỷ
--
-- ĐÃ BỎ so với bản trước: jt_waybill_no (trùng với jt_bill_code trong API thật),
-- jt_service_code (API J&T VN thật không có khái niệm service code 01/02/03 —
-- dùng producttype dạng "EZ" khi tính phí, không lưu theo đơn), jt_pickup_id
-- (chưa có endpoint pickup trong docs J&T VN công khai).
-- =============================================================


-- =============================================================
-- 1. Thêm cột tracking vận đơn
-- =============================================================
alter table orders
  add column if not exists jt_bill_code      varchar(100),
  add column if not exists jt_txlogisticid   varchar(100),
  add column if not exists jt_tracking_url   text,
  add column if not exists jt_weight_kg      numeric(10,2),
  add column if not exists jt_shipping_fee   numeric(12,2) default 0,
  add column if not exists jt_status         varchar(50),
  add column if not exists jt_last_trace     jsonb,
  add column if not exists jt_created_at     timestamp,
  add column if not exists jt_cancel_reason  text;

-- Index để tra cứu nhanh theo billCode / txlogisticid
create index if not exists idx_orders_jt_bill on orders(jt_bill_code);
create index if not exists idx_orders_jt_txlogisticid on orders(jt_txlogisticid);
create index if not exists idx_orders_jt_status on orders(jt_status);

-- Comment giúp admin hiểu cột khi xem schema
comment on column orders.jt_bill_code     is 'Mã vận đơn J&T trả về (billcode) — dùng để TRA CỨU (jtTraceOrder)';
comment on column orders.jt_txlogisticid  is 'Mã đơn nội bộ gửi lên J&T lúc tạo — dùng để HUỶ/SỬA (jtCancelOrder/jtUpdateOrder)';
comment on column orders.jt_status        is 'Trạng thái vận đơn: created / pickup / transit / delivered / cancelled / returned';
comment on column orders.jt_tracking_url  is 'URL tra cứu công khai từ J&T';
comment on column orders.jt_weight_kg     is 'Trọng lượng gửi J&T, đơn vị KG (API J&T VN nhận kg, không phải gram)';
comment on column orders.jt_last_trace    is 'Lần trace cuối (jsonb) — lưu response từ jtTraceOrder';


-- =============================================================
-- 1b. Migrate dữ liệu cũ (nếu bảng đã từng chạy migration cũ với
--     jt_waybill_no / jt_weight_grams / jt_service_code / jt_pickup_id)
--     Bỏ qua bước này nếu bạn chạy migration lần đầu.
-- =============================================================
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name = 'orders' and column_name = 'jt_weight_grams') then
    update orders set jt_weight_kg = jt_weight_grams / 1000.0
      where jt_weight_grams is not null and jt_weight_kg is null;
  end if;

  if exists (select 1 from information_schema.columns
             where table_name = 'orders' and column_name = 'jt_waybill_no') then
    update orders set jt_txlogisticid = jt_waybill_no
      where jt_waybill_no is not null and jt_txlogisticid is null;
  end if;
end $$;

-- Sau khi xác nhận dữ liệu đã migrate đúng, có thể chạy riêng (KHÔNG tự động ở đây):
-- alter table orders drop column if exists jt_waybill_no;
-- alter table orders drop column if exists jt_weight_grams;
-- alter table orders drop column if exists jt_service_code;
-- alter table orders drop column if exists jt_pickup_id;


-- =============================================================
-- 2. Cập nhật view v_orders_full
-- =============================================================
-- Lưu ý: view này được khai báo ở migration_loyalty_and_orders.sql dòng 249.
-- CREATE OR REPLACE này sẽ overwrite view cũ. Nếu sau này view bị sửa thêm,
-- cần cập nhật cả 2 chỗ.
create or replace view v_orders_full as
select
  o.id,
  o.order_code,
  o.customer_id,
  coalesce(o.customer_name, c.name)    as customer_name,
  coalesce(o.customer_phone, c.phone)  as customer_phone,
  c.email                              as customer_email,

  o.address,
  o.province,
  o.district,
  o.ward,

  o.total_price,
  o.shipping_fee,
  o.discount_amount,
  o.final_price,

  o.payment_method,
  o.payment_status,
  o.status,
  o.note,

  coalesce(items.item_count, 0)        as item_count,
  coalesce(items.total_qty, 0)         as total_qty,

  o.created_at,
  o.updated_at,

  case
    when o.payment_method = 'cod' and o.status = 'done' then true
    else false
  end                                   as cod_delivered_success,

  -- ═══════ J&T Express ═══════
  o.jt_bill_code,
  o.jt_txlogisticid,
  o.jt_tracking_url,
  o.jt_weight_kg,
  o.jt_shipping_fee,
  o.jt_status,
  o.jt_last_trace,
  o.jt_created_at,
  o.jt_cancel_reason,

  case o.jt_status
    when 'created'   then 'Đã tạo vận đơn'
    when 'pickup'    then 'Đã lấy hàng'
    when 'transit'   then 'Đang vận chuyển'
    when 'delivered' then 'Đã giao hàng'
    when 'cancelled' then 'Đã huỷ vận đơn'
    when 'returned'  then 'Hoàn hàng'
    else coalesce(o.jt_status, 'Chưa gửi J&T')
  end                                   as jt_status_label,

  (o.jt_bill_code is not null)          as has_jt_order

from orders o
left join customers c on c.id = o.customer_id
left join (
  select
    order_id,
    count(*)            as item_count,
    sum(quantity)       as total_qty
  from order_items
  group by order_id
) items on items.order_id = o.id;

comment on view v_orders_full is 'Đơn hàng full data + flag cod_delivered_success + cột J&T (jt_bill_code, jt_txlogisticid, jt_status, jt_tracking_url, has_jt_order, jt_status_label). Admin donhang SELECT từ đây.';


-- =============================================================
-- 3. RLS: site_settings — GIỚI HẠN ghi cho authenticated, KHÔNG mở anon
--    (site_settings chứa key bí mật J&T — không nên để anon ghi được)
-- =============================================================
drop policy if exists p_anon_write_site_settings on site_settings;
drop policy if exists p_anon_update_site_settings on site_settings;

create policy p_auth_write_site_settings
  on site_settings for insert to authenticated with check (true);

create policy p_auth_update_site_settings
  on site_settings for update to authenticated using (true) with check (true);

-- Nếu bảng jt_config còn cho anon SELECT (theo policy cũ ở migration trước),
-- cân nhắc thu hẹp SELECT lại vì key J&T sẽ lộ ra frontend anon:
--   select value_json from site_settings where key = 'jt_config'
-- Gợi ý: tách riêng key bí mật (data_digest key) ra khỏi payload trả về
-- cho client, hoặc chuyển việc build data_digest sang backend/Edge Function.


