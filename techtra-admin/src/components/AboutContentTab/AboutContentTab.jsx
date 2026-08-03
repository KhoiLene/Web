// // // import "./AboutcontentTab.css";
// // // import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
// // // import { aboutContentApi, uploadGroupsApi } from "../../api";
// // // import RichTextToolbar from "./RichTextToolbar";

// // // // Key phải khớp với ve-techtra.js — đây là bài đang được PUBLISH (hiển thị live)
// // // const ABOUT_STORAGE_KEY = "about_us_content";
// // // // Danh sách toàn bộ bài viết cũ, lưu riêng theo từng nhóm: about_posts_<groupId>
// // // const postsStorageKey = (groupId) => `about_posts_${groupId}`;

// // // // Các thuộc tính CSS gây vỡ bố cục khi dán từ Word/Google Docs
// // // // (Word hay dùng position/float/margin âm để dàn cột — nếu giữ nguyên,
// // // // nội dung sẽ đè lên nhau khi hiển thị ngoài Word).
// // // const LAYOUT_BREAKING_PROPS = [
// // //   "position",
// // //   "top",
// // //   "left",
// // //   "right",
// // //   "bottom",
// // //   "float",
// // //   "z-index",
// // //   "transform",
// // //   "clip",
// // //   "clip-path",
// // //   "min-height",
// // //   "max-height",
// // // ];

// // // // Các thuộc tính CSS được PHÉP giữ lại (định dạng chữ)
// // // const ALLOWED_STYLE_PROPS = [
// // //   "color",
// // //   "background-color",
// // //   "font-family",
// // //   "font-size",
// // //   "font-weight",
// // //   "font-style",
// // //   "text-decoration",
// // //   "text-align",
// // //   "line-height",
// // // ];

// // // function sanitizeStyleAttr(styleText) {
// // //   if (!styleText) return "";
// // //   const kept = [];
// // //   styleText.split(";").forEach((decl) => {
// // //     const [rawProp, ...rest] = decl.split(":");
// // //     if (!rawProp || !rest.length) return;
// // //     const prop = rawProp.trim().toLowerCase();
// // //     const value = rest.join(":").trim();
// // //     if (!value) return;
// // //     // Bỏ margin/width/height âm hoặc cố định theo px cho các khối chứa
// // //     if (prop === "width" || prop === "height") {
// // //       // Ảnh vẫn cần width/height để không bị vỡ tỉ lệ -> xử lý riêng ở sanitizeNode
// // //       return;
// // //     }
// // //     if (LAYOUT_BREAKING_PROPS.includes(prop)) return;
// // //     if (prop.startsWith("margin") && value.includes("-")) return; // margin âm
// // //     if (ALLOWED_STYLE_PROPS.includes(prop) || prop.startsWith("margin") || prop.startsWith("padding")) {
// // //       kept.push(`${prop}: ${value}`);
// // //     }
// // //   });
// // //   return kept.join("; ");
// // // }

// // // function sanitizeNode(node) {
// // //   if (node.nodeType === Node.TEXT_NODE) return;
// // //   if (node.nodeType !== Node.ELEMENT_NODE) return;

// // //   const tag = node.tagName.toLowerCase();

// // //   // Loại bỏ hoàn toàn các thẻ định vị layout phức tạp của Word (thường là div lồng
// // //   // nhau chỉ để căn cột) nhưng vẫn giữ lại nội dung con của chúng
// // //   if (tag === "style" || tag === "script" || tag === "meta" || tag === "link") {
// // //     node.remove();
// // //     return;
// // //   }

// // //   // Xóa các thuộc tính không cần thiết (class của Word: MsoNormal, id, v.v.)
// // //   [...node.attributes].forEach((attr) => {
// // //     const name = attr.name.toLowerCase();
// // //     if (name === "style") return; // xử lý riêng bên dưới
// // //     if (name === "src" || name === "href" || name === "alt" || name === "colspan" || name === "rowspan") return;
// // //     node.removeAttribute(attr.name);
// // //   });

// // //   if (node.hasAttribute("style")) {
// // //     const cleanStyle = sanitizeStyleAttr(node.getAttribute("style"));
// // //     if (cleanStyle) node.setAttribute("style", cleanStyle);
// // //     else node.removeAttribute("style");
// // //   }

// // //   // Ảnh: luôn responsive, không để kích thước cố định làm vỡ layout khi màn hình nhỏ
// // //   if (tag === "img") {
// // //     node.style.maxWidth = "100%";
// // //     node.style.height = "auto";
// // //     node.removeAttribute("width");
// // //     node.removeAttribute("height");
// // //   }

// // //   [...node.childNodes].forEach(sanitizeNode);
// // // }

// // // // Làm sạch toàn bộ HTML được dán: giữ chữ/màu/in đậm/nghiêng/ảnh,
// // // // bỏ position/float/margin âm/kích thước cố định gây đè chữ lên ảnh
// // // function sanitizePastedHtml(rawHtml) {
// // //   const template = document.createElement("template");
// // //   template.innerHTML = rawHtml;
// // //   [...template.content.childNodes].forEach(sanitizeNode);
// // //   return template.innerHTML;
// // // }

// // // // Cắt bớt HTML để làm đoạn preview ngắn trong danh sách bài
// // // function htmlToPreviewText(htmlStr, maxLen = 80) {
// // //   const div = document.createElement("div");
// // //   div.innerHTML = htmlStr || "";
// // //   const text = (div.textContent || div.innerText || "").trim().replace(/\s+/g, " ");
// // //   return text.length > maxLen ? text.slice(0, maxLen) + "…" : text || "(chưa có nội dung)";
// // // }

// // // function formatDate(iso) {
// // //   try {
// // //     return new Date(iso).toLocaleString("vi-VN", {
// // //       day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
// // //     });
// // //   } catch {
// // //     return "";
// // //   }
// // // }

// // // // Tự động thu nhỏ cỡ chữ của 1 container nếu nội dung bên trong bị tràn ngang
// // // // (áp dụng cho cả khung soạn thảo và khung xem trước, để bảng/nội dung dán vào
// // // // luôn hiển thị đầy đủ, không bị cắt hay phải cuộn ngang).
// // // // min/max tính theo %, step là mức giảm mỗi vòng lặp.
// // // function autoFitFontSize(el, { min = 40, max = 100, step = 2 } = {}) {
// // //   if (!el) return;
// // //   // reset về 100% trước khi đo lại, tránh cộng dồn qua nhiều lần gọi
// // //   el.style.fontSize = "";
// // //   let size = max;
// // //   // nếu nội dung (vd bảng rộng dán từ Word) rộng hơn khung chứa thì giảm dần cỡ chữ
// // //   while (el.scrollWidth > el.clientWidth && size > min) {
// // //     size -= step;
// // //     el.style.fontSize = size + "%";
// // //   }
// // // }

// // // // ════════════════════════════════════════════════════════════════════════════
// // // // TAB 2 — Danh sách bài viết theo nhóm + soạn thảo nội dung cho trang Về Techtra
// // // // Component này TỰ lấy dữ liệu nhóm (uploadGroupsApi.getAll) nếu không được
// // // // truyền props parentGroups/childrenOf từ component cha — để có thể render
// // // // độc lập qua route riêng trong Sidebar (VD: case "upload").
// // // // ════════════════════════════════════════════════════════════════════════════
// // // export default function AboutContentTab({ parentGroups: parentGroupsProp, childrenOf: childrenOfProp }) {
// // //   const isControlled = parentGroupsProp !== undefined;

// // //   const [allGroups, setAllGroups] = useState([]);
// // //   const [loadingGroups, setLoadingGroups] = useState(true);

// // //   useEffect(() => {
// // //     if (isControlled) return;
// // //     (async () => {
// // //       setLoadingGroups(true);
// // //       try {
// // //         const res = await uploadGroupsApi.getAll();
// // //         setAllGroups(res?.data || []);
// // //       } catch {
// // //         setAllGroups([]);
// // //       } finally {
// // //         setLoadingGroups(false);
// // //       }
// // //     })();
// // //   }, [isControlled]);

// // //   const computedParentGroups = useMemo(
// // //     () => allGroups.filter((g) => !g.parent_id),
// // //     [allGroups]
// // //   );
// // //   const computedChildrenOf = useCallback(
// // //     (parentId) => allGroups.filter((g) => g.parent_id === parentId),
// // //     [allGroups]
// // //   );

// // //   const parentGroups = isControlled ? parentGroupsProp : computedParentGroups;
// // //   const childrenOf = isControlled ? childrenOfProp : computedChildrenOf;

// // //   const [groupId, setGroupId] = useState("");
// // //   const [posts, setPosts] = useState([]);           // danh sách bài cũ của nhóm đang chọn
// // //   const [loadingPosts, setLoadingPosts] = useState(false);
// // //   const [selectedPostId, setSelectedPostId] = useState(null); // null = đang soạn bài MỚI
// // //   const [title, setTitle] = useState("");
// // //   const [html, setHtml] = useState("");
// // //   const [saving, setSaving] = useState(false);
// // //   const [saved, setSaved] = useState(false);
// // //   const [error, setError] = useState("");
// // //   const editorRef = useRef(null);
// // //   const previewRef = useRef(null); // khung "Xem trước" — cũng cần tự co giãn cỡ chữ

// // //   // ─── Thu nhỏ / phóng to ảnh trong khung soạn thảo (kéo góc, giống Word) ───
// // //   const selectedImageRef = useRef(null); // <img> đang được chọn để resize
// // //   const [hasSelectedImage, setHasSelectedImage] = useState(false);
// // //   const resizeStateRef = useRef(null); // { startX, startWidth, aspect }
// // //   const [, forceHandleUpdate] = useState(0); // ép re-render để tay cầm theo sát ảnh khi kéo

// // //   // Với mỗi nhóm cha: nếu có nhóm con → chỉ cho chọn các nhóm con (nội dung phải
// // //   // gắn vào nhóm con). Nếu nhóm cha KHÔNG có con → cho chọn chính nhóm cha đó.
// // //   const selectableGroups = useMemo(() => {
// // //     return parentGroups.map((p) => {
// // //       const children = childrenOf(p.id);
// // //       return { parent: p, options: children.length ? children : [p] };
// // //     });
// // //   }, [parentGroups, childrenOf]);

// // //   const allOptions = useMemo(
// // //     () => selectableGroups.flatMap((s) => s.options),
// // //     [selectableGroups]
// // //   );

// // //   // Chọn sẵn: ưu tiên nhóm (con hoặc cha) có tên chứa "techtra"
// // //   useEffect(() => {
// // //     if (!groupId && allOptions.length) {
// // //       const guess = allOptions.find((g) => g.name.toLowerCase().includes("techtra"));
// // //       setGroupId(String((guess || allOptions[0]).id));
// // //     }
// // //   }, [allOptions, groupId]);

// // //   const loadEditor = useCallback((content) => {
// // //     setHtml(content || "");
// // //     if (editorRef.current) editorRef.current.innerHTML = content || "";
// // //   }, []);

// // //   // Bỏ chọn ảnh đang resize (xoá viền + tay cầm kéo)
// // //   const deselectImage = useCallback(() => {
// // //     if (selectedImageRef.current) {
// // //       selectedImageRef.current.classList.remove("up-img-selected");
// // //     }
// // //     selectedImageRef.current = null;
// // //     setHasSelectedImage(false);
// // //   }, []);

// // //   // Click vào 1 ảnh trong editor -> chọn ảnh đó để hiện tay cầm kéo resize
// // //   const handleEditorClick = useCallback((e) => {
// // //     const img = e.target.closest("img");
// // //     if (img && editorRef.current?.contains(img)) {
// // //       if (selectedImageRef.current && selectedImageRef.current !== img) {
// // //         selectedImageRef.current.classList.remove("up-img-selected");
// // //       }
// // //       selectedImageRef.current = img;
// // //       img.classList.add("up-img-selected");
// // //       setHasSelectedImage(true);
// // //     } else {
// // //       deselectImage();
// // //     }
// // //   }, [deselectImage]);

