// =============================================================================
// notifications.js — Service gửi thông báo đơn hàng qua Email + Zalo
//
// Reuse:
//   - services/email.js → sendEmail(mailOptions)
//   - services/zalo.js  → sendZaloText(phone, message)
//
// Mỗi lần gửi sẽ ghi vào bảng `notification_log` để audit + retry.
// Cập nhật cột orders.notify_email_status / notify_zalo_status.
// =============================================================================

const emailService = require('./email');
const zaloService   = require('./zalo');

// Lấy pool theo kiểu lazy để tránh require cycle với server.js
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

const fmtVND = (n) => {
  const x = Number(n || 0);
  return x.toLocaleString('vi-VN') + '₫';
};

// ─── Templates ───────────────────────────────────────────────────────────────
// Mỗi template có subject/text/html cho email + text ngắn cho Zalo
const TEMPLATES = {
  order_created: {
    email: {
      subject: (o) => `[Techtra] Đặt hàng thành công #${o.order_code}`,
      html: (o) => `
        <p>Xin chào <strong>${esc(o.customer_name || o.receiver_name || 'Quý khách')}</strong>,</p>
        <p>Đơn hàng <strong>#${o.order_code}</strong> của bạn đã được ghi nhận với tổng tiền
           <strong style="color:#d70018">${fmtVND(o.final_price)}</strong>.</p>
        <p>Chúng tôi sẽ liên hệ xác nhận trong ít phút nữa.</p>
        <p style="color:#6b7280;font-size:12px">Techtra — Cảm ơn bạn đã mua sắm.</p>
      `,
    },
    zalo: (o) =>
      `Đặt hàng thành công #${o.order_code}. Tổng: ${fmtVND(o.final_price)}. Chúng tôi sẽ xác nhận sớm.`,
  },
  payment_received: {
    email: {
      subject: (o) => `[Techtra] Đã nhận thanh toán #${o.order_code}`,
      html: (o) => `
        <p>Xin chào <strong>${esc(o.customer_name || o.receiver_name)}</strong>,</p>
        <p>Chúng tôi đã nhận được thanh toán cho đơn <strong>#${o.order_code}</strong>
           (${fmtVND(o.final_price)}). Đơn đang được xử lý để giao cho bạn.</p>
        <p>Trạng thái: <strong>Đã nhận tiền</strong></p>
      `,
    },
    zalo: (o) =>
      `Đã nhận thanh toán #${o.order_code} (${fmtVND(o.final_price)}). Đơn đang xử lý.`,
  },
  order_confirmed: {
    email: {
      subject: (o) => `[Techtra] Đơn #${o.order_code} đã xác nhận`,
      html: (o) => `
        <p>Đơn <strong>#${o.order_code}</strong> đã được xác nhận.</p>
        <p>Sản phẩm sẽ được chuẩn bị và bàn giao cho đơn vị vận chuyển trong 24h tới.</p>
      `,
    },
    zalo: (o) =>
      `Đơn #${o.order_code} đã xác nhận. Đơn vị vận chuyển sẽ liên hệ bạn trong ít giờ tới.`,
  },
  order_shipping: {
    email: {
      subject: (o) => `[Techtra] Đơn #${o.order_code} đang giao`,
      html: (o) => `
        <p>Đơn <strong>#${o.order_code}</strong> đang được giao tới bạn.</p>
        ${o.jt_bill_code
          ? `<p>Mã vận đơn J&T: <strong>${esc(o.jt_bill_code)}</strong></p>
             <p>Bạn có thể tra cứu trên <a href="${esc(o.jt_tracking_url || '#')}">jt-express.vn</a>.</p>`
          : ''}
        <p>Vui lòng giữ điện thoại để shipper liên hệ.</p>
      `,
    },
    zalo: (o) =>
      `Đơn #${o.order_code} đang giao${o.jt_bill_code ? ' — Mã J&T: ' + o.jt_bill_code : ''}. Vui lòng giữ điện thoại.`,
  },
  order_delivered: {
    email: {
      subject: (o) => `[Techtra] Đơn #${o.order_code} đã giao thành công`,
      html: (o) => `
        <p>Đơn <strong>#${o.order_code}</strong> đã được giao thành công.</p>
        <p>Cảm ơn bạn đã mua sắm tại Techtra. Hẹn gặp lại!</p>
      `,
    },
    zalo: (o) => `Đơn #${o.order_code} đã giao thành công. Cảm ơn bạn đã mua sắm tại Techtra.`,
  },
  order_cancelled: {
    email: {
      subject: (o) => `[Techtra] Đơn #${o.order_code} đã huỷ`,
      html: (o) => `
        <p>Đơn <strong>#${o.order_code}</strong> đã được huỷ.</p>
        ${o.note ? `<p>Lý do: ${esc(o.note)}</p>` : ''}
        <p>Nếu bạn đã thanh toán, chúng tôi sẽ hoàn tiền trong 3-5 ngày làm việc.</p>
      `,
    },
    zalo: (o) => `Đơn #${o.order_code} đã được huỷ. Nếu có thắc mắc vui lòng liên hệ CSKH.`,
  },
};

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// ─── Ghi log notification ────────────────────────────────────────────────────
async function logNotification({ orderId, channel, template, recipient, status, error, payload }) {
  const p = pool();
  if (!p) return null;
  try {
    const r = await p.query(
      `INSERT INTO notification_log (order_id, channel, template, recipient, status, error_message, payload, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $5 = 'sent' THEN NOW() ELSE NULL END)
       RETURNING id`,
      [
        orderId || null,
        channel,
        template,
        recipient || null,
        status,
        error ? String(error).slice(0, 1000) : null,
        payload ? JSON.stringify(payload) : null,
      ]
    );
    return r.rows[0]?.id || null;
  } catch (e) {
    console.warn('[notifications] log failed:', e.message);
    return null;
  }
}

