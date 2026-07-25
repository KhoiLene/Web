-- =============================================================
-- DATA.sql — Seed dữ liệu “đủ dùng” cho mọi tác vụ web
-- Mục tiêu: shop (homepage/flash-sale/category/blog/articles)
--           + admin (settings/orders/customers/vouchers views)
--
-- Cách chạy: chạy sau khi đã có schema (techtra_*_schema.sql).
-- Script idempotent: INSERT ... ON CONFLICT ... DO UPDATE/NOTHING.
-- =============================================================

BEGIN;

-- -------------------------------
-- 1) site_settings (admin Settings)
-- -------------------------------
INSERT INTO site_settings (key, value, updated_at)
VALUES
  ('jt_config', '{"ship":"J&T","default_service":"EZ","enabled":true}', NOW()),
  ('loyalty_enabled', 'true', NOW())
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = EXCLUDED.updated_at;

-- -------------------------------
-- 2) homepage_config (shop API lấy id=1)
-- -------------------------------
INSERT INTO homepage_config (id, background, hero, sections, flash_sale, updated_at)
VALUES
  (1,
   '{"desktop":"https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=1600&q=60"}',
   '{"title":"Techtra • Trải nghiệm tinh tế","subtitle":"Thiên nhiên • An toàn • Hiệu quả","ctaText":"Khám phá ngay","ctaLink":"/"}',
   '{"featured":true,"sale":true,"new_arrivals":true}',
   '{"enabled":true,"discountRange":[5,25]}'::jsonb,
   NOW())
ON CONFLICT (id) DO UPDATE
SET background = EXCLUDED.background,
    hero = EXCLUDED.hero,
    sections = EXCLUDED.sections,
    flash_sale = EXCLUDED.flash_sale,
    updated_at = EXCLUDED.updated_at;

-- -------------------------------
-- 3) product_groups (slider + categories)
-- -------------------------------
INSERT INTO product_groups (id, name, slug, description, image_url, condition_type, is_active, is_slider, is_sale, sort_order, product_count)
VALUES
  (1001, 'Sản phẩm nổi bật',  'san-pham-noi-bat',  'Các sản phẩm bán chạy nhất',
   'https://images.unsplash.com/photo-1524594164347-5d9f0f1d6a4b?auto=format&fit=crop&w=900&q=60',
   'manual', true, true,  false, 1, 0),
  (1002, 'Sản phẩm khuyến mãi', 'san-pham-khuyen-mai', 'Đang giảm giá hấp dẫn',
   'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=900&q=60',
   'manual', true, false, true, 2, 0),
  (1003, 'Trang chủ', 'trang-chu', 'Nhóm hiển thị trang chủ',
   'https://images.unsplash.com/photo-1556228724-4b0c0f8c2f1f?auto=format&fit=crop&w=900&q=60',
   'manual', true, true, false, 3, 0)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    is_active = EXCLUDED.is_active,
    is_slider = EXCLUDED.is_slider,
    is_sale = EXCLUDED.is_sale,
    sort_order = EXCLUDED.sort_order,
    product_count = EXCLUDED.product_count;

-- -------------------------------
-- 4) products (flash sale)
-- -------------------------------
INSERT INTO products (id, name, slug, description, group_id, category,
                        price, final_price, discount, old_price, stock,
                        sku, weight, weight_unit,
                        images, image_url, video_url, content_file, pdf_name,
                        cod_enabled, shipping_type, status,
                        is_active, is_new,
                        rating, reviews,
                        percent_sold,
                        flash_sale_discount, flash_sale_end_at,
                        created_at, updated_at)
