// // /* ============================================
// //    TECHTRA - ĐĂNG NHẬP (Supabase direct, dev-only)
// //    - Email/username + bcrypt verify phía client
// //    - Không qua backend Express
// //    ============================================ */

// // (async function () {
// //     'use strict';

// //     // supabase global được load qua partials.js (window.supabase)
// //     // Nếu chưa có, fallback tạo từ api-service
// //     function getSupabase() {
// //         if (window.__SUPABASE_CLIENT__) return window.__SUPABASE_CLIENT__;
// //         if (window.supabase) return window.supabase;
// //         throw new Error('Supabase chưa được khởi tạo. Kiểm tra partials.js.');
// //     }

// //     const bcrypt = await import("https://esm.sh/bcryptjs@2.4.3");
// //     const bcryptLib = bcrypt.default || bcrypt;

// //     const form = document.getElementById('loginForm');
// //     const messageDiv = document.getElementById('message');
// //     const submitBtn = document.getElementById('loginSubmitBtn');

// //     // Show/hide password
// //     document.querySelectorAll('[data-toggle="password"]').forEach((btn) => {
// //         btn.addEventListener('click', () => {
// //             const target = document.getElementById('password');
// //             if (!target) return;
// //             const isPassword = target.type === 'password';
// //             target.type = isPassword ? 'text' : 'password';
// //             btn.innerHTML = isPassword
// //                 ? '<i class="fa-regular fa-eye-slash"></i>'
// //                 : '<i class="fa-regular fa-eye"></i>';
// //         });
// //     });

// //     function showMessage(text, type) {
// //         if (!messageDiv) return;
// //         messageDiv.className = 'auth-message is-show ' + (type || 'info');
// //         const icon = type === 'success'
// //             ? 'fa-circle-check'
// //             : type === 'error'
// //                 ? 'fa-circle-exclamation'
// //                 : 'fa-circle-info';
// //         messageDiv.innerHTML = `<i class="fa-solid ${icon}"></i><span>${text}</span>`;
// //     }

// //     function setLoading(loading) {
// //         submitBtn.disabled = loading;
// //         submitBtn.innerHTML = loading
// //             ? '<i class="fa-solid fa-spinner fa-spin"></i><span>Đang đăng nhập...</span>'
// //             : '<span>Đăng nhập</span><i class="fa-solid fa-arrow-right"></i>';
// //     }

// //     form.addEventListener('submit', async function (e) {
// //         e.preventDefault();

// //         const username = document.getElementById('username').value.trim();
// //         const password = document.getElementById('password').value.trim();

// //         messageDiv.className = 'auth-message';
// //         messageDiv.innerHTML = '';

// //         if (!username || !password) {
// //             showMessage('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.', 'error');
// //             return;
// //         }

// //         setLoading(true);

// //         try {
// //             const supabase = getSupabase();
// //             const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);

// //             // Tìm user theo email hoặc username
// //             let query = supabase
// //                 .from("users")
// //                 .select("id, username, email, password_hash, full_name, phone, role, is_active")
// //                 .limit(1);
// //             query = isEmail ? query.eq("email", username) : query.eq("username", username);

// //             const { data: rows, error } = await query.maybeSingle();
// //             if (error) throw new Error(error.message);

// //             if (!rows) {
// //                 throw new Error('Tên đăng nhập hoặc mật khẩu không đúng.');
// //             }

// //             // Tài khoản bị khoá?
// //             if (rows.is_active === false) {
// //                 throw new Error('Tài khoản đã bị khoá. Vui lòng liên hệ admin.');
// //             }

// //             // So khớp password (bcrypt verify, client-side dev-only)
// //             const ok = bcryptLib.compareSync(password, rows.password_hash || '');
// //             if (!ok) {
// //                 throw new Error('Tên đăng nhập hoặc mật khẩu không đúng.');
// //             }

// //             showMessage('Đăng nhập thành công! Đang chuyển hướng...', 'success');

// //             if (document.getElementById('remember')?.checked) {
// //                 try { localStorage.setItem('techtra_username', username); } catch (_) {}
// //             }

// //             try {
// //                 localStorage.setItem('techtra_user', JSON.stringify({
// //                     id:     rows.id,
// //                     name:   rows.full_name || rows.username,
// //                     email:  rows.email,
// //                     phone:  rows.phone || '',
// //                     role:   rows.role || 'user',
// //                     loggedInAt: Date.now(),
// //                 }));
// //             } catch (_) {}

// //             const role = rows.role || 'user';
// //             setTimeout(() => {
// //                 if (role === 'admin' || role === 'superadmin') {
// //                     window.location.href = '../techtra-admin/src/componets/dashboard/dashboard.html';
// //                 } else {
// //                     window.location.href = '/components/khach-hang/khach-hang.html';
// //                 }
// //             }, 700);
// //         } catch (error) {
// //             console.error('Login error:', error);
// //             showMessage(error.message || 'Có lỗi xảy ra. Vui lòng thử lại.', 'error');
// //         } finally {
// //             setLoading(false);
// //         }
// //     });

