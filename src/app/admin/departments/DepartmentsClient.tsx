"use client";

import React, { useState } from 'react';
import { Building2, Users, Network, Trash2, Edit2, Plus, X, ChevronDown, ChevronRight } from 'lucide-react';
import styles from './departments.module.css';
import adminStyles from '../admin.module.css';

type Employee = { id: string; name: string; email: string };
type Team = { id: string; name: string; description: string | null; status: string; departmentId: string; _count?: { employees: number } };
type Department = { id: string; code: string; name: string; description: string | null; status: string; headOfDepartmentId: string | null; headOfDepartment?: Employee | null; _count?: { teams: number, employees: number }; teams?: Team[] };

export default function DepartmentsClient({ 
  initialDepartments, 
  employees 
}: { 
  initialDepartments: Department[],
  employees: Employee[]
}) {
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  
  // Modals state
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleDeptSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      code: formData.get('code'),
      name: formData.get('name'),
      description: formData.get('description'),
      headOfDepartmentId: formData.get('headOfDepartmentId') || null,
      status: formData.get('status') || 'ACTIVE'
    };

    if (editingDept) {
      const res = await fetch(`/api/admin/departments/${editingDept.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const { data: updated } = await res.json();
        setDepartments(departments.map(d => d.id === updated.id ? { ...d, ...updated } : d));
        setShowDeptModal(false);
      }
    } else {
      const res = await fetch(`/api/admin/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const { data: newDept } = await res.json();
        setDepartments([{ ...newDept, _count: { teams: 0, employees: 0 }, teams: [] }, ...departments]);
        setShowDeptModal(false);
      }
    }
  };

  const handleDeleteDept = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this department?')) return;
    const res = await fetch(`/api/admin/departments/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setDepartments(departments.map(d => d.id === id ? { ...d, status: 'INACTIVE' } : d));
    }
  };

  const handleTeamSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      description: formData.get('description'),
      status: formData.get('status') || 'ACTIVE'
    };

    try {
    if (editingTeam) {
      const res = await fetch(`/api/admin/teams/${editingTeam.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const { data: updated } = await res.json();
        setDepartments(departments.map(d => {
          if (d.id === updated.departmentId) {
            return {
              ...d,
              teams: (d.teams || []).map(t => t.id === updated.id ? { ...t, ...updated } : t)
            };
          }
          return d;
        }));
        setShowTeamModal(false);
      }
    } else if (selectedDeptId) {
      const homeDepartmentId = String(formData.get('departmentId') || selectedDeptId);
      const res = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, departmentId: homeDepartmentId, employeeIds: formData.getAll('employeeIds') })
      });
      if (res.ok) {
        const { data: newTeam } = await res.json();
        setDepartments(departments.map(d => {
          if (d.id === homeDepartmentId) {
            return {
              ...d,
              teams: [...(d.teams || []), { ...newTeam, _count: { employees: 0 } }],
              _count: { teams: (d._count?.teams || 0) + 1, employees: d._count?.employees || 0 }
            };
          }
          return d;
        }));
        setShowTeamModal(false);
      }
    }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTeam = async (teamId: string, deptId: string) => {
    if (!confirm('Are you sure you want to delete/deactivate this team?')) return;
    const res = await fetch(`/api/admin/teams/${teamId}`, { method: 'DELETE' });
    if (res.ok) {
      setDepartments(departments.map(d => {
        if (d.id === deptId) {
          return {
            ...d,
            teams: (d.teams || []).map(t => t.id === teamId ? { ...t, status: 'INACTIVE' } : t)
          };
        }
        return d;
      }));
    }
  };

  const loadTeamsForDept = async (deptId: string) => {
    if (expandedDept === deptId) {
      setExpandedDept(null);
      return;
    }
    const dept = departments.find(d => d.id === deptId);
    if (!dept?.teams) {
      const res = await fetch(`/api/admin/departments/${deptId}/teams`);
      if (res.ok) {
        const { data } = await res.json();
        setDepartments(departments.map(d => d.id === deptId ? { ...d, teams: data } : d));
      }
    }
    setExpandedDept(deptId);
  };

  return (
    <div className={styles.container}>
      <div className={adminStyles.adminPageHeader}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className={adminStyles.adminPageTitle}>Department & Team Management</h1>
            <p className={adminStyles.adminPageSubtitle}>Organize Hamdard&apos;s operational hierarchy</p>
          </div>
          <button 
            className={styles.primaryButton}
            onClick={() => { setEditingDept(null); setShowDeptModal(true); }}
          >
            <Plus size={18} /> New Department
          </button>
        </div>
      </div>

      <div className={styles.deptList}>
        {departments.map(dept => (
          <div key={dept.id} className={`${styles.deptCard} ${dept.status === 'INACTIVE' ? styles.inactive : ''}`}>
            <div className={styles.deptHeader}>
              <div className={styles.deptInfo} onClick={() => loadTeamsForDept(dept.id)}>
                {expandedDept === dept.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                <div className={styles.deptIconWrapper}>
                  <Building2 size={24} className={styles.deptIcon} />
                </div>
                <div>
                  <h3 className={styles.deptName}>{dept.name} <span className={styles.deptCode}>({dept.code})</span></h3>
                  <p className={styles.deptDesc}>{dept.description || 'No description'}</p>
                </div>
              </div>
              <div className={styles.deptActions}>
                <span className={styles.statBadge}><Users size={14}/> {dept._count?.employees || 0}</span>
                <span className={styles.statBadge}><Network size={14}/> {dept._count?.teams || 0}</span>
                <button className={styles.actionBtn} onClick={() => { setEditingDept(dept); setShowDeptModal(true); }}><Edit2 size={16} /></button>
                <button className={`${styles.actionBtn} ${styles.danger}`} onClick={() => handleDeleteDept(dept.id)}><Trash2 size={16} /></button>
              </div>
            </div>
            
            {expandedDept === dept.id && (
              <div className={styles.teamsSection}>
                <div className={styles.teamsHeader}>
                  <h4>Teams in {dept.name}</h4>
                  <button 
                    className={styles.secondaryButton}
                    onClick={() => { setSelectedDeptId(dept.id); setEditingTeam(null); setShowTeamModal(true); }}
                  >
                    <Plus size={14} /> Add Team
                  </button>
                </div>
                
                <div className={styles.teamsGrid}>
                  {dept.teams?.map(team => (
                    <div key={team.id} className={`${styles.teamCard} ${team.status === 'INACTIVE' ? styles.inactive : ''}`}>
                      <div className={styles.teamInfo}>
                        <h5>{team.name}</h5>
                        <p>{team.description || 'No description'}</p>
                      </div>
                      <div className={styles.teamActions}>
                        <button className={styles.actionBtn} onClick={() => { setEditingTeam(team); setSelectedDeptId(dept.id); setShowTeamModal(true); }}><Edit2 size={14} /></button>
                        <button className={`${styles.actionBtn} ${styles.danger}`} onClick={() => handleDeleteTeam(team.id, dept.id)}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                  {(!dept.teams || dept.teams.length === 0) && (
                    <p className={styles.emptyText}>No teams configured yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Department Modal */}
      {showDeptModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>{editingDept ? 'Edit Department' : 'Create Department'}</h3>
              <button onClick={() => setShowDeptModal(false)} className={styles.closeBtn}><X size={20}/></button>
            </div>
            <form onSubmit={handleDeptSubmit} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Code (e.g. IT, HR)</label>
                <input name="code" defaultValue={editingDept?.code} required disabled={!!editingDept} />
              </div>
              <div className={styles.formGroup}>
                <label>Name</label>
                <input name="name" defaultValue={editingDept?.name} required />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea name="description" defaultValue={editingDept?.description || ''} rows={3} />
              </div>
              <div className={styles.formGroup}>
                <label>Head of Department</label>
                <select name="headOfDepartmentId" defaultValue={editingDept?.headOfDepartmentId || ''}>
                  <option value="">None</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.email})</option>
                  ))}
                </select>
              </div>
              {editingDept && (
                <div className={styles.formGroup}>
                  <label>Status</label>
                  <select name="status" defaultValue={editingDept.status}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              )}
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowDeptModal(false)} className={styles.cancelButton}>Cancel</button>
                <button type="submit" className={styles.primaryButton}>Save Department</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Modal */}
      {showTeamModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>{editingTeam ? 'Edit Team' : 'Create Team'}</h3>
              <button onClick={() => setShowTeamModal(false)} className={styles.closeBtn}><X size={20}/></button>
            </div>
            <form onSubmit={handleTeamSubmit} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Team Name</label>
                <input name="name" defaultValue={editingTeam?.name} required />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea name="description" defaultValue={editingTeam?.description || ''} rows={3} />
              </div>
              {!editingTeam && (
                <>
                  <div className={styles.formGroup}>
                    <label>Home Department</label>
                    <select name="departmentId" defaultValue={selectedDeptId || ''} required>
                      {departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Team Members <span className={styles.optionalLabel}>(employees may belong to other departments)</span></label>
                    <select name="employeeIds" multiple size={6} className={styles.memberSelect}>
                      {employees.map(employee => <option key={employee.id} value={employee.id}>{employee.name} ({employee.email})</option>)}
                    </select>
                  </div>
                </>
              )}
              {editingTeam && (
                <div className={styles.formGroup}>
                  <label>Status</label>
                  <select name="status" defaultValue={editingTeam.status}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              )}
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowTeamModal(false)} className={styles.cancelButton}>Cancel</button>
                <button type="submit" className={styles.primaryButton} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save Team'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