VALUES
  (2001, 'Cà phê rang xay đặc biệt', 'cf-rang-xay-dac-biet', 'Hương đậm • hậu vị mượt', 1001,
   'Cà phê',
   169000, 149000, 12.00, 169000, 120,
   'CF-FS-001', 500, 'g',
   ARRAY['https://images.unsplash.com/photo-1459755486867-b55449bb39ff?auto=format&fit=crop&w=900&q=60'],
   'https://images.unsplash.com/photo-1459755486867-b55449bb39ff?auto=format&fit=crop&w=900&q=60',
   NULL, NULL, NULL,
   true, 'default', 'active',
   true, true,
   4.6, 88,
   72,
   12.00, NOW() + INTERVAL '2 days',
   NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

  (2002, 'Trà thảo mộc thanh lọc', 'tra-thao-moc-thanh-loc', 'Thư giãn • nhẹ nhàng mỗi ngày', 1002,
   'Trà',
   99000, 99000, 0.00, 99000, 200,
   'TR-BS-001', 400, 'g',
   ARRAY['https://images.unsplash.com/photo-1518972559570-7cc1309a7b4d?auto=format&fit=crop&w=900&q=60'],
   'https://images.unsplash.com/photo-1518972559570-7cc1309a7b4d?auto=format&fit=crop&w=900&q=60',
   NULL, NULL, NULL,
   true, 'default', 'active',
   true, false,
   4.4, 63,
   55,
   0.00, NULL,
   NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),

  (2003, 'Combo quà tặng premium', 'combo-qua-tang-premium', 'Sang trọng • phù hợp mọi dịp', 1003,
   'Combo',
   499000, 449000, 10.00, 499000, 50,
   'CB-EXP-001', 1800, 'g',
   ARRAY['https://images.unsplash.com/photo-1514866747592-c2d279258a9f?auto=format&fit=crop&w=900&q=60'],
   'https://images.unsplash.com/photo-1514866747592-c2d279258a9f?auto=format&fit=crop&w=900&q=60',
   NULL, NULL, NULL,
   true, 'default', 'active',
   true, false,
   4.8, 45,
   30,
   10.00, NOW() - INTERVAL '1 day',
   NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),

  (2004, 'Bộ quà Tết Techtra', 'combo-qua-tet-techtra', 'Gói quà premium cho mùa lễ', 1001,
   'Combo',
   699000, 599000, 14.00, 699000, 60,
   'CB-FS-002', 1600, 'g',
   ARRAY['https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?auto=format&fit=crop&w=900&q=60'],
   'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?auto=format&fit=crop&w=900&q=60',
   NULL, NULL, NULL,
   true, 'default', 'active',
   true, true,
   4.7, 52,
   41,
   14.00, NOW() + INTERVAL '4 hours',
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    group_id = EXCLUDED.group_id,
    category = EXCLUDED.category,
    price = EXCLUDED.price,
    final_price = EXCLUDED.final_price,
    discount = EXCLUDED.discount,
    old_price = EXCLUDED.old_price,
    stock = EXCLUDED.stock,
    sku = EXCLUDED.sku,
    weight = EXCLUDED.weight,
    weight_unit = EXCLUDED.weight_unit,
    images = EXCLUDED.images,
    image_url = EXCLUDED.image_url,
    cod_enabled = EXCLUDED.cod_enabled,
    shipping_type = EXCLUDED.shipping_type,
    status = EXCLUDED.status,
    is_active = EXCLUDED.is_active,
    is_new = EXCLUDED.is_new,
    rating = EXCLUDED.rating,
    reviews = EXCLUDED.reviews,
    percent_sold = EXCLUDED.percent_sold,
    flash_sale_discount = EXCLUDED.flash_sale_discount,
    flash_sale_end_at = EXCLUDED.flash_sale_end_at,
    updated_at = EXCLUDED.updated_at;

-- -------------------------------
-- 5) homepage_values
-- -------------------------------
INSERT INTO homepage_values (id, icon, title, description, sort_order, enabled)
VALUES
  (1, 'fas fa-seedling', '100% Thiên Nhiên', 'Nguyên liệu thuần thực vật từ vườn dược liệu Việt Nam', 1, true),
  (2, 'fas fa-shield-heart', 'Lành và Thật', 'Tối giản thành phần, cam kết minh bạch', 2, true),
  (3, 'fas fa-industry', 'Nhà Máy Đạt CGMP', 'Quy trình sản xuất đạt chuẩn', 3, true),
  (4, 'fas fa-baby', 'An Toàn Cho Bé & Bầu', 'Phù hợp cho người nhạy cảm', 4, true)
ON CONFLICT (id) DO UPDATE
SET icon = EXCLUDED.icon,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order,
    enabled = EXCLUDED.enabled;

-- -------------------------------
-- 6) homepage_promo_banners
-- -------------------------------
INSERT INTO homepage_promo_banners (id, position, tag, title, image_url, cta_text, cta_link, sort_order, enabled)
VALUES
  (1, 'left',  'Quà tặng', 'Combo Quà Tặng Cho Nửa Yêu Thương',
   'https://images.unsplash.com/photo-1514866747592-c2d279258a9f?auto=format&fit=crop&w=1200&q=60',
   'Mua ngay', '#', 1, true),
  (2, 'right', 'Phục hồi', 'Chăm Sóc Tóc Dược Liệu',
   'https://images.unsplash.com/photo-1556228724-4b0c0f8c2f1f?auto=format&fit=crop&w=1200&q=60',
   'Khám phá', '#', 2, true)
ON CONFLICT (id) DO UPDATE
SET position = EXCLUDED.position,
    tag = EXCLUDED.tag,
    title = EXCLUDED.title,
    image_url = EXCLUDED.image_url,
    cta_text = EXCLUDED.cta_text,
    cta_link = EXCLUDED.cta_link,
    sort_order = EXCLUDED.sort_order,
    enabled = EXCLUDED.enabled;