// // //   // Bắt đầu kéo tay cầm resize ở góc dưới-phải ảnh đang chọn
// // //   const handleResizeHandleMouseDown = (e) => {
// // //     e.preventDefault();
// // //     e.stopPropagation();
// // //     const img = selectedImageRef.current;
// // //     if (!img) return;
// // //     const startWidth = img.getBoundingClientRect().width;
// // //     const startHeight = img.getBoundingClientRect().height;
// // //     resizeStateRef.current = {
// // //       startX: e.clientX,
// // //       startWidth,
// // //       aspect: startHeight ? startWidth / startHeight : 1,
// // //     };
// // //     window.addEventListener("mousemove", handleResizeMouseMove);
// // //     window.addEventListener("mouseup", handleResizeMouseUp);
// // //   };

// // //   const handleResizeMouseMove = (e) => {
// // //     const img = selectedImageRef.current;
// // //     const state = resizeStateRef.current;
// // //     if (!img || !state) return;
// // //     const delta = e.clientX - state.startX;
// // //     // giới hạn tối thiểu 40px để không thu nhỏ mất luôn ảnh
// // //     const newWidth = Math.max(40, Math.round(state.startWidth + delta));
// // //     img.style.width = `${newWidth}px`;
// // //     img.style.height = "auto";
// // //     img.removeAttribute("height");
// // //     forceHandleUpdate((n) => n + 1);
// // //   };

// // //   const handleResizeMouseUp = () => {
// // //     resizeStateRef.current = null;
// // //     window.removeEventListener("mousemove", handleResizeMouseMove);
// // //     window.removeEventListener("mouseup", handleResizeMouseUp);
// // //     handleInput();
// // //   };

// // //   // Nút nhanh: thu nhỏ / phóng to ảnh đang chọn theo % so với kích thước hiện tại
// // //   const adjustSelectedImageSize = (ratio) => {
// // //     const img = selectedImageRef.current;
// // //     if (!img) return;
// // //     const currentWidth = img.getBoundingClientRect().width;
// // //     const newWidth = Math.max(40, Math.round(currentWidth * ratio));
// // //     img.style.width = `${newWidth}px`;
// // //     img.style.height = "auto";
// // //     img.removeAttribute("height");
// // //     handleInput();
// // //   };

// // //   // Đưa ảnh đang chọn về kích thước gốc (bỏ style width/height tuỳ chỉnh)
// // //   const resetSelectedImageSize = () => {
// // //     const img = selectedImageRef.current;
// // //     if (!img) return;
// // //     img.style.width = "";
// // //     img.style.height = "auto";
// // //     handleInput();
// // //   };

// // //   // Tải danh sách bài cũ của nhóm đang chọn.
// // //   // Ưu tiên gọi API (nếu backend hỗ trợ getAll theo nhóm), nếu lỗi/không có
// // //   // thì dùng danh sách lưu tạm trong trình duyệt (localStorage) làm phương án dự phòng.
// // //   const fetchPosts = useCallback(async (gId) => {
// // //     if (!gId) return;
// // //     setLoadingPosts(true);
// // //     setError("");
// // //     try {
// // //       let list = [];
// // //       try {
// // //         const res = await aboutContentApi.getAll(gId);
// // //         list = res?.data || res || [];
// // //       } catch {
// // //         // Backend chưa có endpoint getAll theo nhóm -> lấy từ localStorage
// // //         list = JSON.parse(localStorage.getItem(postsStorageKey(gId)) || "[]");
// // //       }
// // //       list.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
// // //       setPosts(list);
// // //     } catch (err) {
// // //       setError("Không tải được danh sách bài: " + err.message);
// // //       setPosts([]);
// // //     } finally {
// // //       setLoadingPosts(false);
// // //     }
// // //   }, []);

// // //   // Khi đổi nhóm: tải lại danh sách bài, và mở bài mới nhất (nếu có) để sửa luôn
// // //   useEffect(() => {
// // //     if (!groupId) return;
// // //     setSelectedPostId(null);
// // //     setTitle("");
// // //     loadEditor("");
// // //     (async () => {
// // //       await fetchPosts(groupId);
// // //     })();
// // //   }, [groupId, fetchPosts, loadEditor]);

// // //   // Sau khi có danh sách bài, tự mở bài mới nhất để sửa (đúng ý "xem bài cũ để sửa")
// // //   useEffect(() => {
// // //     if (posts.length && !selectedPostId) {
// // //       const latest = posts[0];
// // //       setSelectedPostId(latest.id);
// // //       setTitle(latest.title || "");
// // //       loadEditor(latest.content || "");
// // //     }
// // //     // eslint-disable-next-line react-hooks/exhaustive-deps
// // //   }, [posts]);

// // //   // Mỗi khi nội dung (html) thay đổi — đổi bài, dán, gõ, xóa hết...
// // //   // tự đo lại và thu nhỏ cỡ chữ nếu nội dung tràn khung, ở cả khung soạn thảo
// // //   // lẫn khung xem trước.
// // //   useEffect(() => {
// // //     const raf = requestAnimationFrame(() => {
// // //       autoFitFontSize(editorRef.current);
// // //       autoFitFontSize(previewRef.current);
// // //     });
// // //     return () => cancelAnimationFrame(raf);
// // //   }, [html]);

// // //   // Nếu người dùng đổi kích thước cửa sổ/khung, đo lại để cỡ chữ luôn khớp
// // //   useEffect(() => {
// // //     const handleResize = () => {
// // //       autoFitFontSize(editorRef.current);
// // //       autoFitFontSize(previewRef.current);
// // //     };
// // //     window.addEventListener("resize", handleResize);
// // //     return () => window.removeEventListener("resize", handleResize);
// // //   }, []);

// // //   const persistLocalPosts = (gId, list) => {
// // //     localStorage.setItem(postsStorageKey(gId), JSON.stringify(list));
// // //   };

// // //   const selectPost = (post) => {
// // //     setSelectedPostId(post.id);
// // //     setTitle(post.title || "");
// // //     loadEditor(post.content || "");
// // //     setSaved(false);
// // //     setError("");
// // //   };

// // //   const handleNewPost = () => {
// // //     setSelectedPostId(null);
// // //     setTitle("");
// // //     loadEditor("");
// // //     setSaved(false);
// // //     setError("");
// // //   };

// // //   // Dán nội dung: chặn hành vi dán mặc định của trình duyệt, tự lọc HTML
// // //   // để giữ font/màu/in đậm/nghiêng nhưng loại bỏ position/float/margin âm
// // //   // (nguyên nhân khiến chữ đè lên ảnh khi dán từ Word/Google Docs).
// // //   const handlePaste = (e) => {
// // //     e.preventDefault();
// // //     const rawHtml = e.clipboardData.getData("text/html");
// // //     const rawText = e.clipboardData.getData("text/plain");

// // //     let contentToInsert;
// // //     if (rawHtml) {
// // //       contentToInsert = sanitizePastedHtml(rawHtml);
// // //     } else {
// // //       contentToInsert = rawText.replace(/\n/g, "<br>");
// // //     }

// // //     document.execCommand("insertHTML", false, contentToInsert);
// // //     handleInput();
// // //   };

// // //   const handleInput = () => {
// // //     setHtml(editorRef.current.innerHTML);
// // //     setSaved(false);
// // //   };

// // //   // Lưu bài: nếu đang sửa bài có sẵn -> cập nhật đúng bài đó trong danh sách.
// // //   // Nếu đang soạn bài mới -> thêm bài mới vào danh sách của nhóm.
// // //   const handleSave = async () => {
// // //     if (!groupId) { setError("Vui lòng chọn nhóm nhận nội dung"); return; }
// // //     setSaving(true);
// // //     setError("");
// // //     const content = editorRef.current.innerHTML;
// // //     const now = new Date().toISOString();

// // //     try {
// // //       let updatedPost;
// // //       if (selectedPostId) {
// // //         updatedPost = { id: selectedPostId, title, content, updatedAt: now };
// // //         try {
// // //           await aboutContentApi.update(selectedPostId, { title, content, group_id: groupId });
// // //         } catch {
// // //           /* backend chưa sẵn sàng, vẫn lưu tạm ở trình duyệt bên dưới */
// // //         }
// // //       } else {
// // //         const newId = `local_${Date.now()}`;
// // //         updatedPost = { id: newId, title: title || "Bài chưa đặt tên", content, updatedAt: now };
// // //         try {
// // //           const res = await aboutContentApi.create({ title, content, group_id: groupId });
// // //           if (res?.id) updatedPost.id = res.id;
// // //         } catch {
// // //           /* backend chưa sẵn sàng, dùng id tạm local_... */
// // //         }
// // //         setSelectedPostId(updatedPost.id);
// // //       }

// // //       setPosts((prev) => {
// // //         const others = prev.filter((p) => p.id !== updatedPost.id);
// // //         const next = [updatedPost, ...others];
// // //         persistLocalPosts(groupId, next);
// // //         return next;
// // //       });

// // //       setSaved(true);
// // //     } catch (err) {
// // //       setError("Không lưu được: " + err.message);
// // //     } finally {
// // //       setSaving(false);
// // //     }
// // //   };

// // //   // Đặt bài đang sửa làm bài HIỂN THỊ TRỰC TIẾP trên trang Về Techtra
// // //   const handlePublish = async () => {
// // //     if (!groupId) { setError("Vui lòng chọn nhóm nhận nội dung"); return; }
// // //     const content = editorRef.current.innerHTML;
// // //     try {
// // //       await aboutContentApi.save(groupId, { content });
// // //     } catch {
// // //       /* backend chưa sẵn sàng, vẫn publish tạm ở trình duyệt bên dưới */
// // //     }
// // //     localStorage.setItem(ABOUT_STORAGE_KEY, content);
// // //     setSaved(true);
// // //   };

// // //   const handleDeletePost = async (post) => {
// // //     if (!window.confirm(`Xóa bài "${post.title || "(chưa đặt tên)"}"?`)) return;
// // //     try {
// // //       await aboutContentApi.remove?.(post.id);
// // //     } catch {
// // //       /* backend chưa sẵn sàng, vẫn xóa khỏi danh sách tạm bên dưới */
// // //     }
// // //     setPosts((prev) => {
// // //       const next = prev.filter((p) => p.id !== post.id);
// // //       persistLocalPosts(groupId, next);
// // //       return next;
// // //     });
// // //     if (selectedPostId === post.id) handleNewPost();
// // //   };

// // //   const handleClear = () => {
// // //     if (!window.confirm("Xóa toàn bộ nội dung soạn thảo?")) return;
// // //     loadEditor("");
// // //   };

// // //   if (!isControlled && loadingGroups) {
// // //     return <div className="up-loading">⌛ Đang tải danh sách nhóm...</div>;
// // //   }

// // //   return (
// // //     <div>
// // //       <div className="up-toolbar">
// // //         <div className="up-field" style={{ minWidth: 260 }}>
// // //           <label>Nhóm nhận nội dung</label>
// // //           <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
// // //             {selectableGroups.map(({ parent, options }) => (
// // //               <optgroup key={parent.id} label={parent.name}>
// // //                 {options.map((g) => (
// // //                   <option key={g.id} value={g.id}>
// // //                     {g.id === parent.id ? `${g.name} (nhóm cha, không có con)` : g.name}
// // //                   </option>
// // //                 ))}
// // //               </optgroup>
// // //             ))}
// // //           </select>
// // //         </div>
// // //         <div className="up-field" style={{ minWidth: 220, flex: 1 }}>
// // //           <label>Tiêu đề bài viết</label>
// // //           <input
// // //             type="text"
// // //             value={title}
// // //             onChange={(e) => { setTitle(e.target.value); setSaved(false); }}
// // //             placeholder="VD: Cà phê, Trà, Giới thiệu KATINAT..."
// // //           />
// // //         </div>
// // //         <button className="up-btn" onClick={handleClear}>Xóa hết</button>
// // //         <button className="up-btn up-btn-primary" onClick={handleSave} disabled={saving}>
// // //           <i className="fas fa-save" /> {saving ? "Đang lưu..." : selectedPostId ? "Lưu bài này" : "Lưu bài mới"}
// // //         </button>
// // //         <button className="up-btn up-btn-success" onClick={handlePublish} disabled={saving}>
// // //           <i className="fas fa-upload" /> Đặt làm bài hiển thị
// // //         </button>
// // //       </div>

