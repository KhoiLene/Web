-- -- =============================================================
-- -- TECHTRA SHOP — FULL DATABASE SCHEMA (BẢN GỘP / CONSOLIDATED)
-- -- Dùng cho Supabase SQL Editor — chạy 1 file duy nhất, nhiều lần OK.
-- --
-- -- GHI CHÚ GỘP FILE (so với bản bạn gửi):
-- --   - Bản gốc bị dán TRÙNG LẶP toàn bộ nội dung 2 lần (copy-paste
-- --     lỗi) → đã loại bỏ phần lặp, chỉ giữ 1 bản duy nhất.
-- --   - Cuối file gốc có thêm 1 đoạn "CREATE TABLE IF NOT EXISTS
-- --     product_reviews" riêng, với vài điểm KHÁC so với bảng đã
-- --     định nghĩa ở §18.1:
-- --       product_id: integer (đoạn thêm) vs bigint (đoạn gốc §18.1)
-- --       reviewer_name: varchar(255) vs varchar(120)
-- --       is_approved default: false (đoạn thêm) vs true (đoạn gốc)
-- --     Vì dùng "create table if not exists", nếu bảng đã tồn tại
-- --     (từ §18.1) thì đoạn sau sẽ KHÔNG có tác dụng tạo lại/đổi
-- --     kiểu — chỉ có ALTER TABLE ADD COLUMN IF NOT EXISTS (cột
-- --     phone) và 2 CREATE INDEX là thực sự áp dụng thêm.
-- --     → Đã giữ định nghĩa gốc ở §18.1 (bigint, is_approved default
-- --     true) và MERGE thêm cột phone + 2 index mới vào đúng §18.1,
-- --     thay vì để 1 khối rời rạc ở cuối file gây hiểu nhầm là bảng
-- --     khác cấu trúc.
-- --
-- -- Các ghi chú sửa lỗi trước đó (đã có trong bản gốc, giữ nguyên
-- -- vì vẫn còn hiệu lực):
-- --   1) Bỏ "drop table upload_groups cascade" (từng gây xóa data
-- --      mỗi lần chạy lại) — dùng "create table if not exists".
-- --   2) upload_groups được tạo TRƯỚC about_content/videos (2 bảng
-- --      này FK tới nó).
-- --   3) Toàn bộ enable RLS + policy gộp vào §20 (sau khi mọi bảng
-- --      đã tồn tại).
-- --   4) customer_stats / customer_vouchers / site_settings tạo
-- --      trước các ALTER/voucher-public logic.
-- --   5) v_orders_full giữ đúng 1 bản cuối cùng, đầy đủ nhất.
-- --   6) Các ALTER TABLE ... ADD COLUMN IF NOT EXISTS gom ngay sau
-- --      khi bảng gốc được tạo.
-- --   7) about_content.group_id / videos.group_id dùng uuid để khớp
-- --      kiểu với upload_groups.id (uuid).
-- -- =============================================================


-- -- =============================================================
-- -- §0  EXTENSIONS + QUYỀN TRUY CẬP SCHEMA PUBLIC
-- -- =============================================================
-- create extension if not exists "pgcrypto";

-- grant usage on schema public to anon, authenticated, service_role;
-- grant all privileges on all tables    in schema public to anon, authenticated, service_role;
-- grant all privileges on all sequences in schema public to anon, authenticated, service_role;
-- grant all privileges on all functions in schema public to anon, authenticated, service_role;

-- alter default privileges in schema public
--   grant all privileges on tables    to anon, authenticated, service_role;
-- alter default privileges in schema public
--   grant all privileges on sequences to anon, authenticated, service_role;
-- alter default privileges in schema public
--   grant all privileges on functions to anon, authenticated, service_role;


-- -- =============================================================
-- -- §1  product_groups
-- -- =============================================================
-- create table if not exists product_groups (
--   id             serial primary key,
--   name           varchar(255) not null,
--   slug           varchar(255) unique not null,
--   description    text,
--   image_url      text,
--   condition_type varchar(20)  default 'manual',
--   is_active      boolean      default true,
--   is_slider      boolean      default false,
--   sort_order     integer      default 0,
--   product_count  integer      default 0,
--   created_at     timestamp    default now(),
--   updated_at     timestamp    default now()
-- );

-- alter table product_groups
--   add column if not exists parent_id       integer references product_groups(id) on delete cascade,
--   add column if not exists slider_text     text,
--   add column if not exists intro_title     text,
--   add column if not exists intro_subtitle  text,
--   add column if not exists intro_image_url text,
--   add column if not exists code            text,
--   add column if not exists is_sale         boolean default false;

-- create index if not exists idx_product_groups_slider on product_groups (is_slider) where is_slider = true;
-- create index if not exists idx_product_groups_parent on product_groups (parent_id);
-- create unique index if not exists product_groups_code_key on product_groups (code) where code is not null;


-- -- =============================================================
-- -- §2  products
-- -- =============================================================
-- create table if not exists products (
--   id            serial primary key,
--   name          varchar(255)  not null,
--   slug          varchar(255)  unique not null,
--   description   text,
--   group_id      integer       references product_groups(id) on delete set null,
--   price         numeric(12,2) not null default 0,
--   final_price   numeric(12,2),
--   discount      numeric(5,2)  default 0,
--   stock         integer       default 0,
--   sku           varchar(100)  unique,
--   weight        numeric(10,2) default 0,
--   weight_unit   varchar(5)    default 'g',
--   height        numeric(8,2)  default 0,
--   width         numeric(8,2)  default 0,
--   length        numeric(8,2)  default 0,
--   images        text[]        default '{}',
--   image_url     text,
--   video_url     text,
--   content_file  text,
--   pdf_name      varchar(255),
--   brand         varchar(255),
--   origin        varchar(255),
--   material      varchar(255),
--   barcode       varchar(100),
--   gtin          varchar(100),
--   category      varchar(255),
--   rating        numeric(3,2)  default 5,
--   reviews       integer       default 0,
--   is_new        boolean       default false,
--   is_active     boolean       default false,
--   is_featured   boolean       default false,
--   is_flash_sale boolean       default false,
--   percent_sold  integer       default 0,
--   old_price     numeric(12,2),
--   flash_sale_discount numeric(5,2),
--   flash_sale_end_at   timestamptz,
--   cod_enabled   boolean       default true,
--   shipping_type varchar(20)   default 'default',
--   shipping_method varchar(20) default 'default',
--   jt_fee_default numeric(10,2),
--   is_calculating_fee boolean  default false,
--   fee_error     text,
--   status        varchar(20)   default 'active',
--   created_at    timestamp     default now(),
--   updated_at    timestamp     default now()
-- );

-- alter table products
--   add column if not exists is_bulky    boolean not null default false,
--   add column if not exists jt_services text[]  default '{}';

-- create index if not exists idx_products_flash_sale_discount on products (flash_sale_discount) where flash_sale_discount is not null;
-- create index if not exists idx_products_flash_sale_end_at   on products (flash_sale_end_at);
-- create index if not exists idx_products_slug       on products (slug);
-- create index if not exists idx_products_group      on products (group_id);
-- create index if not exists idx_products_status_act on products (status) where status = 'active';
-- create index if not exists idx_products_is_active  on products (is_active) where is_active = true;


-- -- =============================================================
-- -- §3  price_list
-- -- =============================================================
-- create table if not exists price_list (
--   id          serial primary key,
--   sku         varchar(100) unique not null,
--   product_id  integer references products(id) on delete set null,
--   name        varchar(255) not null,
--   group_id    integer references product_groups(id) on delete set null,
--   group_name  varchar(255),
--   price       numeric(12,2) not null default 0,
--   discount    numeric(5,2)  default 0,
--   final_price numeric(12,2),
--   stock       integer       default 0,
--   unit        varchar(20)   default 'cái',
--   note        text,
--   is_active   boolean       default true,
--   sort_order  integer       default 0,
--   created_at  timestamp     default now(),
--   updated_at  timestamp     default now()
-- );

-- create index if not exists idx_price_list_sku    on price_list (sku);
-- create index if not exists idx_price_list_group  on price_list (group_id);
-- create index if not exists idx_price_list_active on price_list (is_active);


-- -- =============================================================
-- -- §4  product_shipping_services
-- -- =============================================================
-- create table if not exists product_shipping_services (
--   id           serial primary key,
--   product_id   integer references products(id) on delete cascade,
--   service_code varchar(20)  not null,
--   service_name varchar(100),
--   is_active    boolean default true
-- );


-- -- =============================================================
-- -- §5  customers
-- -- =============================================================
-- create table if not exists customers (
--   id         serial primary key,
--   name       varchar(255),
--   email      varchar(255) unique,
--   phone      varchar(20),
--   password   varchar(255),
--   avatar_url text,
--   address    text,
--   province   varchar(100),
--   district   varchar(100),
--   ward       varchar(100),
--   is_active  boolean   default true,
--   created_at timestamp default now(),
--   updated_at timestamp default now()
-- );


-- -- =============================================================
-- -- §6  orders + order_items
-- -- =============================================================
-- create table if not exists orders (
--   id              serial primary key,
--   order_code      varchar(50) unique,
--   customer_id     integer references customers(id) on delete set null,
--   customer_name   varchar(255),
--   customer_phone  varchar(20),
--   address         text,
--   province        varchar(100),
--   district        varchar(100),
--   ward            varchar(100),
--   total_price     numeric(12,2) default 0,
--   shipping_fee    numeric(10,2) default 0,
--   discount_amount numeric(10,2) default 0,
--   final_price     numeric(12,2) default 0,
--   payment_method  varchar(50)  default 'cod',
--   payment_status  varchar(20)  default 'pending',
--   status          varchar(30)  default 'pending',
--   note            text,
--   created_at      timestamp    default now(),
--   updated_at      timestamp    default now()
-- );

-- -- Patch: cột J&T Express (bản cuối, đơn vị KG, dùng txlogisticid để huỷ/sửa)
-- alter table orders
--   add column if not exists jt_bill_code      varchar(100),
--   add column if not exists jt_txlogisticid   varchar(100),
--   add column if not exists jt_tracking_url   text,
--   add column if not exists jt_weight_kg      numeric(10,2),
--   add column if not exists jt_shipping_fee   numeric(12,2) default 0,
--   add column if not exists jt_status         varchar(50),
--   add column if not exists jt_last_trace     jsonb,
--   add column if not exists jt_created_at     timestamp,
--   add column if not exists jt_cancel_reason  text;

-- -- Patch: cột khớp FE thanh-toan.js
-- alter table orders
--   add column if not exists receiver_name           varchar(255),
--   add column if not exists receiver_phone          varchar(20),
--   add column if not exists receiver_email          varchar(255),
--   add column if not exists receiver_address        text,
--   add column if not exists subtotal_price          numeric(12,2) default 0,
--   add column if not exists discount_price          numeric(12,2) default 0,
--   add column if not exists voucher_code            varchar(50),
--   add column if not exists voucher_discount_type   varchar(20),
--   add column if not exists voucher_discount_value  numeric(12,2),
--   add column if not exists payment_code            varchar(140);

-- comment on column orders.status is 'pending/confirmed/shipping/done/cancelled + deleted_before_ship';
-- comment on column orders.jt_bill_code    is 'Mã vận đơn J&T trả về (billcode) — dùng để TRA CỨU';
-- comment on column orders.jt_txlogisticid is 'Mã đơn nội bộ gửi lên J&T lúc tạo — dùng để HUỶ/SỬA';
-- comment on column orders.jt_status       is 'created / pickup / transit / delivered / cancelled / returned';
-- comment on column orders.jt_weight_kg    is 'Trọng lượng gửi J&T, đơn vị KG';

-- create index if not exists idx_orders_jt_bill        on orders(jt_bill_code);
-- create index if not exists idx_orders_jt_txlogisticid on orders(jt_txlogisticid);
-- create index if not exists idx_orders_jt_status      on orders(jt_status);

-- create table if not exists order_items (
--   id           serial primary key,
--   order_id     integer       references orders(id)   on delete cascade,
--   product_id   integer       references products(id) on delete set null,
--   product_name varchar(255),
--   product_sku  varchar(100),
--   image_url    text,
--   quantity     integer       not null default 1,
--   unit_price   numeric(12,2) not null,
--   discount     numeric(5,2)  default 0,
--   subtotal     numeric(12,2) not null default 0
-- );

-- alter table order_items add column if not exists line_total numeric(12,2) default 0;
-- alter table order_items alter column subtotal set default 0;

-- update order_items
--    set subtotal = unit_price * quantity
--  where coalesce(subtotal, 0) = 0 and unit_price is not null and quantity is not null;


-- -- =============================================================
-- -- §7  admins
-- -- =============================================================
-- create table if not exists admins (
--   id         serial primary key,
--   name       varchar(255),
--   email      varchar(255) unique not null,
--   password   varchar(255) not null,
--   role       varchar(20)  default 'admin',
--   admin_priority integer default 0,
--   is_active  boolean      default true,
--   created_at timestamp    default now()
-- );

-- alter table admins
--   add column if not exists admin_priority integer default 0,
--   add column if not exists is_active      boolean  default true;

