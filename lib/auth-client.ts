import { adminClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

import { ac, roles } from '@/lib/permissions';

export const authClient = createAuthClient({
  plugins: [adminClient({ ac, roles })],
});
