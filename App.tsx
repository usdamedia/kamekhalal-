
import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Loader2, Package, Home, Database, ArrowRight, ArrowLeft, Check, Search, ShieldCheck, User as UserIcon, Trash2, CheckCircle, X, Trophy, AlertCircle, PlusSquare, Building2, SlidersHorizontal, Utensils, Sparkles, Pill, Truck, Factory, Stethoscope, Beef, Image as ImageIcon, Square, CheckSquare, PlusCircle, Eye, AlertTriangle, Globe, MapPin, Store, Merge, AlarmClock, CalendarX } from 'lucide-react';
import ResultCard from './components/ResultCard';
import { LoginScreen } from './components/LoginScreen';
import EditProductModal from './components/EditProductModal';
import ProfileScreen from './components/ProfileScreen';
import AdminAddProductPage from './components/AdminAddProductPage';
import UserContributePage from './components/UserContributePage';
import DuplicateResolverModal from './components/DuplicateResolverModal';
import { authService, dbService } from './services/firebase';
import { resolveUserRole } from './services/config';
import { ProductData, AppState, AppPage, MAIN_CATEGORIES, User, ISubmission } from './types';
import { useLanguage } from './contexts/LanguageContext';

const App: React.FC = () => {
  const { t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [activePage, setActivePage] = useState<AppPage>(AppPage.HOME);
  const [appState, setAppState] = useState<AppState>(AppState.LOGIN);
  
  // Data States
  const [globalData, setGlobalData] = useState<ProductData[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<ISubmission[]>([]);
  const [dashboardTab, setDashboardTab] = useState<'database' | 'review' | 'alerts'>('database');
  
  // Interaction States
  const [viewingItem, setViewingItem] = useState<ProductData | null>(null);
  const [editingItem, setEditingItem] = useState<ProductData | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ProductData | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Admin Review States
  const [viewingSubmission, setViewingSubmission] = useState<ISubmission | null>(null);
  const [submissionToApprove, setSubmissionToApprove] = useState<ISubmission | null>(null);
  
  // Duplicate Management States
  const [duplicateGroups, setDuplicateGroups] = useState<Record<string, ProductData[]>>({});
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // UI States
  const [showToast, setShowToast] = useState<{show: boolean, msg: string}>({show: false, msg: ''});
  const [searchQuery, setSearchQuery] = useState("");
  const [dashboardSearch, setDashboardSearch] = useState(""); 
  const [viewingCategory, setViewingCategory] = useState<string | 'Semua'>('Semua');
  const [leaderboardUsers, setLeaderboardUsers] = useState<User[]>([]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const CATEGORY_ICONS: Record<string, React.ElementType> = {
    "Produk Makanan dan Minuman": Utensils,
    "Produk Kosmetik": Sparkles,
    "Produk Farmaseutikal": Pill,
    "Produk Barang Gunaan": Package,
    "Perkhidmatan Logistik": Truck,
    "Rumah Sembelihan": Beef,
    "Pengilangan Kontrak/OEM": Factory,
    "Produk Peranti Perubatan": Stethoscope,
    "Premis Makanan": Store
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('beforeinstallprompt event fired');
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log('App was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const authTimeout = window.setTimeout(() => {
        if (isMounted) {
            console.warn('Firebase auth initialization timed out, falling back to login screen.');
            setCurrentUser(null);
            setAppState(AppState.LOGIN);
            setIsAuthChecking(false);
        }
    }, 10000); // Increased to 10 seconds for slower connections

    const unsubscribe = authService.subscribe(async (firebaseUser) => {
        try {
            if (!isMounted) return;

            if (firebaseUser) {
                if (!firebaseUser.emailVerified) {
                    setCurrentUser(null);
                    setAppState(AppState.LOGIN);
                    setIsAuthChecking(false);
                    window.clearTimeout(authTimeout);
                    return;
                }

                const storedUser = await dbService.getUser(firebaseUser.uid);
                const role = resolveUserRole(firebaseUser.email, storedUser?.role);
                const appUser: User = {
                    id: firebaseUser.uid,
                    name: storedUser?.name || 'Pengguna',
                    email: firebaseUser.email || '',
                    avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
                    role: role,
                    phone: storedUser?.phone,
                    dob: storedUser?.dob,
                    totalContributions: storedUser?.totalContributions || 0
                };
                setCurrentUser(appUser);
                setAppState(AppState.IDLE);
                loadDataFromFirestore(role, firebaseUser.uid);
            } else {
                setCurrentUser(null);
                setAppState(AppState.LOGIN);
            }
        } catch (error) {
            console.error('Auth bootstrap failed:', error);
            setCurrentUser(null);
            setAppState(AppState.LOGIN);
        } finally {
            if (isMounted) {
                window.clearTimeout(authTimeout);
                setIsAuthChecking(false);
            }
        }
    });

    return () => {
        isMounted = false;
        window.clearTimeout(authTimeout);
        unsubscribe();
    };
  }, []);

  // Fetch Leaderboard when page active
  useEffect(() => {
    if (activePage === AppPage.LEADERBOARD) {
        dbService.getTopContributors(20).then(setLeaderboardUsers);
    }
  }, [activePage]);

  const loadDataFromFirestore = async (role: string, userId: string) => {
    const allProducts = await dbService.getAllProducts();
    setGlobalData(allProducts);

    if (role === 'admin') {
        const pendings = await dbService.getPendingSubmissions();
        setPendingSubmissions(pendings);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
    setAppState(AppState.LOGIN);
    setActivePage(AppPage.HOME);
  };

  const enterApp = () => {
      setAppState(AppState.IDLE);
  };

  const handleUpdateUser = async (updatedUser: User) => {
    setCurrentUser(updatedUser);
    await dbService.saveUser(updatedUser);
  };

  const saveProductToDB = async (data: ProductData) => {
    setGlobalData(prev => [data, ...prev]);
    await dbService.addProduct(data);
  };

  const updateProductInDB = async (updatedProduct: ProductData) => {
    // 1. Optimistic update of specific item
    setGlobalData(prev => prev.map(item => item.id === updatedProduct.id ? updatedProduct : item));
    
    // 2. Update specific item in DB
    await dbService.updateProduct(updatedProduct);
    
    // 3. AUTO-PROPAGATE: Update socials/alias for ALL products under same company
    if (updatedProduct.namaPengeluar) {
         const companyDetails = {
             alias: updatedProduct.alias,
             website: updatedProduct.website,
             facebook: updatedProduct.facebook,
             tiktok: updatedProduct.tiktok,
             threads: updatedProduct.threads,
             instagram: updatedProduct.instagram
         };
         
         // Backend Propagation
         await dbService.updateCompanyDetails(updatedProduct.namaPengeluar, companyDetails);
         
         // Frontend Propagation (Immediate visual update for siblings)
         setGlobalData(prev => prev.map(p => {
             // Match by company name
             if (p.namaPengeluar === updatedProduct.namaPengeluar) {
                 return { ...p, ...companyDetails };
             }
             return p;
         }));
    }

    if (viewingItem && viewingItem.id === updatedProduct.id) {
        setViewingItem(updatedProduct);
    }
  };

  const requestDelete = (e: React.MouseEvent | null, item: ProductData) => { 
      if(e) e.stopPropagation(); 
      setItemToDelete(item); 
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const previousData = [...globalData];
    setGlobalData(prev => prev.filter(item => item.id !== itemToDelete.id));
    if (viewingItem?.id === itemToDelete.id) {
        setViewingItem(null);
    }
    try {
        await dbService.deleteProduct(itemToDelete.id);
        setItemToDelete(null);
        setShowToast({show: true, msg: 'Produk Dipadam'});
        setTimeout(() => setShowToast({show: false, msg: ''}), 3000);
    } catch (error: any) {
        setShowToast({show: true, msg: 'Ralat memadam rekod'});
        setTimeout(() => setShowToast({show: false, msg: ''}), 3000);
        setGlobalData(previousData);
        setItemToDelete(null);
    }
  };

  // --- BULK ACTION LOGIC ---

  const toggleSelection = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const newSet = new Set(selectedItems);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedItems(newSet);
  };

  // Logic to Select All items currently visible in the dashboard list
  const handleSelectAll = (visibleItems: ProductData[]) => {
      if (visibleItems.length === 0) return;

      const allIds = visibleItems.map(item => item.id);
      const allSelected = allIds.every(id => selectedItems.has(id));

      if (allSelected) {
          // Deselect visible items (keep others if any)
          const newSet = new Set(selectedItems);
          allIds.forEach(id => newSet.delete(id));
          setSelectedItems(newSet);
      } else {
          // Select all visible items
          const newSet = new Set(selectedItems);
          allIds.forEach(id => newSet.add(id));
          setSelectedItems(newSet);
      }
  };

  const handleBulkDelete = async () => {
      if (selectedItems.size === 0) return;
      setIsBulkDeleting(true);
      
      const idsToDelete = Array.from(selectedItems) as string[];
      
      // Optimistic update
      const previousData = [...globalData];
      setGlobalData(prev => prev.filter(item => !selectedItems.has(item.id)));
      setShowBulkDeleteModal(false);

      try {
          await dbService.bulkDeleteProducts(idsToDelete);
          setSelectedItems(new Set());
          setShowToast({show: true, msg: `${idsToDelete.length} Rekod Dipadam`});
          setTimeout(() => setShowToast({show: false, msg: ''}), 3000);
      } catch (error) {
          console.error("Bulk delete failed", error);
          setShowToast({show: true, msg: 'Ralat pemadaman pukal'});
          setTimeout(() => setShowToast({show: false, msg: ''}), 3000);
          setGlobalData(previousData); // Revert
      } finally {
          setIsBulkDeleting(false);
      }
  };

  const handleEditClick = (e: React.MouseEvent | null, item: ProductData) => {
      if(e) e.stopPropagation();
      setEditingItem(item);
  };

  const handleAdminSaveProduct = async (data: Omit<ProductData, 'id' | 'userId' | 'userName' | 'timestamp' | 'approvalStatus'>) => {
     if (!currentUser) return;
     const newItem: ProductData = {
         ...data,
         id: crypto.randomUUID(),
         userId: currentUser.id,
         userName: currentUser.name,
         timestamp: Date.now(),
         approvalStatus: 'approved',
         barcode: data.barcode || null
     };
     await saveProductToDB(newItem);
     setActivePage(AppPage.DASHBOARD);
     setShowToast({show: true, msg: 'Produk Ditambah!'});
     setTimeout(() => setShowToast({show: false, msg: ''}), 3000);
  };

  const handleUserContributeSave = async (data: Omit<ProductData, 'id' | 'userId' | 'userName' | 'timestamp' | 'approvalStatus'>) => {
     if (!currentUser) return;
     const newItem: ProductData = {
         ...data,
         id: crypto.randomUUID(),
         userId: currentUser.id,
         userName: currentUser.name,
         timestamp: Date.now(),
         approvalStatus: 'pending', 
         barcode: data.barcode || null
     };
     await saveProductToDB(newItem);
     setActivePage(AppPage.HOME);
     setShowToast({show: true, msg: 'Hantar untuk semakan!'});
     setTimeout(() => setShowToast({show: false, msg: ''}), 3000);
  };

  const handleApprove = (e: React.MouseEvent, product: ProductData) => {
    e.stopPropagation();
    const updated = { ...product, approvalStatus: 'approved' as const };
    updateProductInDB(updated);
  };

  // --- DUPLICATE LOGIC ---
  const checkForDuplicates = () => {
      const groups: Record<string, ProductData[]> = {};
      globalData.forEach(p => {
          let nameKey = "";
          if (p.mainCategory === "Rumah Sembelihan") {
              nameKey = p.namaPengeluar; 
          } else {
              nameKey = p.namaProduk;
          }
          
          nameKey = nameKey.toLowerCase().trim();
          if (nameKey.length < 3) return; // Skip very short names to avoid noise

          if(!groups[nameKey]) groups[nameKey] = [];
          groups[nameKey].push(p);
      });

      // Filter groups with > 1 item
      const duplicates: Record<string, ProductData[]> = {};
      Object.keys(groups).forEach(key => {
          if (groups[key].length > 1) {
              duplicates[key] = groups[key];
          }
      });

      if (Object.keys(duplicates).length > 0) {
          setDuplicateGroups(duplicates);
          setShowDuplicateModal(true);
      } else {
          setShowToast({show: true, msg: 'Tiada duplikasi dikesan.'});
          setTimeout(() => setShowToast({show: false, msg: ''}), 3000);
      }
  };

  const handleDuplicateResolve = async () => {
      // Reload data to reflect merges/deletions
      if (currentUser) {
          await loadDataFromFirestore(currentUser.role, currentUser.id);
      }
      setShowDuplicateModal(false);
      setShowToast({show: true, msg: 'Data dikemaskini.'});
      setTimeout(() => setShowToast({show: false, msg: ''}), 3000);
  };

  // --- EXPIRY & ALERTS LOGIC (Admin Only) ---
  const getExpiryAlerts = () => {
      return globalData.filter(item => {
          // Must have expiry date
          if (!item.expiryDate) return false;
          
          // Must be approved (only monitoring active database)
          if (item.approvalStatus !== 'approved') return false;

          const expiry = new Date(item.expiryDate);
          const now = new Date();
          const diffTime = expiry.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // Condition: Expired OR Less than 30 days
          return diffDays <= 30; 
      }).sort((a, b) => {
          // Sort ascending: Oldest dates (expired) first
          return new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime();
      });
  };

  const expiryAlertItems = getExpiryAlerts();

  // --- SUBMISSION APPROVAL LOGIC ---

  const convertSubmissionToProduct = (submission: ISubmission): ProductData => {
      return {
          id: submission.id,
          userId: submission.contributorUid,
          userName: 'Penyumbang',
          namaProduk: submission.name,
          namaPengeluar: submission.brand,
          statusHalal: 'Pending Review',
          negaraAsal: 'Malaysia',
          saizProduk: '-',
          bahanRamuan: submission.ingredients || '',
          mainCategory: submission.categorySuggestion,
          timestamp: submission.submissionTimestamp,
          approvalStatus: 'pending',
          images: {
              front: submission.frontImageURL,
              back: submission.backImageURL,
              halal: submission.halalLogoImageURL
          }
      };
  };

  const handleOpenStatusModal = (e: React.MouseEvent, submission: ISubmission) => {
      e.stopPropagation();
      setSubmissionToApprove(submission);
  };

  const handleConfirmApproval = async (status: string) => {
      if (!submissionToApprove) return;
      
      const newProduct: ProductData = {
          id: submissionToApprove.id,
          userId: submissionToApprove.contributorUid,
          userName: 'Penyumbang',
          namaProduk: submissionToApprove.name,
          namaPengeluar: submissionToApprove.brand,
          statusHalal: status, // Set the selected status
          negaraAsal: 'Malaysia',
          saizProduk: '-',
          bahanRamuan: submissionToApprove.ingredients || '',
          mainCategory: submissionToApprove.categorySuggestion,
          timestamp: Date.now(),
          approvalStatus: 'approved',
          images: {
              front: submissionToApprove.frontImageURL,
              back: submissionToApprove.backImageURL,
              halal: submissionToApprove.halalLogoImageURL
          }
      };

      await dbService.approveSubmission(submissionToApprove.id, newProduct);
      
      setPendingSubmissions(prev => prev.filter(s => s.id !== submissionToApprove.id));
      setGlobalData(prev => [newProduct, ...prev]);
      setSubmissionToApprove(null);
      setViewingSubmission(null);
      setShowToast({show: true, msg: 'Status Dikemaskini & Diluluskan'});
      setTimeout(() => setShowToast({show: false, msg: ''}), 3000);
  };

  const handleRejectSubmission = async (e: React.MouseEvent, submissionId: string) => {
      e.stopPropagation();
      await dbService.rejectSubmission(submissionId);
      setPendingSubmissions(prev => prev.filter(s => s.id !== submissionId));
      setShowToast({show: true, msg: 'Sumbangan Ditolak'});
      setTimeout(() => setShowToast({show: false, msg: ''}), 3000);
  };

  // --- RENDERERS ---

  const renderWelcomeScreen = () => (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
        <div className="w-28 h-28 bg-white rounded-[2.5rem] shadow-xl shadow-stone-200 border border-stone-100 flex items-center justify-center mb-8 rotate-3 transform hover:rotate-0 transition-transform duration-500">
            <ShieldCheck size={56} className="text-stone-800" strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl font-bold text-stone-800 mb-2 tracking-tight">Selamat Datang, <br/>{currentUser?.name?.split(' ')[0]}!</h1>
        <p className="text-stone-500 text-sm leading-relaxed max-w-xs mx-auto mb-10 font-medium">
            {t.help_desc}
        </p>
        <button 
            onClick={enterApp}
            className="w-full max-w-xs bg-stone-800 text-white font-bold py-4 rounded-2xl shadow-xl shadow-stone-800/20 hover:bg-stone-700 hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2 group"
        >
            Mula Meneroka <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
    </div>
  );

  const renderLeaderboardPage = () => (
     <div className="pb-28 pt-2 animate-in fade-in slide-in-from-right">
         <div className="mb-8 px-2">
             <h2 className="text-2xl font-bold text-stone-800 mb-1 tracking-tight">Carta Komuniti</h2>
             <p className="text-sm text-stone-400 font-medium">Penyumbang data Halal teratas.</p>
         </div>

         <div className="bg-white rounded-[2rem] border border-stone-100 shadow-[0_4px_20px_rgba(231,229,228,0.4)] overflow-hidden">
             {leaderboardUsers.length === 0 ? (
                 <div className="p-12 text-center text-stone-400">
                     <Loader2 className="animate-spin mx-auto mb-3" />
                     <p className="text-xs font-medium">Memuatkan data...</p>
                 </div>
             ) : (
                 <div className="divide-y divide-stone-50">
                     {leaderboardUsers.map((user, idx) => (
                         <div key={user.id} className="flex items-center gap-4 p-5 hover:bg-stone-50/50 transition-colors">
                             <div className={`w-9 h-9 flex items-center justify-center rounded-xl font-bold text-sm shadow-sm ${
                                 idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                                 idx === 1 ? 'bg-stone-200 text-stone-600' :
                                 idx === 2 ? 'bg-orange-100 text-orange-700' :
                                 'bg-white text-stone-400 border border-stone-100'
                             }`}>
                                 {idx + 1}
                             </div>
                             <img src={user.avatar} className="w-12 h-12 rounded-full bg-stone-100 border-2 border-white shadow-sm object-cover" />
                             <div className="flex-1 min-w-0">
                                 <h4 className="font-bold text-stone-800 text-sm truncate">{user.name}</h4>
                                 <p className="text-[10px] text-stone-400 font-medium tracking-wide uppercase">{user.role === 'admin' ? 'Admin' : 'Ahli Komuniti'}</p>
                             </div>
                             <div className="text-right">
                                 <p className="font-bold text-stone-800 text-lg">{user.totalContributions || 0}</p>
                                 <p className="text-[9px] text-stone-400 uppercase font-bold tracking-wider">Sumbangan</p>
                             </div>
                         </div>
                     ))}
                 </div>
             )}
         </div>
     </div>
  );

  const renderAllCategoriesPage = () => (
    <div className="pb-28 pt-2 animate-in fade-in slide-in-from-right">
       <div className="flex items-center gap-3 mb-6 px-1">
           <button onClick={() => setActivePage(AppPage.HOME)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-stone-100 text-stone-500 hover:bg-stone-50 transition-colors">
               <ArrowLeft size={20} />
           </button>
           <div>
               <h2 className="text-xl font-bold text-stone-800 tracking-tight">Semua Kategori</h2>
               <p className="text-xs text-stone-400 font-medium">Senarai penuh kategori Halal</p>
           </div>
       </div>

       <div className="grid grid-cols-2 gap-4">
           {MAIN_CATEGORIES.map(cat => {
               const Icon = CATEGORY_ICONS[cat] || Package;
               return (
                   <button 
                     key={cat}
                     onClick={() => { setViewingCategory(cat); setActivePage(AppPage.HOME); }}
                     className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center gap-3 hover:shadow-lg hover:border-stone-200 transition-all group aspect-square text-center"
                   >
                       <div className="w-14 h-14 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-600 group-hover:bg-stone-100 group-hover:scale-110 transition-all duration-300">
                           <Icon size={28} strokeWidth={1.5} />
                       </div>
                       <span className="font-bold text-stone-800 text-xs leading-tight">{cat.replace('Produk ', '')}</span>
                   </button>
               );
           })}
       </div>
    </div>
  );

  const renderHomePage = () => {
    // Filter approved products only for the home feed
    const approvedProducts = globalData.filter(item => 
        item.approvalStatus === 'approved' && 
        (viewingCategory === 'Semua' || item.mainCategory === viewingCategory) &&
        (searchQuery === "" || 
            item.namaProduk.toLowerCase().includes(searchQuery.toLowerCase()) || 
            item.namaPengeluar.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    return (
    <div className="pb-28 pt-4 animate-in slide-in-from-bottom-2 space-y-8">
       
       {/* Welcome Header */}
       <div className="flex justify-between items-center px-1">
           <div className="flex items-center gap-3">
               <div className="w-12 h-12 rounded-full p-0.5 border-2 border-stone-100 cursor-pointer hover:scale-105 transition-transform" onClick={() => setActivePage(AppPage.PROFILE)}>
                   <img src={currentUser?.avatar} className="w-full h-full rounded-full object-cover bg-stone-100" />
               </div>
               <div>
                   <p className="text-xs text-stone-400 font-bold uppercase tracking-wider">{t.welcome_back}</p>
                   <h2 className="text-lg font-bold text-stone-800 leading-tight">{currentUser?.name?.split(' ')[0]}</h2>
               </div>
           </div>
           <button onClick={() => setActivePage(AppPage.PROFILE)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-stone-100 text-stone-400 hover:text-stone-600 active:scale-95 transition-all">
               <UserIcon size={20} />
           </button>
       </div>

       {/* Search - Floating Pill Design */}
       <div className="sticky top-20 z-20 -mx-1">
           <div className="bg-white/80 backdrop-blur-xl p-1.5 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-stone-200/50 flex items-center gap-2">
               <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center text-stone-400 shrink-0">
                  <Search size={18} />
               </div>
               <input 
                 type="text" 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 placeholder={t.search_placeholder}
                 className="flex-1 bg-transparent py-2 pr-4 text-stone-800 placeholder:text-stone-400 outline-none text-sm font-medium"
               />
               {searchQuery ? (
                   <button onClick={() => setSearchQuery('')} className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full mr-1 transition-colors">
                       <X size={16}/>
                   </button>
               ) : (
                   <button className="w-10 h-10 bg-stone-800 rounded-full flex items-center justify-center text-white hover:bg-stone-700 transition-colors shadow-lg shadow-stone-800/20 active:scale-95">
                       <SlidersHorizontal size={16} />
                   </button>
               )}
           </div>
       </div>

        {/* PWA Add to Home Screen Banner - Web Only */}
        {!Capacitor.isNativePlatform() && deferredPrompt && (
          <div className="mx-1 animate-in zoom-in-95 fade-in duration-300">
            <div className="bg-gradient-to-br from-stone-800 to-stone-900 rounded-[2rem] p-6 relative overflow-hidden shadow-2xl shadow-stone-800/20 group">
              {/* Background Decoration */}
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-700"></div>
              <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-stone-500/10 rounded-full blur-3xl group-hover:bg-stone-500/20 transition-all duration-700"></div>
              
              <div className="relative z-10 flex items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-lg border border-white/10">
                      <PlusSquare size={14} className="text-stone-100" />
                    </div>
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-[0.2em]">Eksklusif Web</span>
                  </div>
                  <h4 className="text-lg font-bold text-white leading-tight">
                    Nikmati Pengalaman App <span className="text-stone-400">Penuh</span>
                  </h4>
                  <p className="text-xs text-stone-400 font-medium leading-relaxed max-w-[200px]">
                    Tambah KamekHalal ke skrin utama anda untuk akses lebih pantas.
                  </p>
                </div>
                
                <button 
                  onClick={handleInstallClick}
                  className="bg-white hover:bg-stone-50 text-stone-900 px-5 py-3 rounded-2xl font-bold text-xs shadow-xl shadow-black/10 active:scale-95 transition-all text-center whitespace-nowrap"
                >
                  Pasang
                </button>
              </div>
            </div>
          </div>
        )}

       {/* Explore Categories */}
       <div className="space-y-4">
           <div className="flex items-center justify-between px-1">
               <h3 className="font-bold text-stone-800 text-base">{t.explore_cats}</h3>
               <button onClick={() => setActivePage(AppPage.ALL_CATEGORIES)} className="text-xs font-bold text-stone-400 hover:text-stone-600 transition-colors">{t.see_all}</button>
           </div>
           
           <div className="grid grid-cols-4 gap-3">
                {MAIN_CATEGORIES.slice(0, 4).map(cat => {
                    const Icon = CATEGORY_ICONS[cat] || Package;
                    const isActive = viewingCategory === cat;
                    return (
                        <button 
                            key={cat}
                            onClick={() => setViewingCategory(isActive ? 'Semua' : cat)}
                            className={`flex flex-col items-center gap-2 group transition-all ${isActive ? 'scale-105' : ''}`}
                        >
                            <div className={`w-16 h-16 rounded-[1.25rem] flex items-center justify-center shadow-[0_4px_15px_rgba(0,0,0,0.03)] border transition-all duration-300 ${isActive ? 'bg-stone-800 border-stone-800 text-white shadow-stone-800/20' : 'bg-white border-stone-100 text-stone-600 group-hover:border-stone-200'}`}>
                                <Icon size={24} strokeWidth={1.5} />
                            </div>
                            <span className={`text-[10px] font-bold text-center leading-tight line-clamp-2 max-w-[72px] min-h-[2.5em] flex items-center justify-center ${isActive ? 'text-stone-800' : 'text-stone-400'}`}>
                                {cat.replace('Produk ', '').replace('Perkhidmatan ', '')}
                            </span>
                        </button>
                    )
                })}
           </div>
       </div>

       {/* Latest Products Feed */}
       <div className="space-y-4">
           <div className="flex items-center justify-between px-1">
               <h3 className="font-bold text-stone-800 text-base">
                   {viewingCategory === 'Semua' ? t.latest_products : viewingCategory.replace('Produk ', '')}
               </h3>
               {viewingCategory !== 'Semua' && (
                   <button onClick={() => setViewingCategory('Semua')} className="text-xs font-bold text-stone-400 hover:text-stone-600">Reset</button>
               )}
           </div>

           <div className="grid grid-cols-1 gap-4">
               {approvedProducts.length === 0 ? (
                   <div className="text-center py-12 bg-white rounded-[2.5rem] border border-dashed border-stone-200">
                       <div className="w-14 h-14 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-300">
                           <Package size={28} />
                       </div>
                       <p className="text-stone-400 text-sm font-medium">{t.no_products_found}</p>
                   </div>
               ) : (
                   approvedProducts.map(item => (
                       <div key={item.id} onClick={() => setViewingItem(item)} className="group bg-white p-3 rounded-[2rem] border border-stone-100 shadow-[0_4px_20px_rgba(231,229,228,0.4)] flex items-center gap-4 hover:shadow-lg hover:shadow-stone-200/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden">
                           
                           {/* Image */}
                           <div className="w-20 h-20 bg-stone-50 rounded-2xl overflow-hidden shrink-0 border border-stone-50 relative">
                               {item.images?.front ? <img src={item.images.front} className="w-full h-full object-cover mix-blend-multiply transition-transform duration-700 group-hover:scale-105" /> : <ImageIcon className="text-stone-300 w-full h-full p-5" />}
                           </div>
                           
                           <div className="flex-1 min-w-0 pr-2">
                               <div className="mb-1">
                                   {item.mainCategory === 'Rumah Sembelihan' ? (
                                       <>
                                           <h4 className="font-bold text-stone-800 text-sm truncate leading-tight group-hover:text-stone-600 transition-colors">{item.namaPengeluar}</h4>
                                           <p className="text-[10px] text-stone-400 truncate font-medium flex items-center gap-1 mt-0.5"><MapPin size={10}/> {item.namaProduk}</p>
                                       </>
                                   ) : item.mainCategory === 'Premis Makanan' ? (
                                       <>
                                           <h4 className="font-bold text-stone-800 text-sm truncate leading-tight group-hover:text-stone-600 transition-colors">{item.namaProduk}</h4>
                                           <p className="text-[10px] text-stone-400 truncate font-medium flex items-center gap-1 mt-0.5"><Store size={10}/> {item.namaPengeluar}</p>
                                       </>
                                   ) : (
                                       <>
                                           <h4 className="font-bold text-stone-800 text-sm truncate leading-tight group-hover:text-stone-600 transition-colors">{item.namaProduk}</h4>
                                           <p className="text-[10px] text-stone-400 truncate font-medium flex items-center gap-1 mt-0.5"><Building2 size={10}/> {item.namaPengeluar}</p>
                                       </>
                                   )}
                               </div>
                               
                               <div className="flex items-center gap-2 mt-2">
                                   {item.statusHalal.includes('JAKIM') ? (
                                       <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-emerald-100">
                                           <CheckCircle size={10} strokeWidth={3} /> JAKIM
                                       </span>
                                   ) : (
                                       <span className="inline-flex items-center gap-1 text-[9px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-amber-100">
                                           <AlertCircle size={10} strokeWidth={3} /> {item.statusHalal}
                                       </span>
                                   )}
                               </div>
                           </div>
                           
                           <div className="w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center text-stone-300 group-hover:bg-stone-800 group-hover:text-white transition-all mr-1">
                               <ArrowRight size={14} />
                           </div>
                       </div>
                   ))
               )}
           </div>
       </div>
    </div>
    );
  };

  const filteredDashboardData = globalData.filter(item => {
    const searchLower = dashboardSearch.toLowerCase();
    const matchesSearch = !dashboardSearch || 
        item.namaProduk.toLowerCase().includes(searchLower) || 
        item.namaPengeluar.toLowerCase().includes(searchLower) ||
        (item.barcode && item.barcode.includes(searchLower)) ||
        (item.statusHalal && item.statusHalal.toLowerCase().includes(searchLower)) ||
        (item.mainCategory && item.mainCategory.toLowerCase().includes(searchLower));

    if (currentUser?.role === 'admin') {
       return matchesSearch;
    } else {
       // Regular users see their own items in dashboard/list view
       const isOwn = item.userId === currentUser?.id;
       return matchesSearch && isOwn;
    }
  });

  if (isAuthChecking) return <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center"><Loader2 className="w-10 h-10 text-stone-300 animate-spin" /></div>;
  
  if (appState === AppState.WELCOME) return renderWelcomeScreen();
  
  if (appState === AppState.LOGIN && !currentUser) return <LoginScreen onLoginSuccess={() => {}} />;

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans text-stone-800 selection:bg-stone-200">
      
      {/* Modals */}
      {editingItem && (
        <EditProductModal 
            product={editingItem} 
            userRole={currentUser?.role || 'user'} 
            onSave={(updated) => { updateProductInDB(updated); setEditingItem(null); }} 
            onClose={() => setEditingItem(null)} 
        />
      )}

      {/* Duplicate Resolver Modal */}
      {showDuplicateModal && (
          <DuplicateResolverModal 
              duplicates={duplicateGroups} 
              onClose={() => setShowDuplicateModal(false)}
              onResolve={handleDuplicateResolve}
          />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {itemToDelete && (
          <div className="fixed inset-0 z-[70] bg-stone-900/20 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
             <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl text-center border border-white/50">
                 <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 shadow-inner"><Trash2 size={32} /></div>
                 <h3 className="text-xl font-bold text-stone-800 mb-2">Padam Produk?</h3>
                 <p className="text-sm text-stone-500 mb-8 leading-relaxed">Tindakan ini tidak boleh dikembalikan. <br/>Adakah anda pasti?</p>
                 <div className="flex gap-3">
                     <button onClick={() => setItemToDelete(null)} className="flex-1 py-4 bg-stone-100 rounded-2xl font-bold text-stone-500 text-sm hover:bg-stone-200 transition-colors">Batal</button>
                     <button onClick={confirmDelete} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold text-sm hover:bg-red-600 shadow-xl shadow-red-500/20 transition-all hover:scale-105">Padam</button>
                 </div>
             </div>
          </div>
      )}

      {/* BULK DELETE MODAL */}
      {showBulkDeleteModal && (
          <div className="fixed inset-0 z-[80] bg-stone-900/40 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
             <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl text-center border border-white/50 animate-in zoom-in-95">
                 <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 shadow-inner animate-pulse"><Trash2 size={32} /></div>
                 <h3 className="text-xl font-bold text-stone-800 mb-2">Padam {selectedItems.size} Rekod?</h3>
                 <p className="text-sm text-stone-500 mb-8 leading-relaxed">
                     Anda akan memadam <span className="font-bold text-red-600">{selectedItems.size}</span> produk yang dipilih. <br/>Tindakan ini kekal dan tidak boleh dikembalikan.
                 </p>
                 <div className="flex gap-3">
                     <button onClick={() => setShowBulkDeleteModal(false)} className="flex-1 py-4 bg-stone-100 rounded-2xl font-bold text-stone-500 text-sm hover:bg-stone-200 transition-colors">Batal</button>
                     <button 
                        onClick={handleBulkDelete} 
                        disabled={isBulkDeleting}
                        className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold text-sm hover:bg-red-700 shadow-xl shadow-red-600/20 transition-all hover:scale-105 flex items-center justify-center gap-2"
                     >
                        {isBulkDeleting ? <Loader2 className="animate-spin" size={18}/> : <Trash2 size={18}/>}
                        {isBulkDeleting ? 'Memadam...' : 'Padam Semua'}
                     </button>
                 </div>
             </div>
          </div>
      )}

      {/* APPROVAL STATUS MODAL */}
      {submissionToApprove && (
          <div className="fixed inset-0 z-[70] bg-stone-900/40 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
             <div className="bg-[#FDFBF7] rounded-[2.5rem] p-6 max-w-sm w-full shadow-2xl border border-white/50 animate-in zoom-in-95">
                 <div className="text-center mb-6">
                     <h3 className="text-xl font-bold text-stone-800 mb-1">Pengesahan Status</h3>
                     <p className="text-sm text-stone-500">Sila pilih status Halal rasmi untuk produk ini.</p>
                 </div>
                 
                 <div className="space-y-3">
                     <button 
                         onClick={() => handleConfirmApproval('HALAL JAKIM')}
                         className="w-full p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-3 hover:bg-emerald-100 transition-colors text-left group"
                     >
                         <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-white group-hover:scale-110 transition-all"><CheckCircle size={20} /></div>
                         <div>
                             <h4 className="font-bold text-emerald-900 text-sm">HALAL JAKIM</h4>
                             <p className="text-[10px] text-emerald-600">Disahkan & diiktiraf JAKIM</p>
                         </div>
                     </button>

                     <button 
                         onClick={() => handleConfirmApproval('DIIKTIRAF BADAN LUAR')}
                         className="w-full p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-center gap-3 hover:bg-blue-100 transition-colors text-left group"
                     >
                         <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-white group-hover:scale-110 transition-all"><Globe size={20} /></div>
                         <div>
                             <h4 className="font-bold text-blue-900 text-sm">BADAN LUAR NEGARA</h4>
                             <p className="text-[10px] text-blue-600">Diiktiraf badan luar negara</p>
                         </div>
                     </button>

                     <button 
                         onClick={() => handleConfirmApproval('RAGU RAGU / WAS-WAS')}
                         className="w-full p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-center gap-3 hover:bg-amber-100 transition-colors text-left group"
                     >
                         <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 group-hover:bg-white group-hover:scale-110 transition-all"><AlertTriangle size={20} /></div>
                         <div>
                             <h4 className="font-bold text-amber-900 text-sm">RAGU-RAGU / WAS-WAS</h4>
                             <p className="text-[10px] text-amber-600">Status tidak jelas / syubhah</p>
                         </div>
                     </button>

                     <button 
                         onClick={() => handleConfirmApproval('NON-HALAL')}
                         className="w-full p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center gap-3 hover:bg-red-100 transition-colors text-left group"
                     >
                         <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 group-hover:bg-white group-hover:scale-110 transition-all"><X size={20} /></div>
                         <div>
                             <h4 className="font-bold text-red-900 text-sm">NON-HALAL</h4>
                             <p className="text-[10px] text-red-600">Disahkan tidak halal</p>
                         </div>
                     </button>
                 </div>

                 <button onClick={() => setSubmissionToApprove(null)} className="w-full mt-6 py-4 text-stone-400 font-bold text-sm hover:text-stone-600 transition-colors">
                     Batal
                 </button>
             </div>
          </div>
      )}

      {/* Main Header (Floating Glassmorphism) */}
      {(activePage === AppPage.LEADERBOARD) && (
          <header className="sticky top-0 z-40 bg-[#FDFBF7]/80 backdrop-blur-xl border-b border-white/20 px-6 py-5 flex justify-between items-center transition-all duration-300">
             <div>
                <h1 className="text-xl font-bold text-stone-800 tracking-tight flex items-center gap-2">
                    Kamek<span className="text-stone-400 font-light">Halal</span>
                </h1>
             </div>
             {currentUser && (
                 <div className="w-10 h-10 rounded-full p-0.5 border border-stone-200 cursor-pointer hover:scale-105 transition-transform" onClick={() => setActivePage(AppPage.PROFILE)}>
                     <img src={currentUser.avatar} className="w-full h-full rounded-full object-cover bg-stone-100" />
                 </div>
             )}
          </header>
      )}

      <main className="px-6 max-w-lg mx-auto min-h-screen">
         {activePage === AppPage.ADMIN_ADD_PRODUCT ? (
             <AdminAddProductPage onSave={handleAdminSaveProduct} onCancel={() => setActivePage(AppPage.DASHBOARD)} />
         ) : activePage === AppPage.USER_ADD_PRODUCT ? (
             <UserContributePage onSave={handleUserContributeSave} onCancel={() => setActivePage(AppPage.HOME)} />
         ) : (
             <>
                {viewingItem ? (
                     <div className="animate-in slide-in-from-right pb-28 pt-6">
                        <ResultCard 
                            data={viewingItem} 
                            images={viewingItem.images} 
                            onReset={() => setViewingItem(null)} 
                            readOnly={true} 
                            userRole={currentUser?.role}
                            onEdit={() => handleEditClick(null, viewingItem)}
                            onDelete={() => requestDelete(null, viewingItem)}
                            onSelectAlternative={(item) => setViewingItem(item)}
                        />
                     </div>
                ) : viewingSubmission ? (
                    // VIEW SUBMISSION DETAIL MODE
                    <div className="animate-in slide-in-from-right pb-28 pt-6">
                        <ResultCard 
                            data={convertSubmissionToProduct(viewingSubmission)} 
                            images={{ 
                                front: viewingSubmission.frontImageURL, 
                                back: viewingSubmission.backImageURL, 
                                halal: viewingSubmission.halalLogoImageURL 
                            }} 
                            onReset={() => setViewingSubmission(null)} 
                            readOnly={true} 
                            userRole={currentUser?.role}
                        />
                         <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-xl border-t border-stone-100 z-[50] md:static md:bg-transparent md:border-none md:w-auto">
                            <div className="max-w-lg mx-auto flex gap-3">
                                <button 
                                    onClick={(e) => { handleRejectSubmission(e, viewingSubmission.id); setViewingSubmission(null); }}
                                    className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl font-bold text-sm hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    <X size={18} /> Tolak
                                </button>
                                <button 
                                    onClick={(e) => handleOpenStatusModal(e, viewingSubmission)}
                                    className="flex-1 py-4 bg-stone-800 text-white rounded-2xl font-bold text-sm hover:bg-stone-700 shadow-xl shadow-stone-800/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <Check size={18} /> Luluskan
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {activePage === AppPage.HOME && renderHomePage()}
                        {activePage === AppPage.ALL_CATEGORIES && renderAllCategoriesPage()}
                        {activePage === AppPage.LEADERBOARD && renderLeaderboardPage()}
                        {activePage === AppPage.DASHBOARD && (
                            <div className="pt-6 pb-28 relative">
                                <div className="flex items-center justify-between mb-6 px-1">
                                    <h2 className="text-2xl font-bold text-stone-800 tracking-tight">Pengurusan Data</h2>
                                    {currentUser?.role === 'admin' && (
                                        <div className="flex gap-2">
                                            {/* DUPLICATE CHECKER BUTTON */}
                                            <button 
                                                onClick={checkForDuplicates}
                                                className="bg-white border border-stone-200 text-stone-600 p-3 rounded-2xl hover:bg-stone-50 shadow-sm transition-all flex items-center justify-center active:scale-95"
                                                title="Semak Duplikasi"
                                            >
                                                <Merge size={22} />
                                            </button>
                                            <button onClick={() => setActivePage(AppPage.ADMIN_ADD_PRODUCT)} className="bg-stone-800 text-white p-3 rounded-2xl hover:bg-stone-700 shadow-lg shadow-stone-800/20 hover:scale-105 transition-all">
                                                <PlusCircle size={22} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* ADMIN REVIEW TABS */}
                                {currentUser?.role === 'admin' && (
                                    <div className="bg-stone-100 p-1 rounded-2xl flex gap-1 mb-6 overflow-x-auto hide-scrollbar">
                                        <button 
                                            onClick={() => setDashboardTab('database')}
                                            className={`flex-1 py-3 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap ${dashboardTab === 'database' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400 hover:text-stone-600'}`}
                                        >
                                            <Database size={14} /> Pangkalan Data
                                        </button>
                                        <button 
                                            onClick={() => setDashboardTab('review')}
                                            className={`flex-1 py-3 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap ${dashboardTab === 'review' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400 hover:text-stone-600'}`}
                                        >
                                            <CheckCircle size={14} /> Semakan ({pendingSubmissions.length})
                                        </button>
                                        {/* NEW ALERTS TAB */}
                                        <button 
                                            onClick={() => setDashboardTab('alerts')}
                                            className={`flex-1 py-3 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap relative ${dashboardTab === 'alerts' ? 'bg-white shadow-sm text-red-600' : 'text-stone-400 hover:text-red-500'}`}
                                        >
                                            <AlertCircle size={14} /> Isu & Alert
                                            {expiryAlertItems.length > 0 && (
                                                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white animate-pulse"></span>
                                            )}
                                        </button>
                                    </div>
                                )}
                                
                                {dashboardTab === 'database' ? (
                                    <>
                                        {/* DASHBOARD SEARCH BAR */}
                                        <div className="sticky top-20 z-30 bg-[#FDFBF7]/95 backdrop-blur-sm pb-6 -mt-2">
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    value={dashboardSearch} 
                                                    onChange={(e) => setDashboardSearch(e.target.value)} 
                                                    placeholder="Cari dalam pangkalan data..." 
                                                    className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-stone-200 shadow-sm focus:ring-2 focus:ring-stone-100 focus:border-stone-300 outline-none text-stone-800 text-sm font-medium placeholder:text-stone-400 transition-shadow" 
                                                />
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                                            </div>
                                            
                                            {/* BULK SELECT ALL TOGGLE - ONLY VISIBLE IF THERE ARE ITEMS */}
                                            {currentUser?.role === 'admin' && filteredDashboardData.length > 0 && (
                                                <div className="mt-3 flex items-center justify-end px-2 animate-in fade-in slide-in-from-top-1">
                                                    <button 
                                                        onClick={() => handleSelectAll(filteredDashboardData)}
                                                        className="flex items-center gap-2 text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors"
                                                    >
                                                        {filteredDashboardData.every(item => selectedItems.has(item.id)) ? (
                                                            <>
                                                                <CheckSquare size={16} className="text-stone-800" /> Nyahtanda Semua ({filteredDashboardData.length})
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Square size={16} /> Pilih Semua ({filteredDashboardData.length})
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-4 pb-24">
                                            {filteredDashboardData.length === 0 ? (
                                                <div className="text-center py-20">
                                                    <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-300 border border-stone-200">
                                                        <Search size={32} />
                                                    </div>
                                                    <p className="text-stone-500 text-sm font-medium">Tiada rekod dijumpai.</p>
                                                </div>
                                            ) : (
                                                filteredDashboardData.map(item => (
                                                    <div key={item.id} onClick={() => setViewingItem(item)} className={`bg-white p-4 rounded-3xl border ${selectedItems.has(item.id) ? 'border-stone-800 bg-stone-50 ring-1 ring-stone-800' : 'border-stone-100'} shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer active:scale-95`}>
                                                        
                                                        {/* ADMIN SELECTION CHECKBOX */}
                                                        {currentUser?.role === 'admin' && (
                                                            <div onClick={(e) => toggleSelection(e, item.id)} className="shrink-0 p-1 text-stone-300 hover:text-stone-800 transition-colors">
                                                                {selectedItems.has(item.id) ? (
                                                                    <CheckSquare size={22} className="text-stone-800" />
                                                                ) : (
                                                                    <Square size={22} />
                                                                )}
                                                            </div>
                                                        )}

                                                        <div className="w-16 h-16 bg-stone-50 rounded-2xl overflow-hidden shrink-0 border border-stone-50">
                                                            {item.images?.front ? <img src={item.images.front} className="w-full h-full object-cover mix-blend-multiply" /> : <ImageIcon className="text-stone-300 w-full h-full p-4" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            {item.mainCategory === 'Rumah Sembelihan' ? (
                                                                <>
                                                                    <h4 className="font-bold text-stone-800 text-sm truncate mb-0.5">{item.namaPengeluar}</h4>
                                                                    <p className="text-xs text-stone-400 truncate font-medium mb-1.5">{item.namaProduk}</p>
                                                                </>
                                                            ) : item.mainCategory === 'Premis Makanan' ? (
                                                                <>
                                                                    <h4 className="font-bold text-stone-800 text-sm truncate mb-0.5">{item.namaProduk}</h4>
                                                                    <p className="text-xs text-stone-400 truncate font-medium mb-1.5">{item.namaPengeluar}</p>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <h4 className="font-bold text-stone-800 text-sm truncate mb-0.5">{item.namaProduk}</h4>
                                                                    <p className="text-xs text-stone-400 truncate font-medium mb-1.5">{item.namaPengeluar}</p>
                                                                </>
                                                            )}
                                                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border ${item.statusHalal.includes('JAKIM') ? 'bg-green-50 text-green-700 border-green-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>{item.statusHalal}</span>
                                                        </div>
                                                        {currentUser?.role === 'admin' && item.approvalStatus === 'pending' && <button onClick={(e) => handleApprove(e, item)} className="w-10 h-10 bg-green-50 rounded-full text-green-600 flex items-center justify-center hover:bg-green-100 transition-colors border border-green-100 shadow-sm"><Check size={18} strokeWidth={2.5}/></button>}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </>
                                ) : dashboardTab === 'alerts' ? (
                                    /* ALERTS TAB CONTENT */
                                    <div className="space-y-4 pb-24 animate-in slide-in-from-right-4">
                                        {expiryAlertItems.length === 0 ? (
                                            <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-stone-200">
                                                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500">
                                                    <ShieldCheck size={32} />
                                                </div>
                                                <p className="text-stone-500 text-sm font-medium">Tiada isu dikesan.</p>
                                                <p className="text-stone-400 text-xs mt-1">Semua produk dalam keadaan baik.</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex gap-3 items-center mb-6">
                                                    <AlertTriangle className="text-red-500 shrink-0" size={24} />
                                                    <div className="flex-1">
                                                        <h3 className="text-sm font-bold text-red-800">Perhatian Diperlukan</h3>
                                                        <p className="text-xs text-red-600 leading-tight mt-0.5">Terdapat {expiryAlertItems.length} rekod yang tamat tempoh atau akan luput dalam masa 30 hari.</p>
                                                    </div>
                                                </div>

                                                {expiryAlertItems.map(item => {
                                                    const expiry = new Date(item.expiryDate!);
                                                    const now = new Date();
                                                    const diffTime = expiry.getTime() - now.getTime();
                                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                    const isExpired = diffDays < 0;

                                                    const isSlaughterHouse = item.mainCategory === 'Rumah Sembelihan';
                                                    const isPremise = item.mainCategory === 'Premis Makanan';
                                                    const mainTitle = isSlaughterHouse ? item.namaPengeluar : item.namaProduk;
                                                    const subTitle = isSlaughterHouse ? item.namaProduk : item.namaPengeluar;

                                                    return (
                                                        <div 
                                                            key={item.id} 
                                                            onClick={() => setViewingItem(item)} 
                                                            className={`p-5 rounded-[2rem] border relative overflow-hidden transition-all cursor-pointer active:scale-95 hover:shadow-md ${isExpired ? 'bg-white border-red-100 shadow-[0_4px_20px_rgba(254,202,202,0.3)]' : 'bg-white border-orange-100 shadow-[0_4px_20px_rgba(253,186,116,0.2)]'}`}
                                                        >
                                                            {/* Status Strip */}
                                                            <div className={`absolute left-0 top-0 bottom-0 w-2 ${isExpired ? 'bg-red-500' : 'bg-orange-400'}`} />

                                                            <div className="flex justify-between items-start pl-3 mb-2">
                                                                <div className="flex-1 pr-2">
                                                                    <div className="flex items-center gap-1.5 mb-1">
                                                                        {isExpired ? (
                                                                            <span className="bg-red-100 text-red-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide flex items-center gap-1 border border-red-200 w-fit">
                                                                                <CalendarX size={10} /> TAMAT TEMPOH
                                                                            </span>
                                                                        ) : (
                                                                            <span className="bg-orange-100 text-orange-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide flex items-center gap-1 border border-orange-200 w-fit">
                                                                                <AlarmClock size={10} /> {diffDays} HARI LAGI
                                                                            </span>
                                                                        )}
                                                                        <span className="text-[9px] text-stone-400 font-mono">{item.expiryDate}</span>
                                                                    </div>
                                                                    <h4 className={`font-bold text-base leading-tight mb-1 ${isExpired ? 'text-red-900' : 'text-stone-800'}`}>{mainTitle}</h4>
                                                                    <p className="text-xs text-stone-500 font-medium truncate flex items-center gap-1">
                                                                        {isPremise ? <Store size={10}/> : isSlaughterHouse ? <Building2 size={10}/> : <Factory size={10}/>}
                                                                        {subTitle}
                                                                    </p>
                                                                </div>
                                                                
                                                                {/* Edit Button Hint */}
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isExpired ? 'bg-red-50 text-red-400' : 'bg-orange-50 text-orange-400'}`}>
                                                                    <ArrowRight size={16} />
                                                                </div>
                                                            </div>
                                                            
                                                            {/* Categories Badge */}
                                                            <div className="pl-3 mt-3 flex items-center gap-2">
                                                                <span className="text-[9px] text-stone-400 bg-stone-50 px-2 py-1 rounded-md border border-stone-100 font-medium">
                                                                    {item.mainCategory}
                                                                </span>
                                                                {item.statusHalal && (
                                                                    <span className="text-[9px] text-stone-400 bg-stone-50 px-2 py-1 rounded-md border border-stone-100 font-medium">
                                                                        {item.statusHalal}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    /* REVIEW TAB CONTENT */
                                    <div className="space-y-4 pb-24 animate-in slide-in-from-right-4">
                                        {pendingSubmissions.length === 0 ? (
                                            <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-stone-200">
                                                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500">
                                                    <CheckCircle size={32} />
                                                </div>
                                                <p className="text-stone-500 text-sm font-medium">Tiada semakan tertunda.</p>
                                                <p className="text-stone-400 text-xs mt-1">Semua sumbangan telah diproses.</p>
                                            </div>
                                        ) : (
                                            pendingSubmissions.map(submission => (
                                                <div key={submission.id} className="bg-white p-4 rounded-3xl border border-stone-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] relative overflow-hidden">
                                                    
                                                    {/* Header */}
                                                    <div className="flex gap-4 mb-3">
                                                        <div className="w-20 h-24 bg-stone-50 rounded-xl overflow-hidden shrink-0 border border-stone-50">
                                                            {submission.frontImageURL ? <img src={submission.frontImageURL} className="w-full h-full object-cover mix-blend-multiply" /> : <ImageIcon className="text-stone-300 w-full h-full p-4" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <h4 className="font-bold text-stone-800 text-sm leading-tight mb-1">{submission.name}</h4>
                                                                    <p className="text-xs text-stone-500 mb-2">{submission.brand}</p>
                                                                </div>
                                                                <span className="bg-stone-100 text-stone-600 text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide">SUBMISSION</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-medium bg-stone-50 px-2 py-1.5 rounded-lg inline-flex">
                                                                <UserIcon size={12} /> Disumbang oleh Ahli
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Ingredients Snippet */}
                                                    {submission.ingredients && (
                                                        <div className="mb-4 bg-stone-50 p-3 rounded-xl border border-stone-100">
                                                            <p className="text-[10px] text-stone-400 font-bold uppercase mb-1">Ramuan</p>
                                                            <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">{submission.ingredients}</p>
                                                        </div>
                                                    )}

                                                    {/* Actions */}
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => setViewingSubmission(submission)}
                                                            className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold text-xs hover:bg-stone-200 transition-colors flex items-center justify-center gap-2"
                                                        >
                                                            <Eye size={16} /> Lihat Info
                                                        </button>
                                                        <button 
                                                            onClick={(e) => handleOpenStatusModal(e, submission)}
                                                            className="flex-1 py-3 bg-stone-800 text-white rounded-xl font-bold text-xs hover:bg-stone-700 shadow-lg shadow-stone-800/20 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <Check size={16} /> Luluskan
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        {activePage === AppPage.PROFILE && currentUser && <ProfileScreen user={currentUser} onUpdateUser={handleUpdateUser} onLogout={handleLogout} />}
                    </>
                )}
             </>
         )}
      </main>

      {/* 4-Tab Bottom Nav - Premium Glassmorphism */}
      {(activePage === AppPage.HOME || activePage === AppPage.DASHBOARD || activePage === AppPage.PROFILE || activePage === AppPage.LEADERBOARD || activePage === AppPage.ALL_CATEGORIES || activePage === AppPage.USER_ADD_PRODUCT) && (
        <div className="fixed bottom-6 left-6 right-6 z-40">
           
           {/* FLOATING ACTION BAR FOR BULK DELETE (ADMIN ONLY) */}
           {currentUser?.role === 'admin' && selectedItems.size > 0 && activePage === AppPage.DASHBOARD && (
               <div className="mb-4 animate-in slide-in-from-bottom-4 duration-300">
                   <div className="bg-stone-900 text-white p-4 rounded-[2rem] shadow-2xl flex items-center justify-between">
                       <div className="flex items-center gap-3 pl-2">
                           <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center text-xs font-bold border border-stone-600">
                               {selectedItems.size}
                           </div>
                           <span className="text-sm font-medium">Item Dipilih</span>
                       </div>
                       <div className="flex items-center gap-2">
                           <button 
                               onClick={() => setSelectedItems(new Set())}
                               className="px-4 py-2 text-xs font-bold text-stone-400 hover:text-white transition-colors"
                           >
                               Batal
                           </button>
                           <button 
                               onClick={() => setShowBulkDeleteModal(true)}
                               className="px-5 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-900/20 active:scale-95 transition-all"
                           >
                               <Trash2 size={16} /> Padam
                           </button>
                       </div>
                   </div>
               </div>
           )}

           <div className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-[2rem] shadow-[0_20px_40px_rgba(0,0,0,0.1)] p-1.5 flex justify-between items-center max-w-sm mx-auto">
              
              {/* Home */}
              <button onClick={() => { setActivePage(AppPage.HOME); setViewingItem(null); setViewingSubmission(null); }} className={`flex-1 flex flex-col items-center py-3 rounded-[1.5rem] transition-all duration-300 group ${activePage === AppPage.HOME || activePage === AppPage.ALL_CATEGORIES ? 'bg-stone-800 text-white shadow-lg shadow-stone-800/20' : 'text-stone-400 hover:text-stone-600'}`}>
                  <Home size={22} strokeWidth={activePage === AppPage.HOME || activePage === AppPage.ALL_CATEGORIES ? 2.5 : 2} className="mb-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  {(activePage === AppPage.HOME || activePage === AppPage.ALL_CATEGORIES) && <span className="text-[9px] font-bold animate-in fade-in slide-in-from-bottom-1">{t.nav_home}</span>}
              </button>

              {/* Contribute */}
              {currentUser?.role !== 'admin' && (
                  <button onClick={() => { setActivePage(AppPage.USER_ADD_PRODUCT); setViewingItem(null); setViewingSubmission(null); }} className={`flex-1 flex flex-col items-center py-3 rounded-[1.5rem] transition-all duration-300 group ${activePage === AppPage.USER_ADD_PRODUCT ? 'bg-stone-800 text-white shadow-lg shadow-stone-800/20' : 'text-stone-400 hover:text-stone-600'}`}>
                      <PlusSquare size={22} strokeWidth={activePage === AppPage.USER_ADD_PRODUCT ? 2.5 : 2} className="mb-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      {activePage === AppPage.USER_ADD_PRODUCT && <span className="text-[9px] font-bold animate-in fade-in slide-in-from-bottom-1">{t.nav_contribute}</span>}
                  </button>
              )}

              {/* Admin Data/Dashboard Override */}
              {currentUser?.role === 'admin' && (
                  <button onClick={() => { setActivePage(AppPage.DASHBOARD); setViewingItem(null); setViewingSubmission(null); }} className={`flex-1 flex flex-col items-center py-3 rounded-[1.5rem] transition-all duration-300 group ${activePage === AppPage.DASHBOARD ? 'bg-stone-800 text-white shadow-lg shadow-stone-800/20' : 'text-stone-400 hover:text-stone-600'}`}>
                      <Database size={22} strokeWidth={activePage === AppPage.DASHBOARD ? 2.5 : 2} className="mb-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      {activePage === AppPage.DASHBOARD && <span className="text-[9px] font-bold animate-in fade-in slide-in-from-bottom-1">{t.nav_data}</span>}
                  </button>
              )}

              {/* Leaderboard */}
              <button onClick={() => { setActivePage(AppPage.LEADERBOARD); setViewingItem(null); setViewingSubmission(null); }} className={`flex-1 flex flex-col items-center py-3 rounded-[1.5rem] transition-all duration-300 group ${activePage === AppPage.LEADERBOARD ? 'bg-stone-800 text-white shadow-lg shadow-stone-800/20' : 'text-stone-400 hover:text-stone-600'}`}>
                  <Trophy size={22} strokeWidth={activePage === AppPage.LEADERBOARD ? 2.5 : 2} className="mb-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  {activePage === AppPage.LEADERBOARD && <span className="text-[9px] font-bold animate-in fade-in slide-in-from-bottom-1">{t.nav_leaderboard}</span>}
              </button>

              {/* Profile */}
              <button onClick={() => { setActivePage(AppPage.PROFILE); setViewingItem(null); setViewingSubmission(null); }} className={`flex-1 flex flex-col items-center py-3 rounded-[1.5rem] transition-all duration-300 group ${activePage === AppPage.PROFILE ? 'bg-stone-800 text-white shadow-lg shadow-stone-800/20' : 'text-stone-400 hover:text-stone-600'}`}>
                  <UserIcon size={22} strokeWidth={activePage === AppPage.PROFILE ? 2.5 : 2} className="mb-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  {activePage === AppPage.PROFILE && <span className="text-[9px] font-bold animate-in fade-in slide-in-from-bottom-1">{t.nav_profile}</span>}
              </button>
           </div>
        </div>
      )}

      {showToast.show && <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[80] bg-stone-800 text-white px-6 py-3.5 rounded-full shadow-2xl flex items-center gap-3 text-sm font-bold animate-in slide-in-from-top-4 tracking-wide"><CheckCircle size={18} className="text-green-400" />{showToast.msg}</div>}
    </div>
  );
};

export default App;
