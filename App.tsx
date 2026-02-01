
import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
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
