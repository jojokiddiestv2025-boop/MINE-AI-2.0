import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from './firebase';
import LiveVoice from './components/LiveVoice';
import Auth from './components/Auth';
import Landing from './components/Landing';
import Logo from './components/Logo';
import SchoolDashboard from './components/SchoolDashboard';

type UserContextMode = 'personal' | 'school';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [viewState, setViewState] = useState<'landing' | 'auth' | 'app' | 'school_admin'>('landing');
  const [authMode, setAuthMode] = useState<UserContextMode>('personal');

  const hasApiKey = !!process.env.API_KEY && process.env.API_KEY.length > 5;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsInitializing(false);
      
      // Automatic routing after successful auth
      if (currentUser && viewState === 'auth') {
        setViewState(authMode === 'school' ? 'school_admin' : 'app');
      }
    });
    return () => unsubscribe();
  }, [viewState, authMode]);

  const handleStartPersonal = () => {
    setAuthMode('personal');
    user ? setViewState('app') : setViewState('auth');
  };

  const handleStartSchool = () => {
    setAuthMode('school');
    user ? setViewState('school_admin') : setViewState('auth');
  };

  const handleSelectKey = async () => {
    try {
      const aistudio = (window as any).aistudio;
      if (aistudio && aistudio.openSelectKey) {
        await aistudio.openSelectKey();
        // Assume selection was successful and proceed to bypass the offline screen
        setViewState('app');
      } else {
        console.warn("AI Studio key selection interface not found.");
      }
    } catch (e) {
      console.error("Key selection error:", e);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 animate-billion">
        <Logo size="md" showText={false} />
        <div className="mt-12 w-16 h-1 bg-prismatic rounded-full animate-pulse"></div>
      </div>
    );
  }

  // View: Landing Page
  if (viewState === 'landing') {
    return (
      <Landing 
        onGetStarted={handleStartPersonal} 
        onAuthClick={() => { setAuthMode('personal'); setViewState('auth'); }}
        onSchoolClick={handleStartSchool}
        isLoggedIn={!!user}
      />
    );
  }

  // View: Authentication Portal
  if (viewState === 'auth' && !user) {
    return (
      <Auth 
        mode={authMode}
        onBack={() => setViewState('landing')} 
        onComplete={() => setViewState(authMode === 'school' ? 'school_admin' : 'app')} 
      />
    );
  }

  // View: School Administrative Command Center
  if (viewState === 'school_admin' && user) {
    return <SchoolDashboard onBack={() => setViewState('landing')} />;
  }

  // View: Primary Personal AI Interface
  if (user && viewState === 'app') {
    if (!hasApiKey) {
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 text-center animate-billion">
          <div className="mb-12 scale-75 md:scale-100">
            <Logo size="lg" showText={true} />
          </div>
          <div className="glass-premium p-10 md:p-14 rounded-[4rem] max-w-xl w-full">
            <div className="w-20 h-20 rounded-full bg-cyan-600/5 flex items-center justify-center mx-auto mb-10 border border-cyan-500/20 shadow-[0_10px_40px_rgba(0,242,255,0.1)]">
              <svg className="w-10 h-10 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h2 className="text-3xl font-outfit font-black mb-6 uppercase tracking-tight text-slate-900">Neural Uplink Required</h2>
            <p className="text-slate-600 mb-12 leading-relaxed text-lg font-medium">
              Please authorize your secure API credentials to establish a high-bandwidth link with MINE AI.
              <br />
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-cyan-600 underline mt-4 inline-block hover:text-cyan-500 transition-colors">Billing Documentation</a>
            </p>
            <button 
              onClick={handleSelectKey} 
              className="button-billion !py-5 !px-16"
            >
              Establish Node Link
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col min-h-screen w-full font-inter overflow-x-hidden">
        <header className="sticky top-0 h-auto flex items-center px-6 md:px-14 lg:px-24 bg-white/30 backdrop-blur-3xl border-b border-black/[0.05] z-50 shrink-0 safe-pt py-6">
          <div 
            className="flex items-center space-x-4 md:space-x-8 group cursor-pointer active:scale-95 transition-transform" 
            onClick={() => setViewState('landing')}
          >
            <div className="scale-75 md:scale-90">
              <Logo size="sm" showText={false} />
            </div>
            <h1 className="text-2xl md:text-4xl font-outfit font-black tracking-[-0.1em] uppercase whitespace-nowrap text-slate-900">
              MINE <span className="text-prismatic">AI</span>
            </h1>
          </div>
          
          <div className="ml-auto flex items-center space-x-6 md:space-x-12">
            <button 
              onClick={() => { auth.signOut(); setViewState('landing'); }}
              className="text-[11px] uppercase font-black tracking-[0.4em] text-slate-500 hover:text-slate-900 transition-all bg-black/[0.03] hover:bg-black/[0.08] px-8 py-4 rounded-3xl border border-black/[0.05]"
            >
              Disconnect Node
            </button>
          </div>
        </header>

        <main className="flex-1 w-full relative flex flex-col overflow-hidden">
          <LiveVoice onHome={() => setViewState('landing')} isAcademic={false} />
        </main>
      </div>
    );
  }

  // Catch-all
  return <Landing onGetStarted={handleStartPersonal} onAuthClick={() => setViewState('auth')} onSchoolClick={handleStartSchool} isLoggedIn={false} />;
};

export default App;