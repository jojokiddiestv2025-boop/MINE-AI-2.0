import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from './firebase';
import LiveVoice from './components/LiveVoice';
import Auth from './components/Auth';
import Landing from './components/Landing';
import Logo from './components/Logo';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showLanding, setShowLanding] = useState(true);

  const hasApiKey = !!process.env.API_KEY && process.env.API_KEY.length > 5;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsInitializing(false);
    });
    return () => unsubscribe();
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen w-full bg-[#02040a] flex flex-col items-center justify-center p-6 animate-apex">
        <Logo size="md" showText={false} />
        <div className="mt-12 w-12 h-12 border-2 border-blue-600/10 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (showLanding && !user) {
    return <Landing onEnter={() => setShowLanding(false)} />;
  }

  if (!user) {
    return <Auth />;
  }

  if (!hasApiKey) {
    return (
      <div className="min-h-screen w-full bg-[#02040a] flex flex-col items-center justify-center p-6 text-center animate-apex">
        <div className="mb-12 md:mb-16 scale-75 md:scale-100">
          <Logo size="lg" showText={true} />
        </div>
        <div className="glass-premium p-8 md:p-12 rounded-[3rem] max-w-lg w-full">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-600/5 flex items-center justify-center mx-auto mb-8 border border-red-600/20 shadow-2xl shadow-red-600/10">
            <svg className="w-8 h-8 md:w-10 md:h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl md:text-3xl font-outfit font-black mb-4 uppercase tracking-tight">Configuration Required</h2>
          <p className="text-gray-500 mb-10 leading-relaxed text-base md:text-lg">
            The <code>API_KEY</code> is missing. Neural synchronization requires valid credentials to establish the link.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="button-apex w-full md:w-auto !py-4 !px-12"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#02040a] font-inter overflow-x-hidden">
      <header className="sticky top-0 h-auto flex items-center px-4 md:px-10 lg:px-20 bg-black/60 backdrop-blur-3xl border-b border-white/[0.03] z-50 shrink-0 safe-pt py-3 md:py-4">
        <div className="flex items-center space-x-3 md:space-x-6 group cursor-pointer" onClick={() => setShowLanding(true)}>
          <div className="scale-75 md:scale-100">
            <Logo size="sm" showText={false} />
          </div>
          <h1 className="text-lg md:text-2xl font-outfit font-black tracking-[-0.08em] uppercase whitespace-nowrap text-white">
            Mine <span className="text-blue-600">Ai</span>
          </h1>
        </div>
        
        <div className="ml-auto flex items-center space-x-4 md:space-x-12">
          <div className="hidden md:flex items-center space-x-4 text-[10px] lg:text-[11px] font-black uppercase tracking-[0.3em] lg:tracking-[0.5em] text-gray-600">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shadow-[0_0_15px_rgba(0,102,255,0.8)]"></span>
            <span>Link established</span>
          </div>
          <button 
            onClick={() => auth.signOut()}
            className="text-[9px] md:text-[10px] uppercase font-black tracking-[0.2em] md:tracking-[0.4em] text-gray-500 hover:text-white transition-all bg-white/[0.03] px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border border-white/5 whitespace-nowrap"
          >
            Disconnect
          </button>
        </div>
      </header>

      <main className="flex-1 w-full relative flex flex-col">
        <LiveVoice />
      </main>
    </div>
  );
};

export default App;