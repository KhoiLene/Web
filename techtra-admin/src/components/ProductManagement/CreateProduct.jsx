import React, { useState, useRef, useCallback } from "react";

// ─── J&T API CONFIG ────────────────────────────────────────────────────────────
// TODO: Thay bằng thông tin thật từ J&T Express partner portal
const JT_CONFIG = {
  BASE_URL: "https://api.jtexpress.vn/api",  // Endpoint J&T VN
  CUSTOMER_ID: "YOUR_CUSTOMER_ID",// ← từ J&T partner portal
  SANDBOX_KEY: "YOUR_SANDBOX_KEY",// ← từ J&T partner portal
  SENDER_CITY: "HCM",   // Thành phố gửi hàng
  RECEIVER_CITY: "HAN", // Mặc định - thay đổi theo khách
};

// Gọi API J&T tính phí
async function fetchJTFee({ weight, weightUnit, height, width, length, serviceCode }) {
  const weightInGrams = weightUnit === "kg" ? parseFloat(weight) * 1000 : parseFloat(weight);

  // Trong thực tế gọi endpoint J&T, ví dụ:
  // POST https://api.jtexpress.vn/api/price/calculate
  // Hiện tại dùng mock để test UI - thay bằng fetch thật khi có key
  const res = await fetch(`${JT_CONFIG.BASE_URL}/price/calculate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Customer-Id": JT_CONFIG.CUSTOMER_ID,
      "X-Api-Key": JT_CONFIG.SANDBOX_KEY,
    },
    body: JSON.stringify({
      serviceType: serviceCode || "EZ",
      weight: weightInGrams,
      length: parseFloat(length) || 0,
      width: parseFloat(width) || 0,
      height: parseFloat(height) || 0,
      senderCity: JT_CONFIG.SENDER_CITY,
      receiverCity: JT_CONFIG.RECEIVER_CITY,
    }),
  });

  if (!res.ok) throw new Error(`J&T API lỗi: ${res.status}`);
  const data = await res.json();
  return data.fee || data.totalFee || data.amount; // tuỳ response thật của J&T
}

// ─── Mock (dùng khi chưa có API key thật) ─────────────────────────────────────
async function fetchJTFeeMock({ weight, weightUnit, serviceCode }) {
  await new Promise((r) => setTimeout(r, 800)); // giả lập delay
  const g = weightUnit === "kg" ? parseFloat(weight) * 1000 : parseFloat(weight);
  const base = { EZ: 22000, FAST: 35000, SUPER: 55000 };
  const fee = (base[serviceCode] || 22000) + Math.floor(g / 500) * 3000;
  return fee;
}

// ─── SubImage refs helper (tránh dùng useRef trong vòng lặp) ──────────────────
const SUB_COUNT = 8;

export default function CreateProduct({ onBack }) {
  // ─── Thông tin cơ bản ───────────────────────────────────────────────────────
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  // ─── Hình ảnh ───────────────────────────────────────────────────────────────
  const [mainImage, setMainImage] = useState(null);
  const [subImages, setSubImages] = useState(Array(SUB_COUNT).fill(null));
  const mainImageRef = useRef(null);
  // Fix: tạo refs ngoài vòng lặp
  const subImageRefs = useRef(Array.from({ length: SUB_COUNT }, () => React.createRef()));

  // ─── Video ──────────────────────────────────────────────────────────────────
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const videoRef = useRef(null);

  // ─── Bán hàng ───────────────────────────────────────────────────────────────
  const [codEnabled, setCodEnabled] = useState(true);

  // ─── Vận chuyển ─────────────────────────────────────────────────────────────
  const [shippingMethod, setShippingMethod] = useState("default"); // 'default' | 'custom'
  const [weightUnit, setWeightUnit]         = useState("g");
  const [weight, setWeight]                 = useState("");
  const [height, setHeight]                 = useState("");
  const [width, setWidth]                   = useState("");
  const [length, setLength]                 = useState("");

  const [jtFeeDefault, setJtFeeDefault]     = useState(null);
  const [isCalculatingFee, setIsCalculatingFee] = useState(false);
  const [feeError, setFeeError]             = useState("");

  const [jtServices, setJtServices] = useState([
    { code: "EZ",    name: "J&T Chuyển phát tiêu chuẩn", active: false, fee: null },
    { code: "FAST",  name: "J&T Fast (Giao hàng nhanh)", active: false, fee: null },
    { code: "SUPER", name: "J&T Super (Dịch vụ hỏa tốc)", active: false, fee: null },
  ]);

  // ─── Gọi API J&T khi trọng lượng thay đổi ───────────────────────────────────
  const calculateFees = useCallback(async () => {
    if (!weight || parseFloat(weight) <= 0) {
      setJtFeeDefault(null);
      setJtServices((prev) => prev.map((s) => ({ ...s, fee: null })));
      return;
    }

    setIsCalculatingFee(true);
    setFeeError("");

    try {
      const params = { weight, weightUnit, height, width, length };

      if (shippingMethod === "default") {
        // Gọi API cho dịch vụ EZ (mặc định)
        // Đổi fetchJTFeeMock → fetchJTFee khi có API key thật
        const fee = await fetchJTFeeMock({ ...params, serviceCode: "EZ" });
        setJtFeeDefault(fee);
      } else {
        // Gọi API cho tất cả dịch vụ đang được chọn
        const updated = await Promise.all(
          jtServices.map(async (s) => {
            if (!s.active) return s;
            const fee = await fetchJTFeeMock({ ...params, serviceCode: s.code });
            return { ...s, fee };
          })
        );
        setJtServices(updated);
      }
    } catch (err) {
      setFeeError("Không thể kết nối J&T API. Kiểm tra API key hoặc thử lại.");
      console.error("J&T API Error:", err);
    } finally {
      setIsCalculatingFee(false);
    }
  }, [weight, weightUnit, height, width, length, shippingMethod, jtServices]);

  // Bật/tắt dịch vụ J&T và tính phí ngay
  const handleToggleJtService = async (index) => {
    const updated = jtServices.map((s, i) =>
      i === index ? { ...s, active: !s.active, fee: null } : s
    );
    setJtServices(updated);

    const toggled = updated[index];
    if (toggled.active && weight) {
      setIsCalculatingFee(true);
      try {
        const fee = await fetchJTFeeMock({ weight, weightUnit, height, width, length, serviceCode: toggled.code });
        setJtServices((prev) => prev.map((s, i) => i === index ? { ...s, fee } : s));
      } catch {
        setFeeError("Lỗi tính phí dịch vụ này.");
      } finally {
        setIsCalculatingFee(false);
      }
    }
  };

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleMainImageChange = (e) => {
    const file = e.target.files[0];
    if (file) setMainImage(URL.createObjectURL(file));
  };

  const handleSubImageChange = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      setSubImages((prev) => {
        const next = [...prev];
        next[index] = URL.createObjectURL(file);
        return next;
      });
    }
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = () => {
    const productData = {
      name: productName, category, description,
      mainImage, subImages: subImages.filter(Boolean),
      video: videoFile, codEnabled,
      shipping: { method: shippingMethod, weight, weightUnit, height, width, length },
    };
    console.log("Dữ liệu gửi lên Server:", productData);
    alert("Lưu sản phẩm thành công!");
  };

  // ─── Styles dùng chung ───────────────────────────────────────────────────────
  const card   = { background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px", marginBottom: "20px" };
  const label  = { display: "block", fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "6px" };
  const input  = { width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", boxSizing: "border-box", fontSize: "14px", outline: "none" };
  const req    = { color: "red" };

  return (
    <div style={{ padding: "4px", backgroundColor: "#f9fafb", minHeight: "100vh" }}>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: "600", color: "#111827", margin: 0 }}>Thêm sản phẩm mới</h1>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: "4px 0 0" }}>Vui lòng thiết lập đầy đủ các thuộc tính của sản phẩm</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onBack} style={{ padding: "9px 18px", borderRadius: "8px", border: "1px solid #d1d5db", background: "white", cursor: "pointer", fontSize: "14px" }}>Hủy</button>
          <button onClick={handleSave} style={{ padding: "9px 22px", borderRadius: "8px", border: "none", background: "#2563eb", color: "white", fontWeight: "600", cursor: "pointer", fontSize: "14px" }}>Lưu</button>
        </div>
      </div>

      {/* KHỐI 1: THÔNG TIN CƠ BẢN */}
      <div style={card}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 16px", color: "#111827" }}>Thông tin cơ bản</h3>

        {/* Hình ảnh */}
        <div style={{ marginBottom: "20px" }}>
          <label style={label}><span style={req}>*</span> Hình ảnh <span style={{ fontSize: "12px", color: "#9ca3af", fontWeight: "normal" }}>(Nên thêm ít nhất 5 ảnh)</span></label>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "10px" }}>
            {/* Ảnh chính */}
            <input type="file" accept="image/*" ref={mainImageRef} onChange={handleMainImageChange} style={{ display: "none" }} />
            <div onClick={() => mainImageRef.current.click()}
              style={{ width: "150px", height: "150px", border: "1px dashed #d1d5db", borderRadius: "8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden" }}>
              {mainImage
                ? <img src={mainImage} alt="Main" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ textAlign: "center", color: "#6b7280", fontSize: "12px", padding: "10px" }}><span style={{ fontSize: "20px" }}>📤</span><br />Ảnh chính</div>}
            </div>
            {/* 8 ảnh phụ - refs tạo ngoài vòng lặp */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
              {subImages.map((img, idx) => (
                <div key={idx}>
                  <input type="file" accept="image/*" ref={subImageRefs.current[idx]} onChange={(e) => handleSubImageChange(idx, e)} style={{ display: "none" }} />
                  <div onClick={() => subImageRefs.current[idx].current.click()}
                    style={{ width: "70px", height: "70px", border: "1px solid #e5e7eb", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backgroundColor: "#f9fafb" }}>
                    {img
                      ? <img src={img} alt={`Sub ${idx}`} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "6px" }} />
                      : <span style={{ color: "#d1d5db", fontSize: "16px" }}>📦</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tên sản phẩm */}
        <div style={{ marginBottom: "16px" }}>
          <label style={label}><span style={req}>*</span> Tên sản phẩm</label>
          <div style={{ position: "relative" }}>
            <input type="text" maxLength={255} value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Nhập tên sản phẩm" style={input} />
            <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "#9ca3af" }}>{productName.length}/255</span>
          </div>
        </div>

        {/* Hạng mục */}
        <div>
          <label style={label}><span style={req}>*</span> Hạng mục</label>
          <select disabled value={category} onChange={(e) => setCategory(e.target.value)}
            style={{ ...input, color: "#9ca3af", backgroundColor: "#f3f4f6", cursor: "not-allowed" }}>
            <option value="">Vui lòng chọn hạng mục sản phẩm</option>
          </select>
        </div>
      </div>

      {/* KHỐI 2: CHI TIẾT SẢN PHẨM */}
      <div style={card}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 16px", color: "#111827" }}>Chi tiết sản phẩm</h3>
        <div style={{ marginBottom: "20px" }}>
          <label style={label}><span style={req}>*</span> Mô tả</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Nhập thông tin chi tiết sản phẩm..."
            style={{ ...input, minHeight: "180px", fontFamily: "inherit", resize: "vertical" }} />
        </div>
        <div>
          <label style={label}>Video</label>
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 10px" }}>Tỷ lệ 9:16 đến 16:9. Tối đa 100MB. Định dạng: MP4, MOV, MKV, AVI</p>
          <input type="file" accept="video/*" ref={videoRef} onChange={handleVideoChange} style={{ display: "none" }} />
          <div onClick={() => videoRef.current.click()}
            style={{ width: "100px", height: "100px", border: "1px dashed #d1d5db", borderRadius: "8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", backgroundColor: "#f9fafb" }}>
            {videoPreview
              ? <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#000", borderRadius: "8px" }}><span style={{ color: "white", fontSize: "12px" }}>📹 Đã chọn</span></div>
              : <><span style={{ fontSize: "20px", color: "#9ca3af" }}>📤</span><span style={{ fontSize: "13px", color: "#4b5563", marginTop: "4px" }}>Video</span></>}
          </div>
        </div>
      </div>

      {/* KHỐI 3: THÔNG TIN BÁN HÀNG */}
      <div style={card}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 16px", color: "#111827" }}>Thông tin bán hàng</h3>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.2fr", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", padding: "10px 16px" }}>
            {["* Hàng có sẵn", "* Giá bán lẻ", "Giảm giá", "SKU người bán"].map((h) => (
              <span key={h} style={{ fontSize: "13px", fontWeight: "600", color: "#4b5563" }}>{h}</span>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.2fr", padding: "12px 16px", gap: "12px" }}>
            <input type="number" style={input} />
            <div style={{ position: "relative" }}>
              <input type="number" style={input} />
              <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>đ</span>
            </div>
            <div style={{ position: "relative" }}>
              <input type="number" style={input} />
              <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>%</span>
            </div>
            <input type="text" style={input} />
          </div>
        </div>
      </div>

      {/* KHỐI 4: VẬN CHUYỂN + API J&T */}
      <div style={card}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 16px", color: "#111827" }}>Vận chuyển</h3>

        {/* Trọng lượng */}
        <div style={{ marginBottom: "16px" }}>
          <label style={label}><span style={req}>*</span> Trọng lượng kiện hàng</label>
          <div style={{ display: "flex", border: "1px solid #d1d5db", borderRadius: "8px", overflow: "hidden" }}>
            <select value={weightUnit} onChange={(e) => setWeightUnit(e.target.value)}
              style={{ padding: "10px 12px", border: "none", borderRight: "1px solid #d1d5db", background: "#f9fafb", outline: "none", fontSize: "14px" }}>
              <option value="g">Gam (g)</option>
              <option value="kg">Kilogam (kg)</option>
            </select>
            <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
              onBlur={calculateFees}
              placeholder="Nhập trọng lượng kiện hàng"
              style={{ flex: 1, padding: "10px 12px", border: "none", outline: "none", fontSize: "14px" }} />
          </div>
        </div>

        {/* Kích thước */}
        <div style={{ marginBottom: "20px" }}>
          <label style={label}>Kích thước kiện hàng</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            {[["Chiều cao", height, setHeight], ["Chiều rộng", width, setWidth], ["Chiều dài", length, setLength]].map(([ph, val, set]) => (
              <div key={ph} style={{ display: "flex", border: "1px solid #d1d5db", borderRadius: "8px", alignItems: "center" }}>
                <input type="number" placeholder={ph} value={val} onChange={(e) => set(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", border: "none", outline: "none", fontSize: "14px" }} />
                <span style={{ paddingRight: "12px", color: "#9ca3af", fontSize: "13px", whiteSpace: "nowrap" }}>cm</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cách giao hàng */}
        <div style={{ marginBottom: "16px" }}>
          <label style={label}><span style={req}>*</span> Cách giao hàng</label>
          <div style={{ display: "flex", gap: "24px", marginBottom: "12px" }}>
            {[["default", "Mặc định (J&T Chuẩn)"], ["custom", "Tùy chỉnh dịch vụ J&T"]].map(([val, lbl]) => (
              <label key={val} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
                <input type="radio" name="shipping-method" checked={shippingMethod === val}
                  onChange={() => { setShippingMethod(val); setTimeout(calculateFees, 0); }}
                  style={{ width: "18px", height: "18px" }} />
                {lbl}
              </label>
            ))}
          </div>

          {/* Lỗi API */}
          {feeError && (
            <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", fontSize: "13px", color: "#dc2626", marginBottom: "12px" }}>
              ⚠️ {feeError}
            </div>
          )}

          {/* Phí mặc định */}
          {shippingMethod === "default" && (
            <div style={{ padding: "12px 16px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px" }}>
              <span style={{ fontSize: "13px", color: "#6b7280" }}>Phí vận chuyển J&T Chuẩn (EZ): </span>
              <strong style={{ fontSize: "15px", color: "#1e40af" }}>
                {isCalculatingFee ? "⌛ Đang tính..." : jtFeeDefault ? `${jtFeeDefault.toLocaleString("vi-VN")} đ` : "— Nhập trọng lượng để tính —"}
              </strong>
            </div>
          )}

          {/* Dịch vụ tùy chỉnh */}
          {shippingMethod === "custom" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {jtServices.map((service, index) => (
                <div key={service.code}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px",
                    border: service.active ? "1px solid #2563eb" : "1px solid #e5e7eb",
                    borderRadius: "8px", backgroundColor: service.active ? "#eff6ff" : "white" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}>
                    <input type="checkbox" checked={service.active} onChange={() => handleToggleJtService(index)}
                      style={{ width: "16px", height: "16px", accentColor: "#2563eb" }} />
                    {service.name}
                  </label>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: service.active ? "#1e40af" : "#9ca3af" }}>
                    {isCalculatingFee && service.active ? "⌛ Đang tính..."
                      : service.fee ? `${service.fee.toLocaleString("vi-VN")} đ`
                      : service.active ? "— Nhập trọng lượng —" : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "16px 0" }} />

        {/* COD */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>Thanh toán khi nhận hàng (COD)</span>
          <label style={{ position: "relative", display: "inline-block", width: "44px", height: "24px" }}>
            <input type="checkbox" checked={codEnabled} onChange={() => setCodEnabled(!codEnabled)} style={{ opacity: 0, width: 0, height: 0 }} />
            <span style={{ position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: codEnabled ? "#10b981" : "#ccc", transition: ".4s", borderRadius: "24px" }}>
              <span style={{ position: "absolute", height: "18px", width: "18px", left: "3px", bottom: "3px",
                backgroundColor: "white", transition: ".4s", borderRadius: "50%",
                transform: codEnabled ? "translateX(20px)" : "translateX(0)" }}></span>
            </span>
          </label>
        </div>
      </div>

    </div>
  );
}