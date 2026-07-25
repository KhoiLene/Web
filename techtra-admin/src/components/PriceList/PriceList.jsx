// import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
// import * as XLSX from "xlsx";
// import "./PriceList.css";
// import { priceListApi, productGroupsApi } from "../../api";

// // ─── Tabs ───────────────────────────────────────────────────────────────────
// const TABS = [
//   { key: "active",   label: "Đang áp dụng" },
//   { key: "inactive", label: "Đã ẩn"        },
//   { key: "all",      label: "Tất cả"        },
// ];
// const LIMIT = 20;

// // ─── Mapping cho cột Excel → field DB ──────────────────────────────────────
// // key trùng tên cột trong DB / payload khi insert
// const PRICE_FIELDS = [
//   { key: "__skip__",  label: "— Bỏ qua —" },
//   { key: "sku",       label: "Mã SKU"      },
//   { key: "name",      label: "Tên sản phẩm" },
//   { key: "price",     label: "Giá gốc"     },
//   { key: "discount",  label: "% Giảm giá"  },
//   { key: "final_price", label: "Giá bán (sau giảm)" },
//   { key: "stock",     label: "Tồn kho"     },
//   { key: "unit",      label: "Đơn vị tính" },
//   { key: "group_name", label: "Tên nhóm"   },
//   { key: "note",      label: "Ghi chú"     },
//   { key: "sort_order", label: "Thứ tự"     },
// ];

// // Từ điển auto-map header tiếng Việt (không dấu) → field
// const HEADER_HINTS = {
//   "ma hang": "sku", "ma sp": "sku", "ma san pham": "sku", "sku": "sku", "code": "sku", "ma": "sku",
//   "ten": "name", "ten sp": "name", "ten san pham": "name", "name": "name", "ten hang": "name", "san pham": "name",
//   "gia goc": "price", "gia": "price", "gia ban": "final_price", "price": "price", "final price": "final_price",
//   "giam": "discount", "giam gia": "discount", "% giam": "discount", "discount": "discount",
//   "ton": "stock", "ton kho": "stock", "stock": "stock", "so luong": "stock",
//   "don vi": "unit", "dvt": "unit", "unit": "unit",
//   "nhom": "group_name", "ten nhom": "group_name", "group": "group_name", "danh muc": "group_name",
//   "ghi chu": "note", "note": "note", "mo ta": "note",
//   "thu tu": "sort_order", "sort": "sort_order", "stt": "sort_order",
// };

// function removeDiacritics(s) {
//   return (s || "")
//     .normalize("NFD")
//     .replace(/\p{Diacritic}/gu, "")
//     .replace(/đ/g, "d").replace(/Đ/g, "D")
//     .toLowerCase()
//     .trim();
// }

// function autoMapHeader(header) {
//   const norm = removeDiacritics(header);
//   if (HEADER_HINTS[norm]) return HEADER_HINTS[norm];
//   // Thử match từng từ
//   for (const [hint, field] of Object.entries(HEADER_HINTS)) {
//     if (norm.includes(hint)) return field;
//   }
//   return "__skip__";
// }

// function fmt(n) { return Number(n || 0).toLocaleString("vi-VN") + " đ"; }
// function calcFinal(p, d) { return Math.round(Number(p || 0) * (1 - Number(d || 0) / 100)); }

// // ─── Component chính ────────────────────────────────────────────────────────
// export default function PriceList() {
//   // ─── State danh sách ───────────────────────────────────────────────────
//   const [rows,        setRows]        = useState([]);
//   const [groups,      setGroups]      = useState([]);
//   const [loading,     setLoading]     = useState(true);
//   const [error,       setError]       = useState("");
//   const [tab,         setTab]         = useState("active");
//   const [search,      setSearch]      = useState("");
//   const [groupFilter, setGroupFilter] = useState("");
//   const [page,        setPage]        = useState(1);
//   const [total,       setTotal]       = useState(0);

//   // ─── State modal ───────────────────────────────────────────────────────
//   const [editingRow, setEditingRow] = useState(null);   // null = đóng, {} = thêm mới, {...} = sửa
//   const [importOpen, setImportOpen] = useState(false);

//   // ─── Fetch data ────────────────────────────────────────────────────────
//   const fetchRows = useCallback(async () => {
//     setLoading(true);
//     setError("");
//     try {
//       const params = { page, limit: LIMIT };
//       if (search)                               params.search    = search;
//       if (groupFilter)                          params.group_id  = groupFilter;
//       if (tab === "active")                     params.is_active = true;
//       else if (tab === "inactive")              params.is_active = false;
//       const res = await priceListApi.getAll(params);
//       setRows(res.data || []);
//       setTotal(res.total || 0);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   }, [page, search, groupFilter, tab]);

//   const fetchGroups = useCallback(async () => {
//     try {
//       const res = await productGroupsApi.getAll();
//       setGroups(res.data || []);
//     } catch {}
//   }, []);

//   useEffect(() => { fetchRows();    }, [fetchRows]);
//   useEffect(() => { fetchGroups();  }, [fetchGroups]);

//   // ─── Chuyển tab / search / filter ──────────────────────────────────────
//   const handleChangeTab = (k) => { setTab(k); setPage(1); };
//   const handleSearch   = (e) => { setSearch(e.target.value); setPage(1); };
//   const handleGroupFilter = (e) => { setGroupFilter(e.target.value); setPage(1); };

//   // ─── Toggle ẩn/hiện 1 dòng ────────────────────────────────────────────
//   const handleToggleActive = async (row) => {
//     try {
//       await priceListApi.update(row.id, { is_active: !row.is_active });
//       fetchRows();
//     } catch (err) { alert("Lỗi: " + err.message); }
//   };

//   // ─── Xóa 1 dòng ───────────────────────────────────────────────────────
//   const handleDelete = async (row) => {
//     if (!window.confirm(`Xóa vĩnh viễn dòng giá "${row.name}" (SKU: ${row.sku})?`)) return;
//     try {
//       await priceListApi.remove(row.id);
//       fetchRows();
//     } catch (err) { alert("Lỗi xóa: " + err.message); }
//   };

//   // ─── Bulk toggle / delete ─────────────────────────────────────────────
//   const [selected, setSelected] = useState([]);
//   const allSelected = rows.length > 0 && selected.length === rows.length;
//   const toggleAll   = () => setSelected(allSelected ? [] : rows.map((r) => r.id));
//   const toggleOne   = (id) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
//   useEffect(() => { setSelected([]); }, [tab]);

//   const handleBulkToggle = async (target) => {
//     if (!selected.length) return;
//     try {
//       await Promise.all(selected.map((id) => priceListApi.update(id, { is_active: target })));
//       setSelected([]);
//       fetchRows();
//     } catch (err) { alert("Lỗi: " + err.message); }
//   };
//   const handleBulkDelete = async () => {
//     if (!selected.length) return;
//     if (!window.confirm(`Xóa vĩnh viễn ${selected.length} dòng đã chọn?`)) return;
//     try {
//       await Promise.all(selected.map((id) => priceListApi.remove(id)));
//       setSelected([]);
//       fetchRows();
//     } catch (err) { alert("Lỗi: " + err.message); }
//   };

//   // ─── Save 1 dòng (thêm / sửa) ────────────────────────────────────────
//   const handleSaved = () => { setEditingRow(null); fetchRows(); };

//   // ─── Export ───────────────────────────────────────────────────────────
//   const exportRows = useMemo(() => rows, [rows]);

//   const handleExportXlsx = () => {
//     if (!exportRows.length) { alert("Không có dữ liệu để xuất"); return; }
//     const data = exportRows.map((r, i) => ({
//       "STT": i + 1,
//       "Mã SKU": r.sku,
//       "Tên sản phẩm": r.name,
//       "Nhóm": r.group_name || "",
//       "Giá gốc": Number(r.price || 0),
//       "% Giảm": Number(r.discount || 0),
//       "Giá bán": Number(r.final_price || 0),
//       "Tồn kho": r.stock || 0,
//       "Đơn vị": r.unit || "",
//       "Ghi chú": r.note || "",
//       "Trạng thái": r.is_active ? "Đang áp dụng" : "Đã ẩn",
//     }));
//     const ws = XLSX.utils.json_to_sheet(data);
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, "Bảng giá");
//     // Set độ rộng cột
//     ws["!cols"] = [
//       { wch: 5 }, { wch: 12 }, { wch: 35 }, { wch: 18 }, { wch: 12 },
//       { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 25 }, { wch: 14 },
//     ];
//     const today = new Date().toISOString().slice(0, 10);
//     XLSX.writeFile(wb, `bang-gia-${today}.xlsx`);
//   };

