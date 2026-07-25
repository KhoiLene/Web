import React, { useState, useEffect, useCallback, useMemo } from "react";
import "./ProductGroup.css";
import CreateProductGroup from "./CreateProductGroup.jsx";
import { productGroupsApi, productsApi } from "../../api";
import { supabase } from "../../api";

// ─── Helpers ─────────────────────────────────────────────────────────────
const fmtVND = (n) => Number(n || 0).toLocaleString("vi-VN") + "đ";

const STATUS_FILTERS = [
  { key: "all",       label: "Tất cả",        icon: "fa-list" },
  { key: "active",    label: "Đang hiển thị", icon: "fa-eye" },
  { key: "inactive",  label: "Đang ẩn",       icon: "fa-eye-slash" },
  { key: "slider",    label: "Trong slider",  icon: "fa-images" },
];

export default function ProductGroup() {
  // ─── State chính ──────────────────────────────────────────────────────────
  const [groups, setGroups]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [searchText, setSearchText]   = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | inactive | slider
  const [selected, setSelected]       = useState([]); // ids

  // Modal
  const [isCreating, setIsCreating]   = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [viewingGroup, setViewingGroup] = useState(null);
  // Tạo nhóm con: lưu parentId để truyền cho form
  const [creatingChildOf, setCreatingChildOf] = useState(null);

  // Count realtime từ bảng products
  const [productCounts, setProductCounts] = useState({});
  const [countsLoading, setCountsLoading] = useState(false);

  // ─── Fetch ────────────────────────────────────────────────────────────────
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

  const fetchProductCounts = useCallback(async () => {
    setCountsLoading(true);
    try {
      const { data: products, error: pErr } = await supabase
        .from("products")
        .select("group_id");
      if (pErr) throw new Error(pErr.message);

      const counts = {};
      (products || []).forEach((p) => {
        if (p.group_id == null) return;
        counts[p.group_id] = (counts[p.group_id] || 0) + 1;
      });
      setProductCounts(counts);
    } catch (err) {
      console.warn("Không lấy được số SP theo nhóm:", err.message);
    } finally {
      setCountsLoading(false);
    }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);
  useEffect(() => { fetchProductCounts(); }, [fetchProductCounts, groups]);

  // ─── Hành động ────────────────────────────────────────────────────────────
  const handleDelete = async (id, name) => {
    const isParent = groups.find((g) => g.id === id)?.parent_id == null;
    const childCount = groups.filter((g) => g.parent_id === id).length;
    const productCount = productCounts[id] || 0;

    let warn = `Xóa nhóm "${name}"?`;
    if (childCount > 0) {
      warn += `\n\nNhóm này có ${childCount} nhóm con — tất cả nhóm con cũng sẽ bị xóa theo.`;
    }
    if (productCount > 0) {
      warn += `\n\nĐang có ${productCount} sản phẩm — sẽ chuyển về "Chưa phân nhóm".`;
    }
    if (!window.confirm(warn)) return;
    try {
      await productGroupsApi.remove(id);
      setGroups((prev) => prev.filter((g) => g.id !== id && g.parent_id !== id));
      setSelected((prev) => prev.filter((x) => x !== id));
    } catch (err) {
      alert("Lỗi xóa: " + err.message);
    }
  };

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

  const handleBulkToggleActive = async (active) => {
    if (!selected.length) return;
    const action = active ? "hiển thị" : "ẩn";
    if (!window.confirm(`${active ? "Hiển thị" : "Ẩn"} ${selected.length} nhóm đã chọn trên website?`)) return;
    try {
      await Promise.all(selected.map((id) => productGroupsApi.update(id, { is_active: active })));
      setGroups((prev) => prev.map((g) => selected.includes(g.id) ? { ...g, is_active: active } : g));
      alert(`Đã ${action} ${selected.length} nhóm.`);
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  };

  const handleBulkToggleSlider = async (slider) => {
    if (!selected.length) return;
    if (!window.confirm(`${slider ? "Đưa" : "Bỏ"} ${selected.length} nhóm ${slider ? "vào" : "khỏi"} slider trang chủ?`)) return;
    try {
      await Promise.all(selected.map((id) => productGroupsApi.update(id, { is_slider: slider })));
      setGroups((prev) => prev.map((g) => selected.includes(g.id) ? { ...g, is_slider: slider } : g));
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  };

  const handleToggleField = async (group, field, value) => {
    try {
      await productGroupsApi.update(group.id, { [field]: value });
      setGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, [field]: value } : g));
    } catch (err) {
      alert("Lỗi cập nhật: " + err.message);
    }
  };

  const handleSaved = () => {
    setIsCreating(false);
    setEditingGroup(null);
    setCreatingChildOf(null);
    fetchGroups();
  };

  // ─── Build cây 1 cấp (parent → children) ──────────────────────────────────
  const tree = useMemo(() => {
    const roots = groups.filter((g) => g.parent_id == null);
    return roots.map((root) => ({
      ...root,
      children: groups
        .filter((g) => g.parent_id === root.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    }));
  }, [groups]);

  // ─── Filter + search (áp dụng cho cả cha và con) ─────────────────────────
  const matchedRootIds = useMemo(() => {
    const q = searchText.toLowerCase();
    if (!q) return new Set(groups.map((g) => g.id));
    const set = new Set();
    groups.forEach((g) => {
      const matchName = g.name.toLowerCase().includes(q);
      const matchSlug = (g.slug || "").toLowerCase().includes(q);
      if (matchName || matchSlug) set.add(g.id);
    });
    return set;
  }, [groups, searchText]);

  const visibleTree = useMemo(() => {
    return tree
      .map((root) => {
        // Lọc con: giữ lại các con khớp search/filter
        const filteredChildren = root.children.filter((c) => {
          if (statusFilter === "active"   && !c.is_active) return false;
          if (statusFilter === "inactive" &&  c.is_active) return false;
          if (statusFilter === "slider"   && !c.is_slider) return false;
          if (searchText && !matchedRootIds.has(c.id)) return false;
          return true;
        });
        // Cha khớp search/filter?
        const rootVisible =
          (statusFilter === "active"   && !root.is_active) ? false :
          (statusFilter === "inactive" &&  root.is_active) ? false :
          (statusFilter === "slider"   && !root.is_slider) ? false :
          (searchText ? matchedRootIds.has(root.id) : true);
        if (!rootVisible) {
          // Nếu cha ẩn nhưng có con khớp → vẫn ẩn (giữ logic đơn giản: cha ẩn = cả nhánh ẩn)
          return null;
        }
        return { ...root, children: filteredChildren };
      })
      .filter(Boolean);
  }, [tree, statusFilter, searchText, matchedRootIds]);

  // Count tổng theo filter (cho badge)
  const filterCounts = useMemo(() => {
    const c = { all: 0, active: 0, inactive: 0, slider: 0 };
    groups.forEach((g) => {
      c.all++;
      if (g.is_active) c.active++; else c.inactive++;
      if (g.is_slider) c.slider++;
    });
    return c;
  }, [groups]);

  // ─── Select ───────────────────────────────────────────────────────────────
  const allVisibleIds = useMemo(
    () => visibleTree.flatMap((r) => [r.id, ...r.children.map((c) => c.id)]),
    [visibleTree]
  );
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selected.includes(id));
  const toggleAll = () => setSelected(allSelected ? [] : allVisibleIds);
  const toggleOne = (id) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  // ─── Render form tạo / sửa ────────────────────────────────────────────────
  if (isCreating || editingGroup || creatingChildOf != null) {
    return (
      <div className="product-group-wrapper">
        <CreateProductGroup
          initialData={editingGroup}
          defaultParentId={creatingChildOf}
          onBack={() => { setIsCreating(false); setEditingGroup(null); setCreatingChildOf(null); }}
          onSaved={handleSaved}
        />
      </div>
    );
  }

  return (
    <div className="product-group-wrapper">
      <div className="group-header">
        <div>
          <h1>Danh sách nhóm sản phẩm</h1>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: "4px 0 0" }}>
            Quản lý các danh mục sản phẩm hiển thị trên website — hỗ trợ nhóm lớn / nhóm con 1 cấp.
          </p>
        </div>
        <button className="btn-add-group" onClick={() => setIsCreating(true)}>
          <i className="fas fa-plus-circle"></i> Tạo nhóm sản phẩm
        </button>
      </div>

      <div className="group-container">
        {/* ─── TABS LỌC ───────────────────────────────────────────────────── */}
        <div className="group-filter-tabs">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              className={`group-tab-btn ${statusFilter === f.key ? "active" : ""}`}
              onClick={() => setStatusFilter(f.key)}
            >
              <i className={`fas ${f.icon}`}></i>
              <span>{f.label}</span>
              <span className="group-tab-count">{filterCounts[f.key] || 0}</span>
            </button>
          ))}
        </div>

        {/* ─── TOOLBAR ────────────────────────────────────────────────────── */}
        <div className="search-filter-row">
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Tìm theo tên nhóm hoặc slug..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            {searchText && (
              <button
                className="search-clear"
                onClick={() => setSearchText("")}
                title="Xóa tìm kiếm"
              >×</button>
            )}
          </div>

          {selected.length > 0 ? (
            <div className="bulk-actions">
              <span className="bulk-label">Đã chọn {selected.length}:</span>
              <button className="bulk-btn" onClick={() => handleBulkToggleActive(true)}>
                <i className="fas fa-eye"></i> Hiển thị
              </button>
              <button className="bulk-btn" onClick={() => handleBulkToggleActive(false)}>
                <i className="fas fa-eye-slash"></i> Ẩn
              </button>
              <button className="bulk-btn" onClick={() => handleBulkToggleSlider(true)}>
                <i className="fas fa-images"></i> Vào slider
              </button>
              <button className="bulk-btn" onClick={() => handleBulkToggleSlider(false)}>
                <i className="fas fa-image"></i> Bỏ slider
              </button>
              <button className="bulk-btn danger" onClick={handleDeleteSelected}>
                <i className="fas fa-trash"></i> Xóa
              </button>
              <button className="bulk-btn ghost" onClick={() => setSelected([])}>
                Bỏ chọn
              </button>
            </div>
          ) : (
            <div className="bulk-actions">
              <button className="bulk-btn ghost" onClick={fetchGroups} title="Tải lại">
                <i className="fas fa-rotate"></i> Tải lại
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="group-error">
            ⚠️ {error} — <button onClick={fetchGroups}>Thử lại</button>
          </div>
        )}

        <div className="summary-text">
          {loading
            ? "Đang tải..."
            : `Có ${visibleTree.length} nhóm lớn${searchText ? ` (lọc từ ${groups.length})` : ""}`}
          {countsLoading && <span style={{ marginLeft: 8, color: "#9ca3af" }}>· đang đếm SP...</span>}
        </div>

        <div className="table-responsive">
          <table className="group-table">
            <thead>
              <tr>
                <th width="40px">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                </th>
                <th>Tên nhóm</th>
                <th width="110px" style={{ textAlign: "right" }}>Số sản phẩm</th>
                <th width="150px">Trạng thái</th>
                <th width="120px">Slider</th>
                <th width="120px">Loại menu</th>
                <th width="160px">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "#9ca3af" }}>
                    ⌛ Đang tải dữ liệu...
                  </td>
                </tr>
              ) : visibleTree.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "#9ca3af" }}>
                    {searchText
                      ? `Không tìm thấy nhóm nào khớp "${searchText}"`
                      : "Chưa có nhóm sản phẩm nào"}
                  </td>
                </tr>
              ) : (
                visibleTree.flatMap((root) => {
                  const realRootCount = productCounts[root.id] ?? root.product_count ?? 0;
                  const childCount = root.children.length;
                  return [
                    /* ── DÒNG CHA ── */
                    <tr key={root.id} className={`pg-tree-row parent ${selected.includes(root.id) ? "row-selected" : ""}`}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.includes(root.id)}
                          onChange={() => toggleOne(root.id)}
                        />
                      </td>
                      <td>
                        <div className="group-name-cell">
                          {root.image_url ? (
                            <img src={root.image_url} alt={root.name} className="group-thumb" />
                          ) : (
                            <div className="img-placeholder">
                              <i className="far fa-image"></i>
                            </div>
                          )}
                          <div className="group-name-text">
                            <span
                              className="group-link"
                              onClick={() => setEditingGroup(root)}
                              title="Sửa nhóm này"
                            >
                              <i className="fas fa-folder-tree" style={{ color: "#1d4ed8", marginRight: 4 }} />
                              {root.name}
                            </span>
                            <span className="group-slug">/{root.slug}</span>
                            <div style={{ marginTop: 4 }}>
                              <span className="pg-parent-badge">Nhóm lớn</span>
                              {childCount > 0 && (
                                <span className="pg-children-count">· {childCount} nhóm con</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="count-link"
                          onClick={() => setViewingGroup(root)}
                          title="Xem sản phẩm trong nhóm này"
                          disabled={!realRootCount}
                        >
                          {realRootCount}
                        </button>
                      </td>
                      <td>
                        <label className="switch" title="Bật/tắt hiển thị">
                          <input
                            type="checkbox"
                            checked={!!root.is_active}
                            onChange={(e) => handleToggleField(root, "is_active", e.target.checked)}
                          />
                          <span className="slider-switch"></span>
                        </label>
                        <span className={`status-pill ${root.is_active ? "on" : "off"}`}>
                          {root.is_active ? "Hiển thị" : "Đang ẩn"}
                        </span>
                      </td>
                      <td>
                        <label className="switch slider-on" title="Bật/tắt slider trang chủ">
                          <input
                            type="checkbox"
                            checked={!!root.is_slider}
                            onChange={(e) => handleToggleField(root, "is_slider", e.target.checked)}
                          />
                          <span className="slider-switch"></span>
                        </label>
                      </td>
                      <td>
                        {root.is_sale ? (
                          <span
                            className="pg-sale-badge"
                            title="Nhóm này hiển thị ở menu SALE trên header"
                            onClick={() => handleToggleField(root, "is_sale", false)}
                            style={{ cursor: "pointer" }}
                          >
                            <i className="fas fa-tags"></i> SALE
                          </span>
                        ) : (
                          <span
                            className="pg-prod-badge"
                            title="Nhóm này hiển thị ở menu SẢN PHẨM trên header — click để chuyển sang SALE"
                            onClick={() => handleToggleField(root, "is_sale", true)}
                            style={{ cursor: "pointer" }}
                          >
                            <i className="fas fa-box"></i> Sản phẩm
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons" style={{ flexWrap: "wrap", gap: 4 }}>
                          <button
                            className="pg-add-child-btn"
                            onClick={() => setCreatingChildOf(root.id)}
                            title="Thêm nhóm con"
                          >
                            <i className="fas fa-plus"></i> Con
                          </button>
                          <button
                            className="icon-btn view"
                            onClick={() => setViewingGroup(root)}
                            title={`Xem ${realRootCount} sản phẩm trong nhóm`}
                            disabled={!realRootCount}
                          >👁</button>
                          <button
                            className="icon-btn edit"
                            onClick={() => setEditingGroup(root)}
                            title="Sửa"
                          >✏️</button>
                          <button
                            className="icon-btn delete"
                            onClick={() => handleDelete(root.id, root.name)}
                            title="Xóa"
                          >🗑</button>
                        </div>
                      </td>
                    </tr>,

                    /* ── CÁC DÒNG CON ── */
                    ...root.children.map((child) => {
                      const realCount = productCounts[child.id] ?? child.product_count ?? 0;
                      return (
                        <tr key={child.id} className={`pg-tree-row child ${selected.includes(child.id) ? "row-selected" : ""}`}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selected.includes(child.id)}
                              onChange={() => toggleOne(child.id)}
                            />
                          </td>
                          <td>
                            <div className="group-name-cell">
                              {child.image_url ? (
                                <img src={child.image_url} alt={child.name} className="group-thumb" style={{ width: 32, height: 32 }} />
                              ) : (
                                <div className="img-placeholder sm">
                                  <i className="far fa-image"></i>
                                </div>
                              )}
                              <div className="group-name-text">
                                <span
                                  className="group-link"
                                  style={{ fontWeight: 400 }}
                                  onClick={() => setEditingGroup(child)}
                                  title="Sửa nhóm con"
                                >
                                  <i className="fas fa-level-up-alt pg-child-icon" />
                                  {child.name}
                                </span>
                                {child.slug && <span className="group-slug">/{child.slug}</span>}
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              className="count-link"
                              onClick={() => setViewingGroup(child)}
                              title="Xem sản phẩm trong nhóm con"
                              disabled={!realCount}
                            >
                              {realCount}
                            </button>
                          </td>
                          <td>
                            <label className="switch" title="Bật/tắt hiển thị">
                              <input
                                type="checkbox"
                                checked={!!child.is_active}
                                onChange={(e) => handleToggleField(child, "is_active", e.target.checked)}
                              />
                              <span className="slider-switch"></span>
                            </label>
                            <span className={`status-pill ${child.is_active ? "on" : "off"}`}>
                              {child.is_active ? "Hiển thị" : "Đang ẩn"}
                            </span>
                          </td>
                          <td style={{ color: "#9ca3af", fontSize: 12 }}>
                            <i>(nhóm con)</i>
                          </td>
                          <td style={{ color: "#9ca3af", fontSize: 12 }}>
                            {root.is_sale
                              ? <span title="Nhóm cha đang ở menu SALE — các nhóm con hiện theo"><i className="fas fa-tags"></i> SALE</span>
                              : <span title="Nhóm cha đang ở menu SẢN PHẨM — các nhóm con hiện theo"><i className="fas fa-box"></i> Sản phẩm</span>}
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="icon-btn view"
                                onClick={() => setViewingGroup(child)}
                                title={`Xem ${realCount} sản phẩm`}
                                disabled={!realCount}
                              >👁</button>
                              <button
                                className="icon-btn edit"
                                onClick={() => setEditingGroup(child)}
                                title="Sửa"
                              >✏️</button>
                              <button
                                className="icon-btn delete"
                                onClick={() => handleDelete(child.id, child.name)}
                                title="Xóa"
                              >🗑</button>
                            </div>
                          </td>
                        </tr>
                      );
                    }),
                  ];
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL: Xem sản phẩm trong nhóm ─────────────────────────── */}
      {viewingGroup && (
        <GroupProductsModal
          group={viewingGroup}
          onClose={() => setViewingGroup(null)}
          onEdit={() => { setEditingGroup(viewingGroup); setViewingGroup(null); }}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: Xem sản phẩm trong nhóm
// ════════════════════════════════════════════════════════════════════════════
function GroupProductsModal({ group, onClose, onEdit }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await productsApi.getAll({ group_id: group.id, page: 1, limit: 500 });
        if (cancelled) return;
        setProducts(res.data || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [group.id]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content group-products-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Sản phẩm trong nhóm "{group.name}"</h2>
            <p style={{ fontSize: "13px", color: "#6b7280", margin: "4px 0 0" }}>
              {loading ? "Đang tải..." : `${products.length} sản phẩm`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-secondary" onClick={onEdit}>Sửa nhóm</button>
            <button className="btn-icon" onClick={onClose} title="Đóng">✕</button>
          </div>
        </div>

        <div className="modal-body">
          {error && <div className="group-error">⚠️ {error}</div>}
          {loading ? (
            <div className="modal-loading">⌛ Đang tải sản phẩm...</div>
          ) : products.length === 0 ? (
            <div className="modal-empty">
              <i className="far fa-box-open" style={{ fontSize: 48, color: "#cbd5e1" }}></i>
              <p>Chưa có sản phẩm nào trong nhóm này.</p>
            </div>
          ) : (
            <table className="modal-product-table">
              <thead>
                <tr>
                  <th width="60px">Ảnh</th>
                  <th>Tên sản phẩm</th>
                  <th width="120px" style={{ textAlign: "right" }}>Giá</th>
                  <th width="80px" style={{ textAlign: "right" }}>Kho</th>
                  <th width="90px">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const finalPrice = p.final_price != null
                    ? Number(p.final_price)
                    : Math.round(Number(p.price) * (1 - (Number(p.discount) || 0) / 100));
                  const isActive = p.status === "active" || p.is_active === true;
                  return (
                    <tr key={p.id}>
                      <td>
                        {(p.image_url || (p.images && p.images[0])) ? (
                          <img src={p.image_url || p.images[0]} alt={p.name} className="product-thumb" />
                        ) : (
                          <div className="img-placeholder sm">
                            <i className="far fa-image"></i>
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="product-cell-name">{p.name}</div>
                        {p.sku && <div className="product-cell-meta">SKU: {p.sku}</div>}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, color: "#d70018" }}>{fmtVND(finalPrice)}</div>
                        {p.discount > 0 && (
                          <div style={{ fontSize: 11, color: "#9ca3af", textDecoration: "line-through" }}>
                            {fmtVND(p.price)}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>{p.stock ?? 0}</td>
                      <td>
                        <span className={`status-pill ${isActive ? "on" : "off"}`}>
                          {isActive ? "Đang bán" : "Tạm ẩn"}
                        </span>
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
