
import React, { useState, useMemo } from 'react';
import { ProductData, MAIN_CATEGORIES, FOOD_SUBCATEGORIES, ProductImages } from '../types';
import { Save, X, Camera, Upload, Image as ImageIcon } from 'lucide-react';
import { compressImage } from '../services/gemini';

interface EditProductModalProps {
  product: ProductData;
  userRole: 'admin' | 'user';
  onSave: (updatedProduct: ProductData) => void;
  onClose: () => void;
}

const MALAYSIA_STATES = [
    "Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan", "Pahang", "Perak", "Perlis", 
    "Pulau Pinang", "Sabah", "Sarawak", "Selangor", "Terengganu", "W.P. Kuala Lumpur", 
    "W.P. Labuan", "W.P. Putrajaya", "Luar Negara"
];

const SLAUGHTER_SUBCATEGORIES = [
    "Ayam", "Lembu", "Kambing", "Kerbau", "Itik", "Lain-lain"
];

const EditProductModal: React.FC<EditProductModalProps> = ({ product, userRole, onSave, onClose }) => {
  const [formData, setFormData] = useState<ProductData>(product);
  const [isSaving, setIsSaving] = useState(false);

  const subCategories = useMemo(() => {
    if (formData.mainCategory === "Produk Makanan dan Minuman") return FOOD_SUBCATEGORIES;
    if (formData.mainCategory === "Rumah Sembelihan") return SLAUGHTER_SUBCATEGORIES;
    return [];
  }, [formData.mainCategory]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: keyof ProductImages) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImage(file);
        setFormData(prev => ({ ...prev, images: { ...(prev.images || { front: '', back: '', halal: '' }), [type]: compressedBase64 } }));
      } catch (error) {
        console.error("Error compressing image", error);
        alert("Ralat memproses imej. Sila cuba lagi.");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => { 
      e.preventDefault(); 
      setIsSaving(true);
      // Simulate small delay for UX
      setTimeout(() => {
          onSave(formData); 
          setIsSaving(false);
      }, 500);
  };

  const isFoodPremise = formData.mainCategory === 'Premis Makanan';

  return (
    // CHANGED: z-50 to z-[70] to ensure it appears above ResultCard (which is z-[60])
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-[#FDFBF7] w-full max-w-lg rounded-3xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-8 flex flex-col max-h-[90vh]">
        <div className="bg-white p-4 flex justify-between items-center border-b border-stone-100">
          <h3 className="text-stone-800 font-bold">Edit Produk</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5">
          {userRole === 'admin' && (
             <div className="bg-white p-4 rounded-2xl border border-stone-100">
                <h4 className="text-[10px] font-bold text-stone-400 uppercase mb-3 flex items-center gap-2"><Camera size={12} /> Gambar</h4>
                <div className="grid grid-cols-3 gap-3">
                    {(['front', 'back', 'halal'] as const).map((type) => (
                        <div key={type} className="space-y-1">
                            <div className="aspect-square bg-stone-50 rounded-lg border border-dashed border-stone-200 flex items-center justify-center overflow-hidden relative group">
                                {formData.images?.[type] ? <img src={formData.images[type]} className="w-full h-full object-cover" /> : <ImageIcon className="text-stone-300" />}
                                <label className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"><Upload className="text-white" size={20} /><input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, type)} /></label>
                            </div>
                            <p className="text-[9px] text-center font-bold uppercase text-stone-400">{type}</p>
                        </div>
                    ))}
                </div>
             </div>
          )}
          
          <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase">Nama Produk / Alamat</label>
                <input name="namaProduk" value={formData.namaProduk} onChange={handleChange} className="w-full p-3 bg-white border border-stone-100 rounded-xl focus:border-stone-400 outline-none text-sm text-stone-800" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase">Nama Syarikat / Jenama Rasmi</label>
                <input name="namaPengeluar" value={formData.namaPengeluar} onChange={handleChange} className="w-full p-3 bg-white border border-stone-100 rounded-xl focus:border-stone-400 outline-none text-sm text-stone-800" />
              </div>

              {/* NEW FIELDS: Alias & Website & Socials */}
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-400 uppercase">{isFoodPremise ? 'Lokasi Umum / Cawangan' : 'Nama Popular (Alias)'}</label>
                    <input name="alias" value={formData.alias || ''} onChange={handleChange} className="w-full p-3 bg-white border border-stone-100 rounded-xl focus:border-stone-400 outline-none text-sm text-stone-800" placeholder={isFoodPremise ? "Cth: KLCC, Bangi Sentral" : "Cth: Zias Catering"} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-400 uppercase">Laman Web</label>
                    <input name="website" value={formData.website || ''} onChange={handleChange} className="w-full p-3 bg-white border border-stone-100 rounded-xl focus:border-stone-400 outline-none text-sm text-stone-800" placeholder="https://" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-400 uppercase">No Telefon</label>
                    <input name="phone" value={formData.phone || ''} onChange={handleChange} className="w-full p-3 bg-white border border-stone-100 rounded-xl focus:border-stone-400 outline-none text-sm text-stone-800" placeholder="012-xxxxxxx" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-400 uppercase">Facebook</label>
                    <input name="facebook" value={formData.facebook || ''} onChange={handleChange} className="w-full p-3 bg-white border border-stone-100 rounded-xl focus:border-stone-400 outline-none text-sm text-stone-800" placeholder="URL Facebook" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-400 uppercase">Instagram</label>
                    <input name="instagram" value={formData.instagram || ''} onChange={handleChange} className="w-full p-3 bg-white border border-stone-100 rounded-xl focus:border-stone-400 outline-none text-sm text-stone-800" placeholder="URL Instagram" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-400 uppercase">TikTok</label>
                    <input name="tiktok" value={formData.tiktok || ''} onChange={handleChange} className="w-full p-3 bg-white border border-stone-100 rounded-xl focus:border-stone-400 outline-none text-sm text-stone-800" placeholder="URL TikTok" />
                  </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-400 uppercase">Negara Asal</label>
                    <input name="negaraAsal" value={formData.negaraAsal} onChange={handleChange} className="w-full p-3 bg-white border border-stone-100 rounded-xl focus:border-stone-400 outline-none text-sm text-stone-800" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-400 uppercase">Negeri (MY)</label>
                    <select name="negeriPengeluar" value={formData.negeriPengeluar || ''} onChange={handleChange} className="w-full p-3 bg-white border border-stone-100 rounded-xl focus:border-stone-400 outline-none text-sm text-stone-800">
                        <option value="">- Pilih -</option>
                        {MALAYSIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase">Saiz / Berat / Poskod</label>
                <input name="saizProduk" value={formData.saizProduk} onChange={handleChange} className="w-full p-3 bg-white border border-stone-100 rounded-xl focus:border-stone-400 outline-none text-sm text-stone-800" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase">Kategori</label>
                <select name="mainCategory" value={formData.mainCategory} onChange={handleChange} className="w-full p-3 bg-white border border-stone-100 rounded-xl focus:border-stone-400 outline-none text-sm text-stone-800">
                   {MAIN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Dynamic Sub-Category */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase">Sub-Kategori</label>
                {subCategories.length > 0 ? (
                    <select name="subCategory" value={formData.subCategory || ''} onChange={handleChange} className="w-full p-3 bg-white border border-stone-100 rounded-xl focus:border-stone-400 outline-none text-sm text-stone-800">
                        <option value="">- Pilih -</option>
                        {subCategories.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                ) : (
                    <input name="subCategory" value={formData.subCategory || ''} onChange={handleChange} className="w-full p-3 bg-white border border-stone-100 rounded-xl focus:border-stone-400 outline-none text-sm text-stone-800" placeholder="Pilihan" />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase">Status Halal</label>
                <select name="statusHalal" value={formData.statusHalal} onChange={handleChange} className="w-full p-3 bg-white border border-stone-100 rounded-xl focus:border-stone-400 outline-none text-sm text-stone-800 font-bold">
                    <option value="HALAL JAKIM">HALAL JAKIM</option>
                    <option value="DIIKTIRAF BADAN LUAR OLEH JAKIM">DIIKTIRAF BADAN LUAR</option>
                    <option value="NON-HALAL">NON-HALAL</option>
                    <option value="RAGU RAGU ELAKKAN">RAGU-RAGU / WAS-WAS</option>
                </select>
              </div>

              {/* Ref No */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase">No Rujukan JAKIM</label>
                <input name="halalRefNo" value={formData.halalRefNo || ''} onChange={handleChange} className="w-full p-3 bg-white border border-stone-100 rounded-xl focus:border-stone-400 outline-none text-sm text-stone-800 font-mono" placeholder="JAKIM.700-..." />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase">Ramuan / Catatan Tambahan</label>
                <textarea name="bahanRamuan" value={formData.bahanRamuan} onChange={handleChange} rows={3} className="w-full p-3 bg-white border border-stone-100 rounded-xl focus:border-stone-400 outline-none text-sm text-stone-800" />
              </div>
          </div>
        </div>

        <div className="p-4 bg-white border-t border-stone-100">
          <button onClick={handleSubmit} disabled={isSaving} className="w-full bg-stone-800 text-white font-bold py-3.5 rounded-xl hover:bg-stone-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70">
              <Save size={18} /> {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  );
};
export default EditProductModal;
