import React, { useState, useEffect } from 'react';
// Added 'type' keyword for User to resolve module export errors
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

  // Directly check the presence of the API key as required by guidelines
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
      <div className="min-h-screen w-full bg-[#02040a] flex flex-col items-center justify-center space-y-12 animate-apex">
        <Logo size="md" showText={false} />
        <div className="w-16 h-16 border-2 border-blue-600/10 border-t-blue-600 rounded-full animate-spin"></div>
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
      <div className="min-h-screen w-full bg-[#02040a] flex flex-col items-center justify-center p-12 text-center animate-apex">
        <div className="mb-16">
          <Logo size="lg" showText={true} />
        </div>
        <div className="w-24 h-24 rounded-full bg-red-600/5 flex items-center justify-center mb-10 border border-red-600/20 shadow-2xl shadow-red-600/10">
          <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-3xl font-outfit font-black mb-6 uppercase tracking-tight">System configuration error</h2>
        <p className="text-gray-500 max-w-md mb-12 leading-relaxed text-lg">
          The <code>API_KEY</code> environment variable is missing. Neural synchronization cannot proceed without valid credentials.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="button-apex"
        >
          Retry connection
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#02040a] font-inter overflow-x-hidden">
      <header className="sticky top-0 h-auto min-h-[6rem] flex items-center px-10 md:px-20 bg-black/40 backdrop-blur-3xl border-b border-white/[0.03] z-50 shrink-0 safe-pt">
        <div className="flex items-center space-x-6 py-6 group cursor-none" onClick={() => setShowLanding(true)}>
          <Logo size="sm" showText={false} />
          <h1 className="text-2xl font-outfit font-black tracking-[-0.08em] uppercase whitespace-nowrap text-white">
            Mine <span className="text-blue-600">Ai</span>
          </h1>
        </div>
        
        <div className="ml-auto flex items-center space-x-12">
          <div className="hidden sm:flex items-center space-x-4 text-[11px] font-black uppercase tracking-[0.5em] text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse shadow-[0_0_15px_rgba(0,102,255,0.8)]"></span>
            <span>Link established</span>
          </div>
          <button 
            onClick={() => auth.signOut()}
            className="text-[10px] uppercase font-black tracking-[0.4em] text-gray-500 hover:text-white transition-all bg-white/[0.03] px-6 py-3 rounded-2xl border border-white/5"
          >
            Disconnect
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