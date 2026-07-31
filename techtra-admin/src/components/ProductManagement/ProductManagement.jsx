// // import React, { useState, useEffect, useCallback } from "react";
// // import "./ProductManagement.css";
// // import CreateProduct from "./CreateProduct.jsx";
// // import { productsApi, productGroupsApi, priceListApi, supabase } from "../../api";


// // // 3 tab:
// // //   - "Chờ import": dòng trong price_list chưa có trong products (so sánh theo SKU)
// // //   - "Trên kệ" : products có is_active=true, status≠'deleted' (mặc định)
// // //   - "Đã xóa"  : products có status='deleted'
// // // Bỏ tab "Tất cả" theo yêu cầu.
// // const STATUS_TABS = [
// //   { key: "pending",  label: "Chờ import", filter: "pending"  },
// //   { key: "on-shelf", label: "Trên kệ",    filter: "active"   },
// //   { key: "deleted",  label: "Đã xóa",     filter: "deleted"  },
// // ];
// // const LIMIT = 20;

// // // Auto sinh slug từ tên (giống pattern trong CreateProductGroup)
// // function toSlug(str) {
// //   return (str || "")
// //     .normalize("NFD")
// //     .replace(/\p{Diacritic}/gu, "")
// //     .replace(/đ/g, "d").replace(/Đ/g, "D")
// //     .toLowerCase().trim()
// //     .replace(/[^a-z0-9\s-]/g, "")
// //     .replace(/\s+/g, "-");
// // }

// // export default function ProductManagement() {
// //   const [isCreating,      setIsCreating]      = useState(false);
// //   const [editingProduct,  setEditingProduct]  = useState(null);
// //   const [activeTab,       setActiveTab]       = useState("on-shelf"); // mặc định vào "Trên kệ"

// //   const [products,        setProducts]        = useState([]);
// //   const [groups,          setGroups]          = useState([]);
// //   const [loading,         setLoading]         = useState(true);
// //   const [error,           setError]           = useState("");
// //   const [searchText,      setSearchText]      = useState("");
// //   const [selectedGroup,   setSelectedGroup]   = useState("");
// //   const [selected,        setSelected]        = useState([]);
// //   const [page,            setPage]            = useState(1);
// //   const [total,           setTotal]           = useState(0);
// //   // Trong tab "Trên kệ": có hiển thị cả SP đang ẩn (is_active=false) để admin bật/tắt không?
// //   const [showHidden,      setShowHidden]      = useState(false);
// //   const [importing,       setImporting]       = useState(false);  // đang import hàng loạt

// //   // ─── Fetch sản phẩm (cả 3 tab dùng chung) ────────────────────────────────
// //   const fetchProducts = useCallback(async () => {
// //     setLoading(true);
// //     setError("");
// //     try {
// //       const params = { page, limit: LIMIT };
// //       if (searchText)    params.search   = searchText;
// //       if (selectedGroup) params.group_id = selectedGroup;

// //       if (activeTab === "pending") {
// //         // Tab "Chờ import": lấy từ price_list, loại trừ SKU đã có trong products
// //         const res = await priceListApi.getPendingImport(params);
// //         setProducts(res.data || []);
// //         setTotal(res.total  || 0);
// //         setLoading(false);
// //         return;
// //       }

// //       // Map tab products
// //       if (activeTab === "deleted") {
// //         params.status = "deleted";
// //         params.includeDeleted = true;
// //       } else if (activeTab === "on-shelf") {
// //         params.status = "active";
// //       }

// //       const res = await productsApi.getAll(params);
// //       let list = res.data || [];
// //       // Tab "Trên kệ": nếu chỉ muốn xem SP đang ẩn (is_active=false) để bật lên
// //       if (activeTab === "on-shelf" && showHidden) {
// //         list = list.filter((p) => !p.is_active);
// //       }
// //       setProducts(list);
// //       setTotal(res.total  || 0);
// //     } catch (err) {
// //       setError(err.message);
// //     } finally {
// //       setLoading(false);
// //     }
// //   }, [page, searchText, selectedGroup, activeTab, showHidden]);

// //   // // ─── Fetch nhóm (dropdown filter) ─────────────────────────────────────────
// //   // const fetchGroups = useCallback(async () => {
// //   //   try {
// //   //     const res = await productGroupsApi.getAll();
// //   //     setGroups(res.data || []);
// //   //   } catch {}
// //   // }, []);

// //   // useEffect(() => { fetchProducts(); }, [fetchProducts]);
// //   // useEffect(() => { fetchGroups();   }, [fetchGroups]);

// //   // ─── Fetch nhóm (dropdown filter) ─────────────────────────────────────────
// // // Sắp xếp phân cấp: mỗi nhóm lớn (parent_id = null) đứng trước,
// // // theo sau là các nhóm con của nó (đánh dấu depth để thụt lề khi render).
// // const fetchGroups = useCallback(async () => {
// //   try {
// //     const res = await productGroupsApi.getAll();
// //     const all = res.data || [];

// //     const roots = all.filter((g) => !g.parent_id);
// //     const ordered = [];
// //     roots.forEach((root) => {
// //       ordered.push({ ...root, depth: 0 });
// //       all
// //         .filter((g) => g.parent_id === root.id)
// //         .forEach((child) => ordered.push({ ...child, depth: 1 }));
// //     });

// //     setGroups(ordered);
// //   } catch {}
// // }, []);

// // useEffect(() => { fetchProducts(); }, [fetchProducts]);
// // useEffect(() => { fetchGroups();   }, [fetchGroups]);

// //   // ─── Soft delete 1 sản phẩm (tab Trên kệ) ────────────────────────────────
// //   const handleSoftDelete = async (id, name) => {
// //     if (!window.confirm(`Xóa sản phẩm "${name}"?\n\nSản phẩm sẽ được chuyển vào mục "Đã xóa" — bạn có thể phục hồi lại bất cứ lúc nào.`)) return;
// //     try {
// //       await productsApi.softDelete(id);
// //       fetchProducts();
// //     } catch (err) {
// //       alert("Lỗi xóa: " + err.message);
// //     }
// //   };

// //   // ─── Xóa vĩnh viễn 1 sản phẩm (tab Đã xóa) ───────────────────────────────
// //   const handleHardDelete = async (id, name) => {
// //     if (!window.confirm(`⚠️ XÓA VĨNH VIỄN "${name}"?\n\nHành động này KHÔNG THỂ hoàn tác. Sản phẩm sẽ bị xóa hẳn khỏi cơ sở dữ liệu.`)) return;
// //     if (!window.confirm(`Xác nhận lần 2: Xóa vĩnh viễn "${name}"?`)) return;
// //     try {
// //       await productsApi.remove(id);
// //       fetchProducts();
// //     } catch (err) {
// //       alert("Lỗi xóa: " + err.message);
// //     }
// //   };

// //   // ─── Phục hồi 1 sản phẩm (tab Đã xóa) ───────────────────────────────────
// //   const handleRestore = async (id, name) => {
// //     if (!window.confirm(`Phục hồi sản phẩm "${name}"?\n\nSản phẩm sẽ được chuyển về trạng thái "Trên kệ" (is_active = true, status = active).`)) return;
// //     try {
// //       await productsApi.restore(id);
// //       fetchProducts();
// //     } catch (err) {
// //       alert("Lỗi phục hồi: " + err.message);
// //     }
// //   };

// //   // ─── Bật / tắt nhanh "Hiện trên web" cho 1 SP ────────────────────────────
// //   const handleToggleActive = async (p) => {
// //     const newState = !p.is_active;
// //     const action = newState ? "HIỆN" : "ẨN";
// //     if (!window.confirm(`${action} sản phẩm "${p.name}" trên web?`)) return;
// //     try {
// //       await productsApi.update(p.id, { is_active: newState });
// //       fetchProducts();
// //     } catch (err) {
// //       alert("Lỗi: " + err.message);
// //     }
// //   };

// //   // ─── Soft delete nhiều (tab Trên kệ) ────────────────────────────────────
// //   const handleDeleteSelected = async () => {
// //     if (!selected.length || !window.confirm(`Xóa ${selected.length} sản phẩm đã chọn?\n\nCác sản phẩm sẽ được chuyển vào mục "Đã xóa".`)) return;
// //     try {
// //       await productsApi.bulkSoftDelete(selected);
// //       setSelected([]);
// //       fetchProducts();
// //     } catch (err) {
// //       alert("Lỗi: " + err.message);
// //     }
// //   };

// //   // ─── Phục hồi nhiều (tab Đã xóa) ─────────────────────────────────────────
// //   const handleRestoreSelected = async () => {
// //     if (!selected.length || !window.confirm(`Phục hồi ${selected.length} sản phẩm đã chọn?`)) return;
// //     try {
// //       await productsApi.bulkRestore(selected);
// //       setSelected([]);
// //       fetchProducts();
// //     } catch (err) {
// //       alert("Lỗi: " + err.message);
// //     }
// //   };

// //   // ─── Xóa vĩnh viễn nhiều (tab Đã xóa) ───────────────────────────────────
// //   const handleHardDeleteSelected = async () => {
// //     if (!selected.length) return;
// //     if (!window.confirm(`⚠️ XÓA VĨNH VIỄN ${selected.length} sản phẩm đã chọn?\n\nHành động này KHÔNG THỂ hoàn tác!`)) return;
// //     if (!window.confirm(`Xác nhận lần cuối: Xóa vĩnh viễn ${selected.length} sản phẩm?`)) return;
// //     try {
// //       await Promise.all(selected.map((id) => productsApi.remove(id)));
// //       setSelected([]);
// //       fetchProducts();
// //     } catch (err) {
// //       alert("Lỗi: " + err.message);
// //     }
// //   };

