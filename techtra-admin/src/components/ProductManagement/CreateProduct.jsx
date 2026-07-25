// import { fetchJTFeeMock } from "../../jstService.js"; // Cấu hình & hàm gọi API J&T đã tách riêng
// import React, { useState, useRef, useCallback } from "react";
// import { uploadImage } from "../../api"; // Hàm upload file lên Supabase Storage
// import { productGroupsApi } from "../../api";


// // ─── Helper tạo slug từ tên tiếng Việt ───────────────────────────────────────
// function toSlug(str) {
//   return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
//     .replace(/đ/g, "d").replace(/Đ/g, "D")
//     .toLowerCase().trim()
//     .replace(/[^a-z0-9\s-]/g, "")
//     .replace(/\s+/g, "-");
// }

// // ─── Lưu / đọc lựa chọn "Cách giao hàng" gần nhất (localStorage) ─────────────
// const SHIPPING_STORAGE_KEY = "techtra_last_shipping_choice";

// function loadSavedShipping() {
//   try {
//     const raw = localStorage.getItem(SHIPPING_STORAGE_KEY);
//     return raw ? JSON.parse(raw) : null;
//   } catch {
//     return null;
//   }
// }

// const SUB_COUNT = 8;

// export default function CreateProduct({ onBack, onSaved, initialData = null }) {
//   const isEditing = !!initialData;

//   // ─── Thông tin cơ bản ───────────────────────────────────────────────────────
//   const [productName, setProductName] = useState(initialData?.name        || "");
//   const [category,    setCategory]    = useState(initialData?.group_id    || "");
//   const [groups,      setGroups]      = useState([]);
  
//   // State description bây giờ sẽ lưu chuỗi dạng HTML thay vì chuỗi thuần (Plain Text)
//   const [description, setDescription] = useState(initialData?.description || "");
//   const editorRef = useRef(null);

//   const [slug,        setSlug]        = useState(initialData?.slug || "");
//   const [slugEdited,  setSlugEdited]  = useState(!!initialData?.slug);

//   // ─── Hình ảnh ───────────────────────────────────────────────────────────────
//   const [mainImage,  setMainImage]  = useState(initialData?.images?.[0]  || null);
//   // Ảnh phụ: danh sách URL (string[]). Không giới hạn số lượng.
//   const [subImages,  setSubImages]  = useState(() => (initialData?.images || []).slice(1));
//   const mainImageRef  = useRef(null);
//   const subImagesRef  = useRef(null);

//   // ─── Video & Tài liệu PDF (content_file) ────────────────────────────────────
//   const [videoFile,      setVideoFile]      = useState(null);
//   const [videoPreview,   setVideoPreview]   = useState(initialData?.video_url || null);
//   const [pdfUrl,         setPdfUrl]         = useState(initialData?.content_file || null); 
//   const [pdfName,        setPdfName]        = useState(initialData?.content_file ? "Tai-lieu-da-luu.pdf" : "");

//   const [uploadingVideo, setUploadingVideo] = useState(false);
//   const [uploadingMain,  setUploadingMain]  = useState(false);
//   const [uploadingSubs,  setUploadingSubs]  = useState(false);
//   const [uploadingPdf,   setUploadingPdf]   = useState(false);

//   const videoRef = useRef(null);
//   const pdfRef = useRef(null);

//   // Synchronize contentEditable content when initialData changes
//   React.useEffect(() => {
//     if (editorRef.current && initialData?.description) {
//       editorRef.current.innerHTML = initialData.description;
//     }
//   }, [initialData]);

//   // ─── Tự tạo slug từ tên (khi chưa tự sửa tay) ──────────────────────────────
//   React.useEffect(() => {
//     if (!slugEdited) setSlug(toSlug(productName));
//   }, [productName, slugEdited]);

//   // ─── Fetch nhóm sản phẩm ────────────────────────────────────────────────────
//   React.useEffect(() => {
//     productGroupsApi.getAll()
//       .then((res) => setGroups(res.data || []))
//       .catch(() => {});
//   }, []);

//   // ─── Mã nhóm (code) tương ứng với hạng mục (group) đang chọn ────────────────
//   const selectedGroup = groups.find((g) => String(g.id) === String(category));
//   const groupCode     = selectedGroup?.code || null;

//   // ─── Bán hàng ───────────────────────────────────────────────────────────────
//   const [codEnabled, setCodEnabled]     = useState(initialData?.cod_enabled ?? true);
//   // ─── Trạng thái hiển thị trên web ──────────────────────────────────────────
//   // Mặc định SP mới luôn ẨN (is_active = false). Admin chủ động bật khi đã có đủ thông tin.
//   const [isActive,   setIsActive]       = useState(initialData?.is_active ?? false);

//   // ─── Vận chuyển ─────────────────────────────────────────────────────────────
//   // Chỉ auto-load lựa chọn "Cách giao hàng" đã lưu khi TẠO MỚI sản phẩm.
//   // Khi SỬA sản phẩm có sẵn, luôn ưu tiên dữ liệu gốc (initialData) của chính sản phẩm đó.
//   const savedShipping = !isEditing ? loadSavedShipping() : null;

//   const [shippingMethod, setShippingMethod] = useState(
//     initialData?.shipping_type || savedShipping?.shippingMethod || "default"
//   );
//   const [weightUnit,     setWeightUnit]     = useState(initialData?.weight_unit   || "g");
//   const [weight,         setWeight]         = useState(initialData?.weight?.toString() || "");
//   const [height,         setHeight]         = useState(initialData?.height?.toString() || "");
//   const [width,          setWidth]          = useState(initialData?.width?.toString()  || "");
//   const [length,         setLength]         = useState(initialData?.length?.toString() || "");

//   // Hàng cồng kềnh: kích thước lớn, tính cước theo khối lượng quy đổi + phụ phí xử lý
//   const [isBulky, setIsBulky] = useState(
//     initialData?.is_bulky ?? savedShipping?.isBulky ?? false
//   );

//   // ─── Thông tin bán hàng ─────────────────────────────────────────────────────
//   const [stock,    setStock]    = useState(initialData?.stock?.toString()    || "");
//   const [price,    setPrice]    = useState(initialData?.price?.toString()    || "");
//   const [discount, setDiscount] = useState(initialData?.discount?.toString() || "");
//   const [sku,      setSku]      = useState(initialData?.sku                  || "");

//   const [jtFeeDefault, setJtFeeDefault]     = useState(null);
//   const [isCalculatingFee, setIsCalculatingFee] = useState(false);
//   const [feeError, setFeeError]             = useState("");

//   // ─── Danh sách dịch vụ J&T (Tùy chỉnh) ──────────────────────────────────────
//   // Thứ tự ưu tiên khôi phục lựa chọn "active":
//   //  1) Dữ liệu gốc đã lưu CỦA CHÍNH sản phẩm này (initialData.jt_services) — khi sửa sản phẩm
//   //  2) Lựa chọn gần nhất trong localStorage — chỉ áp dụng khi TẠO sản phẩm mới
//   //  3) Mặc định: tất cả tắt
//   const [jtServices, setJtServices] = useState(() => {
//     const defaultServices = [
//       { code: "EZ",    name: "J&T Chuyển phát tiêu chuẩn", active: false, fee: null },
//       { code: "FAST",  name: "J&T Fast (Giao hàng nhanh)", active: false, fee: null },
//       { code: "SUPER", name: "J&T Super (Dịch vụ hỏa tốc)", active: false, fee: null },
//     ];

//     // Ưu tiên 1: dữ liệu đã lưu của chính sản phẩm (khi sửa sản phẩm có sẵn)
//     if (initialData?.jt_services?.length) {
//       return defaultServices.map((s) => ({
//         ...s,
//         active: initialData.jt_services.includes(s.code),
//       }));
//     }

//     // Ưu tiên 2: Auto-load các dịch vụ J&T đã bật ở lần chọn trước (chỉ áp dụng khi tạo SP mới)
//     if (!isEditing && savedShipping?.activeCodes?.length) {
//       return defaultServices.map((s) => ({
//         ...s,
//         active: savedShipping.activeCodes.includes(s.code),
//       }));
//     }

//     return defaultServices;
//   });

//   // ─── Luôn lưu lại lựa chọn "Cách giao hàng" mỗi khi người dùng thay đổi ─────
//   // (localStorage chỉ dùng để gợi ý nhanh cho lần TẠO sản phẩm tiếp theo,
//   //  dữ liệu thật của từng sản phẩm luôn được lưu vào body khi handleSave)
//   React.useEffect(() => {
//     try {
//       const activeCodes = jtServices.filter((s) => s.active).map((s) => s.code);
//       localStorage.setItem(
//         SHIPPING_STORAGE_KEY,
//         JSON.stringify({ shippingMethod, activeCodes, isBulky })
//       );
//     } catch {
//       // localStorage không khả dụng (VD: chế độ ẩn danh) — bỏ qua, không chặn UI
//     }
//   }, [shippingMethod, jtServices, isBulky]);

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
//       const params = { weight, weightUnit, height, width, length, isBulky };

