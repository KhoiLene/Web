// // import React, { useState, useRef, useCallback } from "react";
// // import { uploadImage } from "../../supabase";
// // import { productGroupsApi } from "../../api";

// // // ─── J&T API CONFIG ────────────────────────────────────────────────────────────
// // // TODO: Thay bằng thông tin thật từ J&T Express partner portal
// // const JT_CONFIG = {
// //   BASE_URL: "https://api.jtexpress.vn/api",  // Endpoint J&T VN
// //   CUSTOMER_ID: "YOUR_CUSTOMER_ID",// ← từ J&T partner portal
// //   SANDBOX_KEY: "YOUR_SANDBOX_KEY",// ← từ J&T partner portal
// //   SENDER_CITY: "HCM",   // Thành phố gửi hàng
// //   RECEIVER_CITY: "HAN", // Mặc định - thay đổi theo khách
// // };

// // // Gọi API J&T tính phí
// // async function fetchJTFee({ weight, weightUnit, height, width, length, serviceCode }) {
// //   const weightInGrams = weightUnit === "kg" ? parseFloat(weight) * 1000 : parseFloat(weight);

// //   // Trong thực tế gọi endpoint J&T, ví dụ:
// //   // POST https://api.jtexpress.vn/api/price/calculate
// //   // Hiện tại dùng mock để test UI - thay bằng fetch thật khi có key
// //   const res = await fetch(`${JT_CONFIG.BASE_URL}/price/calculate`, {
// //     method: "POST",
// //     headers: {
// //       "Content-Type": "application/json",
// //       "X-Customer-Id": JT_CONFIG.CUSTOMER_ID,
// //       "X-Api-Key": JT_CONFIG.SANDBOX_KEY,
// //     },
// //     body: JSON.stringify({
// //       serviceType: serviceCode || "EZ",
// //       weight: weightInGrams,
// //       length: parseFloat(length) || 0,
// //       width: parseFloat(width) || 0,
// //       height: parseFloat(height) || 0,
// //       senderCity: JT_CONFIG.SENDER_CITY,
// //       receiverCity: JT_CONFIG.RECEIVER_CITY,
// //     }),
// //   });

// //   if (!res.ok) throw new Error(`J&T API lỗi: ${res.status}`);
// //   const data = await res.json();
// //   return data.fee || data.totalFee || data.amount; // tuỳ response thật của J&T
// // }

// // // ─── Mock (dùng khi chưa có API key thật) ─────────────────────────────────────
// // async function fetchJTFeeMock({ weight, weightUnit, serviceCode }) {
// //   await new Promise((r) => setTimeout(r, 800)); // giả lập delay
// //   const g = weightUnit === "kg" ? parseFloat(weight) * 1000 : parseFloat(weight);
// //   const base = { EZ: 22000, FAST: 35000, SUPER: 55000 };
// //   const fee = (base[serviceCode] || 22000) + Math.floor(g / 500) * 3000;
// //   return fee;
// // }

// // // ─── SubImage refs helper (tránh dùng useRef trong vòng lặp) ──────────────────
// // const SUB_COUNT = 8;

// // export default function CreateProduct({ onBack, onSaved, initialData = null }) {
// //   const isEditing = !!initialData;

// //   // ─── Thông tin cơ bản ───────────────────────────────────────────────────────
// //   const [productName, setProductName] = useState(initialData?.name        || "");
// //   const [category,    setCategory]    = useState(initialData?.group_id    || "");
// //   const [groups,      setGroups]      = useState([]);
// //   const [description, setDescription] = useState(initialData?.description || "");

// //   // ─── Hình ảnh ───────────────────────────────────────────────────────────────
// //   const [mainImage,  setMainImage]  = useState(initialData?.images?.[0]  || null);
// //   const [subImages,  setSubImages]  = useState(() => {
// //     const existing = (initialData?.images || []).slice(1);
// //     return [...existing, ...Array(Math.max(0, SUB_COUNT - existing.length)).fill(null)];
// //   });
// //   const mainImageRef  = useRef(null);
// //   const subImageRefs  = useRef(Array.from({ length: SUB_COUNT }, () => React.createRef()));

// //   // ─── Video ──────────────────────────────────────────────────────────────────
// //   const [videoFile,    setVideoFile]    = useState(null);
// //   const [uploadingMain, setUploadingMain] = useState(false);
// //   const [uploadingSubs, setUploadingSubs] = useState(Array(SUB_COUNT).fill(false));

// //   // ─── Fetch nhóm sản phẩm ────────────────────────────────────────────────────
// //   React.useEffect(() => {
// //     productGroupsApi.getAll()
// //       .then((res) => setGroups(res.data || []))
// //       .catch(() => {});
// //   }, []);
// //   const [videoPreview, setVideoPreview] = useState(initialData?.video_url || null);
// //   const videoRef = useRef(null);

// //   // ─── Bán hàng ───────────────────────────────────────────────────────────────
// //   const [codEnabled, setCodEnabled] = useState(initialData?.cod_enabled ?? true);

// //   // ─── Vận chuyển ─────────────────────────────────────────────────────────────
// //   const [shippingMethod, setShippingMethod] = useState(initialData?.shipping_type || "default");
// //   const [weightUnit,     setWeightUnit]     = useState(initialData?.weight_unit   || "g");
// //   const [weight,         setWeight]         = useState(initialData?.weight?.toString() || "");
// //   const [height,         setHeight]         = useState(initialData?.height?.toString() || "");
// //   const [width,          setWidth]          = useState(initialData?.width?.toString()  || "");
// //   const [length,         setLength]         = useState(initialData?.length?.toString() || "");

// //   // ─── Thông tin bán hàng ─────────────────────────────────────────────────────
// //   const [stock,    setStock]    = useState(initialData?.stock?.toString()    || "");
// //   const [price,    setPrice]    = useState(initialData?.price?.toString()    || "");
// //   const [discount, setDiscount] = useState(initialData?.discount?.toString() || "");
// //   const [sku,      setSku]      = useState(initialData?.sku                  || "");

// //   const [jtFeeDefault, setJtFeeDefault]     = useState(null);
// //   const [isCalculatingFee, setIsCalculatingFee] = useState(false);
// //   const [feeError, setFeeError]             = useState("");

// //   const [jtServices, setJtServices] = useState([
// //     { code: "EZ",    name: "J&T Chuyển phát tiêu chuẩn", active: false, fee: null },
// //     { code: "FAST",  name: "J&T Fast (Giao hàng nhanh)", active: false, fee: null },
// //     { code: "SUPER", name: "J&T Super (Dịch vụ hỏa tốc)", active: false, fee: null },
// //   ]);

// //   // ─── Gọi API J&T khi trọng lượng thay đổi ───────────────────────────────────
// //   const calculateFees = useCallback(async () => {
// //     if (!weight || parseFloat(weight) <= 0) {
// //       setJtFeeDefault(null);
// //       setJtServices((prev) => prev.map((s) => ({ ...s, fee: null })));
// //       return;
// //     }

// //     setIsCalculatingFee(true);
// //     setFeeError("");

// //     try {
// //       const params = { weight, weightUnit, height, width, length };

// //       if (shippingMethod === "default") {
// //         // Gọi API cho dịch vụ EZ (mặc định)
// //         // Đổi fetchJTFeeMock → fetchJTFee khi có API key thật
// //         const fee = await fetchJTFeeMock({ ...params, serviceCode: "EZ" });
// //         setJtFeeDefault(fee);
// //       } else {
// //         // Gọi API cho tất cả dịch vụ đang được chọn
// //         const updated = await Promise.all(
// //           jtServices.map(async (s) => {
// //             if (!s.active) return s;
// //             const fee = await fetchJTFeeMock({ ...params, serviceCode: s.code });
// //             return { ...s, fee };
// //           })
// //         );
// //         setJtServices(updated);
// //       }
// //     } catch (err) {
// //       setFeeError("Không thể kết nối J&T API. Kiểm tra API key hoặc thử lại.");
// //       console.error("J&T API Error:", err);
// //     } finally {
// //       setIsCalculatingFee(false);
// //     }
// //   }, [weight, weightUnit, height, width, length, shippingMethod, jtServices]);