//   const handleExportCsv = () => {
//     if (!exportRows.length) { alert("Không có dữ liệu để xuất"); return; }
//     const header = ["STT", "Mã SKU", "Tên sản phẩm", "Nhóm", "Giá gốc", "% Giảm", "Giá bán", "Tồn kho", "Đơn vị", "Ghi chú", "Trạng thái"];
//     const esc = (v) => {
//       const s = String(v ?? "");
//       if (s.includes(",") || s.includes('"') || s.includes("\n")) {
//         return `"${s.replace(/"/g, '""')}"`;
//       }
//       return s;
//     };
//     const lines = [header.join(",")];
//     exportRows.forEach((r, i) => {
//       lines.push([
//         i + 1, r.sku, r.name, r.group_name || "",
//         Number(r.price || 0), Number(r.discount || 0), Number(r.final_price || 0),
//         r.stock || 0, r.unit || "", r.note || "",
//         r.is_active ? "Đang áp dụng" : "Đã ẩn",
//       ].map(esc).join(","));
//     });
//     // Thêm BOM để Excel đọc đúng tiếng Việt
//     const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     const today = new Date().toISOString().slice(0, 10);
//     a.href = url;
//     a.download = `bang-gia-${today}.csv`;
//     a.click();
//     URL.revokeObjectURL(url);
//   };

//   // ─── Render ───────────────────────────────────────────────────────────
//   if (editingRow !== null) {
//     return (
//       <EditPriceRow
//         initial={editingRow}
//         groups={groups}
//         onBack={() => setEditingRow(null)}
//         onSaved={handleSaved}
//       />
//     );
//   }

//   return (
//     <div className="pl-page main-content">

//       {/* Header */}
//       <div className="pl-header">
//         <h1>Bảng giá sản phẩm</h1>
//         <div className="pl-header-actions">
//           <button className="pl-btn" onClick={handleExportXlsx}>
//             <i className="fas fa-file-excel" /> Xuất Excel
//           </button>
//           <button className="pl-btn" onClick={handleExportCsv}>
//             <i className="fas fa-file-csv" /> Xuất CSV
//           </button>
//           <button className="pl-btn pl-btn-success" onClick={() => setImportOpen(true)}>
//             <i className="fas fa-upload" /> Tải Excel lên
//           </button>
//           <button className="pl-btn pl-btn-primary" onClick={() => setEditingRow({})}>
//             <i className="fas fa-plus" /> Thêm dòng
//           </button>
//         </div>
//       </div>

//       {/* Tabs */}
//       <div className="pl-tabs">
//         {TABS.map((t) => (
//           <button
//             key={t.key}
//             className={`pl-tab${tab === t.key ? " active" : ""}`}
//             onClick={() => handleChangeTab(t.key)}
//           >
//             {t.label}
//           </button>
//         ))}
//       </div>

//       {/* Filter */}
//       <div className="pl-filter">
//         <div className="pl-search">
//           <i className="fas fa-search" />
//           <input
//             type="text"
//             placeholder="Tìm theo tên sản phẩm hoặc SKU..."
//             value={search}
//             onChange={handleSearch}
//           />
//         </div>
//         <select className="pl-select" value={groupFilter} onChange={handleGroupFilter}>
//           <option value="">Tất cả nhóm</option>
//           {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
//         </select>

//         {selected.length > 0 && (
//           <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
//             {tab === "inactive" ? (
//               <button className="pl-btn pl-btn-success" onClick={() => handleBulkToggle(true)}>
//                 <i className="fas fa-eye" /> Hiện {selected.length} dòng
//               </button>
//             ) : tab === "active" ? (
//               <button className="pl-btn" onClick={() => handleBulkToggle(false)}>
//                 <i className="fas fa-eye-slash" /> Ẩn {selected.length} dòng
//               </button>
//             ) : (
//               <>
//                 <button className="pl-btn pl-btn-success" onClick={() => handleBulkToggle(true)}>
//                   <i className="fas fa-eye" /> Hiện
//                 </button>
//                 <button className="pl-btn" onClick={() => handleBulkToggle(false)}>
//                   <i className="fas fa-eye-slash" /> Ẩn
//                 </button>
//               </>
//             )}
//             <button className="pl-btn pl-btn-danger" onClick={handleBulkDelete}>
//               <i className="fas fa-trash" /> Xóa {selected.length}
//             </button>
//             <button className="pl-btn" onClick={() => setSelected([])}>Bỏ chọn</button>
//           </div>
//         )}
//       </div>

//       {error && (
//         <div className="pl-error">
//           ⚠️ {error} —{" "}
//           <button onClick={fetchRows} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", textDecoration: "underline" }}>
//             Thử lại
//           </button>
//         </div>
//       )}

//       {loading ? (
//         <div className="pl-loading">⌛ Đang tải bảng giá...</div>
//       ) : rows.length === 0 ? (
//         <div className="pl-empty">
//           <div className="icon">📋</div>
//           <h3>Chưa có dòng giá nào</h3>
//           <p>Bắt đầu bằng cách thêm dòng mới hoặc tải file Excel lên.</p>
//           <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
//             <button className="pl-btn pl-btn-primary" onClick={() => setEditingRow({})}>
//               <i className="fas fa-plus" /> Thêm dòng
//             </button>
//             <button className="pl-btn pl-btn-success" onClick={() => setImportOpen(true)}>
//               <i className="fas fa-upload" /> Tải Excel lên
//             </button>
//           </div>
//         </div>
//       ) : (
//         <>
//           <div className="pl-table-wrap">
//             <table className="pl-table">
//               <thead>
//                 <tr>
//                   <th style={{ width: 40 }}>
//                     <input type="checkbox" checked={allSelected} onChange={toggleAll} />
//                   </th>
//                   <th>SKU</th>
//                   <th>Tên sản phẩm</th>
//                   <th>Nhóm</th>
//                   <th className="right">Giá gốc</th>
//                   <th className="right">% Giảm</th>
//                   <th className="right">Giá bán</th>
//                   <th className="right">Tồn</th>
//                   <th>Đơn vị</th>
//                   <th className="center">Trạng thái</th>
//                   <th className="center">Thao tác</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {rows.map((r) => (
//                   <tr key={r.id} className={!r.is_active ? "pl-row-hidden" : ""}>
//                     <td>
//                       <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggleOne(r.id)} />
//                     </td>
//                     <td><span className="pl-sku">{r.sku}</span></td>
//                     <td><span className="pl-name">{r.name}</span></td>
//                     <td><span className="pl-group">{r.group_name || "—"}</span></td>
//                     <td className="right pl-price">{fmt(r.price)}</td>
//                     <td className="right">
//                       {Number(r.discount) > 0 ? <span className="pl-discount">-{Number(r.discount)}%</span> : "—"}
//                     </td>
//                     <td className="right pl-price-final">{fmt(r.final_price)}</td>
//                     <td className="right">
//                       <span className={`pl-stock ${r.stock <= 0 ? "out" : r.stock < 10 ? "low" : ""}`}>
//                         {r.stock}
//                       </span>
//                     </td>
//                     <td>{r.unit || "—"}</td>
//                     <td className="center">
//                       <span className={`pl-badge ${r.is_active ? "active" : "inactive"}`}>
//                         {r.is_active ? "Đang áp dụng" : "Đã ẩn"}
//                       </span>
//                     </td>
//                     <td className="center">
//                       <button className="pl-icon-btn edit"   title="Sửa"     onClick={() => setEditingRow(r)}>
//                         <i className="fas fa-pen" />
//                       </button>
//                       <button className="pl-icon-btn toggle" title={r.is_active ? "Ẩn" : "Hiện"} onClick={() => handleToggleActive(r)}>
//                         <i className={`fas ${r.is_active ? "fa-eye-slash" : "fa-eye"}`} />
//                       </button>
//                       <button className="pl-icon-btn danger" title="Xóa"      onClick={() => handleDelete(r)}>
//                         <i className="fas fa-trash" />
//                       </button>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>

//           <div className="pl-pagination">
//             <span>Hiển thị {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} / {total} dòng</span>
//             <div className="pl-pagination-buttons">
//               <button className="pl-page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
//                 ← Trước
//               </button>
//               <button className="pl-page-btn" onClick={() => setPage((p) => p + 1)} disabled={page * LIMIT >= total}>
//                 Sau →
//               </button>
//             </div>
//           </div>
//         </>
//       )}

//       {importOpen && (
//         <ImportModal
//           groups={groups}
//           onClose={() => setImportOpen(false)}
//           onDone={() => { setImportOpen(false); fetchRows(); }}
//         />
//       )}
//     </div>
//   );
// }

