-- =============================================================
-- EXTRA SEED DATA FOR FULL WEB DEMO
-- =============================================================

-- Ensure is_sale column exists on product_groups
alter table product_groups add column if not exists is_sale boolean default false;

-- Ensure product_variants table exists
CREATE TABLE IF NOT EXISTS product_variants (
  id          serial primary key,
  product_id  integer       references products(id) on delete cascade,
  sku         varchar(100)  unique not null,
  name        varchar(255)  not null,
  price       numeric(12,2) not null default 0,
  stock       integer       default 0,
  is_active   boolean       default true,
  created_at  timestamp     default now(),
  updated_at  timestamp     default now()
);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);

-- Admins + users
insert into admins (name, email, password, role, admin_priority)
values ('Super Admin', 'admin@techtra.vn', '$2a$10$placeholder', 'superadmin', 100)
on conflict (email) do update set name = excluded.name, role = excluded.role, admin_priority = excluded.admin_priority, is_active = excluded.is_active;

insert into users (username, email, password_hash, full_name, phone, role)
values
  ('user1', 'a.nguyen@demo.vn', '$2a$10$placeholder', 'Nguyen Van A', '0901000001', 'user'),
  ('user2', 'b.tran@demo.vn',  '$2a$10$placeholder', 'Tran Thi B',   '0901000002', 'user'),
  ('user3', 'c.le@demo.vn',    '$2a$10$placeholder', 'Le Van C',     '0901000003', 'user')
on conflict (email) do update set username = excluded.username, full_name = excluded.full_name, phone = excluded.phone, is_active = excluded.is_active;

-- Customers
insert into customers (name, email, phone, password, address, province, district, ward, is_active)
values
  ('Nguyen Van A', 'a.nguyen@demo.vn', '0901000001', '$2a$10$placeholder', '12 Nguyen Hue', 'TP.HCM', 'Quan 1', 'Ben Nghe', true),
  ('Tran Thi B',   'b.tran@demo.vn',   '0901000002', '$2a$10$placeholder', '99 Le Loi',     'Ha Noi', 'Ba Dinh', 'Dien Bien', true),
  ('Le Van C',     'c.le@demo.vn',     '0901000003', '$2a$10$placeholder', '45 Hai Ba Trung', 'Da Nang', 'Hai Chau', 'Thach Thang', true)
on conflict (email) do update set name = excluded.name, phone = excluded.phone, address = excluded.address, province = excluded.province, district = excluded.district, ward = excluded.ward, is_active = excluded.is_active;

-- Product groups (cha + con)
insert into product_groups (name, slug, description, image_url, condition_type, is_active, is_sale, is_slider, sort_order, parent_id, slider_text, intro_title, intro_subtitle, intro_image_url)
values
  ('Cà phê rang xay', 'ca-phe-rang-xay', 'Nhóm cà phê rang mộc nguyên chất', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=60', 'manual', true, false, true, 1, null, 'Khám phá vị cà phê đích thực', 'Cà phê rang xay', 'Hương vị nguyên bản từ vùng đất cao', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=60'),
  ('Trà thảo mộc', 'tra-thao-moc', 'Nhóm trà chăm sóc sức khỏe', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=60', 'manual', true, false, true, 2, null, 'Thanh lọc cơ thể mỗi ngày', 'Trà thảo mộc', 'Tinh hoa thiên nhiên trong từng tách trà', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=60'),
  ('Combo quà tặng', 'combo-qua-tang', 'Combo làm quà tặng dịp lễ', 'https://images.unsplash.com/photo-1514866747592-c2d279258a9f?auto=format&fit=crop&w=900&q=60', 'manual', true, false, true, 3, null, 'Gửi trao yêu thương', 'Combo quà tặng', 'Set quà tinh tế cho ngườ` + `i thân yêu', 'https://images.unsplash.com/photo-1514866747592-c2d279258a9f?auto=format&fit=crop&w=1200&q=60'),
  ('Flash Sale', 'flash-sale', 'Sản phẩm đang giảm giá sốc', 'https://images.unsplash.com/photo-1521017432531-f550ce710b93?auto=format&fit=crop&w=900&q=60', 'manual', true, true, false, 4, null, null, null, null, null),
  ('Best Seller', 'best-seller', 'Các sản phẩm bán chạy nhất', 'https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=900&q=60', 'manual', true, false, false, 5, null, null, null, null, null)
