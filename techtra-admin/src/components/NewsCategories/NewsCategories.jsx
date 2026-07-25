import React, { useState, useEffect, useCallback } from "react";
import "./NewsCategories.css";
import { newsCategoriesApi } from "../../api";

// ─── Helpers ─────────────────────────────────────────────────────────────
function toSlug(str) {
  return (str || "")
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 200);
}

// ─── Main ────────────────────────────────────────────────────────────────
export default function NewsCategories() {
  const [roots,    setRoots]    = useState([]);  // [{ ...root, children: [...] }]
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [editing,  setEditing]  = useState(null); // null | { mode: 'create'|'edit', parentId, initial? }

  const fetchTree = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const tree = await newsCategoriesApi.getTree();
      setRoots(tree || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTree(); }, [fetchTree]);

  // Mở modal tạo nhóm CHA
  const openCreateRoot = () => setEditing({ mode: "create", parentId: null });
  // Mở modal tạo nhóm CON (truyền parent)
  const openCreateChild = (parentId) =>
    setEditing({ mode: "create", parentId });
  // Mở modal sửa
  const openEdit = (cat) =>
    setEditing({ mode: "edit", parentId: cat.parent_id || null, initial: cat });

  const handleSaved = () => {
    setEditing(null);
    fetchTree();
  };

  return (
    <div className="nc-page main-content">

      {/* Header */}
      <div className="nc-header">
        <div>
          <h1>Danh mục tin tức</h1>
          <p style={{ color: "#6b7280", fontSize: 13, margin: "4px 0 0" }}>
            Tổ chức bài viết theo nhóm lớn → nhóm con. Dùng cho menu BÀI VIẾT trên shop.
          </p>
        </div>
        <div className="nc-header-actions">
          <button className="nc-btn nc-btn-primary" onClick={openCreateRoot}>
            <i className="fas fa-plus" /> Thêm nhóm lớn
          </button>
        </div>
      </div>

      {error && <div className="nc-error">⚠️ {error}</div>}

      {loading ? (
        <div className="nc-loading">⌛ Đang tải...</div>
      ) : roots.length === 0 ? (
        <div className="nc-empty">
          <div className="icon">📂</div>
          <h3>Chưa có nhóm tin tức nào</h3>
          <p>Tạo nhóm lớn trước, sau đó thêm nhóm con bên trong.</p>
          <button className="nc-btn nc-btn-primary" style={{ marginTop: 12 }} onClick={openCreateRoot}>
            <i className="fas fa-plus" /> Tạo nhóm lớn đầu tiên
          </button>
        </div>
      ) : (
        <div className="nc-tree">
          {roots.map((root) => (
            <RootCard
              key={root.id}
              root={root}
              onAddChild={() => openCreateChild(root.id)}
              onEdit={openEdit}
              onChanged={fetchTree}
            />
          ))}
        </div>
      )}

      {editing && (
        <EditCategoryModal
          mode={editing.mode}
          parentId={editing.parentId}
          initial={editing.initial}
          roots={roots}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Card nhóm CHA
// ════════════════════════════════════════════════════════════════════════
function RootCard({ root, onAddChild, onEdit, onChanged }) {
  return (
    <div className="nc-root">
      <div className="nc-root-head">
        <div className={`nc-root-icon ${root.icon ? "" : "muted"}`}>
          {root.icon ? <i className={root.icon} /> : null}
        </div>
        <div className="nc-root-info">
          <div className="nc-root-name">
            {root.name}
            <span className={`nc-badge ${root.is_active ? "ok" : "off"}`}>
              {root.is_active ? "Hiện" : "Ẩn"}
            </span>
            <span className="nc-badge count">{root.children?.length || 0} nhóm con</span>
          </div>
          <div className="nc-root-slug">/{root.slug}</div>
          {root.description && <div className="nc-root-desc">{root.description}</div>}
        </div>
        <div className="nc-root-actions">
          <button
            className="nc-btn nc-btn-ghost nc-btn-sm"
            title="Sửa nhóm lớn"
            onClick={() => onEdit(root)}
          >
            <i className="fas fa-pen" />
          </button>
        </div>
      </div>

      {root.children?.length > 0 ? (
        <div className="nc-children">
          {root.children.map((child) => (
            <ChildRow
              key={child.id}
              child={child}
              onEdit={onEdit}
              onChanged={onChanged}
            />
          ))}
        </div>
      ) : (
        <div className="nc-no-child">Chưa có nhóm con nào.</div>
      )}

      <button className="nc-add-child" onClick={onAddChild}>
        <i className="fas fa-plus" /> Thêm nhóm con vào "{root.name}"
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Row nhóm CON
// ════════════════════════════════════════════════════════════════════════
function ChildRow({ child, onEdit, onChanged }) {
  const handleDelete = async () => {
    const postCount = await newsCategoriesApi.countPosts(child.id);
    const msg = postCount > 0
      ? `Nhóm "${child.name}" có ${postCount} bài viết.\n\nKhi xoá nhóm, các bài sẽ được set "Không phân nhóm" (không mất dữ liệu). Tiếp tục?`
      : `Xoá nhóm con "${child.name}"?`;
    if (!window.confirm(msg)) return;
    try {
      await newsCategoriesApi.remove(child.id);
      onChanged();
    } catch (err) { alert("Lỗi: " + err.message); }
  };

  return (
    <div className="nc-child">
      {child.icon ? (
        <i className={`${child.icon} nc-child-icon`} />
      ) : (
        <div className="nc-child-icon nc-child-icon-empty" />
      )}
      <div className="nc-child-info">
        <div className="nc-child-name">
          {child.name}
          <span className={`nc-badge ${child.is_active ? "ok" : "off"}`} style={{ marginLeft: 6 }}>
            {child.is_active ? "Hiện" : "Ẩn"}
          </span>
        </div>
        <div className="nc-child-slug">/{child.slug}</div>
      </div>
      <div className="nc-child-actions">
        <button
          className="nc-btn nc-btn-ghost nc-btn-sm"
          title="Sửa"
          onClick={() => onEdit(child)}
        >
          <i className="fas fa-pen" />
        </button>
        <button
          className="nc-btn nc-btn-danger nc-btn-sm"
          title="Xoá"
          onClick={handleDelete}
        >
          <i className="fas fa-trash" />
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Modal tạo / sửa nhóm
// ════════════════════════════════════════════════════════════════════════
const ICON_PRESETS = [
  "fas fa-folder", "fas fa-spa", "fas fa-leaf", "fas fa-magic",
  "fas fa-heart", "fas fa-book-open", "fas fa-newspaper", "fas fa-baby",
  "fas fa-hand-paper", "fas fa-kiss-wink-heart", "fas fa-seedling",
  "fas fa-flask", "fas fa-lightbulb", "fas fa-star",
  "fas fa-fire", "fas fa-bolt", "fas fa-globe", "fas fa-shopping-bag",
  "fas fa-camera", "fas fa-music", "fas fa-cog", "fas fa-chart-line",
  "fas fa-comments", "fas fa-tags", "fas fa-tshirt", "fas fa-utensils",
  "fas fa-wine-glass", "fas fa-truck", "fas fa-bell", "fas fa-gift",
  "fas fa-user-friends", "fas fa-shield-alt", "fas fa-wallet", "fas fa-lemon",
];

function EditCategoryModal({ mode, parentId, initial, roots, onClose, onSaved }) {
  const isEdit = mode === "edit";
  const isChild = parentId != null;

  const [name,        setName]        = useState(initial?.name || "");
  const [slug,        setSlug]        = useState(initial?.slug || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [icon,        setIcon]        = useState(initial?.icon || "");
  const [parentIdSt,  setParentIdSt]  = useState(parentId);
  const [sortOrder,   setSortOrder]   = useState(initial?.sort_order || 0);
  const [isActive,    setIsActive]    = useState(initial?.is_active !== false);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");

  // Auto sinh slug từ tên khi tạo mới, hoặc khi sửa mà slug hiện tại vẫn là slug sinh tự động trước đó.
  const [slugTouched, setSlugTouched] = useState(() => {
    if (!isEdit) return false;
    return initial?.slug !== toSlug(initial?.name || "");
  });

  useEffect(() => {
    if (!slugTouched) setSlug(toSlug(name));
  }, [name, slugTouched]);

  const handleSave = async () => {
    if (!name.trim()) { setError("Vui lòng nhập tên nhóm"); return; }
    setSaving(true);
    setError("");
    try {
      const body = {
        name: name.trim(),
        slug: (slug || toSlug(name)).trim(),
        description: description.trim() || null,
        icon: icon.trim() || null,
        parent_id: isChild ? parentIdSt : null,  // nhóm cha thì parent_id=null
        sort_order: Number(sortOrder) || 0,
        is_active: isActive,
      };
      if (isEdit) {
        await newsCategoriesApi.update(initial.id, body);
      } else {
        await newsCategoriesApi.create(body);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="nc-modal-overlay">
      <div className="nc-modal">
        <div className="nc-modal-header">
          <h2>
            <i className={isEdit ? "fas fa-pen" : "fas fa-plus"} />{" "}
            {isEdit
              ? `Sửa nhóm: ${initial.name}`
              : isChild
                ? "Thêm nhóm con"
                : "Thêm nhóm lớn"}
          </h2>
          <button className="nc-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="nc-modal-body">
          {error && <div className="nc-error">⚠️ {error}</div>}

          <div className="nc-field">
            <label><span className="req">*</span> Tên nhóm</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isChild ? "Vd: Chăm sóc môi" : "Vd: Chăm sóc cơ thể"}
              autoFocus
            />
          </div>

          <div className="nc-field">
            <label>Slug (URL)</label>
            <input
              type="text"
              value={slug}
              disabled
              style={{ fontFamily: "'Courier New', monospace", background: "#f3f4f6", cursor: "not-allowed" }}
              placeholder="tu-dong-sinh-tu-ten"
            />
          </div>

          <div className="nc-field">
            <label>Mô tả</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả ngắn (hiện trên menu, tooltip, ...)"
            />
          </div>

          <div className="nc-field-row">
            <div className="nc-field">
              <label>Icon (FontAwesome)</label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="fas fa-spa"
              />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                {ICON_PRESETS.map((ic) => (
                  <button
                    type="button"
                    key={ic}
                    onClick={() => setIcon(ic)}
                    title={ic}
                    style={{
                      width: 32, height: 32, borderRadius: 6,
                      border: icon === ic ? "2px solid #2563eb" : "1px solid #e5e7eb",
                      background: icon === ic ? "#eff6ff" : "white",
                      cursor: "pointer", color: "#2563eb",
                    }}
                  >
                    <i className={ic} />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIcon("")}
                  title="Không dùng icon"
                  style={{
                    width: 32, height: 32, borderRadius: 6,
                    border: icon === "" ? "2px solid #2563eb" : "1px solid #e5e7eb",
                    background: icon === "" ? "#eff6ff" : "white",
                    cursor: "pointer", color: "#6b7280", fontSize: 14,
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                Nhấn × để không dùng icon.
              </div>
            </div>

            <div className="nc-field">
              <label>Thứ tự sắp xếp</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
              <label className="nc-checkbox" style={{ marginTop: 8 }}>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={() => setIsActive(!isActive)}
                />
                Hiển thị trên menu shop
              </label>
            </div>
          </div>

          {/* Khi tạo mới nhóm CHA: không có field chọn cha. Khi sửa nhóm CHA: không thể đổi. */}
          {/* Khi tạo/sửa nhóm CON: hiển thị tên nhóm CHA (read-only) */}
          {isChild && (
            <div className="nc-field">
              <label>Thuộc nhóm lớn</label>
              <input
                type="text"
                value={roots.find((r) => r.id === parentIdSt)?.name || `ID ${parentIdSt}`}
                disabled
                style={{ background: "#f3f4f6" }}
              />
            </div>
          )}
        </div>

        <div className="nc-modal-footer">
          <button className="nc-btn" onClick={onClose}>Đóng</button>
          <button className="nc-btn nc-btn-primary" onClick={handleSave} disabled={saving}>
            <i className="fas fa-save" /> {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}
