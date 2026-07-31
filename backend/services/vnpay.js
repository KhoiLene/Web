const crypto = require('crypto');
const querystring = require('querystring');

function resolvePool() {
  try {
    const server = require('../server.js');
    if (server && server.pool && typeof server.pool.query === 'function') return server.pool;
  } catch (_) { /* fallthrough */ }
  return null;
}

async function loadVnpayFromDb() {
  const pool = resolvePool();
  if (!pool) return null;
  try {
    const r = await pool.query(
      `SELECT key, value FROM site_settings WHERE key LIKE 'vnp_%'`
    );
    const cfg = {};
    (r.rows || []).forEach((row) => { cfg[row.key] = row.value; });
    return cfg;
  } catch (_) {
    return null;
  }
}

function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sorted[key] = obj[key];
  }
  return sorted;
}

function getConfig() {
  return new Promise(async (resolve) => {
    const dbCfg = await loadVnpayFromDb();
    const cfg = {
      vnp_TmnCode: process.env.VNP_TMN_CODE || (dbCfg && dbCfg.vnp_TmnCode) || '',
      vnp_HashSecret: process.env.VNP_HASH_SECRET || (dbCfg && dbCfg.vnp_HashSecret) || '',
      vnp_Url: process.env.VNP_URL || (dbCfg && dbCfg.vnp_Url) || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      vnp_ReturnUrl: process.env.VNP_RETURN_URL || 'http://localhost:4200/components/thanh-toan/vnpay-return.html',
    };
    resolve(cfg);
  });
}

function createPaymentUrl({ amount, orderId, orderDesc, bankCode, locale, ipAddr }) {
  return new Promise(async (resolve, reject) => {
    const cfg = await getConfig();
    if (!cfg.vnp_TmnCode || !cfg.vnp_HashSecret) {
      return reject(new Error('VNPay chưa được cấu hình. Cần set vnp_TmnCode, vnp_HashSecret trong .env hoặc site_settings.'));
    }

    const createDate = new Date();
    const yyyy = createDate.getFullYear();
    const MM = String(createDate.getMonth() + 1).padStart(2, '0');
    const dd = String(createDate.getDate()).padStart(2, '0');
    const HH = String(createDate.getHours()).padStart(2, '0');
    const mm = String(createDate.getMinutes()).padStart(2, '0');
    const ss = String(createDate.getSeconds()).padStart(2, '0');
    const createDateStr = `${yyyy}${MM}${dd}${HH}${mm}${ss}`;

    const vnpParams = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: cfg.vnp_TmnCode,
      vnp_Locale: locale || 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: String(orderId),
      vnp_OrderInfo: orderDesc || `Thanh toan don hang ${orderId}`,
      vnp_OrderType: 'other',
      vnp_Amount: Math.round(Number(amount || 0)) * 100,
      vnp_ReturnUrl: cfg.vnp_ReturnUrl,
      vnp_IpAddr: ipAddr || '127.0.0.1',
      vnp_CreateDate: createDateStr,
    };

    if (bankCode) {
      vnpParams.vnp_BankCode = bankCode;
    }

    const sortedParams = sortObject(vnpParams);
    const signData = querystring.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha512', cfg.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    sortedParams.vnp_SecureHash = signed;
    const paymentUrl = `${cfg.vnp_Url}?${querystring.stringify(sortedParams, { encode: false })}`;
    resolve({ paymentUrl, orderId, amount, vnp_TxnRef: vnpParams.vnp_TxnRef });
  });
}

function verifyReturnUrl(vnpParams) {
  return new Promise(async (resolve) => {
    const cfg = await getConfig();
    const secureHash = vnpParams.vnp_SecureHash;
    const params = { ...vnpParams };
    delete params.vnp_SecureHash;
    delete params.vnp_SecureHashType;

    const sortedParams = sortObject(params);
    const signData = querystring.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha512', cfg.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    resolve({
      isValid: secureHash === signed,
      responseCode: vnpParams.vnp_ResponseCode,
      transactionNo: vnpParams.vnp_TransactionNo,
      orderId: vnpParams.vnp_TxnRef,
      amount: vnpParams.vnp_Amount ? Number(vnpParams.vnp_Amount) / 100 : 0,
    });
  });
}

module.exports = { createPaymentUrl, verifyReturnUrl, getConfig };
