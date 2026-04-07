
export const MAIN_CATEGORIES = [
  "Produk Makanan dan Minuman",
  "Produk Kosmetik",
  "Produk Farmaseutikal",
  "Produk Barang Gunaan",
  "Perkhidmatan Logistik",
  "Rumah Sembelihan",
  "Pengilangan Kontrak/OEM",
  "Produk Peranti Perubatan",
  "Premis Makanan"
] as const;

export const FOOD_SUBCATEGORIES = [
  "Sos & Condimen",
  "Minuman",
  "Bahan Mentah / Kering",
  "Produk Sejuk Beku",
  "Produk Tenusu",
  "Produk Daging / Ayam",
  "Produk Bakeri",
  "Minyak & Lemak",
  "Rempah & Perencah",
  "Additives / Ingredient Food Grade",
  "Makanan Ringan",
  "Lain-lain (Other FMCG)"
] as const;

export type MainCategory = typeof MAIN_CATEGORIES[number];
export type FoodSubCategory = typeof FOOD_SUBCATEGORIES[number];

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ProductImages {
  front: string;
  back: string;
  halal: string;
}

// Legacy ProductData (Maintained for current App compatibility)
export interface ProductData {
  id: string; 
  userId: string;
  userName: string;
  namaProduk: string;
  namaPengeluar: string;
  alias?: string; // Nama Popular / Brand Name
  website?: string; // Social Media or Website URL
  phone?: string; // NEW: Phone Number
  halalRefNo?: string; // NEW: JAKIM Reference No (e.g. JAKIM.700-2/3/2...)
  facebook?: string; 
  tiktok?: string;   
  threads?: string;  
  instagram?: string;
  statusHalal: string;
  negaraAsal: string;
  negeriPengeluar?: string;
  saizProduk: string;
  bahanRamuan?: string; // Used for Ingredients OR Address (for Premis)
  mainCategory?: string;
  subCategory?: string;
  timestamp: number;
  approvalStatus: ApprovalStatus;
  images?: ProductImages;
  barcode?: string | null;
  expiryDate?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'user' | 'admin';
  phone?: string;
  dob?: string;
  totalContributions?: number; // Count of approved items
  points?: number; // Gamification Score
}

export enum AppPage {
  HOME = 'HOME',
  DASHBOARD = 'DASHBOARD',
  PROFILE = 'PROFILE',
  ADMIN_ADD_PRODUCT = 'ADMIN_ADD_PRODUCT',
  USER_ADD_PRODUCT = 'USER_ADD_PRODUCT', // Used for Contribute Tab
  LEADERBOARD = 'LEADERBOARD', // NEW: Leaderboard page
  ALL_CATEGORIES = 'ALL_CATEGORIES', // NEW: See all categories page
}

export enum AppState {
  LOGIN = 'LOGIN',
  WELCOME = 'WELCOME',
  IDLE = 'IDLE',
  CAMERA = 'CAMERA', // Removed BARCODE
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS',
  REVIEW_SUBMISSION = 'REVIEW_SUBMISSION', // NEW: For reviewing AI submission
  ERROR = 'ERROR'
}

export interface NewsItem {
  id: number;
  title: string;
  date: string;
  summary: string;
}

// --- Fasa 1: New Data Structures ---

export interface GeminiOutput {
  extractedText: string;
  suggestedFields: {
    name: string;
    brand: string;
    category: string;
    confidence: number;
    ingredients?: string; // Critical for detail extraction
  };
}

export interface ISubmission {
  id: string; // UID unik
  contributorUid: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  name: string; // Cadangan nama
  brand: string; // Cadangan jenama
  categorySuggestion: string; // Cadangan kategori JAKIM
  frontImageURL: string;
  backImageURL: string;
  halalLogoImageURL: string;
  geminiOutput: GeminiOutput;
  submissionTimestamp: number;
  ingredients?: string; // Add this to match SubmissionReview logic
}

export interface IProduct {
  id: string; // Sama seperti submission ID
  name: string;
  brand: string;
  halalCategory: string; // Kategori JAKIM yang diluluskan
  halalCertNo: string | null;
  approvedByUid: string;
  approvedTimestamp: number;
  ingredients?: string; // Detailed ingredients list (e.g. sauces breakdown)
  images?: ProductImages; // Included for UI compatibility
}
