import React, { useState } from 'react';
import { ProductData, MAIN_CATEGORIES, ProductImages, GeminiOutput } from '../types';
import { ArrowLeft, Camera, ChevronDown, Send, Sparkles, Info } from 'lucide-react';
import CameraCapture from './CameraCapture';
import SubmissionReview from './SubmissionReview';
import { authService } from '../services/firebase';
import { useLanguage } from '../contexts/LanguageContext';

interface UserContributePageProps {
  onSave: (data: Omit<ProductData, 'id' | 'userId' | 'userName' | 'timestamp' | 'approvalStatus'>) => Promise<void>;
  onCancel: () => void;
  onViewExisting?: (product: ProductData) => void;
}

type ContributeMode = 'selection' | 'manual' | 'camera' | 'review';

const UserContributePage: React.FC<UserContributePageProps> = ({ onSave, onCancel }) => {
  const { t } = useLanguage();
  const [mode, setMode] = useState<ContributeMode>('selection');
  const [images, setImages] = useState<ProductImages>({ front: '', back: '', halal: '' });
  const [draftData, setDraftData] = useState<GeminiOutput | null>(null);
  const [manualForm, setManualForm] = useState({
    name: '',
    brand: '',
    category: MAIN_CATEGORIES[0] as string,
    ingredients: ''
  });

  const currentUserUid = authService.auth.currentUser?.uid || 'anonymous';

  const handleCameraCapture = async (capturedImages: ProductImages) => {
    setImages(capturedImages);
    setDraftData({
      extractedText: '',
      suggestedFields: {
        name: '',
        brand: '',
        category: MAIN_CATEGORIES[0],
        confidence: 0,
        ingredients: ''
      }
    });
    setMode('review');
  };

  const handleManualSubmit = async () => {
    const submissionData: Omit<ProductData, 'id' | 'userId' | 'userName' | 'timestamp' | 'approvalStatus'> = {
      namaProduk: manualForm.name,
      namaPengeluar: manualForm.brand,
      mainCategory: manualForm.category,
      bahanRamuan: manualForm.ingredients,
      statusHalal: 'Pending',
      negaraAsal: 'Malaysia',
      negeriPengeluar: '',
      saizProduk: '-',
      images: { front: '', back: '', halal: '' }
    };
    await onSave(submissionData);
  };

  if (mode === 'camera') {
    return <CameraCapture onCapture={handleCameraCapture} onCancel={() => setMode('selection')} initialImages={images} />;
  }

  if (mode === 'review' && draftData) {
    return (
      <SubmissionReview
        images={images}
        analysisData={draftData}
        userUid={currentUserUid}
        onCancel={() => setMode('selection')}
        onSubmitSuccess={onCancel}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-32 animate-in slide-in-from-bottom-4 relative">
      <div className="bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-stone-100 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-2 -ml-2 text-stone-500 hover:bg-stone-100 rounded-full transition-colors">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-lg font-bold text-stone-800 leading-tight">{t.contribute_title}</h1>
        </div>
      </div>

      <div className="p-6 max-w-lg mx-auto space-y-8">
        <div className="text-center space-y-2 mb-8">
          <div className="w-16 h-16 bg-stone-800 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-stone-800/20 rotate-3">
            <Sparkles className="text-white" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-stone-800 tracking-tight">{t.help_community}</h2>
          <p className="text-stone-500 text-sm max-w-xs mx-auto leading-relaxed">{t.help_desc}</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setMode('camera')}
            className="w-full bg-white p-5 rounded-[2rem] border border-stone-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center gap-5 hover:shadow-lg hover:border-stone-200 transition-all group text-left"
          >
            <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center text-stone-700 group-hover:scale-110 transition-transform">
              <Camera size={28} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-stone-800 text-base">{t.scan_ai_title}</h3>
              <p className="text-xs text-stone-400 mt-0.5">{t.scan_ai_desc}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center text-stone-300">
              <ChevronDown className="-rotate-90" size={18} />
            </div>
          </button>

          <div className="bg-stone-50 border border-stone-100 rounded-2xl p-4 flex gap-3 items-start">
            <Info size={18} className="text-stone-400 mt-0.5 shrink-0" />
            <p className="text-xs text-stone-500 leading-relaxed">
              Semua fungsi automatik telah dimatikan. Sumbangan dibuat secara manual untuk elak sebarang kos API.
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-stone-100">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 text-center">{t.manual_entry_title}</h3>

          <div className="bg-white p-6 rounded-[2rem] border border-stone-100 space-y-4 shadow-sm">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-400 ml-1">Nama Produk</label>
              <input
                value={manualForm.name}
                onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                className="w-full p-3 bg-stone-50 border border-stone-100 rounded-xl text-sm focus:outline-none focus:border-stone-300"
                placeholder={t.product_name_placeholder}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-400 ml-1">Jenama</label>
              <input
                value={manualForm.brand}
                onChange={(e) => setManualForm({ ...manualForm, brand: e.target.value })}
                className="w-full p-3 bg-stone-50 border border-stone-100 rounded-xl text-sm focus:outline-none focus:border-stone-300"
                placeholder={t.brand_placeholder}
              />
            </div>
            <button
              onClick={handleManualSubmit}
              disabled={!manualForm.name || !manualForm.brand}
              className="w-full bg-stone-800 text-white font-bold py-3.5 rounded-xl hover:bg-stone-700 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              <Send size={16} /> {t.submit_manual}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserContributePage;