// //   // Bật/tắt dịch vụ J&T và tính phí ngay
// //   const handleToggleJtService = async (index) => {
// //     const updated = jtServices.map((s, i) =>
// //       i === index ? { ...s, active: !s.active, fee: null } : s
// //     );
// //     setJtServices(updated);

// //     const toggled = updated[index];
// //     if (toggled.active && weight) {
// //       setIsCalculatingFee(true);
// //       try {
// //         const fee = await fetchJTFeeMock({ weight, weightUnit, height, width, length, serviceCode: toggled.code });
// //         setJtServices((prev) => prev.map((s, i) => i === index ? { ...s, fee } : s));
// //       } catch {
// //         setFeeError("Lỗi tính phí dịch vụ này.");
// //       } finally {
// //         setIsCalculatingFee(false);
// //       }
// //     }
// //   };

// //   // ─── Handlers ────────────────────────────────────────────────────────────────
// //   const handleMainImageChange = async (e) => {
// //     const file = e.target.files[0];
// //     if (!file) return;
// //     // Hiện preview ngay bằng blob
// //     setMainImage(URL.createObjectURL(file));
// //     setUploadingMain(true);
// //     try {
// //       const url = await uploadImage(file, "products/main");
// //       setMainImage(url); // ghi đè blob bằng URL thật từ Supabase
// //     } catch (err) {
// //       alert("Lỗi upload ảnh chính: " + err.message);
// //       setMainImage(null);
// //     } finally {
// //       setUploadingMain(false);
// //     }
// //   };

// //   const handleSubImageChange = async (index, e) => {
// //     const file = e.target.files[0];
// //     if (!file) return;
// //     // Hiện preview blob ngay
// //     setSubImages((prev) => { const n = [...prev]; n[index] = URL.createObjectURL(file); return n; });
// //     setUploadingSubs((prev) => { const n = [...prev]; n[index] = true; return n; });
// //     try {
// //       const url = await uploadImage(file, "products/sub");
// //       setSubImages((prev) => { const n = [...prev]; n[index] = url; return n; });
// //     } catch (err) {
// //       alert("Lỗi upload ảnh phụ: " + err.message);
// //       setSubImages((prev) => { const n = [...prev]; n[index] = null; return n; });
// //     } finally {
// //       setUploadingSubs((prev) => { const n = [...prev]; n[index] = false; return n; });
// //     }
// //   };

// //   const handleVideoChange = (e) => {
// //     const file = e.target.files[0];
// //     if (file) {
// //       setVideoFile(file);
// //       setVideoPreview(URL.createObjectURL(file));
// //     }
// //   };

// //   const handleSave = async () => {
// //     if (!productName.trim()) return alert("Vui lòng nhập tên sản phẩm");
// //     const body = {
// //       name:          productName,
// //       stock:         parseInt(stock)    || 0,
// //       price:         parseFloat(price)  || 0,
// //       discount:      parseFloat(discount) || 0,
// //       sku:           sku || null,
// //       slug:          productName.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase().trim().replace(/[^a-z0-9\s-]/g,"").replace(/\s+/g,"-"),
// //       description,
// //       group_id:      category || null,
// //       cod_enabled:   codEnabled,
// //       shipping_type: shippingMethod,
// //       weight:        parseFloat(weight)  || 0,
// //       weight_unit:   weightUnit,
// //       height:        parseFloat(height)  || 0,
// //       width:         parseFloat(width)   || 0,
// //       length:        parseFloat(length)  || 0,
// //       images:        [mainImage, ...subImages].filter(Boolean),
// //       video_url:     videoPreview,
// //     };
// //     try {
// //       if (isEditing) {
// //         await import("../../api").then(m => m.productsApi.update(initialData.id, body));
// //       } else {
// //         await import("../../api").then(m => m.productsApi.create(body));
// //       }
// //       onSaved?.();
// //     } catch (err) {
// //       alert("Lỗi lưu: " + err.message);
// //     }
// //   };

// //   // ─── Styles dùng chung ───────────────────────────────────────────────────────
// //   const card   = { background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px", marginBottom: "20px" };
// //   const label  = { display: "block", fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "6px" };
// //   const input  = { width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", boxSizing: "border-box", fontSize: "14px", outline: "none" };
// //   const req    = { color: "red" };

// //   return (
// //     <div style={{ padding: "4px", backgroundColor: "#f9fafb", minHeight: "100vh" }}>

// //       {/* HEADER */}
// //       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
// //         <div>
// //           <h1 style={{ fontSize: "22px", fontWeight: "600", color: "#111827", margin: 0 }}>{isEditing ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}</h1>
// //           <p style={{ fontSize: "13px", color: "#6b7280", margin: "4px 0 0" }}>Vui lòng thiết lập đầy đủ các thuộc tính của sản phẩm</p>
// //         </div>
// //         <div style={{ display: "flex", gap: "10px" }}>
// //           <button onClick={onBack} style={{ padding: "9px 18px", borderRadius: "8px", border: "1px solid #d1d5db", background: "white", cursor: "pointer", fontSize: "14px" }}>Hủy</button>
// //           <button
// //             onClick={handleSave}
// //             disabled={uploadingMain || uploadingSubs.some(Boolean)}
// //             style={{ padding: "9px 22px", borderRadius: "8px", border: "none", background: (uploadingMain || uploadingSubs.some(Boolean)) ? "#93c5fd" : "#2563eb", color: "white", fontWeight: "600", cursor: (uploadingMain || uploadingSubs.some(Boolean)) ? "not-allowed" : "pointer", fontSize: "14px" }}
// //           >
// //             {(uploadingMain || uploadingSubs.some(Boolean)) ? "⌛ Đang upload..." : "Lưu"}
// //           </button>
// //         </div>
// //       </div>

// //       {/* KHỐI 1: THÔNG TIN CƠ BẢN */}
// //       <div style={card}>
// //         <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 16px", color: "#111827" }}>Thông tin cơ bản</h3>

// //         {/* Hình ảnh */}
// //         <div style={{ marginBottom: "20px" }}>
// //           <label style={label}><span style={req}>*</span> Hình ảnh <span style={{ fontSize: "12px", color: "#9ca3af", fontWeight: "normal" }}>(Nên thêm ít nhất 5 ảnh)</span></label>
// //           <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "10px" }}>
// //             {/* Ảnh chính */}
// //             <input type="file" accept="image/*" ref={mainImageRef} onChange={handleMainImageChange} style={{ display: "none" }} />
// //             <div onClick={() => !uploadingMain && mainImageRef.current.click()}
// //               style={{ width: "150px", height: "150px", border: "1px dashed #d1d5db", borderRadius: "8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: uploadingMain ? "wait" : "pointer", overflow: "hidden", position: "relative" }}>
// //               {mainImage
// //                 ? <img src={mainImage} alt="Main" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: uploadingMain ? 0.5 : 1 }} />
// //                 : <div style={{ textAlign: "center", color: "#6b7280", fontSize: "12px", padding: "10px" }}><span style={{ fontSize: "20px" }}>📤</span><br />Ảnh chính</div>}
// //               {uploadingMain && (
// //                 <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px" }}>
// //                   <span style={{ color: "white", fontSize: "12px", fontWeight: "600" }}>⌛ Đang tải...</span>
// //                 </div>
// //               )}
// //             </div>
// //             {/* 8 ảnh phụ - refs tạo ngoài vòng lặp */}
// //             <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
// //               {subImages.map((img, idx) => (
// //                 <div key={idx}>
// //                   <input type="file" accept="image/*" ref={subImageRefs.current[idx]} onChange={(e) => handleSubImageChange(idx, e)} style={{ display: "none" }} />
// //                   <div onClick={() => !uploadingSubs[idx] && subImageRefs.current[idx].current.click()}
// //                     style={{ width: "70px", height: "70px", border: "1px solid #e5e7eb", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", cursor: uploadingSubs[idx] ? "wait" : "pointer", backgroundColor: "#f9fafb", position: "relative", overflow: "hidden" }}>
// //                     {img
// //                       ? <img src={img} alt={`Sub ${idx}`} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "6px", opacity: uploadingSubs[idx] ? 0.5 : 1 }} />
// //                       : <span style={{ color: "#d1d5db", fontSize: "16px" }}>📦</span>}
// //                     {uploadingSubs[idx] && (
// //                       <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px" }}>
// //                         <span style={{ color: "white", fontSize: "10px" }}>⌛</span>
// //                       </div>
// //                     )}
// //                   </div>
// //                 </div>
// //               ))}
// //             </div>
// //           </div>
// //         </div>

