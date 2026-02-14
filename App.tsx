
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from './firebase';
import LiveVoice from './components/LiveVoice';
import TextChat from './components/TextChat';
import Auth from './components/Auth';
import Landing from './components/Landing';
import Logo from './components/Logo';
import { UserRole } from './types';

type AppView = 'landing' | 'auth_personal' | 'app_active';
type AppFeature = 'voice' | 'chat';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [viewState, setViewState] = useState<AppView>('landing');
  const [activeFeature, setActiveFeature] = useState<AppFeature>('chat');
  const [assignedRole, setAssignedRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        localStorage.setItem(`mine_role_${currentUser.uid}`, 'personal');
        setAssignedRole('personal');
        setViewState('app_active');
      } else {
        setAssignedRole(null);
        if (viewState === 'app_active') setViewState('landing');
      }
      setIsInitializing(false);
    });
    return () => unsubscribe();
  }, [viewState]);

  const handleLogout = () => {
    auth.signOut();
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('mine_role_')) localStorage.removeItem(key);
    });
    setViewState('landing');
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 animate-billion bg-white">
        <Logo size="sm" showText={false} />
        <div className="mt-16 w-48 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
           <div className="h-full bg-gradient-to-r from-cyan-400 via-accent to-pink-500 animate-[loading_2.5s_infinite]"></div>
        </div>
        <p className="mt-8 text-[11px] font-black uppercase tracking-[1em] text-slate-400">Syncing Unlimited Core...</p>
        <style>{`@keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
      </div>
    );
  }

  if (!user) {
    if (viewState === 'auth_personal') return <Auth onBack={() => setViewState('landing')} onComplete={() => setViewState('app_active')} />;
    return <Landing onGetStarted={() => setViewState('auth_personal')} onAuthClick={() => setViewState('auth_personal')} isLoggedIn={false} />;
  }

  const userName = user?.displayName || user?.email?.split('@')[0] || 'User';

  return (
    <div className="flex flex-col min-h-screen w-full font-inter overflow-x-hidden bg-[#ffffff]">
      <header className="sticky top-0 h-auto flex items-center px-8 md:px-20 lg:px-32 bg-white/70 backdrop-blur-3xl border-b border-slate-100 z-50 shrink-0 py-8">
        <div className="flex items-center space-x-8 cursor-pointer group" onClick={() => setViewState('landing')}>
          <Logo size="sm" showText={false} />
          <h1 className="text-3xl md:text-5xl font-outfit font-black tracking-[-0.08em] uppercase text-slate-900">
            MINE <span className="text-prismatic">AI</span>
          </h1>
        </div>
        
        {/* Feature Toggles */}
        <div className="hidden lg:flex items-center ml-16 bg-slate-100/50 p-1.5 rounded-full border border-slate-100">
          <button 
            onClick={() => setActiveFeature('chat')}
            className={`px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeFeature === 'chat' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Chatbot
          </button>
          <button 
            onClick={() => setActiveFeature('voice')}
            className={`px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeFeature === 'voice' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Live Voice
          </button>
        </div>

        <div className="ml-auto flex items-center gap-6 md:gap-10">
          <div className="hidden md:flex items-center gap-4 px-8 py-3 bg-slate-50 rounded-full border border-slate-100">
             <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></div>
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">UNLIMITED ENGINE</span>
          </div>
          <button onClick={handleLogout} className="text-[11px] uppercase font-black tracking-[0.4em] text-slate-400 hover:text-slate-900 transition-all bg-slate-50 px-6 md:px-10 py-4 rounded-[2rem] border border-slate-100 hover:shadow-lg">
            Logout
          </button>
        </div>
      </header>

      {/* Mobile Toggle */}
      <div className="lg:hidden flex justify-center py-4 bg-white border-b border-slate-50">
        <div className="flex bg-slate-100/50 p-1 rounded-full border border-slate-100">
          <button 
            onClick={() => setActiveFeature('chat')}
            className={`px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activeFeature === 'chat' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
          >
            Chat
          </button>
          <button 
            onClick={() => setActiveFeature('voice')}
            className={`px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activeFeature === 'voice' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
          >
            Voice
          </button>
        </div>
      </div>

      <main className="flex-1 w-full relative flex flex-col overflow-hidden bg-white">
        <div className="mesh-gradient opacity-30"></div>
        {activeFeature === 'voice' ? (
          <LiveVoice onHome={() => setViewState('landing')} userName={userName} />
        ) : (
          <TextChat userName={userName} />
        )}
      </main>
    </div>
  );
};

export default App;
