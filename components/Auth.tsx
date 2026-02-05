
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
  const [securityStatus, setSecurityStatus] = useState('SCANNING...');

  useEffect(() => {
    if (errorOverride) setError(errorOverride);
    
    // Aesthetic Security Simulation
    const statuses = ['ENCRYPTING...', 'FIREWALL: ON', 'PROTECTING...', 'SHIELD: ACTIVE'];
    let idx = 0;
    const interval = setInterval(() => {
      setSecurityStatus(statuses[idx % statuses.length]);
      idx++;
    }, 2000);
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
        setSuccess('Neural key reset link dispatched via secure tunnel.');
      } else if (isRegisteringInstitution) {
        // Admin Registration Flow
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newSchool: SchoolProfile = {
          id: `school_${Date.now()}`,
          name: schoolName,
          adminEmail: email,
          members: []
        };
        // Persist local metadata for institutional mapping
        localStorage.setItem(`mine_school_data_${email}`, JSON.stringify(newSchool));
        localStorage.setItem(`mine_role_${userCredential.user.uid}`, 'school_admin');
        onComplete();
      } else if (isLogin) {
        // Find if this user is a provisioned member of a school in the Global Registry
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

        // ENFORCED SECURITY: School Portal only accepts provisioned accounts
        if (mode === 'school' && !schoolData && !provisionedMember) {
          throw new Error("ACCESS DENIED: Identity not provisioned by any registered school.");
        }

        let userCredential;
        try {
          // Attempt standard sign in via Firebase
          userCredential = await signInWithEmailAndPassword(auth, email, password);
        } catch (signInErr: any) {
          // AUTO-PROVISIONING: If user is recognized by the school but not in Firebase yet
          if (provisionedMember && provisionedMember.password === password) {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
          } else {
            throw new Error("INVALID CREDENTIALS: Neural handshake failed.");
          }
        }
        
        // Context Validation & Role Sync
        if (mode === 'school') {
          let foundRole = '';
          if (schoolData?.adminEmail === email) foundRole = 'school_admin';
          else if (provisionedMember) foundRole = provisionedMember.role;
          else throw new Error("SECURITY VIOLATION: Unauthorized access route.");
          
          localStorage.setItem(`mine_role_${userCredential.user.uid}`, foundRole);
        } else {
          // Personal accounts must use personal portal
          localStorage.setItem(`mine_role_${userCredential.user.uid}`, 'personal');
        }
        
        onComplete();
      } else {
        // Standard Personal Signup
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
      {/* Background Security Grid (Visual) */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#00f2ff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      
      <button onClick={onBack} className="absolute top-12 left-12 group flex items-center space-x-4 text-[10px] font-black uppercase tracking-[0.6em] text-slate-400 hover:text-slate-900 transition-all z-50">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeWidth={2}/></svg>
        <span>Secure Back</span>
      </button>

      <div className="w-full max-w-2xl glass-premium p-12 md:p-24 rounded-[4rem] shadow-2xl relative border-white/90 overflow-hidden">
        {/* Anti-Virus/Hacker Shield Visuals */}
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-transparent via-prismatic to-transparent opacity-60 animate-pulse"></div>
        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-1.5 bg-slate-900/5 rounded-full border border-black/5">
           <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping"></div>
           <span className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-500">{securityStatus}</span>
        </div>

        <div className="flex flex-col items-center mb-16 text-center relative z-10">
          <Logo size="md" showText={false} />
          <h2 className="text-4xl md:text-5xl font-outfit font-black tracking-tighter text-slate-900 uppercase mt-10">
            {isRegisteringInstitution ? 'School Genesis' : (mode === 'school' ? 'Nexus Gateway' : 'Identity Core')}
          </h2>
          <p className="text-slate-500 mt-4 uppercase tracking-[0.4em] text-[9px] font-black opacity-60">
            Secure Handshake Protocol 10.4.0
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          {isRegisteringInstitution && (
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-6">School Designation</label>
              <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="w-full bg-white/60 border border-black/[0.05] rounded-[2rem] px-8 py-5 text-slate-900 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all shadow-inner" placeholder="E.g. Nexus Global School" required />
            </div>
          )}
          <div className="space-y-3">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-6">Institutional Identifier</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/60 border border-black/[0.05] rounded-[2rem] px-8 py-5 text-slate-900 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all shadow-inner" placeholder="name@institution.edu" required />
          </div>
          {!isResetPassword && (
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-6">Encrypted Access Key</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white/60 border border-black/[0.05] rounded-[2rem] px-8 py-5 text-slate-900 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all shadow-inner" placeholder="••••••••" required />
            </div>
          )}
          
          {error && <div className="p-6 bg-red-50 text-red-600 text-[10px] font-black rounded-[2rem] border border-red-100 text-center uppercase tracking-widest animate-billion">{error}</div>}
          {success && <div className="p-6 bg-cyan-50 text-cyan-700 text-[10px] font-black rounded-[2rem] border border-cyan-100 text-center uppercase tracking-widest animate-billion">{success}</div>}
          
          <button type="submit" disabled={isLoading} className="button-billion w-full !py-6 text-sm flex items-center justify-center gap-4">
            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (mode === 'school' ? 'ENTER NEXUS' : 'SYNCHRONIZE')}
          </button>
        </form>

        <div className="mt-16 text-center relative z-10 flex flex-col gap-6">
          {!isRegisteringInstitution && !isResetPassword && (
            <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-slate-400 hover:text-cyan-600 text-[10px] font-black transition-colors uppercase tracking-[0.4em]">
              {isLogin ? "Provision New Node?" : "Link Established Identity?"}
            </button>
          )}
          {isLogin && !isRegisteringInstitution && (
             <button onClick={() => setIsResetPassword(!isResetPassword)} className="text-slate-300 hover:text-slate-500 text-[8px] font-black transition-colors uppercase tracking-[0.5em]">
               {isResetPassword ? "Return to Gateway" : "Reset Access Key"}
             </button>
          )}
        </div>
      </div>
      
      {/* Footer Security Badge */}
      <div className="mt-16 flex items-center gap-8 opacity-40">
         <div className="flex items-center gap-3">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.9L10 .155 17.834 4.9a2 2 0 011.166 1.8v3.585c0 5.145-3.324 9.61-8.334 11.165l-.666.206-.666-.206C4.324 20.085 1 15.62 1 10.47V6.7a2 2 0 011.166-1.8zM10 14a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/></svg>
            <span className="text-[9px] font-black uppercase tracking-[0.4em]">Anti-Hacker Shield v10.4.0</span>
         </div>
         <div className="w-[1px] h-4 bg-slate-300"></div>
         <div className="flex items-center gap-3">
            <svg className="w-4 h-4 text-cyan-500" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 11-2 0 1 1 0 012 0zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13.536 14.95a1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414zM16.586 18.707a1 1 0 101.414-1.414l-.707-.707a1 1 0 10-1.414 1.414l.707.707z" /></svg>
            <span className="text-[9px] font-black uppercase tracking-[0.4em]">Neural Encryption active</span>
         </div>
      </div>
    </div>
  );
};

export default Auth;
