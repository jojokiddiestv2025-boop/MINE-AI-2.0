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

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Detect Median.co or general mobile WebView environment
  const isWebView = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return (
      (window as any).median || 
      userAgent.includes('median') || 
      userAgent.includes('app-bridge') ||
      userAgent.includes('wv') ||
      (/iphone|ipad|ipod/.test(userAgent) && !userAgent.includes('safari'))
    );
  };

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log("Successfully signed in via redirect");
        }
      } catch (err: any) {
        console.error("Redirect Sign-In Error:", err);
        if (err.code === 'auth/credential-already-in-use') {
          setError('This Google account is already linked to another user.');
        } else if (err.code !== 'auth/popup-closed-by-user') {
          setError('Google authentication failed. Please try again.');
        }
      }
    };
    handleRedirect();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (isResetPassword) {
        await sendPasswordResetEmail(auth, email);
        setSuccess('Password reset link sent to your email.');
      } else if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err.code);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Email or password is incorrect');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('User already exists. Please sign in');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setSuccess('');
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
    provider.addScope('https://www.googleapis.com/auth/userinfo.email');

    try {
      if (isWebView()) {
        await signInWithRedirect(auth, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
    } catch (err: any) {
      console.error(err);
      setError('Google authentication failed.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 animate-apex">
      <div className="w-full max-w-md glass-premium border border-white/5 p-8 md:p-12 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-[60px] pointer-events-none"></div>
        
        <div className="flex flex-col items-center mb-10 relative z-10">
          <div className="scale-75 md:scale-90 mb-4">
            <Logo size="md" showText={false} />
          </div>
          <h2 className="text-3xl font-outfit font-black tracking-tighter text-white uppercase">Mine AI</h2>
          <p className="text-gray-500 mt-2 text-center uppercase tracking-[0.3em] text-[10px] font-black">Neural Link Interface</p>
        </div>

        <div className="space-y-6 relative z-10">
          {!isResetPassword && (
            <>
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full py-4 bg-white text-black font-black rounded-2xl shadow-lg transition-all hover:bg-gray-100 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-3"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span className="text-sm uppercase tracking-wider">Sync with Google</span>
                  </>
                )}
              </button>

              <div className="flex items-center space-x-4 py-2">
                <div className="flex-1 h-[1px] bg-white/10"></div>
                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">or email authentication</span>
                <div className="flex-1 h-[1px] bg-white/10"></div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 mb-2.5 px-1">Access Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-gray-800"
                placeholder="name@neural.net"
                required
              />
            </div>
            
            {!isResetPassword && (
              <div>
                <div className="flex justify-between items-center mb-2.5 px-1">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">Sync Key</label>
                  {isLogin && (
                    <button 
                      type="button"
                      onClick={() => { setIsResetPassword(true); setError(''); setSuccess(''); }}
                      className="text-[9px] font-black text-prismatic/60 hover:text-prismatic uppercase tracking-widest transition-colors"
                    >
                      Reset Key?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-gray-800"
                  placeholder="••••••••"
                  required={!isResetPassword}
                />
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-[11px] py-4 px-5 rounded-2xl font-bold text-center animate-pulse">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-[11px] py-4 px-5 rounded-2xl font-bold text-center">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-5 bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl font-black text-white shadow-xl shadow-blue-900/20 hover:from-blue-600 hover:to-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center uppercase tracking-widest text-sm"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                isResetPassword ? 'Request Link' : (isLogin ? 'Establish Link' : 'Initialize Node')
              )}
            </button>
          </form>
        </div>

        <div className="mt-10 text-center relative z-10 flex flex-col gap-4">
          {isResetPassword ? (
            <button
              onClick={() => { setIsResetPassword(false); setError(''); setSuccess(''); }}
              className="text-gray-500 hover:text-white text-xs font-black transition-colors flex items-center justify-center gap-2 uppercase tracking-widest"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
              Back to Login
            </button>
          ) : (
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}
              className="text-gray-500 hover:text-white text-[10px] font-black transition-colors uppercase tracking-[0.2em] hover:text-prismatic"
            >
              {isLogin ? "Request New Neural Identity" : "Existing Identity Detected? Sign In"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;