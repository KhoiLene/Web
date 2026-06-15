import React, { useState, useRef } from "react";

export default function CreateProductGroup({ onBack }) {
  // ─── State Quản lý dữ liệu ──────────────────────────────────────────────────
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [conditionType, setConditionType] = useState("automatic"); // automatic hoặc manual
  const [isVisibleWebsite, setIsVisibleWebsite] = useState(true);

  // ─── State Quản lý hình ảnh đại diện ────────────────────────────────────────
  const [imageFile, setImageFile] = useState(null);       // Lưu file thực tế để gửi API
  const [imagePreview, setImagePreview] = useState(null); // Lưu URL tạm thời để hiển thị img
  
  const fileInputRef = useRef(null); // Tạo tham chiếu đến thẻ input file bị ẩn

  // Xử lý sự kiện khi người dùng chọn file ảnh từ máy tính
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file)); // Tạo đường dẫn preview tạm thời
    }
  };

  // Hàm kích hoạt click vào ô chọn file ẩn
  const triggerSelectFile = () => {
    fileInputRef.current.click();
  };

  // Hàm xử lý khi nhấn nút Lưu form
  const handleSave = (e) => {
    e.preventDefault();
    const formData = {
      name: groupName,
      description: description,
      condition: conditionType,
      visibleWebsite: isVisibleWebsite,
      image: imageFile
    };
    console.log("Dữ liệu nhóm sản phẩm sẵn sàng gửi lên Server:", formData);
    alert("Bắt sự kiện lưu thành công! (Xem chi tiết data tại Console F12)");
  };

  return (
    <div className="create-group-wrapper" style={{ padding: "0 8px" }}>
      
      {/* ─── HEADER FORM ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: "600", color: "#111827", margin: 0 }}>Thông tin nhóm sản phẩm</h1>
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "4px 0 0 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Vui lòng cung cấp các thông tin về nhóm sản phẩm sẽ tạo mới
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button 
            type="button"
            onClick={onBack} 
            style={{ padding: "9px 18px", borderRadius: "8px", border: "1px solid #d1d5db", background: "white", cursor: "pointer", fontSize: "14px", fontWeight: "500", color: "#374151" }}
          >
            Hủy
          </button>
          <button 
            type="button"
            onClick={handleSave}
            style={{ padding: "9px 22px", borderRadius: "8px", border: "none", background: "#2563eb", color: "white", fontWeight: "600", cursor: "pointer", fontSize: "14px" }}
          >
            Lưu
          </button>
        </div>
      </div>

      {/* ─── GRID LAYOUT CHÍNH ─────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px", alignItems: "start" }}>
        
        {/* ================= CỘT TRÁI (THÔNG TIN CHÍNH) ================= */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Khối Thông tin chung */}
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#111827", margin: "0 0 16px 0", borderBottom: "1px solid #f3f4f6", paddingBottom: "10px" }}>
              Thông tin chung
            </h3>
            
            {/* Nhập Tên nhóm */}
            <div style={{ marginBottom: "18px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>Tên nhóm sản phẩm</label>
              <input 
                type="text" 
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ví dụ: Nhóm Apple" 
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", boxSizing: "border-box", outline: "none", fontSize: "14px" }} 
              />
            </div>

            {/* Nhập Mô tả */}
            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>Mô tả</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Nhập nội dung mô tả chi tiết tại đây..."
                style={{
                  width: "100%",
                  minHeight: "240px",
                  padding: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  boxSizing: "border-box",
                  outline: "none",
                  fontFamily: "inherit",
                  fontSize: "14px",
                  resize: "vertical"
                }}
              />
            </div>
          </div>

          {/* Khối Các điều kiện */}
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#111827", margin: "0 0 4px 0" }}>Các điều kiện</h3>
            <p style={{ fontSize: "13px", color: "#9ca3af", margin: "0 0 16px 0" }}>Các sản phẩm sẽ được tự động đưa vào danh mục này dựa vào các điều kiện bên dưới.</p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid #f3f4f6", paddingTop: "16px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", cursor: "pointer", color: conditionType === "manual" ? "#2563eb" : "#374151", fontWeight: conditionType === "manual" ? "600" : "normal" }}>
                <input 
                  type="radio" 
                  name="condition_type" 
                  checked={conditionType === "manual"}
                  onChange={() => setConditionType("manual")}
                /> Tự chọn sản phẩm
              </label>
              
              <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", cursor: "pointer", color: conditionType === "automatic" ? "#2563eb" : "#374151", fontWeight: conditionType === "automatic" ? "600" : "normal" }}>
                <input 
                  type="radio" 
                  name="condition_type" 
                  checked={conditionType === "automatic"}
                  onChange={() => setConditionType("automatic")}
                /> Sản phẩm tự động cập nhật dựa trên những điều kiện.
              </label>
            </div>
          </div>
        </div>

        {/* ================= CỘT PHẢI (THÔNG TIN PHỤ) ================= */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Hiển thị */}
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#111827", margin: "0 0 14px 0" }}>Hiển thị</h3>
            <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", cursor: "pointer", color: "#374151" }}>
              <input 
                type="checkbox" 
                checked={isVisibleWebsite} 
                onChange={(e) => setIsVisibleWebsite(e.target.checked)}
              /> Website
            </label>
          </div>

          {/* Menu */}
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#111827", margin: 0 }}>Menu</h3>
              <a href="#" style={{ color: "#2563eb", textDecoration: "none", fontSize: "13px", fontWeight: "600" }} onClick={(e) => e.preventDefault()}>Thêm menu</a>
            </div>
            <p style={{ fontSize: "13px", color: "#6b7280", textAlign: "center", margin: 0, padding: "8px 0", lineHeight: "1.4" }}>
              Sử dụng nút <strong style={{ color: "#374151" }}>Thêm menu</strong> để thêm trang này vào một liên kết.
            </p>
          </div>

          {/* Hình đại diện (Có chức năng Upload & Xem trước) */}
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#111827", margin: "0 0 14px 0" }}>Hình đại diện</h3>
            
            {/* Input file bị ẩn đi */}
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              style={{ display: "none" }} 
            />

            {/* Vùng click hiển thị giao diện */}
            <div 
              onClick={triggerSelectFile}
              style={{ 
                border: "2px dashed #bfdbfe", 
                borderRadius: "10px", 
                padding: imagePreview ? "12px" : "36px 12px", 
                textAlign: "center", 
                cursor: "pointer",
                backgroundColor: "#f8fafc",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "160px",
                boxSizing: "border-box",
                transition: "border-color 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = "#2563eb"}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "#bfdbfe"}
            >
              {imagePreview ? (
                <div style={{ width: "100%", textAlign: "center" }}>
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    style={{ maxWidth: "100%", maxHeight: "170px", borderRadius: "6px", objectFit: "contain", display: "block", margin: "0 auto" }} 
                  />
                  <p style={{ fontSize: "12px", color: "#2563eb", margin: "8px 0 0 0", fontWeight: "500" }}>
                    Nhấp để đổi hình ảnh khác
                  </p>
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