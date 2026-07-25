// import React, { useState, useRef, useEffect, useMemo } from "react";
// import { productGroupsApi } from "../../api";
// import { uploadImage } from "../../api";

// function toSlug(str) {
//   return str.normalize("NFD").replace(/\p{Diacritic}/gu, "")
//     .replace(/đ/g, "d").replace(/Đ/g, "D")
//     .toLowerCase().trim()
//     .replace(/[^a-z0-9\s-]/g, "")
//     .replace(/\s+/g, "-");
// }

// // Form tạo / sửa Product Group
// //   - Mode "lớn" (parent_id = null): hiện đủ 3 section (Thông tin chung, Phân cấp slider, Intro)
// //   - Mode "con"  (parent_id != null): chỉ hiện Thông tin chung (giống form cũ)
// //   - Form bám 100% style form Values ở HomePage.jsx (class hp-*)
// export default function CreateProductGroup({
//   onBack,
//   onSaved,
//   initialData = null,
//   defaultParentId = null, // khi bấm "+ Thêm nhóm con" ở bảng
// }) {
//   const isEditing = !!initialData;
//   // Mode con khi: sửa mà đã có parent_id, hoặc đang tạo mới với defaultParentId
//   const isChildMode =
//     (isEditing && initialData?.parent_id != null) ||
//     (!isEditing && defaultParentId != null);

//   // ─── State: thông tin chung ──────────────────────────────────────────
//   const [groupName,     setGroupName]     = useState(initialData?.name         || "");
//   const [slug,          setSlug]          = useState(initialData?.slug         || "");
//   const [description,   setDescription]   = useState(initialData?.description  || "");
//   const [isVisible,     setIsVisible]     = useState(initialData?.is_active    ?? true);
//   const [sortOrder,     setSortOrder]     = useState(initialData?.sort_order   || 0);
//   const [imagePreview,  setImagePreview]  = useState(initialData?.image_url    || null);
//   const [imageUrl,      setImageUrl]      = useState(initialData?.image_url    || null);

//   // ─── State: phân cấp (chỉ mode lớn) ─────────────────────────────────
//   const [parentId,      setParentId]      = useState(
//     isEditing ? (initialData?.parent_id ?? null) : defaultParentId
//   );
//   const [sliderText,    setSliderText]    = useState(initialData?.slider_text  || "");
//   const [roots,         setRoots]         = useState([]);

//   // ─── State: intro (chỉ mode lớn) ────────────────────────────────────
//   const [introTitle,    setIntroTitle]    = useState(initialData?.intro_title    || "");
//   const [introSubtitle, setIntroSubtitle] = useState(initialData?.intro_subtitle || "");
//   const [introImagePreview, setIntroImagePreview] = useState(initialData?.intro_image_url || null);
//   const [introImageUrl,      setIntroImageUrl]      = useState(initialData?.intro_image_url || null);
//   const [introUploading,     setIntroUploading]     = useState(false);

//   // ─── State chung ─────────────────────────────────────────────────────
//   const [uploading, setUploading] = useState(false);
//   const [saving,    setSaving]    = useState(false);
//   const [error,     setError]     = useState("");

//   const fileInputRef   = useRef(null);
//   const introFileRef   = useRef(null);

//   // Tự sinh slug từ tên (chỉ khi tạo mới)
//   useEffect(() => {
//     if (!isEditing) setSlug(toSlug(groupName));
//   }, [groupName, isEditing]);

//   // Load danh sách group lớn (cho dropdown "Thuộc nhóm lớn")
//   useEffect(() => {
//     if (isChildMode) return;
//     (async () => {
//       try {
//         const res = await productGroupsApi.getRoots();
//         // Khi sửa: loại trừ chính nó (không cho chọn làm cha của chính nó)
//         const filtered = (res.data || []).filter(
//           (g) => !isEditing || String(g.id) !== String(initialData.id)
//         );
//         setRoots(filtered);
//       } catch (err) {
//         console.warn("Không load được group lớn:", err.message);
//       }
//     })();
//   }, [isChildMode, isEditing, initialData]);

