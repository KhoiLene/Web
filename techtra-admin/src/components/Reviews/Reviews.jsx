// src/components/Reviews/Reviews.jsx
// Admin Reviews tab — list, filter, approve, reject, delete.

import React, { useEffect, useMemo, useState } from "react";
import { reviewsApi, productSearchApi } from "../../api.js";
import "./Reviews.css";

const STATUS_OPTIONS = [
  { value: "",            label: "Tất cả trạng thái" },
  { value: "pending",     label: "Chờ duyệt" },
  { value: "approved",    label: "Đã duyệt" },
  { value: "rejected",    label: "Bị từ chối" },
];

const RATING_OPTIONS = [
  { value: "",            label: "Tất cả sao" },
  { value: "5",           label: "★★★★★ (5 sao)" },
  { value: "4",           label: "★★★★ (4 sao)" },
  { value: "3",           label: "★★★ (3 sao)" },
  { value: "2",           label: "★★ (2 sao)" },
  { value: "1",           label: "★ (1 sao)" },
];

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  } catch {
    return iso;
  }
}

function maskPhone(p) {
  if (!p) return "—";
  const s = String(p).replace(/\s/g, "");
  if (s.length < 6) return s;
  return s.slice(0, 3) + "****" + s.slice(-3);
}

function statusBadge(s) {
  if (s === "approved" || (s == null && false)) return <span className="rev-badge rev-badge--ok">Đã duyệt</span>;
  if (s === "rejected") return <span className="rev-badge rev-badge--bad">Bị từ chối</span>;
  return <span className="rev-badge rev-badge--wait">Chờ duyệt</span>;
}

