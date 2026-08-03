// Zalo OA service — gửi tin nhắn qua Zalo Official Account API
// Có thể dùng cho OTP verification, đơn hàng, hoặc thông báo chung.
//
// Yêu cầu env: ZALO_APP_ID, ZALO_SECRET_KEY, ZALO_ACCESS_TOKEN
// Có thể cấu hình qua site_settings với key zalo_app_id/zalo_secret_key/zalo_access_token.

const https = require('https');
const querystring = require('querystring');

function resolvePool() {
  try {
    const server = require('../server.js');
    if (server && server.pool && typeof server.pool.query === 'function') return server.pool;
  } catch (_) { /* fallthrough */ }
  return null;
}

async function loadZaloFromDb() {
  const pool = resolvePool();
  if (!pool) return null;
  try {
    const r = await pool.query(
      `SELECT key, value FROM site_settings WHERE key LIKE 'zalo_%'`
    );
    const cfg = {};
    (r.rows || []).forEach((row) => { cfg[row.key] = row.value; });
    return cfg;
  } catch (_) {
    return null;
  }
}

async function resolveZaloConfig() {
  const dbCfg = await loadZaloFromDb();
  return {
    zaloAppId:     process.env.ZALO_APP_ID     || (dbCfg && dbCfg.zalo_app_id)     || '',
    zaloSecretKey: process.env.ZALO_SECRET_KEY || (dbCfg && dbCfg.zalo_secret_key) || '',
    accessToken:   process.env.ZALO_ACCESS_TOKEN || (dbCfg && dbCfg.zalo_access_token) || '',
  };
}

/**
 * Gửi tin nhắn text qua Zalo OA (free-form, dùng cho user đã từng tương tác OA trong 24h).
 * Hàm generic — dùng chung cho OTP, đơn hàng, và thông báo khác.
 *
 * @param {string} phoneNumber SĐT người nhận (vd "0909000111")
 * @param {string} message     Nội dung text (≤1000 ký tự)
 * @returns {Promise<Object>}  Response từ Zalo API
 */
async function sendZaloText(phoneNumber, message) {
  const cfg = await resolveZaloConfig();
  if (!cfg.zaloAppId || !cfg.zaloSecretKey || !cfg.accessToken) {
    throw new Error(
      'Zalo OA chưa được cấu hình. Cần set ZALO_APP_ID, ZALO_SECRET_KEY, ZALO_ACCESS_TOKEN trong .env hoặc site_settings.'
    );
  }

  const safeMsg = String(message || '').slice(0, 1000);
  const postData = JSON.stringify({
    recipient: { phone_number: String(phoneNumber) },
    message:   { text: safeMsg },
  });

  const options = {
    hostname: 'openapi.zalo.me',
    port: 443,
    path: '/v2.0/oa/message/cs',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'access_token': cfg.accessToken,
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`Zalo API error: ${parsed.message || parsed.error || res.statusText}`));
          }
        } catch (_) {
          reject(new Error('Invalid JSON response from Zalo API'));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Gửi mã OTP xác thực qua Zalo — wrapper cho code cũ.
 * Giữ signature nguyên để không phá các chỗ đang dùng.
 */
async function sendZaloVerification(phoneNumber, code) {
  return sendZaloText(
    phoneNumber,
    `Mã xác nhận của bạn là: ${code}. Mã có hiệu lực trong 5 phút.`
  );
}

module.exports = { sendZaloText, sendZaloVerification };
