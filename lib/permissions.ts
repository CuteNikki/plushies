import { createAccessControl } from 'better-auth/plugins/access';
import { defaultStatements } from 'better-auth/plugins/admin/access';

// The generated enum is a plain object, safe to use in the browser too.
import { Role } from '@/lib/generated/prisma/enums';

export { Role };

// Shared by the server and the client, so keep this free of server-only imports.
export const ac = createAccessControl({
  ...defaultStatements,
  plushie: ['create', 'update', 'delete'],
} as const);

/**
 * Better Auth's roles, named exactly like the Role enum in the database so
 * the role it stores is always one the database accepts.
 */
export const roles = {
  /**
   * Can do everything, including managing users and their roles. Better Auth
   * serves every admin endpoint whether the site uses it or not, so admins
   * only get what the site offers: no creating users, setting their
   * passwords or emails, or editing them otherwise. Bans go through the
   * site's own actions (lib/bans.ts), which record who banned and never
   * ban admins, so Better Auth's ban endpoints are off too.
   */
  [Role.ADMIN]: ac.newRole({
    user: ['set-role', 'impersonate', 'delete'],
    session: ['revoke'],
    plushie: ['create', 'update', 'delete'],
  }),
  /** Can add, edit and delete plushies. */
  [Role.EDITOR]: ac.newRole({ plushie: ['create', 'update', 'delete'] }),
  /** Signed in, but can only look. */
  [Role.USER]: ac.newRole({ plushie: [] }),
} satisfies Record<Role, unknown>;

export const roleNames = Object.values(Role);

export const roleLabels: Record<Role, string> = {
  ADMIN: 'Admin',
  EDITOR: 'Editor',
  USER: 'User',
};

/** Checks a role that comes from outside the type system, e.g. a form. */
export function isRole(value: unknown): value is Role {
  return roleNames.includes(value as Role);
}

export function isAdmin(role: string | null | undefined) {
  return role === Role.ADMIN;
}

export function canEditPlushies(role: string | null | undefined) {
  return role === Role.ADMIN || role === Role.EDITOR;
}

/** Shown when someone tries to change something while viewing as a user. */
export const VIEWING_AS_MESSAGE =
  "You're viewing the site as someone else, so changes are turned off.";

/** Whether an admin is viewing the site as this session's user. */
export function isViewingAs(
  session: { session: { impersonatedBy?: string | null } } | null
) {
  return !!session?.session.impersonatedBy;
}
