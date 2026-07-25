// import React, { useState } from "react";
// import Sidebar from "./components/Sidebar/Sidebar.jsx";
// import ProductManagement from "./components/ProductManagement/ProductManagement.jsx";
// import ProductGroup from "./components/ProductGroup/ProductGroup.jsx";
// import HomePage from "./components/HomePage/HomePage.jsx";
// import PriceList from "./components/PriceList/PriceList.jsx";
// import News from "./components/News/News.jsx";
// import NewsCategories from "./components/NewsCategories/NewsCategories.jsx";
// // import UploadManager from "./components/UploadManager/UploadManager.jsx";
// import GroupsTab from "./components/GroupsTab/GroupsTab.jsx";
// import AboutContentTab from "./components/AboutContentTab/AboutContentTab.jsx";
// import VideoTab from "./components/VideoTab/VideoTab.jsx";

// export default function App() {
//   // Trang mặc định khi mới mở web lên: 'all-products' (Tất cả sản phẩm)
//   const [currentPage, setCurrentPage] = useState("all-products");

//   // Hàm này chịu trách nhiệm "bắn" giao diện tương ứng ra màn hình
//   const renderMainContent = () => {
//     console.log("Hệ thống App đang render trang có ID:", currentPage);

//     switch (currentPage) {
//       case "all-products":
//         return <ProductManagement />;

//       case "product-groups": // Chú ý: Phải viết thường, có gạch nối trùng khớp với pageId bên Sidebar
//         return <ProductGroup />;

//       case "price-list":
//         return <PriceList />;

//       case "news":
//         return <News />;

//       case "news-categories":
//         return <NewsCategories />;

//       case "manage-home":
//         return <HomePage />;

//       case "upload-group":
//         return <GroupsTab />;
//       case "upload":
//         return <AboutContentTab />;
//       case "videos":
//         return<VideoTab />;

//       default:
//         return (
//           <div style={{ padding: "24px", flex: 1, color: "#6b7280" }}>
//             <h3>Tính năng đang được phát triển... (ID: {currentPage})</h3>
//           </div>
//         );
//     }
//   };

//   return (
//     <div className="app-layout" style={{ display: "flex", minHeight: "100vh", width: "100vw" }}>
      
//       {/* Thanh Menu bên trái */}
//       <Sidebar 
//         currentActivePage={currentPage} 
//         onPageChange={setCurrentPage} 
//       />
      
//       {/* Vùng nội dung hiển thị Component bên phải */}
//       <div className="main-content-wrapper" style={{ flex: 1, padding: "24px", backgroundColor: "#f9fafb", overflowY: "auto" }}>
//         {renderMainContent()}
//       </div>

//     </div>
//   );
// }

import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar/Sidebar.jsx";
import ProductManagement from "./components/ProductManagement/ProductManagement.jsx";
import ProductGroup from "./components/ProductGroup/ProductGroup.jsx";
import HomePage from "./components/HomePage/HomePage.jsx";
import PriceList from "./components/PriceList/PriceList.jsx";
import News from "./components/News/News.jsx";
import NewsCategories from "./components/NewsCategories/NewsCategories.jsx";
// import UploadManager from "./components/UploadManager/UploadManager.jsx";
import GroupsTab from "./components/GroupsTab/GroupsTab.jsx";
import AboutContentTab from "./components/AboutContentTab/AboutContentTab.jsx";
import VideoTab from "./components/VideoTab/VideoTab.jsx";
import ProductInventoryImport from "./components/ProductInventoryImport/ProductInventoryImport.jsx";
import AllCustomers from "./components/AllCustomers/AllCustomers.jsx";
import AllOrders from "./components/DonHang/AllOrders.jsx";
import DraftOrders from "./components/DonHang/DraftOrders.jsx";
import IncompleteOrders from "./components/DonHang/IncompleteOrders.jsx";
import Settings from "./components/Settings/Settings.jsx";
import Dashboard from "./components/Dashboard/Dashboard.jsx";

// Key lưu trang đang mở vào localStorage, để reload (F5) vẫn giữ nguyên trang
const CURRENT_PAGE_STORAGE_KEY = "app_current_page";
const DEFAULT_PAGE = "dashboard";

export default function App() {
  // Trang mặc định khi mới mở web lên: 'all-products' (Tất cả sản phẩm).
  // Nếu trước đó đã lưu lại trang đang mở (localStorage), ưu tiên khôi phục lại trang đó.
  const [currentPage, setCurrentPage] = useState(() => {
    try {
      return localStorage.getItem(CURRENT_PAGE_STORAGE_KEY) || DEFAULT_PAGE;
    } catch {
      return DEFAULT_PAGE;
    }
  });

  // Mỗi khi đổi trang, lưu lại vào localStorage để F5/đóng mở lại tab vẫn nhớ
  useEffect(() => {
    try {
      localStorage.setItem(CURRENT_PAGE_STORAGE_KEY, currentPage);
    } catch {
      /* localStorage có thể bị chặn (chế độ ẩn danh...), bỏ qua nếu lỗi */
    }
  }, [currentPage]);

  // Hàm này chịu trách nhiệm "bắn" giao diện tương ứng ra màn hình
  const renderMainContent = () => {
    console.log("Hệ thống App đang render trang có ID:", currentPage);

    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;

      case "all-products":
        return <ProductManagement />;

      case "product-groups": // Chú ý: Phải viết thường, có gạch nối trùng khớp với pageId bên Sidebar
        return <ProductGroup />;

      case "price-list":
        return <PriceList />;

      case "news":
        return <News />;

      case "news-categories":
        return <NewsCategories />;

      case "manage-home":
        return <HomePage />;

      case "upload-group":
        return <GroupsTab />;
      case "upload":
        return <AboutContentTab />;
      case "videos":
        return <VideoTab />;

      case "inventory":
        return <ProductInventoryImport />;

      case "all-customers":
        return <AllCustomers />;

      case "all-orders":
        return <AllOrders />;
      case "draft-orders":
        return <DraftOrders />;
      case "incomplete-orders":
        return <IncompleteOrders />;

      case "settings":
        return <Settings />;

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