// //   // ─── IMPORT 1 dòng từ price_list sang products ───────────────────────────
// //   // Tạo record mới trong products với:
// //   //   sku, name, group_id, price, final_price, discount, stock, is_active=true, status='active'
// //   // Slug tự sinh từ tên + thêm suffix ngẫu nhiên nếu trùng.
// //   const handleImportOne = async (priceRow) => {
// //     if (!window.confirm(`Import "${priceRow.name}" (SKU: ${priceRow.sku}) vào danh sách sản phẩm?\n\nSản phẩm sẽ được tạo ở trạng thái ẨN. Bạn cần bổ sung thông tin (ảnh, mô tả, trọng lượng, kích thước) rồi bật "Hiện trên web" trong trang chi tiết.`)) return;
// //     try {
// //       await importRowsToProducts([priceRow]);
// //       fetchProducts();
// //     } catch (err) {
// //       alert("Lỗi import: " + err.message);
// //     }
// //   };

// //   // ─── IMPORT nhiều dòng đã chọn (tab Chờ import) ──────────────────────────
// //   const handleImportSelected = async () => {
// //     if (!selected.length) return;
// //     if (!window.confirm(`Import ${selected.length} sản phẩm đã chọn từ bảng giá vào danh sách sản phẩm?\n\nTất cả sẽ được tạo ở trạng thái ẨN. Bạn cần bổ sung thông tin cho từng SP rồi bật "Hiện trên web".`)) return;
// //     try {
// //       setImporting(true);
// //       const rows = products.filter((r) => selected.includes(r.id));
// //       await importRowsToProducts(rows);
// //       setSelected([]);
// //       fetchProducts();
// //     } catch (err) {
// //       alert("Lỗi import: " + err.message);
// //     } finally {
// //       setImporting(false);
// //     }
// //   };

// //   // Helper: convert price_list row → products row, xử lý slug trùng
// //   async function importRowsToProducts(rows) {
// //     if (!rows.length) return;
// //     // Lấy slug hiện tại để tránh trùng
// //     const existingSlugs = new Set(await productsApi.getAllSlugs());

// //     const usedInBatch = new Set();
// //     const toInsert = rows.map((r) => {
// //       let baseSlug = toSlug(r.name) || toSlug(r.sku) || `sp-${r.id}`;
// //       let slug = baseSlug;
// //       let i = 1;
// //       while (existingSlugs.has(slug) || usedInBatch.has(slug)) {
// //         slug = `${baseSlug}-${++i}`;
// //       }
// //       usedInBatch.add(slug);

// //       return {
// //         name:        r.name,
// //         slug,
// //         sku:         r.sku,
// //         group_id:    r.group_id || null,
// //         price:       Number(r.price) || 0,
// //         final_price: Number(r.final_price) || Number(r.price) || 0,
// //         discount:    Number(r.discount) || 0,
// //         stock:       Number(r.stock) || 0,
// //         // SP mới import mặc định ẨN trên web — admin tự bật khi đã có đủ thông tin
// //         is_active:   false,
// //         status:      "active",
// //         rating:      5,
// //         reviews:     0,
// //         is_new:      true,
// //       };
// //     });

// //     const { error } = await supabase.from("products").insert(toInsert);
// //     if (error) throw new Error(error.message);
// //   }

// //   // ─── Sau khi lưu form tạo/sửa ───────────────────────────────────────────
// //   const handleSaved = () => {
// //     setIsCreating(false);
// //     setEditingProduct(null);
// //     fetchProducts();
// //   };

// //   // ─── Select ───────────────────────────────────────────────────────────────
// //   const allSelected = products.length > 0 && selected.length === products.length;
// //   const toggleAll   = () => setSelected(allSelected ? [] : products.map((p) => p.id));
// //   const toggleOne   = (id) =>
// //     setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

// //   const fmt = (n) => Number(n).toLocaleString("vi-VN") + " đ";

// //   // ─── Khi chuyển tab: reset selection + page ───────────────────────────────
// //   const handleChangeTab = (tabKey) => {
// //     setActiveTab(tabKey);
// //     setPage(1);
// //     setSelected([]);
// //     setShowHidden(false); // reset sub-filter
// //   };

// //   const isPendingTab  = activeTab === "pending";
// //   const isDeletedTab  = activeTab === "deleted";

// //   // ─── Render form tạo/sửa ──────────────────────────────────────────────────
// //   if (isCreating || editingProduct) {
// //     return (
// //       <CreateProduct
// //         initialData={editingProduct}
// //         groups={groups}
// //         onBack={() => { setIsCreating(false); setEditingProduct(null); }}
// //         onSaved={handleSaved}
// //       />
// //     );
// //   }

// //   return (
// //     <div className="main-content">

// //       {/* Header */}
// //       <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
// //         <h1>Quản lý sản phẩm</h1>
// //         <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
// //           + Thêm sản phẩm
// //         </button>
// //       </div>

// //       {/* Tabs */}
// //       <div className="tabs">
// //         {STATUS_TABS.map((tab) => (
// //           <button
// //             key={tab.key}
// //             className={`tab${activeTab === tab.key ? " active" : ""}`}
// //             onClick={() => handleChangeTab(tab.key)}
// //           >
// //             {tab.label}
// //           </button>
// //         ))}
// //       </div>

// //       {/* Filter bar */}
// //       <div style={{ display: "flex", gap: "10px", margin: "16px 0", flexWrap: "wrap", alignItems: "center" }}>
// //         <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
// //           <i className="fas fa-search" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
// //           <input
// //             type="text"
// //             placeholder={
// //               isPendingTab ? "Tìm trong bảng giá..." :
// //               isDeletedTab ? "Tìm trong các sản phẩm đã xóa..." :
// //               "Tìm kiếm sản phẩm..."
// //             }
// //             value={searchText}
// //             onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
// //             style={{ width: "100%", padding: "9px 12px 9px 36px", border: "1px solid #d1d5db", borderRadius: "8px", boxSizing: "border-box", outline: "none", fontSize: "14px" }}
// //           />
// //         </div>

// //         <select
// //           value={selectedGroup}
// //           onChange={(e) => { setSelectedGroup(e.target.value); setPage(1); }}
// //           style={{ padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: "8px", outline: "none", fontSize: "14px", color: selectedGroup ? "#111827" : "#9ca3af" }}
// //         >
// //           <option value="">Tất cả nhóm</option>
// //           {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
// //         </select>

// //         {selected.length > 0 && (
// //           <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
// //             {isPendingTab ? (
// //               <button
// //                 onClick={handleImportSelected}
// //                 disabled={importing}
// //                 style={{ padding: "9px 14px", background: "#16a34a", border: "1px solid #16a34a", borderRadius: "8px", color: "white", cursor: importing ? "wait" : "pointer", fontSize: "13px", fontWeight: "600" }}
// //                 title="Import các sản phẩm đã chọn vào danh sách sản phẩm (mặc định ẩn)"
// //               >
// //                 {importing ? "⌛ Đang import..." : `📥 Import ${selected.length} vào sản phẩm`}
// //               </button>
// //             ) : isDeletedTab ? (
// //               <>
// //                 <button
// //                   onClick={handleRestoreSelected}
// //                   style={{ padding: "9px 14px", background: "#dcfce7", border: "1px solid #86efac", borderRadius: "8px", color: "#15803d", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}
// //                   title="Phục hồi các sản phẩm đã chọn"
// //                 >
// //                   ↺ Phục hồi {selected.length}
// //                 </button>
// //                 <button
// //                   onClick={handleHardDeleteSelected}
// //                   style={{ padding: "9px 14px", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}
// //                   title="Xóa vĩnh viễn các sản phẩm đã chọn (KHÔNG thể phục hồi)"
// //                 >
// //                   🗑 Xóa vĩnh viễn {selected.length}
// //                 </button>
// //               </>
// //             ) : (
// //               <button
// //                 onClick={handleDeleteSelected}
// //                 style={{ padding: "9px 14px", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}
// //                 title="Chuyển các sản phẩm đã chọn vào mục Đã xóa"
// //               >
// //                 🗑 Xóa {selected.length} mục
// //               </button>
// //             )}
// //             <button
// //               onClick={() => setSelected([])}
// //               style={{ padding: "9px 14px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "8px", color: "#475569", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}
// //             >
// //               Bỏ chọn
// //             </button>
// //           </div>
// //         )}
// //       </div>

// //       {/* Sub-filter: chỉ áp dụng cho tab "Trên kệ" */}
// //       {activeTab === "on-shelf" && (
// //         <div style={{ display: "flex", gap: "6px", marginBottom: "14px", alignItems: "center", flexWrap: "wrap" }}>
// //           <span style={{ fontSize: "13px", color: "#64748b", marginRight: "4px" }}>Hiển thị:</span>
// //           <button
// //             onClick={() => { setShowHidden(false); setPage(1); }}
// //             style={{
// //               padding: "6px 12px", borderRadius: "999px", fontSize: "12.5px", fontWeight: 600, cursor: "pointer",
// //               background: !showHidden ? "#10b981" : "white",
// //               color:      !showHidden ? "white"  : "#475569",
// //               border:     !showHidden ? "1px solid #10b981" : "1px solid #e2e8f0",
// //             }}
// //             title="Chỉ hiển thị các sản phẩm đang hiện trên web (is_active = true)"
// //           >
// //             👁 Đang hiện
// //           </button>
// //           <button
// //             onClick={() => { setShowHidden(true); setPage(1); }}
// //             style={{
// //               padding: "6px 12px", borderRadius: "999px", fontSize: "12.5px", fontWeight: 600, cursor: "pointer",
// //               background: showHidden ? "#f59e0b" : "white",
// //               color:      showHidden ? "white"  : "#475569",
// //               border:     showHidden ? "1px solid #f59e0b" : "1px solid #e2e8f0",
// //             }}
// //             title="Chỉ hiển thị các sản phẩm đang ẩn trên web (is_active = false) — cần bổ sung thông tin và bật lên"
// //           >
// //             🙈 Đang ẩn
// //           </button>
// //         </div>
// //       )}

// //       {/* Error */}
// //       {error && (
// //         <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", fontSize: "14px", marginBottom: "16px" }}>
// //           ⚠️ {error} —{" "}
// //           <button onClick={fetchProducts} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", textDecoration: "underline" }}>
// //             Thử lại
// //           </button>
// //         </div>
// //       )}

