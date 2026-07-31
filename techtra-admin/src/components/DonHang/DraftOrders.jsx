// =====================================================================
// DraftOrders.jsx — Trang "Đơn hàng nháp"
// Chỉ hiện đơn đang ở trạng thái pending (chờ xác nhận từ admin)
// =====================================================================

import React, { useState, useEffect, useCallback } from "react";
import "./DonHang.css";
import { ordersApi } from "../../api";
import OrderTable from "./OrderTable";

const FILTERS = [
  { key: "all", label: "Tất cả", icon: "fa-list", status: "pending" },
];

export default function DraftOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await ordersApi.getAll({ status: "pending" });
      setOrders(r.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  return (
    <OrderTable
      orders={orders}
      loading={loading}
      error={error}
      filters={FILTERS}
      title="Đơn hàng nháp"
      desc="Các đơn đang chờ xác nhận từ admin."
      onReload={fetchOrders}
      onChangeStatus={(order, newStatus) => {
        // Sau khi xác nhận/huỷ, đơn không còn là "nháp" nên xoá khỏi list
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
      }}
    />
  );
}
