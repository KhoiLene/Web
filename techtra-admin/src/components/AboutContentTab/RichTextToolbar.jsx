// import React, { useRef, useState, useEffect, useCallback } from "react";

// // ════════════════════════════════════════════════════════════════════════════
// // Thanh công cụ định dạng văn bản kiểu Word cho vùng contentEditable.
// // Dùng document.execCommand — chạy tốt trên Chrome/Edge/Firefox cho contentEditable.
// // editorRef: ref tới div contentEditable cần định dạng.
// // onChange: gọi lại sau mỗi thao tác để đồng bộ state HTML ở component cha.
// //
// // Bổ sung: các dropdown (Kiểu đoạn / Font chữ / Cỡ chữ) tự động HIỂN THỊ đúng
// // định dạng tại vị trí con trỏ hoặc vùng bôi đen — giống hành vi của Word —
// // thay vì luôn hiện placeholder rỗng.
// // ════════════════════════════════════════════════════════════════════════════

// // Danh sách font hỗ trợ — dùng để so khớp giá trị đọc được từ trình duyệt
// // (queryCommandValue thường trả về tên font không có dấu ngoặc/kiểu fallback)
// // với value tương ứng trong <option>.
// const FONT_OPTIONS = [
//   { label: "Arial", value: "Arial" },
//   { label: "Times New Roman", value: "'Times New Roman', serif" },
//   { label: "Georgia", value: "Georgia, serif" },
//   { label: "Verdana", value: "Verdana, sans-serif" },
//   { label: "Courier New", value: "'Courier New', monospace" },
//   { label: "Tahoma", value: "Tahoma, sans-serif" },
// ];

// const SIZE_OPTIONS = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40];

// const HEADING_TAGS = ["p", "h1", "h2", "h3", "blockquote"];

// // Chuẩn hoá tên font đọc được (vd: từ queryCommandValue hoặc computedStyle)
// // để so khớp với option trong FONT_OPTIONS — bỏ dấu ngoặc kép/nháy đơn, khoảng trắng thừa.
// function normalizeFontName(name) {
//   if (!name) return "";
//   return name.replace(/["']/g, "").split(",")[0].trim().toLowerCase();
// }

// function matchFontOption(rawFontName) {
//   const normalized = normalizeFontName(rawFontName);
//   if (!normalized) return "";
//   const found = FONT_OPTIONS.find(
//     (opt) => normalizeFontName(opt.value) === normalized || normalizeFontName(opt.label) === normalized
//   );
//   return found ? found.value : "";
// }

// // Tìm phần tử block cha gần nhất khớp với 1 trong các thẻ heading hỗ trợ,
// // dùng để đồng bộ dropdown "Kiểu đoạn".
// function findBlockTag(node, editorEl) {
//   let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
//   while (el && el !== editorEl) {
//     const tag = el.tagName?.toLowerCase();
//     if (HEADING_TAGS.includes(tag)) return tag;
//     el = el.parentElement;
//   }
//   return "p";
// }

// export default function RichTextToolbar({ editorRef, onChange }) {
//   const imageInputRef = useRef(null);

//   // Giá trị hiện tại của 3 dropdown, đồng bộ theo vị trí con trỏ/vùng bôi đen
//   const [currentHeading, setCurrentHeading] = useState("p");
//   const [currentFont, setCurrentFont] = useState("");
//   const [currentSize, setCurrentSize] = useState("");

//   const focusEditor = () => {
//     if (editorRef.current) editorRef.current.focus();
//   };

//   // Dùng onMouseDown + preventDefault để giữ nguyên vùng bôi đen (selection)
//   // trong editor trước khi thực thi lệnh định dạng.
//   const withPreventBlur = (fn) => (e) => {
//     e.preventDefault();
//     fn();
//   };

//   // Đọc định dạng tại vị trí con trỏ hiện tại và cập nhật 3 dropdown —
//   // gọi khi click, di chuyển con trỏ bằng bàn phím, hoặc bôi đen trong editor.
//   const syncToolbarState = useCallback(() => {
//     const editor = editorRef.current;
//     if (!editor) return;
//     const selection = window.getSelection();
//     if (!selection || selection.rangeCount === 0) return;
//     const anchorNode = selection.anchorNode;
//     // chỉ đồng bộ khi con trỏ đang thực sự nằm trong editor này
//     if (!anchorNode || !editor.contains(anchorNode)) return;

