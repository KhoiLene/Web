// =====================================================================
// Dashboard.jsx — Trang Tổng quan
// Hiển thị:
//   - 4 KPI cards (doanh thu, tổng đơn, tổng KH, voucher active)
//   - 4 charts (doanh thu 7 ngày, đơn theo trạng thái, top SP, KH theo hạng)
//   - Bảng 5 đơn hàng gần đây
// =====================================================================

import React, { useState, useEffect, useMemo, useCallback } from "react";
import "./Dashboard.css";
import { supabase } from "../../api";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from "recharts";

const fmtVND = (n) => Number(n || 0).toLocaleString("vi-VN") + "đ";
const fmtNum = (n) => Number(n || 0).toLocaleString("vi-VN");

// ─── Màu sắt (đồng bộ với STATUS_META từ DonHang) ──────────────────
const STATUS_META = {
  pending:    { label: "Chờ xác nhận", color: "#a16207" },
  confirmed:  { label: "Đã xác nhận",  color: "#1d4ed8" },
  shipping:   { label: "Đang giao",    color: "#7c3aed" },
  done:       { label: "Hoàn tất",     color: "#15803d" },
  cancelled:  { label: "Đã huỷ",       color: "#b91c1c" },
};

const RANK_META = {
  bronze:   { label: "Đồng",     color: "#a16207" },
  silver:   { label: "Bạc",      color: "#475569" },
  gold:     { label: "Vàng",     color: "#ca8a04" },
  platinum: { label: "Bạch kim", color: "#7c3aed" },
};

