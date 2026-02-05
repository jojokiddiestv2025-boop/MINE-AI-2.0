
import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from "firebase/auth";
import { auth } from '../firebase';
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
  const [identity, setIdentity] = useState(''); // For Student/Teacher
  const [password, setPassword] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'student' | 'teacher'>('student');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [securityStatus, setSecurityStatus] = useState('MONITORING...');

  useEffect(() => {
    if (errorOverride) setError(errorOverride);
    
    const statuses = ['ENCRYPTING HANDSHAKE...', 'FIREWALL: SECURE', 'IDENTITY SHIELD: ON', 'SCANNING PACKETS...'];
    let idx = 0;
    const interval = setInterval(() => {
      setSecurityStatus(statuses[idx % statuses.length]);
      idx++;
    }, 2500);
    return () => clearInterval(interval);
  }, [errorOverride]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (isResetPassword) {
        await sendPasswordResetEmail(auth, email);
        setSuccess('Neural key reset link dispatched via secure channel.');
        return;
      }

      if (isRegisteringInstitution) {
        // Institutional Admin Genesis (Standard Email)
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

      if (isLogin) {
        // Registry Lookup Logic
        const allSchools: string[] = Object.keys(localStorage).filter(k => k.startsWith('mine_school_data_'));
        let provisionedMember: InstitutionMember | null = null;
        let schoolData: SchoolProfile | null = null;

        if (mode === 'school' && !isAdminLogin) {
          // Student/Teacher Identity Search
          for (const key of allSchools) {
            const school: SchoolProfile = JSON.parse(localStorage.getItem(key) || '{}');
            const member = school.members?.find(m => m.name.toLowerCase() === identity.toLowerCase());
            if (member) {
              provisionedMember = member;
              schoolData = school;
              break;
            }
          }
        } else {
          // Admin or Personal Email Search
          for (const key of allSchools) {
            const school: SchoolProfile = JSON.parse(localStorage.getItem(key) || '{}');
            if (school.adminEmail === email) {
              schoolData = school;
              break;
            }
          }
        }

        // ENFORCED INSTITUTIONAL SECURITY
        if (mode === 'school') {
          if (isAdminLogin) {
            if (!schoolData) throw new Error("ACCESS BLOCKED: This admin account is not in the Nexus Registry.");
          } else {
            if (!provisionedMember) throw new Error("IDENTITY NOT FOUND: This neural identity is not provisioned for this school.");
            if (provisionedMember.role !== selectedRole) throw new Error(`TIER MISMATCH: Identity registered as ${provisionedMember.role.toUpperCase()}.`);
          }
        }

        // Determine Final Email for Firebase Auth
        const authEmail = (mode === 'school' && !isAdminLogin) 
          ? `${identity.replace(/\s+/g, '_')}@${schoolData?.id || 'nexus'}.mine.edu` 
          : email;

        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(auth, authEmail, password);
        } catch (signInErr: any) {
          // Automatic Firebase Sync for Identity-based users
          if (provisionedMember && provisionedMember.password === password) {
            userCredential = await createUserWithEmailAndPassword(auth, authEmail, password);
          } else {
            throw new Error("HANDSHAKE FAILED: Invalid credentials or identity mismatch.");
          }
        }
        
        // Finalize Role Pinning
        if (mode === 'school') {
          const role = isAdminLogin ? 'school_admin' : provisionedMember!.role;
          localStorage.setItem(`mine_role_${userCredential.user.uid}`, role);
        } else {
          localStorage.setItem(`mine_role_${userCredential.user.uid}`, 'personal');
        }
        
        onComplete();
      } else {
        // Personal Signup (Standard Email)
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        localStorage.setItem(`mine_role_${userCredential.user.uid}`, 'personal');
        onComplete();
      }
    } catch (err: any) {
      setError(err.message || 'System Synchronization Error.');
    } finally {
      setIsLoading(false);
    }
  };

  const showIdentityField = mode === 'school' && !isAdminLogin && !isRegisteringInstitution;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 animate-billion relative bg-slate-50 overflow-hidden">
      {/* High-Security Visual Lattice */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#00f2ff 1px, transparent 1px), linear-gradient(90deg, #00f2ff 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
      
      <button onClick={onBack} className="absolute top-12 left-12 group flex items-center space-x-4 text-[10px] font-black uppercase tracking-[0.6em] text-slate-400 hover:text-slate-900 transition-all z-50">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeWidth={2}/></svg>
        <span>Secure Back</span>
      </button>

      <div className="w-full max-w-2xl glass-premium p-12 md:p-24 rounded-[4.5rem] shadow-2xl relative border-white/90 overflow-hidden">
        {/* Anti-Hacker Status Bar */}
        <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-transparent via-prismatic to-transparent opacity-60 animate-pulse"></div>
        <div className="absolute top-10 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-2 bg-slate-900/5 rounded-full border border-black/5 backdrop-blur-sm">
           <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping"></div>
           <span className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-500">{securityStatus}</span>
        </div>

        <div className="flex flex-col items-center mb-16 text-center relative z-10">
          <Logo size="md" showText={false} />
          <h2 className="text-4xl md:text-5xl font-outfit font-black tracking-tighter text-slate-900 uppercase mt-12">
            {isRegisteringInstitution ? 'School Genesis' : (mode === 'school' ? (isAdminLogin ? 'Admin Gateway' : 'Identity Portal') : 'Identity Hub')}
          </h2>
          <p className="text-slate-400 mt-4 uppercase tracking-[0.6em] text-[10px] font-black opacity-60">
            {mode === 'school' ? 'Nexus Command Protocol' : 'Neural Link v12.0'}
          </p>
        </div>

        {/* School Mode Auth Toggle */}
        {mode === 'school' && !isRegisteringInstitution && !isResetPassword && (
          <div className="mb-12 flex flex-col items-center gap-8 animate-billion">
            <div className="flex gap-4 p-2 bg-slate-100 rounded-[2rem] w-full border border-black/[0.03]">
              <button 
                type="button" 
                onClick={() => setIsAdminLogin(false)}
                className={`flex-1 py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${!isAdminLogin ? 'bg-white shadow-xl text-prismatic scale-[1.05]' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Academic Node
              </button>
              <button 
                type="button" 
                onClick={() => setIsAdminLogin(true)}
                className={`flex-1 py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${isAdminLogin ? 'bg-white shadow-xl text-prismatic scale-[1.05]' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Admin Gateway
              </button>
            </div>

            {!isAdminLogin && (
              <div className="flex gap-4 p-1.5 bg-slate-50 rounded-[1.5rem] border border-black/[0.02] w-2/3">
                <button 
                  type="button" 
                  onClick={() => setSelectedRole('student')}
                  className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${selectedRole === 'student' ? 'bg-white shadow text-cyan-600' : 'text-slate-300 hover:text-slate-400'}`}
                >
                  Student
                </button>
                <button 
                  type="button" 
                  onClick={() => setSelectedRole('teacher')}
                  className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${selectedRole === 'teacher' ? 'bg-white shadow text-purple-600' : 'text-slate-300 hover:text-slate-400'}`}
                >
                  Teacher
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          {isRegisteringInstitution && (
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-8">School Designation</label>
              <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="w-full bg-white/60 border border-black/[0.05] rounded-[2rem] px-8 py-6 text-slate-900 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all shadow-inner font-bold" placeholder="E.g. Nexus Academy" required />
            </div>
          )}
          
          {showIdentityField ? (
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-8">Neural Identity (Provisioned Name)</label>
              <input type="text" value={identity} onChange={(e) => setIdentity(e.target.value)} className="w-full bg-white/60 border border-black/[0.05] rounded-[2rem] px-8 py-6 text-slate-900 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all shadow-inner font-bold" placeholder="E.g. Joshua Apex" required />
            </div>
          ) : (
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-8">Authorized Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/60 border border-black/[0.05] rounded-[2rem] px-8 py-6 text-slate-900 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all shadow-inner font-bold" placeholder="identity@nexus.edu" required />
            </div>
          )}

          {!isResetPassword && (
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-8">Access Key (Password)</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white/60 border border-black/[0.05] rounded-[2rem] px-8 py-6 text-slate-900 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all shadow-inner font-bold" placeholder="••••••••" required />
            </div>
          )}
          
          {error && <div className="p-6 bg-red-50 text-red-600 text-[10px] font-black rounded-[2rem] border border-red-100 text-center uppercase tracking-widest animate-billion border-l-4 border-l-red-500 shadow-md">{error}</div>}
          {success && <div className="p-6 bg-cyan-50 text-cyan-700 text-[10px] font-black rounded-[2rem] border border-cyan-100 text-center uppercase tracking-widest animate-billion">{success}</div>}
          
          <button type="submit" disabled={isLoading} className="button-billion w-full !py-7 text-sm shadow-2xl active:scale-95">
            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (isLogin ? 'ESTABLISH HANDSHAKE' : 'INITIALIZE NODE')}
          </button>
        </form>

        <div className="mt-16 text-center relative z-10 flex flex-col gap-6">
          {!isRegisteringInstitution && !isResetPassword && !isAdminLogin && (
            <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-slate-400 hover:text-cyan-600 text-[10px] font-black transition-colors uppercase tracking-[0.5em]">
              {isLogin ? "PROVISION NEW PERSONAL NODE?" : "RETURN TO HANDSHAKE"}
            </button>
          )}
          {isLogin && !isRegisteringInstitution && isAdminLogin && (
             <button onClick={() => setIsResetPassword(!isResetPassword)} className="text-slate-300 hover:text-slate-500 text-[8px] font-black transition-colors uppercase tracking-[0.6em]">
               {isResetPassword ? "BACK TO COMMAND" : "RECOVER ADMIN ACCESS"}
             </button>
          )}
        </div>
      </div>
      
      {/* Security Status Badges */}
      <div className="mt-20 flex flex-wrap justify-center items-center gap-12 opacity-30">
         <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">A</div>
            <span className="text-[9px] font-black uppercase tracking-[0.4em]">Anti-Virus Enabled</span>
         </div>
         <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">H</div>
            <span className="text-[9px] font-black uppercase tracking-[0.4em]">Hacker-Resistant Link</span>
         </div>
         <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">E</div>
            <span className="text-[9px] font-black uppercase tracking-[0.4em]">Encrypted Session</span>
         </div>
      </div>
    </div>
  );
};

export default Auth;
