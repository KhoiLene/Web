-- =============================================================
-- TECHTRA FULL DATA FOR WEB
-- File: techtra_full_data_for_web.sql
-- Mục tiêu: Seed đầy đủ dữ liệu cho các tác vụ web (admin + shop)
-- Tương thích: PostgreSQL / Supabase
-- Ghi chú:
--  - Script ưu tiên idempotent (ON CONFLICT, UPDATE theo id)
--  - Giả định schema chính đã tồn tại (products, product_groups, homepage_*, ...)
-- =============================================================

BEGIN;

-- =============================================================
-- 0) TABLE BỔ SUNG (nếu chưa có)
-- =============================================================

CREATE TABLE IF NOT EXISTS product_reviews (
  id            BIGSERIAL PRIMARY KEY,
  product_id    BIGINT       NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rating        INTEGER      NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  reviewer_name VARCHAR(120) DEFAULT 'Khách hàng',
  is_approved   BOOLEAN      DEFAULT TRUE,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product
  ON product_reviews (product_id, created_at DESC);

CREATE TABLE IF NOT EXISTS orders (
  id              SERIAL PRIMARY KEY,
  order_code      VARCHAR(50) UNIQUE,
  customer_id     INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  customer_name   VARCHAR(255),
  customer_phone  VARCHAR(20),
  address         TEXT,
  province        VARCHAR(100),
  district        VARCHAR(100),
  ward            VARCHAR(100),
  total_price     NUMERIC(12,2) DEFAULT 0,
  shipping_fee    NUMERIC(10,2) DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  final_price     NUMERIC(12,2) DEFAULT 0,
  payment_method  VARCHAR(50)  DEFAULT 'cod',
  payment_status  VARCHAR(20)  DEFAULT 'pending',
  status          VARCHAR(30)  DEFAULT 'pending',
  note            TEXT,
  created_at      TIMESTAMP    DEFAULT NOW(),
  updated_at      TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id           SERIAL PRIMARY KEY,
  order_id     INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id   INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255),
  product_sku  VARCHAR(100),
  image_url    TEXT,
  quantity     INTEGER       NOT NULL DEFAULT 1,
  unit_price   NUMERIC(12,2) NOT NULL,
  discount     NUMERIC(5,2)  DEFAULT 0,
  subtotal     NUMERIC(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  type        VARCHAR(20)   NOT NULL,
  amount      NUMERIC(12,2) NOT NULL,
  description TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- =============================================================
-- 1) ADMINS / CUSTOMERS
-- =============================================================

INSERT INTO admins (id, name, email, password, role, is_active)
VALUES
  (1, 'Super Admin', 'admin@techtra.vn', '$2b$10$placeholder_hash_change_me', 'superadmin', TRUE),
  (2, 'Content Admin', 'content@techtra.vn', '$2b$10$placeholder_hash_change_me', 'admin', TRUE)
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

INSERT INTO customers (id, name, email, phone, password, avatar_url, address, province, district, ward, is_active)
VALUES
  (1, 'Nguyen Van A', 'a.nguyen@demo.vn', '0901000001', '$2b$10$customer_hash_1', NULL, '12 Nguyen Hue', 'TP.HCM', 'Quan 1', 'Ben Nghe', TRUE),
  (2, 'Tran Thi B', 'b.tran@demo.vn', '0901000002', '$2b$10$customer_hash_2', NULL, '99 Le Loi', 'Ha Noi', 'Ba Dinh', 'Dien Bien', TRUE),
  (3, 'Le Van C', 'c.le@demo.vn', '0901000003', '$2b$10$customer_hash_3', NULL, '45 Hai Ba Trung', 'Da Nang', 'Hai Chau', 'Thach Thang', TRUE)
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    is_active = EXCLUDED.is_active;

-- =============================================================
-- 2) PRODUCT GROUPS
-- =============================================================