// //         {/* Tên sản phẩm */}
// //         <div style={{ marginBottom: "16px" }}>
// //           <label style={label}><span style={req}>*</span> Tên sản phẩm</label>
// //           <div style={{ position: "relative" }}>
// //             <input type="text" maxLength={255} value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Nhập tên sản phẩm" style={input} />
// //             <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "#9ca3af" }}>{productName.length}/255</span>
// //           </div>
// //         </div>

// //         {/* Hạng mục */}
// //         <div>
// //           <label style={label}><span style={req}>*</span> Hạng mục</label>
// //           <select
// //             value={category}
// //             onChange={(e) => setCategory(e.target.value)}
// //             style={{ ...input, color: category ? "#111827" : "#9ca3af", backgroundColor: "white", cursor: "pointer" }}
// //           >
// //             <option value="">-- Chọn hạng mục sản phẩm --</option>
// //             {groups.map((g) => (
// //               <option key={g.id} value={g.id}>{g.name}</option>
// //             ))}
// //           </select>
// //         </div>
// //       </div>

// //       {/* KHỐI 2: CHI TIẾT SẢN PHẨM */}
// //       <div style={card}>
// //         <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 16px", color: "#111827" }}>Chi tiết sản phẩm</h3>
// //         <div style={{ marginBottom: "20px" }}>
// //           <label style={label}><span style={req}>*</span> Mô tả</label>
// //           <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Nhập thông tin chi tiết sản phẩm..."
// //             style={{ ...input, minHeight: "180px", fontFamily: "inherit", resize: "vertical" }} />
// //         </div>
// //         <div>
// //           <label style={label}>Video</label>
// //           <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 10px" }}>Tỷ lệ 9:16 đến 16:9. Tối đa 100MB. Định dạng: MP4, MOV, MKV, AVI</p>
// //           <input type="file" accept="video/*" ref={videoRef} onChange={handleVideoChange} style={{ display: "none" }} />
// //           <div onClick={() => videoRef.current.click()}
// //             style={{ width: "100px", height: "100px", border: "1px dashed #d1d5db", borderRadius: "8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", backgroundColor: "#f9fafb" }}>
// //             {videoPreview
// //               ? <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#000", borderRadius: "8px" }}><span style={{ color: "white", fontSize: "12px" }}>📹 Đã chọn</span></div>
// //               : <><span style={{ fontSize: "20px", color: "#9ca3af" }}>📤</span><span style={{ fontSize: "13px", color: "#4b5563", marginTop: "4px" }}>Video</span></>}
// //           </div>
// //         </div>
// //       </div>

// //       {/* KHỐI 3: THÔNG TIN BÁN HÀNG */}
// //       <div style={card}>
// //         <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 16px", color: "#111827" }}>Thông tin bán hàng</h3>
// //         <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden" }}>
// //           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.2fr", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", padding: "10px 16px" }}>
// //             {["* Hàng có sẵn", "* Giá bán lẻ", "Giảm giá", "SKU người bán"].map((h) => (
// //               <span key={h} style={{ fontSize: "13px", fontWeight: "600", color: "#4b5563" }}>{h}</span>
// //             ))}
// //           </div>
// //           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.2fr", padding: "12px 16px", gap: "12px" }}>
// //             <input
// //               type="number"
// //               placeholder="0"
// //               value={stock}
// //               onChange={(e) => setStock(e.target.value)}
// //               style={input}
// //             />
// //             <div style={{ position: "relative" }}>
// //               <input
// //                 type="number"
// //                 placeholder="0"
// //                 value={price}
// //                 onChange={(e) => setPrice(e.target.value)}
// //                 style={{ ...input, paddingRight: "28px" }}
// //               />
// //               <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>đ</span>
// //             </div>
// //             <div style={{ position: "relative" }}>
// //               <input
// //                 type="number"
// //                 placeholder="0"
// //                 value={discount}
// //                 onChange={(e) => setDiscount(e.target.value)}
// //                 style={{ ...input, paddingRight: "28px" }}
// //               />
// //               <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>%</span>
// //             </div>
// //             <input
// //               type="text"
// //               placeholder="VD: SP-001"
// //               value={sku}
// //               onChange={(e) => setSku(e.target.value)}
// //               style={input}
// //             />
// //           </div>
// //         </div>
// //       </div>

// //       {/* KHỐI 4: VẬN CHUYỂN + API J&T */}
// //       <div style={card}>
// //         <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 16px", color: "#111827" }}>Vận chuyển</h3>

// //         {/* Trọng lượng */}
// //         <div style={{ marginBottom: "16px" }}>
// //           <label style={label}><span style={req}>*</span> Trọng lượng kiện hàng</label>
// //           <div style={{ display: "flex", border: "1px solid #d1d5db", borderRadius: "8px", overflow: "hidden" }}>
// //             <select value={weightUnit} onChange={(e) => setWeightUnit(e.target.value)}
// //               style={{ padding: "10px 12px", border: "none", borderRight: "1px solid #d1d5db", background: "#f9fafb", outline: "none", fontSize: "14px" }}>
// //               <option value="g">Gam (g)</option>
// //               <option value="kg">Kilogam (kg)</option>
// //             </select>
// //             <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
// //               onBlur={calculateFees}
// //               placeholder="Nhập trọng lượng kiện hàng"
// //               style={{ flex: 1, padding: "10px 12px", border: "none", outline: "none", fontSize: "14px" }} />
// //           </div>
// //         </div>

// //         {/* Kích thước */}
// //         <div style={{ marginBottom: "20px" }}>
// //           <label style={label}>Kích thước kiện hàng</label>
// //           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
// //             {[["Chiều cao", height, setHeight], ["Chiều rộng", width, setWidth], ["Chiều dài", length, setLength]].map(([ph, val, set]) => (
// //               <div key={ph} style={{ display: "flex", border: "1px solid #d1d5db", borderRadius: "8px", alignItems: "center" }}>
// //                 <input type="number" placeholder={ph} value={val} onChange={(e) => set(e.target.value)}
// //                   style={{ width: "100%", padding: "10px 12px", border: "none", outline: "none", fontSize: "14px" }} />
// //                 <span style={{ paddingRight: "12px", color: "#9ca3af", fontSize: "13px", whiteSpace: "nowrap" }}>cm</span>
// //               </div>
// //             ))}
// //           </div>
// //         </div>

// //         {/* Cách giao hàng */}
// //         <div style={{ marginBottom: "16px" }}>
// //           <label style={label}><span style={req}>*</span> Cách giao hàng</label>
// //           <div style={{ display: "flex", gap: "24px", marginBottom: "12px" }}>
// //             {[["default", "Mặc định (J&T Chuẩn)"], ["custom", "Tùy chỉnh dịch vụ J&T"]].map(([val, lbl]) => (
// //               <label key={val} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
// //                 <input type="radio" name="shipping-method" checked={shippingMethod === val}
// //                   onChange={() => { setShippingMethod(val); setTimeout(calculateFees, 0); }}
// //                   style={{ width: "18px", height: "18px" }} />
// //                 {lbl}
// //               </label>
// //             ))}
// //           </div>

// //           {/* Lỗi API */}
// //           {feeError && (
// //             <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", fontSize: "13px", color: "#dc2626", marginBottom: "12px" }}>
// //               ⚠️ {feeError}
// //             </div>
// //           )}

// //           {/* Phí mặc định */}
// //           {shippingMethod === "default" && (
// //             <div style={{ padding: "12px 16px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px" }}>
// //               <span style={{ fontSize: "13px", color: "#6b7280" }}>Phí vận chuyển J&T Chuẩn (EZ): </span>
// //               <strong style={{ fontSize: "15px", color: "#1e40af" }}>
// //                 {isCalculatingFee ? "⌛ Đang tính..." : jtFeeDefault ? `${jtFeeDefault.toLocaleString("vi-VN")} đ` : "— Nhập trọng lượng để tính —"}
// //               </strong>
// //             </div>
// //           )}