//   // ─── Upload ảnh đại diện group ──────────────────────────────────────
//   const handleImageChange = async (e) => {
//     const file = e.target.files[0];
//     if (!file) return;
//     setImagePreview(URL.createObjectURL(file));
//     setUploading(true);
//     setError("");
//     try {
//       const url = await uploadImage(file, "product-groups");
//       setImageUrl(url);
//       setImagePreview(url);
//     } catch (err) {
//       setError("Lỗi upload ảnh: " + err.message);
//       setImagePreview(initialData?.image_url || null);
//       setImageUrl(initialData?.image_url || null);
//     } finally {
//       setUploading(false);
//     }
//   };

//   // ─── Upload ảnh intro ───────────────────────────────────────────────
//   const handleIntroImageChange = async (e) => {
//     const file = e.target.files[0];
//     if (!file) return;
//     setIntroImagePreview(URL.createObjectURL(file));
//     setIntroUploading(true);
//     setError("");
//     try {
//       const url = await uploadImage(file, "product-groups/intro");
//       setIntroImageUrl(url);
//       setIntroImagePreview(url);
//     } catch (err) {
//       setError("Lỗi upload ảnh intro: " + err.message);
//       setIntroImagePreview(initialData?.intro_image_url || null);
//       setIntroImageUrl(initialData?.intro_image_url || null);
//     } finally {
//       setIntroUploading(false);
//     }
//   };

//   const clearIntroImage = () => {
//     setIntroImageUrl(null);
//     setIntroImagePreview(null);
//     if (introFileRef.current) introFileRef.current.value = "";
//   };

//   // ─── Lưu ───────────────────────────────────────────────────────────
//   const handleSave = async (e) => {
//     e?.preventDefault?.();
//     if (!groupName.trim()) { setError("Vui lòng nhập tên nhóm sản phẩm"); return; }
//     if (!slug.trim())      { setError("Vui lòng nhập slug"); return; }
//     if (uploading || introUploading) { setError("Vui lòng chỉnh upload ảnh xong"); return; }

//     setSaving(true);
//     setError("");
//     try {
//       const body = {
//         name:             groupName,
//         slug,
//         description,
//         is_active:        isVisible,
//         sort_order:       Number(sortOrder) || 0,
//         image_url:        imageUrl,
//         // Phân cấp + slider/intro: chỉ lưu khi là group lớn
//         parent_id:        isChildMode ? null : (parentId || null),
//         slider_text:      isChildMode ? null : (sliderText || null),
//         intro_title:      isChildMode ? null : (introTitle || null),
//         intro_subtitle:   isChildMode ? null : (introSubtitle || null),
//         intro_image_url:  isChildMode ? null : (introImageUrl || null),
//       };
//       if (isEditing) {
//         await productGroupsApi.update(initialData.id, body);
//       } else {
//         await productGroupsApi.create(body);
//       }
//       onSaved?.();
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setSaving(false);
//     }
//   };

//   const pageTitle = isEditing
//     ? `Sửa nhóm: ${initialData.name}`
//     : isChildMode
//       ? "Thêm nhóm sản phẩm con"
//       : "Thêm nhóm sản phẩm";

//   return (
//     <div className="product-group-wrapper" style={{ padding: "0 8px" }}>

//       {/* HEADER */}
//       <div className="hp-header">
//         <div>
//           <h1>{pageTitle}</h1>
//           <p>
//             {isChildMode
//               ? "Nhóm con sẽ kế thừa slider/giới thiệu từ nhóm lớn — chỉ cần nhập thông tin cơ bản."
//               : "Vui lòng cung cấp thông tin về nhóm sản phẩm."}
//           </p>
//         </div>
//         <div className="hp-header-actions">
//           <button type="button" className="hp-btn hp-btn-ghost" onClick={onBack}>
//             <i className="fas fa-arrow-left" /> Hủy
//           </button>
//           <button
//             type="button"
//             className="hp-btn hp-btn-primary"
//             onClick={handleSave}
//             disabled={saving || uploading || introUploading}
//           >
//             <i className="fas fa-save" />{" "}
//             {saving ? "Đang lưu..." : uploading || introUploading ? "Đang upload..." : "Lưu"}
//           </button>
//         </div>
//       </div>