// ─── Update orders.notify_*_status ───────────────────────────────────────────
async function updateOrderNotifyStatus(orderId, channel, status, error) {
  const p = pool();
  if (!p || !orderId) return;
  const col = channel === 'email' ? 'notify_email_status' : 'notify_zalo_status';
  try {
    await p.query(
      `UPDATE orders SET ${col} = $2, notify_last_error = $3, updated_at = NOW() WHERE id = $1`,
      [orderId, status, error ? String(error).slice(0, 500) : null]
    );
  } catch (e) {
    console.warn('[notifications] update orders failed:', e.message);
  }
}

// ─── Send email cho đơn ──────────────────────────────────────────────────────
async function sendOrderEmail(order, templateName) {
  const tpl = TEMPLATES[templateName];
  if (!tpl) return { ok: false, error: 'unknown template' };

  const recipient = order.receiver_email || order.customer_email;
  if (!recipient) {
    await logNotification({
      orderId: order.id, channel: 'email', template: templateName,
      recipient: null, status: 'failed',
      error: 'no recipient email', payload: { template: templateName },
    });
    await updateOrderNotifyStatus(order.id, 'email', 'failed', 'no email');
    return { ok: false, error: 'no email' };
  }

  try {
    await emailService.sendEmail({
      to: recipient,
      subject: tpl.email.subject(order),
      html: tpl.email.html(order),
    });
    await logNotification({
      orderId: order.id, channel: 'email', template: templateName,
      recipient, status: 'sent', payload: { template: templateName },
    });
    await updateOrderNotifyStatus(order.id, 'email', 'sent', null);
    return { ok: true };
  } catch (err) {
    await logNotification({
      orderId: order.id, channel: 'email', template: templateName,
      recipient, status: 'failed', error: err.message,
      payload: { template: templateName },
    });
    await updateOrderNotifyStatus(order.id, 'email', 'failed', err.message);
    return { ok: false, error: err.message };
  }
}

// ─── Send Zalo cho đơn ───────────────────────────────────────────────────────
async function sendOrderZalo(order, templateName) {
  const tpl = TEMPLATES[templateName];
  if (!tpl) return { ok: false, error: 'unknown template' };

  const recipient = order.receiver_phone || order.customer_phone;
  if (!recipient) {
    await logNotification({
      orderId: order.id, channel: 'zalo', template: templateName,
      recipient: null, status: 'failed',
      error: 'no recipient phone', payload: { template: templateName },
    });
    await updateOrderNotifyStatus(order.id, 'zalo', 'failed', 'no phone');
    return { ok: false, error: 'no phone' };
  }

  try {
    await zaloService.sendZaloText(recipient, tpl.zalo(order));
    await logNotification({
      orderId: order.id, channel: 'zalo', template: templateName,
      recipient, status: 'sent', payload: { template: templateName },
    });
    await updateOrderNotifyStatus(order.id, 'zalo', 'sent', null);
    return { ok: true };
  } catch (err) {
    await logNotification({
      orderId: order.id, channel: 'zalo', template: templateName,
      recipient, status: 'failed', error: err.message,
      payload: { template: templateName },
    });
    await updateOrderNotifyStatus(order.id, 'zalo', 'failed', err.message);
    return { ok: false, error: err.message };
  }
}

// ─── Main entry: notify khi đổi status ──────────────────────────────────────
async function notifyOrderStatusChange(order, event) {
  if (!order || !event) return;
  const results = await Promise.allSettled([
    sendOrderEmail(order, event),
    sendOrderZalo(order, event),
  ]);
  return {
    email: results[0].status === 'fulfilled' ? results[0].value : { ok: false, error: results[0].reason?.message },
    zalo:  results[1].status === 'fulfilled' ? results[1].value : { ok: false, error: results[1].reason?.message },
  };
}

// ─── Retry failed notifications ──────────────────────────────────────────────
async function retryFailed(limit = 50) {
  const p = pool();
  if (!p) return { processed: 0, sent: 0, failed: 0 };
  const r = await p.query(
    `SELECT nl.*, o.* FROM notification_log nl
     JOIN orders o ON o.id = nl.order_id
     WHERE nl.status = 'failed'
       AND nl.created_at > NOW() - INTERVAL '7 days'
       AND nl.id IN (
         SELECT MAX(id) FROM notification_log
         WHERE status = 'failed' GROUP BY order_id, channel, template
       )
     ORDER BY nl.created_at ASC
     LIMIT $1`,
    [limit]
  );
  let sent = 0, failed = 0;
  for (const row of r.rows) {
    let res;
    if (row.channel === 'email') res = await sendOrderEmail(row, row.template);
    else if (row.channel === 'zalo') res = await sendOrderZalo(row, row.template);
    if (res?.ok) sent++; else failed++;
  }
  return { processed: r.rows.length, sent, failed };
}

module.exports = {
  sendOrderEmail,
  sendOrderZalo,
  notifyOrderStatusChange,
  retryFailed,
  TEMPLATES,
};
