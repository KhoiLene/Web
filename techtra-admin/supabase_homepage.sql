-- =============================================================
-- Techtra Shop — Homepage Schema (v4)
-- Chạy trong Supabase SQL Editor. Idempotent (chạy nhiều lần OK).
-- Project: https://pbuqcvlcqrxdammvbwvs.supabase.co
-- =============================================================
-- Slider         ← lấy từ product_groups có cờ is_slider = true
-- Danh mục nổi bật ← lấy TẤT CẢ sản phẩm (không lọc cờ, sắp theo created_at desc)
-- Flash sale      ← lấy TẤT CẢ sản phẩm, hiển thị SP có
--                    flash_sale_discount > 0 (lọc thêm theo flash_sale_end_at)
--                    Giá hiển thị = price * (1 - flash_sale_discount/100)
--                    Hết hạn sẽ tự trả về giá gốc.
-- Promo / Blog / Articles / Values ← bảng riêng
-- homepage_picks  ← chỉ dùng cho Slider (legacy, giữ lại cho tương thích)
-- =============================================================


-- =============================================================
-- 0) Thêm cờ / cột mới vào 2 bảng có sẵn
-- =============================================================
alter table products
  add column if not exists is_featured   boolean default false,
  add column if not exists is_flash_sale boolean default false;

-- Cột mới cho Flash sale 2.0: mỗi SP tự quản lý % giảm và thời điểm kết thúc
alter table products
  add column if not exists flash_sale_discount numeric(5,2) default null, -- % giảm 0-100; null = không tham gia
  add column if not exists flash_sale_end_at   timestamptz default null; -- thời điểm kết thúc, quá thời điểm này sẽ tự trả về giá gốc

alter table product_groups
  add column if not exists is_slider boolean default false;

-- Index để lọc nhanh
create index if not exists idx_products_featured    on products (is_featured)   where is_featured   = true;
create index if not exists idx_products_flash_sale  on products (is_flash_sale) where is_flash_sale = true;
create index if not exists idx_product_groups_slider on product_groups (is_slider) where is_slider = true;
create index if not exists idx_products_flash_sale_discount on products (flash_sale_discount) where flash_sale_discount is not null;
create index if not exists idx_products_flash_sale_end_at   on products (flash_sale_end_at);


-- =============================================================
-- 1) homepage_config  (background + hero + bật/tắt section + flash_sale)
-- =============================================================
create table if not exists homepage_config (
  id int primary key default 1,
  background jsonb not null default '{
    "type": "color",
    "color": "#6a11cb",
    "imageUrl": "",
    "videoUrl": ""
  }'::jsonb,
  hero jsonb not null default '{
    "enabled": true,
    "imageUrl": "",
    "title": "Chào mừng đến với Techtra Shop",
    "subtitle": "Cửa hàng công nghệ — uy tín, chất lượng, giao hàng toàn quốc",
    "ctaText": "Khám phá ngay",
    "ctaLink": "/san-pham"
  }'::jsonb,
  sections jsonb not null default '{
    "heroSlider": true,
    "brandValues": true,
    "categories": true,
    "flashSale": true,
    "bestSellers": true,
    "promoBanners": true,
    "blog": true,
    "newsletter": true
  }'::jsonb,
  flash_sale jsonb not null default '{
    "title": "Giờ Vàng Deal Xịn",
    "countdownSeconds": 10800,
    "enabled": true
  }'::jsonb,
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);

-- Thêm cột flash_sale cho bảng đã tồn tại từ schema cũ (không có cột này)
alter table homepage_config
  add column if not exists flash_sale jsonb not null default '{
    "title": "Giờ Vàng Deal Xịn",
    "countdownSeconds": 10800,
    "enabled": true
  }'::jsonb;

insert into homepage_config (id) values (1) on conflict (id) do nothing;


-- =============================================================
-- 2) homepage_values  (4 thẻ giá trị thương hiệu)
-- =============================================================
create table if not exists homepage_values (
  id uuid primary key default gen_random_uuid(),
  icon text not null default 'fas fa-seedling',
  title text not null,
  desc text,
  sort_order int default 0,
  enabled boolean default true
);


-- =============================================================
-- 3) homepage_promo_banners  (2 banner quảng cáo trái/phải)
-- =============================================================
create table if not exists homepage_promo_banners (
  id uuid primary key default gen_random_uuid(),
  position text not null check (position in ('left', 'right')),
  tag text,
  title text not null,
  image_url text,
  cta_text text default 'Mua ngay',
  cta_link text default '#',
  sort_order int default 0,
  enabled boolean default true
);