//     // Kiểu đoạn (heading/blockquote/p)
//     setCurrentHeading(findBlockTag(anchorNode, editor));

//     // Font chữ — ưu tiên queryCommandValue, fallback computedStyle của node cha
//     let fontRaw = "";
//     try {
//       fontRaw = document.queryCommandValue("fontName");
//     } catch {
//       fontRaw = "";
//     }
//     if (!fontRaw) {
//       const el = anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode;
//       fontRaw = el ? getComputedStyle(el).fontFamily : "";
//     }
//     setCurrentFont(matchFontOption(fontRaw));

//     // Cỡ chữ — đọc trực tiếp từ computedStyle của node tại con trỏ (chính xác
//     // hơn queryCommandValue("fontSize"), vốn trả về thang 1-7 của HTML <font>)
//     const sizeEl = anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode;
//     if (sizeEl) {
//       const px = Math.round(parseFloat(getComputedStyle(sizeEl).fontSize));
//       // chỉ hiện trong dropdown nếu khớp đúng 1 trong các mức có sẵn,
//       // tránh hiện nhầm khi cỡ chữ là giá trị tuỳ ý không có trong danh sách
//       setCurrentSize(SIZE_OPTIONS.includes(px) ? String(px) : "");
//     }
//   }, [editorRef]);

//   // Lắng nghe thay đổi vị trí con trỏ/vùng chọn trong toàn trang, nhưng chỉ
//   // xử lý khi selection đang nằm trong editor (lọc ở trong syncToolbarState).
//   useEffect(() => {
//     document.addEventListener("selectionchange", syncToolbarState);
//     return () => document.removeEventListener("selectionchange", syncToolbarState);
//   }, [syncToolbarState]);

//   const exec = (command, value = null) => {
//     focusEditor();
//     document.execCommand(command, false, value);
//     onChange();
//     syncToolbarState();
//   };

//   const applyFontSize = (px) => {
//     if (!px) return;
//     focusEditor();
//     // Trick: execCommand fontSize chỉ nhận giá trị 1-7 (HTML <font size>),
//     // nên tạm gán size=7 rồi thay bằng span có font-size theo px thực tế.
//     document.execCommand("fontSize", false, "7");
//     const editor = editorRef.current;
//     if (editor) {
//       editor.querySelectorAll('font[size="7"]').forEach((f) => {
//         const span = document.createElement("span");
//         span.style.fontSize = `${px}px`;
//         span.innerHTML = f.innerHTML;
//         f.replaceWith(span);
//       });
//     }
//     onChange();
//     setCurrentSize(String(px));
//   };

//   const applyFontFamily = (font) => {
//     if (!font) return;
//     exec("fontName", font);
//     setCurrentFont(font);
//   };

//   const applyForeColor = (color) => exec("foreColor", color);

//   const applyHighlight = (color) => {
//     focusEditor();
//     // hiliteColor không hỗ trợ trên mọi trình duyệt, backColor là fallback
//     if (!document.execCommand("hiliteColor", false, color)) {
//       document.execCommand("backColor", false, color);
//     }
//     onChange();
//   };

//   const applyHeading = (tag) => {
//     exec("formatBlock", tag);
//     setCurrentHeading(tag);
//   };

//   const insertLink = () => {
//     const url = window.prompt("Nhập URL liên kết:");
//     if (url) exec("createLink", url);
//   };

//   const removeLink = () => exec("unlink");

//   const handleImagePick = () => imageInputRef.current?.click();

//   const handleImageFile = (e) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     const reader = new FileReader();
//     reader.onload = () => {
//       exec("insertImage", reader.result);
//     };
//     reader.readAsDataURL(file);
//     e.target.value = "";
//   };

//   const insertImageByUrl = () => {
//     const url = window.prompt("Nhập URL ảnh:");
//     if (url) exec("insertImage", url);
//   };

