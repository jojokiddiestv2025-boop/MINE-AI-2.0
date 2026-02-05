import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from './firebase';
import LiveVoice from './components/LiveVoice';
import Auth from './components/Auth';
import Landing from './components/Landing';
import Logo from './components/Logo';
import SchoolDashboard from './components/SchoolDashboard';

type AppView = 'landing' | 'auth' | 'welcome_personal' | 'welcome_school' | 'app_personal' | 'app_school' | 'school_admin';
type UserContextMode = 'personal' | 'school';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [viewState, setViewState] = useState<AppView>('landing');
  const [authMode, setAuthMode] = useState<UserContextMode>('personal');
  const [error, setError] = useState<string | null>(null);

  const hasApiKey = !!process.env.API_KEY && process.env.API_KEY.length > 5;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsInitializing(false);
      
      if (currentUser) {
        // Enforce account isolation using localStorage to simulate role assignment
        const storedRole = localStorage.getItem(`mine_role_${currentUser.uid}`);
        if (!storedRole) {
          // First time login - assign current authMode as role
          localStorage.setItem(`mine_role_${currentUser.uid}`, authMode);
        } else if (storedRole !== authMode) {
          // Attempting to cross context
          setError(`This account is registered for MINE ${storedRole.toUpperCase()}. Please use a different identity for MINE ${authMode.toUpperCase()}.`);
          auth.signOut();
          setViewState('auth');
          return;
        }

        if (viewState === 'auth') {
          setViewState(authMode === 'school' ? 'welcome_school' : 'welcome_personal');
        }
      }
    });
    return () => unsubscribe();
  }, [viewState, authMode]);

  const handleStartPersonal = () => {
    setAuthMode('personal');
    setError(null);
    user ? setViewState('app_personal') : setViewState('auth');
  };

  const handleStartSchool = () => {
    setAuthMode('school');
    setError(null);
    user ? setViewState('app_school') : setViewState('auth');
  };

  const handleSelectKey = async () => {
    try {
      const aistudio = (window as any).aistudio;
      if (aistudio && aistudio.openSelectKey) {
        await aistudio.openSelectKey();
        setViewState(authMode === 'school' ? 'app_school' : 'app_personal');
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

  // Common Layout Wrapper for the AI Interfaces
  const AIWrapper: React.FC<{ children: React.ReactNode, mode: UserContextMode }> = ({ children, mode }) => (
    <div className="flex flex-col min-h-screen w-full font-inter overflow-x-hidden">
      <header className="sticky top-0 h-auto flex items-center px-6 md:px-14 lg:px-24 bg-white/30 backdrop-blur-3xl border-b border-black/[0.05] z-50 shrink-0 py-6">
        <div 
          className="flex items-center space-x-4 md:space-x-8 group cursor-pointer active:scale-95 transition-transform" 
          onClick={() => setViewState('landing')}
        >
          <div className="scale-75 md:scale-90">
            <Logo size="sm" showText={false} />
          </div>
          <h1 className="text-2xl md:text-4xl font-outfit font-black tracking-[-0.1em] uppercase whitespace-nowrap text-slate-900">
            MINE <span className="text-prismatic">{mode === 'school' ? 'SCHOOLS' : 'AI'}</span>
          </h1>
        </div>
        <div className="ml-auto flex items-center space-x-6">
          <button 
            onClick={() => { auth.signOut(); setViewState('landing'); }}
            className="text-[10px] uppercase font-black tracking-[0.4em] text-slate-400 hover:text-slate-900 transition-all bg-black/[0.03] px-6 py-3 rounded-2xl border border-black/[0.05]"
          >
            Disconnect
          </button>
        </div>
      </header>
      <main className="flex-1 w-full relative flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );

  // View: Landing
  if (viewState === 'landing') {
    return <Landing onGetStarted={handleStartPersonal} onAuthClick={handleStartPersonal} onSchoolClick={handleStartSchool} isLoggedIn={!!user} />;
  }

  // View: Auth
  if (viewState === 'auth' && !user) {
    return <Auth mode={authMode} errorOverride={error} onBack={() => setViewState('landing')} onComplete={() => setViewState(authMode === 'school' ? 'welcome_school' : 'welcome_personal')} />;
  }

  // View: Personal Welcome
  if (viewState === 'welcome_personal') {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-10 text-center animate-billion">
        <Logo size="lg" showText={false} />
        <h2 className="text-6xl md:text-8xl font-outfit font-black text-slate-900 mt-12 mb-6 uppercase tracking-tight">Welcome, <span className="text-prismatic">User</span></h2>
        <p className="text-slate-500 text-xl max-w-xl mb-16 uppercase tracking-[0.4em] font-bold">Your personal neural nexus is online.</p>
        <button onClick={() => setViewState('app_personal')} className="button-billion">Enter Interface</button>
      </div>
    );
  }

  // View: School Welcome
  if (viewState === 'welcome_school') {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-10 text-center animate-billion bg-indigo-50/20">
        <div className="w-32 h-32 rounded-3xl bg-prismatic flex items-center justify-center mb-12 shadow-2xl">
          <Logo size="sm" showText={false} />
        </div>
        <h2 className="text-6xl md:text-8xl font-outfit font-black text-slate-900 mb-6 uppercase tracking-tight">Academic <span className="text-prismatic">Portal</span></h2>
        <p className="text-slate-500 text-xl max-w-2xl mb-16 uppercase tracking-[0.4em] font-bold">Institutional Chancellor active. Ready for academic load.</p>
        <div className="flex gap-6">
          <button onClick={() => setViewState('app_school')} className="button-billion px-16">Start Learning</button>
          <button onClick={() => setViewState('school_admin')} className="px-16 py-6 border-2 border-black/10 rounded-full font-black uppercase text-[11px] tracking-widest hover:bg-black hover:text-white transition-all">Admin Dashboard</button>
        </div>
      </div>
    );
  }

  // View: API Key Required
  if (user && !hasApiKey && (viewState === 'app_personal' || viewState === 'app_school')) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 text-center animate-billion">
        <div className="glass-premium p-14 rounded-[4rem] max-w-xl w-full border-white/90 shadow-2xl">
          <div className="w-20 h-20 rounded-full bg-cyan-600/5 flex items-center justify-center mx-auto mb-10 border border-cyan-500/20 shadow-xl">
            <svg className="w-10 h-10 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
          </div>
          <h2 className="text-3xl font-outfit font-black mb-6 uppercase text-slate-900">Uplink Required</h2>
          <p className="text-slate-600 mb-12 text-lg font-medium">Select your API key to activate the high-bandwidth neural link.</p>
          <button onClick={handleSelectKey} className="button-billion !py-5 !px-16">Establish Node Link</button>
        </div>
      </div>
    );
  }

  // View: School Admin
  if (viewState === 'school_admin' && user) {
    return <SchoolDashboard onBack={() => setViewState('welcome_school')} />;
  }

  // Final AI App Views
  if (user && (viewState === 'app_personal' || viewState === 'app_school')) {
    return (
      <AIWrapper mode={authMode}>
        <LiveVoice onHome={() => setViewState('landing')} isAcademic={authMode === 'school'} />
      </AIWrapper>
    );
  }

  return <Landing onGetStarted={handleStartPersonal} onAuthClick={handleStartPersonal} onSchoolClick={handleStartSchool} isLoggedIn={false} />;
};

export default App;