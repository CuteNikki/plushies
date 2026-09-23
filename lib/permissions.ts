import { createAccessControl } from 'better-auth/plugins/access';
import { adminAc, defaultStatements } from 'better-auth/plugins/admin/access';

// Shared by the server and the client, so keep this free of server-only imports.
export const ac = createAccessControl({
  ...defaultStatements,
  plushie: ['create', 'update', 'delete'],
} as const);

export const roles = {
  /** Can do everything, including managing users and their roles. */
  admin: ac.newRole({
    ...adminAc.statements,
    plushie: ['create', 'update', 'delete'],
  }),
  /** Can add, edit and delete plushies. */
  editor: ac.newRole({ plushie: ['create', 'update', 'delete'] }),
  /** Signed in, but can only look. */
  user: ac.newRole({ plushie: [] }),
};

export type Role = keyof typeof roles;

export const roleNames = Object.keys(roles) as Role[];

export const roleLabels: Record<string, string> = {
  admin: 'Admin',
  editor: 'Editor',
  user: 'Viewer',
};

export function canEditPlushies(role: string | null | undefined) {
  return role === 'admin' || role === 'editor';
}
