// This file is no longer used as we've migrated to the backend API
// Keeping it for reference but all API calls now go through /api/* endpoints
export const supabase = null;

// Upload function is now handled by the backend
export async function uploadImage(file, folder = "products") {
  // This function is kept for compatibility but actual upload is handled by backend
  throw new Error('Image upload functionality has been moved to the backend API');
}