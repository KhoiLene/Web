// =====================================================================
// DonHangUtils.jsx — Hằng số, helpers và OrderDetailModal dùng chung
// cho 3 trang: AllOrders / DraftOrders / IncompleteOrders
// =====================================================================

import React, { useEffect, useState } from "react";
import { supabase } from "../../api";
import { printSingleOrder } from "./printOrder";
import {
  createJTOrder,
  cancelJTOrder,
  traceJTOrder,
  printJTLabel,
  formatJTStatus,
  copyToClipboard,
} from "./jtHelpers";

export const fmtVND = (n) => Number(n || 0).toLocaleString("vi-VN") + "đ";
export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString("vi-VN") : "—");

// ─── Map status → label + màu ────────────────────────────────────────
export const STATUS_META = {
  pending:    { label: "Chờ xác nhận", color: "#a16207", bg: "#fef3c7" },
  confirmed:  { label: "Đã xác nhận",  color: "#1d4ed8", bg: "#dbeafe" },
  shipping:   { label: "Đang giao",    color: "#7c3aed", bg: "#ede9fe" },
  done:       { label: "Hoàn tất",     color: "#15803d", bg: "#dcfce7" },
  cancelled:  { label: "Đã huỷ",       color: "#b91c1c", bg: "#fee2e2" },
};

export const PAYMENT_META = {
  cod:  { label: "COD",   icon: "fa-money-bill-wave", color: "#f59e0b" },
  vnpay:{ label: "VNPay", icon: "fa-credit-card",     color: "#1d4ed8" },
  momo: { label: "MoMo",  icon: "fa-mobile-screen",   color: "#a82e8f" },
};

// ─── Hàm đổi trạng thái (dùng chung) ────────────────────────────────
export async function changeOrderStatus(order, newStatus) {
  if (order.status === newStatus) return null;
  if (newStatus === "cancelled" && !window.confirm(`Huỷ đơn "${order.order_code}"?`)) {
    return null;
  }
  const { error: e2 } = await supabase
    .from("orders")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", order.id);
  if (e2) throw new Error(e2.message);
  return newStatus;
}

