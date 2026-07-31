/**
 * Angular dev-server proxy.
 *
 * Khi dev (`npm start` / `npm run dev`), Angular chạy ở http://localhost:4200
 * và không biết gì về backend. Mọi request `/api/*` sẽ bị SPA fallback
 * trả index.html → 404.
 *
 * File này forward `/api/*` sang backend Express (mặc định :5000, đổi bằng
 * API_TARGET trong env nếu cần). Trong production nginx.conf đã lo việc này,
 * dev dùng proxy để khỏi cần hardcode đường dẫn tuyệt đối.
 */
module.exports = {
  "/api": {
    target: process.env.API_TARGET || "http://localhost:5000",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
  },
};
