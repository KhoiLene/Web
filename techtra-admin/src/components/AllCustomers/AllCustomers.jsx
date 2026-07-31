// =====================================================================
// AllCustomers.jsx — Trang quản lý khách hàng + khách hàng thân thiết
// - Đọc từ view v_customer_loyalty
// - Công tắc loyalty_enabled từ site_settings (key='loyalty_enabled')
// - Bật/tắt rank + auto-issue voucher
// =====================================================================

import React, { useState, useEffect, useMemo, useCallback } from "react";
import "./AllCustomers.css";
import { customersApi, dashboardApi, siteSettingsApi, request } from "../../api";

const fmtVND = (n) => Number(n || 0).toLocaleString("vi-VN") + "đ";
const fmtDateVN = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
};

const RANK_META = {
  bronze:   { label: "Đồng",     color: "#a16207", bg: "#fef3c7" },
  silver:   { label: "Bạc",      color: "#475569", bg: "#f1f5f9" },
  gold:     { label: "Vàng",     color: "#a16207", bg: "#fef9c3" },
  platinum: { label: "Bạch kim", color: "#7c3aed", bg: "#ede9fe" },
};

const STATUS_FILTERS = [
  { key: "all",         label: "Tất cả",          icon: "fa-list" },
  { key: "loyal",       label: "Thân thiết",      icon: "fa-crown" },
  { key: "no-contact",  label: "Chưa có SĐT/Email", icon: "fa-exclamation-circle" },
];

