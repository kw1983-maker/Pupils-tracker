import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Plus, Upload, Trash2, Check, X, GraduationCap, Calendar, BookOpen, AlertCircle, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Pupil, Assignment, Submissions } from './types';

// Simple ID generator without needing crypto context
const generateId = () => Math.random().toString(36).substring(2, 10);

export default function App() {
  const [pupils, setPupils] = useState<Pupil[]>(() => {
    const saved = localStorage.getItem('pupil-tracker-pupils');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    const saved = localStorage.getItem('pupil-tracker-assignments');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length > 0) return parsed;
    }
    const today = new Date().toISOString().split('T')[0];
    return [
      { id: generateId(), date: today, title: 'Spelling' },
      { id: generateId(), date: today, title: 'Dictation' },
      { id: generateId(), date: today, title: 'Workbook' },
      { id: generateId(), date: today, title: 'PBD' },
    ];
  });
  
  const [submissions, setSubmissions] = useState<Submissions>(() => {
    const saved = localStorage.getItem('pupil-tracker-submissions');
    return saved ? JSON.parse(saved) : {};
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // New assignment form state
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newTitle, setNewTitle] = useState('');

  // Persist state
  useEffect(() => {
    localStorage.setItem('pupil-tracker-pupils', JSON.stringify(pupils));
    localStorage.setItem('pupil-tracker-assignments', JSON.stringify(assignments));
    localStorage.setItem('pupil-tracker-submissions', JSON.stringify(submissions));
  }, [pupils, assignments, submissions]);

  // Handle uploading and parsing namelist text/csv
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Extract names split by line breaks or commas
      const rawNames = text.split(/\r?\n|,/).map(n => n.trim()).filter(n => n.length > 0);
      
      const existingNames = new Set(pupils.map(p => p.name.toLowerCase()));
      const newPupils = rawNames
        .filter(name => !existingNames.has(name.toLowerCase()))
        .map(name => ({
          id: generateId(),
          name
        }));

      if (newPupils.length > 0) {
        setPupils(prev => [...prev, ...newPupils]);
      }
    };
    reader.readAsText(file);
    
    // Reset input so the same file could be uploaded again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePupil = (pupilId: string) => {
    if (confirm('Are you sure you want to remove this pupil?')) {
      setPupils(p => p.filter(x => x.id !== pupilId));
    }
  };

  const handleAddAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newTitle.trim()) return;
    setAssignments(prev => [...prev, { id: generateId(), date: newDate, title: newTitle.trim() }]);
    setNewTitle(''); // reset title
  };

  const removeAssignment = (assignmentId: string) => {
    if (confirm('Are you sure you want to remove this assignment? This will clear its submission data.')) {
      setAssignments(a => a.filter(x => x.id !== assignmentId));
      setSubmissions(s => {
        const next = { ...s };
        delete next[assignmentId];
        return next;
      });
    }
  };

  const toggleAllForAssignment = (assignmentId: string) => {
    setSubmissions(prev => {
      const assignmentSubs = prev[assignmentId] || {};
      const allChecked = pupils.length > 0 && pupils.every(p => !!assignmentSubs[p.id]);
      
      const nextSubs = { ...assignmentSubs };
      pupils.forEach(p => {
        nextSubs[p.id] = !allChecked;
      });
      
      return {
        ...prev,
        [assignmentId]: nextSubs
      };
    });
  };

  const toggleSubmission = (assignmentId: string, pupilId: string) => {
    setSubmissions(prev => {
      const assignmentSubs = prev[assignmentId] || {};
      const currentlyChecked = !!assignmentSubs[pupilId];
      
      return {
        ...prev,
        [assignmentId]: {
          ...assignmentSubs,
          [pupilId]: !currentlyChecked
        }
      };
    });
  };

  const getPupilScore = (pupilId: string) => {
    if (assignments.length === 0) return { score: 0, total: 0 };
    const score = assignments.filter(a => !!submissions[a.id]?.[pupilId]).length;
    return { score, total: assignments.length };
  };

  const exportToCSV = () => {
    if (pupils.length === 0) {
      alert("No data to export.");
      return;
    }

    const headers = ['Pupil Name', ...assignments.map(a => `${a.title} (${a.date})`), 'Total Score'];
    const csvRows = [headers.map(h => `"${h}"`).join(',')];

    pupils.forEach(pupil => {
      const { score, total } = getPupilScore(pupil.id);
      const row = [
        `"${pupil.name}"`,
        ...assignments.map(a => (submissions[a.id]?.[pupil.id] ? '"Checked"' : '"-"')),
        `"${score}/${total}"`
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ClassTrack_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Class completion stats
  let totalPossible = pupils.length * assignments.length;
  let totalChecked = 0;
  if (totalPossible > 0) {
    assignments.forEach(a => {
      const subs = submissions[a.id] || {};
      totalChecked += pupils.filter(p => !!subs[p.id]).length;
    });
  }
  const overallCompletionPercentage = totalPossible > 0 ? Math.round((totalChecked / totalPossible) * 100) : 0;

  // Dynamic grid template for table
  const gridStyle = {
    gridTemplateColumns: `240px repeat(${Math.max(assignments.length, 1)}, minmax(130px, 1fr)) 100px`
  };

  return (
    <div className="w-full h-screen bg-slate-50 flex flex-col font-sans overflow-hidden text-slate-800">
      {/* Top Header Navigation */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sm:px-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold">C</div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">ClassTrack <span className="text-indigo-600">Pro</span></h1>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-sm font-medium text-slate-500">
          <span className="px-3 py-1 bg-slate-100 rounded-full text-slate-600">{pupils.length} Pupils</span>
          <span className="text-slate-300">|</span>
          <span>{assignments.length} Assignments</span>
        </div>
        <button onClick={exportToCSV} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm transition-colors cursor-pointer">
          Export Report
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden flex-col sm:flex-row">
        {/* Sidebar Controls */}
        <aside className="w-full sm:w-64 bg-slate-100 border-b sm:border-r border-slate-200 p-6 flex flex-col gap-8 shrink-0 overflow-y-auto max-h-64 sm:max-h-none">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Data Entry</label>
            <label className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 p-3 rounded-lg text-sm hover:border-indigo-400 font-medium transition-all cursor-pointer">
              <Upload className="w-5 h-5 text-indigo-500" />
              Upload Namelist
              <input 
                type="file" 
                accept=".txt,.csv" 
                className="hidden" 
                onChange={handleFileUpload} 
                ref={fileInputRef}
              />
            </label>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Quick Add Column</label>
            <div className="flex flex-col gap-2 mb-4">
               <button onClick={() => setAssignments(p => [...p, { id: generateId(), date: newDate, title: 'Spelling' }])} className="w-full bg-white text-indigo-700 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-50 border border-slate-300 hover:border-indigo-300 transition-colors cursor-pointer text-left px-3">+ Spelling</button>
               <button onClick={() => setAssignments(p => [...p, { id: generateId(), date: newDate, title: 'Dictation' }])} className="w-full bg-white text-indigo-700 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-50 border border-slate-300 hover:border-indigo-300 transition-colors cursor-pointer text-left px-3">+ Dictation</button>
               <button onClick={() => setAssignments(p => [...p, { id: generateId(), date: newDate, title: 'Workbook' }])} className="w-full bg-white text-indigo-700 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-50 border border-slate-300 hover:border-indigo-300 transition-colors cursor-pointer text-left px-3">+ Workbook</button>
               <button onClick={() => setAssignments(p => [...p, { id: generateId(), date: newDate, title: 'PBD' }])} className="w-full bg-white text-indigo-700 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-50 border border-slate-300 hover:border-indigo-300 transition-colors cursor-pointer text-left px-3">+ PBD</button>
            </div>
            
            <form onSubmit={handleAddAssignment} className="space-y-3 pt-4 border-t border-slate-200">
               <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Custom Column</label>
              <input 
                type="date" 
                required
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none" 
              />
              <input 
                type="text"
                required
                list="assignment-types"
                placeholder="e.g. Spelling"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none" 
              />
              <datalist id="assignment-types">
                <option value="Spelling" />
                <option value="Dictation" />
                <option value="Workbook" />
                <option value="PBD" />
              </datalist>
              <button 
                type="submit"
                className="w-full bg-slate-800 text-white py-2 rounded font-medium text-sm hover:bg-slate-900 transition-all cursor-pointer"
              >
                + Add New Column
              </button>
            </form>
          </div>

          <div className="mt-auto hidden sm:block">
            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
              <p className="text-[11px] font-bold text-indigo-600 uppercase mb-1">Class Completion</p>
              <div className="text-2xl font-bold text-indigo-900">{overallCompletionPercentage}%</div>
              <div className="w-full bg-indigo-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-indigo-600 h-full transition-all" style={{ width: `${overallCompletionPercentage}%` }}></div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Performance Grid */}
        <main className="flex-1 flex flex-col p-4 sm:p-8 overflow-hidden min-h-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col overflow-hidden h-full">
            
            <div className="flex-1 overflow-auto">
              <div className="min-w-max">
                {/* Table Header */}
                <div className="grid border-b border-slate-200 bg-slate-50/50 sticky top-0 z-10 font-sans" style={gridStyle}>
                  <div className="p-4 border-r border-slate-100 font-semibold text-sm text-slate-600 flex items-center bg-slate-50/90 backdrop-blur">
                    Pupil Name
                  </div>
                  
                  {assignments.length === 0 && (
                    <div className="p-4 border-r border-slate-100 text-slate-400 text-xs flex items-center justify-center italic bg-slate-50/90 backdrop-blur">
                      No assignments added. Add one from the sidebar.
                    </div>
                  )}

                  {assignments.map(a => {
                    const allChecked = pupils.length > 0 && pupils.every(p => !!submissions[a.id]?.[p.id]);
                    return (
                      <div key={a.id} className="p-4 border-r border-slate-100 flex flex-col items-center justify-center gap-1 relative group bg-indigo-50/20 backdrop-blur">
                        <span className="text-[10px] font-bold text-indigo-500 uppercase flex items-center gap-1">
                          {new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-xs text-slate-900 font-semibold line-clamp-1 text-center" title={a.title}>{a.title}</span>
                        
                        <div className="flex gap-1 mt-2">
                          <button 
                            onClick={() => toggleAllForAssignment(a.id)}
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border cursor-pointer transition-colors ${allChecked ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700' : 'bg-white hover:bg-indigo-50 text-indigo-600 border-indigo-200 shadow-sm'}`}
                            title={allChecked ? "Uncheck All" : "Check All"}
                          >
                            {allChecked ? "Uncheck All" : "Check All"}
                          </button>
                          <button 
                            onClick={() => removeAssignment(a.id)}
                            className="text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 px-1.5 py-0.5 rounded border border-slate-200 cursor-pointer shadow-sm"
                            title="Delete Assignment"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  
                  <div className="p-4 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase bg-slate-50/90 backdrop-blur">
                    Score
                  </div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-slate-100">
                  {pupils.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 text-sm">
                      No pupils in the list. Upload a namelist using the Quick Add control.
                    </div>
                  ) : (
                    pupils.map((pupil, idx) => {
                      const { score, total } = getPupilScore(pupil.id);
                      // Custom colors based on index for the theme (Green, Red, Amber, Green...)
                      const dotColors = ['bg-green-500', 'bg-red-400', 'bg-amber-400', 'bg-indigo-500'];
                      const dotColor = dotColors[idx % dotColors.length];
                      
                      return (
                        <div key={pupil.id} className="grid hover:bg-slate-50 transition-colors group" style={gridStyle}>
                          <div className="p-4 border-r border-slate-100 text-sm font-medium flex items-center justify-between">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className={`w-2 h-2 shrink-0 rounded-full ${dotColor}`}></div>
                              <span className="truncate" title={pupil.name}>{pupil.name}</span>
                            </div>
                            <button 
                              onClick={() => removePupil(pupil.id)}
                              className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity shrink-0 cursor-pointer"
                              title="Remove pupil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          {assignments.length === 0 && (
                            <div className="p-4 border-r border-slate-100 bg-slate-50/20"></div>
                          )}

                          {assignments.map(a => {
                            const isChecked = !!submissions[a.id]?.[pupil.id];
                            return (
                              <button
                                key={a.id}
                                onClick={() => toggleSubmission(a.id, pupil.id)}
                                className={`p-4 border-r border-slate-100 flex justify-center items-center cursor-pointer transition-colors ${isChecked ? 'bg-indigo-50/20' : 'hover:bg-slate-100/50'}`}
                              >
                                <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors border ${isChecked ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                                  {isChecked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                                </div>
                              </button>
                            );
                          })}
                          
                          <div className="p-4 flex items-center justify-center text-xs font-bold text-slate-500">
                            {score}/{total}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Table Footer Pagination/Status */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-medium text-slate-500 shrink-0">
              <p>Showing 1-{pupils.length} of {pupils.length} pupils</p>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-white border border-slate-200 rounded shadow-sm opacity-50 cursor-not-allowed">Previous</button>
                <button className="px-3 py-1 bg-white border border-slate-200 rounded shadow-sm opacity-50 cursor-not-allowed">Next</button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-4 shrink-0">
            <div className="flex-1 flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200">
              <div className="w-10 h-10 rounded bg-green-100 flex items-center justify-center shrink-0">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Latest Average</p>
                <p className="text-lg font-bold text-slate-800">{overallCompletionPercentage}% Compliance</p>
              </div>
            </div>
            <div className="flex-1 flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200">
              <div className="w-10 h-10 rounded bg-indigo-100 flex items-center justify-center shrink-0">
                 <AlertCircle className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Pending Submissions</p>
                <p className="text-lg font-bold text-slate-800">{totalPossible - totalChecked} Missing</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