-- =============================================================
-- 4) homepage_articles  (bài viết / tài liệu)
-- =============================================================
create table if not exists homepage_articles (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('link', 'file')),
  title text not null,
  url text,
  file_url text,
  file_name text,
  file_size bigint,
  created_at timestamptz default now()
);


-- =============================================================
-- 5) homepage_blog  (góc chia sẻ)
-- =============================================================
create table if not exists homepage_blog (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  desc text,
  author text default 'Admin',
  image_url text,
  link text default '#',
  sort_order int default 0,
  enabled boolean default true,
  created_at timestamptz default now()
);


-- =============================================================
-- 6) homepage_picks  (legacy — hiện chỉ dùng cho kind='slider')
-- Bảng này cho phép admin sắp xếp lại + đổi tiêu đề/ảnh cho slider.
-- Danh mục + Flash sale không dùng bảng này nữa.
-- =============================================================
create table if not exists homepage_picks (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('slider', 'featured', 'flash_sale')),
  target_id text not null,           -- products.id (text/uuid) hoặc product_groups.id
  target_kind text not null check (target_kind in ('product', 'group')),
  custom_title text,                 -- tiêu đề tuỳ chỉnh (ưu tiên hơn title gốc)
  custom_image text,                 -- ảnh tuỳ chỉnh (ưu tiên hơn ảnh gốc)
  sort_order int default 0,
  enabled boolean default true,
  created_at timestamptz default now()
);

create unique index if not exists uq_homepage_picks
  on homepage_picks (kind, target_id);
create index if not exists idx_homepage_picks_kind_order
  on homepage_picks (kind, sort_order);


-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================
alter table homepage_config        enable row level security;
alter table homepage_values        enable row level security;
alter table homepage_promo_banners enable row level security;
alter table homepage_articles      enable row level security;
alter table homepage_blog          enable row level security;
alter table homepage_picks         enable row level security;

-- products + product_groups: giả sử đã bật RLS + có policy anon đọc/ghi
-- Nếu chưa có, bỏ comment 2 dòng dưới:
-- alter table products        enable row level security;
-- alter table product_groups  enable row level security;

drop policy if exists "public read homepage_config"        on homepage_config;
drop policy if exists "public read homepage_values"        on homepage_values;
drop policy if exists "public read homepage_promo_banners" on homepage_promo_banners;
drop policy if exists "public read homepage_articles"      on homepage_articles;
drop policy if exists "public read homepage_blog"          on homepage_blog;
drop policy if exists "public read homepage_picks"         on homepage_picks;

create policy "public read homepage_config"        on homepage_config        for select using (true);
create policy "public read homepage_values"        on homepage_values        for select using (true);
create policy "public read homepage_promo_banners" on homepage_promo_banners for select using (true);
create policy "public read homepage_articles"      on homepage_articles      for select using (true);
create policy "public read homepage_blog"          on homepage_blog          for select using (true);
create policy "public read homepage_picks"         on homepage_picks         for select using (true);

drop policy if exists "anon write homepage_config"        on homepage_config;
drop policy if exists "anon write homepage_values"        on homepage_values;
drop policy if exists "anon write homepage_promo_banners" on homepage_promo_banners;
drop policy if exists "anon write homepage_articles"      on homepage_articles;
drop policy if exists "anon write homepage_blog"          on homepage_blog;
drop policy if exists "anon write homepage_picks"         on homepage_picks;

create policy "anon write homepage_config"        on homepage_config        for all using (true) with check (true);
create policy "anon write homepage_values"        on homepage_values        for all using (true) with check (true);
create policy "anon write homepage_promo_banners" on homepage_promo_banners for all using (true) with check (true);
create policy "anon write homepage_articles"      on homepage_articles      for all using (true) with check (true);
create policy "anon write homepage_blog"          on homepage_blog          for all using (true) with check (true);
create policy "anon write homepage_picks"         on homepage_picks         for all using (true) with check (true);


