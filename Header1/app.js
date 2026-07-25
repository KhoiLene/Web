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

    /* ---- Cart count update utility (stub) ---- */
    window.updateCartCount = function (count) {
        document.querySelectorAll('.header-cart__count').forEach(el => {
            el.textContent = count;
            el.style.display = count > 0 ? 'flex' : 'none';
        });
    };

    console.log('%cCỏ Mềm Header initialized ✓', 'color: #3E6807; font-weight: bold;');
})();
