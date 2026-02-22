
import React, { useState, useEffect } from 'react';
import Landing from './components/Landing';
import Auth from './components/Auth';
import LiveVoice from './components/LiveVoice';
import Imagine from './components/Imagine';

import { auth } from './firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { Sparkles, Mic, LogOut, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/**
 * App Component: The main orchestrator of the Mine AI platform.
 * Handles authentication state and view navigation.
 */
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'auth' | 'voice' | 'imagine'>('landing');

  // Sync authentication state with Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    setView('landing');
  };

  // View Routing Logic
  if (view === 'landing') {
    return (
      <Landing 
        onGetStarted={() => setView(user ? 'imagine' : 'auth')} 
        onAuthClick={() => setView(user ? 'imagine' : 'auth')}
        isLoggedIn={!!user}
      />
    );
  }

  if (view === 'auth') {
    return (
      <Auth 
        onBack={() => setView('landing')} 
        onComplete={() => setView('imagine')} 
      />
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mini Sidebar Navigation */}
      <aside className="w-24 bg-white border-r border-slate-100 flex flex-col items-center py-12 gap-10 shrink-0">
        <button 
          onClick={() => setView('landing')} 
          className="w-14 h-14 rounded-3xl bg-slate-900 flex items-center justify-center text-white shadow-2xl hover:scale-110 transition-transform"
        >
           <Home size={24} strokeWidth={2.5} />
        </button>
        
        <nav className="flex-1 flex flex-col gap-10">
          {[
            { id: 'imagine', icon: <Sparkles size={24} strokeWidth={2.5} />, label: 'Imagine' },
            { id: 'voice', icon: <Mic size={24} strokeWidth={2.5} />, label: 'Voice' }
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => setView(item.id as any)}
              className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center font-black transition-all relative group ${view === item.id ? 'bg-accent text-white shadow-xl shadow-accent/40' : 'text-slate-300 hover:bg-slate-50'}`}
            >
              {item.icon}
              <span className="absolute left-full ml-4 px-4 py-2 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100]">
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        <button 
          onClick={handleSignOut} 
          className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
        >
          <LogOut size={24} strokeWidth={2.5} />
        </button>
      </aside>

      {/* Primary Workspace Area */}
      <main className="flex-1 h-full overflow-hidden bg-white">
        {view === 'imagine' && <Imagine />}
        {view === 'voice' && <LiveVoice userName={user?.displayName || 'Core'} />}
      </main>
    </div>
  );
};

export default App;
