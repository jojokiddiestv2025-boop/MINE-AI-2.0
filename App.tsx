import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from './firebase';
import LiveVoice from './components/LiveVoice';
import Auth from './components/Auth';
import Landing from './components/Landing';
import Logo from './components/Logo';
import SchoolDashboard from './components/SchoolDashboard';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [viewState, setViewState] = useState<'landing' | 'auth' | 'app' | 'school_admin'>('landing');

  const hasApiKey = !!process.env.API_KEY && process.env.API_KEY.length > 5;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsInitializing(false);
      // Logic: If user just logged in and we weren't on landing, go to app
      if (currentUser && viewState === 'auth') {
        setViewState('app');
      }
    });
    return () => unsubscribe();
  }, [viewState]);

  if (isInitializing) {
    return (
      <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center p-6 animate-billion">
        <Logo size="md" showText={false} />
        <div className="mt-12 w-16 h-1 bg-prismatic rounded-full animate-pulse"></div>
      </div>
    );
  }

  // Handle Main View States
  if (viewState === 'landing') {
    return <Landing 
      onGetStarted={() => user ? setViewState('app') : setViewState('auth')} 
      onAuthClick={() => setViewState('auth')}
      isLoggedIn={!!user}
    />;
  }

  if (viewState === 'auth' && !user) {
    return <Auth onBack={() => setViewState('landing')} onComplete={() => setViewState('app')} />;
  }

  if (viewState === 'school_admin' && user) {
    return <SchoolDashboard onBack={() => setViewState('app')} />;
  }

  // Primary App View
  if (user) {
    if (!hasApiKey) {
      return (
        <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center p-6 text-center animate-billion">
          <div className="mb-12 scale-75 md:scale-100">
            <Logo size="lg" showText={true} />
          </div>
          <div className="glass-premium p-10 md:p-14 rounded-[4rem] max-w-xl w-full">
            <div className="w-20 h-20 rounded-full bg-red-600/10 flex items-center justify-center mx-auto mb-10 border border-red-600/30">
              <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-3xl font-outfit font-black mb-6 uppercase tracking-tight">Configuration Link Offline</h2>
            <p className="text-gray-400 mb-12 leading-relaxed text-lg font-medium">
              The neural pipeline requires an <code>API_KEY</code>.
            </p>
            <button onClick={() => window.location.reload()} className="button-billion !py-5 !px-16">Restart Connection</button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col min-h-screen w-full bg-[#000] font-inter overflow-x-hidden">
        <header className="sticky top-0 h-auto flex items-center px-6 md:px-14 lg:px-24 bg-black/50 backdrop-blur-3xl border-b border-white/[0.08] z-50 shrink-0 safe-pt py-6">
          <div 
            className="flex items-center space-x-4 md:space-x-8 group cursor-pointer active:scale-95 transition-transform" 
            onClick={() => setViewState('landing')}
          >
            <div className="scale-75 md:scale-90">
              <Logo size="sm" showText={false} />
            </div>
            <h1 className="text-2xl md:text-4xl font-outfit font-black tracking-[-0.1em] uppercase whitespace-nowrap text-white">
              MINE <span className="text-prismatic">AI</span>
            </h1>
          </div>
          
          <div className="ml-auto flex items-center space-x-6 md:space-x-12">
            <div className="hidden lg:flex items-center space-x-8 text-[11px] font-black uppercase tracking-[0.8em] text-gray-500">
              <button 
                onClick={() => setViewState('school_admin')}
                className="flex items-center space-x-3 text-cyan-400 hover:text-white transition-all"
              >
                <span className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_20px_rgba(0,242,255,1)]"></span>
                <span>School Nexus</span>
              </button>
              <button onClick={() => setViewState('landing')} className="hover:text-white transition-colors">Core</button>
            </div>
            <button 
              onClick={() => { auth.signOut(); setViewState('landing'); }}
              className="text-[11px] uppercase font-black tracking-[0.4em] text-white/50 hover:text-white transition-all bg-white/[0.05] hover:bg-white/[0.1] px-8 py-4 rounded-3xl border border-white/10"
            >
              Sign Out
            </button>
          </div>
        </header>

        <main className="flex-1 w-full relative flex flex-col overflow-hidden">
          <LiveVoice onHome={() => setViewState('landing')} isAcademic={true} />
        </main>
      </div>
    );
  }

  return <Landing onGetStarted={() => setViewState('auth')} onAuthClick={() => setViewState('auth')} isLoggedIn={false} />;
};

export default App;