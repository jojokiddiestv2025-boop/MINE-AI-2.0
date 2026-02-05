import React, { useState } from 'react';
import Logo from './Logo';

interface SchoolDashboardProps {
  onBack: () => void;
}

const SchoolDashboard: React.FC<SchoolDashboardProps> = ({ onBack }) => {
  const [students, setStudents] = useState([
    { name: 'Ethan Hunt', email: 'ethan@nexus.edu', status: 'Active', load: '82%' },
    { name: 'Sarah Connor', email: 'sarah@nexus.edu', status: 'Idle', load: '12%' },
    { name: 'Neo Anderson', email: 'neo@nexus.edu', status: 'Syncing', load: '99%' },
  ]);

  const [newStudent, setNewStudent] = useState({ name: '', email: '' });

  const addStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.email) return;
    setStudents([...students, { ...newStudent, status: 'Active', load: '0%' }]);
    setNewStudent({ name: '', email: '' });
  };

  return (
    <div className="min-h-screen w-full p-10 lg:p-20 flex flex-col gap-12 animate-billion overflow-y-auto">
      <header className="flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-8">
          <button onClick={onBack} className="p-4 rounded-full bg-white border border-black/5 shadow-md hover:bg-slate-50 transition-all">
            <svg className="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth={2}/></svg>
          </button>
          <div>
            <h1 className="text-4xl xl:text-5xl font-outfit font-black uppercase tracking-tight text-slate-900">School <span className="text-prismatic">Nexus</span></h1>
            <p className="text-slate-400 uppercase text-[10px] tracking-[0.6em] mt-2">Neural Institutional Command Center</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-center md:justify-end gap-10">
          <StatBox label="Total Nodes" value={students.length.toString()} />
          <StatBox label="Active Links" value="1,242" />
          <StatBox label="Network Load" value="Optimal" />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Provisioning Form */}
        <div className="lg:col-span-1 glass-premium rounded-[4rem] p-12 space-y-10 border-white/90 shadow-xl">
          <h3 className="text-2xl font-black uppercase tracking-widest text-slate-900">Provision New Node</h3>
          <form onSubmit={addStudent} className="space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 px-4">Student Name</label>
              <input 
                type="text" 
                value={newStudent.name}
                onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                className="w-full bg-white/50 border border-black/[0.03] rounded-3xl px-8 py-5 outline-none focus:ring-2 focus:ring-cyan-500/40 text-slate-900" 
                placeholder="Full Name"
              />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 px-4">Neural Identifier (Email)</label>
              <input 
                type="email" 
                value={newStudent.email}
                onChange={e => setNewStudent({...newStudent, email: e.target.value})}
                className="w-full bg-white/50 border border-black/[0.03] rounded-3xl px-8 py-5 outline-none focus:ring-2 focus:ring-cyan-500/40 text-slate-900" 
                placeholder="student@nexus.edu"
              />
            </div>
            <button type="submit" className="button-billion w-full !py-5 shadow-xl">Initialize Student Link</button>
          </form>
        </div>

        {/* Node Management List */}
        <div className="lg:col-span-2 glass-premium rounded-[4rem] p-12 overflow-hidden flex flex-col border-white/90 shadow-xl">
          <div className="flex items-center justify-between mb-12">
            <h3 className="text-2xl font-black uppercase tracking-widest text-slate-900">Active Student Matrix</h3>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-600 px-6 py-2 rounded-full border border-cyan-200 bg-cyan-50 animate-pulse">Live Uplink</span>
          </div>
          <div className="space-y-6 overflow-y-auto max-h-[600px] pr-4 custom-scrollbar">
            {students.map((student, i) => (
              <div key={i} className="group flex flex-col sm:flex-row items-center justify-between p-8 rounded-[2.5rem] bg-white/40 border border-black/[0.02] hover:border-black/10 transition-all hover:bg-white/80 shadow-sm gap-6 sm:gap-0">
                <div className="flex items-center gap-8 w-full sm:w-auto">
                   <div className="w-16 h-16 rounded-full bg-prismatic flex items-center justify-center font-black text-xl text-white shadow-lg">
                     {student.name.charAt(0)}
                   </div>
                   <div>
                     <h4 className="text-xl font-bold text-slate-900">{student.name}</h4>
                     <p className="text-slate-400 text-sm font-medium">{student.email}</p>
                   </div>
                </div>
                <div className="flex items-center gap-12 w-full sm:w-auto justify-between sm:justify-end">
                   <div className="text-right">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-1">Status</div>
                      <div className={`text-[12px] font-bold ${student.status === 'Active' ? 'text-green-600' : 'text-cyan-600'}`}>{student.status}</div>
                   </div>
                   <div className="text-right">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-1">Neural Load</div>
                      <div className="text-[12px] font-bold text-slate-900">{student.load}</div>
                   </div>
                   <button className="w-12 h-12 rounded-2xl bg-white border border-black/5 flex items-center justify-center text-slate-300 hover:text-red-500 transition-all hover:bg-red-50 shadow-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth={2}/></svg>
                   </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatBox: React.FC<{label: string, value: string}> = ({ label, value }) => (
  <div className="text-center md:text-right">
    <div className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-2">{label}</div>
    <div className="text-3xl font-outfit font-black text-slate-900">{value}</div>
  </div>
);

export default SchoolDashboard;