// // //       {error && <div className="up-error">⚠️ {error}</div>}
// // //       {saved && <div className="up-success">✅ Đã lưu.</div>}

// // //       <div className="up-content-layout">
// // //         {/* ─── Danh sách bài cũ của nhóm ─── */}
// // //         <div className="up-post-list">
// // //           <div className="up-post-list__header">
// // //             <span>Bài viết trong nhóm</span>
// // //             <button className="up-btn" onClick={handleNewPost}>
// // //               <i className="fas fa-plus" /> Bài mới
// // //             </button>
// // //           </div>

// // //           {loadingPosts ? (
// // //             <div className="up-loading" style={{ padding: 24 }}>⌛ Đang tải...</div>
// // //           ) : posts.length === 0 ? (
// // //             <p className="up-hint" style={{ padding: 12 }}>Chưa có bài nào trong nhóm này.</p>
// // //           ) : (
// // //             <div className="up-post-list__items">
// // //               {posts.map((p) => (
// // //                 <div
// // //                   key={p.id}
// // //                   className={`up-post-item${p.id === selectedPostId ? " active" : ""}`}
// // //                   onClick={() => selectPost(p)}
// // //                 >
// // //                   <div className="up-post-item__title">{p.title || "(chưa đặt tên)"}</div>
// // //                   <div className="up-post-item__preview">{htmlToPreviewText(p.content)}</div>
// // //                   <div className="up-post-item__meta">
// // //                     <span>{formatDate(p.updatedAt)}</span>
// // //                     <button
// // //                       className="up-icon-btn danger"
// // //                       title="Xóa bài"
// // //                       onClick={(e) => { e.stopPropagation(); handleDeletePost(p); }}
// // //                     >
// // //                       <i className="fas fa-trash" />
// // //                     </button>
// // //                   </div>
// // //                 </div>
// // //               ))}
// // //             </div>
// // //           )}
// // //         </div>

// // //         {/* ─── Khung soạn thảo ─── */}
// // //         <div className="up-content-editor-col">
// // //           <p className="up-hint" style={{ marginBottom: 8 }}>
// // //             Gõ mô tả hoặc dán trực tiếp (Ctrl+V) nội dung từ Word/Google Docs — font chữ, màu, in đậm/nghiêng, ảnh sẽ
// // //             được giữ nguyên. Định dạng dàn trang gây vỡ layout của Word sẽ tự động được lược bỏ.
// // //           </p>

// // //           <RichTextToolbar editorRef={editorRef} onChange={handleInput} />

// // //           {hasSelectedImage && (
// // //             <div className="up-img-resize-toolbar">
// // //               <span>Ảnh đã chọn:</span>
// // //               <button type="button" className="up-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => adjustSelectedImageSize(0.9)}>
// // //                 <i className="fas fa-search-minus" /> Thu nhỏ
// // //               </button>
// // //               <button type="button" className="up-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => adjustSelectedImageSize(1.1)}>
// // //                 <i className="fas fa-search-plus" /> Phóng to
// // //               </button>
// // //               <button type="button" className="up-btn" onMouseDown={(e) => e.preventDefault()} onClick={resetSelectedImageSize}>
// // //                 Về gốc
// // //               </button>
// // //               <span className="up-hint">Hoặc kéo tay cầm ở góc ảnh để chỉnh trực tiếp</span>
// // //             </div>
// // //           )}

// // //           <div className="up-editor-wrap" style={{ position: "relative" }}>
// // //             <div
// // //               ref={editorRef}
// // //               className="up-editor"
// // //               contentEditable
// // //               suppressContentEditableWarning
// // //               onPaste={handlePaste}
// // //               onInput={handleInput}
// // //               onClick={handleEditorClick}
// // //               dangerouslySetInnerHTML={{ __html: html }}
// // //               style={{
// // //                 width: "100%",
// // //                 padding: "12px",
// // //                 border: "1px solid #d1d5db",
// // //                 borderRadius: "8px",
// // //                 boxSizing: "border-box",
// // //                 fontSize: "14px",
// // //                 outline: "none",
// // //                 minHeight: "160px",
// // //                 backgroundColor: "white",
// // //                 overflowY: "auto",
// // //                 lineHeight: 1.6,
// // //               }}
// // //             />
// // //             {hasSelectedImage && selectedImageRef.current && (
// // //               <div
// // //                 className="up-img-resize-handle"
// // //                 onMouseDown={handleResizeHandleMouseDown}
// // //                 style={(() => {
// // //                   const wrap = editorRef.current?.getBoundingClientRect();
// // //                   const img = selectedImageRef.current.getBoundingClientRect();
// // //                   if (!wrap) return { display: "none" };
// // //                   return {
// // //                     left: img.right - wrap.left + editorRef.current.scrollLeft - 8,
// // //                     top: img.bottom - wrap.top + editorRef.current.scrollTop - 8,
// // //                   };
// // //                 })()}
// // //               />
// // //             )}
// // //           </div>

// // //           <div className="up-editor-preview-label">Xem trước (đúng như trang Về Techtra sẽ hiển thị):</div>
// // //           <div
// // //             ref={previewRef}
// // //             className="up-editor-preview prose"
// // //             dangerouslySetInnerHTML={{ __html: html }}
// // //           />
// // //         </div>
// // //       </div>
// // //     </div>
// // //   );
// // // }

// // import "./AboutcontentTab.css";
// // import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
// // import { aboutContentApi, uploadGroupsApi } from "../../api";
// // import RichTextToolbar from "./RichTextToolbar";

// // // Key phải khớp với ve-techtra.js — đây là bài đang được PUBLISH (hiển thị live)
// // const ABOUT_STORAGE_KEY = "about_us_content";
// // // Danh sách toàn bộ bài viết cũ, lưu riêng theo từng nhóm: about_posts_<groupId>
// // const postsStorageKey = (groupId) => `about_posts_${groupId}`;

// // // Các thuộc tính CSS gây vỡ bố cục khi dán từ Word/Google Docs
// // // (Word hay dùng position/float/margin âm để dàn cột — nếu giữ nguyên,
// // // nội dung sẽ đè lên nhau khi hiển thị ngoài Word).
// // const LAYOUT_BREAKING_PROPS = [
// //   "position",
// //   "top",
// //   "left",
// //   "right",
// //   "bottom",
// //   "float",
// //   "z-index",
// //   "transform",
// //   "clip",
// //   "clip-path",
// //   "min-height",
// //   "max-height",
// // ];

// // // Các thuộc tính CSS được PHÉP giữ lại (định dạng chữ)
// // const ALLOWED_STYLE_PROPS = [
// //   "color",
// //   "background-color",
// //   "font-family",
// //   "font-size",
// //   "font-weight",
// //   "font-style",
// //   "text-decoration",
// //   "text-align",
// //   "line-height",
// // ];

// // function sanitizeStyleAttr(styleText) {
// //   if (!styleText) return "";
// //   const kept = [];
// //   styleText.split(";").forEach((decl) => {
// //     const [rawProp, ...rest] = decl.split(":");
// //     if (!rawProp || !rest.length) return;
// //     const prop = rawProp.trim().toLowerCase();
// //     const value = rest.join(":").trim();
// //     if (!value) return;
// //     // Bỏ margin/width/height âm hoặc cố định theo px cho các khối chứa
// //     if (prop === "width" || prop === "height") {
// //       // Ảnh vẫn cần width/height để không bị vỡ tỉ lệ -> xử lý riêng ở sanitizeNode
// //       return;
// //     }
// //     if (LAYOUT_BREAKING_PROPS.includes(prop)) return;
// //     if (prop.startsWith("margin") && value.includes("-")) return; // margin âm
// //     if (ALLOWED_STYLE_PROPS.includes(prop) || prop.startsWith("margin") || prop.startsWith("padding")) {
// //       kept.push(`${prop}: ${value}`);
// //     }
// //   });
// //   return kept.join("; ");
// // }

// // function sanitizeNode(node) {
// //   if (node.nodeType === Node.TEXT_NODE) return;
// //   if (node.nodeType !== Node.ELEMENT_NODE) return;

// //   const tag = node.tagName.toLowerCase();

// //   // Loại bỏ hoàn toàn các thẻ định vị layout phức tạp của Word (thường là div lồng
// //   // nhau chỉ để căn cột) nhưng vẫn giữ lại nội dung con của chúng
// //   if (tag === "style" || tag === "script" || tag === "meta" || tag === "link") {
// //     node.remove();
// //     return;
// //   }

// //   // Xóa các thuộc tính không cần thiết (class của Word: MsoNormal, id, v.v.)
// //   [...node.attributes].forEach((attr) => {
// //     const name = attr.name.toLowerCase();
// //     if (name === "style") return; // xử lý riêng bên dưới
// //     if (name === "src" || name === "href" || name === "alt" || name === "colspan" || name === "rowspan") return;
// //     node.removeAttribute(attr.name);
// //   });

// //   if (node.hasAttribute("style")) {
// //     const cleanStyle = sanitizeStyleAttr(node.getAttribute("style"));
// //     if (cleanStyle) node.setAttribute("style", cleanStyle);
// //     else node.removeAttribute("style");
// //   }

// //   // Ảnh: luôn responsive, không để kích thước cố định làm vỡ layout khi màn hình nhỏ
// //   if (tag === "img") {
// //     node.style.maxWidth = "100%";
// //     node.style.height = "auto";
// //     node.removeAttribute("width");
// //     node.removeAttribute("height");
// //   }

// //   [...node.childNodes].forEach(sanitizeNode);
// // }

// // // Làm sạch toàn bộ HTML được dán: giữ chữ/màu/in đậm/nghiêng/ảnh,
// // // bỏ position/float/margin âm/kích thước cố định gây đè chữ lên ảnh
// // function sanitizePastedHtml(rawHtml) {
// //   const template = document.createElement("template");
// //   template.innerHTML = rawHtml;
// //   [...template.content.childNodes].forEach(sanitizeNode);
// //   return template.innerHTML;
// // }

// // // Cắt bớt HTML để làm đoạn preview ngắn trong danh sách bài
// // function htmlToPreviewText(htmlStr, maxLen = 80) {
// //   const div = document.createElement("div");
// //   div.innerHTML = htmlStr || "";
// //   const text = (div.textContent || div.innerText || "").trim().replace(/\s+/g, " ");
// //   return text.length > maxLen ? text.slice(0, maxLen) + "…" : text || "(chưa có nội dung)";
// // }

// // function formatDate(iso) {
// //   try {
// //     return new Date(iso).toLocaleString("vi-VN", {
// //       day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
// //     });
// //   } catch {
// //     return "";
// //   }
// // }

// // // Tự động thu nhỏ cỡ chữ của 1 container nếu nội dung bên trong bị tràn ngang
// // // (áp dụng cho cả khung soạn thảo và khung xem trước, để bảng/nội dung dán vào
// // // luôn hiển thị đầy đủ, không bị cắt hay phải cuộn ngang).
// // // min/max tính theo %, step là mức giảm mỗi vòng lặp.
// // function autoFitFontSize(el, { min = 40, max = 100, step = 2 } = {}) {
// //   if (!el) return;
// //   // reset về 100% trước khi đo lại, tránh cộng dồn qua nhiều lần gọi
// //   el.style.fontSize = "";
// //   let size = max;
// //   // nếu nội dung (vd bảng rộng dán từ Word) rộng hơn khung chứa thì giảm dần cỡ chữ
// //   while (el.scrollWidth > el.clientWidth && size > min) {
// //     size -= step;
// //     el.style.fontSize = size + "%";
// //   }
// // }

// // // ════════════════════════════════════════════════════════════════════════════
// // // TAB 2 — Danh sách bài viết theo nhóm + soạn thảo nội dung cho trang Về Techtra
// // // Component này TỰ lấy dữ liệu nhóm (uploadGroupsApi.getAll) nếu không được
// // // truyền props parentGroups/childrenOf từ component cha — để có thể render
// // // độc lập qua route riêng trong Sidebar (VD: case "upload").
// // // ════════════════════════════════════════════════════════════════════════════
// // export default function AboutContentTab({ parentGroups: parentGroupsProp, childrenOf: childrenOfProp }) {
// //   const isControlled = parentGroupsProp !== undefined;

// //   const [allGroups, setAllGroups] = useState([]);
// //   const [loadingGroups, setLoadingGroups] = useState(true);

