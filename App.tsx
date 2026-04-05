
import React, { useState, useEffect } from 'react';
import Landing from './components/Landing';
import Auth from './components/Auth';
import LiveVoice from './components/LiveVoice';
import Chatbot from './components/Chatbot';

import { auth } from './firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { Sparkles, Mic, LogOut, Home, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/**
 * App Component: The main orchestrator of the Mine AI platform.
 * Handles authentication state and view navigation.
 */
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'auth' | 'voice' | 'chatbot'>('landing');

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
        onGetStarted={() => {
          if (user) setView('voice');
          else setView('auth');
        }} 
        onAuthClick={() => {
          if (user) setView('voice');
          else setView('auth');
        }}
        isLoggedIn={!!user}
      />
    );
  }

  if (view === 'auth') {
    return (
      <Auth 
        onBack={() => setView('landing')} 
        onComplete={() => setView('voice')} 
      />
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex w-24 bg-white border-r border-slate-100 flex-col items-center py-12 gap-10 shrink-0 sticky top-0 h-screen">
        <button 
          onClick={() => setView('landing')} 
          className="w-14 h-14 rounded-3xl bg-slate-900 flex items-center justify-center text-white shadow-2xl hover:scale-110 transition-transform"
        >
           <Home size={24} strokeWidth={2.5} />
        </button>
        
        <nav className="flex-1 flex flex-col gap-10">
          {[
            { id: 'voice', icon: <Mic size={24} strokeWidth={2.5} />, label: 'Voice' },
            { id: 'chatbot', icon: <MessageSquare size={24} strokeWidth={2.5} />, label: 'Chat' }
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

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex items-center justify-around py-4 px-6 z-[200] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => setView('landing')} 
          className="p-4 rounded-2xl transition-all text-slate-300"
        >
          <Home size={24} strokeWidth={2.5} />
        </button>
        {[
          { id: 'voice', icon: <Mic size={24} strokeWidth={2.5} /> },
          { id: 'chatbot', icon: <MessageSquare size={24} strokeWidth={2.5} /> }
        ].map(item => (
          <button 
            key={item.id}
            onClick={() => setView(item.id as any)}
            className={`p-4 rounded-2xl transition-all ${view === item.id ? 'text-accent scale-110' : 'text-slate-300'}`}
          >
            {item.icon}
          </button>
        ))}
        <button 
          onClick={handleSignOut} 
          className="p-4 rounded-2xl text-slate-300 hover:text-red-500 transition-all"
        >
          <LogOut size={24} strokeWidth={2.5} />
        </button>
      </nav>

      {/* Primary Workspace Area */}
      <main className="flex-1 bg-white pb-20 md:pb-0">
        {view === 'voice' && <LiveVoice userName={user?.displayName || 'Core'} />}
        {view === 'chatbot' && <Chatbot userName={user?.displayName || 'Core'} />}
      </main>
    </div>
  );
};

export default App;
