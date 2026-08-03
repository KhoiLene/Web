// import "./VideoTab.css";
// import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
// import { videoApi, uploadGroupsApi } from "../../api";

// const GIAITRI_STORAGE_KEY = "giaitri_content";

// // ════════════════════════════════════════════════════════════════════════════
// // TAB 3 — Upload video cho trang Giải trí
// // Component này TỰ lấy dữ liệu nhóm (uploadGroupsApi.getAll) nếu không được
// // truyền props parentGroups/childrenOf từ component cha — để có thể render
// // độc lập qua route riêng trong Sidebar (VD: case "videos").
// // ════════════════════════════════════════════════════════════════════════════
// export default function VideoTab({ parentGroups: parentGroupsProp, childrenOf: childrenOfProp }) {
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
//   const [videos, setVideos] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [uploading, setUploading] = useState(false);
//   const [title, setTitle] = useState("");
//   const [error, setError] = useState("");
//   const fileRef = useRef(null);

//   // Nhóm cha LUÔN được phép chọn, cộng thêm toàn bộ nhóm con của nó (nếu có) —
//   // cho phép chọn TẤT CẢ các nhóm, không giới hạn chỉ nhóm lá như trước đây.
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
//       const guess = allOptions.find((g) => g.name.toLowerCase().includes("giải trí") || g.name.toLowerCase().includes("giai tri"));
//       setGroupId(String((guess || allOptions[0]).id));
//     }
//   }, [allOptions, groupId]);

//   const fetchVideos = useCallback(async () => {
//     if (!groupId) return;
//     setLoading(true);
//     setError("");
//     try {
//       const res = await videoApi.getAll({ group_id: groupId });
//       setVideos(res.data || []);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   }, [groupId]);

//   useEffect(() => { fetchVideos(); }, [fetchVideos]);

//   const handleUpload = async () => {
//     const file = fileRef.current?.files?.[0];
//     if (!file) { setError("Vui lòng chọn file video"); return; }
//     if (!groupId) { setError("Vui lòng chọn nhóm"); return; }
//     setUploading(true);
//     setError("");
//     try {
//       const form = new FormData();
//       form.append("video", file);
//       form.append("group_id", groupId);
//       form.append("title", title || file.name);
//       await videoApi.upload(form);
//       // Đồng bộ danh sách video sang localStorage để giaitri.js hiển thị ngay cả khi chưa có API
//       const res = await videoApi.getAll({ group_id: groupId }).catch(() => ({ data: videos }));
//       localStorage.setItem(GIAITRI_STORAGE_KEY, JSON.stringify(res.data || videos));
//       setTitle("");
//       if (fileRef.current) fileRef.current.value = "";
//       fetchVideos();
//     } catch (err) {
//       setError("Lỗi upload: " + err.message);
//     } finally {
//       setUploading(false);
//     }
//   };

//   const handleDelete = async (v) => {
//     if (!window.confirm(`Xóa video "${v.title}"?`)) return;
//     try {
//       await videoApi.remove(v.id);
//       fetchVideos();
//     } catch (err) {
//       alert("Lỗi xóa: " + err.message);
//     }
//   };

//   if (!isControlled && loadingGroups) {
//     return <div className="up-loading">⌛ Đang tải danh sách nhóm...</div>;
//   }

//   return (
//     <div>
//       <div className="up-toolbar">
//         <div className="up-field" style={{ minWidth: 220 }}>
//           <label>Nhóm hiển thị video</label>
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
//         <div className="up-field" style={{ minWidth: 220 }}>
//           <label>Tiêu đề video</label>
//           <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Sự kiện khai trương" />
//         </div>
//         <div className="up-field">
//           <label>Chọn file video</label>
//           <input ref={fileRef} type="file" accept="video/*" />
//         </div>
//         <button className="up-btn up-btn-success" onClick={handleUpload} disabled={uploading}>
//           <i className="fas fa-upload" /> {uploading ? "Đang tải lên..." : "Tải video lên"}
//         </button>
//       </div>

//       {error && <div className="up-error">⚠️ {error}</div>}

//       {loading ? (
//         <div className="up-loading">⌛ Đang tải danh sách video...</div>
//       ) : videos.length === 0 ? (
//         <div className="up-empty">
//           <div className="icon">🎬</div>
//           <h3>Chưa có video nào trong nhóm này</h3>
//           <p>Video sau khi tải lên sẽ tự động hiển thị trên trang Giải trí (giaitri.html).</p>
//         </div>
//       ) : (
//         <div className="up-video-grid">
//           {videos.map((v) => (
//             <div key={v.id} className="up-video-card">
//               <video src={v.url} controls preload="metadata" />
//               <div className="up-video-card__body">
//                 <span className="up-video-card__title">{v.title}</span>
//                 <button className="up-icon-btn danger" title="Xóa" onClick={() => handleDelete(v)}>
//                   <i className="fas fa-trash" />
//                 </button>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

import "./VideoTab.css";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { videoApi, uploadGroupsApi } from "../../api";

const GIAITRI_STORAGE_KEY = "giaitri_content";

