// =====================================================================
// AllOrders.jsx — Trang "Tất cả đơn hàng"
// Hiển thị toàn bộ đơn + 5 tab trạng thái (pending/confirmed/shipping/done/cancelled)
// Có chọn nhiều + bulk "Xác nhận & In phiếu" + "Tạo vận đơn J&T"
// =====================================================================

import React, { useState, useEffect, useCallback } from "react";
import "./DonHang.css";
import { supabase } from "../../api";
import OrderTable from "./OrderTable";
import { printOrdersAsPDF } from "./printOrder";
import { createJTOrder } from "./jtHelpers";

const FILTERS = [
  { key: "all",       label: "Tất cả",         icon: "fa-list",          status: null },
  { key: "pending",   label: "Chờ xác nhận",   icon: "fa-clock",         status: "pending" },
  { key: "confirmed", label: "Đã xác nhận",    icon: "fa-check",         status: "confirmed" },
  { key: "shipping",  label: "Đang giao",      icon: "fa-truck",         status: "shipping" },
  { key: "done",      label: "Hoàn tất",       icon: "fa-circle-check",  status: "done" },
  { key: "cancelled", label: "Đã huỷ",         icon: "fa-ban",           status: "cancelled" },
];

export default function AllOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: e2 } = await supabase
        .from("v_orders_full")
        .select("*")
        .order("created_at", { ascending: false });
      if (e2) throw new Error(e2.message);
      setOrders(data || []);
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
    const ids = selected.map((o) => o.id);

    // 1. Update DB trước
    const { error: e2 } = await supabase
      .from("orders")
      .update({ status: "confirmed", updated_at: new Date().toISOString() })
      .in("id", ids);
    if (e2) {
      alert("Lỗi cập nhật: " + e2.message);
      return;
    }

    // 2. Update state local
    setOrders((prev) =>
      prev.map((o) => (ids.includes(o.id) ? { ...o, status: "confirmed" } : o))
    );

    // 3. Refresh data + in PDF
    await fetchOrders();
    const fresh = orders.filter((o) => ids.includes(o.id)).map((o) => ({ ...o, status: "confirmed" }));
    if (fresh.length) {
      await printOrdersAsPDF(fresh);
    }
  }, [orders, fetchOrders]);

  // Bulk: tạo vận đơn J&T cho nhiều đơn (chỉ đơn đã confirmed/shipping, chưa có billCode)
  const handleBulkCreateJT = useCallback(async (selected) => {
    // Lọc: status phù hợp + chưa có billCode
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