// //       {/* Table */}
// //       {loading ? (
// //         <div style={{ textAlign: "center", padding: "48px", color: "#9ca3af" }}>⌛ Đang tải...</div>
// //       ) : products.length === 0 ? (
// //         <div className="empty-state">
// //           <div className="empty-icon">
// //             {isPendingTab ? "📥" : isDeletedTab ? "🗑️" : "😊"}
// //           </div>
// //           <h3>
// //             {isPendingTab ? "Không có sản phẩm chờ import" :
// //              isDeletedTab ? "Thùng rác trống" :
// //              showHidden ? "Không có sản phẩm đang ẩn" :
// //              "Chưa có sản phẩm"}
// //           </h3>
// //           <p>
// //             {isPendingTab
// //               ? "Tất cả sản phẩm trong bảng giá đã được import sang sản phẩm. Vào 'Bảng giá' để thêm dòng mới."
// //               : isDeletedTab
// //                 ? "Chưa có sản phẩm nào bị xóa."
// //                 : showHidden
// //                   ? "Tất cả sản phẩm đều đang hiện trên web. Bấm 'Đang hiện' để xem."
// //                   : "Bắt đầu bằng cách thêm sản phẩm mới hoặc import từ bảng giá."}
// //           </p>
// //           {!isPendingTab && !isDeletedTab && (
// //             <div className="empty-actions">
// //               <button className="btn btn-primary" onClick={() => setIsCreating(true)}>Thêm sản phẩm</button>
// //             </div>
// //           )}
// //         </div>
// //       ) : (
// //         <>
// //           <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
// //             <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
// //               <thead>
// //                 <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
// //                   <th style={{ padding: "12px 16px", width: "40px" }}>
// //                     <input type="checkbox" checked={allSelected} onChange={toggleAll} />
// //                   </th>
// //                   <th style={{ padding: "12px 16px", textAlign: "left",   fontWeight: "600", color: "#374151" }}>Sản phẩm</th>
// //                   <th style={{ padding: "12px 16px", textAlign: "left",   fontWeight: "600", color: "#374151" }}>Nhóm</th>
// //                   <th style={{ padding: "12px 16px", textAlign: "right",  fontWeight: "600", color: "#374151" }}>Giá</th>
// //                   <th style={{ padding: "12px 16px", textAlign: "right",  fontWeight: "600", color: "#374151" }}>Tồn kho</th>
// //                   <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: "600", color: "#374151" }}>Trạng thái</th>
// //                   <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: "600", color: "#374151" }}>Thao tác</th>
// //                 </tr>
// //               </thead>
// //               <tbody>
// //                 {products.map((p) => (
// //                   <tr
// //                     key={p.id}
// //                     style={{ borderBottom: "1px solid #f3f4f6", opacity: isDeletedTab ? 0.7 : 1 }}
// //                     onMouseEnter={(e) => e.currentTarget.style.background = "#fafafa"}
// //                     onMouseLeave={(e) => e.currentTarget.style.background = "white"}
// //                   >
// //                     <td style={{ padding: "12px 16px" }}>
// //                       <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleOne(p.id)} />
// //                     </td>
// //                     <td style={{ padding: "12px 16px" }}>
// //                       <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
// //                         {p.images?.[0] ? (
// //                           <img src={p.images[0]} alt={p.name} style={{ width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover" }} />
// //                         ) : (
// //                           <div style={{ width: "40px", height: "40px", background: "#f3f4f6", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#d1d5db" }}>📦</div>
// //                         )}
// //                         <div>
// //                           <div
// //                             style={{ fontWeight: "600", color: "#111827", cursor: (isPendingTab || isDeletedTab) ? "default" : "pointer" }}
// //                             onClick={() => !isPendingTab && !isDeletedTab && setEditingProduct(p)}
// //                           >
// //                             {p.name}
// //                           </div>
// //                           <div style={{ fontSize: "12px", color: "#9ca3af" }}>SKU: {p.sku || "--"}</div>
// //                         </div>
// //                       </div>
// //                     </td>
// //                     <td style={{ padding: "12px 16px", color: "#6b7280" }}>{p.group_name || "--"}</td>
// //                     <td style={{ padding: "12px 16px", textAlign: "right" }}>
// //                       <div style={{ fontWeight: "600", color: "#111827" }}>{fmt(p.final_price || p.price)}</div>
// //                       {Number(p.discount) > 0 && <div style={{ fontSize: "12px", color: "#10b981" }}>-{Number(p.discount)}%</div>}
// //                     </td>
// //                     <td style={{ padding: "12px 16px", textAlign: "right" }}>
// //                       <span style={{ color: p.stock <= 0 ? "#dc2626" : p.stock < 10 ? "#f59e0b" : "#111827", fontWeight: "600" }}>
// //                         {p.stock}
// //                       </span>
// //                     </td>
// //                     <td style={{ padding: "12px 16px", textAlign: "center" }}>
// //                       {isPendingTab ? (
// //                         <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", background: "#fef3c7", color: "#a16207" }}>
// //                           Chờ import
// //                         </span>
// //                       ) : isDeletedTab ? (
// //                         <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", background: "#fee2e2", color: "#dc2626" }}>
// //                           Đã xóa
// //                         </span>
// //                       ) : (
// //                         <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", background: p.is_active ? "#dcfce7" : "#f3f4f6", color: p.is_active ? "#16a34a" : "#6b7280" }}>
// //                           {p.is_active ? "Trên kệ" : "Đã ẩn"}
// //                         </span>
// //                       )}
// //                     </td>
// //                     <td style={{ padding: "12px 16px", textAlign: "center" }}>
// //                       {isPendingTab ? (
// //                         <button
// //                           onClick={() => handleImportOne(p)}
// //                           style={{ background: "#16a34a", border: "none", color: "white", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
// //                           title="Import sản phẩm này vào danh sách sản phẩm (mặc định ẩn)"
// //                         >
// //                           📥 Import
// //                         </button>
// //                       ) : isDeletedTab ? (
// //                         <div style={{ display: "inline-flex", gap: 6 }}>
// //                           <button
// //                             onClick={() => handleRestore(p.id, p.name)}
// //                             style={{ background: "#dcfce7", border: "1px solid #86efac", color: "#15803d", padding: "5px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
// //                             title="Phục hồi sản phẩm này"
// //                           >
// //                             ↺ Phục hồi
// //                           </button>
// //                           <button
// //                             onClick={() => handleHardDelete(p.id, p.name)}
// //                             style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "14px" }}
// //                             title="Xóa vĩnh viễn (KHÔNG thể phục hồi)"
// //                           >
// //                             🗑
// //                           </button>
// //                         </div>
// //                       ) : (
// //                         <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
// //                           <button
// //                             onClick={() => handleToggleActive(p)}
// //                             style={{
// //                               background: p.is_active ? "#fef3c7" : "#dcfce7",
// //                               border: `1px solid ${p.is_active ? "#fcd34d" : "#86efac"}`,
// //                               color:      p.is_active ? "#92400e" : "#15803d",
// //                               padding: "4px 9px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: 600,
// //                             }}
// //                             title={p.is_active ? "Ẩn sản phẩm này trên web" : "Hiện sản phẩm này trên web"}
// //                           >
// //                             {p.is_active ? "Ẩn" : "Hiện"}
// //                           </button>
// //                           <button
// //                             onClick={() => setEditingProduct(p)}
// //                             style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "14px" }}
// //                             title="Sửa"
// //                           >
// //                             ✏️
// //                           </button>
// //                           <button
// //                             onClick={() => handleSoftDelete(p.id, p.name)}
// //                             style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "14px" }}
// //                             title="Xóa (chuyển vào mục Đã xóa)"
// //                           >
// //                             🗑
// //                           </button>
// //                         </div>
// //                       )}
// //                     </td>
// //                   </tr>
// //                 ))}
// //               </tbody>
// //             </table>
// //           </div>

// //           {/* Phân trang */}
// //           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", fontSize: "14px", color: "#6b7280" }}>
// //             <span>Hiển thị {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} / {total} {isPendingTab ? "dòng giá" : "sản phẩm"}</span>
// //             <div style={{ display: "flex", gap: "8px" }}>
// //               <button
// //                 onClick={() => setPage((p) => Math.max(1, p - 1))}
// //                 disabled={page === 1}
// //                 style={{ padding: "6px 14px", border: "1px solid #d1d5db", borderRadius: "6px", background: "white", cursor: page === 1 ? "not-allowed" : "pointer", color: page === 1 ? "#d1d5db" : "#374151" }}
// //               >← Trước</button>
// //               <button
// //                 onClick={() => setPage((p) => p + 1)}
// //                 disabled={page * LIMIT >= total}
// //                 style={{ padding: "6px 14px", border: "1px solid #d1d5db", borderRadius: "6px", background: "white", cursor: page * LIMIT >= total ? "not-allowed" : "pointer", color: page * LIMIT >= total ? "#d1d5db" : "#374151" }}
// //               >Sau →</button>
// //             </div>
// //           </div>
// //         </>
// //       )}
// //     </div>
// //   );
// // }


// import React, { useState, useEffect, useCallback } from "react";
// import "./ProductManagement.css";
// import CreateProduct from "./CreateProduct.jsx";
// import { productsApi, productGroupsApi, priceListApi, supabase } from "../../api";


// // 3 tab:
// //   - "Chờ import": dòng trong price_list chưa có trong products (so sánh theo SKU)
// //   - "Trên kệ" : products có is_active=true, status≠'deleted' (mặc định)
// //   - "Đã xóa"  : products có status='deleted'
// // Bỏ tab "Tất cả" theo yêu cầu.
// const STATUS_TABS = [
//   { key: "pending",  label: "Chờ import", filter: "pending"  },
//   { key: "on-shelf", label: "Trên kệ",    filter: "active"   },
//   { key: "deleted",  label: "Đã xóa",     filter: "deleted"  },
// ];
// const LIMIT = 20;

