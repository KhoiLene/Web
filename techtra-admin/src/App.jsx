import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar/Sidebar.jsx";
import ProductManagement from "./components/ProductManagement/ProductManagement.jsx";
import ProductGroup from "./components/ProductGroup/ProductGroup.jsx";

export default function App() {
  // 👉 Lấy dữ liệu từ localStorage khi load lần đầu
  const [currentPage, setCurrentPage] = useState(() => {
    return localStorage.getItem("currentPage") || "all-products";
  });

  // 👉 Mỗi khi đổi trang → lưu lại
  useEffect(() => {
    localStorage.setItem("currentPage", currentPage);
  }, [currentPage]);

  const renderMainContent = () => {
    console.log("Hệ thống App đang render trang có ID:", currentPage);

    switch (currentPage) {
      case "all-products":
        return <ProductManagement />;

      case "product-groups":
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
    <div
      className="app-layout"
      style={{ display: "flex", minHeight: "100vh", width: "100vw" }}
    >
      <Sidebar
        currentActivePage={currentPage}
        onPageChange={setCurrentPage}
      />

      <div
        className="main-content-wrapper"
        style={{
          flex: 1,
          padding: "24px",
          backgroundColor: "#f9fafb",
          overflowY: "auto",
        }}
      >
        {renderMainContent()}
      </div>
    </div>
  );
}