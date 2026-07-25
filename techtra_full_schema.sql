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
  is_sale        boolean      default false,           -- TRUE: hiện ở menu SALE; FALSE: hiện ở menu SẢN PHẨM
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
  add column if not exists intro_image_url text,
  add column if not exists is_sale         boolean default false;

create index if not exists idx_product_groups_slider
  on product_groups (is_slider) where is_slider = true;
create index if not exists idx_product_groups_parent
  on product_groups (parent_id);
create index if not exists idx_product_groups_sale
  on product_groups (is_sale) where is_sale = true;


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
-- =============================================================

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