//       {error && <div className="hp-alert hp-alert-error">⚠️ {error}</div>}

//       {/* ─── SECTION 1: Thông tin chung ─────────────────────────────── */}
//       <div className="hp-card">
//         <h3 className="hp-card-title">Thông tin chung</h3>
//         <p className="hp-card-desc">Tên, slug, mô tả và hình đại diện cho nhóm sản phẩm.</p>

//         <div className="hp-grid-2">
//           <div className="hp-field">
//             <label>
//               <span style={{ color: "#dc2626" }}>*</span> Tên nhóm sản phẩm
//             </label>
//             <input
//               type="text"
//               value={groupName}
//               onChange={(e) => setGroupName(e.target.value)}
//               placeholder="VD: Sản Phẩm Gia Đình"
//             />
//           </div>
//           <div className="hp-field">
//             <label>Slug (URL)</label>
//             <input
//               type="text"
//               value={slug}
//               onChange={(e) => setSlug(e.target.value)}
//               placeholder="san-pham-gia-dinh"
//               style={{ fontFamily: "'Courier New', monospace" }}
//             />
//           </div>
//         </div>

//         <div className="hp-field">
//           <label>Mô tả</label>
//           <textarea
//             rows={3}
//             value={description}
//             onChange={(e) => setDescription(e.target.value)}
//             placeholder="Mô tả ngắn về nhóm sản phẩm..."
//           />
//         </div>

//         <div className="hp-grid-2">
//           <div className="hp-field">
//             <label>Thứ tự hiển thị</label>
//             <input
//               type="number"
//               value={sortOrder}
//               onChange={(e) => setSortOrder(e.target.value)}
//             />
//           </div>
//           <div className="hp-field" style={{ display: "flex", alignItems: "flex-end" }}>
//             <label className="hp-toggle">
//               <input
//                 type="checkbox"
//                 checked={isVisible}
//                 onChange={(e) => setIsVisible(e.target.checked)}
//               />
//               <span>Hiển thị trên website</span>
//             </label>
//           </div>
//         </div>

//         <div className="hp-field">
//           <label>Hình đại diện</label>
//           <input
//             ref={fileInputRef}
//             type="file"
//             accept="image/*"
//             onChange={handleImageChange}
//             hidden
//           />
//           <div className="hp-upload-row">
//             <button
//               type="button"
//               className="hp-btn hp-btn-secondary"
//               onClick={() => fileInputRef.current?.click()}
//               disabled={uploading}
//             >
//               <i className="fas fa-upload" />{" "}
//               {uploading ? "Đang xử lý..." : imageUrl ? "Đổi ảnh" : "Tải ảnh lên"}
//             </button>
//             {imageUrl && (
//               <button
//                 type="button"
//                 className="hp-btn hp-btn-ghost"
//                 onClick={() => { setImageUrl(null); setImagePreview(null); }}
//               >
//                 <i className="fas fa-trash" /> Xóa
//               </button>
//             )}
//           </div>
//           {imagePreview && (
//             <div className="hp-preview" style={{ maxWidth: 220 }}>
//               <img src={imagePreview} alt="preview" style={{ maxHeight: 140 }} />
//             </div>
//           )}
//         </div>
//       </div>

//       {/* ─── SECTION 2: Phân cấp (chỉ mode lớn) ──────────────────────── */}
//       {!isChildMode && (
//         <div className="hp-card">
//           <h3 className="hp-card-title">Phân cấp & Slider giới thiệu</h3>
//           <p className="hp-card-desc">
//             Chọn nhóm cha (nếu muốn nhóm này là con của nhóm khác) hoặc để trống nếu là nhóm lớn.
//             Nhóm lớn có thể chạy 1 dòng chữ ngắn trong slider trang chủ.
//           </p>

//           <div className="hp-field">
//             <label>Thuộc nhóm lớn (để trống = nhóm lớn độc lập)</label>
//             <select
//               value={parentId ?? ""}
//               onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)}
//               style={{
//                 width: "100%",
//                 padding: "10px 12px",
//                 border: "1px solid #d1d5db",
//                 borderRadius: "8px",
//                 fontSize: "14px",
//                 background: "white",
//               }}
//             >
//               <option value="">— Là nhóm lớn —</option>
//               {roots.map((g) => (
//                 <option key={g.id} value={g.id}>{g.name}</option>
//               ))}
//             </select>
//           </div>

