
import { ProductData } from "../types";

export interface OpenFoodFactsResult {
  found: boolean;
  data?: Partial<ProductData>;
  imageUrl?: string; // Original URL
  imageBase64?: string; // Converted for App compatibility
}

const urlToBase64 = async (url: string): Promise<string> => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Image conversion failed", e);
        return '';
    }
};

export const fetchProductFromOpenFoodFacts = async (barcode: string): Promise<OpenFoodFactsResult> => {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const json = await response.json();

    if (json.status === 1 && json.product) {
      const p = json.product;
      
      const imageUrl = p.image_front_url || p.image_url || '';
      const imageBase64 = imageUrl ? await urlToBase64(imageUrl) : '';

      // Map to our ProductData structure
      const data: Partial<ProductData> = {
        namaProduk: p.product_name_ms || p.product_name || '',
        namaPengeluar: p.brands || p.manufacturing_places || '',
        bahanRamuan: p.ingredients_text_ms || p.ingredients_text_en || p.ingredients_text || '',
        barcode: barcode,
        negaraAsal: (p.countries_tags?.includes('en:malaysia') || p.countries?.toLowerCase().includes('malaysia')) ? 'Malaysia' : (p.countries || 'Luar Negara'),
        saizProduk: p.quantity || '',
        mainCategory: 'Produk Makanan dan Minuman', // Default assumption
        statusHalal: '', // To be verified by user
      };

      return {
        found: true,
        data,
        imageUrl,
        imageBase64
      };
    }
    
    return { found: false };
  } catch (error) {
    console.error("OpenFoodFacts Error:", error);
    return { found: false };
  }
};