-- =============================================================
-- DỮ LIỆU MẪU  (chạy lại nhiều lần đều OK nhờ ON CONFLICT)
-- =============================================================
insert into homepage_values (icon, title, desc, sort_order) values
  ('fas fa-seedling',     '100% Thiên Nhiên',   'Nguyên liệu thuần thực vật tinh khiết từ vườn dược liệu Việt Nam', 1),
  ('fas fa-shield-heart', 'Lành và Thật',       'Công thức tối giản, không chất bảo quản độc hại, cam kết công khai thành phần', 2),
  ('fas fa-industry',     'Nhà Máy Đạt CGMP',   'Quy trình sản xuất khép kín, vô trùng đạt chứng nhận CGMP ASEAN', 3),
  ('fas fa-baby',         'An Toàn Cho Bé & Bầu','Mỹ phẩm siêu lành tính, được khuyên dùng bởi các chuyên gia y tế', 4)
on conflict do nothing;

insert into homepage_promo_banners (position, tag, title, cta_text, cta_link, sort_order) values
  ('left',  'Quà tặng ngọt ngào', 'Combo Quà Tặng Cho Nửa Yêu Thương',  'Mua ngay',  '#', 1),
  ('right', 'Liệu pháp phục hồi', 'Chăm Sóc Tóc Dược Liệu Bưởi Đỏ',     'Khám phá',  '#', 2)
on conflict do nothing;

insert into homepage_blog (title, desc, author, sort_order) values
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
-- (Tuỳ chọn) Dọn dẹp picks cũ nếu muốn — mặc định KHÔNG chạy
-- =============================================================
-- Bỏ comment dòng dưới nếu muốn xoá các picks cũ của 'featured' và 'flash_sale':
-- delete from homepage_picks where kind in ('featured', 'flash_sale');


-- =============================================================
-- STORAGE BUCKET
-- Bucket "homepage-assets" cần tạo thủ công trong Supabase Dashboard:
--   Storage → New bucket → Name: homepage-assets → Public bucket = ON
-- =============================================================


-- =============================================================
-- HƯỚNG DẪN SỬ DỤNG
-- =============================================================
-- 1) Slider banner: bật cờ is_slider = true trên product_groups muốn hiển thị.
--    Hoặc thêm vào bảng homepage_picks với kind='slider' để sắp xếp / đổi title ảnh.
--
-- 2) Danh mục nổi bật: tự động lấy TẤT CẢ sản phẩm, sắp theo created_at desc.
--    Không cần cấu hình thêm. ĐÃ BỎ cờ is_featured.
--
-- 3) Flash sale: trong Admin → Flash sale, chỉnh % giảm + thời điểm kết thúc
--    trực tiếp trên từng sản phẩm (2 cột flash_sale_discount, flash_sale_end_at).
--    SP có flash_sale_discount > 0 sẽ tự hiện trên FE.
--    ĐÃ BỎ cờ is_flash_sale + bảng picks.
-- =============================================================
-- 1. Bảng homepage_config đã có cột flash_sale                                                                         select column_name, data_type                                                                                           from information_schema.columns                                                                                         where table_name = 'homepage_config'                                                                                    order by ordinal_position;                                                                                                                                                                                                                      -- 2. Bảng products đã có 2 cột flash sale mới                                                                          select column_name, data_type                                                                                           from information_schema.columns                                                                                         where table_name = 'products'                                                                                             and column_name in ('flash_sale_discount', 'flash_sale_end_at');                                                                                                                                                                              -- 3. Row mặc định đã có                                                                                                select id, flash_sale->>'title' as title from homepage_config where id = 1;  
-- ═══════════════════════════════════════════════════════════════
-- Techtra — Schema cho tính năng Quản lý trang chủ (HomePage.jsx)
-- Chạy toàn bộ file này trong Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1) Cấu hình chung: background, hero, sections, flash sale config
create table if not exists homepage_config (
  id int primary key default 1,
  background jsonb,
  hero jsonb,
  sections jsonb,
  flash_sale jsonb,
  updated_at timestamptz default now()
);

-- Nếu bảng đã tồn tại từ trước nhưng thiếu cột (trường hợp bạn đã tạo bản cũ)
alter table homepage_config add column if not exists sections jsonb;
alter table homepage_config add column if not exists flash_sale jsonb;

-- 2) Bài viết / tài liệu (link ngoài hoặc PDF/Word upload)
create table if not exists homepage_articles (
  id uuid primary key default gen_random_uuid(),
  type text not null,              -- 'link' | 'file'
  title text not null,
  url text,
  file_url text,
  file_name text,
  file_size bigint,
  created_at timestamptz default now()
);

