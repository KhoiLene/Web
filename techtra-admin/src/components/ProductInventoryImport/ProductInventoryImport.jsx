// // import React, { useState, useEffect, useCallback } from "react";
// // import * as XLSX from "xlsx";
// // import { productsApi } from "../../api";
// // import "./ProductInventory.css";

// // // ─── Icon nhỏ, dùng chung, kế thừa màu chữ hiện tại (currentColor) ─────────
// // const IconSpinner = () => (
// //   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: "pi-spin 0.8s linear infinite" }}>
// //     <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
// //     <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
// //   </svg>
// // );
// // const IconRefresh = () => (
// //   <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
// //     <path d="M20 11a8 8 0 1 0-2.34 5.66M20 5v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
// //   </svg>
// // );
// // const IconWarning = () => (
// //   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
// //     <path d="M12 3 2 20h20L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
// //     <path d="M12 10v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
// //   </svg>
// // );
// // const IconCheck = () => (
// //   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
// //     <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
// //   </svg>
// // );
// // const IconExcel = () => (
// //   <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
// //     <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8" />
// //     <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
// //   </svg>
// // );
// // const IconUpload = () => (
// //   <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
// //     <path d="M12 15V3m0 0 4 4m-4-4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
// //     <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
// //   </svg>
// // );

// // // ─── Danh sách các trường có thể map từ file CSV (chế độ import nâng cao) ───
// // const PRICE_FIELDS = [
// //   { key: "__skip__",    label: "— Bỏ qua —" },
// //   { key: "sku",         label: "Mã SKU" },
// //   { key: "name",        label: "Tên sản phẩm" },
// //   { key: "price",       label: "Giá gốc" },
// //   { key: "discount",    label: "% Giảm giá" },
// //   { key: "final_price", label: "Giá bán (sau giảm)" },
// //   { key: "stock",       label: "Tồn kho" },
// //   { key: "unit",        label: "Đơn vị tính" },
// //   { key: "group_name",  label: "Tên nhóm" },
// //   { key: "note",        label: "Ghi chú" },
// //   { key: "sort_order",  label: "Thứ tự" },
// // ];

// // const NUMERIC_FIELDS = new Set(["price", "discount", "final_price", "stock", "sort_order"]);

// // const TABS = [
// //   { key: "shelf", label: "Sản phẩm trên kệ" },
// //   { key: "excel", label: "Tăng tồn kho từ Excel" },
// //   { key: "csv",   label: "Import CSV nâng cao" },
// // ];

// // // ─── Helper: parse CSV đơn giản (không phụ thuộc thư viện ngoài) ────────────
// // function parseCsv(text) {
// //   const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
// //   if (!lines.length) return { headers: [], rows: [] };

// //   const splitLine = (line) => {
// //     const cells = [];
// //     let cur = "";
// //     let inQuotes = false;
// //     for (let i = 0; i < line.length; i++) {
// //       const ch = line[i];
// //       if (ch === '"') {
// //         if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
// //         else inQuotes = !inQuotes;
// //       } else if (ch === "," && !inQuotes) {
// //         cells.push(cur); cur = "";
// //       } else {
// //         cur += ch;
// //       }
// //     }
// //     cells.push(cur);
// //     return cells.map((c) => c.trim());
// //   };

// //   const headers = splitLine(lines[0]);
// //   const rows = lines.slice(1).map(splitLine);
// //   return { headers, rows };
// // }

// // // ─── Helper: tìm chỉ số cột theo các từ khóa gần đúng (không phân biệt hoa/thường, dấu) ───
// // function findColumnIndex(headers, keywords) {
// //   const normalize = (s) =>
// //     String(s)
// //       .toLowerCase()
// //       .normalize("NFD")
// //       .replace(/[\u0300-\u036f]/g, "")
// //       .replace(/[^a-z0-9]/g, "");
// //   const normalizedHeaders = headers.map(normalize);
// //   for (const kw of keywords) {
// //     const nkw = normalize(kw);
// //     const idx = normalizedHeaders.findIndex((h) => h.includes(nkw));
// //     if (idx !== -1) return idx;
// //   }
// //   return -1;
// // }

// // export default function ProductInventoryImport({ onDone }) {
// //   const [tab, setTab] = useState("shelf");

// //   // ─────────────────────────────────────────────────────────────────────
// //   // TAB 1: Sản phẩm đang trên kệ — sửa trực tiếp tồn kho / giảm giá
// //   // ─────────────────────────────────────────────────────────────────────
// //   const [shelfProducts, setShelfProducts] = useState([]);
// //   const [shelfLoading,  setShelfLoading]  = useState(false);
// //   const [shelfError,    setShelfError]    = useState("");
// //   const [shelfSearch,   setShelfSearch]   = useState("");
// //   const [editValues,    setEditValues]    = useState({}); // { id: { stock, discount } }
// //   const [savingId,      setSavingId]      = useState(null);

// //   const fetchShelfProducts = useCallback(async () => {
// //     setShelfLoading(true);
// //     setShelfError("");
// //     try {
// //       const res = await productsApi.getAll({
// //         status: "active",
// //         search: shelfSearch.trim() || undefined,
// //         limit: 200,
// //         page: 1,
// //       });
// //       const data = res?.data || [];
// //       setShelfProducts(data);
// //       const initEdit = {};
// //       data.forEach((p) => {
// //         initEdit[p.id] = {
// //           sku: p.sku ?? "",
// //           price: p.price?.toString() ?? "0",
// //           stock: p.stock?.toString() ?? "0",
// //           discount: p.discount?.toString() ?? "0",
// //         };
// //       });
// //       setEditValues(initEdit);
// //     } catch (err) {
// //       setShelfError(err.message || "Không thể tải danh sách sản phẩm trên kệ.");
// //     } finally {
// //       setShelfLoading(false);
// //     }
// //   }, [shelfSearch]);

// //   useEffect(() => {
// //     if (tab === "shelf") fetchShelfProducts();
// //   }, [tab, fetchShelfProducts]);

// //   const handleEditChange = (id, field, value) => {
// //     setEditValues((prev) => ({
// //       ...prev,
// //       [id]: { ...prev[id], [field]: value },
// //     }));
// //   };

// //   const handleSaveRow = async (id) => {
// //     const vals = editValues[id];
// //     if (!vals) return;
// //     const stockNum = parseInt(vals.stock, 10);
// //     const discountNum = parseFloat(vals.discount);

// //     if (Number.isNaN(stockNum) || stockNum < 0) {
// //       alert("Số lượng tồn kho không hợp lệ.");
// //       return;
// //     }
// //     if (Number.isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
// //       alert("Phần trăm giảm giá phải trong khoảng 0–100.");
// //       return;
// //     }

// //     setSavingId(id);
// //     try {
// //       await productsApi.update(id, { stock: stockNum, discount: discountNum });
// //       setShelfProducts((prev) =>
// //         prev.map((p) => (p.id === id ? { ...p, stock: stockNum, discount: discountNum } : p))
// //       );
// //     } catch (err) {
// //       alert("Lỗi lưu sản phẩm: " + err.message);
// //     } finally {
// //       setSavingId(null);
// //     }
// //   };

// //   // ─────────────────────────────────────────────────────────────────────
// //   // TAB 2: Tăng tồn kho hàng loạt từ file Excel (.xlsx/.xls)
// //   // Quy tắc: sản phẩm khớp SKU → CỘNG THÊM số lượng vào tồn kho hiện có.
// //   //          Sản phẩm không khớp SKU → bỏ qua, KHÔNG tạo sản phẩm mới.
// //   // ─────────────────────────────────────────────────────────────────────
// //   const [excelFileName, setExcelFileName] = useState("");
// //   const [excelRows,     setExcelRows]     = useState([]); // [{ sku, qty }]
// //   const [excelParsing,  setExcelParsing]  = useState(false);
// //   const [excelError,    setExcelError]    = useState("");
// //   const [excelApplying, setExcelApplying] = useState(false);
// //   const [excelResult,   setExcelResult]   = useState(null); // { increased: [], skipped: [] }

// //   const handleExcelFile = (e) => {
// //     const file = e.target.files?.[0];
// //     if (!file) return;
// //     setExcelError("");
// //     setExcelResult(null);
// //     setExcelFileName(file.name);
// //     setExcelParsing(true);

// //     const reader = new FileReader();
// //     reader.onload = (evt) => {
// //       try {
// //         const wb = XLSX.read(evt.target.result, { type: "array" });
// //         const sheet = wb.Sheets[wb.SheetNames[0]];
// //         const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

// //         if (!matrix.length) {
// //           setExcelError("File Excel không có dữ liệu.");
// //           setExcelRows([]);
// //           return;
// //         }

// //         const headers = matrix[0].map((h) => String(h).trim());
// //         const skuIdx = findColumnIndex(headers, ["sku", "ma sku", "mã sku", "ma san pham"]);
// //         const qtyIdx = findColumnIndex(headers, ["so luong", "số lượng", "quantity", "qty", "so luong them"]);

// //         if (skuIdx === -1 || qtyIdx === -1) {
// //           setExcelError(
// //             "Không tìm thấy cột 'SKU' và/hoặc cột 'Số lượng'. File cần có 2 cột: Mã SKU và Số lượng cần thêm."
// //           );
// //           setExcelRows([]);
// //           return;
// //         }

// //         const parsed = matrix.slice(1)
// //           .map((row) => ({
// //             sku: String(row[skuIdx] ?? "").trim(),
// //             qty: parseFloat(String(row[qtyIdx] ?? "").replace(/,/g, "")),
// //           }))
// //           .filter((r) => r.sku && !Number.isNaN(r.qty) && r.qty > 0);

// //         if (!parsed.length) {
// //           setExcelError("Không có dòng nào hợp lệ (thiếu SKU hoặc số lượng ≤ 0).");
// //         }
// //         setExcelRows(parsed);
// //       } catch (err) {
// //         setExcelError("Không đọc được file Excel: " + err.message);
// //         setExcelRows([]);
// //       } finally {
// //         setExcelParsing(false);
// //       }
// //     };
// //     reader.readAsArrayBuffer(file);
// //   };
// // edit
// //   const handleApplyExcelStock = async () => {
// //     if (!excelRows.length) return;
// //     setExcelApplying(true);
// //     setExcelError("");

// //     try {
// //       // Gộp số lượng nếu 1 SKU xuất hiện nhiều dòng trong file
// //       const qtyBySku = new Map();
// //       excelRows.forEach(({ sku, qty }) => {
// //         qtyBySku.set(sku, (qtyBySku.get(sku) || 0) + qty);
// //       });

// //       const skus = [...qtyBySku.keys()];
// //       const existingProducts = await productsApi.getManyBySku(skus);
// //       const existingBySku = new Map(existingProducts.map((p) => [p.sku, p]));

// //       const increased = [];
// //       const skipped = [];

// //       for (const sku of skus) {
// //         const addQty = qtyBySku.get(sku);
// //         const existing = existingBySku.get(sku);

// //         if (!existing) {
// //           // Sản phẩm không tồn tại → bỏ qua, không tạo mới
// //           skipped.push({ sku, reason: "Không tìm thấy sản phẩm với SKU này" });
// //           continue;
// //         }

// //         const currentStock = parseInt(existing.stock, 10) || 0;
// //         const newStock = currentStock + addQty;

// //         try {
// //           await productsApi.updateBySku(sku, { stock: newStock });
// //           increased.push({ sku, from: currentStock, to: newStock, added: addQty });
// //         } catch (err) {
// //           skipped.push({ sku, reason: err.message });
// //         }
// //       }

// //       setExcelResult({ increased, skipped });
// //       if (tab === "shelf") fetchShelfProducts();
// //     } catch (err) {
// //       setExcelError("Lỗi khi cập nhật tồn kho: " + err.message);
// //     } finally {
// //       setExcelApplying(false);
// //     }
// //   };

