 
-- ==== FROM migration_voucher_public.sql START ==== 
-- =============================================================
-- Migration: Voucher public (cho táº¥t cáº£ KH)
-- Cháº¡y 1 láº§n trÃªn Supabase SQL Editor
-- ThÃªm cá»™t is_public vÃ o customer_vouchers
-- =============================================================
--
-- Má»¥c Ä‘Ã­ch: cho phÃ©p táº¡o voucher "public" â€” KHÃ”NG gáº¯n vá»›i customer_id
-- cá»¥ thá»ƒ, báº¥t ká»³ ai nháº­p code khi checkout cÅ©ng dÃ¹ng Ä‘Æ°á»£c.
-- Voucher cÃ¡ nhÃ¢n (rank silver/gold/platinum) giá»¯ nguyÃªn is_public=false.
-- =============================================================


-- =============================================================
-- 1. ThÃªm cá»™t is_public
-- =============================================================
alter table customer_vouchers
  add column if not exists is_public boolean default false;

-- Cho phÃ©p customer_id NULL (voucher public khÃ´ng gáº¯n vá»›i KH cá»¥ thá»ƒ)
alter table customer_vouchers
  alter column customer_id drop not null;

-- Index tÃ¬m voucher public nhanh theo code
create index if not exists idx_customer_vouchers_public
  on customer_vouchers (code)
  where is_public = true and is_active = true;

-- Comment
comment on column customer_vouchers.is_public is
  'TRUE: voucher public (customer_id IS NULL), ai cÅ©ng nháº­p code dÃ¹ng Ä‘Æ°á»£c. FALSE: voucher cÃ¡ nhÃ¢n (gáº¯n vá»›i customer_id).';

-- Rank NULL Ä‘Æ°á»£c phÃ©p vá»›i voucher public
alter table customer_vouchers
  alter column rank drop not null;


-- =============================================================
-- 2. View há»— trá»£: v_active_vouchers
--    Liá»‡t kÃª voucher cÃ²n háº¡n + chÆ°a dÃ¹ng, kÃ¨m thÃ´ng tin KH (náº¿u cÃ³)
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
  'Voucher cÃ²n háº¡n + chÆ°a dÃ¹ng (status: active/used/expired/inactive). Bao gá»“m cáº£ voucher public (customer_id IS NULL).';


-- =============================================================
-- 3. RLS: customer_vouchers Ä‘Ã£ cÃ³ policy
--    ThÃªm policy cho phÃ©p anon SELECT voucher (Ä‘á»ƒ shop checkout validate code)
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
-- ==== FROM migration_voucher_public.sql END ====
-- =============================================================
-- TECHTRA SHOP â€” FULL DATABASE SCHEMA (táº¥t cáº£ chá»©c nÄƒng Ä‘Ã£ code)
-- Project Supabase: https://pbuqcvlcqrxdammvbwvs.supabase.co
-- Updated: 2026-07-13
-- -------------------------------------------------------------
-- Má»¥c Ä‘Ã­ch: 1 file SQL DUY NHáº¤T cho toÃ n bá»™ dá»± Ã¡n.
--   â€¢ Postgres cho backend Express  (cháº¡y local báº±ng Docker)
--   â€¢ Supabase Postgres cho FE      (cháº¡y trong SQL Editor)
-- Táº¥t cáº£ báº£ng/cá»™t/policy Ä‘á»u idempotent â€” cháº¡y nhiá»u láº§n OK.
--
-- Bao gá»“m (cáº­p nháº­t Ä‘áº¿n 2026-07-13):
--   Â§0  Extensions + GRANT schema public (fix lá»—i permission)
--   Â§1  product_groups           â€” NhÃ³m sáº£n pháº©m (cÃ³ parent_id, slider_text, intro_*)
--   Â§2  products                 â€” Sáº£n pháº©m (máº·c Ä‘á»‹nh áº¨N khi táº¡o, cÃ³ flash sale)
--   Â§3  price_list               â€” Báº£ng giÃ¡ SKU (import vÃ o products)
--   Â§4  product_shipping_services â€” Dá»‹ch vá»¥ váº­n chuyá»ƒn J&T
--   Â§5  customers                â€” KhÃ¡ch hÃ ng
--   Â§6  orders / order_items     â€” ÄÆ¡n hÃ ng + chi tiáº¿t
--   Â§7  admins                   â€” TÃ i khoáº£n admin
--   Â§8  users                    â€” TÃ i khoáº£n ngÆ°á»i dÃ¹ng (auth shop)
--   Â§9  posts                    â€” BÃ i viáº¿t / ná»™i dung (cÃ³ source_url, summary, excerpt_html)
--   Â§10 homepage_banners
--   Â§11 homepage_sections + homepage_section_products
--   Â§12 homepage_config          â€” Cáº¥u hÃ¬nh trang chá»§ (background/hero/sections/flashSale)
--   Â§13 homepage_values          â€” 4 tháº» giÃ¡ trá»‹ thÆ°Æ¡ng hiá»‡u
--   Â§14 homepage_promo_banners   â€” 2 banner quáº£ng cÃ¡o
--   Â§15 homepage_articles        â€” BÃ i viáº¿t / tÃ i liá»‡u (Ä‘Ã£ loáº¡i bá» khá»i HomePage UI)
--   Â§16 homepage_blog            â€” GÃ³c chia sáº»
--   Â§17 homepage_picks           â€” Sáº¯p xáº¿p slider (UNIQUE kind+target_id)
--   Â§18 transactions             â€” Sá»• quá»¹ / doanh thu
--   Â§19 Triggers + Functions     â€” generate_order_code, update_updated_at
--   Â§20 RLS policies             â€” allow_all_<table> cho tá»«ng báº£ng
--   Â§21 Storage buckets + policies (product-images, homepage-assets)
--   Â§22 Dá»¯ liá»‡u máº«u
--   Â§23 Reload PostgREST cache
-- =============================================================


-- =============================================================
-- Â§0  EXTENSIONS + QUYá»€N TRUY Cáº¬P SCHEMA PUBLIC
-- =============================================================
create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- Supabase máº·c Ä‘á»‹nh Táº®T quyá»n USAGE trÃªn schema `public` Ä‘á»‘i vá»›i role
-- `anon` vÃ  `authenticated`. DÃ¹ Ä‘Ã£ táº¡o báº£ng + policy, FE váº«n bá»‹ tá»«
-- chá»‘i á»Ÿ bÆ°á»›c resolve schema. GRANT láº¡i lÃ  fix triá»‡t Ä‘á»ƒ.
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
-- Â§1  product_groups
-- =============================================================
create table if not exists product_groups (
  id             serial primary key,
  name           varchar(255) not null,
  slug           varchar(255) unique not null,
  description    text,
  image_url      text,
  condition_type varchar(20)  default 'manual',        -- 'manual' | 'automatic'
  is_active      boolean      default true,
  is_slider      boolean      default false,           -- Báº­t cá» nÃ y Ä‘á»ƒ hiá»‡n trong slider trang chá»§
  sort_order     integer      default 0,
  product_count  integer      default 0,
  created_at     timestamp    default now(),
  updated_at     timestamp    default now()
);