// // ════════════════════════════════════════════════════════════════════════════
// // Form thêm / sửa 1 dòng
// // ════════════════════════════════════════════════════════════════════════════
// function EditPriceRow({ initial, groups, onBack, onSaved }) {
//   const isEdit = !!initial?.id;
//   const [sku,        setSku]        = useState(initial.sku || "");
//   const [name,       setName]       = useState(initial.name || "");
//   const [groupId,    setGroupId]    = useState(initial.group_id || "");
//   const [price,      setPrice]      = useState(initial.price ?? 0);
//   const [discount,   setDiscount]   = useState(initial.discount ?? 0);
//   const [finalPrice, setFinalPrice] = useState(initial.final_price ?? 0);
//   const [stock,      setStock]      = useState(initial.stock ?? 0);
//   const [unit,       setUnit]       = useState(initial.unit || "cái");
//   const [note,       setNote]       = useState(initial.note || "");
//   const [isActive,   setIsActive]   = useState(initial.is_active ?? true);
//   const [sortOrder,  setSortOrder]  = useState(initial.sort_order ?? 0);
//   const [saving,     setSaving]     = useState(false);
//   const [error,      setError]      = useState("");

//   // Auto-calc final_price khi đổi price hoặc discount
//   useEffect(() => {
//     if (!isEdit || finalPrice === 0 || finalPrice === calcFinal(initial.price, initial.discount)) {
//       setFinalPrice(calcFinal(price, discount));
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [price, discount]);

//   const handleSave = async (e) => {
//     e?.preventDefault?.();
//     if (!sku.trim())  { setError("Vui lòng nhập Mã SKU"); return; }
//     if (!name.trim()) { setError("Vui lòng nhập Tên sản phẩm"); return; }

//     setSaving(true);
//     setError("");
//     try {
//       const grp = groups.find((g) => String(g.id) === String(groupId));
//       const body = {
//         sku: sku.trim(),
//         name: name.trim(),
//         group_id: groupId || null,
//         group_name: grp?.name || null,
//         price: Number(price) || 0,
//         discount: Number(discount) || 0,
//         final_price: Number(finalPrice) || calcFinal(price, discount),
//         stock: Number(stock) || 0,
//         unit: unit || "cái",
//         note: note || null,
//         is_active: !!isActive,
//         sort_order: Number(sortOrder) || 0,
//       };
//       if (isEdit) {
//         await priceListApi.update(initial.id, body);
//       } else {
//         await priceListApi.create(body);
//       }
//       onSaved();
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <div className="pl-page main-content">
//       <div className="pl-header">
//         <h1>{isEdit ? `Sửa dòng giá: ${initial.name}` : "Thêm dòng giá mới"}</h1>
//         <div className="pl-header-actions">
//           <button className="pl-btn" onClick={onBack}><i className="fas fa-arrow-left" /> Hủy</button>
//           <button className="pl-btn pl-btn-primary" onClick={handleSave} disabled={saving}>
//             <i className="fas fa-save" /> {saving ? "Đang lưu..." : "Lưu"}
//           </button>
//         </div>
//       </div>

//       {error && <div className="pl-error">⚠️ {error}</div>}

//       <div className="pl-table-wrap" style={{ padding: 20 }}>
//         <div className="pl-form-grid">
//           <div className="pl-field">
//             <label><span className="req">*</span> Mã SKU</label>
//             <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="VD: SP001" />
//             <span className="hint">SKU trùng → tự động cập nhật</span>
//           </div>
//           <div className="pl-field">
//             <label><span className="req">*</span> Tên sản phẩm</label>
//             <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
//           </div>

//           <div className="pl-field full">
//             <label>Nhóm sản phẩm</label>
//             <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
//               <option value="">— Chọn nhóm —</option>
//               {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
//             </select>
//           </div>

//           <div className="pl-field">
//             <label>Giá gốc (đ)</label>
//             <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} min="0" step="100" />
//           </div>
//           <div className="pl-field">
//             <label>% Giảm giá</label>
//             <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} min="0" max="100" step="0.1" />
//           </div>

//           <div className="pl-field">
//             <label>Giá bán (sau giảm, đ)</label>
//             <input type="number" value={finalPrice} onChange={(e) => setFinalPrice(e.target.value)} min="0" step="100" />
//             <span className="hint">Tự tính từ giá gốc × (1 - %giảm), có thể sửa tay</span>
//           </div>
//           <div className="pl-field">
//             <label>Tồn kho</label>
//             <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} min="0" />
//           </div>

//           <div className="pl-field">
//             <label>Đơn vị tính</label>
//             <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="chai, túi, hộp, kg..." />
//           </div>
//           <div className="pl-field">
//             <label>Thứ tự hiển thị</label>
//             <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
//           </div>

//           <div className="pl-field full">
//             <label>Ghi chú nội bộ</label>
//             <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
//           </div>

//           <div className="pl-field full">
//             <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
//               <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
//               <span>Đang áp dụng (hiện trong bảng giá)</span>
//             </label>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ════════════════════════════════════════════════════════════════════════════
// // Modal Import Excel (4 bước: chọn file → mapping → preview → lưu)
// // ════════════════════════════════════════════════════════════════════════════
// function ImportModal({ groups, onClose, onDone }) {
//   const [step,      setStep]      = useState(1);
//   const [fileName,  setFileName]  = useState("");
//   const [rawRows,   setRawRows]   = useState([]);     // mảng 2D từ Excel
//   const [headers,   setHeaders]   = useState([]);     // header gốc
//   const [mapping,   setMapping]   = useState([]);     // [{ col, field }]
//   const [preview,   setPreview]   = useState([]);     // [{ sku, name, ... }]
//   const [error,     setError]     = useState("");
//   const [saving,    setSaving]    = useState(false);
//   const fileRef = useRef(null);

//   // ─── Bước 1: đọc file ────────────────────────────────────────────────
//   const handleFile = async (e) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     setError("");
//     setFileName(file.name);
//     try {
//       const buf = await file.arrayBuffer();
//       const wb  = XLSX.read(buf, { type: "array" });
//       const ws  = wb.Sheets[wb.SheetNames[0]];
//       const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
//       if (aoa.length < 2) {
//         setError("File rỗng hoặc chỉ có 1 dòng header.");
//         return;
//       }
//       const [headerRow, ...dataRows] = aoa;
//       const cleanHeaders = headerRow.map((h, i) => String(h || `Cột ${i + 1}`).trim());
//       setHeaders(cleanHeaders);
//       setRawRows(dataRows.filter((r) => r.some((c) => String(c).trim() !== "")));
//       // Auto-map
//       setMapping(cleanHeaders.map((h) => ({ col: h, field: autoMapHeader(h) })));
//       setStep(2);
//     } catch (err) {
//       setError("Không đọc được file: " + err.message);
//     }
//   };

//   // ─── Bước 2 → 3: sinh preview từ mapping ──────────────────────────────
//   useEffect(() => {
//     if (step !== 3) return;
//     const mapped = rawRows.map((r) => {
//       const obj = {};
//       mapping.forEach((m, i) => {
//         if (m.field && m.field !== "__skip__") {
//           obj[m.field] = r[i];
//         }
//       });
//       // Chuẩn hóa kiểu dữ liệu
//       obj.price       = Number(obj.price) || 0;
//       obj.discount    = Number(obj.discount) || 0;
//       obj.final_price = obj.final_price !== "" && obj.final_price != null
//         ? Number(obj.final_price) || calcFinal(obj.price, obj.discount)
//         : calcFinal(obj.price, obj.discount);
//       obj.stock       = Number(obj.stock) || 0;
//       obj.sort_order  = Number(obj.sort_order) || 0;
//       obj.sku         = String(obj.sku || "").trim();
//       obj.name        = String(obj.name || "").trim();
//       obj.unit        = obj.unit ? String(obj.unit).trim() : "cái";
//       obj.group_name  = obj.group_name ? String(obj.group_name).trim() : null;
//       obj.note        = obj.note ? String(obj.note).trim() : null;
//       return obj;
//     });
//     setPreview(mapped);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [step, mapping]);

//   // Tìm group_id từ group_name (nếu trùng tên)
//   const enrichGroupId = (row) => {
//     if (!row.group_name) return { ...row, group_id: null };
//     const grp = groups.find((g) => removeDiacritics(g.name) === removeDiacritics(row.group_name));
//     return { ...row, group_id: grp?.id || null };
//   };

//   // ─── Bước 3 → 4: lưu vào DB ─────────────────────────────────────────
//   const handleSave = async () => {
//     const valid = preview
//       .map(enrichGroupId)
//       .filter((r) => r.sku && r.name);