// //   const handleResetExcel = () => {
// //     setExcelFileName("");
// //     setExcelRows([]);
// //     setExcelError("");
// //     setExcelResult(null);
// //   };

// //   // ─────────────────────────────────────────────────────────────────────
// //   // TAB 3: Import CSV nâng cao — map tự do từng cột sang các trường sản phẩm
// //   // ─────────────────────────────────────────────────────────────────────
// //   const [csvFileName, setCsvFileName] = useState("");
// //   const [csvHeaders,  setCsvHeaders]  = useState([]);
// //   const [csvRows,     setCsvRows]     = useState([]);
// //   const [csvMapping,  setCsvMapping]  = useState({});
// //   const [csvStep,     setCsvStep]     = useState("upload"); // upload | mapping | result
// //   const [csvSaving,   setCsvSaving]   = useState(false);
// //   const [csvResult,   setCsvResult]   = useState(null);
// //   const [csvError,    setCsvError]    = useState("");

// //   const handleCsvFile = useCallback((e) => {
// //     const file = e.target.files?.[0];
// //     if (!file) return;
// //     setCsvError("");
// //     setCsvFileName(file.name);

// //     const reader = new FileReader();
// //     reader.onload = () => {
// //       try {
// //         const { headers: hs, rows: rs } = parseCsv(String(reader.result));
// //         if (!hs.length) {
// //           setCsvError("File không có dữ liệu hoặc sai định dạng CSV.");
// //           return;
// //         }
// //         setCsvHeaders(hs);
// //         setCsvRows(rs);

// //         const guessed = {};
// //         hs.forEach((h, idx) => {
// //           const norm = h.toLowerCase().replace(/[^a-z0-9]/g, "");
// //           const match = PRICE_FIELDS.find((f) => {
// //             const fNorm = f.key.toLowerCase().replace(/[^a-z0-9]/g, "");
// //             return f.key !== "__skip__" && (norm === fNorm || norm.includes(fNorm));
// //           });
// //           guessed[idx] = match ? match.key : "__skip__";
// //         });
// //         setCsvMapping(guessed);
// //         setCsvStep("mapping");
// //       } catch (err) {
// //         setCsvError("Không đọc được file: " + err.message);
// //       }
// //     };
// //     reader.readAsText(file, "utf-8");
// //   }, []);

// //   const handleCsvMappingChange = (headerIndex, fieldKey) => {
// //     setCsvMapping((prev) => ({ ...prev, [headerIndex]: fieldKey }));
// //   };

// //   const csvMappedFieldKeys = Object.values(csvMapping).filter((k) => k !== "__skip__");
// //   const csvHasSkuMapping = Object.values(csvMapping).some((key) => key === "sku");

// //   const buildCsvRecords = () => {
// //     return csvRows.map((row) => {
// //       const record = {};
// //       csvHeaders.forEach((_, idx) => {
// //         const fieldKey = csvMapping[idx];
// //         if (!fieldKey || fieldKey === "__skip__") return;
// //         let value = row[idx] ?? "";
// //         if (NUMERIC_FIELDS.has(fieldKey)) {
// //           const num = parseFloat(String(value).replace(/,/g, ""));
// //           value = Number.isNaN(num) ? null : num;
// //         }
// //         record[fieldKey] = value;
// //       });
// //       return record;
// //     });
// //   };

// //   const handleCsvImport = async () => {
// //     if (!csvHasSkuMapping) {
// //       alert("Vui lòng ánh xạ ít nhất cột 'Mã SKU' để có thể tìm đúng sản phẩm cần cập nhật.");
// //       return;
// //     }
// //     const records = buildCsvRecords().filter((r) => r.sku);
// //     if (!records.length) {
// //       alert("Không có dòng nào hợp lệ (thiếu SKU) để cập nhật.");
// //       return;
// //     }

// //     setCsvSaving(true);
// //     setCsvError("");
// //     const success = [];
// //     const failed = [];

// //     try {
// //       const skus = records.map((r) => r.sku);
// //       const existingProducts = await productsApi.getManyBySku(skus);
// //       const existingSkus = new Set(existingProducts.map((p) => p.sku));

// //       for (const rec of records) {
// //         if (!existingSkus.has(rec.sku)) {
// //           failed.push({ sku: rec.sku, error: "Không tìm thấy sản phẩm với SKU này" });
// //           continue;
// //         }
// //         const { sku, ...updateBody } = rec;
// //         try {
// //           await productsApi.updateBySku(sku, updateBody);
// //           success.push(sku);
// //         } catch (err) {
// //           failed.push({ sku: rec.sku, error: err.message });
// //         }
// //       }

// //       setCsvResult({ success: success.length, failed });
// //       setCsvStep("result");
// //     } catch (err) {
// //       setCsvError("Lỗi khi cập nhật hàng loạt: " + err.message);
// //     } finally {
// //       setCsvSaving(false);
// //     }
// //   };

// //   const handleResetCsv = () => {
// //     setCsvFileName("");
// //     setCsvHeaders([]);
// //     setCsvRows([]);
// //     setCsvMapping({});
// //     setCsvResult(null);
// //     setCsvError("");
// //     setCsvStep("upload");
// //   };

// //   return (
// //     <div className="pi-card">
// //       <style>{`@keyframes pi-spin { to { transform: rotate(360deg); } }`}</style>
// //       <h3 className="pi-title">Quản lý tồn kho &amp; giảm giá</h3>

// //       <div className="pi-tabs">
// //         {TABS.map((t) => (
// //           <button
// //             key={t.key}
// //             className={`pi-tab-btn ${tab === t.key ? "pi-tab-btn-active" : ""}`}
// //             onClick={() => setTab(t.key)}
// //           >
// //             {t.label}
// //           </button>
// //         ))}
// //       </div>

// //       {/* ─── TAB 1: Sản phẩm trên kệ ─────────────────────────────────── */}
// //       {tab === "shelf" && (
// //         <div className="pi-shelf-frame">
// //           <div className="pi-shelf-frame-header">
// //             <h4 className="pi-shelf-frame-title">Danh sách sản phẩm đang trên kệ</h4>
// //             <span className="pi-shelf-frame-count">{shelfProducts.length} sản phẩm</span>
// //           </div>

// //           <div className="pi-shelf">
// //             <div className="pi-shelf-toolbar">
// //               <input
// //                 type="text"
// //                 className="pi-shelf-search"
// //                 placeholder="Tìm theo tên sản phẩm..."
// //                 value={shelfSearch}
// //                 onChange={(e) => setShelfSearch(e.target.value)}
// //               />
// //               <button
// //                 className="pi-btn pi-btn-secondary"
// //                 onClick={fetchShelfProducts}
// //                 disabled={shelfLoading}
// //                 style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
// //               >
// //                 {shelfLoading ? <IconSpinner /> : <IconRefresh />}
// //                 {shelfLoading ? "Đang tải..." : "Làm mới"}
// //               </button>
// //             </div>

// //             {shelfError && (
// //               <div className="pi-import-error"><IconWarning />{shelfError}</div>
// //             )}

// //             <div className="pi-shelf-table-wrap">
// //               <table className="pi-shelf-table">
// //                 <thead>
// //                   <tr>
// //                     <th>Sản phẩm</th>
// //                     <th>SKU</th>
// //                     <th>Giá gốc</th>
// //                     <th>Tồn kho</th>
// //                     <th>Giảm giá (%)</th>
// //                     <th>Giá sau giảm</th>
// //                     <th></th>
// //                   </tr>
// //                 </thead>
// //                 <tbody>
// //                   {!shelfLoading && shelfProducts.length === 0 && (
// //                     <tr>
// //                       <td colSpan={7} className="pi-shelf-empty">Không có sản phẩm nào đang trên kệ.</td>
// //                     </tr>
// //                   )}
// //                   {shelfProducts.map((p) => {
// //                     const vals = editValues[p.id] || { stock: "0", discount: "0" };
// //                     const isDirty =
// //                       vals.stock !== (p.stock?.toString() ?? "0") ||
// //                       vals.discount !== (p.discount?.toString() ?? "0");

// //                     // Giá sau giảm = Giá gốc × (1 − % giảm giá / 100), tính lại ngay khi
// //                     // người dùng gõ số vào ô "Giảm giá (%)" (chưa cần bấm Lưu).
// //                     const originalPrice = Number(p.price) || 0;
// //                     const discountPct   = Math.min(100, Math.max(0, parseFloat(vals.discount) || 0));
// //                     const finalPrice    = Math.round(originalPrice * (1 - discountPct / 100));

// //                     return (
// //                       <tr key={p.id}>
// //                         <td className="pi-shelf-name" title={p.name}>{p.name}</td>
// //                         <td className="pi-shelf-sku">{p.sku || "—"}</td>
// //                         <td className="pi-shelf-price">{p.price?.toLocaleString("vi-VN") || 0} đ</td>
// //                         <td>
// //                           <input
// //                             type="number"
// //                             className="pi-shelf-input"
// //                             value={vals.stock}
// //                             onChange={(e) => handleEditChange(p.id, "stock", e.target.value)}
// //                           />
// //                         </td>
// //                         <td>
// //                           <input
// //                             type="number"
// //                             className="pi-shelf-input"
// //                             value={vals.discount}
// //                             onChange={(e) => handleEditChange(p.id, "discount", e.target.value)}
// //                           />
// //                         </td>
// //                         <td className="pi-shelf-final-price">
// //                           {finalPrice.toLocaleString("vi-VN")} đ
// //                           {discountPct > 0 && (
// //                             <span className="pi-shelf-final-price-badge">-{discountPct}%</span>
// //                           )}
// //                         </td>
// //                         <td>
// //                           <button
// //                             className="pi-btn pi-btn-primary pi-btn-sm"
// //                             disabled={!isDirty || savingId === p.id}
// //                             onClick={() => handleSaveRow(p.id)}
// //                           >
// //                             {savingId === p.id ? <IconSpinner /> : "Lưu"}
// //                           </button>
// //                         </td>
// //                       </tr>
// //                     );
// //                   })}
// //                 </tbody>
// //               </table>
// //             </div>
// //           </div>
// //         </div>
// //       )}

// //       {/* ─── TAB 2: Tăng tồn kho từ Excel ─────────────────────────────── */}
// //       {tab === "excel" && (
// //         <div className="pi-import-upload">
// //           <p className="pi-import-hint">
// //             Tải lên file Excel (.xlsx/.xls) gồm 2 cột: <strong>Mã SKU</strong> và <strong>Số lượng cần thêm</strong>.
// //             Nếu SKU đã có trong hệ thống, số lượng nhập sẽ được <strong>cộng thêm</strong> vào tồn kho hiện tại.
// //             Nếu SKU không tồn tại, dòng đó sẽ <strong>bị bỏ qua</strong> (không tạo sản phẩm mới).
// //           </p>

// //           <label className="pi-import-dropzone">
// //             <input
// //               type="file"
// //               accept=".xlsx,.xls"
// //               onChange={handleExcelFile}
// //               style={{ display: "none" }}
// //             />
// //             <span className="pi-import-icon"><IconExcel /></span>
// //             <span>{excelFileName || "Bấm để chọn file Excel"}</span>
// //           </label>

// //           {excelParsing && (
// //             <div className="pi-import-hint" style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
// //               <IconSpinner /> Đang đọc file...
// //             </div>
// //           )}
// //           {excelError && <div className="pi-import-error"><IconWarning />{excelError}</div>}

