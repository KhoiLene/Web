import React, { useState } from "react";
import Sidebar from "./components/Sidebar/Sidebar.jsx";
import ProductManagement from "./components/ProductManagement/ProductManagement.jsx";
import ProductGroup from "./components/ProductGroup/ProductGroup.jsx";

export default function App() {
  // Trang mặc định khi mới mở web lên: 'all-products' (Tất cả sản phẩm)
  const [currentPage, setCurrentPage] = useState("all-products");

  // Hàm này chịu trách nhiệm "bắn" giao diện tương ứng ra màn hình
  const renderMainContent = () => {
    console.log("Hệ thống App đang render trang có ID:", currentPage);
    
    switch (currentPage) {
      case "all-products":
        return <ProductManagement />;
        
      case "product-groups": // Chú ý: Phải viết thường, có gạch nối trùng khớp với pageId bên Sidebar
        return <ProductGroup />;
        
      default:
        return (
          <div style={{ padding: "24px", flex: 1, color: "#6b7280" }}>
            <h3>Tính năng đang được phát triển... (ID: {currentPage})</h3>
          </div>
        );
    }
  };

  return (
    <div className="app-layout" style={{ display: "flex", minHeight: "100vh", width: "100vw" }}>
      
      {/* Thanh Menu bên trái */}
      <Sidebar 
        currentActivePage={currentPage} 
        onPageChange={setCurrentPage} 
      />
      
      {/* Vùng nội dung hiển thị Component bên phải */}
      <div className="main-content-wrapper" style={{ flex: 1, padding: "24px", backgroundColor: "#f9fafb", overflowY: "auto" }}>
        {renderMainContent()}
      </div>

    </div>
  );
}