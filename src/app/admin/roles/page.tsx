"use client";

import React, { useState, useEffect } from 'react';
import styles from './roles.module.css';
import { Shield, Key, Edit, Plus, Trash, CheckSquare, Square, Users } from 'lucide-react';

interface Role {
  id: string;
  code: string;
  name: string;
  description: string;
  parentRoleId: string | null;
  delegationLevel: number;
  permissions: { permission: Permission }[];
  _count: { userRoles: number };
}

interface Permission {
  id: string;
  module: string;
  resource: string;
  action: string;
  permissionKey: string;
  description: string;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState({ code: '', name: '', description: '', parentRoleId: '', delegationLevel: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetch('/api/admin/roles'),
        fetch('/api/admin/permissions')
      ]);
      const rolesData = await rolesRes.json();
      const permsData = await permsRes.json();
      
      if (rolesData.data) setRoles(rolesData.data);
      if (permsData.data) setPermissions(permsData.data);
    } catch (err) {
      console.error('Failed to load data', err);
      setError('Unable to load roles and permissions. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setError('');
    setModalMode('create');
    setFormData({ code: '', name: '', description: '', parentRoleId: '', delegationLevel: 0 });
    setIsModalOpen(true);
  };

  const openEditModal = (role: Role) => {
    setError('');
    setModalMode('edit');
    setFormData({
      code: role.code,
      name: role.name,
      description: role.description || '',
      parentRoleId: role.parentRoleId || '',
      delegationLevel: role.delegationLevel
    });
    setIsModalOpen(true);
  };

  const handleSaveRole = async () => {
    setSubmitting(true);
    try {
      const url = modalMode === 'create' ? '/api/admin/roles' : `/api/admin/roles/${selectedRole?.id}`;
      const method = modalMode === 'create' ? 'POST' : 'PATCH';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) {
        const error = await res.json();
        setError(error.error || 'Failed to save role.');
        return;
      }
      
      await fetchData();
      setIsModalOpen(false);
      
      if (modalMode === 'edit' && selectedRole) {
        // Refresh selected role
        const updated = await fetch(`/api/admin/roles/${selectedRole.id}`).then(r => r.json());
        if (updated.data) setSelectedRole(updated.data);
      }
    } catch (err) {
      console.error(err);
      setError('Unable to save the role. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role._count.userRoles > 0) {
      alert('Cannot delete role with assigned users. Reassign them first.');
      return;
    }
    
    if (confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
      try {
        const res = await fetch(`/api/admin/roles/${role.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete');
        
        setRoles(roles.filter(r => r.id !== role.id));
        if (selectedRole?.id === role.id) setSelectedRole(null);
      } catch (err) {
        console.error(err);
        alert('Failed to delete role');
      }
    }
  };

  const handleTogglePermission = async (permId: string) => {
    if (!selectedRole) return;
    
    const currentPerms = selectedRole.permissions.map(p => p.permission.id);
    const hasPerm = currentPerms.includes(permId);
    const newPerms = hasPerm 
      ? currentPerms.filter(id => id !== permId)
      : [...currentPerms, permId];
      
    // Optimistic update
    const updatedSelectedRole = {
      ...selectedRole,
      permissions: newPerms.map(id => {
        const permObj = permissions.find(p => p.id === id);
        return { permission: permObj as Permission };
      })
    };
    setSelectedRole(updatedSelectedRole);

    try {
      const res = await fetch(`/api/admin/roles/${selectedRole.id}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissionIds: newPerms })
      });
      
      if (!res.ok) throw new Error('Failed to save permissions');
      fetchData(); // Sync silently
    } catch (err) {
      console.error(err);
      setError('Unable to save the permission change. Please try again.');
      // Revert optimistic update
      setSelectedRole(selectedRole);
    }
  };

  // Group permissions by module
  const permsByModule = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (loading && roles.length === 0) {
    return <div className={styles.container}>Loading Roles...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Role & Permission Management</h1>
          <p className={styles.subtitle}>Define dynamic RBAC roles, manage delegations, and assign granular permissions.</p>
        </div>
        <button className={styles.createBtn} onClick={openCreateModal}>
          <Plus size={20} /> Create Role
        </button>
      </header>

      {error && <p className={styles.feedbackError} role="alert">{error}</p>}

      <div className={styles.grid}>
        <div className={styles.roleList}>
          {roles.map(role => (
            <button
              type="button"
              key={role.id} 
              className={`${styles.roleCard} ${selectedRole?.id === role.id ? styles.active : ''}`}
              onClick={() => setSelectedRole(role)}
              aria-pressed={selectedRole?.id === role.id}
            >
              <div className={styles.roleHeader}>
                <span className={styles.roleName}>{role.name}</span>
                <span className={styles.roleBadge}>{role.code}</span>
              </div>
              <p className={styles.roleDesc}>{role.description}</p>
              <div className={styles.roleStats}>
                <span className={styles.stat}><Users size={14} /> {role._count.userRoles} users</span>
                <span className={styles.stat}><Key size={14} /> {role.permissions.length} perms</span>
              </div>
            </button>
          ))}
        </div>

        <div className={styles.detailsPanel}>
          {selectedRole ? (
            <>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>{selectedRole.name}</h2>
                  <p className={styles.subtitle}>{selectedRole.description}</p>
                </div>
                <div className={styles.panelActions}>
                  <button className={styles.actionBtn} onClick={() => openEditModal(selectedRole)} title="Edit Role">
                    <Edit size={18} />
                  </button>
                  <button 
                    className={`${styles.actionBtn} ${styles.danger}`} 
                    onClick={() => handleDeleteRole(selectedRole)}
                    title="Delete Role"
                  >
                    <Trash size={18} />
                  </button>
                </div>
              </div>

              <h3 className={styles.sectionTitle}><Shield size={20} /> Assigned Permissions</h3>
              
              <div className={styles.modulesGrid}>
                {Object.keys(permsByModule).map(module => (
                  <div key={module} className={styles.moduleSection}>
                    <div className={styles.moduleHeader}>
                      {module} Module
                    </div>
                    <div className={styles.permissionList}>
                      {permsByModule[module].map(perm => {
                        const isAssigned = selectedRole.permissions.some(rp => rp.permission.id === perm.id);
                        return (
                          <button
                            type="button"
                            key={perm.id} 
                            className={styles.permissionItem}
                            onClick={() => handleTogglePermission(perm.id)}
                            aria-pressed={isAssigned}
                            aria-label={`${isAssigned ? 'Revoke' : 'Assign'} ${perm.permissionKey}`}
                          >
                            <span className={styles.checkbox}>
                              {isAssigned ? <CheckSquare size={18} /> : <Square size={18} />}
                            </span>
                            <span className={styles.permissionInfo}>
                              <span className={styles.permissionName}>{perm.permissionKey}</span>
                              <span className={styles.permissionDesc}>{perm.description || perm.action}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
              <Shield size={64} style={{ marginBottom: '1rem', opacity: 0.2 }} />
              <p>Select a role from the list to manage its permissions.</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="role-form-title">
            <h2 id="role-form-title" className={styles.modalTitle}>{modalMode === 'create' ? 'Create New Role' : 'Edit Role'}</h2>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Role Name</label>
              <input 
                className={styles.input} 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })} 
                placeholder="e.g. Department Manager"
              />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Role Code</label>
              <input 
                className={styles.input} 
                value={formData.code} 
                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} 
                placeholder="e.g. DEPT_MANAGER"
              />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Description</label>
              <input 
                className={styles.input} 
                value={formData.description} 
                onChange={e => setFormData({ ...formData, description: e.target.value })} 
              />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Parent Role (Inheritance)</label>
              <select 
                className={styles.input}
                value={formData.parentRoleId}
                onChange={e => setFormData({ ...formData, parentRoleId: e.target.value })}
              >
                <option value="">-- No Parent Role --</option>
                {roles.filter(r => r.id !== selectedRole?.id).map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Delegation Level (Higher can assign lower)</label>
              <input 
                type="number"
                className={styles.input} 
                value={formData.delegationLevel} 
                onChange={e => setFormData({ ...formData, delegationLevel: parseInt(e.target.value) || 0 })} 
              />
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button 
                className={styles.saveBtn} 
                onClick={handleSaveRole}
                disabled={!formData.name || !formData.code || submitting}
              >
                {submitting ? 'Saving...' : 'Save Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