// //           {excelRows.length > 0 && !excelResult && (
// //             <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
// //               <div className="pi-import-hint" style={{ margin: 0 }}>
// //                 Đã đọc <strong>{excelRows.length}</strong> dòng hợp lệ từ file <strong>{excelFileName}</strong>.
// //               </div>
// //               <div className="pi-result-table-wrap">
// //                 <table className="pi-result-table">
// //                   <thead>
// //                     <tr>
// //                       <th>SKU</th>
// //                       <th>Số lượng thêm</th>
// //                     </tr>
// //                   </thead>
// //                   <tbody>
// //                     {excelRows.slice(0, 50).map((r, i) => (
// //                       <tr key={i}>
// //                         <td>{r.sku}</td>
// //                         <td>+{r.qty}</td>
// //                       </tr>
// //                     ))}
// //                   </tbody>
// //                 </table>
// //                 {excelRows.length > 50 && (
// //                   <div className="pi-shelf-empty">... và {excelRows.length - 50} dòng khác</div>
// //                 )}
// //               </div>

// //               <div className="pi-import-actions">
// //                 <button className="pi-btn pi-btn-secondary" onClick={handleResetExcel} disabled={excelApplying}>
// //                   Chọn file khác
// //                 </button>
// //                 <button
// //                   className="pi-btn pi-btn-primary"
// //                   onClick={handleApplyExcelStock}
// //                   disabled={excelApplying}
// //                   style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
// //                 >
// //                   {excelApplying && <IconSpinner />}
// //                   {excelApplying ? "Đang cập nhật..." : `Tăng tồn kho cho ${excelRows.length} SKU`}
// //                 </button>
// //               </div>
// //             </div>
// //           )}

// //           {excelResult && (
// //             <div className="pi-import-result" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
// //               <div className="pi-result-summary" style={{ margin: 0 }}>
// //                 <div className="pi-result-success" style={{ display: "flex", alignItems: "center", gap: 8 }}>
// //                   <IconCheck /> Đã tăng tồn kho: <strong>{excelResult.increased.length}</strong> sản phẩm
// //                 </div>
// //                 {excelResult.skipped.length > 0 && (
// //                   <div className="pi-result-failed" style={{ display: "flex", alignItems: "center", gap: 8 }}>
// //                     <IconWarning /> Bỏ qua (không khớp SKU): <strong>{excelResult.skipped.length}</strong> dòng
// //                   </div>
// //                 )}
// //               </div>

// //               {excelResult.increased.length > 0 && (
// //                 <div className="pi-result-table-wrap">
// //                   <table className="pi-result-table">
// //                     <thead>
// //                       <tr>
// //                         <th>SKU</th>
// //                         <th>Tồn cũ</th>
// //                         <th>Thêm</th>
// //                         <th>Tồn mới</th>
// //                       </tr>
// //                     </thead>
// //                     <tbody>
// //                       {excelResult.increased.map((r, i) => (
// //                         <tr key={i}>
// //                           <td>{r.sku}</td>
// //                           <td>{r.from}</td>
// //                           <td>+{r.added}</td>
// //                           <td><strong>{r.to}</strong></td>
// //                         </tr>
// //                       ))}
// //                     </tbody>
// //                   </table>
// //                 </div>
// //               )}

// //               {excelResult.skipped.length > 0 && (
// //                 <div className="pi-result-table-wrap" style={{ marginTop: 10 }}>
// //                   <table className="pi-result-table">
// //                     <thead>
// //                       <tr>
// //                         <th>SKU</th>
// //                         <th>Lý do bỏ qua</th>
// //                       </tr>
// //                     </thead>
// //                     <tbody>
// //                       {excelResult.skipped.map((r, i) => (
// //                         <tr key={i}>
// //                           <td>{r.sku}</td>
// //                           <td>{r.reason}</td>
// //                         </tr>
// //                       ))}
// //                     </tbody>
// //                   </table>
// //                 </div>
// //               )}

// //               <div className="pi-import-actions">
// //                 <button className="pi-btn pi-btn-secondary" onClick={handleResetExcel}>
// //                   Import file khác
// //                 </button>
// //                 <button className="pi-btn pi-btn-primary" onClick={() => onDone?.()}>
// //                   Hoàn tất
// //                 </button>
// //               </div>
// //             </div>
// //           )}
// //         </div>
// //       )}

// //       {/* ─── TAB 3: Import CSV nâng cao ───────────────────────────────── */}
// //       {tab === "csv" && (
// //         <>
// //           {csvStep === "upload" && (
// //             <div className="pi-import-upload">
// //               <p className="pi-import-hint">
// //                 Tải lên file CSV chứa danh sách sản phẩm cần cập nhật giá, tồn kho, giảm giá...
// //                 File cần có ít nhất 1 cột chứa <strong>Mã SKU</strong> để xác định đúng sản phẩm.
// //               </p>
// //               <label className="pi-import-dropzone">
// //                 <input type="file" accept=".csv,text/csv" onChange={handleCsvFile} style={{ display: "none" }} />
// //                 <span className="pi-import-icon"><IconUpload /></span>
// //                 <span>{csvFileName || "Bấm để chọn file CSV"}</span>
// //               </label>
// //               {csvError && <div className="pi-import-error"><IconWarning />{csvError}</div>}
// //             </div>
// //           )}

// //           {csvStep === "mapping" && (
// //             <div className="pi-import-mapping">
// //               <p className="pi-import-hint">
// //                 Đã đọc <strong>{csvRows.length}</strong> dòng từ file <strong>{csvFileName}</strong>.
// //                 Chọn trường tương ứng cho từng cột bên dưới:
// //               </p>

// //               <div className="pi-mapping-list">
// //                 {csvHeaders.map((h, idx) => (
// //                   <div key={idx} className="pi-mapping-row">
// //                     <div className="pi-mapping-col">
// //                       <span className="pi-mapping-col-label">Cột file:</span>
// //                       <span className="pi-mapping-col-name">{h}</span>
// //                       <span className="pi-mapping-sample">
// //                         {csvRows[0]?.[idx] ? `VD: ${csvRows[0][idx]}` : ""}
// //                       </span>
// //                     </div>
// //                     <span className="pi-mapping-arrow">→</span>
// //                     <select
// //                       className="pi-mapping-select"
// //                       value={csvMapping[idx] || "__skip__"}
// //                       onChange={(e) => handleCsvMappingChange(idx, e.target.value)}
// //                     >
// //                       {PRICE_FIELDS.map((f) => (
// //                         <option key={f.key} value={f.key}>{f.label}</option>
// //                       ))}
// //                     </select>
// //                   </div>
// //                 ))}
// //               </div>

// //               {!csvHasSkuMapping && (
// //                 <div className="pi-import-warning">
// //                   <IconWarning /> Bạn cần ánh xạ ít nhất 1 cột thành <strong>Mã SKU</strong> để hệ thống biết cập nhật sản phẩm nào.
// //                 </div>
// //               )}
// //               {csvError && <div className="pi-import-error"><IconWarning />{csvError}</div>}

// //               <div className="pi-import-actions">
// //                 <button className="pi-btn pi-btn-secondary" onClick={handleResetCsv} disabled={csvSaving}>
// //                   Chọn file khác
// //                 </button>
// //                 <button
// //                   className="pi-btn pi-btn-primary"
// //                   onClick={handleCsvImport}
// //                   disabled={csvSaving || !csvMappedFieldKeys.length}
// //                   style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
// //                 >
// //                   {csvSaving && <IconSpinner />}
// //                   {csvSaving ? "Đang cập nhật..." : `Cập nhật ${csvRows.length} sản phẩm`}
// //                 </button>
// //               </div>
// //             </div>
// //           )}

// //           {csvStep === "result" && csvResult && (
// //             <div className="pi-import-result">
// //               <div className="pi-result-summary">
// //                 <div className="pi-result-success" style={{ display: "flex", alignItems: "center", gap: 8 }}>
// //                   <IconCheck /> Cập nhật thành công: <strong>{csvResult.success}</strong> sản phẩm
// //                 </div>
// //                 {csvResult.failed.length > 0 && (
// //                   <div className="pi-result-failed" style={{ display: "flex", alignItems: "center", gap: 8 }}>
// //                     <IconWarning /> Thất bại: <strong>{csvResult.failed.length}</strong> dòng
// //                   </div>
// //                 )}
// //               </div>

// //               {csvResult.failed.length > 0 && (
// //                 <div className="pi-result-table-wrap">
// //                   <table className="pi-result-table">
// //                     <thead>
// //                       <tr><th>SKU</th><th>Lỗi</th></tr>
// //                     </thead>
// //                     <tbody>
// //                       {csvResult.failed.map((f, i) => (
// //                         <tr key={i}><td>{f.sku}</td><td>{f.error}</td></tr>
// //                       ))}
// //                     </tbody>
// //                   </table>
// //                 </div>
// //               )}

// //               <div className="pi-import-actions">
// //                 <button className="pi-btn pi-btn-secondary" onClick={handleResetCsv}>
// //                   Import file khác
// //                 </button>
// //                 <button className="pi-btn pi-btn-primary" onClick={() => onDone?.()}>
// //                   Hoàn tất
// //                 </button>
// //               </div>
// //             </div>
// //           )}
// //         </>
// //       )}
// //     </div>
// //   );
// // }

// import React, { useState, useEffect, useCallback } from "react";
// import * as XLSX from "xlsx";
// import { productsApi } from "../../api";
// import "./ProductInventory.css";

// // ─── Icon nhỏ, dùng chung, kế thừa màu chữ hiện tại (currentColor) ─────────
// const IconSpinner = () => (
//   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: "pi-spin 0.8s linear infinite" }}>
//     <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
//     <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
//   </svg>
// );
// const IconRefresh = () => (
//   <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
//     <path d="M20 11a8 8 0 1 0-2.34 5.66M20 5v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
//   </svg>
// );
// const IconWarning = () => (
//   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
//     <path d="M12 3 2 20h20L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
//     <path d="M12 10v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
//   </svg>
// );
// const IconCheck = () => (
//   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
//     <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
//   </svg>
// );
// const IconExcel = () => (
//   <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
//     <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8" />
//     <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
//   </svg>
// );
// const IconUpload = () => (
//   <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
//     <path d="M12 15V3m0 0 4 4m-4-4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
//     <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
//   </svg>
// );

// // ─── Danh sách các trường có thể map từ file CSV (chế độ import nâng cao) ───
// const PRICE_FIELDS = [
//   { key: "__skip__",    label: "— Bỏ qua —" },
//   { key: "sku",         label: "Mã SKU" },
//   { key: "name",        label: "Tên sản phẩm" },
//   { key: "price",       label: "Giá gốc" },
//   { key: "discount",    label: "% Giảm giá" },
//   { key: "final_price", label: "Giá bán (sau giảm)" },
//   { key: "stock",       label: "Tồn kho" },
//   { key: "unit",        label: "Đơn vị tính" },
//   { key: "group_name",  label: "Tên nhóm" },
//   { key: "note",        label: "Ghi chú" },
//   { key: "sort_order",  label: "Thứ tự" },
// ];

// const NUMERIC_FIELDS = new Set(["price", "discount", "final_price", "stock", "sort_order"]);

// const TABS = [
//   { key: "shelf", label: "Sản phẩm trên kệ" },
//   { key: "excel", label: "Tăng tồn kho từ Excel" },
//   { key: "csv",   label: "Import CSV nâng cao" },
// ];

// // ─── Helper: parse CSV đơn giản (không phụ thuộc thư viện ngoài) ────────────
// function parseCsv(text) {
//   const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
//   if (!lines.length) return { headers: [], rows: [] };

//   const splitLine = (line) => {
//     const cells = [];
//     let cur = "";
//     let inQuotes = false;
//     for (let i = 0; i < line.length; i++) {
//       const ch = line[i];
//       if (ch === '"') {
//         if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
//         else inQuotes = !inQuotes;
//       } else if (ch === "," && !inQuotes) {
//         cells.push(cur); cur = "";
//       } else {
//         cur += ch;
//       }
//     }
//     cells.push(cur);
//     return cells.map((c) => c.trim());
//   };

//   const headers = splitLine(lines[0]);
//   const rows = lines.slice(1).map(splitLine);
//   return { headers, rows };
// }