// // Auto sinh slug từ tên (giống pattern trong CreateProductGroup)
// function toSlug(str) {
//   return (str || "")
//     .normalize("NFD")
//     .replace(/\p{Diacritic}/gu, "")
//     .replace(/đ/g, "d").replace(/Đ/g, "D")
//     .toLowerCase().trim()
//     .replace(/[^a-z0-9\s-]/g, "")
//     .replace(/\s+/g, "-");
// }

// export default function ProductManagement() {
//   const [isCreating,      setIsCreating]      = useState(false);
//   const [editingProduct,  setEditingProduct]  = useState(null);
//   const [activeTab,       setActiveTab]       = useState("on-shelf"); // mặc định vào "Trên kệ"

//   const [products,        setProducts]        = useState([]);
//   const [groups,          setGroups]          = useState([]);
//   const [loading,         setLoading]         = useState(true);
//   const [error,           setError]           = useState("");
//   const [searchText,      setSearchText]      = useState("");
//   const [selectedGroup,   setSelectedGroup]   = useState("");
//   const [selected,        setSelected]        = useState([]);
//   const [page,            setPage]            = useState(1);
//   const [total,           setTotal]           = useState(0);
//   // Trong tab "Trên kệ": có hiển thị cả SP đang ẩn (is_active=false) để admin bật/tắt không?
//   const [showHidden,      setShowHidden]      = useState(false);
//   const [importing,       setImporting]       = useState(false);  // đang import hàng loạt

//   // ─── Fetch sản phẩm (cả 3 tab dùng chung) ────────────────────────────────
//   const fetchProducts = useCallback(async () => {
//     setLoading(true);
//     setError("");
//     try {
//       const params = { page, limit: LIMIT };
//       if (searchText)    params.search   = searchText;
//       if (selectedGroup) params.group_id = selectedGroup;

//       if (activeTab === "pending") {
//         // Tab "Chờ import": lấy từ price_list, loại trừ SKU đã có trong products
//         const res = await priceListApi.getPendingImport(params);
//         setProducts(res.data || []);
//         setTotal(res.total  || 0);
//         setLoading(false);
//         return;
//       }

//       // Map tab products
//       if (activeTab === "deleted") {
//         params.status = "deleted";
//         params.includeDeleted = true;
//       } else if (activeTab === "on-shelf") {
//         params.status = "active";
//       }

//       const res = await productsApi.getAll(params);
//       let list = res.data || [];
//       // Tab "Trên kệ": nếu chỉ muốn xem SP đang ẩn (is_active=false) để bật lên
//       if (activeTab === "on-shelf" && showHidden) {
//         list = list.filter((p) => !p.is_active);
//       }
//       setProducts(list);
//       setTotal(res.total  || 0);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   }, [page, searchText, selectedGroup, activeTab, showHidden]);

//   // ─── Fetch nhóm (dropdown filter) ─────────────────────────────────────────
//   // Sắp xếp phân cấp: mỗi nhóm lớn (parent_id = null) đứng trước,
//   // theo sau là các nhóm con của nó (đánh dấu depth để thụt lề khi render).
//   const fetchGroups = useCallback(async () => {
//     try {
//       const res = await productGroupsApi.getAll();
//       const all = res.data || [];

//       const roots = all.filter((g) => !g.parent_id);
//       const ordered = [];
//       roots.forEach((root) => {
//         ordered.push({ ...root, depth: 0 });
//         all
//           .filter((g) => g.parent_id === root.id)
//           .forEach((child) => ordered.push({ ...child, depth: 1 }));
//       });

//       setGroups(ordered);
//     } catch {}
//   }, []);

//   useEffect(() => { fetchProducts(); }, [fetchProducts]);
//   useEffect(() => { fetchGroups();   }, [fetchGroups]);

//   // ─── Helper: lấy mã nhóm (code) tương ứng với 1 group_id ─────────────────
//   const getGroupCode = useCallback(
//     (groupId) => groups.find((g) => String(g.id) === String(groupId))?.code || null,
//     [groups]
//   );

//   // ─── Soft delete 1 sản phẩm (tab Trên kệ) ────────────────────────────────
//   const handleSoftDelete = async (id, name) => {
//     if (!window.confirm(`Xóa sản phẩm "${name}"?\n\nSản phẩm sẽ được chuyển vào mục "Đã xóa" — bạn có thể phục hồi lại bất cứ lúc nào.`)) return;
//     try {
//       await productsApi.softDelete(id);
//       fetchProducts();
//     } catch (err) {
//       alert("Lỗi xóa: " + err.message);
//     }
//   };

//   // ─── Xóa vĩnh viễn 1 sản phẩm (tab Đã xóa) ───────────────────────────────
//   const handleHardDelete = async (id, name) => {
//     if (!window.confirm(`⚠️ XÓA VĨNH VIỄN "${name}"?\n\nHành động này KHÔNG THỂ hoàn tác. Sản phẩm sẽ bị xóa hẳn khỏi cơ sở dữ liệu.`)) return;
//     if (!window.confirm(`Xác nhận lần 2: Xóa vĩnh viễn "${name}"?`)) return;
//     try {
//       await productsApi.remove(id);
//       fetchProducts();
//     } catch (err) {
//       alert("Lỗi xóa: " + err.message);
//     }
//   };

//   // ─── Phục hồi 1 sản phẩm (tab Đã xóa) ───────────────────────────────────
//   const handleRestore = async (id, name) => {
//     if (!window.confirm(`Phục hồi sản phẩm "${name}"?\n\nSản phẩm sẽ được chuyển về trạng thái "Trên kệ" (is_active = true, status = active).`)) return;
//     try {
//       await productsApi.restore(id);
//       fetchProducts();
//     } catch (err) {
//       alert("Lỗi phục hồi: " + err.message);
//     }
//   };

//   // ─── Bật / tắt nhanh "Hiện trên web" cho 1 SP ────────────────────────────
//   const handleToggleActive = async (p) => {
//     const newState = !p.is_active;
//     const action = newState ? "HIỆN" : "ẨN";
//     if (!window.confirm(`${action} sản phẩm "${p.name}" trên web?`)) return;
//     try {
//       await productsApi.update(p.id, { is_active: newState });
//       fetchProducts();
//     } catch (err) {
//       alert("Lỗi: " + err.message);
//     }
//   };

//   // ─── Soft delete nhiều (tab Trên kệ) ────────────────────────────────────
//   const handleDeleteSelected = async () => {
//     if (!selected.length || !window.confirm(`Xóa ${selected.length} sản phẩm đã chọn?\n\nCác sản phẩm sẽ được chuyển vào mục "Đã xóa".`)) return;
//     try {
//       await productsApi.bulkSoftDelete(selected);
//       setSelected([]);
//       fetchProducts();
//     } catch (err) {
//       alert("Lỗi: " + err.message);
//     }
//   };

//   // ─── Phục hồi nhiều (tab Đã xóa) ─────────────────────────────────────────
//   const handleRestoreSelected = async () => {
//     if (!selected.length || !window.confirm(`Phục hồi ${selected.length} sản phẩm đã chọn?`)) return;
//     try {
//       await productsApi.bulkRestore(selected);
//       setSelected([]);
//       fetchProducts();
//     } catch (err) {
//       alert("Lỗi: " + err.message);
//     }
//   };

//   // ─── Xóa vĩnh viễn nhiều (tab Đã xóa) ───────────────────────────────────
//   const handleHardDeleteSelected = async () => {
//     if (!selected.length) return;
//     if (!window.confirm(`⚠️ XÓA VĨNH VIỄN ${selected.length} sản phẩm đã chọn?\n\nHành động này KHÔNG THỂ hoàn tác!`)) return;
//     if (!window.confirm(`Xác nhận lần cuối: Xóa vĩnh viễn ${selected.length} sản phẩm?`)) return;
//     try {
//       await Promise.all(selected.map((id) => productsApi.remove(id)));
//       setSelected([]);
//       fetchProducts();
//     } catch (err) {
//       alert("Lỗi: " + err.message);
//     }
//   };

//   // ─── IMPORT 1 dòng từ price_list sang products ───────────────────────────
//   // Tạo record mới trong products với:
//   //   sku, name, group_id, price, final_price, discount, stock, is_active=true, status='active'
//   // Slug tự sinh từ tên + thêm suffix ngẫu nhiên nếu trùng.
//   const handleImportOne = async (priceRow) => {
//     if (!window.confirm(`Import "${priceRow.name}" (SKU: ${priceRow.sku}) vào danh sách sản phẩm?\n\nSản phẩm sẽ được tạo ở trạng thái ẨN. Bạn cần bổ sung thông tin (ảnh, mô tả, trọng lượng, kích thước) rồi bật "Hiện trên web" trong trang chi tiết.`)) return;
//     try {
//       await importRowsToProducts([priceRow]);
//       fetchProducts();
//     } catch (err) {
//       alert("Lỗi import: " + err.message);
//     }
//   };

//   // ─── IMPORT nhiều dòng đã chọn (tab Chờ import) ──────────────────────────
//   const handleImportSelected = async () => {
//     if (!selected.length) return;
//     if (!window.confirm(`Import ${selected.length} sản phẩm đã chọn từ bảng giá vào danh sách sản phẩm?\n\nTất cả sẽ được tạo ở trạng thái ẨN. Bạn cần bổ sung thông tin cho từng SP rồi bật "Hiện trên web".`)) return;
//     try {
//       setImporting(true);
//       const rows = products.filter((r) => selected.includes(r.id));
//       await importRowsToProducts(rows);
//       setSelected([]);
//       fetchProducts();
//     } catch (err) {
//       alert("Lỗi import: " + err.message);
//     } finally {
//       setImporting(false);
//     }
//   };

//   // Helper: convert price_list row → products row, xử lý slug trùng
//   async function importRowsToProducts(rows) {
//     if (!rows.length) return;
//     // Lấy slug hiện tại để tránh trùng
//     const existingSlugs = new Set(await productsApi.getAllSlugs());