//   const clearFormat = () => exec("removeFormat");

//   return (
//     <div className="up-rte-toolbar" onMouseUp={syncToolbarState} onKeyUp={syncToolbarState}>
//       <select
//         className="up-rte-select"
//         title="Kiểu đoạn"
//         value={currentHeading}
//         onMouseDown={focusEditor}
//         onChange={(e) => applyHeading(e.target.value)}
//       >
//         <option value="p">Văn bản thường</option>
//         <option value="h1">Tiêu đề 1</option>
//         <option value="h2">Tiêu đề 2</option>
//         <option value="h3">Tiêu đề 3</option>
//         <option value="blockquote">Trích dẫn</option>
//       </select>

//       <select
//         className="up-rte-select"
//         title="Font chữ"
//         value={currentFont}
//         onMouseDown={focusEditor}
//         onChange={(e) => applyFontFamily(e.target.value)}
//       >
//         <option value="" disabled>Font chữ</option>
//         {FONT_OPTIONS.map((opt) => (
//           <option key={opt.value} value={opt.value}>{opt.label}</option>
//         ))}
//       </select>

//       <select
//         className="up-rte-select up-rte-select--small"
//         title="Cỡ chữ"
//         value={currentSize}
//         onMouseDown={focusEditor}
//         onChange={(e) => applyFontSize(e.target.value)}
//       >
//         <option value="" disabled>Cỡ chữ</option>
//         {SIZE_OPTIONS.map((s) => (
//           <option key={s} value={s}>{s}px</option>
//         ))}
//       </select>

//       <span className="up-rte-divider" />

//       <button type="button" className="up-rte-btn" title="Đậm" onMouseDown={withPreventBlur(() => exec("bold"))}>
//         <i className="fas fa-bold" />
//       </button>
//       <button type="button" className="up-rte-btn" title="Nghiêng" onMouseDown={withPreventBlur(() => exec("italic"))}>
//         <i className="fas fa-italic" />
//       </button>
//       <button type="button" className="up-rte-btn" title="Gạch chân" onMouseDown={withPreventBlur(() => exec("underline"))}>
//         <i className="fas fa-underline" />
//       </button>
//       <button type="button" className="up-rte-btn" title="Gạch ngang" onMouseDown={withPreventBlur(() => exec("strikeThrough"))}>
//         <i className="fas fa-strikethrough" />
//       </button>

//       <span className="up-rte-divider" />

//       <label className="up-rte-color" title="Màu chữ">
//         <i className="fas fa-font" />
//         <input type="color" onMouseDown={focusEditor} onChange={(e) => applyForeColor(e.target.value)} defaultValue="#111827" />
//       </label>
//       <label className="up-rte-color" title="Màu nền chữ (highlight)">
//         <i className="fas fa-highlighter" />
//         <input type="color" onMouseDown={focusEditor} onChange={(e) => applyHighlight(e.target.value)} defaultValue="#fff59d" />
//       </label>

//       <span className="up-rte-divider" />

//       <button type="button" className="up-rte-btn" title="Căn trái" onMouseDown={withPreventBlur(() => exec("justifyLeft"))}>
//         <i className="fas fa-align-left" />
//       </button>
//       <button type="button" className="up-rte-btn" title="Căn giữa" onMouseDown={withPreventBlur(() => exec("justifyCenter"))}>
//         <i className="fas fa-align-center" />
//       </button>
//       <button type="button" className="up-rte-btn" title="Căn phải" onMouseDown={withPreventBlur(() => exec("justifyRight"))}>
//         <i className="fas fa-align-right" />
//       </button>
//       <button type="button" className="up-rte-btn" title="Căn đều" onMouseDown={withPreventBlur(() => exec("justifyFull"))}>
//         <i className="fas fa-align-justify" />
//       </button>

//       <span className="up-rte-divider" />