// // ─── Helper: tìm chỉ số cột theo các từ khóa gần đúng (không phân biệt hoa/thường, dấu) ───
// function findColumnIndex(headers, keywords) {
//   const normalize = (s) =>
//     String(s)
//       .toLowerCase()
//       .normalize("NFD")
//       .replace(/[\u0300-\u036f]/g, "")
//       .replace(/[^a-z0-9]/g, "");
//   const normalizedHeaders = headers.map(normalize);
//   for (const kw of keywords) {
//     const nkw = normalize(kw);
//     const idx = normalizedHeaders.findIndex((h) => h.includes(nkw));
//     if (idx !== -1) return idx;
//   }
//   return -1;
// }

// export default function ProductInventoryImport({ onDone }) {
//   const [tab, setTab] = useState("shelf");

//   // ─────────────────────────────────────────────────────────────────────
//   // TAB 1: Sản phẩm đang trên kệ — sửa trực tiếp SKU / giá gốc / tồn kho / giảm giá
//   // ─────────────────────────────────────────────────────────────────────
//   const [shelfProducts, setShelfProducts] = useState([]);
//   const [shelfLoading,  setShelfLoading]  = useState(false);
//   const [shelfError,    setShelfError]    = useState("");
//   const [shelfSearch,   setShelfSearch]   = useState("");
//   const [editValues,    setEditValues]    = useState({}); // { id: { sku, price, stock, discount } }
//   const [savingId,      setSavingId]      = useState(null);

//   const fetchShelfProducts = useCallback(async () => {
//     setShelfLoading(true);
//     setShelfError("");
//     try {
//       const res = await productsApi.getAll({
//         status: "active",
//         search: shelfSearch.trim() || undefined,
//         limit: 200,
//         page: 1,
//       });
//       const data = res?.data || [];
//       setShelfProducts(data);
//       const initEdit = {};
//       data.forEach((p) => {
//         initEdit[p.id] = {
//           sku: p.sku ?? "",
//           price: p.price?.toString() ?? "0",
//           stock: p.stock?.toString() ?? "0",
//           discount: p.discount?.toString() ?? "0",
//         };
//       });
//       setEditValues(initEdit);
//     } catch (err) {
//       setShelfError(err.message || "Không thể tải danh sách sản phẩm trên kệ.");
//     } finally {
//       setShelfLoading(false);
//     }
//   }, [shelfSearch]);

//   useEffect(() => {
//     if (tab === "shelf") fetchShelfProducts();
//   }, [tab, fetchShelfProducts]);

//   const handleEditChange = (id, field, value) => {
//     setEditValues((prev) => ({
//       ...prev,
//       [id]: { ...prev[id], [field]: value },
//     }));
//   };

//   const handleSaveRow = async (id) => {
//     const vals = editValues[id];
//     if (!vals) return;

//     const skuVal = (vals.sku || "").trim();
//     const priceNum = parseFloat(vals.price);
//     const stockNum = parseInt(vals.stock, 10);
//     const discountNum = parseFloat(vals.discount);

//     if (!skuVal) {
//       alert("Mã SKU không được để trống.");
//       return;
//     }
//     if (Number.isNaN(priceNum) || priceNum < 0) {
//       alert("Giá gốc không hợp lệ.");
//       return;
//     }
//     if (Number.isNaN(stockNum) || stockNum < 0) {
//       alert("Số lượng tồn kho không hợp lệ.");
//       return;
//     }
//     if (Number.isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
//       alert("Phần trăm giảm giá phải trong khoảng 0–100.");
//       return;
//     }

//     // Nếu đổi SKU, kiểm tra trùng với sản phẩm khác đang hiển thị (trong trang hiện tại)
//     const original = shelfProducts.find((p) => p.id === id);
//     const skuChanged = original && skuVal !== (original.sku ?? "");
//     if (skuChanged) {
//       const dupSku = shelfProducts.some((p) => p.id !== id && (p.sku || "") === skuVal);
//       if (dupSku) {
//         alert("Mã SKU này đã được dùng cho sản phẩm khác đang hiển thị.");
//         return;
//       }
//       if (!window.confirm(
//         `Bạn đang đổi SKU từ "${original.sku || "(trống)"}" thành "${skuVal}".\n\n` +
//         "Lưu ý: đổi SKU có thể ảnh hưởng tới các luồng import Excel/CSV hoặc dữ liệu khác đang tham chiếu theo SKU cũ. Tiếp tục?"
//       )) {
//         return;
//       }
//     }

//     setSavingId(id);
//     try {
//       await productsApi.update(id, {
//         sku: skuVal,
//         price: priceNum,
//         stock: stockNum,
//         discount: discountNum,
//       });
//       setShelfProducts((prev) =>
//         prev.map((p) =>
//           p.id === id
//             ? { ...p, sku: skuVal, price: priceNum, stock: stockNum, discount: discountNum }
//             : p
//         )
//       );
//     } catch (err) {
//       alert("Lỗi lưu sản phẩm: " + err.message);
//     } finally {
//       setSavingId(null);
//     }
//   };

//   // ─────────────────────────────────────────────────────────────────────
//   // TAB 2: Tăng tồn kho hàng loạt từ file Excel (.xlsx/.xls)
//   // Quy tắc: sản phẩm khớp SKU → CỘNG THÊM số lượng vào tồn kho hiện có.
//   //          Sản phẩm không khớp SKU → bỏ qua, KHÔNG tạo sản phẩm mới.
//   // ─────────────────────────────────────────────────────────────────────
//   const [excelFileName, setExcelFileName] = useState("");
//   const [excelRows,     setExcelRows]     = useState([]); // [{ sku, qty }]
//   const [excelParsing,  setExcelParsing]  = useState(false);
//   const [excelError,    setExcelError]    = useState("");
//   const [excelApplying, setExcelApplying] = useState(false);
//   const [excelResult,   setExcelResult]   = useState(null); // { increased: [], skipped: [] }

//   const handleExcelFile = (e) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     setExcelError("");
//     setExcelResult(null);
//     setExcelFileName(file.name);
//     setExcelParsing(true);

//     const reader = new FileReader();
//     reader.onload = (evt) => {
//       try {
//         const wb = XLSX.read(evt.target.result, { type: "array" });
//         const sheet = wb.Sheets[wb.SheetNames[0]];
//         const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

//         if (!matrix.length) {
//           setExcelError("File Excel không có dữ liệu.");
//           setExcelRows([]);
//           return;
//         }

//         const headers = matrix[0].map((h) => String(h).trim());
//         const skuIdx = findColumnIndex(headers, ["sku", "ma sku", "mã sku", "ma san pham"]);
//         const qtyIdx = findColumnIndex(headers, ["so luong", "số lượng", "quantity", "qty", "so luong them"]);

//         if (skuIdx === -1 || qtyIdx === -1) {
//           setExcelError(
//             "Không tìm thấy cột 'SKU' và/hoặc cột 'Số lượng'. File cần có 2 cột: Mã SKU và Số lượng cần thêm."
//           );
//           setExcelRows([]);
//           return;
//         }

//         const parsed = matrix.slice(1)
//           .map((row) => ({
//             sku: String(row[skuIdx] ?? "").trim(),
//             qty: parseFloat(String(row[qtyIdx] ?? "").replace(/,/g, "")),
//           }))
//           .filter((r) => r.sku && !Number.isNaN(r.qty) && r.qty > 0);

//         if (!parsed.length) {
//           setExcelError("Không có dòng nào hợp lệ (thiếu SKU hoặc số lượng ≤ 0).");
//         }
//         setExcelRows(parsed);
//       } catch (err) {
//         setExcelError("Không đọc được file Excel: " + err.message);
//         setExcelRows([]);
//       } finally {
//         setExcelParsing(false);
//       }
//     };
//     reader.readAsArrayBuffer(file);
//   };

//   const handleApplyExcelStock = async () => {
//     if (!excelRows.length) return;
//     setExcelApplying(true);
//     setExcelError("");

//     try {
//       // Gộp số lượng nếu 1 SKU xuất hiện nhiều dòng trong file
//       const qtyBySku = new Map();
//       excelRows.forEach(({ sku, qty }) => {
//         qtyBySku.set(sku, (qtyBySku.get(sku) || 0) + qty);
//       });

//       const skus = [...qtyBySku.keys()];
//       const existingProducts = await productsApi.getManyBySku(skus);
//       const existingBySku = new Map(existingProducts.map((p) => [p.sku, p]));

//       const increased = [];
//       const skipped = [];

//       for (const sku of skus) {
//         const addQty = qtyBySku.get(sku);
//         const existing = existingBySku.get(sku);

//         if (!existing) {
//           // Sản phẩm không tồn tại → bỏ qua, không tạo mới
//           skipped.push({ sku, reason: "Không tìm thấy sản phẩm với SKU này" });
//           continue;
//         }

//         const currentStock = parseInt(existing.stock, 10) || 0;
//         const newStock = currentStock + addQty;

//         try {
//           await productsApi.updateBySku(sku, { stock: newStock });
//           increased.push({ sku, from: currentStock, to: newStock, added: addQty });
//         } catch (err) {
//           skipped.push({ sku, reason: err.message });
//         }
//       }

//       setExcelResult({ increased, skipped });
//       if (tab === "shelf") fetchShelfProducts();
//     } catch (err) {
//       setExcelError("Lỗi khi cập nhật tồn kho: " + err.message);
//     } finally {
//       setExcelApplying(false);
//     }
//   };

//   const handleResetExcel = () => {
//     setExcelFileName("");
//     setExcelRows([]);
//     setExcelError("");
//     setExcelResult(null);
//   };

//   // ─────────────────────────────────────────────────────────────────────
//   // TAB 3: Import CSV nâng cao — map tự do từng cột sang các trường sản phẩm
//   // ─────────────────────────────────────────────────────────────────────
//   const [csvFileName, setCsvFileName] = useState("");
//   const [csvHeaders,  setCsvHeaders]  = useState([]);
//   const [csvRows,     setCsvRows]     = useState([]);
//   const [csvMapping,  setCsvMapping]  = useState({});
//   const [csvStep,     setCsvStep]     = useState("upload"); // upload | mapping | result
//   const [csvSaving,   setCsvSaving]   = useState(false);
//   const [csvResult,   setCsvResult]   = useState(null);
//   const [csvError,    setCsvError]    = useState("");

//   const handleCsvFile = useCallback((e) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     setCsvError("");
//     setCsvFileName(file.name);

//     const reader = new FileReader();
//     reader.onload = () => {
//       try {
//         const { headers: hs, rows: rs } = parseCsv(String(reader.result));
//         if (!hs.length) {
//           setCsvError("File không có dữ liệu hoặc sai định dạng CSV.");
//           return;
//         }
//         setCsvHeaders(hs);
//         setCsvRows(rs);

//         const guessed = {};
//         hs.forEach((h, idx) => {
//           const norm = h.toLowerCase().replace(/[^a-z0-9]/g, "");
//           const match = PRICE_FIELDS.find((f) => {
//             const fNorm = f.key.toLowerCase().replace(/[^a-z0-9]/g, "");
//             return f.key !== "__skip__" && (norm === fNorm || norm.includes(fNorm));
//           });
//           guessed[idx] = match ? match.key : "__skip__";
//         });
//         setCsvMapping(guessed);
//         setCsvStep("mapping");
//       } catch (err) {
//         setCsvError("Không đọc được file: " + err.message);
//       }
//     };
//     reader.readAsText(file, "utf-8");
//   }, []);

//   const handleCsvMappingChange = (headerIndex, fieldKey) => {
//     setCsvMapping((prev) => ({ ...prev, [headerIndex]: fieldKey }));
//   };

//   const csvMappedFieldKeys = Object.values(csvMapping).filter((k) => k !== "__skip__");
//   const csvHasSkuMapping = Object.values(csvMapping).some((key) => key === "sku");

