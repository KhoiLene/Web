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

-- BƯỚC 10: Reload PostgREST cache
notify pgrst, 'reload schema';

-- Đợi 5–10 giây rồi refresh trang admin (Ctrl+Shift+R).
