import React, { useState } from "react";
import "./ProductGroup.css";
import CreateProductGroup from "./CreateProductGroup";

export default function ProductGroup() {
  const [isCreating, setIsCreating] = useState(false);

  /* ==========================================================================
     📌 NOTE 1: KHU VỰC DỮ LIỆU DANH SÁCH NHÓM SẢN PHẨM
     - Hiện tại: Đang dùng mảng cứng (Hardcoded) để hiển thị giao diện mẫu.
     - Sau khi làm Data xong: Bạn hãy xóa mảng 'groups' này đi. Thay vào đó bằng:
       1. Khai báo State: const [groups, setGroups] = useState([]);
       2. Gọi API trong useEffect() để fetch dữ liệu từ Database rồi setGroups(res.data).
     ========================================================================== */
  const groups = [
    { id: 1, name: "Sản phẩm nổi bật", count: 0, condition: "--" },
    { id: 2, name: "Sản phẩm khuyến mãi", count: 0, condition: "--" },
    { id: 3, name: "Trang chủ", count: 0, condition: "--" },
  ];
  // ─── END NOTE 1 ───────────────────────────────────────────────────────────

  if (isCreating) {
    return (
      <div className="product-group-wrapper">
        <CreateProductGroup onBack={() => setIsCreating(false)} />
      </div>
    );
  }

  return (
    <div className="product-group-wrapper">
      <div className="group-header">
        <h1>Danh sách nhóm sản phẩm</h1>
        <button className="btn-add-group" onClick={() => setIsCreating(true)}>
          <i className="fas fa-plus-circle"></i> Tạo nhóm sản phẩm
        </button>
      </div>

      <div className="group-container">
        <div className="filter-tab">
          <button className="tab-btn active">Tất cả danh mục</button>
        </div>

        <div className="search-filter-row">
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input type="text" placeholder="Tìm kiếm" />
          </div>
          <button className="btn-sort">
            <i className="fas fa-exchange-alt fa-rotate-90"></i>
          </button>
        </div>

        <div className="filter-action">
          <button className="btn-filter-trigger">
            <i className="fas fa-filter"></i> Bộ lọc
          </button>
          <button className="btn-add-filter">+</button>
        </div>

        <div className="summary-text">
          Có {groups.length} nhóm sản phẩm
        </div>

        <div className="table-responsive">
          <table className="group-table">
            <thead>
              <tr>
                <th width="40px"><input type="checkbox" /></th>
                <th>Tên nhóm</th>
                <th width="120px" style={{ textAlign: "right" }}>Số sản phẩm</th>
                <th width="150px">Điều kiện nhóm</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.id}>
                  <td><input type="checkbox" /></td>
                  <td>
                    <div className="group-name-cell">
                      <div className="img-placeholder">
                        <i className="far fa-image"></i>
                      </div>
                      <a href="#" className="group-link" onClick={(e) => e.preventDefault()}>
                        {group.name}
                      </a>
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>{group.count}</td>
                  <td className="condition-cell">{group.condition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}