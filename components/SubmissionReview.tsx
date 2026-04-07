
import React, { useState, useEffect } from 'react';
import { ISubmission, GeminiOutput, ProductImages, MAIN_CATEGORIES } from '../types';
import { dbService } from '../services/firebase';
import { ArrowLeft, AlertTriangle, Send, Loader2, Package, Info, FileText } from 'lucide-react';

interface SubmissionReviewProps {
  images: ProductImages;
  analysisData: GeminiOutput;
  userUid: string;
  onCancel: () => void;
  onSubmitSuccess: () => void;
}

const SubmissionReview: React.FC<SubmissionReviewProps> = ({ images, analysisData, userUid, onCancel, onSubmitSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: MAIN_CATEGORIES[0] as string,
    ingredients: ''
  });

  // Initialize form with suggested data
  useEffect(() => {
    if (analysisData && analysisData.suggestedFields) {
      setFormData({
        name: analysisData.suggestedFields.name || '',
        brand: analysisData.suggestedFields.brand || '',
        category: analysisData.suggestedFields.category || MAIN_CATEGORIES[0],
        ingredients: analysisData.suggestedFields.ingredients || ''
      });
    }
  }, [analysisData]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.brand) {
      alert("Sila pastikan Nama dan Jenama diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const submission: ISubmission = {
        id: crypto.randomUUID(),
        contributorUid: userUid,
        status: 'Pending',
        name: formData.name,
        brand: formData.brand,
        categorySuggestion: formData.category,
        ingredients: formData.ingredients,
        frontImageURL: images.front, // Using Base64 as URL for MVP
        backImageURL: images.back,
        halalLogoImageURL: images.halal,
        geminiOutput: analysisData,
        submissionTimestamp: Date.now()
      };

      await dbService.submitProduct(submission);
      alert("Sumbangan berjaya dihantar! Anda menerima +1 Mata!");
      onSubmitSuccess();
    } catch (error) {
      console.error("Submission error:", error);
      alert("Gagal menghantar sumbangan. Sila cuba lagi.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#FDFBF7] flex flex-col animate-in slide-in-from-right duration-300">
      
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-stone-100 shadow-sm z-10 sticky top-0">
         <div className="flex items-center gap-3">
            <button onClick={onCancel} className="p-2 -ml-2 text-stone-500 hover:bg-stone-100 rounded-full transition-colors">
                <ArrowLeft size={22} />
            </button>
            <div>
                <h1 className="text-lg font-bold text-stone-800 leading-tight">Semakan Sumbangan</h1>
                <p className="text-[10px] font-bold uppercase text-stone-400 mt-0.5">Sila semak maklumat sebelum hantar</p>
            </div>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-32 space-y-6">
          
          {/* Images Strip */}
          <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
              {['front', 'back', 'halal'].map((key) => (
                  <div key={key} className="w-20 h-24 shrink-0 rounded-xl border border-stone-200 bg-white p-1 shadow-sm">
                      <img 
                        src={images[key as keyof ProductImages]} 
                        className="w-full h-full object-cover rounded-lg" 
                        alt={key} 
                      />
                  </div>
              ))}
          </div>

          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3 items-start">
              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
              <div>
                  <h4 className="font-bold text-amber-800 text-sm">Semakan Diperlukan</h4>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                      Lengkapkan dan betulkan maklumat di bawah sebelum menghantar.
                  </p>
              </div>
          </div>

          {/* Form */}
          <div className="space-y-6">
              
              {/* Basic Info */}
              <div className="bg-white p-5 rounded-[2rem] shadow-[0_2px_15px_rgba(0,0,0,0.02)] border border-stone-100 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                      <Package size={16} className="text-stone-400" />
                      <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Maklumat Asas</h3>
                  </div>

                  <div className="space-y-1">
                      <label className="text-[10px] font-bold text-stone-400 ml-1">Nama Produk</label>
                      <input 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full p-3.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-stone-100 transition-all bg-stone-50 border-stone-100"
                      />
                  </div>

                  <div className="space-y-1">
                      <label className="text-[10px] font-bold text-stone-400 ml-1">Jenama / Pengeluar</label>
                      <input 
                        value={formData.brand}
                        onChange={(e) => setFormData({...formData, brand: e.target.value})}
                        className="w-full p-3.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-stone-100 transition-all bg-stone-50 border-stone-100"
                      />
                  </div>

                  <div className="space-y-1">
                      <label className="text-[10px] font-bold text-stone-400 ml-1">Kategori</label>
                      <select 
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full p-3.5 rounded-xl border border-stone-100 bg-stone-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-stone-100 appearance-none"
                      >
                         {MAIN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                  </div>
              </div>

              {/* Ingredients */}
              <div className="bg-white p-5 rounded-[2rem] shadow-[0_2px_15px_rgba(0,0,0,0.02)] border border-stone-100 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                      <FileText size={16} className="text-stone-400" />
                      <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Ramuan & Kandungan</h3>
                  </div>
                  
                  <div className="space-y-1">
                      <textarea 
                        rows={6}
                        value={formData.ingredients}
                        onChange={(e) => setFormData({...formData, ingredients: e.target.value})}
                        className="w-full p-3.5 rounded-xl border border-stone-100 bg-stone-50 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-stone-100 resize-none"
                        placeholder="Senarai ramuan..."
                      />
                      <div className="flex gap-2 items-start px-2 mt-2">
                          <Info size={12} className="text-stone-400 mt-0.5 shrink-0" />
                          <p className="text-[10px] text-stone-400 leading-tight">
                              Pastikan sub-ramuan (contoh: dalam kicap atau sos) disenaraikan untuk analisis Halal yang tepat.
                          </p>
                      </div>
                  </div>
              </div>

          </div>
      </div>

      {/* Footer Action */}
      <div className="bg-white border-t border-stone-100 p-6 absolute bottom-0 left-0 right-0 z-20 pb-safe">
           <button 
             onClick={handleSubmit}
             disabled={isSubmitting}
             className="w-full bg-stone-800 text-white font-bold py-4 rounded-2xl shadow-xl shadow-stone-800/20 hover:bg-stone-700 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
           >
              {isSubmitting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Memproses...
                  </>
              ) : (
                  <>
                    <Send size={18} />
                    Hantar Sumbangan
                  </>
              )}
           </button>
      </div>

    </div>
  );
};

export default SubmissionReview;
