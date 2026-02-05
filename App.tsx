import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from './firebase';
import LiveVoice from './components/LiveVoice';
import Auth from './components/Auth';
import Landing from './components/Landing';
import Logo from './components/Logo';
import SchoolDashboard from './components/SchoolDashboard';
import { UserRole } from './types';

type AppView = 'landing' | 'auth' | 'welcome_personal' | 'welcome_school' | 'app_personal' | 'app_student' | 'app_teacher' | 'school_admin' | 'auth_register_school';
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
    setViewState('auth');
  };

  const handleStartSchool = () => {
    setAuthMode('school');
    setViewState('auth');
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
          // New account, will be assigned during welcome selection if not already set by Auth registration
          setViewState(authMode === 'school' ? 'welcome_school' : 'welcome_personal');
        } else {
          // Existing account - enforce isolation
          const isContextMismatch = (authMode === 'personal' && storedRole !== 'personal') || 
                                   (authMode === 'school' && storedRole === 'personal');
          
          if (isContextMismatch) {
            setError(`This account is locked to MINE ${storedRole.toUpperCase()}. Please use a separate identity.`);
            auth.signOut();
            setViewState('auth');
            return;
          }
          setAssignedRole(storedRole);
          // Auto-route based on role
          if (storedRole === 'personal') setViewState('app_personal');
          else if (storedRole === 'student') setViewState('app_student');
          else if (storedRole === 'teacher') setViewState('app_teacher');
          else if (storedRole === 'school_admin') setViewState('school_admin');
        }
      }
    });
    return () => unsubscribe();
  }, [authMode]);

  const handleRoleSelection = (role: UserRole) => {
    if (user) {
      localStorage.setItem(`mine_role_${user.uid}`, role);
      setAssignedRole(role);
      if (role === 'personal') setViewState('app_personal');
      else if (role === 'student') setViewState('app_student');
      else if (role === 'teacher') setViewState('app_teacher');
      else if (role === 'school_admin') setViewState('school_admin');
    }
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

  if (isInitializing) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 animate-billion">
        <Logo size="md" showText={false} />
        <div className="mt-12 w-16 h-1 bg-prismatic rounded-full animate-pulse"></div>
      </div>
    );
  }

  // View: Landing
  if (viewState === 'landing') {
    return <Landing 
      onGetStarted={handleStartPersonal} 
      onAuthClick={handleStartPersonal} 
      onSchoolClick={handleRegisterInstitution} 
      isLoggedIn={!!user} 
    />;
  }

  // View: Auth (Standard)
  if (viewState === 'auth' && !user) {
    return <Auth mode={authMode} errorOverride={error} onBack={() => setViewState('landing')} onComplete={() => {}} />;
  }

  // View: Auth (Institution Registration)
  if (viewState === 'auth_register_school' && !user) {
    return <Auth mode="school" isRegisteringInstitution onBack={() => setViewState('landing')} onComplete={() => {}} />;
  }

  // View: Personal Welcome
  if (viewState === 'welcome_personal') {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-10 text-center animate-billion">
        <Logo size="lg" showText={false} />
        <h2 className="text-6xl md:text-8xl font-outfit font-black text-slate-900 mt-12 mb-6 uppercase tracking-tight">Identity <span className="text-prismatic">Verified</span></h2>
        <p className="text-slate-500 text-xl max-w-xl mb-16 uppercase tracking-[0.4em] font-bold">Initializing your personal neural nexus.</p>
        <button onClick={() => handleRoleSelection('personal')} className="button-billion">Establish Nexus Link</button>
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
        <p className="text-slate-500 text-xl max-w-2xl mb-16 uppercase tracking-[0.4em] font-bold">Select your institutional role to continue.</p>
        <div className="flex flex-col md:flex-row gap-8">
          <button onClick={() => handleRoleSelection('student')} className="button-billion !bg-white !text-slate-900 border-2 border-black/5 px-16 shadow-xl">I am a Student</button>
          <button onClick={() => handleRoleSelection('teacher')} className="button-billion px-16">I am a Teacher</button>
          <button onClick={() => handleRoleSelection('school_admin')} className="px-12 py-6 border-2 border-black/10 rounded-full font-black uppercase text-[11px] tracking-widest hover:bg-black hover:text-white transition-all bg-white/50">Admin Access</button>
        </div>
      </div>
    );
  }

  // Final AI App Views
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
            <span className="hidden sm:block text-[10px] font-black uppercase tracking-[0.3em] bg-prismatic/10 text-slate-600 px-4 py-2 rounded-full border border-prismatic/20">
              {assignedRole?.toUpperCase()}
            </span>
            <button onClick={() => { auth.signOut(); setViewState('landing'); }} className="text-[10px] uppercase font-black tracking-[0.4em] text-slate-400 hover:text-slate-900 transition-all bg-black/[0.03] px-6 py-3 rounded-2xl border border-black/[0.05]">
              Disconnect
            </button>
          </div>
        </header>
        <main className="flex-1 w-full relative flex flex-col overflow-hidden">
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
        <div className="glass-premium p-14 rounded-[4rem] max-w-xl w-full border-white/90 shadow-2xl">
          <Logo size="md" showText={false} />
          <h2 className="text-3xl font-outfit font-black mb-6 mt-8 uppercase text-slate-900">Uplink Required</h2>
          <p className="text-slate-600 mb-12 text-lg font-medium">Please provide a valid Gemini API key to activate the high-bandwidth neural link.</p>
          <button onClick={handleSelectKey} className="button-billion !py-5 !px-16">Select Node Key</button>
        </div>
      </div>
    );
  }

  return <Landing onGetStarted={handleStartPersonal} onAuthClick={handleStartPersonal} onSchoolClick={handleRegisterInstitution} isLoggedIn={false} />;
};

export default App;
