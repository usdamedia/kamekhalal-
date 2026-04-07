
import React, { useState } from 'react';
import { ProductData } from '../types';
import { X, Merge, Trash2, CheckCircle, ArrowRight, AlertTriangle, Building2, MapPin, Store, Calendar, Clock, AlertOctagon, ShieldCheck } from 'lucide-react';
import { dbService } from '../services/firebase';

interface DuplicateResolverModalProps {
  duplicates: Record<string, ProductData[]>;
  onClose: () => void;
  onResolve: () => void;
}

const DuplicateResolverModal: React.FC<DuplicateResolverModalProps> = ({ duplicates, onClose, onResolve }) => {
  const [duplicateGroups, setDuplicateGroups] = useState(duplicates);
  const [expandedKey, setExpandedKey] = useState<string | null>(Object.keys(duplicates)[0] || null);
  const [selectedMasterId, setSelectedMasterId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const groupKeys = Object.keys(duplicateGroups);

  const handleMerge = async (master: ProductData, duplicate: ProductData) => {
      // Safety Check: If company names are totally different, ask for double confirmation
      if (master.namaPengeluar !== duplicate.namaPengeluar) {
          const confirmMerge = window.confirm(
              `AMARAN: Nama Syarikat/Kedai tidak sama!\n\nMaster: ${master.namaPengeluar}\nDuplicate: ${duplicate.namaPengeluar}\n\nAdakah anda pasti mahu gabungkan?`
          );
          if (!confirmMerge) return;
      }

      setIsProcessing(true);
      try {
          // Merge Logic: Use Master as base. If Master has empty fields that Duplicate has, take Duplicate's.
          const mergedData: Partial<ProductData> = {
              ...master,
              images: {
                  front: master.images?.front || duplicate.images?.front || '',
                  back: master.images?.back || duplicate.images?.back || '',
                  halal: master.images?.halal || duplicate.images?.halal || ''
              },
              bahanRamuan: master.bahanRamuan || duplicate.bahanRamuan,
              barcode: master.barcode || duplicate.barcode,
              expiryDate: master.expiryDate || duplicate.expiryDate,
              statusHalal: master.statusHalal // Prefer Master's status usually
          };

          await dbService.mergeProducts(master.id, duplicate.id, mergedData);
          
          removeDuplicateFromState(duplicate.id);
          setIsProcessing(false);
      } catch (e) {
          console.error("Merge failed", e);
          alert("Gagal menggabungkan rekod.");
          setIsProcessing(false);
      }
  };

  const handleDelete = async (id: string) => {
      if(!confirm("Padam rekod ini secara kekal?")) return;
      setIsProcessing(true);
      try {
          await dbService.deleteProduct(id);
          removeDuplicateFromState(id);
          setIsProcessing(false);
      } catch (e) {
          alert("Gagal memadam.");
          setIsProcessing(false);
      }
  };

  const handleDismissGroup = () => {
      if (!expandedKey) return;
      
      // Just remove the key from the local state list, effectively "approving" them as separate
      const newGroups = { ...duplicateGroups };
      delete newGroups[expandedKey];
      
      setDuplicateGroups(newGroups);
      
      // Navigate to next
      const nextKey = Object.keys(newGroups)[0] || null;
      setExpandedKey(nextKey);
      setSelectedMasterId(null);

      // Close if all handled
      if (Object.keys(newGroups).length === 0) {
          onResolve();
      }
  };

  const removeDuplicateFromState = (removedId: string) => {
      if (!expandedKey) return;
      
      const newGroups = { ...duplicateGroups };
      newGroups[expandedKey] = newGroups[expandedKey].filter(p => p.id !== removedId);
      
      // If group has 1 or 0 items left, remove the group entirely
      if (newGroups[expandedKey].length <= 1) {
          delete newGroups[expandedKey];
          setExpandedKey(Object.keys(newGroups)[0] || null);
          setSelectedMasterId(null);
      }
      
      setDuplicateGroups(newGroups);
      // Trigger parent refresh if empty
      if (Object.keys(newGroups).length === 0) {
          onResolve();
      }
  };

  const currentGroup = expandedKey ? duplicateGroups[expandedKey] : [];
  const masterItem = selectedMasterId ? currentGroup.find(p => p.id === selectedMasterId) : null;

  return (
    <div className="fixed inset-0 z-[70] bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
        <div className="bg-[#FDFBF7] w-full max-w-4xl h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-stone-100">
            
            {/* Header */}
            <div className="bg-white p-6 border-b border-stone-100 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2">
                        <Merge className="text-stone-400" size={24} /> Pengurusan Duplikasi
                    </h2>
                    <p className="text-xs text-stone-400 mt-1">Dikesan {groupKeys.length} kumpulan nama yang sama.</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors"><X size={24} className="text-stone-400" /></button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                
                {/* Left Sidebar: List of Names */}
                <div className="w-1/3 bg-white border-r border-stone-100 overflow-y-auto hidden md:block">
                    {groupKeys.length === 0 ? (
                        <div className="p-8 text-center text-stone-400 text-sm">Tiada duplikasi dikesan!</div>
                    ) : (
                        groupKeys.map(key => (
                            <button 
                                key={key}
                                onClick={() => { setExpandedKey(key); setSelectedMasterId(null); }}
                                className={`w-full text-left p-4 border-b border-stone-50 hover:bg-stone-50 transition-colors flex justify-between items-center ${expandedKey === key ? 'bg-stone-50 ring-inset ring-2 ring-stone-800' : ''}`}
                            >
                                <div>
                                    <p className="font-bold text-sm text-stone-800 line-clamp-1 capitalize">{key}</p>
                                    <p className="text-[10px] text-stone-400">{duplicateGroups[key].length} Rekod</p>
                                </div>
                                <ArrowRight size={16} className="text-stone-300" />
                            </button>
                        ))
                    )}
                </div>

                {/* Mobile Dropdown for Group Selection */}
                <div className="md:hidden w-full p-4 border-b border-stone-100 bg-white">
                    <select 
                        value={expandedKey || ''} 
                        onChange={(e) => { setExpandedKey(e.target.value); setSelectedMasterId(null); }}
                        className="w-full p-3 bg-stone-50 rounded-xl font-bold text-stone-800 text-sm border border-stone-100"
                    >
                        {groupKeys.map(key => <option key={key} value={key}>{key} ({duplicateGroups[key].length})</option>)}
                    </select>
                </div>

                {/* Right Content: Resolution Area */}
                <div className="flex-1 bg-[#FDFBF7] overflow-y-auto p-6">
                    {expandedKey && currentGroup.length > 0 ? (
                        <div className="space-y-6">
                            
                            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                <div className="flex gap-3 items-center">
                                    <AlertTriangle className="text-blue-600 shrink-0" size={20} />
                                    <p className="text-xs text-blue-800 leading-relaxed">
                                        Pilih <strong>satu rekod utama (Master)</strong> yang ingin disimpan.
                                    </p>
                                </div>
                                
                                {/* DISMISS BUTTON: Use when distinct entities are detected */}
                                <button 
                                    onClick={handleDismissGroup}
                                    className="shrink-0 px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-blue-100 transition-colors flex items-center gap-2 shadow-sm"
                                >
                                    <ShieldCheck size={14} /> Bukan Duplikasi (Kekalkan Semua)
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {currentGroup.map(item => {
                                    const isMaster = selectedMasterId === item.id;
                                    const isSlaughterHouse = item.mainCategory === 'Rumah Sembelihan';
                                    const isFoodPremise = item.mainCategory === 'Premis Makanan';
                                    
                                    // Conflict Detection
                                    let hasConflict = false;
                                    let conflicts = [];
                                    if (masterItem && !isMaster) {
                                        if (item.namaPengeluar !== masterItem.namaPengeluar) {
                                            hasConflict = true;
                                            conflicts.push("Syarikat Berbeza");
                                        }
                                        if (item.negeriPengeluar !== masterItem.negeriPengeluar && item.negeriPengeluar) {
                                            hasConflict = true;
                                            conflicts.push("Negeri Berbeza");
                                        }
                                        // For Premises, Check Address differences significantly
                                        if (isFoodPremise && item.bahanRamuan !== masterItem.bahanRamuan) {
                                            hasConflict = true;
                                            conflicts.push("Alamat Berbeza");
                                        }
                                    }

                                    // Date Checks
                                    const hasExpiry = !!item.expiryDate;
                                    const isExpired = hasExpiry && new Date(item.expiryDate!) < new Date();

                                    return (
                                        <div 
                                            key={item.id} 
                                            onClick={() => !selectedMasterId && setSelectedMasterId(item.id)}
                                            className={`relative p-5 rounded-[2rem] border transition-all cursor-pointer group ${
                                                isMaster 
                                                ? 'bg-white border-green-500 shadow-xl ring-2 ring-green-500 scale-[1.02] z-10' 
                                                : selectedMasterId 
                                                    ? hasConflict 
                                                        ? 'bg-red-50 border-red-200' 
                                                        : 'bg-white border-stone-200 opacity-90 hover:opacity-100' 
                                                    : 'bg-white border-stone-200 hover:border-stone-400 hover:shadow-md'
                                            }`}
                                        >
                                            {isMaster && (
                                                <div className="absolute -top-3 -right-3 bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-bold shadow-md flex items-center gap-1">
                                                    <CheckCircle size={12} /> MASTER
                                                </div>
                                            )}

                                            {hasConflict && !isMaster && (
                                                <div className="absolute -top-2 -right-2 bg-red-100 text-red-600 px-3 py-1 rounded-full text-[9px] font-bold shadow-sm flex items-center gap-1 border border-red-200">
                                                    <AlertOctagon size={12} /> {conflicts.join(", ")}
                                                </div>
                                            )}

                                            <div className="flex items-start gap-4 mb-4">
                                                <div className="w-16 h-16 bg-stone-100 rounded-xl overflow-hidden shrink-0 border border-stone-100">
                                                    {item.images?.front ? <img src={item.images.front} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400 font-bold">TIADA IMEJ</div>}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-stone-800 text-sm leading-tight mb-1">{isSlaughterHouse ? item.namaPengeluar : item.namaProduk}</h4>
                                                    
                                                    {/* Company/Owner Name Display - Highlighted for Comparison */}
                                                    <p className={`text-xs font-bold flex items-center gap-1 mt-1 ${hasConflict ? 'text-red-600' : 'text-stone-600'}`}>
                                                        {isSlaughterHouse ? <Building2 size={10}/> : isFoodPremise ? <Store size={10}/> : <Building2 size={10}/>}
                                                        {isSlaughterHouse ? item.namaProduk : item.namaPengeluar}
                                                    </p>
                                                    
                                                    <div className="flex gap-2 mt-1">
                                                        {item.negeriPengeluar && (
                                                            <span className={`text-[9px] px-1.5 rounded border ${hasConflict && item.negeriPengeluar !== masterItem?.negeriPengeluar ? 'bg-red-100 text-red-700 border-red-200' : 'bg-stone-50 text-stone-500 border-stone-100'}`}>
                                                                {item.negeriPengeluar}
                                                            </span>
                                                        )}
                                                        <p className="text-[9px] text-stone-400 font-mono bg-stone-50 inline-block px-1.5 rounded border border-stone-100">ID: ...{item.id.slice(-6)}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2 text-[10px] text-stone-600 bg-white/50 p-3 rounded-xl mb-4 border border-stone-100">
                                                <div className="flex justify-between items-center">
                                                    <span>Status:</span> 
                                                    <span className={`font-bold px-1.5 rounded ${item.statusHalal.includes('JAKIM') ? 'bg-green-100 text-green-700' : 'bg-stone-200'}`}>{item.statusHalal}</span>
                                                </div>
                                                
                                                <div className="flex justify-between items-center">
                                                    <span className="flex items-center gap-1"><Calendar size={10}/> Luput Sijil:</span> 
                                                    <span className={`font-mono font-bold ${isExpired ? 'text-red-600' : hasExpiry ? 'text-stone-800' : 'text-stone-400'}`}>
                                                        {item.expiryDate || '-'}
                                                    </span>
                                                </div>

                                                <div className="flex justify-between items-center">
                                                    <span className="flex items-center gap-1"><Clock size={10}/> Kemaskini:</span> 
                                                    <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                                                </div>

                                                <div className="flex flex-col border-t border-stone-200 pt-2 mt-2 gap-1">
                                                    <span className="font-bold text-stone-400">
                                                        {isFoodPremise ? "Alamat Premis:" : "Ramuan/Catatan:"}
                                                    </span> 
                                                    <p className={`line-clamp-2 leading-tight ${hasConflict && isFoodPremise ? 'text-red-600 font-bold bg-red-50 p-1 rounded' : 'text-stone-600'}`}>
                                                        {item.bahanRamuan || '-'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            {selectedMasterId && !isMaster && (
                                                <div className="flex gap-2 mt-4">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleMerge(duplicateGroups[expandedKey!].find(p => p.id === selectedMasterId)!, item); }}
                                                        disabled={isProcessing}
                                                        className={`flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${hasConflict ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-stone-800 text-white hover:bg-stone-700'}`}
                                                    >
                                                        <Merge size={14} /> {hasConflict ? 'Gabung (Ada Risiko)' : 'Gabung ke Master'}
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                                        disabled={isProcessing}
                                                        className="py-3 px-4 bg-red-50 text-red-600 rounded-xl font-bold text-xs hover:bg-red-100 flex items-center justify-center transition-colors disabled:opacity-50"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            )}
                                            
                                            {!selectedMasterId && (
                                                <p className="text-center text-[10px] font-bold text-stone-400 mt-2">Ketuk untuk pilih sebagai Master</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {selectedMasterId && (
                                <button onClick={() => setSelectedMasterId(null)} className="mx-auto block text-xs font-bold text-stone-400 hover:text-stone-600 underline">
                                    Batal Pemilihan Master
                                </button>
                            )}

                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-stone-300">
                            <Merge size={48} strokeWidth={1} />
                            <p className="mt-4 text-sm font-medium">Pilih kumpulan di sebelah kiri</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default DuplicateResolverModal;