// //     // Restore remembered username (without password)
// //     try {
// //         const saved = localStorage.getItem('techtra_username');
// //         if (saved && document.getElementById('username')) {
// //             document.getElementById('username').value = saved;
// //             const remember = document.getElementById('remember');
// //             if (remember) remember.checked = true;
// //         }
// //     } catch (_) {}
// // })();

// /* ============================================
//    TECHTRA - ĐĂNG NHẬP (Supabase direct, dev-only)
//    - Kiểm tra cả bảng "users" (khách hàng/user thường)
//      và bảng "admins" (tài khoản quản trị riêng)
//    - Email/username + bcrypt verify phía client
//    - Không qua backend Express
//    ============================================ */

// (async function () {
//     'use strict';

//     function getSupabase() {
//         if (window.__SUPABASE_CLIENT__) return window.__SUPABASE_CLIENT__;
//         if (window.supabase) return window.supabase;
//         throw new Error('Supabase chưa được khởi tạo. Kiểm tra partials.js.');
//     }

//     const bcrypt = await import("https://esm.sh/bcryptjs@2.4.3");
//     const bcryptLib = bcrypt.default || bcrypt;

//     const form = document.getElementById('loginForm');
//     const messageDiv = document.getElementById('message');
//     const submitBtn = document.getElementById('loginSubmitBtn');

//     document.querySelectorAll('[data-toggle="password"]').forEach((btn) => {
//         btn.addEventListener('click', () => {
//             const target = document.getElementById('password');
//             if (!target) return;
//             const isPassword = target.type === 'password';
//             target.type = isPassword ? 'text' : 'password';
//             btn.innerHTML = isPassword
//                 ? '<i class="fa-regular fa-eye-slash"></i>'
//                 : '<i class="fa-regular fa-eye"></i>';
//         });
//     });

//     function showMessage(text, type) {
//         if (!messageDiv) return;
//         messageDiv.className = 'auth-message is-show ' + (type || 'info');
//         const icon = type === 'success'
//             ? 'fa-circle-check'
//             : type === 'error'
//                 ? 'fa-circle-exclamation'
//                 : 'fa-circle-info';
//         messageDiv.innerHTML = `<i class="fa-solid ${icon}"></i><span>${text}</span>`;
//     }

//     function setLoading(loading) {
//         submitBtn.disabled = loading;
//         submitBtn.innerHTML = loading
//             ? '<i class="fa-solid fa-spinner fa-spin"></i><span>Đang đăng nhập...</span>'
//             : '<span>Đăng nhập</span><i class="fa-solid fa-arrow-right"></i>';
//     }

//     // Thử đăng nhập bằng bảng "admins" (email + cột password)
//     async function tryAdminLogin(supabase, username, password) {
//         const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);
//         if (!isEmail) return null; // bảng admins không có username, phải là email

//         const { data: row, error } = await supabase
//             .from("admins")
//             .select("id, name, email, password, role, admin_priority, is_active")
//             .eq("email", username)
//             .maybeSingle();

//         if (error) throw new Error(error.message);
//         if (!row) return null;

//         if (row.is_active === false) {
//             throw new Error('Tài khoản admin đã bị khoá. Vui lòng liên hệ superadmin.');
//         }

//         const ok = bcryptLib.compareSync(password, row.password || '');
//         if (!ok) return null;

//         return {
//             id: row.id,
//             name: row.name || row.email,
//             email: row.email,
//             phone: '',
//             role: row.role || 'admin',
//             source: 'admins',
//         };
//     }

//     // Thử đăng nhập bằng bảng "users" (username hoặc email + password_hash)
//     async function tryUserLogin(supabase, username, password) {
//         const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);

//         let query = supabase
//             .from("users")
//             .select("id, username, email, password_hash, full_name, phone, role, is_active")
//             .limit(1);
//         query = isEmail ? query.eq("email", username) : query.eq("username", username);

//         const { data: row, error } = await query.maybeSingle();
//         if (error) throw new Error(error.message);
//         if (!row) return null;

//         if (row.is_active === false) {
//             throw new Error('Tài khoản đã bị khoá. Vui lòng liên hệ admin.');
//         }

//         const ok = bcryptLib.compareSync(password, row.password_hash || '');
//         if (!ok) return null;

//         return {
//             id: row.id,
//             name: row.full_name || row.username,
//             email: row.email,
//             phone: row.phone || '',
//             role: row.role || 'user',
//             source: 'users',
//         };
//     }