//   const buildCsvRecords = () => {
//     return csvRows.map((row) => {
//       const record = {};
//       csvHeaders.forEach((_, idx) => {
//         const fieldKey = csvMapping[idx];
//         if (!fieldKey || fieldKey === "__skip__") return;
//         let value = row[idx] ?? "";
//         if (NUMERIC_FIELDS.has(fieldKey)) {
//           const num = parseFloat(String(value).replace(/,/g, ""));
//           value = Number.isNaN(num) ? null : num;
//         }
//         record[fieldKey] = value;
//       });
//       return record;
//     });
//   };

//   const handleCsvImport = async () => {
//     if (!csvHasSkuMapping) {
//       alert("Vui lòng ánh xạ ít nhất cột 'Mã SKU' để có thể tìm đúng sản phẩm cần cập nhật.");
//       return;
//     }
//     const records = buildCsvRecords().filter((r) => r.sku);
//     if (!records.length) {
//       alert("Không có dòng nào hợp lệ (thiếu SKU) để cập nhật.");
//       return;
//     }

//     setCsvSaving(true);
//     setCsvError("");
//     const success = [];
//     const failed = [];

//     try {
//       const skus = records.map((r) => r.sku);
//       const existingProducts = await productsApi.getManyBySku(skus);
//       const existingSkus = new Set(existingProducts.map((p) => p.sku));

//       for (const rec of records) {
//         if (!existingSkus.has(rec.sku)) {
//           failed.push({ sku: rec.sku, error: "Không tìm thấy sản phẩm với SKU này" });
//           continue;
//         }
//         const { sku, ...updateBody } = rec;
//         try {
//           await productsApi.updateBySku(sku, updateBody);
//           success.push(sku);
//         } catch (err) {
//           failed.push({ sku: rec.sku, error: err.message });
//         }
//       }

//       setCsvResult({ success: success.length, failed });
//       setCsvStep("result");
//     } catch (err) {
//       setCsvError("Lỗi khi cập nhật hàng loạt: " + err.message);
//     } finally {
//       setCsvSaving(false);
//     }
//   };

//   const handleResetCsv = () => {
//     setCsvFileName("");
//     setCsvHeaders([]);
//     setCsvRows([]);
//     setCsvMapping({});
//     setCsvResult(null);
//     setCsvError("");
//     setCsvStep("upload");
//   };

//   return (
//     <div className="pi-card">
//       <style>{`@keyframes pi-spin { to { transform: rotate(360deg); } }`}</style>
//       <h3 className="pi-title">Quản lý tồn kho &amp; giảm giá</h3>

//       <div className="pi-tabs">
//         {TABS.map((t) => (
//           <button
//             key={t.key}
//             className={`pi-tab-btn ${tab === t.key ? "pi-tab-btn-active" : ""}`}
//             onClick={() => setTab(t.key)}
//           >
//             {t.label}
//           </button>
//         ))}
//       </div>

//       {/* ─── TAB 1: Sản phẩm trên kệ ─────────────────────────────────── */}
//       {tab === "shelf" && (
//         <div className="pi-shelf-frame">
//           <div className="pi-shelf-frame-header">
//             <h4 className="pi-shelf-frame-title">Danh sách sản phẩm đang trên kệ</h4>
//             <span className="pi-shelf-frame-count">{shelfProducts.length} sản phẩm</span>
//           </div>

//           <div className="pi-shelf">
//             <div className="pi-shelf-toolbar">
//               <input
//                 type="text"
//                 className="pi-shelf-search"
//                 placeholder="Tìm theo tên sản phẩm..."
//                 value={shelfSearch}
//                 onChange={(e) => setShelfSearch(e.target.value)}
//               />
//               <button
//                 className="pi-btn pi-btn-secondary"
//                 onClick={fetchShelfProducts}
//                 disabled={shelfLoading}
//                 style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
//               >
//                 {shelfLoading ? <IconSpinner /> : <IconRefresh />}
//                 {shelfLoading ? "Đang tải..." : "Làm mới"}
//               </button>
//             </div>

//             {shelfError && (
//               <div className="pi-import-error"><IconWarning />{shelfError}</div>
//             )}

//             <div className="pi-shelf-table-wrap">
//               <table className="pi-shelf-table">
//                 <thead>
//                   <tr>
//                     <th>Sản phẩm</th>
//                     <th>SKU</th>
//                     <th>Giá gốc</th>
//                     <th>Tồn kho</th>
//                     <th>Giảm giá (%)</th>
//                     <th>Giá sau giảm</th>
//                     <th></th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {!shelfLoading && shelfProducts.length === 0 && (
//                     <tr>
//                       <td colSpan={7} className="pi-shelf-empty">Không có sản phẩm nào đang trên kệ.</td>
//                     </tr>
//                   )}
//                   {shelfProducts.map((p) => {
//                     const vals = editValues[p.id] || { sku: "", price: "0", stock: "0", discount: "0" };
//                     const isDirty =
//                       vals.sku !== (p.sku ?? "") ||
//                       vals.price !== (p.price?.toString() ?? "0") ||
//                       vals.stock !== (p.stock?.toString() ?? "0") ||
//                       vals.discount !== (p.discount?.toString() ?? "0");

//                     // Giá sau giảm tính theo Giá gốc và % giảm giá ĐANG NHẬP (chưa cần bấm Lưu).
//                     const originalPrice = Number(vals.price) || 0;
//                     const discountPct   = Math.min(100, Math.max(0, parseFloat(vals.discount) || 0));
//                     const finalPrice    = Math.round(originalPrice * (1 - discountPct / 100));

//                     return (
//                       <tr key={p.id}>
//                         <td className="pi-shelf-name" title={p.name}>{p.name}</td>
//                         <td>
//                           <input
//                             type="text"
//                             className="pi-shelf-input"
//                             value={vals.sku}
//                             onChange={(e) => handleEditChange(p.id, "sku", e.target.value)}
//                             style={{ minWidth: 90 }}
//                           />
//                         </td>
//                         <td>
//                           <input
//                             type="number"
//                             className="pi-shelf-input"
//                             value={vals.price}
//                             onChange={(e) => handleEditChange(p.id, "price", e.target.value)}
//                             style={{ minWidth: 100 }}
//                           />
//                         </td>
//                         <td>
//                           <input
//                             type="number"
//                             className="pi-shelf-input"
//                             value={vals.stock}
//                             onChange={(e) => handleEditChange(p.id, "stock", e.target.value)}
//                           />
//                         </td>
//                         <td>
//                           <input
//                             type="number"
//                             className="pi-shelf-input"
//                             value={vals.discount}
//                             onChange={(e) => handleEditChange(p.id, "discount", e.target.value)}
//                           />
//                         </td>
//                         <td className="pi-shelf-final-price">
//                           {finalPrice.toLocaleString("vi-VN")} đ
//                           {discountPct > 0 && (
//                             <span className="pi-shelf-final-price-badge">-{discountPct}%</span>
//                           )}
//                         </td>
//                         <td>
//                           <button
//                             className="pi-btn pi-btn-primary pi-btn-sm"
//                             disabled={!isDirty || savingId === p.id}
//                             onClick={() => handleSaveRow(p.id)}
//                           >
//                             {savingId === p.id ? <IconSpinner /> : "Lưu"}
//                           </button>
//                         </td>
//                       </tr>
//                     );
//                   })}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ─── TAB 2: Tăng tồn kho từ Excel ─────────────────────────────── */}
//       {tab === "excel" && (
//         <div className="pi-import-upload">
//           <p className="pi-import-hint">
//             Tải lên file Excel (.xlsx/.xls) gồm 2 cột: <strong>Mã SKU</strong> và <strong>Số lượng cần thêm</strong>.
//             Nếu SKU đã có trong hệ thống, số lượng nhập sẽ được <strong>cộng thêm</strong> vào tồn kho hiện tại.
//             Nếu SKU không tồn tại, dòng đó sẽ <strong>bị bỏ qua</strong> (không tạo sản phẩm mới).
//           </p>

//           <label className="pi-import-dropzone">
//             <input
//               type="file"
//               accept=".xlsx,.xls"
//               onChange={handleExcelFile}
//               style={{ display: "none" }}
//             />
//             <span className="pi-import-icon"><IconExcel /></span>
//             <span>{excelFileName || "Bấm để chọn file Excel"}</span>
//           </label>

//           {excelParsing && (
//             <div className="pi-import-hint" style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
//               <IconSpinner /> Đang đọc file...
//             </div>
//           )}
//           {excelError && <div className="pi-import-error"><IconWarning />{excelError}</div>}

//           {excelRows.length > 0 && !excelResult && (
//             <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
//               <div className="pi-import-hint" style={{ margin: 0 }}>
//                 Đã đọc <strong>{excelRows.length}</strong> dòng hợp lệ từ file <strong>{excelFileName}</strong>.
//               </div>
//               <div className="pi-result-table-wrap">
//                 <table className="pi-result-table">
//                   <thead>
//                     <tr>
//                       <th>SKU</th>
//                       <th>Số lượng thêm</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {excelRows.slice(0, 50).map((r, i) => (
//                       <tr key={i}>
//                         <td>{r.sku}</td>
//                         <td>+{r.qty}</td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//                 {excelRows.length > 50 && (
//                   <div className="pi-shelf-empty">... và {excelRows.length - 50} dòng khác</div>
//                 )}
//               </div>

//               <div className="pi-import-actions">
//                 <button className="pi-btn pi-btn-secondary" onClick={handleResetExcel} disabled={excelApplying}>
//                   Chọn file khác
//                 </button>
//                 <button
//                   className="pi-btn pi-btn-primary"
//                   onClick={handleApplyExcelStock}
//                   disabled={excelApplying}
//                   style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
//                 >
//                   {excelApplying && <IconSpinner />}
//                   {excelApplying ? "Đang cập nhật..." : `Tăng tồn kho cho ${excelRows.length} SKU`}
//                 </button>
//               </div>
//             </div>
//           )}

//           {excelResult && (
//             <div className="pi-import-result" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
//               <div className="pi-result-summary" style={{ margin: 0 }}>
//                 <div className="pi-result-success" style={{ display: "flex", alignItems: "center", gap: 8 }}>
//                   <IconCheck /> Đã tăng tồn kho: <strong>{excelResult.increased.length}</strong> sản phẩm
//                 </div>
//                 {excelResult.skipped.length > 0 && (
//                   <div className="pi-result-failed" style={{ display: "flex", alignItems: "center", gap: 8 }}>
//                     <IconWarning /> Bỏ qua (không khớp SKU): <strong>{excelResult.skipped.length}</strong> dòng
//                   </div>
//                 )}
//               </div>

//               {excelResult.increased.length > 0 && (
//                 <div className="pi-result-table-wrap">
//                   <table className="pi-result-table">
//                     <thead>
//                       <tr>
//                         <th>SKU</th>
//                         <th>Tồn cũ</th>
//                         <th>Thêm</th>
//                         <th>Tồn mới</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {excelResult.increased.map((r, i) => (
//                         <tr key={i}>
//                           <td>{r.sku}</td>
//                           <td>{r.from}</td>
//                           <td>+{r.added}</td>
//                           <td><strong>{r.to}</strong></td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               )}

//               {excelResult.skipped.length > 0 && (
//                 <div className="pi-result-table-wrap" style={{ marginTop: 10 }}>
//                   <table className="pi-result-table">
//                     <thead>
//                       <tr>
//                         <th>SKU</th>
//                         <th>Lý do bỏ qua</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {excelResult.skipped.map((r, i) => (
//                         <tr key={i}>
//                           <td>{r.sku}</td>
//                           <td>{r.reason}</td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               )}

//               <div className="pi-import-actions">
//                 <button className="pi-btn pi-btn-secondary" onClick={handleResetExcel}>
//                   Import file khác
//                 </button>
//                 <button className="pi-btn pi-btn-primary" onClick={() => onDone?.()}>
//                   Hoàn tất
//                 </button>
//               </div>
//             </div>
//           )}
//         </div>
//       )}