export default function Reviews() {
  const [list, setList]           = useState([]);
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRating, setFilterRating] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [search, setSearch]       = useState("");
  const [detail, setDetail]       = useState(null);
  const [stats, setStats]         = useState({ total: 0, pending: 0, approved: 0, rejected: 0, avgRating: 0, countRating: 0 });

  // Load products (cho dropdown filter)
  useEffect(() => {
    productSearchApi.getAll()
      .then((r) => setProducts(r.data || []))
      .catch((e) => console.warn("[reviews] load products failed:", e.message));
  }, []);

  async function reload() {
    setLoading(true);
    try {
      const params = { order: "created_at.desc" };
      if (filterStatus)  params.status     = filterStatus;
      if (filterRating)  params.rating     = filterRating;
      if (filterProduct) params.product_id = filterProduct;
      if (search.trim()) params.search     = search.trim();
      const r = await reviewsApi.getAll(params);
      setList(r.data || []);
    } catch (e) {
      console.error(e);
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filterStatus, filterRating, filterProduct]);

  // Compute stats từ list hiện tại (khi list thay đổi)
  useEffect(() => {
    const pending  = list.filter((x) => !x.is_approved && x.status !== "rejected").length;
    const approved = list.filter((x) => x.is_approved).length;
    const rejected = list.filter((x) => x.status === "rejected").length;
    const sumRated = list.filter((x) => x.is_approved).reduce((s, x) => s + (Number(x.rating) || 0), 0);
    const countRated = list.filter((x) => x.is_approved).length;
    setStats({
      total: list.length,
      pending,
      approved,
      rejected,
      avgRating: countRated > 0 ? sumRated / countRated : 0,
      countRating: countRated,
    });
  }, [list]);

  // Search w/ debounce
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [search]);

  async function handleApprove(r) {
    if (!confirm(`Duyệt đánh giá của "${r.reviewer_name || "Khách"}"?`)) return;
    try {
      await reviewsApi.approve(r.id);
      await reload();
    } catch (e) {
      alert("Duyệt thất bại: " + e.message);
    }
  }

  async function handleReject(r) {
    if (!confirm(`Từ chối đánh giá của "${r.reviewer_name || "Khách"}"?`)) return;
    try {
      await reviewsApi.reject(r.id);
      await reload();
    } catch (e) {
      alert("Từ chối thất bại: " + e.message);
    }
  }

  async function handleDelete(r) {
    if (!confirm(`XÓA VĨNH VIỄN đánh giá của "${r.reviewer_name || "Khách"}"? Hành động này không thể hoàn tác.`)) return;
    try {
      await reviewsApi.remove(r.id);
      await reload();
    } catch (e) {
      alert("Xoá thất bại: " + e.message);
    }
  }

  // Search/filter mềm
  const visible = useMemo(() => {
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter((r) =>
      (r.reviewer_name || "").toLowerCase().includes(q) ||
      (r.phone || "").toLowerCase().includes(q) ||
      (r.comment || "").toLowerCase().includes(q)
    );
  }, [list, search]);

  return (
    <div className="rev-page">
      <div className="rev-page__head">
        <div>
          <h2 className="rev-page__title">Quản lý đánh giá</h2>
          <p className="rev-page__subtitle">
            Xem, duyệt, từ chối hoặc xoá đánh giá từ khách hàng.
          </p>
        </div>
        <button type="button" className="rev-btn rev-btn--ghost" onClick={reload}>
          <i className="fas fa-sync" /> Tải lại
        </button>
      </div>

      {/* Stats cards */}
      <div className="rev-stats">
        <div className="rev-stat rev-stat--total">
          <div className="rev-stat__icon"><i className="fas fa-comments" /></div>
          <div>
            <div className="rev-stat__label">Tổng đánh giá</div>
            <div className="rev-stat__value">{stats.total}</div>
          </div>
        </div>
        <div className="rev-stat rev-stat--wait">
          <div className="rev-stat__icon"><i className="fas fa-hourglass-half" /></div>
          <div>
            <div className="rev-stat__label">Chờ duyệt</div>
            <div className="rev-stat__value">{stats.pending}</div>
          </div>
        </div>
        <div className="rev-stat rev-stat--ok">
          <div className="rev-stat__icon"><i className="fas fa-check-circle" /></div>
          <div>
            <div className="rev-stat__label">Đã duyệt</div>
            <div className="rev-stat__value">{stats.approved}</div>
          </div>
        </div>
        <div className="rev-stat rev-stat--bad">
          <div className="rev-stat__icon"><i className="fas fa-times-circle" /></div>
          <div>
            <div className="rev-stat__label">Bị từ chối</div>
            <div className="rev-stat__value">{stats.rejected}</div>
          </div>
        </div>
        <div className="rev-stat rev-stat--rating">
          <div className="rev-stat__icon"><i className="fas fa-star" /></div>
          <div>
            <div className="rev-stat__label">Trung bình (đã duyệt)</div>
            <div className="rev-stat__value">
              {stats.countRating > 0 ? `${stats.avgRating.toFixed(1)} ★` : "—"}
              <small style={{ marginLeft: 6, fontSize: 12, color: "#6b7280" }}>
                ({stats.countRating})
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rev-filters">
        <div className="rev-filter">
          <label>Tìm kiếm</label>
          <input
            type="text"
            className="rev-input"
            placeholder="Tên, SĐT, nội dung..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="rev-filter">
          <label>Trạng thái</label>
          <select className="rev-input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="rev-filter">
          <label>Số sao</label>
          <select className="rev-input" value={filterRating} onChange={(e) => setFilterRating(e.target.value)}>
            {RATING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="rev-filter">
          <label>Sản phẩm</label>
          <select className="rev-input" value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)}>
            <option value="">Tất cả sản phẩm</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rev-table-wrap">
        {loading ? (
          <div className="rev-loading"><i className="fas fa-spinner fa-spin" /> Đang tải...</div>
        ) : visible.length === 0 ? (
          <div className="rev-empty">
            <i className="fas fa-inbox" />
            <p>Chưa có đánh giá nào phù hợp bộ lọc.</p>
          </div>
        ) : (
          <table className="rev-table">
            <thead>
              <tr>
                <th>Sao</th>
                <th>Sản phẩm</th>
                <th>Người đánh giá</th>
                <th>SĐT</th>
                <th>Bình luận</th>
                <th>Trạng thái</th>
                <th>Ngày</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const prod = products.find((p) => Number(p.id) === Number(r.product_id));
                const filled = Math.max(0, Math.min(5, Number(r.rating) || 0));
                const stars = "★".repeat(filled) + "☆".repeat(5 - filled);
                const status = r.is_approved ? "approved" : (r.status === "rejected" ? "rejected" : "pending");
                return (
                  <tr key={r.id}>
                    <td><span className="rev-stars">{stars}</span></td>
                    <td>
                      <div className="rev-product">
                        <strong>{prod?.name || `#${r.product_id}`}</strong>
                        {prod?.slug && <small className="rev-product__sku">/{prod.slug}</small>}
                      </div>
                    </td>
                    <td>{r.reviewer_name || "Khách hàng"}</td>
                    <td>{maskPhone(r.phone)}</td>
                    <td>
                      <div className="rev-comment" title={r.comment || ""}>
                        {r.comment ? (r.comment.length > 60 ? r.comment.slice(0, 60) + "…" : r.comment) : <em>—</em>}
                      </div>
                    </td>
                    <td>{statusBadge(status)}</td>
                    <td><small>{fmtDate(r.created_at)}</small></td>
                    <td>
                      <div className="rev-actions">
                        <button
                          type="button"
                          className="rev-icon-btn"
                          title="Xem chi tiết"
                          onClick={() => setDetail(r)}
                        >
                          <i className="fas fa-eye" />
                        </button>
                        {!r.is_approved && (
                          <button
                            type="button"
                            className="rev-icon-btn rev-icon-btn--ok"
                            title="Duyệt"
                            onClick={() => handleApprove(r)}
                          >
                            <i className="fas fa-check" />
                          </button>
                        )}
                        {r.is_approved && (
                          <button
                            type="button"
                            className="rev-icon-btn rev-icon-btn--bad"
                            title="Từ chối"
                            onClick={() => handleReject(r)}
                          >
                            <i className="fas fa-ban" />
                          </button>
                        )}
                        <button
                          type="button"
                          className="rev-icon-btn rev-icon-btn--danger"
                          title="Xoá vĩnh viễn"
                          onClick={() => handleDelete(r)}
                        >
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail modal */}
      {detail && (
        <div className="rev-modal" onClick={() => setDetail(null)}>
          <div className="rev-modal__panel" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="rev-modal__close" onClick={() => setDetail(null)} aria-label="Đóng">×</button>
            <h3>Chi tiết đánh giá #{detail.id}</h3>
            <div className="rev-modal__row"><strong>Sản phẩm:</strong> #{detail.product_id}</div>
            <div className="rev-modal__row"><strong>Tên:</strong> {detail.reviewer_name || "—"}</div>
            <div className="rev-modal__row"><strong>SĐT:</strong> {detail.phone || "—"}</div>
            <div className="rev-modal__row"><strong>Số sao:</strong> {"★".repeat(Math.max(0, Math.min(5, Number(detail.rating) || 0)))}</div>
            <div className="rev-modal__row"><strong>Bình luận:</strong></div>
            <div className="rev-modal__comment">{detail.comment || <em>Không có</em>}</div>
            <div className="rev-modal__row"><strong>Ngày:</strong> {fmtDate(detail.created_at)}</div>
            <div className="rev-modal__row">
              <strong>Trạng thái:</strong> {statusBadge(detail.is_approved ? "approved" : (detail.status === "rejected" ? "rejected" : "pending"))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}