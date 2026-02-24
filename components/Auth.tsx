
import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup
} from "firebase/auth";
import { auth, googleProvider } from '../firebase';
import Logo from './Logo';
import { ArrowLeft, Mail, Lock, ShieldCheck, Chrome } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthProps {
  onBack: () => void;
  onComplete: () => void;
  errorOverride?: string | null;
  theme?: 'default' | 'healing';
}

const Auth: React.FC<AuthProps> = ({ onBack, onComplete, errorOverride, theme = 'default' }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isResetPassword, setIsResetPassword] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [securityStatus, setSecurityStatus] = useState('CHECKING...');

  useEffect(() => {
    if (errorOverride) setError(errorOverride);
    
    const statuses = [
      'SECURE LINK: OK', 
      'IDENTITY SYNC: ACTIVE',
      'CORE STATUS: READY',
      'SYSTEM READY'
    ];
    let idx = 0;
    const interval = setInterval(() => {
      setSecurityStatus(statuses[idx % statuses.length]);
      idx++;
    }, 3000);
    return () => clearInterval(interval);
  }, [errorOverride]);

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Connection failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (isResetPassword) {
        await sendPasswordResetEmail(auth, email);
        setSuccess('Reset link sent to your email.');
        return;
      }

      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        onComplete();
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        onComplete();
      }
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') setError("Invalid email or password.");
      else setError(err.message || 'System error.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center p-6 animate-billion relative overflow-hidden transition-colors duration-1000 ${theme === 'healing' ? 'bg-[#0a0502] text-[#e0d8d0]' : 'bg-white text-slate-900'}`}>
      <div className={`absolute inset-0 overflow-hidden pointer-events-none ${theme === 'healing' ? 'opacity-100' : 'opacity-10'}`}>
        {theme === 'healing' ? (
          <>
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#ff4e00]/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#3a1510]/20 rounded-full blur-[150px]"></div>
          </>
        ) : (
          <div className="mesh-gradient"></div>
        )}
      </div>
      
      <button onClick={onBack} className={`absolute top-16 left-16 group flex items-center space-x-6 text-[11px] font-black uppercase tracking-[0.8em] transition-all z-50 ${theme === 'healing' ? 'text-[#e0d8d0]/40 hover:text-[#e0d8d0]' : 'text-slate-400 hover:text-slate-900'}`}>
        <ArrowLeft size={24} strokeWidth={3} />
        <span>Go Back</span>
      </button>

      <div className={`w-full max-w-2xl p-16 md:p-24 rounded-[5rem] shadow-[0_80px_150px_rgba(0,0,0,0.08)] relative overflow-hidden transition-all duration-1000 ${theme === 'healing' ? 'bg-white/5 border border-white/10 backdrop-blur-3xl' : 'bg-white/90 border-white'}`}>
        <div className={`absolute inset-x-0 top-0 h-2 opacity-60 ${theme === 'healing' ? 'bg-[#ff4e00]' : 'bg-gradient-to-r from-cyan-400 via-accent to-pink-500'}`}></div>
        
        <div className="flex flex-col items-center mb-16 text-center relative z-10 pt-4">
          <Logo size="sm" showText={false} className={theme === 'healing' ? 'invert brightness-200' : ''} />
          <h2 className={`text-5xl md:text-6xl font-outfit font-black tracking-tight uppercase mt-10 ${theme === 'healing' ? 'text-white' : 'text-slate-900'}`}>
            {isResetPassword ? 'Reset Password' : (isLogin ? 'Sign In' : 'Create Account')}
          </h2>
          <div className={`mt-6 flex items-center gap-4 px-8 py-3 rounded-full border ${theme === 'healing' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-100'}`}>
             <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${theme === 'healing' ? 'bg-[#ff4e00]' : 'bg-cyan-500'}`}></div>
             <span className={`text-[10px] font-black uppercase tracking-[0.6em] ${theme === 'healing' ? 'text-[#e0d8d0]/40' : 'text-slate-400'}`}>{securityStatus}</span>
          </div>
        </div>

        <div className="space-y-10 relative z-10">
          {!isResetPassword && (
            <button onClick={handleGoogleSignIn} disabled={isLoading} className={`w-full py-6 rounded-[2.5rem] border-2 flex items-center justify-center gap-6 text-[12px] font-black uppercase tracking-[0.5em] transition-all shadow-xl active:scale-95 group ${theme === 'healing' ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-slate-100 text-slate-900 hover:bg-slate-50'}`}>
              <Chrome size={24} className={theme === 'healing' ? 'text-white' : 'text-[#4285F4]'} />
              <span>{isLogin ? 'Continue with Google' : 'Sign up with Google'}</span>
            </button>
          )}

          {!isResetPassword && (
            <div className={`flex items-center gap-8 opacity-20 ${theme === 'healing' ? 'text-white' : 'text-slate-900'}`}>
               <div className={`flex-1 h-[2px] ${theme === 'healing' ? 'bg-white' : 'bg-slate-900'}`}></div>
               <span className="text-[12px] font-black uppercase tracking-widest">OR</span>
               <div className={`flex-1 h-[2px] ${theme === 'healing' ? 'bg-white' : 'bg-slate-900'}`}></div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <label className={`text-[10px] font-black uppercase tracking-widest px-10 ${theme === 'healing' ? 'text-[#e0d8d0]/40' : 'text-slate-400'}`}>Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail((e.target as any).value)} className={`w-full rounded-[2.5rem] px-10 py-6 font-bold text-xl outline-none transition-all ${theme === 'healing' ? 'bg-white/5 border border-white/10 text-white focus:ring-[#ff4e00]/20' : 'bg-slate-50/50 border border-slate-100 text-slate-900 focus:ring-accent/10'}`} placeholder="name@email.com" required />
            </div>

            {!isResetPassword && (
              <div className="space-y-4">
                <label className={`text-[10px] font-black uppercase tracking-widest px-10 ${theme === 'healing' ? 'text-[#e0d8d0]/40' : 'text-slate-400'}`}>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword((e.target as any).value)} className={`w-full rounded-[2.5rem] px-10 py-6 font-bold text-xl outline-none transition-all ${theme === 'healing' ? 'bg-white/5 border border-white/10 text-white focus:ring-[#ff4e00]/20' : 'bg-slate-50/50 border border-slate-100 text-slate-900 focus:ring-accent/10'}`} placeholder="••••••••" required />
              </div>
            )}
            
            {error && <div className={`p-8 text-[10px] font-black rounded-[2.5rem] border text-center uppercase tracking-widest animate-billion border-l-8 shadow-lg ${theme === 'healing' ? 'bg-red-950/20 text-red-400 border-red-500/30 border-l-red-500' : 'bg-red-50 text-red-600 border-red-100 border-l-red-500'}`}>{error}</div>}
            {success && <div className={`p-8 text-[10px] font-black rounded-[2.5rem] border text-center uppercase tracking-widest animate-billion shadow-lg ${theme === 'healing' ? 'bg-emerald-950/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>{success}</div>}
            
            <button type="submit" disabled={isLoading} className={`w-full !py-8 text-lg shadow-2xl active:scale-95 flex items-center justify-center gap-6 rounded-[2.5rem] font-black uppercase tracking-widest transition-all ${theme === 'healing' ? 'bg-[#ff4e00] text-white hover:bg-[#ff4e00]/90' : 'bg-slate-900 text-white hover:bg-accent'}`}>
              {isLoading ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : <span>{isResetPassword ? 'Send Link' : 'Go'}</span>}
            </button>
          </form>
        </div>

        <div className="mt-16 text-center relative z-10 flex flex-col gap-8">
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className={`text-[11px] font-black transition-colors uppercase tracking-[0.6em] ${theme === 'healing' ? 'text-[#ff4e00] hover:text-white' : 'text-accent hover:text-slate-900'}`}>
            {isLogin ? "Need an Account?" : "Already have an account?"}
          </button>
          {!isResetPassword && (
            <button onClick={() => setIsResetPassword(true)} className={`text-[10px] font-black uppercase tracking-[0.8em] transition-colors ${theme === 'healing' ? 'text-[#e0d8d0]/20 hover:text-[#e0d8d0]/40' : 'text-slate-300 hover:text-slate-500'}`}>
              Forgot Password?
            </button>
          )}
          {isResetPassword && (
            <button onClick={() => setIsResetPassword(false)} className={`text-[10px] font-black uppercase tracking-[0.8em] transition-colors ${theme === 'healing' ? 'text-[#e0d8d0]/20 hover:text-[#e0d8d0]/40' : 'text-slate-300 hover:text-slate-500'}`}>
              Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
