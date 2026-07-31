const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const multer = require('multer');
require('dotenv').config();

const emailService = require('./services/email.js');
const zaloService = require('./services/zalo.js');
const otpService = require('./services/otpService.js');
const vnpayService = require('./services/vnpay.js');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err.stack);
  } else {
    console.log('Database connected successfully');
  }
});

// Helper functions
const handleResult = (res) => ({
  success: true,
  data: res.rows,
  total: res.rowCount,
});


function normalizeRole(r) {
  return String(r || "").toLowerCase();
}

// Helper functions
const handleSingleResult = (res) => {
  if (res.rowCount === 0) throw new Error('Record not found');
  return { success: true, data: res.rows[0] };
};

// Lưu ý: OTP codes hiện lưu trong bảng `verification_codes` của DB Postgres
// (xem services/otpService.js). KHÔNG còn in-memory Map.

// ========== UPLOAD (multer) ==========
// File upload tạm vào uploads_tmp, sau đó move sang uploads/<bucket>/<sub>/ để serve.
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const UPLOAD_TMP_DIR = path.join(__dirname, 'uploads_tmp');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_TMP_DIR, { recursive: true });
const upload = multer({ dest: UPLOAD_TMP_DIR });

// ========== GENERIC DB (PostgREST-style) ==========
// Whitelist các bảng được phép truy cập qua /api/db/:table.
// TODO production: thêm auth middleware (check JWT/session từ header Authorization).
const GENERIC_TABLES = new Set([
  'products', 'product_groups', 'price_list',
  'posts', 'news_categories',
  'homepage_config', 'homepage_values', 'homepage_promo_banners',
  'homepage_articles', 'homepage_blog', 'homepage_picks',
  'upload_groups', 'about_content', 'videos',
  'site_settings',
  // Whitelist thêm orders/order_items/transactions/customers/customer_vouchers/
  // product_reviews/about_requests + các view phổ biến để component admin & shop
  // có thể query qua generic /api/db/:table. Endpoints business riêng
  // (/api/orders, /api/dashboard/*) vẫn được ưu tiên cho nghiệp vụ phức tạp.
  'orders', 'order_items', 'transactions', 'customers', 'customer_vouchers',
  'product_reviews', 'about_requests', 'product_variants',
  'verification_codes', 'otp_send_log',
  // View — Postgres cho phép query view qua generic endpoint y như table.
  // v_orders_full chưa được tạo trong schema hiện tại (đã comment trong init.sql)
  // → bỏ qua, dùng /api/orders thay thế.
  'v_active_vouchers', 'v_customer_loyalty',
]);

// Build WHERE từ query string. Hỗ trợ:
//   ?col=eq.value       → col = value
//   ?col=neq.value      → col != value
//   ?col=gt.value       → col > value
//   ?col=lt.value       → col < value
//   ?col=ilike.%foo%    → col ILIKE '%foo%'
//   ?col=in.(1,2,3)     → col = ANY(...)
//   ?col=is.null        → col IS NULL
function buildWhere(query) {
  const wheres = [];
  const values = [];
  let i = 1;
  for (const [k, v] of Object.entries(query || {})) {
    if (['select','order','limit','offset','page'].includes(k)) continue;
    const m = String(v).match(/^(eq|neq|gt|gte|lt|lte|like|ilike|in|is)\.(.+)$/);
    if (!m) continue;
    const op = m[1];
    const val = m[2];
    if (op === 'in') {
      const arr = val.replace(/^\(|\)$/g, '').split(',').map(s => s.replace(/^"|"$|^\'|'$/g, ''));
      values.push(arr);
      wheres.push(`${k} = ANY($${i++})`);
    } else if (op === 'is') {
      wheres.push(`${k} IS ${val.toUpperCase() === 'NULL' ? 'NULL' : val}`);
    } else if (op === 'ilike' || op === 'like') {
      values.push(val);
      wheres.push(`${k} ${op.toUpperCase()} $${i++}`);
    } else {
      values.push(val);
      const opMap = { eq: '=', neq: '!=', gt: '>', gte: '>=', lt: '<', lte: '<=' };
      wheres.push(`${k} ${opMap[op]} $${i++}`);
    }
  }
  return { sql: wheres.length ? ' WHERE ' + wheres.join(' AND ') : '', values };
}

// Validate tên cột đơn giản (chỉ cho phép [a-zA-Z0-9_])
function safeIdent(s) {
  return String(s).replace(/[^a-zA-Z0-9_*.,\s]/g, '');
}

