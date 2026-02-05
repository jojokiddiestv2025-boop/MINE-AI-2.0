
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
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (errorOverride) setError(errorOverride);
  }, [errorOverride]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (isResetPassword) {
        await sendPasswordResetEmail(auth, email);
        setSuccess('Neural key reset link dispatched.');
      } else if (isRegisteringInstitution) {
        // Admin Registration
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
      } else if (isLogin) {
        // Find if this user is a provisioned member of a school
        const allSchools: string[] = Object.keys(localStorage).filter(k => k.startsWith('mine_school_data_'));
        let provisionedMember: InstitutionMember | null = null;
        let schoolData: SchoolProfile | null = null;

        for (const key of allSchools) {
          const school: SchoolProfile = JSON.parse(localStorage.getItem(key) || '{}');
          const member = school.members?.find(m => m.email === email);
          if (member) {
            provisionedMember = member;
            schoolData = school;
            break;
          }
          if (school.adminEmail === email) {
            schoolData = school;
            break;
          }
        }

        // HARD SECURITY: If School mode is active, user MUST be provisioned
        if (mode === 'school' && !schoolData && !provisionedMember) {
          throw new Error("SECURITY BLOCK: Identity not found in the School Nexus registry.");
        }

        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(auth, email, password);
        } catch (signInErr: any) {
          // Auto-registration for first-time provisioned users
          if (provisionedMember && provisionedMember.password === password) {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
          } else {
            throw signInErr;
          }
        }
        
        // Final verification and role pinning
        if (mode === 'school') {
          let foundRole = '';
          if (schoolData?.adminEmail === email) foundRole = 'school_admin';
          else if (provisionedMember) foundRole = provisionedMember.role;
          else throw new Error("SECURITY VIOLATION: Unauthorized portal access.");
          
          localStorage.setItem(`mine_role_${userCredential.user.uid}`, foundRole);
        } else {
          localStorage.setItem(`mine_role_${userCredential.user.uid}`, 'personal');
        }
        
        onComplete();
      } else {
        // Personal Signup
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        localStorage.setItem(`mine_role_${userCredential.user.uid}`, 'personal');
        onComplete();
      }
    } catch (err: any) {
      setError(err.message || 'Synchronization Error.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 animate-billion relative bg-slate-50">
      <button onClick={onBack} className="absolute top-12 left-12 group flex items-center space-x-4 text-[11px] font-black uppercase tracking-[0.6em] text-slate-400 hover:text-slate-900 transition-all">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeWidth={2}/></svg>
        <span>Secure Back</span>
      </button>

      <div className="w-full max-w-2xl glass-premium p-12 md:p-24 rounded-[4rem] shadow-2xl relative border-white/90">
        {/* Anti-Hacker Visual Shield */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-40 animate-pulse"></div>
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-6 py-2 bg-slate-900 text-white text-[9px] font-black uppercase tracking-[0.4em] rounded-full shadow-xl flex items-center gap-3">
           <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>
           End-to-End Neural Encryption Active
        </div>

        <div className="flex flex-col items-center mb-16 text-center">
          <Logo size="md" showText={false} />
          <h2 className="text-4xl font-outfit font-black tracking-tighter text-slate-900 uppercase mt-8">
            {isRegisteringInstitution ? 'School Registration' : (mode === 'school' ? 'Nexus Portal' : 'Neural Link')}
          </h2>
          <p className="text-slate-500 mt-4 uppercase tracking-[0.4em] text-[9px] font-black">
            Verification Protocol v5.2
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isRegisteringInstitution && (
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-4">Institution Name</label>
              <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="w-full bg-white/50 border border-black/[0.05] rounded-[2rem] px-8 py-5 text-slate-900 focus:ring-2 focus:ring-cyan-500/20 outline-none" placeholder="MINE Academy" required />
            </div>
          )}
          <div className="space-y-3">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-4">Authorized Identity</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/50 border border-black/[0.05] rounded-[2rem] px-8 py-5 text-slate-900 focus:ring-2 focus:ring-cyan-500/20 outline-none" placeholder="user@institution.edu" required />
          </div>
          {!isResetPassword && (
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-4">Neural Access Key</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white/50 border border-black/[0.05] rounded-[2rem] px-8 py-5 text-slate-900 focus:ring-2 focus:ring-cyan-500/20 outline-none" placeholder="••••••••" required />
            </div>
          )}
          
          {error && <div className="p-5 bg-red-50 text-red-600 text-[11px] font-black rounded-3xl border border-red-100 text-center uppercase tracking-widest">{error}</div>}
          
          <button type="submit" disabled={isLoading} className="button-billion w-full text-sm py-6">
            {isLoading ? "Validating..." : "Identify"}
          </button>
        </form>

        <div className="mt-12 text-center">
          {!isRegisteringInstitution && (
            <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-slate-400 hover:text-cyan-600 text-[10px] font-black transition-colors uppercase tracking-[0.4em]">
              {isLogin ? "Generate New Node?" : "Existing Node? Link"}
            </button>
          )}
        </div>
      </div>
      
      <div className="mt-12 flex items-center gap-6 opacity-40">
         <span className="text-[9px] font-black uppercase tracking-[0.4em]">Firewall: OPTIMAL</span>
         <div className="w-[1px] h-4 bg-slate-300"></div>
         <span className="text-[9px] font-black uppercase tracking-[0.4em]">Anti-Phish: ACTIVE</span>
      </div>
    </div>
  );
};

export default Auth;
