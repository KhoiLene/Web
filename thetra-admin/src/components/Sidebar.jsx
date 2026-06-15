import { useState, useEffect } from "react";
import "./Sidebar.css";


// ─── Icon ─────────────────────────────────────────────────────────────────────
const Icon = ({ name, className = "" }) => (
  <i className={`${name} ${className}`} aria-hidden="true" />
);

// ─── Dữ liệu menu ─────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    id: "tongquan",
    label: "Tổng quan",
    icon: "fas fa-th-large",
    href: "/DoanhThu.html",
  },
  {
    id: "donhang",
    label: "Đơn hàng",
    icon: "fas fa-shopping-cart",
    badge: "0",
    children: [
      { label: "Tất cả đơn hàng",      href: "/DonHang.html" },
      { label: "Đơn hàng nháp",        href: "#" },
      { label: "Chưa hoàn tất",        href: "#" },
      { label: "Giao hàng hàng loạt",  href: "#" },
    ],
  },
  {
    id: "vanchuyen",
    label: "Vận chuyển",
    icon: "fas fa-truck",
    children: [
      { label: "Tổng quan",            href: "#" },
      { label: "Vận chuyển",           href: "#" },
      { label: "Quản lý thu hộ",       href: "#" },
      { label: "Đóng gói",             href: "#" },
      { label: "Biên bản bàn giao",    href: "#" },
      { label: "Biên bản hoàn hàng",   href: "#" },
    ],
  },
  {
    id: "sanpham",
    label: "Sản phẩm",
    icon: "fas fa-tag",
    children: [
      { label: "Tất cả sản phẩm", href: "/QuanLySanPham.html" },
      { label: "Nhóm sản phẩm",   href: "#" },
      { label: "Bảng giá",        href: "#" },
      { label: "Tồn kho",         href: "#" },
    ],
  },
  {
    id: "khachhang",
    label: "Khách hàng",
    icon: "fas fa-users",
    children: [
      { label: "Tất cả khách hàng",    href: "#" },
      { label: "Nhóm khách hàng",      href: "#" },
      { label: "Chiến dịch Broadcast", href: "#" },
      { label: "Kịch bản tự động",     href: "#" },
      { label: "Quản lý đánh giá",     href: "#" },
      { label: "Cấu hình thành viên",  href: "#" },
    ],
  },
  {
    id: "soquy",
    label: "Sổ quỹ",
    icon: "fas fa-dollar-sign",
    children: [
      { label: "Sổ quỹ",  href: "#" },
      { label: "Công nợ", href: "#" },
    ],
  },
  {
    id: "khuyenmai",
    label: "Khuyến mãi",
    icon: "fas fa-gift",
    href: "#",
  },
  {
    id: "baocao",
    label: "Báo cáo",
    icon: "fas fa-chart-bar",
    children: [
      { label: "Bảng phân tích",    href: "/DoanhThu.html" },
      { label: "Danh sách báo cáo", href: "#" },
    ],
  },
];

const MARKETING_ITEMS = [
  { id: "googleads", label: "Google Ads", icon: "fab fa-google", href: "#" },
];

const CONTENT_ITEMS = [
  { id: "dangbai",   label: "Đăng bài",          icon: "fas fa-pencil-alt", href: "/DangBai.html" },
  { id: "trangchu",  label: "Quản lý trang chủ", icon: "fas fa-home",       href: "/QuangLyTrangChu.html" },
  { id: "dangvideo", label: "Đăng video",         icon: "fas fa-video",      href: "/DangVideo.html" },
];

// ─── NavItem ──────────────────────────────────────────────────────────────────
function NavItem({ item, activeId, openId, onToggle, onActivate }) {
  const hasChildren = item.children && item.children.length > 0;
  const isOpen      = openId === item.id;
  const isActive    = activeId === item.id;

  const handleClick = () => {
    if (hasChildren) onToggle(item.id);
    else onActivate(item.id);
  };

  return (
    <li>
      {hasChildren ? (
        <button
          onClick={handleClick}
          className={`nav-top-btn${isOpen ? " open" : ""}${isActive ? " active" : ""}`}
          aria-expanded={isOpen}
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
        </button>
      ) : (
        <a
          href={item.href || "#"}
          onClick={() => onActivate(item.id)}
          className={`nav-top-link${isActive ? " active" : ""}`}
        >
          <Icon name={item.icon} className="nav-icon" />
          <span className="nav-label">{item.label}</span>
        </a>
      )}

      {hasChildren && (
        <ul
          className="submenu"
          style={{ maxHeight: isOpen ? `${item.children.length * 36}px` : "0" }}
        >
          {item.children.map((child) => {
            const childId = `${item.id}__${child.label}`;
            return (
              <li key={child.label}>
                <a
                  href={child.href}
                  className={`sub-link${activeId === childId ? " active" : ""}`}
                  onClick={() => onActivate(childId)}
                >
                  {child.label}
                </a>
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

// ─── Sidebar (export default) ─────────────────────────────────────────────────
export default function Sidebar({ defaultActive = "tongquan" }) {
  const [openId,   setOpenId]   = useState(null);
  const [activeId, setActiveId] = useState(defaultActive);

  useEffect(() => {
    NAV_ITEMS.forEach((item) => {
      if (item.children) {
        const match = item.children.find(
          (c) => `${item.id}__${c.label}` === activeId
        );
        if (match) setOpenId(item.id);
      }
    });
  }, [activeId]);

  const toggle   = (id) => setOpenId((prev) => (prev === id ? null : id));
  const activate = (id) => setActiveId(id);

  const sharedProps = { activeId, openId, onToggle: toggle, onActivate: activate };

  return (
    <nav className="sidebar" aria-label="Điều hướng chính">
      <a className="brand" href="#">
        <span className="brand-icon">
          <Icon name="fas fa-laugh-wink" />
        </span>
        <span className="brand-text">Thetra</span>
      </a>

      <ul className="nav-list">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.id} item={item} {...sharedProps} />
        ))}

        <li><hr className="divider" /></li>
        <li><SectionLabel label="Marketing" /></li>
        {MARKETING_ITEMS.map((item) => (
          <NavItem key={item.id} item={item} {...sharedProps} />
        ))}

        <li><hr className="divider" /></li>
        <li><SectionLabel label="Nội dung" /></li>
        {CONTENT_ITEMS.map((item) => (
          <NavItem key={item.id} item={item} {...sharedProps} />
        ))}

        <li><hr className="divider" /></li>
        <NavItem
          item={{ id: "cauhinh", label: "Cấu hình", icon: "fas fa-cog", href: "#" }}
          {...sharedProps}
        />
      </ul>
    </nav>
  );
}