//     const usedInBatch = new Set();
//     const toInsert = rows.map((r) => {
//       let baseSlug = toSlug(r.name) || toSlug(r.sku) || `sp-${r.id}`;
//       let slug = baseSlug;
//       let i = 1;
//       while (existingSlugs.has(slug) || usedInBatch.has(slug)) {
//         slug = `${baseSlug}-${++i}`;
//       }
//       usedInBatch.add(slug);

//       return {
//         name:        r.name,
//         slug,
//         sku:         r.sku,
//         group_id:    r.group_id || null,
//         price:       Number(r.price) || 0,
//         final_price: Number(r.final_price) || Number(r.price) || 0,
//         discount:    Number(r.discount) || 0,
//         stock:       Number(r.stock) || 0,
//         // SP mới import mặc định ẨN trên web — admin tự bật khi đã có đủ thông tin
//         is_active:   false,
//         status:      "active",
//         rating:      5,
//         reviews:     0,
//         is_new:      true,
//       };
//     });

//     const { error } = await supabase.from("products").insert(toInsert);
//     if (error) throw new Error(error.message);
//   }

//   // ─── Sau khi lưu form tạo/sửa ───────────────────────────────────────────
//   const handleSaved = () => {
//     setIsCreating(false);
//     setEditingProduct(null);
//     fetchProducts();
//   };

//   // ─── Select ───────────────────────────────────────────────────────────────
//   const allSelected = products.length > 0 && selected.length === products.length;
//   const toggleAll   = () => setSelected(allSelected ? [] : products.map((p) => p.id));
//   const toggleOne   = (id) =>
//     setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

//   const fmt = (n) => Number(n).toLocaleString("vi-VN") + " đ";

//   // ─── Khi chuyển tab: reset selection + page ───────────────────────────────
//   const handleChangeTab = (tabKey) => {
//     setActiveTab(tabKey);
//     setPage(1);
//     setSelected([]);
//     setShowHidden(false); // reset sub-filter
//   };

//   const isPendingTab  = activeTab === "pending";
//   const isDeletedTab  = activeTab === "deleted";

//   // ─── Render form tạo/sửa ──────────────────────────────────────────────────
//   if (isCreating || editingProduct) {
//     return (
//       <CreateProduct
//         initialData={editingProduct}
//         groups={groups}
//         onBack={() => { setIsCreating(false); setEditingProduct(null); }}
//         onSaved={handleSaved}
//       />
//     );
//   }

//   return (
//     <div className="main-content">

//       {/* Header */}
//       <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
//         <h1>Quản lý sản phẩm</h1>
//         <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
//           + Thêm sản phẩm
//         </button>
//       </div>

//       {/* Tabs */}
//       <div className="tabs">
//         {STATUS_TABS.map((tab) => (
//           <button
//             key={tab.key}
//             className={`tab${activeTab === tab.key ? " active" : ""}`}
//             onClick={() => handleChangeTab(tab.key)}
//           >
//             {tab.label}
//           </button>
//         ))}
//       </div>

//       {/* Filter bar */}
//       <div style={{ display: "flex", gap: "10px", margin: "16px 0", flexWrap: "wrap", alignItems: "center" }}>
//         <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
//           <i className="fas fa-search" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
//           <input
//             type="text"
//             placeholder={
//               isPendingTab ? "Tìm trong bảng giá..." :
//               isDeletedTab ? "Tìm trong các sản phẩm đã xóa..." :
//               "Tìm kiếm sản phẩm..."
//             }
//             value={searchText}
//             onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
//             style={{ width: "100%", padding: "9px 12px 9px 36px", border: "1px solid #d1d5db", borderRadius: "8px", boxSizing: "border-box", outline: "none", fontSize: "14px" }}
//           />
//         </div>

//         <select
//           value={selectedGroup}
//           onChange={(e) => { setSelectedGroup(e.target.value); setPage(1); }}
//           style={{ padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: "8px", outline: "none", fontSize: "14px", color: selectedGroup ? "#111827" : "#9ca3af" }}
//         >
//           <option value="">Tất cả nhóm</option>
//           {groups.map((g) => (
//             <option key={g.id} value={g.id}>
//               {g.depth ? "— " : ""}
//               {g.code ? `[${g.code}] ` : ""}
//               {g.name}
//             </option>
//           ))}
//         </select>

//         {selected.length > 0 && (
//           <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
//             {isPendingTab ? (
//               <button
//                 onClick={handleImportSelected}
//                 disabled={importing}
//                 style={{ padding: "9px 14px", background: "#16a34a", border: "1px solid #16a34a", borderRadius: "8px", color: "white", cursor: importing ? "wait" : "pointer", fontSize: "13px", fontWeight: "600" }}
//                 title="Import các sản phẩm đã chọn vào danh sách sản phẩm (mặc định ẩn)"
//               >
//                 {importing ? "⌛ Đang import..." : `📥 Import ${selected.length} vào sản phẩm`}
//               </button>
//             ) : isDeletedTab ? (
//               <>
//                 <button
//                   onClick={handleRestoreSelected}
//                   style={{ padding: "9px 14px", background: "#dcfce7", border: "1px solid #86efac", borderRadius: "8px", color: "#15803d", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}
//                   title="Phục hồi các sản phẩm đã chọn"
//                 >
//                   ↺ Phục hồi {selected.length}
//                 </button>
//                 <button
//                   onClick={handleHardDeleteSelected}
//                   style={{ padding: "9px 14px", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}
//                   title="Xóa vĩnh viễn các sản phẩm đã chọn (KHÔNG thể phục hồi)"
//                 >
//                   🗑 Xóa vĩnh viễn {selected.length}
//                 </button>
//               </>
//             ) : (
//               <button
//                 onClick={handleDeleteSelected}
//                 style={{ padding: "9px 14px", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}
//                 title="Chuyển các sản phẩm đã chọn vào mục Đã xóa"
//               >
//                 🗑 Xóa {selected.length} mục
//               </button>
//             )}
//             <button
//               onClick={() => setSelected([])}
//               style={{ padding: "9px 14px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "8px", color: "#475569", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}
//             >
//               Bỏ chọn
//             </button>
//           </div>
//         )}
//       </div>

//       {/* Sub-filter: chỉ áp dụng cho tab "Trên kệ" */}
//       {activeTab === "on-shelf" && (
//         <div style={{ display: "flex", gap: "6px", marginBottom: "14px", alignItems: "center", flexWrap: "wrap" }}>
//           <span style={{ fontSize: "13px", color: "#64748b", marginRight: "4px" }}>Hiển thị:</span>
//           <button
//             onClick={() => { setShowHidden(false); setPage(1); }}
//             style={{
//               padding: "6px 12px", borderRadius: "999px", fontSize: "12.5px", fontWeight: 600, cursor: "pointer",
//               background: !showHidden ? "#10b981" : "white",
//               color:      !showHidden ? "white"  : "#475569",
//               border:     !showHidden ? "1px solid #10b981" : "1px solid #e2e8f0",
//             }}
//             title="Chỉ hiển thị các sản phẩm đang hiện trên web (is_active = true)"
//           >
//             👁 Đang hiện
//           </button>
//           <button
//             onClick={() => { setShowHidden(true); setPage(1); }}
//             style={{
//               padding: "6px 12px", borderRadius: "999px", fontSize: "12.5px", fontWeight: 600, cursor: "pointer",
//               background: showHidden ? "#f59e0b" : "white",
//               color:      showHidden ? "white"  : "#475569",
//               border:     showHidden ? "1px solid #f59e0b" : "1px solid #e2e8f0",
//             }}
//             title="Chỉ hiển thị các sản phẩm đang ẩn trên web (is_active = false) — cần bổ sung thông tin và bật lên"
//           >
//             🙈 Đang ẩn
//           </button>
//         </div>
//       )}

//       {/* Error */}
//       {error && (
//         <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", fontSize: "14px", marginBottom: "16px" }}>
//           ⚠️ {error} —{" "}
//           <button onClick={fetchProducts} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", textDecoration: "underline" }}>
//             Thử lại
//           </button>
//         </div>
//       )}

