
import React, { useState, useEffect } from 'react';
import Logo from './Logo';
import { SchoolProfile, InstitutionMember } from '../types';
import { auth } from '../firebase';

interface SchoolDashboardProps {
  onBack: () => void;
}

const SchoolDashboard: React.FC<SchoolDashboardProps> = ({ onBack }) => {
  const [school, setSchool] = useState<SchoolProfile | null>(null);
  const [newMember, setNewMember] = useState({ name: '', email: '', password: '', role: 'student' as 'student' | 'teacher' });
  const [searchQuery, setSearchQuery] = useState('');
  const [provisionStatus, setProvisionStatus] = useState<string | null>(null);

  useEffect(() => {
    const adminEmail = auth.currentUser?.email;
    if (adminEmail) {
      const data = localStorage.getItem(`mine_school_data_${adminEmail}`);
      if (data) setSchool(JSON.parse(data));
    }
  }, []);

  const saveSchool = (updatedSchool: SchoolProfile) => {
    setSchool(updatedSchool);
    localStorage.setItem(`mine_school_data_${updatedSchool.adminEmail}`, JSON.stringify(updatedSchool));
  };

  const addMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !newMember.name || !newMember.email || !newMember.password) return;
    
    // Check if member already exists
    if (school.members.some(m => m.email === newMember.email)) {
      setProvisionStatus("ERROR: IDENTITY ALREADY SYNCED");
      return;
    }

    const member: InstitutionMember = {
      ...newMember,
      dateAdded: new Date().toISOString()
    };

    const updatedSchool = { ...school, members: [...school.members, member] };
    saveSchool(updatedSchool);
    setNewMember({ name: '', email: '', password: '', role: 'student' });
    setProvisionStatus("IDENTITY SUCCESSFULLY LINKED");
    setTimeout(() => setProvisionStatus(null), 3000);
  };

  const deleteMember = (email: string) => {
    if (!school) return;
    if (!confirm("CRITICAL WARNING: This will terminate the entity's neural link to the institution. Proceed?")) return;
    
    const updatedMembers = school.members.filter(m => m.email !== email);
    saveSchool({ ...school, members: updatedMembers });
  };

  if (!school) return <div className="p-20 text-center font-black uppercase tracking-widest text-slate-400">Loading Nexus Registry...</div>;

  const filteredMembers = school.members.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen w-full p-6 md:p-20 flex flex-col gap-12 animate-billion overflow-y-auto bg-slate-50/50">
      <header className="flex flex-col lg:flex-row items-center justify-between gap-12">
        <div className="flex items-center gap-10">
          <button onClick={onBack} className="p-5 rounded-full bg-white border border-black/5 shadow-xl hover:scale-110 transition-all active:scale-90">
            <svg className="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth={2}/></svg>
          </button>
          <div>
            <h1 className="text-5xl xl:text-7xl font-outfit font-black uppercase tracking-tighter text-slate-900">
              {school.name} <span className="text-prismatic">CONSOLE</span>
            </h1>
            <p className="text-slate-400 uppercase text-[10px] tracking-[1em] mt-3 font-bold">Institutional Firewall Layer: Secure</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-center lg:justify-end gap-12 bg-white/40 p-10 rounded-[3rem] backdrop-blur-xl border border-black/[0.03]">
          <StatBox label="LINKED NODES" value={school.members.length.toString()} />
          <StatBox label="FACULTY" value={school.members.filter(m => m.role === 'teacher').length.toString()} />
          <StatBox label="SECURITY" value="OPTIMAL" color="text-green-500" />
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 items-start">
        {/* Provisioning Interface */}
        <div className="xl:col-span-4 glass-premium rounded-[4rem] p-12 border-white/90 shadow-2xl space-y-12 bg-white/80">
          <div className="space-y-3">
            <h3 className="text-2xl font-black uppercase tracking-widest text-slate-900">PROVISION NODE</h3>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest opacity-60">Authorize new entities for MINE School access</p>
          </div>
          
          <form onSubmit={addMember} className="space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 px-6">FULL NAME</label>
              <input 
                type="text" 
                value={newMember.name}
                onChange={e => setNewMember({...newMember, name: e.target.value})}
                className="w-full bg-white/50 border border-black/[0.05] rounded-3xl px-8 py-5 outline-none focus:ring-4 focus:ring-purple-500/10 text-slate-900 text-lg shadow-inner" 
                placeholder="Node Identity"
                required
              />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 px-6">INSTITUTION EMAIL</label>
              <input 
                type="email" 
                value={newMember.email}
                onChange={e => setNewMember({...newMember, email: e.target.value})}
                className="w-full bg-white/50 border border-black/[0.05] rounded-3xl px-8 py-5 outline-none focus:ring-4 focus:ring-purple-500/10 text-slate-900 text-lg shadow-inner" 
                placeholder="node@nexus.edu"
                required
              />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 px-6">INITIAL ACCESS KEY</label>
              <input 
                type="password" 
                value={newMember.password}
                onChange={e => setNewMember({...newMember, password: e.target.value})}
                className="w-full bg-white/50 border border-black/[0.05] rounded-3xl px-8 py-5 outline-none focus:ring-4 focus:ring-purple-500/10 text-slate-900 text-lg shadow-inner" 
                placeholder="Set Temporary Password"
                required
              />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 px-6">ACCESS ROLE</label>
              <div className="flex gap-4 p-2 bg-slate-100/50 rounded-3xl border border-black/[0.02]">
                <button 
                  type="button"
                  onClick={() => setNewMember({...newMember, role: 'student'})}
                  className={`flex-1 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${newMember.role === 'student' ? 'bg-white shadow-xl text-prismatic scale-[1.05]' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  STUDENT
                </button>
                <button 
                  type="button"
                  onClick={() => setNewMember({...newMember, role: 'teacher'})}
                  className={`flex-1 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${newMember.role === 'teacher' ? 'bg-white shadow-xl text-prismatic scale-[1.05]' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  TEACHER
                </button>
              </div>
            </div>
            
            {provisionStatus && (
              <div className={`p-6 rounded-3xl text-[10px] font-black uppercase tracking-widest text-center border ${provisionStatus.includes('ERROR') ? 'bg-red-50 text-red-600 border-red-100' : 'bg-cyan-50 text-cyan-600 border-cyan-100'}`}>
                {provisionStatus}
              </div>
            )}
            
            <button type="submit" className="button-billion w-full !py-6 shadow-2xl active:scale-95">AUTHORIZE NODE</button>
          </form>
        </div>

        {/* Node Management List */}
        <div className="xl:col-span-8 glass-premium rounded-[4rem] p-12 flex flex-col border-white/90 shadow-2xl relative overflow-hidden bg-white/80 h-full max-h-[1000px]">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-8">
            <div className="space-y-2">
              <h3 className="text-3xl font-black uppercase tracking-widest text-slate-900">NEXUS MATRIX</h3>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Displaying {school.members.length} Secure Nodes</p>
            </div>
            <div className="relative w-full md:w-96">
              <input 
                type="text"
                placeholder="SEARCH REGISTRY..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-black/[0.05] rounded-3xl px-14 py-5 text-[11px] font-black tracking-widest outline-none focus:ring-4 focus:ring-cyan-500/10 shadow-inner"
              />
              <svg className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth={3}/></svg>
            </div>
          </div>

          <div className="space-y-6 overflow-y-auto pr-4 custom-scrollbar flex-1 pb-10">
            {filteredMembers.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-40 opacity-20">
                <Logo size="sm" showText={false} className="grayscale" />
                <p className="mt-8 text-sm font-black uppercase tracking-[1em]">REGISTRY EMPTY</p>
              </div>
            ) : (
              filteredMembers.map((member, i) => (
                <div key={member.email} className="group flex flex-col md:flex-row items-center justify-between p-10 rounded-[3.5rem] bg-white border border-black/[0.03] hover:border-prismatic/40 transition-all hover:shadow-2xl gap-8 md:gap-0">
                  <div className="flex items-center gap-10 w-full md:w-auto">
                     <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center font-black text-3xl text-white shadow-2xl transition-transform group-hover:rotate-6 ${member.role === 'teacher' ? 'bg-purple-600' : 'bg-prismatic'}`}>
                       {member.name.charAt(0)}
                     </div>
                     <div>
                       <h4 className="text-3xl font-black text-slate-900 tracking-tight">{member.name}</h4>
                       <p className="text-slate-400 text-[12px] font-black tracking-widest uppercase opacity-60 mt-1">{member.email}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-14 w-full md:w-auto justify-between md:justify-end">
                     <div className="text-right">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-3">ACCESS LEVEL</div>
                        <div className={`text-[12px] font-black uppercase tracking-widest px-6 py-2 rounded-full border shadow-sm ${member.role === 'teacher' ? 'text-purple-600 border-purple-100 bg-purple-50' : 'text-cyan-600 border-cyan-100 bg-cyan-50'}`}>
                          {member.role}
                        </div>
                     </div>
                     <div className="text-right hidden xl:block">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-3">SYNCED</div>
                        <div className="text-[11px] font-black text-slate-500 uppercase">{new Date(member.dateAdded).toLocaleDateString()}</div>
                     </div>
                     <button 
                       onClick={() => deleteMember(member.email)}
                       className="w-20 h-20 rounded-[2rem] bg-white border border-black/5 flex items-center justify-center text-slate-200 hover:text-red-500 transition-all hover:bg-red-50 hover:border-red-200 shadow-xl group/del"
                     >
                        <svg className="w-8 h-8 transition-transform group-hover/del:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth={2}/></svg>
                     </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatBox: React.FC<{label: string, value: string, color?: string}> = ({ label, value, color = "text-slate-900" }) => (
  <div className="text-center lg:text-right px-6 border-r last:border-r-0 border-black/5">
    <div className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 mb-3">{label}</div>
    <div className={`text-5xl font-outfit font-black ${color}`}>{value}</div>
  </div>
);

export default SchoolDashboard;
