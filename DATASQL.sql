
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


ALTER TABLE products ADD COLUMN content_file TEXT;



ALTER TABLE products
DROP CONSTRAINT products_group_id_fkey;

ALTER TABLE products
ADD CONSTRAINT products_group_id_fkey
FOREIGN KEY (group_id)
REFERENCES product_groups(id)
ON DELETE SET NULL;