//       <button type="button" className="up-rte-btn" title="Danh sách chấm" onMouseDown={withPreventBlur(() => exec("insertUnorderedList"))}>
//         <i className="fas fa-list-ul" />
//       </button>
//       <button type="button" className="up-rte-btn" title="Danh sách số" onMouseDown={withPreventBlur(() => exec("insertOrderedList"))}>
//         <i className="fas fa-list-ol" />
//       </button>
//       <button type="button" className="up-rte-btn" title="Giảm thụt lề" onMouseDown={withPreventBlur(() => exec("outdent"))}>
//         <i className="fas fa-outdent" />
//       </button>
//       <button type="button" className="up-rte-btn" title="Tăng thụt lề" onMouseDown={withPreventBlur(() => exec("indent"))}>
//         <i className="fas fa-indent" />
//       </button>

//       <span className="up-rte-divider" />

//       <button type="button" className="up-rte-btn" title="Chèn liên kết" onMouseDown={withPreventBlur(insertLink)}>
//         <i className="fas fa-link" />
//       </button>
//       <button type="button" className="up-rte-btn" title="Bỏ liên kết" onMouseDown={withPreventBlur(removeLink)}>
//         <i className="fas fa-unlink" />
//       </button>
//       <button type="button" className="up-rte-btn" title="Chèn ảnh từ máy" onMouseDown={withPreventBlur(handleImagePick)}>
//         <i className="fas fa-image" />
//       </button>
//       <button type="button" className="up-rte-btn" title="Chèn ảnh từ URL" onMouseDown={withPreventBlur(insertImageByUrl)}>
//         <i className="fas fa-link" style={{ fontSize: 11 }} />
//         <i className="fas fa-image" style={{ marginLeft: -4, fontSize: 11 }} />
//       </button>
//       <input
//         ref={imageInputRef}
//         type="file"
//         accept="image/*"
//         style={{ display: "none" }}
//         onChange={handleImageFile}
//       />

//       <span className="up-rte-divider" />

//       <button type="button" className="up-rte-btn" title="Xóa định dạng" onMouseDown={withPreventBlur(clearFormat)}>
//         <i className="fas fa-eraser" />
//       </button>
//       <button type="button" className="up-rte-btn" title="Hoàn tác (Ctrl+Z)" onMouseDown={withPreventBlur(() => exec("undo"))}>
//         <i className="fas fa-undo" />
//       </button>
//       <button type="button" className="up-rte-btn" title="Làm lại (Ctrl+Y)" onMouseDown={withPreventBlur(() => exec("redo"))}>
//         <i className="fas fa-redo" />
//       </button>
//     </div>
//   );
// }

import React, { useRef, useState, useEffect, useCallback } from "react";

// ════════════════════════════════════════════════════════════════════════════
// Thanh công cụ định dạng văn bản kiểu Word cho vùng contentEditable.
// Dùng document.execCommand — chạy tốt trên Chrome/Edge/Firefox cho contentEditable.
// editorRef: ref tới div contentEditable cần định dạng.
// onChange: gọi lại sau mỗi thao tác để đồng bộ state HTML ở component cha.
//
// Bổ sung: các dropdown (Kiểu đoạn / Font chữ / Cỡ chữ) tự động HIỂN THỊ đúng
// định dạng tại vị trí con trỏ hoặc vùng bôi đen — giống hành vi của Word —
// thay vì luôn hiện placeholder rỗng.
// ════════════════════════════════════════════════════════════════════════════

// Danh sách font hỗ trợ — dùng để so khớp giá trị đọc được từ trình duyệt
// (queryCommandValue thường trả về tên font không có dấu ngoặc/kiểu fallback)
// với value tương ứng trong <option>.
const FONT_OPTIONS = [
  { label: "Arial", value: "Arial" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Tahoma", value: "Tahoma, sans-serif" },
];

const SIZE_OPTIONS = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40];

const HEADING_TAGS = ["p", "h1", "h2", "h3", "blockquote"];

