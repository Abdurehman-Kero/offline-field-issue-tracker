import { useState, useEffect } from 'react';
import { Role } from '../shared/constants';

export function useRole() {
  const [role, setRole] = useState<Role>(() => {
    const saved = localStorage.getItem('user_role');
    return (saved === 'coordinator' ? 'coordinator' : 'field_worker') as Role;
  });

  const switchRole = (newRole: Role) => {
    setRole(newRole);
    localStorage.setItem('user_role', newRole);
    window.dispatchEvent(new CustomEvent('role_changed', { detail: { role: newRole } }));
  };

  useEffect(() => {
    const handleRoleChanged = (e: any) => {
      if (e.detail?.role && e.detail.role !== role) {
        setRole(e.detail.role);
      }
    };
    window.addEventListener('role_changed', handleRoleChanged);
    return () => window.removeEventListener('role_changed', handleRoleChanged);
  }, [role]);

  return { role, switchRole };
}
