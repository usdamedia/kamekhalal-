
import React, { useState } from 'react';
import { ProductData, MAIN_CATEGORIES, ProductImages, GeminiOutput } from '../types';
import { ArrowLeft, Upload, Image as ImageIcon, Save, Package, FileText, Camera, MapPin, Loader2, ChevronDown, FileText as FileCsv, Download, Table, Building2, Sparkles, Wand2, Zap, ShieldCheck, Store, Calendar, ClipboardPaste, Globe, AtSign, Facebook, Instagram, Video, Share2, Phone, Hash } from 'lucide-react';
import CameraCapture from './CameraCapture';
import { AUTOMATION_DISABLED_MESSAGE, analyzeHalalProduct, compressImage, extractIngredientsFromImage } from '../services/gemini';

interface AdminAddProductPageProps {
  onSave: (data: Omit<ProductData, 'id' | 'userId' | 'userName' | 'timestamp' | 'approvalStatus'>) => Promise<void>;
  onCancel: () => void;
}

const MALAYSIA_STATES = [
    "Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan", "Pahang", "Perak", "Perlis", 
    "Pulau Pinang", "Sabah", "Sarawak", "Selangor", "Terengganu", "W.P. Kuala Lumpur", 
    "W.P. Labuan", "W.P. Putrajaya", "Luar Negara"
];

const SLAUGHTER_SUBCATEGORIES = [
    "Ayam", "Lembu", "Kambing", "Kerbau", "Itik", "Lain-lain"
];

