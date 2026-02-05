
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from './firebase';
import LiveVoice from './components/LiveVoice';
import Auth from './components/Auth';
import Landing from './components/Landing';
import Logo from './components/Logo';
import SchoolDashboard from './components/SchoolDashboard';
import { UserRole } from './types';

type AppView = 'landing' | 'auth_personal' | 'auth_school' | 'app_active' | 'school_admin' | 'auth_register_school';
type UserContextMode = 'personal' | 'school';

const App: React.FC = () => {
  const [proxyUser, setProxyUser] = useState<{uid: string, email?: string} | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [viewState, setViewState] = useState<AppView>('landing');
  const [authMode, setAuthMode] = useState<UserContextMode>('personal');
  const [assignedRole, setAssignedRole] = useState<UserRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasApiKey = !!process.env.API_KEY && process.env.API_KEY.length > 5;

  const handleStartPersonal = () => {
    setAuthMode('personal');
    setViewState('auth_personal');
  };

  const handleStartSchoolPortal = () => {
    setAuthMode('school');
    setViewState('auth_school');
  };

  const handleRegisterInstitution = () => {
    setAuthMode('school');
    setViewState('auth_register_school');
  };

  // Synchronize Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        processSession(currentUser.uid);
      } else {
        // Check for Proxy Session
        const proxyKeys = Object.keys(localStorage).filter(k => k.startsWith('mine_role_proxy_'));
        if (proxyKeys.length > 0) {
          const proxyUid = proxyKeys[0].replace('mine_role_', '');
          setProxyUser({ uid: proxyUid });
          processSession(proxyUid);
        } else {
          setProxyUser(null);
          setIsInitializing(false);
        }
      }
    });
    return () => unsubscribe();
  }, [authMode]);

  const processSession = (uid: string) => {
    const storedRole = localStorage.getItem(`mine_role_${uid}`) as UserRole | null;
    
    if (!storedRole) {
      if (!uid.startsWith('proxy_')) auth.signOut();
      setViewState('landing');
      setIsInitializing(false);
      return;
    }

    // Context Lockdown
    const isContextMismatch = (authMode === 'personal' && storedRole !== 'personal') || 
                             (authMode === 'school' && storedRole === 'personal');
    
    if (isContextMismatch) {
      setError(`SECURITY ALERT: Virtual Identity Mismatch. Verification Required.`);
      if (!uid.startsWith('proxy_')) auth.signOut();
      else localStorage.removeItem(`mine_role_${uid}`);
      setViewState(authMode === 'school' ? 'auth_school' : 'auth_personal');
      setIsInitializing(false);
      return;
    }
    
    setAssignedRole(storedRole);
    if (storedRole === 'school_admin') setViewState('school_admin');
    else setViewState('app_active');
    setIsInitializing(false);
  };

  const handleLogout = () => {
    auth.signOut();
    const proxyKeys = Object.keys(localStorage).filter(k => k.startsWith('mine_role_proxy_'));
    proxyKeys.forEach(k => localStorage.removeItem(k));
    setProxyUser(null);
    setViewState('landing');
  };

  const handleSelectKey = async () => {
    try {
      const aistudio = (window as any).aistudio;
      if (aistudio && aistudio.openSelectKey) {
        await aistudio.openSelectKey();
        window.location.reload(); 
      }
    } catch (e) {
      console.error("Key selection error:", e);
    }
  };

  const activeUser = user || proxyUser;

  if (isInitializing) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 animate-billion bg-slate-50">
        <Logo size="sm" showText={false} />
        <div className="mt-12 w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
           <div className="h-full bg-prismatic animate-[loading_2s_infinite]"></div>
        </div>
        <p className="mt-6 text-[9px] font-black uppercase tracking-[0.8em] text-slate-400">Verifying Neural integrity...</p>
        <style>{`@keyframes loading { 0% { width: 0%; } 50% { width: 100%; } 100% { width: 0%; } }`}</style>
      </div>
    );
  }

  if (viewState === 'landing') {
    return <Landing 
      onGetStarted={handleStartPersonal} 
      onAuthClick={handleStartPersonal} 
      onSchoolClick={handleRegisterInstitution}
      onSchoolPortalClick={handleStartSchoolPortal}
      isLoggedIn={!!activeUser} 
    />;
  }

  if (viewState === 'auth_personal' && !activeUser) {
    return <Auth mode="personal" errorOverride={error} onBack={() => setViewState('landing')} onComplete={() => {}} />;
  }

  if (viewState === 'auth_school' && !activeUser) {
    return <Auth mode="school" errorOverride={error} onBack={() => setViewState('landing')} onComplete={() => {}} />;
  }

  if (viewState === 'auth_register_school' && !activeUser) {
    return <Auth mode="school" isRegisteringInstitution onBack={() => setViewState('landing')} onComplete={() => {}} />;
  }

  if (activeUser && hasApiKey) {
    const isSchool = assignedRole === 'student' || assignedRole === 'teacher';
    const isProxy = activeUser.uid.startsWith('proxy_');
    return (
      <div className="flex flex-col min-h-screen w-full font-inter overflow-x-hidden">
        <header className="sticky top-0 h-auto flex items-center px-6 md:px-14 lg:px-24 bg-white/30 backdrop-blur-3xl border-b border-black/[0.05] z-50 shrink-0 py-6">
          <div className="flex items-center space-x-6 cursor-pointer" onClick={() => setViewState('landing')}>
            <Logo size="sm" showText={false} />
            <h1 className="text-2xl md:text-4xl font-outfit font-black tracking-[-0.1em] uppercase text-slate-900">
              MINE <span className="text-prismatic">{isSchool ? 'SCHOOLS' : 'AI'}</span>
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-6">
            <div className="flex items-center gap-3 px-6 py-2 bg-green-50 rounded-full border border-green-100 shadow-sm">
               <div className={`w-2 h-2 rounded-full ${isProxy ? 'bg-cyan-500' : 'bg-green-500'} animate-pulse`}></div>
               <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">
                 {isProxy ? 'Neural Proxy Active' : 'Shield Active'}
               </span>
            </div>
            <span className="hidden sm:block text-[10px] font-black uppercase tracking-[0.3em] bg-prismatic/10 text-slate-600 px-6 py-3 rounded-2xl border border-prismatic/20">
              {assignedRole?.toUpperCase()}
            </span>
            <button onClick={handleLogout} className="text-[10px] uppercase font-black tracking-[0.4em] text-slate-400 hover:text-slate-900 transition-all bg-black/[0.03] px-6 py-3 rounded-2xl border border-black/[0.05]">
              Terminate
            </button>
          </div>
        </header>
        <main className="flex-1 w-full relative flex flex-col overflow-hidden bg-slate-50/20">
          {assignedRole === 'school_admin' ? (
             <SchoolDashboard onBack={handleLogout} />
          ) : (
             <LiveVoice 
               onHome={() => setViewState('landing')} 
               isAcademic={isSchool} 
               isTeacher={assignedRole === 'teacher'} 
             />
          )}
        </main>
      </div>
    );
  }

  if (activeUser && !hasApiKey) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 text-center animate-billion">
        <div className="glass-premium p-16 rounded-[4.5rem] max-w-xl w-full border-white/90 shadow-2xl">
          <Logo size="md" showText={false} />
          <h2 className="text-3xl font-outfit font-black mb-6 mt-10 uppercase text-slate-900">Uplink Encryption</h2>
          <p className="text-slate-600 mb-12 text-lg font-medium leading-relaxed">Identity confirmed. To activate high-frequency neural processing, please provide an authorized Node Key.</p>
          <button onClick={handleSelectKey} className="button-billion !py-6 !px-20">Verify Key</button>
        </div>
      </div>
    );
  }

  return <Landing 
    onGetStarted={handleStartPersonal} 
    onAuthClick={handleStartPersonal} 
    onSchoolClick={handleRegisterInstitution}
    onSchoolPortalClick={handleStartSchoolPortal}
    isLoggedIn={false} 
  />;
};

export default App;