INSERT INTO product_groups (id, name, slug, description, image_url, condition_type, is_active, is_sale, sort_order)
VALUES
  (1, 'Cà phê rang xay', 'ca-phe-rang-xay', 'Nhóm cà phê rang mộc nguyên chất', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93', 'manual', TRUE, FALSE, 1),
  (2, 'Trà thảo mộc', 'tra-thao-moc', 'Nhóm trà chăm sóc sức khỏe', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085', 'manual', TRUE, FALSE, 2),
  (3, 'Combo quà tặng', 'combo-qua-tang', 'Combo làm quà tặng dịp lễ', 'https://images.unsplash.com/photo-1514866747592-c2d279258a9f', 'manual', TRUE, FALSE, 3),
  (4, 'Flash Sale', 'flash-sale', 'Sản phẩm đang giảm giá sốc', 'https://images.unsplash.com/photo-1521017432531-fbd92d768814', 'manual', TRUE, TRUE, 4),
  (5, 'Best Seller', 'best-seller', 'Các sản phẩm bán chạy nhất', 'https://images.unsplash.com/photo-1498804103079-a6351b050096', 'manual', TRUE, FALSE, 5)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    is_active = EXCLUDED.is_active,
    is_sale = EXCLUDED.is_sale,
    sort_order = EXCLUDED.sort_order;

-- Cờ hiển thị slider (nếu schema có cột is_slider)
ALTER TABLE product_groups ADD COLUMN IF NOT EXISTS is_slider BOOLEAN DEFAULT FALSE;
UPDATE product_groups
SET is_slider = CASE WHEN slug IN ('ca-phe-rang-xay', 'tra-thao-moc', 'combo-qua-tang') THEN TRUE ELSE FALSE END
WHERE slug IN ('ca-phe-rang-xay', 'tra-thao-moc', 'combo-qua-tang', 'flash-sale', 'best-seller');

-- =============================================================
-- 3) PRODUCTS
-- =============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS old_price NUMERIC(12,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 5;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reviews INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS percent_sold INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS flash_sale_discount NUMERIC(5,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS flash_sale_end_at TIMESTAMPTZ;

INSERT INTO products (
  id, name, slug, description, group_id, category,
  price, old_price, discount, stock, sku,
  weight, weight_unit, height, width, length,
  images, image_url, video_url,
  cod_enabled, shipping_type, status, is_active,
  rating, reviews, is_new, percent_sold,
  flash_sale_discount, flash_sale_end_at
)
VALUES
  (1, 'Cà phê Arabica Đà Lạt 500g', 'ca-phe-arabica-da-lat-500g', 'Hạt Arabica rang mộc, hậu vị chua thanh.', 1, 'Cà phê', 185000, 215000, 14.00, 120, 'CF-ARA-500', 500, 'g', 20, 8, 6, ARRAY['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085'], 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085', NULL, TRUE, 'default', 'active', TRUE, 4.80, 124, TRUE, 72, 18.00, NOW() + INTERVAL '3 days'),
  (2, 'Cà phê Robusta Buôn Ma Thuột 1kg', 'ca-phe-robusta-bmt-1kg', 'Robusta đậm vị, phù hợp pha phin truyền thống.', 1, 'Cà phê', 239000, 279000, 10.00, 80, 'CF-ROB-1KG', 1000, 'g', 24, 10, 8, ARRAY['https://images.unsplash.com/photo-1509042239860-f550ce710b93'], 'https://images.unsplash.com/photo-1509042239860-f550ce710b93', NULL, TRUE, 'default', 'active', TRUE, 4.70, 96, FALSE, 64, 12.00, NOW() + INTERVAL '1 day'),
  (3, 'Trà hoa cúc mật ong 200g', 'tra-hoa-cuc-mat-ong-200g', 'Trà dịu nhẹ, thanh mát, phù hợp buổi tối.', 2, 'Trà', 129000, 149000, 8.00, 200, 'TR-HC-200', 200, 'g', 15, 7, 4, ARRAY['https://images.unsplash.com/photo-1464306076886-da185f6a9d05'], 'https://images.unsplash.com/photo-1464306076886-da185f6a9d05', NULL, TRUE, 'default', 'active', TRUE, 4.90, 221, TRUE, 80, 20.00, NOW() + INTERVAL '5 days'),
  (4, 'Trà gừng sả 250g', 'tra-gung-sa-250g', 'Giữ ấm cơ thể, thơm mùi sả tự nhiên.', 2, 'Trà', 115000, 139000, 7.00, 150, 'TR-GS-250', 250, 'g', 16, 7, 4, ARRAY['https://images.unsplash.com/photo-1515823662972-da6a2e4d3002'], 'https://images.unsplash.com/photo-1515823662972-da6a2e4d3002', NULL, TRUE, 'default', 'active', TRUE, 4.60, 88, FALSE, 58, 0.00, NULL),
  (5, 'Combo quà Tết Techtra', 'combo-qua-tet-techtra', 'Gồm 3 sản phẩm premium đóng gói quà.', 3, 'Combo', 499000, 599000, 16.00, 40, 'CB-TET-001', 1800, 'g', 30, 25, 12, ARRAY['https://images.unsplash.com/photo-1514866747592-c2d279258a9f'], 'https://images.unsplash.com/photo-1514866747592-c2d279258a9f', NULL, TRUE, 'default', 'active', TRUE, 4.95, 45, TRUE, 52, 22.00, NOW() + INTERVAL '2 days'),
  (6, 'Gift Box Premium', 'gift-box-premium', 'Set quà tặng doanh nghiệp.', 3, 'Combo', 799000, 890000, 10.00, 25, 'CB-PRM-001', 2200, 'g', 35, 28, 14, ARRAY['https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9'], 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9', NULL, TRUE, 'default', 'active', TRUE, 4.85, 37, FALSE, 41, 15.00, NOW() + INTERVAL '6 hours'),
  (7, 'Cold Brew Bottle 500ml', 'cold-brew-bottle-500ml', 'Cà phê ủ lạnh tiện lợi.', 5, 'Cà phê', 69000, 79000, 6.00, 300, 'CF-CB-500', 500, 'ml', 20, 7, 7, ARRAY['https://images.unsplash.com/photo-1461023058943-07fcbe16d735'], 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735', NULL, TRUE, 'default', 'active', TRUE, 4.40, 63, TRUE, 67, 0.00, NULL),
  (8, 'Trà detox bạc hà', 'tra-detox-bac-ha', 'Hỗ trợ thanh lọc cơ thể.', 2, 'Trà', 99000, 119000, 5.00, 175, 'TR-DTX-001', 180, 'g', 14, 6, 4, ARRAY['https://images.unsplash.com/photo-1507914464562-6ff4ac29692f'], 'https://images.unsplash.com/photo-1507914464562-6ff4ac29692f', NULL, TRUE, 'default', 'active', TRUE, 4.55, 71, FALSE, 49, 10.00, NOW() - INTERVAL '1 day')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    group_id = EXCLUDED.group_id,
    category = EXCLUDED.category,
    price = EXCLUDED.price,
    old_price = EXCLUDED.old_price,
    discount = EXCLUDED.discount,
    stock = EXCLUDED.stock,
    sku = EXCLUDED.sku,
    images = EXCLUDED.images,
    image_url = EXCLUDED.image_url,
    cod_enabled = EXCLUDED.cod_enabled,
    shipping_type = EXCLUDED.shipping_type,
    status = EXCLUDED.status,
    is_active = EXCLUDED.is_active,
    rating = EXCLUDED.rating,
    reviews = EXCLUDED.reviews,
    is_new = EXCLUDED.is_new,
    percent_sold = EXCLUDED.percent_sold,
    flash_sale_discount = EXCLUDED.flash_sale_discount,
    flash_sale_end_at = EXCLUDED.flash_sale_end_at;

-- Dịch vụ vận chuyển mẫu
CREATE TABLE IF NOT EXISTS product_shipping_services (
  id           SERIAL PRIMARY KEY,
  product_id   INTEGER REFERENCES products(id) ON DELETE CASCADE,
  service_code VARCHAR(20) NOT NULL,
  service_name VARCHAR(100),
  is_active    BOOLEAN DEFAULT TRUE
);

INSERT INTO product_shipping_services (product_id, service_code, service_name, is_active)
VALUES
  (1, 'EZ', 'J&T EZ', TRUE),
  (1, 'FAST', 'J&T FAST', TRUE),
  (2, 'EZ', 'J&T EZ', TRUE),
  (3, 'EZ', 'J&T EZ', TRUE),
  (5, 'SUPER', 'J&T SUPER', TRUE)
ON CONFLICT DO NOTHING;

-- =============================================================
-- 4) HOMEPAGE DATA
-- =============================================================

CREATE TABLE IF NOT EXISTS homepage_config (
  id         INTEGER PRIMARY KEY,
  background JSONB,
  hero       JSONB,
  sections   JSONB,
  flash_sale JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS homepage_values (
  id          SERIAL PRIMARY KEY,
  icon        VARCHAR(100),
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order  INTEGER DEFAULT 0,
  enabled     BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS homepage_promo_banners (
  id          SERIAL PRIMARY KEY,
  position    VARCHAR(20),
  tag         VARCHAR(120),
  title       VARCHAR(255),
  image_url   TEXT,
  cta_text    VARCHAR(100),
  cta_link    TEXT,
  sort_order  INTEGER DEFAULT 0,
  enabled     BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS homepage_blog (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  author      VARCHAR(120),
  image_url   TEXT,
  link        TEXT,
  sort_order  INTEGER DEFAULT 0,
  enabled     BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS homepage_articles (
  id         SERIAL PRIMARY KEY,
  type       VARCHAR(30) DEFAULT 'link',
  title      VARCHAR(255) NOT NULL,
  url        TEXT,
  file_url   TEXT,
  file_name  VARCHAR(255),
  file_size  BIGINT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS homepage_picks (
  id           SERIAL PRIMARY KEY,
  kind         VARCHAR(30) NOT NULL