-- Cá»™t bá»• sung cho nhÃ³m: cha-con + slider/intro
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
-- Â§2  products
-- -------------------------------------------------------------
-- LÆ°u Ã½: is_active máº·c Ä‘á»‹nh FALSE â€” SP má»›i táº¡o (ká»ƒ cáº£ import tá»«
-- price_list) sáº½ áº¨N trÃªn web cho tá»›i khi admin báº­t tay (yÃªu cáº§u
-- "sáº£n pháº©m má»›i chÆ°a cÃ³ Ä‘á»§ thÃ´ng tin thÃ¬ áº©n trÃªn web").
-- =============================================================
create table if not exists products (
  id            serial primary key,
  name          varchar(255)  not null,
  slug          varchar(255)  unique not null,
  description   text,
  group_id      integer       references product_groups(id) on delete set null,
  price         numeric(12,2) not null default 0,
  final_price   numeric(12,2),                        -- GiÃ¡ sau giáº£m (tÃ­nh sáºµn)
  discount      numeric(5,2)  default 0,              -- % giáº£m
  stock         integer       default 0,
  sku           varchar(100)  unique,
  weight        numeric(10,2) default 0,
  weight_unit   varchar(5)    default 'g',
  height        numeric(8,2)  default 0,
  width         numeric(8,2)  default 0,
  length        numeric(8,2)  default 0,
  images        text[]        default '{}',            -- Máº£ng URL áº£nh (áº£nh[0] = áº£nh chÃ­nh)
  image_url     text,                                  -- Cache áº£nh Ä‘áº¡i diá»‡n (= images[0])
  video_url     text,
  content_file  text,                                  -- URL file PDF/Word Ä‘Ã­nh kÃ¨m
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
  -- âš  Máº¶C Äá»ŠNH FALSE: SP má»›i táº¡o áº©n trÃªn web (xem chÃº thÃ­ch Ä‘áº§u má»¥c Â§2)
  is_active     boolean       default false,
  is_featured   boolean       default false,          -- ÄÆ°á»£c phÃ©p vÃ o "Danh má»¥c ná»•i báº­t"
  is_flash_sale boolean       default false,          -- ÄÆ°á»£c phÃ©p vÃ o "Flash sale"
  percent_sold  integer       default 0,
  old_price     numeric(12,2),
  flash_sale_discount numeric(5,2),                   -- % giáº£m riÃªng cho Flash sale
  flash_sale_end_at   timestamptz,                    -- Thá»i Ä‘iá»ƒm káº¿t thÃºc Flash sale
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
-- Â§3  price_list  (báº£ng giÃ¡ â€” 1 dÃ²ng = 1 SKU; import sang products)
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
  unit        varchar(20)   default 'cÃ¡i',
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
-- Â§4  product_shipping_services  (J&T theo tá»«ng sáº£n pháº©m)
-- =============================================================
create table if not exists product_shipping_services (
  id           serial primary key,
  product_id   integer references products(id) on delete cascade,
  service_code varchar(20)  not null,                 -- 'EZ' | 'FAST' | 'SUPER'
  service_name varchar(100),
  is_active    boolean default true
);


-- =============================================================
-- Â§5  customers  (KhÃ¡ch hÃ ng mua hÃ ng)
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
-- Â§6  orders + order_items
-- =============================================================
create table if not exists orders (
  id              serial primary key,
  order_code      varchar(50) unique,                 -- TC-YYYYMMDD-XXXX (tá»± sinh)
  customer_id     integer references customers(id) on delete set null,
  customer_name   varchar(255),                       -- Snapshot tÃªn KH lÃºc Ä‘áº·t
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
  product_name varchar(255),                          -- Snapshot tÃªn SP
  product_sku  varchar(100),
  image_url    text,
  quantity     integer       not null default 1,
  unit_price   numeric(12,2) not null,
  discount     numeric(5,2)  default 0,
  subtotal     numeric(12,2) not null
);


-- =============================================================
-- Â§7  admins  (ÄÄƒng nháº­p /admin)
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
-- Â§8  users  (ÄÄƒng kÃ½ / Ä‘Äƒng nháº­p shop â€” backend Express)
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
-- Â§9  posts  (BÃ i viáº¿t / trang Ä‘á»c bÃ¡o)
-- -------------------------------------------------------------
-- Cá»™t bá»• sung (idempotent):
--   source_url        â€” link gá»‘c bÃ i bÃ¡o (sau khi scrape)
--   site_name         â€” tÃªn site: VnExpress, Tuá»•i Tráº»â€¦
--   summary           â€” tÃ³m táº¯t ngáº¯n 2-3 dÃ²ng
--   excerpt_html      â€” ná»™i dung HTML Ä‘Ã£ scrape (Readability)
--   thumbnail_source  â€” URL áº£nh Ä‘áº¡i diá»‡n láº¥y tá»« scrape
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
-- Â§9.1  news_categories  (NhÃ³m tin tá»©c 2 cáº¥p: cha â†’ con â†’ bÃ i)
-- -------------------------------------------------------------
-- BÃ i viáº¿t (`posts.category_id`) tham chiáº¿u tá»›i id nhÃ³m CON
-- (parent_id IS NOT NULL). Má»—i nhÃ³m CON thuá»™c 1 nhÃ³m CHA
-- (parent_id = root.id) hoáº·c lÃ  gá»‘c (parent_id IS NULL).
-- XoÃ¡ nhÃ³m cha â†’ cascade xoÃ¡ nhÃ³m con.
-- XoÃ¡ nhÃ³m con â†’ bÃ i viáº¿t set category_id = NULL (khÃ´ng cascade).
-- =============================================================
create table if not exists news_categories (
  id          serial primary key,
  name        varchar(255) not null,
  slug        varchar(255) unique not null,
  description text,
  icon        varchar(100),                          -- FontAwesome class (vd: 'fas fa-heart')
  image_url   text,                                  -- áº¢nh minh hoáº¡ nhÃ³m
  parent_id   integer references news_categories(id) on delete cascade,
  sort_order  integer      default 0,
  is_active   boolean      default true,
  created_at  timestamp    default now(),
  updated_at  timestamp    default now()
);

create index if not exists idx_news_categories_parent on news_categories (parent_id);
create index if not exists idx_news_categories_active on news_categories (is_active) where is_active = true;
create index if not exists idx_news_categories_order  on news_categories (sort_order);

-- Cá»™t má»›i cho `posts`: gáº¯n nhÃ³m + há»— trá»£ upload file PDF/Word
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
-- Â§10  homepage_banners
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
-- Â§11  homepage_sections + homepage_section_products
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
-- Â§12  homepage_config  (Cáº¥u hÃ¬nh trang chá»§ â€” 1 dÃ²ng duy nháº¥t)
-- -------------------------------------------------------------
-- Cáº¥u trÃºc JSONB:
--   background : { type: 'color'|'image'|'video', color, imageUrl, videoUrl }
--   hero       : { enabled, imageUrl, title, subtitle, ctaText, ctaLink }
--   sections   : { heroSlider, brandValues, categories, flashSale,
--                  bestSellers, promoBanners, blog, newsletter }
--   flash_sale : { title, enabled }   â† KHÃ”NG cÃ²n countdownSeconds (máº·c Ä‘á»‹nh)
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
    "title": "ChÃ o má»«ng Ä‘áº¿n vá»›i Techtra Shop",
    "subtitle": "Cá»­a hÃ ng cÃ´ng nghá»‡ â€” uy tÃ­n, cháº¥t lÆ°á»£ng, giao hÃ ng toÃ n quá»‘c",
    "ctaText": "KhÃ¡m phÃ¡ ngay",
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
    "title": "Giá» VÃ ng Deal Xá»‹n",
    "enabled": true
  }'::jsonb,
  updated_at  timestamptz default now(),
  constraint single_row check (id = 1)
);

insert into homepage_config (id) values (1) on conflict (id) do nothing;


-- =============================================================
-- Â§13  homepage_values  (4 tháº» giÃ¡ trá»‹ thÆ°Æ¡ng hiá»‡u)
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
-- Â§14  homepage_promo_banners  (2 banner quáº£ng cÃ¡o trÃ¡i/pháº£i)
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
-- Â§15  homepage_articles  (BÃ i viáº¿t / tÃ i liá»‡u PDF, Word)
-- -------------------------------------------------------------
-- Báº£ng váº«n cÃ²n trong DB vÃ¬ cÃ³ thá»ƒ dÃ¹ng láº¡i; hiá»‡n táº¡i HomePage UI
-- Ä‘Ã£ bá» pháº§n "Articles" (theo yÃªu cáº§u 2026-07-13) nhÆ°ng KHÃ”NG xÃ³a
-- báº£ng Ä‘á»ƒ khÃ´ng phÃ¡ dá»¯ liá»‡u cÅ©.
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
-- Â§16  homepage_blog  (GÃ³c chia sáº»)
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
-- Â§17  homepage_picks  (Sáº¯p xáº¿p slider â€” featured/flash_sale/slider)
-- -------------------------------------------------------------
-- RÃ ng buá»™c UNIQUE (kind, target_id) Ä‘á»ƒ khi upsert trong admin khÃ´ng
-- bá»‹ thÃªm trÃ¹ng 1 sáº£n pháº©m 2 láº§n vÃ o cÃ¹ng 1 block.
-- =============================================================
create table if not exists homepage_picks (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('slider', 'featured', 'flash_sale')),
  target_id    text not null,                         -- products.id (text/uuid) hoáº·c product_groups.id
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
-- Â§18  transactions  (Sá»• quá»¹ / doanh thu â€” dashboard)
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
-- Â§19  TRIGGERS + FUNCTIONS
-- =============================================================

-- Tá»± sinh mÃ£ Ä‘Æ¡n hÃ ng TC-YYYYMMDD-XXXX
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


-- Tá»± cáº­p nháº­t updated_at khi UPDATE
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
-- Â§20  ROW LEVEL SECURITY  (má»Ÿ quyá»n cho anon trÃªn Supabase)
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

-- Táº¡o policy "allow_all_<table>" cho tá»«ng báº£ng
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
-- Â§21  STORAGE BUCKETS + POLICIES
-- Táº¡o 2 bucket public + má»Ÿ quyá»n CRUD cho anon.
-- Skip in standard PostgreSQL (Supabase-only feature)
-- =============================================================
do $
begin
  -- Check if storage schema exists (Supabase-specific)
  if exists (select 1 from information_schema.schemas where schema_name = 'storage') then
    -- 21.1 Táº O BUCKET (idempotent nhá» ON CONFLICT)
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values
      ('product-images',  'product-images',  true, 52428800, null),  -- 50 MB, má»i MIME
      ('homepage-assets', 'homepage-assets', true, 52428800, null)
    on conflict (id) do update
      set public          = excluded.public,
          file_size_limit = excluded.file_size_limit;

    -- 21.2 XOÃ POLICY CÅ¨ (náº¿u cÃ³)
    drop policy if exists "Allow public upload"  on storage.objects;
    drop policy if exists "Allow public read"    on storage.objects;
    drop policy if exists "Allow public update"  on storage.objects;
    drop policy if exists "Allow public delete"  on storage.objects;
    drop policy if exists "Allow anon upload"    on storage.objects;
    drop policy if exists "Allow anon select"    on storage.objects;

    -- 21.3 Táº O POLICY Má»šI (cho cáº£ 2 bucket)
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
-- Â§22  Dá»® LIá»†U MáºªU  (cháº¡y láº¡i nhiá»u láº§n Ä‘á»u OK)
-- =============================================================