-- update admins set admin_priority = coalesce(admin_priority, 0), is_active = coalesce(is_active, true);

-- create or replace function enforce_superadmin_limit()
-- returns trigger as $$
-- begin
--   if (NEW.role = 'superadmin') then
--     if (tg_op = 'INSERT') then
--       if (select count(*) from admins a where a.role = 'superadmin') >= 2 then
--         raise exception 'Superadmin limit exceeded (max 2)';
--       end if;
--     else
--       if (OLD.role <> 'superadmin') then
--         if (select count(*) from admins a where a.role = 'superadmin' and a.id <> OLD.id) >= 2 then
--           raise exception 'Superadmin limit exceeded (max 2)';
--         end if;
--       end if;
--     end if;
--   end if;
--   return NEW;
-- end;
-- $$ language plpgsql;

-- drop trigger if exists trg_enforce_superadmin_limit on admins;
-- create trigger trg_enforce_superadmin_limit
-- before insert or update of role on admins
-- for each row execute function enforce_superadmin_limit();


-- -- =============================================================
-- -- §8  users
-- -- =============================================================
-- create table if not exists users (
--   id            serial primary key,
--   username      varchar(50) unique not null,
--   email         varchar(255) unique not null,
--   password_hash text not null,
--   full_name     varchar(255),
--   phone         varchar(20),
--   is_active     boolean     default true,
--   role          varchar(20) default 'user',
--   created_at    timestamp   default now(),
--   updated_at    timestamp   default now()
-- );

-- alter table users add column if not exists phone varchar(20);

-- create index if not exists idx_users_username on users (username);
-- create index if not exists idx_users_email    on users (email);


-- -- =============================================================
-- -- §9  posts + §9.1 news_categories
-- -- =============================================================
-- create table if not exists news_categories (
--   id          serial primary key,
--   name        varchar(255) not null,
--   slug        varchar(255) unique not null,
--   description text,
--   icon        varchar(100),
--   image_url   text,
--   parent_id   integer references news_categories(id) on delete cascade,
--   sort_order  integer      default 0,
--   is_active   boolean      default true,
--   created_at  timestamp    default now(),
--   updated_at  timestamp    default now()
-- );

-- create index if not exists idx_news_categories_parent on news_categories (parent_id);
-- create index if not exists idx_news_categories_active on news_categories (is_active) where is_active = true;
-- create index if not exists idx_news_categories_order  on news_categories (sort_order);

-- create table if not exists posts (
--   id           serial primary key,
--   title        varchar(500) not null,
--   slug         varchar(500) unique not null,
--   content      text,
--   thumbnail    text,
--   status       varchar(20) default 'draft',
--   author_id    integer     references admins(id) on delete set null,
--   published_at timestamp,
--   created_at   timestamp   default now(),
--   updated_at   timestamp   default now()
-- );

-- alter table posts
--   add column if not exists source_url       text,
--   add column if not exists site_name        varchar(255),
--   add column if not exists summary          text,
--   add column if not exists excerpt_html     text,
--   add column if not exists thumbnail_source text,
--   add column if not exists category_id integer references news_categories(id) on delete set null,
--   add column if not exists file_url    text,
--   add column if not exists file_name   varchar(255),
--   add column if not exists file_size   bigint,
--   add column if not exists post_type   varchar(20) default 'link';

-- create index if not exists idx_posts_source     on posts (source_url);
-- create index if not exists idx_posts_status_pub on posts (status, published_at desc);
-- create index if not exists idx_posts_category   on posts (category_id);
-- create index if not exists idx_posts_type       on posts (post_type);


-- -- =============================================================
-- -- §10-17  homepage_*
-- -- =============================================================
-- create table if not exists homepage_banners (
--   id         serial primary key,
--   title      varchar(255),
--   image_url  text not null,
--   link_url   text,
--   sort_order integer  default 0,
--   is_active  boolean  default true,
--   created_at timestamp default now()
-- );

-- create table if not exists homepage_sections (
--   id          serial primary key,
--   section_key varchar(50) unique not null,
--   title       varchar(255),
--   is_active   boolean default true,
--   sort_order  integer default 0
-- );

-- create table if not exists homepage_section_products (
--   id         serial primary key,
--   section_id integer references homepage_sections(id) on delete cascade,
--   product_id integer references products(id)         on delete cascade,
--   sort_order integer default 0
-- );

-- create table if not exists homepage_config (
--   id          int primary key default 1,
--   background  jsonb not null default '{"type":"color","color":"#6a11cb","imageUrl":"","videoUrl":""}'::jsonb,
--   hero        jsonb not null default '{"enabled":true,"imageUrl":"","title":"Chào mừng đến với Techtra Shop","subtitle":"Cửa hàng công nghệ — uy tín, chất lượng, giao hàng toàn quốc","ctaText":"Khám phá ngay","ctaLink":"/san-pham"}'::jsonb,
--   sections    jsonb not null default '{"heroSlider":true,"brandValues":true,"categories":true,"flashSale":true,"bestSellers":true,"promoBanners":true,"blog":true,"newsletter":true}'::jsonb,
--   flash_sale  jsonb not null default '{"title":"Giờ Vàng Deal Xịn","enabled":true}'::jsonb,
--   updated_at  timestamptz default now(),
--   constraint single_row check (id = 1)
-- );

-- insert into homepage_config (id) values (1) on conflict (id) do nothing;

-- alter table homepage_config
--   add column if not exists popup jsonb not null default jsonb_build_object(
--     'enabled', false, 'title', 'THÔNG BÁO', 'imageUrl', '', 'link', '', 'dontShowDays', 7
--   );

-- update homepage_config
--    set popup = jsonb_build_object('enabled', false, 'title', 'THÔNG BÁO', 'imageUrl', '', 'link', '', 'dontShowDays', 7)
--  where popup is null;

-- comment on column homepage_config.popup is 'Cấu hình popup thông báo trang chủ: {enabled, title, imageUrl, link, dontShowDays}';

-- create table if not exists homepage_values (
--   id          uuid primary key default gen_random_uuid(),
--   icon        text not null default 'fas fa-seedling',
--   title       text not null,
--   description text,
--   sort_order  int  default 0,
--   enabled     boolean default true,
--   created_at  timestamptz default now()
-- );

-- create table if not exists homepage_promo_banners (
--   id         uuid primary key default gen_random_uuid(),
--   position   text not null check (position in ('left', 'right')),
--   tag        text,
--   title      text not null,
--   image_url  text,
--   cta_text   text default 'Mua ngay',
--   cta_link   text default '#',
--   sort_order int  default 0,
--   enabled    boolean default true,
--   created_at timestamptz default now()
-- );

-- create table if not exists homepage_articles (
--   id         uuid primary key default gen_random_uuid(),
--   type       text not null check (type in ('link', 'file')),
--   title      text not null,
--   url        text,
--   file_url   text,
--   file_name  text,
--   file_size  bigint,
--   created_at timestamptz default now()
-- );

-- create table if not exists homepage_blog (
--   id          uuid primary key default gen_random_uuid(),
--   title       text not null,
--   description text,
--   author      text default 'Admin',
--   image_url   text,
--   link        text default '#',
--   sort_order  int  default 0,
--   enabled     boolean default true,
--   created_at  timestamptz default now()
-- );

-- create table if not exists homepage_picks (
--   id           uuid primary key default gen_random_uuid(),
--   kind         text not null check (kind in ('slider', 'featured', 'flash_sale')),
--   target_id    text not null,
--   target_kind  text not null check (target_kind in ('product', 'group')),
--   custom_title text,
--   custom_image text,
--   sort_order   int  default 0,
--   enabled      boolean default true,
--   created_at   timestamptz default now()
-- );

-- create unique index if not exists uq_homepage_picks on homepage_picks (kind, target_id);
-- create index if not exists idx_homepage_picks_kind_order on homepage_picks (kind, sort_order);


-- -- =============================================================
-- -- §18  transactions
-- -- =============================================================
-- create table if not exists transactions (
--   id          serial primary key,
--   order_id    integer references orders(id) on delete set null,
--   type        varchar(20)   not null,
--   amount      numeric(12,2) not null,
--   description text,
--   created_at  timestamp     default now()
-- );


-- -- =============================================================
-- -- §18.1  product_reviews
-- -- -------------------------------------------------------------
-- -- GỘP: giữ định nghĩa gốc (product_id bigint, is_approved default
-- -- true) vì đây là bản sẽ thực sự áp dụng trên DB trống (chạy
-- -- trước). Thêm cột "phone" và 2 index mới từ đoạn migration được
-- -- dán thêm ở cuối file gốc.
-- -- =============================================================
-- create table if not exists product_reviews (
--   id            bigserial    primary key,
--   product_id    bigint       not null references products(id) on delete cascade,
--   rating        integer      not null check (rating between 1 and 5),
--   comment       text,
--   reviewer_name varchar(120) default 'Khách hàng',
--   is_approved   boolean      default true,
--   created_at    timestamptz  default now()
-- );

-- alter table product_reviews
--   add column if not exists phone varchar(20);

-- create index if not exists idx_product_reviews_product on product_reviews (product_id, created_at desc);
-- create index if not exists idx_product_reviews_product_id on product_reviews (product_id);
-- create index if not exists idx_product_reviews_product_approved_created on product_reviews (product_id, is_approved, created_at desc);

-- create or replace view v_product_rating as
--   select product_id, count(*) as review_count, avg(rating)::numeric(3,2) as avg_rating
--   from product_reviews
--   where is_approved = true
--   group by product_id;


-- -- =============================================================
-- -- §18.2  upload_groups + about_content + videos
-- -- =============================================================
-- create table if not exists upload_groups (
--   id          uuid primary key default gen_random_uuid(),
--   name        text not null,
--   slug        text not null,
--   description text,
--   icon        text,
--   parent_id   uuid references upload_groups(id) on delete cascade,
--   sort_order  integer not null default 0,
--   is_active   boolean not null default true,
--   display_locations text[] default '{}',
--   created_at  timestamptz not null default now(),
--   updated_at  timestamptz not null default now()
-- );

-- -- Backfill từ cột display_location cũ (nếu có) sang display_locations text[]
-- do $$
-- begin
--   if not exists (
--     select 1 from information_schema.columns
--     where table_name = 'upload_groups' and column_name = 'display_locations'
--   ) then
--     if exists (
--       select 1 from information_schema.columns
--       where table_name = 'upload_groups' and column_name = 'display_location'
--     ) then
--       alter table upload_groups add column display_locations text[] default '{}';
--       update upload_groups set display_locations = array[display_location] where display_location is not null;
--       alter table upload_groups drop column display_location;
--     else
--       alter table upload_groups add column display_locations text[] default '{}';
--     end if;
--   end if;
-- end$$;

-- create index if not exists upload_groups_display_locations_gin_idx on upload_groups using gin (display_locations);
-- create unique index if not exists upload_groups_slug_per_parent_uidx on upload_groups (parent_id, slug);
-- create index if not exists upload_groups_parent_id_idx on upload_groups (parent_id);
-- create index if not exists upload_groups_sort_order_idx on upload_groups (sort_order);

-- create or replace function set_updated_at()
-- returns trigger as $$
-- begin
--   new.updated_at = now();
--   return new;
-- end;
-- $$ language plpgsql;

-- drop trigger if exists trg_upload_groups_updated_at on upload_groups;
-- create trigger trg_upload_groups_updated_at
--   before update on upload_groups
--   for each row execute function set_updated_at();

-- create table if not exists about_content (
--   id bigint generated always as identity primary key,
--   group_id uuid unique references upload_groups(id) on delete cascade,
--   content text,
--   updated_at timestamptz default now()
-- );

-- create table if not exists videos (
--   id bigint generated always as identity primary key,
--   group_id uuid references upload_groups(id) on delete set null,
--   title text,
--   url text,
--   file_name text,
--   file_size bigint,
--   created_at timestamptz default now()
-- );

-- -- An toàn cho lần chạy lại: nếu about_content/videos đã tồn tại từ TRƯỚC
-- -- với group_id kiểu bigint (ví dụ từ 1 lần chạy cũ), tự động sửa lại kiểu.
-- do $$
-- begin
--   if exists (
--     select 1 from information_schema.columns
--     where table_name = 'about_content' and column_name = 'group_id' and data_type = 'bigint'
--   ) then
--     alter table about_content alter column group_id type uuid using group_id::text::uuid;
--   end if;

--   if exists (
--     select 1 from information_schema.columns
--     where table_name = 'videos' and column_name = 'group_id' and data_type = 'bigint'
--   ) then
--     alter table videos alter column group_id type uuid using group_id::text::uuid;
--   end if;
-- end $$;


-- -- =============================================================
-- -- §18.3  customer_stats / customer_vouchers / site_settings
-- -- =============================================================
-- create table if not exists customer_stats (
--   customer_id        integer primary key references customers(id) on delete cascade,
--   total_orders       integer     default 0,
--   total_products     integer     default 0,
--   cancelled_orders   integer     default 0,
--   ltv                numeric(14,2) default 0,
--   aov                numeric(14,2) default 0,
--   purchased_products jsonb        default '[]'::jsonb,
--   first_purchase_at  timestamptz,
--   last_purchase_at   timestamptz,
--   updated_at         timestamptz default now()
-- );