//           <div className="hp-field" style={{ marginBottom: 0 }}>
//             <label>Chữ chạy trong slider (slider_text)</label>
//             <input
//               type="text"
//               value={sliderText}
//               onChange={(e) => setSliderText(e.target.value)}
//               placeholder="VD: Sản phẩm chăm sóc gia đình Việt — An toàn, tiện lợi, tiết kiệm"
//               maxLength={120}
//             />
//             <small style={{ color: "#64748b" }}>
//               Hiển thị trong slider giới thiệu ở trang chủ shop (tối đa 120 ký tự).
//             </small>
//           </div>
//         </div>
//       )}

//       {/* ─── SECTION 3: Giới thiệu (intro) — chỉ mode lớn, form bám style Values ─ */}
//       {!isChildMode && (
//         <div className="hp-card">
//           <div className="hp-card-head">
//             <div>
//               <h3 className="hp-card-title">Phần giới thiệu Product Group</h3>
//               <p className="hp-card-desc">
//                 Phần giới thiệu hiển thị riêng phía dưới slider trang chủ — gồm tiêu đề, mô tả phụ và ảnh minh hoạ.
//               </p>
//             </div>
//           </div>

//           <div className="hp-article-form">
//             <div className="hp-field">
//               <label>Tiêu đề giới thiệu</label>
//               <input
//                 type="text"
//                 value={introTitle}
//                 onChange={(e) => setIntroTitle(e.target.value)}
//                 placeholder="VD: Sản Phẩm Gia Đình — Đồng hành cùng mọi nhà"
//               />
//             </div>

//             <div className="hp-field">
//               <label>Mô tả phụ</label>
//               <textarea
//                 rows={3}
//                 value={introSubtitle}
//                 onChange={(e) => setIntroSubtitle(e.target.value)}
//                 placeholder="Một vài câu giới thiệu ngắn gọn, thân thiện..."
//               />
//             </div>

//             <div className="hp-field">
//               <label>Ảnh minh hoạ</label>
//               <input
//                 ref={introFileRef}
//                 type="file"
//                 accept="image/*"
//                 onChange={handleIntroImageChange}
//                 hidden
//               />
//               <div className="hp-upload-row">
//                 <button
//                   type="button"
//                   className="hp-btn hp-btn-secondary"
//                   onClick={() => introFileRef.current?.click()}
//                   disabled={introUploading}
//                 >
//                   <i className="fas fa-upload" />{" "}
//                   {introUploading ? "Đang xử lý..." : introImageUrl ? "Đổi ảnh" : "Tải ảnh lên"}
//                 </button>
//                 {introImageUrl && (
//                   <button type="button" className="hp-btn hp-btn-ghost" onClick={clearIntroImage}>
//                     <i className="fas fa-trash" /> Xóa
//                   </button>
//                 )}
//               </div>
//               {introImagePreview && (
//                 <div className="hp-preview" style={{ maxWidth: 360 }}>
//                   <img src={introImagePreview} alt="intro preview" />
//                 </div>
//               )}
//             </div>

//             <div className="hp-form-actions">
//               <button
//                 type="button"
//                 className="hp-btn hp-btn-ghost"
//                 onClick={() => {
//                   setIntroTitle(""); setIntroSubtitle(""); clearIntroImage();
//                 }}
//               >
//                 Xoá nội dung
//               </button>
//               <button type="button" className="hp-btn hp-btn-primary" disabled>
//                 <i className="fas fa-info-circle" /> Lưu cùng lúc với nhóm
//               </button>
//             </div>
//             <small style={{ color: "#64748b", display: "block", marginTop: 8 }}>
//               Phần giới thiệu sẽ được lưu vào cùng bản ghi nhóm khi bấm <strong>Lưu</strong> ở trên.
//             </small>
//           </div>
//         </div>
//       )}