//     if (!valid.length) { setError("Không có dòng nào hợp lệ (thiếu SKU hoặc tên)."); return; }

//     setSaving(true);
//     setError("");
//     try {
//       await priceListApi.bulkUpsert(valid);
//       onDone();
//     } catch (err) {
//       setError("Lỗi lưu: " + err.message);
//     } finally {
//       setSaving(false);
//     }
//   };

//   const stats = useMemo(() => {
//     const total = preview.length;
//     const valid = preview.filter((r) => r.sku && r.name).length;
//     const invalid = total - valid;
//     const hasGroupName = preview.filter((r) => r.group_name).length;
//     return { total, valid, invalid, hasGroupName };
//   }, [preview]);

//   // Số field đã map (trừ __skip__)
//   const mappedCount = mapping.filter((m) => m.field !== "__skip__").length;

//   return (
//     <div className="pl-modal-overlay" onClick={(e) => e.target.className === "pl-modal-overlay" && onClose()}>
//       <div className="pl-modal" style={{ maxWidth: step === 3 ? 1100 : 800 }}>
//         <div className="pl-modal-header">
//           <h2><i className="fas fa-file-import" /> Import bảng giá từ Excel</h2>
//           <button className="pl-modal-close" onClick={onClose}>✕</button>
//         </div>

//         <div className="pl-modal-body">
//           {/* Step indicator */}
//           <div className="pl-step-bar">
//             <div className={`pl-step ${step === 1 ? "active" : step > 1 ? "done" : ""}`}>
//               <span className="num">1</span> Chọn file
//             </div>
//             <div className="pl-step-sep" />
//             <div className={`pl-step ${step === 2 ? "active" : step > 2 ? "done" : ""}`}>
//               <span className="num">2</span> Mapping cột ({mappedCount}/{mapping.length})
//             </div>
//             <div className="pl-step-sep" />
//             <div className={`pl-step ${step === 3 ? "active" : ""}`}>
//               <span className="num">3</span> Xem trước & lưu
//             </div>
//           </div>

//           {error && <div className="pl-error">⚠️ {error}</div>}

//           {/* STEP 1: chọn file */}
//           {step === 1 && (
//             <div style={{ textAlign: "center", padding: 40 }}>
//               <i className="fas fa-file-excel" style={{ fontSize: 64, color: "#16a34a", marginBottom: 16 }} />
//               <h3 style={{ marginTop: 0 }}>Chọn file Excel hoặc CSV</h3>
//               <p style={{ color: "#6b7280" }}>
//                 Hỗ trợ .xlsx, .xls, .csv. Dòng đầu tiên phải là header.
//               </p>
//               <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} hidden />
//               <button className="pl-btn pl-btn-primary" onClick={() => fileRef.current?.click()}>
//                 <i className="fas fa-folder-open" /> Chọn file
//               </button>
//               {fileName && <p style={{ marginTop: 12, color: "#6b7280" }}>Đã chọn: {fileName}</p>}
//             </div>
//           )}

//           {/* STEP 2: mapping */}
//           {step === 2 && (
//             <>
//               <p style={{ color: "#6b7280", fontSize: 13, marginTop: 0 }}>
//                 Hệ thống đã tự động nhận diện các cột phổ biến. Bạn có thể chỉnh lại nếu sai:
//               </p>
//               <table className="pl-mapping-table">
//                 <thead>
//                   <tr>
//                     <th style={{ width: 50 }}>#</th>
//                     <th>Tên cột trong file Excel</th>
//                     <th>Map sang trường</th>
//                     <th style={{ width: 80 }}>Xem trước</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {mapping.map((m, i) => (
//                     <tr key={i}>
//                       <td>{i + 1}</td>
//                       <td className="col-name">{m.col}</td>
//                       <td>
//                         <select
//                           value={m.field}
//                           onChange={(e) => {
//                             const next = [...mapping];
//                             next[i] = { ...m, field: e.target.value };
//                             setMapping(next);
//                           }}
//                         >
//                           {PRICE_FIELDS.map((f) => (
//                             <option key={f.key} value={f.key}>{f.label}</option>
//                           ))}
//                         </select>
//                       </td>
//                       <td style={{ color: "#6b7280", fontSize: 12 }}>
//                         {rawRows[0]?.[i] !== undefined ? String(rawRows[0][i]).slice(0, 20) : "—"}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//               <p style={{ color: "#6b7280", fontSize: 12, marginTop: 8 }}>
//                 <i className="fas fa-info-circle" /> Đã map {mappedCount}/{mapping.length} cột. Các cột "Bỏ qua" sẽ không được lưu.
//               </p>
//             </>
//           )}

//           {/* STEP 3: preview */}
//           {step === 3 && (
//             <>
//               <div className="pl-stats">
//                 <div className="stat">Tổng dòng đọc: <strong>{stats.total}</strong></div>
//                 <div className="stat">Hợp lệ: <strong>{stats.valid}</strong></div>
//                 {stats.invalid > 0 && (
//                   <div className="stat error">Lỗi (thiếu SKU/tên): <strong>{stats.invalid}</strong></div>
//                 )}
//                 <div className="stat">Có nhóm: <strong>{stats.hasGroupName}</strong></div>
//               </div>

//               <p style={{ color: "#6b7280", fontSize: 13, marginTop: 0 }}>
//                 Bạn có thể sửa trực tiếp SKU/tên/giá trước khi lưu. SKU trùng → cập nhật, SKU mới → thêm mới.
//               </p>

//               <div style={{ overflowX: "auto", maxHeight: 400, overflowY: "auto" }}>
//                 <table className="pl-preview-table">
//                   <thead>
//                     <tr>
//                       <th>#</th>
//                       <th>SKU *</th>
//                       <th>Tên *</th>
//                       <th>Nhóm</th>
//                       <th>Giá gốc</th>
//                       <th>%</th>
//                       <th>Giá bán</th>
//                       <th>Tồn</th>
//                       <th>ĐV</th>
//                       <th>Ghi chú</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {preview.map((r, i) => {
//                       const bad = !r.sku || !r.name;
//                       return (
//                         <tr key={i} className={bad ? "err" : ""}>
//                           <td>{i + 1}</td>
//                           <td>
//                             <input value={r.sku} onChange={(e) => {
//                               const next = [...preview]; next[i] = { ...r, sku: e.target.value }; setPreview(next);
//                             }} />
//                           </td>
//                           <td>
//                             <input value={r.name} onChange={(e) => {
//                               const next = [...preview]; next[i] = { ...r, name: e.target.value }; setPreview(next);
//                             }} />
//                           </td>
//                           <td>
//                             <input value={r.group_name || ""} onChange={(e) => {
//                               const next = [...preview]; next[i] = { ...r, group_name: e.target.value }; setPreview(next);
//                             }} />
//                           </td>
//                           <td>
//                             <input type="number" value={r.price} onChange={(e) => {
//                               const price = Number(e.target.value) || 0;
//                               const next  = [...preview];
//                               next[i]    = { ...r, price, final_price: calcFinal(price, r.discount) };
//                               setPreview(next);
//                             }} />
//                           </td>
//                           <td>
//                             <input type="number" value={r.discount} onChange={(e) => {
//                               const discount = Number(e.target.value) || 0;
//                               const next    = [...preview];
//                               next[i]      = { ...r, discount, final_price: calcFinal(r.price, discount) };
//                               setPreview(next);
//                             }} />
//                           </td>
//                           <td>
//                             <input type="number" value={r.final_price} onChange={(e) => {
//                               const next = [...preview]; next[i] = { ...r, final_price: Number(e.target.value) || 0 }; setPreview(next);
//                             }} />
//                           </td>
//                           <td>
//                             <input type="number" value={r.stock} onChange={(e) => {
//                               const next = [...preview]; next[i] = { ...r, stock: Number(e.target.value) || 0 }; setPreview(next);
//                             }} />
//                           </td>
//                           <td>
//                             <input value={r.unit} onChange={(e) => {
//                               const next = [...preview]; next[i] = { ...r, unit: e.target.value }; setPreview(next);
//                             }} />
//                           </td>
//                           <td>
//                             <input value={r.note || ""} onChange={(e) => {
//                               const next = [...preview]; next[i] = { ...r, note: e.target.value }; setPreview(next);
//                             }} />
//                           </td>
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               </div>
//             </>
//           )}
//         </div>