const AdminAddProductPage: React.FC<AdminAddProductPageProps> = ({ onSave, onCancel }) => {
  // Ensure 'camera' is included in the generic type definition to prevent TS comparison errors
  const [activeTab, setActiveTab] = useState<'manual' | 'csv' | 'camera'>('manual');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false); // For CSV AI
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false); // For Camera AI & Manual Upload Analysis
  const [isExtractingIngredients, setIsExtractingIngredients] = useState(false);
  
  // --- Manual Form State ---
  const [formData, setFormData] = useState({
    namaProduk: '',
    namaPengeluar: '',
    alias: '', 
    website: '',
    phone: '',
    halalRefNo: '',
    facebook: '',
    tiktok: '',
    threads: '',
    instagram: '',
    statusHalal: 'HALAL JAKIM',
    negaraAsal: 'Malaysia',
    negeriPengeluar: '',
    saizProduk: '',
    bahanRamuan: '', // Will store Address for Premis
    mainCategory: MAIN_CATEGORIES[0] as string,
    subCategory: '',
    barcode: '',
    expiryDate: ''
  });
  const [images, setImages] = useState<ProductImages>({ front: '', back: '', halal: '' });

  // --- CSV Import State ---
  const [csvTextInput, setCsvTextInput] = useState("");
  const [importedData, setImportedData] = useState<any[]>([]);

  const isSlaughterHouse = formData.mainCategory === "Rumah Sembelihan";
  const isFoodPremise = formData.mainCategory === "Premis Makanan";
  const isConsumerGoods = formData.mainCategory === "Produk Barang Gunaan";
  const isFoodOrBeverage = formData.mainCategory === "Produk Makanan dan Minuman";

  const IMAGE_LABELS: Record<string, string> = {
      front: 'FRONT',
      back: 'RAMUAN', // Changed from BACK as requested
      halal: 'HALAL'
  };

  // --- Manual Logic ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: keyof ProductImages) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Compressing image to Base64 (Resize & Quality reduction to keep app light)
        const compressedBase64 = await compressImage(file);
        setImages(prev => ({ ...prev, [type]: compressedBase64 }));
      } catch (error) {
        console.error("Error compressing image", error);
        alert("Ralat memproses imej. Sila cuba lagi.");
      }
    }
  };

  // Extract ingredients ONLY from the 'Ramuan' (Back) image
  const handleExtractIngredients = async () => {
      if (!images.back) return;
      setIsExtractingIngredients(true);
      try {
          const text = await extractIngredientsFromImage(images.back);
          if (text) {
              setFormData(prev => ({ ...prev, bahanRamuan: text }));
          } else {
              alert("Tiada teks ramuan dikesan.");
          }
      } catch (error) {
          console.error("Ingredients extraction failed", error);
          alert(AUTOMATION_DISABLED_MESSAGE);
      } finally {
          setIsExtractingIngredients(false);
      }
  };

  // Full Analysis from uploaded images
  const handleAnalyzeUploadedImages = async () => {
      // Basic check: Need at least Front OR Back to do meaningful analysis
      if (!images.front && !images.back) {
          alert("Sila muat naik sekurang-kurangnya gambar Depan atau Ramuan untuk semakan.");
          return;
      }

      setIsAnalyzingImage(true);

      try {
          const result: GeminiOutput = await analyzeHalalProduct(images, MAIN_CATEGORIES);

          setFormData(prev => ({
              ...prev,
              namaProduk: result.suggestedFields.name || prev.namaProduk,
              namaPengeluar: result.suggestedFields.brand || prev.namaPengeluar,
              mainCategory: result.suggestedFields.category || prev.mainCategory,
              bahanRamuan: result.suggestedFields.ingredients || prev.bahanRamuan, // Extract OCR ingredients to textbox
              statusHalal: 'HALAL JAKIM', // Default suggestion
          }));

      } catch (error) {
          console.error("Manual Upload Analysis Failed", error);
          alert(AUTOMATION_DISABLED_MESSAGE);
      } finally {
          setIsAnalyzingImage(false);
      }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaPengeluar) {
        alert(isSlaughterHouse || isFoodPremise ? "Sila isi nama syarikat." : "Sila isi nama pengeluar.");
        return;
    }
    if (!formData.namaProduk) {
         alert(isSlaughterHouse ? "Sila isi alamat ringkas." : isFoodPremise ? "Sila isi nama jenama." : "Sila isi nama produk.");
         return;
    }

    setIsSubmitting(true);
    try {
        await onSave({ ...formData, images });
    } catch (error) {
        console.error(error);
        setIsSubmitting(false);
    }
  };

  // --- Camera Capture ---
  const handleAiCapture = async (capturedImages: ProductImages) => {
    setIsAnalyzingImage(true);
    // Temporarily hide camera UI by checking isAnalyzingImage in render
    
    try {
        // Use the existing service used by users
        const result: GeminiOutput = await analyzeHalalProduct(capturedImages, MAIN_CATEGORIES);
        
        // Populate form with AI results
        setFormData(prev => ({
            ...prev,
            namaProduk: result.suggestedFields.name || '',
            namaPengeluar: result.suggestedFields.brand || '',
            mainCategory: result.suggestedFields.category || MAIN_CATEGORIES[0],
            bahanRamuan: result.suggestedFields.ingredients || '', // Detailed ingredients from AI
            statusHalal: 'HALAL JAKIM', // Default assumption, admin checks image
        }));

        setImages(capturedImages);
        
        // Switch back to manual tab for review
        setActiveTab('manual');
        setIsAnalyzingImage(false);
        
    } catch (error) {
        console.error("AI Analysis Failed", error);
        alert(AUTOMATION_DISABLED_MESSAGE);
        setIsAnalyzingImage(false);
        setActiveTab('manual');
    }
  };

  // --- CSV Logic ---
  const handleDownloadTemplate = () => {
    // UPDATED TEMPLATE based on user request
    let headers = ["Nama Produk/Syarikat", "Alamat", "Negeri", "Negara", "No Telefon", "Website", "No Rujukan Halal", "Tarikh Luput"];
    let rowExample = ["Restoran Maju Sdn Bhd", "No 1 Jalan Maju", "Selangor", "Malaysia", "03-12345678", "www.maju.com", "JAKIM.700-2/3/2 090-11/2021", "2025-12-31"];
    
    if(!isFoodPremise) {
        headers = ["Nama Produk", "Pengeluar", "Kategori", "Status Halal", "Negara Asal", "Bahan Ramuan", "Barcode", "Ref No"];
        rowExample = ["Kicap Manis", "Syarikat ABC", "Produk Makanan dan Minuman", "HALAL JAKIM", "Malaysia", "Kacang soya, gula", "955123456789", "MS1500:2009"];
    }

    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rowExample.join(",");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_import.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processCSVWithAI = async (csvText: string) => {
      if (!csvText || csvText.trim().length < 5) {
          alert("Sila masukkan teks CSV yang sah.");
          return;
      }

      setIsAiProcessing(true);
      try {
          void csvText;
          setImportedData([]);
          alert("Import CSV automatik telah dimatikan.");
      } catch (error) {
          console.error("AI CSV Processing Error:", error);
          alert(AUTOMATION_DISABLED_MESSAGE);
      } finally {
          setIsAiProcessing(false);
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // ... existing ...
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        const text = evt.target?.result as string;
        if (text) { processCSVWithAI(text); }
    };
    reader.readAsText(file);
  };

  const handleBulkImport = async () => {
      // ... existing ...
      if (importedData.length === 0) return;
      setIsSubmitting(true);
      let successCount = 0;
      for (const item of importedData) {
          try { await onSave(item); successCount++; } catch (e) { console.error(e); }
      }
      setIsSubmitting(false);
      alert(`Import Selesai! ${successCount}/${importedData.length} rekod berjaya ditambah.`);
      setImportedData([]);
      setCsvTextInput("");
  };

  // Reusable component for Social Media Inputs
  const SocialMediaInputs = ({ aliasLabel = "Nama Popular (Alias)", aliasPlaceholder = "cth: Zias Catering" }: { aliasLabel?: string, aliasPlaceholder?: string }) => (
      <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1 flex items-center gap-1"><AtSign size={10}/> {aliasLabel}</label>
              <input name="alias" value={formData.alias} onChange={handleChange} className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3.5 text-sm" placeholder={aliasPlaceholder} />
          </div>
          <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1 flex items-center gap-1"><Globe size={10}/> Laman Web</label>
              <input name="website" value={formData.website} onChange={handleChange} className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3.5 text-sm" placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1 flex items-center gap-1"><Facebook size={10}/> Facebook</label>
              <input name="facebook" value={formData.facebook} onChange={handleChange} className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3.5 text-sm" placeholder="Link FB" />
          </div>
          <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1 flex items-center gap-1"><Instagram size={10}/> Instagram</label>
              <input name="instagram" value={formData.instagram} onChange={handleChange} className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3.5 text-sm" placeholder="Link IG" />
          </div>
          <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1 flex items-center gap-1"><Video size={10}/> TikTok</label>
              <input name="tiktok" value={formData.tiktok} onChange={handleChange} className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3.5 text-sm" placeholder="Link TikTok" />
          </div>
          <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1 flex items-center gap-1"><Share2 size={10}/> Threads</label>
              <input name="threads" value={formData.threads} onChange={handleChange} className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3.5 text-sm" placeholder="Link Threads" />
          </div>
      </div>
  );

  // --- RENDERERS ---

  if (activeTab === 'camera') {
     return <CameraCapture onCapture={handleAiCapture} onCancel={() => setActiveTab('manual')} mode="product" />;
  }

  if (isAnalyzingImage) {
      return (
          <div className="fixed inset-0 z-[60] bg-[#FDFBF7]/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 relative shadow-xl shadow-stone-200 border border-stone-50">
                  <Loader2 className="w-12 h-12 text-stone-300 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
                  </div>
              </div>
              <h3 className="text-2xl font-bold text-stone-800 mb-3 tracking-tight">AI Sedang Menganalisis</h3>
              <p className="text-stone-500 text-base max-w-xs leading-relaxed font-medium">
                  Sedang mengekstrak maklumat produk dan ramuan daripada imej yang dimuat naik...
              </p>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-32 animate-in slide-in-from-right duration-300 font-sans text-stone-800">
      
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#FDFBF7]/90 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-stone-100/50">
         <div className="flex items-center gap-4">
            <button onClick={onCancel} className="p-2 -ml-2 text-stone-500 hover:bg-stone-100 rounded-full transition-colors active:scale-95">
                <ArrowLeft size={22} />
            </button>
            <div>
                <h1 className="text-lg font-bold text-stone-800 leading-tight">Tambah Rekod</h1>
                <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wide">Pangkalan Data</p>
            </div>
         </div>
      </div>

      <div className="p-6 max-w-lg mx-auto space-y-6">
        
        {/* Category Selector */}
        <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm">
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1 mb-2 block">Kategori Rekod</label>
            <div className="relative">
                <select name="mainCategory" value={formData.mainCategory} onChange={handleChange} className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3.5 text-sm text-stone-800 focus:outline-none focus:border-stone-400 appearance-none font-bold">
                    {MAIN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400" size={16}/>
            </div>
        </div>

        {/* Tabs - Now 3 Columns */}
        <div className="bg-stone-100 p-1 rounded-2xl flex gap-1 mb-6">
            <button 
                onClick={() => setActiveTab('manual')}
                className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'manual' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400 hover:text-stone-600'}`}
            >
                Manual
            </button>
            <button 
                onClick={() => setActiveTab('camera')}
                className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-stone-400 hover:text-stone-600`}
            >
                <Wand2 size={14} /> Kamera
            </button>
            <button 
                onClick={() => setActiveTab('csv')}
                className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'csv' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400 hover:text-stone-600'}`}
            >
                Import CSV
            </button>
        </div>

        {/* --- MANUAL FORM --- */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
             
             {/* Info Box if data filled from AI */}
             {formData.bahanRamuan && (
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3 items-center animate-in zoom-in">
                    <Sparkles size={18} className="text-blue-500 fill-blue-100" />
                    <div>
                        <p className="text-xs font-bold text-blue-800">Semak Data Ini</p>
                        <p className="text-[10px] text-blue-600">Sila semak maklumat sebelum menyimpan.</p>
                    </div>
                </div>
             )}

             {isSlaughterHouse ? (
                <div className="bg-white p-6 rounded-[2rem] shadow-[0_2px_20px_rgba(0,0,0,0.02)] border border-stone-100 space-y-5">
                    <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Building2 size={14} /> Maklumat Premis</h3>
                    <div className="space-y-1.5"><label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Syarikat *</label><input required name="namaPengeluar" value={formData.namaPengeluar} onChange={handleChange} className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3.5 text-sm" /></div>
                    
                    {/* SOCIALS */}
                    <SocialMediaInputs />

                    <div className="space-y-1.5"><label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Alamat Ringkas *</label><input required name="namaProduk" value={formData.namaProduk} onChange={handleChange} className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3.5 text-sm" /></div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">SubKategori</label>
                        <select name="subCategory" value={formData.subCategory} onChange={handleChange} className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3.5 text-sm"><option value="">- Pilih -</option>{SLAUGHTER_SUBCATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                    </div>
                    {/* ... Rest of Slaughterhouse form ... */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5"><label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Bandar/Poskod</label><input name="saizProduk" value={formData.saizProduk} onChange={handleChange} className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3.5 text-sm" /></div>
                        <div className="space-y-1.5"><label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Negeri</label><select name="negeriPengeluar" value={formData.negeriPengeluar} onChange={handleChange} className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3.5 text-sm"><option value="">- Pilih -</option>{MALAYSIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                    </div>
                    <div className="space-y-1.5"><label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Tarikh Luput Sijil</label><input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3.5 text-sm" /></div>
                    
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Status Halal</label>
                        <div className="relative">
                            <select name="statusHalal" value={formData.statusHalal} onChange={handleChange} className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3.5 text-sm font-bold text-stone-700 appearance-none">
                                <option value="HALAL JAKIM">HALAL JAKIM</option>
                                <option value="DIIKTIRAF BADAN LUAR">DIIKTIRAF BADAN LUAR</option>
                                <option value="NON-HALAL">NON-HALAL</option>
                                <option value="RAGU-RAGU / WAS-WAS">RAGU-RAGU / WAS-WAS</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400" size={16}/>
                        </div>
                    </div>
                </div>
             ) : isFoodPremise ? (
                /* PREMIS MAKANAN FORM - REORDERED AS PER REQUEST */
                <div className="bg-white p-6 rounded-[2rem] shadow-[0_2px_20px_rgba(0,0,0,0.02)] border border-stone-100 space-y-5">
                    <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Store size={14} /> Maklumat Premis Makanan</h3>
                    
                    {/* 1. Name / Nama Syarikat */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Nama Syarikat (Pemilik) *</label>
                        <input required name="namaPengeluar" value={formData.namaPengeluar} onChange={handleChange} className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3.5 text-sm" placeholder="Contoh: Gerbang Alaf Restaurants Sdn Bhd" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Jenama (Nama Kedai) *</label>
                        <input required name="namaProduk" value={formData.namaProduk} onChange={handleChange} className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3.5 text-sm" placeholder="Contoh: McDonald's KLCC" />
                    </div>

                    {/* 2. Address */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1 flex items-center gap-1"><MapPin size={10} /> Alamat Penuh Premis</label>
                        <textarea name="bahanRamuan" value={formData.bahanRamuan} onChange={handleChange} rows={4} className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3.5 text-sm resize-none" placeholder="Masukkan alamat lengkap cawangan..." />
                    </div>

                    {/* 3. State & Country Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Negeri</label>
                            <select name="negeriPengeluar" value={formData.negeriPengeluar} onChange={handleChange} className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3.5 text-sm"><option value="">- Pilih -</option>{MALAYSIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Negara Asal</label>
                            <input name="negaraAsal" value={formData.negaraAsal} onChange={handleChange} className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3.5 text-sm" />
                        </div>
                    </div>

                    {/* 4. Phone No */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1 flex items-center gap-1"><Phone size={10}/> No Telefon</label>
                        <input name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3.5 text-sm" placeholder="03-xxxxxxx" />
                    </div>
                    
                    {/* 5. Website & Socials */}
                    <SocialMediaInputs aliasLabel="Lokasi Umum / Cawangan" aliasPlaceholder="Contoh: KLCC, Bangi Sentral" />

                    {/* 6. Reference No & Expiry */}
                    <div className="bg-stone-50 p-4 rounded-xl space-y-4 border border-stone-100">
                        <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1"><ShieldCheck size={12}/> Info Pensijilan Halal</h4>
                        
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1 flex items-center gap-1"><Hash size={10}/> No Rujukan JAKIM</label>
                            <input name="halalRefNo" value={formData.halalRefNo} onChange={handleChange} className="w-full bg-white border border-stone-200 rounded-xl p-3.5 text-sm font-mono" placeholder="JAKIM.700-2/3/2 090-11/2021" />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Tarikh Luput Sijil Halal</label>
                            <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} className="w-full bg-white border border-stone-200 rounded-xl p-3.5 text-sm" />
                        </div>
                        
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Status Halal</label>
                            <div className="relative">
                                <select name="statusHalal" value={formData.statusHalal} onChange={handleChange} className="w-full bg-white border border-stone-200 rounded-xl p-3.5 text-sm font-bold text-stone-700 appearance-none">
                                    <option value="HALAL JAKIM">HALAL JAKIM</option>
                                    <option value="DIIKTIRAF BADAN LUAR">DIIKTIRAF BADAN LUAR</option>
                                    <option value="NON-HALAL">NON-HALAL</option>
                                    <option value="RAGU-RAGU / WAS-WAS">RAGU-RAGU / WAS-WAS</option>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400" size={16}/>
                            </div>
                        </div>
                    </div>
                </div>
             ) : (
                /* GENERAL PRODUCTS FORM */
                <>
                    <div className="bg-white p-6 rounded-[2rem] shadow-[0_2px_20px_rgba(0,0,0,0.02)] border border-stone-100">
                        {/* Image Upload Section - SAME AS BEFORE */}
                        <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-5 flex items-center gap-2"><Camera size={14} /> Visual Produk</h3>
                        <div className="grid grid-cols-3 gap-3">{(['front', 'back', 'halal'] as const).map((type) => (
                            <div key={type} className="space-y-2 group">
                                <label className="aspect-[3/4] bg-stone-50 rounded-2xl border border-dashed border-stone-200 flex flex-col items-center justify-center cursor-pointer hover:border-stone-400 hover:bg-stone-100 transition-all relative overflow-hidden">
                                    {images[type] ? (
                                        <>
                                            <img src={images[type]} className="w-full h-full object-cover" />
                                            {type === 'back' && (
                                                <div 
                                                    onClick={(e) => { e.preventDefault(); handleExtractIngredients(); }}
                                                    className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 p-2 text-center"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-white text-stone-800 flex items-center justify-center mb-1 hover:scale-110 transition-transform">
                                                        {isExtractingIngredients ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} fill="currentColor" className="text-yellow-400" />}
                                                    </div>
                                                    <span className="text-[9px] font-bold text-white uppercase tracking-wider">{isExtractingIngredients ? 'Mengimbas...' : 'Ekstrak Ramuan'}</span>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <Upload size={16} />
                                            <span className="text-[9px] font-bold uppercase mt-1">Muat Naik</span>
                                        </div>
                                    )}
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, type)} />
                                </label>
                                <p className="text-[9px] text-center font-bold text-stone-500 uppercase">{IMAGE_LABELS[type]}</p>
                            </div>
                        ))}</div>
                        
                        {(images.front || images.back) && (
                            <button 
                                type="button" 
                                onClick={handleAnalyzeUploadedImages}
                                className="w-full mt-4 bg-indigo-50 text-indigo-600 font-bold py-3 rounded-xl hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 border border-indigo-100"
                            >
                                <Sparkles size={16} /> Semakan Automatik Dimatikan
                            </button>
                        )}
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] shadow-[0_2px_20px_rgba(0,0,0,0.02)] border border-stone-100 space-y-5">
                        <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Package size={14} /> Identiti Produk</h3>
                        <div className="space-y-1.5"><label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Nama Produk *</label><input required name="namaProduk" value={formData.namaProduk} onChange={handleChange} className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3.5 text-sm" /></div>
                        <div className="space-y-1.5"><label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Pengeluar *</label><input required name="namaPengeluar" value={formData.namaPengeluar} onChange={handleChange} className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3.5 text-sm" /></div>
                        
                        {/* SOCIALS */}
                        <SocialMediaInputs />

                        <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Kod Bar</label><input name="barcode" value={formData.barcode} onChange={handleChange} className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3.5 text-sm" /></div><div className="space-y-1.5"><label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Saiz</label><input name="saizProduk" value={formData.saizProduk} onChange={handleChange} className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3.5 text-sm" /></div></div>
                        
                        {/* HALAL STATUS DROPDOWN FOR GENERAL PRODUCTS */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Status Halal</label>
                            <div className="relative">
                                <select name="statusHalal" value={formData.statusHalal} onChange={handleChange} className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3.5 text-sm font-bold text-stone-700 appearance-none">
                                    <option value="HALAL JAKIM">HALAL JAKIM</option>
                                    <option value="DIIKTIRAF BADAN LUAR">DIIKTIRAF BADAN LUAR</option>
                                    <option value="NON-HALAL">NON-HALAL</option>
                                    <option value="RAGU-RAGU / WAS-WAS">RAGU-RAGU / WAS-WAS</option>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400" size={16}/>
                            </div>
                        </div>

                        {/* ADDED REF NO FOR PRODUCTS TOO */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1 flex items-center gap-1"><Hash size={10}/> No Rujukan JAKIM</label>
                            <input name="halalRefNo" value={formData.halalRefNo} onChange={handleChange} className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3.5 text-sm font-mono" placeholder="JAKIM.700-..." />
                        </div>

                        <div className="space-y-1.5"><label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Bahan Ramuan</label><textarea name="bahanRamuan" value={formData.bahanRamuan} onChange={handleChange} rows={4} className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3.5 text-sm resize-none" /></div>
                        
                        {/* Expiry Date for General Products */}
                        {isConsumerGoods && (
                            <div className="space-y-1.5"><label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Tarikh Luput Sijil</label><input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3.5 text-sm" /></div>
                        )}
                    </div>
                </>
             )}

            <div className="fixed bottom-6 left-6 right-6 z-40 max-w-lg mx-auto">
                 <button type="submit" disabled={isSubmitting} className="w-full bg-stone-800 text-[#FDFBF7] font-bold text-sm py-4 rounded-2xl shadow-xl shadow-stone-800/20 hover:bg-stone-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70">{isSubmitting ? <Loader2 className="animate-spin" size={20}/> : <Save size={18} />} {isSubmitting ? 'MENYIMPAN...' : 'SIMPAN REKOD'}</button>
            </div>
          </form>
        )}

        {/* --- CSV FORM --- */}
        {activeTab === 'csv' && (
           <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
               {/* CSV Layout Remains Same */}
               <div className="bg-white p-6 rounded-[2rem] shadow-[0_2px_20px_rgba(0,0,0,0.02)] border border-stone-100">
                   {/* ... content ... */}
                   <div className="text-center mb-6">
                       <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                           {isAiProcessing ? <Loader2 className="text-green-600 animate-spin" size={32} /> : <FileCsv className="text-green-600" size={32} />}
                           {!isAiProcessing && <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1"><Sparkles size={10} className="text-white"/></div>}
                       </div>
                       <h3 className="font-bold text-stone-800">Import CSV</h3>
                       <p className="text-sm text-stone-500 mt-2 leading-relaxed">
                           Muat naik fail .csv ATAU tampal teks dari Excel/Word terus ke dalam kotak di bawah.
                       </p>
                   </div>

                   {/* Paste Area */}
                   <div className="mb-6 space-y-3">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1 flex items-center gap-1">
                            <ClipboardPaste size={12}/> Tampal Teks CSV Di Sini
                        </label>
                        <textarea 
                            value={csvTextInput}
                            onChange={(e) => setCsvTextInput(e.target.value)}
                            className="w-full h-32 p-4 bg-stone-50 border border-stone-100 rounded-2xl text-xs font-mono focus:border-stone-400 focus:outline-none resize-none"
                            placeholder={
                                isFoodPremise
                                ? "Nama Syarikat, Alamat, Negeri, Negara, Phone, Web, JAKIM Ref, Expiry..."
                                : "Nama Produk, Jenama, Kategori, Status..."
                            }
                        />
                        <button 
                            onClick={() => processCSVWithAI(csvTextInput)}
                            disabled={!csvTextInput.trim() || isAiProcessing}
                            className="w-full py-3 bg-stone-800 text-white font-bold rounded-xl hover:bg-stone-700 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                        >
                            {isAiProcessing ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16} />} 
                            Semak Teks
                        </button>
                   </div>

                   {/* File Upload UI */}
                   <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-stone-100"></div>
                        <span className="flex-shrink-0 mx-4 text-stone-300 text-[10px] uppercase font-bold">Atau Muat Naik Fail</span>
                        <div className="flex-grow border-t border-stone-100"></div>
                   </div>
                   
                   <button 
                       onClick={handleDownloadTemplate}
                       className="w-full py-3 text-green-700 font-bold text-xs hover:bg-green-50 transition-colors flex items-center justify-center gap-2 mb-4 rounded-xl"
                   >
                       <Download size={14} /> Muat Turun Templat (.csv)
                   </button>

                   <label className={`w-full py-8 bg-stone-50 border-2 border-dashed border-stone-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-stone-400 hover:bg-stone-100 transition-all ${isAiProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                       <Upload size={20} className="text-stone-400 mb-2" />
                       <span className="text-xs font-bold text-stone-600">Pilih Fail CSV</span>
                       <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={isAiProcessing} />
                   </label>
               </div>

               {isAiProcessing && (
                   <div className="text-center py-4 animate-pulse">
                       <p className="text-stone-500 text-xs font-bold uppercase">Pemprosesan automatik dimatikan</p>
                   </div>
               )}

               {importedData.length > 0 && (
                   <div className="bg-white p-6 rounded-[2rem] shadow-[0_2px_20px_rgba(0,0,0,0.02)] border border-stone-100">
                       <h3 className="text-sm font-bold text-stone-800 mb-4 flex items-center gap-2">
                           <Table size={16} className="text-stone-400" />
                           Pratonton Data ({importedData.length} item)
                       </h3>
                       <div className="overflow-x-auto">
                           <table className="w-full text-left border-collapse">
                               <thead>
                                   <tr className="border-b border-stone-100 text-[10px] uppercase text-stone-400 font-bold">
                                       <th className="pb-2">{isSlaughterHouse ? 'Syarikat' : 'Produk'}</th>
                                       <th className="pb-2">{isSlaughterHouse ? 'Sub' : 'Kategori'}</th>
                                       <th className="pb-2">{isSlaughterHouse ? 'Lokasi' : 'Status'}</th>
                                       <th className="pb-2">Luput</th>
                                   </tr>
                               </thead>
                               <tbody className="text-xs text-stone-600">
                                   {importedData.slice(0, 5).map((row, idx) => (
                                       <tr key={idx} className="border-b border-stone-50 last:border-0">
                                           <td className="py-2 font-medium">{isSlaughterHouse ? row.namaPengeluar : row.namaProduk}</td>
                                           <td className="py-2 text-stone-400">{isSlaughterHouse ? row.subCategory : row.mainCategory}</td>
                                           <td className="py-2">
                                               {isSlaughterHouse ? row.negeriPengeluar : row.statusHalal}
                                           </td>
                                           <td className="py-2 text-stone-400">{row.expiryDate}</td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                           {importedData.length > 5 && <p className="text-center text-[10px] text-stone-400 mt-3 italic">...dan {importedData.length - 5} lagi</p>}
                       </div>
                   </div>
               )}

               {importedData.length > 0 && (
                   <div className="fixed bottom-6 left-6 right-6 z-40 max-w-lg mx-auto">
                        <button 
                            onClick={handleBulkImport}
                            disabled={isSubmitting}
                            className="w-full bg-stone-800 text-[#FDFBF7] font-bold text-sm py-4 rounded-2xl shadow-xl shadow-stone-800/20 hover:bg-stone-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" size={20}/> : <Save size={18} />}
                            {isSubmitting ? 'MEMPROSES...' : `IMPORT ${importedData.length} REKOD`}
                        </button>
                   </div>
               )}
           </div>
        )}

      </div>
    </div>
  );
};

export default AdminAddProductPage;
