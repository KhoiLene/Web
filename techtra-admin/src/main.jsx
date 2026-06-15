import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // Nạp component App - nơi gom Sidebar và Sản phẩm lại

// Tìm thẻ <div id="root"></div> trong file index.html và render giao diện React vào đó
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);