/* ============================================
   CỎ MỀM HEADER CLONE - APP.JS
   ============================================ */

(function () {
    'use strict';

    /* ---- Sticky Header ---- */
    const header = document.querySelector('.site-header');
    function onScroll() {
        header.classList.toggle('is-sticky', window.scrollY > 10);
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    /* ---- Desktop Search Spotlight ---- */
    const searchInput = document.getElementById('spotlight-search');
    const searchWrapper = searchInput ? searchInput.closest('.header-search') : null;

    if (searchInput && searchWrapper) {
        searchInput.addEventListener('focus', () => searchWrapper.classList.add('is-focused'));
        document.addEventListener('click', (e) => {
            if (!searchWrapper.contains(e.target)) searchWrapper.classList.remove('is-focused');
        });

        // Delete history items
        document.querySelectorAll('.spotlight__history-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                btn.closest('.spotlight__history-item').remove();
            });
        });
    }

    /* ---- Mobile Menu Drawer ---- */
    // Lookup mỗi lần (không cache) để chịu được re-mount header do partials.
    function openMobileMenu() {
        const drawer = document.getElementById('mobileMenuDrawer');
        const overlay = document.getElementById('mobileMenuOverlay');
        const open = document.getElementById('mobileMenuOpenBtn');
        const close = document.getElementById('mobileMenuCloseBtn');
        if (drawer) drawer.classList.add('is-open');
        if (overlay) overlay.classList.add('is-open');
        if (open) open.classList.add('d-none');
        if (close) close.classList.remove('d-none');
        document.body.style.overflow = 'hidden';
        console.log('[mobile-menu] OPEN');
    }

    function closeMobileMenu() {
        const drawer = document.getElementById('mobileMenuDrawer');
        const overlay = document.getElementById('mobileMenuOverlay');
        const open = document.getElementById('mobileMenuOpenBtn');
        const close = document.getElementById('mobileMenuCloseBtn');
        if (drawer) drawer.classList.remove('is-open');
        if (overlay) overlay.classList.remove('is-open');
        if (open) open.classList.remove('d-none');
        if (close) close.classList.add('d-none');
        document.body.style.overflow = '';
        console.log('[mobile-menu] CLOSE');
    }

    function bindMobileMenuHandlers() {
        const open  = document.getElementById('mobileMenuOpenBtn');
        const close = document.getElementById('mobileMenuCloseBtn');
        const over  = document.getElementById('mobileMenuOverlay');
        if (open  && !open.dataset.bound)  { open.dataset.bound  = '1'; open.addEventListener('click', openMobileMenu); }
        if (close && !close.dataset.bound) { close.dataset.bound = '1'; close.addEventListener('click', closeMobileMenu); }
        if (over  && !over.dataset.bound)  { over.dataset.bound  = '1'; over.addEventListener('click', closeMobileMenu); }
    }

    // Bind lần đầu (sau khi app.js chạy — lúc này header đã được inject bởi partials.js).
    bindMobileMenuHandlers();

    // Fallback CHẮC CHẮN: dùng event delegation ở document, bắt cả khi
    // element chưa tồn tại hoặc bị re-mount bởi partial nào đó.
    // Chỉ bắt đúng 1 lần nhờ cờ __mobileMenuDelegated ở window.
    if (!window.__mobileMenuDelegated) {
        window.__mobileMenuDelegated = true;
        document.addEventListener('click', (e) => {
            const target = e.target;
            if (!(target instanceof Element)) return;
            if (target.closest('#mobileMenuOpenBtn'))  { openMobileMenu();  return; }
            if (target.closest('#mobileMenuCloseBtn')) { closeMobileMenu(); return; }
            if (target.closest('#mobileMenuOverlay'))  { closeMobileMenu(); return; }
        });
    }

    /* ---- Mobile Search Toggle ---- */
    const mobileSearchBtn    = document.getElementById('mobileSearchBtn');
    const mobileSearchDrawer = document.getElementById('mobileSearchDrawer');

    if (mobileSearchBtn && mobileSearchDrawer) {
        mobileSearchBtn.addEventListener('click', () => {
            mobileSearchDrawer.classList.toggle('d-none');
            if (!mobileSearchDrawer.classList.contains('d-none')) {
                mobileSearchDrawer.querySelector('input').focus();
            }
        });
    }

    /* ---- Mobile Accordion (Level 1) ---- */
    document.querySelectorAll('.nav-mobile__item.has-accordion').forEach(item => {
        const header = item.querySelector('.nav-mobile__link-header');
        if (!header) return;
        header.addEventListener('click', () => {
            const isOpen = item.classList.contains('is-open');
            // Close all siblings
            item.closest('.nav-mobile__list')
                .querySelectorAll('.nav-mobile__item.is-open')
                .forEach(sib => sib.classList.remove('is-open'));
            if (!isOpen) item.classList.add('is-open');
        });
    });

    /* ---- Mobile Accordion (Level 2 – sub-submenu) ---- */
    document.querySelectorAll('.has-sub-accordion').forEach(item => {
        const subHeader = item.querySelector('.submenu-header');
        if (!subHeader) return;
        subHeader.addEventListener('click', (e) => {
            e.stopPropagation();
            item.classList.toggle('is-sub-open');
        });
    });

    /* ---- Desktop: Close megamenus when clicking outside ---- */
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.menu-parent')) {
            document.querySelectorAll('.menu-parent').forEach(p => p.classList.remove('is-hover'));
        }
    });

    /* ---- Mobile menu / product groups / SALE & SẢN PHẨM đã được partials.js render ----
       partials.js sẽ bắn event 'partials:loaded' sau khi header partial được inject
       và đã render toàn bộ menu (SALE / SẢN PHẨM / VỀ TECHTRA / BÀI VIẾT) từ API.
       Khi đó chỉ cần gắn handler cho accordion mobile (level 1) và sub-accordion (level 2). */

    function attachMobileAccordionHandlers() {
        document.querySelectorAll('.nav-mobile__item.has-accordion').forEach(item => {
            if (item.dataset.bound === '1') return;
            item.dataset.bound = '1';
            const header = item.querySelector('.nav-mobile__link-header');
            if (!header) return;
            header.addEventListener('click', () => {
                const isOpen = item.classList.contains('is-open');
                item.closest('.nav-mobile__list')
                    .querySelectorAll('.nav-mobile__item.is-open')
                    .forEach(sib => { if (sib !== item) sib.classList.remove('is-open'); });
                if (!isOpen) item.classList.add('is-open');
            });
        });

        document.querySelectorAll('.has-sub-accordion').forEach(item => {
            if (item.dataset.bound === '1') return;
            item.dataset.bound = '1';
            const subHeader = item.querySelector('.submenu-header');
            if (!subHeader) return;
            subHeader.addEventListener('click', (e) => {
                e.stopPropagation();
                item.classList.toggle('is-sub-open');
            });
        });
    }

    // Sau khi partials load xong, gắn handler cho accordion mobile + re-bind menu hamburger
    document.addEventListener('partials:loaded', () => {
        attachMobileAccordionHandlers();
        bindMobileMenuHandlers(); // phòng trường hợp header bị thay thế
    });
    // Fallback: thử gắn ngay nếu header đã có sẵn
    if (document.getElementById('mobileNavList')) attachMobileAccordionHandlers();

    /* ---- Cart count sync ----
       Mọi trang đều gọi window.updateCartCount() sau khi thêm/xoá SP để đồng bộ badge.
       Hàm này đọc localStorage.techtra_cart → tính tổng quantity → cập nhật badge
       ở cả desktop (.header-cart__count) + mobile (#mobileMiniCart .header-cart__count).
       Single source of truth: app.js (chạy ở mọi trang qua partials.js). */
    function readCartTotalQty() {
        try {
            const raw = localStorage.getItem("techtra_cart");
            if (!raw) return 0;
            const arr = JSON.parse(raw);
            if (!Array.isArray(arr)) return 0;
            return arr.reduce((s, it) => s + Number(it?.quantity || 0), 0);
        } catch {
            return 0;
        }
    }
    window.updateCartCount = function (count) {
        // Nếu không truyền count → tự đọc lại từ localStorage (an toàn cho mọi ngữ cảnh).
        const qty = (typeof count === "number" && !Number.isNaN(count))
            ? Math.max(0, Math.floor(count))
            : readCartTotalQty();
        const displayQty = qty > 99 ? "99+" : String(qty);

        document.querySelectorAll(".header-cart__count, #cart-badge-count").forEach((el) => {
            el.textContent = displayQty;
            el.style.display = qty > 0 ? "flex" : "none";
        });
    };
    // Sync ngay khi DOM sẵn sàng (badge có thể có sẵn từ header partial)
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => window.updateCartCount());
    } else {
        window.updateCartCount();
    }
    // Và đồng bộ lại sau khi partials inject xong (tránh trường hợp app.js chạy trước partials)
    document.addEventListener("partials:loaded", () => window.updateCartCount());
    // Đồng bộ khi user quay lại tab (giỏ hàng có thể đã đổi từ tab khác)
    window.addEventListener("storage", (e) => {
        if (e.key === "techtra_cart") window.updateCartCount();
    });

    /* ---- Login Modal Functionality ---- */
    const loginModal = document.getElementById('loginModal');
    const forgotPasswordModal = document.getElementById('forgotPasswordModal');
    const registerModal = document.getElementById('registerModal');
    
    const loginModalClose = document.getElementById('loginModalClose');
    const forgotPasswordModalClose = document.getElementById('forgotPasswordModalClose');
    const registerModalClose = document.getElementById('registerModalClose');
    
    const showForgotPassword = document.getElementById('showForgotPassword');
    const backToLoginFromForgot = document.getElementById('backToLoginFromForgot');
    const showRegisterLink = document.getElementById('showRegisterLink');
    const showLoginLink = document.getElementById('showLoginLink');
    
    // Store the referrer URL for redirect after login
    let referrerUrl = document.referrer || window.location.href;

    // Lưu referrer vào sessionStorage để trang đăng nhập dùng khi submit form
    try {
        if (referrerUrl && /^https?:\/\//i.test(referrerUrl)) {
            sessionStorage.setItem('techtra_login_referrer', referrerUrl);
        }
    } catch (_) {}
    
    // Open modals
    function openLoginModal() {
        if (loginModal) {
            loginModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }
    
    function openForgotPasswordModal() {
        if (forgotPasswordModal) {
            forgotPasswordModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }
    
    function openRegisterModal() {
        if (registerModal) {
            registerModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }
    
    // Close modals
    function closeLoginModal() {
        if (loginModal) {
            loginModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
    
    function closeForgotPasswordModal() {
        if (forgotPasswordModal) {
            forgotPasswordModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
    
    function closeRegisterModal() {
        if (registerModal) {
            registerModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
    
    // Event listeners for modal triggers
    document.addEventListener('DOMContentLoaded', function() {
        // Mobile user icon
        const mobileUserIcon = document.querySelector('.header-mobile-top_right__item.icon-account-mb');
        if (mobileUserIcon) {
            mobileUserIcon.addEventListener('click', function(e) {
                e.preventDefault();
                openLoginModal();
            });
        }
        
        // Desktop user icon
        const desktopUserIcon = document.querySelector('.header-actions__login.header-custom_item');
        if (desktopUserIcon) {
            desktopUserIcon.addEventListener('click', function(e) {
                e.preventDefault();
                openLoginModal();
            });
        }
        
        // Modal close buttons
        if (loginModalClose) loginModalClose.addEventListener('click', closeLoginModal);
        if (forgotPasswordModalClose) forgotPasswordModalClose.addEventListener('click', closeForgotPasswordModal);
        if (registerModalClose) registerModalClose.addEventListener('click', closeRegisterModal);
        
        // Forgot password links
        if (showForgotPassword) showForgotPassword.addEventListener('click', function(e) {
            e.preventDefault();
            closeLoginModal();
            openForgotPasswordModal();
        });
        
        if (backToLoginFromForgot) backToLoginFromForgot.addEventListener('click', function(e) {
            e.preventDefault();
            closeForgotPasswordModal();
            openLoginModal();
        });
        
        // Register links
        if (showRegisterLink) showRegisterLink.addEventListener('click', function(e) {
            e.preventDefault();
            closeLoginModal();
            openRegisterModal();
        });
        
        if (showLoginLink) showLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            closeRegisterModal();
            openLoginModal();
        });
        
        // Close modals when clicking outside
        window.addEventListener('click', function(e) {
            if (loginModal && e.target === loginModal) {
                closeLoginModal();
            }
            if (forgotPasswordModal && e.target === forgotPasswordModal) {
                closeForgotPasswordModal();
            }
            if (registerModal && e.target === registerModal) {
                closeRegisterModal();
            }
        });
        
        // Login form submission
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const email = document.getElementById('loginEmail').value.trim();
                const password = document.getElementById('loginPassword').value;
                const rememberMe = document.getElementById('rememberMe').checked;
                
                // Basic validation
                if (!email || !password) {
                    alert('Vui lòng nhập email và mật khẩu');
                    return;
                }
                
                // Simulate API call to backend
                simulateLogin(email, password, rememberMe);
            });
        }
        
        // Forgot password form submission
        const forgotPasswordForm = document.getElementById('forgotPasswordForm');
        if (forgotPasswordForm) {
            forgotPasswordForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const email = document.getElementById('forgotEmail').value.trim();
                
                // Basic validation
                if (!email) {
                    alert('Vui lòng nhập email');
                    return;
                }
                
                // Simulate API call to send reset link
                simulateForgotPassword(email);
            });
        }
        
        // Register form submission
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const fullName = document.getElementById('registerFullName').value.trim();
                const email = document.getElementById('registerEmail').value.trim();
                const password = document.getElementById('registerPassword').value;
                const confirmPassword = document.getElementById('registerConfirmPassword').value;
                
                // Basic validation
                if (!fullName || !email || !password || !confirmPassword) {
                    alert('Vui lòng điền đầy đủ thông tin');
                    return;
                }
                
                if (password !== confirmPassword) {
                    alert('Mật khẩu xác nhận không khớp');
                    return;
                }
                
                // Simulate API call to register
                simulateRegister(fullName, email, password);
            });
        }
    });
    
    // === Login modal: gọi backend Express /api/auth/login ===
    async function callLoginApi(usernameOrEmail, password) {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usernameOrEmail, password }),
        });
        let json = null;
        try { json = await res.json(); } catch (_) {}
        if (!res.ok || !json?.success) {
            throw new Error(json?.error || `Đăng nhập thất bại (HTTP ${res.status})`);
        }
        return json.data;
    }

    function normalizeRole(r) {
        return String(r || 'user').trim().toLowerCase();
    }
    function isAdminRole(r) {
        r = normalizeRole(r);
        return r === 'admin' || r === 'superadmin';
    }

    function simulateLogin(email, password, rememberMe) {
        const loginBtn = document.querySelector('.login-btn');
        const originalText = loginBtn.textContent;
        loginBtn.textContent = 'Đang đăng nhập...';
        loginBtn.disabled = true;

        callLoginApi(email, password)
            .then((data) => {
                const role = normalizeRole(data.role);
                try {
                    localStorage.setItem('techtra_user', JSON.stringify({
                        id: data.id,
                        name: data.name || data.full_name || data.username || data.email,
                        email: data.email,
                        phone: data.phone || '',
                        role,
                        admin_priority: data.admin_priority ?? 0,
                        source: isAdminRole(role) ? 'admins' : 'users',
                        loggedInAt: Date.now(),
                    }));
                } catch (_) {}
                if (rememberMe) {
                    try { localStorage.setItem('techtra_username', email); } catch (_) {}
                }

                closeLoginModal();
                if (isAdminRole(role)) {
                    window.location.href = '/admin/';
                } else {
                    window.location.href = referrerUrl;
                }
            })
            .catch((err) => {
                loginBtn.textContent = originalText;
                loginBtn.disabled = false;
                alert('Đăng nhập thất bại: ' + (err.message || 'Lỗi không xác định'));
            });
    }
    
    function simulateForgotPassword(email) {
        // OTP flow đã có sẵn UI riêng ở /components/quen-mk/quen-mk.html.
        // Modal trong header chỉ bắn email qua query → trang đó render form OTP đầy đủ.
        window.location.href = '/components/quen-mk/index.html?email=' + encodeURIComponent(email);
    }

    // Register modal: flow OTP email (TechnoraOtp) — gửi mã → verify → đăng ký
    async function registerApi(payload) {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        let json = null;
        try { json = await res.json(); } catch (_) {}
        if (!res.ok || !json?.success) {
            throw new Error(json?.error || `Đăng ký thất bại (HTTP ${res.status})`);
        }
        return json;
    }

    // Hiển thị ô nhập OTP 6 số inline trong modal register (đè UI cũ, không dùng prompt())
    function showRegisterOtpInline(email, onVerified) {
        const form = document.getElementById('registerForm');
        if (!form) return;

        // Xoá UI OTP cũ nếu có
        const old = document.getElementById('registerOtpInlineWrap');
        if (old) old.remove();

        const wrap = document.createElement('div');
        wrap.id = 'registerOtpInlineWrap';
        wrap.style.marginTop = '14px';
        wrap.innerHTML = `
          <div style="font-weight:800;margin-bottom:8px;">Nhập mã OTP đã gửi tới ${email}</div>
          <input id="registerOtpCode" type="text" inputmode="numeric" maxlength="6"
                 placeholder="Nhập mã 6 số"
                 style="width:100%;padding:10px;border-radius:10px;border:1px solid #e5e7eb;letter-spacing:4px;font-size:18px;text-align:center;" />
          <div id="registerOtpMsg" style="margin-top:8px;font-size:13px;"></div>
          <button type="button" id="registerOtpConfirmBtn"
                  style="margin-top:10px;padding:10px 14px;border:none;border-radius:12px;background:#111827;color:#fff;cursor:pointer;">
            Xác nhận mã
          </button>
        `;
        form.appendChild(wrap);

        const codeInput = wrap.querySelector('#registerOtpCode');
        const msg       = wrap.querySelector('#registerOtpMsg');
        const btn       = wrap.querySelector('#registerOtpConfirmBtn');

        codeInput.focus();

        // Auto-submit khi nhập đủ 6 số
        codeInput.addEventListener('input', () => {
            if (codeInput.value.length === 6) btn.click();
        });

        btn.addEventListener('click', async () => {
            const code = (codeInput.value || '').trim();
            if (!/^\d{6}$/.test(code)) {
                msg.style.color = '#dc2626';
                msg.textContent = 'Vui lòng nhập đúng 6 chữ số.';
                codeInput.focus();
                return;
            }
            btn.disabled = true;
            btn.textContent = 'Đang xác nhận...';
            try {
                await window.TechnoraOtp.verify(email, 'email', 'register', code);
                msg.style.color = '#16a34a';
                msg.textContent = '✅ Mã hợp lệ. Đang hoàn tất đăng ký...';
                await onVerified();
            } catch (err) {
                msg.style.color = '#dc2626';
                msg.textContent = err.message || 'Mã OTP không đúng hoặc đã hết hạn.';
                btn.disabled = false;
                btn.textContent = 'Xác nhận mã';
                codeInput.focus();
            }
        });
    }

    function simulateRegister(fullName, email, password) {
        const btn = document.querySelector('.register-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Đang gửi mã...';
        btn.disabled = true;

        if (typeof window.TechnoraOtp?.send !== 'function') {
            btn.textContent = originalText;
            btn.disabled = false;
            alert('Lỗi hệ thống: sendCode.js chưa load. Hãy F5 trang.');
            return;
        }

        window.TechnoraOtp.send(email, 'email', 'register')
            .then(() => {
                btn.textContent = originalText;
                btn.disabled = false;
                showRegisterOtpInline(email, async () => {
                    await registerApi({
                        username: email.split('@')[0],
                        email,
                        password,
                        full_name: fullName,
                    });
                    alert('Đăng ký thành công! Vui lòng đăng nhập.');
                    closeRegisterModal();
                    openLoginModal();
                });
            })
            .catch((err) => {
                btn.textContent = originalText;
                btn.disabled = false;
                alert('Đăng ký thất bại: ' + (err.message || 'Không gửi được mã OTP. Vui lòng thử lại sau.'));
            });
    }

    console.log('%cTECHTRA Header initialized ✓', 'color: #2563eb; font-weight: bold;');
})();
