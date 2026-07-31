// otpService.js
// Wrapper chung cho mọi OTP flow (email + zalo), thay thế in-memory Map cũ.
// - Mã 6 số, hash bằng bcrypt (cost 8) trước khi lưu DB.
// - TTL 5 phút, consume 1 lần (consumed_at set khi verify thành công).
// - Rate-limit: tối đa 5 lần gửi / 10 phút / 1 identifier (theo otp_send_log).
// - Resend interval: tối đa 1 lần / 60 giây / 1 identifier.
//
// Lỗi throw ra kèm mã code để FE phân biệt (chỉ in ra server.log nội bộ,
// message trả về client đã được generic hoá ở server.js).

const bcrypt = require('bcryptjs');

// ─── helpers ────────────────────────────────────────────────
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function resolvePool() {
  // Import pool từ server.js (đã export). Vòng try/catch để tránh lỗi
  // khi file này bị require trước server.js trong một số test harness.
  try {
    // require cache: server.js có thể đã chạy → lấy pool
    const server = require('../server.js');
    if (server && server.pool && typeof server.pool.query === 'function') {
      return server.pool;
    }
  } catch (_) { /* fallthrough */ }
  throw new Error('pg pool not found — server.js chưa export pool hoặc chưa được require');
}

const VALID_PURPOSES  = ['register', 'review', 'reset_password'];
const VALID_CHANNELS  = ['email', 'zalo'];
const BCRYPT_COST     = 8;
const DEFAULT_TTL_MIN = 5;
const DEFAULT_MAX_ATTEMPTS = 5;

class OtpError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code;
    this.name = 'OtpError';
  }
}