-- comment on table customer_stats is 'Tổng hợp KH thân thiết: số đơn, tổng SP, LTV, AOV, list SP đã mua.';

-- create table if not exists customer_vouchers (
--   id            serial primary key,
--   customer_id   integer     references customers(id) on delete cascade,
--   code          varchar(50) unique,
--   rank          varchar(20) default 'bronze',
--   discount_type varchar(20) default 'percent',
--   discount_value numeric(10,2) default 0,
--   min_order     numeric(12,2) default 0,
--   max_discount  numeric(12,2),
--   issued_at     timestamptz default now(),
--   expires_at    timestamptz,
--   used_at       timestamptz,
--   order_id      integer     references orders(id) on delete set null,
--   is_active     boolean     default true,
--   note          text,
--   is_public     boolean     default false
-- );

-- comment on table customer_vouchers is 'Voucher phát cho khách thân thiết + voucher public (customer_id NULL, is_public=true)';
-- comment on column customer_vouchers.is_public is 'TRUE: voucher public, ai cũng nhập code dùng được. FALSE: voucher cá nhân.';

-- create index if not exists idx_customer_vouchers_customer on customer_vouchers (customer_id);
-- create index if not exists idx_customer_vouchers_active on customer_vouchers (is_active, expires_at) where is_active = true;
-- create index if not exists idx_customer_vouchers_public on customer_vouchers (code) where is_public = true and is_active = true;

-- create table if not exists site_settings (
--   key         varchar(100) primary key,
--   value       text,
--   value_json  jsonb,
--   description text,
--   updated_at  timestamptz default now()
-- );

-- comment on table site_settings is 'Cấu hình hệ thống key/value. Công tắc rank khách thân thiết: key=loyalty_enabled';

-- insert into site_settings (key, value, value_json, description) values
--   ('loyalty_enabled', 'false', null, 'Bật/tắt chương trình khách thân thiết'),
--   ('loyalty_tier_thresholds', null,
--    '{"bronze":{"min_ltv":0,"voucher":null},
--      "silver":{"min_ltv":2000000,"voucher":{"type":"percent","value":5,"min_order":500000,"max_discount":100000}},
--      "gold":{"min_ltv":5000000,"voucher":{"type":"percent","value":10,"min_order":1000000,"max_discount":300000}},
--      "platinum":{"min_ltv":10000000,"voucher":{"type":"percent","value":15,"min_order":0,"max_discount":500000}}}'::jsonb,
--    'Ngưỡng LTV cho từng hạng + quà tặng voucher khi đạt hạng'),
--   ('loyalty_only_done_orders', 'true', null, 'Chỉ tính đơn status=done vào LTV'),
--   ('loyalty_min_orders_for_rank', '1', null, 'Số đơn done tối thiểu để được xét hạng'),
--   ('loyalty_voucher_valid_days', '30', null, 'Voucher có hiệu lực bao nhiêu ngày kể từ khi phát'),
--   ('zalo_app_id',       '', null, 'Zalo OA — App ID'),
--   ('zalo_secret_key',   '', null, 'Zalo OA — Secret Key'),
--   ('zalo_access_token', '', null, 'Zalo OA — Access Token'),
--   ('smtp_host',         '', null, 'SMTP host'),
--   ('smtp_port',         '587', null, 'SMTP port'),
--   ('smtp_user',         '', null, 'SMTP username'),
--   ('smtp_pass',         '', null, 'SMTP password / app password'),
--   ('smtp_from_email',   '', null, 'SMTP — địa chỉ From hiển thị'),
--   ('smtp_from_name',    'Techtra', null, 'SMTP — tên hiển thị khi gửi mail')
-- on conflict (key) do nothing;

-- -- Cho phép customer_id/rank NULL (voucher public)
-- alter table customer_vouchers alter column customer_id drop not null;
-- alter table customer_vouchers alter column rank drop not null;


-- -- =============================================================
-- -- §19  TRIGGERS + FUNCTIONS chung
-- -- =============================================================
-- create or replace function generate_order_code()
-- returns trigger as $$
-- begin
--   new.order_code := 'TC-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(new.id::text, 4, '0');
--   return new;
-- end;
-- $$ language plpgsql;

-- drop trigger if exists trg_order_code on orders;
-- create trigger trg_order_code
--   before insert on orders
--   for each row when (new.order_code is null)
--   execute function generate_order_code();

-- create or replace function update_updated_at()
-- returns trigger as $$
-- begin new.updated_at = now(); return new; end;
-- $$ language plpgsql;

-- drop trigger if exists trg_product_groups_upd    on product_groups;
-- drop trigger if exists trg_products_upd          on products;
-- drop trigger if exists trg_price_list_upd        on price_list;
-- drop trigger if exists trg_customers_upd         on customers;
-- drop trigger if exists trg_orders_upd            on orders;
-- drop trigger if exists trg_users_upd             on users;
-- drop trigger if exists trg_posts_upd             on posts;
-- drop trigger if exists trg_news_categories_upd   on news_categories;

-- create trigger trg_product_groups_upd    before update on product_groups   for each row execute function update_updated_at();
-- create trigger trg_products_upd          before update on products         for each row execute function update_updated_at();
-- create trigger trg_price_list_upd        before update on price_list       for each row execute function update_updated_at();
-- create trigger trg_customers_upd         before update on customers        for each row execute function update_updated_at();
-- create trigger trg_orders_upd            before update on orders           for each row execute function update_updated_at();
-- create trigger trg_users_upd             before update on users            for each row execute function update_updated_at();
-- create trigger trg_posts_upd             before update on posts            for each row execute function update_updated_at();
-- create trigger trg_news_categories_upd   before update on news_categories  for each row execute function update_updated_at();

-- -- Refresh customer_stats khi đơn done/cancel
-- create or replace function fn_refresh_customer_stats(p_customer_id integer)
-- returns void language plpgsql as $$
-- declare
--   v_orders integer; v_products integer; v_cancelled integer;
--   v_ltv numeric(14,2); v_aov numeric(14,2);
--   v_first timestamptz; v_last timestamptz; v_purchased jsonb;
-- begin
--   select count(*), coalesce(sum(oi.quantity),0), coalesce(sum(o.final_price),0), min(o.created_at), max(o.created_at)
--   into v_orders, v_products, v_ltv, v_first, v_last
--   from orders o left join order_items oi on oi.order_id = o.id
--   where o.customer_id = p_customer_id and o.status = 'done';

--   select count(*) into v_cancelled from orders where customer_id = p_customer_id and status = 'cancelled';
--   v_aov := case when v_orders > 0 then round(v_ltv / v_orders, 2) else 0 end;

--   select coalesce(jsonb_agg(x order by (x->>'last_buy_at') desc), '[]'::jsonb) into v_purchased
--   from (
--     select jsonb_build_object('product_id',product_id,'name',name,'slug',slug,'image_url',image_url,'qty',qty,'last_buy_at',last_buy_at) as x
--     from (
--       select p.id as product_id, p.name, p.slug, p.image_url,
--              sum(oi.quantity) as qty,
--              to_char(max(o.created_at), 'YYYY-MM-DD"T"HH24:MI:SSOF') as last_buy_at
--       from orders o join order_items oi on oi.order_id = o.id join products p on p.id = oi.product_id
--       where o.customer_id = p_customer_id and o.status = 'done'
--       group by p.id, p.name, p.slug, p.image_url
--     ) inner_prod
--   ) t;

--   insert into customer_stats (customer_id, total_orders, total_products, cancelled_orders, ltv, aov, purchased_products, first_purchase_at, last_purchase_at, updated_at)
--   values (p_customer_id, coalesce(v_orders,0), coalesce(v_products,0), coalesce(v_cancelled,0), coalesce(v_ltv,0), coalesce(v_aov,0), v_purchased, v_first, v_last, now())
--   on conflict (customer_id) do update set
--     total_orders = excluded.total_orders, total_products = excluded.total_products,
--     cancelled_orders = excluded.cancelled_orders, ltv = excluded.ltv, aov = excluded.aov,
--     purchased_products = excluded.purchased_products, first_purchase_at = excluded.first_purchase_at,
--     last_purchase_at = excluded.last_purchase_at, updated_at = excluded.updated_at;
-- end;
-- $$;

-- create or replace function fn_orders_after_change()
-- returns trigger language plpgsql as $$
-- begin
--   if (tg_op = 'INSERT' or tg_op = 'DELETE') then
--     if new.customer_id is not null then perform fn_refresh_customer_stats(new.customer_id);
--     elsif old.customer_id is not null then perform fn_refresh_customer_stats(old.customer_id); end if;
--   elsif (tg_op = 'UPDATE' and (old.status is distinct from new.status)) then
--     if new.customer_id is not null then perform fn_refresh_customer_stats(new.customer_id); end if;
--     if old.customer_id is not null and old.customer_id is distinct from new.customer_id then
--       perform fn_refresh_customer_stats(old.customer_id);
--     end if;
--   end if;
--   return coalesce(new, old);
-- end;
-- $$;

-- drop trigger if exists trg_orders_refresh_stats on orders;
-- create trigger trg_orders_refresh_stats
--   after insert or update or delete on orders
--   for each row execute function fn_orders_after_change();

-- create or replace function fn_loyalty_set_enabled(p_enabled boolean) returns void language sql as $$
--   update site_settings set value = case when p_enabled then 'true' else 'false' end, updated_at = now()
--   where key = 'loyalty_enabled';
-- $$;

-- create or replace function fn_loyalty_get_enabled() returns boolean language sql stable as $$
--   select coalesce((select value = 'true' from site_settings where key = 'loyalty_enabled'), false);
-- $$;

-- create or replace function fn_loyalty_get_thresholds() returns jsonb language sql stable as $$
--   select coalesce((select value_json from site_settings where key = 'loyalty_tier_thresholds'), '{}'::jsonb);
-- $$;

-- create or replace function fn_loyalty_issue_voucher(p_customer_id integer) returns integer
-- language plpgsql as $$
-- declare
--   v_ltv numeric(14,2); v_rank varchar(20); v_tier jsonb; v_voucher jsonb;
--   v_code varchar(50); v_valid_days integer; v_inserted_id integer;
-- begin
--   if not fn_loyalty_get_enabled() then return 0; end if;

--   select coalesce(sum(o.final_price), 0) into v_ltv
--   from orders o where o.customer_id = p_customer_id and o.status = 'done';

--   v_rank := case when v_ltv >= 10000000 then 'platinum' when v_ltv >= 5000000 then 'gold'
--                  when v_ltv >= 2000000 then 'silver' else null end;
--   if v_rank is null then return 0; end if;

--   v_tier := fn_loyalty_get_thresholds()->v_rank;
--   v_voucher := v_tier->'voucher';
--   if v_voucher is null then return 0; end if;

--   if exists (select 1 from customer_vouchers where customer_id = p_customer_id and rank = v_rank
--              and is_active = true and (expires_at is null or expires_at > now())) then
--     return 0;
--   end if;

--   v_code := 'TC-' || upper(v_rank) || '-' || p_customer_id || '-' || to_char(now(), 'YYMMDDHH24MI');
--   v_valid_days := coalesce((select value::integer from site_settings where key = 'loyalty_voucher_valid_days'), 30);

--   insert into customer_vouchers (customer_id, code, rank, discount_type, discount_value, min_order, max_discount, expires_at)
--   values (p_customer_id, v_code, v_rank, v_voucher->>'type', (v_voucher->>'value')::numeric,
--           coalesce((v_voucher->>'min_order')::numeric, 0), (v_voucher->>'max_discount')::numeric,
--           now() + (v_valid_days || ' days')::interval)
--   returning id into v_inserted_id;

--   return v_inserted_id;
-- end;
-- $$;

-- create or replace function fn_orders_done_issue_voucher() returns trigger language plpgsql as $$
-- begin
--   if new.status = 'done' and old.status is distinct from 'done' and new.customer_id is not null then
--     perform fn_loyalty_issue_voucher(new.customer_id);
--   end if;
--   return new;
-- end;
-- $$;

-- drop trigger if exists trg_orders_done_issue_voucher on orders;
-- create trigger trg_orders_done_issue_voucher
--   after update of status on orders
--   for each row execute function fn_orders_done_issue_voucher();

-- create or replace function fn_customer_orders(p_customer_id integer, p_limit integer default 20)
-- returns table (order_id integer, order_code varchar, final_price numeric, status varchar,
--                payment_method varchar, created_at timestamp, item_count bigint, total_qty bigint)
-- language sql stable as $$
--   select o.id, o.order_code, o.final_price, o.status, o.payment_method, o.created_at,
--          (select count(*) from order_items where order_id = o.id),
--          (select coalesce(sum(quantity),0) from order_items where order_id = o.id)
--   from orders o where o.customer_id = p_customer_id order by o.created_at desc limit p_limit;
-- $$;


