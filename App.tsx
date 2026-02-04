
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from './firebase';
import LiveVoice from './components/LiveVoice';
import Auth from './components/Auth';
import Landing from './components/Landing';
import Logo from './components/Logo';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showLanding, setShowLanding] = useState(true);

  // Check if API KEY is present - refined for wrapped environments
  const apiKey = process.env.API_KEY || (window as any).process?.env?.API_KEY;
  const hasApiKey = !!apiKey && apiKey.length > 5;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsInitializing(false);
    });
    return () => unsubscribe();
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen w-full bg-[#030712] flex flex-col items-center justify-center space-y-6">
        <Logo size="md" className="animate-pulse" />
        <div className="w-12 h-12 border-2 border-blue-600/10 border-t-blue-600 rounded-full animate-spin"></div>
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
      <div className="min-h-screen w-full bg-[#030712] flex flex-col items-center justify-center p-6 text-center safe-pt safe-pb">
        <div className="mb-10">
          <Logo size="lg" />
        </div>
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
          <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-outfit font-bold mb-4 uppercase tracking-tighter">System Configuration Error</h2>
        <p className="text-gray-400 max-w-md mb-8 leading-relaxed">
          The <code>API_KEY</code> environment variable is required to establish a neural link. Please verify your environment variables.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="px-10 py-4 bg-blue-600 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
        >
          Re-establish Link
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#030712] font-inter overflow-x-hidden">
      <header className="sticky top-0 h-auto min-h-[5rem] flex items-center px-4 md:px-8 glass border-b border-white/5 z-50 shrink-0 safe-pt">
        <div className="flex items-center space-x-3 py-3">
          <Logo size="sm" />
          <h1 className="text-lg md:text-xl font-outfit font-black tracking-tighter uppercase whitespace-nowrap">
            Mine <span className="text-blue-500">Ai</span>
          </h1>
        </div>
        
        <div className="ml-auto flex items-center space-x-4 md:space-x-8">
          <div className="hidden sm:flex items-center space-x-3 text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="hidden lg:inline">Link Sync: 100%</span>
          </div>
          <button 
            onClick={() => auth.signOut()}
            className="text-[9px] uppercase font-black tracking-widest text-gray-500 hover:text-red-500 transition-colors bg-white/5 px-3 py-2 rounded-xl border border-white/5"
          >
            Exit
          </button>
        </div>
      </header>

      <main className="flex-1 w-full relative">
        <LiveVoice />
      </main>
    </div>
  );
};

export default App;
