import { useState, useEffect } from "react";
import "./Sidebar.css";

// ─── Icon ─────────────────────────────────────────────────────────────────────
const Icon = ({ name, className = "" }) => (
  <i className={`${name} ${className}`} aria-hidden="true" />
);

// ─── Dữ liệu menu (Đã giữ nguyên chuẩn cấu trúc của bạn) ───────────────────────
const NAV_ITEMS = [
  {
    id: "tongquan",
    label: "Tổng quan",
    icon: "fas fa-th-large",
    pageId: "dashboard",
  },
  {
    id: "donhang",
    label: "Đơn hàng",
    icon: "fas fa-shopping-cart",
    badge: "0",
    children: [
      { label: "Tất cả đơn hàng", pageId: "all-orders" },
      { label: "Đơn hàng nháp",   pageId: "draft-orders" },
      { label: "Chưa hoàn tất",   pageId: "incomplete-orders" },
    ],
  },
  {
    id: "sanpham",
    label: "Sản phẩm",
    icon: "fas fa-tag",
    children: [
      { label: "Tất cả sản phẩm", pageId: "all-products" },
      { label: "Nhóm sản phẩm",   pageId: "product-groups" },
      { label: "Bảng giá",        pageId: "price-list" },
      { label: "Tồn kho",         pageId: "inventory" },
    ],
  },
  {
    id: "khachhang",
    label: "Khách hàng",
    icon: "fas fa-users",
    children: [
      { label: "Tất cả khách hàng", pageId: "all-customers" },
    ],
  },
  {
    id: "danhgia",
    label: "Đánh giá",
    icon: "fas fa-star",
    pageId: "reviews",
  },
];

const CONTENT_ITEMS = [
  { id: "dangbai",   
    label: "Đăng bài",          
    icon: "fas fa-pencil-alt", 
    children: [
      { label: "Nhóm bài viết",  pageId: "upload-group" },
      { label: "Bài viết",    pageId: "upload" },
      { label: "Videos",    pageId: "videos" },
    ],
  },
  {
    id: "baiviet",
    label: "Bài viết / Đọc báo",
    icon: "fas fa-newspaper",
    children: [
      { label: "Danh sách bài viết",  pageId: "news" },
      { label: "Danh mục tin tức",    pageId: "news-categories" },
    ],
  },
  { id: "trangchu",  label: "Quản lý trang chủ", icon: "fas fa-home",       pageId: "manage-home" },
];