//       {/* Table */}
//       {loading ? (
//         <div style={{ textAlign: "center", padding: "48px", color: "#9ca3af" }}>⌛ Đang tải...</div>
//       ) : products.length === 0 ? (
//         <div className="empty-state">
//           <div className="empty-icon">
//             {isPendingTab ? "📥" : isDeletedTab ? "🗑️" : "😊"}
//           </div>
//           <h3>
//             {isPendingTab ? "Không có sản phẩm chờ import" :
//              isDeletedTab ? "Thùng rác trống" :
//              showHidden ? "Không có sản phẩm đang ẩn" :
//              "Chưa có sản phẩm"}
//           </h3>
//           <p>
//             {isPendingTab
//               ? "Tất cả sản phẩm trong bảng giá đã được import sang sản phẩm. Vào 'Bảng giá' để thêm dòng mới."
//               : isDeletedTab
//                 ? "Chưa có sản phẩm nào bị xóa."
//                 : showHidden
//                   ? "Tất cả sản phẩm đều đang hiện trên web. Bấm 'Đang hiện' để xem."
//                   : "Bắt đầu bằng cách thêm sản phẩm mới hoặc import từ bảng giá."}
//           </p>
//           {!isPendingTab && !isDeletedTab && (
//             <div className="empty-actions">
//               <button className="btn btn-primary" onClick={() => setIsCreating(true)}>Thêm sản phẩm</button>
//             </div>
//           )}
//         </div>
//       ) : (
//         <>
//           <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
//             <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
//               <thead>
//                 <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
//                   <th style={{ padding: "12px 16px", width: "40px" }}>
//                     <input type="checkbox" checked={allSelected} onChange={toggleAll} />
//                   </th>
//                   <th style={{ padding: "12px 16px", textAlign: "left",   fontWeight: "600", color: "#374151" }}>Sản phẩm</th>
//                   <th style={{ padding: "12px 16px", textAlign: "left",   fontWeight: "600", color: "#374151" }}>Nhóm</th>
//                   <th style={{ padding: "12px 16px", textAlign: "right",  fontWeight: "600", color: "#374151" }}>Giá</th>
//                   <th style={{ padding: "12px 16px", textAlign: "right",  fontWeight: "600", color: "#374151" }}>Tồn kho</th>
//                   <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: "600", color: "#374151" }}>Trạng thái</th>
//                   <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: "600", color: "#374151" }}>Thao tác</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {products.map((p) => (
//                   <tr
//                     key={p.id}
//                     style={{ borderBottom: "1px solid #f3f4f6", opacity: isDeletedTab ? 0.7 : 1 }}
//                     onMouseEnter={(e) => e.currentTarget.style.background = "#fafafa"}
//                     onMouseLeave={(e) => e.currentTarget.style.background = "white"}
//                   >
//                     <td style={{ padding: "12px 16px" }}>
//                       <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleOne(p.id)} />
//                     </td>
//                     <td style={{ padding: "12px 16px" }}>
//                       <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
//                         {p.images?.[0] ? (
//                           <img src={p.images[0]} alt={p.name} style={{ width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover" }} />
//                         ) : (
//                           <div style={{ width: "40px", height: "40px", background: "#f3f4f6", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#d1d5db" }}>📦</div>
//                         )}
//                         <div>
//                           <div
//                             style={{ fontWeight: "600", color: "#111827", cursor: (isPendingTab || isDeletedTab) ? "default" : "pointer" }}
//                             onClick={() => !isPendingTab && !isDeletedTab && setEditingProduct(p)}
//                           >
//                             {p.name}
//                           </div>
//                           <div style={{ fontSize: "12px", color: "#9ca3af" }}>SKU: {p.sku || "--"}</div>
//                         </div>
//                       </div>
//                     </td>
//                     <td style={{ padding: "12px 16px", color: "#6b7280" }}>
//                       <div>{p.group_name || "--"}</div>
//                       {getGroupCode(p.group_id) && (
//                         <div style={{ fontSize: "11px", color: "#9ca3af", fontFamily: "'Courier New', monospace" }}>
//                           {getGroupCode(p.group_id)}
//                         </div>
//                       )}
//                     </td>
//                     <td style={{ padding: "12px 16px", textAlign: "right" }}>
//                       <div style={{ fontWeight: "600", color: "#111827" }}>{fmt(p.final_price || p.price)}</div>
//                       {Number(p.discount) > 0 && <div style={{ fontSize: "12px", color: "#10b981" }}>-{Number(p.discount)}%</div>}
//                     </td>
//                     <td style={{ padding: "12px 16px", textAlign: "right" }}>
//                       <span style={{ color: p.stock <= 0 ? "#dc2626" : p.stock < 10 ? "#f59e0b" : "#111827", fontWeight: "600" }}>
//                         {p.stock}
//                       </span>
//                     </td>
//                     <td style={{ padding: "12px 16px", textAlign: "center" }}>
//                       {isPendingTab ? (
//                         <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", background: "#fef3c7", color: "#a16207" }}>
//                           Chờ import
//                         </span>
//                       ) : isDeletedTab ? (
//                         <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", background: "#fee2e2", color: "#dc2626" }}>
//                           Đã xóa
//                         </span>
//                       ) : (
//                         <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", background: p.is_active ? "#dcfce7" : "#f3f4f6", color: p.is_active ? "#16a34a" : "#6b7280" }}>
//                           {p.is_active ? "Trên kệ" : "Đã ẩn"}
//                         </span>
//                       )}
//                     </td>
//                     <td style={{ padding: "12px 16px", textAlign: "center" }}>
//                       {isPendingTab ? (
//                         <button
//                           onClick={() => handleImportOne(p)}
//                           style={{ background: "#16a34a", border: "none", color: "white", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
//                           title="Import sản phẩm này vào danh sách sản phẩm (mặc định ẩn)"
//                         >
//                           📥 Import
//                         </button>
//                       ) : isDeletedTab ? (
//                         <div style={{ display: "inline-flex", gap: 6 }}>
//                           <button
//                             onClick={() => handleRestore(p.id, p.name)}
//                             style={{ background: "#dcfce7", border: "1px solid #86efac", color: "#15803d", padding: "5px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
//                             title="Phục hồi sản phẩm này"
//                           >
//                             ↺ Phục hồi
//                           </button>
//                           <button
//                             onClick={() => handleHardDelete(p.id, p.name)}
//                             style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "14px" }}
//                             title="Xóa vĩnh viễn (KHÔNG thể phục hồi)"
//                           >
//                             🗑
//                           </button>
//                         </div>
//                       ) : (
//                         <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
//                           <button
//                             onClick={() => handleToggleActive(p)}
//                             style={{
//                               background: p.is_active ? "#fef3c7" : "#dcfce7",
//                               border: `1px solid ${p.is_active ? "#fcd34d" : "#86efac"}`,
//                               color:      p.is_active ? "#92400e" : "#15803d",
//                               padding: "4px 9px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: 600,
//                             }}
//                             title={p.is_active ? "Ẩn sản phẩm này trên web" : "Hiện sản phẩm này trên web"}
//                           >
//                             {p.is_active ? "Ẩn" : "Hiện"}
//                           </button>
//                           <button
//                             onClick={() => setEditingProduct(p)}
//                             style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "14px" }}
//                             title="Sửa"
//                           >
//                             ✏️
//                           </button>
//                           <button
//                             onClick={() => handleSoftDelete(p.id, p.name)}
//                             style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "14px" }}
//                             title="Xóa (chuyển vào mục Đã xóa)"
//                           >
//                             🗑
//                           </button>
//                         </div>
//                       )}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>

//           {/* Phân trang */}
//           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", fontSize: "14px", color: "#6b7280" }}>
//             <span>Hiển thị {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} / {total} {isPendingTab ? "dòng giá" : "sản phẩm"}</span>
//             <div style={{ display: "flex", gap: "8px" }}>
//               <button
//                 onClick={() => setPage((p) => Math.max(1, p - 1))}
//                 disabled={page === 1}
//                 style={{ padding: "6px 14px", border: "1px solid #d1d5db", borderRadius: "6px", background: "white", cursor: page === 1 ? "not-allowed" : "pointer", color: page === 1 ? "#d1d5db" : "#374151" }}
//               >← Trước</button>
//               <button
//                 onClick={() => setPage((p) => p + 1)}
//                 disabled={page * LIMIT >= total}
//                 style={{ padding: "6px 14px", border: "1px solid #d1d5db", borderRadius: "6px", background: "white", cursor: page * LIMIT >= total ? "not-allowed" : "pointer", color: page * LIMIT >= total ? "#d1d5db" : "#374151" }}
//               >Sau →</button>
//             </div>
//           </div>
//         </>
//       )}
//     </div>
//   );
// }

import React, { useState, useEffect, useCallback } from "react";
import "./ProductManagement.css";
import CreateProduct from "./CreateProduct.jsx";
import { productsApi, productGroupsApi, priceListApi } from "../../api";


// 3 tab:
//   - "Chờ import": dòng trong price_list chưa có trong products (so sánh theo SKU)
//   - "Trên kệ" : products có is_active=true, status≠'deleted' (mặc định)
//   - "Đã xóa"  : products có status='deleted'
// Bỏ tab "Tất cả" theo yêu cầu.
const STATUS_TABS = [
  { key: "pending",  label: "Chờ import", filter: "pending"  },
  { key: "on-shelf", label: "Trên kệ",    filter: "active"   },
  { key: "deleted",  label: "Đã xóa",     filter: "deleted"  },
];
const LIMIT = 20;