// //           {/* Dịch vụ tùy chỉnh */}
// //           {shippingMethod === "custom" && (
// //             <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
// //               {jtServices.map((service, index) => (
// //                 <div key={service.code}
// //                   style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px",
// //                     border: service.active ? "1px solid #2563eb" : "1px solid #e5e7eb",
// //                     borderRadius: "8px", backgroundColor: service.active ? "#eff6ff" : "white" }}>
// //                   <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}>
// //                     <input type="checkbox" checked={service.active} onChange={() => handleToggleJtService(index)}
// //                       style={{ width: "16px", height: "16px", accentColor: "#2563eb" }} />
// //                     {service.name}
// //                   </label>
// //                   <span style={{ fontSize: "13px", fontWeight: "600", color: service.active ? "#1e40af" : "#9ca3af" }}>
// //                     {isCalculatingFee && service.active ? "⌛ Đang tính..."
// //                       : service.fee ? `${service.fee.toLocaleString("vi-VN")} đ`
// //                       : service.active ? "— Nhập trọng lượng —" : "—"}
// //                   </span>
// //                 </div>
// //               ))}
// //             </div>
// //           )}
// //         </div>

// //         <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "16px 0" }} />

// //         {/* COD */}
// //         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
// //           <span style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>Thanh toán khi nhận hàng (COD)</span>
// //           <label style={{ position: "relative", display: "inline-block", width: "44px", height: "24px" }}>
// //             <input type="checkbox" checked={codEnabled} onChange={() => setCodEnabled(!codEnabled)} style={{ opacity: 0, width: 0, height: 0 }} />
// //             <span style={{ position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0,
// //               backgroundColor: codEnabled ? "#10b981" : "#ccc", transition: ".4s", borderRadius: "24px" }}>
// //               <span style={{ position: "absolute", height: "18px", width: "18px", left: "3px", bottom: "3px",
// //                 backgroundColor: "white", transition: ".4s", borderRadius: "50%",
// //                 transform: codEnabled ? "translateX(20px)" : "translateX(0)" }}></span>
// //             </span>
// //           </label>
// //         </div>
// //       </div>

// //     </div>
// //   );
// // }

// import React, { useState, useRef, useCallback } from "react";
// import { uploadImage } from "../../supabase";
// import { productGroupsApi } from "../../api";

// // ─── HÀM BỔ TRỢ ĐỊNH DẠNG SỐ CÓ DẤU CHẤM ───────────────────────────────────────
// const formatNumberWithDots = (value) => {
//   if (value === null || value === undefined || value === "") return "";
//   // Xóa ký tự không phải số
//   const cleanValue = value.toString().replace(/\D/g, "");
//   // Thêm dấu chấm phân cách hàng nghìn
//   return cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
// };

// const parseDotsToNumber = (value) => {
//   if (!value) return 0;
//   // Xóa toàn bộ dấu chấm để chuyển về kiểu số thuần túy
//   return Number(value.toString().replace(/\./g, ""));
// };

// // ─── J&T API CONFIG ────────────────────────────────────────────────────────────
// // TODO: Thay bằng thông tin thật từ J&T Express partner portal
// const JT_CONFIG = {
//   BASE_URL: "https://api.jtexpress.vn/api",  // Endpoint J&T VN
//   CUSTOMER_ID: "YOUR_CUSTOMER_ID",// ← từ J&T partner portal
//   SANDBOX_KEY: "YOUR_SANDBOX_KEY",// ← từ J&T partner portal
//   SENDER_CITY: "HCM",   // Thành phố gửi hàng
//   RECEIVER_CITY: "HAN", // Mặc định - thay đổi theo khách
// };

// // Gọi API J&T tính phí
// async function fetchJTFee({ weight, weightUnit, height, width, length, serviceCode }) {
//   const weightInGrams = weightUnit === "kg" ? parseFloat(weight) * 1000 : parseFloat(weight);

//   // Trong thực tế gọi endpoint J&T, ví dụ:
//   // POST https://api.jtexpress.vn/api/price/calculate
//   // Hiện tại dùng mock để test UI - thay bằng fetch thật khi có key
//   const res = await fetch(`${JT_CONFIG.BASE_URL}/price/calculate`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       "X-Customer-Id": JT_CONFIG.CUSTOMER_ID,
//       "X-Api-Key": JT_CONFIG.SANDBOX_KEY,
//     },
//     body: JSON.stringify({
//       serviceType: serviceCode || "EZ",
//       weight: weightInGrams,
//       length: parseFloat(length) || 0,
//       width: parseFloat(width) || 0,
//       height: parseFloat(height) || 0,
//       senderCity: JT_CONFIG.SENDER_CITY,
//       receiverCity: JT_CONFIG.RECEIVER_CITY,
//     }),
//   });

//   if (!res.ok) throw new Error(`J&T API lỗi: ${res.status}`);
//   const data = await res.json();
//   return data.fee || data.totalFee || data.amount; // tuỳ response thật của J&T
// }

// // ─── Mock (dùng khi chưa có API key thật) ─────────────────────────────────────
// async function fetchJTFeeMock({ weight, weightUnit, serviceCode }) {
//   await new Promise((r) => setTimeout(r, 800)); // giả lập delay
//   const g = weightUnit === "kg" ? parseFloat(weight) * 1000 : parseFloat(weight);
//   const base = { EZ: 22000, FAST: 35000, SUPER: 55000 };
//   const fee = (base[serviceCode] || 22000) + Math.floor(g / 500) * 3000;
//   return fee;
// }

// // ─── SubImage refs helper (tránh dùng useRef trong vòng lặp) ──────────────────
// const SUB_COUNT = 8;

// export default function CreateProduct({ onBack, onSaved, initialData = null }) {
//   const isEditing = !!initialData;

//   // ─── Thông tin cơ bản ───────────────────────────────────────────────────────
//   const [productName, setProductName] = useState(initialData?.name        || "");
//   const [category,    setCategory]    = useState(initialData?.group_id    || "");
//   const [groups,      setGroups]      = useState([]);
//   const [description, setDescription] = useState(initialData?.description || "");

//   // ─── Hình ảnh ───────────────────────────────────────────────────────────────
//   const [mainImage,  setMainImage]  = useState(initialData?.images?.[0]  || null);
//   const [subImages,  setSubImages]  = useState(() => {
//     const existing = (initialData?.images || []).slice(1);
//     return [...existing, ...Array(Math.max(0, SUB_COUNT - existing.length)).fill(null)];
//   });
//   const mainImageRef  = useRef(null);
//   const subImageRefs  = useRef(Array.from({ length: SUB_COUNT }, () => React.createRef()));

//   // ─── Video ──────────────────────────────────────────────────────────────────
//   const [videoFile,    setVideoFile]    = useState(null);
//   const [uploadingMain, setUploadingMain] = useState(false);
//   const [uploadingSubs, setUploadingSubs] = useState(Array(SUB_COUNT).fill(false));

//   // ─── Fetch nhóm sản phẩm ────────────────────────────────────────────────────
//   React.useEffect(() => {
//     productGroupsApi.getAll()
//       .then((res) => setGroups(res.data || []))
//       .catch(() => {});
//   }, []);
//   const [videoPreview, setVideoPreview] = useState(initialData?.video_url || null);
//   const videoRef = useRef(null);

//   // ─── Bán hàng ───────────────────────────────────────────────────────────────
//   const [codEnabled, setCodEnabled] = useState(initialData?.cod_enabled ?? true);

//   // ─── Vận chuyển ─────────────────────────────────────────────────────────────
//   const [shippingMethod, setShippingMethod] = useState(initialData?.shipping_type || "default");
//   const [weightUnit,     setWeightUnit]     = useState(initialData?.weight_unit   || "g");
//   const [weight,         setWeight]         = useState(initialData?.weight?.toString() || "");
//   const [height,         setHeight]         = useState(initialData?.height?.toString() || "");
//   const [width,          setWidth]          = useState(initialData?.width?.toString()  || "");
//   const [length,         setLength]         = useState(initialData?.length?.toString() || "");