-- Admin máº·c Ä‘á»‹nh (password: admin123 â€” Ä‘á»•i ngay)
insert into admins (name, email, password, role) values
  ('Super Admin', 'admin@techtra.vn', '$2b$10$placeholder_hash_change_me', 'superadmin')
on conflict (email) do nothing;

-- User máº·c Ä‘á»‹nh cho shop
insert into users (username, email, password_hash, full_name, role) values
  ('admin', 'admin@techtra.vn', '$2b$10$placeholder_admin_hash', 'Quáº£n trá»‹ viÃªn', 'admin'),
  ('user',  'user@techtra.vn',  '$2b$10$placeholder_user_hash',  'KhÃ¡ch hÃ ng',    'user')
on conflict (username) do nothing;

-- NhÃ³m sáº£n pháº©m máº«u
insert into product_groups (name, slug, description, is_active, is_slider, sort_order) values
  ('Sáº£n pháº©m ná»•i báº­t',   'san-pham-noi-bat',   'CÃ¡c sáº£n pháº©m bÃ¡n cháº¡y nháº¥t', true, true,  1),
  ('Sáº£n pháº©m khuyáº¿n mÃ£i', 'san-pham-khuyen-mai', 'Äang giáº£m giÃ¡',             true, false, 2),
  ('Trang chá»§',           'trang-chu',           'Hiá»ƒn thá»‹ trÃªn trang chá»§',   true, true,  3)
on conflict (slug) do nothing;

-- Section trang chá»§ máº«u
insert into homepage_sections (section_key, title, is_active, sort_order) values
  ('featured',     'Sáº£n pháº©m ná»•i báº­t', true, 1),
  ('sale',         'Äang giáº£m giÃ¡',    true, 2),
  ('new_arrivals', 'HÃ ng má»›i vá»',      true, 3)
on conflict (section_key) do nothing;

-- Báº£ng giÃ¡ máº«u (import vÃ o products)
insert into price_list (sku, name, price, discount, final_price, stock, unit, sort_order) values
  ('SP001', 'NÆ°á»›c rá»­a bÃ¡t Techtra 750ml', 89000,  10,  80100, 100, 'chai', 1),
  ('SP002', 'Bá»™t giáº·t Techtra 3kg',       165000, 15, 140250,  60, 'tÃºi',  2),
  ('SP003', 'NÆ°á»›c lau sÃ n Techtra 1L',    55000,  0,  55000, 200, 'chai', 3)
on conflict (sku) do nothing;

-- 4 tháº» giÃ¡ trá»‹ thÆ°Æ¡ng hiá»‡u máº«u
insert into homepage_values (icon, title, description, sort_order) values
  ('fas fa-seedling',     '100% ThiÃªn NhiÃªn',   'NguyÃªn liá»‡u thuáº§n thá»±c váº­t tinh khiáº¿t tá»« vÆ°á»n dÆ°á»£c liá»‡u Viá»‡t Nam', 1),
  ('fas fa-shield-heart', 'LÃ nh vÃ  Tháº­t',       'CÃ´ng thá»©c tá»‘i giáº£n, khÃ´ng cháº¥t báº£o quáº£n Ä‘á»™c háº¡i, cam káº¿t cÃ´ng khai thÃ nh pháº§n', 2),
  ('fas fa-industry',     'NhÃ  MÃ¡y Äáº¡t CGMP',   'Quy trÃ¬nh sáº£n xuáº¥t khÃ©p kÃ­n, vÃ´ trÃ¹ng Ä‘áº¡t chá»©ng nháº­n CGMP ASEAN', 3),
  ('fas fa-baby',         'An ToÃ n Cho BÃ© & Báº§u','Má»¹ pháº©m siÃªu lÃ nh tÃ­nh, Ä‘Æ°á»£c khuyÃªn dÃ¹ng bá»Ÿi cÃ¡c chuyÃªn gia y táº¿', 4)
on conflict do nothing;

-- 2 banner quáº£ng cÃ¡o máº«u
insert into homepage_promo_banners (position, tag, title, cta_text, cta_link, sort_order) values
  ('left',  'QuÃ  táº·ng ngá»t ngÃ o',  'Combo QuÃ  Táº·ng Cho Ná»­a YÃªu ThÆ°Æ¡ng', 'Mua ngay',  '#', 1),
  ('right', 'Liá»‡u phÃ¡p phá»¥c há»“i',  'ChÄƒm SÃ³c TÃ³c DÆ°á»£c Liá»‡u BÆ°á»Ÿi Äá»',    'KhÃ¡m phÃ¡',  '#', 2)
on conflict do nothing;

-- 3 bÃ i blog máº«u
insert into homepage_blog (title, description, author, sort_order) values
  ('Top 5 ThÃ nh Pháº§n ThiÃªn NhiÃªn GiÃºp Phá»¥c Há»“i TÃ³c Rá»¥ng Cá»±c Nháº¡y',
   'KhÃ¡m phÃ¡ bÃ­ quyáº¿t chÄƒm sÃ³c tÃ³c tháº£o dÆ°á»£c an toÃ n hiá»‡u quáº£ tá»« tinh dáº§u bÆ°á»Ÿi, bá»“ káº¿t, hÆ°Æ¡ng nhu cÃ´ Ä‘áº·c.',
   'DÆ°á»£c sÄ© Cá» Má»m', 1),
  ('Báº§u BÃ­ Váº«n Xinh Ráº¡ng Ngá»i Nhá» 4 BÆ°á»›c ChÄƒm Da Tá»‘i Giáº£n NÃ y',
   'Máº¹o thiáº¿t láº­p chu trÃ¬nh dÆ°á»¡ng da lÃ nh tÃ­nh, cam káº¿t 100% khÃ´ng chá»©a silicon, parabens vÃ  hÃ³a cháº¥t Ä‘á»™c háº¡i.',
   'Skin Specialist', 2),
  ('Chiáº¿n Dá»‹ch Trá»“ng Rá»«ng Giá»¯ Äáº¥t: Cá» Má»m Äá»“ng HÃ nh CÃ¹ng HÃ nh Tinh Xanh',
   'HÃ nh trÃ¬nh phá»§ xanh cÃ¡c váº¡t Ä‘á»“i trá»‘ng miá»n Trung vá»›i hÆ¡n 10,000 cÃ¢y xanh vÃ  cam káº¿t giáº£m thiá»ƒu rÃ¡c tháº£i nhá»±a.',
   'Green Life', 3)
on conflict do nothing;

-- NhÃ³m tin tá»©c máº«u (4 nhÃ³m CHA â€” dÃ¹ng lÃ m mega-menu BÃ€I VIáº¾T)
insert into news_categories (name, slug, description, icon, parent_id, sort_order, is_active) values
  ('ChÄƒm sÃ³c cÆ¡ thá»ƒ', 'cham-soc-co-the', 'BÃ­ quyáº¿t chÄƒm sÃ³c cÆ¡ thá»ƒ toÃ n diá»‡n',  'fas fa-spa',         NULL, 1, true),
  ('ChÄƒm sÃ³c da',     'cham-soc-da',     'LÃ m Ä‘áº¹p & dÆ°á»¡ng da chuáº©n khoa há»c',   'fas fa-leaf',         NULL, 2, true),
  ('ChÄƒm sÃ³c tÃ³c',    'cham-soc-toc',    'Phá»¥c há»“i tÃ³c hÆ° tá»•n',                'fas fa-magic',        NULL, 3, true),
  ('Cáº©m nang',        'cam-nang',        'Máº¹o váº·t & tin tá»©c há»¯u Ã­ch',           'fas fa-book-open',    NULL, 4, true)
on conflict (slug) do nothing;

-- NhÃ³m CON máº«u (3 con cho "ChÄƒm sÃ³c cÆ¡ thá»ƒ" â€” Ä‘á»ƒ demo cÃ¢y 2 cáº¥p)
insert into news_categories (name, slug, description, icon, parent_id, sort_order, is_active)
select v.name, v.slug, v.description, v.icon, p.id, v.sort_order, true
from (values
  ('ChÄƒm sÃ³c mÃ´i',         'cham-soc-moi',         'DÆ°á»¡ng mÃ´i má»m máº¡i',         'fas fa-kiss-wink-heart', 1),
  ('ChÄƒm sÃ³c tay & chÃ¢n',  'cham-soc-tay-chan',    'Da tay chÃ¢n má»‹n mÃ ng',      'fas fa-hand-paper',      2),
  ('ChÄƒm sÃ³c máº¹ & bÃ©',     'cham-soc-me-be',       'An toÃ n cho cáº£ máº¹ vÃ  bÃ©',   'fas fa-baby',            3)
) as v(name, slug, description, icon, sort_order)
cross join lateral (
  select id from news_categories where slug = 'cham-soc-co-the' limit 1
) as p
where not exists (select 1 from news_categories nc where nc.slug = v.slug);