// Chuẩn hoá tên font đọc được (vd: từ queryCommandValue hoặc computedStyle)
// để so khớp với option trong FONT_OPTIONS — bỏ dấu ngoặc kép/nháy đơn, khoảng trắng thừa.
function normalizeFontName(name) {
  if (!name) return "";
  return name.replace(/["']/g, "").split(",")[0].trim().toLowerCase();
}

function matchFontOption(rawFontName) {
  const normalized = normalizeFontName(rawFontName);
  if (!normalized) return "";
  const found = FONT_OPTIONS.find(
    (opt) => normalizeFontName(opt.value) === normalized || normalizeFontName(opt.label) === normalized
  );
  return found ? found.value : "";
}

// Tìm phần tử block cha gần nhất khớp với 1 trong các thẻ heading hỗ trợ,
// dùng để đồng bộ dropdown "Kiểu đoạn".
function findBlockTag(node, editorEl) {
  let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  while (el && el !== editorEl) {
    const tag = el.tagName?.toLowerCase();
    if (HEADING_TAGS.includes(tag)) return tag;
    el = el.parentElement;
  }
  return "p";
}

export default function RichTextToolbar({ editorRef, onChange }) {
  const imageInputRef = useRef(null);

  // Giá trị hiện tại của 3 dropdown, đồng bộ theo vị trí con trỏ/vùng bôi đen
  const [currentHeading, setCurrentHeading] = useState("p");
  const [currentFont, setCurrentFont] = useState("");
  const [currentSize, setCurrentSize] = useState("");

  const focusEditor = () => {
    if (editorRef.current) editorRef.current.focus();
  };

  // Dùng onMouseDown + preventDefault để giữ nguyên vùng bôi đen (selection)
  // trong editor trước khi thực thi lệnh định dạng.
  const withPreventBlur = (fn) => (e) => {
    e.preventDefault();
    fn();
  };

  // Đọc định dạng tại vị trí con trỏ hiện tại và cập nhật 3 dropdown —
  // gọi khi click, di chuyển con trỏ bằng bàn phím, hoặc bôi đen trong editor.
  const syncToolbarState = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    let anchorNode = selection && selection.rangeCount > 0 ? selection.anchorNode : null;
    // chỉ dùng selection nếu nó thực sự nằm trong editor này
    if (!anchorNode || !editor.contains(anchorNode)) anchorNode = null;

    // Không có selection hợp lệ (VD: vừa mở bài, chưa click vào đâu) ->
    // vẫn hiện font/cỡ chữ mặc định, lấy từ node đầu tiên có nội dung trong editor,
    // hoặc từ chính editor nếu đang trống — để dropdown KHÔNG BAO GIỜ để trống.
    if (!anchorNode) {
      const firstEl = editor.querySelector("*") || editor;
      anchorNode = firstEl;
    }

    // Kiểu đoạn (heading/blockquote/p)
    setCurrentHeading(findBlockTag(anchorNode, editor));

    // Font chữ — ưu tiên queryCommandValue, fallback computedStyle của node cha
    let fontRaw = "";
    try {
      fontRaw = document.queryCommandValue("fontName");
    } catch {
      fontRaw = "";
    }
    if (!fontRaw) {
      const el = anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode;
      fontRaw = el ? getComputedStyle(el).fontFamily : "";
    }
    setCurrentFont(matchFontOption(fontRaw));

    // Cỡ chữ — đọc trực tiếp từ computedStyle của node tại con trỏ (chính xác
    // hơn queryCommandValue("fontSize"), vốn trả về thang 1-7 của HTML <font>)
    const sizeEl = anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode;
    if (sizeEl) {
      const px = Math.round(parseFloat(getComputedStyle(sizeEl).fontSize));
      // chỉ hiện trong dropdown nếu khớp đúng 1 trong các mức có sẵn,
      // tránh hiện nhầm khi cỡ chữ là giá trị tuỳ ý không có trong danh sách
      setCurrentSize(SIZE_OPTIONS.includes(px) ? String(px) : "");
    }
  }, [editorRef]);

  // Lắng nghe thay đổi vị trí con trỏ/vùng chọn trong toàn trang, nhưng chỉ
  // xử lý khi selection đang nằm trong editor (lọc ở trong syncToolbarState).
  useEffect(() => {
    document.addEventListener("selectionchange", syncToolbarState);
    return () => document.removeEventListener("selectionchange", syncToolbarState);
  }, [syncToolbarState]);

  // Đồng bộ ngay khi toolbar được mount, và mỗi khi NỘI DUNG editor thay đổi
  // (mở bài khác, dán nội dung, xóa hết...) — để dropdown Font/Cỡ chữ luôn
  // hiện giá trị, không cần đợi người dùng click vào chữ trước.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    syncToolbarState();
    const observer = new MutationObserver(() => syncToolbarState());
    observer.observe(editor, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [editorRef, syncToolbarState]);

  const exec = (command, value = null) => {
    focusEditor();
    document.execCommand(command, false, value);
    onChange();
    syncToolbarState();
  };

  const applyFontSize = (px) => {
    if (!px) return;
    focusEditor();
    // Trick: execCommand fontSize chỉ nhận giá trị 1-7 (HTML <font size>),
    // nên tạm gán size=7 rồi thay bằng span có font-size theo px thực tế.
    document.execCommand("fontSize", false, "7");
    const editor = editorRef.current;
    if (editor) {
      editor.querySelectorAll('font[size="7"]').forEach((f) => {
        const span = document.createElement("span");
        span.style.fontSize = `${px}px`;
        span.innerHTML = f.innerHTML;
        f.replaceWith(span);
      });
    }
    onChange();
    setCurrentSize(String(px));
  };

  const applyFontFamily = (font) => {
    if (!font) return;
    exec("fontName", font);
    setCurrentFont(font);
  };

  const applyForeColor = (color) => exec("foreColor", color);

  const applyHighlight = (color) => {
    focusEditor();
    // hiliteColor không hỗ trợ trên mọi trình duyệt, backColor là fallback
    if (!document.execCommand("hiliteColor", false, color)) {
      document.execCommand("backColor", false, color);
    }
    onChange();
  };

  const applyHeading = (tag) => {
    exec("formatBlock", tag);
    setCurrentHeading(tag);
  };

  const insertLink = () => {
    const url = window.prompt("Nhập URL liên kết:");
    if (url) exec("createLink", url);
  };

  const removeLink = () => exec("unlink");

  const handleImagePick = () => imageInputRef.current?.click();

  const handleImageFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      exec("insertImage", reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const insertImageByUrl = () => {
    const url = window.prompt("Nhập URL ảnh:");
    if (url) exec("insertImage", url);
  };

  const clearFormat = () => exec("removeFormat");

  return (
    <div className="up-rte-toolbar" onMouseUp={syncToolbarState} onKeyUp={syncToolbarState}>
      <select
        className="up-rte-select"
        title="Kiểu đoạn"
        value={currentHeading}
        onMouseDown={focusEditor}
        onChange={(e) => applyHeading(e.target.value)}
      >
        <option value="p">Văn bản thường</option>
        <option value="h1">Tiêu đề 1</option>
        <option value="h2">Tiêu đề 2</option>
        <option value="h3">Tiêu đề 3</option>
        <option value="blockquote">Trích dẫn</option>
      </select>

      <select
        className="up-rte-select"
        title="Font chữ"
        value={currentFont}
        onMouseDown={focusEditor}
        onChange={(e) => applyFontFamily(e.target.value)}
      >
        <option value="" disabled>Font chữ</option>
        {FONT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <select
        className="up-rte-select up-rte-select--small"
        title="Cỡ chữ"
        value={currentSize}
        onMouseDown={focusEditor}
        onChange={(e) => applyFontSize(e.target.value)}
      >
        <option value="" disabled>Cỡ chữ</option>
        {SIZE_OPTIONS.map((s) => (
          <option key={s} value={s}>{s}px</option>
        ))}
      </select>

      <span className="up-rte-divider" />

      <button type="button" className="up-rte-btn" title="Đậm" onMouseDown={withPreventBlur(() => exec("bold"))}>
        <i className="fas fa-bold" />
      </button>
      <button type="button" className="up-rte-btn" title="Nghiêng" onMouseDown={withPreventBlur(() => exec("italic"))}>
        <i className="fas fa-italic" />
      </button>
      <button type="button" className="up-rte-btn" title="Gạch chân" onMouseDown={withPreventBlur(() => exec("underline"))}>
        <i className="fas fa-underline" />
      </button>
      <button type="button" className="up-rte-btn" title="Gạch ngang" onMouseDown={withPreventBlur(() => exec("strikeThrough"))}>
        <i className="fas fa-strikethrough" />
      </button>

      <span className="up-rte-divider" />

      <label className="up-rte-color" title="Màu chữ">
        <i className="fas fa-font" />
        <input type="color" onMouseDown={focusEditor} onChange={(e) => applyForeColor(e.target.value)} defaultValue="#111827" />
      </label>
      <label className="up-rte-color" title="Màu nền chữ (highlight)">
        <i className="fas fa-highlighter" />
        <input type="color" onMouseDown={focusEditor} onChange={(e) => applyHighlight(e.target.value)} defaultValue="#fff59d" />
      </label>

      <span className="up-rte-divider" />

      <button type="button" className="up-rte-btn" title="Căn trái" onMouseDown={withPreventBlur(() => exec("justifyLeft"))}>
        <i className="fas fa-align-left" />
      </button>
      <button type="button" className="up-rte-btn" title="Căn giữa" onMouseDown={withPreventBlur(() => exec("justifyCenter"))}>
        <i className="fas fa-align-center" />
      </button>
      <button type="button" className="up-rte-btn" title="Căn phải" onMouseDown={withPreventBlur(() => exec("justifyRight"))}>
        <i className="fas fa-align-right" />
      </button>
      <button type="button" className="up-rte-btn" title="Căn đều" onMouseDown={withPreventBlur(() => exec("justifyFull"))}>
        <i className="fas fa-align-justify" />
      </button>

      <span className="up-rte-divider" />

      <button type="button" className="up-rte-btn" title="Danh sách chấm" onMouseDown={withPreventBlur(() => exec("insertUnorderedList"))}>
        <i className="fas fa-list-ul" />
      </button>
      <button type="button" className="up-rte-btn" title="Danh sách số" onMouseDown={withPreventBlur(() => exec("insertOrderedList"))}>
        <i className="fas fa-list-ol" />
      </button>
      <button type="button" className="up-rte-btn" title="Giảm thụt lề" onMouseDown={withPreventBlur(() => exec("outdent"))}>
        <i className="fas fa-outdent" />
      </button>
      <button type="button" className="up-rte-btn" title="Tăng thụt lề" onMouseDown={withPreventBlur(() => exec("indent"))}>
        <i className="fas fa-indent" />
      </button>

      <span className="up-rte-divider" />

      <button type="button" className="up-rte-btn" title="Chèn liên kết" onMouseDown={withPreventBlur(insertLink)}>
        <i className="fas fa-link" />
      </button>
      <button type="button" className="up-rte-btn" title="Bỏ liên kết" onMouseDown={withPreventBlur(removeLink)}>
        <i className="fas fa-unlink" />
      </button>
      <button type="button" className="up-rte-btn" title="Chèn ảnh từ máy" onMouseDown={withPreventBlur(handleImagePick)}>
        <i className="fas fa-image" />
      </button>
      <button type="button" className="up-rte-btn" title="Chèn ảnh từ URL" onMouseDown={withPreventBlur(insertImageByUrl)}>
        <i className="fas fa-link" style={{ fontSize: 11 }} />
        <i className="fas fa-image" style={{ marginLeft: -4, fontSize: 11 }} />
      </button>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleImageFile}
      />

      <span className="up-rte-divider" />

      <button type="button" className="up-rte-btn" title="Xóa định dạng" onMouseDown={withPreventBlur(clearFormat)}>
        <i className="fas fa-eraser" />
      </button>
      <button type="button" className="up-rte-btn" title="Hoàn tác (Ctrl+Z)" onMouseDown={withPreventBlur(() => exec("undo"))}>
        <i className="fas fa-undo" />
      </button>
      <button type="button" className="up-rte-btn" title="Làm lại (Ctrl+Y)" onMouseDown={withPreventBlur(() => exec("redo"))}>
        <i className="fas fa-redo" />
      </button>
    </div>
  );
}