//   // ─── Thông tin bán hàng ─────────────────────────────────────────────────────
//   const [stock,    setStock]    = useState(initialData?.stock?.toString()    || "");
//   const [price,    setPrice]    = useState(initialData?.price?.toString()    || "");
//   const [discount, setDiscount] = useState(initialData?.discount?.toString() || "");
//   const [sku,      setSku]      = useState(initialData?.sku                  || "");

//   const [jtFeeDefault, setJtFeeDefault]     = useState(null);
//   const [isCalculatingFee, setIsCalculatingFee] = useState(false);
//   const [feeError, setFeeError]             = useState("");

//   const [jtServices, setJtServices] = useState([
//     { code: "EZ",    name: "J&T Chuyển phát tiêu chuẩn", active: false, fee: null },
//     { code: "FAST",  name: "J&T Fast (Giao hàng nhanh)", active: false, fee: null },
//     { code: "SUPER", name: "J&T Super (Dịch vụ hỏa tốc)", active: false, fee: null },
//   ]);

//   // ─── Gọi API J&T khi trọng lượng thay đổi ───────────────────────────────────
//   const calculateFees = useCallback(async () => {
//     if (!weight || parseFloat(weight) <= 0) {
//       setJtFeeDefault(null);
//       setJtServices((prev) => prev.map((s) => ({ ...s, fee: null })));
//       return;
//     }

//     setIsCalculatingFee(true);
//     setFeeError("");

//     try {
//       const params = { weight, weightUnit, height, width, length };

//       if (shippingMethod === "default") {
//         // Gọi API cho dịch vụ EZ (mặc định)
//         // Đổi fetchJTFeeMock → fetchJTFee khi có API key thật
//         const fee = await fetchJTFeeMock({ ...params, serviceCode: "EZ" });
//         setJtFeeDefault(fee);
//       } else {
//         // Gọi API cho tất cả dịch vụ đang được chọn
//         const updated = await Promise.all(
//           jtServices.map(async (s) => {
//             if (!s.active) return s;
//             const fee = await fetchJTFeeMock({ ...params, serviceCode: s.code });
//             return { ...s, fee };
//           })
//         );
//         setJtServices(updated);
//       }
//     } catch (err) {
//       setFeeError("Không thể kết nối J&T API. Kiểm tra API key hoặc thử lại.");
//       console.error("J&T API Error:", err);
//     } finally {
//       setIsCalculatingFee(false);
//     }
//   }, [weight, weightUnit, height, width, length, shippingMethod, jtServices]);

//   // Bật/tắt dịch vụ J&T và tính phí ngay
//   const handleToggleJtService = async (index) => {
//     const updated = jtServices.map((s, i) =>
//       i === index ? { ...s, active: !s.active, fee: null } : s
//     );
//     setJtServices(updated);

//     const toggled = updated[index];
//     if (toggled.active && weight) {
//       setIsCalculatingFee(true);
//       try {
//         const fee = await fetchJTFeeMock({ weight, weightUnit, height, width, length, serviceCode: toggled.code });
//         setJtServices((prev) => prev.map((s, i) => i === index ? { ...s, fee } : s));
//       } catch {
//         setFeeError("Lỗi tính phí dịch vụ này.");
//       } finally {
//         setIsCalculatingFee(false);
//       }
//     }
//   };

//   // ─── Handlers ────────────────────────────────────────────────────────────────
//   const handleMainImageChange = async (e) => {
//     const file = e.target.files[0];
//     if (!file) return;
//     // Hiện preview ngay bằng blob
//     setMainImage(URL.createObjectURL(file));
//     setUploadingMain(true);
//     try {
//       const url = await uploadImage(file, "products/main");
//       setMainImage(url); // ghi đè blob bằng URL thật từ Supabase
//     } catch (err) {
//       alert("Lỗi upload ảnh chính: " + err.message);
//       setMainImage(null);
//     } finally {
//       setUploadingMain(false);
//     }
//   };

//   const handleSubImageChange = async (index, e) => {
//     const file = e.target.files[0];
//     if (!file) return;
//     // Hiện preview blob ngay
//     setSubImages((prev) => { const n = [...prev]; n[index] = URL.createObjectURL(file); return n; });
//     setUploadingSubs((prev) => { const n = [...prev]; n[index] = true; return n; });
//     try {
//       const url = await uploadImage(file, "products/sub");
//       setSubImages((prev) => { const n = [...prev]; n[index] = url; return n; });
//     } catch (err) {
//       alert("Lỗi upload ảnh phụ: " + err.message);
//       setSubImages((prev) => { const n = [...prev]; n[index] = null; return n; });
//     } finally {
//       setUploadingSubs((prev) => { const n = [...prev]; n[index] = false; return n; });
//     }
//   };

//   const handleVideoChange = async (e) => {
//     const file = e.target.files[0];
//     if (!file) return;

//     // Giới hạn 100MB
//     if (file.size > 100 * 1024 * 1024) {
//       alert("Video vượt quá 100MB, vui lòng chọn file nhỏ hơn.");
//       return;
//     }

//     setVideoFile(file);
//     setVideoPreview(URL.createObjectURL(file)); // preview tạm
//     setUploadingVideo(true);
//     try {
//       const url = await uploadImage(file, "products/video"); // dùng chung hàm upload
//       setVideoPreview(url); // ghi đè bằng URL thật từ Supabase
//     } catch (err) {
//       alert("Lỗi upload video: " + err.message);
//       setVideoPreview(initialData?.video_url || null);
//       setVideoFile(null);
//     } finally {
//       setUploadingVideo(false);
//     }
//   };

//   const handleSave = async () => {
//     if (!productName.trim()) return alert("Vui lòng nhập tên sản phẩm");
//     const body = {
//       name:          productName,
//       stock:         parseInt(stock)    || 0,
//       price:         parseFloat(price)  || 0,
//       discount:      parseFloat(discount) || 0,
//       sku:           sku || null,
//       slug:          productName.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase().trim().replace(/[^a-z0-9\s-]/g,"").replace(/\s+/g,"-"),
//       description,
//       group_id:      category || null,
//       cod_enabled:   codEnabled,
//       shipping_type: shippingMethod,
//       weight:        parseFloat(weight)  || 0,
//       weight_unit:   weightUnit,
//       height:        parseFloat(height)  || 0,
//       width:         parseFloat(width)   || 0,
//       length:        parseFloat(length)  || 0,
//       images:        [mainImage, ...subImages].filter(Boolean),
//        video_url:     videoPreview, // URL thật từ Supabase Storage (không phải blob)
//     };
//     try {
//       if (isEditing) {
//         await import("../../api").then(m => m.productsApi.update(initialData.id, body));
//       } else {
//         await import("../../api").then(m => m.productsApi.create(body));
//       }
//       onSaved?.();
//     } catch (err) {
//       alert("Lỗi lưu: " + err.message);
//     }
//   };

//   // ─── Styles dùng chung ───────────────────────────────────────────────────────
//   const card   = { background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px", marginBottom: "20px" };
//   const label  = { display: "block", fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "6px" };
//   const input  = { width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", boxSizing: "border-box", fontSize: "14px", outline: "none" };
//   const req    = { color: "red" };

//   return (
//     <div style={{ padding: "4px", backgroundColor: "#f9fafb", minHeight: "100vh" }}>

//       {/* HEADER */}
//       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
//         <div>
//           <h1 style={{ fontSize: "22px", fontWeight: "600", color: "#111827", margin: 0 }}>{isEditing ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}</h1>
//           <p style={{ fontSize: "13px", color: "#6b7280", margin: "4px 0 0" }}>Vui lòng thiết lập đầy đủ các thuộc tính của sản phẩm</p>
//         </div>
//         <div style={{ display: "flex", gap: "10px" }}>
//           <button onClick={onBack} style={{ padding: "9px 18px", borderRadius: "8px", border: "1px solid #d1d5db", background: "white", cursor: "pointer", fontSize: "14px" }}>Hủy</button>
//           <button
//             onClick={handleSave}
//             disabled={uploadingMain || uploadingSubs.some(Boolean)}
//             style={{ padding: "9px 22px", borderRadius: "8px", border: "none", background: (uploadingMain || uploadingSubs.some(Boolean)) ? "#93c5fd" : "#2563eb", color: "white", fontWeight: "600", cursor: (uploadingMain || uploadingSubs.some(Boolean)) ? "not-allowed" : "pointer", fontSize: "14px" }}
//           >
//             {(uploadingMain || uploadingSubs.some(Boolean)) ? "⌛ Đang upload..." : "Lưu"}
//           </button>
//         </div>
//       </div>

