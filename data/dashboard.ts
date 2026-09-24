import 'server-only';

import { ActivitySubject } from '@/lib/activity';
import { db } from '@/lib/db';
import { Role } from '@/lib/permissions';

/**
 * The counts on the dashboard overview. They run in parallel, so together
 * they cost about one round trip to the database.
 */
export async function getDashboardStats({ admin }: { admin: boolean }) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [plushies, thumbnails, galleryPhotos, roles, recentChanges] =
    await Promise.all([
      db.plushie.count(),
      db.plushie.count({ where: { thumbnailKey: { not: null } } }),
      db.plushieImage.count(),
      admin
        ? db.user.groupBy({ by: ['role'], _count: true })
        : Promise.resolve([]),
      // Editors only see plushie changes on the activity page.
      db.activity.count({
        where: {
          createdAt: { gte: weekAgo },
          subject: admin ? undefined : ActivitySubject.PLUSHIE,
        },
      }),
    ]);
  const withRole = (role: Role) =>
    roles.find((row) => row.role === role)?._count ?? 0;

  return {
    plushies,
    photos: thumbnails + galleryPhotos,
    recentChanges,
    users: admin
      ? {
          total: roles.reduce((sum, row) => sum + row._count, 0),
          admins: withRole(Role.ADMIN),
          editors: withRole(Role.EDITOR),
        }
      : null,
  };
}
