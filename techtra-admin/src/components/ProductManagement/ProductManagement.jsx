import React, { useState, useEffect, useCallback } from "react";
import "./ProductManagement.css";
import CreateProduct from "./CreateProduct.jsx";
import { productsApi, productGroupsApi } from "../../api";

const STATUS_TABS = ["Tất cả", "Trên kệ", "Đang xem xét", "Cần chú ý", "Đã vô hiệu hóa", "Đã xóa"];
const LIMIT = 20;

export default function ProductManagement() {
  const [isCreating,      setIsCreating]      = useState(false);
  const [editingProduct,  setEditingProduct]  = useState(null);
  const [activeTab,       setActiveTab]       = useState("Tất cả");

  const [products,        setProducts]        = useState([]);
  const [groups,          setGroups]          = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState("");
  const [searchText,      setSearchText]      = useState("");
  const [selectedGroup,   setSelectedGroup]   = useState("");
  const [selected,        setSelected]        = useState([]);
  const [page,            setPage]            = useState(1);
  const [total,           setTotal]           = useState(0);

  // ─── Fetch sản phẩm ────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: LIMIT };
      if (searchText)    params.search   = searchText;
      if (selectedGroup) params.group_id = selectedGroup;

      const res = await productsApi.getAll(params);
      setProducts(res.data  || []);
      setTotal(res.total    || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, searchText, selectedGroup]);

  // ─── Fetch nhóm (dropdown filter) ─────────────────────────────────────────
  const fetchGroups = useCallback(async () => {
    try {
      const res = await productGroupsApi.getAll();
      setGroups(res.data || []);
    } catch {}
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { fetchGroups();   }, [fetchGroups]);

  // ─── Xóa 1 sản phẩm ───────────────────────────────────────────────────────
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Xóa sản phẩm "${name}"?`)) return;
    try {
      await productsApi.remove(id);
      fetchProducts();
    } catch (err) {
      alert("Lỗi xóa: " + err.message);
    }
  };

  // ─── Xóa nhiều ────────────────────────────────────────────────────────────
  const handleDeleteSelected = async () => {
    if (!selected.length || !window.confirm(`Xóa ${selected.length} sản phẩm?`)) return;
    try {
      await Promise.all(selected.map((id) => productsApi.remove(id)));
      setSelected([]);
      fetchProducts();
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  };

  // ─── Sau khi lưu ──────────────────────────────────────────────────────────
  const handleSaved = () => {
    setIsCreating(false);
    setEditingProduct(null);
    fetchProducts();
  };

  // ─── Select ────────────────────────────────────────────────────────────────
  const allSelected = products.length > 0 && selected.length === products.length;
  const toggleAll   = () => setSelected(allSelected ? [] : products.map((p) => p.id));
  const toggleOne   = (id) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const fmt = (n) => Number(n).toLocaleString("vi-VN") + " đ";

  // ─── Render form tạo/sửa ──────────────────────────────────────────────────
  if (isCreating || editingProduct) {
    return (
      <CreateProduct
        initialData={editingProduct}
        groups={groups}
        onBack={() => { setIsCreating(false); setEditingProduct(null); }}
        onSaved={handleSaved}
      />
    );
  }

  return (
    <div className="main-content">

      {/* Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Quản lý sản phẩm</h1>
        <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
          + Thêm sản phẩm
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            className={`tab${activeTab === tab ? " active" : ""}`}
            onClick={() => { setActiveTab(tab); setPage(1); }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: "10px", margin: "16px 0", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
          <i className="fas fa-search" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm..."
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
            style={{ width: "100%", padding: "9px 12px 9px 36px", border: "1px solid #d1d5db", borderRadius: "8px", boxSizing: "border-box", outline: "none", fontSize: "14px" }}
          />
        </div>

        <select
          value={selectedGroup}
          onChange={(e) => { setSelectedGroup(e.target.value); setPage(1); }}
          style={{ padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: "8px", outline: "none", fontSize: "14px", color: selectedGroup ? "#111827" : "#9ca3af" }}
        >
          <option value="">Tất cả nhóm</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>

        {selected.length > 0 && (
          <button
            onClick={handleDeleteSelected}
            style={{ padding: "9px 14px", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}
          >
            🗑 Xóa {selected.length} mục
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", fontSize: "14px", marginBottom: "16px" }}>
          ⚠️ {error} —{" "}
          <button onClick={fetchProducts} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", textDecoration: "underline" }}>
            Thử lại
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px", color: "#9ca3af" }}>⌛ Đang tải sản phẩm...</div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">😊</div>
          <h3>Chưa có sản phẩm</h3>
          <p>Bắt đầu bằng cách thêm sản phẩm mới.</p>
          <div className="empty-actions">
            <button className="btn btn-primary" onClick={() => setIsCreating(true)}>Thêm sản phẩm</button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "12px 16px", width: "40px" }}>
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left",   fontWeight: "600", color: "#374151" }}>Sản phẩm</th>
                  <th style={{ padding: "12px 16px", textAlign: "left",   fontWeight: "600", color: "#374151" }}>Nhóm</th>
                  <th style={{ padding: "12px 16px", textAlign: "right",  fontWeight: "600", color: "#374151" }}>Giá</th>
                  <th style={{ padding: "12px 16px", textAlign: "right",  fontWeight: "600", color: "#374151" }}>Tồn kho</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: "600", color: "#374151" }}>Trạng thái</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: "600", color: "#374151" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr
                    key={p.id}
                    style={{ borderBottom: "1px solid #f3f4f6" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#fafafa"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleOne(p.id)} />
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={p.name} style={{ width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "40px", height: "40px", background: "#f3f4f6", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#d1d5db" }}>📦</div>
                        )}
                        <div>
                          <div style={{ fontWeight: "600", color: "#111827", cursor: "pointer" }} onClick={() => setEditingProduct(p)}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: "12px", color: "#9ca3af" }}>SKU: {p.sku || "--"}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#6b7280" }}>{p.group_name || "--"}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <div style={{ fontWeight: "600", color: "#111827" }}>{fmt(p.final_price || p.price)}</div>
                      {p.discount > 0 && <div style={{ fontSize: "12px", color: "#10b981" }}>-{p.discount}%</div>}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <span style={{ color: p.stock <= 0 ? "#dc2626" : p.stock < 10 ? "#f59e0b" : "#111827", fontWeight: "600" }}>
                        {p.stock}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", background: p.is_active ? "#dcfce7" : "#f3f4f6", color: p.is_active ? "#16a34a" : "#6b7280" }}>
                        {p.is_active ? "Đang bán" : "Ẩn"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <button onClick={() => setEditingProduct(p)} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "14px", marginRight: "8px" }} title="Sửa">✏️</button>
                      <button onClick={() => handleDelete(p.id, p.name)} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "14px" }} title="Xóa">🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", fontSize: "14px", color: "#6b7280" }}>
            <span>Hiển thị {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} / {total} sản phẩm</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ padding: "6px 14px", border: "1px solid #d1d5db", borderRadius: "6px", background: "white", cursor: page === 1 ? "not-allowed" : "pointer", color: page === 1 ? "#d1d5db" : "#374151" }}
              >← Trước</button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * LIMIT >= total}
                style={{ padding: "6px 14px", border: "1px solid #d1d5db", borderRadius: "6px", background: "white", cursor: page * LIMIT >= total ? "not-allowed" : "pointer", color: page * LIMIT >= total ? "#d1d5db" : "#374151" }}
              >Sau →</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}