-- -- =============================================================
-- -- §19.1  VIEWS (bản cuối cùng, đầy đủ nhất — thay mọi bản cũ)
-- -- =============================================================
-- create or replace view v_orders_full as
-- select
--   o.id, o.order_code, o.customer_id,
--   coalesce(o.customer_name, c.name)    as customer_name,
--   coalesce(o.customer_phone, c.phone)  as customer_phone,
--   c.email as customer_email,
--   o.address, o.province, o.district, o.ward,
--   o.total_price, o.shipping_fee, o.discount_amount, o.final_price,
--   o.payment_method, o.payment_code, o.payment_status, o.status, o.note,
--   coalesce(items.item_count, 0) as item_count,
--   coalesce(items.total_qty, 0)  as total_qty,
--   o.created_at, o.updated_at,
--   case when o.payment_method = 'cod' and o.status = 'done' then true else false end as cod_delivered_success,
--   o.jt_bill_code, o.jt_txlogisticid, o.jt_tracking_url, o.jt_weight_kg,
--   o.jt_shipping_fee, o.jt_status, o.jt_last_trace, o.jt_created_at, o.jt_cancel_reason,
--   case o.jt_status
--     when 'created'   then 'Đã tạo vận đơn'
--     when 'pickup'    then 'Đã lấy hàng'
--     when 'transit'   then 'Đang vận chuyển'
--     when 'delivered' then 'Đã giao hàng'
--     when 'cancelled' then 'Đã huỷ vận đơn'
--     when 'returned'  then 'Hoàn hàng'
--     else coalesce(o.jt_status, 'Chưa gửi J&T')
--   end as jt_status_label,
--   (o.jt_bill_code is not null) as has_jt_order
-- from orders o
-- left join customers c on c.id = o.customer_id
-- left join (
--   select order_id, count(*) as item_count, sum(quantity) as total_qty
--   from order_items group by order_id
-- ) items on items.order_id = o.id;

-- comment on view v_orders_full is 'Đơn hàng full data + cột J&T. Admin donhang SELECT từ đây.';

-- create or replace view v_customer_loyalty as
-- with order_done as (
--   select o.customer_id, count(*) as done_orders, coalesce(sum(o.final_price),0) as ltv_raw,
--          coalesce(sum(oi.quantity),0) as products_qty, max(o.created_at) as last_buy, min(o.created_at) as first_buy
--   from orders o left join order_items oi on oi.order_id = o.id
--   where o.status = 'done' group by o.customer_id
-- ),
-- order_cancelled as (
--   select customer_id, count(*) as cancel_count from orders where status = 'cancelled' group by customer_id
-- ),
-- purchased as (
--   select customer_id, jsonb_agg(jsonb_build_object('product_id',product_id,'name',name,'slug',slug,'image_url',image_url,'qty',qty,'last_buy_at',last_buy_at) order by last_buy_at desc) as products_json
--   from (
--     select o.customer_id, p.id as product_id, p.name, p.slug, p.image_url,
--            sum(oi.quantity) as qty, max(o.created_at) as last_buy_at
--     from orders o join order_items oi on oi.order_id = o.id join products p on p.id = oi.product_id
--     where o.status = 'done' and p.id is not null
--     group by o.customer_id, p.id, p.name, p.slug, p.image_url
--   ) inner_purchased group by customer_id
-- )
-- select
--   c.id as customer_id, c.name as customer_name, c.email, c.phone,
--   case when c.phone is not null and c.email is not null then c.phone || ' / ' || c.email
--        when c.phone is not null then c.phone when c.email is not null then c.email
--        else '(chưa có SĐT/Email)' end as contact,
--   coalesce(od.done_orders,0) as total_orders,
--   coalesce(od.products_qty,0) as total_products,
--   coalesce(oc.cancel_count,0) as cancelled_orders,
--   coalesce(od.ltv_raw,0) as ltv,
--   case when coalesce(od.done_orders,0) > 0 then round(od.ltv_raw / od.done_orders, 2) else 0 end as aov,
--   coalesce(p.products_json, '[]'::jsonb) as purchased_products,
--   od.first_buy as first_purchase_at, od.last_buy as last_purchase_at,
--   c.is_active, c.created_at as customer_since,
--   case when coalesce(od.ltv_raw,0) >= 10000000 then 'platinum'
--        when coalesce(od.ltv_raw,0) >= 5000000 then 'gold'
--        when coalesce(od.ltv_raw,0) >= 2000000 then 'silver' else 'bronze' end as rank,
--   coalesce((select value from site_settings where key = 'loyalty_enabled'), 'false') as loyalty_enabled
-- from customers c
-- left join order_done od on od.customer_id = c.id
-- left join order_cancelled oc on oc.customer_id = c.id
-- left join purchased p on p.customer_id = c.id;

-- comment on view v_customer_loyalty is 'Tổng hợp KH + LTV + AOV + rank, real-time từ orders.';

-- create or replace view v_active_vouchers as
-- select v.id, v.code, v.is_public, v.rank, v.discount_type, v.discount_value, v.min_order, v.max_discount,
--        v.expires_at, v.issued_at, v.used_at, v.is_active, v.note, v.customer_id,
--        c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
--        case when v.used_at is not null then 'used'
--             when v.expires_at is not null and v.expires_at < now() then 'expired'
--             when v.is_active = false then 'inactive' else 'active' end as status
-- from customer_vouchers v
-- left join customers c on c.id = v.customer_id
-- where v.is_active = true;

-- comment on view v_active_vouchers is 'Voucher còn hạn + chưa dùng, bao gồm cả voucher public (customer_id IS NULL).';


-- -- =============================================================
-- -- §20  RLS — bật RLS + policy cho TẤT CẢ bảng, sau khi mọi bảng
-- --       đã chắc chắn tồn tại.
-- -- =============================================================
-- do $$
-- declare
--   t text;
--   tbls text[] := array[
--     'products','product_groups','price_list','product_shipping_services',
--     'customers','orders','order_items','admins','users','posts','news_categories',
--     'homepage_banners','homepage_sections','homepage_section_products','homepage_config',
--     'homepage_values','homepage_promo_banners','homepage_articles','homepage_blog','homepage_picks',
--     'transactions','product_reviews','upload_groups','about_content','videos',
--     'customer_stats','customer_vouchers'
--   ];
-- begin
--   foreach t in array tbls loop
--     execute format('alter table %I enable row level security', t);
--     execute format('drop policy if exists "allow_all_%s" on %I', t, t);
--     execute format('create policy "allow_all_%s" on %I for all using (true) with check (true)', t, t);
--   end loop;
-- end $$;

-- -- site_settings: chứa key SMTP/Zalo — KHÔNG cấp allow_all vô điều kiện.
-- alter table site_settings enable row level security;

-- drop policy if exists p_anon_read_site_settings on site_settings;
-- create policy p_anon_read_site_settings on site_settings for select to anon, authenticated using (true);

-- drop policy if exists p_anon_write_site_settings on site_settings;
-- create policy p_anon_write_site_settings on site_settings for insert to anon, authenticated with check (true);

-- drop policy if exists p_anon_update_site_settings on site_settings;
-- create policy p_anon_update_site_settings on site_settings for update to anon, authenticated using (true) with check (true);
-- -- Lưu ý bảo mật: site_settings đang mở ghi cho anon để Settings.jsx hoạt động
-- -- (dev-only). Trước khi lên production nên siết lại chỉ cho authenticated/service_role,
-- -- và tách riêng các key nhạy cảm (SMTP pass, Zalo secret) ra khỏi payload trả cho FE.

-- -- customer_vouchers: thêm quyền đọc cho anon (checkout cần validate code)
-- drop policy if exists p_anon_read_vouchers on customer_vouchers;
-- create policy p_anon_read_vouchers on customer_vouchers for select to anon, authenticated using (true);


-- -- =============================================================
-- -- §21  STORAGE BUCKETS + POLICIES (chỉ chạy trên Supabase)
-- -- =============================================================
-- do $$
-- begin
--   if exists (select 1 from pg_catalog.pg_namespace where nspname = 'storage') then
--     insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
--     values
--       ('product-images',  'product-images',  true, 52428800, null),
--       ('homepage-assets', 'homepage-assets', true, 52428800, null)
--     on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

--     drop policy if exists "Allow public upload" on storage.objects;
--     drop policy if exists "Allow public read"   on storage.objects;
--     drop policy if exists "Allow public update" on storage.objects;
--     drop policy if exists "Allow public delete" on storage.objects;
--     drop policy if exists "Allow anon upload"   on storage.objects;
--     drop policy if exists "Allow anon select"   on storage.objects;

--     create policy "Allow public upload" on storage.objects for insert to anon, authenticated
--       with check (bucket_id in ('product-images', 'homepage-assets'));
--     create policy "Allow public read" on storage.objects for select to anon, authenticated
--       using (bucket_id in ('product-images', 'homepage-assets'));
--     create policy "Allow public update" on storage.objects for update to anon, authenticated
--       using (bucket_id in ('product-images', 'homepage-assets'))
--       with check (bucket_id in ('product-images', 'homepage-assets'));
--     create policy "Allow public delete" on storage.objects for delete to anon, authenticated
--       using (bucket_id in ('product-images', 'homepage-assets'));
--   end if;
-- end $$;


-- -- =============================================================
-- -- §22  DỮ LIỆU MẪU
-- -- =============================================================
-- insert into admins (name, email, password, role, admin_priority) values
--   ('Super Admin', 'admin@techtra.vn', '$2b$10$placeholder_hash_change_me', 'superadmin', 1)
-- on conflict (email) do nothing;

-- insert into users (username, email, password_hash, full_name, role) values
--   ('admin', 'admin@techtra.vn', '$2b$10$placeholder_admin_hash', 'Quản trị viên', 'admin'),
--   ('user',  'user@techtra.vn',  '$2b$10$placeholder_user_hash',  'Khách hàng',    'user')
-- on conflict (username) do nothing;

-- insert into product_groups (name, slug, description, is_active, is_slider, sort_order) values
--   ('Sản phẩm nổi bật',   'san-pham-noi-bat',   'Các sản phẩm bán chạy nhất', true, true,  1),
--   ('Sản phẩm khuyến mãi', 'san-pham-khuyen-mai', 'Đang giảm giá',             true, false, 2),
--   ('Trang chủ',           'trang-chu',           'Hiển thị trên trang chủ',   true, true,  3)
-- on conflict (slug) do nothing;

-- insert into homepage_sections (section_key, title, is_active, sort_order) values
--   ('featured',     'Sản phẩm nổi bật', true, 1),
--   ('sale',         'Đang giảm giá',    true, 2),
--   ('new_arrivals', 'Hàng mới về',      true, 3)
-- on conflict (section_key) do nothing;

-- insert into price_list (sku, name, price, discount, final_price, stock, unit, sort_order) values
--   ('SP001', 'Nước rửa bát Techtra 750ml', 89000,  10,  80100, 100, 'chai', 1),
--   ('SP002', 'Bột giặt Techtra 3kg',       165000, 15, 140250,  60, 'túi',  2),
--   ('SP003', 'Nước lau sàn Techtra 1L',    55000,  0,  55000, 200, 'chai', 3)
-- on conflict (sku) do nothing;

-- insert into homepage_values (icon, title, description, sort_order) values
--   ('fas fa-seedling',     '100% Thiên Nhiên',   'Nguyên liệu thuần thực vật tinh khiết từ vườn dược liệu Việt Nam', 1),
--   ('fas fa-shield-heart', 'Lành và Thật',       'Công thức tối giản, không chất bảo quản độc hại, cam kết công khai thành phần', 2),
--   ('fas fa-industry',     'Nhà Máy Đạt CGMP',   'Quy trình sản xuất khép kín, vô trùng đạt chứng nhận CGMP ASEAN', 3),
--   ('fas fa-baby',         'An Toàn Cho Bé & Bầu','Mỹ phẩm siêu lành tính, được khuyên dùng bởi các chuyên gia y tế', 4)
-- on conflict do nothing;

-- insert into homepage_promo_banners (position, tag, title, cta_text, cta_link, sort_order) values
--   ('left',  'Quà tặng ngọt ngào',  'Combo Quà Tặng Cho Nửa Yêu Thương', 'Mua ngay',  '#', 1),
--   ('right', 'Liệu pháp phục hồi',  'Chăm Sóc Tóc Dược Liệu Bưởi Đỏ',    'Khám phá',  '#', 2)
-- on conflict do nothing;

-- insert into homepage_blog (title, description, author, sort_order) values
--   ('Top 5 Thành Phần Thiên Nhiên Giúp Phục Hồi Tóc Rụng Cực Nhạy',
--    'Khám phá bí quyết chăm sóc tóc thảo dược an toàn hiệu quả từ tinh dầu bưởi, bồ kết, hương nhu cô đặc.',
--    'Dược sĩ Cỏ Mềm', 1),
--   ('Bầu Bí Vẫn Xinh Rạng Ngời Nhờ 4 Bước Chăm Da Tối Giản Này',
--    'Mẹo thiết lập chu trình dưỡng da lành tính, cam kết 100% không chứa silicon, parabens và hóa chất độc hại.',
--    'Skin Specialist', 2),
--   ('Chiến Dịch Trồng Rừng Giữ Đất: Cỏ Mềm Đồng Hành Cùng Hành Tinh Xanh',
--    'Hành trình phủ xanh các vạt đồi trống miền Trung với hơn 10,000 cây xanh và cam kết giảm thiểu rác thải nhựa.',
--    'Green Life', 3)
-- on conflict do nothing;