-- 3) 4 thẻ giá trị thương hiệu
create table if not exists homepage_values (
  id uuid primary key default gen_random_uuid(),
  icon text not null default 'fas fa-seedling',
  title text not null,
  desc text,
  sort_order int default 0,
  enabled boolean default true,
  created_at timestamptz default now()
);

-- 4) 2 banner quảng cáo nhỏ (trái/phải)
create table if not exists homepage_promo_banners (
  id uuid primary key default gen_random_uuid(),
  position text not null unique,   -- 'left' | 'right'
  tag text,
  title text not null,
  image_url text,
  cta_text text default 'Mua ngay',
  cta_link text default '#',
  sort_order int default 0,
  enabled boolean default true,
  created_at timestamptz default now()
);

-- 5) Picks — Slider / Danh mục nổi bật / Flash sale
-- Tham chiếu tới product_groups (kind='slider') hoặc products
-- (kind='featured' | 'flash_sale'), không lưu dữ liệu sản phẩm riêng.
create table if not exists homepage_picks (
  id uuid primary key default gen_random_uuid(),
  kind text not null,               -- 'slider' | 'featured' | 'flash_sale'
  target_id text not null,
  target_kind text not null,        -- 'group' | 'product'
  custom_title text,
  custom_image text,
  sort_order int default 0,
  enabled boolean default true,
  created_at timestamptz default now(),
  unique (kind, target_id)           -- bắt buộc để homepagePicksApi.create() upsert đúng
);

-- 6) Blog / góc chia sẻ
create table if not exists homepage_blog (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  desc text,
  author text default 'Admin',
  image_url text,
  link text default '#',
  sort_order int default 0,
  enabled boolean default true,
  created_at timestamptz default now()
);

-- 7) Cột cờ trên products / product_groups (để lọc "được phép thêm vào")
alter table products add column if not exists is_featured boolean default false;
alter table products add column if not exists is_flash_sale boolean default false;
alter table product_groups add column if not exists is_slider boolean default false;

-- ═══════════════════════════════════════════════════════════════
-- 8) Row Level Security — mở quyền đọc/ghi cơ bản (anon key)
-- Nếu bạn ĐÃ tắt RLS toàn dự án thì có thể bỏ qua phần này.
-- Nếu RLS đang bật mà bỏ qua bước này, mọi request sẽ bị chặn âm thầm
-- (không lỗi 404 mà trả về mảng rỗng / permission denied).
-- ═══════════════════════════════════════════════════════════════
alter table homepage_config enable row level security;
alter table homepage_articles enable row level security;
alter table homepage_values enable row level security;
alter table homepage_promo_banners enable row level security;
alter table homepage_picks enable row level security;
alter table homepage_blog enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'homepage_config','homepage_articles','homepage_values',
    'homepage_promo_banners','homepage_picks','homepage_blog'
  ]) loop
    execute format('drop policy if exists "allow_all_%s" on %I', t, t);
    execute format(
      'create policy "allow_all_%s" on %I for all using (true) with check (true)',
      t, t
    );
  end loop;
end $$;

-- =============================================================
-- Techtra Shop — Homepage Schema (v2: dùng cờ trong products / product_groups)
-- Chạy 1 lần trong Supabase SQL Editor.
-- Project: https://pbuqcvlcqrxdammvbwvs.supabase.co
-- =============================================================
-- Slider         ← lấy từ product_groups    có cờ is_slider = true
-- Danh mục nổi bật ← lấy từ products       có cờ is_featured = true
-- Flash sale      ← lấy từ products        có cờ is_flash_sale = true
-- =============================================================


-- =============================================================
-- 0) Thêm cờ vào 2 bảng có sẵn
-- =============================================================
alter table products
  add column if not exists is_featured   boolean default false,
  add column if not exists is_flash_sale boolean default false;

alter table product_groups
  add column if not exists is_slider boolean default false;

-- Index để lọc nhanh
create index if not exists idx_products_featured    on products (is_featured)   where is_featured   = true;
create index if not exists idx_products_flash_sale  on products (is_flash_sale) where is_flash_sale = true;
create index if not exists idx_product_groups_slider on product_groups (is_slider) where is_slider = true;