// //   useEffect(() => {
// //     if (isControlled) return;
// //     (async () => {
// //       setLoadingGroups(true);
// //       try {
// //         const res = await uploadGroupsApi.getAll();
// //         setAllGroups(res?.data || []);
// //       } catch {
// //         setAllGroups([]);
// //       } finally {
// //         setLoadingGroups(false);
// //       }
// //     })();
// //   }, [isControlled]);

// //   const computedParentGroups = useMemo(
// //     () => allGroups.filter((g) => !g.parent_id),
// //     [allGroups]
// //   );
// //   const computedChildrenOf = useCallback(
// //     (parentId) => allGroups.filter((g) => g.parent_id === parentId),
// //     [allGroups]
// //   );

// //   const parentGroups = isControlled ? parentGroupsProp : computedParentGroups;
// //   const childrenOf = isControlled ? childrenOfProp : computedChildrenOf;

// //   const [groupId, setGroupId] = useState("");
// //   const [posts, setPosts] = useState([]);           // danh sách bài cũ của nhóm đang chọn
// //   const [loadingPosts, setLoadingPosts] = useState(false);
// //   const [selectedPostId, setSelectedPostId] = useState(null); // null = đang soạn bài MỚI
// //   const [title, setTitle] = useState("");
// //   const [html, setHtml] = useState("");
// //   const [saving, setSaving] = useState(false);
// //   const [saved, setSaved] = useState(false);
// //   const [error, setError] = useState("");
// //   const editorRef = useRef(null);
// //   const previewRef = useRef(null); // khung "Xem trước" — cũng cần tự co giãn cỡ chữ

// //   // ─── Thu nhỏ / phóng to ảnh trong khung soạn thảo (kéo góc, giống Word) ───
// //   const selectedImageRef = useRef(null); // <img> đang được chọn để resize
// //   const [hasSelectedImage, setHasSelectedImage] = useState(false);
// //   const resizeStateRef = useRef(null); // { startX, startWidth, aspect }
// //   const [, forceHandleUpdate] = useState(0); // ép re-render để tay cầm theo sát ảnh khi kéo

// //   // Với mỗi nhóm cha: LUÔN cho phép chọn chính nhóm cha, cộng thêm toàn bộ
// //   // nhóm con của nó (nếu có) — cho phép chọn TẤT CẢ các nhóm, không giới hạn
// //   // chỉ nhóm lá như trước đây.
// //   const selectableGroups = useMemo(() => {
// //     return parentGroups.map((p) => {
// //       const children = childrenOf(p.id);
// //       return { parent: p, options: [p, ...children] };
// //     });
// //   }, [parentGroups, childrenOf]);

// //   const allOptions = useMemo(
// //     () => selectableGroups.flatMap((s) => s.options),
// //     [selectableGroups]
// //   );

// //   // Chọn sẵn: ưu tiên nhóm (con hoặc cha) có tên chứa "techtra"
// //   useEffect(() => {
// //     if (!groupId && allOptions.length) {
// //       const guess = allOptions.find((g) => g.name.toLowerCase().includes("techtra"));
// //       setGroupId(String((guess || allOptions[0]).id));
// //     }
// //   }, [allOptions, groupId]);

// //   const loadEditor = useCallback((content) => {
// //     setHtml(content || "");
// //     if (editorRef.current) editorRef.current.innerHTML = content || "";
// //   }, []);

// //   // Bỏ chọn ảnh đang resize (xoá viền + tay cầm kéo)
// //   const deselectImage = useCallback(() => {
// //     if (selectedImageRef.current) {
// //       selectedImageRef.current.classList.remove("up-img-selected");
// //     }
// //     selectedImageRef.current = null;
// //     setHasSelectedImage(false);
// //   }, []);

// //   // Click vào 1 ảnh trong editor -> chọn ảnh đó để hiện tay cầm kéo resize
// //   const handleEditorClick = useCallback((e) => {
// //     const img = e.target.closest("img");
// //     if (img && editorRef.current?.contains(img)) {
// //       if (selectedImageRef.current && selectedImageRef.current !== img) {
// //         selectedImageRef.current.classList.remove("up-img-selected");
// //       }
// //       selectedImageRef.current = img;
// //       img.classList.add("up-img-selected");
// //       setHasSelectedImage(true);
// //     } else {
// //       deselectImage();
// //     }
// //   }, [deselectImage]);

// //   // Bắt đầu kéo tay cầm resize ở góc dưới-phải ảnh đang chọn
// //   const handleResizeHandleMouseDown = (e) => {
// //     e.preventDefault();
// //     e.stopPropagation();
// //     const img = selectedImageRef.current;
// //     if (!img) return;
// //     const startWidth = img.getBoundingClientRect().width;
// //     const startHeight = img.getBoundingClientRect().height;
// //     resizeStateRef.current = {
// //       startX: e.clientX,
// //       startWidth,
// //       aspect: startHeight ? startWidth / startHeight : 1,
// //     };
// //     window.addEventListener("mousemove", handleResizeMouseMove);
// //     window.addEventListener("mouseup", handleResizeMouseUp);
// //   };

// //   const handleResizeMouseMove = (e) => {
// //     const img = selectedImageRef.current;
// //     const state = resizeStateRef.current;
// //     if (!img || !state) return;
// //     const delta = e.clientX - state.startX;
// //     // giới hạn tối thiểu 40px để không thu nhỏ mất luôn ảnh
// //     const newWidth = Math.max(40, Math.round(state.startWidth + delta));
// //     img.style.width = `${newWidth}px`;
// //     img.style.height = "auto";
// //     img.removeAttribute("height");
// //     forceHandleUpdate((n) => n + 1);
// //   };

// //   const handleResizeMouseUp = () => {
// //     resizeStateRef.current = null;
// //     window.removeEventListener("mousemove", handleResizeMouseMove);
// //     window.removeEventListener("mouseup", handleResizeMouseUp);
// //     handleInput();
// //   };

// //   // Nút nhanh: thu nhỏ / phóng to ảnh đang chọn theo % so với kích thước hiện tại
// //   const adjustSelectedImageSize = (ratio) => {
// //     const img = selectedImageRef.current;
// //     if (!img) return;
// //     const currentWidth = img.getBoundingClientRect().width;
// //     const newWidth = Math.max(40, Math.round(currentWidth * ratio));
// //     img.style.width = `${newWidth}px`;
// //     img.style.height = "auto";
// //     img.removeAttribute("height");
// //     handleInput();
// //   };

// //   // Đưa ảnh đang chọn về kích thước gốc (bỏ style width/height tuỳ chỉnh)
// //   const resetSelectedImageSize = () => {
// //     const img = selectedImageRef.current;
// //     if (!img) return;
// //     img.style.width = "";
// //     img.style.height = "auto";
// //     handleInput();
// //   };

// //   // Tải danh sách bài cũ của nhóm đang chọn.
// //   // Ưu tiên gọi API (nếu backend hỗ trợ getAll theo nhóm), nếu lỗi/không có
// //   // thì dùng danh sách lưu tạm trong trình duyệt (localStorage) làm phương án dự phòng.
// //   const fetchPosts = useCallback(async (gId) => {
// //     if (!gId) return;
// //     setLoadingPosts(true);
// //     setError("");
// //     try {
// //       let list = [];
// //       try {
// //         const res = await aboutContentApi.getAll(gId);
// //         list = res?.data || res || [];
// //       } catch {
// //         // Backend chưa có endpoint getAll theo nhóm -> lấy từ localStorage
// //         list = JSON.parse(localStorage.getItem(postsStorageKey(gId)) || "[]");
// //       }
// //       list.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
// //       setPosts(list);
// //     } catch (err) {
// //       setError("Không tải được danh sách bài: " + err.message);
// //       setPosts([]);
// //     } finally {
// //       setLoadingPosts(false);
// //     }
// //   }, []);

// //   // Khi đổi nhóm: tải lại danh sách bài, và mở bài mới nhất (nếu có) để sửa luôn
// //   useEffect(() => {
// //     if (!groupId) return;
// //     setSelectedPostId(null);
// //     setTitle("");
// //     loadEditor("");
// //     (async () => {
// //       await fetchPosts(groupId);
// //     })();
// //   }, [groupId, fetchPosts, loadEditor]);

// //   // Sau khi có danh sách bài, tự mở bài mới nhất để sửa (đúng ý "xem bài cũ để sửa")
// //   useEffect(() => {
// //     if (posts.length && !selectedPostId) {
// //       const latest = posts[0];
// //       setSelectedPostId(latest.id);
// //       setTitle(latest.title || "");
// //       loadEditor(latest.content || "");
// //     }
// //     // eslint-disable-next-line react-hooks/exhaustive-deps
// //   }, [posts]);

// //   // Mỗi khi nội dung (html) thay đổi — đổi bài, dán, gõ, xóa hết...
// //   // tự đo lại và thu nhỏ cỡ chữ nếu nội dung tràn khung, ở cả khung soạn thảo
// //   // lẫn khung xem trước.
// //   useEffect(() => {
// //     const raf = requestAnimationFrame(() => {
// //       autoFitFontSize(editorRef.current);
// //       autoFitFontSize(previewRef.current);
// //     });
// //     return () => cancelAnimationFrame(raf);
// //   }, [html]);

// //   // Nếu người dùng đổi kích thước cửa sổ/khung, đo lại để cỡ chữ luôn khớp
// //   useEffect(() => {
// //     const handleResize = () => {
// //       autoFitFontSize(editorRef.current);
// //       autoFitFontSize(previewRef.current);
// //     };
// //     window.addEventListener("resize", handleResize);
// //     return () => window.removeEventListener("resize", handleResize);
// //   }, []);

// //   const persistLocalPosts = (gId, list) => {
// //     localStorage.setItem(postsStorageKey(gId), JSON.stringify(list));
// //   };

// //   const selectPost = (post) => {
// //     setSelectedPostId(post.id);
// //     setTitle(post.title || "");
// //     loadEditor(post.content || "");
// //     setSaved(false);
// //     setError("");
// //   };

// //   const handleNewPost = () => {
// //     setSelectedPostId(null);
// //     setTitle("");
// //     loadEditor("");
// //     setSaved(false);
// //     setError("");
// //   };

// //   // Dán nội dung: chặn hành vi dán mặc định của trình duyệt, tự lọc HTML
// //   // để giữ font/màu/in đậm/nghiêng nhưng loại bỏ position/float/margin âm
// //   // (nguyên nhân khiến chữ đè lên ảnh khi dán từ Word/Google Docs).
// //   const handlePaste = (e) => {
// //     e.preventDefault();
// //     const rawHtml = e.clipboardData.getData("text/html");
// //     const rawText = e.clipboardData.getData("text/plain");

// //     let contentToInsert;
// //     if (rawHtml) {
// //       contentToInsert = sanitizePastedHtml(rawHtml);
// //     } else {
// //       contentToInsert = rawText.replace(/\n/g, "<br>");
// //     }

// //     document.execCommand("insertHTML", false, contentToInsert);
// //     handleInput();
// //   };

// //   const handleInput = () => {
// //     setHtml(editorRef.current.innerHTML);
// //     setSaved(false);
// //   };

// //   // Lưu bài: nếu đang sửa bài có sẵn -> cập nhật đúng bài đó trong danh sách.
// //   // Nếu đang soạn bài mới -> thêm bài mới vào danh sách của nhóm.
// //   const handleSave = async () => {
// //     if (!groupId) { setError("Vui lòng chọn nhóm nhận nội dung"); return; }
// //     setSaving(true);
// //     setError("");
// //     const content = editorRef.current.innerHTML;
// //     const now = new Date().toISOString();

// //     try {
// //       let updatedPost;
// //       if (selectedPostId) {
// //         updatedPost = { id: selectedPostId, title, content, updatedAt: now };
// //         try {
// //           await aboutContentApi.update(selectedPostId, { title, content, group_id: groupId });
// //         } catch {
// //           /* backend chưa sẵn sàng, vẫn lưu tạm ở trình duyệt bên dưới */
// //         }
// //       } else {
// //         const newId = `local_${Date.now()}`;
// //         updatedPost = { id: newId, title: title || "Bài chưa đặt tên", content, updatedAt: now };
// //         try {
// //           const res = await aboutContentApi.create({ title, content, group_id: groupId });
// //           if (res?.id) updatedPost.id = res.id;
// //         } catch {
// //           /* backend chưa sẵn sàng, dùng id tạm local_... */
// //         }
// //         setSelectedPostId(updatedPost.id);
// //       }