export default function Dashboard() {
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [orders, setOrders]     = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [orderItems, setOrderItems] = useState([]);

  // ─── Fetch tất cả song song ─────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [oRes, cRes, vRes, iRes] = await Promise.all([
        supabase
          .from("v_orders_full")
          .select("id, order_code, customer_id, customer_name, status, final_price, created_at, item_count, total_qty")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("v_customer_loyalty")
          .select("customer_id, customer_name, rank, ltv, total_orders, customer_since, last_purchase_at")
          .order("ltv", { ascending: false })
          .limit(1000),
        supabase
          .from("customer_vouchers")
          .select("id, code, is_public, is_active, expires_at, used_at, customer_id, rank, discount_type, discount_value, min_order, max_discount")
          .limit(1000),
        supabase
          .from("order_items")
          .select("product_id, product_name, quantity, subtotal, order_id")
          .limit(2000),
      ]);

      if (oRes.error) throw new Error("orders: " + oRes.error.message);
      if (cRes.error) throw new Error("customers: " + cRes.error.message);
      if (vRes.error) throw new Error("vouchers: " + vRes.error.message);
      if (iRes.error) throw new Error("order_items: " + iRes.error.message);

      setOrders(oRes.data || []);
      setCustomers(cRes.data || []);
      setVouchers(vRes.data || []);
      setOrderItems(iRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Tính toán KPIs ────────────────────────────────────────────
  const kpis = useMemo(() => {
    const doneOrders = orders.filter((o) => o.status === "done");
    const totalRevenue = doneOrders.reduce((s, o) => s + Number(o.final_price || 0), 0);

    // So sánh với 30 ngày trước
    const now = new Date();
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const prev30 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const last30Done = doneOrders.filter((o) => new Date(o.created_at) >= last30);
    const prev30Done = doneOrders.filter((o) => {
      const d = new Date(o.created_at);
      return d >= prev30 && d < last30;
    });
    const revLast30 = last30Done.reduce((s, o) => s + Number(o.final_price || 0), 0);
    const revPrev30 = prev30Done.reduce((s, o) => s + Number(o.final_price || 0), 0);
    const revGrowth = revPrev30 > 0 ? ((revLast30 - revPrev30) / revPrev30) * 100 : null;

    // Đơn hôm nay
    const todayStr = now.toDateString();
    const todayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === todayStr);

    // KH mới 30 ngày
    const newCustomers = customers.filter(
      (c) => c.customer_since && new Date(c.customer_since) >= last30
    ).length;

    // Voucher active (chưa dùng + chưa hết hạn)
    const activeVouchers = vouchers.filter(
      (v) => v.is_active && !v.used_at && (!v.expires_at || new Date(v.expires_at) > now)
    ).length;

    return {
      totalRevenue,
      revGrowth,
      totalOrders: orders.length,
      todayOrders: todayOrders.length,
      pendingOrders: orders.filter((o) => o.status === "pending").length,
      totalCustomers: customers.length,
      newCustomers,
      activeVouchers,
    };
  }, [orders, customers, vouchers]);

  // ─── Chart 1: Doanh thu 7 ngày gần nhất ────────────────────────
  const revenueByDay = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const dayRevenue = orders
        .filter((o) => o.status === "done")
        .filter((o) => {
          const od = new Date(o.created_at);
          return od >= d && od < next;
        })
        .reduce((s, o) => s + Number(o.final_price || 0), 0);
      days.push({
        date: `${d.getDate()}/${d.getMonth() + 1}`,
        revenue: dayRevenue,
        label: d.toLocaleDateString("vi-VN", { weekday: "short" }),
      });
    }
    return days;
  }, [orders]);

  // ─── Chart 2: Đơn theo trạng thái ──────────────────────────────
  const ordersByStatus = useMemo(() => {
    const counts = { pending: 0, confirmed: 0, shipping: 0, done: 0, cancelled: 0 };
    orders.forEach((o) => {
      if (counts[o.status] !== undefined) counts[o.status]++;
    });
    return Object.entries(counts).map(([key, value]) => ({
      name:  STATUS_META[key]?.label || key,
      value,
      color: STATUS_META[key]?.color || "#9ca3af",
    }));
  }, [orders]);

  // ─── Chart 3: Top 5 sản phẩm bán chạy ─────────────────────────
  const topProducts = useMemo(() => {
    const map = {};
    orderItems.forEach((it) => {
      const name = it.product_name || "Không rõ";
      if (!map[name]) map[name] = { name, quantity: 0, revenue: 0 };
      map[name].quantity += Number(it.quantity || 0);
      map[name].revenue  += Number(it.subtotal || 0);
    });
    return Object.values(map)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [orderItems]);

  // ─── Chart 4: Khách hàng theo hạng ─────────────────────────────
  const customersByRank = useMemo(() => {
    const counts = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    customers.forEach((c) => {
      const r = c.rank || "bronze";
      if (counts[r] !== undefined) counts[r]++;
    });
    return Object.entries(counts).map(([key, value]) => ({
      name:  RANK_META[key]?.label || key,
      value,
      color: RANK_META[key]?.color || "#9ca3af",
    }));
  }, [customers]);

  // ─── Bảng đơn gần đây ─────────────────────────────────────────
  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div className="db-wrapper">
      <div className="db-header">
        <div>
          <h1>📊 Tổng quan</h1>
          <p>Thống kê tổng quan toàn hệ thống. Cập nhật real-time từ Supabase.</p>
        </div>
        <div className="db-header-actions">
          <button className="btn-secondary" onClick={fetchData} disabled={loading}>
            <i className={`fas fa-rotate ${loading ? "fa-spin" : ""}`}></i> Tải lại
          </button>
        </div>
      </div>

      {error && <div className="db-error">⚠️ {error} <button onClick={fetchData}>Thử lại</button></div>}

      {loading ? (
        <div className="db-loading">⌛ Đang tải dữ liệu…</div>
      ) : (
        <>
          {/* ─── KPI CARDS ────────────────────────────────────── */}
          <div className="db-kpi-grid">
            <KPICard
              icon="fa-dollar-sign"
              color="#3E6807"
              bg="#dcfce7"
              label="Tổng doanh thu"
              value={fmtVND(kpis.totalRevenue)}
              sub={kpis.revGrowth !== null
                ? `${kpis.revGrowth >= 0 ? "↗" : "↘"} ${Math.abs(kpis.revGrowth).toFixed(1)}% so với 30 ngày trước`
                : "Chưa có dữ liệu so sánh"}
              subColor={kpis.revGrowth >= 0 ? "#15803d" : "#b91c1c"}
            />
            <KPICard
              icon="fa-shopping-cart"
              color="#1d4ed8"
              bg="#dbeafe"
              label="Tổng đơn hàng"
              value={fmtNum(kpis.totalOrders)}
              sub={`${kpis.todayOrders} đơn hôm nay · ${kpis.pendingOrders} chờ xử lý`}
            />
            <KPICard
              icon="fa-users"
              color="#7c3aed"
              bg="#ede9fe"
              label="Tổng khách hàng"
              value={fmtNum(kpis.totalCustomers)}
              sub={`+${kpis.newCustomers} khách mới trong 30 ngày`}
              subColor="#15803d"
            />
            <KPICard
              icon="fa-ticket"
              color="#a16207"
              bg="#fef3c7"
              label="Voucher đang active"
              value={fmtNum(kpis.activeVouchers)}
              sub={`Tổng ${vouchers.length} voucher trong hệ thống`}
            />
          </div>

          {/* ─── ROW 2: Doanh thu 7 ngày + Đơn theo trạng thái ── */}
          <div className="db-charts-grid">
            <div className="db-card">
              <h3 className="db-card-title">
                <i className="fas fa-chart-line"></i> Doanh thu 7 ngày gần nhất
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={revenueByDay} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}tr` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                  />
                  <Tooltip
                    formatter={(v) => fmtVND(v)}
                    labelFormatter={(l, p) => p?.[0]?.payload?.label || l}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3E6807"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#3E6807" }}
                    activeDot={{ r: 6 }}
                    name="Doanh thu"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="db-card">
              <h3 className="db-card-title">
                <i className="fas fa-chart-pie"></i> Đơn theo trạng thái
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={ordersByStatus}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(e) => `${e.name}: ${e.value}`}
                    labelLine={false}
                    fontSize={11}
                  >
                    {ordersByStatus.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ─── ROW 3: Top SP + KH theo hạng ─────────────────── */}
          <div className="db-charts-grid">
            <div className="db-card">
              <h3 className="db-card-title">
                <i className="fas fa-fire"></i> Top 5 sản phẩm bán chạy
              </h3>
              {topProducts.length === 0 ? (
                <div className="db-empty">Chưa có dữ liệu bán hàng.</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={topProducts}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      width={95}
                    />
                    <Tooltip
                      formatter={(v, name) => name === "revenue" ? fmtVND(v) : `${v} sp`}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar dataKey="quantity" fill="#3E6807" name="Số lượng" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="db-card">
              <h3 className="db-card-title">
                <i className="fas fa-crown"></i> Khách hàng theo hạng
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={customersByRank} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="value" name="Khách hàng" radius={[6, 6, 0, 0]}>
                    {customersByRank.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ─── ROW 4: Đơn gần đây ───────────────────────────── */}
          <div className="db-card">
            <h3 className="db-card-title">
              <i className="fas fa-receipt"></i> 5 đơn hàng gần nhất
            </h3>
            {recentOrders.length === 0 ? (
              <div className="db-empty">Chưa có đơn hàng nào.</div>
            ) : (
              <table className="db-table">
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Khách hàng</th>
                    <th>SP</th>
                    <th style={{ textAlign: "right" }}>Tổng</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => {
                    const sm = STATUS_META[o.status] || { label: o.status, color: "#9ca3af" };
                    return (
                      <tr key={o.id}>
                        <td><code className="db-code">{o.order_code || `#${o.id}`}</code></td>
                        <td>{o.customer_name || <em>—</em>}</td>
                        <td>{o.item_count || 0} loại</td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "#d70018" }}>
                          {fmtVND(o.final_price)}
                        </td>
                        <td>
                          <span
                            className="db-status-pill"
                            style={{ background: sm.color + "22", color: sm.color, borderColor: sm.color }}
                          >
                            {sm.label}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: "#6b7280" }}>
                          {new Date(o.created_at).toLocaleString("vi-VN")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sub-component: KPI Card ───────────────────────────────────────
function KPICard({ icon, color, bg, label, value, sub, subColor }) {
  return (
    <div className="db-kpi-card">
      <div className="db-kpi-icon" style={{ background: bg, color }}>
        <i className={`fas ${icon}`}></i>
      </div>
      <div className="db-kpi-content">
        <div className="db-kpi-label">{label}</div>
        <div className="db-kpi-value">{value}</div>
        {sub && (
          <div className="db-kpi-sub" style={{ color: subColor || "#6b7280" }}>{sub}</div>
        )}
      </div>
    </div>
  );
}
