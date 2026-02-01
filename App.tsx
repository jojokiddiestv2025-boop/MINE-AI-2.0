
import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User } from "firebase/auth";
import { AppTab } from './types';
import { auth } from './firebase';
import Sidebar from './components/Sidebar';
import TextChat from './components/TextChat';
import LiveVoice from './components/LiveVoice';
import ImageLab from './components/ImageLab';
import Auth from './components/Auth';
import Landing from './components/Landing';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.CHAT);
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showLanding, setShowLanding] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const contentAreaRef = useRef<HTMLDivElement>(null);

  // Check if API KEY is present
  const hasApiKey = !!process.env.API_KEY && process.env.API_KEY.length > 5;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsInitializing(false);
    });
    return () => unsubscribe();
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const threshold = 400;
    if (e.currentTarget.scrollTop > threshold) {
      setShowScrollTop(true);
    } else {
      setShowScrollTop(false);
    }
  };

  const scrollToTop = () => {
    contentAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isInitializing) {
    return (
      <div className="h-screen w-full bg-[#030712] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (showLanding && !user) {
    return <Landing onEnter={() => setShowLanding(false)} />;
  }

  if (!user) {
    return <Auth />;
  }

  // Handle Missing API Key Case
  if (!hasApiKey) {
    return (
      <div className="h-screen w-full bg-[#030712] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
          <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-outfit font-bold mb-4">API Configuration Required</h2>
        <p className="text-gray-400 max-w-md mb-8">
          The <code>API_KEY</code> environment variable is missing or invalid. Please add your Google Gemini API key to your Netlify environment variables.
        </p>
        <div className="glass p-4 rounded-xl border border-gray-800 text-left text-xs font-mono text-gray-500 mb-8">
          Netlify Settings > Environment Variables > Add API_KEY
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#030712] overflow-hidden font-inter">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />

      <main className="flex-1 relative flex flex-col min-w-0">
        <header className="h-16 flex items-center px-6 glass border-b border-gray-800 z-10 shrink-0">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-outfit font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
              {activeTab === AppTab.CHAT ? 'MINE AI Global Chat' : activeTab === AppTab.VOICE ? 'MINE AI Live Voice' : 'MINE AI Image Lab'}
            </h1>
            <div className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border bg-blue-500/10 text-blue-400 border-blue-500/30">
              Economy Engine Active
            </div>
          </div>
          
          <div className="ml-auto flex items-center space-x-3 text-xs text-gray-500 uppercase tracking-widest font-semibold">
            <span className="flex items-center">
              <span className="w-2 h-2 rounded-full mr-2 shadow-lg bg-green-500 animate-pulse"></span>
              Live Source Link
            </span>
          </div>
        </header>

        <div 
          ref={contentAreaRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth"
        >
          {activeTab === AppTab.CHAT ? (
            <TextChat />
          ) : activeTab === AppTab.VOICE ? (
            <LiveVoice />
          ) : (
            <ImageLab />
          )}

          <button
            onClick={scrollToTop}
            className={`fixed bottom-24 right-8 z-50 p-3 rounded-full glass border border-white/10 text-blue-400 shadow-2xl transition-all duration-300 transform ${
              showScrollTop ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'
            } hover:bg-blue-600 hover:text-white group`}
          >
            <svg className="w-5 h-5 group-hover:-translate-y-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
        </div>
      </main>
    </div>
  );
};

export default App;
