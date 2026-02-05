
import React, { useState, useEffect } from 'react';
import Logo from './Logo';
import { SchoolProfile, InstitutionMember } from '../types';
import { auth } from '../firebase';

interface SchoolDashboardProps {
  onBack: () => void;
}

const SchoolDashboard: React.FC<SchoolDashboardProps> = ({ onBack }) => {
  const [school, setSchool] = useState<SchoolProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'individual' | 'bulk'>('individual');
  const [newMember, setNewMember] = useState({ name: '', password: '', role: 'student' as 'student' | 'teacher' });
  const [bulkInput, setBulkInput] = useState('');
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
    if (!school || !newMember.name || !newMember.password) return;
    
    if (school.members.some(m => m.name.toLowerCase() === newMember.name.toLowerCase())) {
      setProvisionStatus("ERROR: IDENTITY COLLISION DETECTED");
      return;
    }

    const member: InstitutionMember = {
      name: newMember.name,
      email: `${newMember.name.replace(/\s+/g, '_')}@${school.id}.mine.edu`,
      password: newMember.password,
      role: newMember.role,
      dateAdded: new Date().toISOString()
    };

    const updatedSchool = { ...school, members: [...school.members, member] };
    saveSchool(updatedSchool);
    setNewMember({ name: '', password: '', role: 'student' });
    setProvisionStatus("IDENTITY SYNCED TO MATRIX");
    setTimeout(() => setProvisionStatus(null), 3000);
  };

  const handleBulkProvision = () => {
    if (!school || !bulkInput.trim()) return;
    
    const lines = bulkInput.split('\n').filter(l => l.trim().length > 0);
    const newMembers: InstitutionMember[] = [];
    const defaultPassword = `${school.name.replace(/\s+/g, '')}2025`;
    let duplicates = 0;

    lines.forEach(line => {
      const name = line.trim();
      if (school.members.some(m => m.name.toLowerCase() === name.toLowerCase())) {
        duplicates++;
        return;
      }
      newMembers.push({
        name,
        email: `${name.replace(/\s+/g, '_')}@${school.id}.mine.edu`,
        password: defaultPassword,
        role: 'student',
        dateAdded: new Date().toISOString()
      });
    });

    if (newMembers.length > 0) {
      const updatedSchool = { ...school, members: [...school.members, ...newMembers] };
      saveSchool(updatedSchool);
      setBulkInput('');
      setProvisionStatus(`SUCCESS: ${newMembers.length} NODES INITIALIZED. ${duplicates > 0 ? duplicates + ' SKIPPED.' : ''}`);
    } else if (duplicates > 0) {
      setProvisionStatus("ERROR: ALL ENTRIES ALREADY EXIST IN MATRIX");
    }
    setTimeout(() => setProvisionStatus(null), 5000);
  };

  const deleteMember = (name: string) => {
    if (!school) return;
    if (!confirm(`CRITICAL: Sever neural link for ${name}?`)) return;
    
    const updatedMembers = school.members.filter(m => m.name !== name);
    saveSchool({ ...school, members: updatedMembers });
  };

  const exportRegistry = () => {
    if (!school) return;
    const data = JSON.stringify(school.members, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${school.name.replace(/\s+/g, '_')}_Registry.json`;
    a.click();
  };

  if (!school) return <div className="p-20 text-center font-black uppercase tracking-widest text-slate-400">Syncing Matrix...</div>;

  const filteredMembers = school.members.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());

  return (
    <div className="min-h-screen w-full p-6 md:p-14 lg:p-20 flex flex-col gap-10 animate-billion overflow-y-auto bg-slate-50/50">
      <header className="flex flex-col lg:flex-row items-center justify-between gap-10">
        <div className="flex items-center gap-8">
          <button onClick={onBack} className="p-4 rounded-full bg-white border border-black/5 shadow-xl hover:scale-110 transition-all active:scale-95">
            <svg className="w-5 h-5 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth={2}/></svg>
          </button>
          <div>
            <h1 className="text-4xl lg:text-6xl font-outfit font-black uppercase tracking-tighter text-slate-900">
              {school.name} <span className="text-prismatic">MATRIX</span>
            </h1>
            <div className="flex items-center gap-3 mt-2">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
               <p className="text-slate-400 uppercase text-[9px] tracking-[0.6em] font-bold">Encrypted Session: Secure</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-center lg:justify-end gap-10 bg-white/60 p-8 rounded-[2.5rem] backdrop-blur-xl border border-black/[0.02] shadow-sm">
          <StatBox label="TOTAL NODES" value={school.members.length.toString()} />
          <StatBox label="FACULTY" value={school.members.filter(m => m.role === 'teacher').length.toString()} />
          <StatBox label="BANDWIDTH" value="UNLIMITED" color="text-cyan-500" />
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start">
        {/* Provisioning Engine */}
        <div className="xl:col-span-4 glass-premium rounded-[3.5rem] p-10 border-white/90 shadow-2xl space-y-10 bg-white/80">
          <div className="flex gap-2 p-1.5 bg-slate-100/50 rounded-3xl border border-black/[0.01]">
            <button 
              onClick={() => setActiveTab('individual')}
              className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'individual' ? 'bg-white shadow text-prismatic' : 'text-slate-400'}`}
            >
              Single Node
            </button>
            <button 
              onClick={() => setActiveTab('bulk')}
              className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'bulk' ? 'bg-white shadow text-prismatic' : 'text-slate-400'}`}
            >
              Bulk Uplink
            </button>
          </div>

          {activeTab === 'individual' ? (
            <form onSubmit={addMember} className="space-y-6">
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-6">NEURAL IDENTITY</label>
                <input type="text" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} className="w-full bg-white/50 border border-black/[0.05] rounded-3xl px-8 py-5 outline-none focus:ring-4 focus:ring-purple-500/10 text-slate-900 font-bold text-lg shadow-inner" placeholder="E.g. Alexander Vance" required />
              </div>
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-6">ACCESS KEY</label>
                <input type="password" value={newMember.password} onChange={e => setNewMember({...newMember, password: e.target.value})} className="w-full bg-white/50 border border-black/[0.05] rounded-3xl px-8 py-5 outline-none focus:ring-4 focus:ring-purple-500/10 text-slate-900 font-bold text-lg shadow-inner" placeholder="••••••••" required />
              </div>
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-6">NODE TIER</label>
                <div className="flex gap-3">
                   <RoleBtn active={newMember.role === 'student'} onClick={() => setNewMember({...newMember, role: 'student'})}>Student</RoleBtn>
                   <RoleBtn active={newMember.role === 'teacher'} onClick={() => setNewMember({...newMember, role: 'teacher'})}>Teacher</RoleBtn>
                </div>
              </div>
              <button type="submit" className="button-billion w-full !py-6 shadow-xl text-xs">INITIALIZE NODE</button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-6">NEURAL ROSTER (PASTE NAMES)</label>
                <textarea 
                  value={bulkInput} 
                  onChange={e => setBulkInput(e.target.value)} 
                  className="w-full bg-white/50 border border-black/[0.05] rounded-3xl px-8 py-6 outline-none focus:ring-4 focus:ring-purple-500/10 text-slate-900 font-bold text-lg shadow-inner min-h-[300px] custom-scrollbar" 
                  placeholder="One name per line...&#10;John Doe&#10;Jane Smith" 
                />
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-300 px-6">Default Key: {school.name.replace(/\s+/g, '')}2025</p>
              </div>
              <button onClick={handleBulkProvision} className="button-billion w-full !py-6 shadow-xl text-xs">BULK SYNC MATRIX</button>
            </div>
          )}
          
          {provisionStatus && (
            <div className={`p-5 rounded-3xl text-[9px] font-black uppercase tracking-widest text-center border animate-billion ${provisionStatus.includes('ERROR') ? 'bg-red-50 text-red-600 border-red-100' : 'bg-cyan-50 text-cyan-600 border-cyan-100'}`}>
              {provisionStatus}
            </div>
          )}
        </div>

        {/* Matrix Registry */}
        <div className="xl:col-span-8 glass-premium rounded-[3.5rem] p-10 flex flex-col border-white/90 shadow-2xl bg-white/80 h-full max-h-[1000px]">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-6">
            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-widest text-slate-900">IDENTITY REGISTRY</h3>
              <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.4em] opacity-60">Verified Neural Nodes: {school.members.length}</p>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                <input type="text" placeholder="FILTER NODES..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-slate-50 border border-black/[0.03] rounded-3xl px-12 py-4 text-[10px] font-black tracking-widest outline-none focus:ring-4 focus:ring-cyan-500/10 shadow-inner" />
                <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth={3}/></svg>
              </div>
              <button onClick={exportRegistry} className="p-4 bg-white border border-black/5 rounded-2xl hover:bg-slate-50 transition-all text-slate-400 hover:text-slate-900 shadow-sm" title="Export Registry">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M16 9l-4 4m0 0l-4-4m4 4V4" strokeWidth={2}/></svg>
              </button>
            </div>
          </div>

          <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-10">
            {filteredMembers.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-32 opacity-20 grayscale">
                <Logo size="sm" showText={false} />
                <p className="mt-6 text-[10px] font-black uppercase tracking-[1em]">NO NODES DETECTED</p>
              </div>
            ) : (
              filteredMembers.map((member) => (
                <div key={member.name} className="group flex flex-col md:flex-row items-center justify-between p-8 rounded-[3rem] bg-white border border-black/[0.02] hover:border-prismatic/30 transition-all hover:shadow-xl gap-6">
                  <div className="flex items-center gap-8 w-full md:w-auto">
                     <div className={`w-16 h-16 rounded-[1.8rem] flex items-center justify-center font-black text-xl text-white shadow-lg transition-transform group-hover:rotate-6 ${member.role === 'teacher' ? 'bg-purple-600' : 'bg-prismatic'}`}>
                       {member.name.charAt(0)}
                     </div>
                     <div>
                       <h4 className="text-xl font-black text-slate-900 tracking-tight">{member.name}</h4>
                       <p className="text-slate-400 text-[9px] font-black tracking-widest uppercase opacity-40 mt-1">Matrix Link: {member.email}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-10 w-full md:w-auto justify-between md:justify-end">
                     <div className="text-right">
                        <div className={`text-[9px] font-black uppercase tracking-widest px-5 py-2 rounded-full border shadow-sm ${member.role === 'teacher' ? 'text-purple-600 border-purple-100 bg-purple-50' : 'text-cyan-600 border-cyan-100 bg-cyan-50'}`}>
                          {member.role}
                        </div>
                     </div>
                     <button onClick={() => deleteMember(member.name)} className="w-14 h-14 rounded-2xl bg-white border border-black/5 flex items-center justify-center text-slate-200 hover:text-red-500 transition-all hover:bg-red-50 shadow-sm group/del">
                        <svg className="w-6 h-6 transition-transform group-hover/del:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth={2}/></svg>
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

const RoleBtn: React.FC<{active: boolean, onClick: () => void, children: React.ReactNode}> = ({ active, onClick, children }) => (
  <button type="button" onClick={onClick} className={`flex-1 py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all ${active ? 'bg-slate-900 text-white shadow-lg scale-[1.05]' : 'bg-slate-50 text-slate-400 border border-black/[0.02]'}`}>
    {children}
  </button>
);

const StatBox: React.FC<{label: string, value: string, color?: string}> = ({ label, value, color = "text-slate-900" }) => (
  <div className="text-center lg:text-right px-4 border-r last:border-r-0 border-black/5">
    <div className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 mb-2">{label}</div>
    <div className={`text-4xl font-outfit font-black ${color}`}>{value}</div>
  </div>
);

export default SchoolDashboard;