// //       setPosts((prev) => {
// //         const others = prev.filter((p) => p.id !== updatedPost.id);
// //         const next = [updatedPost, ...others];
// //         persistLocalPosts(groupId, next);
// //         return next;
// //       });

// //       setSaved(true);
// //     } catch (err) {
// //       setError("Không lưu được: " + err.message);
// //     } finally {
// //       setSaving(false);
// //     }
// //   };

// //   // Đặt bài đang sửa làm bài HIỂN THỊ TRỰC TIẾP trên trang Về Techtra
// //   const handlePublish = async () => {
// //     if (!groupId) { setError("Vui lòng chọn nhóm nhận nội dung"); return; }
// //     const content = editorRef.current.innerHTML;
// //     try {
// //       await aboutContentApi.save(groupId, { content });
// //     } catch {
// //       /* backend chưa sẵn sàng, vẫn publish tạm ở trình duyệt bên dưới */
// //     }
// //     localStorage.setItem(ABOUT_STORAGE_KEY, content);
// //     setSaved(true);
// //   };

// //   const handleDeletePost = async (post) => {
// //     if (!window.confirm(`Xóa bài "${post.title || "(chưa đặt tên)"}"?`)) return;
// //     try {
// //       await aboutContentApi.remove?.(post.id);
// //     } catch {
// //       /* backend chưa sẵn sàng, vẫn xóa khỏi danh sách tạm bên dưới */
// //     }
// //     setPosts((prev) => {
// //       const next = prev.filter((p) => p.id !== post.id);
// //       persistLocalPosts(groupId, next);
// //       return next;
// //     });
// //     if (selectedPostId === post.id) handleNewPost();
// //   };

// //   const handleClear = () => {
// //     if (!window.confirm("Xóa toàn bộ nội dung soạn thảo?")) return;
// //     loadEditor("");
// //   };

// //   if (!isControlled && loadingGroups) {
// //     return <div className="up-loading">⌛ Đang tải danh sách nhóm...</div>;
// //   }

// //   return (
// //     <div>
// //       <div className="up-toolbar">
// //         <div className="up-field" style={{ minWidth: 260 }}>
// //           <label>Nhóm nhận nội dung</label>
// //           <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
// //             {selectableGroups.map(({ parent, options }) => (
// //               <optgroup key={parent.id} label={parent.name}>
// //                 {options.map((g) => (
// //                   <option key={g.id} value={g.id}>
// //                     {g.id === parent.id ? `${g.name} (nhóm cha)` : `— ${g.name}`}
// //                   </option>
// //                 ))}
// //               </optgroup>
// //             ))}
// //           </select>
// //         </div>
// //         <div className="up-field" style={{ minWidth: 220, flex: 1 }}>
// //           <label>Tiêu đề bài viết</label>
// //           <input
// //             type="text"
// //             value={title}
// //             onChange={(e) => { setTitle(e.target.value); setSaved(false); }}
// //             placeholder="VD: Cà phê, Trà, Giới thiệu KATINAT..."
// //           />
// //         </div>
// //         <button className="up-btn" onClick={handleClear}>Xóa hết</button>
// //         <button className="up-btn up-btn-primary" onClick={handleSave} disabled={saving}>
// //           <i className="fas fa-save" /> {saving ? "Đang lưu..." : selectedPostId ? "Lưu bài này" : "Lưu bài mới"}
// //         </button>
// //         <button className="up-btn up-btn-success" onClick={handlePublish} disabled={saving}>
// //           <i className="fas fa-upload" /> Đặt làm bài hiển thị
// //         </button>
// //       </div>

// //       {error && <div className="up-error">⚠️ {error}</div>}
// //       {saved && <div className="up-success">✅ Đã lưu.</div>}

// //       <div className="up-content-layout">
// //         {/* ─── Danh sách bài cũ của nhóm ─── */}
// //         <div className="up-post-list">
// //           <div className="up-post-list__header">
// //             <span>Bài viết trong nhóm</span>
// //             <button className="up-btn" onClick={handleNewPost}>
// //               <i className="fas fa-plus" /> Bài mới
// //             </button>
// //           </div>

// //           {loadingPosts ? (
// //             <div className="up-loading" style={{ padding: 24 }}>⌛ Đang tải...</div>
// //           ) : posts.length === 0 ? (
// //             <p className="up-hint" style={{ padding: 12 }}>Chưa có bài nào trong nhóm này.</p>
// //           ) : (
// //             <div className="up-post-list__items">
// //               {posts.map((p) => (
// //                 <div
// //                   key={p.id}
// //                   className={`up-post-item${p.id === selectedPostId ? " active" : ""}`}
// //                   onClick={() => selectPost(p)}
// //                 >
// //                   <div className="up-post-item__title">{p.title || "(chưa đặt tên)"}</div>
// //                   <div className="up-post-item__preview">{htmlToPreviewText(p.content)}</div>
// //                   <div className="up-post-item__meta">
// //                     <span>{formatDate(p.updatedAt)}</span>
// //                     <button
// //                       className="up-icon-btn danger"
// //                       title="Xóa bài"
// //                       onClick={(e) => { e.stopPropagation(); handleDeletePost(p); }}
// //                     >
// //                       <i className="fas fa-trash" />
// //                     </button>
// //                   </div>
// //                 </div>
// //               ))}
// //             </div>
// //           )}
// //         </div>

// //         {/* ─── Khung soạn thảo ─── */}
// //         <div className="up-content-editor-col">
// //           <p className="up-hint" style={{ marginBottom: 8 }}>
// //             Gõ mô tả hoặc dán trực tiếp (Ctrl+V) nội dung từ Word/Google Docs — font chữ, màu, in đậm/nghiêng, ảnh sẽ
// //             được giữ nguyên. Định dạng dàn trang gây vỡ layout của Word sẽ tự động được lược bỏ.
// //           </p>

// //           <RichTextToolbar editorRef={editorRef} onChange={handleInput} />

// //           {hasSelectedImage && (
// //             <div className="up-img-resize-toolbar">
// //               <span>Ảnh đã chọn:</span>
// //               <button type="button" className="up-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => adjustSelectedImageSize(0.9)}>
// //                 <i className="fas fa-search-minus" /> Thu nhỏ
// //               </button>
// //               <button type="button" className="up-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => adjustSelectedImageSize(1.1)}>
// //                 <i className="fas fa-search-plus" /> Phóng to
// //               </button>
// //               <button type="button" className="up-btn" onMouseDown={(e) => e.preventDefault()} onClick={resetSelectedImageSize}>
// //                 Về gốc
// //               </button>
// //               <span className="up-hint">Hoặc kéo tay cầm ở góc ảnh để chỉnh trực tiếp</span>
// //             </div>
// //           )}

// //           <div className="up-editor-wrap" style={{ position: "relative" }}>
// //             <div
// //               ref={editorRef}
// //               className="up-editor"
// //               contentEditable
// //               suppressContentEditableWarning
// //               onPaste={handlePaste}
// //               onInput={handleInput}
// //               onClick={handleEditorClick}
// //               dangerouslySetInnerHTML={{ __html: html }}
// //               style={{
// //                 width: "100%",
// //                 padding: "12px",
// //                 border: "1px solid #d1d5db",
// //                 borderRadius: "8px",
// //                 boxSizing: "border-box",
// //                 fontSize: "14px",
// //                 outline: "none",
// //                 minHeight: "160px",
// //                 backgroundColor: "white",
// //                 overflowY: "auto",
// //                 lineHeight: 1.6,
// //               }}
// //             />
// //             {hasSelectedImage && selectedImageRef.current && (
// //               <div
// //                 className="up-img-resize-handle"
// //                 onMouseDown={handleResizeHandleMouseDown}
// //                 style={(() => {
// //                   const wrap = editorRef.current?.getBoundingClientRect();
// //                   const img = selectedImageRef.current.getBoundingClientRect();
// //                   if (!wrap) return { display: "none" };
// //                   return {
// //                     left: img.right - wrap.left + editorRef.current.scrollLeft - 8,
// //                     top: img.bottom - wrap.top + editorRef.current.scrollTop - 8,
// //                   };
// //                 })()}
// //               />
// //             )}
// //           </div>

// //           <div className="up-editor-preview-label">Xem trước (đúng như trang Về Techtra sẽ hiển thị):</div>
// //           <div
// //             ref={previewRef}
// //             className="up-editor-preview prose"
// //             dangerouslySetInnerHTML={{ __html: html }}
// //           />
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }


// import "./AboutcontentTab.css";
// import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
// import { aboutContentApi, uploadGroupsApi } from "../../api";
// import RichTextToolbar from "./RichTextToolbar";

// // Key phải khớp với ve-techtra.js — đây là bài đang được PUBLISH (hiển thị live)
// const ABOUT_STORAGE_KEY = "about_us_content";
// // Danh sách toàn bộ bài viết cũ, lưu riêng theo từng nhóm: about_posts_<groupId>
// const postsStorageKey = (groupId) => `about_posts_${groupId}`;

// // ────────────────────────────────────────────────────────────────────────────
// // Dán nội dung: GIỮ NGUYÊN 100% định dạng gốc (style, position, float, margin,
// // kích thước ảnh...) đúng như trong Word/Google Docs. Chỉ loại bỏ thẻ <script>
// // vì lý do an toàn (tránh chèn mã độc), không đụng vào bất kỳ thuộc tính hay
// // style nào khác.
// // LƯU Ý: vì không còn lọc position/float/margin âm như trước, nội dung dán từ
// // Word có thể vỡ layout (chữ đè lên ảnh, tràn khung...) khi hiển thị ngoài Word,
// // do các thuộc tính đó vốn chỉ hoạt động đúng trong ngữ cảnh trang Word.
// // ────────────────────────────────────────────────────────────────────────────
// function sanitizeNode(node) {
//   if (node.nodeType === Node.TEXT_NODE) return;
//   if (node.nodeType !== Node.ELEMENT_NODE) return;

//   const tag = node.tagName.toLowerCase();

//   // Chỉ loại bỏ thẻ có thể gây hại. Không xoá attribute/style nào khác.
//   if (tag === "script") {
//     node.remove();
//     return;
//   }

//   [...node.childNodes].forEach(sanitizeNode);
// }

// // Làm sạch tối thiểu HTML được dán: chỉ chặn script, giữ nguyên mọi thứ khác
// function sanitizePastedHtml(rawHtml) {
//   const template = document.createElement("template");
//   template.innerHTML = rawHtml;
//   [...template.content.childNodes].forEach(sanitizeNode);
//   return template.innerHTML;
// }

// // Cắt bớt HTML để làm đoạn preview ngắn trong danh sách bài
// function htmlToPreviewText(htmlStr, maxLen = 80) {
//   const div = document.createElement("div");
//   div.innerHTML = htmlStr || "";
//   const text = (div.textContent || div.innerText || "").trim().replace(/\s+/g, " ");
//   return text.length > maxLen ? text.slice(0, maxLen) + "…" : text || "(chưa có nội dung)";
// }

// function formatDate(iso) {
//   try {
//     return new Date(iso).toLocaleString("vi-VN", {
//       day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
//     });
//   } catch {
//     return "";
//   }
// }

// // Tự động thu nhỏ cỡ chữ của 1 container nếu nội dung bên trong bị tràn ngang
// function autoFitFontSize(el, { min = 40, max = 100, step = 2 } = {}) {
//   if (!el) return;
//   el.style.fontSize = "";
//   let size = max;
//   while (el.scrollWidth > el.clientWidth && size > min) {
//     size -= step;
//     el.style.fontSize = size + "%";
//   }
// }

// // ════════════════════════════════════════════════════════════════════════════
// // TAB 2 — Danh sách bài viết theo nhóm + soạn thảo nội dung cho trang Về Techtra
// // ════════════════════════════════════════════════════════════════════════════
// export default function AboutContentTab({ parentGroups: parentGroupsProp, childrenOf: childrenOfProp }) {
//   const isControlled = parentGroupsProp !== undefined;

