// src/utils/productHelpers.js
import { productsApi } from "../../api";

// ─── Tạo slug từ tên tiếng Việt ───────────────────────────────────────
export function toSlug(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

// ─── Tính giá sau giảm từ giá gốc + % giảm giá ────────────────────────
// Dùng chung ở cả CreateProduct và ProductManagement để 2 nơi luôn khớp số.
export function computeFinalPrice(price, discount) {
  const basePrice   = Number(price) || 0;
  const discountPct = Math.min(100, Math.max(0, Number(discount) || 0));
  return Math.round(basePrice * (1 - discountPct / 100));
}

// ─── Sinh slug không trùng, dựa trên danh sách slug hiện có trong DB ──
export async function generateUniqueSlug(name, sku, excludeId = null) {
  const baseSlug = toSlug(name) || toSlug(sku) || `sp-${Date.now()}`;
  const existingSlugs = new Set(await productsApi.getAllSlugs(excludeId));
  let slug = baseSlug;
  let i = 1;
  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${++i}`;
  }
  return slug;
}

// ─── Validate toàn bộ form trước khi lưu ──────────────────────────────
// Trả về { isValid, missing[], parsed{} } — parsed chứa các số đã parse
// sẵn để buildProductPayload dùng lại, khỏi parse 2 lần.
export function validateProductForm(form) {
  const missing = [];

  if (!form.productName?.trim())                                    missing.push("Tên sản phẩm");
  if (!form.mainImage)                                               missing.push("Ảnh chính");
  if (!form.category)                                                missing.push("Hạng mục");
  if (!form.description || !form.description.replace(/<[^>]*>/g, "").trim())
    missing.push("Mô tả sản phẩm");

  const stockNum  = parseInt(form.stock, 10);
  const priceNum  = parseFloat(form.price);
  const weightNum = parseFloat(form.weight);
  const heightNum = parseFloat(form.height);
  const widthNum  = parseFloat(form.width);
  const lengthNum = parseFloat(form.length);

  if (Number.isNaN(stockNum)  || stockNum  < 0)  missing.push("Hàng có sẵn (số nguyên ≥ 0)");
  if (Number.isNaN(priceNum)  || priceNum  <= 0)  missing.push("Giá bán lẻ (> 0)");
  if (Number.isNaN(weightNum) || weightNum <= 0)  missing.push("Trọng lượng (> 0)");
  if (Number.isNaN(heightNum) || heightNum <= 0)  missing.push("Chiều cao (> 0)");
  if (Number.isNaN(widthNum)  || widthNum  <= 0)  missing.push("Chiều rộng (> 0)");
  if (Number.isNaN(lengthNum) || lengthNum <= 0)  missing.push("Chiều dài (> 0)");
  if (!form.shippingMethod)                                          missing.push("Cách giao hàng");
  if (form.shippingMethod === "custom" && !form.jtServices?.some((s) => s.active)) {
    missing.push("Chọn ít nhất 1 dịch vụ J&T (Tùy chỉnh)");
  }

  return {
    isValid: missing.length === 0,
    missing,
    parsed: { stockNum, priceNum, weightNum, heightNum, widthNum, lengthNum },
  };
}

// ─── Build payload gửi lên productsApi từ state form + số đã parse ───
export function buildProductPayload(form, parsed) {
  const activeJtCodes = (form.jtServices || [])
    .filter((s) => s.active)
    .map((s) => s.code);

  return {
    name:          form.productName,
    stock:         parsed.stockNum,
    price:         parsed.priceNum,
    discount:      parseFloat(form.discount) || 0,
    sku:           form.sku || null,
    slug:          form.slug || toSlug(form.productName),
    description:   form.description || "",
    group_id:      form.category,
    cod_enabled:   form.codEnabled,
    is_active:     form.isActive,
    shipping_type: form.shippingMethod,
    jt_services:   activeJtCodes,
    weight:        parsed.weightNum,
    weight_unit:   form.weightUnit,
    height:        parsed.heightNum,
    width:         parsed.widthNum,
    length:        parsed.lengthNum,
    is_bulky:      form.isBulky,
    images:        [form.mainImage, ...(form.subImages || [])].filter(Boolean),
    video_url:     form.videoPreview,
    content_file:  form.pdfUrl,
  };
}

// ─── Hàm tổng: validate → build payload → gọi create/update ─────────
// Trả về { success, missing? , error? } để component tự quyết định
// hiển thị alert hay không, không throw để tránh crash UI.
export async function saveProduct(form, { isEditing = false, productId = null } = {}) {
  const { isValid, missing, parsed } = validateProductForm(form);
  if (!isValid) {
    return { success: false, missing };
  }

  const payload = buildProductPayload(form, parsed);

  try {
    if (isEditing) {
      await productsApi.update(productId, payload);
    } else {
      await productsApi.create(payload);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}