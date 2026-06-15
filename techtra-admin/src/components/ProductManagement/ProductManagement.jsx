import React, { useState } from "react";
import "./ProductManagement.css"; // Đường dẫn trỏ tới file CSS sản phẩm của bạn
import CreateProduct from "./CreateProduct.jsx"; // Nạp component form tạo sản phẩm

export default function ProductManagement() {
  // ─── State kiểm soát việc bật/tắt form tạo mới sản phẩm ───
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // NẾU CLICK NÚT THÊM -> CHUYỂN SANG RENDERING FORM ĐIỀN THÔNG TIN (Hình 3)
  if (isCreatingProduct) {
    return (
      <CreateProduct onBack={() => setIsCreatingProduct(false)} />
    );
  }

  // MẶC ĐỊNH HIỂN THỊ DANH SÁCH & TIỆN ÍCH QUẢN LÝ SẢN PHẨM
  return (
    <div className="main-content">
      <div className="page-header">
        <h1>Quản lý sản phẩm</h1>
      </div>

      <div className="action-section">
        <h2>Niêm yết sản phẩm bằng phương thức bạn muốn</h2>

        <div className="action-cards">
          {/* CARD 1: THÊM TỪNG SẢN PHẨM */}
          <div className="action-card">
            <div className="card-icon">+</div>
            <h3>Thêm từng sản phẩm</h3>
            <p>Thêm sản phẩm bằng cách tự nhập thông tin.</p>
            {/* SỬA: Gắn sự kiện chuyển trang khi click */}
            <button 
              className="btn btn-primary" 
              onClick={() => setIsCreatingProduct(true)}
            >
              Thêm sản phẩm
            </button>
          </div>

          <div className="action-card">
            <div className="card-icon">📋</div>
            <h3>Niêm yết sản phẩm hiện có</h3>
            <p>Tìm kiếm sản phẩm khớp trên Website để tự động điền thông tin niêm yết.</p>
          </div>

          <div className="action-card">
            <div className="card-icon">↑</div>
            <h3>Tải lên hàng loạt</h3>
            <p>Niêm yết many sản phẩm cùng lúc bằng mẫu Excel.</p>
          </div>

          <div className="action-card">
            <div className="card-icon">Q</div>
            <h3>Sản phẩm không bán</h3>
            <p>Sản phẩm không bày bán chỉ có thể dùng qua công cụ khi mua. Khách hàng không thấy.</p>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button className="tab active">Tất cả</button>
        <button className="tab">Trên kệ</button>
        <button className="tab">Đang xem xét</button>
        <button className="tab">Cần chú ý</button>
        <button className="tab">Đã vô hiệu hóa</button>
        <button className="tab">Bán nhập</button>
        <button className="tab">Đã xóa</button>
      </div>

      {/* TRẠNG THÁI TRỐNG (EMPTY STATE) */}
      <div className="empty-state">
        <div className="empty-icon">😊</div>
        <h3>Chưa có sản phẩm</h3>
        <p>Bắt đầu bằng cách thêm sản phẩm hoặc kiểm tra các cách niêm yết khác.</p>
        <div className="empty-actions">
          {/* SỬA: Gắn luôn sự kiện vào nút Thêm sản phẩm ở đây để dự phòng */}
          <button 
            className="btn btn-primary" 
            onClick={() => setIsCreatingProduct(true)}
          >
            Thêm sản phẩm
          </button>
          <button className="btn btn-secondary">Xem các cách niêm yết</button>
        </div>
      </div>
    </div>
  );
}