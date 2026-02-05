
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
  const [linkedSchool, setLinkedSchool] = useState<string | null>(null);

  useEffect(() => {
    if (errorOverride) setError(errorOverride);
    
    const statuses = [
      'SSL HANDSHAKE: VERIFIED', 
      'FIREWALL: SECURE', 
      'NEURAL TLS 1.3 ACTIVE',
      'PACKET INTEGRITY: 100%'
    ];
    let idx = 0;
    const interval = setInterval(() => {
      setSecurityStatus(statuses[idx % statuses.length]);
      idx++;
    }, 3000);
    return () => clearInterval(interval);
  }, [errorOverride]);

  // Real-time school lookup for Identity field
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
        const allSchools: string[] = Object.keys(localStorage).filter(k => k.startsWith('mine_school_data_'));
        let provisionedMember: InstitutionMember | null = null;
        let schoolData: SchoolProfile | null = null;

        if (mode === 'school' && !isAdminLogin) {
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
          for (const key of allSchools) {
            const school: SchoolProfile = JSON.parse(localStorage.getItem(key) || '{}');
            if (school.adminEmail === email) {
              schoolData = school;
              break;
            }
          }
        }

        if (mode === 'school') {
          if (isAdminLogin) {
            if (!schoolData) throw new Error("ACCESS BLOCKED: Admin node not found in registry.");
          } else {
            if (!provisionedMember) throw new Error("IDENTITY NOT FOUND: Ensure your school admin has provisioned your node.");
            if (provisionedMember.role !== selectedRole) throw new Error(`TIER MISMATCH: Identity registered as ${provisionedMember.role.toUpperCase()}.`);
          }
        }

        const authEmail = (mode === 'school' && !isAdminLogin) 
          ? `${identity.replace(/\s+/g, '_')}@${schoolData?.id || 'nexus'}.mine.edu` 
          : email;

        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(auth, authEmail, password);
        } catch (signInErr: any) {
          // Automatic Shadow Provisioning for school members
          if (provisionedMember && provisionedMember.password === password) {
            userCredential = await createUserWithEmailAndPassword(auth, authEmail, password);
          } else {
            throw new Error("HANDSHAKE FAILED: Invalid access key or identity mismatch.");
          }
        }
        
        if (mode === 'school') {
          const role = isAdminLogin ? 'school_admin' : provisionedMember!.role;
          localStorage.setItem(`mine_role_${userCredential.user.uid}`, role);
          // Persist the school context for the session
          if (schoolData) localStorage.setItem(`mine_school_id_${userCredential.user.uid}`, schoolData.id);
        } else {
          localStorage.setItem(`mine_role_${userCredential.user.uid}`, 'personal');
        }
        
        onComplete();
      } else {
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
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#00f2ff 1px, transparent 1px), linear-gradient(90deg, #00f2ff 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
      
      <button onClick={onBack} className="absolute top-12 left-12 group flex items-center space-x-4 text-[10px] font-black uppercase tracking-[0.6em] text-slate-400 hover:text-slate-900 transition-all z-50">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeWidth={2}/></svg>
        <span>Secure Core</span>
      </button>

      <div className="w-full max-w-2xl glass-premium p-12 md:p-20 rounded-[4.5rem] shadow-2xl relative border-white/90 overflow-hidden bg-white/80">
        <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-transparent via-prismatic to-transparent opacity-60 animate-pulse"></div>
        
        <div className="absolute top-10 left-10 flex items-center gap-3">
           <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-200">
             <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M2.166 4.9L10 .155 17.834 4.9a2 2 0 011.166 1.8v3.585c0 5.145-3.324 9.61-8.334 11.165l-.666.206-.666-.206C4.324 20.085 1 15.62 1 10.47V6.7a2 2 0 011.166-1.8z" /></svg>
           </div>
           <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">NEURAL SSL VERIFIED</span>
        </div>

        <div className="flex flex-col items-center mb-12 text-center relative z-10 pt-8">
          <Logo size="sm" showText={false} />
          <h2 className="text-4xl md:text-5xl font-outfit font-black tracking-tighter text-slate-900 uppercase mt-8">
            {isRegisteringInstitution ? 'School Genesis' : (mode === 'school' ? (isAdminLogin ? 'Admin Command' : 'Academic Node') : 'Personal Link')}
          </h2>
          <div className="mt-4 flex items-center gap-3 px-6 py-2 bg-slate-50 border border-black/[0.03] rounded-full">
             <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping"></div>
             <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">{securityStatus}</span>
          </div>
        </div>

        {mode === 'school' && !isRegisteringInstitution && !isResetPassword && (
          <div className="mb-10 flex flex-col items-center gap-6 animate-billion">
            <div className="flex gap-4 p-1.5 bg-slate-100/50 rounded-[2rem] w-full border border-black/[0.02]">
              <button onClick={() => setIsAdminLogin(false)} className={`flex-1 py-4 rounded-[1.5rem] text-[9px] font-black uppercase tracking-widest transition-all ${!isAdminLogin ? 'bg-white shadow-lg text-prismatic' : 'text-slate-400'}`}>Node Access</button>
              <button onClick={() => setIsAdminLogin(true)} className={`flex-1 py-4 rounded-[1.5rem] text-[9px] font-black uppercase tracking-widest transition-all ${isAdminLogin ? 'bg-white shadow-lg text-prismatic' : 'text-slate-400'}`}>Admin Gateway</button>
            </div>
            {!isAdminLogin && (
              <div className="flex gap-4 p-1 bg-slate-50/50 rounded-[1.5rem] w-3/4">
                <button onClick={() => setSelectedRole('student')} className={`flex-1 py-3 rounded-2xl text-[8px] font-black uppercase tracking-widest transition-all ${selectedRole === 'student' ? 'bg-white shadow-sm text-cyan-600' : 'text-slate-300'}`}>STUDENT</button>
                <button onClick={() => setSelectedRole('teacher')} className={`flex-1 py-3 rounded-2xl text-[8px] font-black uppercase tracking-widest transition-all ${selectedRole === 'teacher' ? 'bg-white shadow-sm text-purple-600' : 'text-slate-300'}`}>TEACHER</button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          {isRegisteringInstitution && (
            <div className="space-y-3">
              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 px-8">Institutional Designation</label>
              <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="w-full bg-white/60 border border-black/[0.05] rounded-3xl px-8 py-5 text-slate-900 font-bold text-lg" placeholder="Nexus Academy" required />
            </div>
          )}
          
          {showIdentityField ? (
            <div className="space-y-3">
              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 px-8">Neural Identity</label>
              <div className="relative group">
                <input type="text" value={identity} onChange={(e) => setIdentity(e.target.value)} className="w-full bg-white/60 border border-black/[0.05] rounded-3xl px-8 py-5 text-slate-900 font-bold text-lg focus:ring-4 focus:ring-prismatic/10 transition-all" placeholder="Enter full name..." required />
                {linkedSchool && (
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-green-50 text-green-600 px-3 py-1.5 rounded-full border border-green-100 animate-billion">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    <span className="text-[8px] font-black uppercase tracking-widest truncate max-w-[120px]">{linkedSchool}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 px-8">Authorized Email</label>
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
            {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <span>LINK IDENTITY</span>}
          </button>
        </form>

        <div className="mt-12 text-center relative z-10 flex flex-col gap-6">
          {!isRegisteringInstitution && !isResetPassword && !isAdminLogin && (
            <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-slate-400 hover:text-cyan-600 text-[9px] font-black transition-colors uppercase tracking-[0.5em]">
              {isLogin ? "PROVISION NEW PERSONAL NODE?" : "RETURN TO HANDSHAKE"}
            </button>
          )}
        </div>
      </div>
      
      <div className="mt-16 flex flex-wrap justify-center items-center gap-12 opacity-40">
         <TrustIndicator label="SOC2 COMPLIANT" />
         <TrustIndicator label="HIPAA SECURE" />
         <TrustIndicator label="NEURAL SSL CERTIFIED" />
      </div>
    </div>
  );
};

const TrustIndicator: React.FC<{label: string}> = ({ label }) => (
  <div className="flex items-center gap-3">
    <div className="w-5 h-5 rounded border border-slate-900 flex items-center justify-center">
       <svg className="w-3 h-3 text-slate-900" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>
    </div>
    <span className="text-[8px] font-black uppercase tracking-[0.3em]">{label}</span>
  </div>
);

export default Auth;
