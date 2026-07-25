import React, { useState, useEffect, useCallback, useRef } from "react";
import "./News.css";
import { postsApi, newsScrapeApi, newsCategoriesApi, homepageApi } from "../../api";

// ─── Constants ────────────────────────────────────────────────────────────
const TABS = [
  { key: "published", label: "Đã xuất bản" },
  { key: "draft",     label: "Bản nháp"    },
  { key: "all",       label: "Tất cả"      },
];
const LIMIT = 20;

const POST_TYPES = [
  { key: "link",    label: "Link ngoài",     icon: "fas fa-link"      },
  { key: "file",    label: "Upload file PDF", icon: "fas fa-file-pdf"  },
  { key: "scraped", label: "Scrape từ báo",   icon: "fas fa-newspaper" },
  { key: "manual",  label: "Bài viết tay",    icon: "fas fa-pen"       },
];

// ─── Helpers ──────────────────────────────────────────────────────────────
function toSlug(str) {
  return (str || "")
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 500);
}
function fmtDate(s) {
  if (!s) return "—";
  return new Date(s).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtSize(b) {
  if (!b && b !== 0) return "";
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
  return (b / 1024 / 1024).toFixed(2) + " MB";
}
function fileIcon(name = "") {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (ext === "pdf") return "fas fa-file-pdf";
  if (["doc", "docx"].includes(ext)) return "fas fa-file-word";
  if (["xls", "xlsx"].includes(ext)) return "fas fa-file-excel";
  if (["ppt", "pptx"].includes(ext)) return "fas fa-file-powerpoint";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "fas fa-file-image";
  return "fas fa-file";
}

// ════════════════════════════════════════════════════════════════════════
// Main — danh sách bài viết
// ════════════════════════════════════════════════════════════════════════
export default function News() {
  const [rows,        setRows]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [tab,         setTab]         = useState("published");
  const [search,      setSearch]      = useState("");
  const [page,        setPage]        = useState(1);
  const [total,       setTotal]       = useState(0);
  const [categoryId,  setCategoryId]  = useState("");   // filter theo nhóm con
  const [tree,        setTree]        = useState([]);   // cây nhóm tin tức (cha + children)
  const [scrapeOpen,  setScrapeOpen]  = useState(false);
  const [editing,     setEditing]     = useState(null); // null | {} | row

  // Load cây nhóm (1 lần khi mount)
  useEffect(() => {
    newsCategoriesApi.getTree().then((r) => setTree(r || [])).catch(() => setTree([]));
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: LIMIT };
      if (tab !== "all")  params.status = tab;
      if (search)         params.search = search;
      if (categoryId)     params.category_id = categoryId;
      const res = await postsApi.getAll(params);
      setRows(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tab, search, page, categoryId]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const handleChangeTab = (k) => { setTab(k); setPage(1); };
  const handleSearch   = (e) => { setSearch(e.target.value); setPage(1); };
  const handleCategory = (e) => { setCategoryId(e.target.value); setPage(1); };

  const handleDelete = async (row) => {
    if (!window.confirm(`Xóa vĩnh viễn bài "${row.title}"?`)) return;
    try {
      await postsApi.remove(row.id);
      fetchRows();
    } catch (err) { alert("Lỗi: " + err.message); }
  };

  // Helper: lấy tên nhóm theo id
  const getCatName = (cid) => {
    if (!cid) return "—";
    for (const r of tree) {
      if (r.id === cid) return r.name;
      for (const c of (r.children || [])) {
        if (c.id === cid) return `${r.name} › ${c.name}`;
      }
    }
    return `ID ${cid}`;
  };

  // ─── Form sửa ────────────────────────────────────────────────────────
  if (editing !== null) {
    return (
      <EditPost
        initial={editing}
        tree={tree}
        onBack={() => setEditing(null)}
        onSaved={() => { setEditing(null); fetchRows(); }}
      />
    );
  }

  return (
    <div className="nw-page main-content">

      {/* Header */}
      <div className="nw-header">
        <h1>Quản lý bài viết</h1>
        <div className="nw-header-actions">
          <button className="nw-btn nw-btn-success" onClick={() => setScrapeOpen(true)}>
            <i className="fas fa-link" /> Thêm từ link báo
          </button>
          <button className="nw-btn nw-btn-primary" onClick={() => setEditing({})}>
            <i className="fas fa-plus" /> Tạo bài mới
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="nw-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`nw-tab${tab === t.key ? " active" : ""}`}
            onClick={() => handleChangeTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters: search + category */}
      <div className="nw-filters">
        <div className="nw-search">
          <i className="fas fa-search" />
          <input
            type="text"
            placeholder="Tìm theo tiêu đề..."
            value={search}
            onChange={handleSearch}
          />
        </div>
        <select
          className="nw-filter-select"
          value={categoryId}
          onChange={handleCategory}
        >
          <option value="">Tất cả nhóm</option>
          {tree.map((r) => (
            <optgroup key={r.id} label={r.name}>
              {(r.children || []).map((c) => (
                <option key={c.id} value={c.id}>
                  └ {c.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {error && <div className="nw-error">⚠️ {error}</div>}

      {loading ? (
        <div className="nw-loading">⌛ Đang tải...</div>
      ) : rows.length === 0 ? (
        <div className="nw-empty">
          <div className="icon">📰</div>
          <h3>Chưa có bài viết nào</h3>
          <p>Paste link báo để tự động lấy nội dung, hoặc tạo bài mới.</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button className="nw-btn nw-btn-success" onClick={() => setScrapeOpen(true)}>
              <i className="fas fa-link" /> Thêm từ link báo
            </button>
            <button className="nw-btn nw-btn-primary" onClick={() => setEditing({})}>
              <i className="fas fa-plus" /> Tạo bài mới
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="nw-table-wrap">
            <table className="nw-table">
              <thead>
                <tr>
                  <th style={{ width: 100 }}>Ảnh / Loại</th>
                  <th>Tiêu đề</th>
                  <th>Nhóm</th>
                  <th>Site</th>
                  <th>Ngày đăng</th>
                  <th>Trạng thái</th>
                  <th style={{ width: 110 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {(r.thumbnail || r.thumbnail_source) ? (
                        <img className="nw-thumb" src={r.thumbnail || r.thumbnail_source} alt="" />
                      ) : r.post_type === "file" ? (
                        <div className="nw-thumb-empty"><i className="fas fa-file-pdf" /></div>
                      ) : (
                        <div className="nw-thumb-empty">📰</div>
                      )}
                    </td>
                    <td>
                      <div className="nw-title">
                        {r.title}
                        <small>
                          <span className={`nw-type-badge nw-type-${r.post_type || "link"}`}>
                            <i className={
                              r.post_type === "file" ? "fas fa-file-pdf" :
                              r.post_type === "scraped" ? "fas fa-newspaper" :
                              r.post_type === "manual" ? "fas fa-pen" :
                              "fas fa-link"
                            } />
                            {r.post_type === "file" ? "File" :
                             r.post_type === "scraped" ? "Scrape" :
                             r.post_type === "manual" ? "Manual" :
                             "Link"}
                          </span>
                          {" "}
                          {r.summary ? r.summary.slice(0, 80) + (r.summary.length > 80 ? "…" : "") : (r.source_url || "—")}
                        </small>
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: "#475569" }}>{getCatName(r.category_id)}</td>
                    <td>{r.site_name ? <span className="nw-site">{r.site_name}</span> : "—"}</td>
                    <td style={{ fontSize: 13, color: "#6b7280" }}>{fmtDate(r.published_at || r.created_at)}</td>
                    <td>
                      <span className={`nw-badge ${r.status === "published" ? "published" : "draft"}`}>
                        {r.status === "published" ? "Đã xuất bản" : "Bản nháp"}
                      </span>
                    </td>
                    <td>
                      <button className="nw-icon-btn edit" title="Sửa" onClick={() => setEditing(r)}>
                        <i className="fas fa-pen" />
                      </button>
                      {r.status === "published" && (
                        <a
                          className="nw-icon-btn view"
                          title="Mở trên shop"
                          href={`../techtra-shop/tin-tuc-chi-tiet.html?slug=${r.slug}`}
                          target="_blank" rel="noreferrer"
                          style={{ color: "#16a34a", textDecoration: "none" }}
                        >
                          <i className="fas fa-external-link-alt" />
                        </a>
                      )}
                      <button className="nw-icon-btn danger" title="Xóa" onClick={() => handleDelete(r)}>
                        <i className="fas fa-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, fontSize: 14, color: "#6b7280" }}>
            <span>Hiển thị {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} / {total} bài</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="nw-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Trước</button>
              <button className="nw-btn" onClick={() => setPage((p) => p + 1)} disabled={page * LIMIT >= total}>Sau →</button>
            </div>
          </div>
        </>
      )}

      {scrapeOpen && (
        <ScrapeModal
          tree={tree}
          onClose={() => setScrapeOpen(false)}
          onDone={() => { setScrapeOpen(false); fetchRows(); }}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// ScrapeModal — 3 bước: paste link → loading → chọn bài + chọn nhóm
// ════════════════════════════════════════════════════════════════════════
function ScrapeModal({ tree, onClose, onDone }) {
  const [step,      setStep]      = useState(1);
  const [urlInput,  setUrlInput]  = useState("");
  const [results,   setResults]   = useState([]);  // [{ url, status, data|error }]
  const [selected,  setSelected]  = useState([]);  // ids = index
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [targetCat, setTargetCat] = useState("");  // bắt buộc chọn nhóm con khi lưu

  const handleScrape = async () => {
    const urls = urlInput
      .split(/[\n,\s]+/)
      .map((u) => u.trim())
      .filter((u) => /^https?:\/\//i.test(u));
    if (!urls.length) { setError("Vui lòng paste ít nhất 1 link bắt đầu bằng http:// hoặc https://"); return; }
    setError("");
    setStep(2);
    setResults(urls.map((u) => ({ url: u, status: "loading", data: null, error: null })));

    urls.forEach((u, i) => {
      newsScrapeApi.scrapeOne(u)
        .then((data) => {
          setResults((prev) => prev.map((r, j) => j === i ? { ...r, status: "ok", data } : r));
          setSelected((prev) => [...prev, i]);
        })
        .catch((err) => {
          setResults((prev) => prev.map((r, j) => j === i ? { ...r, status: "error", error: err.message } : r));
        });
    });
  };

  const handleGoSave = () => {
    if (!results.some((r) => r.status === "ok")) { setError("Không có link nào scrape thành công"); return; }
    setError("");
    setStep(3);
  };

  const handleSave = async () => {
    if (!targetCat) { setError("Vui lòng chọn nhóm con để đăng các bài này"); return; }
    setSaving(true);
    setError("");
    try {
      const toSave = results.filter((r, i) => r.status === "ok" && selected.includes(i));
      for (const r of toSave) {
        const d = r.data;
        const slug = toSlug(d.title) + "-" + Date.now().toString(36);
        const body = {
          title: d.title,
          slug,
          content: d.textContent?.slice(0, 5000) || null,
          excerpt_html: d.content,
          thumbnail: d.image || null,
          thumbnail_source: d.image || null,
          source_url: r.url,
          site_name: d.siteName || null,
          summary: d.excerpt || null,
          status: "published",
          published_at: new Date().toISOString(),
          post_type: "scraped",
          category_id: Number(targetCat) || null,
        };
        await postsApi.create(body);
      }
      onDone();
    } catch (err) {
      setError("Lỗi lưu: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const okCount = results.filter((r) => r.status === "ok").length;

  return (
    <div className="nw-modal-overlay" onClick={(e) => e.target.className === "nw-modal-overlay" && onClose()}>
      <div className="nw-modal">
        <div className="nw-modal-header">
          <h2><i className="fas fa-link" /> Thêm bài viết từ link báo</h2>
          <button className="nw-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="nw-modal-body">
          <div className="nw-step-bar">
            <div className={`nw-step ${step === 1 ? "active" : step > 1 ? "done" : ""}`}>
              <span className="num">1</span> Paste link
            </div>
            <div className="nw-step-sep" />
            <div className={`nw-step ${step === 2 ? "active" : step > 2 ? "done" : ""}`}>
              <span className="num">2</span> Đang lấy nội dung ({okCount}/{results.length || "?"})
            </div>
            <div className="nw-step-sep" />
            <div className={`nw-step ${step === 3 ? "active" : ""}`}>
              <span className="num">3</span> Chọn bài & lưu
            </div>
          </div>

          {error && <div className="nw-error">⚠️ {error}</div>}

          {step === 1 && (
            <>
              <p style={{ color: "#6b7280", fontSize: 13, marginTop: 0 }}>
                Paste 1 hoặc nhiều link báo. Hệ thống sẽ tự tách tiêu đề, nội dung và ảnh.
              </p>
              <textarea
                className="nw-textarea"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://vnexpress.net/...&#10;https://tuoitre.vn/..."
              />
              <div className="nw-hint">Hỗ trợ: VnExpress, Tuổi Trẻ, Thanh Niên, Dân Trí, VietnamNet, Zing News, Kenh14…</div>
            </>
          )}

          {step === 2 && (
            <div className="nw-scrape-list">
              {results.map((r, i) => <ScrapeResultCard key={i} result={r} />)}
            </div>
          )}

          {step === 3 && (
            <>
              <p style={{ color: "#6b7280", fontSize: 13, marginTop: 0 }}>
                Tick chọn các bài muốn lưu vào DB, chọn nhóm con để đăng.
              </p>

              <div className="nw-field" style={{ marginBottom: 16 }}>
                <label><span className="req">*</span> Chọn nhóm con để đăng</label>
                <select value={targetCat} onChange={(e) => setTargetCat(e.target.value)} style={{ maxWidth: 360 }}>
                  <option value="">-- Chọn nhóm con --</option>
                  {tree.map((r) => (
                    <optgroup key={r.id} label={r.name}>
                      {(r.children || []).map((c) => (
                        <option key={c.id} value={c.id}>└ {c.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {tree.length === 0 && (
                  <small style={{ color: "#dc2626", marginTop: 4 }}>
                    ⚠ Chưa có nhóm tin tức nào. Vào "Danh mục tin tức" để tạo trước.
                  </small>
                )}
              </div>

              <div className="nw-scrape-list">
                {results.map((r, i) => (
                  r.status === "ok" ? (
                    <ScrapeSaveCard
                      key={i}
                      result={r}
                      checked={selected.includes(i)}
                      onToggle={() => setSelected((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i])}
                    />
                  ) : (
                    <ScrapeResultCard key={i} result={r} />
                  )
                ))}
              </div>
            </>
          )}
        </div>

        <div className="nw-modal-footer">
          {step === 1 && (
            <>
              <button className="nw-btn" onClick={onClose}>Đóng</button>
              <button className="nw-btn nw-btn-primary" onClick={handleScrape}>
                Lấy nội dung →
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <button className="nw-btn" onClick={() => setStep(1)}>← Sửa link</button>
              <button className="nw-btn nw-btn-primary" onClick={handleGoSave} disabled={okCount === 0}>
                Tiếp tục ({okCount} OK) →
              </button>
            </>
          )}
          {step === 3 && (
            <>
              <button className="nw-btn" onClick={() => setStep(2)}>← Quay lại</button>
              <button
                className="nw-btn nw-btn-success"
                onClick={handleSave}
                disabled={saving || selected.length === 0 || !targetCat}
              >
                <i className="fas fa-save" /> {saving ? "Đang lưu..." : `Lưu ${selected.length} bài vào DB`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ScrapeResultCard({ result }) {
  return (
    <div className={`nw-scrape-card ${result.status}`}>
      <div className="nw-scrape-head">
        {result.data?.image
          ? <img src={result.data.image} alt="" />
          : <div className="nw-thumb-empty" style={{ width: 100, height: 70 }}>📰</div>}
        <div className="meta">
          <div className="url">{result.url}</div>
          {result.status === "loading" && <div className="ttl">⌛ Đang tải…</div>}
          {result.status === "ok" && (
            <>
              <div className="ttl">{result.data.title}</div>
              <div className="site">{result.data.siteName} · {result.data.length} ký tự</div>
            </>
          )}
          {result.status === "error" && (
            <div style={{ color: "#dc2626", fontWeight: 600 }}>✕ Lỗi: {result.error}</div>
          )}
        </div>
      </div>
      {result.status === "ok" && result.data.excerpt && (
        <div style={{ fontSize: 13, color: "#374151", marginTop: 4 }}>{result.data.excerpt}</div>
      )}
    </div>
  );
}

function ScrapeSaveCard({ result, checked, onToggle }) {
  return (
    <div className="nw-save-card">
      <div className="head">
        {result.data.image
          ? <img src={result.data.image} alt="" />
          : <div className="nw-thumb-empty" style={{ width: 100, height: 70 }}>📰</div>}
        <div className="info">
          <div style={{ fontWeight: 600, color: "#111827" }}>{result.data.title}</div>
          <div style={{ fontSize: 12, color: "#1d4ed8" }}>{result.data.siteName}</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{result.url}</div>
        </div>
      </div>
      <label className="check">
        <input type="checkbox" checked={checked} onChange={onToggle} />
        Lưu bài này
      </label>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// EditPost — Form tạo / sửa bài viết
// Hỗ trợ 3 loại: link (URL ngoài) / file (upload PDF) / manual (HTML)
// ════════════════════════════════════════════════════════════════════════
function EditPost({ initial, tree, onBack, onSaved }) {
  const isEdit = !!initial?.id;
  const [postType,    setPostType]    = useState(initial?.post_type || (initial?.file_url ? "file" : "link"));
  const [title,       setTitle]       = useState(initial.title || "");
  const [slug,        setSlug]        = useState(initial.slug  || "");
  const [excerpt,     setExcerpt]     = useState(initial.summary || "");
  const [content,     setContent]     = useState(initial.excerpt_html || initial.content || "");
  const [thumbnail,   setThumbnail]   = useState(initial.thumbnail || initial.thumbnail_source || "");
  const [sourceUrl,   setSourceUrl]   = useState(initial.source_url || (initial?.post_type === "link" ? "" : "") || "");
  const [siteName,    setSiteName]    = useState(initial.site_name || "");
  const [status,      setStatus]      = useState(initial.status || "draft");

  // File
  const [fileUrl,     setFileUrl]     = useState(initial?.file_url || "");
  const [fileName,    setFileName]    = useState(initial?.file_name || "");
  const [fileSize,    setFileSize]    = useState(initial?.file_size || 0);
  const [uploading,   setUploading]   = useState(false);
  const fileRef = useRef(null);

  // Nhóm (cha → con)
  const initParentId = (() => {
    if (!initial?.category_id) return "";
    for (const r of tree) {
      if ((r.children || []).some((c) => c.id === initial.category_id)) return String(r.id);
    }
    return "";
  })();
  const [parentId,    setParentId]    = useState(initParentId);
  const [categoryId,  setCategoryId]  = useState(initial?.category_id || "");

  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");

  useEffect(() => {
    if (!isEdit) setSlug(toSlug(title));
  }, [title, isEdit]);

  // Reset child khi đổi cha
  useEffect(() => {
    if (!parentId) { setCategoryId(""); return; }
    // Nếu categoryId hiện không thuộc parent mới, reset
    const root = tree.find((r) => String(r.id) === String(parentId));
    if (root && !root.children?.some((c) => c.id === categoryId)) {
      setCategoryId("");
    }
  }, [parentId]); // eslint-disable-line

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      alert("File quá lớn (> 50MB). Vui lòng chọn file nhỏ hơn.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setUploading(true);
    setError("");
    try {
      const res = await homepageApi.uploadFile(file, "news");
      setFileUrl(res.url);
      setFileName(res.fileName);
      setFileSize(res.size);
      // Auto-fill title từ tên file nếu chưa có
      if (!title.trim()) {
        const auto = file.name.replace(/\.[^.]+$/, "");
        setTitle(auto);
      }
    } catch (err) {
      setError("Upload thất bại: " + err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeFile = () => {
    setFileUrl(""); setFileName(""); setFileSize(0);
  };

  const handleSave = async () => {
    if (!title.trim()) { setError("Vui lòng nhập tiêu đề"); return; }
    if (!categoryId)    { setError("Vui lòng chọn nhóm con để đăng"); return; }
    if (postType === "link" && !sourceUrl.trim()) {
      setError("Vui lòng nhập URL link ngoài"); return;
    }
    if (postType === "file" && !fileUrl) {
      setError("Vui lòng upload file PDF/Word"); return;
    }
    setSaving(true);
    setError("");
    try {
      const body = {
        title: title.trim(),
        slug:  slug.trim() || toSlug(title),
        summary: excerpt || null,
        excerpt_html: postType === "manual" || postType === "scraped" ? (content || null) : null,
        content: (content || "").replace(/<[^>]+>/g, "").slice(0, 5000) || null,
        thumbnail: postType === "file" ? null : (thumbnail || null),
        thumbnail_source: postType === "file" ? null : (thumbnail || null),
        source_url: postType === "link" ? sourceUrl : null,
        site_name: postType === "link" ? (siteName || null) : null,
        file_url: postType === "file" ? fileUrl : null,
        file_name: postType === "file" ? fileName : null,
        file_size: postType === "file" ? fileSize : null,
        post_type: postType,
        category_id: categoryId,
        status,
        published_at: status === "published" && !initial.published_at
          ? new Date().toISOString()
          : initial.published_at || null,
      };
      if (isEdit) await postsApi.update(initial.id, body);
      else        await postsApi.create(body);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Children theo parent hiện tại
  const childOpts = (tree.find((r) => String(r.id) === String(parentId))?.children) || [];

  return (
    <div className="nw-page main-content">
      <div className="nw-header">
        <h1>{isEdit ? `Sửa bài: ${initial.title}` : "Tạo bài viết mới"}</h1>
        <div className="nw-header-actions">
          <button className="nw-btn" onClick={onBack}><i className="fas fa-arrow-left" /> Hủy</button>
          <button className="nw-btn nw-btn-primary" onClick={handleSave} disabled={saving}>
            <i className="fas fa-save" /> {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>

      {error && <div className="nw-error">⚠️ {error}</div>}

      <div className="nw-table-wrap" style={{ padding: 20 }}>

        {/* Chọn loại bài */}
        <div className="nw-field">
          <label><span className="req">*</span> Loại bài viết</label>
          <div className="nw-type-tabs">
            {POST_TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`nw-type-tab${postType === t.key ? " active" : ""}`}
                onClick={() => setPostType(t.key)}
              >
                <i className={t.icon} /> {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chọn nhóm cha → con */}
        <div className="nw-grid-2">
          <div className="nw-field">
            <label><span className="req">*</span> Nhóm lớn</label>
            <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">-- Chọn nhóm lớn --</option>
              {tree.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            {tree.length === 0 && (
              <small style={{ color: "#dc2626", marginTop: 4 }}>
                ⚠ Chưa có nhóm tin tức. Vào "Danh mục tin tức" để tạo trước.
              </small>
            )}
          </div>
          <div className="nw-field">
            <label><span className="req">*</span> Nhóm con</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
              disabled={!parentId}
            >
              <option value="">-- Chọn nhóm con --</option>
              {childOpts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="nw-field">
          <label><span style={{ color: "#dc2626" }}>*</span> Tiêu đề</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="nw-field">
          <label>Slug (URL)</label>
          <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} style={{ fontFamily: "'Courier New', monospace" }} />
        </div>
        <div className="nw-field">
          <label>Tóm tắt (2-3 dòng)</label>
          <textarea rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
        </div>

        {/* Body theo loại */}
        {postType === "link" && (
          <>
            <div className="nw-field">
              <label><span className="req">*</span> URL link ngoài</label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="nw-field">
              <label>Tên site</label>
              <input type="text" value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="Vd: VnExpress, Tuổi Trẻ..." />
            </div>
            <div className="nw-grid-2">
              <div className="nw-field">
                <label>URL ảnh thumbnail</label>
                <input type="url" value={thumbnail} onChange={(e) => setThumbnail(e.target.value)} placeholder="https://..." />
                {thumbnail && <img src={thumbnail} alt="" style={{ marginTop: 8, maxWidth: 200, borderRadius: 6 }} />}
              </div>
            </div>
          </>
        )}

        {postType === "file" && (
          <>
            <div className="nw-field">
              <label><span className="req">*</span> File PDF / Word / Excel</label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              {uploading && <small style={{ color: "#2563eb", marginTop: 6 }}>⌛ Đang upload lên Supabase Storage...</small>}
              {fileUrl && (
                <div className="nw-file-card">
                  <i className={fileIcon(fileName)} style={{ fontSize: 28, color: "#dc2626" }} />
                  <div className="nw-file-info">
                    <div className="name">{fileName}</div>
                    <div className="meta">{fmtSize(fileSize)}</div>
                  </div>
                  <a href={fileUrl} target="_blank" rel="noreferrer" className="nw-btn nw-btn-sm">
                    <i className="fas fa-external-link-alt" /> Xem
                  </a>
                  <button type="button" onClick={removeFile} className="nw-icon-btn danger" title="Xoá file">
                    <i className="fas fa-trash" />
                  </button>
                </div>
              )}
            </div>
            <div className="nw-field">
              <label>Tóm tắt nội dung file (tuỳ chọn)</label>
              <textarea rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Mô tả ngắn về file này..." />
            </div>
          </>
        )}

        {(postType === "manual" || postType === "scraped") && (
          <>
            <div className="nw-field">
              <label>Nội dung (HTML)</label>
              <textarea
                rows={12}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                style={{ fontFamily: 'Courier New, monospace', fontSize: 13 }}
                placeholder="<p>Nội dung bài viết...</p>"
              />
            </div>
            <div className="nw-grid-2">
              <div className="nw-field">
                <label>URL ảnh đại diện</label>
                <input type="url" value={thumbnail} onChange={(e) => setThumbnail(e.target.value)} />
                {thumbnail && <img src={thumbnail} alt="" style={{ marginTop: 8, maxWidth: 200, borderRadius: 6 }} />}
              </div>
              <div className="nw-field">
                <label>Link báo gốc (nếu có)</label>
                <input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
              </div>
            </div>
          </>
        )}

        <div className="nw-field">
          <label>Trạng thái</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="draft">Bản nháp</option>
            <option value="published">Đã xuất bản</option>
          </select>
        </div>
      </div>
    </div>
  );
}
