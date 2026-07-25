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