//       {/* KHỐI 1: THÔNG TIN CƠ BẢN */}
//       <div style={card}>
//         <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 16px", color: "#111827" }}>Thông tin cơ bản</h3>

//         {/* Hình ảnh */}
//         <div style={{ marginBottom: "20px" }}>
//           <label style={label}><span style={req}>*</span> Hình ảnh <span style={{ fontSize: "12px", color: "#9ca3af", fontWeight: "normal" }}>(Nên thêm ít nhất 5 ảnh)</span></label>
//           <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "10px" }}>
//             {/* Ảnh chính */}
//             <input type="file" accept="image/*" ref={mainImageRef} onChange={handleMainImageChange} style={{ display: "none" }} />
//             <div onClick={() => !uploadingMain && mainImageRef.current.click()}
//               style={{ width: "150px", height: "150px", border: "1px dashed #d1d5db", borderRadius: "8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: uploadingMain ? "wait" : "pointer", overflow: "hidden", position: "relative" }}>
//               {mainImage
//                 ? <img src={mainImage} alt="Main" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: uploadingMain ? 0.5 : 1 }} />
//                 : <div style={{ textAlign: "center", color: "#6b7280", fontSize: "12px", padding: "10px" }}><span style={{ fontSize: "20px" }}>📤</span><br />Ảnh chính</div>}
//               {uploadingMain && (
//                 <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px" }}>
//                   <span style={{ color: "white", fontSize: "12px", fontWeight: "600" }}>⌛ Đang tải...</span>
//                 </div>
//               )}
//             </div>
//             {/* 8 ảnh phụ - refs tạo ngoài vòng lặp */}
//             <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
//               {subImages.map((img, idx) => (
//                 <div key={idx}>
//                   <input type="file" accept="image/*" ref={subImageRefs.current[idx]} onChange={(e) => handleSubImageChange(idx, e)} style={{ display: "none" }} />
//                   <div onClick={() => !uploadingSubs[idx] && subImageRefs.current[idx].current.click()}
//                     style={{ width: "70px", height: "70px", border: "1px solid #e5e7eb", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", cursor: uploadingSubs[idx] ? "wait" : "pointer", backgroundColor: "#f9fafb", position: "relative", overflow: "hidden" }}>
//                     {img
//                       ? <img src={img} alt={`Sub ${idx}`} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "6px", opacity: uploadingSubs[idx] ? 0.5 : 1 }} />
//                       : <span style={{ color: "#d1d5db", fontSize: "16px" }}>📦</span>}
//                     {uploadingSubs[idx] && (
//                       <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px" }}>
//                         <span style={{ color: "white", fontSize: "10px" }}>⌛</span>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>

//         {/* Tên sản phẩm */}
//         <div style={{ marginBottom: "16px" }}>
//           <label style={label}><span style={req}>*</span> Tên sản phẩm</label>
//           <div style={{ position: "relative" }}>
//             <input type="text" maxLength={255} value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Nhập tên sản phẩm" style={input} />
//             <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "#9ca3af" }}>{productName.length}/255</span>
//           </div>
//         </div>

//         {/* Hạng mục */}
//         <div>
//           <label style={label}><span style={req}>*</span> Hạng mục</label>
//           <select
//             value={category}
//             onChange={(e) => setCategory(e.target.value)}
//             style={{ ...input, color: category ? "#111827" : "#9ca3af", backgroundColor: "white", cursor: "pointer" }}
//           >
//             <option value="">-- Chọn hạng mục sản phẩm --</option>
//             {groups.map((g) => (
//               <option key={g.id} value={g.id}>{g.name}</option>
//             ))}
//           </select>
//         </div>
//       </div>

//       {/* KHỐI 2: CHI TIẾT SẢN PHẨM */}
//       <div style={card}>
//         <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 16px", color: "#111827" }}>Chi tiết sản phẩm</h3>
//         <div style={{ marginBottom: "20px" }}>
//           <label style={label}><span style={req}>*</span> Mô tả</label>
//           <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Nhập thông tin chi tiết sản phẩm..."
//             style={{ ...input, minHeight: "180px", fontFamily: "inherit", resize: "vertical" }} />
//         </div>
//         <div>
//           <label style={label}>Video</label>
//           <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 10px" }}>Tỷ lệ 9:16 đến 16:9. Tối đa 100MB. Định dạng: MP4, MOV, MKV, AVI</p>
//           <input type="file" accept="video/*" ref={videoRef} onChange={handleVideoChange} style={{ display: "none" }} />
//           <div onClick={() => videoRef.current.click()}
//             style={{ width: "100px", height: "100px", border: "1px dashed #d1d5db", borderRadius: "8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", backgroundColor: "#f9fafb" }}>
//             {videoPreview
//               ? <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#000", borderRadius: "8px" }}><span style={{ color: "white", fontSize: "12px" }}>📹 Đã chọn</span></div>
//               : <><span style={{ fontSize: "20px", color: "#9ca3af" }}>📤</span><span style={{ fontSize: "13px", color: "#4b5563", marginTop: "4px" }}>Video</span></>}
//           </div>
//         </div>
//       </div>

//       {/* KHỐI 3: THÔNG TIN BÁN HÀNG */}
//       <div style={card}>
//         <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 16px", color: "#111827" }}>Thông tin bán hàng</h3>
//         <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden" }}>
//           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.2fr", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", padding: "10px 16px" }}>
//             {["* Hàng có sẵn", "* Giá bán lẻ", "Giảm giá", "SKU người bán"].map((h) => (
//               <span key={h} style={{ fontSize: "13px", fontWeight: "600", color: "#4b5563" }}>{h}</span>
//             ))}
//           </div>
//           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.2fr", padding: "12px 16px", gap: "12px" }}>
//             <input
//               type="number"
//               placeholder="0"
//               value={stock}
//               onChange={(e) => setStock(e.target.value)}
//               style={input}
//             />
//             <div style={{ position: "relative" }}>
//               <input
//                 type="number"
//                 placeholder="0"
//                 value={price}
//                 onChange={(e) => setPrice(e.target.value)}
//                 style={{ ...input, paddingRight: "28px" }}
//               />
//               <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>đ</span>
//             </div>
//             <div style={{ position: "relative" }}>
//               <input
//                 type="number"
//                 placeholder="0"
//                 value={discount}
//                 onChange={(e) => setDiscount(e.target.value)}
//                 style={{ ...input, paddingRight: "28px" }}
//               />
//               <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>%</span>
//             </div>
//             <input
//               type="text"
//               placeholder="VD: SP-001"
//               value={sku}
//               onChange={(e) => setSku(e.target.value)}
//               style={input}
//             />
//           </div>
//         </div>
//       </div>

//       {/* KHỐI 4: VẬN CHUYỂN + API J&T */}
//       <div style={card}>
//         <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 16px", color: "#111827" }}>Vận chuyển</h3>

//         {/* Trọng lượng */}
//         <div style={{ marginBottom: "16px" }}>
//           <label style={label}><span style={req}>*</span> Trọng lượng kiện hàng</label>
//           <div style={{ display: "flex", border: "1px solid #d1d5db", borderRadius: "8px", overflow: "hidden" }}>
//             <select value={weightUnit} onChange={(e) => setWeightUnit(e.target.value)}
//               style={{ padding: "10px 12px", border: "none", borderRight: "1px solid #d1d5db", background: "#f9fafb", outline: "none", fontSize: "14px" }}>
//               <option value="g">Gam (g)</option>
//               <option value="kg">Kilogam (kg)</option>
//             </select>
//             <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
//               onBlur={calculateFees}
//               placeholder="Nhập trọng lượng kiện hàng"
//               style={{ flex: 1, padding: "10px 12px", border: "none", outline: "none", fontSize: "14px" }} />
//           </div>
//         </div>