//       {/* Footer action cho mode con — bổ sung nút Lưu cuối trang */}
//       {isChildMode && (
//         <div className="hp-card" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
//           <button type="button" className="hp-btn hp-btn-ghost" onClick={onBack}>
//             Hủy
//           </button>
//           <button
//             type="button"
//             className="hp-btn hp-btn-primary"
//             onClick={handleSave}
//             disabled={saving || uploading}
//           >
//             <i className="fas fa-save" /> {saving ? "Đang lưu..." : "Lưu"}
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }


import React, { useState, useRef, useEffect, useMemo } from "react";
import { productGroupsApi } from "../../api";
import { uploadImage } from "../../api";

function toSlug(str) {
  return str.normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

function toCode(str) {
  return str.normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toUpperCase().trim()
    .replace(/[^A-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

// Form tạo / sửa Product Group
//   - Mode "lớn" (parent_id = null): hiện đủ 3 section (Thông tin chung, Phân cấp slider, Intro)
//   - Mode "con"  (parent_id != null): chỉ hiện Thông tin chung (giống form cũ)
//   - Form bám 100% style form Values ở HomePage.jsx (class hp-*)
export default function CreateProductGroup({
  onBack,
  onSaved,
  initialData = null,
  defaultParentId = null, // khi bấm "+ Thêm nhóm con" ở bảng
}) {
  const isEditing = !!initialData;
  // Mode con khi: sửa mà đã có parent_id, hoặc đang tạo mới với defaultParentId
  const isChildMode =
    (isEditing && initialData?.parent_id != null) ||
    (!isEditing && defaultParentId != null);

  // ─── State: thông tin chung ──────────────────────────────────────────
  const [groupName,     setGroupName]     = useState(initialData?.name         || "");
  const [groupCode,     setGroupCode]     = useState(initialData?.code         || "");
  const [codeTouched,   setCodeTouched]   = useState(false);
  const [slug,          setSlug]          = useState(initialData?.slug         || "");
  const [description,   setDescription]   = useState(initialData?.description  || "");
  const [isVisible,     setIsVisible]     = useState(initialData?.is_active    ?? true);
  const [isSale,        setIsSale]        = useState(initialData?.is_sale       ?? false);
  const [sortOrder,     setSortOrder]     = useState(initialData?.sort_order   || 0);
  const [imagePreview,  setImagePreview]  = useState(initialData?.image_url    || null);
  const [imageUrl,      setImageUrl]      = useState(initialData?.image_url    || null);

  // ─── State: phân cấp (chỉ mode lớn) ─────────────────────────────────
  const [parentId,      setParentId]      = useState(
    isEditing ? (initialData?.parent_id ?? null) : defaultParentId
  );
  const [sliderText,    setSliderText]    = useState(initialData?.slider_text  || "");
  const [roots,         setRoots]         = useState([]);

  // ─── State: intro (chỉ mode lớn) ────────────────────────────────────
  const [introTitle,    setIntroTitle]    = useState(initialData?.intro_title    || "");
  const [introSubtitle, setIntroSubtitle] = useState(initialData?.intro_subtitle || "");
  const [introImagePreview, setIntroImagePreview] = useState(initialData?.intro_image_url || null);
  const [introImageUrl,      setIntroImageUrl]      = useState(initialData?.intro_image_url || null);
  const [introUploading,     setIntroUploading]     = useState(false);

  // ─── State chung ─────────────────────────────────────────────────────
  const [uploading, setUploading] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  const fileInputRef   = useRef(null);
  const introFileRef   = useRef(null);

  // Tự sinh slug từ tên (chỉ khi tạo mới)
  useEffect(() => {
    if (!isEditing) setSlug(toSlug(groupName));
  }, [groupName, isEditing]);

  // Tự sinh mã nhóm từ tên (chỉ khi tạo mới và người dùng chưa tự sửa mã)
  useEffect(() => {
    if (!isEditing && !codeTouched) setGroupCode(toCode(groupName));
  }, [groupName, isEditing, codeTouched]);

  // Load danh sách group lớn (cho dropdown "Thuộc nhóm lớn")
  useEffect(() => {
    if (isChildMode) return;
    (async () => {
      try {
        const res = await productGroupsApi.getRoots();
        // Khi sửa: loại trừ chính nó (không cho chọn làm cha của chính nó)
        const filtered = (res.data || []).filter(
          (g) => !isEditing || String(g.id) !== String(initialData.id)
        );
        setRoots(filtered);
      } catch (err) {
        console.warn("Không load được group lớn:", err.message);
      }
    })();
  }, [isChildMode, isEditing, initialData]);

  // ─── Upload ảnh đại diện group ──────────────────────────────────────
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setUploading(true);
    setError("");
    try {
      const url = await uploadImage(file, "product-groups");
      setImageUrl(url);
      setImagePreview(url);
    } catch (err) {
      setError("Lỗi upload ảnh: " + err.message);
      setImagePreview(initialData?.image_url || null);
      setImageUrl(initialData?.image_url || null);
    } finally {
      setUploading(false);
    }
  };

  // ─── Upload ảnh intro ───────────────────────────────────────────────
  const handleIntroImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIntroImagePreview(URL.createObjectURL(file));
    setIntroUploading(true);
    setError("");
    try {
      const url = await uploadImage(file, "product-groups/intro");
      setIntroImageUrl(url);
      setIntroImagePreview(url);
    } catch (err) {
      setError("Lỗi upload ảnh intro: " + err.message);
      setIntroImagePreview(initialData?.intro_image_url || null);
      setIntroImageUrl(initialData?.intro_image_url || null);
    } finally {
      setIntroUploading(false);
    }
  };

  const clearIntroImage = () => {
    setIntroImageUrl(null);
    setIntroImagePreview(null);
    if (introFileRef.current) introFileRef.current.value = "";
  };

  // ─── Lưu ───────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e?.preventDefault?.();
    if (!groupName.trim()) { setError("Vui lòng nhập tên nhóm sản phẩm"); return; }
    if (!slug.trim())      { setError("Vui lòng nhập slug"); return; }
    if (uploading || introUploading) { setError("Vui lòng chỉnh upload ảnh xong"); return; }

    setSaving(true);
    setError("");
    try {
      const body = {
        name:             groupName,
        code:             groupCode.trim() ? toCode(groupCode) : null,
        slug,
        description,
        is_active:        isVisible,
        is_sale:          isSale,
        sort_order:       Number(sortOrder) || 0,
        image_url:        imageUrl,
        // Phân cấp + slider/intro: chỉ lưu khi là group lớn
        parent_id:        isChildMode ? null : (parentId || null),
        slider_text:      isChildMode ? null : (sliderText || null),
        intro_title:      isChildMode ? null : (introTitle || null),
        intro_subtitle:   isChildMode ? null : (introSubtitle || null),
        intro_image_url:  isChildMode ? null : (introImageUrl || null),
      };
      if (isEditing) {
        await productGroupsApi.update(initialData.id, body);
      } else {
        await productGroupsApi.create(body);
      }
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const pageTitle = isEditing
    ? `Sửa nhóm: ${initialData.name}`
    : isChildMode
      ? "Thêm nhóm sản phẩm con"
      : "Thêm nhóm sản phẩm";

  return (
    <div className="product-group-wrapper" style={{ padding: "0 8px" }}>

      {/* HEADER */}
      <div className="hp-header">
        <div>
          <h1>{pageTitle}</h1>
          <p>
            {isChildMode
              ? "Nhóm con sẽ kế thừa slider/giới thiệu từ nhóm lớn — chỉ cần nhập thông tin cơ bản."
              : "Vui lòng cung cấp thông tin về nhóm sản phẩm."}
          </p>
        </div>
        <div className="hp-header-actions">
          <button type="button" className="hp-btn hp-btn-ghost" onClick={onBack}>
            <i className="fas fa-arrow-left" /> Hủy
          </button>
          <button
            type="button"
            className="hp-btn hp-btn-primary"
            onClick={handleSave}
            disabled={saving || uploading || introUploading}
          >
            <i className="fas fa-save" />{" "}
            {saving ? "Đang lưu..." : uploading || introUploading ? "Đang upload..." : "Lưu"}
          </button>
        </div>
      </div>

      {error && <div className="hp-alert hp-alert-error">⚠️ {error}</div>}

      {/* ─── SECTION 1: Thông tin chung ─────────────────────────────── */}
      <div className="hp-card">
        <h3 className="hp-card-title">Thông tin chung</h3>
        <p className="hp-card-desc">Tên, mã nhóm, slug, mô tả và hình đại diện cho nhóm sản phẩm.</p>

        <div className="hp-grid-2">
          <div className="hp-field">
            <label>
              <span style={{ color: "#dc2626" }}>*</span> Tên nhóm sản phẩm
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="VD: Sản Phẩm Gia Đình"
            />
          </div>
          <div className="hp-field">
            <label>Mã nhóm</label>
            <input
              type="text"
              value={groupCode}
              onChange={(e) => {
                setCodeTouched(true);
                setGroupCode(toCode(e.target.value));
              }}
              placeholder="VD: SP-GIA-DINH"
              style={{ fontFamily: "'Courier New', monospace" }}
            />
            <small style={{ color: "#64748b" }}>
              Mã định danh nội bộ cho nhóm (tự sinh từ tên, có thể sửa lại).
            </small>
          </div>
        </div>

        <div className="hp-grid-2">
          <div className="hp-field">
            <label>Slug (URL)</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="san-pham-gia-dinh"
              style={{ fontFamily: "'Courier New', monospace" }}
            />
          </div>
        </div>

        <div className="hp-field">
          <label>Mô tả</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả ngắn về nhóm sản phẩm..."
          />
        </div>

        <div className="hp-grid-2">
          <div className="hp-field">
            <label>Thứ tự hiển thị</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>
          <div className="hp-field" style={{ display: "flex", alignItems: "flex-end" }}>
            <label className="hp-toggle">
              <input
                type="checkbox"
                checked={isVisible}
                onChange={(e) => setIsVisible(e.target.checked)}
              />
              <span>Hiển thị trên website</span>
            </label>
          </div>
        </div>

        {/* ─── Phân loại menu SALE / SẢN PHẨM (chỉ áp dụng cho nhóm lớn) ─ */}
        {!isChildMode && (
          <div className="hp-field" style={{ marginTop: 12 }}>
            <label className="hp-toggle" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={isSale}
                onChange={(e) => setIsSale(e.target.checked)}
              />
              <span>
                <i className="fas fa-tags" style={{ color: "#dc2626", marginRight: 4 }} />
                Hiển thị ở menu <strong>SALE</strong> trên header
                <small style={{ display: "block", color: "#64748b", marginTop: 2 }}>
                  Khi bật: nhóm lớn này sẽ xuất hiện trong menu SALE (dạng card ảnh + tên).
                  Khi tắt: nhóm sẽ hiện ở menu SẢN PHẨM (dạng cột kèm sản phẩm con).
                </small>
              </span>
            </label>
          </div>
        )}

        <div className="hp-field">
          <label>Hình đại diện</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            hidden
          />
          <div className="hp-upload-row">
            <button
              type="button"
              className="hp-btn hp-btn-secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <i className="fas fa-upload" />{" "}
              {uploading ? "Đang xử lý..." : imageUrl ? "Đổi ảnh" : "Tải ảnh lên"}
            </button>
            {imageUrl && (
              <button
                type="button"
                className="hp-btn hp-btn-ghost"
                onClick={() => { setImageUrl(null); setImagePreview(null); }}
              >
                <i className="fas fa-trash" /> Xóa
              </button>
            )}
          </div>
          {imagePreview && (
            <div className="hp-preview" style={{ maxWidth: 220 }}>
              <img src={imagePreview} alt="preview" style={{ maxHeight: 140 }} />
            </div>
          )}
        </div>
      </div>

      {/* ─── SECTION 2: Phân cấp (chỉ mode lớn) ──────────────────────── */}
      {!isChildMode && (
        <div className="hp-card">
          <h3 className="hp-card-title">Phân cấp & Slider giới thiệu</h3>
          <p className="hp-card-desc">
            Chọn nhóm cha (nếu muốn nhóm này là con của nhóm khác) hoặc để trống nếu là nhóm lớn.
            Nhóm lớn có thể chạy 1 dòng chữ ngắn trong slider trang chủ.
          </p>

          <div className="hp-field">
            <label>Thuộc nhóm lớn (để trống = nhóm lớn độc lập)</label>
            <select
              value={parentId ?? ""}
              onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px",
                background: "white",
              }}
            >
              <option value="">— Là nhóm lớn —</option>
              {roots.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="hp-field" style={{ marginBottom: 0 }}>
            <label>Chữ chạy trong slider (slider_text)</label>
            <input
              type="text"
              value={sliderText}
              onChange={(e) => setSliderText(e.target.value)}
              placeholder="VD: Sản phẩm chăm sóc gia đình Việt — An toàn, tiện lợi, tiết kiệm"
              maxLength={120}
            />
            <small style={{ color: "#64748b" }}>
              Hiển thị trong slider giới thiệu ở trang chủ shop (tối đa 120 ký tự).
            </small>
          </div>
        </div>
      )}

      {/* ─── SECTION 3: Giới thiệu (intro) — chỉ mode lớn, form bám style Values ─ */}
      {!isChildMode && (
        <div className="hp-card">
          <div className="hp-card-head">
            <div>
              <h3 className="hp-card-title">Phần giới thiệu Product Group</h3>
              <p className="hp-card-desc">
                Phần giới thiệu hiển thị riêng phía dưới slider trang chủ — gồm tiêu đề, mô tả phụ và ảnh minh hoạ.
              </p>
            </div>
          </div>

          <div className="hp-article-form">
            <div className="hp-field">
              <label>Tiêu đề giới thiệu</label>
              <input
                type="text"
                value={introTitle}
                onChange={(e) => setIntroTitle(e.target.value)}
                placeholder="VD: Sản Phẩm Gia Đình — Đồng hành cùng mọi nhà"
              />
            </div>

            <div className="hp-field">
              <label>Mô tả phụ</label>
              <textarea
                rows={3}
                value={introSubtitle}
                onChange={(e) => setIntroSubtitle(e.target.value)}
                placeholder="Một vài câu giới thiệu ngắn gọn, thân thiện..."
              />
            </div>

            <div className="hp-field">
              <label>Ảnh minh hoạ</label>
              <input
                ref={introFileRef}
                type="file"
                accept="image/*"
                onChange={handleIntroImageChange}
                hidden
              />
              <div className="hp-upload-row">
                <button
                  type="button"
                  className="hp-btn hp-btn-secondary"
                  onClick={() => introFileRef.current?.click()}
                  disabled={introUploading}
                >
                  <i className="fas fa-upload" />{" "}
                  {introUploading ? "Đang xử lý..." : introImageUrl ? "Đổi ảnh" : "Tải ảnh lên"}
                </button>
                {introImageUrl && (
                  <button type="button" className="hp-btn hp-btn-ghost" onClick={clearIntroImage}>
                    <i className="fas fa-trash" /> Xóa
                  </button>
                )}
              </div>
              {introImagePreview && (
                <div className="hp-preview" style={{ maxWidth: 360 }}>
                  <img src={introImagePreview} alt="intro preview" />
                </div>
              )}
            </div>

            <div className="hp-form-actions">
              <button
                type="button"
                className="hp-btn hp-btn-ghost"
                onClick={() => {
                  setIntroTitle(""); setIntroSubtitle(""); clearIntroImage();
                }}
              >
                Xoá nội dung
              </button>
              <button type="button" className="hp-btn hp-btn-primary" disabled>
                <i className="fas fa-info-circle" /> Lưu cùng lúc với nhóm
              </button>
            </div>
            <small style={{ color: "#64748b", display: "block", marginTop: 8 }}>
              Phần giới thiệu sẽ được lưu vào cùng bản ghi nhóm khi bấm <strong>Lưu</strong> ở trên.
            </small>
          </div>
        </div>
      )}

      {/* Footer action cho mode con — bổ sung nút Lưu cuối trang */}
      {isChildMode && (
        <div className="hp-card" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="hp-btn hp-btn-ghost" onClick={onBack}>
            Hủy
          </button>
          <button
            type="button"
            className="hp-btn hp-btn-primary"
            onClick={handleSave}
            disabled={saving || uploading}
          >
            <i className="fas fa-save" /> {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      )}
    </div>
  );
}