// ─── NavItem ──────────────────────────────────────────────────────────────────
function NavItem({ item, activeId, openId, onToggle, onActivate }) {
  const hasChildren = item.children && item.children.length > 0;
  const isOpen      = openId === item.id;
  
  // Kiểm tra mục này hoặc con của mục này có đang active không
  const isActive = activeId === item.pageId || (hasChildren && item.children.some(c => c.pageId === activeId));

  return (
    <li>
      {hasChildren ? (
        /* Mục cha chứa danh sách con (Ví dụ: Sản phẩm) */
        <div
          onClick={(e) => {
            e.preventDefault();
            onToggle(item.id);
          }}
          className={`nav-top-btn${isOpen ? " open" : ""}${isActive ? " active" : ""}`}
        >
          <Icon name={item.icon} className="nav-icon" />
          <span className="nav-label">{item.label}</span>
          {item.badge !== undefined && (
            <span className="nav-badge">{item.badge}</span>
          )}
          <Icon
            name="fas fa-chevron-down"
            className={`nav-arrow${isOpen ? " rotated" : ""}`}
          />
        </div>
      ) : (
        /* Mục đơn lẻ không có con (Ví dụ: Tổng quan, Cấu hình) */
        <div
          onClick={(e) => {
            e.preventDefault();
            if (item.pageId) onActivate(item.pageId);
          }}
          className={`nav-top-link${activeId === item.pageId ? " active" : ""}`}
        >
          <Icon name={item.icon} className="nav-icon" />
          <span className="nav-label">{item.label}</span>
        </div>
      )}

      {/* Menu con đổ xuống (Ví dụ: Tất cả sản phẩm, Nhóm sản phẩm) */}
      {hasChildren && (
        <ul
          className="submenu"
          style={{ 
            maxHeight: isOpen ? `${item.children.length * 38}px` : "0",
            overflow: "hidden",
            transition: "max-height 0.25s ease-in-out"
          }}
        >
          {item.children.map((child) => {
            const isChildActive = activeId === child.pageId;
            return (
              <li key={child.label}>
                <div
                  className={`sub-link${isChildActive ? " active" : ""}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation(); // Ngăn chặn sự kiện click lan ngược lên menu cha
                    onActivate(child.pageId);
                  }}
                >
                  {child.label}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────
function SectionLabel({ label }) {
  return <p className="section-label">{label}</p>;
}

// ─── Admin user card (footer của Sidebar) ────────────────────────────────────
function AdminUserCard({ admin, onLogout }) {
  if (!admin) return null;
  // Ưu tiên full_name > name > username > email prefix
  const displayName =
    admin.full_name || admin.name || admin.username ||
    (admin.email ? String(admin.email).split("@")[0] : "Admin");
  const roleLabel = (admin.role || "admin").toLowerCase() === "superadmin" ? "Super Admin" : "Admin";
  const initial = String(displayName).trim().charAt(0).toUpperCase() || "A";

  return (
    <div className="admin-user-card">
      <div className="admin-user-avatar" aria-hidden="true">{initial}</div>
      <div className="admin-user-info">
        <div className="admin-user-name" title={displayName}>{displayName}</div>
        <div className="admin-user-role" title={admin.email || ""}>{roleLabel}</div>
      </div>
      <button
        type="button"
        className="admin-user-logout"
        onClick={onLogout}
        title="Đăng xuất"
        aria-label="Đăng xuất"
      >
        <Icon name="fas fa-right-from-bracket" />
      </button>
    </div>
  );
}

// ─── Main Sidebar Component ───────────────────────────────────────────────────
export default function Sidebar({ currentActivePage, onPageChange, admin, onLogout }) {
  const [openId, setOpenId] = useState(null);

  // Tự động mở menu cha chứa menu con đang được chọn khi load trang hoặc chuyển trang
  useEffect(() => {
    const findAndOpenParent = (items) => {
      items.forEach((item) => {
        if (item.children && item.children.some((c) => c.pageId === currentActivePage)) {
          setOpenId(item.id);
        }
      });
    };
    findAndOpenParent(NAV_ITEMS);
    findAndOpenParent(CONTENT_ITEMS);
  }, [currentActivePage]);

  const toggle = (id) => setOpenId((prev) => (prev === id ? null : id));

  const sharedProps = {
    activeId: currentActivePage,
    openId,
    onToggle: toggle,
    onActivate: onPageChange
  };

  return (
    <nav className="sidebar" aria-label="Điều hướng chính">
      <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
        <span className="brand-icon">
          <Icon name="fas fa-laugh-wink" />
        </span>
        <span className="brand-text">Techtra</span>
      </a>

      <ul className="nav-list">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.id} item={item} {...sharedProps} />
        ))}

        <li><hr className="divider" /></li>
        <li><SectionLabel label="Nội dung" /></li>
        {CONTENT_ITEMS.map((item) => (
          <NavItem key={item.id} item={item} {...sharedProps} />
        ))}

        <li><hr className="divider" /></li>
        <li>
          <div
            onClick={(e) => {
              e.preventDefault();
              onPageChange("admin-accounts");
            }}
            className={`nav-top-link${currentActivePage === "admin-accounts" ? " active" : ""}`}
          >
            <Icon name="fas fa-user-shield" className="nav-icon" />
            <span className="nav-label">Quản lý admin</span>
          </div>
        </li>
        <NavItem
          item={{ id: "cauhinh", label: "Cấu hình", icon: "fas fa-cog", pageId: "settings" }}
          {...sharedProps}
        />
      </ul>

      {/* Footer: thông tin admin đang đăng nhập + nút logout */}
      <AdminUserCard admin={admin} onLogout={onLogout} />
    </nav>
  );
}