//         {/* Kích thước */}
//         <div style={{ marginBottom: "20px" }}>
//           <label style={label}>Kích thước kiện hàng</label>
//           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
//             {[["Chiều cao", height, setHeight], ["Chiều rộng", width, setWidth], ["Chiều dài", length, setLength]].map(([ph, val, set]) => (
//               <div key={ph} style={{ display: "flex", border: "1px solid #d1d5db", borderRadius: "8px", alignItems: "center" }}>
//                 <input type="number" placeholder={ph} value={val} onChange={(e) => set(e.target.value)}
//                   style={{ width: "100%", padding: "10px 12px", border: "none", outline: "none", fontSize: "14px" }} />
//                 <span style={{ paddingRight: "12px", color: "#9ca3af", fontSize: "13px", whiteSpace: "nowrap" }}>cm</span>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* Cách giao hàng */}
//         <div style={{ marginBottom: "16px" }}>
//           <label style={label}><span style={req}>*</span> Cách giao hàng</label>
//           <div style={{ display: "flex", gap: "24px", marginBottom: "12px" }}>
//             {[["default", "Mặc định (J&T Chuẩn)"], ["custom", "Tùy chỉnh dịch vụ J&T"]].map(([val, lbl]) => (
//               <label key={val} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
//                 <input type="radio" name="shipping-method" checked={shippingMethod === val}
//                   onChange={() => { setShippingMethod(val); setTimeout(calculateFees, 0); }}
//                   style={{ width: "18px", height: "18px" }} />
//                 {lbl}
//               </label>
//             ))}
//           </div>

//           {/* Lỗi API */}
//           {feeError && (
//             <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", fontSize: "13px", color: "#dc2626", marginBottom: "12px" }}>
//               ⚠️ {feeError}
//             </div>
//           )}

//           {/* Phí mặc định */}
//           {shippingMethod === "default" && (
//             <div style={{ padding: "12px 16px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px" }}>
//               <span style={{ fontSize: "13px", color: "#6b7280" }}>Phí vận chuyển J&T Chuẩn (EZ): </span>
//               <strong style={{ fontSize: "15px", color: "#1e40af" }}>
//                 {isCalculatingFee ? "⌛ Đang tính..." : jtFeeDefault ? `${jtFeeDefault.toLocaleString("vi-VN")} đ` : "— Nhập trọng lượng để tính —"}
//               </strong>
//             </div>
//           )}

//           {/* Dịch vụ tùy chỉnh */}
//           {shippingMethod === "custom" && (
//             <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
//               {jtServices.map((service, index) => (
//                 <div key={service.code}
//                   style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px",
//                     border: service.active ? "1px solid #2563eb" : "1px solid #e5e7eb",
//                     borderRadius: "8px", backgroundColor: service.active ? "#eff6ff" : "white" }}>
//                   <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}>
//                     <input type="checkbox" checked={service.active} onChange={() => handleToggleJtService(index)}
//                       style={{ width: "16px", height: "16px", accentColor: "#2563eb" }} />
//                     {service.name}
//                   </label>
//                   <span style={{ fontSize: "13px", fontWeight: "600", color: service.active ? "#1e40af" : "#9ca3af" }}>
//                     {isCalculatingFee && service.active ? "⌛ Đang tính..."
//                       : service.fee ? `${service.fee.toLocaleString("vi-VN")} đ`
//                       : service.active ? "— Nhập trọng lượng —" : "—"}
//                   </span>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>

//         <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "16px 0" }} />

//         {/* COD */}
//         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
//           <span style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>Thanh toán khi nhận hàng (COD)</span>
//           <label style={{ position: "relative", display: "inline-block", width: "44px", height: "24px" }}>
//             <input type="checkbox" checked={codEnabled} onChange={() => setCodEnabled(!codEnabled)} style={{ opacity: 0, width: 0, height: 0 }} />
//             <span style={{ position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0,
//               backgroundColor: codEnabled ? "#10b981" : "#ccc", transition: ".4s", borderRadius: "24px" }}>
//               <span style={{ position: "absolute", height: "18px", width: "18px", left: "3px", bottom: "3px",
//                 backgroundColor: "white", transition: ".4s", borderRadius: "50%",
//                 transform: codEnabled ? "translateX(20px)" : "translateX(0)" }}></span>
//             </span>
//           </label>
//         </div>
//       </div>

//     </div>
//   );
// }



import React, { useState, useRef, useCallback } from "react";
import { uploadImage } from "../../supabase";
import { productGroupsApi } from "../../api";

