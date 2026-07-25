const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const emailService = require('./services/email.js');
const zaloService = require('./services/zalo.js');

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

const handleSingleResult = (res) => {
  if (res.rowCount === 0) throw new Error('Record not found');
  return { success: true, data: res.rows[0] };
};

// In-memory stores for verification codes
const emailVerificationCodes = new Map(); // email => {code, expiresAt}
const zaloVerificationCodes = new Map();  // phone => {code, expiresAt}
// Cleanup expired entries every minute
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
// Send verification code via email
app.post('/api/auth/send-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email format' });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    emailVerificationCodes.set(email, { code, expiresAt });

    // Send email using email service
    await emailService.sendVerificationEmail(email, code);
    console.log(`Verification email sent to ${email}`);

    res.json({ success: true, message: 'Mã xác nhận đã được gửi' });
  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send verification code via Zalo
app.post('/api/auth/send-zalo-verification', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'Phone number is required' });
    }
    // Simple Vietnamese phone number validation (starts with 0, 9 or 10 digits)
    const phoneRegex = /^(0|\+84)?(\d{9,10})$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({ success: false, error: 'Invalid phone number format' });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    zaloVerificationCodes.set(phoneNumber, { code, expiresAt });

    // Send via Zalo service
    await zaloService.sendZaloVerification(phoneNumber, code);
    console.log(`Zalo verification code sent to ${phoneNumber}`);

    res.json({ success: true, message: 'Mã xác nhận Zalo đã được gửi' });
  } catch (error) {
    console.error('Send Zalo verification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify code (email or Zalo)
app.post('/api/auth/verify-code', async (req, res) => {
  try {
    const { identifier, code, type } = req.body; // type: 'email' or 'zalo'
    if (!identifier || !code || !type) {
      return res.status(400).json({ success: false, error: 'Identifier, code, and type are required' });
    }
    let record;
    if (type === 'email') {
      record = emailVerificationCodes.get(identifier);
    } else if (type === 'zalo') {
      record = zaloVerificationCodes.get(identifier);
    } else {
      return res.status(400).json({ success: false, error: 'Invalid type. Must be "email" or "zalo"' });
    }
    if (!record) {
      return res.status(400).json({ success: false, error: 'Verification code not found or expired' });
    }
    const now = Date.now();
    if (now > record.expiresAt) {
      if (type === 'email') emailVerificationCodes.delete(identifier);
      else zaloVerificationCodes.delete(identifier);
      return res.status(400).json({ success: false, error: 'Verification code has expired' });
    }
    if (code !== record.code) {
      return res.status(400).json({ success: false, error: 'Incorrect verification code' });
    }
    // Delete after verification
    if (type === 'email') emailVerificationCodes.delete(identifier);
    else zaloVerificationCodes.delete(identifier);
    res.json({ success: true, message: 'Verification code is valid' });
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ success: false, error: error.message });
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

    // Find user by username or email
    const userResult = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [usernameOrEmail]
    );
    if (userResult.rowCount === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Remove password from response
    const { password_hash, ...userWithoutPassword } = user;
    res.json({ success: true, data: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message });
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

module.exports = app;

