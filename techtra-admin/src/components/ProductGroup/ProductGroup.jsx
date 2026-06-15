import React, { useState, useEffect, useCallback } from "react";
import "./ProductGroup.css";
import CreateProductGroup from "./CreateProductGroup.jsx";
import { productGroupsApi } from "../../api";

export default function ProductGroup() {
  const [isCreating, setIsCreating]     = useState(false);
  const [editingGroup, setEditingGroup] = useState(null); // null = tạo mới, object = sửa

  // ─── State data ──────────────────────────────────────────────────────────────
  const [groups, setGroups]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [searchText, setSearchText] = useState("");
  const [selected, setSelected]   = useState([]); // id các hàng được tick

  // ─── Fetch danh sách nhóm từ API ─────────────────────────────────────────────
  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await productGroupsApi.getAll();
      setGroups(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  // ─── Xóa nhóm ────────────────────────────────────────────────────────────────
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Xóa nhóm "${name}"?`)) return;
    try {
      await productGroupsApi.remove(id);
      setGroups((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      alert("Lỗi xóa: " + err.message);
    }
  };

  // ─── Xóa nhiều ───────────────────────────────────────────────────────────────
  const handleDeleteSelected = async () => {
    if (!selected.length) return;
    if (!window.confirm(`Xóa ${selected.length} nhóm đã chọn?`)) return;
    try {
      await Promise.all(selected.map((id) => productGroupsApi.remove(id)));
      setGroups((prev) => prev.filter((g) => !selected.includes(g.id)));
      setSelected([]);
    } catch (err) {
      alert("Lỗi xóa: " + err.message);
    }
  };

  // ─── Callback khi CreateProductGroup lưu xong ────────────────────────────────
  const handleSaved = () => {
    setIsCreating(false);
    setEditingGroup(null);
    fetchGroups(); // reload lại danh sách
  };

  // ─── Filter search ────────────────────────────────────────────────────────────
  const filtered = groups.filter((g) =>
    g.name.toLowerCase().includes(searchText.toLowerCase())
  );

  // ─── Select all ──────────────────────────────────────────────────────────────
  const allSelected = filtered.length > 0 && selected.length === filtered.length;
  const toggleAll   = () => setSelected(allSelected ? [] : filtered.map((g) => g.id));
  const toggleOne   = (id) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  // ─── Render form tạo / sửa ────────────────────────────────────────────────────
  if (isCreating || editingGroup) {
    return (
      <div className="product-group-wrapper">
        <CreateProductGroup
          initialData={editingGroup}
          onBack={() => { setIsCreating(false); setEditingGroup(null); }}
          onSaved={handleSaved}
        />
      </div>
    );
  }

  return (
    <div className="product-group-wrapper">
      <div className="group-header">
        <h1>Danh sách nhóm sản phẩm</h1>
        <button className="btn-add-group" onClick={() => setIsCreating(true)}>
          <i className="fas fa-plus-circle"></i> Tạo nhóm sản phẩm
        </button>
      </div>

      <div className="group-container">
        <div className="filter-tab">
          <button className="tab-btn active">Tất cả danh mục</button>
        </div>

        <div className="search-filter-row">
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Tìm kiếm nhóm sản phẩm..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          {selected.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              style={{ padding: "8px 14px", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}
            >
              🗑 Xóa {selected.length} mục
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", fontSize: "14px", margin: "12px 0" }}>
            ⚠️ {error} — <button onClick={fetchGroups} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", textDecoration: "underline" }}>Thử lại</button>
          </div>
        )}

        <div className="summary-text">
          {loading ? "Đang tải..." : `Có ${filtered.length} nhóm sản phẩm`}
        </div>

        <div className="table-responsive">
          <table className="group-table">
            <thead>
              <tr>
                <th width="40px"><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
                <th>Tên nhóm</th>
                <th width="120px" style={{ textAlign: "right" }}>Số sản phẩm</th>
                <th width="150px">Điều kiện nhóm</th>
                <th width="100px" style={{ textAlign: "center" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: "32px", color: "#9ca3af" }}>⌛ Đang tải dữ liệu...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: "32px", color: "#9ca3af" }}>Chưa có nhóm sản phẩm nào</td></tr>
              ) : (
                filtered.map((group) => (
                  <tr key={group.id}>
                    <td><input type="checkbox" checked={selected.includes(group.id)} onChange={() => toggleOne(group.id)} /></td>
                    <td>
                      <div className="group-name-cell">
                        {group.image_url ? (
                          <img src={group.image_url} alt={group.name} style={{ width: "36px", height: "36px", borderRadius: "6px", objectFit: "cover" }} />
                        ) : (
                          <div className="img-placeholder"><i className="far fa-image"></i></div>
                        )}
                        <span
                          className="group-link"
                          onClick={() => setEditingGroup(group)}
                          style={{ cursor: "pointer", color: "#2563eb" }}
                        >
                          {group.name}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>{group.product_count ?? 0}</td>
                    <td className="condition-cell">
                      {group.condition_type === "automatic" ? "Tự động" : group.condition_type === "manual" ? "Thủ công" : "--"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        onClick={() => setEditingGroup(group)}
                        style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "13px", marginRight: "8px" }}
                        title="Sửa"
                      >✏️</button>
                      <button
                        onClick={() => handleDelete(group.id, group.name)}
                        style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "13px" }}
                        title="Xóa"
                      >🗑</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}