// ─── Helper tạo slug từ tên tiếng Việt ───────────────────────────────────────
function toSlug(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

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

export default function CreateProduct({ onBack, onSaved, initialData = null }) {
  const isEditing = !!initialData;

  // ─── Thông tin cơ bản ───────────────────────────────────────────────────────
  const [productName, setProductName] = useState(initialData?.name        || "");
  const [category,    setCategory]    = useState(initialData?.group_id    || "");
  const [groups,      setGroups]      = useState([]);
  const [description, setDescription] = useState(initialData?.description || "");
  const [slug,        setSlug]        = useState(initialData?.slug || "");
  const [slugEdited,  setSlugEdited]  = useState(!!initialData?.slug); // true khi user tự sửa slug

  // ─── Hình ảnh ───────────────────────────────────────────────────────────────
  const [mainImage,  setMainImage]  = useState(initialData?.images?.[0]  || null);
  const [subImages,  setSubImages]  = useState(() => {
    const existing = (initialData?.images || []).slice(1);
    return [...existing, ...Array(Math.max(0, SUB_COUNT - existing.length)).fill(null)];
  });
  const mainImageRef  = useRef(null);
  const subImageRefs  = useRef(Array.from({ length: SUB_COUNT }, () => React.createRef()));

  // ─── Video ──────────────────────────────────────────────────────────────────
  const [videoFile,    setVideoFile]    = useState(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingSubs, setUploadingSubs] = useState(Array(SUB_COUNT).fill(false));

  // ─── Tự tạo slug từ tên (khi chưa tự sửa tay) ──────────────────────────────
  React.useEffect(() => {
    if (!slugEdited) setSlug(toSlug(productName));
  }, [productName, slugEdited]);

  // ─── Fetch nhóm sản phẩm ────────────────────────────────────────────────────
  React.useEffect(() => {
    productGroupsApi.getAll()
      .then((res) => setGroups(res.data || []))
      .catch(() => {});
  }, []);
  const [videoPreview, setVideoPreview] = useState(initialData?.video_url || null);
  const videoRef = useRef(null);

  // ─── Bán hàng ───────────────────────────────────────────────────────────────
  const [codEnabled, setCodEnabled] = useState(initialData?.cod_enabled ?? true);

  // ─── Vận chuyển ─────────────────────────────────────────────────────────────
  const [shippingMethod, setShippingMethod] = useState(initialData?.shipping_type || "default");
  const [weightUnit,     setWeightUnit]     = useState(initialData?.weight_unit   || "g");
  const [weight,         setWeight]         = useState(initialData?.weight?.toString() || "");
  const [height,         setHeight]         = useState(initialData?.height?.toString() || "");
  const [width,          setWidth]          = useState(initialData?.width?.toString()  || "");
  const [length,         setLength]         = useState(initialData?.length?.toString() || "");

  // ─── Thông tin bán hàng ─────────────────────────────────────────────────────
  const [stock,    setStock]    = useState(initialData?.stock?.toString()    || "");
  const [price,    setPrice]    = useState(initialData?.price?.toString()    || "");
  const [discount, setDiscount] = useState(initialData?.discount?.toString() || "");
  const [sku,      setSku]      = useState(initialData?.sku                  || "");

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
  const handleMainImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Hiện preview ngay bằng blob
    setMainImage(URL.createObjectURL(file));
    setUploadingMain(true);
    try {
      const url = await uploadImage(file, "products/main");
      setMainImage(url); // ghi đè blob bằng URL thật từ Supabase
    } catch (err) {
      alert("Lỗi upload ảnh chính: " + err.message);
      setMainImage(null);
    } finally {
      setUploadingMain(false);
    }
  };

  const handleSubImageChange = async (index, e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Hiện preview blob ngay
    setSubImages((prev) => { const n = [...prev]; n[index] = URL.createObjectURL(file); return n; });
    setUploadingSubs((prev) => { const n = [...prev]; n[index] = true; return n; });
    try {
      const url = await uploadImage(file, "products/sub");
      setSubImages((prev) => { const n = [...prev]; n[index] = url; return n; });
    } catch (err) {
      alert("Lỗi upload ảnh phụ: " + err.message);
      setSubImages((prev) => { const n = [...prev]; n[index] = null; return n; });
    } finally {
      setUploadingSubs((prev) => { const n = [...prev]; n[index] = false; return n; });
    }
  };

  const handleVideoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Giới hạn 100MB
    if (file.size > 100 * 1024 * 1024) {
      alert("Video vượt quá 100MB, vui lòng chọn file nhỏ hơn.");
      return;
    }

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file)); // preview tạm
    setUploadingVideo(true);
    try {
      const url = await uploadImage(file, "products/video"); // dùng chung hàm upload
      setVideoPreview(url); // ghi đè bằng URL thật từ Supabase
    } catch (err) {
      alert("Lỗi upload video: " + err.message);
      setVideoPreview(initialData?.video_url || null);
      setVideoFile(null);
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleSave = async () => {
    if (!productName.trim()) return alert("Vui lòng nhập tên sản phẩm");
    const body = {
      name:          productName,
      stock:         parseInt(stock)    || 0,
      price:         parseFloat(price)  || 0,
      discount:      parseFloat(discount) || 0,
      sku:           sku || null,
      slug:          slug || toSlug(productName),
      description,
      group_id:      category || null,
      cod_enabled:   codEnabled,
      shipping_type: shippingMethod,
      weight:        parseFloat(weight)  || 0,
      weight_unit:   weightUnit,
      height:        parseFloat(height)  || 0,
      width:         parseFloat(width)   || 0,
      length:        parseFloat(length)  || 0,
      images:        [mainImage, ...subImages].filter(Boolean),
      video_url:     videoPreview, // URL thật từ Supabase Storage (không phải blob)
    };
    try {
      if (isEditing) {
        await import("../../api").then(m => m.productsApi.update(initialData.id, body));
      } else {
        await import("../../api").then(m => m.productsApi.create(body));
      }
      onSaved?.();
    } catch (err) {
      alert("Lỗi lưu: " + err.message);
    }
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
          <h1 style={{ fontSize: "22px", fontWeight: "600", color: "#111827", margin: 0 }}>{isEditing ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}</h1>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: "4px 0 0" }}>Vui lòng thiết lập đầy đủ các thuộc tính của sản phẩm</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onBack} style={{ padding: "9px 18px", borderRadius: "8px", border: "1px solid #d1d5db", background: "white", cursor: "pointer", fontSize: "14px" }}>Hủy</button>
          <button
            onClick={handleSave}
            disabled={uploadingMain || uploadingSubs.some(Boolean) || uploadingVideo}
            style={{ padding: "9px 22px", borderRadius: "8px", border: "none", background: (uploadingMain || uploadingSubs.some(Boolean) || uploadingVideo) ? "#93c5fd" : "#2563eb", color: "white", fontWeight: "600", cursor: (uploadingMain || uploadingSubs.some(Boolean) || uploadingVideo) ? "not-allowed" : "pointer", fontSize: "14px" }}
          >
            {(uploadingMain || uploadingSubs.some(Boolean) || uploadingVideo) ? "⌛ Đang upload..." : "Lưu"}
          </button>
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
            <div onClick={() => !uploadingMain && mainImageRef.current.click()}
              style={{ width: "150px", height: "150px", border: "1px dashed #d1d5db", borderRadius: "8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: uploadingMain ? "wait" : "pointer", overflow: "hidden", position: "relative" }}>
              {mainImage
                ? <img src={mainImage} alt="Main" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: uploadingMain ? 0.5 : 1 }} />
                : <div style={{ textAlign: "center", color: "#6b7280", fontSize: "12px", padding: "10px" }}><span style={{ fontSize: "20px" }}>📤</span><br />Ảnh chính</div>}
              {uploadingMain && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px" }}>
                  <span style={{ color: "white", fontSize: "12px", fontWeight: "600" }}>⌛ Đang tải...</span>
                </div>
              )}
            </div>
            {/* 8 ảnh phụ - refs tạo ngoài vòng lặp */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
              {subImages.map((img, idx) => (
                <div key={idx}>
                  <input type="file" accept="image/*" ref={subImageRefs.current[idx]} onChange={(e) => handleSubImageChange(idx, e)} style={{ display: "none" }} />
                  <div onClick={() => !uploadingSubs[idx] && subImageRefs.current[idx].current.click()}
                    style={{ width: "70px", height: "70px", border: "1px solid #e5e7eb", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", cursor: uploadingSubs[idx] ? "wait" : "pointer", backgroundColor: "#f9fafb", position: "relative", overflow: "hidden" }}>
                    {img
                      ? <img src={img} alt={`Sub ${idx}`} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "6px", opacity: uploadingSubs[idx] ? 0.5 : 1 }} />
                      : <span style={{ color: "#d1d5db", fontSize: "16px" }}>📦</span>}
                    {uploadingSubs[idx] && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px" }}>
                        <span style={{ color: "white", fontSize: "10px" }}>⌛</span>
                      </div>
                    )}
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

        {/* Slug URL */}
        <div style={{ marginBottom: "16px" }}>
          <label style={label}>
            Đường dẫn URL
            <span style={{ fontSize: "11px", fontWeight: "normal", color: "#9ca3af", marginLeft: "8px" }}>
              techtra.vn/san-pham/<strong>{slug || "ten-san-pham"}</strong>
            </span>
          </label>
          <div style={{ display: "flex", border: "1px solid #d1d5db", borderRadius: "8px", overflow: "hidden" }}>
            <span style={{ padding: "10px 12px", background: "#f9fafb", borderRight: "1px solid #d1d5db", color: "#9ca3af", fontSize: "13px", whiteSpace: "nowrap" }}>
              /san-pham/
            </span>
            <input
              type="text"
              value={slug}
              onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); setSlugEdited(true); }}
              placeholder="ten-san-pham"
              style={{ flex: 1, padding: "10px 12px", border: "none", outline: "none", fontSize: "14px", color: "#374151" }}
            />
            {slugEdited && (
              <button
                type="button"
                onClick={() => { setSlug(toSlug(productName)); setSlugEdited(false); }}
                style={{ padding: "0 12px", background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap" }}
                title="Tạo lại từ tên sản phẩm"
              >↺ Reset</button>
            )}
          </div>
        </div>

        {/* Hạng mục */}
        <div>
          <label style={label}><span style={req}>*</span> Hạng mục</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ ...input, color: category ? "#111827" : "#9ca3af", backgroundColor: "white", cursor: "pointer" }}
          >
            <option value="">-- Chọn hạng mục sản phẩm --</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
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
          <div onClick={() => !uploadingVideo && videoRef.current.click()}
            style={{ width: "100px", height: "100px", border: "1px dashed #d1d5db", borderRadius: "8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: uploadingVideo ? "wait" : "pointer", backgroundColor: "#f9fafb", position: "relative", overflow: "hidden" }}>
            {videoPreview
              ? <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#000", borderRadius: "8px", opacity: uploadingVideo ? 0.5 : 1 }}><span style={{ color: "white", fontSize: "12px" }}>📹 Đã chọn</span></div>
              : <><span style={{ fontSize: "20px", color: "#9ca3af" }}>📤</span><span style={{ fontSize: "13px", color: "#4b5563", marginTop: "4px" }}>Video</span></>}
            {uploadingVideo && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "white", fontSize: "10px", fontWeight: "600" }}>⌛ Đang tải...</span>
              </div>
            )}
          </div>
          {videoPreview && !uploadingVideo && (
            <a href={videoPreview} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: "8px", fontSize: "12px", color: "#2563eb" }}>
              ▶ Xem video đã upload
            </a>
          )}
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
            <input
              type="number"
              placeholder="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              style={input}
            />
            <div style={{ position: "relative" }}>
              <input
                type="number"
                placeholder="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                style={{ ...input, paddingRight: "28px" }}
              />
              <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>đ</span>
            </div>
            <div style={{ position: "relative" }}>
              <input
                type="number"
                placeholder="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                style={{ ...input, paddingRight: "28px" }}
              />
              <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>%</span>
            </div>
            <input
              type="text"
              placeholder="VD: SP-001"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              style={input}
            />
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