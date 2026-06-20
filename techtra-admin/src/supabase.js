import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,   // lấy từ Supabase → Settings → API
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Upload ảnh lên Storage, trả về URL thật
export async function uploadImage(file, folder = "products") {
  const ext      = file.name.split(".").pop();
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from("product-images")
    .upload(fileName, file, { upsert: true });

  if (error) throw new Error("Upload ảnh thất bại: " + error.message);

  const { data } = supabase.storage
    .from("product-images")
    .getPublicUrl(fileName);

  return data.publicUrl; // ← URL thật, lưu vào database được
}