//     form.addEventListener('submit', async function (e) {
//         e.preventDefault();

//         const username = document.getElementById('username').value.trim();
//         const password = document.getElementById('password').value.trim();

//         messageDiv.className = 'auth-message';
//         messageDiv.innerHTML = '';

//         if (!username || !password) {
//             showMessage('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.', 'error');
//             return;
//         }

//         setLoading(true);

//         try {
//             const supabase = getSupabase();

//             // 1) Ưu tiên kiểm tra bảng admins trước (nếu nhập là email)
//             let account = await tryAdminLogin(supabase, username, password);

//             // 2) Nếu không khớp admins, kiểm tra tiếp bảng users
//             if (!account) {
//                 account = await tryUserLogin(supabase, username, password);
//             }

//             if (!account) {
//                 throw new Error('Tên đăng nhập hoặc mật khẩu không đúng.');
//             }

//             showMessage('Đăng nhập thành công! Đang chuyển hướng...', 'success');

//             if (document.getElementById('remember')?.checked) {
//                 try { localStorage.setItem('techtra_username', username); } catch (_) {}
//             }

//             try {
//                 localStorage.setItem('techtra_user', JSON.stringify({
//                     id:     account.id,
//                     name:   account.name,
//                     email:  account.email,
//                     phone:  account.phone,
//                     role:   account.role,
//                     source: account.source, // 'admins' | 'users' — biết tài khoản đến từ bảng nào
//                     loggedInAt: Date.now(),
//                 }));
//             } catch (_) {}

//             const role = account.role || 'user';
//             setTimeout(() => {
//                 if (role === 'admin' || role === 'superadmin') {
//                     window.location.href = '/admin/';
//                 } else {
//                     window.location.href = '/components/khach-hang/khach-hang.html';
//                 }
//             }, 700);
//         } catch (error) {
//             console.error('Login error:', error);
//             showMessage(error.message || 'Có lỗi xảy ra. Vui lòng thử lại.', 'error');
//         } finally {
//             setLoading(false);
//         }
//     });

//     try {
//         const saved = localStorage.getItem('techtra_username');
//         if (saved && document.getElementById('username')) {
//             document.getElementById('username').value = saved;
//             const remember = document.getElementById('remember');
//             if (remember) remember.checked = true;
//         }
//     } catch (_) {}
// })();

/* ============================================
   TECHTRA - ĐĂNG NHẬP (dùng backend Express)
   - POST /api/auth/login → backend tự ưu tiên admins → users
   - Backend hash/verify password bằng bcrypt
   - Đăng nhập admin → /admin/ ; user thường → quay về trang trước đó
   ============================================ */