// Auto sinh slug từ tên (giống pattern trong CreateProductGroup)
function toSlug(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

// Tính giá sau giảm từ giá gốc + % giảm giá — dùng chung logic với tab
// "Sản phẩm trên kệ" ở phần Quản lý tồn kho, để 2 nơi luôn hiển thị khớp nhau
// thay vì phụ thuộc vào cột final_price có thể chưa được cập nhật trong DB.
function computeFinalPrice(price, discount) {
  const basePrice = Number(price) || 0;
  const discountPct = Math.min(100, Math.max(0, Number(discount) || 0));
  return Math.round(basePrice * (1 - discountPct / 100));
}

export default function ProductManagement() {
  const [isCreating,      setIsCreating]      = useState(false);
  const [editingProduct,  setEditingProduct]  = useState(null);
  const [activeTab,       setActiveTab]       = useState("on-shelf"); // mặc định vào "Trên kệ"

  const [products,        setProducts]        = useState([]);
  const [groups,          setGroups]          = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState("");
  const [searchText,      setSearchText]      = useState("");
  const [selectedGroup,   setSelectedGroup]   = useState("");
  const [selected,        setSelected]        = useState([]);
  const [page,            setPage]            = useState(1);
  const [total,           setTotal]           = useState(0);
  // Trong tab "Trên kệ": có hiển thị cả SP đang ẩn (is_active=false) để admin bật/tắt không?
  const [showHidden,      setShowHidden]      = useState(false);
  const [importing,       setImporting]       = useState(false);  // đang import hàng loạt

  // ─── Fetch sản phẩm (cả 3 tab dùng chung) ────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: LIMIT };
      if (searchText)    params.search   = searchText;
      if (selectedGroup) params.group_id = selectedGroup;

      if (activeTab === "pending") {
        // Tab "Chờ import": lấy từ price_list, loại trừ SKU đã có trong products
        const res = await priceListApi.getPendingImport(params);
        setProducts(res.data || []);
        setTotal(res.total  || 0);
        setLoading(false);
        return;
      }

      // Map tab products
      if (activeTab === "deleted") {
        params.status = "deleted";
        params.includeDeleted = true;
      } else if (activeTab === "on-shelf") {
        params.status = "active";
      }

      const res = await productsApi.getAll(params);
      let list = res.data || [];
      // Tab "Trên kệ": nếu chỉ muốn xem SP đang ẩn (is_active=false) để bật lên
      if (activeTab === "on-shelf" && showHidden) {
        list = list.filter((p) => !p.is_active);
      }
      setProducts(list);
      setTotal(res.total  || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, searchText, selectedGroup, activeTab, showHidden]);

  // ─── Fetch nhóm (dropdown filter) ─────────────────────────────────────────
  // Sắp xếp phân cấp: mỗi nhóm lớn (parent_id = null) đứng trước,
  // theo sau là các nhóm con của nó (đánh dấu depth để thụt lề khi render).
  const fetchGroups = useCallback(async () => {
    try {
      const res = await productGroupsApi.getAll();
      const all = res.data || [];

      const roots = all.filter((g) => !g.parent_id);
      const ordered = [];
      roots.forEach((root) => {
        ordered.push({ ...root, depth: 0 });
        all
          .filter((g) => g.parent_id === root.id)
          .forEach((child) => ordered.push({ ...child, depth: 1 }));
      });

      setGroups(ordered);
    } catch {}
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { fetchGroups();   }, [fetchGroups]);

  // ─── Helper: lấy mã nhóm (code) tương ứng với 1 group_id ─────────────────
  const getGroupCode = useCallback(
    (groupId) => groups.find((g) => String(g.id) === String(groupId))?.code || null,
    [groups]
  );

  // ─── Soft delete 1 sản phẩm (tab Trên kệ) ────────────────────────────────
  const handleSoftDelete = async (id, name) => {
    if (!window.confirm(`Xóa sản phẩm "${name}"?\n\nSản phẩm sẽ được chuyển vào mục "Đã xóa" — bạn có thể phục hồi lại bất cứ lúc nào.`)) return;
    try {
      await productsApi.softDelete(id);
      fetchProducts();
    } catch (err) {
      alert("Lỗi xóa: " + err.message);
    }
  };

  // ─── Xóa vĩnh viễn 1 sản phẩm (tab Đã xóa) ───────────────────────────────
  const handleHardDelete = async (id, name) => {
    if (!window.confirm(`⚠️ XÓA VĨNH VIỄN "${name}"?\n\nHành động này KHÔNG THỂ hoàn tác. Sản phẩm sẽ bị xóa hẳn khỏi cơ sở dữ liệu.`)) return;
    if (!window.confirm(`Xác nhận lần 2: Xóa vĩnh viễn "${name}"?`)) return;
    try {
      await productsApi.remove(id);
      fetchProducts();
    } catch (err) {
      alert("Lỗi xóa: " + err.message);
    }
  };

  // ─── Phục hồi 1 sản phẩm (tab Đã xóa) ───────────────────────────────────
  const handleRestore = async (id, name) => {
    try {
      await productsApi.restore(id);
      fetchProducts();
    } catch (err) {
      alert("Lỗi phục hồi: " + err.message);
    }
  };

  // ─── Bật / tắt nhanh "Hiện trên web" cho 1 SP ────────────────────────────
  const handleToggleActive = async (p) => {
    const newState = !p.is_active;
    const action = newState ? "HIỆN" : "ẨN";
    if (!window.confirm(`${action} sản phẩm "${p.name}" trên web?`)) return;
    try {
      await productsApi.update(p.id, { is_active: newState });
      fetchProducts();
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  };

  // ─── Soft delete nhiều (tab Trên kệ) ────────────────────────────────────
  const handleDeleteSelected = async () => {
    if (!selected.length || !window.confirm(`Xóa ${selected.length} sản phẩm đã chọn?\n\nCác sản phẩm sẽ được chuyển vào mục "Đã xóa".`)) return;
    try {
      await productsApi.bulkSoftDelete(selected);
      setSelected([]);
      fetchProducts();
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  };

  // ─── Phục hồi nhiều (tab Đã xóa) ─────────────────────────────────────────
  const handleRestoreSelected = async () => {
    if (!selected.length || !window.confirm(`Phục hồi ${selected.length} sản phẩm đã chọn?`)) return;
    try {
      await productsApi.bulkRestore(selected);
      setSelected([]);
      fetchProducts();
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  };

  // ─── Xóa vĩnh viễn nhiều (tab Đã xóa) ───────────────────────────────────
  const handleHardDeleteSelected = async () => {
    if (!selected.length) return;
    if (!window.confirm(`⚠️ XÓA VĨNH VIỄN ${selected.length} sản phẩm đã chọn?\n\nHành động này KHÔNG THỂ hoàn tác!`)) return;
    if (!window.confirm(`Xác nhận lần cuối: Xóa vĩnh viễn ${selected.length} sản phẩm?`)) return;
    try {
      await Promise.all(selected.map((id) => productsApi.remove(id)));
      setSelected([]);
      fetchProducts();
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  };

  // ─── IMPORT 1 dòng từ price_list sang products ───────────────────────────
  // Tạo record mới trong products với:
  //   sku, name, group_id, price, final_price, discount, stock, is_active=true, status='active'
  // Slug tự sinh từ tên + thêm suffix ngẫu nhiên nếu trùng.
  const handleImportOne = async (priceRow) => {
    if (!window.confirm(`Import "${priceRow.name}" (SKU: ${priceRow.sku}) vào danh sách sản phẩm?\n\nSản phẩm sẽ được tạo ở trạng thái ẨN. Bạn cần bổ sung thông tin (ảnh, mô tả, trọng lượng, kích thước) rồi bật "Hiện trên web" trong trang chi tiết.`)) return;
    try {
      await importRowsToProducts([priceRow]);
      fetchProducts();
    } catch (err) {
      alert("Lỗi import: " + err.message);
    }
  };

  // ─── IMPORT nhiều dòng đã chọn (tab Chờ import) ──────────────────────────
  const handleImportSelected = async () => {
    if (!selected.length) return;
    if (!window.confirm(`Import ${selected.length} sản phẩm đã chọn từ bảng giá vào danh sách sản phẩm?\n\nTất cả sẽ được tạo ở trạng thái ẨN. Bạn cần bổ sung thông tin cho từng SP rồi bật "Hiện trên web".`)) return;
    try {
      setImporting(true);
      const rows = products.filter((r) => selected.includes(r.id));
      await importRowsToProducts(rows);
      setSelected([]);
      fetchProducts();
    } catch (err) {
      alert("Lỗi import: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  // Helper: convert price_list row → products row, xử lý slug trùng
  async function importRowsToProducts(rows) {
    if (!rows.length) return;
    // Lấy slug hiện tại để tránh trùng
    const existingSlugs = new Set(await productsApi.getAllSlugs());

    const usedInBatch = new Set();
    const toInsert = rows.map((r) => {
      let baseSlug = toSlug(r.name) || toSlug(r.sku) || `sp-${r.id}`;
      let slug = baseSlug;
      let i = 1;
      while (existingSlugs.has(slug) || usedInBatch.has(slug)) {
        slug = `${baseSlug}-${++i}`;
      }
      usedInBatch.add(slug);

      return {
        name:        r.name,
        slug,
        sku:         r.sku,
        group_id:    r.group_id || null,
        price:       Number(r.price) || 0,
        final_price: Number(r.final_price) || Number(r.price) || 0,
        discount:    Number(r.discount) || 0,
        stock:       Number(r.stock) || 0,
        // SP mới import mặc định ẨN trên web — admin tự bật khi đã có đủ thông tin
        is_active:   false,
        status:      "active",
        rating:      5,
        reviews:     0,
        is_new:      true,
      };
    });

    // Generic endpoint không hỗ trợ bulk insert — gọi từng dòng.
    for (const row of toInsert) {
      await productsApi.create(row);
    }
  }

  // ─── Sau khi lưu form tạo/sửa ───────────────────────────────────────────
  const handleSaved = () => {
    setIsCreating(false);
    setEditingProduct(null);
    fetchProducts();
  };

  // ─── Select ───────────────────────────────────────────────────────────────
  const allSelected = products.length > 0 && selected.length === products.length;
  const toggleAll   = () => setSelected(allSelected ? [] : products.map((p) => p.id));
  const toggleOne   = (id) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const fmt = (n) => Number(n).toLocaleString("vi-VN") + " đ";

  // ─── Khi chuyển tab: reset selection + page ───────────────────────────────
  const handleChangeTab = (tabKey) => {
    setActiveTab(tabKey);
    setPage(1);
    setSelected([]);
    setShowHidden(false); // reset sub-filter
  };

  const isPendingTab  = activeTab === "pending";
  const isDeletedTab  = activeTab === "deleted";

  // ─── Render form tạo/sửa ──────────────────────────────────────────────────
  if (isCreating || editingProduct) {
    return (
      <CreateProduct
        initialData={editingProduct}
        groups={groups}
        onBack={() => { setIsCreating(false); setEditingProduct(null); }}
        onSaved={handleSaved}
      />
    );
  }

  return (
    <div className="main-content">

      {/* Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Quản lý sản phẩm</h1>
        <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
          + Thêm sản phẩm
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tab${activeTab === tab.key ? " active" : ""}`}
            onClick={() => handleChangeTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: "10px", margin: "16px 0", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
          <i className="fas fa-search" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
          <input
            type="text"
            placeholder={
              isPendingTab ? "Tìm trong bảng giá..." :
              isDeletedTab ? "Tìm trong các sản phẩm đã xóa..." :
              "Tìm kiếm sản phẩm..."
            }
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
            style={{ width: "100%", padding: "9px 12px 9px 36px", border: "1px solid #d1d5db", borderRadius: "8px", boxSizing: "border-box", outline: "none", fontSize: "14px" }}
          />
        </div>

        <select
          value={selectedGroup}
          onChange={(e) => { setSelectedGroup(e.target.value); setPage(1); }}
          style={{ padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: "8px", outline: "none", fontSize: "14px", color: selectedGroup ? "#111827" : "#9ca3af" }}
        >
          <option value="">Tất cả nhóm</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.depth ? "— " : ""}
              {g.code ? `[${g.code}] ` : ""}
              {g.name}
            </option>
          ))}
        </select>

        {selected.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {isPendingTab ? (
              <button
                onClick={handleImportSelected}
                disabled={importing}
                style={{ padding: "9px 14px", background: "#16a34a", border: "1px solid #16a34a", borderRadius: "8px", color: "white", cursor: importing ? "wait" : "pointer", fontSize: "13px", fontWeight: "600" }}
                title="Import các sản phẩm đã chọn vào danh sách sản phẩm (mặc định ẩn)"
              >
                {importing ? "⌛ Đang import..." : `📥 Import ${selected.length} vào sản phẩm`}
              </button>
            ) : isDeletedTab ? (
              <>
                <button
                  onClick={handleRestoreSelected}
                  style={{ padding: "9px 14px", background: "#dcfce7", border: "1px solid #86efac", borderRadius: "8px", color: "#15803d", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}
                  title="Phục hồi các sản phẩm đã chọn"
                >
                  ↺ Phục hồi {selected.length}
                </button>
                <button
                  onClick={handleHardDeleteSelected}
                  style={{ padding: "9px 14px", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}
                  title="Xóa vĩnh viễn các sản phẩm đã chọn (KHÔNG thể phục hồi)"
                >
                  🗑 Xóa vĩnh viễn {selected.length}
                </button>
              </>
            ) : (
              <button
                onClick={handleDeleteSelected}
                style={{ padding: "9px 14px", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}
                title="Chuyển các sản phẩm đã chọn vào mục Đã xóa"
              >
                🗑 Xóa {selected.length} mục
              </button>
            )}
            <button
              onClick={() => setSelected([])}
              style={{ padding: "9px 14px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "8px", color: "#475569", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}
            >
              Bỏ chọn
            </button>
          </div>
        )}
      </div>

      {/* Sub-filter: chỉ áp dụng cho tab "Trên kệ" */}
      {activeTab === "on-shelf" && (
        <div style={{ display: "flex", gap: "6px", marginBottom: "14px", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "13px", color: "#64748b", marginRight: "4px" }}>Hiển thị:</span>
          <button
            onClick={() => { setShowHidden(false); setPage(1); }}
            style={{
              padding: "6px 12px", borderRadius: "999px", fontSize: "12.5px", fontWeight: 600, cursor: "pointer",
              background: !showHidden ? "#10b981" : "white",
              color:      !showHidden ? "white"  : "#475569",
              border:     !showHidden ? "1px solid #10b981" : "1px solid #e2e8f0",
            }}
            title="Chỉ hiển thị các sản phẩm đang hiện trên web (is_active = true)"
          >
            👁 Đang hiện
          </button>
          <button
            onClick={() => { setShowHidden(true); setPage(1); }}
            style={{
              padding: "6px 12px", borderRadius: "999px", fontSize: "12.5px", fontWeight: 600, cursor: "pointer",
              background: showHidden ? "#f59e0b" : "white",
              color:      showHidden ? "white"  : "#475569",
              border:     showHidden ? "1px solid #f59e0b" : "1px solid #e2e8f0",
            }}
            title="Chỉ hiển thị các sản phẩm đang ẩn trên web (is_active = false) — cần bổ sung thông tin và bật lên"
          >
            🙈 Đang ẩn
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", fontSize: "14px", marginBottom: "16px" }}>
          ⚠️ {error} —{" "}
          <button onClick={fetchProducts} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", textDecoration: "underline" }}>
            Thử lại
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px", color: "#9ca3af" }}>⌛ Đang tải...</div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            {isPendingTab ? "📥" : isDeletedTab ? "🗑️" : "😊"}
          </div>
          <h3>
            {isPendingTab ? "Không có sản phẩm chờ import" :
             isDeletedTab ? "Thùng rác trống" :
             showHidden ? "Không có sản phẩm đang ẩn" :
             "Chưa có sản phẩm"}
          </h3>
          <p>
            {isPendingTab
              ? "Tất cả sản phẩm trong bảng giá đã được import sang sản phẩm. Vào 'Bảng giá' để thêm dòng mới."
              : isDeletedTab
                ? "Chưa có sản phẩm nào bị xóa."
                : showHidden
                  ? "Tất cả sản phẩm đều đang hiện trên web. Bấm 'Đang hiện' để xem."
                  : "Bắt đầu bằng cách thêm sản phẩm mới hoặc import từ bảng giá."}
          </p>
          {!isPendingTab && !isDeletedTab && (
            <div className="empty-actions">
              <button className="btn btn-primary" onClick={() => setIsCreating(true)}>Thêm sản phẩm</button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "12px 16px", width: "40px" }}>
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left",   fontWeight: "600", color: "#374151" }}>Sản phẩm</th>
                  <th style={{ padding: "12px 16px", textAlign: "left",   fontWeight: "600", color: "#374151" }}>Danh mục</th>
                  <th style={{ padding: "12px 16px", textAlign: "left",   fontWeight: "600", color: "#374151" }}>Nhóm SP</th>
                  <th style={{ padding: "12px 16px", textAlign: "right",  fontWeight: "600", color: "#374151" }}>Giá</th>
                  <th style={{ padding: "12px 16px", textAlign: "right",  fontWeight: "600", color: "#374151" }}>Tồn kho</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: "600", color: "#374151" }}>Trạng thái</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: "600", color: "#374151" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr
                    key={p.id}
                    style={{ borderBottom: "1px solid #f3f4f6", opacity: isDeletedTab ? 0.7 : 1 }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#fafafa"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleOne(p.id)} />
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={p.name} style={{ width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "40px", height: "40px", background: "#f3f4f6", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#d1d5db" }}>📦</div>
                        )}
                        <div>
                          <div
                            style={{ fontWeight: "600", color: "#111827", cursor: (isPendingTab || isDeletedTab) ? "default" : "pointer" }}
                            onClick={() => !isPendingTab && !isDeletedTab && setEditingProduct(p)}
                          >
                            {p.name}
                          </div>
                          <div style={{ fontSize: "12px", color: "#9ca3af" }}>SKU: {p.sku || "--"}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#6b7280" }}>
                      <div>{p.group_name || "--"}</div>
                      {getGroupCode(p.group_id) && (
                        <div style={{ fontSize: "11px", color: "#9ca3af", fontFamily: "'Courier New', monospace" }}>
                          {getGroupCode(p.group_id)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {p.group_name || "--"}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      {(() => {
                        // Giá sau giảm được TÍNH LẠI trực tiếp từ price + discount (giống hệt
                        // công thức đang dùng ở tab "Sản phẩm trên kệ" trong Quản lý tồn kho),
                        // thay vì chỉ đọc cột final_price — tránh lệch số khi final_price
                        // trong DB chưa được đồng bộ lại sau khi đổi discount.
                        const discountPct = Number(p.discount) || 0;
                        const finalPrice  = computeFinalPrice(p.price, discountPct);
                        return (
                          <>
                            <div style={{ fontWeight: "600", color: "#111827" }}>{fmt(finalPrice)}</div>
                            {discountPct > 0 && (
                              <div style={{ fontSize: "12px", color: "#9ca3af", textDecoration: "line-through" }}>
                                {fmt(p.price)}
                              </div>
                            )}
                            {discountPct > 0 && (
                              <div style={{ fontSize: "12px", color: "#10b981", fontWeight: "600" }}>-{discountPct}%</div>
                            )}
                          </>
                        );
                      })()}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <span style={{ color: p.stock <= 0 ? "#dc2626" : p.stock < 10 ? "#f59e0b" : "#111827", fontWeight: "600" }}>
                        {p.stock}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      {isPendingTab ? (
                        <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", background: "#fef3c7", color: "#a16207" }}>
                          Chờ import
                        </span>
                      ) : isDeletedTab ? (
                        <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", background: "#fee2e2", color: "#dc2626" }}>
                          Đã xóa
                        </span>
                      ) : (
                        <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", background: p.is_active ? "#dcfce7" : "#f3f4f6", color: p.is_active ? "#16a34a" : "#6b7280" }}>
                          {p.is_active ? "Trên kệ" : "Đã ẩn"}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      {isPendingTab ? (
                        <button
                          onClick={() => handleImportOne(p)}
                          style={{ background: "#16a34a", border: "none", color: "white", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
                          title="Import sản phẩm này vào danh sách sản phẩm (mặc định ẩn)"
                        >
                          📥 Import
                        </button>
                      ) : isDeletedTab ? (
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button
                            onClick={() => handleRestore(p.id, p.name)}
                            style={{ background: "#dcfce7", border: "1px solid #86efac", color: "#15803d", padding: "5px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
                            title="Phục hồi sản phẩm này"
                          >
                            ↺ Phục hồi
                          </button>
                          <button
                            onClick={() => handleHardDelete(p.id, p.name)}
                            style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "14px" }}
                            title="Xóa vĩnh viễn (KHÔNG thể phục hồi)"
                          >
                            🗑
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => handleToggleActive(p)}
                            style={{
                              background: p.is_active ? "#fef3c7" : "#dcfce7",
                              border: `1px solid ${p.is_active ? "#fcd34d" : "#86efac"}`,
                              color:      p.is_active ? "#92400e" : "#15803d",
                              padding: "4px 9px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: 600,
                            }}
                            title={p.is_active ? "Ẩn sản phẩm này trên web" : "Hiện sản phẩm này trên web"}
                          >
                            {p.is_active ? "Ẩn" : "Hiện"}
                          </button>
                          <button
                            onClick={() => setEditingProduct(p)}
                            style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "14px" }}
                            title="Sửa"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleSoftDelete(p.id, p.name)}
                            style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "14px" }}
                            title="Xóa (chuyển vào mục Đã xóa)"
                          >
                            🗑
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", fontSize: "14px", color: "#6b7280" }}>
            <span>Hiển thị {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} / {total} {isPendingTab ? "dòng giá" : "sản phẩm"}</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ padding: "6px 14px", border: "1px solid #d1d5db", borderRadius: "6px", background: "white", cursor: page === 1 ? "not-allowed" : "pointer", color: page === 1 ? "#d1d5db" : "#374151" }}
              >← Trước</button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * LIMIT >= total}
                style={{ padding: "6px 14px", border: "1px solid #d1d5db", borderRadius: "6px", background: "white", cursor: page * LIMIT >= total ? "not-allowed" : "pointer", color: page * LIMIT >= total ? "#d1d5db" : "#374151" }}
              >Sau →</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}