on conflict (slug) do update set name = excluded.name, description = excluded.description, image_url = excluded.image_url, is_active = excluded.is_active, is_slider = excluded.is_slider, is_sale = excluded.is_sale, sort_order = excluded.sort_order, parent_id = excluded.parent_id, slider_text = excluded.slider_text, intro_title = excluded.intro_title, intro_subtitle = excluded.intro_subtitle, intro_image_url = excluded.intro_image_url;

-- Child groups
insert into product_groups (name, slug, description, image_url, condition_type, is_active, is_sale, is_slider, sort_order, parent_id)
select v.name, v.slug, v.description, v.image_url, 'manual', true, false, false, v.sort_order, p.id
from (values
  ('Cà phê Arabica', 'ca-phe-arabica', 'Cà phê Arabica cao cấp', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=60', 1),
  ('Cà phê Robusta', 'ca-phe-robusta', 'Cà phê Robusta đậm đà', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=60', 2),
  ('Trà hoa cúc', 'tra-hoa-cuc', 'Trà hoa cúc dịu nhẹ', 'https://images.unsplash.com/photo-1464306076886-da185f6a9d05?auto=format&fit=crop&w=900&q=60', 1),
  ('Trà gừng sả', 'tra-gung-sa', 'Trà gừng sả giữ ấm', 'https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?auto=format&fit=crop&w=900&q=60', 2),
  ('Set quà tết', 'set-qua-tet', 'Set quà biếu tết', 'https://images.unsplash.com/photo-1514866747592-c2d279258a9f?auto=format&fit=crop&w=900&q=60', 1)
) as v(name, slug, description, image_url, sort_order)
cross join lateral (select id from product_groups where slug = 'ca-phe-rang-xay' and parent_id is null limit 1) p
where not exists (select 1 from product_groups g where g.slug = v.slug);

-- Products
insert into products (name, slug, description, group_id, category, price, final_price, discount, old_price, stock, sku, weight, images, image_url, cod_enabled, shipping_type, status, is_active, is_new, rating, reviews, flash_sale_discount, flash_sale_end_at)
select v.name, v.slug, v.description, g.id, v.category, v.price, v.final_price, v.discount, v.old_price, v.stock, v.sku, v.weight, v.images, v.image_url, true, 'default', 'active', true, v.is_new, v.rating, v.reviews, v.flash_sale_discount, v.flash_sale_end_at
from (values
  ('Cà phê Arabica Đà Lạt 500g', 'ca-phe-arabica-da-lat-500g', 'Hạt Arabica chọn lọc từ vùng đất cao Đà Lạt.', 'ca-phe-arabica', 'Cà phê', 185000, 166500, 10, 200000, 120, 'CF-ARA-500', 500, array['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=60']::text[], 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=60', true, 4.8, 0, 10, now() + interval '7 days'),
  ('Cà phê Robusta Buôn Ma Thuột 500g', 'ca-phe-robusta-buon-ma-thuot-500g', 'Robusta đậm đà, caffeine cao.', 'ca-phe-robusta', 'Cà phê', 145000, 130500, 10, 160000, 200, 'CF-ROB-500', 500, array['https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=60']::text[], 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=60', false, 4.5, 0, 0, null),
  ('Trà hoa cúc mật ong 250g', 'tra-hoa-cuc-mat-ong-250g', 'Hoa cúc kết hợp mật ong nguyên chất.', 'tra-hoa-cuc', 'Trà', 115000, 103500, 10, 130000, 80, 'TR-HC-250', 250, array['https://images.unsplash.com/photo-1464306076886-da185f6a9d05?auto=format&fit=crop&w=900&q=60']::text[], 'https://images.unsplash.com/photo-1464306076886-da185f6a9d05?auto=format&fit=crop&w=900&q=60', true, 4.9, 0, 15, now() + interval '3 days'),
  ('Trà gừng sả ấm áp 250g', 'tra-gung-sa-am-ap-250g', 'Gừng tươi và sả thơm, giữ ấm cơ thể.', 'tra-gung-sa', 'Trà', 95000, 85500, 10, 110000, 95, 'TR-GS-250', 250, array['https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?auto=format&fit=crop&w=900&q=60']::text[], 'https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?auto=format&fit=crop&w=900&q=60', true, 4.6, 0, 0, null),
  ('Set quà tết Cà phê + Trà cao cấp', 'set-qua-tet-ca-phe-tra', 'Bộ quà tết gồm cà phê Arabica, trà hoa cúc, hộp thiếc sang trọng.', 'set-qua-tet', 'Combo', 450000, 382500, 15, 520000, 40, 'SET-TET-01', 1200, array['https://images.unsplash.com/photo-1514866747592-c2d279258a9f?auto=format&fit=crop&w=900&q=60']::text[], 'https://images.unsplash.com/photo-1514866747592-c2d279258a9f?auto=format&fit=crop&w=900&q=60', false, 4.7, 0, 20, now() + interval '5 days')
) as v(name, slug, description, group_slug, category, price, final_price, discount, old_price, stock, sku, weight, images, image_url, is_new, rating, reviews, flash_sale_discount, flash_sale_end_at)
join product_groups g on g.slug = v.group_slug
on conflict (slug) do update set name = excluded.name, description = excluded.description, group_id = excluded.group_id, category = excluded.category, price = excluded.price, final_price = excluded.final_price, discount = excluded.discount, old_price = excluded.old_price, stock = excluded.stock, sku = excluded.sku, weight = excluded.weight, images = excluded.images, image_url = excluded.image_url, is_active = excluded.is_active, is_new = excluded.is_new, rating = excluded.rating, reviews = excluded.reviews, flash_sale_discount = excluded.flash_sale_discount, flash_sale_end_at = excluded.flash_sale_end_at;

-- Shipping services
insert into product_shipping_services (product_id, service_code, service_name, is_active)
select id, 'EZ', 'J&T Express EZ', true from products
on conflict do nothing;

-- Product variants
insert into product_variants (product_id, sku, name, price, stock, is_active)
select p.id, 'CF-ARA-500-GOI', 'Gói 500g', 166500, 120, true from products p where p.slug = 'ca-phe-arabica-da-lat-500g'
union all
select p.id, 'CF-ARA-1KG', 'Gói 1kg', 315000, 60, true from products p where p.slug = 'ca-phe-arabica-da-lat-500g'
union all
select p.id, 'CF-ROB-500-GOI', 'Gói 500g', 130500, 200, true from products p where p.slug = 'ca-phe-robusta-buon-ma-thuot-500g'
union all
select p.id, 'TR-HC-250-GOI', 'Gói 250g', 103500, 80, true from products p where p.slug = 'tra-hoa-cuc-mat-ong-250g'
on conflict do nothing;

-- Price list
insert into price_list (sku, product_id, name, group_id, price, discount, final_price, stock, unit, is_active)
select p.sku, p.id, p.name, p.group_id, p.price, p.discount, p.final_price, p.stock, 'gói', true from products p
on conflict (sku) do update set product_id = excluded.product_id, name = excluded.name, group_id = excluded.group_id, price = excluded.price, discount = excluded.discount, final_price = excluded.final_price, stock = excluded.stock, is_active = excluded.is_active;

-- Orders
insert into orders (customer_id, customer_name, customer_phone, address, province, district, ward, total_price, shipping_fee, discount_amount, final_price, payment_method, payment_status, status, note)
select c.id, c.name, c.phone, c.address, c.province, c.district, c.ward, 334000, 14000, 0, 348000, 'cod', 'pending', 'done', 'Giao giờ hành chính' from customers c where c.email = 'a.nguyen@demo.vn'
union all
select c.id, c.name, c.phone, c.address, c.province, c.district, c.ward, 205000, 10000, 0, 215000, 'cod', 'pending', 'done', 'Gọi trước khi giao' from customers c where c.email = 'b.tran@demo.vn'
on conflict do nothing;

-- Order items
insert into order_items (order_id, product_id, product_name, product_sku, image_url, quantity, unit_price, discount, subtotal)
select o.id, p.id, p.name, p.sku, p.image_url, 1, p.price, p.discount, p.final_price
from orders o join customers c on c.id = o.customer_id join products p on p.slug = 'ca-phe-arabica-da-lat-500g'
where c.email = 'a.nguyen@demo.vn'
union all
select o.id, p.id, p.name, p.sku, p.image_url, 1, p.price, p.discount, p.final_price
from orders o join customers c on c.id = o.customer_id join products p on p.slug = 'tra-gung-sa-am-ap-250g'
where c.email = 'a.nguyen@demo.vn'
union all
select o.id, p.id, p.name, p.sku, p.image_url, 1, p.price, p.discount, p.final_price
from orders o join customers c on c.id = o.customer_id join products p on p.slug = 'tra-hoa-cuc-mat-ong-250g'
where c.email = 'b.tran@demo.vn'
union all
select o.id, p.id, p.name, p.sku, p.image_url, 1, p.price, p.discount, p.final_price
from orders o join customers c on c.id = o.customer_id join products p on p.slug = 'ca-phe-robusta-buon-ma-thuot-500g'
where c.email = 'b.tran@demo.vn'
on conflict do nothing;

-- Transactions
insert into transactions (order_id, type, amount, description)
select id, 'income', final_price, 'Thanh toán COD đơn ' || order_code from orders
on conflict do nothing;

-- Product reviews
insert into product_reviews (product_id, rating, comment, reviewer_name, is_approved)
select p.id, 5, 'Cà phê thơm ngon, đóng gói đẹp!', 'Nguyen Van A', true from products p where p.slug = 'ca-phe-arabica-da-lat-500g'
union all
select p.id, 4, 'Hương vị ổn, sẽ ủng hộ tiếp.', 'Tran Thi B', true from products p where p.slug = 'ca-phe-arabica-da-lat-500g'
union all
select p.id, 5, 'Trà hoa cúc rất thơm, uống buổi tối rất thư giãn.', 'Le Van C', true from products p where p.slug = 'tra-hoa-cuc-mat-ong-250g'
union all
select p.id, 4, 'Robusta đậm đà, pha phin rất hợp.', 'Pham Van D', true from products p where p.slug = 'ca-phe-robusta-buon-ma-thuot-500g'
on conflict do nothing;

-- Vouchers
insert into customer_vouchers (customer_id, code, rank, discount_type, discount_value, min_order, max_discount, expires_at, is_public, is_active, note)
values
  (null, 'WELCOME10', 'bronze', 'percent', 10, 200000, 50000, now() + interval '30 days', true, true, 'Voucher chào mừng'),
  (null, 'FLASH20', 'bronze', 'percent', 20, 500000, 100000, now() + interval '7 days', true, true, 'Voucher flash sale')
on conflict do nothing;

-- Upload groups
CREATE UNIQUE INDEX IF NOT EXISTS upload_groups_slug_full_uidx ON upload_groups (slug);

insert into upload_groups (id, name, slug, description, icon, sort_order, is_active, display_locations)
values
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'Về Techtra', 've-techtra', 'Giới thiệu về Techtra', 'fas fa-info-circle', 1, true, array['about']::text[]),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901'::uuid, 'Giải trí', 'giai-tri', 'Video giải trí', 'fas fa-video', 2, true, array['video']::text[]),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012'::uuid, 'Hướng dẫn sử dụng', 'huong-dan-su-dung', 'Video hướng dẫn sản phẩm', 'fas fa-graduation-cap', 3, true, array['video']::text[])
on conflict (slug) do update set name = excluded.name, description = excluded.description, icon = excluded.icon, sort_order = excluded.sort_order, is_active = excluded.is_active, display_locations = excluded.display_locations;

-- About content
insert into about_content (group_id, content, updated_at)
select g.id, '<h1>Giới thiệu Techtra</h1><p>Techtra là thương hiệu cà phê và trà thảo mộc chất lượng cao, cam kết 100% nguyên liệu thiên nhiên.</p>', now()
from upload_groups g where g.slug = 've-techtra'
on conflict (group_id) do update set content = excluded.content, updated_at = excluded.updated_at;

-- Videos
insert into videos (group_id, title, url, file_name, file_size, created_at)
select g.id, 'Video giải trí Techtra #1', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'video1.mp4', 10240000, now() from upload_groups g where g.slug = 'giai-tri'
union all
select g.id, 'Hướng dẫn pha cà phê Arabica', 'https://www.youtube.com/embed/abc123', 'huong-dan-pha-ca-phe.mp4', 20480000, now() from upload_groups g where g.slug = 'huong-dan-su-dung'
on conflict do nothing;

-- About requests
insert into about_requests (group_id, title, body, link, status)
select g.id, 'Yêu cầu cập nhật giới thiệu', 'Nội dung đề xuất cập nhật trang Về Techtra.', null, 'pending'
from product_groups g where g.slug = 'ca-phe-rang-xay'
on conflict do nothing;

-- Backfill counters
update products set
  reviews = coalesce((select count(*) from product_reviews where product_id = products.id and is_approved = true), 0),
  sold_count = coalesce((select sum(oi.quantity) from order_items oi join orders o on o.id = oi.order_id where oi.product_id = products.id and o.status not in ('cancelled','deleted_before_ship')), 0);

update product_groups set product_count = coalesce((select count(*) from products where group_id = product_groups.id and is_active = true and status = 'active'), 0);

DO $$
DECLARE rec RECORD;
BEGIN
  FOR rec IN SELECT id FROM customers LOOP
    PERFORM fn_refresh_customer_stats(rec.id);
  END LOOP;
END $$;

COMMIT;

-- =============================================================
-- END OF TECHTRA FULL DATA FOR WEB
-- =============================================================
