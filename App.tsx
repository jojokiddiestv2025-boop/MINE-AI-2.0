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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsInitializing(false);
      
      if (currentUser) {
        const storedRole = localStorage.getItem(`mine_role_${currentUser.uid}`) as UserRole | null;
        
        if (!storedRole) {
          // Fallback if role missing (should not happen with updated Auth.tsx)
          auth.signOut();
          setViewState('landing');
          return;
        }

        // Context Lockdown
        const isContextMismatch = (authMode === 'personal' && storedRole !== 'personal') || 
                                 (authMode === 'school' && storedRole === 'personal');
        
        if (isContextMismatch) {
          setError(`SECURITY ALERT: Account tier mismatch detected. Access Restricted.`);
          auth.signOut();
          setViewState(authMode === 'school' ? 'auth_school' : 'auth_personal');
          return;
        }
        
        setAssignedRole(storedRole);
        if (storedRole === 'school_admin') setViewState('school_admin');
        else setViewState('app_active');
      }
    });
    return () => unsubscribe();
  }, [authMode]);

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

  if (isInitializing) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 animate-billion bg-slate-50">
        <Logo size="md" showText={false} />
        <div className="mt-12 w-32 h-1 bg-prismatic rounded-full animate-pulse"></div>
        <p className="mt-6 text-[9px] font-black uppercase tracking-[0.8em] text-slate-400">Verifying Neural integrity...</p>
      </div>
    );
  }

  if (viewState === 'landing') {
    return <Landing 
      onGetStarted={handleStartPersonal} 
      onAuthClick={handleStartPersonal} 
      onSchoolClick={handleRegisterInstitution}
      onSchoolPortalClick={handleStartSchoolPortal}
      isLoggedIn={!!user} 
    />;
  }

  if (viewState === 'auth_personal' && !user) {
    return <Auth mode="personal" errorOverride={error} onBack={() => setViewState('landing')} onComplete={() => {}} />;
  }

  if (viewState === 'auth_school' && !user) {
    return <Auth mode="school" errorOverride={error} onBack={() => setViewState('landing')} onComplete={() => {}} />;
  }

  if (viewState === 'auth_register_school' && !user) {
    return <Auth mode="school" isRegisteringInstitution onBack={() => setViewState('landing')} onComplete={() => {}} />;
  }

  if (user && hasApiKey) {
    const isSchool = assignedRole === 'student' || assignedRole === 'teacher';
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
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
               <span className="text-[9px] font-black uppercase tracking-widest text-green-600">Shield Active</span>
            </div>
            <span className="hidden sm:block text-[10px] font-black uppercase tracking-[0.3em] bg-prismatic/10 text-slate-600 px-6 py-3 rounded-2xl border border-prismatic/20">
              {assignedRole?.toUpperCase()}
            </span>
            <button onClick={() => { auth.signOut(); setViewState('landing'); }} className="text-[10px] uppercase font-black tracking-[0.4em] text-slate-400 hover:text-slate-900 transition-all bg-black/[0.03] px-6 py-3 rounded-2xl border border-black/[0.05]">
              Log Out
            </button>
          </div>
        </header>
        <main className="flex-1 w-full relative flex flex-col overflow-hidden bg-slate-50/20">
          {assignedRole === 'school_admin' ? (
             <SchoolDashboard onBack={() => { auth.signOut(); setViewState('landing'); }} />
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

  if (user && !hasApiKey) {
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
