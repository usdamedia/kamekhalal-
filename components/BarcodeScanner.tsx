
import React, { useRef, useEffect, useState } from 'react';
import { X, Camera, RefreshCw, Zap } from 'lucide-react';

interface BarcodeScannerProps {
  onCapture: (base64Image: string) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [facingMode]);

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
    }
  };

  const handleCapture = () => {
    if (videoRef.current) {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 150);

      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      
      // High resolution capture for better OCR/Barcode detection
      const width = video.videoWidth;
      const height = video.videoHeight;
      
      canvas.width = width; 
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        if (facingMode === 'user') {
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, width, height);
        
        // Use higher quality for barcode detection
        const imageSrc = canvas.toDataURL('image/jpeg', 0.9);
        onCapture(imageSrc);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col animate-in fade-in duration-300">
      
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 p-6 flex justify-between items-start pt-safe">
          <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
             <p className="text-white font-bold text-sm">Ambil Gambar Barcode</p>
          </div>
          <button onClick={onClose} className="p-3 bg-white/20 rounded-full text-white hover:bg-white/30 backdrop-blur-md transition-all active:scale-95">
             <X size={24} />
          </button>
      </div>

      {/* Camera View */}
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
         <video ref={videoRef} autoPlay playsInline muted className="absolute w-full h-full object-cover" />
         
         {/* Flash Animation */}
         <div className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-150 z-50 ${isFlashing ? 'opacity-100' : 'opacity-0'}`} />
         
         {/* Visual Guide */}
         <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
             <div className="w-72 h-48 border-2 border-white/50 rounded-2xl relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl -mt-0.5 -ml-0.5"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl -mt-0.5 -mr-0.5"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl -mb-0.5 -ml-0.5"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl -mb-0.5 -mr-0.5"></div>
                <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
             </div>
         </div>

         <p className="absolute bottom-32 text-white/80 text-sm font-medium text-center px-6 drop-shadow-md">
            Pastikan barcode jelas dan tidak kabur.
         </p>
      </div>

      {/* Controls */}
      <div className="h-32 bg-stone-900/90 backdrop-blur-xl flex items-center justify-around px-8 pb-safe pt-4 border-t border-white/10 z-20">
         <button onClick={() => setFacingMode(p => p === 'environment' ? 'user' : 'environment')} className="p-4 rounded-full bg-stone-800 text-stone-400 hover:text-white transition-colors">
            <RefreshCw size={24} />
         </button>
         
         <button onClick={handleCapture} className="w-20 h-20 rounded-full border-[5px] border-white flex items-center justify-center bg-transparent active:scale-90 transition-all shadow-lg shadow-black/50">
            <div className="w-16 h-16 rounded-full bg-white shadow-inner" />
         </button>
         
         <div className="w-14 h-14 flex items-center justify-center text-stone-500">
             <Zap size={24} className="opacity-50" />
         </div> 
      </div>
    </div>
  );
};

export default BarcodeScanner;
