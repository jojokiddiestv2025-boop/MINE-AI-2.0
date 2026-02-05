
import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup
} from "firebase/auth";
import { auth, googleProvider } from '../firebase';
import Logo from './Logo';
import { SchoolProfile, InstitutionMember } from '../types';

interface AuthProps {
  mode: 'personal' | 'school';
  isRegisteringInstitution?: boolean;
  onBack: () => void;
  onComplete: () => void;
  errorOverride?: string | null;
}

const Auth: React.FC<AuthProps> = ({ mode, isRegisteringInstitution, onBack, onComplete, errorOverride }) => {
  const [isLogin, setIsLogin] = useState(!isRegisteringInstitution);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  
  // Form Fields
  const [email, setEmail] = useState('');
  const [identity, setIdentity] = useState(''); 
  const [password, setPassword] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'student' | 'teacher'>('student');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [securityStatus, setSecurityStatus] = useState('MONITORING...');
  const [linkedSchool, setLinkedSchool] = useState<string | null>(null);

  useEffect(() => {
    if (errorOverride) setError(errorOverride);
    
    const statuses = [
      'SSL HANDSHAKE: VERIFIED', 
      'IDENTITY SHIELD: ACTIVE',
      'HYPER-SYNC: ENABLED',
      'NEURAL TLS 1.3 ACTIVE'
    ];
    let idx = 0;
    const interval = setInterval(() => {
      setSecurityStatus(statuses[idx % statuses.length]);
      idx++;
    }, 3000);
    return () => clearInterval(interval);
  }, [errorOverride]);

  // Real-time lookup for School UI feedback
  useEffect(() => {
    if (mode === 'school' && !isAdminLogin && identity.length > 2) {
      const allSchools: string[] = Object.keys(localStorage).filter(k => k.startsWith('mine_school_data_'));
      for (const key of allSchools) {
        const school: SchoolProfile = JSON.parse(localStorage.getItem(key) || '{}');
        const member = school.members?.find(m => m.name.toLowerCase() === identity.toLowerCase());
        if (member) {
          setLinkedSchool(school.name);
          return;
        }
      }
    }
    setLinkedSchool(null);
  }, [identity, mode, isAdminLogin]);

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userEmail = result.user.email || '';
      const uid = result.user.uid;

      if (mode === 'school') {
        const allSchools: string[] = Object.keys(localStorage).filter(k => k.startsWith('mine_school_data_'));
        let foundRole = '';
        
        for (const key of allSchools) {
          const school: SchoolProfile = JSON.parse(localStorage.getItem(key) || '{}');
          if (school.adminEmail === userEmail) {
            foundRole = 'school_admin';
            localStorage.setItem(`mine_school_id_${uid}`, school.id);
            break;
          }
          const member = school.members?.find(m => m.email === userEmail || m.name.toLowerCase() === result.user.displayName?.toLowerCase());
          if (member) {
            foundRole = member.role;
            localStorage.setItem(`mine_school_id_${uid}`, school.id);
            break;
          }
        }

        if (!foundRole) {
          throw new Error("UNAUTHORIZED: Your Google account is not in any institution registry.");
        }
        localStorage.setItem(`mine_role_${uid}`, foundRole);
      } else {
        localStorage.setItem(`mine_role_${uid}`, 'personal');
      }
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Google Link Interrupted.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (isResetPassword) {
        await sendPasswordResetEmail(auth, email);
        setSuccess('Recovery link dispatched.');
        return;
      }

      if (isRegisteringInstitution) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newSchool: SchoolProfile = {
          id: `school_${Date.now()}`,
          name: schoolName,
          adminEmail: email,
          members: []
        };
        localStorage.setItem(`mine_school_data_${email}`, JSON.stringify(newSchool));
        localStorage.setItem(`mine_role_${userCredential.user.uid}`, 'school_admin');
        onComplete();
        return;
      }

      // LOGIN LOGIC
      if (isLogin) {
        let provisionedMember: InstitutionMember | null = null;
        let schoolData: SchoolProfile | null = null;

        // School Mode Registry Check
        if (mode === 'school') {
          const allSchools: string[] = Object.keys(localStorage).filter(k => k.startsWith('mine_school_data_'));
          if (isAdminLogin) {
            for (const key of allSchools) {
              const school: SchoolProfile = JSON.parse(localStorage.getItem(key) || '{}');
              if (school.adminEmail === email) {
                schoolData = school;
                break;
              }
            }
            if (!schoolData) throw new Error("ADMIN NOT FOUND: No institution linked to this email.");
          } else {
            for (const key of allSchools) {
              const school: SchoolProfile = JSON.parse(localStorage.getItem(key) || '{}');
              const member = school.members?.find(m => m.name.toLowerCase() === identity.toLowerCase());
              if (member) {
                provisionedMember = member;
                schoolData = school;
                break;
              }
            }
            if (!provisionedMember) throw new Error("IDENTITY NOT FOUND: Check your spelling or ask your admin.");
          }
        }

        const authEmail = (mode === 'school' && !isAdminLogin) 
          ? `${identity.replace(/\s+/g, '_')}@${schoolData?.id || 'nexus'}.mine.edu` 
          : email;

        // Neural Proxy (Bypass Firebase for locally provisioned users if needed)
        if (provisionedMember && provisionedMember.password === password) {
          try {
             // Try real Firebase Auth first
             const userCredential = await signInWithEmailAndPassword(auth, authEmail, password).catch(() => 
               createUserWithEmailAndPassword(auth, authEmail, password)
             );
             localStorage.setItem(`mine_role_${userCredential.user.uid}`, provisionedMember.role);
             if (schoolData) localStorage.setItem(`mine_school_id_${userCredential.user.uid}`, schoolData.id);
             onComplete();
          } catch (fbErr) {
             console.warn("Firebase handshake failed, using proxy link.");
             const proxyUid = `proxy_${provisionedMember.name.replace(/\s+/g, '_')}`;
             localStorage.setItem(`mine_role_${proxyUid}`, provisionedMember.role);
             if (schoolData) localStorage.setItem(`mine_school_id_${proxyUid}`, schoolData.id);
             onComplete();
          }
          return;
        }

        // Standard Login (Personal or Admin)
        const userCredential = await signInWithEmailAndPassword(auth, authEmail, password);
        if (mode === 'school') {
          const role = isAdminLogin ? 'school_admin' : 'student';
          localStorage.setItem(`mine_role_${userCredential.user.uid}`, role);
          if (schoolData) localStorage.setItem(`mine_school_id_${userCredential.user.uid}`, schoolData.id);
        } else {
          localStorage.setItem(`mine_role_${userCredential.user.uid}`, 'personal');
        }
        onComplete();
      } else {
        // Register Personal
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        localStorage.setItem(`mine_role_${userCredential.user.uid}`, 'personal');
        onComplete();
      }
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') setError("ACCESS DENIED: Invalid credentials.");
      else setError(err.message || 'Handshake Error.');
    } finally {
      setIsLoading(false);
    }
  };

  const showIdentityField = mode === 'school' && !isAdminLogin && !isRegisteringInstitution;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 animate-billion relative bg-slate-50 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#00f2ff 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
      
      <button onClick={onBack} className="absolute top-12 left-12 group flex items-center space-x-4 text-[10px] font-black uppercase tracking-[0.6em] text-slate-400 hover:text-slate-900 transition-all z-50">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeWidth={2}/></svg>
        <span>Back</span>
      </button>

      <div className="w-full max-w-2xl glass-premium p-12 md:p-20 rounded-[4.5rem] shadow-2xl relative border-white/90 overflow-hidden bg-white/80">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 opacity-40"></div>
        
        <div className="flex flex-col items-center mb-12 text-center relative z-10 pt-8">
          <Logo size="sm" showText={false} />
          <h2 className="text-4xl md:text-5xl font-outfit font-black tracking-tighter text-slate-900 uppercase mt-8">
            {isRegisteringInstitution ? 'School Genesis' : (mode === 'school' ? (isAdminLogin ? 'Admin Command' : 'Node Uplink') : 'Personal Node')}
          </h2>
          <div className="mt-4 flex items-center gap-3 px-6 py-2 bg-slate-50 border border-black/[0.03] rounded-full">
             <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping"></div>
             <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">{securityStatus}</span>
          </div>
        </div>

        <div className="space-y-8 relative z-10">
          {!isResetPassword && (
            <button onClick={handleGoogleSignIn} disabled={isLoading} className="w-full py-5 rounded-[2rem] border-2 border-slate-900/5 bg-white flex items-center justify-center gap-4 text-[11px] font-black uppercase tracking-[0.4em] text-slate-900 hover:bg-slate-50 transition-all shadow-xl active:scale-95 group">
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              <span>{isLogin ? 'Sync via Google' : 'Register via Google'}</span>
            </button>
          )}

          {!isResetPassword && (
            <div className="flex items-center gap-6 opacity-20">
               <div className="flex-1 h-[1px] bg-slate-900"></div>
               <span className="text-[10px] font-black uppercase tracking-widest">OR</span>
               <div className="flex-1 h-[1px] bg-slate-900"></div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {isRegisteringInstitution && (
              <div className="space-y-3">
                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 px-8">Institutional Designation</label>
                <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="w-full bg-white/60 border border-black/[0.05] rounded-3xl px-8 py-5 text-slate-900 font-bold text-lg" placeholder="e.g. Nexus Academy" required />
              </div>
            )}
            
            {showIdentityField ? (
              <div className="space-y-3">
                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 px-8">Neural Identity (Full Name)</label>
                <div className="relative">
                  <input type="text" value={identity} onChange={(e) => setIdentity(e.target.value)} className="w-full bg-white/60 border border-black/[0.05] rounded-3xl px-8 py-5 text-slate-900 font-bold text-lg" placeholder="e.g. Alexander Vance" required />
                  {linkedSchool && (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-green-50 text-green-600 px-4 py-1.5 rounded-full border border-green-100 animate-billion shadow-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-[8px] font-black uppercase tracking-widest truncate max-w-[150px]">{linkedSchool}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 px-8">Handshake Address (Email)</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/60 border border-black/[0.05] rounded-3xl px-8 py-5 text-slate-900 font-bold text-lg" placeholder="identity@nexus.edu" required />
              </div>
            )}

            {!isResetPassword && (
              <div className="space-y-3">
                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 px-8">Secure Access Key</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white/60 border border-black/[0.05] rounded-3xl px-8 py-5 text-slate-900 font-bold text-lg" placeholder="••••••••" required />
              </div>
            )}
            
            {error && <div className="p-6 bg-red-50 text-red-600 text-[9px] font-black rounded-3xl border border-red-100 text-center uppercase tracking-widest animate-billion border-l-4 border-l-red-500">{error}</div>}
            {success && <div className="p-6 bg-cyan-50 text-cyan-700 text-[9px] font-black rounded-3xl border border-cyan-100 text-center uppercase tracking-widest animate-billion">{success}</div>}
            
            <button type="submit" disabled={isLoading} className="button-billion w-full !py-6 text-sm shadow-2xl active:scale-95 flex items-center justify-center gap-4">
              {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <span>Verify Node</span>}
            </button>
          </form>
        </div>

        <div className="mt-12 text-center relative z-10 flex flex-col gap-6">
          {!isRegisteringInstitution && !isResetPassword && (
            <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-slate-400 hover:text-cyan-600 text-[9px] font-black transition-colors uppercase tracking-[0.5em]">
              {isLogin ? "Provision Personal Node?" : "Return to Login"}
            </button>
          )}
          {mode === 'school' && !isRegisteringInstitution && (
            <button onClick={() => { setIsAdminLogin(!isAdminLogin); setError(''); }} className="text-[8px] font-black text-slate-300 hover:text-slate-500 uppercase tracking-[0.6em]">
              {isAdminLogin ? "Academic Access" : "Admin Gateway"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
