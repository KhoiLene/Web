import React, { useState, useRef, useEffect } from "react";
import { productGroupsApi } from "../../api";

// Helper tạo slug từ tên tiếng Việt
function toSlug(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

export default function CreateProductGroup({ onBack, onSaved, initialData = null }) {
  const isEditing = !!initialData;

  const [groupName,      setGroupName]      = useState(initialData?.name        || "");
  const [slug,           setSlug]           = useState(initialData?.slug        || "");
  const [description,    setDescription]    = useState(initialData?.description || "");
  const [conditionType,  setConditionType]  = useState(initialData?.condition_type || "automatic");
  const [isVisible,      setIsVisible]      = useState(initialData?.is_active ?? true);
  const [sortOrder,      setSortOrder]      = useState(initialData?.sort_order  || 0);

  const [imageFile,      setImageFile]      = useState(null);
  const [imagePreview,   setImagePreview]   = useState(initialData?.image_url   || null);

  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  const fileInputRef = useRef(null);

  // Tự động tạo slug khi đổi tên (chỉ khi tạo mới)
  useEffect(() => {
    if (!isEditing) setSlug(toSlug(groupName));
  }, [groupName, isEditing]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) { setError("Vui lòng nhập tên nhóm sản phẩm"); return; }
    if (!slug.trim())      { setError("Vui lòng nhập slug"); return; }

    setSaving(true);
    setError("");

    try {
      // TODO: Upload ảnh lên storage (Supabase Storage / Cloudinary) rồi lấy URL
      // Hiện tại gửi image_url cũ nếu không đổi ảnh
      const body = {
        name:           groupName,
        slug:           slug,
        description:    description,
        condition_type: conditionType,
        is_active:      isVisible,
        sort_order:     Number(sortOrder),
        image_url:      imageFile ? imagePreview : (initialData?.image_url || null),
        // Khi có Supabase Storage:
        // image_url: imageFile ? await uploadImage(imageFile) : initialData?.image_url
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

  return (
    <div style={{ padding: "0 8px" }}>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: "600", color: "#111827", margin: 0 }}>
            {isEditing ? `Sửa nhóm: ${initialData.name}` : "Thông tin nhóm sản phẩm"}
          </h1>
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "4px 0 0 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Vui lòng cung cấp các thông tin về nhóm sản phẩm
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button type="button" onClick={onBack}
            style={{ padding: "9px 18px", borderRadius: "8px", border: "1px solid #d1d5db", background: "white", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}>
            Hủy
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            style={{ padding: "9px 22px", borderRadius: "8px", border: "none", background: saving ? "#93c5fd" : "#2563eb", color: "white", fontWeight: "600", cursor: saving ? "not-allowed" : "pointer", fontSize: "14px" }}>
            {saving ? "⌛ Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", fontSize: "14px", marginBottom: "16px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* GRID LAYOUT */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px", alignItems: "start" }}>

        {/* CỘT TRÁI */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Thông tin chung */}
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#111827", margin: "0 0 16px", borderBottom: "1px solid #f3f4f6", paddingBottom: "10px" }}>
              Thông tin chung
            </h3>

            {/* Tên nhóm */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>
                <span style={{ color: "red" }}>*</span> Tên nhóm sản phẩm
              </label>
              <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ví dụ: Nhóm Apple"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", boxSizing: "border-box", outline: "none", fontSize: "14px" }} />
            </div>

            {/* Slug */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>
                Slug (URL)
              </label>
              <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)}
                placeholder="nhom-apple"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", boxSizing: "border-box", outline: "none", fontSize: "14px", color: "#6b7280" }} />
            </div>

            {/* Mô tả */}
            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>Mô tả</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Nhập nội dung mô tả chi tiết..."
                style={{ width: "100%", minHeight: "180px", padding: "12px", border: "1px solid #d1d5db", borderRadius: "8px", boxSizing: "border-box", outline: "none", fontFamily: "inherit", fontSize: "14px", resize: "vertical" }} />
            </div>
          </div>

          {/* Điều kiện */}
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#111827", margin: "0 0 4px" }}>Các điều kiện</h3>
            <p style={{ fontSize: "13px", color: "#9ca3af", margin: "0 0 16px" }}>Sản phẩm sẽ được đưa vào nhóm dựa trên điều kiện bên dưới.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid #f3f4f6", paddingTop: "16px" }}>
              {[["manual", "Tự chọn sản phẩm"], ["automatic", "Sản phẩm tự động cập nhật dựa trên điều kiện"]].map(([val, lbl]) => (
                <label key={val} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", cursor: "pointer",
                  color: conditionType === val ? "#2563eb" : "#374151", fontWeight: conditionType === val ? "600" : "normal" }}>
                  <input type="radio" name="condition_type" checked={conditionType === val} onChange={() => setConditionType(val)} />
                  {lbl}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Hiển thị */}
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#111827", margin: "0 0 14px" }}>Hiển thị</h3>
            <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", cursor: "pointer" }}>
              <input type="checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)} />
              Website
            </label>
          </div>

          {/* Thứ tự */}
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#111827", margin: "0 0 14px" }}>Thứ tự hiển thị</h3>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", boxSizing: "border-box", outline: "none", fontSize: "14px" }} />
          </div>

          {/* Hình đại diện */}
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#111827", margin: "0 0 14px" }}>Hình đại diện</h3>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} style={{ display: "none" }} />
            <div onClick={() => fileInputRef.current.click()}
              style={{ border: "2px dashed #bfdbfe", borderRadius: "10px", padding: imagePreview ? "12px" : "36px 12px",
                textAlign: "center", cursor: "pointer", backgroundColor: "#f8fafc",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "160px" }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = "#2563eb"}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "#bfdbfe"}
            >
              {imagePreview ? (
                <div style={{ width: "100%" }}>
                  <img src={imagePreview} alt="Preview"
                    style={{ maxWidth: "100%", maxHeight: "160px", borderRadius: "6px", objectFit: "contain", display: "block", margin: "0 auto" }} />
                  <p style={{ fontSize: "12px", color: "#2563eb", margin: "8px 0 0", fontWeight: "500" }}>Nhấp để đổi hình ảnh</p>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: "28px", color: "#9ca3af", marginBottom: "6px" }}>📷</div>
                  <span style={{ fontSize: "13px", color: "#2563eb", fontWeight: "600" }}>Thêm hình ảnh</span>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}