//       if (shippingMethod === "default") {
//         const fee = await fetchJTFeeMock({ ...params, serviceCode: "EZ" });
//         setJtFeeDefault(fee);
//       } else {
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
//   }, [weight, weightUnit, height, width, length, shippingMethod, jtServices, isBulky]);

//   // ─── Tự động tính phí ngay khi mở form nếu đã có sẵn trọng lượng ─────────────
//   // (áp dụng cho cả trường hợp auto-load cách giao hàng đã lưu lẫn khi sửa SP có sẵn)
//   React.useEffect(() => {
//     if (weight && parseFloat(weight) > 0) {
//       calculateFees();
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   const handleToggleJtService = async (index) => {
//     const updated = jtServices.map((s, i) =>
//       i === index ? { ...s, active: !s.active, fee: null } : s
//     );
//     setJtServices(updated);

//     const toggled = updated[index];
//     if (toggled.active && weight) {
//       setIsCalculatingFee(true);
//       try {
//         const fee = await fetchJTFeeMock({ weight, weightUnit, height, width, length, serviceCode: toggled.code, isBulky });
//         setJtServices((prev) => prev.map((s, i) => i === index ? { ...s, fee } : s));
//       } catch {
//         setFeeError("Lỗi tính phí dịch vụ này.");
//       } finally {
//         setIsCalculatingFee(false);
//       }
//     }
//   };

//   // Bật/tắt "Hàng cồng kềnh" → tính lại phí ngay
//   const handleToggleBulky = () => {
//     setIsBulky((prev) => !prev);
//     setTimeout(calculateFees, 0);
//   };

//   // ─── Handlers Upload ─────────────────────────────────────────────────────────
//   const handleMainImageChange = async (e) => {
//     const file = e.target.files[0];
//     if (!file) return;
//     setMainImage(URL.createObjectURL(file));
//     setUploadingMain(true);
//     try {
//       const url = await uploadImage(file, "products/main");
//       setMainImage(url);
//     } catch (err) {
//       alert("Lỗi upload ảnh chính: " + err.message);
//       setMainImage(null);
//     }
//     setUploadingMain(false);
//   };

//   const handleSubImagesChange = async (e) => {
//     const files = Array.from(e.target.files || []);
//     if (!files.length) return;
//     // 1) Hiển thị preview tạm (object URL) ngay cho mượt
//     const tempPreviews = files.map((f) => URL.createObjectURL(f));
//     setSubImages((prev) => [...prev, ...tempPreviews]);
//     setUploadingSubs(true);
//     try {
//       // 2) Upload song song từng ảnh
//       const uploaded = await Promise.all(
//         files.map(async (f, i) => {
//           try { return await uploadImage(f, "products/sub"); }
//           catch (err) {
//             alert(`Lỗi upload ảnh "${f.name}": ${err.message}`);
//             return null;
//           }
//         })
//       );
//       // 3) Thay thế các preview tạm bằng URL thật (filter null nếu lỗi)
//       setSubImages((prev) => {
//         const out = [...prev];
//         // Xoá các preview tạm vừa push, thay bằng URL thật
//         out.splice(out.length - tempPreviews.length, tempPreviews.length, ...uploaded.filter(Boolean));
//         return out;
//       });
//     } finally {
//       setUploadingSubs(false);
//       if (subImagesRef.current) subImagesRef.current.value = "";
//     }
//   };

//   const removeSubImage = (idx) => {
//     setSubImages((prev) => prev.filter((_, i) => i !== idx));
//   };

//   const setMainImageFromSub = (url) => {
//     // (Tuỳ chọn) cho phép "đẩy" 1 ảnh phụ lên làm ảnh chính
//     setMainImage(url);
//     setSubImages((prev) => prev.filter((u) => u !== url));
//   };

//   const handleVideoChange = async (e) => {
//     const file = e.target.files[0];
//     if (!file) return;
//     if (file.size > 100 * 1024 * 1024) {
//       alert("Video vượt quá 100MB, vui lòng chọn file nhỏ hơn.");
//       return;
//     }
//     setVideoFile(file);
//     setVideoPreview(URL.createObjectURL(file));
//     setUploadingVideo(true);
//     try {
//       const url = await uploadImage(file, "products/video");
//       setVideoPreview(url);
//     } catch (err) {
//       alert("Lỗi upload video: " + err.message);
//       setVideoPreview(initialData?.video_url || null);
//       setVideoFile(null);
//     } finally {
//       setUploadingVideo(false);
//     }
//   };

//   const handlePdfChange = async (e) => {
//     const file = e.target.files[0];
//     if (!file) return;

//     if (file.type !== "application/pdf") {
//       alert("Vui lòng chỉ tải lên file định dạng PDF.");
//       return;
//     }

//     setPdfName(file.name);
//     setUploadingPdf(true);
//     try {
//       const url = await uploadImage(file, "products/documents");
//       setPdfUrl(url);

//       // KHẮC PHỤC CHÍNH: Tạo nội dung HTML chèn cả chữ thông báo và ảnh biểu tượng PDF trực tiếp vào khung text
//       const pdfHtmlChunk = `
//         <div><br/></div>
//         <div style="margin: 12px 0; padding: 12px; border: 1px solid #fca5a5; background-color: #fef2f2; border-radius: 8px; display: inline-flex; align-items: center; gap: 10px;" contenteditable="false">
//           <img src="https://cdn-icons-png.flaticon.com/512/337/337946.png" alt="PDF Icon" style="width: 32px; height: 32px; object-fit: contain;" />
//           <div>
//             <div style="font-weight: 600; color: #b91c1c; font-size: 13px;">Tài liệu kỹ thuật đính kèm:</div>
//             <a href="${url}" target="_blank" rel="noreferrer" style="color: #2563eb; text-decoration: underline; font-size: 13px; font-weight: 500;">
//               ${file.name} (Bấm để xem/tải về)
//             </a>
//           </div>
//         </div>
//         <div><br/></div>
//       `;

//       if (editorRef.current) {
//         editorRef.current.innerHTML += pdfHtmlChunk;
//         setDescription(editorRef.current.innerHTML); // Cập nhật lại state lưu vào DB
//       }

//     } catch (err) {
//       alert("Lỗi upload file PDF: " + err.message);
//       setPdfUrl(null);
//       setPdfName("");
//     } finally {
//       setUploadingPdf(false);
//     }
//   };

//   // Hàm xử lý xóa tài liệu PDF
//   const handleRemovePdf = () => {
//     if (window.confirm("Bạn có chắc chắn muốn xóa tài liệu PDF này không?")) {
//       setPdfUrl(null);
//       setPdfName("");
      
//       // Nếu bạn đang dùng contentEditable nhúng hình ảnh/link, bạn cần xóa hoặc reset nội dung trong editor
//       if (editorRef.current) {
//         // Cách nhanh: Tìm và xóa node chứa thông tin PDF cũ hoặc để user tự sửa trong Editor
//         // Nếu muốn reset trống hoàn toàn editor: editorRef.current.innerHTML = ""; setDescription("");
//       }
//     }
//   };

//   // Hàm xử lý xóa Video
//   const handleRemoveVideo = () => {
//     if (window.confirm("Bạn có chắc chắn muốn xóa video này không?")) {
//       setVideoFile(null);
//       setVideoPreview(null);
//     }
//   };

//   const handleSave = async () => {
//     // ─── Validate đầy đủ các trường bắt buộc ─────────────────────────────
//     const missing = [];
//     if (!productName.trim())                                          missing.push("Tên sản phẩm");
//     if (!mainImage)                                                   missing.push("Ảnh chính");
//     if (!category)                                                    missing.push("Hạng mục");
//     if (!description || !description.replace(/<[^>]*>/g, "").trim()) missing.push("Mô tả sản phẩm");
//     const stockNum  = parseInt(stock);
//     const priceNum  = parseFloat(price);
//     const weightNum = parseFloat(weight);
//     const heightNum = parseFloat(height);
//     const widthNum  = parseFloat(width);
//     const lengthNum = parseFloat(length);
//     if (Number.isNaN(stockNum)  || stockNum  < 0) missing.push("Hàng có sẵn (số nguyên ≥ 0)");
//     if (Number.isNaN(priceNum)  || priceNum  <= 0) missing.push("Giá bán lẻ (> 0)");
//     if (Number.isNaN(weightNum) || weightNum <= 0) missing.push("Trọng lượng (> 0)");
//     if (Number.isNaN(heightNum) || heightNum <= 0) missing.push("Chiều cao (> 0)");
//     if (Number.isNaN(widthNum)  || widthNum  <= 0) missing.push("Chiều rộng (> 0)");
//     if (Number.isNaN(lengthNum) || lengthNum <= 0) missing.push("Chiều dài (> 0)");
//     if (!shippingMethod)                                            missing.push("Cách giao hàng");
//     if (shippingMethod === "custom" && !jtServices.some((s) => s.active)) {
//       missing.push("Chọn ít nhất 1 dịch vụ J&T (Tùy chỉnh)");
//     }

//     if (missing.length) {
//       alert(
//         "Vui lòng nhập đầy đủ các trường bắt buộc trước khi lưu:\n\n• " +
//         missing.join("\n• ")
//       );
//       return;
//     }

//     // Danh sách mã dịch vụ J&T đang được bật (chỉ có ý nghĩa khi shippingMethod === "custom")
//     const activeJtCodes = jtServices.filter((s) => s.active).map((s) => s.code);

//     const body = {
//       name:          productName,
//       stock:         stockNum,
//       price:         priceNum,
//       discount:      parseFloat(discount) || 0,
//       sku:           sku || null,
//       slug:          slug || toSlug(productName),
//       description:   description || "",
//       group_id:      category,
//       cod_enabled:   codEnabled,
//       is_active:     isActive,
//       shipping_type: shippingMethod,
//       jt_services:   activeJtCodes, // ← LƯU LẠI các dịch vụ J&T đã chọn theo từng sản phẩm
//       weight:        weightNum,
//       weight_unit:   weightUnit,
//       height:        heightNum,
//       width:         widthNum,
//       length:        lengthNum,
//       is_bulky:      isBulky,
//       images:        [mainImage, ...subImages].filter(Boolean),
//       video_url:     videoPreview,
//       content_file:  pdfUrl,
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
//             disabled={uploadingMain || uploadingSubs || uploadingVideo || uploadingPdf}
//             style={{ padding: "9px 22px", borderRadius: "8px", border: "none", background: (uploadingMain || uploadingSubs || uploadingVideo || uploadingPdf) ? "#93c5fd" : "#2563eb", color: "white", fontWeight: "600", cursor: (uploadingMain || uploadingSubs || uploadingVideo || uploadingPdf) ? "not-allowed" : "pointer", fontSize: "14px" }}
//           >
//             {(uploadingMain || uploadingSubs || uploadingVideo || uploadingPdf) ? "⌛ Đang upload..." : "Lưu"}
//           </button>
//         </div>
//       </div>

//       {/* KHỐI 1: THÔNG TIN CƠ BẢN */}
//       <div style={card}>
//         <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 16px", color: "#111827" }}>Thông tin cơ bản</h3>

//         {/* Hình ảnh */}
//         <div style={{ marginBottom: "20px" }}>
//           <label style={label}>
//             <span style={req}>*</span> Hình ảnh
//             <span style={{ fontSize: "12px", color: "#9ca3af", fontWeight: "normal" }}>
//               {" "}(1 ảnh chính + có thể chọn nhiều ảnh phụ cùng lúc)
//             </span>
//           </label>
//           <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "10px", alignItems: "flex-start" }}>
//             {/* Ảnh chính: chỉ 1 ảnh */}
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

//             {/* Vùng ảnh phụ: multi-file + danh sách thumb có nút xoá */}
//             <div style={{ flex: 1, minWidth: 280 }}>
//               <input
//                 type="file"
//                 accept="image/*"
//                 multiple
//                 ref={subImagesRef}
//                 onChange={handleSubImagesChange}
//                 style={{ display: "none" }}
//               />
//               <div
//                 onClick={() => !uploadingSubs && subImagesRef.current.click()}
//                 style={{
//                   width: "100%", minHeight: "44px", padding: "10px 14px",
//                   border: "1px dashed #d1d5db", borderRadius: "8px",
//                   display: "flex", alignItems: "center", gap: 8,
//                   cursor: uploadingSubs ? "wait" : "pointer",
//                   backgroundColor: "#f9fafb", color: "#4b5563", fontSize: 13,
//                 }}
//               >
//                 <i className="fas fa-images" />
//                 {uploadingSubs
//                   ? "Đang tải ảnh lên..."
//                   : subImages.length > 0
//                     ? `Đã có ${subImages.length} ảnh phụ — bấm để thêm ảnh khác`
//                     : "Bấm để chọn nhiều ảnh phụ (Ctrl/Shift + click để chọn nhiều)"}
//               </div>

//               {subImages.length > 0 && (
//                 <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
//                   {subImages.map((img, idx) => (
//                     <div key={idx} style={{ position: "relative", width: 72, height: 72 }}>
//                       <img
//                         src={img}
//                         alt={`Sub ${idx + 1}`}
//                         style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 6, border: "1px solid #e5e7eb" }}
//                         onError={(e) => { e.currentTarget.style.opacity = 0.3; }}
//                       />
//                       <button
//                         type="button"
//                         onClick={() => removeSubImage(idx)}
//                         title="Xóa ảnh này"
//                         style={{
//                           position: "absolute", top: -6, right: -6,
//                           width: 22, height: 22, borderRadius: "50%",
//                           background: "#dc2626", color: "white", border: "2px solid white",
//                           cursor: "pointer", fontSize: 11, lineHeight: 1, padding: 0,
//                           display: "flex", alignItems: "center", justifyContent: "center",
//                         }}
//                       >×</button>
//                     </div>
//                   ))}
//                 </div>
//               )}
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

//         {/* Slug URL */}
//         <div style={{ marginBottom: "16px" }}>
//           <label style={label}>
//             Đường dẫn URL
//             <span style={{ fontSize: "11px", fontWeight: "normal", color: "#9ca3af", marginLeft: "8px" }}>
//               techtra.vn/san-pham/<strong>{slug || "ten-san-pham"}</strong>
//             </span>
//           </label>
//           <div style={{ display: "flex", border: "1px solid #d1d5db", borderRadius: "8px", overflow: "hidden" }}>
//             <span style={{ padding: "10px 12px", background: "#f9fafb", borderRight: "1px solid #d1d5db", color: "#9ca3af", fontSize: "13px", whiteSpace: "nowrap" }}>
//               /san-pham/
//             </span>
//             <input
//               type="text"
//               value={slug}
//               onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); setSlugEdited(true); }}
//               placeholder="ten-san-pham"
//               style={{ flex: 1, padding: "10px 12px", border: "none", outline: "none", fontSize: "14px", color: "#374151" }}
//             />
//             {slugEdited && (
//               <button
//                 type="button"
//                 onClick={() => { setSlug(toSlug(productName)); setSlugEdited(false); }}
//                 style={{ padding: "0 12px", background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap" }}
//                 title="Tạo lại từ tên sản phẩm"
//               >↺ Reset</button>
//             )}
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
//               <option key={g.id} value={g.id}>
//                 {g.code ? `[${g.code}] ` : ""}{g.name}
//               </option>
//             ))}
//           </select>
//           {category && (
//             <div style={{ marginTop: "6px", fontSize: "12px", color: "#6b7280" }}>
//               Mã nhóm:{" "}
//               <span style={{ fontFamily: "'Courier New', monospace", fontWeight: "600", color: groupCode ? "#374151" : "#9ca3af" }}>
//                 {groupCode || "— nhóm này chưa có mã —"}
//               </span>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* KHỐI 2: CHI TIẾT SẢN PHẨM & Ô MÔ TẢ ĐA PHƯƠNG TIỆN */}
//       <div style={card}>
//         <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 16px", color: "#111827" }}>Chi tiết sản phẩm</h3>
        
//         {/* Khung nhập mô tả thông minh */}
//         <div style={{ marginBottom: "20px" }}>
//           <label style={label}><span style={req}>*</span> Mô tả</label>
          
//           {/* SỬ DỤNG CONTENTEDITABLE ĐỂ CHỨA ĐƯỢC CẢ CHỮ VÀ HÌNH ẢNH TRỰC TIẾP */}
//           <div
//             ref={editorRef}
//             contentEditable={true}
//             onInput={(e) => setDescription(e.currentTarget.innerHTML)}
//             style={{
//               width: "100%", 
//               padding: "12px", 
//               border: "1px solid #d1d5db", 
//               borderRadius: "8px", 
//               boxSizing: "border-box", 
//               fontSize: "14px", 
//               outline: "none",
//               minHeight: "160px",
//               backgroundColor: "white",
//               overflowY: "auto"
//             }}
//           />
//           {!description && (
//             <p style={{ fontSize: "12px", color: "#9ca3af", margin: "4px 0 0 4px" }}>
//               Gõ mô tả hoặc bấm nút "Thêm PDF" ở dưới để nhúng văn bản và hình ảnh tài liệu trực tiếp vào đây.
//             </p>
//           )}

//           {/* BẢNG TRỰC QUAN CHI TIẾT CÁC TÀI LIỆU KÈM THEO (ĐÃ THÊM NÚT XÓA) */}
//           {(pdfUrl || videoPreview) && (
//             <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden", marginTop: "16px", background: "white" }}>
//               <div style={{ background: "#f3f4f6", padding: "10px 14px", borderBottom: "1px solid #e5e7eb", fontSize: "13px", fontWeight: "600", color: "#374151" }}>
//                 📋 Danh mục quản lý tệp tin gốc
//               </div>
//               <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
//                 <tbody>
//                   {pdfUrl && (
//                     <tr style={{ borderBottom: videoPreview ? "1px solid #e5e7eb" : "none" }}>
//                       <td style={{ padding: "12px 14px", fontWeight: "600", color: "#4b5563", width: "140px", backgroundColor: "#fafafa" }}>Tài liệu kĩ thuật</td>
//                       <td style={{ padding: "12px 14px", color: "#111827", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
//                         <div>
//                           <span style={{ marginRight: "10px" }}>📄 {pdfName || "Tài liệu kỹ thuật sản phẩm"}</span>
//                           <a href={pdfUrl} target="_blank" rel="noreferrer" style={{ color: "#2563eb", fontWeight: "600", textDecoration: "none" }}>
//                             [Xem file gốc]
//                           </a>
//                         </div>
//                         {/* NÚT XÓA PDF */}
//                         <button 
//                           type="button" 
//                           onClick={handleRemovePdf} 
//                           style={{ background: "none", border: "none", color: "#dc2626", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}
//                         >
//                           [Xóa]
//                         </button>
//                       </td>
//                     </tr>
//                   )}
//                   {videoPreview && (
//                     <tr>
//                       <td style={{ padding: "12px 14px", fontWeight: "600", color: "#4b5563", width: "140px", backgroundColor: "#fafafa" }}>Video giới thiệu</td>
//                       <td style={{ padding: "12px 14px", color: "#111827", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
//                         <div>
//                           <span style={{ marginRight: "10px" }}>📹 Video review chi tiết sản phẩm</span>
//                           <a href={videoPreview} target="_blank" rel="noreferrer" style={{ color: "#2563eb", fontWeight: "600", textDecoration: "none" }}>
//                             [Xem Video]
//                           </a>
//                         </div>
//                         {/* NÚT XÓA VIDEO */}
//                         <button 
//                           type="button" 
//                           onClick={handleRemoveVideo} 
//                           style={{ background: "none", border: "none", color: "#dc2626", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}
//                         >
//                           [Xóa]
//                         </button>
//                       </td>
//                     </tr>
//                   )}
//                 </tbody>
//               </table>
//             </div>
//           )}
//         </div>

//         {/* Khu vực Trigger Chọn Tải Lên Media */}
//         <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
//           {/* Upload Video */}
//           <div>
//             <label style={label}>Video sản phẩm</label>
//             <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 10px" }}>Tối đa 100MB (MP4, MOV)</p>
//             <input type="file" accept="video/*" ref={videoRef} onChange={handleVideoChange} style={{ display: "none" }} />
//             <div onClick={() => !uploadingVideo && videoRef.current.click()}
//               style={{ width: "110px", height: "110px", border: "1px dashed #d1d5db", borderRadius: "8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: uploadingVideo ? "wait" : "pointer", backgroundColor: "#f9fafb", position: "relative", overflow: "hidden" }}>
//               {videoPreview
//                 ? <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#000", borderRadius: "8px", opacity: uploadingVideo ? 0.5 : 1 }}><span style={{ color: "white", fontSize: "12px" }}>📹 Đã chọn</span></div>
//                 : <><span style={{ fontSize: "20px", color: "#9ca3af" }}>📤</span><span style={{ fontSize: "13px", color: "#4b5563", marginTop: "4px" }}>Thêm Video</span></>}
//               {uploadingVideo && (
//                 <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
//                   <span style={{ color: "white", fontSize: "10px", fontWeight: "600" }}>⌛ Tải...</span>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Upload PDF */}
//           <div>
//             <label style={label}>Tài liệu đính kèm (PDF)</label>
//             <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 10px" }}>Tài liệu kĩ thuật, catalogue</p>
//             <input type="file" accept="application/pdf" ref={pdfRef} onChange={handlePdfChange} style={{ display: "none" }} />
//             <div onClick={() => !uploadingPdf && pdfRef.current.click()}
//               style={{ width: "110px", height: "110px", border: "1px dashed #d1d5db", borderRadius: "8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: uploadingPdf ? "wait" : "pointer", backgroundColor: "#f9fafb", position: "relative", overflow: "hidden" }}>
//               {pdfUrl
//                 ? <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#dc2626", borderRadius: "8px", opacity: uploadingPdf ? 0.5 : 1 }}><span style={{ color: "white", fontSize: "12px", fontWeight: "500" }}>📄 PDF OK</span></div>
//                 : <><span style={{ fontSize: "20px", color: "#9ca3af" }}>📤</span><span style={{ fontSize: "13px", color: "#4b5563", marginTop: "4px" }}>Thêm PDF</span></>}
//               {uploadingPdf && (
//                 <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
//                   <span style={{ color: "white", fontSize: "10px", fontWeight: "600" }}>⌛ Tải...</span>
//                 </div>
//               )}
//             </div>
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
//             <input type="number" placeholder="0" value={stock} onChange={(e) => setStock(e.target.value)} style={input} />
//             <div style={{ position: "relative" }}>
//               <input type="number" placeholder="0" value={price} onChange={(e) => setPrice(e.target.value)} style={{ ...input, paddingRight: "28px" }} />
//               <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>đ</span>
//             </div>
//             <div style={{ position: "relative" }}>
//               <input type="number" placeholder="0" value={discount} onChange={(e) => setDiscount(e.target.value)} style={{ ...input, paddingRight: "28px" }} />
//               <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>%</span>
//             </div>
//             <input type="text" placeholder="VD: SP-001" value={sku} onChange={(e) => setSku(e.target.value)} style={input} />
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
//         <div style={{ marginBottom: "16px" }}>
//           <label style={label}>Kích thước kiện hàng</label>
//           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
//             {[["Chiều cao", height, setHeight], ["Chiều rộng", width, setWidth], ["Chiều dài", length, setLength]].map(([ph, val, set]) => (
//               <div key={ph} style={{ display: "flex", border: "1px solid #d1d5db", borderRadius: "8px", alignItems: "center" }}>
//                 <input type="number" placeholder={ph} value={val}
//                   onChange={(e) => set(e.target.value)}
//                   onBlur={calculateFees}
//                   style={{ width: "100%", padding: "10px 12px", border: "none", outline: "none", fontSize: "14px" }} />
//                 <span style={{ paddingRight: "12px", color: "#9ca3af", fontSize: "13px", whiteSpace: "nowrap" }}>cm</span>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* Hàng cồng kềnh */}
//         <div style={{ marginBottom: "20px" }}>
//           <div
//             onClick={handleToggleBulky}
//             style={{
//               display: "flex", alignItems: "flex-start", gap: "12px",
//               padding: "14px 16px", borderRadius: "10px", cursor: "pointer",
//               background: isBulky ? "#fff7ed" : "#f9fafb",
//               border: `1px solid ${isBulky ? "#fdba74" : "#e5e7eb"}`,
//             }}
//           >
//             <input
//               type="checkbox"
//               checked={isBulky}
//               onChange={handleToggleBulky}
//               onClick={(e) => e.stopPropagation()}
//               style={{ width: "18px", height: "18px", marginTop: "2px", accentColor: "#ea580c", cursor: "pointer" }}
//             />
//             <div>
//               <div style={{ fontSize: "14px", fontWeight: "600", color: isBulky ? "#c2410c" : "#374151", display: "flex", alignItems: "center", gap: "6px" }}>
//                 📦 Hàng cồng kềnh
//               </div>
//               <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "3px", lineHeight: "1.5" }}>
//                 Áp dụng cho sản phẩm có kích thước lớn nhưng khối lượng thực tế nhỏ (VD: đồ nội thất, khung tranh...).
//                 Cước phí sẽ được tính theo <strong>khối lượng quy đổi</strong> (dài × rộng × cao ÷ 5000) thay vì cân nặng thực,
//                 cộng thêm phụ phí xử lý hàng cồng kềnh.
//               </div>
//             </div>
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

//           {feeError && (
//             <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", fontSize: "13px", color: "#dc2626", marginBottom: "12px" }}>
//               ⚠️ {feeError}
//             </div>
//           )}

//           {shippingMethod === "default" && (
//             <div style={{ padding: "12px 16px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px" }}>
//               <span style={{ fontSize: "13px", color: "#6b7280" }}>Phí vận chuyển J&T Chuẩn (EZ): </span>
//               <strong style={{ fontSize: "15px", color: "#1e40af" }}>
//                 {isCalculatingFee ? "⌛ Đang tính..." : jtFeeDefault ? `${jtFeeDefault.toLocaleString("vi-VN")} đ` : "— Nhập trọng lượng để tính —"}
//               </strong>
//               {isBulky && jtFeeDefault != null && !isCalculatingFee && (
//                 <div style={{ fontSize: "11px", color: "#c2410c", marginTop: "4px" }}>
//                   📦 Đã bao gồm phụ phí hàng cồng kềnh
//                 </div>
//               )}
//             </div>
//           )}

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
//                   <div style={{ textAlign: "right" }}>
//                     <span style={{ fontSize: "13px", fontWeight: "600", color: service.active ? "#1e40af" : "#9ca3af" }}>
//                       {isCalculatingFee && service.active ? "⌛ Đang tính..."
//                         : service.fee ? `${service.fee.toLocaleString("vi-VN")} đ`
//                         : service.active ? "— Nhập trọng lượng —" : "—"}
//                     </span>
//                     {isBulky && service.active && service.fee != null && !isCalculatingFee && (
//                       <div style={{ fontSize: "11px", color: "#c2410c" }}>📦 Đã gồm phụ phí cồng kềnh</div>
//                     )}
//                   </div>
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

//       {/* KHỐI 5: TRẠNG THÁI HIỂN THỊ TRÊN WEB */}
//       <div style={card}>
//         <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 8px", color: "#111827" }}>Trạng thái hiển thị</h3>
//         <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 16px" }}>
//           Sản phẩm mới tạo mặc định <strong>ẩn trên web</strong>. Bật "Hiện trên web" khi đã có đầy đủ thông tin
//           (ảnh chính, mô tả, giá bán, hạng mục, trọng lượng, kích thước).
//         </p>
//         <div style={{
//           display: "flex", alignItems: "center", justifyContent: "space-between",
//           padding: "14px 16px", borderRadius: "10px",
//           background: isActive ? "#f0fdf4" : "#fef3c7",
//           border: `1px solid ${isActive ? "#86efac" : "#fcd34d"}`,
//         }}>
//           <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//             <i className={isActive ? "fas fa-eye" : "fas fa-eye-slash"} style={{ color: isActive ? "#16a34a" : "#d97706", fontSize: 18 }} />
//             <div>
//               <div style={{ fontSize: 14, fontWeight: 600, color: isActive ? "#15803d" : "#92400e" }}>
//                 {isActive ? "Đang hiển thị trên web" : "Đang ẩn trên web"}
//               </div>
//               <div style={{ fontSize: 12, color: isActive ? "#16a34a" : "#b45309", marginTop: 2 }}>
//                 {isActive
//                   ? "Khách hàng có thể thấy và mua sản phẩm này."
//                   : "Sản phẩm chỉ hiện trong admin. Bấm tắt/bật để thay đổi."}
//               </div>
//             </div>
//           </div>
//           <label style={{ position: "relative", display: "inline-block", width: "52px", height: "28px" }}>
//             <input type="checkbox" checked={isActive} onChange={() => setIsActive(!isActive)} style={{ opacity: 0, width: 0, height: 0 }} />
//             <span style={{ position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0,
//               backgroundColor: isActive ? "#10b981" : "#d1d5db", transition: ".4s", borderRadius: "28px" }}>
//               <span style={{ position: "absolute", height: "22px", width: "22px", left: "3px", bottom: "3px",
//                 backgroundColor: "white", transition: ".4s", borderRadius: "50%",
//                 transform: isActive ? "translateX(24px)" : "translateX(0)" }}></span>
//             </span>
//           </label>
//         </div>
//       </div>

//     </div>
//   );
// }

import { fetchJTFeeMock } from "../../jstService.js"; // Cấu hình & hàm gọi API J&T đã tách riêng
import React, { useState, useRef, useCallback } from "react";
import { uploadImage } from "../../api"; // Hàm upload file lên Supabase Storage
import { productGroupsApi } from "../../api";
import { toSlug, saveProduct } from "./productHelpers"; // dùng chung slug + logic lưu sản phẩm

// ─── Lưu / đọc lựa chọn "Cách giao hàng" gần nhất (localStorage) ─────────────
const SHIPPING_STORAGE_KEY = "techtra_last_shipping_choice";

function loadSavedShipping() {
  try {
    const raw = localStorage.getItem(SHIPPING_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─── Quy đổi trọng lượng nhập vào (theo weightUnit) sang KG chuẩn ───────────
// Các hàm tính phí J&T (jtCalculatePriceMock / jtCalculatePrice) đang giả định
// weight luôn là KG. Nếu người dùng chọn đơn vị "g" và không quy đổi trước,
// ví dụ nhập 500 (nghĩa là 500g) sẽ bị hiểu nhầm thành 500kg khi tính phí.
// Hàm này đảm bảo LUÔN gửi giá trị kg thật sự, bất kể đơn vị người dùng chọn.
function toKg(value, unit) {
  const n = parseFloat(value) || 0;
  return unit === "g" ? n / 1000 : n;
}

const SUB_COUNT = 8;

export default function CreateProduct({ onBack, onSaved, initialData = null }) {
  const isEditing = !!initialData;

  // ─── Thông tin cơ bản ───────────────────────────────────────────────────────
  const [productName, setProductName] = useState(initialData?.name        || "");
  const [category,    setCategory]    = useState(initialData?.group_id    || "");
  const [groups,      setGroups]      = useState([]);

  // State description bây giờ sẽ lưu chuỗi dạng HTML thay vì chuỗi thuần (Plain Text)
  const [description, setDescription] = useState(initialData?.description || "");
  const editorRef = useRef(null);

  const [slug,        setSlug]        = useState(initialData?.slug || "");
  const [slugEdited,  setSlugEdited]  = useState(!!initialData?.slug);

  // ─── Hình ảnh ───────────────────────────────────────────────────────────────
  const [mainImage,  setMainImage]  = useState(initialData?.images?.[0]  || null);
  // Ảnh phụ: danh sách URL (string[]). Không giới hạn số lượng.
  const [subImages,  setSubImages]  = useState(() => (initialData?.images || []).slice(1));
  const mainImageRef  = useRef(null);
  const subImagesRef  = useRef(null);

  // ─── Video & Tài liệu PDF (content_file) ────────────────────────────────────
  const [videoFile,      setVideoFile]      = useState(null);
  const [videoPreview,   setVideoPreview]   = useState(initialData?.video_url || null);
  const [pdfUrl,         setPdfUrl]         = useState(initialData?.content_file || null);
  const [pdfName,        setPdfName]        = useState(initialData?.content_file ? "Tai-lieu-da-luu.pdf" : "");

  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingMain,  setUploadingMain]  = useState(false);
  const [uploadingSubs,  setUploadingSubs]  = useState(false);
  const [uploadingPdf,   setUploadingPdf]   = useState(false);

  const videoRef = useRef(null);
  const pdfRef = useRef(null);

  // Synchronize contentEditable content when initialData changes
  React.useEffect(() => {
    if (editorRef.current && initialData?.description) {
      editorRef.current.innerHTML = initialData.description;
    }
  }, [initialData]);

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

  // ─── Mã nhóm (code) tương ứng với hạng mục (group) đang chọn ────────────────
  const selectedGroup = groups.find((g) => String(g.id) === String(category));
  const groupCode     = selectedGroup?.code || null;

  // ─── Bán hàng ───────────────────────────────────────────────────────────────
  const [codEnabled, setCodEnabled]     = useState(initialData?.cod_enabled ?? true);
  // ─── Trạng thái hiển thị trên web ──────────────────────────────────────────
  // Mặc định SP mới luôn ẨN (is_active = false). Admin chủ động bật khi đã có đủ thông tin.
  const [isActive,   setIsActive]       = useState(initialData?.is_active ?? false);

  // ─── Vận chuyển ─────────────────────────────────────────────────────────────
  // Chỉ auto-load lựa chọn "Cách giao hàng" đã lưu khi TẠO MỚI sản phẩm.
  // Khi SỬA sản phẩm có sẵn, luôn ưu tiên dữ liệu gốc (initialData) của chính sản phẩm đó.
  const savedShipping = !isEditing ? loadSavedShipping() : null;

  const [shippingMethod, setShippingMethod] = useState(
    initialData?.shipping_type || savedShipping?.shippingMethod || "default"
  );
  const [weightUnit,     setWeightUnit]     = useState(initialData?.weight_unit   || "g");
  const [weight,         setWeight]         = useState(initialData?.weight?.toString() || "");
  const [height,         setHeight]         = useState(initialData?.height?.toString() || "");
  const [width,          setWidth]          = useState(initialData?.width?.toString()  || "");
  const [length,         setLength]         = useState(initialData?.length?.toString() || "");

  // Hàng cồng kềnh: kích thước lớn, tính cước theo khối lượng quy đổi + phụ phí xử lý
  const [isBulky, setIsBulky] = useState(
    initialData?.is_bulky ?? savedShipping?.isBulky ?? false
  );

  // ─── Thông tin bán hàng ─────────────────────────────────────────────────────
  const [stock,    setStock]    = useState(initialData?.stock?.toString()    || "");
  const [price,    setPrice]    = useState(initialData?.price?.toString()    || "");
  const [discount, setDiscount] = useState(initialData?.discount?.toString() || "");
  const [sku,      setSku]      = useState(initialData?.sku                  || "");

  const [jtFeeDefault, setJtFeeDefault]     = useState(null);
  const [isCalculatingFee, setIsCalculatingFee] = useState(false);
  const [feeError, setFeeError]             = useState("");

  // ─── Danh sách dịch vụ J&T (Tùy chỉnh) ──────────────────────────────────────
  // Thứ tự ưu tiên khôi phục lựa chọn "active":
  //  1) Dữ liệu gốc đã lưu CỦA CHÍNH sản phẩm này (initialData.jt_services) — khi sửa sản phẩm
  //  2) Lựa chọn gần nhất trong localStorage — chỉ áp dụng khi TẠO sản phẩm mới
  //  3) Mặc định: tất cả tắt
  const [jtServices, setJtServices] = useState(() => {
    const defaultServices = [
      { code: "EZ",    name: "J&T Chuyển phát tiêu chuẩn", active: false, fee: null },
      { code: "FAST",  name: "J&T Fast (Giao hàng nhanh)", active: false, fee: null },
      { code: "SUPER", name: "J&T Super (Dịch vụ hỏa tốc)", active: false, fee: null },
    ];

    // Ưu tiên 1: dữ liệu đã lưu của chính sản phẩm (khi sửa sản phẩm có sẵn)
    if (initialData?.jt_services?.length) {
      return defaultServices.map((s) => ({
        ...s,
        active: initialData.jt_services.includes(s.code),
      }));
    }

    // Ưu tiên 2: Auto-load các dịch vụ J&T đã bật ở lần chọn trước (chỉ áp dụng khi tạo SP mới)
    if (!isEditing && savedShipping?.activeCodes?.length) {
      return defaultServices.map((s) => ({
        ...s,
        active: savedShipping.activeCodes.includes(s.code),
      }));
    }

    return defaultServices;
  });

  // ─── Luôn lưu lại lựa chọn "Cách giao hàng" mỗi khi người dùng thay đổi ─────
  // (localStorage chỉ dùng để gợi ý nhanh cho lần TẠO sản phẩm tiếp theo,
  //  dữ liệu thật của từng sản phẩm luôn được lưu vào body khi handleSave)
  React.useEffect(() => {
    try {
      const activeCodes = jtServices.filter((s) => s.active).map((s) => s.code);
      localStorage.setItem(
        SHIPPING_STORAGE_KEY,
        JSON.stringify({ shippingMethod, activeCodes, isBulky })
      );
    } catch {
      // localStorage không khả dụng (VD: chế độ ẩn danh) — bỏ qua, không chặn UI
    }
  }, [shippingMethod, jtServices, isBulky]);

  // ─── Chuẩn hoá kết quả trả về từ fetchJTFeeMock: chấp nhận cả số thuần
  // lẫn object dạng { fee } — tránh hiển thị "[object Object] đ" ────────
  const extractFeeValue = (res) => {
    if (res == null) return null;
    if (typeof res === "number") return res;
    if (typeof res === "object") return res.fee ?? res.total ?? res.amount ?? null;
    return null;
  };

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
      // weight gửi đi cho hàm tính phí LUÔN LÀ KG, bất kể người dùng chọn
      // đơn vị "g" hay "kg" ở form — tránh gửi nhầm số gam làm số kg.
      const weightKg = toKg(weight, weightUnit);
      const params = { weight: weightKg, height, width, length, isBulky };

      if (shippingMethod === "default") {
        const res = await fetchJTFeeMock({ ...params, serviceCode: "EZ" });
        setJtFeeDefault(extractFeeValue(res));
      } else {
        const updated = await Promise.all(
          jtServices.map(async (s) => {
            if (!s.active) return s;
            const res = await fetchJTFeeMock({ ...params, serviceCode: s.code });
            return { ...s, fee: extractFeeValue(res) };
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
  }, [weight, weightUnit, height, width, length, shippingMethod, jtServices, isBulky]);

  // ─── Tự động tính phí ngay khi mở form nếu đã có sẵn trọng lượng ─────────────
  // (áp dụng cho cả trường hợp auto-load cách giao hàng đã lưu lẫn khi sửa SP có sẵn)
  React.useEffect(() => {
    if (weight && parseFloat(weight) > 0) {
      calculateFees();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleJtService = async (index) => {
    const updated = jtServices.map((s, i) =>
      i === index ? { ...s, active: !s.active, fee: null } : s
    );
    setJtServices(updated);

    const toggled = updated[index];
    if (toggled.active && weight) {
      setIsCalculatingFee(true);
      try {
        // Cùng quy tắc quy đổi g → kg như trong calculateFees, tránh 2 nơi
        // tính khác nhau nếu người dùng bật/tắt dịch vụ trước khi blur input.
        const weightKg = toKg(weight, weightUnit);
        const res = await fetchJTFeeMock({ weight: weightKg, height, width, length, serviceCode: toggled.code, isBulky });
        setJtServices((prev) => prev.map((s, i) => i === index ? { ...s, fee: extractFeeValue(res) } : s));
      } catch {
        setFeeError("Lỗi tính phí dịch vụ này.");
      } finally {
        setIsCalculatingFee(false);
      }
    }
  };

  // Bật/tắt "Hàng cồng kềnh" → tính lại phí ngay
  const handleToggleBulky = () => {
    setIsBulky((prev) => !prev);
    setTimeout(calculateFees, 0);
  };

  // ─── Handlers Upload ─────────────────────────────────────────────────────────
  const handleMainImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMainImage(URL.createObjectURL(file));
    setUploadingMain(true);
    try {
      const url = await uploadImage(file, "products/main");
      setMainImage(url);
    } catch (err) {
      alert("Lỗi upload ảnh chính: " + err.message);
      setMainImage(null);
    }
    setUploadingMain(false);
  };

  const handleSubImagesChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    // 1) Hiển thị preview tạm (object URL) ngay cho mượt
    const tempPreviews = files.map((f) => URL.createObjectURL(f));
    setSubImages((prev) => [...prev, ...tempPreviews]);
    setUploadingSubs(true);
    try {
      // 2) Upload song song từng ảnh
      const uploaded = await Promise.all(
        files.map(async (f) => {
          try { return await uploadImage(f, "products/sub"); }
          catch (err) {
            alert(`Lỗi upload ảnh "${f.name}": ${err.message}`);
            return null;
          }
        })
      );
      // 3) Thay thế các preview tạm bằng URL thật (filter null nếu lỗi)
      setSubImages((prev) => {
        const out = [...prev];
        out.splice(out.length - tempPreviews.length, tempPreviews.length, ...uploaded.filter(Boolean));
        return out;
      });
    } finally {
      setUploadingSubs(false);
      if (subImagesRef.current) subImagesRef.current.value = "";
    }
  };

  const removeSubImage = (idx) => {
    setSubImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const setMainImageFromSub = (url) => {
    setMainImage(url);
    setSubImages((prev) => prev.filter((u) => u !== url));
  };

  const handleVideoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      alert("Video vượt quá 100MB, vui lòng chọn file nhỏ hơn.");
      return;
    }
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setUploadingVideo(true);
    try {
      const url = await uploadImage(file, "products/video");
      setVideoPreview(url);
    } catch (err) {
      alert("Lỗi upload video: " + err.message);
      setVideoPreview(initialData?.video_url || null);
      setVideoFile(null);
    } finally {
      setUploadingVideo(false);
    }
  };

  const handlePdfChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Vui lòng chỉ tải lên file định dạng PDF.");
      return;
    }

    setPdfName(file.name);
    setUploadingPdf(true);
    try {
      const url = await uploadImage(file, "products/documents");
      setPdfUrl(url);

      const pdfHtmlChunk = `
        <div><br/></div>
        <div style="margin: 12px 0; padding: 12px; border: 1px solid #fca5a5; background-color: #fef2f2; border-radius: 8px; display: inline-flex; align-items: center; gap: 10px;" contenteditable="false">
          <img src="https://cdn-icons-png.flaticon.com/512/337/337946.png" alt="PDF Icon" style="width: 32px; height: 32px; object-fit: contain;" />
          <div>
            <div style="font-weight: 600; color: #b91c1c; font-size: 13px;">Tài liệu kỹ thuật đính kèm:</div>
            <a href="${url}" target="_blank" rel="noreferrer" style="color: #2563eb; text-decoration: underline; font-size: 13px; font-weight: 500;">
              ${file.name} (Bấm để xem/tải về)
            </a>
          </div>
        </div>
        <div><br/></div>
      `;

      if (editorRef.current) {
        editorRef.current.innerHTML += pdfHtmlChunk;
        setDescription(editorRef.current.innerHTML);
      }

    } catch (err) {
      alert("Lỗi upload file PDF: " + err.message);
      setPdfUrl(null);
      setPdfName("");
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleRemovePdf = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa tài liệu PDF này không?")) {
      setPdfUrl(null);
      setPdfName("");
    }
  };

  const handleRemoveVideo = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa video này không?")) {
      setVideoFile(null);
      setVideoPreview(null);
    }
  };

  // ─── Lưu sản phẩm: validate + build payload + gọi API, tất cả nằm trong
  // saveProduct() (productHelpers.js) để dùng lại được ở nơi khác ───────────
  const handleSave = async () => {
    const form = {
      productName, mainImage, category, description,
      stock, price, discount, sku, slug,
      codEnabled, isActive, shippingMethod, jtServices,
      weight, weightUnit, height, width, length, isBulky,
      subImages, videoPreview, pdfUrl,
    };

    const result = await saveProduct(form, {
      isEditing,
      productId: initialData?.id,
    });

    if (!result.success) {
      if (result.missing) {
        alert(
          "Vui lòng nhập đầy đủ các trường bắt buộc trước khi lưu:\n\n• " +
          result.missing.join("\n• ")
        );
      } else {
        alert("Lỗi lưu: " + result.error);
      }
      return;
    }

    onSaved?.();
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
            disabled={uploadingMain || uploadingSubs || uploadingVideo || uploadingPdf}
            style={{ padding: "9px 22px", borderRadius: "8px", border: "none", background: (uploadingMain || uploadingSubs || uploadingVideo || uploadingPdf) ? "#93c5fd" : "#2563eb", color: "white", fontWeight: "600", cursor: (uploadingMain || uploadingSubs || uploadingVideo || uploadingPdf) ? "not-allowed" : "pointer", fontSize: "14px" }}
          >
            {(uploadingMain || uploadingSubs || uploadingVideo || uploadingPdf) ? "⌛ Đang upload..." : "Lưu"}
          </button>
        </div>
      </div>

      {/* KHỐI 1: THÔNG TIN CƠ BẢN */}
      <div style={card}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 16px", color: "#111827" }}>Thông tin cơ bản</h3>

        {/* Hình ảnh */}
        <div style={{ marginBottom: "20px" }}>
          <label style={label}>
            <span style={req}>*</span> Hình ảnh
            <span style={{ fontSize: "12px", color: "#9ca3af", fontWeight: "normal" }}>
              {" "}(1 ảnh chính + có thể chọn nhiều ảnh phụ cùng lúc)
            </span>
          </label>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "10px", alignItems: "flex-start" }}>
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

            <div style={{ flex: 1, minWidth: 280 }}>
              <input
                type="file"
                accept="image/*"
                multiple
                ref={subImagesRef}
                onChange={handleSubImagesChange}
                style={{ display: "none" }}
              />
              <div
                onClick={() => !uploadingSubs && subImagesRef.current.click()}
                style={{
                  width: "100%", minHeight: "44px", padding: "10px 14px",
                  border: "1px dashed #d1d5db", borderRadius: "8px",
                  display: "flex", alignItems: "center", gap: 8,
                  cursor: uploadingSubs ? "wait" : "pointer",
                  backgroundColor: "#f9fafb", color: "#4b5563", fontSize: 13,
                }}
              >
                <i className="fas fa-images" />
                {uploadingSubs
                  ? "Đang tải ảnh lên..."
                  : subImages.length > 0
                    ? `Đã có ${subImages.length} ảnh phụ — bấm để thêm ảnh khác`
                    : "Bấm để chọn nhiều ảnh phụ (Ctrl/Shift + click để chọn nhiều)"}
              </div>

              {subImages.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                  {subImages.map((img, idx) => (
                    <div key={idx} style={{ position: "relative", width: 72, height: 72 }}>
                      <img
                        src={img}
                        alt={`Sub ${idx + 1}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 6, border: "1px solid #e5e7eb" }}
                        onError={(e) => { e.currentTarget.style.opacity = 0.3; }}
                      />
                      <button
                        type="button"
                        onClick={() => removeSubImage(idx)}
                        title="Xóa ảnh này"
                        style={{
                          position: "absolute", top: -6, right: -6,
                          width: 22, height: 22, borderRadius: "50%",
                          background: "#dc2626", color: "white", border: "2px solid white",
                          cursor: "pointer", fontSize: 11, lineHeight: 1, padding: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
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
              <option key={g.id} value={g.id}>
                {g.code ? `[${g.code}] ` : ""}{g.name}
              </option>
            ))}
          </select>
          {category && (
            <div style={{ marginTop: "6px", fontSize: "12px", color: "#6b7280" }}>
              Mã nhóm:{" "}
              <span style={{ fontFamily: "'Courier New', monospace", fontWeight: "600", color: groupCode ? "#374151" : "#9ca3af" }}>
                {groupCode || "— nhóm này chưa có mã —"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* KHỐI 2: CHI TIẾT SẢN PHẨM & Ô MÔ TẢ ĐA PHƯƠNG TIỆN */}
      <div style={card}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 16px", color: "#111827" }}>Chi tiết sản phẩm</h3>

        <div style={{ marginBottom: "20px" }}>
          <label style={label}><span style={req}>*</span> Mô tả</label>

          <div
            ref={editorRef}
            contentEditable={true}
            onInput={(e) => setDescription(e.currentTarget.innerHTML)}
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              boxSizing: "border-box",
              fontSize: "14px",
              outline: "none",
              minHeight: "160px",
              backgroundColor: "white",
              overflowY: "auto"
            }}
          />
          {!description && (
            <p style={{ fontSize: "12px", color: "#9ca3af", margin: "4px 0 0 4px" }}>
              Gõ mô tả hoặc bấm nút "Thêm PDF" ở dưới để nhúng văn bản và hình ảnh tài liệu trực tiếp vào đây.
            </p>
          )}

          {(pdfUrl || videoPreview) && (
            <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden", marginTop: "16px", background: "white" }}>
              <div style={{ background: "#f3f4f6", padding: "10px 14px", borderBottom: "1px solid #e5e7eb", fontSize: "13px", fontWeight: "600", color: "#374151" }}>
                📋 Danh mục quản lý tệp tin gốc
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                <tbody>
                  {pdfUrl && (
                    <tr style={{ borderBottom: videoPreview ? "1px solid #e5e7eb" : "none" }}>
                      <td style={{ padding: "12px 14px", fontWeight: "600", color: "#4b5563", width: "140px", backgroundColor: "#fafafa" }}>Tài liệu kĩ thuật</td>
                      <td style={{ padding: "12px 14px", color: "#111827", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <span style={{ marginRight: "10px" }}>📄 {pdfName || "Tài liệu kỹ thuật sản phẩm"}</span>
                          <a href={pdfUrl} target="_blank" rel="noreferrer" style={{ color: "#2563eb", fontWeight: "600", textDecoration: "none" }}>
                            [Xem file gốc]
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemovePdf}
                          style={{ background: "none", border: "none", color: "#dc2626", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}
                        >
                          [Xóa]
                        </button>
                      </td>
                    </tr>
                  )}
                  {videoPreview && (
                    <tr>
                      <td style={{ padding: "12px 14px", fontWeight: "600", color: "#4b5563", width: "140px", backgroundColor: "#fafafa" }}>Video giới thiệu</td>
                      <td style={{ padding: "12px 14px", color: "#111827", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <span style={{ marginRight: "10px" }}>📹 Video review chi tiết sản phẩm</span>
                          <a href={videoPreview} target="_blank" rel="noreferrer" style={{ color: "#2563eb", fontWeight: "600", textDecoration: "none" }}>
                            [Xem Video]
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveVideo}
                          style={{ background: "none", border: "none", color: "#dc2626", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}
                        >
                          [Xóa]
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <div>
            <label style={label}>Video sản phẩm</label>
            <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 10px" }}>Tối đa 100MB (MP4, MOV)</p>
            <input type="file" accept="video/*" ref={videoRef} onChange={handleVideoChange} style={{ display: "none" }} />
            <div onClick={() => !uploadingVideo && videoRef.current.click()}
              style={{ width: "110px", height: "110px", border: "1px dashed #d1d5db", borderRadius: "8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: uploadingVideo ? "wait" : "pointer", backgroundColor: "#f9fafb", position: "relative", overflow: "hidden" }}>
              {videoPreview
                ? <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#000", borderRadius: "8px", opacity: uploadingVideo ? 0.5 : 1 }}><span style={{ color: "white", fontSize: "12px" }}>📹 Đã chọn</span></div>
                : <><span style={{ fontSize: "20px", color: "#9ca3af" }}>📤</span><span style={{ fontSize: "13px", color: "#4b5563", marginTop: "4px" }}>Thêm Video</span></>}
              {uploadingVideo && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "white", fontSize: "10px", fontWeight: "600" }}>⌛ Tải...</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label style={label}>Tài liệu đính kèm (PDF)</label>
            <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 10px" }}>Tài liệu kĩ thuật, catalogue</p>
            <input type="file" accept="application/pdf" ref={pdfRef} onChange={handlePdfChange} style={{ display: "none" }} />
            <div onClick={() => !uploadingPdf && pdfRef.current.click()}
              style={{ width: "110px", height: "110px", border: "1px dashed #d1d5db", borderRadius: "8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: uploadingPdf ? "wait" : "pointer", backgroundColor: "#f9fafb", position: "relative", overflow: "hidden" }}>
              {pdfUrl
                ? <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#dc2626", borderRadius: "8px", opacity: uploadingPdf ? 0.5 : 1 }}><span style={{ color: "white", fontSize: "12px", fontWeight: "500" }}>📄 PDF OK</span></div>
                : <><span style={{ fontSize: "20px", color: "#9ca3af" }}>📤</span><span style={{ fontSize: "13px", color: "#4b5563", marginTop: "4px" }}>Thêm PDF</span></>}
              {uploadingPdf && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "white", fontSize: "10px", fontWeight: "600" }}>⌛ Tải...</span>
                </div>
              )}
            </div>
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
            <input type="number" placeholder="0" value={stock} onChange={(e) => setStock(e.target.value)} style={input} />
            <div style={{ position: "relative" }}>
              <input type="number" placeholder="0" value={price} onChange={(e) => setPrice(e.target.value)} style={{ ...input, paddingRight: "28px" }} />
              <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>đ</span>
            </div>
            <div style={{ position: "relative" }}>
              <input type="number" placeholder="0" value={discount} onChange={(e) => setDiscount(e.target.value)} style={{ ...input, paddingRight: "28px" }} />
              <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>%</span>
            </div>
            <input type="text" placeholder="VD: SP-001" value={sku} onChange={(e) => setSku(e.target.value)} style={input} />
          </div>
        </div>
      </div>

      {/* KHỐI 4: VẬN CHUYỂN + API J&T */}
      <div style={card}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 16px", color: "#111827" }}>Vận chuyển</h3>

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

        <div style={{ marginBottom: "16px" }}>
          <label style={label}>Kích thước kiện hàng</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            {[["Chiều cao", height, setHeight], ["Chiều rộng", width, setWidth], ["Chiều dài", length, setLength]].map(([ph, val, set]) => (
              <div key={ph} style={{ display: "flex", border: "1px solid #d1d5db", borderRadius: "8px", alignItems: "center" }}>
                <input type="number" placeholder={ph} value={val}
                  onChange={(e) => set(e.target.value)}
                  onBlur={calculateFees}
                  style={{ width: "100%", padding: "10px 12px", border: "none", outline: "none", fontSize: "14px" }} />
                <span style={{ paddingRight: "12px", color: "#9ca3af", fontSize: "13px", whiteSpace: "nowrap" }}>cm</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <div
            onClick={handleToggleBulky}
            style={{
              display: "flex", alignItems: "flex-start", gap: "12px",
              padding: "14px 16px", borderRadius: "10px", cursor: "pointer",
              background: isBulky ? "#fff7ed" : "#f9fafb",
              border: `1px solid ${isBulky ? "#fdba74" : "#e5e7eb"}`,
            }}
          >
            <input
              type="checkbox"
              checked={isBulky}
              onChange={handleToggleBulky}
              onClick={(e) => e.stopPropagation()}
              style={{ width: "18px", height: "18px", marginTop: "2px", accentColor: "#ea580c", cursor: "pointer" }}
            />
            <div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: isBulky ? "#c2410c" : "#374151", display: "flex", alignItems: "center", gap: "6px" }}>
                📦 Hàng cồng kềnh
              </div>
              <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "3px", lineHeight: "1.5" }}>
                Áp dụng cho sản phẩm có kích thước lớn nhưng khối lượng thực tế nhỏ (VD: đồ nội thất, khung tranh...).
                Cước phí sẽ được tính theo <strong>khối lượng quy đổi</strong> (dài × rộng × cao ÷ 5000) thay vì cân nặng thực,
                cộng thêm phụ phí xử lý hàng cồng kềnh.
              </div>
            </div>
          </div>
        </div>

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

          {feeError && (
            <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", fontSize: "13px", color: "#dc2626", marginBottom: "12px" }}>
              ⚠️ {feeError}
            </div>
          )}

          {shippingMethod === "default" && (
            <div style={{ padding: "12px 16px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px" }}>
              <span style={{ fontSize: "13px", color: "#6b7280" }}>Phí vận chuyển J&T Chuẩn (EZ): </span>
              <strong style={{ fontSize: "15px", color: "#1e40af" }}>
                {isCalculatingFee ? "⌛ Đang tính..." : jtFeeDefault != null ? `${Number(jtFeeDefault).toLocaleString("vi-VN")} đ` : "— Nhập trọng lượng để tính —"}
              </strong>
              {isBulky && jtFeeDefault != null && !isCalculatingFee && (
                <div style={{ fontSize: "11px", color: "#c2410c", marginTop: "4px" }}>
                  📦 Đã bao gồm phụ phí hàng cồng kềnh
                </div>
              )}
            </div>
          )}

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
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: service.active ? "#1e40af" : "#9ca3af" }}>
                      {isCalculatingFee && service.active ? "⌛ Đang tính..."
                        : service.fee != null ? `${Number(service.fee).toLocaleString("vi-VN")} đ`
                        : service.active ? "— Nhập trọng lượng —" : "—"}
                    </span>
                    {isBulky && service.active && service.fee != null && !isCalculatingFee && (
                      <div style={{ fontSize: "11px", color: "#c2410c" }}>📦 Đã gồm phụ phí cồng kềnh</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "16px 0" }} />

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

      {/* KHỐI 5: TRẠNG THÁI HIỂN THỊ TRÊN WEB */}
      <div style={card}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 8px", color: "#111827" }}>Trạng thái hiển thị</h3>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 16px" }}>
          Sản phẩm mới tạo mặc định <strong>ẩn trên web</strong>. Bật "Hiện trên web" khi đã có đầy đủ thông tin
          (ảnh chính, mô tả, giá bán, hạng mục, trọng lượng, kích thước).
        </p>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 16px", borderRadius: "10px",
          background: isActive ? "#f0fdf4" : "#fef3c7",
          border: `1px solid ${isActive ? "#86efac" : "#fcd34d"}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <i className={isActive ? "fas fa-eye" : "fas fa-eye-slash"} style={{ color: isActive ? "#16a34a" : "#d97706", fontSize: 18 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: isActive ? "#15803d" : "#92400e" }}>
                {isActive ? "Đang hiển thị trên web" : "Đang ẩn trên web"}
              </div>
              <div style={{ fontSize: 12, color: isActive ? "#16a34a" : "#b45309", marginTop: 2 }}>
                {isActive
                  ? "Khách hàng có thể thấy và mua sản phẩm này."
                  : "Sản phẩm chỉ hiện trong admin. Bấm tắt/bật để thay đổi."}
              </div>
            </div>
          </div>
          <label style={{ position: "relative", display: "inline-block", width: "52px", height: "28px" }}>
            <input type="checkbox" checked={isActive} onChange={() => setIsActive(!isActive)} style={{ opacity: 0, width: 0, height: 0 }} />
            <span style={{ position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: isActive ? "#10b981" : "#d1d5db", transition: ".4s", borderRadius: "28px" }}>
              <span style={{ position: "absolute", height: "22px", width: "22px", left: "3px", bottom: "3px",
                backgroundColor: "white", transition: ".4s", borderRadius: "50%",
                transform: isActive ? "translateX(24px)" : "translateX(0)" }}></span>
            </span>
          </label>
        </div>
      </div>

    </div>
  );
}