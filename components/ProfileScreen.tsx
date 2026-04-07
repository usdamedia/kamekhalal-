
import React, { useState, useEffect } from 'react';
import { User, ISubmission } from '../types';
import { Camera, Save, ArrowLeft, CheckCircle, Package, Calendar, KeyRound, Loader2, Clock3, XCircle, LogOut, Search, SlidersHorizontal, Heart, MapPin, Trophy, Star, ChevronRight, ShieldCheck, FileText, Headphones, Languages, MessageSquareQuote, Settings2 } from 'lucide-react';
import { authService, dbService } from '../services/firebase';
import { useLanguage } from '../contexts/LanguageContext';

interface ProfileScreenProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
  onLogout: () => void;
}

type SettingsPage = 'main' | 'rate-us' | 'help-centre' | 'preferences' | 'privacy-policy' | 'terms-of-use' | 'contact-us' | 'language';

const ProfileScreen: React.FC<ProfileScreenProps> = ({ user, onUpdateUser, onLogout }) => {
  const { t, language, setLanguage } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [submissions, setSubmissions] = useState<ISubmission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<ISubmission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [settingsPage, setSettingsPage] = useState<SettingsPage>('main');
  
  const [formData, setFormData] = useState({
    name: user.name,
    avatar: user.avatar
  });

  useEffect(() => {
    const fetchHistory = async () => {
        if (user.id) {
            const data = await dbService.getUserSubmissions(user.id);
            setSubmissions(data);
            setFilteredSubmissions(data);
            setIsLoadingSubmissions(false);
        }
    };
    fetchHistory();
  }, [user.id]);

  useEffect(() => {
    if (!searchQuery) {
        setFilteredSubmissions(submissions);
    } else {
        const lower = searchQuery.toLowerCase();
        setFilteredSubmissions(submissions.filter(s => 
            s.name.toLowerCase().includes(lower) || 
            s.brand.toLowerCase().includes(lower)
        ));
    }
  }, [searchQuery, submissions]);

  const dateJoined = new Date().toLocaleDateString(language === 'ms' ? 'ms-MY' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

  const handleSave = () => {
    onUpdateUser({ ...user, name: formData.name, avatar: formData.avatar });
    setIsEditing(false);
    setShowSuccess(true);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
             const canvas = document.createElement('canvas');
             const MAX_SIZE = 300; 
             let width = img.width;
             let height = img.height;
             
             if (width > height) {
                 if (width > MAX_SIZE) {
                     height *= MAX_SIZE / width;
                     width = MAX_SIZE;
                 }
             } else {
                 if (height > MAX_SIZE) {
                     width *= MAX_SIZE / height;
                     height = MAX_SIZE;
                 }
             }
             
             canvas.width = width;
             canvas.height = height;
             const ctx = canvas.getContext('2d');
             ctx?.drawImage(img, 0, 0, width, height);
             
             const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
             setFormData(prev => ({ ...prev, avatar: resizedDataUrl }));
        }
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleForgotPassword = async () => {
      try {
          if(user.email) {
            await authService.sendPasswordResetEmail(user.email);
            setResetSent(true);
            setTimeout(() => setResetSent(false), 3000);
          }
      } catch (e) {
          alert("Gagal menghantar e-mel reset kata laluan.");
      }
  };

  const renderStatusIcon = (status: string) => {
      switch(status) {
          case 'Approved':
              return <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600 shadow-sm"><CheckCircle size={18} strokeWidth={3} /></div>;
          case 'Rejected':
              return <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600 shadow-sm"><XCircle size={18} strokeWidth={3} /></div>;
          default:
              return <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center text-yellow-600 shadow-sm"><Clock3 size={18} strokeWidth={3} /></div>;
      }
  };

  // GAMIFICATION LOGIC
  const getRankInfo = (points: number) => {
      if (points >= 1000) return { title: 'Lagenda Halal', color: 'bg-purple-600', text: 'text-purple-100', next: Infinity };
      if (points >= 500) return { title: 'Pewira Komuniti', color: 'bg-indigo-600', text: 'text-indigo-100', next: 1000 };
      if (points >= 200) return { title: 'Pakar Rujuk', color: 'bg-pink-600', text: 'text-pink-100', next: 500 };
      if (points >= 100) return { title: 'Penjelajah Kanan', color: 'bg-orange-500', text: 'text-orange-100', next: 200 };
      if (points >= 50) return { title: 'Penyumbang Aktif', color: 'bg-yellow-500', text: 'text-yellow-900', next: 100 };
      if (points >= 10) return { title: 'Ahli Baru', color: 'bg-emerald-500', text: 'text-emerald-100', next: 50 };
      return { title: 'Pelawat', color: 'bg-stone-400', text: 'text-stone-100', next: 10 };
  };

  const rank = getRankInfo(user.points || 0);
  const progressPercent = user.points && rank.next !== Infinity 
      ? (user.points / rank.next) * 100 
      : 100;

  const copy = {
    ms: {
      general: 'Umum',
      rateUs: 'Rate Us',
      helpCentre: 'Help Centre',
      preferences: 'Preferences',
      privacyPolicy: 'Privacy Policy',
      termsOfUse: 'Terms of Use',
      contactUs: 'Contact Us',
      language: 'Language',
      settingsDescription: 'Urus halaman penting aplikasi dari satu tempat yang kemas.',
      editPageHint: 'Halaman ini telah diasingkan supaya mudah dikemaskini pada masa akan datang.',
      comingSoonAction: 'Ciri tindakan lanjut boleh ditambah kemudian.',
      pageRateUsTitle: 'Rate Us',
      pageRateUsBody: 'Gunakan halaman ini untuk letak pautan App Store dan Google Play supaya pengguna boleh beri rating dan ulasan apabila app sudah diterbitkan.',
      pageHelpCentreTitle: 'Help Centre',
      pageHelpCentreBody: 'Letakkan FAQ, panduan penggunaan, proses semakan status halal, dan cara pengguna menghantar maklum balas.',
      pagePreferencesTitle: 'Preferences',
      pagePreferencesBody: 'Halaman ini sesuai untuk tetapan umum seperti notifikasi, pengalaman penggunaan, dan pilihan paparan.',
      pagePrivacyTitle: 'Privacy Policy',
      pagePrivacyBody: 'Letakkan polisi privasi rasmi aplikasi di sini. Ini penting untuk semakan App Store dan Google Play.',
      pageTermsTitle: 'Terms of Use',
      pageTermsBody: 'Gunakan halaman ini untuk syarat penggunaan, penafian, dan peraturan komuniti aplikasi.',
      pageContactTitle: 'Contact Us',
      pageContactBody: 'Letakkan emel sokongan, nombor telefon, WhatsApp, atau borang bantuan rasmi di halaman ini.',
      pageLanguageTitle: 'Language',
      pageLanguageBody: 'Pilih bahasa aplikasi. Pilihan ini akan disimpan pada peranti pengguna.',
      selected: 'Dipilih',
      chooseLanguage: 'Pilih Bahasa',
      languageMalay: 'Bahasa Melayu',
      languageEnglish: 'English',
      currentChoice: 'Pilihan semasa',
      openPage: 'Buka halaman',
    },
    en: {
      general: 'General',
      rateUs: 'Rate Us',
      helpCentre: 'Help Centre',
      preferences: 'Preferences',
      privacyPolicy: 'Privacy Policy',
      termsOfUse: 'Terms of Use',
      contactUs: 'Contact Us',
      language: 'Language',
      settingsDescription: 'Manage key app pages from one clean place.',
      editPageHint: 'This page is separated so it will be easy to update later.',
      comingSoonAction: 'Action buttons can be added later.',
      pageRateUsTitle: 'Rate Us',
      pageRateUsBody: 'Use this page for your App Store and Google Play rating links once the app is published.',
      pageHelpCentreTitle: 'Help Centre',
      pageHelpCentreBody: 'Place FAQs, usage guides, halal review explanations, and feedback instructions here.',
      pagePreferencesTitle: 'Preferences',
      pagePreferencesBody: 'This page is suitable for general settings such as notifications, experience, and display preferences.',
      pagePrivacyTitle: 'Privacy Policy',
      pagePrivacyBody: 'Place the official app privacy policy here. This is important for App Store and Google Play review.',
      pageTermsTitle: 'Terms of Use',
      pageTermsBody: 'Use this page for terms of use, disclaimers, and community rules.',
      pageContactTitle: 'Contact Us',
      pageContactBody: 'Place your official support email, phone number, WhatsApp, or help form on this page.',
      pageLanguageTitle: 'Language',
      pageLanguageBody: 'Choose the app language. This choice will be saved on the user device.',
      selected: 'Selected',
      chooseLanguage: 'Choose Language',
      languageMalay: 'Bahasa Melayu',
      languageEnglish: 'English',
      currentChoice: 'Current choice',
      openPage: 'Open page',
    }
  }[language];

  const settingsItems = [
    {
      id: 'rate-us' as SettingsPage,
      title: copy.rateUs,
      subtitle: language === 'ms' ? 'Halaman rating untuk App Store dan Google Play' : 'Rating page for App Store and Google Play',
      icon: Star,
      iconClass: 'bg-amber-50 text-amber-600',
    },
    {
      id: 'help-centre' as SettingsPage,
      title: copy.helpCentre,
      subtitle: language === 'ms' ? 'FAQ, bantuan pengguna, dan panduan aplikasi' : 'FAQ, user help, and app guidance',
      icon: Headphones,
      iconClass: 'bg-sky-50 text-sky-600',
    },
    {
      id: 'preferences' as SettingsPage,
      title: copy.preferences,
      subtitle: language === 'ms' ? 'Tetapan umum dan pilihan pengalaman pengguna' : 'General settings and experience options',
      icon: Settings2,
      iconClass: 'bg-violet-50 text-violet-600',
    },
    {
      id: 'privacy-policy' as SettingsPage,
      title: copy.privacyPolicy,
      subtitle: language === 'ms' ? 'Polisi privasi rasmi aplikasi' : 'Official app privacy policy',
      icon: ShieldCheck,
      iconClass: 'bg-emerald-50 text-emerald-600',
    },
    {
      id: 'terms-of-use' as SettingsPage,
      title: copy.termsOfUse,
      subtitle: language === 'ms' ? 'Syarat penggunaan dan penafian' : 'Terms of use and disclaimers',
      icon: FileText,
      iconClass: 'bg-orange-50 text-orange-600',
    },
    {
      id: 'contact-us' as SettingsPage,
      title: copy.contactUs,
      subtitle: language === 'ms' ? 'Maklumat saluran sokongan rasmi' : 'Official support contact details',
      icon: MessageSquareQuote,
      iconClass: 'bg-rose-50 text-rose-600',
    },
    {
      id: 'language' as SettingsPage,
      title: copy.language,
      subtitle: language === 'ms' ? 'Tukar bahasa aplikasi kepada BM atau English' : 'Change the app language to BM or English',
      icon: Languages,
      iconClass: 'bg-indigo-50 text-indigo-600',
    },
  ];

  const renderSettingsDetailPage = () => {
    const detailMap: Record<Exclude<SettingsPage, 'main'>, { title: string; body: string; icon: React.ComponentType<{ size?: number | string; className?: string; }>; iconClass: string; }> = {
      'rate-us': {
        title: copy.pageRateUsTitle,
        body: copy.pageRateUsBody,
        icon: Star,
        iconClass: 'bg-amber-50 text-amber-600',
      },
      'help-centre': {
        title: copy.pageHelpCentreTitle,
        body: copy.pageHelpCentreBody,
        icon: Headphones,
        iconClass: 'bg-sky-50 text-sky-600',
      },
      'preferences': {
        title: copy.pagePreferencesTitle,
        body: copy.pagePreferencesBody,
        icon: Settings2,
        iconClass: 'bg-violet-50 text-violet-600',
      },
      'privacy-policy': {
        title: copy.pagePrivacyTitle,
        body: copy.pagePrivacyBody,
        icon: ShieldCheck,
        iconClass: 'bg-emerald-50 text-emerald-600',
      },
      'terms-of-use': {
        title: copy.pageTermsTitle,
        body: copy.pageTermsBody,
        icon: FileText,
        iconClass: 'bg-orange-50 text-orange-600',
      },
      'contact-us': {
        title: copy.pageContactTitle,
        body: copy.pageContactBody,
        icon: MessageSquareQuote,
        iconClass: 'bg-rose-50 text-rose-600',
      },
      'language': {
        title: copy.pageLanguageTitle,
        body: copy.pageLanguageBody,
        icon: Languages,
        iconClass: 'bg-indigo-50 text-indigo-600',
      },
    };

    if (settingsPage === 'main') {
      return null;
    }

    const detail = detailMap[settingsPage];
    const DetailIcon = detail.icon;

    return (
      <div className="space-y-6 pb-24 animate-in fade-in">
        <div className="bg-white rounded-[2.5rem] p-8 border border-stone-100 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setSettingsPage('main')} className="w-12 h-12 flex items-center justify-center bg-stone-50 rounded-full hover:bg-stone-100 text-stone-600 transition-colors">
              <ArrowLeft size={22} />
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-stone-400">{copy.general}</p>
              <h2 className="text-2xl font-bold text-stone-800 tracking-tight">{detail.title}</h2>
            </div>
          </div>

          <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-6 ${detail.iconClass}`}>
            <DetailIcon size={28} />
          </div>

          <div className="space-y-4">
            <p className="text-stone-700 leading-7">{detail.body}</p>
            <div className="bg-stone-50 border border-stone-100 rounded-[1.75rem] p-5">
              <p className="text-sm font-semibold text-stone-700 mb-2">{copy.editPageHint}</p>
              <p className="text-sm text-stone-500">{copy.comingSoonAction}</p>
            </div>
          </div>
        </div>

        {settingsPage === 'language' && (
          <div className="bg-white rounded-[2.5rem] p-6 border border-stone-100 shadow-sm">
            <div className="mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-stone-400 mb-2">{copy.chooseLanguage}</p>
              <h3 className="text-lg font-bold text-stone-800">{copy.currentChoice}: {language === 'ms' ? copy.languageMalay : copy.languageEnglish}</h3>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setLanguage('ms')}
                className={`w-full rounded-[1.75rem] border p-5 text-left transition-all ${language === 'ms' ? 'border-stone-800 bg-stone-900 text-white shadow-xl shadow-stone-900/10' : 'border-stone-100 bg-stone-50 text-stone-700 hover:border-stone-200'}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold">{copy.languageMalay}</p>
                    <p className={`text-sm mt-1 ${language === 'ms' ? 'text-stone-300' : 'text-stone-500'}`}>Malay</p>
                  </div>
                  {language === 'ms' && <span className="text-xs font-bold uppercase tracking-widest">{copy.selected}</span>}
                </div>
              </button>

              <button
                onClick={() => setLanguage('en')}
                className={`w-full rounded-[1.75rem] border p-5 text-left transition-all ${language === 'en' ? 'border-stone-800 bg-stone-900 text-white shadow-xl shadow-stone-900/10' : 'border-stone-100 bg-stone-50 text-stone-700 hover:border-stone-200'}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold">{copy.languageEnglish}</p>
                    <p className={`text-sm mt-1 ${language === 'en' ? 'text-stone-300' : 'text-stone-500'}`}>English</p>
                  </div>
                  {language === 'en' && <span className="text-xs font-bold uppercase tracking-widest">{copy.selected}</span>}
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] px-6 animate-in fade-in">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-stone-200 border border-stone-100 text-center max-w-sm w-full">
           <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-green-100">
              <CheckCircle size={40} className="text-green-600" />
           </div>
           <h2 className="text-2xl font-bold text-stone-800 mb-2 tracking-tight">Profil Dikemaskini</h2>
           <p className="text-stone-400 text-sm mb-8">Maklumat anda telah berjaya disimpan.</p>
           <button onClick={() => setShowSuccess(false)} className="w-full bg-stone-800 text-white font-bold py-4 rounded-2xl hover:bg-stone-700 shadow-lg shadow-stone-800/20 active:scale-95 transition-all">
             Selesai
           </button>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="bg-white min-h-[80vh] rounded-t-[3rem] relative top-4 shadow-[0_-10px_60px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom-10 border-t border-stone-100">
        <div className="p-8">
           <div className="flex items-center gap-4 mb-10">
              <button onClick={() => setIsEditing(false)} className="w-12 h-12 flex items-center justify-center bg-stone-50 rounded-full hover:bg-stone-100 text-stone-600 transition-colors">
                 <ArrowLeft size={24} />
              </button>
              <h2 className="text-2xl font-bold text-stone-800 tracking-tight">{t.edit_profile}</h2>
           </div>

           <div className="flex flex-col items-center mb-10">
               <div className="relative w-28 h-28 group cursor-pointer">
                   <img src={formData.avatar} className="w-full h-full rounded-full object-cover border-4 border-white shadow-lg shadow-stone-200" />
                   <div className="absolute inset-0 bg-stone-900/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                       <Camera className="text-white" size={32} />
                   </div>
                   <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleAvatarChange} />
               </div>
               <p className="text-xs text-stone-400 mt-3 font-bold uppercase tracking-widest">{t.change_photo}</p>
           </div>

           <div className="space-y-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-stone-400 uppercase ml-1 tracking-wider">Nama Panggilan</label>
                 <input 
                   type="text" 
                   value={formData.name}
                   onChange={(e) => setFormData({...formData, name: e.target.value})}
                   className="w-full bg-stone-50 border border-stone-100 rounded-2xl p-4 text-stone-800 focus:outline-none focus:border-stone-400 font-medium"
                 />
              </div>
           </div>

           <div className="mt-10 space-y-4">
               <button onClick={handleSave} className="w-full bg-stone-800 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-stone-800/20 active:scale-95 transition-all">
                 <Save size={20} /> {t.save_changes}
               </button>
               
               <button onClick={handleForgotPassword} className="w-full bg-stone-100 text-stone-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-stone-200 active:scale-95 transition-all">
                  <KeyRound size={20} /> 
                  {resetSent ? "Pautan Dihantar!" : "Lupa Kata Laluan?"}
               </button>
           </div>
        </div>
      </div>
    );
  }

  if (settingsPage !== 'main') {
    return renderSettingsDetailPage();
  }

  return (
    <div className="space-y-8 pb-24 animate-in fade-in">
       
       {/* Top Profile Card */}
       <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_4px_30px_rgba(0,0,0,0.03)] border border-stone-100 text-center relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-28 bg-stone-50 -z-10 group-hover:bg-stone-100 transition-colors duration-500" />
          
          <div className="absolute top-4 right-4">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${rank.color} ${rank.text} shadow-sm`}>
                  {rank.title}
              </span>
          </div>

          <div className="relative inline-block mb-4 mt-6">
                <img src={user.avatar} alt="Profile" className="w-28 h-28 rounded-full border-[6px] border-white bg-white mx-auto object-cover shadow-lg shadow-stone-200" />
                <button onClick={() => setIsEditing(true)} className="absolute bottom-1 right-1 bg-stone-800 text-white p-2.5 rounded-full shadow-md hover:scale-110 transition-transform"><Camera size={16}/></button>
          </div>
          <h2 className="text-2xl font-bold text-stone-800 tracking-tight">{user.name}</h2>
          <p className="text-stone-400 text-xs mt-1 uppercase tracking-widest font-bold">{user.role === 'admin' ? 'Pentadbir' : 'Ahli Komuniti'}</p>
          <div className="flex items-center justify-center gap-2 mt-4 text-[10px] font-bold text-stone-500 bg-stone-50 inline-flex px-4 py-2 rounded-full mx-auto border border-stone-100">
             <Calendar size={12} /> {t.member_since}: {dateJoined}
          </div>
       </div>

       <div className="bg-white rounded-[2.5rem] p-6 border border-stone-100 shadow-sm">
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-stone-400 mb-2">{copy.general}</p>
            <h3 className="text-xl font-bold text-stone-800 tracking-tight">{copy.settingsDescription}</h3>
          </div>

          <div className="space-y-3">
            {settingsItems.map((item) => {
              const ItemIcon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => setSettingsPage(item.id)}
                  className="w-full bg-stone-50 hover:bg-stone-100 border border-stone-100 rounded-[1.75rem] p-4 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${item.iconClass}`}>
                      <ItemIcon size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-stone-800">{item.title}</p>
                      <p className="text-xs text-stone-500 mt-1 leading-snug">{item.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {item.id === 'language' && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                          {language === 'ms' ? 'BM' : 'EN'}
                        </span>
                      )}
                      <ChevronRight size={18} className="text-stone-400" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
       </div>

       {/* GAMIFICATION Metrics Card */}
       <div className="bg-stone-900 text-white p-6 rounded-[2rem] shadow-2xl shadow-stone-900/30 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-40 h-40 bg-white/5 rounded-full -mr-12 -mt-12 blur-3xl pointer-events-none" />
          <div className="absolute left-0 bottom-0 w-32 h-32 bg-yellow-500/10 rounded-full -ml-10 -mb-10 blur-2xl pointer-events-none" />
          
          <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                  <div>
                      <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Mata Terkumpul</p>
                      <div className="flex items-baseline gap-2">
                          <span className="text-5xl font-bold tracking-tight text-yellow-400">{user.points || 0}</span>
                          <span className="text-sm text-stone-400 font-medium">mata</span>
                      </div>
                  </div>
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 shadow-inner">
                      <Trophy className="text-yellow-400 drop-shadow-md" size={32} />
                  </div>
              </div>

              {/* Progress Bar */}
              {rank.next !== Infinity && (
                  <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                          <span>Level Semasa</span>
                          <span>Sasaran: {rank.next}</span>
                      </div>
                      <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${progressPercent}%` }}
                          />
                      </div>
                      <p className="text-[10px] text-stone-500 text-center mt-1">Hanya {rank.next - (user.points || 0)} mata lagi untuk naik pangkat!</p>
                  </div>
              )}
          </div>
       </div>

       {/* Contribution Count (Small) */}
       <div className="flex gap-4">
           <div className="flex-1 bg-white p-4 rounded-[2rem] border border-stone-100 flex flex-col items-center justify-center gap-2">
               <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                   <Package size={20} />
               </div>
               <div className="text-center">
                   <span className="block text-xl font-bold text-stone-800">{user.totalContributions || 0}</span>
                   <span className="text-[10px] text-stone-400 font-bold uppercase">Sumbangan</span>
               </div>
           </div>
           <div className="flex-1 bg-white p-4 rounded-[2rem] border border-stone-100 flex flex-col items-center justify-center gap-2">
               <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center">
                   <Star size={20} />
               </div>
               <div className="text-center">
                   <span className="block text-xl font-bold text-stone-800">#{rank.next === Infinity ? '1' : 'Top 100'}</span>
                   <span className="text-[10px] text-stone-400 font-bold uppercase">Kedudukan</span>
               </div>
           </div>
       </div>

       {/* History Section - Enhanced Layout */}
       <div>
            {/* Header with Search and Filter */}
            <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-xl font-bold text-stone-800 tracking-tight">{t.scan_history}</h3>
                <button className="w-10 h-10 bg-white border border-stone-200 rounded-xl flex items-center justify-center text-stone-500 hover:bg-stone-50 shadow-sm active:scale-95 transition-all">
                    <SlidersHorizontal size={18} />
                </button>
            </div>

            {/* Search Input */}
            <div className="relative mb-6">
                <input 
                    type="text" 
                    placeholder={t.search_history} 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-stone-100 rounded-2xl py-4 pl-12 pr-4 shadow-sm text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-100 transition-all"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
            </div>
            
            {isLoadingSubmissions ? (
                <div className="py-20 text-center">
                    <Loader2 className="animate-spin text-stone-300 mx-auto mb-2" size={32} />
                    <p className="text-stone-400 text-xs font-medium">Memuatkan data...</p>
                </div>
            ) : filteredSubmissions.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-[2rem] border border-dashed border-stone-200">
                    <div className="w-14 h-14 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-3 text-stone-300">
                        <Package size={28} />
                    </div>
                    <p className="text-stone-400 text-sm font-medium">Tiada rekod dijumpai.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredSubmissions.map((item) => (
                        <div key={item.id} className="group bg-white p-3 rounded-[1.75rem] border border-stone-100 flex gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-lg hover:shadow-stone-200/50 hover:-translate-y-0.5 transition-all relative overflow-hidden">
                            
                            {/* Left: Image (Larger) */}
                            <div className="w-24 h-28 bg-stone-50 rounded-2xl overflow-hidden shrink-0 border border-stone-50 relative">
                                {item.frontImageURL ? (
                                    <img src={item.frontImageURL} className="w-full h-full object-cover mix-blend-multiply group-hover:scale-105 transition-transform duration-500" alt={item.name} />
                                ) : (
                                    <Package className="w-full h-full p-6 text-stone-300" />
                                )}
                                <div className="absolute top-2 left-2 bg-white/80 backdrop-blur-sm p-1.5 rounded-full text-stone-300">
                                    <Heart size={12} fill="currentColor" />
                                </div>
                            </div>

                            {/* Middle: Content */}
                            <div className="flex-1 py-1 pr-10 min-w-0 flex flex-col justify-center">
                                <h4 className="font-bold text-stone-800 text-base leading-tight line-clamp-2 mb-1">{item.name}</h4>
                                <div className="flex items-center gap-1 text-xs text-stone-500 font-medium mb-3">
                                    <MapPin size={10} className="text-stone-400" />
                                    <span className="truncate">{item.brand}</span>
                                </div>

                                <div className="flex items-center gap-1.5 text-stone-400 mt-auto">
                                    <Calendar size={12} strokeWidth={2.5} />
                                    <span className="text-[10px] font-bold uppercase tracking-wide">
                                        {new Date(item.submissionTimestamp).toLocaleDateString(language === 'ms' ? 'ms-MY' : 'en-GB', { day: '2-digit', month: 'short' })}
                                    </span>
                                </div>
                            </div>

                            <div className="absolute top-4 right-4">
                                {renderStatusIcon(item.status)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
       </div>

       <button onClick={onLogout} className="w-full bg-red-50 text-red-500 font-bold py-4 rounded-2xl hover:bg-red-100 transition-colors text-xs flex items-center justify-center gap-3 uppercase tracking-widest border border-red-100 active:scale-95 mt-4">
         <LogOut size={16} /> {t.logout}
       </button>
    </div>
  );
};

export default ProfileScreen;
