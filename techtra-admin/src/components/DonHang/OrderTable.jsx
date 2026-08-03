// =====================================================================
// OrderTable.jsx — Bảng đơn hàng + filter + search dùng chung cho 3 trang
// Nhận props:
//   - orders, loading, error
//   - filters: [{ key, label, icon, status }]
//   - title, desc
//   - onReload
//   - onChangeStatus(order, newStatus)
//   - selectable: cho phép chọn nhiều + bulk action
// =====================================================================

import React, { useState, useMemo, useCallback } from "react";
import { ordersApi } from "../../api";
import { STATUS_META, PAYMENT_META, fmtVND, fmtDate, changeOrderStatus, OrderDetailModal } from "./DonHangUtils";
import { createJTOrder, traceJTOrder, printJTLabel, formatJTStatus } from "./jtHelpers";

export default function OrderTable({
  orders, loading, error, filters, title, desc, onReload, onChangeStatus,
  selectable = false,
  onBulkConfirm,  // (selectedOrders) => void — parent xử lý riêng
  onBulkCreateJT, // (selectedOrders) => void — bulk tạo vận đơn J&T
  onOrderUpdate,  // (order) => void — gọi sau khi tạo/huỷ J&T 1 đơn
}) {
  const [searchText, setSearchText]   = useState("");
  const [statusFilter, setStatusFilter] = useState(filters[0]?.key || "all");
  const [viewing, setViewing]         = useState(null);
  const [updatingId, setUpdatingId]   = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkBusy, setBulkBusy]       = useState(false);
  const [jtBusyId, setJtBusyId]       = useState(null); // đang xử lý JT cho order nào
  const [jtToast, setJtToast]         = useState(null); // { type, text }

  const currentFilter = filters.find((f) => f.key === statusFilter) || filters[0];

  const visible = useMemo(() => {
    const q = searchText.toLowerCase();
    return orders.filter((o) => {
      if (currentFilter?.status && o.status !== currentFilter.status) return false;
      if (q) {
        const hay = `${o.order_code || ""} ${o.customer_name || ""} ${o.customer_phone || ""} ${o.customer_email || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, currentFilter, searchText]);

  // ─── Chọn nhiều ──────────────────────────────────────────────────
  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allSelected = visible.every((o) => prev.has(o.id));
      if (allSelected) return new Set();
      return new Set(visible.map((o) => o.id));
    });
  }, [visible]);

  const selectedOrders = useMemo(
    () => orders.filter((o) => selectedIds.has(o.id)),
    [orders, selectedIds]
  );

  const clearSelection = () => setSelectedIds(new Set());

  // Bulk: chuyển status cho tất cả đơn đã chọn
  const handleBulkStatus = useCallback(async (newStatus) => {
    if (!selectedIds.size) return;
    if (newStatus === "cancelled" && !window.confirm(`Huỷ ${selectedIds.size} đơn đã chọn?`)) return;
    setBulkBusy(true);
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await ordersApi.update(id, { status: newStatus });
      }
      onChangeStatus?.(null, newStatus, ids);
      clearSelection();
    } catch (err) {
      alert("Lỗi: " + err.message);
    } finally {
      setBulkBusy(false);
    }
  }, [selectedIds, onChangeStatus]);

  const allChecked = visible.length > 0 && visible.every((o) => selectedIds.has(o.id));
  const someChecked = visible.some((o) => selectedIds.has(o.id));

  const filterCounts = useMemo(() => {
    const c = {};
    filters.forEach((f) => {
      c[f.key] = f.status
        ? orders.filter((o) => o.status === f.status).length
        : orders.length;
    });
    return c;
  }, [orders, filters]);

  const handleStatus = async (order, newStatus) => {
    setUpdatingId(order.id);
    try {
      const updated = await changeOrderStatus(order, newStatus);
      if (updated) onChangeStatus?.(order, updated);
    } catch (err) {
      alert("Lỗi: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // ─── Manual verify CK: awaiting_payment → payment_confirmed ─────────
  const handleVerifyPayment = useCallback(async (order) => {
    if (!window.confirm(
      `Xác nhận đã nhận tiền cho đơn "${order.order_code || '#' + order.id}"?\n\n` +
      `Đơn sẽ chuyển sang "Đã nhận tiền" và gửi thông báo Email + Zalo cho khách.`
    )) return;
    setUpdatingId(order.id);
    try {
      const updated = await ordersApi.verifyPayment(order.id);
      onChangeStatus?.(order, updated?.status || 'payment_confirmed');
      onReload?.();
      alert("✅ Đã xác nhận nhận tiền. Thông báo đang được gửi.");
    } catch (err) {
      alert("❌ " + err.message);
    } finally {
      setUpdatingId(null);
    }
  }, [onChangeStatus, onReload]);

  // ─── J&T: tạo vận đơn cho 1 đơn ─────────────────────────────────
  const handleCreateJT = useCallback(async (order) => {
    if (!window.confirm(`Tạo vận đơn J&T cho đơn "${order.order_code || "#" + order.id}"?`)) return;
    setJtBusyId(order.id);
    setJtToast(null);
    try {
      const res = await createJTOrder(order);
      setJtToast({ type: "success", text: `✅ Đã tạo vận đơn J&T ${res.billCode}` });
      onOrderUpdate?.(order);
      onReload?.();
    } catch (err) {
      setJtToast({ type: "error", text: "❌ " + err.message });
    } finally {
      setJtBusyId(null);
      setTimeout(() => setJtToast(null), 4000);
    }
  }, [onReload, onOrderUpdate]);

  // ─── J&T: tra cứu trạng thái ───────────────────────────────────
  const handleTraceJT = useCallback(async (order) => {
    setJtBusyId(order.id);
    setJtToast(null);
    try {
      const res = await traceJTOrder(order);
      const meta = formatJTStatus(res.status);
      setJtToast({ type: "success", text: `📦 ${order.order_code}: ${meta.label}` });
      onReload?.();
    } catch (err) {
      setJtToast({ type: "error", text: "❌ " + err.message });
    } finally {
      setJtBusyId(null);
      setTimeout(() => setJtToast(null), 4000);
    }
  }, [onReload]);

  // ─── J&T: in nhãn ──────────────────────────────────────────────
  const handlePrintJT = useCallback(async (order) => {
    setJtBusyId(order.id);
    try {
      await printJTLabel(order);
    } catch (err) {
      alert("❌ " + err.message);
    } finally {
      setJtBusyId(null);
    }
  }, []);

  return (
    <div className="dh-wrapper">
      {/* ─── HEADER ────────────────────────────────────────────────── */}
      <div className="dh-header">
        <div>
          <h1>{title}</h1>
          {desc && <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>{desc}</p>}
        </div>
        <div className="dh-header-actions">
          <button className="btn-secondary" onClick={onReload} disabled={loading}>
            <i className="fas fa-rotate" /> Tải lại
          </button>
        </div>
      </div>

      {error && <div className="dh-error">⚠️ {error} <button onClick={onReload}>Thử lại</button></div>}

      {/* ─── TABS LỌC ──────────────────────────────────────────────── */}
      <div className="dh-filter-tabs">
        {filters.map((f) => (
          <button
            key={f.key}
            className={`dh-tab-btn ${statusFilter === f.key ? "active" : ""}`}
            onClick={() => setStatusFilter(f.key)}
          >
            <i className={`fas ${f.icon}`}></i>
            <span>{f.label}</span>
            <span className="dh-tab-count">{filterCounts[f.key] || 0}</span>
          </button>
        ))}
      </div>

      {/* ─── SEARCH + BULK ACTION ─────────────────────────────────── */}
      <div className="dh-search-row">
        <div className="dh-search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Tìm theo mã đơn, tên KH, SĐT, email..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          {searchText && (
            <button className="dh-search-clear" onClick={() => setSearchText("")} title="Xóa">×</button>
          )}
        </div>
        <div className="dh-summary">
          {loading
            ? "Đang tải..."
            : `${visible.length} đơn${searchText ? ` (lọc từ ${orders.length})` : ""}`}
        </div>
      </div>

      {/* ─── THANH BULK ACTION ────────────────────────────────────── */}
      {selectable && selectedIds.size > 0 && (
        <div className="dh-bulk-bar">
          <div className="dh-bulk-info">
            <i className="fas fa-check-circle"></i>
            Đã chọn <strong>{selectedIds.size}</strong> đơn
          </div>
          <div className="dh-bulk-actions">
            {onBulkConfirm && (
              <button
                className="dh-bulk-btn primary"
                onClick={() => onBulkConfirm(selectedOrders)}
                disabled={bulkBusy}
              >
                <i className="fas fa-check"></i> Xác nhận &amp; In phiếu
              </button>
            )}
            {onBulkCreateJT && (
              <button
                className="dh-bulk-btn"
                onClick={() => onBulkCreateJT(selectedOrders)}
                disabled={bulkBusy}
                title="Tạo vận đơn J&T cho các đơn đã chọn (chỉ đơn đã confirmed)"
              >
                <i className="fas fa-truck-fast"></i> Tạo vận đơn J&T
              </button>
            )}
            <button
              className="dh-bulk-btn"
              onClick={() => handleBulkStatus("confirmed")}
              disabled={bulkBusy}
            >
              <i className="fas fa-check"></i> Chỉ xác nhận
            </button>
            <button
              className="dh-bulk-btn danger"
              onClick={() => handleBulkStatus("cancelled")}
              disabled={bulkBusy}
            >
              <i className="fas fa-ban"></i> Huỷ
            </button>
            <button
              className="dh-bulk-btn ghost"
              onClick={clearSelection}
              disabled={bulkBusy}
            >
              <i className="fas fa-xmark"></i> Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* ─── TOAST JT ─────────────────────────────────────────── */}
      {jtToast && (
        <div className={`dh-jt-toast dh-jt-toast-${jtToast.type}`}>
          {jtToast.text}
        </div>
      )}

      {/* ─── BẢNG ──────────────────────────────────────────────────── */}
      <div className="dh-table-responsive">
        <table className="dh-table">
          <thead>
            <tr>
              {selectable && (
                <th width="40px" style={{ textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                    onChange={toggleSelectAll}
                    title="Chọn tất cả"
                  />
                </th>
              )}
              <th>Mã đơn</th>
              <th>Khách hàng</th>
              <th>Thanh toán</th>
              <th width="80px" style={{ textAlign: "right" }}>SP</th>
              <th width="140px" style={{ textAlign: "right" }}>Tổng tiền</th>
              <th width="140px">Trạng thái</th>
              <th width="180px">J&T Express</th>
              <th width="160px">Ngày tạo</th>
              <th width="200px">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={selectable ? 10 : 9} style={{ textAlign: "center", padding: 32, color: "#9ca3af" }}>
                  ⌛ Đang tải dữ liệu...
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={selectable ? 10 : 9} style={{ textAlign: "center", padding: 32, color: "#9ca3af" }}>
                  Không có đơn hàng nào.
                </td>
              </tr>
            ) : (
              visible.map((o) => {
                const sm = STATUS_META[o.status] || STATUS_META.pending;
                const pm = PAYMENT_META[o.payment_method] || PAYMENT_META.cod;
                return (
                  <tr key={o.id} className={selectable && selectedIds.has(o.id) ? "row-selected" : ""}>
                    {selectable && (
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(o.id)}
                          onChange={() => toggleSelect(o.id)}
                        />
                      </td>
                    )}
                    <td>
                      <code className="dh-order-code">{o.order_code || `#${o.id}`}</code>
                      {o.cod_delivered_success && (
                        <div style={{ fontSize: 10, color: "#15803d", marginTop: 2 }}>
                          <i className="fas fa-check-circle"></i> COD đã nhận
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="dh-customer-name">{o.customer_name || "(không tên)"}</div>
                      <div className="dh-customer-contact">
                        {o.customer_phone && <span><i className="fas fa-phone"></i> {o.customer_phone}</span>}
                        {o.customer_email && <span><i className="fas fa-envelope"></i> {o.customer_email}</span>}
                      </div>
                      {/* Notification badges (mở rộng 2026-08) */}
                      {(o.notify_email_status || o.notify_zalo_status) && (
                        <div className="dh-notify-badges" style={{ marginTop: 4, display: "flex", gap: 4 }}>
                          {o.notify_email_status && (
                            <span
                              className="dh-notify-badge"
                              title={`Email: ${o.notify_email_status}${o.notify_last_error ? ' — ' + o.notify_last_error.slice(0, 60) : ''}`}
                              style={{
                                fontSize: 10,
                                padding: "1px 5px",
                                borderRadius: 8,
                                background: o.notify_email_status === 'sent' ? '#dcfce7' :
                                            o.notify_email_status === 'failed' ? '#fee2e2' : '#fef3c7',
                                color: o.notify_email_status === 'sent' ? '#15803d' :
                                       o.notify_email_status === 'failed' ? '#b91c1c' : '#a16207',
                              }}
                            >
                              <i className="fas fa-envelope"></i>
                              {o.notify_email_status === 'sent' ? ' ✓' :
                               o.notify_email_status === 'failed' ? ' ✗' : ' …'}
                            </span>
                          )}
                          {o.notify_zalo_status && (
                            <span
                              className="dh-notify-badge"
                              title={`Zalo: ${o.notify_zalo_status}${o.notify_last_error ? ' — ' + o.notify_last_error.slice(0, 60) : ''}`}
                              style={{
                                fontSize: 10,
                                padding: "1px 5px",
                                borderRadius: 8,
                                background: o.notify_zalo_status === 'sent' ? '#dcfce7' :
                                            o.notify_zalo_status === 'failed' ? '#fee2e2' : '#fef3c7',
                                color: o.notify_zalo_status === 'sent' ? '#15803d' :
                                       o.notify_zalo_status === 'failed' ? '#b91c1c' : '#a16207',
                              }}
                            >
                              <i className="fas fa-comment"></i>
                              {o.notify_zalo_status === 'sent' ? ' ✓' :
                               o.notify_zalo_status === 'failed' ? ' ✗' : ' …'}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="dh-payment" style={{ color: pm.color }}>
                        <i className={`fas ${pm.icon}`}></i> {pm.label}
                      </span>
                      <div className={`dh-pay-status ${o.payment_status}`}>
                        {o.payment_status === "paid" ? "Đã thanh toán" :
                         o.payment_status === "failed" ? "Thất bại" : "Chờ thanh toán"}
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <strong>{o.item_count || 0}</strong>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>({o.total_qty || 0} sp)</div>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "#d70018" }}>
                      {fmtVND(o.final_price)}
                    </td>
                    <td>
                      <span
                        className="dh-status-badge"
                        style={{ background: sm.bg, color: sm.color }}
                      >
                        {sm.label}
                      </span>
                    </td>
                    <td>
                      {o.jt_bill_code ? (
                        <div className="dh-jt-cell">
                          <span
                            className="dh-jt-badge"
                            style={{
                              background: formatJTStatus(o.jt_status).bg,
                              color:      formatJTStatus(o.jt_status).color,
                            }}
                            title={formatJTStatus(o.jt_status).label}
                          >
                            <i className={`fas ${formatJTStatus(o.jt_status).icon}`}></i>
                            {o.jt_bill_code.length > 12
                              ? o.jt_bill_code.slice(0, 12) + "…"
                              : o.jt_bill_code}
                          </span>
                          <div className="dh-jt-cell-actions">
                            <button
                              className="dh-jt-mini-btn"
                              onClick={() => handleTraceJT(o)}
                              disabled={jtBusyId === o.id}
                              title="Tra cứu trạng thái J&T"
                            >
                              <i className="fas fa-magnifying-glass"></i>
                            </button>
                            <button
                              className="dh-jt-mini-btn"
                              onClick={() => handlePrintJT(o)}
                              disabled={jtBusyId === o.id}
                              title="In nhãn J&T"
                            >
                              <i className="fas fa-print"></i>
                            </button>
                          </div>
                        </div>
                      ) : (o.status === "confirmed" || o.status === "shipping") ? (
                        <button
                          className="dh-jt-create-btn"
                          onClick={() => handleCreateJT(o)}
                          disabled={jtBusyId === o.id}
                          title="Tạo vận đơn J&T"
                        >
                          {jtBusyId === o.id ? (
                            <><i className="fas fa-spinner fa-spin"></i> Đang tạo…</>
                          ) : (
                            <><i className="fas fa-truck"></i> Tạo J&T</>
                          )}
                        </button>
                      ) : (
                        <span className="dh-jt-empty">—</span>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: "#6b7280" }}>{fmtDate(o.created_at)}</td>
                    <td>
                      <div className="dh-actions">
                        <button
                          className="dh-icon-btn view"
                          onClick={() => setViewing(o)}
                          title="Xem chi tiết"
                        >
                          <i className="fas fa-eye"></i>
                        </button>

                        {(o.status === "pending" || o.status === "cancelled") && (
                          <>
                            <button
                              className="dh-icon-btn confirm"
                              onClick={() => handleStatus(o, "confirmed")}
                              disabled={updatingId === o.id}
                              title="Xác nhận đơn"
                            >
                              <i className="fas fa-check"></i>
                            </button>
                            <button
                              className="dh-icon-btn cancel"
                              onClick={() => handleStatus(o, "cancelled")}
                              disabled={updatingId === o.id}
                              title="Huỷ đơn"
                            >
                              <i className="fas fa-ban"></i>
                            </button>
                            <button
                              className="dh-icon-btn"
                              onClick={() => handleStatus(o, "deleted_before_ship")}
                              disabled={updatingId === o.id}
                              title="Xóa trước khi giao (đổi status)"
                            >
                              <i className="fas fa-truck-arrow-right"></i>
                            </button>
                          </>
                        )}

                        {/* ─── Flow CK: awaiting_payment → payment_confirmed (mở rộng 2026-08) */}
                        {o.status === "awaiting_payment" && (
                          <>
                            <button
                              className="dh-icon-btn confirm"
                              onClick={() => handleVerifyPayment(o)}
                              disabled={updatingId === o.id}
                              title="Xác nhận đã nhận tiền (auto-verify) — chuyển sang payment_confirmed"
                              style={{ background: "#dcfce7", color: "#15803d" }}
                            >
                              <i className="fas fa-money-bill"></i>
                            </button>
                            <button
                              className="dh-icon-btn cancel"
                              onClick={() => handleStatus(o, "cancelled")}
                              disabled={updatingId === o.id}
                              title="Huỷ đơn"
                            >
                              <i className="fas fa-ban"></i>
                            </button>
                          </>
                        )}

                        {o.status === "payment_confirmed" && (
                          <button
                            className="dh-icon-btn confirm"
                            onClick={() => handleStatus(o, "confirmed")}
                            disabled={updatingId === o.id}
                            title="Đã nhận tiền — chuyển sang xác nhận để chuẩn bị hàng"
                          >
                            <i className="fas fa-check"></i>
                          </button>
                        )}

                        {o.status === "confirmed" && (
                          <>
                            <button
                              className="dh-icon-btn"
                              onClick={() => handleStatus(o, "awaiting_pickup")}
                              disabled={updatingId === o.id}
                              title="Sẵn sàng giao — chờ shipper lấy hàng"
                            >
                              <i className="fas fa-box"></i>
                            </button>
                            <button
                              className="dh-icon-btn ship"
                              onClick={() => handleStatus(o, "shipping")}
                              disabled={updatingId === o.id}
                              title="Chuyển sang đang giao"
                            >
                              <i className="fas fa-truck"></i>
                            </button>
                          </>
                        )}

                        {o.status === "awaiting_pickup" && (
                          <button
                            className="dh-icon-btn ship"
                            onClick={() => handleStatus(o, "shipping")}
                            disabled={updatingId === o.id}
                            title="Shipper đã lấy — chuyển sang đang giao"
                          >
                            <i className="fas fa-truck"></i>
                          </button>
                        )}

                        {o.status === "shipping" && (
                          <>
                            <button
                              className="dh-icon-btn done"
                              onClick={() => handleStatus(o, "delivered")}
                              disabled={updatingId === o.id}
                              title="Đã giao thành công"
                            >
                              <i className="fas fa-house-circle-check"></i>
                            </button>
                            <button
                              className="dh-icon-btn done"
                              onClick={() => handleStatus(o, "done")}
                              disabled={updatingId === o.id}
                              title="Hoàn tất (sẽ cộng LTV)"
                            >
                              <i className="fas fa-circle-check"></i>
                            </button>
                          </>
                        )}

                        {o.status === "delivered" && (
                          <button
                            className="dh-icon-btn done"
                            onClick={() => handleStatus(o, "done")}
                            disabled={updatingId === o.id}
                            title="Hoàn tất (sẽ cộng LTV)"
                          >
                            <i className="fas fa-circle-check"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── MODAL ─────────────────────────────────────────────────── */}
      {viewing && (
        <OrderDetailModal
          order={viewing}
          onClose={() => setViewing(null)}
          onChangeStatus={(newStatus) => {
            handleStatus(viewing, newStatus);
            setViewing((v) => ({ ...v, status: newStatus }));
          }}
        />
      )}
    </div>
  );
}