//   const [allGroups, setAllGroups] = useState([]);
//   const [loadingGroups, setLoadingGroups] = useState(true);

//   useEffect(() => {
//     if (isControlled) return;
//     (async () => {
//       setLoadingGroups(true);
//       try {
//         const res = await uploadGroupsApi.getAll();
//         setAllGroups(res?.data || []);
//       } catch {
//         setAllGroups([]);
//       } finally {
//         setLoadingGroups(false);
//       }
//     })();
//   }, [isControlled]);

//   const computedParentGroups = useMemo(
//     () => allGroups.filter((g) => !g.parent_id),
//     [allGroups]
//   );
//   const computedChildrenOf = useCallback(
//     (parentId) => allGroups.filter((g) => g.parent_id === parentId),
//     [allGroups]
//   );

//   const parentGroups = isControlled ? parentGroupsProp : computedParentGroups;
//   const childrenOf = isControlled ? childrenOfProp : computedChildrenOf;

//   const [groupId, setGroupId] = useState("");
//   const [posts, setPosts] = useState([]);
//   const [loadingPosts, setLoadingPosts] = useState(false);
//   const [selectedPostId, setSelectedPostId] = useState(null);
//   const [title, setTitle] = useState("");
//   const [html, setHtml] = useState("");
//   const [saving, setSaving] = useState(false);
//   const [saved, setSaved] = useState(false);
//   const [error, setError] = useState("");
//   const editorRef = useRef(null);
//   const previewRef = useRef(null);

//   const selectedImageRef = useRef(null);
//   const [hasSelectedImage, setHasSelectedImage] = useState(false);
//   const resizeStateRef = useRef(null);
//   const [, forceHandleUpdate] = useState(0);

//   // Với mỗi nhóm cha: LUÔN cho phép chọn chính nhóm cha, cộng thêm toàn bộ
//   // nhóm con của nó (nếu có).
//   const selectableGroups = useMemo(() => {
//     return parentGroups.map((p) => {
//       const children = childrenOf(p.id);
//       return { parent: p, options: [p, ...children] };
//     });
//   }, [parentGroups, childrenOf]);

//   const allOptions = useMemo(
//     () => selectableGroups.flatMap((s) => s.options),
//     [selectableGroups]
//   );

//   useEffect(() => {
//     if (!groupId && allOptions.length) {
//       const guess = allOptions.find((g) => g.name.toLowerCase().includes("techtra"));
//       setGroupId(String((guess || allOptions[0]).id));
//     }
//   }, [allOptions, groupId]);

//   const loadEditor = useCallback((content) => {
//     setHtml(content || "");
//     if (editorRef.current) editorRef.current.innerHTML = content || "";
//   }, []);

//   const deselectImage = useCallback(() => {
//     if (selectedImageRef.current) {
//       selectedImageRef.current.classList.remove("up-img-selected");
//     }
//     selectedImageRef.current = null;
//     setHasSelectedImage(false);
//   }, []);

//   const handleEditorClick = useCallback((e) => {
//     const img = e.target.closest("img");
//     if (img && editorRef.current?.contains(img)) {
//       if (selectedImageRef.current && selectedImageRef.current !== img) {
//         selectedImageRef.current.classList.remove("up-img-selected");
//       }
//       selectedImageRef.current = img;
//       img.classList.add("up-img-selected");
//       setHasSelectedImage(true);
//     } else {
//       deselectImage();
//     }
//   }, [deselectImage]);

//   const handleResizeHandleMouseDown = (e) => {
//     e.preventDefault();
//     e.stopPropagation();
//     const img = selectedImageRef.current;
//     if (!img) return;
//     const startWidth = img.getBoundingClientRect().width;
//     const startHeight = img.getBoundingClientRect().height;
//     resizeStateRef.current = {
//       startX: e.clientX,
//       startWidth,
//       aspect: startHeight ? startWidth / startHeight : 1,
//     };
//     window.addEventListener("mousemove", handleResizeMouseMove);
//     window.addEventListener("mouseup", handleResizeMouseUp);
//   };

//   const handleResizeMouseMove = (e) => {
//     const img = selectedImageRef.current;
//     const state = resizeStateRef.current;
//     if (!img || !state) return;
//     const delta = e.clientX - state.startX;
//     const newWidth = Math.max(40, Math.round(state.startWidth + delta));
//     img.style.width = `${newWidth}px`;
//     img.style.height = "auto";
//     img.removeAttribute("height");
//     forceHandleUpdate((n) => n + 1);
//   };

//   const handleResizeMouseUp = () => {
//     resizeStateRef.current = null;
//     window.removeEventListener("mousemove", handleResizeMouseMove);
//     window.removeEventListener("mouseup", handleResizeMouseUp);
//     handleInput();
//   };

//   const adjustSelectedImageSize = (ratio) => {
//     const img = selectedImageRef.current;
//     if (!img) return;
//     const currentWidth = img.getBoundingClientRect().width;
//     const newWidth = Math.max(40, Math.round(currentWidth * ratio));
//     img.style.width = `${newWidth}px`;
//     img.style.height = "auto";
//     img.removeAttribute("height");
//     handleInput();
//   };

//   const resetSelectedImageSize = () => {
//     const img = selectedImageRef.current;
//     if (!img) return;
//     img.style.width = "";
//     img.style.height = "auto";
//     handleInput();
//   };

//   const fetchPosts = useCallback(async (gId) => {
//     if (!gId) return;
//     setLoadingPosts(true);
//     setError("");
//     try {
//       let list = [];
//       try {
//         const res = await aboutContentApi.getAll(gId);
//         list = res?.data || res || [];
//       } catch {
//         list = JSON.parse(localStorage.getItem(postsStorageKey(gId)) || "[]");
//       }
//       list.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
//       setPosts(list);
//     } catch (err) {
//       setError("Không tải được danh sách bài: " + err.message);
//       setPosts([]);
//     } finally {
//       setLoadingPosts(false);
//     }
//   }, []);

//   useEffect(() => {
//     if (!groupId) return;
//     setSelectedPostId(null);
//     setTitle("");
//     loadEditor("");
//     (async () => {
//       await fetchPosts(groupId);
//     })();
//   }, [groupId, fetchPosts, loadEditor]);

//   useEffect(() => {
//     if (posts.length && !selectedPostId) {
//       const latest = posts[0];
//       setSelectedPostId(latest.id);
//       setTitle(latest.title || "");
//       loadEditor(latest.content || "");
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [posts]);

//   useEffect(() => {
//     const raf = requestAnimationFrame(() => {
//       autoFitFontSize(editorRef.current);
//       autoFitFontSize(previewRef.current);
//     });
//     return () => cancelAnimationFrame(raf);
//   }, [html]);

//   useEffect(() => {
//     const handleResize = () => {
//       autoFitFontSize(editorRef.current);
//       autoFitFontSize(previewRef.current);
//     };
//     window.addEventListener("resize", handleResize);
//     return () => window.removeEventListener("resize", handleResize);
//   }, []);

//   const persistLocalPosts = (gId, list) => {
//     localStorage.setItem(postsStorageKey(gId), JSON.stringify(list));
//   };

//   const selectPost = (post) => {
//     setSelectedPostId(post.id);
//     setTitle(post.title || "");
//     loadEditor(post.content || "");
//     setSaved(false);
//     setError("");
//   };

//   const handleNewPost = () => {
//     setSelectedPostId(null);
//     setTitle("");
//     loadEditor("");
//     setSaved(false);
//     setError("");
//   };

//   // Dán nội dung: giữ nguyên định dạng gốc (chỉ chặn <script>)
//   const handlePaste = (e) => {
//     e.preventDefault();
//     const rawHtml = e.clipboardData.getData("text/html");
//     const rawText = e.clipboardData.getData("text/plain");

//     let contentToInsert;
//     if (rawHtml) {
//       contentToInsert = sanitizePastedHtml(rawHtml);
//     } else {
//       contentToInsert = rawText.replace(/\n/g, "<br>");
//     }

//     document.execCommand("insertHTML", false, contentToInsert);
//     handleInput();
//   };

//   const handleInput = () => {
//     setHtml(editorRef.current.innerHTML);
//     setSaved(false);
//   };

//   const handleSave = async () => {
//     if (!groupId) { setError("Vui lòng chọn nhóm nhận nội dung"); return; }
//     setSaving(true);
//     setError("");
//     const content = editorRef.current.innerHTML;
//     const now = new Date().toISOString();

//     try {
//       let updatedPost;
//       if (selectedPostId) {
//         updatedPost = { id: selectedPostId, title, content, updatedAt: now };
//         try {
//           await aboutContentApi.update(selectedPostId, { title, content, group_id: groupId });
//         } catch {
//           /* backend chưa sẵn sàng, vẫn lưu tạm ở trình duyệt bên dưới */
//         }
//       } else {
//         const newId = `local_${Date.now()}`;
//         updatedPost = { id: newId, title: title || "Bài chưa đặt tên", content, updatedAt: now };
//         try {
//           const res = await aboutContentApi.create({ title, content, group_id: groupId });
//           if (res?.id) updatedPost.id = res.id;
//         } catch {
//           /* backend chưa sẵn sàng, dùng id tạm local_... */
//         }
//         setSelectedPostId(updatedPost.id);
//       }

//       setPosts((prev) => {
//         const others = prev.filter((p) => p.id !== updatedPost.id);
//         const next = [updatedPost, ...others];
//         persistLocalPosts(groupId, next);
//         return next;
//       });

//       setSaved(true);
//     } catch (err) {
//       setError("Không lưu được: " + err.message);
//     } finally {
//       setSaving(false);
//     }
//   };

//   const handlePublish = async () => {
//     if (!groupId) { setError("Vui lòng chọn nhóm nhận nội dung"); return; }
//     const content = editorRef.current.innerHTML;
//     try {
//       await aboutContentApi.save(groupId, { content });
//     } catch {
//       /* backend chưa sẵn sàng, vẫn publish tạm ở trình duyệt bên dưới */
//     }
//     localStorage.setItem(ABOUT_STORAGE_KEY, content);
//     setSaved(true);
//   };

//   const handleDeletePost = async (post) => {
//     if (!window.confirm(`Xóa bài "${post.title || "(chưa đặt tên)"}"?`)) return;
//     try {
//       await aboutContentApi.remove?.(post.id);
//     } catch {
//       /* backend chưa sẵn sàng, vẫn xóa khỏi danh sách tạm bên dưới */
//     }
//     setPosts((prev) => {
//       const next = prev.filter((p) => p.id !== post.id);
//       persistLocalPosts(groupId, next);
//       return next;
//     });
//     if (selectedPostId === post.id) handleNewPost();
//   };

//   const handleClear = () => {
//     if (!window.confirm("Xóa toàn bộ nội dung soạn thảo?")) return;
//     loadEditor("");
//   };

//   if (!isControlled && loadingGroups) {
//     return <div className="up-loading">⌛ Đang tải danh sách nhóm...</div>;
//   }

//   return (
//     <div>
//       <div className="up-toolbar">
//         <div className="up-field" style={{ minWidth: 260 }}>
//           <label>Nhóm nhận nội dung</label>
//           <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
//             {selectableGroups.map(({ parent, options }) => (
//               <optgroup key={parent.id} label={parent.name}>
//                 {options.map((g) => (
//                   <option key={g.id} value={g.id}>
//                     {g.id === parent.id ? `${g.name} (nhóm cha)` : `— ${g.name}`}
//                   </option>
//                 ))}
//               </optgroup>
//             ))}
//           </select>
//         </div>
//         <div className="up-field" style={{ minWidth: 220, flex: 1 }}>
//           <label>Tiêu đề bài viết</label>
//           <input
//             type="text"
//             value={title}
//             onChange={(e) => { setTitle(e.target.value); setSaved(false); }}
//             placeholder="VD: Cà phê, Trà, Giới thiệu KATINAT..."
//           />
//         </div>
//         <button className="up-btn" onClick={handleClear}>Xóa hết</button>
//         <button className="up-btn up-btn-primary" onClick={handleSave} disabled={saving}>
//           <i className="fas fa-save" /> {saving ? "Đang lưu..." : selectedPostId ? "Lưu bài này" : "Lưu bài mới"}
//         </button>
//         <button className="up-btn up-btn-success" onClick={handlePublish} disabled={saving}>
//           <i className="fas fa-upload" /> Đặt làm bài hiển thị
//         </button>
//       </div>