//         <div className="pl-modal-footer">
//           {step === 1 && (
//             <button className="pl-btn" onClick={onClose}>Đóng</button>
//           )}
//           {step === 2 && (
//             <>
//               <button className="pl-btn" onClick={() => setStep(1)}>← Chọn lại file</button>
//               <button
//                 className="pl-btn pl-btn-primary"
//                 onClick={() => setStep(3)}
//                 disabled={!headers.length}
//               >
//                 Tiếp tục →
//               </button>
//             </>
//           )}
//           {step === 3 && (
//             <>
//               <button className="pl-btn" onClick={() => setStep(2)}>← Chỉnh mapping</button>
//               <button
//                 className="pl-btn pl-btn-success"
//                 onClick={handleSave}
//                 disabled={saving || stats.valid === 0}
//               >
//                 <i className="fas fa-save" /> {saving ? "Đang lưu..." : `Lưu ${stats.valid} dòng vào DB`}
//               </button>
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import "./PriceList.css";
import { priceListApi, productGroupsApi, productsApi } from "../../api";

// ─── Tabs ───────────────────────────────────────────────────────────────────
const TABS = [
  { key: "active",   label: "Đang áp dụng" },
  { key: "inactive", label: "Đã ẩn"        },
  { key: "all",      label: "Tất cả"        },
];
const LIMIT = 20;

// ─── Mapping cho cột Excel → field DB ──────────────────────────────────────
// key trùng tên cột trong DB / payload khi insert
const PRICE_FIELDS = [
  { key: "__skip__",  label: "— Bỏ qua —" },
  { key: "sku",       label: "Mã SKU"      },
  { key: "name",      label: "Tên sản phẩm" },
  { key: "price",     label: "Giá gốc"     },
  { key: "discount",  label: "% Giảm giá"  },
  { key: "final_price", label: "Giá bán (sau giảm)" },
  { key: "stock",     label: "Tồn kho"     },
  { key: "unit",      label: "Đơn vị tính" },
  { key: "group_name", label: "Tên nhóm"   },
  { key: "note",      label: "Ghi chú"     },
  { key: "sort_order", label: "Thứ tự"     },
];

// Từ điển auto-map header tiếng Việt (không dấu) → field
const HEADER_HINTS = {
  "ma hang": "sku", "ma sp": "sku", "ma san pham": "sku", "sku": "sku", "code": "sku", "ma": "sku",
  "ten": "name", "ten sp": "name", "ten san pham": "name", "name": "name", "ten hang": "name", "san pham": "name",
  "gia goc": "price", "gia": "price", "gia ban": "final_price", "price": "price", "final price": "final_price",
  "giam": "discount", "giam gia": "discount", "% giam": "discount", "discount": "discount",
  "ton": "stock", "ton kho": "stock", "stock": "stock", "so luong": "stock",
  "don vi": "unit", "dvt": "unit", "unit": "unit",
  "nhom": "group_name", "ten nhom": "group_name", "group": "group_name", "danh muc": "group_name",
  "ghi chu": "note", "note": "note", "mo ta": "note",
  "thu tu": "sort_order", "sort": "sort_order", "stt": "sort_order",
};