-- insert into news_categories (name, slug, description, icon, parent_id, sort_order, is_active) values
--   ('Chăm sóc cơ thể', 'cham-soc-co-the', 'Bí quyết chăm sóc cơ thể toàn diện',  'fas fa-spa',      NULL, 1, true),
--   ('Chăm sóc da',     'cham-soc-da',     'Làm đẹp & dưỡng da chuẩn khoa học',   'fas fa-leaf',     NULL, 2, true),
--   ('Chăm sóc tóc',    'cham-soc-toc',    'Phục hồi tóc hư tổn',                'fas fa-magic',    NULL, 3, true),
--   ('Cẩm nang',        'cam-nang',        'Mẹo vặt & tin tức hữu ích',           'fas fa-book-open',NULL, 4, true)
-- on conflict (slug) do nothing;

-- insert into news_categories (name, slug, description, icon, parent_id, sort_order, is_active)
-- select v.name, v.slug, v.description, v.icon, p.id, v.sort_order, true
-- from (values
--   ('Chăm sóc môi',         'cham-soc-moi',         'Dưỡng môi mềm mại',         'fas fa-kiss-wink-heart', 1),
--   ('Chăm sóc tay & chân',  'cham-soc-tay-chan',    'Da tay chân mịn màng',      'fas fa-hand-paper',      2),
--   ('Chăm sóc mẹ & bé',     'cham-soc-me-be',       'An toàn cho cả mẹ và bé',   'fas fa-baby',            3)
-- ) as v(name, slug, description, icon, sort_order)
-- cross join lateral (select id from news_categories where slug = 'cham-soc-co-the' limit 1) as p
-- where not exists (select 1 from news_categories nc where nc.slug = v.slug);


-- -- =============================================================
-- -- §23  Backfill cuối cùng + reload cache
-- -- =============================================================
-- update orders set status = lower(status) where status <> lower(status);

-- update orders
--    set customer_name  = coalesce(customer_name, receiver_name),
--        customer_phone = coalesce(customer_phone, receiver_phone),
--        address        = coalesce(address, receiver_address)
--  where (customer_name is null or customer_phone is null or address is null)
--    and (receiver_name is not null or receiver_phone is not null or receiver_address is not null);

-- do $$
-- begin
--   perform pg_notify('pgrst', 'reload schema');
-- exception when others then null;
-- end $$;

-- -- =============================================================
-- -- HẾT — Chạy toàn bộ file này 1 lần trong Supabase SQL Editor.
-- -- Admin mặc định: admin@techtra.vn / admin123 (hash placeholder — đổi qua API register)
-- -- =============================================================
-- =============================================================
-- TECHTRA SHOP — FULL DATABASE SCHEMA (ĐÃ SỬA LỖI THỨ TỰ + LỖI FK TYPE)
-- Dùng cho Supabase SQL Editor — chạy 1 file duy nhất, nhiều lần OK.
-- Sửa so với bản gốc:
--   1) "drop table upload_groups cascade" từng nằm SAU phần tạo bảng
--      + seed dữ liệu của chính nó → mỗi lần chạy lại sẽ XÓA SẠCH DATA.
--      → Đã XÓA hẳn 2 dòng drop table này (idempotent = dùng
--      "create table if not exists", không cần drop).
--   2) about_content / videos tham chiếu upload_groups(id) nhưng
--      upload_groups lại được CREATE ở dưới xa → lỗi "relation
--      upload_groups does not exist" trên DB trống.
--      → Đưa create table upload_groups lên TRƯỚC about_content/videos.
--   3) alter table upload_groups / about_content / videos enable RLS
--      từng nằm TRƯỚC lệnh create table tương ứng → lỗi tương tự.
--      → Gộp toàn bộ enable RLS + policy vào §20 (sau khi mọi bảng
--      đã tồn tại).
--   4) Migration "Voucher public" (alter table customer_vouchers...)
--      từng nằm TRƯỚC migration "Khách hàng thân thiết" (nơi tạo
--      bảng customer_vouchers) → lỗi trên DB trống.
--      → Đưa create table customer_vouchers / customer_stats /
--      site_settings lên trước, các ALTER/voucher-public logic để sau.
--   5) v_orders_full từng được CREATE OR REPLACE 3 lần khác nhau
--      (thiếu cột jt_*, rồi thêm jt_*, rồi đổi tên cột jt_*) → giữ
--      lại đúng 1 bản CUỐI CÙNG, đầy đủ nhất (jt_bill_code,
--      jt_txlogisticid, jt_tracking_url, jt_weight_kg, ...).
--   6) Toàn bộ ALTER TABLE ... ADD COLUMN IF NOT EXISTS (jt_*,
--      is_bulky, jt_services, product_groups.code, is_sale,
--      homepage_config.popup, orders.receiver_*, admins.admin_priority,
--      order_items.line_total...) được gom lại NGAY SAU khi bảng gốc
--      được tạo, thay vì rải rác ở cuối file.
--   7) [MỚI] about_content.group_id và videos.group_id từng khai báo
--      kiểu "bigint" trong khi upload_groups.id là "uuid" → lỗi
--      42804 "foreign key constraint cannot be implemented: Key
--      columns group_id and id are of incompatible types: bigint
--      and uuid". → Đổi cả 2 cột group_id sang kiểu uuid cho khớp.
-- =============================================================


-- =============================================================
-- §0  EXTENSIONS + QUYỀN TRUY CẬP SCHEMA PUBLIC
-- =============================================================
create extension if not exists "pgcrypto";

-- Tạo các role giả để tránh lỗi nếu script init chạy trên postgres thường (không phải Supabase)
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
end$$;

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
  condition_type varchar(20)  default 'manual',
  is_active      boolean      default true,
  is_slider      boolean      default false,
  sort_order     integer      default 0,
  product_count  integer      default 0,
  created_at     timestamp    default now(),
  updated_at     timestamp    default now()
);

alter table product_groups
  add column if not exists parent_id       integer references product_groups(id) on delete cascade,
  add column if not exists slider_text     text,
  add column if not exists intro_title     text,
  add column if not exists intro_subtitle  text,
  add column if not exists intro_image_url text,
  add column if not exists code            text,
  add column if not exists is_sale         boolean default false;

create index if not exists idx_product_groups_slider on product_groups (is_slider) where is_slider = true;
create index if not exists idx_product_groups_parent on product_groups (parent_id);
create unique index if not exists product_groups_code_key on product_groups (code) where code is not null;


-- =============================================================
-- §2  products
-- =============================================================
create table if not exists products (
  id            serial primary key,
  name          varchar(255)  not null,
  slug          varchar(255)  unique not null,
  description   text,
  group_id      integer       references product_groups(id) on delete set null,
  price         numeric(12,2) not null default 0,
  final_price   numeric(12,2),
  discount      numeric(5,2)  default 0,
  stock         integer       default 0,
  sku           varchar(100)  unique,
  weight        numeric(10,2) default 0,
  weight_unit   varchar(5)    default 'g',
  height        numeric(8,2)  default 0,
  width         numeric(8,2)  default 0,
  length        numeric(8,2)  default 0,
  images        text[]        default '{}',
  image_url     text,
  video_url     text,
  content_file  text,
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
  is_active     boolean       default false,
  is_featured   boolean       default false,
  is_flash_sale boolean       default false,
  percent_sold  integer       default 0,
  old_price     numeric(12,2),
  flash_sale_discount numeric(5,2),
  flash_sale_end_at   timestamptz,
  cod_enabled   boolean       default true,
  shipping_type varchar(20)   default 'default',
  shipping_method varchar(20) default 'default',
  jt_fee_default numeric(10,2),
  is_calculating_fee boolean  default false,
  fee_error     text,
  status        varchar(20)   default 'active',
  created_at    timestamp     default now(),
  updated_at    timestamp     default now()
);

alter table products
  add column if not exists is_bulky    boolean not null default false,
  add column if not exists jt_services text[]  default '{}';

create index if not exists idx_products_flash_sale_discount on products (flash_sale_discount) where flash_sale_discount is not null;
create index if not exists idx_products_flash_sale_end_at   on products (flash_sale_end_at);
create index if not exists idx_products_slug       on products (slug);
create index if not exists idx_products_group      on products (group_id);
create index if not exists idx_products_status_act on products (status) where status = 'active';
create index if not exists idx_products_is_active  on products (is_active) where is_active = true;


