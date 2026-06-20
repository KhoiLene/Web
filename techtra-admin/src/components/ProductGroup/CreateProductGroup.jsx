import React, { useState, useRef, useEffect } from "react";
import { productGroupsApi } from "../../api";
import { uploadImage } from "../../supabase";

function toSlug(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

export default function CreateProductGroup({ onBack, onSaved, initialData = null }) {
  const isEditing = !!initialData;

  const [groupName,     setGroupName]     = useState(initialData?.name        || "");
  const [slug,          setSlug]          = useState(initialData?.slug        || "");
  const [description,   setDescription]   = useState(initialData?.description || "");
  const [isVisible,     setIsVisible]     = useState(initialData?.is_active   ?? true);
  const [sortOrder,     setSortOrder]     = useState(initialData?.sort_order  || 0);
  const [imagePreview,  setImagePreview]  = useState(initialData?.image_url   || null);
  const [imageUrl,      setImageUrl]      = useState(initialData?.image_url   || null); // URL thật lưu DB
  const [uploading,     setUploading]     = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isEditing) setSlug(toSlug(groupName));
  }, [groupName, isEditing]);

  // Upload lên Supabase Storage ngay khi chọn file
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Hiện preview blob ngay
    setImagePreview(URL.createObjectURL(file));
    setUploading(true);
    setError("");
    try {
      const url = await uploadImage(file, "product-groups");
      setImageUrl(url);       // URL thật → lưu DB
      setImagePreview(url);   // ghi đè blob bằng URL thật
    } catch (err) {
      setError("Lỗi upload ảnh: " + err.message);
      setImagePreview(initialData?.image_url || null);
      setImageUrl(initialData?.image_url || null);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) { setError("Vui lòng nhập tên nhóm sản phẩm"); return; }
    if (!slug.trim())      { setError("Vui lòng nhập slug"); return; }
    if (uploading)         { setError("Vui lòng chờ ảnh upload xong"); return; }

    setSaving(true);
    setError("");
    try {
      const body = {
        name:       groupName,
        slug,
        description,
        is_active:  isVisible,
        sort_order: Number(sortOrder),
        image_url:  imageUrl, // ← URL thật từ Supabase Storage
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

  const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", boxSizing: "border-box", outline: "none", fontSize: "14px" };
  const cardStyle  = { background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px" };

  return (
    <div style={{ padding: "0 8px" }}>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: "600", color: "#111827", margin: 0 }}>
            {isEditing ? `Sửa nhóm: ${initialData.name}` : "Thêm nhóm sản phẩm"}
          </h1>
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "4px 0 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Vui lòng cung cấp thông tin về nhóm sản phẩm
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button type="button" onClick={onBack}
            style={{ padding: "9px 18px", borderRadius: "8px", border: "1px solid #d1d5db", background: "white", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}>
            Hủy
          </button>
          <button type="button" onClick={handleSave} disabled={saving || uploading}
            style={{ padding: "9px 22px", borderRadius: "8px", border: "none", background: (saving || uploading) ? "#93c5fd" : "#2563eb", color: "white", fontWeight: "600", cursor: (saving || uploading) ? "not-allowed" : "pointer", fontSize: "14px" }}>
            {saving ? "⌛ Đang lưu..." : uploading ? "⌛ Đang upload..." : "Lưu"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", fontSize: "14px", marginBottom: "16px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px", alignItems: "start" }}>

        {/* CỘT TRÁI */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={cardStyle}>
            <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#111827", margin: "0 0 16px", borderBottom: "1px solid #f3f4f6", paddingBottom: "10px" }}>
              Thông tin chung
            </h3>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>
                <span style={{ color: "red" }}>*</span> Tên nhóm sản phẩm
              </label>
              <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ví dụ: Áo thun" style={inputStyle} />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>Slug (URL)</label>
              <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)}
                placeholder="ao-thun" style={{ ...inputStyle, color: "#6b7280" }} />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>Mô tả</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Nhập mô tả nhóm sản phẩm..."
                style={{ ...inputStyle, minHeight: "160px", fontFamily: "inherit", resize: "vertical" }} />
            </div>
          </div>
        </div>

        {/* CỘT PHẢI */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Hiển thị */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#111827", margin: "0 0 14px" }}>Hiển thị</h3>
            <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", cursor: "pointer" }}>
              <input type="checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)} />
              Website
            </label>
          </div>

          {/* Thứ tự */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#111827", margin: "0 0 14px" }}>Thứ tự hiển thị</h3>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={inputStyle} />
          </div>

          {/* Hình đại diện */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#111827", margin: "0 0 14px" }}>Hình đại diện</h3>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} style={{ display: "none" }} />
            <div
              onClick={() => !uploading && fileInputRef.current.click()}
              style={{ border: "2px dashed #bfdbfe", borderRadius: "10px", padding: imagePreview ? "12px" : "36px 12px",
                textAlign: "center", cursor: uploading ? "wait" : "pointer", backgroundColor: "#f8fafc",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                minHeight: "160px", position: "relative", transition: "border-color 0.2s" }}
              onMouseEnter={(e) => !uploading && (e.currentTarget.style.borderColor = "#2563eb")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#bfdbfe")}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview"
                    style={{ maxWidth: "100%", maxHeight: "140px", borderRadius: "6px", objectFit: "contain", display: "block", margin: "0 auto", opacity: uploading ? 0.5 : 1 }} />
                  {uploading ? (
                    <p style={{ fontSize: "12px", color: "#2563eb", margin: "8px 0 0", fontWeight: "600" }}>⌛ Đang upload...</p>
                  ) : (
                    <p style={{ fontSize: "12px", color: "#6b7280", margin: "8px 0 0" }}>Nhấp để đổi ảnh</p>
                  )}
                </>
              ) : (
                <>
                  <div style={{ fontSize: "28px", color: "#9ca3af", marginBottom: "6px" }}>📷</div>
                  <span style={{ fontSize: "13px", color: "#2563eb", fontWeight: "600" }}>Thêm hình ảnh</span>
                </>
              )}
            </div>
            {/* Hiện URL thật để confirm đã upload xong */}
            {imageUrl && !uploading && (
              <p style={{ fontSize: "11px", color: "#10b981", marginTop: "8px", wordBreak: "break-all" }}>
                ✅ Đã upload: {imageUrl.split("/").pop()}
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}