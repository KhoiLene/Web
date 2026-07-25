// import "./GroupsTab.css";
// import React, { useState, useEffect, useCallback, useMemo } from "react";
// import { uploadGroupsApi } from "../../api";

// // Hàm tạo slug từ tên (bỏ dấu tiếng Việt, chữ thường, nối bằng "-")
// function slugify(str) {
//   return (str || "")
//     .normalize("NFD")
//     .replace(/[\u0300-\u036f]/g, "") // bỏ dấu
//     .replace(/đ/g, "d").replace(/Đ/g, "D")
//     .toLowerCase()
//     .trim()
//     .replace(/[^a-z0-9\s-]/g, "") // bỏ ký tự đặc biệt
//     .replace(/\s+/g, "-")         // khoảng trắng -> -
//     .replace(/-+/g, "-")          // gộp nhiều -- thành 1
//     .replace(/^-|-$/g, "");       // bỏ - ở đầu/cuối
// }

// // ════════════════════════════════════════════════════════════════════════════
// // TAB 1 — Quản lý nhóm upload (cha / con)
// // Component này TỰ lấy dữ liệu nhóm (không bắt buộc props từ cha) để có thể
// // render độc lập qua route riêng trong Sidebar (VD: case "upload-group").
// // Nếu vẫn được nhúng bên trong UploadManager và có truyền props groups/loading/onChanged,
// // nó sẽ ưu tiên dùng props đó thay vì tự fetch lại.
// // ════════════════════════════════════════════════════════════════════════════
// export default function GroupsTab({ groups: groupsProp, loading: loadingProp, onChanged: onChangedProp }) {
//   const [groupsState, setGroupsState] = useState([]);
//   const [loadingState, setLoadingState] = useState(true);
//   const [editing, setEditing] = useState(null); // null=đóng, {}=thêm cha, {parent_id}=thêm con, {...}=sửa
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState("");

//   const isControlled = groupsProp !== undefined;

//   const fetchGroups = useCallback(async () => {
//     setLoadingState(true);
//     setError("");
//     try {
//       const res = await uploadGroupsApi.getAll();
//       setGroupsState(res?.data || []);
//     } catch (err) {
//       setError(err.message);
//       setGroupsState([]);
//     } finally {
//       setLoadingState(false);
//     }
//   }, []);

//   useEffect(() => {
//     if (!isControlled) fetchGroups();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [isControlled]);

//   const groups = isControlled ? (groupsProp || []) : groupsState;
//   const loading = isControlled ? loadingProp : loadingState;
//   const onChanged = isControlled ? onChangedProp : fetchGroups;

//   const parents = useMemo(() => groups.filter((g) => !g.parent_id), [groups]);
//   const childrenOf = (id) => groups.filter((g) => g.parent_id === id);

//   const openAddParent = () => setEditing({ name: "", parent_id: null });
//   const openAddChild = (parent) => setEditing({ name: "", parent_id: parent.id });
//   const openEdit = (g) => setEditing({ ...g });
//   const closeModal = () => setEditing(null);

//   const handleNameChange = (val) => {
//     setEditing((prev) => ({ ...prev, name: val }));
//   };

//   const handleSave = async (e) => {
//     e.preventDefault();
//     if (!editing.name?.trim()) { setError("Vui lòng nhập tên nhóm"); return; }
//     setSaving(true);
//     setError("");
//     try {
//       const body = {
//         name: editing.name.trim(),
//         slug: slugify(editing.name),
//         parent_id: editing.parent_id || null,
//       };
//       if (editing.id) await uploadGroupsApi.update(editing.id, body);
//       else await uploadGroupsApi.create(body);
//       closeModal();
//       onChanged();
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setSaving(false);
//     }
//   };

//   const handleDelete = async (g) => {
//     const hasChildren = childrenOf(g.id).length > 0;
//     const msg = hasChildren
//       ? `Nhóm "${g.name}" đang có nhóm con — xóa sẽ ảnh hưởng dữ liệu con. Vẫn xóa?`
//       : `Xóa nhóm "${g.name}"?`;
//     if (!window.confirm(msg)) return;
//     try {
//       await uploadGroupsApi.remove(g.id);
//       onChanged();
//     } catch (err) {
//       alert("Lỗi xóa: " + err.message);
//     }
//   };