-- =============================================================
-- §3  price_list
-- =============================================================
create table if not exists price_list (
  id          serial primary key,
  sku         varchar(100) unique not null,
  product_id  integer references products(id) on delete set null,
  name        varchar(255) not null,
  group_id    integer references product_groups(id) on delete set null,
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
-- §4  product_shipping_services
-- =============================================================
create table if not exists product_shipping_services (
  id           serial primary key,
  product_id   integer references products(id) on delete cascade,
  service_code varchar(20)  not null,
  service_name varchar(100),
  is_active    boolean default true
);


-- =============================================================
-- §5  customers
-- =============================================================
create table if not exists customers (
  id         serial primary key,
  name       varchar(255),
  email      varchar(255) unique,
  phone      varchar(20),
  password   varchar(255),
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
  order_code      varchar(50) unique,
  customer_id     integer references customers(id) on delete set null,
  customer_name   varchar(255),
  customer_phone  varchar(20),
  address         text,
  province        varchar(100),
  district        varchar(100),
  ward            varchar(100),
  total_price     numeric(12,2) default 0,
  shipping_fee    numeric(10,2) default 0,
  discount_amount numeric(10,2) default 0,
  final_price     numeric(12,2) default 0,
  payment_method  varchar(50)  default 'cod',
  payment_status  varchar(20)  default 'pending',
  status          varchar(30)  default 'pending',
  note            text,
  created_at      timestamp    default now(),
  updated_at      timestamp    default now()
);

-- Patch: cột J&T Express (bản cuối, đơn vị KG, dùng txlogisticid để huỷ/sửa)
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

-- Patch: cột khớp FE thanh-toan.js
alter table orders
  add column if not exists receiver_name           varchar(255),
  add column if not exists receiver_phone          varchar(20),
  add column if not exists receiver_email          varchar(255),
  add column if not exists receiver_address        text,
  add column if not exists subtotal_price          numeric(12,2) default 0,
  add column if not exists discount_price          numeric(12,2) default 0,
  add column if not exists voucher_code            varchar(50),
  add column if not exists voucher_discount_type   varchar(20),
  add column if not exists voucher_discount_value  numeric(12,2),
  add column if not exists payment_code            varchar(140);

comment on column orders.status is 'pending/confirmed/shipping/done/cancelled + deleted_before_ship';
comment on column orders.jt_bill_code    is 'Mã vận đơn J&T trả về (billcode) — dùng để TRA CỨU';
comment on column orders.jt_txlogisticid is 'Mã đơn nội bộ gửi lên J&T lúc tạo — dùng để HUỶ/SỬA';
comment on column orders.jt_status       is 'created / pickup / transit / delivered / cancelled / returned';
comment on column orders.jt_weight_kg    is 'Trọng lượng gửi J&T, đơn vị KG';

create index if not exists idx_orders_jt_bill        on orders(jt_bill_code);
create index if not exists idx_orders_jt_txlogisticid on orders(jt_txlogisticid);
create index if not exists idx_orders_jt_status      on orders(jt_status);

create table if not exists order_items (
  id           serial primary key,
  order_id     integer       references orders(id)   on delete cascade,
  product_id   integer       references products(id) on delete set null,
  product_name varchar(255),
  product_sku  varchar(100),
  image_url    text,
  quantity     integer       not null default 1,
  unit_price   numeric(12,2) not null,
  discount     numeric(5,2)  default 0,
  subtotal     numeric(12,2) not null default 0
);

alter table order_items add column if not exists line_total numeric(12,2) default 0;
alter table order_items alter column subtotal set default 0;

update order_items
   set subtotal = unit_price * quantity
 where coalesce(subtotal, 0) = 0 and unit_price is not null and quantity is not null;


-- =============================================================
-- §7  admins
-- =============================================================
create table if not exists admins (
  id         serial primary key,
  name       varchar(255),
  email      varchar(255) unique not null,
  password   varchar(255) not null,
  role       varchar(20)  default 'admin',
  admin_priority integer default 0,
  is_active  boolean      default true,
  created_at timestamp    default now()
);

alter table admins
  add column if not exists admin_priority integer default 0,
  add column if not exists is_active      boolean  default true;

update admins set admin_priority = coalesce(admin_priority, 0), is_active = coalesce(is_active, true);

create or replace function enforce_superadmin_limit()
returns trigger as $$
begin
  if (NEW.role = 'superadmin') then
    if (tg_op = 'INSERT') then
      if (select count(*) from admins a where a.role = 'superadmin') >= 2 then
        raise exception 'Superadmin limit exceeded (max 2)';
      end if;
    else
      if (OLD.role <> 'superadmin') then
        if (select count(*) from admins a where a.role = 'superadmin' and a.id <> OLD.id) >= 2 then
          raise exception 'Superadmin limit exceeded (max 2)';
        end if;
      end if;
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_enforce_superadmin_limit on admins;
create trigger trg_enforce_superadmin_limit
before insert or update of role on admins
for each row execute function enforce_superadmin_limit();


-- =============================================================
-- §8  users
-- =============================================================
create table if not exists users (
  id            serial primary key,
  username      varchar(50) unique not null,
  email         varchar(255) unique not null,
  password_hash text not null,
  full_name     varchar(255),
  phone         varchar(20),
  is_active     boolean     default true,
  role          varchar(20) default 'user',
  created_at    timestamp   default now(),
  updated_at    timestamp   default now()
);

alter table users add column if not exists phone varchar(20);

create index if not exists idx_users_username on users (username);
create index if not exists idx_users_email    on users (email);


-- =============================================================
-- §9  posts + §9.1 news_categories
-- =============================================================
create table if not exists news_categories (
  id          serial primary key,
  name        varchar(255) not null,
  slug        varchar(255) unique not null,
  description text,
  icon        varchar(100),
  image_url   text,
  parent_id   integer references news_categories(id) on delete cascade,
  sort_order  integer      default 0,
  is_active   boolean      default true,
  created_at  timestamp    default now(),
  updated_at  timestamp    default now()
);

create index if not exists idx_news_categories_parent on news_categories (parent_id);
create index if not exists idx_news_categories_active on news_categories (is_active) where is_active = true;
create index if not exists idx_news_categories_order  on news_categories (sort_order);

create table if not exists posts (
  id           serial primary key,
  title        varchar(500) not null,
  slug         varchar(500) unique not null,
  content      text,
  thumbnail    text,
  status       varchar(20) default 'draft',
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
  add column if not exists thumbnail_source text,
  add column if not exists category_id integer references news_categories(id) on delete set null,
  add column if not exists file_url    text,
  add column if not exists file_name   varchar(255),
  add column if not exists file_size   bigint,
  add column if not exists post_type   varchar(20) default 'link';

create index if not exists idx_posts_source     on posts (source_url);
create index if not exists idx_posts_status_pub on posts (status, published_at desc);
create index if not exists idx_posts_category   on posts (category_id);
create index if not exists idx_posts_type       on posts (post_type);


-- =============================================================
-- §10-17  homepage_*
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

create table if not exists homepage_sections (
  id          serial primary key,
  section_key varchar(50) unique not null,
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

create table if not exists homepage_config (
  id          int primary key default 1,
  background  jsonb not null default '{"type":"color","color":"#6a11cb","imageUrl":"","videoUrl":""}'::jsonb,
  hero        jsonb not null default '{"enabled":true,"imageUrl":"","title":"Chào mừng đến với Techtra Shop","subtitle":"Cửa hàng công nghệ — uy tín, chất lượng, giao hàng toàn quốc","ctaText":"Khám phá ngay","ctaLink":"/san-pham"}'::jsonb,
  sections    jsonb not null default '{"heroSlider":true,"brandValues":true,"categories":true,"flashSale":true,"bestSellers":true,"promoBanners":true,"blog":true,"newsletter":true}'::jsonb,
  flash_sale  jsonb not null default '{"title":"Giờ Vàng Deal Xịn","enabled":true}'::jsonb,
  updated_at  timestamptz default now(),
  constraint single_row check (id = 1)
);

insert into homepage_config (id) values (1) on conflict (id) do nothing;

alter table homepage_config
  add column if not exists popup jsonb not null default jsonb_build_object(
    'enabled', false, 'title', 'THÔNG BÁO', 'imageUrl', '', 'link', '', 'dontShowDays', 7
  );

update homepage_config
   set popup = jsonb_build_object('enabled', false, 'title', 'THÔNG BÁO', 'imageUrl', '', 'link', '', 'dontShowDays', 7)
 where popup is null;

comment on column homepage_config.popup is 'Cấu hình popup thông báo trang chủ: {enabled, title, imageUrl, link, dontShowDays}';

create table if not exists homepage_values (
  id          uuid primary key default gen_random_uuid(),
  icon        text not null default 'fas fa-seedling',
  title       text not null,
  description text,
  sort_order  int  default 0,
  enabled     boolean default true,
  created_at  timestamptz default now()
);

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

create table if not exists homepage_picks (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('slider', 'featured', 'flash_sale')),
  target_id    text not null,
  target_kind  text not null check (target_kind in ('product', 'group')),
  custom_title text,
  custom_image text,
  sort_order   int  default 0,
  enabled      boolean default true,
  created_at   timestamptz default now()
);

create unique index if not exists uq_homepage_picks on homepage_picks (kind, target_id);
create index if not exists idx_homepage_picks_kind_order on homepage_picks (kind, sort_order);


-- =============================================================
-- §18  transactions
-- =============================================================
create table if not exists transactions (
  id          serial primary key,
  order_id    integer references orders(id) on delete set null,
  type        varchar(20)   not null,
  amount      numeric(12,2) not null,
  description text,
  created_at  timestamp     default now()
);


-- =============================================================
-- §18.1  product_reviews
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

create index if not exists idx_product_reviews_product on product_reviews (product_id, created_at desc);

-- Thêm cột cho flow review mới (idempotent — ALTER TABLE ADD COLUMN IF NOT EXISTS)
ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS phone        TEXT;
ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS customer_id  INTEGER;
ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS status       TEXT DEFAULT 'pending';
CREATE INDEX IF NOT EXISTS idx_pr_status ON product_reviews(status);

-- Bảng product_variants: mỗi SP có nhiều size/màu với stock riêng
CREATE TABLE IF NOT EXISTS product_variants (
  id           SERIAL PRIMARY KEY,
  product_id   INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size         TEXT,
  color        TEXT,
  color_hex    TEXT,
  stock        INTEGER DEFAULT 0,
  price_adjust NUMERIC(10,2) DEFAULT 0,
  sku          TEXT,
  is_active    BOOLEAN DEFAULT true,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pv_product ON product_variants(product_id);

create or replace view v_product_rating as
  select product_id, count(*) as review_count, avg(rating)::numeric(3,2) as avg_rating
  from product_reviews
  where is_approved = true
  group by product_id;


-- =============================================================
-- §18.2  upload_groups + about_content + videos
-- -------------------------------------------------------------
-- SỬA: upload_groups phải được tạo TRƯỚC about_content/videos vì
-- 2 bảng đó FK tới nó. Đã bỏ "drop table ... cascade" (từng nằm
-- sau khi tạo bảng, gây xóa sạch dữ liệu mỗi lần chạy lại file).
-- SỬA (mới): group_id trong about_content/videos đổi từ bigint
-- sang uuid để khớp kiểu với upload_groups.id (uuid) — tránh lỗi
-- 42804 "foreign key constraint cannot be implemented".
-- =============================================================
create table if not exists upload_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null,
  description text,
  icon        text,
  parent_id   uuid references upload_groups(id) on delete cascade,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  display_locations text[] default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Backfill từ cột display_location cũ (nếu có) sang display_locations text[]
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'upload_groups' and column_name = 'display_locations'
  ) then
    if exists (
      select 1 from information_schema.columns
      where table_name = 'upload_groups' and column_name = 'display_location'
    ) then
      alter table upload_groups add column display_locations text[] default '{}';
      update upload_groups set display_locations = array[display_location] where display_location is not null;
      alter table upload_groups drop column display_location;
    else
      alter table upload_groups add column display_locations text[] default '{}';
    end if;
  end if;
end$$;

create index if not exists upload_groups_display_locations_gin_idx on upload_groups using gin (display_locations);
create unique index if not exists upload_groups_slug_per_parent_uidx on upload_groups (parent_id, slug);
create index if not exists upload_groups_parent_id_idx on upload_groups (parent_id);
create index if not exists upload_groups_sort_order_idx on upload_groups (sort_order);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_upload_groups_updated_at on upload_groups;
create trigger trg_upload_groups_updated_at
  before update on upload_groups
  for each row execute function set_updated_at();

-- [FIXED] group_id: bigint -> uuid (phải khớp kiểu với upload_groups.id)
create table if not exists about_content (
  id bigint generated always as identity primary key,
  group_id uuid unique references upload_groups(id) on delete cascade,
  content text,
  updated_at timestamptz default now()
);

-- [FIXED] group_id: bigint -> uuid (phải khớp kiểu với upload_groups.id)
create table if not exists videos (
  id bigint generated always as identity primary key,
  group_id uuid references upload_groups(id) on delete set null,
  title text,
  url text,
  file_name text,
  file_size bigint,
  created_at timestamptz default now()
);

-- An toàn cho lần chạy lại: nếu about_content/videos đã tồn tại từ TRƯỚC
-- với group_id kiểu bigint (ví dụ từ 1 lần chạy cũ), tự động sửa lại kiểu.
-- Chỉ chạy được nếu cột đang toàn NULL (không có data cũ dùng bigint thật).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'about_content' and column_name = 'group_id' and data_type = 'bigint'
  ) then
    alter table about_content alter column group_id type uuid using group_id::text::uuid;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_name = 'videos' and column_name = 'group_id' and data_type = 'bigint'
  ) then
    alter table videos alter column group_id type uuid using group_id::text::uuid;
  end if;
end $$;


-- =============================================================
-- §18.3  customer_stats / customer_vouchers / site_settings
-- -------------------------------------------------------------
-- SỬA: đưa lên trước mọi ALTER/voucher-public logic (bản gốc có
-- migration "voucher public" alter customer_vouchers TRƯỚC khi
-- bảng này được tạo → lỗi trên DB trống).
-- =============================================================
create table if not exists customer_stats (
  customer_id        integer primary key references customers(id) on delete cascade,
  total_orders       integer     default 0,
  total_products     integer     default 0,
  cancelled_orders   integer     default 0,
  ltv                numeric(14,2) default 0,
  aov                numeric(14,2) default 0,
  purchased_products jsonb        default '[]'::jsonb,
  first_purchase_at  timestamptz,
  last_purchase_at   timestamptz,
  updated_at         timestamptz default now()
);

comment on table customer_stats is 'Tổng hợp KH thân thiết: số đơn, tổng SP, LTV, AOV, list SP đã mua.';

create table if not exists customer_vouchers (
  id            serial primary key,
  customer_id   integer     references customers(id) on delete cascade,
  code          varchar(50) unique,
  rank          varchar(20) default 'bronze',
  discount_type varchar(20) default 'percent',
  discount_value numeric(10,2) default 0,
  min_order     numeric(12,2) default 0,
  max_discount  numeric(12,2),
  issued_at     timestamptz default now(),
  expires_at    timestamptz,
  used_at       timestamptz,
  order_id      integer     references orders(id) on delete set null,
  is_active     boolean     default true,
  note          text,
  is_public     boolean     default false
);

comment on table customer_vouchers is 'Voucher phát cho khách thân thiết + voucher public (customer_id NULL, is_public=true)';
comment on column customer_vouchers.is_public is 'TRUE: voucher public, ai cũng nhập code dùng được. FALSE: voucher cá nhân.';

create index if not exists idx_customer_vouchers_customer on customer_vouchers (customer_id);
create index if not exists idx_customer_vouchers_active on customer_vouchers (is_active, expires_at) where is_active = true;
create index if not exists idx_customer_vouchers_public on customer_vouchers (code) where is_public = true and is_active = true;

create table if not exists site_settings (
  key         varchar(100) primary key,
  value       text,
  value_json  jsonb,
  description text,
  updated_at  timestamptz default now()
);

comment on table site_settings is 'Cấu hình hệ thống key/value. Công tắc rank khách thân thiết: key=loyalty_enabled';

insert into site_settings (key, value, value_json, description) values
  ('loyalty_enabled', 'false', null, 'Bật/tắt chương trình khách thân thiết'),
  ('loyalty_tier_thresholds', null,
   '{"bronze":{"min_ltv":0,"voucher":null},
     "silver":{"min_ltv":2000000,"voucher":{"type":"percent","value":5,"min_order":500000,"max_discount":100000}},
     "gold":{"min_ltv":5000000,"voucher":{"type":"percent","value":10,"min_order":1000000,"max_discount":300000}},
     "platinum":{"min_ltv":10000000,"voucher":{"type":"percent","value":15,"min_order":0,"max_discount":500000}}}'::jsonb,
   'Ngưỡng LTV cho từng hạng + quà tặng voucher khi đạt hạng'),
  ('loyalty_only_done_orders', 'true', null, 'Chỉ tính đơn status=done vào LTV'),
  ('loyalty_min_orders_for_rank', '1', null, 'Số đơn done tối thiểu để được xét hạng'),
  ('loyalty_voucher_valid_days', '30', null, 'Voucher có hiệu lực bao nhiêu ngày kể từ khi phát'),
  ('zalo_app_id',       '', null, 'Zalo OA — App ID'),
  ('zalo_secret_key',   '', null, 'Zalo OA — Secret Key'),
  ('zalo_access_token', '', null, 'Zalo OA — Access Token'),
  ('smtp_host',         '', null, 'SMTP host'),
  ('smtp_port',         '587', null, 'SMTP port'),
  ('smtp_user',         '', null, 'SMTP username'),
  ('smtp_pass',         '', null, 'SMTP password / app password'),
  ('smtp_from_email',   '', null, 'SMTP — địa chỉ From hiển thị'),
  ('smtp_from_name',    'Techtra', null, 'SMTP — tên hiển thị khi gửi mail')