function removeDiacritics(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function autoMapHeader(header) {
  const norm = removeDiacritics(header);
  if (HEADER_HINTS[norm]) return HEADER_HINTS[norm];
  // Thử match từng từ
  for (const [hint, field] of Object.entries(HEADER_HINTS)) {
    if (norm.includes(hint)) return field;
  }
  return "__skip__";
}

function fmt(n) { return Number(n || 0).toLocaleString("vi-VN") + " đ"; }
function calcFinal(p, d) { return Math.round(Number(p || 0) * (1 - Number(d || 0) / 100)); }

// ─── Component chính ────────────────────────────────────────────────────────
export default function PriceList() {
  // ─── State danh sách ───────────────────────────────────────────────────
  const [rows,        setRows]        = useState([]);
  const [groups,      setGroups]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [tab,         setTab]         = useState("active");
  const [search,      setSearch]      = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [page,        setPage]        = useState(1);
  const [total,       setTotal]       = useState(0);

  // ─── State modal ───────────────────────────────────────────────────────
  const [editingRow, setEditingRow] = useState(null);   // null = đóng, {} = thêm mới, {...} = sửa
  const [importOpen, setImportOpen] = useState(false);

  // ─── Fetch data ────────────────────────────────────────────────────────
  // Nguồn dữ liệu chính là danh sách SẢN PHẨM (productsApi) — sản phẩm nào
  // cũng phải xuất hiện trong bảng giá, kể cả khi chưa có dòng giá riêng.
  // Dòng giá đã cấu hình (priceListApi, khớp theo SKU) sẽ override giá trị mặc định.
  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: LIMIT };
      if (search)      params.search   = search;
      if (groupFilter) params.group_id = groupFilter;
      if (tab === "active")        params.is_active = true;
      else if (tab === "inactive") params.is_active = false;

      const [productsRes, priceRes] = await Promise.all([
        productsApi.getAll(params),
        priceListApi.getAll({ page: 1, limit: 9999 }),
      ]);

      const priceBySku = new Map(
        (priceRes.data || []).map((p) => [p.sku, p])
      );

      const merged = (productsRes.data || []).map((prod) => {
        const priceRow = priceBySku.get(prod.sku);
        if (priceRow) {
          // Đã có dòng giá riêng → dùng dữ liệu đó, nhưng vẫn giữ product_id để tham chiếu
          return { ...priceRow, product_id: prod.id };
        }
        // Chưa có dòng giá riêng → tạo dòng mặc định từ chính sản phẩm
        return {
          id: `prod-${prod.id}`,     // id tạm, chưa phải bản ghi price list thật
          product_id: prod.id,
          sku: prod.sku,
          name: prod.name,
          group_id: prod.group_id,
          group_name: prod.group_name,
          price: prod.price ?? 0,
          discount: prod.discount ?? 0,
          final_price: calcFinal(prod.price, prod.discount),
          stock: prod.stock ?? 0,
          unit: prod.unit || "cái",
          note: null,
          is_active: prod.is_active ?? true,
          sort_order: 0,
          _isNewFromProduct: true,   // đánh dấu: chưa có bản ghi giá riêng, cần create khi lưu
        };
      });

      setRows(merged);
      setTotal(productsRes.total ?? merged.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, groupFilter, tab]);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await productGroupsApi.getAll();
      setGroups(res.data || []);
    } catch {}
  }, []);

  useEffect(() => { fetchRows();    }, [fetchRows]);
  useEffect(() => { fetchGroups();  }, [fetchGroups]);

  // ─── Chuyển tab / search / filter ──────────────────────────────────────
  const handleChangeTab = (k) => { setTab(k); setPage(1); };
  const handleSearch   = (e) => { setSearch(e.target.value); setPage(1); };
  const handleGroupFilter = (e) => { setGroupFilter(e.target.value); setPage(1); };

  // ─── Helper: đảm bảo dòng giá đã tồn tại thật trong DB, trả về id thật ──
  // Nếu dòng đang là "_isNewFromProduct" (mới merge từ sản phẩm, chưa có bản
  // ghi giá riêng) thì tạo mới trước khi update/toggle/delete.
  const ensurePriceRow = async (row) => {
    if (!row._isNewFromProduct) return row.id;
    const created = await priceListApi.create({
      sku: row.sku,
      name: row.name,
      group_id: row.group_id || null,
      group_name: row.group_name || null,
      price: row.price,
      discount: row.discount,
      final_price: row.final_price,
      stock: row.stock,
      unit: row.unit,
      note: row.note,
      is_active: row.is_active,
      sort_order: row.sort_order,
    });
    return created?.id ?? created?.data?.id;
  };

  // ─── Toggle ẩn/hiện 1 dòng ────────────────────────────────────────────
  const handleToggleActive = async (row) => {
    try {
      const realId = await ensurePriceRow(row);
      await priceListApi.update(realId, { is_active: !row.is_active });
      fetchRows();
    } catch (err) { alert("Lỗi: " + err.message); }
  };

  // ─── Xóa 1 dòng ───────────────────────────────────────────────────────
  const handleDelete = async (row) => {
    if (!window.confirm(`Xóa vĩnh viễn dòng giá "${row.name}" (SKU: ${row.sku})?`)) return;
    try {
      if (row._isNewFromProduct) {
        // Chưa có bản ghi giá riêng thì không có gì để xóa trong bảng giá
        alert("Dòng này chưa có cấu hình giá riêng, không có gì để xóa.");
        return;
      }
      await priceListApi.remove(row.id);
      fetchRows();
    } catch (err) { alert("Lỗi xóa: " + err.message); }
  };

  // ─── Bulk toggle / delete ─────────────────────────────────────────────
  const [selected, setSelected] = useState([]);
  const allSelected = rows.length > 0 && selected.length === rows.length;
  const toggleAll   = () => setSelected(allSelected ? [] : rows.map((r) => r.id));
  const toggleOne   = (id) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  useEffect(() => { setSelected([]); }, [tab]);

  const handleBulkToggle = async (target) => {
    if (!selected.length) return;
    try {
      const selectedRows = rows.filter((r) => selected.includes(r.id));
      await Promise.all(selectedRows.map(async (row) => {
        const realId = await ensurePriceRow(row);
        return priceListApi.update(realId, { is_active: target });
      }));
      setSelected([]);
      fetchRows();
    } catch (err) { alert("Lỗi: " + err.message); }
  };
  const handleBulkDelete = async () => {
    if (!selected.length) return;
    if (!window.confirm(`Xóa vĩnh viễn ${selected.length} dòng đã chọn?`)) return;
    try {
      const selectedRows = rows.filter((r) => selected.includes(r.id) && !r._isNewFromProduct);
      await Promise.all(selectedRows.map((row) => priceListApi.remove(row.id)));
      setSelected([]);
      fetchRows();
    } catch (err) { alert("Lỗi: " + err.message); }
  };

  // ─── Save 1 dòng (thêm / sửa) ────────────────────────────────────────
  const handleSaved = () => { setEditingRow(null); fetchRows(); };

  // ─── Export ───────────────────────────────────────────────────────────
  const exportRows = useMemo(() => rows, [rows]);

  const handleExportXlsx = () => {
    if (!exportRows.length) { alert("Không có dữ liệu để xuất"); return; }
    const data = exportRows.map((r, i) => ({
      "STT": i + 1,
      "Mã SKU": r.sku,
      "Tên sản phẩm": r.name,
      "Nhóm": r.group_name || "",
      "Giá gốc": Number(r.price || 0),
      "% Giảm": Number(r.discount || 0),
      "Giá bán": Number(r.final_price || 0),
      "Tồn kho": r.stock || 0,
      "Đơn vị": r.unit || "",
      "Ghi chú": r.note || "",
      "Trạng thái": r.is_active ? "Đang áp dụng" : "Đã ẩn",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bảng giá");
    // Set độ rộng cột
    ws["!cols"] = [
      { wch: 5 }, { wch: 12 }, { wch: 35 }, { wch: 18 }, { wch: 12 },
      { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 25 }, { wch: 14 },
    ];
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `bang-gia-${today}.xlsx`);
  };

  const handleExportCsv = () => {
    if (!exportRows.length) { alert("Không có dữ liệu để xuất"); return; }
    const header = ["STT", "Mã SKU", "Tên sản phẩm", "Nhóm", "Giá gốc", "% Giảm", "Giá bán", "Tồn kho", "Đơn vị", "Ghi chú", "Trạng thái"];
    const esc = (v) => {
      const s = String(v ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const lines = [header.join(",")];
    exportRows.forEach((r, i) => {
      lines.push([
        i + 1, r.sku, r.name, r.group_name || "",
        Number(r.price || 0), Number(r.discount || 0), Number(r.final_price || 0),
        r.stock || 0, r.unit || "", r.note || "",
        r.is_active ? "Đang áp dụng" : "Đã ẩn",
      ].map(esc).join(","));
    });
    // Thêm BOM để Excel đọc đúng tiếng Việt
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `bang-gia-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Render ───────────────────────────────────────────────────────────
  if (editingRow !== null) {
    return (
      <EditPriceRow
        initial={editingRow}
        groups={groups}
        onBack={() => setEditingRow(null)}
        onSaved={handleSaved}
      />
    );
  }

  return (
    <div className="pl-page main-content">

      {/* Header */}
      <div className="pl-header">
        <h1>Bảng giá sản phẩm</h1>
        <div className="pl-header-actions">
          <button className="pl-btn" onClick={handleExportXlsx}>
            <i className="fas fa-file-excel" /> Xuất Excel
          </button>
          <button className="pl-btn" onClick={handleExportCsv}>
            <i className="fas fa-file-csv" /> Xuất CSV
          </button>
          <button className="pl-btn pl-btn-success" onClick={() => setImportOpen(true)}>
            <i className="fas fa-upload" /> Tải Excel lên
          </button>
          <button className="pl-btn pl-btn-primary" onClick={() => setEditingRow({})}>
            <i className="fas fa-plus" /> Thêm dòng
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="pl-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`pl-tab${tab === t.key ? " active" : ""}`}
            onClick={() => handleChangeTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filter */}
      <div className="pl-filter">
        <div className="pl-search">
          <i className="fas fa-search" />
          <input
            type="text"
            placeholder="Tìm theo tên sản phẩm hoặc SKU..."
            value={search}
            onChange={handleSearch}
          />
        </div>
        <select className="pl-select" value={groupFilter} onChange={handleGroupFilter}>
          <option value="">Tất cả nhóm</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>

        {selected.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {tab === "inactive" ? (
              <button className="pl-btn pl-btn-success" onClick={() => handleBulkToggle(true)}>
                <i className="fas fa-eye" /> Hiện {selected.length} dòng
              </button>
            ) : tab === "active" ? (
              <button className="pl-btn" onClick={() => handleBulkToggle(false)}>
                <i className="fas fa-eye-slash" /> Ẩn {selected.length} dòng
              </button>
            ) : (
              <>
                <button className="pl-btn pl-btn-success" onClick={() => handleBulkToggle(true)}>
                  <i className="fas fa-eye" /> Hiện
                </button>
                <button className="pl-btn" onClick={() => handleBulkToggle(false)}>
                  <i className="fas fa-eye-slash" /> Ẩn
                </button>
              </>
            )}
            <button className="pl-btn pl-btn-danger" onClick={handleBulkDelete}>
              <i className="fas fa-trash" /> Xóa {selected.length}
            </button>
            <button className="pl-btn" onClick={() => setSelected([])}>Bỏ chọn</button>
          </div>
        )}
      </div>

      {error && (
        <div className="pl-error">
          ⚠️ {error} —{" "}
          <button onClick={fetchRows} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", textDecoration: "underline" }}>
            Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <div className="pl-loading">⌛ Đang tải bảng giá...</div>
      ) : rows.length === 0 ? (
        <div className="pl-empty">
          <div className="icon">📋</div>
          <h3>Chưa có sản phẩm nào</h3>
          <p>Thêm sản phẩm ở Quản lý sản phẩm hoặc thêm dòng giá thủ công tại đây.</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button className="pl-btn pl-btn-primary" onClick={() => setEditingRow({})}>
              <i className="fas fa-plus" /> Thêm dòng
            </button>
            <button className="pl-btn pl-btn-success" onClick={() => setImportOpen(true)}>
              <i className="fas fa-upload" /> Tải Excel lên
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="pl-table-wrap">
            <table className="pl-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                  </th>
                  <th>SKU</th>
                  <th>Tên sản phẩm</th>
                  <th>Nhóm</th>
                  <th className="right">Giá gốc</th>
                  <th className="right">% Giảm</th>
                  <th className="right">Giá bán</th>
                  <th className="right">Tồn</th>
                  <th>Đơn vị</th>
                  <th className="center">Trạng thái</th>
                  <th className="center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={!r.is_active ? "pl-row-hidden" : ""}>
                    <td>
                      <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggleOne(r.id)} />
                    </td>
                    <td><span className="pl-sku">{r.sku}</span></td>
                    <td>
                      <span className="pl-name">{r.name}</span>
                      {/* {r._isNewFromProduct && (
                        <span className="pl-badge" style={{ marginLeft: 6, background: "#eef2ff", color: "#4338ca" }}>
                          Chưa cấu hình giá riêng
                        </span>
                      )} */}
                    </td>
                    <td><span className="pl-group">{r.group_name || "—"}</span></td>
                    <td className="right pl-price">{fmt(r.price)}</td>
                    <td className="right">
                      {Number(r.discount) > 0 ? <span className="pl-discount">-{Number(r.discount)}%</span> : "—"}
                    </td>
                    <td className="right pl-price-final">{fmt(r.final_price)}</td>
                    <td className="right">
                      <span className={`pl-stock ${r.stock <= 0 ? "out" : r.stock < 10 ? "low" : ""}`}>
                        {r.stock}
                      </span>
                    </td>
                    <td>{r.unit || "—"}</td>
                    <td className="center">
                      <span className={`pl-badge ${r.is_active ? "active" : "inactive"}`}>
                        {r.is_active ? "Đang áp dụng" : "Đã ẩn"}
                      </span>
                    </td>
                    <td className="center">
                      <button className="pl-icon-btn edit"   title="Sửa"     onClick={() => setEditingRow(r)}>
                        <i className="fas fa-pen" />
                      </button>
                      <button className="pl-icon-btn toggle" title={r.is_active ? "Ẩn" : "Hiện"} onClick={() => handleToggleActive(r)}>
                        <i className={`fas ${r.is_active ? "fa-eye-slash" : "fa-eye"}`} />
                      </button>
                      <button className="pl-icon-btn danger" title="Xóa"      onClick={() => handleDelete(r)}>
                        <i className="fas fa-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pl-pagination">
            <span>Hiển thị {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} / {total} dòng</span>
            <div className="pl-pagination-buttons">
              <button className="pl-page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                ← Trước
              </button>
              <button className="pl-page-btn" onClick={() => setPage((p) => p + 1)} disabled={page * LIMIT >= total}>
                Sau →
              </button>
            </div>
          </div>
        </>
      )}

      {importOpen && (
        <ImportModal
          groups={groups}
          onClose={() => setImportOpen(false)}
          onDone={() => { setImportOpen(false); fetchRows(); }}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Form thêm / sửa 1 dòng
// ════════════════════════════════════════════════════════════════════════════
function EditPriceRow({ initial, groups, onBack, onSaved }) {
  // "isEdit" chỉ đúng khi dòng đã có bản ghi giá riêng thật sự (không phải
  // dòng vừa merge tạm từ sản phẩm — _isNewFromProduct). Với dòng merge tạm,
  // dù có "id" tạm (prod-xxx) vẫn phải create mới, không update.
  const isEdit = !!initial?.id && !initial?._isNewFromProduct;
  const [sku,        setSku]        = useState(initial.sku || "");
  const [name,       setName]       = useState(initial.name || "");
  const [groupId,    setGroupId]    = useState(initial.group_id || "");
  const [price,      setPrice]      = useState(initial.price ?? 0);
  const [discount,   setDiscount]   = useState(initial.discount ?? 0);
  const [finalPrice, setFinalPrice] = useState(initial.final_price ?? 0);
  const [stock,      setStock]      = useState(initial.stock ?? 0);
  const [unit,       setUnit]       = useState(initial.unit || "cái");
  const [note,       setNote]       = useState(initial.note || "");
  const [isActive,   setIsActive]   = useState(initial.is_active ?? true);
  const [sortOrder,  setSortOrder]  = useState(initial.sort_order ?? 0);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");

  // Auto-calc final_price khi đổi price hoặc discount
  useEffect(() => {
    if (!isEdit || finalPrice === 0 || finalPrice === calcFinal(initial.price, initial.discount)) {
      setFinalPrice(calcFinal(price, discount));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price, discount]);

  const handleSave = async (e) => {
    e?.preventDefault?.();
    if (!sku.trim())  { setError("Vui lòng nhập Mã SKU"); return; }
    if (!name.trim()) { setError("Vui lòng nhập Tên sản phẩm"); return; }

    setSaving(true);
    setError("");
    try {
      const grp = groups.find((g) => String(g.id) === String(groupId));
      const body = {
        sku: sku.trim(),
        name: name.trim(),
        group_id: groupId || null,
        group_name: grp?.name || null,
        price: Number(price) || 0,
        discount: Number(discount) || 0,
        final_price: Number(finalPrice) || calcFinal(price, discount),
        stock: Number(stock) || 0,
        unit: unit || "cái",
        note: note || null,
        is_active: !!isActive,
        sort_order: Number(sortOrder) || 0,
      };
      if (isEdit) {
        await priceListApi.update(initial.id, body);
      } else {
        // Bao gồm cả trường hợp dòng vừa merge tạm từ sản phẩm (_isNewFromProduct)
        // → chưa có bản ghi giá riêng, cần tạo mới. Backend nên upsert theo SKU.
        await priceListApi.create(body);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pl-page main-content">
      <div className="pl-header">
        <h1>{isEdit ? `Sửa dòng giá: ${initial.name}` : "Thêm dòng giá mới"}</h1>
        <div className="pl-header-actions">
          <button className="pl-btn" onClick={onBack}><i className="fas fa-arrow-left" /> Hủy</button>
          <button className="pl-btn pl-btn-primary" onClick={handleSave} disabled={saving}>
            <i className="fas fa-save" /> {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>

      {error && <div className="pl-error">⚠️ {error}</div>}

      <div className="pl-table-wrap" style={{ padding: 20 }}>
        <div className="pl-form-grid">
          <div className="pl-field">
            <label><span className="req">*</span> Mã SKU</label>
            <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="VD: SP001" />
            <span className="hint">SKU trùng → tự động cập nhật</span>
          </div>
          <div className="pl-field">
            <label><span className="req">*</span> Tên sản phẩm</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="pl-field full">
            <label>Nhóm sản phẩm</label>
            <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              <option value="">— Chọn nhóm —</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          <div className="pl-field">
            <label>Giá gốc (đ)</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} min="0" step="100" />
          </div>
          <div className="pl-field">
            <label>% Giảm giá</label>
            <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} min="0" max="100" step="0.1" />
          </div>

          <div className="pl-field">
            <label>Giá bán (sau giảm, đ)</label>
            <input type="number" value={finalPrice} onChange={(e) => setFinalPrice(e.target.value)} min="0" step="100" />
            <span className="hint">Tự tính từ giá gốc × (1 - %giảm), có thể sửa tay</span>
          </div>
          <div className="pl-field">
            <label>Tồn kho</label>
            <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} min="0" />
          </div>

          <div className="pl-field">
            <label>Đơn vị tính</label>
            <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="chai, túi, hộp, kg..." />
          </div>
          <div className="pl-field">
            <label>Thứ tự hiển thị</label>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </div>

          <div className="pl-field full">
            <label>Ghi chú nội bộ</label>
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <div className="pl-field full">
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <span>Đang áp dụng (hiện trong bảng giá)</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Modal Import Excel (4 bước: chọn file → mapping → preview → lưu)
// ════════════════════════════════════════════════════════════════════════════
function ImportModal({ groups, onClose, onDone }) {
  const [step,      setStep]      = useState(1);
  const [fileName,  setFileName]  = useState("");
  const [rawRows,   setRawRows]   = useState([]);     // mảng 2D từ Excel
  const [headers,   setHeaders]   = useState([]);     // header gốc
  const [mapping,   setMapping]   = useState([]);     // [{ col, field }]
  const [preview,   setPreview]   = useState([]);     // [{ sku, name, ... }]
  const [error,     setError]     = useState("");
  const [saving,    setSaving]    = useState(false);
  const fileRef = useRef(null);

  // ─── Bước 1: đọc file ────────────────────────────────────────────────
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb  = XLSX.read(buf, { type: "array" });
      const ws  = wb.Sheets[wb.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      if (aoa.length < 2) {
        setError("File rỗng hoặc chỉ có 1 dòng header.");
        return;
      }
      const [headerRow, ...dataRows] = aoa;
      const cleanHeaders = headerRow.map((h, i) => String(h || `Cột ${i + 1}`).trim());
      setHeaders(cleanHeaders);
      setRawRows(dataRows.filter((r) => r.some((c) => String(c).trim() !== "")));
      // Auto-map
      setMapping(cleanHeaders.map((h) => ({ col: h, field: autoMapHeader(h) })));
      setStep(2);
    } catch (err) {
      setError("Không đọc được file: " + err.message);
    }
  };

  // ─── Bước 2 → 3: sinh preview từ mapping ──────────────────────────────
  useEffect(() => {
    if (step !== 3) return;
    const mapped = rawRows.map((r) => {
      const obj = {};
      mapping.forEach((m, i) => {
        if (m.field && m.field !== "__skip__") {
          obj[m.field] = r[i];
        }
      });
      // Chuẩn hóa kiểu dữ liệu
      obj.price       = Number(obj.price) || 0;
      obj.discount    = Number(obj.discount) || 0;
      obj.final_price = obj.final_price !== "" && obj.final_price != null
        ? Number(obj.final_price) || calcFinal(obj.price, obj.discount)
        : calcFinal(obj.price, obj.discount);
      obj.stock       = Number(obj.stock) || 0;
      obj.sort_order  = Number(obj.sort_order) || 0;
      obj.sku         = String(obj.sku || "").trim();
      obj.name        = String(obj.name || "").trim();
      obj.unit        = obj.unit ? String(obj.unit).trim() : "cái";
      obj.group_name  = obj.group_name ? String(obj.group_name).trim() : null;
      obj.note        = obj.note ? String(obj.note).trim() : null;
      return obj;
    });
    setPreview(mapped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, mapping]);

  // Tìm group_id từ group_name (nếu trùng tên)
  const enrichGroupId = (row) => {
    if (!row.group_name) return { ...row, group_id: null };
    const grp = groups.find((g) => removeDiacritics(g.name) === removeDiacritics(row.group_name));
    return { ...row, group_id: grp?.id || null };
  };

  // ─── Bước 3 → 4: lưu vào DB ─────────────────────────────────────────
  const handleSave = async () => {
    const valid = preview
      .map(enrichGroupId)
      .filter((r) => r.sku && r.name);

    if (!valid.length) { setError("Không có dòng nào hợp lệ (thiếu SKU hoặc tên)."); return; }

    setSaving(true);
    setError("");
    try {
      await priceListApi.bulkUpsert(valid);
      onDone();
    } catch (err) {
      setError("Lỗi lưu: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => {
    const total = preview.length;
    const valid = preview.filter((r) => r.sku && r.name).length;
    const invalid = total - valid;
    const hasGroupName = preview.filter((r) => r.group_name).length;
    return { total, valid, invalid, hasGroupName };
  }, [preview]);

  // Số field đã map (trừ __skip__)
  const mappedCount = mapping.filter((m) => m.field !== "__skip__").length;

  return (
    <div className="pl-modal-overlay" onClick={(e) => e.target.className === "pl-modal-overlay" && onClose()}>
      <div className="pl-modal" style={{ maxWidth: step === 3 ? 1100 : 800 }}>
        <div className="pl-modal-header">
          <h2><i className="fas fa-file-import" /> Import bảng giá từ Excel</h2>
          <button className="pl-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="pl-modal-body">
          {/* Step indicator */}
          <div className="pl-step-bar">
            <div className={`pl-step ${step === 1 ? "active" : step > 1 ? "done" : ""}`}>
              <span className="num">1</span> Chọn file
            </div>
            <div className="pl-step-sep" />
            <div className={`pl-step ${step === 2 ? "active" : step > 2 ? "done" : ""}`}>
              <span className="num">2</span> Mapping cột ({mappedCount}/{mapping.length})
            </div>
            <div className="pl-step-sep" />
            <div className={`pl-step ${step === 3 ? "active" : ""}`}>
              <span className="num">3</span> Xem trước & lưu
            </div>
          </div>

          {error && <div className="pl-error">⚠️ {error}</div>}

          {/* STEP 1: chọn file */}
          {step === 1 && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <i className="fas fa-file-excel" style={{ fontSize: 64, color: "#16a34a", marginBottom: 16 }} />
              <h3 style={{ marginTop: 0 }}>Chọn file Excel hoặc CSV</h3>
              <p style={{ color: "#6b7280" }}>
                Hỗ trợ .xlsx, .xls, .csv. Dòng đầu tiên phải là header.
              </p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} hidden />
              <button className="pl-btn pl-btn-primary" onClick={() => fileRef.current?.click()}>
                <i className="fas fa-folder-open" /> Chọn file
              </button>
              {fileName && <p style={{ marginTop: 12, color: "#6b7280" }}>Đã chọn: {fileName}</p>}
            </div>
          )}

          {/* STEP 2: mapping */}
          {step === 2 && (
            <>
              <p style={{ color: "#6b7280", fontSize: 13, marginTop: 0 }}>
                Hệ thống đã tự động nhận diện các cột phổ biến. Bạn có thể chỉnh lại nếu sai:
              </p>
              <table className="pl-mapping-table">
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>#</th>
                    <th>Tên cột trong file Excel</th>
                    <th>Map sang trường</th>
                    <th style={{ width: 80 }}>Xem trước</th>
                  </tr>
                </thead>
                <tbody>
                  {mapping.map((m, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td className="col-name">{m.col}</td>
                      <td>
                        <select
                          value={m.field}
                          onChange={(e) => {
                            const next = [...mapping];
                            next[i] = { ...m, field: e.target.value };
                            setMapping(next);
                          }}
                        >
                          {PRICE_FIELDS.map((f) => (
                            <option key={f.key} value={f.key}>{f.label}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ color: "#6b7280", fontSize: 12 }}>
                        {rawRows[0]?.[i] !== undefined ? String(rawRows[0][i]).slice(0, 20) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ color: "#6b7280", fontSize: 12, marginTop: 8 }}>
                <i className="fas fa-info-circle" /> Đã map {mappedCount}/{mapping.length} cột. Các cột "Bỏ qua" sẽ không được lưu.
              </p>
            </>
          )}

          {/* STEP 3: preview */}
          {step === 3 && (
            <>
              <div className="pl-stats">
                <div className="stat">Tổng dòng đọc: <strong>{stats.total}</strong></div>
                <div className="stat">Hợp lệ: <strong>{stats.valid}</strong></div>
                {stats.invalid > 0 && (
                  <div className="stat error">Lỗi (thiếu SKU/tên): <strong>{stats.invalid}</strong></div>
                )}
                <div className="stat">Có nhóm: <strong>{stats.hasGroupName}</strong></div>
              </div>

              <p style={{ color: "#6b7280", fontSize: 13, marginTop: 0 }}>
                Bạn có thể sửa trực tiếp SKU/tên/giá trước khi lưu. SKU trùng → cập nhật, SKU mới → thêm mới.
              </p>

              <div style={{ overflowX: "auto", maxHeight: 400, overflowY: "auto" }}>
                <table className="pl-preview-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>SKU *</th>
                      <th>Tên *</th>
                      <th>Nhóm</th>
                      <th>Giá gốc</th>
                      <th>%</th>
                      <th>Giá bán</th>
                      <th>Tồn</th>
                      <th>ĐV</th>
                      <th>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => {
                      const bad = !r.sku || !r.name;
                      return (
                        <tr key={i} className={bad ? "err" : ""}>
                          <td>{i + 1}</td>
                          <td>
                            <input value={r.sku} onChange={(e) => {
                              const next = [...preview]; next[i] = { ...r, sku: e.target.value }; setPreview(next);
                            }} />
                          </td>
                          <td>
                            <input value={r.name} onChange={(e) => {
                              const next = [...preview]; next[i] = { ...r, name: e.target.value }; setPreview(next);
                            }} />
                          </td>
                          <td>
                            <input value={r.group_name || ""} onChange={(e) => {
                              const next = [...preview]; next[i] = { ...r, group_name: e.target.value }; setPreview(next);
                            }} />
                          </td>
                          <td>
                            <input type="number" value={r.price} onChange={(e) => {
                              const price = Number(e.target.value) || 0;
                              const next  = [...preview];
                              next[i]    = { ...r, price, final_price: calcFinal(price, r.discount) };
                              setPreview(next);
                            }} />
                          </td>
                          <td>
                            <input type="number" value={r.discount} onChange={(e) => {
                              const discount = Number(e.target.value) || 0;
                              const next    = [...preview];
                              next[i]      = { ...r, discount, final_price: calcFinal(r.price, discount) };
                              setPreview(next);
                            }} />
                          </td>
                          <td>
                            <input type="number" value={r.final_price} onChange={(e) => {
                              const next = [...preview]; next[i] = { ...r, final_price: Number(e.target.value) || 0 }; setPreview(next);
                            }} />
                          </td>
                          <td>
                            <input type="number" value={r.stock} onChange={(e) => {
                              const next = [...preview]; next[i] = { ...r, stock: Number(e.target.value) || 0 }; setPreview(next);
                            }} />
                          </td>
                          <td>
                            <input value={r.unit} onChange={(e) => {
                              const next = [...preview]; next[i] = { ...r, unit: e.target.value }; setPreview(next);
                            }} />
                          </td>
                          <td>
                            <input value={r.note || ""} onChange={(e) => {
                              const next = [...preview]; next[i] = { ...r, note: e.target.value }; setPreview(next);
                            }} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="pl-modal-footer">
          {step === 1 && (
            <button className="pl-btn" onClick={onClose}>Đóng</button>
          )}
          {step === 2 && (
            <>
              <button className="pl-btn" onClick={() => setStep(1)}>← Chọn lại file</button>
              <button
                className="pl-btn pl-btn-primary"
                onClick={() => setStep(3)}
                disabled={!headers.length}
              >
                Tiếp tục →
              </button>
            </>
          )}
          {step === 3 && (
            <>
              <button className="pl-btn" onClick={() => setStep(2)}>← Chỉnh mapping</button>
              <button
                className="pl-btn pl-btn-success"
                onClick={handleSave}
                disabled={saving || stats.valid === 0}
              >
                <i className="fas fa-save" /> {saving ? "Đang lưu..." : `Lưu ${stats.valid} dòng vào DB`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