-- =============================================================
-- 1) homepage_config  (background + hero + bật/tắt section)
-- =============================================================
create table if not exists homepage_config (
  id int primary key default 1,
  background jsonb not null default '{
    "type": "color",
    "color": "#6a11cb",
    "imageUrl": "",
    "videoUrl": ""
  }'::jsonb,
  hero jsonb not null default '{
    "enabled": true,
    "imageUrl": "",
    "title": "Chào mừng đến với Techtra Shop",
    "subtitle": "Cửa hàng công nghệ — uy tín, chất lượng, giao hàng toàn quốc",
    "ctaText": "Khám phá ngay",
    "ctaLink": "/san-pham"
  }'::jsonb,
  sections jsonb not null default '{
    "heroSlider": true,
    "brandValues": true,
    "categories": true,
    "flashSale": true,
    "bestSellers": true,
    "promoBanners": true,
    "blog": true,
    "newsletter": true
  }'::jsonb,
  flash_sale jsonb not null default '{
    "title": "Giờ Vàng Deal Xịn",
    "countdownSeconds": 10800,
    "enabled": true
  }'::jsonb,
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);

insert into homepage_config (id) values (1) on conflict (id) do nothing;


-- =============================================================
-- 2) homepage_values  (4 thẻ giá trị thương hiệu)
-- =============================================================
create table if not exists homepage_values (
  id uuid primary key default gen_random_uuid(),
  icon text not null default 'fas fa-seedling',
  title text not null,
  desc text,
  sort_order int default 0,
  enabled boolean default true
);


-- =============================================================
-- 3) homepage_promo_banners  (2 banner quảng cáo trái/phải)
-- =============================================================
create table if not exists homepage_promo_banners (
  id uuid primary key default gen_random_uuid(),
  position text not null check (position in ('left', 'right')),
  tag text,
  title text not null,
  image_url text,
  cta_text text default 'Mua ngay',
  cta_link text default '#',
  sort_order int default 0,
  enabled boolean default true
);


-- =============================================================
-- 4) homepage_articles  (bài viết / tài liệu)
-- =============================================================
create table if not exists homepage_articles (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('link', 'file')),
  title text not null,
  url text,
  file_url text,
  file_name text,
  file_size bigint,
  created_at timestamptz default now()
);


-- =============================================================
-- 5) homepage_blog  (góc chia sẻ)
-- =============================================================
create table if not exists homepage_blog (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  desc text,
  author text default 'Admin',
  image_url text,
  link text default '#',
  sort_order int default 0,
  enabled boolean default true,
  created_at timestamptz default now()
);


-- =============================================================
-- 6) Lưu thứ tự + sửa tiêu đề hiển thị cho slider / featured / flash sale
-- Bảng này cho phép admin sắp xếp lại và đổi tiêu đề tuỳ ý,
-- đồng thời giữ tham chiếu product_id / group_id.
-- =============================================================
create table if not exists homepage_picks (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('slider', 'featured', 'flash_sale')),
  target_id text not null,           -- products.id (text/uuid) hoặc product_groups.id
  target_kind text not null check (target_kind in ('product', 'group')),
  custom_title text,                 -- tiêu đề tuỳ chỉnh (ưu tiên hơn title gốc)
  custom_image text,                 -- ảnh tuỳ chỉnh (ưu tiên hơn ảnh gốc)
  sort_order int default 0,
  enabled boolean default true,
  created_at timestamptz default now()
);

create unique index if not exists uq_homepage_picks
  on homepage_picks (kind, target_id);
create index if not exists idx_homepage_picks_kind_order
  on homepage_picks (kind, sort_order);


-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================
alter table homepage_config       enable row level security;
alter table homepage_values       enable row level security;
alter table homepage_promo_banners enable row level security;
alter table homepage_articles     enable row level security;
alter table homepage_blog         enable row level security;
alter table homepage_picks        enable row level security;

-- products + product_groups: giả sử đã bật RLS + có policy anon đọc/ghi
-- Nếu chưa có, bỏ comment 2 dòng dưới:
-- alter table products        enable row level security;
-- alter table product_groups  enable row level security;

create policy "public read homepage_config"        on homepage_config        for select using (true);
create policy "public read homepage_values"        on homepage_values        for select using (true);
create policy "public read homepage_promo_banners" on homepage_promo_banners for select using (true);
create policy "public read homepage_articles"      on homepage_articles      for select using (true);
create policy "public read homepage_blog"          on homepage_blog          for select using (true);
create policy "public read homepage_picks"         on homepage_picks         for select using (true);