app.get('/api/db/:table', async (req, res) => {
  try {
    const t = req.params.table;
    if (!GENERIC_TABLES.has(t)) return res.status(403).json({ success: false, error: 'Table not allowed' });
    const select = safeIdent(req.query.select || '*');
    const { sql: whereSql, values } = buildWhere(req.query);
    let orderSql = '';
    if (req.query.order) {
      const parts = String(req.query.order).split('.');
      const col = safeIdent(parts[0]);
      const dir = (parts[1] || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
      orderSql = ` ORDER BY ${col} ${dir}`;
    }
    const limit = Math.min(parseInt(req.query.limit || '500', 10), 1000);
    const offset = parseInt(req.query.offset || '0', 10);
    const q = `SELECT ${select} FROM ${t}${whereSql}${orderSql} LIMIT ${limit} OFFSET ${offset}`;
    const r = await pool.query(q, values);
    return res.json({ success: true, data: r.rows, total: r.rowCount });
  } catch (err) {
    console.error('[db GET]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/db/:table', async (req, res) => {
  try {
    const t = req.params.table;
    if (!GENERIC_TABLES.has(t)) return res.status(403).json({ success: false, error: 'Table not allowed' });
    const body = req.body || {};
    const cols = Object.keys(body);
    if (!cols.length) return res.status(400).json({ success: false, error: 'Empty body' });
    const vals = Object.values(body);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(',');
    const q = `INSERT INTO ${t} (${cols.join(',')}) VALUES (${placeholders}) RETURNING *`;
    const r = await pool.query(q, vals);
    return res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error('[db POST]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/db/:table', async (req, res) => {
  try {
    const t = req.params.table;
    if (!GENERIC_TABLES.has(t)) return res.status(403).json({ success: false, error: 'Table not allowed' });
    // Body dạng: { set: {col: value}, where: {col: value} }
    const set = req.body && req.body.set ? req.body.set : (req.body || {});
    const where = req.body && req.body.where ? req.body.where : null;
    const setCols = Object.keys(set);
    if (!setCols.length) return res.status(400).json({ success: false, error: 'Empty body' });
    const setVals = Object.values(set);
    const setPlaceholders = setCols.map((c, i) => `${c} = $${i + 1}`).join(',');
    let whereSql = '';
    const allVals = [...setVals];
    if (where) {
      const whereClauses = [];
      let i = setCols.length;
      for (const [k, v] of Object.entries(where)) {
        allVals.push(v);
        whereClauses.push(`${k} = $${++i}`);
      }
      whereSql = ' WHERE ' + whereClauses.join(' AND ');
    }
    const q = `UPDATE ${t} SET ${setPlaceholders}${whereSql} RETURNING *`;
    const r = await pool.query(q, allVals);
    return res.json({ success: true, data: r.rows });
  } catch (err) {
    console.error('[db PATCH]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/db/:table', async (req, res) => {
  try {
    const t = req.params.table;
    if (!GENERIC_TABLES.has(t)) return res.status(403).json({ success: false, error: 'Table not allowed' });
    const { sql: whereSql, values } = buildWhere(req.query);
    const q = `DELETE FROM ${t}${whereSql} RETURNING *`;
    const r = await pool.query(q, values);
    return res.json({ success: true, data: r.rows });
  } catch (err) {
    console.error('[db DELETE]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ========== ORDERS (business logic — query trực tiếp bảng orders) ==========
// Lưu ý: view v_orders_full không tồn tại trong schema hiện tại, nên query trực tiếp orders.
app.get('/api/orders', async (req, res) => {
  try {
    const status = req.query.status;
    let q = 'SELECT * FROM orders';
    const vals = [];
    if (status && status !== 'all') {
      q += ' WHERE status = $1';
      vals.push(status);
    }
    q += ' ORDER BY created_at DESC LIMIT 500';
    const r = await pool.query(q, vals);
    return res.json({ success: true, data: r.rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/orders/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, error: 'Invalid id' });
    const cols = Object.keys(req.body || {});
    if (!cols.length) return res.status(400).json({ success: false, error: 'Empty body' });
    const vals = Object.values(req.body);
    const set = cols.map((c, i) => `${c} = $${i + 1}`).join(',');
    const q = `UPDATE orders SET ${set}, updated_at = NOW() WHERE id = $${cols.length + 1} RETURNING *`;
    const r = await pool.query(q, [...vals, id]);
    return res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/orders/bulk-confirm', async (req, res) => {
  try {
    const ids = (req.body && req.body.ids) || [];
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ success: false, error: 'ids[] required' });
    }
    await pool.query(
      `UPDATE orders SET status = 'confirmed', updated_at = NOW() WHERE id = ANY($1::int[])`,
      [ids]
    );
    const r = await pool.query(
      `SELECT * FROM orders WHERE id = ANY($1::int[])`,
      [ids]
    );
    return res.json({ success: true, data: r.rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ========== REVIEWS (business logic — insert + auto update products) ==========
// POST /api/reviews — KH gửi đánh giá mới. Insert vào product_reviews (status='pending'),
// tự động cập nhật products.reviews_count / reviews_sum / rating.
app.post('/api/reviews', async (req, res) => {
  const client = await pool.connect();
  try {
    const { product_id, rating, comment, reviewer_name, phone, customer_id } = req.body || {};
    if (!product_id) return res.status(400).json({ success: false, error: 'product_id is required' });
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return res.status(400).json({ success: false, error: 'rating must be integer 1..5' });
    }

    await client.query('BEGIN');
    const ins = await client.query(
      `INSERT INTO product_reviews
         (product_id, rating, comment, reviewer_name, phone, customer_id, is_approved, status)
       VALUES ($1, $2, $3, $4, $5, $6, false, 'pending')
       RETURNING *`,
      [
        Number(product_id),
        r,
        (comment || '').trim() || null,
        (reviewer_name || '').trim() || 'Khách hàng',
        (phone || '').trim() || null,
        customer_id != null ? Number(customer_id) : null,
      ]
    );
    await client.query('COMMIT');
    return res.json({ success: true, data: ins.rows[0], pending: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// PATCH /api/reviews/:id/approve — Admin duyệt: set is_approved=true, status='approved',
// đồng thời sync products.reviews_count / reviews_sum / rating.
app.patch('/api/reviews/:id/approve', async (req, res) => {
  const client = await pool.connect();
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, error: 'Invalid id' });
    await client.query('BEGIN');
    const upd = await client.query(
      `UPDATE product_reviews SET is_approved = true, status = 'approved'
       WHERE id = $1 RETURNING *`,
      [id]
    );
    if (!upd.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Review not found' });
    }
    const rev = upd.rows[0];
    await client.query(
      `UPDATE products SET
         reviews_count = (SELECT COUNT(*) FROM product_reviews WHERE product_id = $1 AND is_approved = true),
         reviews_sum   = (SELECT COALESCE(SUM(rating), 0) FROM product_reviews WHERE product_id = $1 AND is_approved = true),
         rating        = (SELECT COALESCE(AVG(rating), 0)::numeric(3,2) FROM product_reviews WHERE product_id = $1 AND is_approved = true)
       WHERE id = $1`,
      [rev.product_id]
    );
    await client.query('COMMIT');
    return res.json({ success: true, data: rev });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// DELETE /api/reviews/:id — Admin xóa + sync lại products.reviews_count.
app.delete('/api/reviews/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, error: 'Invalid id' });
    await client.query('BEGIN');
    const del = await client.query(
      `DELETE FROM product_reviews WHERE id = $1 RETURNING product_id`,
      [id]
    );
    if (!del.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Review not found' });
    }
    const productId = del.rows[0].product_id;
    await client.query(
      `UPDATE products SET
         reviews_count = (SELECT COUNT(*) FROM product_reviews WHERE product_id = $1 AND is_approved = true),
         reviews_sum   = (SELECT COALESCE(SUM(rating), 0) FROM product_reviews WHERE product_id = $1 AND is_approved = true),
         rating        = (SELECT COALESCE(AVG(rating), 0)::numeric(3,2) FROM product_reviews WHERE product_id = $1 AND is_approved = true)
       WHERE id = $1`,
      [productId]
    );
    await client.query('COMMIT');
    return res.json({ success: true, data: { id } });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ========== CUSTOMERS (dùng view v_customer_loyalty) ==========
app.get('/api/customers', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM v_customer_loyalty ORDER BY ltv DESC NULLS LAST LIMIT 500');
    return res.json({ success: true, data: r.rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/customers/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, error: 'Invalid id' });
    const cols = Object.keys(req.body || {});
    if (!cols.length) return res.status(400).json({ success: false, error: 'Empty body' });
    const vals = Object.values(req.body);
    const set = cols.map((c, i) => `${c} = $${i + 1}`).join(',');
    const q = `UPDATE customers SET ${set} WHERE id = $${cols.length + 1} RETURNING *`;
    const r = await pool.query(q, [...vals, id]);
    return res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// RPC loyalty (tương đương Supabase RPC fn_loyalty_issue_voucher)
app.post('/api/customers/:id/issue-loyalty-voucher', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, error: 'Invalid id' });
    // Gọi function SQL có sẵn trong DB
    const r = await pool.query('SELECT fn_loyalty_issue_voucher($1) AS voucher_id', [id]);
    return res.json({ success: true, data: { voucher_id: r.rows[0]?.voucher_id || 0 } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ========== DASHBOARD ==========
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const [orders, customers, transactions, topProducts] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total_orders,
          COALESCE(SUM(final_price) FILTER (WHERE LOWER(status) = 'done'), 0)::float AS total_revenue,
          COUNT(*) FILTER (WHERE LOWER(status) = 'done')::int AS done_orders,
          COUNT(*) FILTER (WHERE LOWER(status) = 'pending')::int AS pending_orders,
          COUNT(*) FILTER (WHERE LOWER(status) = 'cancelled')::int AS cancelled_orders,
          COALESCE(SUM(final_price) FILTER (WHERE LOWER(status) = 'cancelled'), 0)::float AS cancelled_revenue
        FROM orders
      `),
      pool.query(`SELECT COUNT(*)::int AS total_customers FROM customers`),
      pool.query(`
        SELECT
          COALESCE(SUM(amount), 0)::float AS total_in,
          COALESCE(SUM(amount) FILTER (WHERE LOWER(type) = 'expense'), 0)::float AS total_out
        FROM transactions
      `),
      pool.query(`
        SELECT id, name, COALESCE(sold_count, 0)::int AS sold_count
        FROM products
        ORDER BY sold_count DESC NULLS LAST
        LIMIT 10
      `),
    ]);
    return res.json({
      success: true,
      data: {
        orders: orders.rows[0],
        customers: customers.rows[0],
        transactions: transactions.rows[0],
        topProducts: topProducts.rows,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/dashboard/transactions', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 500');
    return res.json({ success: true, data: r.rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ========== UPLOAD (multipart) ==========
// POST /api/upload — form-data: file=<binary>, bucket=<name>, subfolder=<name>
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Thiếu file' });
    const bucket = String(req.body.bucket || 'misc').replace(/[^a-z0-9_-]/gi, '');
    const subfolder = String(req.body.subfolder || '').replace(/[^a-z0-9_\/-]/gi, '');
    const dir = path.join(UPLOAD_DIR, bucket, subfolder);
    fs.mkdirSync(dir, { recursive: true });
    const ext = (path.extname(req.file.originalname) || '.bin').toLowerCase();
    const storedName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    fs.renameSync(req.file.path, path.join(dir, storedName));
    const url = `/api/uploads/${bucket}${subfolder ? '/' + subfolder : ''}/${storedName}`;
    return res.json({
      success: true,
      data: {
        url,
        fileName: req.file.originalname,
        size: req.file.size,
        storedName,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Static serve uploaded files
app.use('/api/uploads', express.static(UPLOAD_DIR));

// ========== Cleanup expired entries every minute ==========
// Cleanup expired entries every minute
const emailVerificationCodes = new Map();
const zaloVerificationCodes = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [email, { expiresAt }] of emailVerificationCodes.entries()) {
    if (now > expiresAt) {
      emailVerificationCodes.delete(email);
    }
  }
  for (const [phone, { expiresAt }] of zaloVerificationCodes.entries()) {
    if (now > expiresAt) {
      zaloVerificationCodes.delete(phone);
    }
  }
}, 60 * 1000);

// ========== AUTH API ==========
// Admin list (load danh sách cho AdminAccounts UI)
app.get('/api/auth/admin/list', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, username, email, phone, full_name, role, admin_priority, is_active, created_at
       FROM admins
       ORDER BY admin_priority DESC, created_at ASC`
    );
    return res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Admin create/update (hash-before-store)
app.post('/api/auth/admin/create', async (req, res) => {
  try {
    const { name, username, email, password, phone, full_name, role, admin_priority, is_active } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, error: 'email và password là bắt buộc' });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Chuẩn hoá boolean — chấp nhận true | 'true' | 1
    const finalIsActive = is_active === undefined || is_active === null
      ? true
      : (is_active === true || is_active === 'true' || is_active === 1);

    const result = await pool.query(
      `INSERT INTO admins (name, username, email, password, phone, full_name, role, admin_priority, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, name, username, email, phone, full_name, role, admin_priority, is_active, created_at`,
      [
        name || null,
        username ? String(username).toLowerCase() : null,
        String(email).toLowerCase(),
        hashedPassword,
        phone || null,
        full_name || null,
        role || 'admin',
        Number(admin_priority) || 0,
        finalIsActive,
      ]
    );

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/admin/update', async (req, res) => {
  try {
    const { id, name, username, email, phone, full_name, role, admin_priority, is_active, password } = req.body || {};
    if (!id) return res.status(400).json({ success: false, error: 'id là bắt buộc' });

    const params = [];
    const sets = [];

    const add = (col, val) => {
      if (val === undefined) return;
      sets.push(`${col} = $${params.length + 1}`);
      params.push(val);
    };

    add('name', name ?? null);
    add('username', username ? String(username).toLowerCase() : null);
    add('email', email ? String(email).toLowerCase() : null);
    add('phone', phone ?? null);
    add('full_name', full_name ?? null);
    add('role', role ? normalizeRole(role) : undefined);
    add('admin_priority', admin_priority === undefined ? undefined : Number(admin_priority));
    add('is_active', is_active === undefined
      ? undefined
      : (is_active === true || is_active === 'true' || is_active === 1));

    if (password && String(password).trim()) {
      const hashedPassword = await bcrypt.hash(password, 10);
      add('password', hashedPassword);
    }

    if (!sets.length) return res.json({ success: true, data: null });

    const sql = `UPDATE admins SET ${sets.join(', ')} WHERE id = $${params.length + 1} RETURNING id, name, username, email, phone, full_name, role, admin_priority, is_active, created_at`;
    params.push(id);

    const result = await pool.query(sql, params);
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Admin not found' });

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// ========== OTP — generic endpoint (mới) ==========
// Gộp 3 endpoint cũ (send-verification / send-zalo-verification / verify-code)
// thành 2 endpoint duy nhất, lưu DB + rate-limit + bcrypt hash.
//
// POST /api/otp/send    { identifier, channel, purpose } → { success, expiresAt }
// POST /api/otp/verify  { identifier, channel, purpose, code } → { success }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(0|\+84)?(\d{9,10})$/;
const PURPOSE_LABEL = {
  register:        'đăng ký tài khoản',
  review:          'đánh giá sản phẩm',
  reset_password:  'đặt lại mật khẩu',
};

app.post('/api/otp/send', async (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || null;
  try {
    const { identifier, channel, purpose } = req.body || {};
    if (!identifier) return res.status(400).json({ success: false, error: 'identifier là bắt buộc' });
    if (!channel || !otpService.VALID_CHANNELS.includes(channel)) {
      return res.status(400).json({ success: false, error: `channel phải là ${otpService.VALID_CHANNELS.join('|')}` });
    }
    if (!purpose || !otpService.VALID_PURPOSES.includes(purpose)) {
      return res.status(400).json({ success: false, error: `purpose phải là ${otpService.VALID_PURPOSES.join('|')}` });
    }

    // Validate format identifier theo channel
    if (channel === 'email' && !EMAIL_RE.test(identifier)) {
      return res.status(400).json({ success: false, error: 'Email không hợp lệ' });
    }
    if (channel === 'zalo' && !PHONE_RE.test(identifier)) {
      return res.status(400).json({ success: false, error: 'Số điện thoại không hợp lệ' });
    }

    // Rate-limit + resend interval
    try {
      await otpService.rateLimitCheck({ identifier, channel, windowMinutes: 10, maxSends: 5 });
    } catch (e) {
      return res.status(429).json({ success: false, error: e.message });
    }
    try {
      await otpService.checkResendInterval({ identifier, channel, minIntervalSeconds: 60 });
    } catch (e) {
      return res.status(429).json({ success: false, error: e.message });
    }

    // Tạo mã + insert DB (log rate-limit ngay)
    const { code, expiresAt } = await otpService.createOtp({ identifier, channel, purpose, ip });

    // Gửi qua kênh thật.
    let sent = false;
    let sendError = null;
    try {
      if (channel === 'email') {
        await emailService.sendOtpEmail(identifier, code, {
          purpose: PURPOSE_LABEL[purpose] || 'xác thực',
          ttlMinutes: 5,
        });
      } else {
        await zaloService.sendZaloVerification(identifier, code);
      }
      sent = true;
    } catch (e) {
      sendError = e;
      console.error('[otp/send] channel send failed:', e.message);
    }

    // Trong môi trường non-production, nếu kênh gửi lỗi do chưa cấu hình
    // SMTP/Zalo, vẫn trả mã về để dev/test. Production thì báo lỗi 500.
    // Có thể buộc tắt bypass bằng env OTP_DEV_BYPASS=false.
    const bypassDev = process.env.OTP_DEV_BYPASS !== 'false' && process.env.NODE_ENV !== 'production';
    if (!sent && !bypassDev) {
      return res.status(500).json({
        success: false,
        error: 'Không gửi được mã OTP. Vui lòng kiểm tra cấu hình kênh gửi (SMTP/Zalo) rồi thử lại.',
      });
    }

    return res.json({
      success: true,
      message: sent ? 'Mã OTP đã được gửi.' : 'Mã OTP đã được tạo (dev mode — kênh gửi chưa cấu hình).',
      code: sent ? undefined : code, // chỉ trả code khi bypass
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('[otp/send] error:', error);
    return res.status(500).json({
      success: false,
      error: 'Không gửi được mã OTP. Vui lòng kiểm tra cấu hình kênh gửi (SMTP/Zalo) rồi thử lại.',
    });
  }
});

app.post('/api/otp/verify', async (req, res) => {
  try {
    const { identifier, channel, purpose, code } = req.body || {};
    if (!identifier || !code) {
      return res.status(400).json({ success: false, error: 'identifier và code là bắt buộc' });
    }
    if (!channel || !otpService.VALID_CHANNELS.includes(channel)) {
      return res.status(400).json({ success: false, error: `channel phải là ${otpService.VALID_CHANNELS.join('|')}` });
    }
    if (!purpose || !otpService.VALID_PURPOSES.includes(purpose)) {
      return res.status(400).json({ success: false, error: `purpose phải là ${otpService.VALID_PURPOSES.join('|')}` });
    }

    try {
      await otpService.verifyOtp({ identifier, channel, purpose, code });
    } catch (e) {
      // Generic message — không tiết lộ mã còn hiệu lực hay đã hết hạn.
      return res.status(400).json({ success: false, error: 'Mã OTP không đúng hoặc đã hết hạn.' });
    }
    return res.json({ success: true, message: 'Mã OTP hợp lệ.' });
  } catch (error) {
    console.error('[otp/verify] error:', error);
    return res.status(500).json({ success: false, error: 'Lỗi máy chủ.' });
  }
});

// ========== End OTP ==========

// ========== Payment (VNPay) ==========
app.post('/api/payment/vnpay/create', async (req, res) => {
  try {
    const { amount, orderId, orderDesc, bankCode, locale } = req.body || {};
    if (!amount || !orderId) {
      return res.status(400).json({ success: false, error: 'amount và orderId là bắt buộc' });
    }
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const result = await vnpayService.createPaymentUrl({
      amount,
      orderId: String(orderId),
      orderDesc,
      bankCode,
      locale,
      ipAddr: Array.isArray(ip) ? ip[0] : ip,
    });
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[vnpay/create] error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Không tạo được link VNPay' });
  }
});

app.get('/api/payment/vnpay/return', async (req, res) => {
  try {
    const result = await vnpayService.verifyReturnUrl(req.query || {});
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[vnpay/return] error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Lỗi xác thực VNPay' });
  }
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, full_name } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: 'Username, email, and password are required' });
    }
    // Check if user already exists
    const check = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    if (check.rowCount > 0) {
      return res.status(409).json({ success: false, error: 'Username or email already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, full_name, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, username, email, full_name, is_active, created_at`,
      [username, email, hashedPassword, full_name || null, true]
    );

    const newUser = result.rows[0];

    // Send welcome email (optional) using email service
    try {
      await emailService.sendWelcomeEmail(email, full_name || username);
    } catch (mailErr) {
      console.warn('Could not send welcome email:', mailErr);
    }

    res.status(201).json({ success: true, data: newUser });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;
    if (!usernameOrEmail && !password) {
      return res.status(400).json({ success: false, error: 'Username/email and password are required' });
    }

    // 1) Try admin login (bảng admins)
    // Quy ước: admin đăng nhập bằng email hoặc username (giống users).
    const adminResult = await pool.query(
      `SELECT * FROM admins
       WHERE email = $1 OR username = $1
       LIMIT 1`,
      [usernameOrEmail]
    );

    if (adminResult.rowCount > 0) {
      const admin = adminResult.rows[0];
      const matchAdmin = await bcrypt.compare(password, admin.password);
      if (!matchAdmin) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      // Bỏ `password` ra khỏi response (dùng tên biến khác `adminPassword`
      // để khỏi đụng `password` ở scope ngoài — tránh TDZ).
      const { password: adminPassword, ...adminWithoutPassword } = admin;
      return res.json({
        success: true,
        data: {
          ...adminWithoutPassword,
          role: admin.role || 'admin',
        },
      });
    }

    // 2) Login user (bảng users) — cho phép username, email hoặc phone
    // Chuẩn hoá phone để tìm cả dạng 098xxx và +8498xxx.
    const phoneVariants = [];
    if (/^0\d{9,10}$/.test(usernameOrEmail)) {
      phoneVariants.push(usernameOrEmail, '+84' + usernameOrEmail.slice(1));
    } else if (/^\+84\d{9,10}$/.test(usernameOrEmail)) {
      phoneVariants.push(usernameOrEmail, '0' + usernameOrEmail.slice(3));
    }
    const userResult = await pool.query(
      `SELECT * FROM users
       WHERE username = $1 OR email = $1
          ${phoneVariants.length ? `OR phone = ANY($2)` : ''}`,
      phoneVariants.length ? [usernameOrEmail, phoneVariants] : [usernameOrEmail]
    );
    if (userResult.rowCount === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Remove password from response (dùng `userHash` để tránh TDZ với `password` ở scope ngoài)
    const { password_hash: userHash, ...userWithoutPassword } = user;
    void userHash; // không trả hash về client

    // Sync customer row linked to users.id so checkout can use customers.id as customer_id FK
    let customerId = null;
    try {
      // ensure customers has user_id column (idempotent migration)
      await pool.query(`
        DO $
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'customers' AND column_name = 'user_id'
          ) THEN
            ALTER TABLE customers ADD COLUMN user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL;
          END IF;
        END $;
      `);

      const custByUser = await pool.query('SELECT id FROM customers WHERE user_id = $1 LIMIT 1', [user.id]);
      if (custByUser.rowCount > 0) {
        customerId = custByUser.rows[0].id;
      } else {
        const createCust = await pool.query(
          `INSERT INTO customers (user_id, name, email, phone, address, password)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (email) DO NOTHING
           RETURNING id`,
          [user.id, user.full_name || user.username || '', user.email || null, user.phone || null, user.address || '', '']
        );
        if (createCust.rowCount > 0) {
          customerId = createCust.rows[0].id;
        } else if (user.email) {
          const custByEmail = await pool.query('SELECT id FROM customers WHERE email = $1 LIMIT 1', [user.email]);
          if (custByEmail.rowCount > 0) customerId = custByEmail.rows[0].id;
        }
      }
    } catch (syncErr) {
      console.warn('Login customer sync warning:', syncErr.message);
    }

    res.json({ success: true, data: { ...userWithoutPassword, customer_id: customerId } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== AUTH + FORGOT/RESET PASSWORD (mới — dùng OTP) ==========
// Flow:
//   1. POST /api/auth/forgot-password  { email } → gửi OTP qua email (purpose=reset_password)
//   2. POST /api/auth/reset-password   { email, code, newPassword } → verify OTP, đổi MK
//
// Lưu ý: email có trong DB hay không, vẫn trả success để tránh lộ tồn tại user.
app.post('/api/auth/forgot-password', async (req, res) => {
  const ip = req.ip || null;
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ success: false, error: 'Email là bắt buộc' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ success: false, error: 'Email không hợp lệ' });

    // Rate-limit + resend interval — luôn áp dụng (kể cả email không tồn tại)
    try {
      await otpService.rateLimitCheck({ identifier: email, channel: 'email', windowMinutes: 10, maxSends: 5 });
    } catch (e) {
      return res.status(429).json({ success: false, error: e.message });
    }
    try {
      await otpService.checkResendInterval({ identifier: email, channel: 'email', minIntervalSeconds: 60 });
    } catch (e) {
      return res.status(429).json({ success: false, error: e.message });
    }

    // Không leak tồn tại user — kiểm tra nhẹ, nếu không có vẫn trả success
    const userCheck = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
    if (userCheck.rowCount === 0) {
      return res.json({
        success: true,
        message: 'Nếu email tồn tại trong hệ thống, mã OTP đã được gửi.',
      });
    }

    // Tạo + gửi OTP
    try {
      const { code, expiresAt } = await otpService.createOtp({
        identifier: email, channel: 'email', purpose: 'reset_password', ip,
      });
      await emailService.sendOtpEmail(email, code, { purpose: 'đặt lại mật khẩu', ttlMinutes: 5 });
      return res.json({
        success: true,
        message: 'Mã OTP đã được gửi tới email của bạn.',
        expiresAt: expiresAt.toISOString(),
      });
    } catch (sendErr) {
      console.error('[forgot-password] send OTP failed:', sendErr);
      return res.status(500).json({
        success: false,
        error: 'Không gửi được mã OTP. Vui lòng kiểm tra cấu hình SMTP rồi thử lại.',
      });
    }
  } catch (err) {
    console.error('[forgot-password] error:', err);
    return res.status(500).json({ success: false, error: 'Lỗi máy chủ.' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body || {};
    if (!email || !code || !newPassword) {
      return res.status(400).json({ success: false, error: 'Email, code và newPassword là bắt buộc' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ success: false, error: 'Email không hợp lệ' });
    }

    // Verify OTP (purpose=reset_password)
    try {
      await otpService.verifyOtp({
        identifier: email, channel: 'email', purpose: 'reset_password', code,
      });
    } catch (e) {
      return res.status(400).json({ success: false, error: 'Mã OTP không đúng hoặc đã hết hạn.' });
    }

    // Hash + update
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING id, username, email, role, is_active',
      [hashedPassword, email]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy user' });
    }
    return res.json({ success: true, data: result.rows[0], message: 'Đặt lại mật khẩu thành công.' });
  } catch (err) {
    console.error('[reset-password] error:', err);
    return res.status(500).json({ success: false, error: 'Lỗi máy chủ.' });
  }
});

// ========== PRODUCT GROUPS API ==========
// Get all product groups
app.get('/api/product-groups', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM product_groups ORDER BY sort_order'
    );
    res.json(handleResult(result));
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get product group by ID
app.get('/api/product-groups/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM product_groups WHERE id = $1',
      [req.params.id]
    );
    res.json(handleSingleResult(result));
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create product group
app.post('/api/product-groups', async (req, res) => {
  try {
    const { name, slug, description, is_active, sort_order, image_url } = req.body;
    const result = await pool.query(
      `INSERT INTO product_groups (name, slash, description, is_active, sort_order, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, slug, description, is_active, sort_order, image_url]
    );
    res.json(handleSingleResult(result));
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== PRODUCTS API ==========
// Get all products with filtering and pagination
app.get('/api/products', async (req, res) => {
  try {
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // Filter by group_id
    if (req.query.group_id) {
      query += ` AND group_id = $${paramIndex}`;
      params.push(parseInt(req.query.group_id));
      paramIndex++;
    }

    // Filter by status
    if (req.query.status !== undefined) {
      query += ` AND is_active = $${paramIndex}`;
      params.push(req.query.status === 'true' || req.query.status === true);
      paramIndex++;
    }

    // Search by name
    if (req.query.search) {
      query += ` AND name ILIKE $${paramIndex}`;
      params.push(`%${req.query.search}%`);
      paramIndex++;
    }

    // Pagination
    let limit = parseInt(req.query.limit) || 20;
    let page = Math.max(1, parseInt(req.query.page) || 1);
    let offset = (page - 1) * limit;

    // Get total count first
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json({
      success: true,
      data: result.rows,
      total: total,
      page: page,
      limit: limit
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE id = $1',
      [req.params.id]
    );
    res.json(handleSingleResult(result));
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get product by slug
app.get('/api/products/slug/:slug', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE slug = $1 AND is_active = true',
      [req.params.slug]
    );
    if (result.rowCount === 0) {
      throw new Error('Product not found');
    }
    res.json(handleSingleResult(result));
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create product
app.post('/api/products', async (req, res) => {
  try {
    const {
      name, slug, description, is_active, group_id, sku, price, final_price,
      discount, stock, weight, weight_unit, height, width, length, images,
      video_url, content_file, pdf_name, brand, origin, material, barcode, gtin,
      cod_enabled, jt_fee_default, is_calculating_fee, fee_error, shipping_method
    } = req.body;

    const result = await pool.query(
      `INSERT INTO products (
        name, slug, description, is_active, group_id, sku, price, final_price,
        discount, stock, weight, weight_unit, height, width, length, images,
        video_url, content_file, pdf_name, brand, origin, material, barcode, gtin,
        cod_enabled, jt_fee_default, is_calculating_fee, fee_error, shipping_method
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)
      RETURNING *`,
      [
        name, slug, description, is_active, group_id, sku, price, final_price,
        discount, stock, weight, weight_unit, height, width, length,
        images || [], video_url, content_file, pdf_name, brand, origin, material,
        barcode, gtin, cod_enabled, jt_fee_default, is_calculating_fee, fee_error, shipping_method
      ]
    );
    res.json(handleSingleResult(result));
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
  try {
    const {
      name, slug, description, is_active, group_id, sku, price, final_price,
      discount, stock, weight, weight_unit, height, width, length, images,
      video_url, content_file, pdf_name, brand, origin, material, barcode, gtin,
      cod_enabled, jt_fee_default, is_calculating_fee, fee_error, shipping_method
    } = req.body;

    const result = await pool.query(
      `UPDATE products
       SET name = $1, slug = $2, description = $3, is_active = $4, group_id = $5, sku = $6, price = $7,
           final_price = $8, discount = $9, stock = $10, weight = $11, weight_unit = $12,
           height = $13, width = $14, length = $15, images = $16, video_url = $17,
           content_file = $18, pdf_name = $19, brand = $20, origin = $21, material = $22,
           barcode = $23, gtin = $24, cod_enabled = $25, jt_fee_default = $26,
           is_calculating_fee = $27, fee_error = $28, shipping_method = $29, updated_at = CURRENT_TIMESTAMP
       WHERE id = $30
       RETURNING *`,
      [
        name, slug, description, is_active, group_id, sku, price, final_price,
        discount, stock, weight, weight_unit, height, width, length,
        images || [], video_url, content_file, pdf_name, brand, origin, material,
        barcode, gtin, cod_enabled, jt_fee_default, is_calculating_fee, fee_error,
        shipping_method, req.params.id
      ]
    );
    if (result.rowCount === 0) {
      throw new Error('Product not found');
    }
    res.json(handleSingleResult(result));
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM products WHERE id = $1',
      [req.params.id]
    );
    if (result.rowCount === 0) {
      throw new Error('Product not found');
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== PRODUCT REVIEWS API ==========
// Lấy danh sách đánh giá (mới nhất trước) + tổng hợp rating
app.get('/api/products/:id/reviews', async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    if (Number.isNaN(productId)) {
      return res.status(400).json({ success: false, error: 'Invalid product id' });
    }
    const reviews = await pool.query(
      `SELECT id, product_id, rating, comment, reviewer_name, created_at
       FROM product_reviews
       WHERE product_id = $1 AND is_approved = true
       ORDER BY created_at DESC
       LIMIT 100`,
      [productId]
    );
    const summary = await pool.query(
      `SELECT count(*)::int as review_count, avg(rating)::numeric(3,2) as avg_rating
       FROM product_reviews
       WHERE product_id = $1 AND is_approved = true`,
      [productId]
    );
    const cnt = summary.rows[0].review_count || 0;
    const avg = cnt > 0 ? Number(summary.rows[0].avg_rating) : 0;
    res.json({
      success: true,
      data: reviews.rows,
      summary: { review_count: cnt, avg_rating: avg },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Khách gửi đánh giá mới
app.post('/api/products/:id/reviews', async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { rating, comment, reviewer_name } = req.body || {};
    const r = parseInt(rating);
    if (Number.isNaN(productId)) {
      return res.status(400).json({ success: false, error: 'Invalid product id' });
    }
    if (Number.isNaN(r) || r < 1 || r > 5) {
      return res.status(400).json({ success: false, error: 'Rating phải từ 1 đến 5' });
    }
    // Đảm bảo sản phẩm tồn tại
    const exists = await pool.query('SELECT id FROM products WHERE id = $1', [productId]);
    if (exists.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    const result = await pool.query(
      `INSERT INTO product_reviews (product_id, rating, comment, reviewer_name, is_approved, created_at)
       VALUES ($1, $2, $3, $4, true, CURRENT_TIMESTAMP)
       RETURNING id, product_id, rating, comment, reviewer_name, created_at`,
      [productId, r, (comment || '').toString().trim() || null,
       (reviewer_name || '').toString().trim() || 'Khách hàng']
    );
    // Đồng bộ rating + reviews trong bảng products (giúp hiển thị danh sách SP)
    await pool.query(
      `UPDATE products
         SET reviews = (SELECT count(*) FROM product_reviews WHERE product_id = $1 AND is_approved = true),
             rating  = COALESCE((SELECT round(avg(rating)::numeric, 2) FROM product_reviews
                                 WHERE product_id = $1 AND is_approved = true), rating)
       WHERE id = $1`,
      [productId]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/about-us — trả nội dung trang "Về Techtra" từ about_content
app.get('/api/about-us', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT ac.content, ac.group_id, ug.name AS group_name
       FROM about_content ac
       LEFT JOIN upload_groups ug ON ug.id = ac.group_id
       ORDER BY ac.updated_at DESC
       LIMIT 1`
    );
    const row = r.rows[0] || { content: '' };
    return res.json({ success: true, content: row.content || '', group_name: row.group_name || null });
  } catch (err) {
    console.error('[about-us]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/giaitri — trả danh sách video giải trí
app.get('/api/giaitri', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, title, url, file_name, file_size, created_at
       FROM videos
       ORDER BY created_at DESC
       LIMIT 100`
    );
    // Chuẩn hóa về shape mà frontend mong đợi: { title, url, src }
    const videos = r.rows.map((v) => ({
      id: v.id,
      title: v.title || 'Video',
      url: v.url || '',
      src: v.url || '',
      thumbnail: '',
      file_name: v.file_name,
      file_size: v.file_size,
      created_at: v.created_at,
    }));
    return res.json({ success: true, videos });
  } catch (err) {
    console.error('[giaitri]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// =============================================================
// Trang đọc báo — scrape link báo tự động (Mozilla Readability)
// =============================================================
const scraper = require('./services/scraper');

// POST /api/news/scrape  { url: "https://..." } → { success, data: { title, content, excerpt, ... } }
app.post('/api/news/scrape', async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ success: false, error: 'Thiếu url' });

  try {
    const data = await scraper.scrapeArticle(url);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[scrape] Lỗi:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/news/scrape-batch  { urls: ["...", "..."] } → [{ success, data|error }, ...]
app.post('/api/news/scrape-batch', async (req, res) => {
  const { urls } = req.body || {};
  if (!Array.isArray(urls) || !urls.length) {
    return res.status(400).json({ success: false, error: 'Thiếu mảng urls' });
  }
  const results = await Promise.allSettled(
    urls.map((u) => scraper.scrapeArticle(u))
  );
  res.json({
    success: true,
    results: results.map((r, i) =>
      r.status === 'fulfilled'
        ? { url: urls[i], success: true, data: r.value }
        : { url: urls[i], success: false, error: r.reason?.message || 'Lỗi không xác định' }
    ),
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Export cả app (cho test) lẫn pool (cho các service như otpService).
module.exports = app;
module.exports.pool = pool;

