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
        setSuccess('Neural key reset link sent to your email.');
      } else if (isRegisteringInstitution) {
        // Handle School Admin Registration
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newSchool: SchoolProfile = {
          id: `school_${Date.now()}`,
          name: schoolName,
          adminEmail: email,
          members: []
        };
        // Persist school data linked to admin
        localStorage.setItem(`mine_school_data_${email}`, JSON.stringify(newSchool));
        localStorage.setItem(`mine_role_${userCredential.user.uid}`, 'school_admin');
        onComplete();
      } else if (isLogin) {
        // Standard Login OR First-time Provisioned School Login
        let userCredential;
        
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

        try {
          // Attempt standard sign in
          userCredential = await signInWithEmailAndPassword(auth, email, password);
        } catch (signInErr: any) {
          // If sign in fails but user is a provisioned member, try to auto-register them in Firebase
          if (provisionedMember && provisionedMember.password === password) {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
          } else {
            throw signInErr;
          }
        }
        
        // If logging into school mode, verify membership and assign role
        if (mode === 'school') {
          let foundRole = '';
          if (schoolData?.adminEmail === email) {
            foundRole = 'school_admin';
          } else if (provisionedMember) {
            foundRole = provisionedMember.role;
          } else {
             throw new Error("This identity is not registered in any School Nexus.");
          }
          localStorage.setItem(`mine_role_${userCredential.user.uid}`, foundRole);
        } else {
          localStorage.setItem(`mine_role_${userCredential.user.uid}`, 'personal');
        }
        
        onComplete();
      } else {
        // Standard Personal Registration
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        localStorage.setItem(`mine_role_${userCredential.user.uid}`, 'personal');
        onComplete();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during synchronization.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 md:p-12 animate-billion relative">
      <button onClick={onBack} className="absolute top-12 left-12 group flex items-center space-x-4 text-[11px] font-black uppercase tracking-[0.6em] text-slate-400 hover:text-slate-900 transition-all">
        <svg className="w-5 h-5 transition-transform group-hover:-translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeWidth={2}/></svg>
        <span>Back to Core</span>
      </button>

      <div className="w-full max-w-2xl glass-premium p-12 md:p-24 rounded-[5rem] shadow-2xl relative overflow-hidden border-white/90">
        <div className={`absolute top-0 right-0 w-64 h-64 blur-[100px] pointer-events-none ${mode === 'school' ? 'bg-purple-400/20' : 'bg-cyan-400/20'}`}></div>
        
        <div className="flex flex-col items-center mb-16 relative z-10 text-center">
          <div className="scale-90 mb-8"><Logo size="md" showText={false} /></div>
          <h2 className="text-4xl md:text-5xl font-outfit font-black tracking-tighter text-slate-900 uppercase leading-none">
            {isRegisteringInstitution ? 'Register School' : (mode === 'school' ? 'School Nexus' : 'Personal Link')}
          </h2>
          <p className="text-slate-500 mt-6 uppercase tracking-[0.6em] text-[10px] font-black">
            {isRegisteringInstitution ? 'Initialize Institutional Control' : (mode === 'school' ? 'Academic Command Interface' : 'Personal Neural Interface')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
          {isRegisteringInstitution && (
            <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="w-full bg-white/50 border border-black/[0.05] rounded-[2rem] px-8 py-6 text-slate-900 text-xl focus:ring-2 focus:ring-purple-500/40 outline-none" placeholder="Institution Name" required />
          )}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/50 border border-black/[0.05] rounded-[2rem] px-8 py-6 text-slate-900 text-xl focus:ring-2 focus:ring-cyan-500/40 outline-none" placeholder="identity@neural.link" required />
          {!isResetPassword && <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white/50 border border-black/[0.05] rounded-[2rem] px-8 py-6 text-slate-900 text-xl focus:ring-2 focus:ring-cyan-500/40 outline-none" placeholder="Access Key" required />}
          
          {error && <div className="bg-red-50 text-red-600 text-sm py-5 px-8 rounded-[2rem] font-bold text-center border border-red-100 animate-pulse">{error}</div>}
          {success && <div className="bg-cyan-50 text-cyan-700 text-sm py-5 px-8 rounded-[2rem] font-bold text-center border border-cyan-100">{success}</div>}
          
          <button type="submit" disabled={isLoading} className="button-billion w-full text-lg py-7">
            {isLoading ? <div className="w-7 h-7 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : (isResetPassword ? 'Reset' : (isLogin ? 'Establish Link' : 'Initialize Nexus'))}
          </button>
        </form>

        <div className="mt-16 text-center relative z-10">
          {!isRegisteringInstitution && !isResetPassword && (
            <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-slate-400 hover:text-cyan-600 text-[11px] font-black transition-colors uppercase tracking-[0.4em]">
              {isLogin ? "New Identity? Initialise" : "Existing? Sign In"}
            </button>
          )}
          {isLogin && !isRegisteringInstitution && (
             <div className="mt-4">
                <button onClick={() => setIsResetPassword(!isResetPassword)} className="text-slate-300 hover:text-slate-500 text-[9px] font-black transition-colors uppercase tracking-[0.4em]">
                  {isResetPassword ? "Return to Login" : "Forgot Access Key?"}
                </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;