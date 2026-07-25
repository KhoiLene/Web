// =====================================================================
// IncompleteOrders.jsx — Trang "Đơn chưa hoàn tất"
// Hiển thị đơn ở trạng thái pending / confirmed / shipping
// (chưa đến "Hoàn tất" — tức COD chưa được nhận thành công hoặc VNPay chưa done)
// =====================================================================

import React, { useState, useEffect, useCallback } from "react";
import "./DonHang.css";
import { supabase } from "../../api";
import OrderTable from "./OrderTable";

const FILTERS = [
  { key: "all",       label: "Chưa hoàn tất",   icon: "fa-list",  status: null },
  { key: "pending",   label: "Chờ xác nhận",     icon: "fa-clock", status: "pending" },
  { key: "confirmed", label: "Đã xác nhận",      icon: "fa-check", status: "confirmed" },
  { key: "shipping",  label: "Đang giao",        icon: "fa-truck", status: "shipping" },
];

export default function IncompleteOrders() {
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
        .in("status", ["pending", "confirmed", "shipping"])
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

  return (
    <OrderTable
      orders={orders}
      loading={loading}
      error={error}
      filters={FILTERS}
      title="Đơn chưa hoàn tất"
      desc="Đơn chưa đến trạng thái 'Hoàn tất' (chưa nhận hàng thành công)."
      onReload={fetchOrders}
      onChangeStatus={(order, newStatus) => {
        // Nếu chuyển sang "done" hoặc "cancelled" thì đơn không còn "chưa hoàn tất" → xoá khỏi list
        if (newStatus === "done" || newStatus === "cancelled") {
          setOrders((prev) => prev.filter((o) => o.id !== order.id));
        } else {
          setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o)));
        }
      }}
    />
  );
}