create policy "anon write homepage_config"        on homepage_config        for all using (true) with check (true);
create policy "anon write homepage_values"        on homepage_values        for all using (true) with check (true);
create policy "anon write homepage_promo_banners" on homepage_promo_banners for all using (true) with check (true);
create policy "anon write homepage_articles"      on homepage_articles      for all using (true) with check (true);
create policy "anon write homepage_blog"          on homepage_blog          for all using (true) with check (true);
create policy "anon write homepage_picks"         on homepage_picks         for all using (true) with check (true);


-- =============================================================
-- DỮ LIỆU MẪU  (bỏ qua nếu muốn bắt đầu rỗng)
-- =============================================================
insert into homepage_values (icon, title, desc, sort_order) values
  ('fas fa-seedling',     '100% Thiên Nhiên',   'Nguyên liệu thuần thực vật tinh khiết từ vườn dược liệu Việt Nam', 1),
  ('fas fa-shield-heart', 'Lành và Thật',       'Công thức tối giản, không chất bảo quản độc hại, cam kết công khai thành phần', 2),
  ('fas fa-industry',     'Nhà Máy Đạt CGMP',   'Quy trình sản xuất khép kín, vô trùng đạt chứng nhận CGMP ASEAN', 3),
  ('fas fa-baby',         'An Toàn Cho Bé & Bầu','Mỹ phẩm siêu lành tính, được khuyên dùng bởi các chuyên gia y tế', 4)
on conflict do nothing;

insert into homepage_promo_banners (position, tag, title, cta_text, cta_link, sort_order) values
  ('left',  'Quà tặng ngọt ngào', 'Combo Quà Tặng Cho Nửa Yêu Thương',  'Mua ngay',  '#', 1),
  ('right', 'Liệu pháp phục hồi', 'Chăm Sóc Tóc Dược Liệu Bưởi Đỏ',     'Khám phá',  '#', 2)
on conflict do nothing;

insert into homepage_blog (title, desc, author, sort_order) values
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
-- STORAGE BUCKET
-- Bucket "homepage-assets" cần tạo thủ công trong Supabase Dashboard:
--   Storage → New bucket → Name: homepage-assets → Public bucket = ON
-- =============================================================


-- =============================================================
-- HƯỚNG DẪN SỬ DỤNG
-- =============================================================
-- 1) Slider banner: Bật cờ is_slider = true trên product_groups muốn hiển thị
--    select id, name, image_url from product_groups where is_slider = true order by sort_order;
--
-- 2) Danh mục nổi bật: Bật cờ is_featured = true trên products
--    select id, name, image_url from products where is_featured = true order by created_at desc;
--
-- 3) Flash sale: Bật cờ is_flash_sale = true trên products
--    select id, name, price, old_price from products where is_flash_sale = true;
--
-- 4) (Tuỳ chọn) Dùng bảng homepage_picks để sắp xếp lại + đổi tiêu đề/ảnh tuỳ ý.
-- =============================================================
ALTER TABLE products
DROP CONSTRAINT products_group_id_fkey;

ALTER TABLE products
ADD CONSTRAINT products_group_id_fkey
FOREIGN KEY (group_id)
REFERENCES product_groups(id)
ON DELETE SET NULL;

ALTER TABLE products ADD COLUMN content_file TEXT;

-- Policy cho phép upload (INSERT)
CREATE POLICY "Allow public upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images');

-- Policy cho phép đọc (SELECT)  
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- 1. Thêm cột images dưới dạng mảng nếu chưa có
ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- 2. Thêm cột shipping_type nếu chưa có
ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_type VARCHAR(20) DEFAULT 'default';

-- 3. Thêm cột status nếu chưa có
ALTER TABLE products ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- 4. Thêm cột is_active nếu chưa có
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 5. Làm mới lại bộ nhớ đệm cache cấu hình của Supabase API
NOTIFY pgrst, 'reload schema';


-- ─── 1. NHÓM SẢN PHẨM (product-groups) ─────────────────────
CREATE TABLE IF NOT EXISTS product_groups (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(255) NOT NULL,
  slug           VARCHAR(255) UNIQUE NOT NULL,
  description    TEXT,
  image_url      TEXT,
  condition_type VARCHAR(20)  DEFAULT 'manual', -- 'manual' | 'automatic'
  is_active      BOOLEAN      DEFAULT TRUE,
  is_sale        BOOLEAN      DEFAULT FALSE,    -- TRUE: hiện ở menu SALE; FALSE: hiện ở menu SẢN PHẨM
  sort_order     INTEGER      DEFAULT 0,
  created_at     TIMESTAMP    DEFAULT NOW(),
  updated_at     TIMESTAMP    DEFAULT NOW()
);

