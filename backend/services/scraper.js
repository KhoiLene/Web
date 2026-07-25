// backend/services/scraper.js
// Dùng @mozilla/readability + jsdom để tách nội dung bài báo.
// Trả về { title, content (HTML), textContent, excerpt, siteName, image, byline, length, sourceUrl }.

const { Readability, isProbablyReaderable } = require('@mozilla/readability');
const { JSDOM, ResourceLoader } = require('jsdom');
const fetch = require('node-fetch');

// User-Agent giả desktop Chrome — tránh 1 số site chặn UA bot
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Lấy site name đẹp từ URL (vd: "vnexpress.net" -> "VnExpress")
function niceSiteName(host) {
  const map = {
    'vnexpress.net': 'VnExpress',
    'tuoitre.vn': 'Tuổi Trẻ',
    'thanhnien.vn': 'Thanh Niên',
    'dantri.com.vn': 'Dân Trí',
    'vietnamnet.vn': 'VietnamNet',
    'nhandan.vn': 'Nhân Dân',
    'tienphong.vn': 'Tiền Phong',
    'zingnews.vn': 'Zing News',
    'soha.vn': 'Soha',
    'kenh14.vn': 'Kenh14',
    '24h.com.vn': '24h',
    'baomoi.com': 'Báo Mới',
    'cafef.vn': 'CafeF',
    'cafebiz.vn': 'CafeBiz',
  };
  for (const [k, v] of Object.entries(map)) {
    if (host.includes(k)) return v;
  }
  // fallback: lấy phần tên miền
  return host.replace(/^www\./, '').split('.')[0].replace(/(^|\s)\w/g, (c) => c.toUpperCase());
}

function pickOgImage(doc) {
  const meta = (name) =>
    doc.querySelector(`meta[property="${name}"]`)?.getAttribute('content') ||
    doc.querySelector(`meta[name="${name}"]`)?.getAttribute('content');
  return meta('og:image') || meta('twitter:image') || null;
}

function pickSiteName(doc, host) {
  return (
    doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') ||
    niceSiteName(host)
  );
}

function absolutizeUrl(base, maybeRelative) {
  if (!maybeRelative) return null;
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return null;
  }
}

/**
 * Scrape 1 bài báo từ URL.
 * @param {string} url
 * @returns {Promise<{title:string, content:string, textContent:string, excerpt:string, siteName:string, image:string|null, byline:string|null, length:number, sourceUrl:string}>}
 */
async function scrapeArticle(url) {
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new Error('URL không hợp lệ (phải bắt đầu bằng http:// hoặc https://)');
  }

  const res = await fetch(url, {
    redirect: 'follow',
    timeout: 20000,
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} khi tải trang`);
  }
  const html = await res.text();
  if (!html || html.length < 500) {
    throw new Error('Trang trả về rỗng / quá ngắn — có thể bị chặn');
  }

  const dom = new JSDOM(html, { url, contentType: 'text/html; charset=utf-8' });
  const doc = dom.window.document;

  // Nếu site không phải "readerable" → vẫn cố parse, có thể trả kết quả kém
  const parseable = isProbablyReaderable(doc);

  const reader = new Readability(doc, { debug: false, charThreshold: 200 });
  const article = reader.parse();

  if (!article || !article.title) {
    throw new Error('Không tách được nội dung — site có thể chặn hoặc cấu trúc không chuẩn');
  }

  const u = new URL(url);
  const siteName = pickSiteName(doc, u.hostname);
  const ogImage  = pickOgImage(doc);
  const topImage = article.topImage || null;

  // Ưu tiên ảnh từ og:image; nếu không có thì lấy ảnh đầu tiên trong bài
  let image = absolutizeUrl(url, ogImage) || absolutizeUrl(url, topImage);
  if (!image) {
    const firstImg = doc.querySelector('article img, .content img, .article img');
    if (firstImg) image = absolutizeUrl(url, firstImg.getAttribute('src'));
  }

  // Excerpt = text thuần 200 ký tự đầu
  const plain = (article.textContent || '').replace(/\s+/g, ' ').trim();
  const excerpt = plain.slice(0, 220) + (plain.length > 220 ? '…' : '');

  return {
    title: article.title.trim(),
    content: article.content || '', // HTML đã sạch
    textContent: plain,
    excerpt,
    siteName,
    image,
    byline: article.byline || null,
    length: plain.length,
    sourceUrl: url,
    parseable,
  };
}

module.exports = { scrapeArticle };
