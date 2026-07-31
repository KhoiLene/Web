// Zalo API service for sending verification codes
// Replace with actual Zalo API integration

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

/**
 * Sends a verification code via Zalo API
 * @param {string} phoneNumber - The recipient's phone number
 * @param {string} code - The 6-digit verification code
 * @returns {Promise<Object>} - Promise resolving to API response
 */
async function sendZaloVerification(phoneNumber, code) {
    const dbCfg = await loadZaloFromDb();
    let zaloAppId     = process.env.ZALO_APP_ID     || (dbCfg && dbCfg.zalo_app_id)     || '';
    let zaloSecretKey = process.env.ZALO_SECRET_KEY || (dbCfg && dbCfg.zalo_secret_key) || '';
    let accessToken   = process.env.ZALO_ACCESS_TOKEN || (dbCfg && dbCfg.zalo_access_token) || '';

    if (!zaloAppId || !zaloSecretKey || !accessToken) {
      throw new Error('Zalo OA chưa được cấu hình. Cần set ZALO_APP_ID, ZALO_SECRET_KEY, ZALO_ACCESS_TOKEN trong .env hoặc site_settings.');
    }

    // Example: Zalo OA API for sending template message
    // Reference: https://developers.zalo.me/docs/official-account/api/send-message/
    const postData = JSON.stringify({
        recipient: {
            phone_number: phoneNumber
        },
        message: {
            text: `Mã xác nhận của bạn là: ${code}. Mã có hiệu lực trong 5 phút.`
        }
    });

    const options = {
        hostname: 'openapi.zalo.me',
        port: 443,
        path: '/v2.0/oa/message/cs', // Adjust endpoint as needed
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'access_token': accessToken,
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(parsed);
                    } else {
                        reject(new Error(`Zalo API error: ${parsed.message || res.statusText}`));
                    }
                } catch (e) {
                    reject(new Error('Invalid JSON response from Zalo API'));
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(postData);
        req.end();
    });
}

module.exports = { sendZaloVerification };