// ════════════════════════════════════════════════════════════════════════
// MODAL: Chi tiết đơn hàng — dùng chung cho 3 trang
// ════════════════════════════════════════════════════════════════════════
export function OrderDetailModal({ order, onClose, onChangeStatus }) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: e2 } = await supabase
          .from("order_items")
          .select("id, product_id, product_name, product_sku, image_url, quantity, unit_price, discount, subtotal")
          .eq("order_id", order.id)
          .order("id", { ascending: true });
        if (e2) throw new Error(e2.message);
        if (!cancelled) setItems(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [order.id]);

  const sm = STATUS_META[order.status] || STATUS_META.pending;
  const pm = PAYMENT_META[order.payment_method] || PAYMENT_META.cod;

  return (
    <div className="dh-modal-overlay" onClick={onClose}>
      <div className="dh-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dh-modal-header">
          <div>
            <h2>Đơn hàng {order.order_code || `#${order.id}`}</h2>
            <p>Tạo lúc {fmtDate(order.created_at)}</p>
          </div>
          <button className="dh-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="dh-modal-body">
          {/* Trạng thái + nút đổi */}
          <div className="dh-status-bar">
            <div>
              <div className="dh-status-label">Trạng thái</div>
              <span className="dh-status-badge lg" style={{ background: sm.bg, color: sm.color }}>
                {sm.label}
              </span>
            </div>
            <div className="dh-status-actions">
              <button
                className="dh-btn"
                onClick={() => printSingleOrder(order)}
                title="In phiếu đơn hàng này"
              >
                <i className="fas fa-print"></i> In phiếu
              </button>
              {order.status === "pending" && (
                <>
                  <button className="dh-btn primary" onClick={() => onChangeStatus("confirmed")}>
                    <i className="fas fa-check"></i> Xác nhận
                  </button>
                  <button className="dh-btn danger" onClick={() => onChangeStatus("cancelled")}>
                    <i className="fas fa-ban"></i> Huỷ
                  </button>
                </>
              )}
              {order.status === "confirmed" && (
                <button className="dh-btn primary" onClick={() => onChangeStatus("shipping")}>
                  <i className="fas fa-truck"></i> Chuyển giao hàng
                </button>
              )}
              {order.status === "shipping" && (
                <button className="dh-btn success" onClick={() => onChangeStatus("done")}>
                  <i className="fas fa-circle-check"></i> Đã nhận hàng (Hoàn tất)
                </button>
              )}
            </div>
          </div>

          {/* Thông tin KH + giao hàng */}
          <div className="dh-info-grid">
            <div className="dh-info-card">
              <div className="dh-info-label">Khách hàng</div>
              <div className="dh-info-value">{order.customer_name || "—"}</div>
              <div className="dh-info-meta">
                {order.customer_phone && <span><i className="fas fa-phone"></i> {order.customer_phone}</span>}
                {order.customer_email && <span><i className="fas fa-envelope"></i> {order.customer_email}</span>}
              </div>
            </div>
            <div className="dh-info-card">
              <div className="dh-info-label">Địa chỉ giao</div>
              <div className="dh-info-value">{order.address || "—"}</div>
              <div className="dh-info-meta">
                {order.ward && <span>{order.ward}, </span>}
                {order.district && <span>{order.district}, </span>}
                {order.province && <span>{order.province}</span>}
              </div>
            </div>
            <div className="dh-info-card">
              <div className="dh-info-label">Thanh toán</div>
              <div className="dh-info-value">
                <i className={`fas ${pm.icon}`} style={{ color: pm.color }}></i> {pm.label}
              </div>
              <div className="dh-info-meta">
                Trạng thái: <strong>{order.payment_status}</strong>
              </div>
            </div>
            <div className="dh-info-card">
              <div className="dh-info-label">Số lượng</div>
              <div className="dh-info-value">{order.item_count} loại / {order.total_qty} sản phẩm</div>
            </div>
          </div>

          {/* Tổng tiền */}
          <div className="dh-total-box">
            <div className="dh-total-row">
              <span>Tổng tiền hàng</span>
              <strong>{fmtVND(order.total_price)}</strong>
            </div>
            <div className="dh-total-row">
              <span>Phí vận chuyển</span>
              <strong>{fmtVND(order.shipping_fee)}</strong>
            </div>
            {order.discount_amount > 0 && (
              <div className="dh-total-row discount">
                <span>Giảm giá</span>
                <strong>−{fmtVND(order.discount_amount)}</strong>
              </div>
            )}
            <div className="dh-total-row final">
              <span>Khách phải trả</span>
              <strong style={{ color: "#d70018" }}>{fmtVND(order.final_price)}</strong>
            </div>
          </div>

          {/* ═══════ J&T Express Panel ═══════ */}
          <JTPanel order={order} onUpdate={onChangeStatus} />

          {/* Items */}
          <h3 className="dh-section-title">
            <i className="fas fa-list"></i> Sản phẩm ({items.length})
          </h3>
          {loading ? (
            <div className="dh-loading">⌛ Đang tải sản phẩm...</div>
          ) : items.length === 0 ? (
            <div className="dh-empty-state">Không có sản phẩm nào trong đơn.</div>
          ) : (
            <table className="dh-modal-table">
              <thead>
                <tr>
                  <th width="60px">Ảnh</th>
                  <th>Sản phẩm</th>
                  <th width="80px" style={{ textAlign: "right" }}>SL</th>
                  <th width="120px" style={{ textAlign: "right" }}>Đơn giá</th>
                  <th width="140px" style={{ textAlign: "right" }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td>
                      {it.image_url ? (
                        <img src={it.image_url} alt={it.product_name} className="dh-item-thumb" />
                      ) : (
                        <div className="dh-thumb-placeholder"><i className="far fa-image"></i></div>
                      )}
                    </td>
                    <td>
                      <div className="dh-item-name">{it.product_name}</div>
                      {it.product_sku && <div className="dh-item-sku">SKU: {it.product_sku}</div>}
                    </td>
                    <td style={{ textAlign: "right" }}>×{it.quantity}</td>
                    <td style={{ textAlign: "right" }}>{fmtVND(it.unit_price)}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "#d70018" }}>
                      {fmtVND(it.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {order.note && (
            <div className="dh-note">
              <strong>Ghi chú:</strong> {order.note}
            </div>
          )}

          {order.cod_delivered_success && (
            <div className="dh-cod-success">
              <i className="fas fa-circle-check"></i>
              <div>
                <strong>Đơn COD đã nhận hàng thành công</strong>
                <p>Tổng tiền đã được cộng vào LTV khách hàng (xem trang Khách hàng thân thiết).</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// J&T Panel — Sub-component cho OrderDetailModal
// ════════════════════════════════════════════════════════════════════
function JTPanel({ order, onUpdate }) {
  const [busy, setBusy]   = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Đã có billCode → hiển thị panel xanh + actions
  if (order.jt_bill_code) {
    const meta = formatJTStatus(order.jt_status);

    const handleCancel = async () => {
      const reason = window.prompt("Lý do huỷ vận đơn J&T:", "Khách hàng yêu cầu huỷ");
      if (!reason) return;
      setBusy(true);
      try {
        await cancelJTOrder(order, reason);
        showToast("✅ Đã huỷ vận đơn J&T");
        onUpdate?.("shipping"); // trigger refresh
      } catch (err) {
        showToast("❌ " + err.message, "error");
      } finally {
        setBusy(false);
      }
    };

    const handleTrace = async () => {
      setBusy(true);
      try {
        const res = await traceJTOrder(order);
        const m = formatJTStatus(res.status);
        showToast(`📦 Trạng thái: ${m.label}`);
        onUpdate?.(order.status);
      } catch (err) {
        showToast("❌ " + err.message, "error");
      } finally {
        setBusy(false);
      }
    };

    const handlePrint = async () => {
      setBusy(true);
      try {
        await printJTLabel(order);
      } catch (err) {
        showToast("❌ " + err.message, "error");
      } finally {
        setBusy(false);
      }
    };

    const handleCopy = async () => {
      const ok = await copyToClipboard(order.jt_bill_code);
      showToast(ok ? "📋 Đã copy billCode" : "📋 Copy xong (fallback)", "success");
    };

    return (
      <div className="dh-jt-panel">
        <div className="dh-jt-panel-head">
          <h3>
            <i className="fas fa-truck"></i> Vận đơn J&T Express
          </h3>
          <span
            className="dh-jt-status-pill"
            style={{ background: meta.bg, color: meta.color }}
          >
            <i className={`fas ${meta.icon}`}></i> {meta.label}
          </span>
        </div>

        <div className="dh-jt-rows">
          <div className="dh-jt-row">
            <span className="dh-jt-label">Mã vận đơn:</span>
            <span className="dh-jt-value">
              <code className="dh-jt-code">{order.jt_bill_code}</code>
              <button className="dh-jt-icon-btn" onClick={handleCopy} title="Copy">
                <i className="fas fa-copy"></i>
              </button>
            </span>
          </div>

          {order.jt_waybill_no && order.jt_waybill_no !== order.jt_bill_code && (
            <div className="dh-jt-row">
              <span className="dh-jt-label">Waybill No:</span>
              <span className="dh-jt-value"><code>{order.jt_waybill_no}</code></span>
            </div>
          )}

          {order.jt_weight_grams && (
            <div className="dh-jt-row">
              <span className="dh-jt-label">Trọng lượng:</span>
              <span className="dh-jt-value">{order.jt_weight_grams}g</span>
            </div>
          )}

          {order.jt_shipping_fee > 0 && (
            <div className="dh-jt-row">
              <span className="dh-jt-label">Phí J&T:</span>
              <span className="dh-jt-value">{fmtVND(order.jt_shipping_fee)}</span>
            </div>
          )}

          {order.jt_service_code && (
            <div className="dh-jt-row">
              <span className="dh-jt-label">Dịch vụ:</span>
              <span className="dh-jt-value">
                {order.jt_service_code === "01" ? "EZ (Tiết kiệm)" :
                 order.jt_service_code === "02" ? "STD (Tiêu chuẩn)" :
                 order.jt_service_code === "03" ? "FAST (Nhanh)" :
                 order.jt_service_code}
              </span>
            </div>
          )}

          {order.jt_tracking_url && (
            <div className="dh-jt-row">
              <span className="dh-jt-label">Tracking:</span>
              <span className="dh-jt-value">
                <a href={order.jt_tracking_url} target="_blank" rel="noreferrer">
                  {order.jt_tracking_url.length > 50
                    ? order.jt_tracking_url.slice(0, 50) + "…"
                    : order.jt_tracking_url}
                </a>
              </span>
            </div>
          )}

          {order.jt_cancel_reason && (
            <div className="dh-jt-row">
              <span className="dh-jt-label">Lý do huỷ:</span>
              <span className="dh-jt-value" style={{ color: "#b91c1c" }}>
                {order.jt_cancel_reason}
              </span>
            </div>
          )}
        </div>

        <div className="dh-jt-actions">
          <button className="dh-btn" onClick={handleTrace} disabled={busy}>
            <i className="fas fa-magnifying-glass"></i> Tra cứu
          </button>
          <button className="dh-btn" onClick={handlePrint} disabled={busy}>
            <i className="fas fa-print"></i> In nhãn J&T
          </button>
          {order.jt_status !== "cancelled" && order.jt_status !== "delivered" && (
            <button className="dh-btn danger" onClick={handleCancel} disabled={busy}>
              <i className="fas fa-ban"></i> Huỷ vận đơn
            </button>
          )}
        </div>

        {toast && (
          <div className={`dh-jt-toast dh-jt-toast-${toast.type}`}>{toast.text}</div>
        )}
      </div>
    );
  }

  // Chưa có billCode nhưng đơn đã confirmed/shipping → hiện nút tạo
  if (order.status === "confirmed" || order.status === "shipping") {
    const handleCreate = async () => {
      setBusy(true);
      try {
        const res = await createJTOrder(order);
        showToast(`✅ Đã tạo vận đơn ${res.billCode}`);
        onUpdate?.(order.status);
      } catch (err) {
        showToast("❌ " + err.message, "error");
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="dh-jt-panel dh-jt-panel-empty">
        <div className="dh-jt-panel-head">
          <h3>
            <i className="fas fa-truck"></i> Vận đơn J&T Express
          </h3>
          <span className="dh-jt-status-pill" style={{ background: "#f3f4f6", color: "#6b7280" }}>
            <i className="fas fa-circle-question"></i> Chưa gửi J&T
          </span>
        </div>
        <p className="dh-jt-empty-text">
          Đơn hàng chưa có mã vận đơn J&T. Bấm nút bên dưới để tạo vận đơn tự động
          (dùng thông tin người nhận + trọng lượng ước tính từ sản phẩm).
        </p>
        <div className="dh-jt-actions">
          <button
            className="dh-btn primary"
            onClick={handleCreate}
            disabled={busy}
          >
            {busy ? (
              <><i className="fas fa-spinner fa-spin"></i> Đang tạo vận đơn…</>
            ) : (
              <><i className="fas fa-truck"></i> Tạo vận đơn J&T</>
            )}
          </button>
          <span className="dh-jt-hint">
            <i className="fas fa-info-circle"></i> Cần cấu hình API key tại{" "}
            <a href="#" onClick={(e) => { e.preventDefault(); alert("Vào sidebar → Cấu hình → J&T Express"); }}>
              Cấu hình
            </a>
          </span>
        </div>
        {toast && (
          <div className={`dh-jt-toast dh-jt-toast-${toast.type}`}>{toast.text}</div>
        )}
      </div>
    );
  }

  // Đơn chưa confirmed → không hiện panel
  return null;
}