// Giá trị đặc biệt đại diện cho "không thuộc nhóm nào" trong <select>.
// Không dùng chuỗi rỗng "" vì đó là trạng thái ban đầu (chưa chọn gì) —
// cần phân biệt rõ với việc người dùng CHỦ ĐỘNG chọn "không thuộc nhóm".
const NO_GROUP_VALUE = "__no_group__";

// ════════════════════════════════════════════════════════════════════════════
// TAB 3 — Upload video cho trang Giải trí
// Component này TỰ lấy dữ liệu nhóm (uploadGroupsApi.getAll) nếu không được
// truyền props parentGroups/childrenOf từ component cha — để có thể render
// độc lập qua route riêng trong Sidebar (VD: case "videos").
// ════════════════════════════════════════════════════════════════════════════
export default function VideoTab({ parentGroups: parentGroupsProp, childrenOf: childrenOfProp }) {
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
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  // Nhóm cha LUÔN được phép chọn, cộng thêm toàn bộ nhóm con của nó (nếu có) —
  // cho phép chọn TẤT CẢ các nhóm, không giới hạn chỉ nhóm lá như trước đây.
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

  // Mặc định vẫn ưu tiên đoán nhóm "giải trí" như trước; nếu không có
  // nhóm nào phù hợp và cũng không có nhóm nào khác, tự động chọn "không thuộc nhóm"
  useEffect(() => {
    if (groupId) return;
    if (allOptions.length) {
      const guess = allOptions.find((g) => g.name.toLowerCase().includes("giải trí") || g.name.toLowerCase().includes("giai tri"));
      setGroupId(String((guess || allOptions[0]).id));
    } else if (!loadingGroups) {
      setGroupId(NO_GROUP_VALUE);
    }
  }, [allOptions, groupId, loadingGroups]);

  const fetchVideos = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setError("");
    try {
      const isNoGroup = groupId === NO_GROUP_VALUE;
      const res = await videoApi.getAll(isNoGroup ? { group_id: null } : { group_id: groupId });
      setVideos(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("Vui lòng chọn file video"); return; }
    // Không còn bắt buộc chọn nhóm — nếu là NO_GROUP_VALUE thì gửi group_id rỗng,
    // video sẽ hiển thị chung ở trang Giải trí, không gắn vào nhóm nào.
    setUploading(true);
    setError("");
    try {
      const isNoGroup = !groupId || groupId === NO_GROUP_VALUE;
      const form = new FormData();
      form.append("video", file);
      form.append("group_id", isNoGroup ? "" : groupId);
      form.append("title", title || file.name);
      await videoApi.upload(form);
      // Đồng bộ danh sách video sang localStorage để giaitri.js hiển thị ngay cả khi chưa có API
      const res = await videoApi.getAll(isNoGroup ? { group_id: null } : { group_id: groupId }).catch(() => ({ data: videos }));
      localStorage.setItem(GIAITRI_STORAGE_KEY, JSON.stringify(res.data || videos));
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
      fetchVideos();
    } catch (err) {
      setError("Lỗi upload: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (v) => {
    if (!window.confirm(`Xóa video "${v.title}"?`)) return;
    try {
      await videoApi.remove(v.id);
      fetchVideos();
    } catch (err) {
      alert("Lỗi xóa: " + err.message);
    }
  };

  if (!isControlled && loadingGroups) {
    return <div className="up-loading">⌛ Đang tải danh sách nhóm...</div>;
  }

  return (
    <div>
      <div className="up-toolbar">
        <div className="up-field" style={{ minWidth: 220 }}>
          <label>Nhóm hiển thị video</label>
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value={NO_GROUP_VALUE}>— Không thuộc nhóm (hiển thị chung ở Giải trí) —</option>
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
        <div className="up-field" style={{ minWidth: 220 }}>
          <label>Tiêu đề video</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Sự kiện khai trương" />
        </div>
        <div className="up-field">
          <label>Chọn file video</label>
          <input ref={fileRef} type="file" accept="video/*" />
        </div>
        <button className="up-btn up-btn-success" onClick={handleUpload} disabled={uploading}>
          <i className="fas fa-upload" /> {uploading ? "Đang tải lên..." : "Tải video lên"}
        </button>
      </div>

      {error && <div className="up-error">⚠️ {error}</div>}

      {loading ? (
        <div className="up-loading">⌛ Đang tải danh sách video...</div>
      ) : videos.length === 0 ? (
        <div className="up-empty">
          <div className="icon">🎬</div>
          <h3>Chưa có video nào trong nhóm này</h3>
          <p>Video sau khi tải lên sẽ tự động hiển thị trên trang Giải trí (giaitri.html).</p>
        </div>
      ) : (
        <div className="up-video-grid">
          {videos.map((v) => (
            <div key={v.id} className="up-video-card">
              <video src={v.url} controls preload="metadata" />
              <div className="up-video-card__body">
                <span className="up-video-card__title">{v.title}</span>
                <button className="up-icon-btn danger" title="Xóa" onClick={() => handleDelete(v)}>
                  <i className="fas fa-trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}