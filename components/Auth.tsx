
import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup
} from "firebase/auth";
import { auth, googleProvider } from '../firebase';
import Logo from './Logo';

interface AuthProps {
  onBack: () => void;
  onComplete: () => void;
  errorOverride?: string | null;
}

const Auth: React.FC<AuthProps> = ({ onBack, onComplete, errorOverride }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isResetPassword, setIsResetPassword] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [securityStatus, setSecurityStatus] = useState('MONITORING...');

  useEffect(() => {
    if (errorOverride) setError(errorOverride);
    
    const statuses = [
      'SSL HANDSHAKE: VERIFIED', 
      'IDENTITY SHIELD: ACTIVE',
      'HYPER-SYNC: ENABLED',
      'NEURAL TLS 1.3 ACTIVE'
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
      setError(err.message || 'Google Link Interrupted.');
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
        setSuccess('Recovery link dispatched.');
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
      if (err.code === 'auth/invalid-credential') setError("ACCESS DENIED: Invalid credentials.");
      else setError(err.message || 'Handshake Error.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 animate-billion relative bg-slate-50 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#00f2ff 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
      
      <button onClick={onBack} className="absolute top-12 left-12 group flex items-center space-x-4 text-[10px] font-black uppercase tracking-[0.6em] text-slate-400 hover:text-slate-900 transition-all z-50">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeWidth={2}/></svg>
        <span>Back</span>
      </button>

      <div className="w-full max-w-2xl glass-premium p-12 md:p-20 rounded-[4.5rem] shadow-2xl relative border-white/90 overflow-hidden bg-white/80">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 opacity-40"></div>
        
        <div className="flex flex-col items-center mb-12 text-center relative z-10 pt-8">
          <Logo size="sm" showText={false} />
          <h2 className="text-4xl md:text-5xl font-outfit font-black tracking-tighter text-slate-900 uppercase mt-8">
            {isResetPassword ? 'Reset Access' : (isLogin ? 'Personal Node' : 'Provision Node')}
          </h2>
          <div className="mt-4 flex items-center gap-3 px-6 py-2 bg-slate-50 border border-black/[0.03] rounded-full">
             <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping"></div>
             <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">{securityStatus}</span>
          </div>
        </div>

        <div className="space-y-8 relative z-10">
          {!isResetPassword && (
            <button onClick={handleGoogleSignIn} disabled={isLoading} className="w-full py-5 rounded-[2rem] border-2 border-slate-900/5 bg-white flex items-center justify-center gap-4 text-[11px] font-black uppercase tracking-[0.4em] text-slate-900 hover:bg-slate-50 transition-all shadow-xl active:scale-95 group">
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              <span>{isLogin ? 'Sync via Google' : 'Register via Google'}</span>
            </button>
          )}

          {!isResetPassword && (
            <div className="flex items-center gap-6 opacity-20">
               <div className="flex-1 h-[1px] bg-slate-900"></div>
               <span className="text-[10px] font-black uppercase tracking-widest">OR</span>
               <div className="flex-1 h-[1px] bg-slate-900"></div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 px-8">Email Address</label>
              {/* Fix: Cast e.target to any to access .value and resolve TypeScript property error */}
              <input type="email" value={email} onChange={(e) => setEmail((e.target as any).value)} className="w-full bg-white/60 border border-black/[0.05] rounded-3xl px-8 py-5 text-slate-900 font-bold text-lg" placeholder="identity@nexus.ai" required />
            </div>

            {!isResetPassword && (
              <div className="space-y-3">
                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 px-8">Access Key</label>
                {/* Fix: Cast e.target to any to access .value and resolve TypeScript property error */}
                <input type="password" value={password} onChange={(e) => setPassword((e.target as any).value)} className="w-full bg-white/60 border border-black/[0.05] rounded-3xl px-8 py-5 text-slate-900 font-bold text-lg" placeholder="••••••••" required />
              </div>
            )}
            
            {error && <div className="p-6 bg-red-50 text-red-600 text-[9px] font-black rounded-3xl border border-red-100 text-center uppercase tracking-widest animate-billion border-l-4 border-l-red-500">{error}</div>}
            {success && <div className="p-6 bg-cyan-50 text-cyan-700 text-[9px] font-black rounded-3xl border border-cyan-100 text-center uppercase tracking-widest animate-billion">{success}</div>}
            
            <button type="submit" disabled={isLoading} className="button-billion w-full !py-6 text-sm shadow-2xl active:scale-95 flex items-center justify-center gap-4">
              {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <span>Verify Node</span>}
            </button>
          </form>
        </div>

        <div className="mt-12 text-center relative z-10 flex flex-col gap-6">
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-slate-400 hover:text-cyan-600 text-[9px] font-black transition-colors uppercase tracking-[0.5em]">
            {isLogin ? "Need a Personal Node?" : "Return to Login"}
          </button>
          {!isResetPassword && (
            <button onClick={() => setIsResetPassword(true)} className="text-[8px] font-black text-slate-300 hover:text-slate-500 uppercase tracking-[0.6em]">
              Lost Access Key?
            </button>
          )}
          {isResetPassword && (
            <button onClick={() => setIsResetPassword(false)} className="text-[8px] font-black text-slate-300 hover:text-slate-500 uppercase tracking-[0.6em]">
              Return to Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;