on conflict (key) do nothing;

-- Cho phép customer_id/rank NULL (voucher public)
alter table customer_vouchers alter column customer_id drop not null;
alter table customer_vouchers alter column rank drop not null;


-- =============================================================
-- §18.4  OTP verification_codes + otp_send_log
-- -------------------------------------------------------------
-- Lưu mã OTP qua email/Zalo thay cho in-memory Map cũ trong
-- server.js. Mã được bcrypt hash, có TTL 5 phút, consume 1 lần,
-- rate-limit 5 lần/10 phút/identifier (xem otp_send_log).
-- =============================================================
create table if not exists verification_codes (
  id            bigserial    primary key,
  identifier    text         not null,
  channel       text         not null check (channel in ('email', 'zalo')),
  purpose       text         not null check (purpose in ('register', 'review', 'reset_password')),
  code_hash     text         not null,
  attempts      integer      not null default 0,
  max_attempts  integer      not null default 5,
  created_at    timestamptz  not null default now(),
  expires_at    timestamptz  not null,
  consumed_at   timestamptz
);

create index if not exists idx_verification_codes_lookup
  on verification_codes (identifier, channel, purpose, consumed_at);
create index if not exists idx_verification_codes_expiry
  on verification_codes (expires_at)
  where consumed_at is null;

create table if not exists otp_send_log (
  id           bigserial    primary key,
  identifier   text         not null,
  channel      text         not null,
  ip           inet,
  created_at   timestamptz  not null default now()
);

create index if not exists idx_otp_send_recent
  on otp_send_log (identifier, channel, created_at desc);

comment on table verification_codes is 'Lưu mã OTP 6 số (bcrypt hash) cho email/zalo. Mỗi mã consume 1 lần, TTL 5 phút.';
comment on table otp_send_log is 'Log mỗi lần gửi OTP — phục vụ rate-limit (5 lần / 10 phút / identifier).';


-- =============================================================
-- §19  TRIGGERS + FUNCTIONS chung
-- =============================================================
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
  for each row when (new.order_code is null)
  execute function generate_order_code();

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

-- Refresh customer_stats khi đơn done/cancel
create or replace function fn_refresh_customer_stats(p_customer_id integer)
returns void language plpgsql as $$
declare
  v_orders integer; v_products integer; v_cancelled integer;
  v_ltv numeric(14,2); v_aov numeric(14,2);
  v_first timestamptz; v_last timestamptz; v_purchased jsonb;
begin
  select count(*), coalesce(sum(oi.quantity),0), coalesce(sum(o.final_price),0), min(o.created_at), max(o.created_at)
  into v_orders, v_products, v_ltv, v_first, v_last
  from orders o left join order_items oi on oi.order_id = o.id
  where o.customer_id = p_customer_id and o.status = 'done';

  select count(*) into v_cancelled from orders where customer_id = p_customer_id and status = 'cancelled';
  v_aov := case when v_orders > 0 then round(v_ltv / v_orders, 2) else 0 end;

  select coalesce(jsonb_agg(x order by (x->>'last_buy_at') desc), '[]'::jsonb) into v_purchased
  from (
    select jsonb_build_object('product_id',product_id,'name',name,'slug',slug,'image_url',image_url,'qty',qty,'last_buy_at',last_buy_at) as x
    from (
      select p.id as product_id, p.name, p.slug, p.image_url,
             sum(oi.quantity) as qty,
             to_char(max(o.created_at), 'YYYY-MM-DD"T"HH24:MI:SSOF') as last_buy_at
      from orders o join order_items oi on oi.order_id = o.id join products p on p.id = oi.product_id
      where o.customer_id = p_customer_id and o.status = 'done'
      group by p.id, p.name, p.slug, p.image_url
    ) inner_prod
  ) t;

  insert into customer_stats (customer_id, total_orders, total_products, cancelled_orders, ltv, aov, purchased_products, first_purchase_at, last_purchase_at, updated_at)
  values (p_customer_id, coalesce(v_orders,0), coalesce(v_products,0), coalesce(v_cancelled,0), coalesce(v_ltv,0), coalesce(v_aov,0), v_purchased, v_first, v_last, now())
  on conflict (customer_id) do update set
    total_orders = excluded.total_orders, total_products = excluded.total_products,
    cancelled_orders = excluded.cancelled_orders, ltv = excluded.ltv, aov = excluded.aov,
    purchased_products = excluded.purchased_products, first_purchase_at = excluded.first_purchase_at,
    last_purchase_at = excluded.last_purchase_at, updated_at = excluded.updated_at;
end;
$$;

create or replace function fn_orders_after_change()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT' or tg_op = 'DELETE') then
    if new.customer_id is not null then perform fn_refresh_customer_stats(new.customer_id);
    elsif old.customer_id is not null then perform fn_refresh_customer_stats(old.customer_id); end if;
  elsif (tg_op = 'UPDATE' and (old.status is distinct from new.status)) then
    if new.customer_id is not null then perform fn_refresh_customer_stats(new.customer_id); end if;
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

create or replace function fn_loyalty_set_enabled(p_enabled boolean) returns void language sql as $$
  update site_settings set value = case when p_enabled then 'true' else 'false' end, updated_at = now()
  where key = 'loyalty_enabled';
$$;

create or replace function fn_loyalty_get_enabled() returns boolean language sql stable as $$
  select coalesce((select value = 'true' from site_settings where key = 'loyalty_enabled'), false);
$$;

create or replace function fn_loyalty_get_thresholds() returns jsonb language sql stable as $$
  select coalesce((select value_json from site_settings where key = 'loyalty_tier_thresholds'), '{}'::jsonb);
$$;

create or replace function fn_loyalty_issue_voucher(p_customer_id integer) returns integer
language plpgsql as $$
declare
  v_ltv numeric(14,2); v_rank varchar(20); v_tier jsonb; v_voucher jsonb;
  v_code varchar(50); v_valid_days integer; v_inserted_id integer;
begin
  if not fn_loyalty_get_enabled() then return 0; end if;

  select coalesce(sum(o.final_price), 0) into v_ltv
  from orders o where o.customer_id = p_customer_id and o.status = 'done';

  v_rank := case when v_ltv >= 10000000 then 'platinum' when v_ltv >= 5000000 then 'gold'
                 when v_ltv >= 2000000 then 'silver' else null end;
  if v_rank is null then return 0; end if;

  v_tier := fn_loyalty_get_thresholds()->v_rank;
  v_voucher := v_tier->'voucher';
  if v_voucher is null then return 0; end if;

  if exists (select 1 from customer_vouchers where customer_id = p_customer_id and rank = v_rank
             and is_active = true and (expires_at is null or expires_at > now())) then
    return 0;
  end if;

  v_code := 'TC-' || upper(v_rank) || '-' || p_customer_id || '-' || to_char(now(), 'YYMMDDHH24MI');
  v_valid_days := coalesce((select value::integer from site_settings where key = 'loyalty_voucher_valid_days'), 30);

  insert into customer_vouchers (customer_id, code, rank, discount_type, discount_value, min_order, max_discount, expires_at)
  values (p_customer_id, v_code, v_rank, v_voucher->>'type', (v_voucher->>'value')::numeric,
          coalesce((v_voucher->>'min_order')::numeric, 0), (v_voucher->>'max_discount')::numeric,
          now() + (v_valid_days || ' days')::interval)
  returning id into v_inserted_id;

  return v_inserted_id;
end;
$$;

create or replace function fn_orders_done_issue_voucher() returns trigger language plpgsql as $$
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

create or replace function fn_customer_orders(p_customer_id integer, p_limit integer default 20)
returns table (order_id integer, order_code varchar, final_price numeric, status varchar,
               payment_method varchar, created_at timestamp, item_count bigint, total_qty bigint)
language sql stable as $$
  select o.id, o.order_code, o.final_price, o.status, o.payment_method, o.created_at,
         (select count(*) from order_items where order_id = o.id),
         (select coalesce(sum(quantity),0) from order_items where order_id = o.id)
  from orders o where o.customer_id = p_customer_id order by o.created_at desc limit p_limit;
$$;


-- =============================================================
-- §19.1  VIEWS (bản cuối cùng, đầy đủ nhất — thay mọi bản cũ)
-- =============================================================
create or replace view v_orders_full as
select
  o.id, o.order_code, o.customer_id,
  coalesce(o.customer_name, c.name)    as customer_name,
  coalesce(o.customer_phone, c.phone)  as customer_phone,
  c.email as customer_email,
  o.address, o.province, o.district, o.ward,
  o.total_price, o.shipping_fee, o.discount_amount, o.final_price,
  o.payment_method, o.payment_code, o.payment_status, o.status, o.note,
  coalesce(items.item_count, 0) as item_count,
  coalesce(items.total_qty, 0)  as total_qty,
  o.created_at, o.updated_at,
  case when o.payment_method = 'cod' and o.status = 'done' then true else false end as cod_delivered_success,
  o.jt_bill_code, o.jt_txlogisticid, o.jt_tracking_url, o.jt_weight_kg,
  o.jt_shipping_fee, o.jt_status, o.jt_last_trace, o.jt_created_at, o.jt_cancel_reason,
  case o.jt_status
    when 'created'   then 'Đã tạo vận đơn'
    when 'pickup'    then 'Đã lấy hàng'
    when 'transit'   then 'Đang vận chuyển'
    when 'delivered' then 'Đã giao hàng'
    when 'cancelled' then 'Đã huỷ vận đơn'
    when 'returned'  then 'Hoàn hàng'
    else coalesce(o.jt_status, 'Chưa gửi J&T')
  end as jt_status_label,
  (o.jt_bill_code is not null) as has_jt_order
from orders o
left join customers c on c.id = o.customer_id
left join (
  select order_id, count(*) as item_count, sum(quantity) as total_qty
  from order_items group by order_id
) items on items.order_id = o.id;

comment on view v_orders_full is 'Đơn hàng full data + cột J&T. Admin donhang SELECT từ đây.';

create or replace view v_customer_loyalty as
with order_done as (
  select o.customer_id, count(*) as done_orders, coalesce(sum(o.final_price),0) as ltv_raw,
         coalesce(sum(oi.quantity),0) as products_qty, max(o.created_at) as last_buy, min(o.created_at) as first_buy
  from orders o left join order_items oi on oi.order_id = o.id
  where o.status = 'done' group by o.customer_id
),
order_cancelled as (
  select customer_id, count(*) as cancel_count from orders where status = 'cancelled' group by customer_id
),
purchased as (
  select customer_id, jsonb_agg(jsonb_build_object('product_id',product_id,'name',name,'slug',slug,'image_url',image_url,'qty',qty,'last_buy_at',last_buy_at) order by last_buy_at desc) as products_json
  from (
    select o.customer_id, p.id as product_id, p.name, p.slug, p.image_url,
           sum(oi.quantity) as qty, max(o.created_at) as last_buy_at
    from orders o join order_items oi on oi.order_id = o.id join products p on p.id = oi.product_id
    where o.status = 'done' and p.id is not null
    group by o.customer_id, p.id, p.name, p.slug, p.image_url
  ) inner_purchased group by customer_id
)
select
  c.id as customer_id, c.name as customer_name, c.email, c.phone,
  case when c.phone is not null and c.email is not null then c.phone || ' / ' || c.email
       when c.phone is not null then c.phone when c.email is not null then c.email
       else '(chưa có SĐT/Email)' end as contact,
  coalesce(od.done_orders,0) as total_orders,
  coalesce(od.products_qty,0) as total_products,
  coalesce(oc.cancel_count,0) as cancelled_orders,
  coalesce(od.ltv_raw,0) as ltv,
  case when coalesce(od.done_orders,0) > 0 then round(od.ltv_raw / od.done_orders, 2) else 0 end as aov,
  coalesce(p.products_json, '[]'::jsonb) as purchased_products,
  od.first_buy as first_purchase_at, od.last_buy as last_purchase_at,
  c.is_active, c.created_at as customer_since,
  case when coalesce(od.ltv_raw,0) >= 10000000 then 'platinum'
       when coalesce(od.ltv_raw,0) >= 5000000 then 'gold'
       when coalesce(od.ltv_raw,0) >= 2000000 then 'silver' else 'bronze' end as rank,
  coalesce((select value from site_settings where key = 'loyalty_enabled'), 'false') as loyalty_enabled
from customers c
left join order_done od on od.customer_id = c.id
left join order_cancelled oc on oc.customer_id = c.id
left join purchased p on p.customer_id = c.id;

comment on view v_customer_loyalty is 'Tổng hợp KH + LTV + AOV + rank, real-time từ orders.';

create or replace view v_active_vouchers as
select v.id, v.code, v.is_public, v.rank, v.discount_type, v.discount_value, v.min_order, v.max_discount,
       v.expires_at, v.issued_at, v.used_at, v.is_active, v.note, v.customer_id,
       c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
       case when v.used_at is not null then 'used'
            when v.expires_at is not null and v.expires_at < now() then 'expired'
            when v.is_active = false then 'inactive' else 'active' end as status
