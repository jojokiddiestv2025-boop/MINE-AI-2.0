import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendPasswordResetEmail
} from "firebase/auth";
import { auth } from '../firebase';
import Logo from './Logo';

interface AuthProps {
  onBack: () => void;
  onComplete: () => void;
}

const Auth: React.FC<AuthProps> = ({ onBack, onComplete }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isWebView = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return (
      (window as any).median || 
      userAgent.includes('wv') ||
      (/iphone|ipad|ipod/.test(userAgent) && !userAgent.includes('safari'))
    );
  };

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) onComplete();
      } catch (err: any) {
        console.error("Auth Error:", err);
        setError('Authentication link failed. Please try again.');
      }
    };
    handleRedirect();
  }, [onComplete]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (isResetPassword) {
        await sendPasswordResetEmail(auth, email);
        setSuccess('Neural key reset link sent to your email.');
      } else if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        onComplete();
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        onComplete();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during synchronization.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      if (isWebView()) {
        await signInWithRedirect(auth, provider);
      } else {
        await signInWithPopup(auth, provider);
        onComplete();
      }
    } catch (err: any) {
      setError('Google sync failed.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 md:p-12 animate-billion relative">
      {/* Back Button */}
      <button 
        onClick={onBack}
        className="absolute top-12 left-12 group flex items-center space-x-4 text-[11px] font-black uppercase tracking-[0.6em] text-gray-500 hover:text-white transition-all"
      >
        <svg className="w-5 h-5 transition-transform group-hover:-translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeWidth={2}/></svg>
        <span>Back to Core</span>
      </button>

      <div className="w-full max-w-2xl glass-premium p-12 md:p-24 rounded-[5rem] shadow-[0_100px_200px_rgba(0,0,0,1)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-600/10 blur-[100px] pointer-events-none"></div>
        
        <div className="flex flex-col items-center mb-16 relative z-10">
          <div className="scale-90 mb-8">
            <Logo size="md" showText={false} />
          </div>
          <h2 className="text-5xl font-outfit font-black tracking-tighter text-white uppercase leading-none">
            MINE <span className="text-prismatic">AI</span>
          </h2>
          <p className="text-gray-500 mt-6 text-center uppercase tracking-[0.6em] text-[10px] font-black">Neural Link Interface established</p>
        </div>

        <div className="space-y-10 relative z-10">
          {!isResetPassword && (
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-6 bg-white text-black font-black rounded-[2rem] shadow-2xl transition-all hover:bg-cyan-500 hover:text-white active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-5"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-4 border-black/20 border-t-black rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg className="w-6 h-6" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  <span className="text-sm uppercase tracking-[0.4em]">Establish Google Sync</span>
                </>
              )}
            </button>
          )}

          <div className="flex items-center space-x-6 py-4">
            <div className="flex-1 h-[1px] bg-white/10"></div>
            <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Manual Node Link</span>
            <div className="flex-1 h-[1px] bg-white/10"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <label className="block text-[11px] font-black uppercase tracking-[0.6em] text-gray-600 px-4">Entity Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-[2rem] px-8 py-6 text-white text-xl focus:ring-2 focus:ring-cyan-500/40 outline-none transition-all placeholder-gray-800"
                placeholder="identity@neural.link"
                required
              />
            </div>
            
            {!isResetPassword && (
              <div className="space-y-4">
                <div className="flex justify-between items-center px-4">
                  <label className="text-[11px] font-black uppercase tracking-[0.6em] text-gray-600">Access Key</label>
                  {isLogin && (
                    <button 
                      type="button"
                      onClick={() => setIsResetPassword(true)}
                      className="text-[10px] font-black text-cyan-500/60 hover:text-cyan-400 uppercase tracking-widest transition-colors"
                    >
                      Lost Key?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-[2rem] px-8 py-6 text-white text-xl focus:ring-2 focus:ring-cyan-500/40 outline-none transition-all placeholder-gray-800"
                  placeholder="••••••••"
                  required={!isResetPassword}
                />
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-sm py-5 px-8 rounded-[2rem] font-bold text-center">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm py-5 px-8 rounded-[2rem] font-bold text-center">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="button-billion w-full text-lg py-7"
            >
              {isLoading ? (
                <div className="w-7 h-7 border-4 border-black/30 border-t-black rounded-full animate-spin"></div>
              ) : (
                isResetPassword ? 'Request Neural Reset' : (isLogin ? 'Establish Link' : 'Initialize Node')
              )}
            </button>
          </form>
        </div>

        <div className="mt-16 text-center relative z-10">
          <button
            onClick={() => { setIsLogin(!isLogin); setIsResetPassword(false); setError(''); setSuccess(''); }}
            className="text-gray-500 hover:text-cyan-400 text-[11px] font-black transition-colors uppercase tracking-[0.4em]"
          >
            {isResetPassword ? "Return to Core Login" : (isLogin ? "Request New Neural Identity" : "Existing Identity Detected? Sign In")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;