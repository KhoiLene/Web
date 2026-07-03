// Zalo API service for sending verification codes
// Replace with actual Zalo API integration

const https = require('https');
const querystring = require('querystring');

/**
 * Sends a verification code via Zalo API
 * @param {string} phoneNumber - The recipient's phone number
 * @param {string} code - The 6-digit verification code
 * @returns {Promise<Object>} - Promise resolving to API response
 */
function sendZaloVerification(phoneNumber, code) {
    // TODO: Replace with actual Zalo API credentials and endpoint
    const zaloAppId = process.env.ZALO_APP_ID || 'your_app_id';
    const zaloSecretKey = process.env.ZALO_SECRET_KEY || 'your_secret_key';
    const accessToken = process.env.ZALO_ACCESS_TOKEN || 'your_access_token'; // if using token

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
            // 'access_token': accessToken // Depending on auth method
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