//       {/* ─── TAB 3: Import CSV nâng cao ───────────────────────────────── */}
//       {tab === "csv" && (
//         <>
//           {csvStep === "upload" && (
//             <div className="pi-import-upload">
//               <p className="pi-import-hint">
//                 Tải lên file CSV chứa danh sách sản phẩm cần cập nhật giá, tồn kho, giảm giá...
//                 File cần có ít nhất 1 cột chứa <strong>Mã SKU</strong> để xác định đúng sản phẩm.
//               </p>
//               <label className="pi-import-dropzone">
//                 <input type="file" accept=".csv,text/csv" onChange={handleCsvFile} style={{ display: "none" }} />
//                 <span className="pi-import-icon"><IconUpload /></span>
//                 <span>{csvFileName || "Bấm để chọn file CSV"}</span>
//               </label>
//               {csvError && <div className="pi-import-error"><IconWarning />{csvError}</div>}
//             </div>
//           )}

//           {csvStep === "mapping" && (
//             <div className="pi-import-mapping">
//               <p className="pi-import-hint">
//                 Đã đọc <strong>{csvRows.length}</strong> dòng từ file <strong>{csvFileName}</strong>.
//                 Chọn trường tương ứng cho từng cột bên dưới:
//               </p>

//               <div className="pi-mapping-list">
//                 {csvHeaders.map((h, idx) => (
//                   <div key={idx} className="pi-mapping-row">
//                     <div className="pi-mapping-col">
//                       <span className="pi-mapping-col-label">Cột file:</span>
//                       <span className="pi-mapping-col-name">{h}</span>
//                       <span className="pi-mapping-sample">
//                         {csvRows[0]?.[idx] ? `VD: ${csvRows[0][idx]}` : ""}
//                       </span>
//                     </div>
//                     <span className="pi-mapping-arrow">→</span>
//                     <select
//                       className="pi-mapping-select"
//                       value={csvMapping[idx] || "__skip__"}
//                       onChange={(e) => handleCsvMappingChange(idx, e.target.value)}
//                     >
//                       {PRICE_FIELDS.map((f) => (
//                         <option key={f.key} value={f.key}>{f.label}</option>
//                       ))}
//                     </select>
//                   </div>
//                 ))}
//               </div>

//               {!csvHasSkuMapping && (
//                 <div className="pi-import-warning">
//                   <IconWarning /> Bạn cần ánh xạ ít nhất 1 cột thành <strong>Mã SKU</strong> để hệ thống biết cập nhật sản phẩm nào.
//                 </div>
//               )}
//               {csvError && <div className="pi-import-error"><IconWarning />{csvError}</div>}

//               <div className="pi-import-actions">
//                 <button className="pi-btn pi-btn-secondary" onClick={handleResetCsv} disabled={csvSaving}>
//                   Chọn file khác
//                 </button>
//                 <button
//                   className="pi-btn pi-btn-primary"
//                   onClick={handleCsvImport}
//                   disabled={csvSaving || !csvMappedFieldKeys.length}
//                   style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
//                 >
//                   {csvSaving && <IconSpinner />}
//                   {csvSaving ? "Đang cập nhật..." : `Cập nhật ${csvRows.length} sản phẩm`}
//                 </button>
//               </div>
//             </div>
//           )}

//           {csvStep === "result" && csvResult && (
//             <div className="pi-import-result">
//               <div className="pi-result-summary">
//                 <div className="pi-result-success" style={{ display: "flex", alignItems: "center", gap: 8 }}>
//                   <IconCheck /> Cập nhật thành công: <strong>{csvResult.success}</strong> sản phẩm
//                 </div>
//                 {csvResult.failed.length > 0 && (
//                   <div className="pi-result-failed" style={{ display: "flex", alignItems: "center", gap: 8 }}>
//                     <IconWarning /> Thất bại: <strong>{csvResult.failed.length}</strong> dòng
//                   </div>
//                 )}
//               </div>

//               {csvResult.failed.length > 0 && (
//                 <div className="pi-result-table-wrap">
//                   <table className="pi-result-table">
//                     <thead>
//                       <tr><th>SKU</th><th>Lỗi</th></tr>
//                     </thead>
//                     <tbody>
//                       {csvResult.failed.map((f, i) => (
//                         <tr key={i}><td>{f.sku}</td><td>{f.error}</td></tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               )}

//               <div className="pi-import-actions">
//                 <button className="pi-btn pi-btn-secondary" onClick={handleResetCsv}>
//                   Import file khác
//                 </button>
//                 <button className="pi-btn pi-btn-primary" onClick={() => onDone?.()}>
//                   Hoàn tất
//                 </button>
//               </div>
//             </div>
//           )}
//         </>
//       )}
//     </div>
//   );
// }

import React, { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { productsApi } from "../../api";
import "./ProductInventory.css";

// ─── Icon nhỏ, dùng chung, kế thừa màu chữ hiện tại (currentColor) ─────────
const IconSpinner = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: "pi-spin 0.8s linear infinite" }}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);
const IconRefresh = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M20 11a8 8 0 1 0-2.34 5.66M20 5v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconWarning = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
    <path d="M12 3 2 20h20L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M12 10v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconExcel = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const IconUpload = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M12 15V3m0 0 4 4m-4-4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Danh sách các trường có thể map từ file CSV (chế độ import nâng cao) ───
const PRICE_FIELDS = [
  { key: "__skip__",    label: "— Bỏ qua —" },
  { key: "sku",         label: "Mã SKU" },
  { key: "name",        label: "Tên sản phẩm" },
  { key: "price",       label: "Giá gốc" },
  { key: "discount",    label: "% Giảm giá" },
  { key: "final_price", label: "Giá bán (sau giảm)" },
  { key: "stock",       label: "Tồn kho" },
  { key: "unit",        label: "Đơn vị tính" },
  { key: "group_name",  label: "Tên nhóm" },
  { key: "note",        label: "Ghi chú" },
  { key: "sort_order",  label: "Thứ tự" },
];

const NUMERIC_FIELDS = new Set(["price", "discount", "final_price", "stock", "sort_order"]);

const TABS = [
  { key: "shelf", label: "Sản phẩm trên kệ" },
  { key: "excel", label: "Tăng tồn kho từ Excel" },
  { key: "csv",   label: "Import CSV nâng cao" },
];

// ─── Helper: parse CSV đơn giản (không phụ thuộc thư viện ngoài) ────────────
function parseCsv(text) {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
  if (!lines.length) return { headers: [], rows: [] };

  const splitLine = (line) => {
    const cells = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        cells.push(cur); cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    return cells.map((c) => c.trim());
  };

  const headers = splitLine(lines[0]);
  const rows = lines.slice(1).map(splitLine);
  return { headers, rows };
}

// ─── Helper: tìm chỉ số cột theo các từ khóa gần đúng (không phân biệt hoa/thường, dấu) ───
function findColumnIndex(headers, keywords) {
  const normalize = (s) =>
    String(s)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  const normalizedHeaders = headers.map(normalize);
  for (const kw of keywords) {
    const nkw = normalize(kw);
    const idx = normalizedHeaders.findIndex((h) => h.includes(nkw));
    if (idx !== -1) return idx;
  }
  return -1;
}