-- Migration: nếu bảng đã tồn tại trước đó, thêm cột is_sale
ALTER TABLE product_groups
  ADD COLUMN IF NOT EXISTS is_sale BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN product_groups.is_sale IS 'TRUE: thuộc menu SALE; FALSE: thuộc menu SẢN PHẨM';


-- ─── 2. SẢN PHẨM (all-products) ─────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255)  NOT NULL,
  slug          VARCHAR(255)  UNIQUE NOT NULL,
  description   TEXT,
  group_id      INTEGER       REFERENCES product_groups(id) ON DELETE SET NULL,
  price         NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount      NUMERIC(5,2)  DEFAULT 0,       -- % giảm
  stock         INTEGER       DEFAULT 0,
  sku           VARCHAR(100)  UNIQUE,
  weight        NUMERIC(10,2) DEFAULT 0,        -- gram hoặc kg
  weight_unit   VARCHAR(5)    DEFAULT 'g',
  height        NUMERIC(8,2)  DEFAULT 0,        -- cm
  width         NUMERIC(8,2)  DEFAULT 0,
  length        NUMERIC(8,2)  DEFAULT 0,
  images        TEXT[]        DEFAULT '{}',     -- mảng URL ảnh
  video_url     TEXT,
  cod_enabled   BOOLEAN       DEFAULT TRUE,
  shipping_type VARCHAR(20)   DEFAULT 'default',
  status        VARCHAR(20)   DEFAULT 'active', -- 'active'|'inactive'|'review'|'deleted'
  is_active     BOOLEAN       DEFAULT TRUE,
  created_at    TIMESTAMP     DEFAULT NOW(),
  updated_at    TIMESTAMP     DEFAULT NOW()
);

-- Dịch vụ vận chuyển J&T theo từng sản phẩm
CREATE TABLE IF NOT EXISTS product_shipping_services (
  id           SERIAL PRIMARY KEY,
  product_id   INTEGER REFERENCES products(id) ON DELETE CASCADE,
  service_code VARCHAR(20)  NOT NULL,  -- 'EZ' | 'FAST' | 'SUPER'
  service_name VARCHAR(100),
  is_active    BOOLEAN DEFAULT TRUE
);


-- ─── 3. KHÁCH HÀNG (all-customers) ───────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255),
  email      VARCHAR(255) UNIQUE,
  phone      VARCHAR(20),
  password   VARCHAR(255),             -- bcrypt hash
  avatar_url TEXT,
  address    TEXT,
  province   VARCHAR(100),
  district   VARCHAR(100),
  ward       VARCHAR(100),
  is_active  BOOLEAN   DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);


-- ─── 4. ĐƠN HÀNG (all-orders) ────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id             SERIAL PRIMARY KEY,
  order_code     VARCHAR(50) UNIQUE,            -- Mã đơn: TC-20240001
  customer_id    INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  customer_name  VARCHAR(255),                  -- Snapshot tên KH lúc đặt
  customer_phone VARCHAR(20),
  address        TEXT,
  province       VARCHAR(100),
  district       VARCHAR(100),
  ward           VARCHAR(100),
  total_price    NUMERIC(12,2) DEFAULT 0,
  shipping_fee   NUMERIC(10,2) DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  final_price    NUMERIC(12,2) DEFAULT 0,       -- total - discount + ship
  payment_method VARCHAR(50)  DEFAULT 'cod',    -- 'cod' | 'vnpay' | 'momo'
  payment_status VARCHAR(20)  DEFAULT 'pending',-- 'pending'|'paid'|'failed'
  status         VARCHAR(30)  DEFAULT 'pending',-- 'pending'|'confirmed'|'shipping'|'done'|'cancelled'
  note           TEXT,
  created_at     TIMESTAMP    DEFAULT NOW(),
  updated_at     TIMESTAMP    DEFAULT NOW()
);

-- Chi tiết từng sản phẩm trong đơn hàng
CREATE TABLE IF NOT EXISTS order_items (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER       REFERENCES orders(id) ON DELETE CASCADE,
  product_id  INTEGER       REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255),                    -- Snapshot tên SP lúc đặt
  product_sku  VARCHAR(100),
  image_url    TEXT,
  quantity     INTEGER       NOT NULL DEFAULT 1,
  unit_price   NUMERIC(12,2) NOT NULL,
  discount     NUMERIC(5,2)  DEFAULT 0,
  subtotal     NUMERIC(12,2) NOT NULL
);