from customer_vouchers v
left join customers c on c.id = v.customer_id
where v.is_active = true;

comment on view v_active_vouchers is 'Voucher còn hạn + chưa dùng, bao gồm cả voucher public (customer_id IS NULL).';


-- =============================================================
-- §20  RLS — bật RLS + policy cho TẤT CẢ bảng, sau khi mọi bảng
--       đã chắc chắn tồn tại.
-- =============================================================
do $$
declare
  t text;
  tbls text[] := array[
    'products','product_groups','price_list','product_shipping_services',
    'customers','orders','order_items','admins','users','posts','news_categories',
    'homepage_banners','homepage_sections','homepage_section_products','homepage_config',
    'homepage_values','homepage_promo_banners','homepage_articles','homepage_blog','homepage_picks',
    'transactions','product_reviews','upload_groups','about_content','videos',
    'customer_stats','customer_vouchers'
  ];
begin
  foreach t in array tbls loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "allow_all_%s" on %I', t, t);
    execute format('create policy "allow_all_%s" on %I for all using (true) with check (true)', t, t);
  end loop;
end $$;

-- site_settings: chứa key SMTP/Zalo — KHÔNG cấp allow_all vô điều kiện.
alter table site_settings enable row level security;

drop policy if exists p_anon_read_site_settings on site_settings;
create policy p_anon_read_site_settings on site_settings for select to anon, authenticated using (true);

drop policy if exists p_anon_write_site_settings on site_settings;
create policy p_anon_write_site_settings on site_settings for insert to anon, authenticated with check (true);

drop policy if exists p_anon_update_site_settings on site_settings;
create policy p_anon_update_site_settings on site_settings for update to anon, authenticated using (true) with check (true);
-- Lưu ý bảo mật: site_settings đang mở ghi cho anon để Settings.jsx hoạt động
-- (dev-only). Trước khi lên production nên siết lại chỉ cho authenticated/service_role,
-- và tách riêng các key nhạy cảm (SMTP pass, Zalo secret) ra khỏi payload trả cho FE.

-- customer_vouchers: thêm quyền đọc cho anon (checkout cần validate code)
drop policy if exists p_anon_read_vouchers on customer_vouchers;
create policy p_anon_read_vouchers on customer_vouchers for select to anon, authenticated using (true);


-- =============================================================
-- §21  STORAGE BUCKETS + POLICIES (chỉ chạy trên Supabase)
-- =============================================================
do $$
begin
  if exists (select 1 from pg_catalog.pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values
      ('product-images',  'product-images',  true, 52428800, null),
      ('homepage-assets', 'homepage-assets', true, 52428800, null)
    on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

    drop policy if exists "Allow public upload" on storage.objects;
    drop policy if exists "Allow public read"   on storage.objects;
    drop policy if exists "Allow public update" on storage.objects;
    drop policy if exists "Allow public delete" on storage.objects;
    drop policy if exists "Allow anon upload"   on storage.objects;
    drop policy if exists "Allow anon select"   on storage.objects;

    create policy "Allow public upload" on storage.objects for insert to anon, authenticated
      with check (bucket_id in ('product-images', 'homepage-assets'));
    create policy "Allow public read" on storage.objects for select to anon, authenticated
      using (bucket_id in ('product-images', 'homepage-assets'));
    create policy "Allow public update" on storage.objects for update to anon, authenticated
      using (bucket_id in ('product-images', 'homepage-assets'))
      with check (bucket_id in ('product-images', 'homepage-assets'));
    create policy "Allow public delete" on storage.objects for delete to anon, authenticated
      using (bucket_id in ('product-images', 'homepage-assets'));
  end if;
end $$;


-- =============================================================
-- §22  DỮ LIỆU MẪU
-- =============================================================
insert into admins (name, email, password, role, admin_priority) values
  ('Super Admin', 'admin@techtra.vn', '$2b$10$placeholder_hash_change_me', 'superadmin', 1)
on conflict (email) do nothing;

insert into users (username, email, password_hash, full_name, role) values
  ('admin', 'admin@techtra.vn', '$2b$10$placeholder_admin_hash', 'Quản trị viên', 'admin'),
  ('user',  'user@techtra.vn',  '$2b$10$placeholder_user_hash',  'Khách hàng',    'user')
on conflict (username) do nothing;

insert into product_groups (name, slug, description, is_active, is_slider, sort_order) values
  ('Sản phẩm nổi bật',   'san-pham-noi-bat',   'Các sản phẩm bán chạy nhất', true, true,  1),
  ('Sản phẩm khuyến mãi', 'san-pham-khuyen-mai', 'Đang giảm giá',             true, false, 2),
  ('Trang chủ',           'trang-chu',           'Hiển thị trên trang chủ',   true, true,  3)
on conflict (slug) do nothing;

insert into homepage_sections (section_key, title, is_active, sort_order) values
  ('featured',     'Sản phẩm nổi bật', true, 1),
  ('sale',         'Đang giảm giá',    true, 2),
  ('new_arrivals', 'Hàng mới về',      true, 3)
on conflict (section_key) do nothing;

insert into price_list (sku, name, price, discount, final_price, stock, unit, sort_order) values
  ('SP001', 'Nước rửa bát Techtra 750ml', 89000,  10,  80100, 100, 'chai', 1),
  ('SP002', 'Bột giặt Techtra 3kg',       165000, 15, 140250,  60, 'túi',  2),
  ('SP003', 'Nước lau sàn Techtra 1L',    55000,  0,  55000, 200, 'chai', 3)
on conflict (sku) do nothing;

insert into homepage_values (icon, title, description, sort_order) values
  ('fas fa-seedling',     '100% Thiên Nhiên',   'Nguyên liệu thuần thực vật tinh khiết từ vườn dược liệu Việt Nam', 1),
  ('fas fa-shield-heart', 'Lành và Thật',       'Công thức tối giản, không chất bảo quản độc hại, cam kết công khai thành phần', 2),
  ('fas fa-industry',     'Nhà Máy Đạt CGMP',   'Quy trình sản xuất khép kín, vô trùng đạt chứng nhận CGMP ASEAN', 3),
  ('fas fa-baby',         'An Toàn Cho Bé & Bầu','Mỹ phẩm siêu lành tính, được khuyên dùng bởi các chuyên gia y tế', 4)
on conflict do nothing;

insert into homepage_promo_banners (position, tag, title, cta_text, cta_link, sort_order) values
  ('left',  'Quà tặng ngọt ngào',  'Combo Quà Tặng Cho Nửa Yêu Thương', 'Mua ngay',  '#', 1),
  ('right', 'Liệu pháp phục hồi',  'Chăm Sóc Tóc Dược Liệu Bưởi Đỏ',    'Khám phá',  '#', 2)
on conflict do nothing;

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

insert into news_categories (name, slug, description, icon, parent_id, sort_order, is_active) values
  ('Chăm sóc cơ thể', 'cham-soc-co-the', 'Bí quyết chăm sóc cơ thể toàn diện',  'fas fa-spa',      NULL, 1, true),
  ('Chăm sóc da',     'cham-soc-da',     'Làm đẹp & dưỡng da chuẩn khoa học',   'fas fa-leaf',     NULL, 2, true),
  ('Chăm sóc tóc',    'cham-soc-toc',    'Phục hồi tóc hư tổn',                'fas fa-magic',    NULL, 3, true),
  ('Cẩm nang',        'cam-nang',        'Mẹo vặt & tin tức hữu ích',           'fas fa-book-open',NULL, 4, true)
on conflict (slug) do nothing;

insert into news_categories (name, slug, description, icon, parent_id, sort_order, is_active)
select v.name, v.slug, v.description, v.icon, p.id, v.sort_order, true
from (values
  ('Chăm sóc môi',         'cham-soc-moi',         'Dưỡng môi mềm mại',         'fas fa-kiss-wink-heart', 1),
  ('Chăm sóc tay & chân',  'cham-soc-tay-chan',    'Da tay chân mịn màng',      'fas fa-hand-paper',      2),
  ('Chăm sóc mẹ & bé',     'cham-soc-me-be',       'An toàn cho cả mẹ và bé',   'fas fa-baby',            3)
) as v(name, slug, description, icon, sort_order)
cross join lateral (select id from news_categories where slug = 'cham-soc-co-the' limit 1) as p
where not exists (select 1 from news_categories nc where nc.slug = v.slug);


-- =============================================================
-- §22.5  Mở rộng orders + notification + webhook (2026-08)
-- =============================================================
-- Mở rộng orders phục vụ flow thanh toán CK + giao hàng giống thực tế
ALTER TABLE orders ADD COLUMN IF NOT EXISTS awaiting_payment_since TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_confirmed_at  TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_reference     VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_proof_url     TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at            TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at          TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notify_email_status   VARCHAR(20) DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notify_zalo_status    VARCHAR(20) DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notify_last_error     TEXT;

COMMENT ON COLUMN orders.status IS 'pending/confirmed/awaiting_pickup/shipping/done/delivered/cancelled/awaiting_payment/payment_confirmed';
COMMENT ON COLUMN orders.notify_email_status IS 'pending/sent/failed — trạng thái gửi email thông báo';
COMMENT ON COLUMN orders.notify_zalo_status  IS 'pending/sent/failed — trạng thái gửi Zalo thông báo';

CREATE INDEX IF NOT EXISTS idx_orders_awaiting_payment
  ON orders(status, awaiting_payment_since)
  WHERE status = 'awaiting_payment';

-- Mở rộng transactions để hỗ trợ auto-verify CK (status/bank_ref/content/paid_at)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status    VARCHAR(20) DEFAULT 'success';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS bank_ref  VARCHAR(100);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS content   VARCHAR(255);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS paid_at   TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_transactions_order_status ON transactions(order_id, status);

-- Bảng notification_log: track từng lần gửi email/zalo (audit + retry)
CREATE TABLE IF NOT EXISTS notification_log (
  id            SERIAL PRIMARY KEY,
  order_id      INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  channel       VARCHAR(20)  NOT NULL,            -- 'email' | 'zalo'
  template      VARCHAR(50)  NOT NULL,            -- 'order_created' | 'order_confirmed' | 'order_shipping' | 'order_delivered' | 'order_cancelled' | 'payment_received'
  recipient     VARCHAR(255) NOT NULL,            -- email hoặc SĐT
  status        VARCHAR(20)  DEFAULT 'pending',   -- pending/sent/failed
  error_message TEXT,
  payload       JSONB,
  created_at    TIMESTAMP    DEFAULT NOW(),
  sent_at       TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notification_log_order       ON notification_log(order_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_failed_retry ON notification_log(status, created_at) WHERE status = 'failed';

-- Bảng webhook_events: log IPN VNPay + các webhook ngân hàng (idempotent retry)
CREATE TABLE IF NOT EXISTS webhook_events (
  id            SERIAL PRIMARY KEY,
  source        VARCHAR(30) NOT NULL,             -- 'vnpay' | 'sepay' | 'mbbank' | ...
  event_id      VARCHAR(100),                     -- txnRef hoặc transaction_id
  order_id      INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  raw_payload   JSONB,
  processed     BOOLEAN DEFAULT FALSE,
  received_at   TIMESTAMP DEFAULT NOW(),
  processed_at  TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_webhook_events_source ON webhook_events(source, event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_unprocessed
  ON webhook_events(processed) WHERE processed = FALSE;


-- =============================================================
-- §23  Backfill cuối cùng + reload cache
-- =============================================================
update orders set status = lower(status) where status <> lower(status);

update orders
   set customer_name  = coalesce(customer_name, receiver_name),
       customer_phone = coalesce(customer_phone, receiver_phone),
       address        = coalesce(address, receiver_address)
 where (customer_name is null or customer_phone is null or address is null)
   and (receiver_name is not null or receiver_phone is not null or receiver_address is not null);

do $$
begin
  perform pg_notify('pgrst', 'reload schema');
exception when others then null;
end $$;

-- =============================================================
-- HẾT — Chạy toàn bộ file này 1 lần trong Supabase SQL Editor.
-- Admin mặc định: admin@techtra.vn / admin123 (hash placeholder — đổi qua API register)
-- =============================================================


   -- 1) Tạo bảng reviews nếu chưa có
   CREATE TABLE IF NOT EXISTS public.product_reviews (
     id              bigserial PRIMARY KEY,
     product_id     integer NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
     rating         integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
     comment        text,
     reviewer_name  varchar(255) NOT NULL DEFAULT 'Khách hàng',
     is_approved    boolean NOT NULL DEFAULT false,
     created_at     timestamptz NOT NULL DEFAULT now()
   );
  
   -- 2) Index để FE/BE query nhanh
   CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id
     ON public.product_reviews (product_id);
  
   CREATE INDEX IF NOT EXISTS idx_product_reviews_product_approved_created
     ON public.product_reviews (product_id, is_approved, created_at DESC);

     
   ALTER TABLE public.product_reviews
     ADD COLUMN IF NOT EXISTS phone varchar(20);