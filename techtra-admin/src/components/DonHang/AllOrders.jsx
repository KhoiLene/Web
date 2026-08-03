// =====================================================================
// AllOrders.jsx — Trang "Tất cả đơn hàng"
// Mở rộng (2026-08): thêm tab cho flow CK + giao hàng giống thực tế
// =====================================================================

import React, { useState, useEffect, useCallback } from "react";
import "./DonHang.css";
import { ordersApi } from "../../api";
import OrderTable from "./OrderTable";
import { printOrdersAsPDF } from "./printOrder";
import { createJTOrder } from "./jtHelpers";

const FILTERS = [
  { key: "all",               label: "Tất cả",          icon: "fa-list",                  status: null },
  { key: "awaiting_payment",  label: "Chờ CK",          icon: "fa-hourglass-half",        status: "awaiting_payment" },
  { key: "payment_confirmed", label: "Đã nhận tiền",     icon: "fa-money-bill",            status: "payment_confirmed" },
  { key: "pending",           label: "Chờ xác nhận",    icon: "fa-clock",                 status: "pending" },
  { key: "confirmed",         label: "Đã xác nhận",     icon: "fa-check",                 status: "confirmed" },
  { key: "awaiting_pickup",   label: "Chờ lấy hàng",     icon: "fa-box",                   status: "awaiting_pickup" },
  { key: "shipping",          label: "Đang giao",       icon: "fa-truck",                 status: "shipping" },
  { key: "delivered",         label: "Đã giao",         icon: "fa-house-circle-check",    status: "delivered" },
  { key: "done",              label: "Hoàn tất",        icon: "fa-circle-check",          status: "done" },
  { key: "cancelled",         label: "Đã huỷ",          icon: "fa-ban",                   status: "cancelled" },
  { key: "deleted_before_ship", label: "Xóa trước khi giao", icon: "fa-truck-arrow-right", status: "deleted_before_ship" },
];

export default function AllOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await ordersApi.getAll();
      setOrders(r.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Bulk: cập nhật status = confirmed cho nhiều đơn rồi in PDF
  const handleBulkConfirm = useCallback(async (selected) => {
    if (!selected.length) return;

    const norm = (s) => String(s || "").toLowerCase();
    const targets = selected.filter(
      (o) => norm(o.status) === "pending" || norm(o.status) === "deleted_before_ship"
    );
    if (!targets.length) {
      alert(
        "Không có đơn nào phù hợp để 'Xác nhận & In phiếu'.\n" +
        "(Chỉ áp dụng cho đơn 'Chờ xác nhận' hoặc 'Xóa trước khi giao')."
      );
      return;
    }
    const ids = targets.map((o) => o.id);

    try {
      const freshData = await ordersApi.bulkConfirm(ids);

      // Update state local để UI đồng bộ
      setOrders((prev) =>
        prev.map((o) =>
          ids.includes(o.id)
            ? { ...o, status: "confirmed" }
            : o
        )
      );

      // In PDF với data mới (giữ nguyên final_price, items, v.v.)
      if (freshData && freshData.length) {
        await printOrdersAsPDF(freshData);
      }
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  }, [fetchOrders]);

  // Bulk: tạo vận đơn J&T cho nhiều đơn (chỉ đơn đã confirmed/shipping, chưa có billCode)
  const handleBulkCreateJT = useCallback(async (selected) => {
    const targets = selected.filter(
      (o) => (o.status === "confirmed" || o.status === "shipping") && !o.jt_bill_code
    );
    if (!targets.length) {
      alert("Không có đơn nào phù hợp để tạo J&T (cần đã 'confirmed'/'shipping' và chưa có billCode).");
      return;
    }

    if (!window.confirm(
      `Tạo vận đơn J&T cho ${targets.length} đơn?\n\n` +
      `Đơn sẽ bỏ qua: ${selected.length - targets.length} đơn (đã có billCode hoặc chưa confirmed).`
    )) return;

    let success = 0;
    const errors = [];

    for (const o of targets) {
      try {
        await createJTOrder(o, null, { skipConfigLoad: true });
        success++;
      } catch (err) {
        errors.push(`${o.order_code || "#" + o.id}: ${err.message}`);
      }
    }

    if (errors.length === 0) {
      alert(`✅ Đã tạo vận đơn J&T thành công cho ${success}/${targets.length} đơn.`);
    } else {
      alert(
        `⚠️ Hoàn tất: ${success} thành công, ${errors.length} lỗi.\n\n` +
        `Lỗi:\n${errors.slice(0, 5).join("\n")}` +
        (errors.length > 5 ? `\n... và ${errors.length - 5} lỗi khác` : "")
      );
    }

    await fetchOrders();
  }, [fetchOrders]);

  return (
    <OrderTable
      orders={orders}
      loading={loading}
      error={error}
      filters={FILTERS}
      title="Tất cả đơn hàng"
      desc="Quản lý toàn bộ đơn hàng trong hệ thống. Tick chọn nhiều đơn rồi bấm 'Xác nhận & In phiếu'."
      onReload={fetchOrders}
      onChangeStatus={(order, newStatus) => {
        setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o)));
      }}
      selectable
      onBulkConfirm={handleBulkConfirm}
      onBulkCreateJT={handleBulkCreateJT}
      onOrderUpdate={() => fetchOrders()}
    />
  );
}