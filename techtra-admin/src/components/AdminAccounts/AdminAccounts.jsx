import React, { useEffect, useMemo, useState } from "react";
import "./AdminAccounts.css";


// Backend Express base. Theo nginx.conf: /api/* → backend (cùng host).
// Không cần CORS vì cùng origin khi deploy qua reverse proxy.
const API_BASE = "/api";

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  let json = null;
  try {
    json = await res.json();
  } catch (_) {
    /* not json */
  }
  if (!res.ok || !json?.success) {
    throw new Error(json?.error || `Lỗi máy chủ (HTTP ${res.status})`);
  }
  return json;
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, { method: "GET" });
  let json = null;
  try {
    json = await res.json();
  } catch (_) {
    /* not json */
  }
  if (!res.ok || !json?.success) {
    throw new Error(json?.error || `Lỗi máy chủ (HTTP ${res.status})`);
  }
  return json;
}

function normalizeRole(r) {
  return String(r || "").toLowerCase();
}

export default function AdminAccounts() {
  const [me, setMe] = useState({ role: "superadmin" });
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const canManage = useMemo(() => {
    const role = normalizeRole(me?.role);
    return role === "superadmin";
  }, [me]);

  const refresh = async () => {
    setLoading(true);
    setMsg({ type: "", text: "" });
    try {
      const json = await apiGet("/auth/admin/list");
      const list = json?.data || json?.data?.data || [];
      setAdmins(Array.isArray(list) ? list : []);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setMsg({ type: "error", text: e.message || "Không tải được admin accounts" });
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const initialForm = {
    name: "",
    username: "",
    email: "",
    phone: "",
    full_name: "",
    role: "admin",
    admin_priority: 0,
    password: "",
    is_active: true,
  };

  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);

  const startEdit = (a) => {
    setEditId(a.id);
    setForm({
      name: a.name || "",
      username: a.username || "",
      email: a.email || "",
      phone: a.phone || "",
      full_name: a.full_name || "",
      role: a.role || "admin",
      admin_priority: a.admin_priority ?? 0,
      password: "",
      is_active: a.is_active === true || a.is_active === "true" || a.is_active === 1,
    });
    setMsg({ type: "", text: "" });
  };

  const resetForm = () => {
    setEditId(null);
    setForm(initialForm);
    setMsg({ type: "", text: "" });
  };

  const validate = () => {
    if (!form.name.trim()) return "Vui lòng nhập tên";
    if (!form.email.trim()) return "Vui lòng nhập email";
    if (!form.username.trim()) return "Vui lòng nhập username";
    if (!form.role) return "Vui lòng chọn role";
    if (normalizeRole(form.role) === "superadmin" && Number(form.admin_priority) <= 0) {
      return "Superadmin cần admin_priority > 0";
    }
    if (!form.password.trim() && editId == null) return "Vui lòng nhập mật khẩu";
    if (form.password.trim() && form.password.trim().length < 6) return "Mật khẩu tối thiểu 6 ký tự";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManage) {
      setMsg({ type: "error", text: "Chỉ superadmin mới được quản lý tài khoản admin" });
      return;
    }

    const v = validate();
    if (v) {
      setMsg({ type: "error", text: v });
      return;
    }

    setBusy(true);
    setMsg({ type: "", text: "" });
    try {
      // Gửi mật khẩu plain text — backend tự hash bằng bcrypt trước khi lưu.
      const passwordPlain = form.password.trim() || undefined;
      // Ép boolean chắc chắn — tránh Postgres reject integer cho cột boolean.
      const isActiveBool = form.is_active === true || form.is_active === "true";

      const payload = {
        name: form.name.trim(),
        username: form.username.trim().toLowerCase(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        full_name: form.full_name.trim() || null,
        role: normalizeRole(form.role),
        admin_priority: Number(form.admin_priority) || 0,
        is_active: isActiveBool,
      };

      if (editId == null) {
        await apiPost("/auth/admin/create", { ...payload, password: passwordPlain });
      } else {
        await apiPost("/auth/admin/update", {
          id: editId,
          ...payload,
          // Chỉ gửi password khi user nhập mới (để trống = giữ nguyên hash cũ)
          ...(passwordPlain ? { password: passwordPlain } : {}),
        });
      }

      setMsg({ type: "success", text: editId == null ? "Tạo admin thành công" : "Cập nhật admin thành công" });
      resetForm();
      await refresh();
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: err.message || "Có lỗi" });
    } finally {
      setBusy(false);
    }
  };

  const roleOptions = [
    { value: "admin", label: "admin" },
    { value: "superadmin", label: "superadmin" },
  ];

  return (
    <div className="aa-page">
      <div className="aa-header">
        <div>
          <h2>Quản lý tài khoản admin</h2>
          <p className="aa-sub">
            Superadmin bị giới hạn tối đa 2 tài khoản (top priority). Mật khẩu được hash bằng bcrypt phía backend (Express).
          </p>
        </div>
      </div>

      {msg.text ? (
        <div className={`aa-banner ${msg.type === "error" ? "error" : "success"}`}>
          {msg.text}
        </div>
      ) : null}

      <div className="aa-grid">
        <section className="aa-list">
          <div className="aa-list-title">Danh sách admin</div>

          {loading ? (
            <div className="aa-loading">Đang tải...</div>
          ) : (
            <div className="aa-table-wrap">
              <table className="aa-table">
                <thead>
                  <tr>
                    <th>Tên</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Priority</th>
                    <th>Trạng thái</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((a) => (
                    <tr key={a.id}>
                      <td>{a.name}</td>
                      <td>{a.username || <em style={{color:'#9ca3af'}}>—</em>}</td>
                      <td>{a.email}</td>
                      <td>{a.role}</td>
                      <td>{a.admin_priority ?? 0}</td>
                      <td>{a.is_active ? "active" : "inactive"}</td>
                      <td>
                        <button className="aa-btn" onClick={() => startEdit(a)} disabled={!canManage || busy}>
                          Sửa
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!admins.length ? (
                    <tr>
                      <td colSpan={7}>Chưa có dữ liệu</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="aa-form">
          <div className="aa-form-title">{editId == null ? "Tạo admin" : "Cập nhật admin"}</div>

          <form onSubmit={handleSubmit}>
            <div className="aa-field">
              <label>Họ tên hiển thị</label>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} disabled={!canManage || busy} />
            </div>

            <div className="aa-row">
              <div className="aa-field">
                <label>Username <em>*</em></label>
                <input value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value.toLowerCase().replace(/\s+/g, "") }))} disabled={!canManage || busy} placeholder="vd: admin.khoi" />
              </div>

              <div className="aa-field">
                <label>Email <em>*</em></label>
                <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} disabled={!canManage || busy} />
              </div>
            </div>

            <div className="aa-row">
              <div className="aa-field">
                <label>Họ tên đầy đủ</label>
                <input value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} disabled={!canManage || busy} placeholder="vd: Lê Nguyễn Minh Khôi" />
              </div>

              <div className="aa-field">
                <label>Số điện thoại</label>
                <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} disabled={!canManage || busy} placeholder="vd: 0987654321" />
              </div>
            </div>

            <div className="aa-row">
              <div className="aa-field">
                <label>Role</label>
                <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} disabled={!canManage || busy}>
                  {roleOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="aa-field">
                <label>Admin priority</label>
                <input type="number" value={form.admin_priority} onChange={(e) => setForm((p) => ({ ...p, admin_priority: e.target.value }))} disabled={!canManage || busy} />
              </div>
            </div>

            <div className="aa-field">
              <label>Mật khẩu mới {editId == null ? "*" : "(để trống nếu không đổi)"}</label>
              <input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} disabled={!canManage || busy} />
            </div>

            <div className="aa-field">
              <label>Trạng thái</label>
              <select value={form.is_active ? "true" : "false"} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.value === "true" }))} disabled={!canManage || busy}>
                <option value="true">active</option>
                <option value="false">inactive</option>
              </select>
            </div>

            <div className="aa-actions">
              <button type="submit" className="aa-btn aa-primary" disabled={!canManage || busy}>
                {busy ? "Đang xử lý..." : editId == null ? "Tạo admin" : "Cập nhật"}
              </button>

              <button type="button" className="aa-btn" onClick={resetForm} disabled={busy}>
                Làm mới
              </button>
            </div>
          </form>

          {!canManage ? (
            <div className="aa-hint">
              Bạn hiện không phải superadmin, chỉ xem danh sách.
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
