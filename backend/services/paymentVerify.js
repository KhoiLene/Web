// =============================================================================
// paymentVerify.js — Auto-verify thanh toán chuyển khoản
//
// Nguồn xác minh:
//   1) webhook_events (IPN từ VNPay hoặc webhook ngân hàng) chưa xử lý
//   2) transactions table có row khớp: order_id, amount >= final_price, status='success'
//
// Khi pass → update orders.payment_status='paid', status='payment_confirmed'
//           → trigger notifyOrderStatusChange(order, 'payment_received')
// =============================================================================

let _pool = null;
function pool() {
  if (_pool) return _pool;
  try {
    const server = require('../server.js');
    if (server && server.pool && typeof server.pool.query === 'function') {
      _pool = server.pool;
      return _pool;
    }
  } catch (_) { /* fallthrough */ }
  return null;
}

let _notify = null;
function notifier() {
  if (_notify) return _notify;
  try { _notify = require('./notifications'); } catch (_) { /* fallthrough */ }
  return _notify;
}

/**
 * Verify một order cụ thể. Trả { verified: bool, reason, source }
 */
async function verifyOrderPayment(orderId) {
  const p = pool();
  if (!p || !orderId) return { verified: false, reason: 'no pool or orderId' };

  // Lấy order hiện tại
  const oRes = await p.query(
    `SELECT id, status, payment_status, final_price, order_code, customer_id
     FROM orders WHERE id = $1`,
    [orderId]
  );
  if (!oRes.rowCount) return { verified: false, reason: 'order not found' };
  const order = oRes.rows[0];

  // Bỏ qua nếu đơn không còn chờ CK
  if (order.status !== 'awaiting_payment') {
    return { verified: false, reason: `order status = ${order.status} (not awaiting_payment)` };
  }
  if (order.payment_status === 'paid') {
    return { verified: false, reason: 'already paid' };
  }

  const finalPrice = Number(order.final_price || 0);

  // ─── Nguồn 1: webhook_events chưa xử lý ─────────────────────────────
  const wh = await p.query(
    `SELECT id, source, event_id, raw_payload FROM webhook_events
     WHERE order_id = $1 AND processed = FALSE
     ORDER BY received_at ASC LIMIT 5`,
    [orderId]
  );
  for (const ev of wh.rows) {
    if (eventMatchesOrder(ev, order, finalPrice)) {
      await markOrderPaid(orderId, ev.source, ev.event_id);
      await p.query(
        `UPDATE webhook_events SET processed = TRUE, processed_at = NOW() WHERE id = $1`,
        [ev.id]
      );
      return { verified: true, source: ev.source, event_id: ev.event_id };
    }
  }

  // ─── Nguồn 2: transactions table ────────────────────────────────────
  const tRes = await p.query(
    `SELECT id, type, amount, status, bank_ref, content, paid_at FROM transactions
     WHERE order_id = $1 AND status = 'success'
     ORDER BY paid_at DESC NULLS LAST, created_at DESC LIMIT 5`,
    [orderId]
  );
  for (const t of tRes.rows) {
    if (Number(t.amount || 0) >= finalPrice - 1000) {
      await markOrderPaid(orderId, 'transactions', t.bank_ref || String(t.id));
      return { verified: true, source: 'transactions', event_id: t.bank_ref || String(t.id) };
    }
  }

  return { verified: false, reason: 'no matching payment' };
}

function eventMatchesOrder(ev, order, finalPrice) {
  // Heuristic: nếu webhook có amount và content, kiểm tra khớp đơn.
  // VNPay IPN: vnp_Amount (VND x 100), vnp_TxnRef (order_code hoặc id)
  const payload = ev.raw_payload || {};
  const refStr = String(ev.event_id || '');

  // Match by order_code trong event_id hoặc payload
  if (refStr && String(order.order_code || '') && refStr === String(order.order_code)) {
    return true;
  }
  if (String(payload.order_code || '') === String(order.order_code || '')) {
    return true;
  }
  if (String(payload.order_id || '') === String(order.id || '')) {
    return true;
  }
  // VNPay: vnp_TxnRef có thể là TC-timestamp hoặc id
  if (String(payload.vnp_TxnRef || '') === String(order.id || '')) {
    return true;
  }
  // Match by amount (nếu có)
  const amt = Number(payload.amount || payload.vnp_Amount ? payload.vnp_Amount / 100 : payload.amount || 0);
  if (amt && amt >= finalPrice - 1000 && (payload.order_code || payload.order_id)) {
    return String(payload.order_code || payload.order_id) === String(order.order_code || order.id);
  }
  return false;
}

async function markOrderPaid(orderId, source, eventRef) {
  const p = pool();
  if (!p) return;

  await p.query(
    `UPDATE orders
     SET payment_status = 'paid',
         status = 'payment_confirmed',
         payment_confirmed_at = NOW(),
         payment_reference = COALESCE(NULLIF($2, ''), payment_reference),
         updated_at = NOW()
     WHERE id = $1 AND status = 'awaiting_payment'`,
    [orderId, String(eventRef || '').slice(0, 100)]
  );

  // Trigger notification (fire-and-forget)
  const notify = notifier();
  if (notify) {
    const oRes = await p.query(`SELECT * FROM orders WHERE id = $1`, [orderId]);
    if (oRes.rowCount) {
      notify.notifyOrderStatusChange(oRes.rows[0], 'payment_received')
        .catch((err) => console.error('[paymentVerify] notify failed:', err.message));
    }
  }
}

/**
 * Poller: tìm tất cả đơn awaiting_payment > 5 phút mà chưa paid → verify
 */
async function pollAwaitingPayments(limit = 50) {
  const p = pool();
  if (!p) return { scanned: 0, verified: 0 };
  const r = await p.query(
    `SELECT id FROM orders
     WHERE status = 'awaiting_payment'
       AND payment_status = 'pending'
       AND awaiting_payment_since < NOW() - INTERVAL '5 minutes'
     ORDER BY awaiting_payment_since ASC
     LIMIT $1`,
    [limit]
  );
  let verified = 0;
  for (const { id } of r.rows) {
    try {
      const v = await verifyOrderPayment(id);
      if (v.verified) verified++;
    } catch (e) {
      console.warn(`[paymentVerify] order ${id} failed:`, e.message);
    }
  }
  return { scanned: r.rows.length, verified };
}

/**
 * Lưu 1 webhook event (idempotent).
 * Trả { inserted, id }.
 */
async function recordWebhookEvent({ source, event_id, order_id, raw_payload }) {
  const p = pool();
  if (!p) return { inserted: false, reason: 'no pool' };
  if (!source) return { inserted: false, reason: 'no source' };
  // Dedup: nếu đã có event_id + source thì skip
  if (event_id) {
    const dup = await p.query(
      `SELECT id FROM webhook_events WHERE source = $1 AND event_id = $2 LIMIT 1`,
      [source, String(event_id)]
    );
    if (dup.rowCount) {
      return { inserted: false, id: dup.rows[0].id, reason: 'duplicate' };
    }
  }
  const r = await p.query(
    `INSERT INTO webhook_events (source, event_id, order_id, raw_payload, processed)
     VALUES ($1, $2, $3, $4, FALSE)
     RETURNING id`,
    [
      String(source),
      event_id ? String(event_id) : null,
      order_id || null,
      raw_payload ? JSON.stringify(raw_payload) : null,
    ]
  );
  return { inserted: true, id: r.rows[0].id };
}

module.exports = {
  verifyOrderPayment,
  pollAwaitingPayments,
  recordWebhookEvent,
};