-- Tự sinh mã đơn hàng TC-YYYYMMDD-XXXX
CREATE OR REPLACE FUNCTION generate_order_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_code := 'TC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEW.id::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_code
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.order_code IS NULL)
  EXECUTE FUNCTION generate_order_code();


-- ─── 5. ADMIN (đăng nhập /admin) ─────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255),
  email      VARCHAR(255) UNIQUE NOT NULL,
  password   VARCHAR(255) NOT NULL,             -- bcrypt hash
  role       VARCHAR(20)  DEFAULT 'admin',      -- 'superadmin' | 'admin'
  is_active  BOOLEAN      DEFAULT TRUE,
  created_at TIMESTAMP    DEFAULT NOW()
);


-- ─── 6. BÀI VIẾT / NỘI DUNG (post-content) ──────────────────
CREATE TABLE IF NOT EXISTS posts (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(500) NOT NULL,
  slug        VARCHAR(500) UNIQUE NOT NULL,
  content     TEXT,
  thumbnail   TEXT,
  status      VARCHAR(20)  DEFAULT 'draft',     -- 'draft' | 'published'
  author_id   INTEGER      REFERENCES admins(id) ON DELETE SET NULL,
  published_at TIMESTAMP,
  created_at  TIMESTAMP    DEFAULT NOW(),
  updated_at  TIMESTAMP    DEFAULT NOW()
);


-- ─── 7. TRANG CHỦ (manage-home) ──────────────────────────────
CREATE TABLE IF NOT EXISTS homepage_banners (
  id         SERIAL PRIMARY KEY,
  title      VARCHAR(255),
  image_url  TEXT NOT NULL,
  link_url   TEXT,
  sort_order INTEGER  DEFAULT 0,
  is_active  BOOLEAN  DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS homepage_sections (
  id          SERIAL PRIMARY KEY,
  section_key VARCHAR(50) UNIQUE NOT NULL, -- 'featured', 'sale', 'new_arrivals'
  title       VARCHAR(255),
  is_active   BOOLEAN  DEFAULT TRUE,
  sort_order  INTEGER  DEFAULT 0
);

-- Sản phẩm thuộc từng section trang chủ
CREATE TABLE IF NOT EXISTS homepage_section_products (
  id         SERIAL PRIMARY KEY,
  section_id INTEGER REFERENCES homepage_sections(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0
);


-- ─── 8. SỔ QUỸ / DOANH THU (dashboard) ──────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  type        VARCHAR(20)   NOT NULL,           -- 'income' | 'expense' | 'refund'
  amount      NUMERIC(12,2) NOT NULL,
  description TEXT,
  created_at  TIMESTAMP     DEFAULT NOW()
);


-- ─── AUTO UPDATE updated_at ───────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_product_groups_upd  BEFORE UPDATE ON product_groups  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_upd        BEFORE UPDATE ON products         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_customers_upd       BEFORE UPDATE ON customers        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_upd          BEFORE UPDATE ON orders           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_posts_upd           BEFORE UPDATE ON posts            FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─── DỮ LIỆU MẪU ─────────────────────────────────────────────

-- Admin mặc định (password: admin123 — đổi ngay sau khi chạy)
INSERT INTO admins (name, email, password, role) VALUES
  ('Super Admin', 'admin@techtra.vn', '$2b$10$placeholder_hash_change_me', 'superadmin')
ON CONFLICT (email) DO NOTHING;

-- Nhóm sản phẩm mẫu
INSERT INTO product_groups (name, slug, description, is_active, sort_order) VALUES
  ('Sản phẩm nổi bật',  'san-pham-noi-bat',  'Các sản phẩm bán chạy nhất', TRUE, 1),
  ('Sản phẩm khuyến mãi','san-pham-khuyen-mai','Đang giảm giá',             TRUE, 2),
  ('Trang chủ',          'trang-chu',          'Hiển thị trên trang chủ',   TRUE, 3)
ON CONFLICT (slug) DO NOTHING;

-- Section trang chủ mẫu
INSERT INTO homepage_sections (section_key, title, is_active, sort_order) VALUES
  ('featured',    'Sản phẩm nổi bật', TRUE, 1),
  ('sale',        'Đang giảm giá',    TRUE, 2),
  ('new_arrivals','Hàng mới về',      TRUE, 3)
ON CONFLICT (section_key) DO NOTHING;