-- =============================================================
-- Â§23  LÃ€M Má»šI CACHE SCHEMA SUPABASE
-- =============================================================
notify pgrst, 'reload schema';


-- =============================================================
-- Háº¾T â€” ToÃ n bá»™ schema Techtra Shop Ä‘Ã£ sáºµn sÃ ng.
-- =============================================================
-- HÆ¯á»šNG DáºªN Sá»¬ Dá»¤NG:
--  1. Cháº¡y file nÃ y trong Supabase SQL Editor HOáº¶C
--     docker exec -i techtra-db psql -U postgres -d techtra < techtra_full_schema.sql
--  2. Storage bucket "product-images" vÃ  "homepage-assets" Ä‘Ã£ táº¡o tá»± Ä‘á»™ng.
--  3. Admin máº·c Ä‘á»‹nh:
--     email:    admin@techtra.vn
--     password: admin123   (hash placeholder â€” Ä‘á»•i báº±ng API register)
--  4. Sau khi cháº¡y:
--     â€¢ Nhá»› reload PostgREST cache (dÃ²ng Â§23 Ä‘Ã£ lÃ m)
--     â€¢ Trong admin: tab "TrÃªn ká»‡" â†’ chip "ðŸ™ˆ Äang áº©n" sáº½ tháº¥y
--       cÃ¡c SP má»›i (is_active=false) Ä‘ang chá» bá»• sung thÃ´ng tin
-- =============================================================
-- =============================================================
-- FIX: Táº O Láº I Báº¢NG price_list  (cháº¡y 1 láº§n duy nháº¥t trong Supabase SQL Editor)
-- Project: https://pbuqcvlcqrxdammvbwvs.supabase.co
-- =============================================================
-- Náº¿u báº£ng Ä‘Ã£ tá»“n táº¡i nhÆ°ng RLS cháº·n â†’ Ä‘oáº¡n nÃ y sáº½ má»Ÿ khÃ³a.
-- Náº¿u báº£ng chÆ°a tá»«ng tá»“n táº¡i â†’ Ä‘oáº¡n nÃ y táº¡o má»›i tá»« Ä‘áº§u.

-- BÆ¯á»šC 1: ThÃ¡o má»i policy cÅ© + xÃ³a báº£ng náº¿u Ä‘ang tá»“n táº¡i dá»Ÿ dang
-- (chá»‰ xÃ³a náº¿u tá»“n táº¡i, trÃ¡nh lá»—i náº¿u chÆ°a cÃ³)
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'price_list') then
    -- Báº£ng Ä‘Ã£ tá»“n táº¡i â†’ thÃ¡o policy trÆ°á»›c
    execute 'drop policy if exists "allow_all_price_list" on public.price_list';
    execute 'drop policy if exists "Allow public" on public.price_list';
    -- KHÃ”NG xÃ³a báº£ng Ä‘á»ƒ giá»¯ data náº¿u cÃ³. Náº¿u muá»‘n xÃ³a sáº¡ch, bá» comment:
    -- execute 'drop table if exists public.price_list cascade';
  end if;
end $$;

-- BÆ¯á»šC 2: Táº¡o báº£ng (idempotent)
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
  unit         varchar(20)   default 'cÃ¡i',
  note         text,
  is_active    boolean       default true,
  sort_order   integer       default 0,
  created_at   timestamp     default now(),
  updated_at   timestamp     default now()
);

-- BÆ¯á»šC 3: Index (idempotent)
create index if not exists idx_price_list_sku    on public.price_list (sku);
create index if not exists idx_price_list_group  on public.price_list (group_id);
create index if not exists idx_price_list_active on public.price_list (is_active);

-- BÆ¯á»šC 4: Báº­t RLS
alter table public.price_list enable row level security;

-- BÆ¯á»šC 5: Táº¡o policy (chá»‰ táº¡o náº¿u chÆ°a cÃ³ policy nÃ o)
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

-- BÆ¯á»šC 6: Trigger updated_at (chá»‰ táº¡o náº¿u hÃ m update_updated_at Ä‘Ã£ cÃ³)
do $$
begin
  if exists (select 1 from pg_proc where proname = 'update_updated_at') then
    execute 'drop trigger if exists trg_price_list_upd on public.price_list';
    execute 'create trigger trg_price_list_upd
             before update on public.price_list
             for each row execute function update_updated_at()';
  else
    raise notice 'Bá» qua trigger: hÃ m update_updated_at chÆ°a tá»“n táº¡i (sáº½ tá»± cÃ³ khi cháº¡y techtra_complete_schema.sql Ä‘áº§y Ä‘á»§)';
  end if;
end $$;

-- BÆ¯á»šC 7: Seed dá»¯ liá»‡u máº«u
insert into public.price_list (sku, name, price, discount, final_price, stock, unit, sort_order)
values
  ('SP001', 'NÆ°á»›c rá»­a bÃ¡t Techtra 750ml',  89000,  10,  80100, 100, 'chai', 1),
  ('SP002', 'Bá»™t giáº·t Techtra 3kg',        165000, 15, 140250,  60, 'tÃºi',  2),
  ('SP003', 'NÆ°á»›c lau sÃ n Techtra 1L',      55000,  0,  55000, 200, 'chai', 3)
on conflict (sku) do nothing;

-- BÆ¯á»šC 8: GRANT quyá»n cho anon / authenticated (phÃ²ng trÆ°á»ng há»£p schema public bá»‹ revoke)
grant all privileges on table public.price_list to anon, authenticated, service_role;
grant usage, select on sequence public.price_list_id_seq to anon, authenticated, service_role;

-- BÆ¯á»šC 9: KIá»‚M TRA â€” in ra thÃ´ng tin báº£ng
select
  'âœ… Tá»•ng sá»‘ dÃ²ng' as info,
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

-- BÆ¯á»šC 10: Reload PostgREST cache (skip if not available in standard PostgreSQL)
do $
begin
  perform pg_notify('pgrst', 'reload schema');
exception
  when others then
    -- Ignore if pgrst extension is not available (standard PostgreSQL)
    null;
end $;

-- Äá»£i 5â€“10 giÃ¢y rá»“i refresh trang admin (Ctrl+Shift+R).
-- =============================================================
-- Báº£ng product_reviews: lÆ°u Ä‘Ã¡nh giÃ¡ cá»§a khÃ¡ch hÃ ng trÃªn shop
-- =============================================================
create table if not exists product_reviews (
  id            bigserial    primary key,
  product_id    bigint       not null references products(id) on delete cascade,
  rating        integer      not null check (rating between 1 and 5),
  comment       text,
  reviewer_name varchar(120) default 'KhÃ¡ch hÃ ng',
  is_approved   boolean      default true,
  created_at    timestamptz  default now()
);

create index if not exists idx_product_reviews_product
  on product_reviews (product_id, created_at desc);

-- View tá»•ng há»£p rating + sá»‘ lÆ°á»£t Ä‘Ã¡nh giÃ¡ cho má»—i sáº£n pháº©m (tiá»‡n cho viá»‡c Ä‘á»“ng bá»™ vÃ o products.rating/reviews)
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
-- Báº­t RLS (náº¿u Supabase tá»± báº­t sáºµn khi táº¡o báº£ng) vÃ  thÃªm policy cho phÃ©p Ä‘á»c/ghi
-- CÃ¡ch 1: Cho phÃ©p má»i thao tÃ¡c vá»›i anon key (giá»‘ng háº§u háº¿t báº£ng admin ná»™i bá»™ khÃ¡c)

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

-- Báº£ng nhÃ³m upload (há»— trá»£ cÃ¢y 2 cáº¥p: cha / con)
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

-- Slug lÃ  duy nháº¥t trong pháº¡m vi cÃ¹ng 1 cha (cho phÃ©p trÃ¹ng slug giá»¯a cÃ¡c cha khÃ¡c nhau)
create unique index if not exists upload_groups_slug_per_parent_uidx
  on upload_groups (parent_id, slug);

-- Náº¿u muá»‘n slug duy nháº¥t TOÃ€N Bá»˜ (khÃ´ng phÃ¢n biá»‡t cha/con), dÃ¹ng cÃ¡i nÃ y thay cho index trÃªn:
-- create unique index if not exists upload_groups_slug_uidx
--   on upload_groups (slug);

create index if not exists upload_groups_parent_id_idx
  on upload_groups (parent_id);

create index if not exists upload_groups_sort_order_idx
  on upload_groups (sort_order);

-- Tá»± Ä‘á»™ng cáº­p nháº­t updated_at má»—i khi update
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

-- Náº¿u muá»‘n mÃ£ nhÃ³m lÃ  duy nháº¥t (khÃ´ng trÃ¹ng)
create unique index product_groups_code_key
  on product_groups (code)
  where code is not null;

  ALTER TABLE products