-- -------------------------------
-- 7) homepage_blog
-- -------------------------------
INSERT INTO homepage_blog (id, title, description, author, image_url, link, sort_order, enabled)
VALUES
  (1, 'Bí quyết chăm sóc tóc giảm rụng', 'Khám phá quy trình chăm sóc đơn giản nhưng hiệu quả.', 'Techtra Blog',
   'https://images.unsplash.com/photo-1518972559570-7cc1309a7b4d?auto=format&fit=crop&w=900&q=60',
   '/tin-tuc', 1, true),
  (2, 'Bầu Bí Vẫn Xinh Rạng Ngời', 'Chăm da tối giản an toàn cho mọi giai đoạn.', 'Skin Specialist',
   'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=900&q=60',
   '/tin-tuc', 2, true)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    author = EXCLUDED.author,
    image_url = EXCLUDED.image_url,
    link = EXCLUDED.link,
    sort_order = EXCLUDED.sort_order,
    enabled = EXCLUDED.enabled;

-- -------------------------------
-- 8) homepage_articles
-- -------------------------------
INSERT INTO homepage_articles (id, type, title, url, file_url, file_name, file_size, created_at)
VALUES
  (1, 'link', 'Danh mục sản phẩm', '/', NULL, NULL, NULL, NOW() - INTERVAL '2 days'),
  (2, 'file', 'Catalogue PDF', NULL,
   'https://example.com/catalogue.pdf', 'catalogue.pdf', 1234567,
   NOW() - INTERVAL '1 days')
ON CONFLICT (id) DO UPDATE
SET type = EXCLUDED.type,
    title = EXCLUDED.title,
    url = EXCLUDED.url,
    file_url = EXCLUDED.file_url,
    file_name = EXCLUDED.file_name,
    file_size = EXCLUDED.file_size,
    created_at = EXCLUDED.created_at;

-- -------------------------------
-- 9) Admin demo: admins/customers/orders/order_items
-- -------------------------------
INSERT INTO admins (id, name, email, password, role, is_active)
VALUES
  (1, 'Super Admin', 'admin@techtra.vn', '$2b$10$placeholder_hash_change_me', 'superadmin', true),
  (2, 'Content Admin', 'content@techtra.vn', '$2b$10$placeholder_hash_change_me', 'admin', true)
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name,
    password = EXCLUDED.password,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

INSERT INTO customers (id, name, email, phone, password, avatar_url, address, province, district, ward, is_active)
VALUES
  (1, 'Nguyen Van A', 'a.nguyen@demo.vn', '0901000001', '$2b$10$customer_hash_1', NULL, '12 Nguyen Hue', 'TP.HCM', 'Quan 1', 'Ben Nghe', true),
  (2, 'Tran Thi B', 'b.tran@demo.vn', '0901000002', '$2b$10$customer_hash_2', NULL, '99 Le Loi', 'Ha Noi', 'Ba Dinh', 'Dien Bien', true)
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    password = EXCLUDED.password,
    is_active = EXCLUDED.is_active;

INSERT INTO orders (id, order_code, customer_id, customer_name, customer_phone, address, province, district, ward,
                     total_price, shipping_fee, discount_amount, final_price,
                     payment_method, payment_status, status, note, created_at, updated_at)
VALUES
  (3001, 'TC-20260724-0001', 1, 'Nguyen Van A', '0901000001', '12 Nguyen Hue', 'TP.HCM', 'Quan 1', 'Ben Nghe',
   318000, 25000, 0, 343000,
   'cod', 'pending', 'pending', NULL, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '5 hours')
ON CONFLICT (order_code) DO UPDATE
SET customer_id = EXCLUDED.customer_id,
    customer_name = EXCLUDED.customer_name,
    customer_phone = EXCLUDED.customer_phone,
    address = EXCLUDED.address,
    province = EXCLUDED.province,
    district = EXCLUDED.district,
    ward = EXCLUDED.ward,
    total_price = EXCLUDED.total_price,
    shipping_fee = EXCLUDED.shipping_fee,
    discount_amount = EXCLUDED.discount_amount,
    final_price = EXCLUDED.final_price,
    payment_method = EXCLUDED.payment_method,
    payment_status = EXCLUDED.payment_status,
    status = EXCLUDED.status,
    note = EXCLUDED.note,
    updated_at = EXCLUDED.updated_at;

INSERT INTO order_items (id, order_id, product_id, product_name, product_sku, image_url, quantity, unit_price, discount, subtotal)
VALUES
  (4001, 3001, 2001, 'Cà phê rang xay đặc biệt', 'CF-FS-001', NULL, 2, 149000, 12.00, 298000)
ON CONFLICT (id) DO UPDATE
SET order_id = EXCLUDED.order_id,
    product_id = EXCLUDED.product_id,
    product_name = EXCLUDED.product_name,
    product_sku = EXCLUDED.product_sku,
    image_url = EXCLUDED.image_url,
    quantity = EXCLUDED.quantity,
    unit_price = EXCLUDED.unit_price,
    discount