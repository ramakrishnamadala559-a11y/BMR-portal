'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  ShieldCheck,
  Plus,
  Loader2,
  X,
  UserCheck,
  Mail,
  Phone,
  Lock,
  LockOpen,
  UserX,
  CheckSquare,
  Square,
  KeyRound,
  ShieldAlert,
  Trash2,
  Building2
} from 'lucide-react';
import Toast from '@/components/Toast';

export default function StaffPage() {
  const { user: currentUser } = useAuth();
  
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals state
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  // Form states (Add Staff)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('WARDEN');
  const [password, setPassword] = useState('');
  const [buildings, setBuildings] = useState<any[]>([]);
  const [selectedBuildingIds, setSelectedBuildingIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Permissions matrix state (local copy for selectedStaff)
  const [matrix, setMatrix] = useState<{ [key: string]: { [key: string]: boolean } }>({});
  const [matrixSubmitting, setMatrixSubmitting] = useState(false);

  const modulesList = ['students', 'rooms', 'payments', 'expenses', 'invoices', 'reports'];
  const actionsList = ['view', 'create', 'edit', 'delete'];

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/staff');
      if (res.ok) {
        const data = await res.json();
        setStaffList(data);
      }
    } catch (err) {
      console.error('Failed to load staff list:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBuildings = async () => {
    try {
      const res = await fetch('/api/buildings');
      if (res.ok) {
        const data = await res.json();
        setBuildings(data);
      }
    } catch (err) {
      console.error('Failed to load buildings list:', err);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchBuildings();
  }, []);

  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !password) {
      setToast({ message: 'Name, phone, and password are required', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, role, password, status: 'ACTIVE', buildingId: selectedBuildingIds.join(',') || null })
      });

      if (res.ok) {
        setToast({ message: `Successfully registered staff account for ${name}!`, type: 'success' });
        setStaffModalOpen(false);
        // Clear
        setName('');
        setEmail('');
        setPhone('');
        setPassword('');
        setSelectedBuildingIds([]);
        fetchStaff();
      } else {
        const errData = await res.json();
        setToast({ message: errData.error || 'Failed to create staff account', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle account status
  const handleToggleStatus = async (staffId: string, currentStatus: string, name: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (!window.confirm(`Are you sure you want to ${nextStatus.toLowerCase()} ${name}'s account?`)) {
      return;
    }

    try {
      const res = await fetch('/api/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: staffId, status: nextStatus })
      });

      if (res.ok) {
        setToast({ message: `Staff status updated to ${nextStatus.toLowerCase()}!`, type: 'success' });
        fetchStaff();
      } else {
        const errData = await res.json();
        setToast({ message: errData.error || 'Failed to update status', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    }
  };

  // Delete staff member account
  const handleDeleteStaff = async (staffId: string, name: string) => {
    if (staffId === currentUser?.id) {
      setToast({ message: 'You cannot delete your own account', type: 'error' });
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete the staff account for ${name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/staff?id=${staffId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setToast({ message: `Successfully deleted staff account for ${name}!`, type: 'success' });
        fetchStaff();
      } else {
        const errData = await res.json();
        setToast({ message: errData.error || 'Failed to delete staff account', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    }
  };

  // Initialize permissions checkbox grid
  const handlePermissionsClick = (staff: any) => {
    setSelectedStaff(staff);
    
    // Initialize matrix with false values
    const initialMatrix: { [key: string]: { [key: string]: boolean } } = {};
    modulesList.forEach(m => {
      initialMatrix[m] = {};
      actionsList.forEach(a => {
        initialMatrix[m][a] = false;
      });
    });

    // Populate with existing permissions
    staff.permissions.forEach((p: any) => {
      if (initialMatrix[p.module] && initialMatrix[p.module][p.action] !== undefined) {
        initialMatrix[p.module][p.action] = true;
      }
    });

    setMatrix(initialMatrix);
    setPermissionsModalOpen(true);
  };

  const handleCellToggle = (module: string, action: string) => {
    setMatrix(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: !prev[module][action]
      }
    }));
  };

  const handlePermissionsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    setMatrixSubmitting(true);
    
    // Convert matrix state back into list of permission objects
    const permissionsPayload: Array<{ module: string; action: string }> = [];
    Object.entries(matrix).forEach(([module, actions]) => {
      Object.entries(actions).forEach(([action, value]) => {
        if (value) {
          permissionsPayload.push({ module, action });
        }
      });
    });

    try {
      const res = await fetch('/api/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedStaff.id,
          permissions: permissionsPayload
        })
      });

      if (res.ok) {
        setToast({ message: 'Granular permissions updated successfully!', type: 'success' });
        setPermissionsModalOpen(false);
        fetchStaff();
      } else {
        const errData = await res.json();
        setToast({ message: errData.error || 'Failed to update permissions', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    } finally {
      setMatrixSubmitting(false);
    }
  };

  if (currentUser?.role !== 'OWNER') {
    return (
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center max-w-md mx-auto">
        <ShieldAlert className="h-10 w-10 text-rose-500 mx-auto mb-4" />
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Access Restrained</h3>
        <p className="text-xs text-slate-400">Only the primary PG Owner account is authorized to manage staff roles and permission profiles.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-slide-in">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Staff Account Management</h1>
          <p className="text-slate-400 text-sm mt-1">Configure staff login credentials and customize granular RBAC access tables.</p>
        </div>
        <button
          onClick={() => setStaffModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-xs font-bold rounded-xl text-white transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Staff Account
        </button>
      </div>

      {/* Staff List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
          </div>
        ) : staffList.length === 0 ? (
          <div className="col-span-full text-center py-12 border border-slate-800 border-dashed rounded-2xl p-6">
            <ShieldCheck className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-450 text-sm">No staff accounts registered. Click Add Staff to get started.</p>
          </div>
        ) : (
          staffList.map((staff) => (
            <div key={staff.id} className="bg-slate-900 border border-slate-800/85 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">{staff.name}</h3>
                    <span className="text-[9px] bg-slate-950 border border-slate-850 px-2 py-0.5 rounded font-bold uppercase tracking-wider text-slate-400 mt-1 inline-block">
                      {staff.role.toLowerCase()}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase ${
                    staff.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {staff.status.toLowerCase()}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-400 mb-6">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-500" />
                    <span>{staff.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-500" />
                    <span className="truncate">{staff.email || 'No email attached'}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-850">
                    <KeyRound className="h-3.5 w-3.5 text-slate-500" />
                    <span>Permissions: <strong className="text-slate-200">{staff.permissions.length} modules</strong></span>
                  </div>
                  {staff.buildingId && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-850">
                      <Building2 className="h-3.5 w-3.5 text-slate-500" />
                      <span>
                        Assigned Blocks:{' '}
                        <strong className="text-slate-200">
                          {staff.buildingId
                            .split(',')
                            .map((id: string) => buildings.find((b: any) => b.id === id)?.name || id)
                            .join(', ')}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-4 border-t border-slate-850">
                <button
                  onClick={() => handlePermissionsClick(staff)}
                  className="flex-1 py-2 px-3 bg-violet-600/10 border border-violet-500/20 hover:bg-violet-600 hover:text-white rounded-xl text-violet-400 text-xs font-bold transition-all cursor-pointer text-center"
                >
                  Edit Access
                </button>
                <button
                  onClick={() => handleToggleStatus(staff.id, staff.status, staff.name)}
                  className={`px-3 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    staff.status === 'ACTIVE'
                      ? 'border-rose-550/20 bg-rose-500/10 text-rose-400 hover:bg-rose-600 hover:text-white'
                      : 'border-emerald-550/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-600 hover:text-white'
                  }`}
                  title={staff.status === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}
                >
                  {staff.status === 'ACTIVE' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => handleDeleteStaff(staff.id, staff.name)}
                  className="px-3 py-2 border border-slate-800 hover:border-rose-500/30 bg-slate-950 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  title="Delete Staff Account"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL: ADD STAFF */}
      {staffModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-slide-in relative">
            <button
              onClick={() => setStaffModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-bold text-white mb-4">Add Staff Account</h3>

            <form onSubmit={handleAddStaffSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-350 font-semibold mb-2">Staff Member Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ramesh Kumar"
                  className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-200 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-350 font-semibold mb-2">Mobile Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="8877665544"
                    className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-200 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-350 font-semibold mb-2">Staff Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-200 focus:outline-none"
                  >
                    <option value="WARDEN">Warden</option>
                    <option value="MANAGER">Manager</option>
                    <option value="RECEPTIONIST">Receptionist</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-350 font-semibold mb-2">Assign Wing / Block (Optional)</label>
                <div className="bg-slate-955 border border-slate-800 rounded-xl p-3 space-y-2 max-h-32 overflow-y-auto">
                  {buildings.length === 0 ? (
                    <p className="text-slate-550 italic">No blocks created yet</p>
                  ) : (
                    buildings.map((b) => {
                      const isSelected = selectedBuildingIds.includes(b.id);
                      return (
                        <label key={b.id} className="flex items-center gap-2 text-slate-300 hover:text-slate-200 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setSelectedBuildingIds(selectedBuildingIds.filter(id => id !== b.id));
                              } else {
                                setSelectedBuildingIds([...selectedBuildingIds, b.id]);
                              }
                            }}
                            className="rounded border-slate-800 bg-slate-900 text-violet-600 focus:ring-violet-500/30"
                          />
                          <span>{b.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <label className="block text-slate-350 font-semibold mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="warden@hostel.com"
                  className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-350 font-semibold mb-2">Login Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 pl-10 pr-4 text-slate-200 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-850 text-xs font-bold rounded-xl text-white transition-colors cursor-pointer"
              >
                {submitting ? 'Registering...' : 'Register Staff Member'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GRANULAR PERMISSIONS MATRIX */}
      {permissionsModalOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl animate-slide-in relative">
            <button
              onClick={() => setPermissionsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-2.5 text-violet-400 font-bold text-[10px] uppercase tracking-wider mb-2">
              <KeyRound className="h-4 w-4" />
              <span>Customize Access Credentials</span>
            </div>
            <h3 className="text-base font-bold text-white mb-4">RBAC Permissions Matrix: {selectedStaff.name}</h3>

            <form onSubmit={handlePermissionsSubmit} className="space-y-6 text-xs">
              <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/20">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                      <th className="py-3 px-4">Module Name</th>
                      {actionsList.map(action => (
                        <th key={action} className="py-3 px-4 text-center">{action}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {modulesList.map(module => (
                      <tr key={module} className="hover:bg-slate-900/10">
                        <td className="py-3.5 px-4 font-bold text-slate-200 capitalize">{module}</td>
                        {actionsList.map(action => {
                          const isChecked = matrix[module]?.[action] || false;
                          return (
                            <td key={action} className="py-3.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleCellToggle(module, action)}
                                className="inline-flex items-center justify-center hover:scale-105 transition-transform text-slate-500 hover:text-violet-400 cursor-pointer"
                              >
                                {isChecked ? (
                                  <CheckSquare className="h-4.5 w-4.5 text-violet-500" />
                                ) : (
                                  <Square className="h-4.5 w-4.5 text-slate-700" />
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPermissionsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-950 border border-slate-800 text-slate-400 font-bold rounded-xl hover:bg-slate-855 hover:text-slate-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={matrixSubmitting}
                  className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-850 text-xs font-bold rounded-xl text-white transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {matrixSubmitting ? 'Saving changes...' : 'Save Matrix Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