ADD COLUMN is_bulky boolean NOT NULL DEFAULT false;

ALTER TABLE products
ADD COLUMN jt_services text[] DEFAULT '{}';

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- Migration: ThÃªm cáº¥u hÃ¬nh "Banner popup thÃ´ng bÃ¡o" vÃ o báº£ng homepage_config
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- Má»¥c Ä‘Ã­ch: lÆ°u cáº¥u hÃ¬nh modal popup hiá»‡n khi khÃ¡ch vÃ o trang chá»§
-- (báº­t/táº¯t, tiÃªu Ä‘á», áº£nh, link, sá»‘ ngÃ y áº©n khi khÃ¡ch báº¥m "KhÃ´ng hiá»ƒn thá»‹ láº¡i").
--
-- Giáº£ Ä‘á»‹nh báº£ng homepage_config Ä‘Ã£ tá»“n táº¡i vá»›i cÃ¡c cá»™t dáº¡ng jsonb tÆ°Æ¡ng tá»±
-- background / hero / sections / flash_sale (theo Ä‘Ãºng pattern cÃ¡c cá»™t cÅ©).
-- Náº¿u tÃªn cá»™t/báº£ng thá»±c táº¿ khÃ¡c, chá»‰nh láº¡i cho khá»›p trÆ°á»›c khi cháº¡y.
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- 1) ThÃªm cá»™t popup (jsonb) náº¿u chÆ°a cÃ³, kÃ¨m giÃ¡ trá»‹ máº·c Ä‘á»‹nh
ALTER TABLE homepage_config
  ADD COLUMN IF NOT EXISTS popup jsonb NOT NULL DEFAULT jsonb_build_object(
    'enabled', false,
    'title', 'THÃ”NG BÃO',
    'imageUrl', '',
    'link', '',
    'dontShowDays', 7
  );

-- 2) Vá»›i cÃ¡c dÃ²ng cáº¥u hÃ¬nh Ä‘Ã£ tá»“n táº¡i tá»« trÆ°á»›c khi cÃ³ cá»™t nÃ y, Ä‘áº£m báº£o popup
--    khÃ´ng bá»‹ NULL (phÃ²ng trÆ°á»ng há»£p cá»™t Ä‘Æ°á»£c thÃªm báº±ng cÃ¡ch khÃ¡c khÃ´ng cÃ³
--    DEFAULT, hoáº·c dá»¯ liá»‡u cÅ© bá»‹ null hoÃ¡ thá»§ cÃ´ng).
UPDATE homepage_config
SET popup = jsonb_build_object(
  'enabled', false,
  'title', 'THÃ”NG BÃO',
  'imageUrl', '',
  'link', '',
  'dontShowDays', 7
)
WHERE popup IS NULL;

-- 3) Comment mÃ´ táº£ cá»™t Ä‘á»ƒ dá»… tra cá»©u trong Supabase Studio
COMMENT ON COLUMN homepage_config.popup IS
  'Cáº¥u hÃ¬nh popup thÃ´ng bÃ¡o hiá»‡n khi khÃ¡ch vÃ o trang chá»§: {enabled, title, imageUrl, link, dontShowDays}';

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- Storage: áº£nh popup Ä‘Æ°á»£c upload qua homepageApi.uploadFile(file, "popup")
-- vÃ  dÃ¹ng chung bucket/policy vá»›i cÃ¡c áº£nh khÃ¡c cá»§a trang chá»§ (background,
-- hero, promo, blog...). Náº¿u bucket Ä‘Ã³ Ä‘Ã£ cÃ³ policy cho phÃ©p admin ghi vÃ 
-- public Ä‘á»c theo prefix chung, KHÃ”NG cáº§n thÃªm policy riÃªng cho "popup".
--
-- Náº¿u bucket cá»§a báº¡n giá»›i háº¡n theo whitelist tá»«ng subfolder cá»¥ thá»ƒ (vÃ­ dá»¥
-- chá»‰ cho phÃ©p 'background/', 'hero/', 'promo/', 'blog/'), thÃªm 'popup/' vÃ o
-- danh sÃ¡ch Ä‘Ã³. VÃ­ dá»¥ máº«u (CHá»ˆNH Láº I tÃªn bucket + policy cho khá»›p thá»±c táº¿):
--
-- create policy "Cho phÃ©p Ä‘á»c public áº£nh popup"
--   on storage.objects for select
--   using (bucket_id = 'homepage' and (storage.foldername(name))[1] = 'popup');
--
-- create policy "Cho phÃ©p admin upload áº£nh popup"
--   on storage.objects for insert
--   with check (bucket_id = 'homepage' and (storage.foldername(name))[1] = 'popup');
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

ALTER TABLE product_groups
ADD COLUMN is_sale BOOLEAN DEFAULT FALSE;


-- -- =============================================================
-- -- Migration: J&T Express integration
-- -- Cháº¡y 1 láº§n trÃªn Supabase SQL Editor
-- -- ThÃªm cá»™t váº­n Ä‘Æ¡n J&T vÃ o orders + cáº­p nháº­t view v_orders_full
-- -- =============================================================
-- --
-- -- Phá»¥ thuá»™c:
-- --   - báº£ng orders(id, order_code, status, ...) â€” Ä‘Ã£ cÃ³
-- --   - view v_orders_full â€” Ä‘Ã£ cÃ³ (sáº½ CREATE OR REPLACE)
-- --
-- -- Cá»™t má»›i:
-- --   jt_bill_code      â€” mÃ£ váº­n Ä‘Æ¡n J&T tráº£ vá»
-- --   jt_waybill_no     â€” mÃ£ váº­n Ä‘Æ¡n ná»™i bá»™ Techtra
-- --   jt_tracking_url   â€” URL tracking cÃ´ng khai
-- --   jt_service_code   â€” '01'=EZ, '02'=STD, '03'=FAST
-- --   jt_weight_grams   â€” trá»ng lÆ°á»£ng Ä‘Ã£ gá»­i J&T
-- --   jt_shipping_fee   â€” phÃ­ J&T tÃ­nh Ä‘Æ°á»£c
-- --   jt_status         â€” tráº¡ng thÃ¡i J&T (created/pickup/transit/delivered/cancelled)
-- --   jt_last_trace     â€” láº§n tra cá»©u cuá»‘i (jsonb)
-- --   jt_created_at     â€” lÃºc táº¡o váº­n Ä‘Æ¡n
-- --   jt_pickup_id      â€” ID lá»‡nh pickup
-- --   jt_cancel_reason  â€” lÃ½ do huá»·
-- -- =============================================================


-- -- =============================================================
-- -- 1. ThÃªm cá»™t tracking váº­n Ä‘Æ¡n
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

-- -- Index Ä‘á»ƒ tra cá»©u nhanh theo billCode
-- create index if not exists idx_orders_jt_bill on orders(jt_bill_code);
-- create index if not exists idx_orders_jt_status on orders(jt_status);

-- -- Comment giÃºp admin hiá»ƒu cá»™t khi xem schema
-- comment on column orders.jt_bill_code     is 'MÃ£ váº­n Ä‘Æ¡n J&T tráº£ vá» (billCode/waybillNo)';
-- comment on column orders.jt_service_code  is 'MÃ£ dá»‹ch vá»¥ J&T: 01=EZ, 02=STD, 03=FAST';
-- comment on column orders.jt_status        is 'Tráº¡ng thÃ¡i váº­n Ä‘Æ¡n: created / pickup / transit / delivered / cancelled';
-- comment on column orders.jt_tracking_url  is 'URL tra cá»©u cÃ´ng khai tá»« J&T';
-- comment on column orders.jt_last_trace    is 'Láº§n trace cuá»‘i (jsonb) â€” lÆ°u response tá»« jtTraceOrder';


-- -- =============================================================
-- -- 2. Cáº­p nháº­t view v_orders_full
-- --    ThÃªm 4 cá»™t J&T + 1 cá»™t derived jt_status_label
-- -- =============================================================
-- -- LÆ°u Ã½: view nÃ y Ä‘Æ°á»£c khai bÃ¡o á»Ÿ migration_loyalty_and_orders.sql dÃ²ng 249.
-- -- CREATE OR REPLACE nÃ y sáº½ overwrite view cÅ©. Náº¿u sau nÃ y view bá»‹ sá»­a thÃªm,
-- -- cáº§n cáº­p nháº­t cáº£ 2 chá»—.
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

--   -- Sá»‘ lÆ°á»£ng item + sá»‘ SP
--   coalesce(items.item_count, 0)        as item_count,
--   coalesce(items.total_qty, 0)         as total_qty,

--   o.created_at,
--   o.updated_at,

--   -- Tráº¡ng thÃ¡i COD: náº¿u payment_method='cod' vÃ  status='done' â†’ Ä‘Ã£ nháº­n hÃ ng thÃ nh cÃ´ng
--   case
--     when o.payment_method = 'cod' and o.status = 'done' then true
--     else false
--   end                                   as cod_delivered_success,

--   -- â•â•â•â•â•â•â• J&T Express â•â•â•â•â•â•â•
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