// ─── createOtp ──────────────────────────────────────────────
// Sinh mã, hash, INSERT row. KHÔNG gửi (gửi do caller quyết định service).
// Trả về { code, expiresAt } để caller dùng khi gọi email/zalo.
async function createOtp({ identifier, channel, purpose, ttlMinutes = DEFAULT_TTL_MIN, ip = null }) {
  if (!identifier) throw new OtpError('BAD_INPUT', 'identifier là bắt buộc');
  if (!VALID_CHANNELS.includes(channel)) throw new OtpError('BAD_INPUT', `channel phải là ${VALID_CHANNELS.join('|')}`);
  if (!VALID_PURPOSES.includes(purpose))  throw new OtpError('BAD_INPUT', `purpose phải là ${VALID_PURPOSES.join('|')}`);

  const db = resolvePool();
  const code        = generateCode();
  const codeHash    = await bcrypt.hash(code, BCRYPT_COST);
  const ttlMs       = ttlMinutes * 60 * 1000;
  const expiresAt   = new Date(Date.now() + ttlMs);

  await db.query(
    `INSERT INTO verification_codes (identifier, channel, purpose, code_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [identifier, channel, purpose, codeHash, expiresAt]
  );

  // Log rate-limit (đếm mỗi lần gửi). ip có thể là chuỗi không phải inet hợp lệ → cast/null.
  const safeIp = ip && /^[\d.:a-fA-F]+$/.test(ip) ? ip : null;
  await db.query(
    `INSERT INTO otp_send_log (identifier, channel, ip) VALUES ($1, $2, ${safeIp ? '$3' : 'NULL'}::inet)`,
    safeIp ? [identifier, channel, safeIp] : [identifier, channel]
  );

  return { code, expiresAt };
}

// ─── verifyOtp ──────────────────────────────────────────────
// So mã. Trả true nếu OK, throw OtpError nếu sai/hết hạn/khoá.
// Khi OK: set consumed_at, KHÔNG xoá row (giữ audit trail).
// Khi INCORRECT: tăng attempts, nếu đạt max_attempts thì set consumed_at = now()
// để khoá identifier khỏi verify tiếp.
async function verifyOtp({ identifier, channel, purpose, code }) {
  if (!identifier || !code) throw new OtpError('BAD_INPUT', 'identifier và code là bắt buộc');
  if (!VALID_CHANNELS.includes(channel)) throw new OtpError('BAD_INPUT', `channel phải là ${VALID_CHANNELS.join('|')}`);
  if (!VALID_PURPOSES.includes(purpose))  throw new OtpError('BAD_INPUT', `purpose phải là ${VALID_PURPOSES.join('|')}`);

  const db = resolvePool();

  // Tìm row mới nhất còn hiệu lực (chưa consumed, chưa hết hạn) cho identifier+channel+purpose
  const found = await db.query(
    `SELECT id, code_hash, attempts, max_attempts, expires_at
       FROM verification_codes
      WHERE identifier = $1
        AND channel    = $2
        AND purpose    = $3
        AND consumed_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1`,
    [identifier, channel, purpose]
  );

  if (found.rowCount === 0) {
    throw new OtpError('NOT_FOUND', 'Mã không đúng hoặc đã hết hạn');
  }

  const row        = found.rows[0];
  const now         = new Date();
  const expired     = now > new Date(row.expires_at);
  const locked      = row.attempts >= row.max_attempts;

  if (expired || locked) {
    // Khoá luôn để kẻ tấn công không verify tiếp
    if (!row.consumed_at) {
      await db.query(`UPDATE verification_codes SET consumed_at = $1 WHERE id = $2`, [now, row.id]);
    }
    throw new OtpError('EXPIRED', 'Mã không đúng hoặc đã hết hạn');
  }

  const ok = await bcrypt.compare(code, row.code_hash);
  if (!ok) {
    // Tăng attempts; nếu đạt max thì khoá
    const newAttempts = row.attempts + 1;
    const reachedMax  = newAttempts >= row.max_attempts;
    await db.query(
      `UPDATE verification_codes
          SET attempts    = $1,
              consumed_at = CASE WHEN $2 THEN $3 ELSE consumed_at END
        WHERE id = $4`,
      [newAttempts, reachedMax, now, row.id]
    );
    throw new OtpError('INCORRECT', 'Mã không đúng hoặc đã hết hạn');
  }

  // OK → đánh dấu đã dùng
  await db.query(
    `UPDATE verification_codes SET consumed_at = $1 WHERE id = $2`,
    [now, row.id]
  );
  return true;
}

// ─── rateLimitCheck ─────────────────────────────────────────
// Giới hạn số lần GỬI. Throw OtpError('RATE_LIMIT') nếu vượt maxSends trong windowMinutes.
async function rateLimitCheck({ identifier, channel, windowMinutes = 10, maxSends = 5 }) {
  const db = resolvePool();
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  const r = await db.query(
    `SELECT count(*)::int AS n
       FROM otp_send_log
      WHERE identifier = $1
        AND channel    = $2
        AND created_at > $3`,
    [identifier, channel, since]
  );
  const n = r.rows[0].n;
  if (n >= maxSends) {
    throw new OtpError('RATE_LIMIT', `Bạn đã yêu cầu quá nhiều mã. Vui lòng thử lại sau ${windowMinutes} phút.`);
  }
  return { count: n, remaining: Math.max(0, maxSends - n - 1) };
}

// ─── checkResendInterval ────────────────────────────────────
// Ngăn bấm "Gửi lại" liên tục. Throw OtpError('RESEND_TOO_SOON') nếu chưa đủ minIntervalSeconds.
async function checkResendInterval({ identifier, channel, minIntervalSeconds = 60 }) {
  const db = resolvePool();
  const since = new Date(Date.now() - minIntervalSeconds * 1000);
  const r = await db.query(
    `SELECT 1 FROM otp_send_log
      WHERE identifier = $1
        AND channel    = $2
        AND created_at > $3
      LIMIT 1`,
    [identifier, channel, since]
  );
  if (r.rowCount > 0) {
    throw new OtpError('RESEND_TOO_SOON', `Vui lòng đợi ${minIntervalSeconds} giây trước khi gửi lại.`);
  }
}

// ─── isLocked (kiểm tra trước khi verify, optional) ────────
async function isLocked({ identifier, channel, purpose }) {
  const db = resolvePool();
  const r = await db.query(
    `SELECT 1 FROM verification_codes
      WHERE identifier = $1
        AND channel    = $2
        AND purpose    = $3
        AND consumed_at IS NULL
        AND attempts >= max_attempts
      LIMIT 1`,
    [identifier, channel, purpose]
  );
  return r.rowCount > 0;
}

module.exports = {
  createOtp,
  verifyOtp,
  rateLimitCheck,
  checkResendInterval,
  isLocked,
  OtpError,
  VALID_PURPOSES,
  VALID_CHANNELS,
};
