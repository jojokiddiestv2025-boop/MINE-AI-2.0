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
  const [selectedRole, setSelectedRole] = useState<'student' | 'teacher'>('student');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [securityStatus, setSecurityStatus] = useState('MONITORING...');

  useEffect(() => {
    if (errorOverride) setError(errorOverride);
    
    // Security Status Loop
    const statuses = ['ENCRYPTING HANDSHAKE...', 'FIREWALL: SECURE', 'IDENTITY SHIELD: ON', 'SCANNING FOR THREATS...'];
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
      } else if (isRegisteringInstitution) {
        // Institutional Admin Genesis
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
        // School Registry Lookup
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

        // ENFORCED INSTITUTIONAL SECURITY
        if (mode === 'school') {
          if (!schoolData && !provisionedMember) {
            throw new Error("ACCESS BLOCKED: This email is not registered in the MINE School Registry.");
          }
          
          // Verify role if it's a student/teacher login
          if (provisionedMember && provisionedMember.role !== selectedRole) {
            throw new Error(`TIER MISMATCH: You are registered as a ${provisionedMember.role.toUpperCase()}. Select the correct tier.`);
          }
        }

        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(auth, email, password);
        } catch (signInErr: any) {
          // Automatic Firebase Sync for provisioned users
          if (provisionedMember && provisionedMember.password === password) {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
          } else {
            throw new Error("HANDSHAKE FAILED: Invalid credentials provided.");
          }
        }
        
        // Finalize Link
        if (mode === 'school') {
          const role = schoolData?.adminEmail === email ? 'school_admin' : provisionedMember!.role;
          localStorage.setItem(`mine_role_${userCredential.user.uid}`, role);
        } else {
          localStorage.setItem(`mine_role_${userCredential.user.uid}`, 'personal');
        }
        
        onComplete();
      } else {
        // Standard Personal Setup
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

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 animate-billion relative bg-slate-50 overflow-hidden">
      {/* Anti-Hacker Neural Grid */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#00f2ff 1px, transparent 1px), linear-gradient(90deg, #00f2ff 1px, transparent 1px)', backgroundSize: '80px 80px' }}></div>
      
      <button onClick={onBack} className="absolute top-12 left-12 group flex items-center space-x-4 text-[10px] font-black uppercase tracking-[0.6em] text-slate-400 hover:text-slate-900 transition-all z-50">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeWidth={2}/></svg>
        <span>Secure Core</span>
      </button>

      <div className="w-full max-w-2xl glass-premium p-12 md:p-24 rounded-[4.5rem] shadow-2xl relative border-white/90 overflow-hidden">
        {/* Anti-Virus Visual Indicators */}
        <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60 animate-pulse"></div>
        <div className="absolute top-10 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-2 bg-slate-900/5 rounded-full border border-black/5 backdrop-blur-sm">
           <div className="w-2 h-2 rounded-full bg-green-500 animate-ping"></div>
           <span className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-500">{securityStatus}</span>
        </div>

        <div className="flex flex-col items-center mb-16 text-center relative z-10">
          <Logo size="md" showText={false} />
          <h2 className="text-4xl md:text-5xl font-outfit font-black tracking-tighter text-slate-900 uppercase mt-12">
            {isRegisteringInstitution ? 'School Setup' : (mode === 'school' ? 'Nexus Portal' : 'Identity Hub')}
          </h2>
          <p className="text-slate-400 mt-4 uppercase tracking-[0.6em] text-[10px] font-black opacity-60">
            {mode === 'school' ? 'Academic Command Gateway' : 'Neural Link v12.0'}
          </p>
        </div>

        {/* School Mode Role Selection */}
        {mode === 'school' && !isRegisteringInstitution && !isResetPassword && (
          <div className="mb-12 flex flex-col items-center gap-6 animate-billion">
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">Identify your Neural Tier</p>
            <div className="flex gap-4 p-2 bg-slate-100 rounded-[2rem] w-full border border-black/[0.03]">
              <button 
                type="button" 
                onClick={() => setSelectedRole('student')}
                className={`flex-1 py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${selectedRole === 'student' ? 'bg-white shadow-xl text-prismatic scale-[1.05]' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Student
              </button>
              <button 
                type="button" 
                onClick={() => setSelectedRole('teacher')}
                className={`flex-1 py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${selectedRole === 'teacher' ? 'bg-white shadow-xl text-prismatic scale-[1.05]' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Teacher
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          {isRegisteringInstitution && (
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-8">Institution Name</label>
              <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="w-full bg-white/60 border border-black/[0.05] rounded-[2rem] px-8 py-6 text-slate-900 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all shadow-inner font-bold" placeholder="Nexus Global" required />
            </div>
          )}
          <div className="space-y-3">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-8">Institutional Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/60 border border-black/[0.05] rounded-[2rem] px-8 py-6 text-slate-900 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all shadow-inner font-bold" placeholder="identity@institution.edu" required />
          </div>
          {!isResetPassword && (
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-8">Neural Key (Password)</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white/60 border border-black/[0.05] rounded-[2rem] px-8 py-6 text-slate-900 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all shadow-inner font-bold" placeholder="••••••••" required />
            </div>
          )}
          
          {error && <div className="p-6 bg-red-50 text-red-600 text-[10px] font-black rounded-[2rem] border border-red-100 text-center uppercase tracking-widest animate-billion border-l-4 border-l-red-500 shadow-md">{error}</div>}
          {success && <div className="p-6 bg-cyan-50 text-cyan-700 text-[10px] font-black rounded-[2rem] border border-cyan-100 text-center uppercase tracking-widest animate-billion">{success}</div>}
          
          <button type="submit" disabled={isLoading} className="button-billion w-full !py-7 text-sm shadow-2xl active:scale-95">
            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (isLogin ? 'ESTABLISH LINK' : 'INITIALIZE')}
          </button>
        </form>

        <div className="mt-16 text-center relative z-10 flex flex-col gap-6">
          {!isRegisteringInstitution && !isResetPassword && (
            <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-slate-400 hover:text-cyan-600 text-[10px] font-black transition-colors uppercase tracking-[0.5em]">
              {isLogin ? "NEW IDENTITY?" : "RETURN TO HANDSHAKE"}
            </button>
          )}
          {isLogin && !isRegisteringInstitution && (
             <button onClick={() => setIsResetPassword(!isResetPassword)} className="text-slate-300 hover:text-slate-500 text-[8px] font-black transition-colors uppercase tracking-[0.6em]">
               {isResetPassword ? "BACK TO GATEWAY" : "RECOVER ACCESS KEY"}
             </button>
          )}
        </div>
      </div>
      
      {/* Visual Security Footer */}
      <div className="mt-20 flex flex-wrap justify-center items-center gap-12 opacity-30">
         <SecurityBadge icon="M" label="Shield: Active" />
         <SecurityBadge icon="V" label="Anti-Virus: Optimal" />
         <SecurityBadge icon="E" label="Handshake: Encrypted" />
      </div>
    </div>
  );
};

const SecurityBadge: React.FC<{icon: string, label: string}> = ({ icon, label }) => (
  <div className="flex items-center gap-4">
    <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">{icon}</div>
    <span className="text-[9px] font-black uppercase tracking-[0.4em]">{label}</span>
  </div>
);

export default Auth;