//       {error && <div className="up-error">⚠️ {error}</div>}
//       {saved && <div className="up-success">✅ Đã lưu.</div>}

//       <div className="up-content-layout">
//         {/* ─── Danh sách bài cũ của nhóm ─── */}
//         <div className="up-post-list">
//           <div className="up-post-list__header">
//             <span>Bài viết trong nhóm</span>
//             <button className="up-btn" onClick={handleNewPost}>
//               <i className="fas fa-plus" /> Bài mới
//             </button>
//           </div>

//           {loadingPosts ? (
//             <div className="up-loading" style={{ padding: 24 }}>⌛ Đang tải...</div>
//           ) : posts.length === 0 ? (
//             <p className="up-hint" style={{ padding: 12 }}>Chưa có bài nào trong nhóm này.</p>
//           ) : (
//             <div className="up-post-list__items">
//               {posts.map((p) => (
//                 <div
//                   key={p.id}
//                   className={`up-post-item${p.id === selectedPostId ? " active" : ""}`}
//                   onClick={() => selectPost(p)}
//                 >
//                   <div className="up-post-item__title">{p.title || "(chưa đặt tên)"}</div>
//                   <div className="up-post-item__preview">{htmlToPreviewText(p.content)}</div>
//                   <div className="up-post-item__meta">
//                     <span>{formatDate(p.updatedAt)}</span>
//                     <button
//                       className="up-icon-btn danger"
//                       title="Xóa bài"
//                       onClick={(e) => { e.stopPropagation(); handleDeletePost(p); }}
//                     >
//                       <i className="fas fa-trash" />
//                     </button>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>

//         {/* ─── Khung soạn thảo ─── */}
//         <div className="up-content-editor-col">
//           <p className="up-hint" style={{ marginBottom: 8 }}>
//             Gõ mô tả hoặc dán trực tiếp (Ctrl+V) nội dung từ Word/Google Docs — toàn bộ định dạng gốc
//             (font chữ, màu, in đậm/nghiêng, ảnh, bố cục...) sẽ được giữ nguyên y hệt.
//           </p>

//           <RichTextToolbar editorRef={editorRef} onChange={handleInput} />

//           {hasSelectedImage && (
//             <div className="up-img-resize-toolbar">
//               <span>Ảnh đã chọn:</span>
//               <button type="button" className="up-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => adjustSelectedImageSize(0.9)}>
//                 <i className="fas fa-search-minus" /> Thu nhỏ
//               </button>
//               <button type="button" className="up-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => adjustSelectedImageSize(1.1)}>
//                 <i className="fas fa-search-plus" /> Phóng to
//               </button>
//               <button type="button" className="up-btn" onMouseDown={(e) => e.preventDefault()} onClick={resetSelectedImageSize}>
//                 Về gốc
//               </button>
//               <span className="up-hint">Hoặc kéo tay cầm ở góc ảnh để chỉnh trực tiếp</span>
//             </div>
//           )}

//           <div className="up-editor-wrap" style={{ position: "relative" }}>
//             <div
//               ref={editorRef}
//               className="up-editor"
//               contentEditable
//               suppressContentEditableWarning
//               onPaste={handlePaste}
//               onInput={handleInput}
//               onClick={handleEditorClick}
//               dangerouslySetInnerHTML={{ __html: html }}
//               style={{
//                 width: "100%",
//                 padding: "12px",
//                 border: "1px solid #d1d5db",
//                 borderRadius: "8px",
//                 boxSizing: "border-box",
//                 fontSize: "14px",
//                 outline: "none",
//                 minHeight: "160px",
//                 backgroundColor: "white",
//                 overflowY: "auto",
//                 lineHeight: 1.6,
//               }}
//             />
//             {hasSelectedImage && selectedImageRef.current && (
//               <div
//                 className="up-img-resize-handle"
//                 onMouseDown={handleResizeHandleMouseDown}
//                 style={(() => {
//                   const wrap = editorRef.current?.getBoundingClientRect();
//                   const img = selectedImageRef.current.getBoundingClientRect();
//                   if (!wrap) return { display: "none" };
//                   return {
//                     left: img.right - wrap.left + editorRef.current.scrollLeft - 8,
//                     top: img.bottom - wrap.top + editorRef.current.scrollTop - 8,
//                   };
//                 })()}
//               />
//             )}
//           </div>

//           <div className="up-editor-preview-label">Xem trước (đúng như trang Về Techtra sẽ hiển thị):</div>
//           <div
//             ref={previewRef}
//             className="up-editor-preview prose"
//             dangerouslySetInnerHTML={{ __html: html }}
//           />
//         </div>
//       </div>
//     </div>
//   );
// }


import "./AboutcontentTab.css";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { aboutContentApi, uploadGroupsApi } from "../../api";
import RichTextToolbar from "./RichTextToolbar";
import { sanitizeHtml } from "./htmlPasteSanitizer";

// Key phải khớp với ve-techtra.js — đây là bài đang được PUBLISH (hiển thị live)
const ABOUT_STORAGE_KEY = "about_us_content";
// Danh sách toàn bộ bài viết cũ, lưu riêng theo từng nhóm: about_posts_<groupId>
const postsStorageKey = (groupId) => `about_posts_${groupId}`;

// ────────────────────────────────────────────────────────────────────────────
// Dán nội dung: GIỮ NGUYÊN 100% định dạng gốc (style, position, float, margin,
// kích thước ảnh...) đúng như trong Word/Google Docs. Chỉ loại bỏ thẻ <script>
// vì lý do an toàn (tránh chèn mã độc), không đụng vào bất kỳ thuộc tính hay
// style nào khác.
// LƯU Ý: vì không còn lọc position/float/margin âm như trước, nội dung dán từ
// Word có thể vỡ layout (chữ đè lên ảnh, tràn khung...) khi hiển thị ngoài Word,
// do các thuộc tính đó vốn chỉ hoạt động đúng trong ngữ cảnh trang Word.
// ────────────────────────────────────────────────────────────────────────────
function sanitizeNode(node) {
  if (node.nodeType === Node.TEXT_NODE) return;
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const tag = node.tagName.toLowerCase();

  // Chỉ loại bỏ thẻ có thể gây hại. Không xoá attribute/style nào khác.
  if (tag === "script") {
    node.remove();
    return;
  }

  [...node.childNodes].forEach(sanitizeNode);
}

// Làm sạch tối thiểu HTML được dán: chỉ chặn script, giữ nguyên mọi thứ khác
function sanitizePastedHtml(rawHtml) {
  const template = document.createElement("template");
  template.innerHTML = rawHtml;
  [...template.content.childNodes].forEach(sanitizeNode);
  return template.innerHTML;
}

