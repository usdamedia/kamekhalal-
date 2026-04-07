
import React, { useRef, useEffect, useState } from 'react';
import { Camera, X, RefreshCw, CheckCircle, ChevronRight, Info, Smartphone } from 'lucide-react';
import { Camera as NativeCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { ProductImages } from '../types';

interface CameraCaptureProps {
  onCapture: (images: ProductImages) => void;
  onCancel: () => void;
  mode?: 'product' | 'barcode';
  initialImages?: Partial<ProductImages>;
}

type Step = 'front' | 'back' | 'halal';

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel, mode = 'product', initialImages }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [activeStep, setActiveStep] = useState<Step | null>(null); 
  const [images, setImages] = useState<ProductImages>({ 
      front: initialImages?.front || '', 
      back: initialImages?.back || '', 
      halal: initialImages?.halal || '' 
  });
  const [isFlashing, setIsFlashing] = useState(false);
  const [isLaunchingNativeCamera, setIsLaunchingNativeCamera] = useState(false);
  const isNativePlatform = Capacitor.isNativePlatform();

  // Stop camera when component unmounts
  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [stream]);

  // Start/Stop camera based on activeStep
  useEffect(() => {
    if (activeStep) {
      startCamera();
    } else {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
  }, [activeStep, facingMode]);

  const startCamera = async () => {
    try {
      if (stream) stream.getTracks().forEach(track => track.stop());
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      setStream(newStream);
      if (videoRef.current) videoRef.current.srcObject = newStream;
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Gagal mengakses kamera. Sila pastikan kebenaran diberikan.");
      setActiveStep(null);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && activeStep) {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 150);

      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      
      // REDUCED RESOLUTION FOR FIRESTORE OPTIMIZATION
      const MAX_DIMENSION = 720; // Reduced from 1080 to prevent payload errors
      let width = video.videoWidth;
      let height = video.videoHeight;
      
      if (width > height) { 
        if (width > MAX_DIMENSION) { height *= MAX_DIMENSION / width; width = MAX_DIMENSION; } 
      } else { 
        if (height > MAX_DIMENSION) { width *= MAX_DIMENSION / height; height = MAX_DIMENSION; } 
      }
      
      canvas.width = width; 
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        if (facingMode === 'user') {
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, width, height);
        
        // REDUCED QUALITY FOR FIRESTORE OPTIMIZATION (0.6)
        const imageSrc = canvas.toDataURL('image/jpeg', 0.6);
        
        setImages(prev => ({ ...prev, [activeStep]: imageSrc }));
        
        setTimeout(() => {
            setActiveStep(null);
        }, 300);
      }
    }
  };

  const captureWithNativeCamera = async (step: Step) => {
    setIsLaunchingNativeCamera(true);

    try {
      const photo = await NativeCamera.getPhoto({
        source: CameraSource.Camera,
        resultType: CameraResultType.DataUrl,
        quality: 65,
        width: 720,
        correctOrientation: true,
        saveToGallery: false,
      });

      if (photo.dataUrl) {
        setImages(prev => ({ ...prev, [step]: photo.dataUrl || '' }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/cancel/i.test(message)) {
        console.error('Error accessing native camera:', error);
        alert('Gagal membuka kamera native. Sila semak kebenaran kamera pada peranti anda.');
      }
    } finally {
      setIsLaunchingNativeCamera(false);
    }
  };

  const handleStepSelect = (step: Step) => {
    if (isNativePlatform) {
      void captureWithNativeCamera(step);
      return;
    }

    setActiveStep(step);
  };

  const handleFinalSubmit = () => {
    if (images.front && images.back && images.halal) {
      onCapture(images);
    }
  };

  const isComplete = Boolean(images.front && images.back && images.halal);
  const isAutoFilled = Boolean(initialImages?.front);

  // --- CAMERA VIEW ---
  if (activeStep) {
    return (
      <div className="fixed inset-0 bg-black z-[60] flex flex-col">
        <div className="relative flex-1 bg-black overflow-hidden">
           <video ref={videoRef} autoPlay playsInline muted className="absolute w-full h-full object-cover" />
           <div className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-150 z-50 ${isFlashing ? 'opacity-100' : 'opacity-0'}`} />
           
           <div className="absolute inset-0 pointer-events-none border-[1px] border-white/20 m-6 rounded-3xl">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-2xl -mt-1 -ml-1"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-2xl -mt-1 -mr-1"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-2xl -mb-1 -ml-1"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-2xl -mb-1 -mr-1"></div>
           </div>

           <div className="absolute top-safe pt-6 left-0 right-0 flex justify-between items-start px-6 z-20">
              <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                 <p className="text-white font-bold text-sm uppercase tracking-wide">
                    {activeStep === 'front' ? 'Langkah 1: Depan' : activeStep === 'back' ? 'Langkah 2: Ramuan' : 'Langkah 3: Logo'}
                 </p>
              </div>
              <button onClick={() => setActiveStep(null)} className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors">
                  <X size={24} />
              </button>
           </div>
        </div>

        <div className="h-40 bg-stone-900 flex items-center justify-around px-8 pb-safe pt-4">
           <button onClick={() => setFacingMode(p => p === 'environment' ? 'user' : 'environment')} className="p-4 rounded-full bg-stone-800 text-stone-400 hover:text-white transition-colors">
              <RefreshCw size={24} />
           </button>
           
           <button onClick={handleCapture} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-transparent active:scale-90 transition-all">
              <div className="w-16 h-16 rounded-full bg-white shadow-lg shadow-white/20" />
           </button>
           
           <div className="w-14 h-14" /> 
        </div>
      </div>
    );
  }

  // --- WIZARD OVERVIEW ---
  return (
    <div className="fixed inset-0 z-[60] bg-[#FDFBF7] flex flex-col animate-in fade-in duration-300">
       
       <div className="px-6 py-5 bg-white border-b border-stone-100 flex items-center justify-between shadow-sm z-10">
           <div>
               <h2 className="text-xl font-bold text-stone-800 leading-none">Bukti Visual</h2>
               <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mt-1">Lengkapkan 3 Gambar</p>
           </div>
           <button onClick={onCancel} className="p-2 bg-stone-50 rounded-full text-stone-400 hover:bg-stone-100 transition-colors">
               <X size={20} />
           </button>
       </div>

       <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isNativePlatform && (
            <div className="bg-indigo-50 p-4 rounded-2xl flex gap-3 items-start border border-indigo-100">
              <Smartphone className="text-indigo-600 shrink-0 mt-0.5" size={18} />
              <p className="text-xs text-indigo-800 leading-relaxed">
                Kamera sumbangan akan dibuka menggunakan aplikasi kamera native pada iPhone dan Android untuk keserasian yang lebih stabil semasa publish.
              </p>
            </div>
          )}
          
          <StepCard 
            stepNumber={1} 
            title="Depan Produk" 
            desc={isAutoFilled ? "Diisi automatik (Global API)" : "Nama produk & jenama"}
            image={images.front} 
            isActive={!images.front}
            onClick={() => handleStepSelect('front')} 
            isLocked={false}
            isBusy={isLaunchingNativeCamera}
          />

          <StepCard 
            stepNumber={2} 
            title="Senarai Ramuan" 
            desc={isAutoFilled && images.back ? "Data ramuan tersedia (Global API)" : "Label ramuan di belakang"}
            image={images.back} 
            isActive={!!images.front && !images.back}
            isLocked={!images.front}
            onClick={() => handleStepSelect('back')} 
            isBusy={isLaunchingNativeCamera}
          />

          <StepCard 
            stepNumber={3} 
            title="Logo Halal" 
            desc="Logo pensijilan rasmi"
            image={images.halal} 
            isActive={!!images.back && !images.halal}
            isLocked={!images.back}
            onClick={() => handleStepSelect('halal')} 
            isBusy={isLaunchingNativeCamera}
          />

          <div className="bg-blue-50 p-4 rounded-2xl flex gap-3 items-start border border-blue-100">
             <Info className="text-blue-600 shrink-0 mt-0.5" size={18} />
             <p className="text-xs text-blue-800 leading-relaxed">
                {isAutoFilled 
                  ? "Data asas produk telah dijumpai. Anda hanya perlu melengkapkan bukti gambar (Logo Halal) untuk pengesahan."
                  : "Pastikan gambar jelas dan tidak kabur. Gambar yang berkualiti membantu AI menganalisis status Halal dengan lebih tepat."
                }
             </p>
          </div>

       </div>

       <div className="p-6 bg-white border-t border-stone-100 shadow-[0_-10px_40px_rgba(0,0,0,0.02)] z-10 pb-safe">
           <button 
             onClick={handleFinalSubmit}
             disabled={!isComplete}
             className="w-full bg-stone-800 text-white font-bold py-4 rounded-2xl shadow-xl shadow-stone-800/10 hover:bg-stone-700 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
           >
              {isComplete ? (
                  <>Teruskan ke Semakan <ChevronRight size={18} /></>
              ) : (
                  <>Lengkapkan Semua Langkah</>
              )}
           </button>
       </div>
    </div>
  );
};

const StepCard = ({ stepNumber, title, desc, image, onClick, isActive, isLocked, isBusy }: any) => (
  <button 
    onClick={!isLocked && !isBusy ? onClick : undefined}
    disabled={isLocked || isBusy}
    className={`w-full p-4 rounded-2xl border transition-all text-left flex items-center gap-4 ${
        image ? 'bg-green-50 border-green-100' : 
        isActive ? 'bg-white border-stone-800 shadow-md scale-[1.02]' : 
        'bg-white border-stone-100 opacity-60'
    }`}
  >
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 overflow-hidden relative ${image ? 'bg-white' : 'bg-stone-100'}`}>
          {image ? (
             <>
               <img src={image} className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                  <div className="bg-white/80 p-1 rounded-full shadow-sm"><RefreshCw size={12} className="text-stone-800"/></div>
               </div>
             </>
          ) : (
             <Camera size={24} className={isActive ? 'text-stone-800' : 'text-stone-300'} />
          )}
      </div>
      
      <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
             <span className={`text-[10px] font-bold px-1.5 rounded uppercase ${image ? 'bg-green-200 text-green-800' : 'bg-stone-100 text-stone-500'}`}>
                 Langkah {stepNumber}
             </span>
             {image && <CheckCircle size={14} className="text-green-600 fill-green-100" />}
          </div>
          <h4 className={`font-bold text-sm ${image ? 'text-green-900' : 'text-stone-800'}`}>{title}</h4>
          <p className="text-xs text-stone-400 leading-tight">{desc}</p>
      </div>

      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${image ? 'bg-green-200 text-green-700' : 'bg-stone-100 text-stone-300'}`}>
          {image ? <CheckCircle size={18} /> : isBusy ? <RefreshCw size={18} className="animate-spin" /> : <ChevronRight size={18} />}
      </div>
  </button>
);

export default CameraCapture;
