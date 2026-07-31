// trang-chu/homepage-bridge.js — ESM bridge để app.js (classic) dùng được homepageApi
// Load file này bằng <script type="module"> trước app.js
import { homepageApi } from "../api-service/api.js";

// Expose ra window để app.js (classic script) truy cập
window.homepageApi = homepageApi;
