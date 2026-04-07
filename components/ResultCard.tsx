
import React, { useState, useEffect } from 'react';
import { ProductData, ProductImages } from '../types';
import { dbService } from '../services/firebase';
import { Upload, ArrowLeft, ScanBarcode, Calendar, MapPin, Layers, Building2, ImageIcon, FileText, Edit, Trash2, CheckCircle2, AlertCircle, HelpCircle, ZoomIn, X, Sparkles, ShoppingBag, ChevronRight, Store, Package, List, Search, ExternalLink, Globe, Facebook, Instagram, Video, AtSign, Phone, Hash } from 'lucide-react';

interface ResultCardProps {
  data: ProductData;
  imageSrc?: string; 
  images?: ProductImages;
  onReset: () => void;
  readOnly?: boolean;
  userRole?: 'user' | 'admin';
  onEdit?: () => void;
  onDelete?: () => void;
  onSelectAlternative?: (product: ProductData) => void;
}

const ResultCard: React.FC<ResultCardProps> = ({ data, images, onReset, readOnly = false, userRole, onEdit, onDelete, onSelectAlternative }) => {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [alternatives, setAlternatives] = useState<ProductData[]>([]);
  const [companyProducts, setCompanyProducts] = useState<ProductData[]>([]);
  const [companySearch, setCompanySearch] = useState("");
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);
  
  const getStatusConfig = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('jakim') || s.includes('diiktiraf') || s.includes('halal') || s.includes('lulus')) {
        return { 
            bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-800', icon: 'text-emerald-600',
            label: 'HALAL DISAHKAN', sub: 'Diiktiraf JAKIM / Badan Bertauliah', Icon: CheckCircle2
        };
    }
    if (s.includes('tiada') || s.includes('not') || s.includes('non')) {
        return { 
            bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-800', icon: 'text-rose-600',
            label: 'TIDAK DISAHKAN', sub: 'Tiada Logo / Non-Halal', Icon: AlertCircle
        };
    }
    return { 
        bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-800', icon: 'text-amber-600',
        label: 'PERLU SEMAKAN', sub: 'Status Ragu-ragu / Maklumat Tidak Lengkap', Icon: HelpCircle
    };
  };

  const statusUI = getStatusConfig(data.statusHalal);
  const formattedDate = new Date(data.timestamp).toLocaleDateString('ms-MY', { year: 'numeric', month: 'long', day: 'numeric' });
  
  const shouldShowAlternatives = !data.statusHalal.toLowerCase().includes('jakim');
  const isSlaughterHouse = data.mainCategory === 'Rumah Sembelihan';
  const isFoodPremise = data.mainCategory === 'Premis Makanan';
  const isConsumerGoods = data.mainCategory === 'Produk Barang Gunaan';
  const isFoodOrBeverage = data.mainCategory === 'Produk Makanan dan Minuman';

  // Load Alternatives (If Non-Halal) AND Company Products (If Food/Bev/Premise)
  useEffect(() => {
    const fetchData = async () => {
      setLoadingAlternatives(true);
      
      // 1. Alternatives
      if (shouldShowAlternatives && data.mainCategory) {
        try {
          const alts = await dbService.getHalalAlternatives(data.mainCategory, data.id);
          setAlternatives(alts);
        } catch (e) { console.error("Failed alternatives", e); }
      } else {
        setAlternatives([]);
      }

      // 2. Company Products (Menu List)
      // Only for Food/Bev or Premises where "lists" are common
      if ((isFoodOrBeverage || isFoodPremise) && data.namaPengeluar) {
          try {
              const siblings = await dbService.getCompanyProducts(data.namaPengeluar);
              setCompanyProducts(siblings);
          } catch(e) { console.error("Failed company products", e); }
      } else {
          setCompanyProducts([]);
      }

      setLoadingAlternatives(false);
    };

    fetchData();
  }, [data.id, data.mainCategory, data.statusHalal, data.namaPengeluar]);

  const getExpiryStatus = (dateStr: string) => {
      const expiry = new Date(dateStr);
      if (isNaN(expiry.getTime())) return null;

      const now = new Date();
      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // 1 Year (365 days) reference for full bar
      let percentage = (diffDays / 365) * 100;
      if (percentage > 100) percentage = 100;
      if (percentage < 0) percentage = 0; // Expired

      let color = 'bg-emerald-500';
      if (diffDays <= 30) color = 'bg-red-500';
      else if (diffDays <= 90) color = 'bg-orange-500';
      else if (diffDays <= 180) color = 'bg-yellow-500';
      
      if (diffDays < 0) color = 'bg-red-600'; // Expired

      return { percentage, color, diffDays };
  };

  const InfoItem = ({ label, value, icon: Icon, showProgress = false }: { label: string, value?: string, icon: any, showProgress?: boolean }) => {
    let progressElement = null;
    if (showProgress && value) {
        const status = getExpiryStatus(value);
        if (status) {
            const { percentage, color, diffDays } = status;
            const isExpired = diffDays < 0;
            progressElement = (
                <div className="mt-2 w-full">
                    <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-500 ${color}`} 
                            style={{ width: isExpired ? '100%' : `${percentage}%` }} 
                        />
                    </div>
                    <p className={`text-[9px] font-bold mt-1 text-right ${isExpired ? 'text-red-500' : 'text-stone-400'}`}>
                        {isExpired ? `Tamat Tempoh` : `${diffDays} hari lagi`}
                    </p>
                </div>
            );
        }
    }

    return (
        <div className="flex items-start gap-3 p-3.5 rounded-2xl hover:bg-stone-50 transition-colors border border-transparent hover:border-stone-100">
            <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center shrink-0 text-stone-400 border border-stone-100">
                <Icon size={18} />
            </div>
            <div className="min-w-0 w-full">
                <p className="text-[10px] uppercase font-bold text-stone-400 tracking-wider mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-stone-800 leading-snug break-words">{value || "-"}</p>
                {progressElement}
            </div>
        </div>
    );
  };

  const handleImageClick = (src: string) => {
    setZoomedImage(src);
    setIsZoomed(false);
  };

  const filteredCompanyProducts = companyProducts.filter(p => 
      p.namaProduk.toLowerCase().includes(companySearch.toLowerCase()) ||
      (p.barcode && p.barcode.includes(companySearch))
  );

  // --- REVISED DISPLAY LOGIC ---
  // Susunan: Halal Disahkan -> Nama Produk -> Nama Alias -> Dimiliki Oleh
  
  // Determine Display Title (Product Name)
  // For SlaughterHouse, the main entity is the Company, but namaProduk stores Address. 
  // We keep previous logic where Company is Title for SlaughterHouse to avoid showing address as title.
  const displayTitle = isSlaughterHouse ? data.namaPengeluar : data.namaProduk;
  
  // Determine Owner Info
  const displayOwner = isSlaughterHouse ? data.namaProduk : data.namaPengeluar;
  const ownerLabel = isSlaughterHouse ? "LOKASI" : "DIMILIKI OLEH";

  const socialLinks = [
      { type: 'website', url: data.website, icon: Globe, label: 'Laman Web', color: 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100' },
      { type: 'facebook', url: data.facebook, icon: Facebook, label: 'Facebook', color: 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100' },
      { type: 'instagram', url: data.instagram, icon: Instagram, label: 'Instagram', color: 'bg-pink-50 text-pink-700 border-pink-100 hover:bg-pink-100' },
      { type: 'tiktok', url: data.tiktok, icon: Video, label: 'TikTok', color: 'bg-stone-100 text-stone-800 border-stone-200 hover:bg-stone-200' },
      { type: 'threads', url: data.threads, icon: AtSign, label: 'Threads', color: 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100' },
  ].filter(link => link.url);

  return (
    // CHANGED: z-[60] to z-[40] to sit BEHIND the Bottom Navigation (which is usually z-50)
    <div className="fixed inset-0 z-[40] bg-[#FDFBF7] flex flex-col md:flex-row font-sans text-stone-800 animate-in fade-in duration-300">
      
      {/* Zoom Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-in fade-in duration-200 backdrop-blur-md"
          onClick={() => setZoomedImage(null)}
        >
           <button className="absolute top-6 right-6 z-[102] p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors backdrop-blur-md border border-white/10">
             <X size={24} />
           </button>
           
           <div 
             className={`w-full h-full overflow-auto flex items-center justify-center p-4 ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
             onClick={(e) => { e.stopPropagation(); setIsZoomed(!isZoomed); }}
           >
              <img 
                src={zoomedImage} 
                className={`transition-all duration-300 ease-out ${isZoomed ? 'min-w-[150%] md:min-w-[120%] max-w-none' : 'max-w-full max-h-full object-contain'}`}
                alt="Zoomed Product"
              />
           </div>
           
           <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
              <span className="bg-white/10 text-white px-5 py-2.5 rounded-full text-xs font-bold backdrop-blur-md border border-white/10 tracking-wide">
                {isZoomed ? 'KETUK UNTUK KECILKAN' : 'KETUK UNTUK ZOOM'}
              </span>
           </div>
        </div>
      )}

      {/* --- HEADER NAV (Mobile Sticky) --- */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-50 pointer-events-none">
          <button onClick={onReset} className="pointer-events-auto w-10 h-10 bg-white/80 backdrop-blur-md border border-stone-200 shadow-lg rounded-full flex items-center justify-center text-stone-700 hover:scale-105 transition-transform active:scale-95">
            <ArrowLeft size={20} />
          </button>
          
          {readOnly && userRole === 'admin' && (
            <div className="flex gap-2 pointer-events-auto ml-auto">
                {onEdit && <button onClick={onEdit} className="w-10 h-10 bg-white/90 backdrop-blur-md border border-stone-200 shadow-sm rounded-full flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors"><Edit size={18} /></button>}
                {onDelete && <button onClick={onDelete} className="w-10 h-10 bg-white/90 backdrop-blur-md border border-stone-200 shadow-sm rounded-full flex items-center justify-center text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={18} /></button>}
            </div>
          )}
      </div>

      {/* --- LEFT / TOP SECTION (IMAGE) --- */}
      <div className="w-full md:w-5/12 lg:w-4/12 h-[45vh] md:h-full bg-white flex items-center justify-center relative shrink-0 border-b md:border-b-0 md:border-r border-stone-100">
          <div className="absolute inset-0 bg-stone-50/50" /> 
          {images?.front ? (
              <div 
                className="w-full h-full relative group cursor-zoom-in flex items-center justify-center p-8 md:p-12" 
                onClick={() => handleImageClick(images.front)}
              >
                 <img src={images.front} alt="Product" className="max-w-full max-h-full object-contain mix-blend-multiply drop-shadow-xl transition-transform duration-500 group-hover:scale-105" />
                 <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur p-2.5 rounded-full text-stone-500 opacity-0 group-hover:opacity-100 transition-opacity md:flex hidden shadow-sm border border-stone-200">
                    <ZoomIn size={20} />
                 </div>
              </div>
          ) : (
              <div className="flex flex-col items-center justify-center text-stone-300 gap-3 z-10">
                  <ImageIcon size={64} strokeWidth={1} />
                  <span className="text-xs font-bold uppercase tracking-widest">Tiada Imej</span>
              </div>
          )}
          
          {/* Thumbnails (Desktop Only) */}
          {images && (
            <div className="hidden md:flex absolute bottom-8 gap-4 z-10">
                {images.back && <img src={images.back} onClick={() => handleImageClick(images.back)} className="w-14 h-14 rounded-xl border-2 border-white object-cover bg-white cursor-pointer hover:scale-110 transition-transform shadow-lg hover:shadow-xl ring-1 ring-stone-100" />}
                {images.halal && <img src={images.halal} onClick={() => handleImageClick(images.halal)} className="w-14 h-14 rounded-xl border-2 border-white object-cover bg-white cursor-pointer hover:scale-110 transition-transform shadow-lg hover:shadow-xl ring-1 ring-stone-100" />}
            </div>
          )}
      </div>

      {/* --- RIGHT / BOTTOM SECTION (CONTENT) --- */}
      <div className="flex-1 h-full overflow-y-auto bg-[#FDFBF7] relative -mt-6 md:mt-0 rounded-t-[2.5rem] md:rounded-none shadow-[0_-10px_60px_rgba(0,0,0,0.08)] md:shadow-none z-10">
          {/* CHANGED: Increased bottom padding (pb-32) so content isn't hidden by bottom menu */}
          <div className="p-6 md:p-12 pb-32 max-w-3xl mx-auto space-y-8 min-h-full">
              
              {/* Header Info */}
              <div className="space-y-5 text-center md:text-left pt-2 md:pt-0">
                  {/* 1. Status Badge */}
                  <div className={`inline-flex flex-col md:flex-row items-center gap-2 mx-auto md:mx-0`}>
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${statusUI.bg} ${statusUI.border} shadow-sm`}>
                          <statusUI.Icon size={16} className={statusUI.icon} strokeWidth={2.5} />
                          <span className={`text-[10px] font-bold tracking-widest uppercase ${statusUI.text}`}>{statusUI.label}</span>
                      </div>
                      {/* Ref No Badge */}
                      {data.halalRefNo && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-stone-100 border border-stone-200 text-stone-500">
                              <Hash size={12} />
                              <span className="text-[10px] font-mono font-bold tracking-tight">{data.halalRefNo}</span>
                          </div>
                      )}
                  </div>
                  
                  <div>
                    {/* 2. Product Name */}
                    <h1 className="text-3xl md:text-4xl font-bold text-stone-800 leading-tight mb-2 tracking-tight">
                        {displayTitle}
                    </h1>

                    {/* 3. Alias (if exists) */}
                    {data.alias && (
                        <p className="text-lg font-semibold text-stone-500 mb-3 italic">
                            {data.alias}
                        </p>
                    )}

                    {/* 4. Owner */}
                    <div className="flex items-center justify-center md:justify-start gap-2.5 text-stone-500">
                        {isSlaughterHouse || isFoodPremise ? <Building2 size={16}/> : <Package size={16}/>}
                        <span className="text-xs font-bold uppercase tracking-widest opacity-80">{ownerLabel}: {displayOwner}</span>
                    </div>
                  </div>

                  {/* Social Links Buttons */}
                  {socialLinks.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-2">
                          {socialLinks.map((link) => (
                              <a 
                                  key={link.type}
                                  href={link.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-colors border ${link.color}`}
                              >
                                  <link.icon size={14} /> 
                                  <span>{link.label}</span>
                                  {link.type === 'website' && <ExternalLink size={10} />}
                              </a>
                          ))}
                      </div>
                  )}
              </div>

              {/* Data Grid */}
              <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-stone-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <InfoItem label="Kategori" value={data.mainCategory} icon={Layers} />
                      {data.subCategory && <InfoItem label="Sub-Kategori" value={data.subCategory} icon={Layers} />}
                      {!isFoodPremise && !isConsumerGoods && <InfoItem label="Negara Asal" value={data.negaraAsal} icon={MapPin} />}
                      {data.negeriPengeluar && <InfoItem label="Negeri" value={data.negeriPengeluar} icon={MapPin} />}
                      {/* For slaughterhouse, saizProduk is often City/Postcode, contextually generic is fine */}
                      {!isFoodPremise && !isConsumerGoods && <InfoItem label={isSlaughterHouse ? "Bandar / Poskod" : "Saiz / Berat"} value={data.saizProduk} icon={FileText} />}
                      {data.barcode && <InfoItem label="Kod Bar" value={data.barcode} icon={ScanBarcode} />}
                      {/* Phone No */}
                      {data.phone && <InfoItem label="No Telefon" value={data.phone} icon={Phone} />}
                      
                      <InfoItem label="Tarikh Kemaskini" value={formattedDate} icon={Calendar} />
                      {data.expiryDate && <InfoItem label={isSlaughterHouse || isFoodPremise || isConsumerGoods ? "Tarikh Luput Sijil" : "Tarikh Luput"} value={data.expiryDate} icon={Calendar} showProgress={true} />}
                  </div>
              </div>

              {/* COMPANY PRODUCTS / MENU LIST (For Food/Bev/Premise) */}
              {companyProducts.length > 1 && (
                  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-stone-100 animate-in slide-in-from-bottom-4">
                      <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                              <List size={16} className="text-stone-300" />
                              Senarai Produk Berdaftar ({companyProducts.length})
                          </h3>
                      </div>

                      {/* Mini Search within list */}
                      <div className="mb-4 relative">
                          <input 
                              type="text" 
                              placeholder="Cari dalam senarai ini..." 
                              value={companySearch}
                              onChange={(e) => setCompanySearch(e.target.value)}
                              className="w-full bg-stone-50 border border-stone-100 rounded-xl py-2.5 pl-9 pr-4 text-xs font-medium focus:outline-none focus:border-stone-300"
                          />
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                      </div>

                      <div className="overflow-hidden border border-stone-100 rounded-xl">
                          <div className="overflow-x-auto max-h-60 overflow-y-auto custom-scrollbar">
                              <table className="w-full text-left border-collapse">
                                  <thead className="bg-stone-50 sticky top-0 z-10">
                                      <tr className="text-[10px] uppercase text-stone-400 font-bold border-b border-stone-100">
                                          <th className="px-4 py-3 whitespace-nowrap">Produk</th>
                                          <th className="px-4 py-3 whitespace-nowrap">Jenama</th>
                                          <th className="px-4 py-3 whitespace-nowrap text-right">Luput Sijil</th>
                                      </tr>
                                  </thead>
                                  <tbody className="text-xs text-stone-600 divide-y divide-stone-50">
                                      {filteredCompanyProducts.map((p, idx) => (
                                          <tr 
                                            key={p.id} 
                                            onClick={() => onSelectAlternative && onSelectAlternative(p)}
                                            className={`cursor-pointer transition-colors ${p.id === data.id ? 'bg-emerald-50/50' : 'hover:bg-stone-50'}`}
                                          >
                                              <td className="px-4 py-3 font-medium">
                                                  {p.namaProduk}
                                                  {p.id === data.id && <span className="ml-2 text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">SEMASA</span>}
                                              </td>
                                              <td className="px-4 py-3 text-stone-500">{p.namaPengeluar.split(' ').slice(0, 2).join(' ')}...</td>
                                              <td className="px-4 py-3 text-right font-mono text-[10px] text-stone-400">
                                                  {p.expiryDate || '-'}
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                      <p className="text-[9px] text-stone-400 text-center mt-3">
                          Klik pada produk lain untuk melihat butiran lanjut.
                      </p>
                  </div>
              )}

              {/* Ingredients Card */}
              <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-stone-100">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      {isFoodPremise ? <MapPin size={16} className="text-stone-300" /> : <FileText size={16} className="text-stone-300" />}
                      {isSlaughterHouse ? "Maklumat Tambahan / Catatan" : isFoodPremise ? "Alamat Premis" : isConsumerGoods ? "Catatan Tambahan" : "Bahan Ramuan"}
                  </h3>
                  <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-line font-medium">
                      {data.bahanRamuan || (isSlaughterHouse || isConsumerGoods ? "Tiada catatan tambahan." : isFoodPremise ? "Tiada alamat direkodkan." : "Tiada maklumat ramuan direkodkan.")}
                  </p>
              </div>

              {/* MONETIZATION FEATURE: Halal Alternatives */}
              {shouldShowAlternatives && alternatives.length > 0 && (
                  <div className="animate-in slide-in-from-bottom-8 duration-700">
                      <div className="bg-emerald-50 rounded-[2rem] p-6 border border-emerald-100 relative overflow-hidden">
                          {/* Background decoration */}
                          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-full -mr-10 -mt-10 blur-2xl opacity-50 pointer-events-none" />
                          
                          <div className="flex items-start gap-3 mb-6 relative z-10">
                              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-sm shrink-0 border border-emerald-200">
                                  <Sparkles size={18} fill="currentColor" className="opacity-20" />
                                  <ShoppingBag size={18} className="absolute" />
                              </div>
                              <div>
                                  <h3 className="font-bold text-emerald-900 text-lg leading-tight">Pilihan Alternatif Halal</h3>
                                  <p className="text-emerald-700 text-xs mt-1 font-medium">
                                      Produk ini disahkan JAKIM & disyorkan untuk anda. Sokong Produk Muslim (IKS).
                                  </p>
                              </div>
                          </div>

                          <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 hide-scrollbar snap-x relative z-10">
                              {alternatives.map((item) => (
                                  <button 
                                      key={item.id}
                                      onClick={() => onSelectAlternative && onSelectAlternative(item)}
                                      className="w-48 shrink-0 bg-white rounded-2xl p-3 shadow-sm border border-emerald-100/50 hover:shadow-md hover:-translate-y-1 transition-all text-left snap-start group"
                                  >
                                      <div className="w-full h-28 bg-stone-50 rounded-xl mb-3 overflow-hidden relative">
                                           {item.images?.front ? (
                                               <img src={item.images.front} className="w-full h-full object-cover mix-blend-multiply group-hover:scale-105 transition-transform duration-500" />
                                           ) : (
                                               <div className="w-full h-full flex items-center justify-center text-stone-200"><ImageIcon /></div>
                                           )}
                                           <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
                                               JAKIM
                                           </div>
                                      </div>
                                      <h4 className="font-bold text-stone-800 text-xs leading-tight line-clamp-2 mb-1 group-hover:text-emerald-700 transition-colors">{item.namaProduk}</h4>
                                      <p className="text-[10px] text-stone-400 truncate mb-2">{item.namaPengeluar}</p>
                                      <div className="flex items-center text-[10px] font-bold text-emerald-600 gap-1">
                                          Lihat <ChevronRight size={12} />
                                      </div>
                                  </button>
                              ))}
                          </div>
                      </div>
                  </div>
              )}

              {/* Mobile Thumbnails */}
              <div className="md:hidden space-y-4">
                  <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-2 text-center">Bukti Imej (Ketuk untuk zoom)</h3>
                  <div className="grid grid-cols-2 gap-4">
                      {images?.back && (
                          <div 
                            className="aspect-[4/3] bg-white rounded-2xl border border-stone-100 overflow-hidden p-2 shadow-sm cursor-zoom-in active:scale-95 transition-transform"
                            onClick={() => handleImageClick(images.back!)}
                          >
                              <img src={images.back} className="w-full h-full object-cover rounded-xl" />
                              <p className="text-[9px] text-center text-stone-400 mt-2 uppercase font-bold tracking-wider">{isSlaughterHouse ? "Maklumat" : isFoodPremise ? "Premis" : isConsumerGoods ? "Maklumat" : "Ramuan"}</p>
                          </div>
                      )}
                      {images?.halal && (
                          <div 
                            className="aspect-[4/3] bg-white rounded-2xl border border-stone-100 overflow-hidden p-2 shadow-sm cursor-zoom-in active:scale-95 transition-transform"
                            onClick={() => handleImageClick(images.halal!)}
                          >
                              <img src={images.halal} className="w-full h-full object-cover rounded-xl" />
                              <p className="text-[9px] text-center text-stone-400 mt-2 uppercase font-bold tracking-wider">Logo</p>
                          </div>
                      )}
                  </div>
              </div>

          </div>
      </div>

      {/* --- FOOTER ACTION (STICKY) --- */}
      {!readOnly && (
         <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-xl border-t border-stone-100 z-50 md:static md:bg-transparent md:border-none md:w-auto">
            <div className="max-w-3xl mx-auto flex justify-center md:justify-end">
                <button 
                    onClick={onReset}
                    className="w-full md:w-auto bg-stone-800 text-[#FDFBF7] py-4 px-12 rounded-2xl font-bold text-sm shadow-xl shadow-stone-800/15 hover:bg-stone-700 hover:shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 tracking-wide"
                >
                    <Upload size={20} />
                    SIMPAN KE PANGKALAN DATA
                </button>
            </div>
         </div>
      )}
    </div>
  );
};

export default ResultCard;