--   -- Cá»™t derived: giáº£i mÃ£ jt_status sang text tiáº¿ng Viá»‡t
--   case o.jt_status
--     when 'created'   then 'ÄÃ£ táº¡o váº­n Ä‘Æ¡n'
--     when 'pickup'    then 'ÄÃ£ láº¥y hÃ ng'
--     when 'transit'   then 'Äang váº­n chuyá»ƒn'
--     when 'delivered' then 'ÄÃ£ giao hÃ ng'
--     when 'cancelled' then 'ÄÃ£ huá»· váº­n Ä‘Æ¡n'
--     when 'returned'  then 'HoÃ n hÃ ng'
--     when null        then 'ChÆ°a gá»­i J&T'
--     else o.jt_status
--   end                                   as jt_status_label,

--   -- Flag tiá»‡n: Ä‘Ã£ cÃ³ billCode J&T chÆ°a
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

-- comment on view v_orders_full is 'ÄÆ¡n hÃ ng full data + flag cod_delivered_success + cá»™t J&T (jt_bill_code, jt_status, jt_tracking_url, has_jt_order, jt_status_label). Admin donhang SELECT tá»« Ä‘Ã¢y.';


-- -- =============================================================
-- -- 3. RLS: site_settings Ä‘Ã£ Ä‘Æ°á»£c enable RLS á»Ÿ migration_loyalty_and_orders.sql.
-- --    Policy hiá»‡n táº¡i:
-- --      - service_role: ALL (full quyá»n)
-- --      - anon/authenticated: SELECT
-- --    â†’ Cáº§n thÃªm policy cho phÃ©p admin (anon) INSERT/UPDATE Ä‘á»ƒ lÆ°u config J&T.
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
-- Migration: Voucher public (cho táº¥t cáº£ KH)
-- Cháº¡y 1 láº§n trÃªn Supabase SQL Editor
-- ThÃªm cá»™t is_public vÃ o customer_vouchers
-- =============================================================
--
-- Má»¥c Ä‘Ã­ch: cho phÃ©p táº¡o voucher "public" â€” KHÃ”NG gáº¯n vá»›i customer_id
-- cá»¥ thá»ƒ, báº¥t ká»³ ai nháº­p code khi checkout cÅ©ng dÃ¹ng Ä‘Æ°á»£c.
-- Voucher cÃ¡ nhÃ¢n (rank silver/gold/platinum) giá»¯ nguyÃªn is_public=false.
-- =============================================================


-- =============================================================
-- 1. ThÃªm cá»™t is_public
-- =============================================================
alter table customer_vouchers
  add column if not exists is_public boolean default false;

-- Cho phÃ©p customer_id NULL (voucher public khÃ´ng gáº¯n vá»›i KH cá»¥ thá»ƒ)
alter table customer_vouchers
  alter column customer_id drop not null;

-- Index tÃ¬m voucher public nhanh theo code
create index if not exists idx_customer_vouchers_public
  on customer_vouchers (code)
  where is_public = true and is_active = true;

-- Comment
comment on column customer_vouchers.is_public is
  'TRUE: voucher public (customer_id IS NULL), ai cÅ©ng nháº­p code dÃ¹ng Ä‘Æ°á»£c. FALSE: voucher cÃ¡ nhÃ¢n (gáº¯n vá»›i customer_id).';

-- Rank NULL Ä‘Æ°á»£c phÃ©p vá»›i voucher public
alter table customer_vouchers
  alter column rank drop not null;


-- =============================================================
-- 2. View há»— trá»£: v_active_vouchers
--    Liá»‡t kÃª voucher cÃ²n háº¡n + chÆ°a dÃ¹ng, kÃ¨m thÃ´ng tin KH (náº¿u cÃ³)
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
  'Voucher cÃ²n háº¡n + chÆ°a dÃ¹ng (status: active/used/expired/inactive). Bao gá»“m cáº£ voucher public (customer_id IS NULL).';


-- =============================================================
-- 3. RLS: customer_vouchers Ä‘Ã£ cÃ³ policy
--    ThÃªm policy cho phÃ©p anon SELECT voucher (Ä‘á»ƒ shop checkout validate code)
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
-- Migration: KhÃ¡ch hÃ ng thÃ¢n thiáº¿t + Quáº£n lÃ½ Ä‘Æ¡n hÃ ng
-- Cháº¡y 1 láº§n trÃªn Supabase SQL Editor sau khi Ä‘Ã£ cÃ³ schema
-- customers / orders / order_items (xem techtra_full_schema.sql Â§5, Â§6)
-- =============================================================
--
-- Phá»¥ thuá»™c:
--   - báº£ng customers(id, name, email, phone)              â† Ä‘Ã£ cÃ³
--   - báº£ng orders(id, customer_id, status, final_price)    â† Ä‘Ã£ cÃ³
--   - báº£ng order_items(id, order_id, product_id, quantity) â† Ä‘Ã£ cÃ³
--   - báº£ng products(id, name, slug)                        â† Ä‘Ã£ cÃ³
--   - báº£ng categories hoáº·c product_groups                  â† khÃ´ng báº¯t buá»™c
--
-- NguyÃªn táº¯c:
--   â€¢ KHÃ”NG sá»­a schema customers/orders/order_items â€” chá»‰ thÃªm báº£ng phá»¥.
--   â€¢ Má»™t KH cÃ³ thá»ƒ cÃ³ SÄT hoáº·c Email (1 trong 2 cÃ³ thá»ƒ NULL).
--   â€¢ Tá»•ng tiá»n chá»‰ tÃ­nh khi orders.status = 'done' (nháº­n hÃ ng thÃ nh cÃ´ng).
--     RiÃªng Ä‘Æ¡n ship COD: chá»‰ tÃ­nh khi Ä‘Ã£ nháº­n hÃ ng thÃ nh cÃ´ng.
--   â€¢ Táº¥t cáº£ tÃ­nh toÃ¡n tá»•ng há»£p (LTV, AOV, list SP) cháº¡y báº±ng VIEW â€”
--     admin dashboard Ä‘á»c VIEW, khÃ´ng cáº§n trigger phá»©c táº¡p.
-- =============================================================


-- =============================================================
-- 1. customer_stats
--    Má»—i KH 1 dÃ²ng. LÆ°u tá»•ng há»£p tá»« cÃ¡c Ä‘Æ¡n 'done'.
--    CÃ³ thá»ƒ dÃ¹ng trigger Ä‘á»ƒ cáº­p nháº­t, hoáº·c refresh báº±ng job.
-- =============================================================
create table if not exists customer_stats (
  customer_id        integer primary key
                       references customers(id) on delete cascade,

  -- Äáº¿m tá»•ng quan
  total_orders       integer     default 0,             -- sá»‘ Ä‘Æ¡n done
  total_products     integer     default 0,             -- tá»•ng sá»‘ SP Ä‘Ã£ mua (sum quantity)
  cancelled_orders   integer     default 0,             -- sá»‘ Ä‘Æ¡n bá»‹ huá»·

  -- TÃ i chÃ­nh
  ltv                numeric(14,2) default 0,           -- Lifetime Value (tá»•ng final_price cÃ¡c Ä‘Æ¡n done)
  aov                numeric(14,2) default 0,           -- Average Order Value (ltv / total_orders)

  -- List sáº£n pháº©m Ä‘Ã£ mua (JSONB): [{ product_id, name, slug, qty, last_buy_at }]
  purchased_products jsonb        default '[]'::jsonb,

  -- Tracking
  first_purchase_at  timestamptz,
  last_purchase_at   timestamptz,

  updated_at         timestamptz default now()
);

comment on table  customer_stats is 'Tá»•ng há»£p KH thÃ¢n thiáº¿t: sá»‘ Ä‘Æ¡n, tá»•ng SP, LTV, AOV, list SP Ä‘Ã£ mua. Refresh qua view + cron/RPC.';
comment on column customer_stats.ltv  is 'Tá»•ng tiá»n Ä‘Ã£ chi (chá»‰ tÃ­nh Ä‘Æ¡n status=done)';
comment on column customer_stats.aov  is 'LTV / total_orders';
comment on column customer_stats.purchased_products is 'JSONB: má»—i pháº§n tá»­ {product_id, name, slug, qty, last_buy_at}';


-- =============================================================
-- 2. customer_vouchers
--    Voucher phÃ¡t cho KH thÃ¢n thiáº¿t. Khi báº­t rank (loyalty_enabled)
--    sáº½ tá»± Ä‘á»™ng insert vÃ o Ä‘Ã¢y.
-- =============================================================
create table if not exists customer_vouchers (
  id            serial primary key,
  customer_id   integer     not null references customers(id) on delete cascade,

  code          varchar(50) unique,                     -- MÃ£ voucher (VD: TC-VIP-...)
  rank          varchar(20) default 'bronze',           -- 'bronze'|'silver'|'gold'|'platinum'
  discount_type varchar(20) default 'percent',          -- 'percent'|'fixed'
  discount_value numeric(10,2) default 0,
  min_order     numeric(12,2) default 0,
  max_discount  numeric(12,2),

  -- Thá»i háº¡n
  issued_at     timestamptz default now(),
  expires_at    timestamptz,
  used_at       timestamptz,
  order_id      integer     references orders(id) on delete set null,

  -- Tráº¡ng thÃ¡i
  is_active     boolean     default true,
  note          text
);

