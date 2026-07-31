// Email service using nodemailer
//
// Yêu cầu env: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS,
//              SMTP_FROM_EMAIL (optional, fallback "no-reply@techtra.vn").
// Không có fallback "jsonTransport" — nếu thiếu env sẽ throw ngay từ lúc require,
// đảm bảo OTP send thất bại thay vì im lặng log.

const nodemailer = require('nodemailer');

function resolvePool() {
  try {
    const server = require('../server.js');
    if (server && server.pool && typeof server.pool.query === 'function') return server.pool;
  } catch (_) { /* fallthrough */ }
  return null;
}

async function loadSmtpFromDb() {
  const pool = resolvePool();
  if (!pool) return null;
  try {
    const r = await pool.query(
      `SELECT key, value FROM site_settings WHERE key LIKE 'smtp_%'`
    );
    const cfg = {};
    (r.rows || []).forEach((row) => { cfg[row.key] = row.value; });
    return cfg;
  } catch (_) {
    return null;
  }
}

async function buildTransport() {
  let host   = process.env.SMTP_HOST;
  let port   = parseInt(process.env.SMTP_PORT || '587', 10);
  let secure = process.env.SMTP_SECURE === 'true';
  let user   = process.env.SMTP_USER;
  let pass   = process.env.SMTP_PASS;

  // Nếu .env thiếu, thử đọc từ site_settings
  if (!host || !user || !pass) {
    const dbCfg = await loadSmtpFromDb();
    if (dbCfg) {
      if (!host && dbCfg.smtp_host)     host = dbCfg.smtp_host;
      if (!user && dbCfg.smtp_user)     user = dbCfg.smtp_user;
      if (!pass && dbCfg.smtp_pass)     pass = dbCfg.smtp_pass;
      if (dbCfg.smtp_port)              port = parseInt(dbCfg.smtp_port, 10) || port;
      if (dbCfg.smtp_secure !== undefined) secure = String(dbCfg.smtp_secure).toLowerCase() === 'true';
    }
  }

  if (!host || !user || !pass) {
    throw new Error(
      'SMTP chưa được cấu hình. Cần set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS trong .env hoặc site_settings.'
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

// Lazy init — nếu SMTP lỗi lúc startup, vẫn không crash server.
// Tới khi gọi sendEmail() mới throw.
let transporter;
async function getTransporter() {
  if (!transporter) transporter = await buildTransport();
  return transporter;
}

async function fromAddress() {
  let email = process.env.SMTP_FROM_EMAIL || 'no-reply@techtra.vn';
  let name  = process.env.SMTP_FROM_NAME  || 'Techtra';
  const dbCfg = await loadSmtpFromDb();
  if (dbCfg) {
    if (dbCfg.smtp_from_email) email = dbCfg.smtp_from_email;
    if (dbCfg.smtp_from_name)  name  = dbCfg.smtp_from_name;
  }
  return `"${name}" <${email}>`;
}

/**
 * Gửi email (low-level). Caller (otpService, otp flow khác) tự quản payload.
 * @param {Object} mailOptions
 */
async function sendEmail(mailOptions) {
  const t = await getTransporter();
  return t.sendMail({ from: await fromAddress(), ...mailOptions });
}

/**
 * Gửi OTP qua email — template generic (không còn chỉ "đăng ký").
 * @param {string} to        Địa chỉ email nhận
 * @param {string} code      Mã OTP 6 số
 * @param {Object} [opts]
 * @param {string} [opts.purpose='xác thực'] Mục đích (vd 'đặt lại mật khẩu')
 * @param {string} [opts.ttlMinutes=5]
 */
async function sendOtpEmail(to, code, opts = {}) {
  const purpose     = opts.purpose || 'xác thực';
  const ttlMinutes  = Number(opts.ttlMinutes || 5);

  const subject = `[Techtra] Mã xác thực ${purpose}`;
  const text    =
    `Mã xác thực của bạn là: ${code}\n` +
    `Mã có hiệu lực trong ${ttlMinutes} phút.\n\n` +
    `Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.`;
  const html    =
    `<p>Xin chào,</p>` +
    `<p>Mã xác thực ${escapeHtml(purpose)} của bạn là: <strong style="font-size:18px;letter-spacing:2px;">${code}</strong></p>` +
    `<p>Mã có hiệu lực trong <strong>${ttlMinutes} phút</strong>.</p>` +
    `<p style="color:#6b7280;font-size:12px;">Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.</p>`;

  return sendEmail({ to, subject, text, html });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

module.exports = { sendEmail, sendOtpEmail };