//   return (
//     <div>
//       <div className="up-toolbar">
//         <button className="up-btn up-btn-primary" onClick={openAddParent}>
//           <i className="fas fa-plus" /> Thêm nhóm cha
//         </button>
//       </div>

//       {loading ? (
//         <div className="up-loading">⌛ Đang tải danh sách nhóm...</div>
//       ) : parents.length === 0 ? (
//         <div className="up-empty">
//           <div className="icon">🗂️</div>
//           <h3>Chưa có nhóm upload nào</h3>
//           <p>Tạo nhóm cha trước (VD: "Về Techtra", "Giải trí"), sau đó thêm nhóm con nếu cần.</p>
//         </div>
//       ) : (
//         <div className="up-group-tree">
//           {parents.map((p) => (
//             <div key={p.id} className="up-group-parent">
//               <div className="up-group-row up-group-row--parent">
//                 <span className="up-group-name"><i className="fas fa-folder" /> {p.name}</span>
//                 <div className="up-group-actions">
//                   <button className="up-icon-btn" title="Thêm nhóm con" onClick={() => openAddChild(p)}>
//                     <i className="fas fa-plus" />
//                   </button>
//                   <button className="up-icon-btn edit" title="Sửa" onClick={() => openEdit(p)}>
//                     <i className="fas fa-pen" />
//                   </button>
//                   <button className="up-icon-btn danger" title="Xóa" onClick={() => handleDelete(p)}>
//                     <i className="fas fa-trash" />
//                   </button>
//                 </div>
//               </div>

//               {childrenOf(p.id).map((c) => (
//                 <div key={c.id} className="up-group-row up-group-row--child">
//                   <span className="up-group-name"><i className="fas fa-folder-open" /> {c.name}</span>
//                   <div className="up-group-actions">
//                     <button className="up-icon-btn edit" title="Sửa" onClick={() => openEdit(c)}>
//                       <i className="fas fa-pen" />
//                     </button>
//                     <button className="up-icon-btn danger" title="Xóa" onClick={() => handleDelete(c)}>
//                       <i className="fas fa-trash" />
//                     </button>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           ))}
//         </div>
//       )}

//       {editing !== null && (
//         <div className="up-modal-overlay" onClick={(e) => e.target.className === "up-modal-overlay" && closeModal()}>
//           <div className="up-modal" style={{ maxWidth: 420 }}>
//             <div className="up-modal-header">
//               <h2>{editing.id ? "Sửa nhóm" : editing.parent_id ? "Thêm nhóm con" : "Thêm nhóm cha"}</h2>
//               <button className="up-modal-close" onClick={closeModal}>✕</button>
//             </div>
//             <form onSubmit={handleSave}>
//               <div className="up-modal-body">
//                 {error && <div className="up-error">⚠️ {error}</div>}
//                 <div className="up-field">
//                   <label>Tên nhóm</label>
//                   <input
//                     type="text"
//                     autoFocus
//                     value={editing.name}
//                     onChange={(e) => handleNameChange(e.target.value)}
//                     placeholder="VD: Về Techtra, Giải trí, Video sự kiện..."
//                   />
//                 </div>

//                 <div className="up-field">
//                   <label>Slug (tự động)</label>
//                   <input
//                     type="text"
//                     value={slugify(editing.name)}
//                     readOnly
//                     disabled
//                     style={{ opacity: 0.7, cursor: "not-allowed" }}
//                     placeholder="slug sẽ tự sinh theo tên"
//                   />
//                 </div>

//                 {editing.parent_id ? (
//                   <p className="up-hint">Nhóm con của: <strong>{parents.find((p) => p.id === editing.parent_id)?.name}</strong></p>
//                 ) : (
//                   <p className="up-hint">Đây là nhóm cha (gốc) — các trang như "Về Techtra" sẽ đọc nội dung theo nhóm cha này.</p>
//                 )}
//               </div>
//               <div className="up-modal-footer">
//                 <button type="button" className="up-btn" onClick={closeModal}>Hủy</button>
//                 <button type="submit" className="up-btn up-btn-primary" disabled={saving}>
//                   {saving ? "Đang lưu..." : "Lưu"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