export default function AllCustomers() {
  const [customers, setCustomers]     = useState([]);
  const [loyalty, setLoyalty]         = useState({ enabled: false, thresholds: null });
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [searchText, setSearchText]   = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected]       = useState([]);
  const [togglingRank, setTogglingRank] = useState(false);
  const [viewing, setViewing]         = useState(null); // modal chi tiết
  const [issuingVoucher, setIssuingVoucher] = useState(null);
  const [showByRankModal, setShowByRankModal]   = useState(false);
  const [showPublicModal, setShowPublicModal]   = useState(false);

  // ─── Fetch: customers + loyalty settings ─────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [custRes, setRes] = await Promise.all([
        customersApi.getAll(),
        request(
          "GET",
          "/db/site_settings?select=key,value,value_json&key=in.(loyalty_enabled,loyalty_tier_thresholds)"
        ),
      ]);

      const customersList = Array.isArray(custRes) ? custRes : (custRes.data || []);
      setCustomers(customersList);

      const map = {};
      (setRes.data || []).forEach((r) => { map[r.key] = r; });
      setLoyalty({
        enabled:     map.loyalty_enabled?.value === "true",
        thresholds:  map.loyalty_tier_thresholds?.value_json || null,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Toggle loyalty on/off (công tắc lớn) ───────────────────────────
  const handleToggleLoyalty = async () => {
    const newVal = !loyalty.enabled;
    if (!window.confirm(
      newVal
        ? "BẬT chương trình khách hàng thân thiết?\n\nHệ thống sẽ bắt đầu hiển thị rank và auto-phát voucher khi KH đạt ngưỡng."
        : "TẮT chương trình khách hàng thân thiết?\n\nCột rank sẽ ẩn, auto-issue voucher tạm dừng."
    )) return;
    setTogglingRank(true);
    try {
      await request("PATCH", "/db/site_settings", {
        set: { value: newVal ? "true" : "false", updated_at: new Date().toISOString() },
        where: { key: "loyalty_enabled" },
      });
      setLoyalty((p) => ({ ...p, enabled: newVal }));
    } catch (err) {
      alert("Lỗi: " + err.message);
    } finally {
      setTogglingRank(false);
    }
  };

  // ─── Phát voucher thủ công cho 1 KH ─────────────────────────────────
  const handleIssueVoucher = async (customerId) => {
    setIssuingVoucher(customerId);
    try {
      const r = await customersApi.issueLoyaltyVoucher(customerId);
      const voucherId = r?.voucher_id ?? 0;
      if (voucherId > 0) {
        alert(`Đã phát voucher #${voucherId} cho KH #${customerId}`);
      } else {
        alert("KH chưa đủ điều kiện (LTV < ngưỡng Silver) hoặc đã có voucher active.");
      }
    } catch (err) {
      alert("Lỗi: " + err.message);
    } finally {
      setIssuingVoucher(null);
    }
  };

  // ─── Filter + search ────────────────────────────────────────────────
  const matchedIds = useMemo(() => {
    const q = searchText.toLowerCase();
    if (!q) return new Set(customers.map((c) => c.customer_id));
    const set = new Set();
    customers.forEach((c) => {
      const hay = `${c.customer_name || ""} ${c.phone || ""} ${c.email || ""} ${c.contact || ""}`.toLowerCase();
      if (hay.includes(q)) set.add(c.customer_id);
    });
    return set;
  }, [customers, searchText]);

  const visible = useMemo(() => {
    return customers
      .filter((c) => matchedIds.has(c.customer_id))
      .filter((c) => {
        if (statusFilter === "loyal") return (c.ltv || 0) >= 2000000; // Silver+
        if (statusFilter === "no-contact") return !c.phone && !c.email;
        return true;
      });
  }, [customers, matchedIds, statusFilter]);

  // ─── Counts cho filter tabs ─────────────────────────────────────────
  const filterCounts = useMemo(() => {
    const c = { all: customers.length, loyal: 0, "no-contact": 0 };
    customers.forEach((x) => {
      if ((x.ltv || 0) >= 2000000) c.loyal++;
      if (!x.phone && !x.email) c["no-contact"]++;
    });
    return c;
  }, [customers]);

  // ─── Select ─────────────────────────────────────────────────────────
  const allVisibleIds = useMemo(() => visible.map((c) => c.customer_id), [visible]);
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selected.includes(id));
  const toggleAll = () => setSelected(allSelected ? [] : allVisibleIds);
  const toggleOne = (id) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const handleBulkIssueVoucher = async () => {
    if (!selected.length) return;
    if (!loyalty.enabled) {
      alert("Hãy BẬT chương trình khách thân thiết trước.");
      return;
    }
    if (!window.confirm(`Phát voucher cho ${selected.length} khách đã chọn?`)) return;
    let ok = 0;
    for (const id of selected) {
      try {
        const r = await customersApi.issueLoyaltyVoucher(id);
        if ((r?.voucher_id ?? 0) > 0) ok++;
      } catch { /* skip */ }
    }
    alert(`Đã phát ${ok}/${selected.length} voucher (còn lại chưa đủ ngưỡng hoặc đã có voucher active).`);
    setSelected([]);
  };

  return (
    <div className="ac-wrapper">
      {/* ─── HEADER ────────────────────────────────────────────────── */}
      <div className="ac-header">
        <div>
          <h1>Khách hàng thân thiết</h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
            Quản lý KH, bật/tắt chương trình tích điểm và phát voucher tự động.
          </p>
        </div>
        <div className="ac-header-actions">
          {loyalty.enabled && (
            <button
              className="btn-secondary ac-voucher-btn rank"
              onClick={() => setShowByRankModal(true)}
              title="Phát voucher cho tất cả KH đạt một hạng nhất định"
            >
              <i className="fas fa-medal" /> Phát voucher theo hạng
            </button>
          )}
          <button
            className="btn-secondary ac-voucher-btn public"
            onClick={() => setShowPublicModal(true)}
            title="Tạo mã giảm giá công khai — ai cũng nhập code dùng được"
          >
            <i className="fas fa-globe" /> Tạo mã cho tất cả
          </button>
          <button className="btn-secondary" onClick={fetchData} disabled={loading}>
            <i className="fas fa-rotate" /> Tải lại
          </button>
        </div>
      </div>

      {/* ─── CÔNG TẮC LỚN: Bật/tắt chương trình thân thiết ─────────── */}
      <div className={`ac-loyalty-banner ${loyalty.enabled ? "on" : "off"}`}>
        <div className="ac-loyalty-info">
          <div className="ac-loyalty-icon">
            <i className={`fas ${loyalty.enabled ? "fa-crown" : "fa-crown"}`}></i>
          </div>
          <div>
            <h3>Chương trình khách hàng thân thiết</h3>
            <p>
              {loyalty.enabled
                ? "ĐANG BẬT — hệ thống hiển thị rank, tự động phát voucher khi KH đạt ngưỡng (Silver ≥ 2 triệu LTV, Gold ≥ 5 triệu, Platinum ≥ 10 triệu)."
                : "ĐANG TẮT — khi bật, quy mô công ty đủ lớn để phát voucher. Cột rank sẽ hiển thị và tự động phát voucher cho KH đủ điều kiện."}
            </p>
          </div>
        </div>
        <label className="ac-big-toggle">
          <input
            type="checkbox"
            checked={loyalty.enabled}
            onChange={handleToggleLoyalty}
            disabled={togglingRank}
          />
          <span className="ac-big-toggle-slider"></span>
        </label>
      </div>

      {error && <div className="ac-error">⚠️ {error} <button onClick={fetchData}>Thử lại</button></div>}

      {/* ─── TABS LỌC ──────────────────────────────────────────────── */}
      <div className="ac-filter-tabs">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            className={`ac-tab-btn ${statusFilter === f.key ? "active" : ""}`}
            onClick={() => setStatusFilter(f.key)}
          >
            <i className={`fas ${f.icon}`}></i>
            <span>{f.label}</span>
            <span className="ac-tab-count">{filterCounts[f.key] || 0}</span>
          </button>
        ))}
      </div>

      {/* ─── TOOLBAR ───────────────────────────────────────────────── */}
      <div className="ac-search-row">
        <div className="ac-search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Tìm theo tên, SĐT, email..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          {searchText && (
            <button className="ac-search-clear" onClick={() => setSearchText("")} title="Xóa">×</button>
          )}
        </div>

        {selected.length > 0 ? (
          <div className="ac-bulk-actions">
            <span className="ac-bulk-label">Đã chọn {selected.length}:</span>
            <button
              className="ac-bulk-btn primary"
              onClick={handleBulkIssueVoucher}
              disabled={!loyalty.enabled}
              title={!loyalty.enabled ? "Bật chương trình thân thiết trước" : "Phát voucher cho các KH đủ điều kiện"}
            >
              <i className="fas fa-gift"></i> Phát voucher
            </button>
            <button className="ac-bulk-btn ghost" onClick={() => setSelected([])}>Bỏ chọn</button>
          </div>
        ) : (
          <div className="ac-summary">
            {loading
              ? "Đang tải..."
              : `${visible.length} khách${searchText ? ` (lọc từ ${customers.length})` : ""}`}
          </div>
        )}
      </div>

      {/* ─── BẢNG ──────────────────────────────────────────────────── */}
      <div className="ac-table-responsive">
        <table className="ac-table">
          <thead>
            <tr>
              <th width="40px">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              </th>
              <th>Khách hàng</th>
              <th>Liên hệ</th>
              <th width="110px" style={{ textAlign: "right" }}>Số đơn</th>
              <th width="110px" style={{ textAlign: "right" }}>Số SP</th>
              <th width="140px" style={{ textAlign: "right" }}>LTV</th>
              <th width="140px" style={{ textAlign: "right" }}>AOV</th>
              {loyalty.enabled && <th width="120px">Hạng</th>}
              <th width="120px">Mua gần nhất</th>
              <th width="180px">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={loyalty.enabled ? 10 : 9} style={{ textAlign: "center", padding: 32, color: "#9ca3af" }}>⌛ Đang tải...</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={loyalty.enabled ? 10 : 9} style={{ textAlign: "center", padding: 32, color: "#9ca3af" }}>Không có khách hàng nào.</td></tr>
            ) : visible.map((c) => {
              const rank = c.rank || "bronze";
              const rk = RANK_META[rank];
              const isLoyal = (c.ltv || 0) >= 2000000;
              return (
                <tr key={c.customer_id} className={selected.includes(c.customer_id) ? "row-selected" : ""}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(c.customer_id)}
                      onChange={() => toggleOne(c.customer_id)}
                    />
                  </td>
                  <td>
                    <div className="ac-customer-cell">
                      <div className="ac-avatar">
                        {(c.customer_name || "?").trim().charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="ac-customer-name">
                          {c.customer_name || <em style={{ color: "#9ca3af" }}>(Chưa đặt tên)</em>}
                        </div>
                        <div className="ac-customer-id">ID: #{c.customer_id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {c.phone ? (
                      <div className="ac-contact-line"><i className="fas fa-phone"></i> {c.phone}</div>
                    ) : null}
                    {c.email ? (
                      <div className="ac-contact-line"><i className="fas fa-envelope"></i> {c.email}</div>
                    ) : null}
                    {!c.phone && !c.email && (
                      <span className="ac-no-contact"><i className="fas fa-exclamation-triangle"></i> Chưa có</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <strong>{c.total_orders || 0}</strong>
                    {c.cancelled_orders > 0 && (
                      <div style={{ fontSize: 11, color: "#b91c1c" }}>({c.cancelled_orders} hủy)</div>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>{c.total_products || 0}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: "#d70018" }}>
                    {fmtVND(c.ltv)}
                  </td>
                  <td style={{ textAlign: "right" }}>{fmtVND(c.aov)}</td>
                  {loyalty.enabled && (
                    <td>
                      <span
                        className="ac-rank-badge"
                        style={{ background: rk.bg, color: rk.color }}
                        title={`Hạng ${rk.label} — từ ${fmtVND(rank === "silver" ? 2000000 : rank === "gold" ? 5000000 : rank === "platinum" ? 10000000 : 0)}`}
                      >
                        <i className="fas fa-medal"></i> {rk.label}
                      </span>
                      {!isLoyal && (
                        <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>Cần 2tr để lên Bạc</div>
                      )}
                    </td>
                  )}
                  <td style={{ fontSize: 12, color: "#6b7280" }}>
                    {c.last_purchase_at
                      ? fmtDateVN(c.last_purchase_at)
                      : <em>Chưa mua</em>}
                  </td>
                  <td>
                    <div className="ac-action-buttons">
                      <button
                        className="ac-icon-btn view"
                        onClick={() => setViewing(c)}
                        title="Xem chi tiết + SP đã mua"
                      >
                        <i className="fas fa-eye"></i>
                      </button>
                      {loyalty.enabled && isLoyal && (
                        <button
                          className="ac-icon-btn gift"
                          onClick={() => handleIssueVoucher(c.customer_id)}
                          disabled={issuingVoucher === c.customer_id}
                          title="Phát voucher thủ công"
                        >
                          <i className="fas fa-gift"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ─── MODAL: Chi tiết KH + SP đã mua ──────────────────────── */}
      {viewing && (
        <CustomerDetailModal
          customer={viewing}
          loyaltyEnabled={loyalty.enabled}
          onClose={() => setViewing(null)}
        />
      )}

      {/* ─── MODAL: Phát voucher theo hạng ───────────────────────── */}
      {showByRankModal && (
        <IssueVoucherByRankModal
          customers={customers}
          onClose={() => setShowByRankModal(false)}
        />
      )}

      {/* ─── MODAL: Tạo mã public ────────────────────────────────── */}
      {showPublicModal && (
        <IssuePublicVoucherModal
          onClose={() => setShowPublicModal(false)}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// MODAL: Chi tiết khách hàng
// ════════════════════════════════════════════════════════════════════════
function CustomerDetailModal({ customer, loyaltyEnabled, onClose }) {
  const [products, setProducts] = useState([]);
  const [orders, setOrders]     = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Lấy list đơn done + items (từ purchased_products JSONB có sẵn trong view)
        const productsFromView = (customer.purchased_products || []).map((p) => ({
          ...p,
          last_buy_at: p.last_buy_at,
        }));
        if (!cancelled) setProducts(productsFromView);

        // Lấy danh sách đơn done
        const orderR = await request(
          "GET",
          `/db/orders?select=id,order_code,final_price,status,payment_method,created_at&customer_id=eq.${customer.customer_id}&status=eq.done&order=created_at.desc&limit=50`
        );
        if (!cancelled) setOrders(orderR.data || []);

        // Lấy voucher của KH (cá nhân) từ v_active_vouchers
        const vchR = await request(
          "GET",
          `/db/v_active_vouchers?select=id,code,discount_type,discount_value,min_order,max_discount,expires_at,status,rank,note,is_public&customer_id=eq.${customer.customer_id}&order=issued_at.desc&limit=50`
        );
        if (!cancelled) setVouchers(vchR.data || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [customer.customer_id]);

  const handleCopyVoucher = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      alert(`Đã copy code: ${code}`);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* noop */ }
      document.body.removeChild(ta);
    }
  };

  const rk = RANK_META[customer.rank || "bronze"] || RANK_META.bronze;

  return (
    <div className="ac-modal-overlay" onClick={onClose}>
      <div className="ac-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ac-modal-header">
          <div className="ac-modal-title">
            <div className="ac-avatar lg">{(customer.customer_name || "?").charAt(0).toUpperCase()}</div>
            <div>
              <h2>{customer.customer_name || "(Chưa có tên)"}</h2>
              <p>
                ID: #{customer.customer_id} · KH từ {fmtDateVN(customer.customer_since)}
              </p>
            </div>
          </div>
          <button className="ac-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="ac-modal-body">
          {/* Thông tin liên hệ */}
          <div className="ac-info-grid">
            <div className="ac-info-card">
              <div className="ac-info-label">Số điện thoại</div>
              <div className="ac-info-value">
                {customer.phone || <em className="ac-empty">—</em>}
              </div>
            </div>
            <div className="ac-info-card">
              <div className="ac-info-label">Email</div>
              <div className="ac-info-value">
                {customer.email || <em className="ac-empty">—</em>}
              </div>
            </div>
            <div className="ac-info-card">
              <div className="ac-info-label">Tổng đơn (done)</div>
              <div className="ac-info-value strong">{customer.total_orders || 0}</div>
            </div>
            <div className="ac-info-card">
              <div className="ac-info-label">Tổng SP đã mua</div>
              <div className="ac-info-value strong">{customer.total_products || 0}</div>
            </div>
            <div className="ac-info-card">
              <div className="ac-info-label">LTV (tổng chi)</div>
              <div className="ac-info-value strong" style={{ color: "#d70018" }}>{fmtVND(customer.ltv)}</div>
            </div>
            <div className="ac-info-card">
              <div className="ac-info-label">AOV (TB / đơn)</div>
              <div className="ac-info-value strong">{fmtVND(customer.aov)}</div>
            </div>
            {loyaltyEnabled && (
              <div className="ac-info-card">
                <div className="ac-info-label">Hạng hiện tại</div>
                <div className="ac-info-value">
                  <span className="ac-rank-badge lg" style={{ background: rk.bg, color: rk.color }}>
                    <i className="fas fa-medal"></i> {rk.label}
                  </span>
                </div>
              </div>
            )}
            <div className="ac-info-card">
              <div className="ac-info-label">Mua gần nhất</div>
              <div className="ac-info-value">
                {customer.last_purchase_at
                  ? fmtDateVN(customer.last_purchase_at)
                  : <em className="ac-empty">Chưa mua</em>}
              </div>
            </div>
          </div>

          {/* List sản phẩm đã mua */}
          <h3 className="ac-section-title">
            <i className="fas fa-box"></i> Sản phẩm đã mua ({products.length})
          </h3>
          {loading ? (
            <div className="ac-loading">⌛ Đang tải...</div>
          ) : products.length === 0 ? (
            <div className="ac-empty-state">
              <i className="far fa-box-open" style={{ fontSize: 36 }}></i>
              <p>Chưa có đơn hàng hoàn tất nào.</p>
            </div>
          ) : (
            <table className="ac-modal-table">
              <thead>
                <tr>
                  <th>Ảnh</th>
                  <th>Sản phẩm</th>
                  <th width="100px" style={{ textAlign: "right" }}>SL</th>
                  <th width="180px">Mua gần nhất</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr key={i}>
                    <td>
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="ac-product-thumb" />
                      ) : (
                        <div className="ac-thumb-placeholder"><i className="far fa-image"></i></div>
                      )}
                    </td>
                    <td>
                      <div className="ac-product-name">{p.name}</div>
                      <div className="ac-product-slug">/{p.slug || "—"}</div>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{p.qty || 0}</td>
                    <td style={{ fontSize: 12, color: "#6b7280" }}>
                      {p.last_buy_at
                        ? fmtDateVN(p.last_buy_at)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* List đơn hàng gần đây */}
          <h3 className="ac-section-title">
            <i className="fas fa-receipt"></i> Đơn hàng đã hoàn tất ({orders.length})
          </h3>
          {orders.length === 0 ? (
            <div className="ac-empty-state"><p>Chưa có đơn done nào.</p></div>
          ) : (
            <table className="ac-modal-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th width="100px" style={{ textAlign: "right" }}>SP</th>
                  <th width="140px" style={{ textAlign: "right" }}>Tổng</th>
                  <th width="140px">Ngày</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td><code style={{ fontSize: 12 }}>{o.order_code || `#${o.id}`}</code></td>
                    <td style={{ textAlign: "right" }}>{o.item_count} ({o.total_qty} sp)</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "#d70018" }}>{fmtVND(o.final_price)}</td>
                    <td style={{ fontSize: 12, color: "#6b7280" }}>
                      {fmtDateVN(o.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Voucher của KH */}
          <h3 className="ac-section-title">
            <i className="fas fa-ticket"></i> Voucher của KH ({vouchers.length})
          </h3>
          {loading ? (
            <div className="ac-loading">⌛ Đang tải...</div>
          ) : vouchers.length === 0 ? (
            <div className="ac-empty-state">
              <i className="far fa-ticket" style={{ fontSize: 36 }}></i>
              <p>Chưa có voucher nào. Dùng nút <strong>"Phát voucher theo hạng"</strong> ở trang KH để cấp.</p>
            </div>
          ) : (
            <table className="ac-modal-table ac-voucher-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th width="90px">Hạng</th>
                  <th width="120px">Giảm</th>
                  <th width="120px">Đơn tối thiểu</th>
                  <th width="140px">Hạn dùng</th>
                  <th width="110px">Trạng thái</th>
                  <th width="60px"></th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((v) => {
                  const rk = v.rank ? RANK_META[v.rank] : null;
                  const statusMap = {
                    active:   { label: "Active",    color: "#15803d", bg: "#dcfce7" },
                    used:     { label: "Đã dùng",   color: "#1d4ed8", bg: "#dbeafe" },
                    expired:  { label: "Hết hạn",   color: "#b91c1c", bg: "#fee2e2" },
                    inactive: { label: "Đã tắt",    color: "#6b7280", bg: "#f3f4f6" },
                  };
                  const st = statusMap[v.status] || statusMap.inactive;
                  return (
                    <tr key={v.id}>
                      <td>
                        <code className="ac-voucher-code">{v.code}</code>
                      </td>
                      <td>
                        {rk ? (
                          <span className="ac-rank-badge" style={{ background: rk.bg, color: rk.color }}>
                            <i className="fas fa-medal"></i> {rk.label}
                          </span>
                        ) : (
                          <em style={{ color: "#9ca3af", fontSize: 12 }}>—</em>
                        )}
                      </td>
                      <td style={{ fontWeight: 700, color: "#d70018" }}>
                        {v.discount_type === "percent"
                          ? `-${v.discount_value}%`
                          : `-${fmtVND(v.discount_value)}`}
                      </td>
                      <td style={{ fontSize: 12, color: "#4b5563" }}>
                        {v.min_order ? fmtVND(v.min_order) : <em>—</em>}
                      </td>
                      <td style={{ fontSize: 12, color: "#6b7280" }}>
                        {v.expires_at
                          ? fmtDateVN(v.expires_at)
                          : <em>Không giới hạn</em>}
                      </td>
                      <td>
                        <span
                          className="ac-voucher-badge"
                          style={{ background: st.bg, color: st.color, borderColor: st.color }}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td>
                        <button
                          className="ac-icon-btn view"
                          onClick={() => handleCopyVoucher(v.code)}
                          title="Copy mã"
                        >
                          <i className="fas fa-copy"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// MODAL: Phát voucher theo hạng (bulk — tất cả KH đạt rank)
// ════════════════════════════════════════════════════════════════════════
function IssueVoucherByRankModal({ customers, onClose }) {
  const today = new Date().toISOString().slice(0, 10);
  const in30  = new Date(Date.now() + 30 * 86400e3).toISOString().slice(0, 10);

  const [rank, setRank]             = useState("silver");
  const [code, setCode]             = useState(`TC-${rank.toUpperCase()}-${today.replace(/-/g, "")}`);
  const [discountType, setDiscount] = useState("percent");
  const [discountValue, setDV]      = useState(5);
  const [minOrder, setMinOrder]     = useState(500000);
  const [maxDiscount, setMaxDisc]   = useState(0);
  const [expiresAt, setExpires]     = useState(in30);
  const [note, setNote]             = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]         = useState(null);

  // Đếm KH theo rank hiện tại
  const targets = useMemo(
    () => customers.filter((c) => (c.rank || "bronze") === rank),
    [customers, rank]
  );

  const handleRankChange = (r) => {
    setRank(r);
    setCode(`TC-${r.toUpperCase()}-${today.replace(/-/g, "")}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targets.length) {
      alert(`Không có KH nào đạt hạng ${rank}.`);
      return;
    }
    if (!window.confirm(
      `Phát voucher "${code}" cho ${targets.length} khách hàng hạng ${rank}?`
    )) return;

    setSubmitting(true);
    try {
      const rows = targets.map((c) => ({
        customer_id:    c.customer_id,
        rank:           rank,
        is_public:      false,
        code:           code,
        discount_type:  discountType,
        discount_value: Number(discountValue) || 0,
        min_order:      Number(minOrder) || 0,
        max_discount:   Number(maxDiscount) || null,
        expires_at:     expiresAt ? new Date(expiresAt).toISOString() : null,
        is_active:      true,
        note:           note || null,
      }));

      // Insert từng row (backend generic POST /api/db/* chỉ hỗ trợ 1 row)
      let inserted = 0;
      let failed   = 0;
      for (const row of rows) {
        try {
          await request("POST", "/db/customer_vouchers", row);
          inserted += 1;
        } catch (err) {
          console.error("Insert voucher error:", err);
          failed += 1;
        }
      }

      setResult({ ok: inserted, fail: failed, total: rows.length });
    } catch (err) {
      alert("Lỗi: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ac-modal-overlay" onClick={onClose}>
      <div className="ac-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ac-modal-header">
          <div className="ac-modal-title">
            <h2><i className="fas fa-medal" style={{ color: "#a16207" }}></i> Phát voucher theo hạng</h2>
            <p>Tạo 1 mã giống nhau cho tất cả khách hàng đạt hạng được chọn. Mỗi KH nhận 1 dòng voucher riêng.</p>
          </div>
          <button className="ac-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="ac-modal-body">
          {result ? (
            <div className="ac-voucher-result">
              <i className="fas fa-check-circle" style={{ fontSize: 48, color: "#15803d" }}></i>
              <h3>Hoàn tất!</h3>
              <p>Đã phát <strong>{result.ok}</strong>/{result.total} voucher thành công.</p>
              {result.fail > 0 && (
                <p style={{ color: "#b91c1c" }}>⚠️ {result.fail} voucher thất bại (xem console).</p>
              )}
              <button className="btn-secondary" onClick={onClose}>Đóng</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="ac-voucher-form">
              <div className="ac-voucher-summary">
                <i className="fas fa-users"></i>
                <span>
                  Hạng <strong>{RANK_META[rank]?.label || rank}</strong> có <strong>{targets.length}</strong> khách đủ điều kiện.
                </span>
              </div>

              <div className="ac-form-row">
                <label>
                  Hạng khách hàng <span className="ac-required">*</span>
                </label>
                <div className="ac-rank-radio">
                  {["silver", "gold", "platinum"].map((r) => {
                    const rk = RANK_META[r];
                    const count = customers.filter((c) => (c.rank || "bronze") === r).length;
                    return (
                      <button
                        key={r}
                        type="button"
                        className={`ac-rank-option ${rank === r ? "active" : ""}`}
                        style={rank === r ? { background: rk.bg, color: rk.color, borderColor: rk.color } : {}}
                        onClick={() => handleRankChange(r)}
                      >
                        <i className="fas fa-medal"></i>
                        <span>{rk.label}</span>
                        <small>({count})</small>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="ac-form-row">
                <label>Code voucher <span className="ac-required">*</span></label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                  required
                  maxLength={32}
                />
                <small className="ac-form-hint">Mã sẽ được gán giống nhau cho tất cả KH trong batch này.</small>
              </div>

              <div className="ac-form-grid-2">
                <div className="ac-form-row">
                  <label>Loại giảm</label>
                  <select value={discountType} onChange={(e) => setDiscount(e.target.value)}>
                    <option value="percent">Phần trăm (%)</option>
                    <option value="fixed">Số tiền cố định (VND)</option>
                  </select>
                </div>
                <div className="ac-form-row">
                  <label>Giá trị giảm <span className="ac-required">*</span></label>
                  <input
                    type="number"
                    min="0"
                    value={discountValue}
                    onChange={(e) => setDV(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="ac-form-grid-2">
                <div className="ac-form-row">
                  <label>Đơn tối thiểu (VND)</label>
                  <input
                    type="number"
                    min="0"
                    value={minOrder}
                    onChange={(e) => setMinOrder(e.target.value)}
                  />
                </div>
                <div className="ac-form-row">
                  <label>Giảm tối đa (VND)</label>
                  <input
                    type="number"
                    min="0"
                    value={maxDiscount}
                    onChange={(e) => setMaxDisc(e.target.value)}
                    placeholder="Không giới hạn"
                  />
                </div>
              </div>

              <div className="ac-form-row">
                <label>Hạn sử dụng</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpires(e.target.value)}
                />
              </div>

              <div className="ac-form-row">
                <label>Ghi chú</label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="VD: Khuyến mãi T7/CN, áp dụng đến 30/7..."
                />
              </div>

              <div className="ac-form-actions">
                <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
                  Huỷ
                </button>
                <button type="submit" className="btn-primary" disabled={submitting || !targets.length}>
                  {submitting ? (
                    <><i className="fas fa-spinner fa-spin"></i> Đang phát...</>
                  ) : (
                    <><i className="fas fa-gift"></i> Phát cho {targets.length} KH</>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// MODAL: Tạo mã public (voucher cho tất cả — ai cũng nhập code dùng được)
// ════════════════════════════════════════════════════════════════════════
// function IssuePublicVoucherModal({ onClose }) {
//   const today = new Date().toISOString().slice(0, 10);
//   const in30  = new Date(Date.now() + 30 * 86400e3).toISOString().slice(0, 10);

//   const [prefix, setPrefix]         = useState("SALE");
//   const [quantity, setQuantity]     = useState(3);
//   const [discountType, setDiscount] = useState("percent");
//   const [discountValue, setDV]      = useState(10);
//   const [minOrder, setMinOrder]     = useState(0);
//   const [maxDiscount, setMaxDisc]   = useState(0);
//   const [expiresAt, setExpires]     = useState(in30);
//   const [note, setNote]             = useState("");

//   const [submitting, setSubmitting] = useState(false);
//   const [result, setResult]         = useState(null);

//   // Sinh preview code ngẫu nhiên (chỉ dùng preview; thực tế insert sẽ random lại)
//   const previewCodes = useMemo(() => {
//     return Array.from({ length: Math.min(quantity, 10) }, () => randomCode(prefix));
//   }, [prefix, quantity]);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!window.confirm(`Tạo ${quantity} mã public "${prefix}-XXXX"?`)) return;

//     setSubmitting(true);
//     try {
//       const rows = Array.from({ length: quantity }, () => ({
//         customer_id:    null,
//         rank:           null,
//         is_public:      true,
//         code:           randomCode(prefix),
//         discount_type:  discountType,
//         discount_value: Number(discountValue) || 0,
//         min_order:      Number(minOrder) || 0,
//         max_discount:   Number(maxDiscount) || null,
//         expires_at:     expiresAt ? new Date(expiresAt).toISOString() : null,
//         is_active:      true,
//         note:           note || null,
//       }));

//       const { data, error } = await supabase
//         .from("customer_vouchers")
//         .insert(rows)
//         .select("id, code, expires_at, discount_type, discount_value");

//       if (error) throw error;

//       setResult(data || []);
//     } catch (err) {
//       alert("Lỗi: " + err.message);
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   const handleCopyAll = () => {
//     const text = (result || []).map((r) => r.code).join("\n");
//     navigator.clipboard.writeText(text).then(
//       () => alert(`Đã copy ${result.length} mã vào clipboard!`),
//       () => alert("Không copy được, copy thủ công nhé.")
//     );
//   };

//   const handleDownloadCSV = () => {
//     if (!result?.length) return;
//     const lines = [
//       "code,discount_type,discount_value,expires_at",
//       ...result.map((r) => [
//         r.code,
//         r.discount_type,
//         r.discount_value,
//         r.expires_at || "",
//       ].join(",")),
//     ];
//     const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
//     const url  = URL.createObjectURL(blob);
//     const a    = document.createElement("a");
//     a.href = url;
//     a.download = `vouchers-public-${today}.csv`;
//     a.click();
//     URL.revokeObjectURL(url);
//   };

//   return (
//     <div className="ac-modal-overlay" onClick={onClose}>
//       <div className="ac-modal" onClick={(e) => e.stopPropagation()}>
//         <div className="ac-modal-header">
//           <div className="ac-modal-title">
//             <h2><i className="fas fa-globe" style={{ color: "#1d4ed8" }}></i> Tạo mã cho tất cả</h2>
//             <p>Voucher công khai — bất kỳ ai nhập code khi checkout cũng dùng được. Mỗi mã dùng 1 lần.</p>
//           </div>
//           <button className="ac-modal-close" onClick={onClose}>✕</button>
//         </div>

//         <div className="ac-modal-body">
//           {result ? (
//             <div className="ac-voucher-result">
//               <i className="fas fa-check-circle" style={{ fontSize: 48, color: "#15803d" }}></i>
//               <h3>Đã tạo {result.length} mã public!</h3>
//               <p>Copy danh sách bên dưới để gửi khách hàng qua email/Zalo:</p>
//               <div className="ac-voucher-codes-list">
//                 {result.map((r) => (
//                   <code key={r.id} className="ac-voucher-code">{r.code}</code>
//                 ))}
//               </div>
//               <div className="ac-form-actions">
//                 <button type="button" className="btn-secondary" onClick={handleDownloadCSV}>
//                   <i className="fas fa-download"></i> Tải CSV
//                 </button>
//                 <button type="button" className="btn-primary" onClick={handleCopyAll}>
//                   <i className="fas fa-copy"></i> Copy tất cả
//                 </button>
//                 <button type="button" className="btn-secondary" onClick={onClose}>Đóng</button>
//               </div>
//             </div>
//           ) : (
//             <form onSubmit={handleSubmit} className="ac-voucher-form">
//               <div className="ac-form-grid-2">
//                 <div className="ac-form-row">
//                   <label>Tiền tố code</label>
//                   <input
//                     type="text"
//                     value={prefix}
//                     onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
//                     maxLength={16}
//                     required
//                   />
//                   <small className="ac-form-hint">VD: SALE, FREESHIP, T7</small>
//                 </div>
//                 <div className="ac-form-row">
//                   <label>Số lượng mã</label>
//                   <input
//                     type="number"
//                     min="1"
//                     max="10"
//                     value={quantity}
//                     onChange={(e) => setQuantity(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
//                     required
//                   />
//                   <small className="ac-form-hint">Tối đa 10 mã / lần tạo</small>
//                 </div>
//               </div>

//               <div className="ac-form-row">
//                 <label>Preview code (sẽ random lại khi tạo)</label>
//                 <div className="ac-voucher-preview">
//                   {previewCodes.map((c, i) => (
//                     <code key={i} className="ac-voucher-code">{c}</code>
//                   ))}
//                 </div>
//               </div>

//               <div className="ac-form-grid-2">
//                 <div className="ac-form-row">
//                   <label>Loại giảm</label>
//                   <select value={discountType} onChange={(e) => setDiscount(e.target.value)}>
//                     <option value="percent">Phần trăm (%)</option>
//                     <option value="fixed">Số tiền cố định (VND)</option>
//                   </select>
//                 </div>
//                 <div className="ac-form-row">
//                   <label>Giá trị giảm <span className="ac-required">*</span></label>
//                   <input
//                     type="number"
//                     min="0"
//                     value={discountValue}
//                     onChange={(e) => setDV(e.target.value)}
//                     required
//                   />
//                 </div>
//               </div>

//               <div className="ac-form-grid-2">
//                 <div className="ac-form-row">
//                   <label>Đơn tối thiểu (VND)</label>
//                   <input
//                     type="number"
//                     min="0"
//                     value={minOrder}
//                     onChange={(e) => setMinOrder(e.target.value)}
//                   />
//                 </div>
//                 <div className="ac-form-row">
//                   <label>Giảm tối đa (VND)</label>
//                   <input
//                     type="number"
//                     min="0"
//                     value={maxDiscount}
//                     onChange={(e) => setMaxDisc(e.target.value)}
//                     placeholder="Không giới hạn"
//                   />
//                 </div>
//               </div>

//               <div className="ac-form-row">
//                 <label>Hạn sử dụng</label>
//                 <input
//                   type="date"
//                   value={expiresAt}
//                   onChange={(e) => setExpires(e.target.value)}
//                 />
//               </div>

//               <div className="ac-form-row">
//                 <label>Ghi chú</label>
//                 <textarea
//                   rows={2}
//                   value={note}
//                   onChange={(e) => setNote(e.target.value)}
//                   placeholder="VD: Flash sale T7, public dùng 1 lần..."
//                 />
//               </div>

//               <div className="ac-form-actions">
//                 <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
//                   Huỷ
//                 </button>
//                 <button type="submit" className="btn-primary" disabled={submitting}>
//                   {submitting ? (
//                     <><i className="fas fa-spinner fa-spin"></i> Đang tạo...</>
//                   ) : (
//                     <><i className="fas fa-magic"></i> Tạo {quantity} mã</>
//                   )}
//                 </button>
//               </div>
//             </form>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
function IssuePublicVoucherModal({ onClose }) {
  const today = new Date().toISOString().slice(0, 10);
  const in30  = new Date(Date.now() + 30 * 86400e3).toISOString().slice(0, 10);

  const [codesText, setCodesText]   = useState("");
  const [discountType, setDiscount] = useState("percent");
  const [discountValue, setDV]      = useState(10);
  const [minOrder, setMinOrder]     = useState(0);
  const [maxDiscount, setMaxDisc]   = useState(0);
  const [expiresAt, setExpires]     = useState(in30);
  const [note, setNote]             = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]         = useState(null);

  // Parse textarea -> list code sạch, viết hoa, bỏ dòng trống, bỏ trùng
  const parsedCodes = useMemo(() => {
    const raw = codesText
      .split("\n")
      .map((s) => s.trim().toUpperCase().replace(/\s+/g, ""))
      .filter(Boolean);
    return Array.from(new Set(raw));
  }, [codesText]);

  const duplicateCount = useMemo(() => {
    const raw = codesText
      .split("\n")
      .map((s) => s.trim().toUpperCase().replace(/\s+/g, ""))
      .filter(Boolean);
    return raw.length - new Set(raw).size;
  }, [codesText]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!parsedCodes.length) {
      alert("Nhập ít nhất 1 mã voucher.");
      return;
    }
    if (parsedCodes.length > 50) {
      alert("Tối đa 50 mã / lần tạo.");
      return;
    }
    if (!window.confirm(`Tạo ${parsedCodes.length} mã public?`)) return;

    setSubmitting(true);
    try {
      const rows = parsedCodes.map((code) => ({
        customer_id:    null,
        rank:           null,
        is_public:      true,
        code:           code,
        discount_type:  discountType,
        discount_value: Number(discountValue) || 0,
        min_order:      Number(minOrder) || 0,
        max_discount:   Number(maxDiscount) || null,
        expires_at:     expiresAt ? new Date(expiresAt).toISOString() : null,
        is_active:      true,
        note:           note || null,
      }));

      // Insert từng row (backend generic POST /api/db/* chỉ hỗ trợ 1 row)
      const inserted = [];
      for (const row of rows) {
        try {
          const r = await request("POST", "/db/customer_vouchers", row);
          if (r.data) inserted.push(r.data);
        } catch (err) {
          console.error("Insert voucher error:", err);
        }
      }

      setResult(inserted);
    } catch (err) {
      alert("Lỗi: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyAll = () => {
    const text = (result || []).map((r) => r.code).join("\n");
    navigator.clipboard.writeText(text).then(
      () => alert(`Đã copy ${result.length} mã vào clipboard!`),
      () => alert("Không copy được, copy thủ công nhé.")
    );
  };

  const handleDownloadCSV = () => {
    if (!result?.length) return;
    const lines = [
      "code,discount_type,discount_value,expires_at",
      ...result.map((r) => [
        r.code,
        r.discount_type,
        r.discount_value,
        r.expires_at || "",
      ].join(",")),
    ];
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `vouchers-public-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ac-modal-overlay" onClick={onClose}>
      <div className="ac-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ac-modal-header">
          <div className="ac-modal-title">
            <h2><i className="fas fa-globe" style={{ color: "#1d4ed8" }}></i> Tạo mã cho tất cả</h2>
            <p>Voucher công khai — bất kỳ ai nhập code khi checkout cũng dùng được. Mỗi mã dùng 1 lần.</p>
          </div>
          <button className="ac-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="ac-modal-body">
          {result ? (
            <div className="ac-voucher-result">
              <i className="fas fa-check-circle" style={{ fontSize: 48, color: "#15803d" }}></i>
              <h3>Đã tạo {result.length} mã public!</h3>
              <p>Copy danh sách bên dưới để gửi khách hàng qua email/Zalo:</p>
              <div className="ac-voucher-codes-list">
                {result.map((r) => (
                  <code key={r.id} className="ac-voucher-code">{r.code}</code>
                ))}
              </div>
              <div className="ac-form-actions">
                <button type="button" className="btn-secondary" onClick={handleDownloadCSV}>
                  <i className="fas fa-download"></i> Tải CSV
                </button>
                <button type="button" className="btn-primary" onClick={handleCopyAll}>
                  <i className="fas fa-copy"></i> Copy tất cả
                </button>
                <button type="button" className="btn-secondary" onClick={onClose}>Đóng</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="ac-voucher-form">
              <div className="ac-form-row">
                <label>
                  Danh sách mã <span className="ac-required">*</span>
                </label>
                <textarea
                  rows={6}
                  value={codesText}
                  onChange={(e) => setCodesText(e.target.value)}
                  placeholder={"Mỗi dòng 1 mã, VD:\nSALE-ABC123\nSALE-XYZ789\nFREESHIP01"}
                  style={{ fontFamily: "monospace", textTransform: "uppercase" }}
                  required
                />
                <small className="ac-form-hint">
                  {parsedCodes.length} mã hợp lệ
                  {duplicateCount > 0 && ` (đã bỏ ${duplicateCount} mã trùng)`}
                  {" "}· Tối đa 50 mã / lần.
                </small>
              </div>

              {parsedCodes.length > 0 && (
                <div className="ac-form-row">
                  <label>Preview</label>
                  <div className="ac-voucher-preview">
                    {parsedCodes.slice(0, 10).map((c, i) => (
                      <code key={i} className="ac-voucher-code">{c}</code>
                    ))}
                    {parsedCodes.length > 10 && (
                      <span style={{ fontSize: 12, color: "#6b7280" }}>
                        +{parsedCodes.length - 10} mã khác...
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="ac-form-grid-2">
                <div className="ac-form-row">
                  <label>Loại giảm</label>
                  <select value={discountType} onChange={(e) => setDiscount(e.target.value)}>
                    <option value="percent">Phần trăm (%)</option>
                    <option value="fixed">Số tiền cố định (VND)</option>
                  </select>
                </div>
                <div className="ac-form-row">
                  <label>Giá trị giảm <span className="ac-required">*</span></label>
                  <input
                    type="number"
                    min="0"
                    value={discountValue}
                    onChange={(e) => setDV(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="ac-form-grid-2">
                <div className="ac-form-row">
                  <label>Đơn tối thiểu (VND)</label>
                  <input
                    type="number"
                    min="0"
                    value={minOrder}
                    onChange={(e) => setMinOrder(e.target.value)}
                  />
                </div>
                <div className="ac-form-row">
                  <label>Giảm tối đa (VND)</label>
                  <input
                    type="number"
                    min="0"
                    value={maxDiscount}
                    onChange={(e) => setMaxDisc(e.target.value)}
                    placeholder="Không giới hạn"
                  />
                </div>
              </div>

              <div className="ac-form-row">
                <label>Hạn sử dụng</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpires(e.target.value)}
                />
              </div>

              <div className="ac-form-row">
                <label>Ghi chú</label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="VD: Flash sale T7, public dùng 1 lần..."
                />
              </div>

              <div className="ac-form-actions">
                <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
                  Huỷ
                </button>
                <button type="submit" className="btn-primary" disabled={submitting || !parsedCodes.length}>
                  {submitting ? (
                    <><i className="fas fa-spinner fa-spin"></i> Đang tạo...</>
                  ) : (
                    <><i className="fas fa-magic"></i> Tạo {parsedCodes.length} mã</>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helper: sinh code random 6 ký tự sau prefix ──────────────────────
function randomCode(prefix) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // bỏ I, O, 0, 1 (dễ nhầm)
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${s}`;
}