// Cắt bớt HTML để làm đoạn preview ngắn trong danh sách bài
function htmlToPreviewText(htmlStr, maxLen = 80) {
  const div = document.createElement("div");
  div.innerHTML = htmlStr || "";
  const text = (div.textContent || div.innerText || "").trim().replace(/\s+/g, " ");
  return text.length > maxLen ? text.slice(0, maxLen) + "…" : text || "(chưa có nội dung)";
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// Tự động thu nhỏ cỡ chữ của 1 container nếu nội dung bên trong bị tràn ngang
function autoFitFontSize(el, { min = 40, max = 100, step = 2 } = {}) {
  if (!el) return;
  el.style.fontSize = "";
  let size = max;
  while (el.scrollWidth > el.clientWidth && size > min) {
    size -= step;
    el.style.fontSize = size + "%";
  }
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 2 — Danh sách bài viết theo nhóm + soạn thảo nội dung cho trang Về Techtra
// ════════════════════════════════════════════════════════════════════════════
export default function AboutContentTab({ parentGroups: parentGroupsProp, childrenOf: childrenOfProp }) {
  const isControlled = parentGroupsProp !== undefined;

  const [allGroups, setAllGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  useEffect(() => {
    if (isControlled) return;
    (async () => {
      setLoadingGroups(true);
      try {
        const res = await uploadGroupsApi.getAll();
        setAllGroups(res?.data || []);
      } catch {
        setAllGroups([]);
      } finally {
        setLoadingGroups(false);
      }
    })();
  }, [isControlled]);

  const computedParentGroups = useMemo(
    () => allGroups.filter((g) => !g.parent_id),
    [allGroups]
  );
  const computedChildrenOf = useCallback(
    (parentId) => allGroups.filter((g) => g.parent_id === parentId),
    [allGroups]
  );

  const parentGroups = isControlled ? parentGroupsProp : computedParentGroups;
  const childrenOf = isControlled ? childrenOfProp : computedChildrenOf;

  const [groupId, setGroupId] = useState("");
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [title, setTitle] = useState("");
  const [html, setHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [publishedContent, setPublishedContent] = useState("");
  const [publishedLoading, setPublishedLoading] = useState(false);
  const editorRef = useRef(null);
  const previewRef = useRef(null);

  const selectedImageRef = useRef(null);
  const [hasSelectedImage, setHasSelectedImage] = useState(false);
  const resizeStateRef = useRef(null);
  const [, forceHandleUpdate] = useState(0);

  // Với mỗi nhóm cha: LUÔN cho phép chọn chính nhóm cha, cộng thêm toàn bộ
  // nhóm con của nó (nếu có).
  const selectableGroups = useMemo(() => {
    return parentGroups.map((p) => {
      const children = childrenOf(p.id);
      return { parent: p, options: [p, ...children] };
    });
  }, [parentGroups, childrenOf]);

  const allOptions = useMemo(
    () => selectableGroups.flatMap((s) => s.options),
    [selectableGroups]
  );

  useEffect(() => {
    if (!groupId && allOptions.length) {
      const guess = allOptions.find((g) => g.name.toLowerCase().includes("techtra"));
      setGroupId(String((guess || allOptions[0]).id));
    }
  }, [allOptions, groupId]);

  const loadEditor = useCallback((content) => {
    setHtml(content || "");
    if (editorRef.current) editorRef.current.innerHTML = content || "";
  }, []);

  const deselectImage = useCallback(() => {
    if (selectedImageRef.current) {
      selectedImageRef.current.classList.remove("up-img-selected");
    }
    selectedImageRef.current = null;
    setHasSelectedImage(false);
  }, []);

  const handleEditorClick = useCallback((e) => {
    const img = e.target.closest("img");
    if (img && editorRef.current?.contains(img)) {
      if (selectedImageRef.current && selectedImageRef.current !== img) {
        selectedImageRef.current.classList.remove("up-img-selected");
      }
      selectedImageRef.current = img;
      img.classList.add("up-img-selected");
      setHasSelectedImage(true);
    } else {
      deselectImage();
    }
  }, [deselectImage]);

  const handleResizeHandleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const img = selectedImageRef.current;
    if (!img) return;
    const startWidth = img.getBoundingClientRect().width;
    const startHeight = img.getBoundingClientRect().height;
    resizeStateRef.current = {
      startX: e.clientX,
      startWidth,
      aspect: startHeight ? startWidth / startHeight : 1,
    };
    window.addEventListener("mousemove", handleResizeMouseMove);
    window.addEventListener("mouseup", handleResizeMouseUp);
  };

  const handleResizeMouseMove = (e) => {
    const img = selectedImageRef.current;
    const state = resizeStateRef.current;
    if (!img || !state) return;
    const delta = e.clientX - state.startX;
    const newWidth = Math.max(40, Math.round(state.startWidth + delta));
    img.style.width = `${newWidth}px`;
    img.style.height = "auto";
    img.removeAttribute("height");
    forceHandleUpdate((n) => n + 1);
  };

  const handleResizeMouseUp = () => {
    resizeStateRef.current = null;
    window.removeEventListener("mousemove", handleResizeMouseMove);
    window.removeEventListener("mouseup", handleResizeMouseUp);
    handleInput();
  };

  const adjustSelectedImageSize = (ratio) => {
    const img = selectedImageRef.current;
    if (!img) return;
    const currentWidth = img.getBoundingClientRect().width;
    const newWidth = Math.max(40, Math.round(currentWidth * ratio));
    img.style.width = `${newWidth}px`;
    img.style.height = "auto";
    img.removeAttribute("height");
    handleInput();
  };

  const resetSelectedImageSize = () => {
    const img = selectedImageRef.current;
    if (!img) return;
    img.style.width = "";
    img.style.height = "auto";
    handleInput();
  };

  const fetchPosts = useCallback(async (gId) => {
    if (!gId) return;
    setLoadingPosts(true);
    setError("");
    try {
      let list = [];
      try {
        const res = await aboutContentApi.getAll(gId);
        list = res?.data || res || [];
      } catch {
        list = JSON.parse(localStorage.getItem(postsStorageKey(gId)) || "[]");
      }
      list.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      setPosts(list);
    } catch (err) {
      setError("Không tải được danh sách bài: " + err.message);
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  useEffect(() => {
    if (!groupId) return;
    setSelectedPostId(null);
    setTitle("");
    loadEditor("");
    (async () => {
      await fetchPosts(groupId);
    })();
  }, [groupId, fetchPosts, loadEditor]);

  // ─── Panel "Xem trước trên Về Techtra public" ───
  // Mỗi khi đổi group: gọi aboutContentApi.get(group.id) để lấy đúng content
  // đã publish lên Supabase (cùng nguồn với shop ve-techtra-moi?slug=…).
  // Render qua cùng hàm sanitizeHtml() mà shop dùng → preview khớp 100% với
  // những gì khách hàng thực sự thấy trên trang Về Techtra.
  useEffect(() => {
    if (!groupId) {
      setPublishedContent("");
      return;
    }
    let cancelled = false;
    (async () => {
      setPublishedLoading(true);
      try {
        const res = await aboutContentApi.get(groupId);
        if (!cancelled) setPublishedContent(res?.content || "");
      } catch {
        if (!cancelled) setPublishedContent("");
      } finally {
        if (!cancelled) setPublishedLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [groupId]);

  useEffect(() => {
    if (posts.length && !selectedPostId) {
      const latest = posts[0];
      setSelectedPostId(latest.id);
      setTitle(latest.title || "");
      loadEditor(latest.content || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      autoFitFontSize(editorRef.current);
      autoFitFontSize(previewRef.current);
    });
    return () => cancelAnimationFrame(raf);
  }, [html]);

  useEffect(() => {
    const handleResize = () => {
      autoFitFontSize(editorRef.current);
      autoFitFontSize(previewRef.current);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const persistLocalPosts = (gId, list) => {
    localStorage.setItem(postsStorageKey(gId), JSON.stringify(list));
  };

  const selectPost = (post) => {
    setSelectedPostId(post.id);
    setTitle(post.title || "");
    loadEditor(post.content || "");
    setSaved(false);
    setError("");
  };

  const handleNewPost = () => {
    setSelectedPostId(null);
    setTitle("");
    loadEditor("");
    setSaved(false);
    setError("");
  };

  // Dán nội dung: giữ nguyên định dạng gốc (chỉ chặn <script>)
  const handlePaste = (e) => {
    e.preventDefault();
    const rawHtml = e.clipboardData.getData("text/html");
    const rawText = e.clipboardData.getData("text/plain");

    let contentToInsert;
    if (rawHtml) {
      contentToInsert = sanitizePastedHtml(rawHtml);
    } else {
      contentToInsert = rawText.replace(/\n/g, "<br>");
    }

    document.execCommand("insertHTML", false, contentToInsert);
    handleInput();
  };

  const handleInput = () => {
    setHtml(editorRef.current.innerHTML);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!groupId) { setError("Vui lòng chọn nhóm nhận nội dung"); return; }
    setSaving(true);
    setError("");
    const content = editorRef.current.innerHTML;
    const now = new Date().toISOString();

    try {
      let updatedPost;
      if (selectedPostId) {
        updatedPost = { id: selectedPostId, title, content, updatedAt: now };
        try {
          await aboutContentApi.update(selectedPostId, { title, content, group_id: groupId });
        } catch {
          /* backend chưa sẵn sàng, vẫn lưu tạm ở trình duyệt bên dưới */
        }
      } else {
        const newId = `local_${Date.now()}`;
        updatedPost = { id: newId, title: title || "Bài chưa đặt tên", content, updatedAt: now };
        try {
          const res = await aboutContentApi.create({ title, content, group_id: groupId });
          if (res?.id) updatedPost.id = res.id;
        } catch {
          /* backend chưa sẵn sàng, dùng id tạm local_... */
        }
        setSelectedPostId(updatedPost.id);
      }

      setPosts((prev) => {
        const others = prev.filter((p) => p.id !== updatedPost.id);
        const next = [updatedPost, ...others];
        persistLocalPosts(groupId, next);
        return next;
      });

      setSaved(true);
    } catch (err) {
      setError("Không lưu được: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!groupId) { setError("Vui lòng chọn nhóm nhận nội dung"); return; }
    const content = editorRef.current.innerHTML;
    try {
      await aboutContentApi.save(groupId, { content });
    } catch {
      /* backend chưa sẵn sàng, vẫn publish tạm ở trình duyệt bên dưới */
    }
    localStorage.setItem(ABOUT_STORAGE_KEY, content);
    // Refresh panel preview bên phải để user thấy ngay kết quả đã publish
    setPublishedContent(content);
    setSaved(true);
  };

  const handleDeletePost = async (post) => {
    if (!window.confirm(`Xóa bài "${post.title || "(chưa đặt tên)"}"?`)) return;
    try {
      await aboutContentApi.remove?.(post.id);
    } catch {
      /* backend chưa sẵn sàng, vẫn xóa khỏi danh sách tạm bên dưới */
    }
    setPosts((prev) => {
      const next = prev.filter((p) => p.id !== post.id);
      persistLocalPosts(groupId, next);
      return next;
    });
    if (selectedPostId === post.id) handleNewPost();
  };

  const handleClear = () => {
    if (!window.confirm("Xóa toàn bộ nội dung soạn thảo?")) return;
    loadEditor("");
  };

  if (!isControlled && loadingGroups) {
    return <div className="up-loading">⌛ Đang tải danh sách nhóm...</div>;
  }

  return (
    <div>
      <div className="up-toolbar">
        <div className="up-field" style={{ minWidth: 260 }}>
          <label>Nhóm nhận nội dung</label>
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            {selectableGroups.map(({ parent, options }) => (
              <optgroup key={parent.id} label={parent.name}>
                {options.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.id === parent.id ? `${g.name} (nhóm cha)` : `— ${g.name}`}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="up-field" style={{ minWidth: 220, flex: 1 }}>
          <label>Tiêu đề bài viết</label>
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setSaved(false); }}
            placeholder="VD: Cà phê, Trà, Giới thiệu KATINAT..."
          />
        </div>
        <button className="up-btn" onClick={handleClear}>Xóa hết</button>
        <button className="up-btn up-btn-primary" onClick={handleSave} disabled={saving}>
          <i className="fas fa-save" /> {saving ? "Đang lưu..." : selectedPostId ? "Lưu bài này" : "Lưu bài mới"}
        </button>
        <button className="up-btn up-btn-success" onClick={handlePublish} disabled={saving}>
          <i className="fas fa-upload" /> Đặt làm bài hiển thị
        </button>
      </div>

      {error && <div className="up-error">⚠️ {error}</div>}
      {saved && <div className="up-success">✅ Đã lưu.</div>}

      <div className="up-content-layout">
        {/* ─── Danh sách bài cũ của nhóm ─── */}
        <div className="up-post-list">
          <div className="up-post-list__header">
            <span>Bài viết trong nhóm</span>
            <button className="up-btn" onClick={handleNewPost}>
              <i className="fas fa-plus" /> Bài mới
            </button>
          </div>

          {loadingPosts ? (
            <div className="up-loading" style={{ padding: 24 }}>⌛ Đang tải...</div>
          ) : posts.length === 0 ? (
            <p className="up-hint" style={{ padding: 12 }}>Chưa có bài nào trong nhóm này.</p>
          ) : (
            <div className="up-post-list__items">
              {posts.map((p) => (
                <div
                  key={p.id}
                  className={`up-post-item${p.id === selectedPostId ? " active" : ""}`}
                  onClick={() => selectPost(p)}
                >
                  <div className="up-post-item__title">{p.title || "(chưa đặt tên)"}</div>
                  <div className="up-post-item__preview">{htmlToPreviewText(p.content)}</div>
                  <div className="up-post-item__meta">
                    <span>{formatDate(p.updatedAt)}</span>
                    <button
                      className="up-icon-btn danger"
                      title="Xóa bài"
                      onClick={(e) => { e.stopPropagation(); handleDeletePost(p); }}
                    >
                      <i className="fas fa-trash" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Layout 2 cột: editor bên trái | preview trên Về Techtra public bên phải ─── */}
        <div className="up-editor-cols">
          {/* ─── Khung soạn thảo ─── */}
          <div className="up-content-editor-col">
            <p className="up-hint" style={{ marginBottom: 8 }}>
              Gõ mô tả hoặc dán trực tiếp (Ctrl+V) nội dung từ Word/Google Docs — toàn bộ định dạng gốc
              (font chữ, màu, in đậm/nghiêng, ảnh, bố cục...) sẽ được giữ nguyên y hệt.
            </p>

            <RichTextToolbar editorRef={editorRef} onChange={handleInput} />

            {hasSelectedImage && (
              <div className="up-img-resize-toolbar">
                <span>Ảnh đã chọn:</span>
                <button type="button" className="up-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => adjustSelectedImageSize(0.9)}>
                  <i className="fas fa-search-minus" /> Thu nhỏ
                </button>
                <button type="button" className="up-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => adjustSelectedImageSize(1.1)}>
                  <i className="fas fa-search-plus" /> Phóng to
                </button>
                <button type="button" className="up-btn" onMouseDown={(e) => e.preventDefault()} onClick={resetSelectedImageSize}>
                  Về gốc
                </button>
                <span className="up-hint">Hoặc kéo tay cầm ở góc ảnh để chỉnh trực tiếp</span>
              </div>
            )}

            <div className="up-editor-wrap" style={{ position: "relative" }}>
              <div
                ref={editorRef}
                className="up-editor"
                contentEditable
                suppressContentEditableWarning
                onPaste={handlePaste}
                onInput={handleInput}
                onClick={handleEditorClick}
                dangerouslySetInnerHTML={{ __html: html }}
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
                  overflowY: "auto",
                  lineHeight: 1.6,
                }}
              />
              {hasSelectedImage && selectedImageRef.current && (
                <div
                  className="up-img-resize-handle"
                  onMouseDown={handleResizeHandleMouseDown}
                  style={(() => {
                    const wrap = editorRef.current?.getBoundingClientRect();
                    const img = selectedImageRef.current.getBoundingClientRect();
                    if (!wrap) return { display: "none" };
                    return {
                      left: img.right - wrap.left + editorRef.current.scrollLeft - 8,
                      top: img.bottom - wrap.top + editorRef.current.scrollTop - 8,
                    };
                  })()}
                />
              )}
            </div>

            <div className="up-editor-preview-label">Xem trước khi đang soạn (state hiện tại của editor):</div>
            <div
              ref={previewRef}
              className="up-editor-preview prose"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>

          {/* ─── Panel mới: render đúng như trang Về Techtra public (từ Supabase) ─── */}
          <div className="up-content-published-col">
            <div className="up-editor-preview-label">
              Trên trang Về Techtra (đã publish):
            </div>
            {publishedLoading ? (
              <div className="up-loading" style={{ padding: 32 }}>⌛ Đang tải từ Supabase…</div>
            ) : (
              <div
                className="up-editor-preview prose"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(publishedContent) }}
              />
            )}
            <p className="up-hint" style={{ marginTop: 10 }}>
              <i className="fas fa-link" />{" "}
              <a
                href={`${window.location.origin}/components/ve-techtra-moi/ve-techtra-moi.html?slug=${(() => {
                  const opt = allOptions.find((g) => String(g.id) === String(groupId));
                  return opt?.slug || "";
                })()}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Mở trang public tương ứng
              </a>
              {" — "}panel này render cùng hàm sanitizeHtml + class <code>prose</code> như shop,
              nên khớp 100% với những gì khách thấy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}