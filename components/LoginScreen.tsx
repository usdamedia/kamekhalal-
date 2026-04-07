
import React, { useState } from 'react';
import { ShieldCheck, Loader2, ArrowRight, Lock, Mail, User as UserIcon, AlertCircle, CheckCircle } from 'lucide-react';
import { authService, dbService } from '../services/firebase';
import { User } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { t } = useLanguage();
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); 
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      const user = await authService.signInWithGoogle();
      onLoginSuccess(user);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ralat log masuk Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isForgotPassword) {
        await authService.sendPasswordResetEmail(email);
        setResetSent(true);
        setSuccess(t.reset_link_sent);
      } else if (isRegistering) {
        if (!name) throw new Error("Sila masukkan nama anda.");
        const firebaseUser = await authService.signUp(email, password, name);
        const newUser: User = {
            id: firebaseUser.uid,
            name: name,
            email: email,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
            role: 'user',
            phone: '',
            dob: '',
            totalContributions: 0,
            points: 0
        };
        await dbService.saveUser(newUser);
        setVerificationSent(true);
      } else {
        const user = await authService.signIn(email, password);
        await user.reload();
        if (!user.emailVerified) {
             await authService.logout();
             throw new Error("E-mel belum disahkan. Sila semak peti masuk anda.");
        }
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || "Ralat berlaku.";
      if (err.code === 'auth/user-not-found') errMsg = "Emel tidak dijumpai.";
      if (err.code === 'auth/wrong-password') errMsg = "Kata laluan salah.";
      if (err.code === 'auth/invalid-email') errMsg = "Format emel tidak sah.";
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  if (verificationSent) {
      return (
        <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 relative">
            <div className="bg-white border border-stone-200 p-8 rounded-3xl space-y-6 max-w-sm w-full text-center shadow-sm">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle size={32} className="text-green-700" />
                </div>
                <h2 className="text-xl font-bold text-stone-800">Emel Dihantar</h2>
                <p className="text-stone-500 text-sm leading-relaxed">
                    {t.verify_email_sent} <span className="font-semibold text-stone-800">{email}</span>.
                </p>
                <button 
                    onClick={() => { setVerificationSent(false); setIsRegistering(false); }}
                    className="w-full bg-stone-800 text-[#FDFBF7] font-medium py-3 rounded-xl hover:bg-stone-700 transition-colors mt-4"
                >
                    {t.back_to_login}
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-stone-800">
      
      <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Logo Section */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-white border border-stone-100 rounded-2xl mx-auto flex items-center justify-center shadow-sm">
             <ShieldCheck size={32} className="text-stone-800" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-bold text-stone-800 tracking-tight pt-2">
            Kamek<span className="text-stone-500">Halal</span>
          </h1>
          <p className="text-stone-400 text-sm">{t.login_subtitle}</p>
        </div>

        {/* Login/Register Form */}
        <div className="bg-white border border-stone-100 p-8 rounded-[2rem] shadow-sm space-y-6">
           
           {/* Tabs */}
           {!isForgotPassword && (
             <div className="flex bg-stone-50 p-1 rounded-xl">
                <button 
                  onClick={() => { setIsRegistering(false); setError(''); setSuccess(''); }}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${!isRegistering ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                >
                  {t.login_title}
                </button>
                <button 
                  onClick={() => { setIsRegistering(true); setError(''); setSuccess(''); }}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${isRegistering ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                >
                  {t.register_title}
                </button>
             </div>
           )}

           {isForgotPassword && (
              <h2 className="text-xl font-bold text-stone-800 text-center">{t.forgot_password}</h2>
           )}

           <form onSubmit={handleSubmit} className="space-y-4">
              
              {isRegistering && !isForgotPassword && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 fade-in">
                    <label className="text-[10px] uppercase font-bold text-stone-400 ml-1">{t.name_label}</label>
                    <div className="relative">
                        <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        autoComplete="name"
                        className="w-full bg-stone-50 border border-transparent focus:border-stone-300 rounded-xl px-4 py-3 pl-10 text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-0 transition-all text-sm"
                        placeholder="Nama Penuh"
                        />
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                    </div>
                </div>
              )}

              <div className="space-y-1.5">
                 <label className="text-[10px] uppercase font-bold text-stone-400 ml-1">{t.email_label}</label>
                 <div className="relative">
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="w-full bg-stone-50 border border-transparent focus:border-stone-300 rounded-xl px-4 py-3 pl-10 text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-0 transition-all text-sm"
                      placeholder="name@email.com"
                    />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                 </div>
              </div>

              {!isForgotPassword && (
                <div className="space-y-1.5">
                   <div className="flex justify-between items-center pr-1">
                      <label className="text-[10px] uppercase font-bold text-stone-400 ml-1">{t.password_label}</label>
                      {!isRegistering && (
                        <button 
                          type="button"
                          onClick={() => { setIsForgotPassword(true); setError(''); setSuccess(''); }}
                          className="text-[10px] font-bold text-stone-400 hover:text-stone-800 transition-colors"
                        >
                          {t.forgot_password}
                        </button>
                      )}
                   </div>
                   <div className="relative">
                      <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required={!isForgotPassword}
                        autoComplete={isRegistering ? "new-password" : "current-password"}
                        className="w-full bg-stone-50 border border-transparent focus:border-stone-300 rounded-xl px-4 py-3 pl-10 text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-0 transition-all text-sm"
                        placeholder="••••••••"
                      />
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                   </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 p-3 rounded-xl flex items-start gap-2 animate-in fade-in">
                   <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                   <span className="text-red-600 text-xs leading-snug">{error}</span>
                </div>
              )}

              {success && (
                <div className="bg-green-50 p-3 rounded-xl flex items-start gap-2 animate-in fade-in">
                   <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                   <span className="text-green-600 text-xs leading-snug">{success}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-stone-800 hover:bg-stone-700 text-[#FDFBF7] font-bold py-4 px-4 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70 mt-4 shadow-xl shadow-stone-800/20"
              >
                {isLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <span>{isForgotPassword ? "Hantar Pautan" : isRegistering ? t.register_btn : t.login_btn}</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              {!isForgotPassword && (
                 <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                       <span className="w-full border-t border-stone-100"></span>
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-bold">
                       <span className="bg-white px-4 text-stone-300">Atau</span>
                    </div>
                 </div>
              )}

              {!isForgotPassword && (
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full bg-white border border-stone-100 hover:border-stone-200 text-stone-800 font-bold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-70 shadow-[0_4px_15px_rgba(231,229,228,0.4)]"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span className="text-sm">Log Masuk dengan Google</span>
                </button>
              )}

              {isForgotPassword && (
                 <button 
                  type="button"
                  onClick={() => { setIsForgotPassword(false); setError(''); setSuccess(''); }}
                  className="w-full text-xs font-bold text-stone-400 hover:text-stone-800 transition-colors py-2"
                >
                   {t.back_to_login}
                </button>
              )}
           </form>
        </div>
        
        <div className="text-center">
             <p className="text-[10px] text-stone-300">© 2025 KamekHalal</p>
        </div>
      </div>
    </div>
  );
};