(async function () {
    'use strict';

    // Base path deploy của shop. Theo nginx.conf: shop chạy ở '/', admin ở '/admin'.
    // (Biến này giữ lại để dễ tuỳ biến nếu deploy ở sub-path như /techtra-shop/.)
    const BASE_PATH = '';
    // Trỏ thẳng về sub-path '/admin' mà nginx.conf map sang techtra-admin SPA.
    const ADMIN_LANDING = `${BASE_PATH}/admin/`;

    // Trang "quay về sau đăng nhập" cho tài khoản thường.
    // Ưu tiên: 1) sessionStorage (lưu từ các trang khác ngay trước khi mở form đăng nhập),
    //          2) document.referrer (trang trước đó trong lịch sử),
    //          3) trang chủ shop.
    const FALLBACK_USER_LANDING = `${BASE_PATH}/components/trang-chu/`;

    function getSavedReferrer() {
        try {
            const saved = sessionStorage.getItem('techtra_login_referrer');
            if (saved && /^https?:\/\//i.test(saved)) return saved;
        } catch (_) {}
        try {
            if (document.referrer && /^https?:\/\//i.test(document.referrer)) {
                return document.referrer;
            }
        } catch (_) {}
        return FALLBACK_USER_LANDING;
    }

    const form = document.getElementById('loginForm');
    const messageDiv = document.getElementById('message');
    const submitBtn = document.getElementById('loginSubmitBtn');

    document.querySelectorAll('[data-toggle="password"]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const target = document.getElementById('password');
            if (!target) return;
            const isPassword = target.type === 'password';
            target.type = isPassword ? 'text' : 'password';
            btn.innerHTML = isPassword
                ? '<i class="fa-regular fa-eye-slash"></i>'
                : '<i class="fa-regular fa-eye"></i>';
        });
    });

    function showMessage(text, type) {
        if (!messageDiv) return;
        messageDiv.className = 'auth-message is-show ' + (type || 'info');
        const icon = type === 'success'
            ? 'fa-circle-check'
            : type === 'error'
                ? 'fa-circle-exclamation'
                : 'fa-circle-info';
        messageDiv.innerHTML = `<i class="fa-solid ${icon}"></i><span>${text}</span>`;
    }

    function setLoading(loading) {
        submitBtn.disabled = loading;
        submitBtn.innerHTML = loading
            ? '<i class="fa-solid fa-spinner fa-spin"></i><span>Đang đăng nhập...</span>'
            : '<span>Đăng nhập</span><i class="fa-solid fa-arrow-right"></i>';
    }

    // Chuẩn hoá role: bỏ khoảng trắng thừa, về chữ thường,
    // để tránh lỗi khi DB lỡ lưu "Admin", " admin", "ADMIN"...
    function normalizeRole(role) {
        return String(role || 'user').trim().toLowerCase();
    }

    // Có phải role thuộc nhóm quản trị (admin/superadmin) hay không
    function isAdminRole(role) {
        const r = normalizeRole(role);
        return r === 'admin' || r === 'superadmin';
    }

    // Gọi backend Express để xác thực.
    // Backend (/api/auth/login) đã tự ưu tiên check bảng admins → users.
    async function loginViaApi(username, password) {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usernameOrEmail: username, password }),
        });
        let json = null;
        try {
            json = await res.json();
        } catch (_) {
            throw new Error(`Lỗi máy chủ (HTTP ${res.status}). Vui lòng thử lại.`);
        }
        if (!res.ok || !json?.success) {
            throw new Error(json?.error || `Đăng nhập thất bại (HTTP ${res.status})`);
        }
        return json.data;
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        messageDiv.className = 'auth-message';
        messageDiv.innerHTML = '';

        if (!username || !password) {
            showMessage('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.', 'error');
            return;
        }

        setLoading(true);

        try {
            // Backend Express /api/auth/login tự kiểm tra admins → users
            // và trả về user object (không có password_hash).
            const data = await loginViaApi(username, password);

            // Map về shape cũ để các phần khác (header, lưu localStorage) tương thích
            const role = normalizeRole(data.role);
            const isAdmin = isAdminRole(role);
            const account = {
                id: data.id,
                name: data.name || data.full_name || data.username || data.email,
                email: data.email,
                phone: data.phone || '',
                role,
                admin_priority: data.admin_priority ?? 0,
                source: isAdmin ? 'admins' : 'users',
                customer_id: data.customer_id || null,
            };

            showMessage('Đăng nhập thành công! Đang chuyển hướng...', 'success');

            if (document.getElementById('remember')?.checked) {
                try { localStorage.setItem('techtra_username', username); } catch (_) {}
            }

            try {
                localStorage.setItem('techtra_user', JSON.stringify({
                    id:             account.id,
                    name:           account.name,
                    email:          account.email,
                    phone:          account.phone,
                    role:           account.role,          // 'user' | 'admin' | 'superadmin'
                    admin_priority: account.admin_priority ?? 0,
                    source:         account.source,        // 'admins' | 'users'
                    customer_id:    account.customer_id,   // FK in orders table
                    loggedInAt:     Date.now(),
                }));
            } catch (_) {}

            // Xác định điểm đến dựa trên role đã chuẩn hoá
            setTimeout(() => {
                if (isAdminRole(account.role)) {
                    // Admin / superadmin → trang tổng quan (React SPA)
                    window.location.href = ADMIN_LANDING;
                } else {
                    // User thường → quay lại trang trước đó, nhưng tránh các trang auth
                    const ref = getSavedReferrer();
                    const isAuthPage = /\/dang-nhap\/|\/dang-ky\/|\/dangky\.|\/quen-mk\//i.test(ref);
                    window.location.href = isAuthPage ? FALLBACK_USER_LANDING : ref;
                }
            }, 700);
        } catch (error) {
            console.error('Login error:', error);
            showMessage(error.message || 'Có lỗi xảy ra. Vui lòng thử lại.', 'error');
        } finally {
            setLoading(false);
        }
    });

    // Khi người dùng vào trang đăng nhập, tự lưu lại URL trang trước đó
    // (chỉ khi đó là trang hợp lệ cùng host, không phải chính trang đăng nhập)
    // để dùng cho việc redirect sau khi đăng nhập thành công.
    try {
        const ref = document.referrer;
        if (ref && /^https?:\/\/[^/]+/i.test(ref)) {
            const sameOrigin = ref.startsWith(window.location.origin);
            const notLogin = !/\/dang-nhap\/|\/dangky\.|\/quen-mk\//i.test(ref);
            if (sameOrigin && notLogin) {
                sessionStorage.setItem('techtra_login_referrer', ref);
            }
        }
    } catch (_) {}

    try {
        const saved = localStorage.getItem('techtra_username');
        if (saved && document.getElementById('username')) {
            document.getElementById('username').value = saved;
            const remember = document.getElementById('remember');
            if (remember) remember.checked = true;
        }
    } catch (_) {}
})();