import { passkeyClient } from '@better-auth/passkey/client';
import { adminClient, twoFactorClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

import { ac, roles } from '@/lib/permissions';

export const authClient = createAuthClient({
  plugins: [adminClient({ ac, roles }), twoFactorClient(), passkeyClient()],
});