import "./GroupsTab.css";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { uploadGroupsApi } from "../../api";

// Hàm tạo slug từ tên (bỏ dấu tiếng Việt, chữ thường, nối bằng "-")
function slugify(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // bỏ dấu
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // bỏ ký tự đặc biệt
    .replace(/\s+/g, "-")         // khoảng trắng -> -
    .replace(/-+/g, "-")          // gộp nhiều -- thành 1
    .replace(/^-|-$/g, "");       // bỏ - ở đầu/cuối
}

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

// ════════════════════════════════════════════════════════════════════════════
// TAB 1 — Quản lý nhóm upload (cha / con)
// Component này TỰ lấy dữ liệu nhóm (không bắt buộc props từ cha) để có thể
// render độc lập qua route riêng trong Sidebar (VD: case "upload-group").
// Nếu vẫn được nhúng bên trong UploadManager và có truyền props groups/loading/onChanged,
// nó sẽ ưu tiên dùng props đó thay vì tự fetch lại.
// ════════════════════════════════════════════════════════════════════════════
export default function GroupsTab({ groups: groupsProp, loading: loadingProp, onChanged: onChangedProp }) {
  const [groupsState, setGroupsState] = useState([]);
  const [loadingState, setLoadingState] = useState(true);
  const [editing, setEditing] = useState(null); // null=đóng, {}=thêm cha, {parent_id}=thêm con, {...}=sửa
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isControlled = groupsProp !== undefined;

  const fetchGroups = useCallback(async () => {
    setLoadingState(true);
    setError("");
    try {
      const res = await uploadGroupsApi.getAll();
      setGroupsState(res?.data || []);
    } catch (err) {
      setError(err.message);
      setGroupsState([]);
    } finally {
      setLoadingState(false);
    }
  }, []);

  useEffect(() => {
    if (!isControlled) fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isControlled]);

  const groups = isControlled ? (groupsProp || []) : groupsState;
  const loading = isControlled ? loadingProp : loadingState;
  const onChanged = isControlled ? onChangedProp : fetchGroups;

  const parents = useMemo(() => groups.filter((g) => !g.parent_id), [groups]);
  const childrenOf = (id) => groups.filter((g) => g.parent_id === id);

  const openAddParent = () => setEditing({ name: "", icon: "", parent_id: null });
  const openAddChild = (parent) => setEditing({ name: "", icon: "", parent_id: parent.id });
  const openEdit = (g) => setEditing({ ...g });
  const closeModal = () => setEditing(null);

  const handleNameChange = (val) => {
    setEditing((prev) => ({ ...prev, name: val }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editing.name?.trim()) { setError("Vui lòng nhập tên nhóm"); return; }
    setSaving(true);
    setError("");
    try {
      const body = {
        name: editing.name.trim(),
        slug: slugify(editing.name),
        icon: editing.icon?.trim() || null,
        parent_id: editing.parent_id || null,
      };
      if (editing.id) await uploadGroupsApi.update(editing.id, body);
      else await uploadGroupsApi.create(body);
      closeModal();
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (g) => {
    const hasChildren = childrenOf(g.id).length > 0;
    const msg = hasChildren
      ? `Nhóm "${g.name}" đang có nhóm con — xóa sẽ ảnh hưởng dữ liệu con. Vẫn xóa?`
      : `Xóa nhóm "${g.name}"?`;
    if (!window.confirm(msg)) return;
    try {
      await uploadGroupsApi.remove(g.id);
      onChanged();
    } catch (err) {
      alert("Lỗi xóa: " + err.message);
    }
  };

  return (
    <div>
      <div className="up-toolbar">
        <button className="up-btn up-btn-primary" onClick={openAddParent}>
          <i className="fas fa-plus" /> Thêm nhóm cha
        </button>
      </div>

      {loading ? (
        <div className="up-loading">⌛ Đang tải danh sách nhóm...</div>
      ) : parents.length === 0 ? (
        <div className="up-empty">
          <div className="icon">🗂️</div>
          <h3>Chưa có nhóm upload nào</h3>
          <p>Tạo nhóm cha trước (VD: "Về Techtra", "Giải trí"), sau đó thêm nhóm con nếu cần.</p>
        </div>
      ) : (
        <div className="up-group-tree">
          {parents.map((p) => (
            <div key={p.id} className="up-group-parent">
              <div className="up-group-row up-group-row--parent">
                <span className="up-group-name"><i className={p.icon || "fas fa-folder"} /> {p.name}</span>
                <div className="up-group-actions">
                  <button className="up-icon-btn" title="Thêm nhóm con" onClick={() => openAddChild(p)}>
                    <i className="fas fa-plus" />
                  </button>
                  <button className="up-icon-btn edit" title="Sửa" onClick={() => openEdit(p)}>
                    <i className="fas fa-pen" />
                  </button>
                  <button className="up-icon-btn danger" title="Xóa" onClick={() => handleDelete(p)}>
                    <i className="fas fa-trash" />
                  </button>
                </div>
              </div>

              {childrenOf(p.id).map((c) => (
                <div key={c.id} className="up-group-row up-group-row--child">
                  <span className="up-group-name"><i className={c.icon || "fas fa-folder-open"} /> {c.name}</span>
                  <div className="up-group-actions">
                    <button className="up-icon-btn edit" title="Sửa" onClick={() => openEdit(c)}>
                      <i className="fas fa-pen" />
                    </button>
                    <button className="up-icon-btn danger" title="Xóa" onClick={() => handleDelete(c)}>
                      <i className="fas fa-trash" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {editing !== null && (
        <div className="up-modal-overlay" onClick={(e) => e.target.className === "up-modal-overlay" && closeModal()}>
          <div className="up-modal" style={{ maxWidth: 420 }}>
            <div className="up-modal-header">
              <h2>{editing.id ? "Sửa nhóm" : editing.parent_id ? "Thêm nhóm con" : "Thêm nhóm cha"}</h2>
              <button className="up-modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="up-modal-body">
                {error && <div className="up-error">⚠️ {error}</div>}

                <div className="up-field">
                  <label>Tên nhóm</label>
                  <input
                    type="text"
                    autoFocus
                    value={editing.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="VD: Về Techtra, Giải trí, Video sự kiện..."
                  />
                </div>

                <div className="up-field">
                  <label>Slug (tự động)</label>
                  <input
                    type="text"
                    value={slugify(editing.name)}
                    readOnly
                    disabled
                    style={{ opacity: 0.7, cursor: "not-allowed" }}
                    placeholder="slug sẽ tự sinh theo tên"
                  />
                </div>

                <div className="up-field">
                  <label>Icon (FontAwesome)</label>
                  <input
                    type="text"
                    value={editing.icon || ""}
                    onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                    placeholder="fas fa-folder"
                  />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                    {ICON_PRESETS.map((ic) => (
                      <button
                        type="button"
                        key={ic}
                        onClick={() => setEditing({ ...editing, icon: ic })}
                        title={ic}
                        style={{
                          width: 32, height: 32, borderRadius: 6,
                          border: editing.icon === ic ? "2px solid #2563eb" : "1px solid #e5e7eb",
                          background: editing.icon === ic ? "#eff6ff" : "white",
                          cursor: "pointer", color: "#2563eb",
                        }}
                      >
                        <i className={ic} />
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, icon: "" })}
                      title="Không dùng icon"
                      style={{
                        width: 32, height: 32, borderRadius: 6,
                        border: !editing.icon ? "2px solid #2563eb" : "1px solid #e5e7eb",
                        background: !editing.icon ? "#eff6ff" : "white",
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

                {editing.parent_id ? (
                  <p className="up-hint">Nhóm con của: <strong>{parents.find((p) => p.id === editing.parent_id)?.name}</strong></p>
                ) : (
                  <p className="up-hint">Đây là nhóm cha (gốc) — các trang như "Về Techtra" sẽ đọc nội dung theo nhóm cha này.</p>
                )}
              </div>
              <div className="up-modal-footer">
                <button type="button" className="up-btn" onClick={closeModal}>Hủy</button>
                <button type="submit" className="up-btn up-btn-primary" disabled={saving}>
                  {saving ? "Đang lưu..." : "Lưu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}