create index if not exists idx_customer_vouchers_customer
  on customer_vouchers (customer_id);
create index if not exists idx_customer_vouchers_active
  on customer_vouchers (is_active, expires_at)
  where is_active = true;

comment on table customer_vouchers is 'Voucher phÃ¡t cho khÃ¡ch thÃ¢n thiáº¿t (khi loyalty_enabled=true)';


-- =============================================================
-- 3. site_settings (key/value linh hoáº¡t)
--    CÃ´ng táº¯c báº­t/táº¯t rank + ngÆ°á»¡ng tier.
--    Admin Ä‘á»•i báº±ng cÃ¡ch UPDATE key.
-- =============================================================
create table if not exists site_settings (
  key         varchar(100) primary key,
  value       text,
  value_json  jsonb,                                    -- DÃ¹ng cho cáº¥u hÃ¬nh dáº¡ng object
  description text,
  updated_at  timestamptz default now()
);

comment on table site_settings is 'Cáº¥u hÃ¬nh há»‡ thá»‘ng key/value. CÃ´ng táº¯c báº­t rank khÃ¡ch thÃ¢n thiáº¿t: key=loyalty_enabled';

-- Seed cÃ¡c key máº·c Ä‘á»‹nh
insert into site_settings (key, value, value_json, description) values
  ('loyalty_enabled', 'false', null,
    'Báº­t/táº¯t chÆ°Æ¡ng trÃ¬nh khÃ¡ch thÃ¢n thiáº¿t (true=hiá»‡n rank + auto-issue voucher)'),

  ('loyalty_tier_thresholds', null,
   '{
      "bronze":   { "min_ltv": 0,       "voucher": null },
      "silver":   { "min_ltv": 2000000, "voucher": { "type":"percent","value":5,  "min_order":500000, "max_discount":100000 } },
      "gold":     { "min_ltv": 5000000, "voucher": { "type":"percent","value":10, "min_order":1000000,"max_discount":300000 } },
      "platinum": { "min_ltv": 10000000,"voucher": { "type":"percent","value":15, "min_order":0,      "max_discount":500000 } }
    }'::jsonb,
    'NgÆ°á»¡ng LTV cho tá»«ng háº¡ng + quÃ  táº·ng voucher khi Ä‘áº¡t háº¡ng'),

  ('loyalty_only_done_orders', 'true', null,
    'Chá»‰ tÃ­nh Ä‘Æ¡n status=done vÃ o LTV (true). Náº¿u false: tÃ­nh cáº£ Ä‘Æ¡n confirmed/shipping.'),

  ('loyalty_min_orders_for_rank', '1', null,
    'Sá»‘ Ä‘Æ¡n done tá»‘i thiá»ƒu Ä‘á»ƒ Ä‘Æ°á»£c xÃ©t háº¡ng (máº·c Ä‘á»‹nh 1)'),

  ('loyalty_voucher_valid_days', '30', null,
    'Voucher cÃ³ hiá»‡u lá»±c bao nhiÃªu ngÃ y ká»ƒ tá»« khi phÃ¡t')
on conflict (key) do nothing;


-- =============================================================
-- 4. VIEW: v_customer_loyalty
--    Tá»•ng há»£p KH + stats + rank (tÃ­nh real-time tá»« orders).
--    Admin all-customers sáº½ SELECT tá»« VIEW nÃ y.
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
  -- List sáº£n pháº©m Ä‘Ã£ mua (gom theo customer â†’ product)
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
  -- Theo yÃªu cáº§u: email hoáº·c phone cÃ³ thá»ƒ NULL â€” váº«n show
  case
    when c.phone is not null and c.email is not null then c.phone || ' / ' || c.email
    when c.phone is not null then c.phone
    when c.email is not null then c.email
    else '(chÆ°a cÃ³ SÄT/Email)'
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
  -- Rank: tÃ­nh theo ngÆ°á»¡ng trong site_settings
  case
    when coalesce(od.ltv_raw, 0) >= 10000000 then 'platinum'
    when coalesce(od.ltv_raw, 0) >=  5000000 then 'gold'
    when coalesce(od.ltv_raw, 0) >=  2000000 then 'silver'
    else 'bronze'
  end                               as rank,
  -- CÃ´ng táº¯c: cÃ³ nÃªn hiá»‡n rank khÃ´ng?
  coalesce(
    (select value from site_settings where key = 'loyalty_enabled'),
    'false'
  )                                 as loyalty_enabled
from customers c
left join order_done        od on od.customer_id = c.id
left join order_cancelled   oc on oc.customer_id = c.id
left join purchased          p on p.customer_id = c.id;

comment on view v_customer_loyalty is 'Tá»•ng há»£p KH + LTV + AOV + rank. Äá»c real-time tá»« orders, khÃ´ng cáº§n trigger. Admin all-customers SELECT tá»« Ä‘Ã¢y.';


-- =============================================================
-- 5. VIEW: v_orders_full
--    ÄÆ¡n hÃ ng full data cho admin donhang. Join KH + items.
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

  -- Sá»‘ lÆ°á»£ng item + sá»‘ SP
  coalesce(items.item_count, 0)        as item_count,
  coalesce(items.total_qty, 0)         as total_qty,

  o.created_at,
  o.updated_at,

  -- Tráº¡ng thÃ¡i COD: náº¿u payment_method='cod' vÃ  status='done' â†’ Ä‘Ã£ nháº­n hÃ ng thÃ nh cÃ´ng
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

comment on view v_orders_full is 'ÄÆ¡n hÃ ng full data + flag cod_delivered_success. Admin donhang SELECT tá»« Ä‘Ã¢y.';


-- =============================================================
-- 6. FUNCTION + TRIGGER: refresh customer_stats khi Ä‘Æ¡n done/cancel
--    Má»—i khi orders.status chuyá»ƒn sang 'done' hoáº·c 'cancelled',
--    cáº­p nháº­t láº¡i customer_stats cho KH Ä‘Ã³.
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
  -- Äáº¿m Ä‘Æ¡n done + tá»•ng tiá»n + tá»•ng SP
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

  -- Äáº¿m Ä‘Æ¡n huá»·
  select count(*) into v_cancelled
  from orders
  where customer_id = p_customer_id and status = 'cancelled';

  -- AOV
  v_aov := case when v_orders > 0 then round(v_ltv / v_orders, 2) else 0 end;

  -- List sáº£n pháº©m JSONB
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
  -- Chá»‰ refresh khi status thay Ä‘á»•i / insert / delete
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
--    Báº­t RLS + cho phÃ©p anon Ä‘á»c VIEW (admin Ä‘á»c qua service_role)
-- =============================================================
alter table customer_stats     enable row level security;
alter table customer_vouchers  enable row level security;
alter table site_settings      enable row level security;

-- Cho phÃ©p service_role (admin) Ä‘á»c/ghi táº¥t cáº£
drop policy if exists p_service_all_customer_stats    on customer_stats;
drop policy if exists p_service_all_customer_vouchers on customer_vouchers;
drop policy if exists p_service_all_site_settings     on site_settings;

create policy p_service_all_customer_stats
  on customer_stats for all to service_role using (true) with check (true);
create policy p_service_all_customer_vouchers
  on customer_vouchers for all to service_role using (true) with check (true);
create policy p_service_all_site_settings
  on site_settings for all to service_role using (true) with check (true);

-- Cho phÃ©p anon/authenticated Ä‘á»c (frontend cÃ³ thá»ƒ xem rank náº¿u cáº§n)
drop policy if exists p_anon_read_site_settings on site_settings;
create policy p_anon_read_site_settings
  on site_settings for select to anon, authenticated using (true);


-- =============================================================
-- 8. HÃ€M tiá»‡n Ã­ch: báº­t/táº¯t rank + láº¥y ngÆ°á»¡ng tier
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

comment on function fn_loyalty_set_enabled    is 'Báº­t/táº¯t chÆ°Æ¡ng trÃ¬nh khÃ¡ch thÃ¢n thiáº¿t (admin)';
comment on function fn_loyalty_get_enabled    is 'Check xem rank cÃ³ Ä‘ang báº­t khÃ´ng (frontend)';
comment on function fn_loyalty_get_thresholds is 'Láº¥y ngÆ°á»¡ng tier + voucher (frontend)';


