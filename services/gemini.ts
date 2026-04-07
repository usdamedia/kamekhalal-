
import { ProductData, ProductImages, GeminiOutput } from "../types";
export const AUTOMATION_DISABLED_MESSAGE = "Fungsi automatik dimatikan untuk release ini. Sila isi maklumat secara manual.";
export const AI_DISABLED_MESSAGE = AUTOMATION_DISABLED_MESSAGE;

// Helper to clean base64
const clean = (b64: string) => {
    if (!b64) return "";
    return b64.split(',')[1] || b64;
};

export const extractBarcodeFromImage = async (base64Image: string): Promise<string | null> => {
  if (!base64Image) return null;
  console.warn(AUTOMATION_DISABLED_MESSAGE);
  return null;
};

// Legacy Analysis (Maintained for backward compatibility)
export const analyzeProductImage = async (images: ProductImages): Promise<ProductData> => {
  void images;
  throw new Error(AUTOMATION_DISABLED_MESSAGE);
};

// Specific function to extract ingredients from a single image (RAMUAN)
export const extractIngredientsFromImage = async (base64Image: string): Promise<string> => {
    void clean(base64Image);
    throw new Error(AUTOMATION_DISABLED_MESSAGE);
};

// --- Fasa 3: New AI Analysis for Submission Workflow ---
export const analyzeHalalProduct = async (
  images: { front: string; back: string; halal: string },
  categories: readonly string[]
): Promise<GeminiOutput> => {
  void images;
  void categories;
  throw new Error(AUTOMATION_DISABLED_MESSAGE);
};

export const processStudioImages = async (originalImages: ProductImages): Promise<ProductImages> => {
    console.warn(AUTOMATION_DISABLED_MESSAGE);
    return originalImages;
};

// Utility to compress images before upload to Firestore (Fix Payload Limit Exceeded)
export const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Reduce dimensions to ~800px to ensure base64 size is small (< 200KB)
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
             ctx.drawImage(img, 0, 0, width, height);
             // Compress to JPEG at 70% quality
             resolve(canvas.toDataURL('image/jpeg', 0.7));
        } else {
             reject(new Error("Canvas context is null"));
        }
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};
