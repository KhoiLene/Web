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
    const mobileOpenBtn  = document.getElementById('mobileMenuOpenBtn');
    const mobileCloseBtn = document.getElementById('mobileMenuCloseBtn');
    const mobileOverlay  = document.getElementById('mobileMenuOverlay');
    const mobileDrawer   = document.getElementById('mobileMenuDrawer');

    function openMobileMenu() {
        mobileDrawer.classList.add('is-open');
        mobileOverlay.classList.add('is-open');
        mobileOpenBtn.classList.add('d-none');
        mobileCloseBtn.classList.remove('d-none');
        document.body.style.overflow = 'hidden';
    }

    function closeMobileMenu() {
        mobileDrawer.classList.remove('is-open');
        mobileOverlay.classList.remove('is-open');
        mobileOpenBtn.classList.remove('d-none');
        mobileCloseBtn.classList.add('d-none');
        document.body.style.overflow = '';
    }

    if (mobileOpenBtn)  mobileOpenBtn.addEventListener('click', openMobileMenu);
    if (mobileCloseBtn) mobileCloseBtn.addEventListener('click', closeMobileMenu);
    if (mobileOverlay)  mobileOverlay.addEventListener('click', closeMobileMenu);

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

    /* ---- Fetch product groups and populate mobile menu ---- */
    async function populateProductGroups() {
        try {
            // Import the API functions
            const { productGroupsApi, productsApi } = await import('/components/api-service/api.js');

            // Fetch all product groups
            const groupsResponse = await productGroupsApi.getAll();
            const productGroups = groupsResponse.data || [];

            // Get the container element
            const container = document.getElementById('productGroupsContainer');
            if (!container) return;

            // Clear any existing content
            container.innerHTML = '';

            // Process each product group
            for (const group of productGroups) {
                // Fetch products for this group
                const productsResponse = await productsApi.getAll({ group_id: group.id });
                const products = productsResponse.data || [];

                // Create the group HTML
                const groupHTML = `
                    <li class="has-sub-accordion">
                        <div class="submenu-header">
                            <a href="/components/nhom-san-pham/nhom-san-pham.html?slug=${group.slug}">${group.name}</a>
                            <span class="sub-accordion-toggle"><i class="fa-solid fa-plus"></i></span>
                        </div>
                        <ul class="nav-mobile__sub-submenu">
                            ${products.map(product => `
                                <li><a href="/components/san-pham/san-pham.html?slug=${product.slug}">${product.name}</a></li>
                            `).join('')}
                        </ul>
                    </li>
                `;

                // Add the group HTML to the container
                container.insertAdjacentHTML('beforeend', groupHTML);
            }
        } catch (error) {
            console.error('Error populating product groups:', error);
            // Fallback to a simple message if API fails
            const container = document.getElementById('productGroupsContainer');
            if (container) {
                container.innerHTML = '<li><a href="#">Không thể tải danh mục sản phẩm</a></li>';
            }
        }
    }

    // Call the function to populate product groups when the DOM is loaded
    document.addEventListener('DOMContentLoaded', populateProductGroups);

    /* ===========================================================
     * Render động menu SALE / SẢN PHẨM trên header desktop
     *  - SALE:    product_groups.is_sale = true   → card ảnh + tên
     *  - SẢN PHẨM: product_groups.is_sale = false → cột + list SP con
     * =========================================================== */
    const ARROW_ICON_SVG = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M7.99922 1.19922C4.24962 1.19922 1.19922 4.24962 1.19922 7.99922C1.19922 11.7488 4.24962 14.7992 7.99922 14.7992C11.7488 14.7992 14.7992 11.7488 14.7992 7.99922C14.7992 4.24962 11.7488 1.19922 7.99922 1.19922ZM8 16C3.5888 16 0 12.4112 0 8C0 3.5888 3.5888 0 8 0C12.4112 0 16 3.5888 16 8C16 12.4112 12.4112 16 8 16Z" fill="#363C05"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M6.84559 11.3745C6.69199 11.3745 6.53759 11.3161 6.42079 11.1977C6.18719 10.9625 6.18799 10.5833 6.42239 10.3497L8.78399 7.99769L6.42239 5.64649C6.18799 5.41289 6.18719 5.03289 6.42079 4.79769C6.65439 4.56169 7.03359 4.56329 7.26879 4.79609L10.0576 7.57289C10.1704 7.68569 10.2336 7.83849 10.2336 7.99769C10.2336 8.15769 10.1704 8.31049 10.0576 8.42329L7.26879 11.1993C7.15199 11.3161 6.99839 11.3745 6.84559 11.3745Z" fill="#363C05"/>
        </svg>`;

    function escHtml(s) {
        return String(s == null ? '' : s)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

    async function renderProductMenus() {
        try {
            const { productGroupsApi, productsApi } = await import('/components/api-service/api.js');

            const [groupsRes, productsRes] = await Promise.all([
                productGroupsApi.getAll(),
                productsApi.getAll({ limit: 1000 }).catch(() => ({ data: [] })),
            ]);
            const allGroups = (groupsRes && groupsRes.data) || [];
            const allProducts = (productsRes && productsRes.data) || [];

            // Chỉ lấy group active; phân loại theo is_sale
            const activeGroups = allGroups.filter((g) => g.is_active !== false);
            const saleGroups = activeGroups
                .filter((g) => g.is_sale === true)
                .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
            const productGroups = activeGroups
                .filter((g) => g.is_sale !== true)
                .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

            // Group products theo group_id
            const productsByGroup = {};
            (allProducts || []).forEach((p) => {
                if (p.group_id == null) return;
                if (!productsByGroup[p.group_id]) productsByGroup[p.group_id] = [];
                productsByGroup[p.group_id].push(p);
            });

            // ─── 1. Render menu SALE ────────────────────────────────────
            const saleMount = document.getElementById('saleMenuMount');
            if (saleMount) {
                if (!saleGroups.length) {
                    saleMount.innerHTML = '<div class="menu-empty">Chưa có nhóm SALE nào.</div>';
                } else {
                    saleMount.innerHTML = saleGroups
                        .map((g) => `
                            <div class="menu-type-1__content--item">
                                <a href="/components/nhom-san-pham/nhom-san-pham.html?slug=${escHtml(g.slug)}" class="menu-type-1__content--item__img">
                                    <img src="${escHtml(g.image_url || 'https://placehold.co/140x110?text=SALE')}" alt="${escHtml(g.name)}">
                                </a>
                                <a href="/components/nhom-san-pham/nhom-san-pham.html?slug=${escHtml(g.slug)}" class="menu-type-1__content--item__title">${escHtml(g.name)}</a>
                            </div>`)
                        .join('');
                }
            }

            // ─── 2. Render menu SẢN PHẨM ───────────────────────────────
            const prodMount = document.getElementById('productMenuMount');
            if (prodMount) {
                if (!productGroups.length) {
                    prodMount.innerHTML = '<div class="menu-empty">Chưa có nhóm sản phẩm nào.</div>';
                } else {
                    prodMount.innerHTML = productGroups
                        .map((g) => {
                            const items = (productsByGroup[g.id] || []).slice(0, 10);
                            return `
                                <div class="menu-type-2__list-menu--item">
                                    <a href="/components/nhom-san-pham/nhom-san-pham.html?slug=${escHtml(g.slug)}" class="menu-type-2__list-menu--item__title menu-type-new__title">
                                        <span>${escHtml(g.name)}</span>
                                        ${ARROW_ICON_SVG}
                                    </a>
                                    <ul>
                                        ${
                                            items.length
                                                ? items
                                                      .map(
                                                          (p) => `<li><a href="/components/san-pham/san-pham.html?slug=${escHtml(p.slug)}">${escHtml(p.name)}</a></li>`
                                                      )
                                                      .join('')
                                                : '<li><a href="#"><em>Đang cập nhật</em></a></li>'
                                        }
                                    </ul>
                                </div>`;
                        })
                        .join('');
                }
            }
        } catch (err) {
            console.error('[header] Lỗi render menu SALE / SẢN PHẨM:', err);
            const saleMount = document.getElementById('saleMenuMount');
            const prodMount = document.getElementById('productMenuMount');
            if (saleMount) saleMount.innerHTML = '<div class="menu-empty">Không thể tải menu SALE.</div>';
            if (prodMount) prodMount.innerHTML = '<div class="menu-empty">Không thể tải menu SẢN PHẨM.</div>';
        }
    }

    document.addEventListener('DOMContentLoaded', renderProductMenus);

    /* ---- Cart count update utility (stub) ---- */
    window.updateCartCount = function (count) {
        document.querySelectorAll('.header-cart__count').forEach(el => {
            el.textContent = count;
            el.style.display = count > 0 ? 'flex' : 'none';
        });
    };

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
    let referrerUrl = document.referrer || window.location.origin;
    
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
            forgotPasswordForm.addEventlement('submit', function(e) {
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
    
    // Simulate login API call (replace with actual backend call)
    function simulateLogin(email, password, rememberMe) {
        // Show loading state
        const loginBtn = document.querySelector('.login-btn');
        const originalText = loginBtn.textContent;
        loginBtn.textContent = 'Đang đăng nhập...';
        loginBtn.disabled = true;
        
        // Simulate network delay
        setTimeout(() => {
            // Simulate successful login
            // In real implementation, this would be an actual API call to /api/auth/login
            const isAdmin = email === 'admin@techtra.vn'; // Check if admin
            
            // Reset button state
            loginBtn.textContent = originalText;
            loginBtn.disabled = false;
            
            // Close login modal
            closeLoginModal();
            
            // Redirect based on user type
            if (isAdmin) {
                // Admin goes to admin panel
                window.location.href = '/techtra-admin/';
            } else {
                // Regular user goes back to previous page
                window.location.href = referrerUrl;
            }
            
            // Show success message (in real app, you might use toast notifications)
            alert('Đăng nhập thành công!');
        }, 1500);
    }
    
    // Simulate forgot password API call
    function simulateForgotPassword(email) {
        const btn = document.querySelector('.reset-password-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Đang gửi...';
        btn.disabled = true;
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
            
            // Show success message
            const messageDiv = document.getElementById('forgotPasswordMessage');
            messageDiv.textContent = 'Đã gửi liên kết đặt lại mật khẩu đến email của bạn';
            messageDiv.style.color = '#28a745';
            messageDiv.style.display = 'block';
            
            // Clear form
            document.getElementById('forgotEmail').value = '';
        }, 1500);
    }
    
    // Simulate register API call
    function simulateRegister(fullName, email, password) {
        const btn = document.querySelector('.register-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Đang đăng ký...';
        btn.disabled = true;
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
            
            // Show success message
            alert('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.');
            
            // Switch to login tab
            closeRegisterModal();
            openLoginModal();
        }, 1500);
    }

    console.log('%cCỏ Mềm Header initialized ✓', 'color: #3E6807; font-weight: bold;');
})();