export default function ProductInventoryImport({ onDone }) {
  const [tab, setTab] = useState("shelf");

  // ─────────────────────────────────────────────────────────────────────
  // TAB 1: Sản phẩm đang trên kệ — sửa trực tiếp SKU / giá gốc / tồn kho / giảm giá
  // ─────────────────────────────────────────────────────────────────────
  const [shelfProducts, setShelfProducts] = useState([]);
  const [shelfLoading,  setShelfLoading]  = useState(false);
  const [shelfError,    setShelfError]    = useState("");
  const [shelfSearch,   setShelfSearch]   = useState("");
  const [editValues,    setEditValues]    = useState({}); // { id: { sku, price, stock, discount } }
  const [savingId,      setSavingId]      = useState(null);
  const [savingAll,     setSavingAll]     = useState(false);
  const [saveAllResult, setSaveAllResult] = useState(null); // { successCount, failed: [{ id, name, error }] }

  const fetchShelfProducts = useCallback(async () => {
    setShelfLoading(true);
    setShelfError("");
    try {
      const res = await productsApi.getAll({
        status: "active",
        search: shelfSearch.trim() || undefined,
        limit: 200,
        page: 1,
      });
      const data = res?.data || [];
      setShelfProducts(data);
      const initEdit = {};
      data.forEach((p) => {
        initEdit[p.id] = {
          sku: p.sku ?? "",
          price: p.price?.toString() ?? "0",
          stock: p.stock?.toString() ?? "0",
          discount: p.discount?.toString() ?? "0",
        };
      });
      setEditValues(initEdit);
    } catch (err) {
      setShelfError(err.message || "Không thể tải danh sách sản phẩm trên kệ.");
    } finally {
      setShelfLoading(false);
    }
  }, [shelfSearch]);

  useEffect(() => {
    if (tab === "shelf") fetchShelfProducts();
  }, [tab, fetchShelfProducts]);

  const handleEditChange = (id, field, value) => {
    setEditValues((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const isRowDirty = (p) => {
    const vals = editValues[p.id];
    if (!vals) return false;
    return (
      vals.sku !== (p.sku ?? "") ||
      vals.price !== (p.price?.toString() ?? "0") ||
      vals.stock !== (p.stock?.toString() ?? "0") ||
      vals.discount !== (p.discount?.toString() ?? "0")
    );
  };

  // Validate + build payload cho 1 dòng. Trả về { ok: true, payload } hoặc { ok: false, error }.
  // skipConfirm: bỏ qua hộp thoại xác nhận đổi SKU (dùng khi lưu hàng loạt).
  const buildRowPayload = (product, { skipConfirm = false } = {}) => {
    const vals = editValues[product.id];
    if (!vals) return { ok: false, error: "Không có dữ liệu chỉnh sửa." };

    const skuVal = (vals.sku || "").trim();
    const priceNum = parseFloat(vals.price);
    const stockNum = parseInt(vals.stock, 10);
    const discountNum = parseFloat(vals.discount);

    if (!skuVal) return { ok: false, error: "Mã SKU không được để trống." };
    if (Number.isNaN(priceNum) || priceNum < 0) return { ok: false, error: "Giá gốc không hợp lệ." };
    if (Number.isNaN(stockNum) || stockNum < 0) return { ok: false, error: "Số lượng tồn kho không hợp lệ." };
    if (Number.isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
      return { ok: false, error: "Phần trăm giảm giá phải trong khoảng 0–100." };
    }

    const skuChanged = skuVal !== (product.sku ?? "");
    if (skuChanged) {
      const dupSku = shelfProducts.some((p) => p.id !== product.id && (p.sku || "") === skuVal);
      if (dupSku) return { ok: false, error: "Mã SKU này đã được dùng cho sản phẩm khác đang hiển thị." };

      if (!skipConfirm) {
        const confirmed = window.confirm(
          `Bạn đang đổi SKU từ "${product.sku || "(trống)"}" thành "${skuVal}".\n\n` +
          "Lưu ý: đổi SKU có thể ảnh hưởng tới các luồng import Excel/CSV hoặc dữ liệu khác đang tham chiếu theo SKU cũ. Tiếp tục?"
        );
        if (!confirmed) return { ok: false, error: "__cancelled__" };
      }
    }

    return {
      ok: true,
      payload: { sku: skuVal, price: priceNum, stock: stockNum, discount: discountNum },
    };
  };

  const handleSaveRow = async (id) => {
    const product = shelfProducts.find((p) => p.id === id);
    if (!product) return;

    const result = buildRowPayload(product);
    if (!result.ok) {
      if (result.error !== "__cancelled__") alert(result.error);
      return;
    }

    setSavingId(id);
    try {
      await productsApi.update(id, result.payload);
      setShelfProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...result.payload } : p))
      );
    } catch (err) {
      alert("Lỗi lưu sản phẩm: " + err.message);
    } finally {
      setSavingId(null);
    }
  };

  // ─── Lưu tất cả các dòng đã chỉnh sửa trên trang hiện tại ──────────────
  // Nếu có SKU trùng/đổi bị lỗi validate → vẫn tiếp tục lưu các dòng còn lại,
  // và báo cáo chi tiết những dòng bị lỗi ở cuối.
  const handleSaveAll = async () => {
    const dirtyProducts = shelfProducts.filter(isRowDirty);
    if (!dirtyProducts.length) return;

    // Nếu có dòng nào đổi SKU, xác nhận 1 lần cho cả lượt lưu thay vì hỏi từng dòng.
    const anySkuChanged = dirtyProducts.some((p) => {
      const vals = editValues[p.id];
      return vals && (vals.sku || "").trim() !== (p.sku ?? "");
    });
    if (anySkuChanged) {
      const confirmed = window.confirm(
        `Có ${dirtyProducts.length} sản phẩm sẽ được lưu, trong đó một số sản phẩm bị đổi Mã SKU.\n\n` +
        "Đổi SKU có thể ảnh hưởng tới các luồng import Excel/CSV hoặc dữ liệu khác đang tham chiếu theo SKU cũ. Tiếp tục lưu tất cả?"
      );
      if (!confirmed) return;
    }

    setSavingAll(true);
    setSaveAllResult(null);

    const updates = []; // [{ id, payload }]
    const failed = [];  // [{ name, sku, error }]

    for (const product of dirtyProducts) {
      const result = buildRowPayload(product, { skipConfirm: true });
      if (result.ok) {
        updates.push({ id: product.id, payload: result.payload });
      } else {
        failed.push({ name: product.name, sku: product.sku || "—", error: result.error });
      }
    }

    let successCount = 0;
    for (const { id, payload } of updates) {
      const product = shelfProducts.find((p) => p.id === id);
      try {
        await productsApi.update(id, payload);
        setShelfProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...payload } : p)));
        successCount += 1;
      } catch (err) {
        failed.push({ name: product?.name, sku: product?.sku || "—", error: err.message });
      }
    }

    setSaveAllResult({ successCount, failed });
    setSavingAll(false);
  };

  const dirtyCount = shelfProducts.filter(isRowDirty).length;

  // ─────────────────────────────────────────────────────────────────────
  // TAB 2: Tăng tồn kho hàng loạt từ file Excel (.xlsx/.xls)
  // Quy tắc: sản phẩm khớp SKU → CỘNG THÊM số lượng vào tồn kho hiện có.
  //          Sản phẩm không khớp SKU → bỏ qua, KHÔNG tạo sản phẩm mới.
  // ─────────────────────────────────────────────────────────────────────
  const [excelFileName, setExcelFileName] = useState("");
  const [excelRows,     setExcelRows]     = useState([]); // [{ sku, qty }]
  const [excelParsing,  setExcelParsing]  = useState(false);
  const [excelError,    setExcelError]    = useState("");
  const [excelApplying, setExcelApplying] = useState(false);
  const [excelResult,   setExcelResult]   = useState(null); // { increased: [], skipped: [] }

  const handleExcelFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelError("");
    setExcelResult(null);
    setExcelFileName(file.name);
    setExcelParsing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

        if (!matrix.length) {
          setExcelError("File Excel không có dữ liệu.");
          setExcelRows([]);
          return;
        }

        const headers = matrix[0].map((h) => String(h).trim());
        const skuIdx = findColumnIndex(headers, ["sku", "ma sku", "mã sku", "ma san pham"]);
        const qtyIdx = findColumnIndex(headers, ["so luong", "số lượng", "quantity", "qty", "so luong them"]);

        if (skuIdx === -1 || qtyIdx === -1) {
          setExcelError(
            "Không tìm thấy cột 'SKU' và/hoặc cột 'Số lượng'. File cần có 2 cột: Mã SKU và Số lượng cần thêm."
          );
          setExcelRows([]);
          return;
        }

        const parsed = matrix.slice(1)
          .map((row) => ({
            sku: String(row[skuIdx] ?? "").trim(),
            qty: parseFloat(String(row[qtyIdx] ?? "").replace(/,/g, "")),
          }))
          .filter((r) => r.sku && !Number.isNaN(r.qty) && r.qty > 0);

        if (!parsed.length) {
          setExcelError("Không có dòng nào hợp lệ (thiếu SKU hoặc số lượng ≤ 0).");
        }
        setExcelRows(parsed);
      } catch (err) {
        setExcelError("Không đọc được file Excel: " + err.message);
        setExcelRows([]);
      } finally {
        setExcelParsing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleApplyExcelStock = async () => {
    if (!excelRows.length) return;
    setExcelApplying(true);
    setExcelError("");

    try {
      // Gộp số lượng nếu 1 SKU xuất hiện nhiều dòng trong file
      const qtyBySku = new Map();
      excelRows.forEach(({ sku, qty }) => {
        qtyBySku.set(sku, (qtyBySku.get(sku) || 0) + qty);
      });

      const skus = [...qtyBySku.keys()];
      const existingProducts = await productsApi.getManyBySku(skus);
      const existingBySku = new Map(existingProducts.map((p) => [p.sku, p]));

      const increased = [];
      const skipped = [];

      for (const sku of skus) {
        const addQty = qtyBySku.get(sku);
        const existing = existingBySku.get(sku);

        if (!existing) {
          // Sản phẩm không tồn tại → bỏ qua, không tạo mới
          skipped.push({ sku, reason: "Không tìm thấy sản phẩm với SKU này" });
          continue;
        }

        const currentStock = parseInt(existing.stock, 10) || 0;
        const newStock = currentStock + addQty;

        try {
          await productsApi.updateBySku(sku, { stock: newStock });
          increased.push({ sku, from: currentStock, to: newStock, added: addQty });
        } catch (err) {
          skipped.push({ sku, reason: err.message });
        }
      }

      setExcelResult({ increased, skipped });
      if (tab === "shelf") fetchShelfProducts();
    } catch (err) {
      setExcelError("Lỗi khi cập nhật tồn kho: " + err.message);
    } finally {
      setExcelApplying(false);
    }
  };

  const handleResetExcel = () => {
    setExcelFileName("");
    setExcelRows([]);
    setExcelError("");
    setExcelResult(null);
  };

  // ─────────────────────────────────────────────────────────────────────
  // TAB 3: Import CSV nâng cao — map tự do từng cột sang các trường sản phẩm
  // ─────────────────────────────────────────────────────────────────────
  const [csvFileName, setCsvFileName] = useState("");
  const [csvHeaders,  setCsvHeaders]  = useState([]);
  const [csvRows,     setCsvRows]     = useState([]);
  const [csvMapping,  setCsvMapping]  = useState({});
  const [csvStep,     setCsvStep]     = useState("upload"); // upload | mapping | result
  const [csvSaving,   setCsvSaving]   = useState(false);
  const [csvResult,   setCsvResult]   = useState(null);
  const [csvError,    setCsvError]    = useState("");

  const handleCsvFile = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError("");
    setCsvFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { headers: hs, rows: rs } = parseCsv(String(reader.result));
        if (!hs.length) {
          setCsvError("File không có dữ liệu hoặc sai định dạng CSV.");
          return;
        }
        setCsvHeaders(hs);
        setCsvRows(rs);

        const guessed = {};
        hs.forEach((h, idx) => {
          const norm = h.toLowerCase().replace(/[^a-z0-9]/g, "");
          const match = PRICE_FIELDS.find((f) => {
            const fNorm = f.key.toLowerCase().replace(/[^a-z0-9]/g, "");
            return f.key !== "__skip__" && (norm === fNorm || norm.includes(fNorm));
          });
          guessed[idx] = match ? match.key : "__skip__";
        });
        setCsvMapping(guessed);
        setCsvStep("mapping");
      } catch (err) {
        setCsvError("Không đọc được file: " + err.message);
      }
    };
    reader.readAsText(file, "utf-8");
  }, []);

  const handleCsvMappingChange = (headerIndex, fieldKey) => {
    setCsvMapping((prev) => ({ ...prev, [headerIndex]: fieldKey }));
  };

  const csvMappedFieldKeys = Object.values(csvMapping).filter((k) => k !== "__skip__");
  const csvHasSkuMapping = Object.values(csvMapping).some((key) => key === "sku");

  const buildCsvRecords = () => {
    return csvRows.map((row) => {
      const record = {};
      csvHeaders.forEach((_, idx) => {
        const fieldKey = csvMapping[idx];
        if (!fieldKey || fieldKey === "__skip__") return;
        let value = row[idx] ?? "";
        if (NUMERIC_FIELDS.has(fieldKey)) {
          const num = parseFloat(String(value).replace(/,/g, ""));
          value = Number.isNaN(num) ? null : num;
        }
        record[fieldKey] = value;
      });
      return record;
    });
  };

  const handleCsvImport = async () => {
    if (!csvHasSkuMapping) {
      alert("Vui lòng ánh xạ ít nhất cột 'Mã SKU' để có thể tìm đúng sản phẩm cần cập nhật.");
      return;
    }
    const records = buildCsvRecords().filter((r) => r.sku);
    if (!records.length) {
      alert("Không có dòng nào hợp lệ (thiếu SKU) để cập nhật.");
      return;
    }

    setCsvSaving(true);
    setCsvError("");
    const success = [];
    const failed = [];

    try {
      const skus = records.map((r) => r.sku);
      const existingProducts = await productsApi.getManyBySku(skus);
      const existingSkus = new Set(existingProducts.map((p) => p.sku));

      for (const rec of records) {
        if (!existingSkus.has(rec.sku)) {
          failed.push({ sku: rec.sku, error: "Không tìm thấy sản phẩm với SKU này" });
          continue;
        }
        const { sku, ...updateBody } = rec;
        try {
          await productsApi.updateBySku(sku, updateBody);
          success.push(sku);
        } catch (err) {
          failed.push({ sku: rec.sku, error: err.message });
        }
      }

      setCsvResult({ success: success.length, failed });
      setCsvStep("result");
    } catch (err) {
      setCsvError("Lỗi khi cập nhật hàng loạt: " + err.message);
    } finally {
      setCsvSaving(false);
    }
  };

  const handleResetCsv = () => {
    setCsvFileName("");
    setCsvHeaders([]);
    setCsvRows([]);
    setCsvMapping({});
    setCsvResult(null);
    setCsvError("");
    setCsvStep("upload");
  };

  return (
    <div className="pi-card">
      <style>{`@keyframes pi-spin { to { transform: rotate(360deg); } }`}</style>
      <h3 className="pi-title">Quản lý tồn kho &amp; giảm giá</h3>

      <div className="pi-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`pi-tab-btn ${tab === t.key ? "pi-tab-btn-active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── TAB 1: Sản phẩm trên kệ ─────────────────────────────────── */}
      {tab === "shelf" && (
        <div className="pi-shelf-frame">
          <div className="pi-shelf-frame-header">
            <h4 className="pi-shelf-frame-title">Danh sách sản phẩm đang trên kệ</h4>
            <span className="pi-shelf-frame-count">{shelfProducts.length} sản phẩm</span>
          </div>

          <div className="pi-shelf">
            <div className="pi-shelf-toolbar">
              <input
                type="text"
                className="pi-shelf-search"
                placeholder="Tìm theo tên sản phẩm..."
                value={shelfSearch}
                onChange={(e) => setShelfSearch(e.target.value)}
              />
              <button
                className="pi-btn pi-btn-secondary"
                onClick={fetchShelfProducts}
                disabled={shelfLoading || savingAll}
                style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
              >
                {shelfLoading ? <IconSpinner /> : <IconRefresh />}
                {shelfLoading ? "Đang tải..." : "Làm mới"}
              </button>
              <button
                className="pi-btn pi-btn-primary"
                onClick={handleSaveAll}
                disabled={!dirtyCount || savingAll || shelfLoading}
                style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
                title={dirtyCount ? `Lưu ${dirtyCount} sản phẩm đã chỉnh sửa` : "Chưa có thay đổi nào để lưu"}
              >
                {savingAll && <IconSpinner />}
                {savingAll
                  ? "Đang lưu tất cả..."
                  : dirtyCount
                    ? `Lưu tất cả (${dirtyCount})`
                    : "Lưu tất cả"}
              </button>
            </div>

            {shelfError && (
              <div className="pi-import-error"><IconWarning />{shelfError}</div>
            )}

            {saveAllResult && (
              <div className="pi-result-summary" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="pi-result-success" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <IconCheck /> Đã lưu thành công: <strong>{saveAllResult.successCount}</strong> sản phẩm
                </div>
                {saveAllResult.failed.length > 0 && (
                  <>
                    <div className="pi-result-failed" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <IconWarning /> Lỗi: <strong>{saveAllResult.failed.length}</strong> sản phẩm
                    </div>
                    <div className="pi-result-table-wrap">
                      <table className="pi-result-table">
                        <thead>
                          <tr><th>Sản phẩm</th><th>SKU</th><th>Lỗi</th></tr>
                        </thead>
                        <tbody>
                          {saveAllResult.failed.map((f, i) => (
                            <tr key={i}>
                              <td>{f.name || "—"}</td>
                              <td>{f.sku}</td>
                              <td>{f.error}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="pi-shelf-table-wrap">
              <table className="pi-shelf-table">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>SKU</th>
                    <th>Giá gốc</th>
                    <th>Tồn kho</th>
                    <th>Giảm giá (%)</th>
                    <th>Giá sau giảm</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {!shelfLoading && shelfProducts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="pi-shelf-empty">Không có sản phẩm nào đang trên kệ.</td>
                    </tr>
                  )}
                  {shelfProducts.map((p) => {
                    const vals = editValues[p.id] || { sku: "", price: "0", stock: "0", discount: "0" };
                    const isDirty = isRowDirty(p);

                    // Giá sau giảm tính theo Giá gốc và % giảm giá ĐANG NHẬP (chưa cần bấm Lưu).
                    const originalPrice = Number(vals.price) || 0;
                    const discountPct   = Math.min(100, Math.max(0, parseFloat(vals.discount) || 0));
                    const finalPrice    = Math.round(originalPrice * (1 - discountPct / 100));

                    return (
                      <tr key={p.id}>
                        <td className="pi-shelf-name" title={p.name}>{p.name}</td>
                        <td>
                          <input
                            type="text"
                            className="pi-shelf-input"
                            value={vals.sku}
                            onChange={(e) => handleEditChange(p.id, "sku", e.target.value)}
                            style={{ minWidth: 90 }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="pi-shelf-input"
                            value={vals.price}
                            onChange={(e) => handleEditChange(p.id, "price", e.target.value)}
                            style={{ minWidth: 100 }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="pi-shelf-input"
                            value={vals.stock}
                            onChange={(e) => handleEditChange(p.id, "stock", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="pi-shelf-input"
                            value={vals.discount}
                            onChange={(e) => handleEditChange(p.id, "discount", e.target.value)}
                          />
                        </td>
                        <td className="pi-shelf-final-price">
                          {finalPrice.toLocaleString("vi-VN")} đ
                          {discountPct > 0 && (
                            <span className="pi-shelf-final-price-badge">-{discountPct}%</span>
                          )}
                        </td>
                        <td>
                          <button
                            className="pi-btn pi-btn-primary pi-btn-sm"
                            disabled={!isDirty || savingId === p.id || savingAll}
                            onClick={() => handleSaveRow(p.id)}
                          >
                            {savingId === p.id ? <IconSpinner /> : "Lưu"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: Tăng tồn kho từ Excel ─────────────────────────────── */}
      {tab === "excel" && (
        <div className="pi-import-upload">
          <p className="pi-import-hint">
            Tải lên file Excel (.xlsx/.xls) gồm 2 cột: <strong>Mã SKU</strong> và <strong>Số lượng cần thêm</strong>.
            Nếu SKU đã có trong hệ thống, số lượng nhập sẽ được <strong>cộng thêm</strong> vào tồn kho hiện tại.
            Nếu SKU không tồn tại, dòng đó sẽ <strong>bị bỏ qua</strong> (không tạo sản phẩm mới).
          </p>

          <label className="pi-import-dropzone">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelFile}
              style={{ display: "none" }}
            />
            <span className="pi-import-icon"><IconExcel /></span>
            <span>{excelFileName || "Bấm để chọn file Excel"}</span>
          </label>

          {excelParsing && (
            <div className="pi-import-hint" style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <IconSpinner /> Đang đọc file...
            </div>
          )}
          {excelError && <div className="pi-import-error"><IconWarning />{excelError}</div>}

          {excelRows.length > 0 && !excelResult && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="pi-import-hint" style={{ margin: 0 }}>
                Đã đọc <strong>{excelRows.length}</strong> dòng hợp lệ từ file <strong>{excelFileName}</strong>.
              </div>
              <div className="pi-result-table-wrap">
                <table className="pi-result-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Số lượng thêm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {excelRows.slice(0, 50).map((r, i) => (
                      <tr key={i}>
                        <td>{r.sku}</td>
                        <td>+{r.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {excelRows.length > 50 && (
                  <div className="pi-shelf-empty">... và {excelRows.length - 50} dòng khác</div>
                )}
              </div>

              <div className="pi-import-actions">
                <button className="pi-btn pi-btn-secondary" onClick={handleResetExcel} disabled={excelApplying}>
                  Chọn file khác
                </button>
                <button
                  className="pi-btn pi-btn-primary"
                  onClick={handleApplyExcelStock}
                  disabled={excelApplying}
                  style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
                >
                  {excelApplying && <IconSpinner />}
                  {excelApplying ? "Đang cập nhật..." : `Tăng tồn kho cho ${excelRows.length} SKU`}
                </button>
              </div>
            </div>
          )}

          {excelResult && (
            <div className="pi-import-result" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="pi-result-summary" style={{ margin: 0 }}>
                <div className="pi-result-success" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <IconCheck /> Đã tăng tồn kho: <strong>{excelResult.increased.length}</strong> sản phẩm
                </div>
                {excelResult.skipped.length > 0 && (
                  <div className="pi-result-failed" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <IconWarning /> Bỏ qua (không khớp SKU): <strong>{excelResult.skipped.length}</strong> dòng
                  </div>
                )}
              </div>

              {excelResult.increased.length > 0 && (
                <div className="pi-result-table-wrap">
                  <table className="pi-result-table">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Tồn cũ</th>
                        <th>Thêm</th>
                        <th>Tồn mới</th>
                      </tr>
                    </thead>
                    <tbody>
                      {excelResult.increased.map((r, i) => (
                        <tr key={i}>
                          <td>{r.sku}</td>
                          <td>{r.from}</td>
                          <td>+{r.added}</td>
                          <td><strong>{r.to}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {excelResult.skipped.length > 0 && (
                <div className="pi-result-table-wrap" style={{ marginTop: 10 }}>
                  <table className="pi-result-table">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Lý do bỏ qua</th>
                      </tr>
                    </thead>
                    <tbody>
                      {excelResult.skipped.map((r, i) => (
                        <tr key={i}>
                          <td>{r.sku}</td>
                          <td>{r.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="pi-import-actions">
                <button className="pi-btn pi-btn-secondary" onClick={handleResetExcel}>
                  Import file khác
                </button>
                <button className="pi-btn pi-btn-primary" onClick={() => onDone?.()}>
                  Hoàn tất
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: Import CSV nâng cao ───────────────────────────────── */}
      {tab === "csv" && (
        <>
          {csvStep === "upload" && (
            <div className="pi-import-upload">
              <p className="pi-import-hint">
                Tải lên file CSV chứa danh sách sản phẩm cần cập nhật giá, tồn kho, giảm giá...
                File cần có ít nhất 1 cột chứa <strong>Mã SKU</strong> để xác định đúng sản phẩm.
              </p>
              <label className="pi-import-dropzone">
                <input type="file" accept=".csv,text/csv" onChange={handleCsvFile} style={{ display: "none" }} />
                <span className="pi-import-icon"><IconUpload /></span>
                <span>{csvFileName || "Bấm để chọn file CSV"}</span>
              </label>
              {csvError && <div className="pi-import-error"><IconWarning />{csvError}</div>}
            </div>
          )}

          {csvStep === "mapping" && (
            <div className="pi-import-mapping">
              <p className="pi-import-hint">
                Đã đọc <strong>{csvRows.length}</strong> dòng từ file <strong>{csvFileName}</strong>.
                Chọn trường tương ứng cho từng cột bên dưới:
              </p>

              <div className="pi-mapping-list">
                {csvHeaders.map((h, idx) => (
                  <div key={idx} className="pi-mapping-row">
                    <div className="pi-mapping-col">
                      <span className="pi-mapping-col-label">Cột file:</span>
                      <span className="pi-mapping-col-name">{h}</span>
                      <span className="pi-mapping-sample">
                        {csvRows[0]?.[idx] ? `VD: ${csvRows[0][idx]}` : ""}
                      </span>
                    </div>
                    <span className="pi-mapping-arrow">→</span>
                    <select
                      className="pi-mapping-select"
                      value={csvMapping[idx] || "__skip__"}
                      onChange={(e) => handleCsvMappingChange(idx, e.target.value)}
                    >
                      {PRICE_FIELDS.map((f) => (
                        <option key={f.key} value={f.key}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {!csvHasSkuMapping && (
                <div className="pi-import-warning">
                  <IconWarning /> Bạn cần ánh xạ ít nhất 1 cột thành <strong>Mã SKU</strong> để hệ thống biết cập nhật sản phẩm nào.
                </div>
              )}
              {csvError && <div className="pi-import-error"><IconWarning />{csvError}</div>}

              <div className="pi-import-actions">
                <button className="pi-btn pi-btn-secondary" onClick={handleResetCsv} disabled={csvSaving}>
                  Chọn file khác
                </button>
                <button
                  className="pi-btn pi-btn-primary"
                  onClick={handleCsvImport}
                  disabled={csvSaving || !csvMappedFieldKeys.length}
                  style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
                >
                  {csvSaving && <IconSpinner />}
                  {csvSaving ? "Đang cập nhật..." : `Cập nhật ${csvRows.length} sản phẩm`}
                </button>
              </div>
            </div>
          )}

          {csvStep === "result" && csvResult && (
            <div className="pi-import-result">
              <div className="pi-result-summary">
                <div className="pi-result-success" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <IconCheck /> Cập nhật thành công: <strong>{csvResult.success}</strong> sản phẩm
                </div>
                {csvResult.failed.length > 0 && (
                  <div className="pi-result-failed" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <IconWarning /> Thất bại: <strong>{csvResult.failed.length}</strong> dòng
                  </div>
                )}
              </div>

              {csvResult.failed.length > 0 && (
                <div className="pi-result-table-wrap">
                  <table className="pi-result-table">
                    <thead>
                      <tr><th>SKU</th><th>Lỗi</th></tr>
                    </thead>
                    <tbody>
                      {csvResult.failed.map((f, i) => (
                        <tr key={i}><td>{f.sku}</td><td>{f.error}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="pi-import-actions">
                <button className="pi-btn pi-btn-secondary" onClick={handleResetCsv}>
                  Import file khác
                </button>
                <button className="pi-btn pi-btn-primary" onClick={() => onDone?.()}>
                  Hoàn tất
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}