-- =============================================================
-- 9. HÃ€M tiá»‡n Ã­ch: auto-issue voucher khi KH Ä‘áº¡t rank má»›i
--    (CÃ³ thá»ƒ gá»i sau khi báº­t loyalty_enabled)
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

  -- Láº¥y LTV
  select coalesce(sum(o.final_price), 0)
  into v_ltv
  from orders o
  where o.customer_id = p_customer_id and o.status = 'done';

  -- TÃ­nh rank
  v_rank := case
    when v_ltv >= 10000000 then 'platinum'
    when v_ltv >=  5000000 then 'gold'
    when v_ltv >=  2000000 then 'silver'
    else null  -- bronze: chÆ°a Ä‘á»§ Ä‘iá»u kiá»‡n phÃ¡t voucher
  end;

  if v_rank is null then
    return 0;
  end if;

  -- Láº¥y ngÆ°á»¡ng
  v_tier := fn_loyalty_get_thresholds()->v_rank;
  v_voucher := v_tier->'voucher';
  if v_voucher is null then
    return 0;
  end if;

  -- Check KH chÆ°a cÃ³ voucher cÃ¹ng rank Ä‘ang active
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

  -- Láº¥y sá»‘ ngÃ y hiá»‡u lá»±c
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

comment on function fn_loyalty_issue_voucher is 'Tá»± Ä‘á»™ng phÃ¡t voucher cho KH khi Ä‘áº¡t rank (gá»i tá»« admin khi báº­t loyalty_enabled hoáº·c khi Ä‘Æ¡n done)';


-- =============================================================
-- 10. Trigger: auto-issue voucher khi Ä‘Æ¡n done + loyalty báº­t
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
-- 11. HÃ m helper: Láº¥y danh sÃ¡ch Ä‘Æ¡n hÃ ng cá»§a 1 KH (cho trang cÃ¡ nhÃ¢n)
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
-- Cháº¡y 1 láº§n trÃªn Supabase SQL Editor
-- ThÃªm cá»™t váº­n Ä‘Æ¡n J&T vÃ o orders + cáº­p nháº­t view v_orders_full
-- =============================================================
--
-- Phá»¥ thuá»™c:
--   - báº£ng orders(id, order_code, status, ...) â€” Ä‘Ã£ cÃ³
--   - view v_orders_full â€” Ä‘Ã£ cÃ³ (sáº½ CREATE OR REPLACE)
--
-- Cá»™t má»›i:
--   jt_bill_code      â€” mÃ£ váº­n Ä‘Æ¡n J&T tráº£ vá» (billcode)
--   jt_txlogisticid   â€” mÃ£ Ä‘Æ¡n ná»™i bá»™ Techtra gá»­i lÃªn J&T (Báº®T BUá»˜C Ä‘á»ƒ cancel/update sau nÃ y)
--   jt_tracking_url   â€” URL tracking cÃ´ng khai
--   jt_weight_kg      â€” trá»ng lÆ°á»£ng Ä‘Ã£ gá»­i J&T (API J&T nháº­n Ä‘Æ¡n vá»‹ KG, khÃ´ng pháº£i gram)
--   jt_shipping_fee   â€” phÃ­ J&T tÃ­nh Ä‘Æ°á»£c
--   jt_status         â€” tráº¡ng thÃ¡i J&T (created/pickup/transit/delivered/cancelled/returned)
--   jt_last_trace     â€” láº§n tra cá»©u cuá»‘i (jsonb)
--   jt_created_at     â€” lÃºc táº¡o váº­n Ä‘Æ¡n
--   jt_cancel_reason  â€” lÃ½ do huá»·
--
-- ÄÃƒ Bá»Ž so vá»›i báº£n trÆ°á»›c: jt_waybill_no (trÃ¹ng vá»›i jt_bill_code trong API tháº­t),
-- jt_service_code (API J&T VN tháº­t khÃ´ng cÃ³ khÃ¡i niá»‡m service code 01/02/03 â€”
-- dÃ¹ng producttype dáº¡ng "EZ" khi tÃ­nh phÃ­, khÃ´ng lÆ°u theo Ä‘Æ¡n), jt_pickup_id
-- (chÆ°a cÃ³ endpoint pickup trong docs J&T VN cÃ´ng khai).
-- =============================================================


-- =============================================================
-- 1. ThÃªm cá»™t tracking váº­n Ä‘Æ¡n
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

-- Index Ä‘á»ƒ tra cá»©u nhanh theo billCode / txlogisticid
create index if not exists idx_orders_jt_bill on orders(jt_bill_code);
create index if not exists idx_orders_jt_txlogisticid on orders(jt_txlogisticid);
create index if not exists idx_orders_jt_status on orders(jt_status);

-- Comment giÃºp admin hiá»ƒu cá»™t khi xem schema
comment on column orders.jt_bill_code     is 'MÃ£ váº­n Ä‘Æ¡n J&T tráº£ vá» (billcode) â€” dÃ¹ng Ä‘á»ƒ TRA Cá»¨U (jtTraceOrder)';
comment on column orders.jt_txlogisticid  is 'MÃ£ Ä‘Æ¡n ná»™i bá»™ gá»­i lÃªn J&T lÃºc táº¡o â€” dÃ¹ng Ä‘á»ƒ HUá»¶/Sá»¬A (jtCancelOrder/jtUpdateOrder)';
comment on column orders.jt_status        is 'Tráº¡ng thÃ¡i váº­n Ä‘Æ¡n: created / pickup / transit / delivered / cancelled / returned';
comment on column orders.jt_tracking_url  is 'URL tra cá»©u cÃ´ng khai tá»« J&T';
comment on column orders.jt_weight_kg     is 'Trá»ng lÆ°á»£ng gá»­i J&T, Ä‘Æ¡n vá»‹ KG (API J&T VN nháº­n kg, khÃ´ng pháº£i gram)';
comment on column orders.jt_last_trace    is 'Láº§n trace cuá»‘i (jsonb) â€” lÆ°u response tá»« jtTraceOrder';


-- =============================================================
-- 1b. Migrate dá»¯ liá»‡u cÅ© (náº¿u báº£ng Ä‘Ã£ tá»«ng cháº¡y migration cÅ© vá»›i
--     jt_waybill_no / jt_weight_grams / jt_service_code / jt_pickup_id)
--     Bá» qua bÆ°á»›c nÃ y náº¿u báº¡n cháº¡y migration láº§n Ä‘áº§u.
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

-- Sau khi xÃ¡c nháº­n dá»¯ liá»‡u Ä‘Ã£ migrate Ä‘Ãºng, cÃ³ thá»ƒ cháº¡y riÃªng (KHÃ”NG tá»± Ä‘á»™ng á»Ÿ Ä‘Ã¢y):
-- alter table orders drop column if exists jt_waybill_no;
-- alter table orders drop column if exists jt_weight_grams;
-- alter table orders drop column if exists jt_service_code;
-- alter table orders drop column if exists jt_pickup_id;


-- =============================================================
-- 2. Cáº­p nháº­t view v_orders_full
-- =============================================================
-- LÆ°u Ã½: view nÃ y Ä‘Æ°á»£c khai bÃ¡o á»Ÿ migration_loyalty_and_orders.sql dÃ²ng 249.
-- CREATE OR REPLACE nÃ y sáº½ overwrite view cÅ©. Náº¿u sau nÃ y view bá»‹ sá»­a thÃªm,
-- cáº§n cáº­p nháº­t cáº£ 2 chá»—.
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

  -- â•â•â•â•â•â•â• J&T Express â•â•â•â•â•â•â•
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
    when 'created'   then 'ÄÃ£ táº¡o váº­n Ä‘Æ¡n'
    when 'pickup'    then 'ÄÃ£ láº¥y hÃ ng'
    when 'transit'   then 'Äang váº­n chuyá»ƒn'
    when 'delivered' then 'ÄÃ£ giao hÃ ng'
    when 'cancelled' then 'ÄÃ£ huá»· váº­n Ä‘Æ¡n'
    when 'returned'  then 'HoÃ n hÃ ng'
    else coalesce(o.jt_status, 'ChÆ°a gá»­i J&T')
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

comment on view v_orders_full is 'ÄÆ¡n hÃ ng full data + flag cod_delivered_success + cá»™t J&T (jt_bill_code, jt_txlogisticid, jt_status, jt_tracking_url, has_jt_order, jt_status_label). Admin donhang SELECT tá»« Ä‘Ã¢y.';


-- =============================================================
-- 3. RLS: site_settings â€” GIá»šI Háº N ghi cho authenticated, KHÃ”NG má»Ÿ anon
--    (site_settings chá»©a key bÃ­ máº­t J&T â€” khÃ´ng nÃªn Ä‘á»ƒ anon ghi Ä‘Æ°á»£c)
-- =============================================================
drop policy if exists p_anon_write_site_settings on site_settings;
drop policy if exists p_anon_update_site_settings on site_settings;

create policy p_auth_write_site_settings
  on site_settings for insert to authenticated with check (true);

create policy p_auth_update_site_settings
  on site_settings for update to authenticated using (true) with check (true);

-- Náº¿u báº£ng jt_config cÃ²n cho anon SELECT (theo policy cÅ© á»Ÿ migration trÆ°á»›c),
-- cÃ¢n nháº¯c thu háº¹p SELECT láº¡i vÃ¬ key J&T sáº½ lá»™ ra frontend anon:
--   select value_json from site_settings where key = 'jt_config'
-- Gá»£i Ã½: tÃ¡ch riÃªng key bÃ­ máº­t (data_digest key) ra khá»i payload tráº£ vá»
-- cho client, hoáº·c chuyá»ƒn viá»‡c build data_digest sang backend/Edge Function.





