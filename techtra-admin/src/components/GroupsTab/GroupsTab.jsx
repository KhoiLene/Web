import "./GroupsTab.css";
import React, { useState, useEffect, useCallback } from "react";
import { uploadGroupsApi } from "../../api";

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

// Các vị trí hiển thị cho phép chọn (1 nhóm có thể ở nhiều vị trí).
// shop header partials.js & footer render theo các key này.
const DISPLAY_LOCATION_OPTIONS = [
  { value: "header_about",   label: "Header — Về Techtra" },
  { value: "footer_about",   label: "Footer — Về chúng tôi" },
  { value: "footer_support", label: "Footer — Hỗ trợ khách hàng" },
];

// ─── Main ─────────────────────────────────────────────────────────────────
export default function GroupsTab() {
  const [roots,    setRoots]    = useState([]);  // [{ ...root, children: [...] }]
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [editing,  setEditing]  = useState(null); // null | { mode: 'create'|'edit', parentId, initial? }

  const fetchTree = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const tree = await uploadGroupsApi.getTree();
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
    <div className="up-page main-content">

      {/* Header */}
      <div className="up-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1>Nhóm "Về Techtra"</h1>
          <p style={{ color: "#6b7280", fontSize: 13, margin: "4px 0 0" }}>
            Tổ chức các mục menu "Về Techtra" theo nhóm cha → nhóm con. Shop header sẽ đọc nhóm CHA làm menu icon, nhóm CON làm trang nội dung.
          </p>
        </div>
        <div className="up-header-actions">
          <button className="up-btn up-btn-primary" onClick={openCreateRoot}>
            <i className="fas fa-plus" /> Thêm nhóm cha
          </button>
        </div>
      </div>

      {error && <div className="up-error">⚠️ {error}</div>}

      {loading ? (
        <div className="up-loading">⌛ Đang tải...</div>
      ) : roots.length === 0 ? (
        <div className="up-empty">
          <div className="icon">📂</div>
          <h3>Chưa có nhóm nào</h3>
          <p>Tạo nhóm cha trước (VD: "Về Techtra", "Tiêu chí", "Tuyển dụng"...), sau đó thêm nhóm con bên trong.</p>
          <button className="up-btn up-btn-primary" style={{ marginTop: 12 }} onClick={openCreateRoot}>
            <i className="fas fa-plus" /> Tạo nhóm cha đầu tiên
          </button>
        </div>
      ) : (
        <div className="up-tree">
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
        <EditGroupModal
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

// ═════════════════════════════════════════════════════════════════════════
// Card nhóm CHA
// ═════════════════════════════════════════════════════════════════════════
function RootCard({ root, onAddChild, onEdit, onChanged }) {
  // Hiển thị chip các vị trí đã chọn cho nhóm cha (giúp admin thấy ngay không cần mở sửa)
  const locs = Array.isArray(root.display_locations) ? root.display_locations : [];
  const locLabels = DISPLAY_LOCATION_OPTIONS.filter((o) => locs.includes(o.value));
  return (
    <div className="up-root">
      <div className="up-root-head">
        <div className={`up-root-icon ${root.icon ? "" : "muted"}`}>
          {root.icon ? <i className={root.icon} /> : null}
        </div>
        <div className="up-root-info">
          <div className="up-root-name">
            {root.name}
            {root.is_active === false && (
              <span className="up-badge off">Ẩn</span>
            )}
            <span className="up-badge count">{root.children?.length || 0} nhóm con</span>
          </div>
          <div className="up-root-slug">/{root.slug}</div>
          {locLabels.length > 0 && (
            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
              {locLabels.map((o) => (
                <span key={o.value} className="up-badge" style={{ background: "#eff6ff", color: "#1d4ed8", fontWeight: 500 }}>
                  <i className="fas fa-map-marker-alt" style={{ marginRight: 4 }} />
                  {o.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="up-root-actions">
          <button
            className="up-btn up-btn-ghost up-btn-sm"
            title="Sửa nhóm cha"
            onClick={() => onEdit(root)}
          >
            <i className="fas fa-pen" />
          </button>
        </div>
      </div>

      {root.children?.length > 0 ? (
        <div className="up-children">
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
        <div className="up-no-child">Chưa có nhóm con nào.</div>
      )}

      <button className="up-add-child" onClick={onAddChild}>
        <i className="fas fa-plus" /> Thêm nhóm con vào "{root.name}"
      </button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Row nhóm CON
// ═════════════════════════════════════════════════════════════════════════
function ChildRow({ child, onEdit, onChanged }) {
  const handleDelete = async () => {
    if (!window.confirm(`Xoá nhóm con "${child.name}"?`)) return;
    try {
      await uploadGroupsApi.remove(child.id);
      onChanged();
    } catch (err) { alert("Lỗi: " + err.message); }
  };

  return (
    <div className="up-child">
      {child.icon ? (
        <i className={`${child.icon} up-child-icon`} />
      ) : (
        <div className="up-child-icon up-child-icon-empty" />
      )}
      <div className="up-child-info">
        <div className="up-child-name">
          {child.name}
          {child.is_active === false && (
            <span className="up-badge off" style={{ marginLeft: 6 }}>Ẩn</span>
          )}
        </div>
        <div className="up-child-slug">/{child.slug}</div>
      </div>
      <div className="up-child-actions">
        <button
          className="up-btn up-btn-ghost up-btn-sm"
          title="Sửa"
          onClick={() => onEdit(child)}
        >
          <i className="fas fa-pen" />
        </button>
        <button
          className="up-btn up-btn-danger up-btn-sm"
          title="Xoá"
          onClick={handleDelete}
        >
          <i className="fas fa-trash" />
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Modal tạo / sửa nhóm
// ═════════════════════════════════════════════════════════════════════════
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

function EditGroupModal({ mode, parentId, initial, roots, onClose, onSaved }) {
  const isEdit = mode === "edit";
  const isChild = parentId != null;

  const [name,       setName]       = useState(initial?.name || "");
  const [slug,       setSlug]       = useState(initial?.slug || "");
  const [icon,       setIcon]       = useState(initial?.icon || "");
  const [parentIdSt, setParentIdSt] = useState(parentId);
  const [sortOrder,  setSortOrder]  = useState(initial?.sort_order || 0);
  const [isActive,   setIsActive]   = useState(initial?.is_active !== false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");

  // Vị trí hiển thị cho nhóm CHA: mảng các key trong DISPLAY_LOCATION_OPTIONS.
  // Chỉ áp dụng khi parent_id = null; nhóm con không có field này (kế thừa vị trí từ cha).
  const [displayLocations, setDisplayLocations] = useState(() => {
    if (isChild) return [];
    const arr = Array.isArray(initial?.display_locations) ? initial.display_locations : [];
    // Backward-compat: nếu DB còn cột cũ display_location (string), convert sang mảng
    if (!arr.length && typeof initial?.display_location === "string" && initial.display_location) {
      return [initial.display_location];
    }
    return arr.filter((v) => DISPLAY_LOCATION_OPTIONS.some((o) => o.value === v));
  });

  const toggleDisplayLocation = (value) => {
    setDisplayLocations((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

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
        icon: icon.trim() || null,
        parent_id: isChild ? parentIdSt : null,  // nhóm cha thì parent_id=null
        sort_order: Number(sortOrder) || 0,
        is_active: isActive,
      };
      // Chỉ set display_locations cho nhóm cha
      if (!isChild) {
        body.display_locations = displayLocations;
      }
      if (isEdit) {
        await uploadGroupsApi.update(initial.id, body);
      } else {
        await uploadGroupsApi.create(body);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="up-modal-overlay">
      <div className="up-modal">
        <div className="up-modal-header">
          <h2>
            <i className={isEdit ? "fas fa-pen" : "fas fa-plus"} />{" "}
            {isEdit
              ? `Sửa nhóm: ${initial.name}`
              : isChild
                ? "Thêm nhóm con"
                : "Thêm nhóm cha"}
          </h2>
          <button className="up-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="up-modal-body">
          {error && <div className="up-error">⚠️ {error}</div>}

          <div className="up-field">
            <label><span style={{ color: "#dc2626" }}>*</span> Tên nhóm</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isChild ? "Vd: Giới thiệu công ty, Lịch sử hình thành" : "Vd: Về Techtra, Tiêu chí, Tuyển dụng"}
              autoFocus
            />
          </div>

          <div className="up-field">
            <label>Slug (URL)</label>
            <input
              type="text"
              value={slug}
              disabled
              style={{ fontFamily: "'Courier New', monospace", background: "#f3f4f6", cursor: "not-allowed" }}
              placeholder="tu-dong-sinh-tu-ten"
            />
          </div>

          <div className="up-field-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="up-field">
              <label>Icon (FontAwesome)</label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="fas fa-leaf"
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

            <div className="up-field">
              <label>Thứ tự sắp xếp</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 500, color: "#374151", cursor: "pointer", marginTop: 8 }}>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={() => setIsActive(!isActive)}
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
                Hiển thị trên menu shop
              </label>
            </div>
          </div>

          {/* Khi tạo mới nhóm CHA: không có field chọn cha. Khi sửa nhóm CHA: không thể đổi. */}
          {/* Khi tạo/sửa nhóm CON: hiển thị tên nhóm CHA (read-only) */}
          {isChild && (
            <div className="up-field">
              <label>Thuộc nhóm cha</label>
              <input
                type="text"
                value={roots.find((r) => r.id === parentIdSt)?.name || `ID ${parentIdSt}`}
                disabled
                style={{ background: "#f3f4f6" }}
              />
            </div>
          )}

          {/* Vị trí hiển thị — chỉ dành cho nhóm CHA (nhóm con kế thừa từ cha) */}
          {!isChild && (
            <div className="up-field">
              <label>
                Vị trí hiển thị <span style={{ color: "#6b7280", fontWeight: 400, fontSize: 12 }}>(chọn 1 hoặc nhiều)</span>
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                {DISPLAY_LOCATION_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 10px", borderRadius: 6,
                      border: displayLocations.includes(opt.value) ? "2px solid #2563eb" : "1px solid #e5e7eb",
                      background: displayLocations.includes(opt.value) ? "#eff6ff" : "white",
                      cursor: "pointer", fontSize: 14, fontWeight: 500, color: "#374151",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={displayLocations.includes(opt.value)}
                      onChange={() => toggleDisplayLocation(opt.value)}
                      style={{ width: 16, height: 16, cursor: "pointer" }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                Không chọn = chỉ dùng làm trang nội dung, không hiện ở menu/footer shop.
              </div>
            </div>
          )}
        </div>

        <div className="up-modal-footer">
          <button className="up-btn" onClick={onClose}>Đóng</button>
          <button className="up-btn up-btn-primary" onClick={handleSave} disabled={saving}>
            <i className="fas fa-save" /> {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}