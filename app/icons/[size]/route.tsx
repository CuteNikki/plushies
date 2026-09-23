import { notFound } from 'next/navigation';

import { appIcon } from '@/lib/brand-image';

/** The PNG sizes the web app manifest asks for. */
const sizes = ['192', '512'];

export const dynamicParams = false;

export function generateStaticParams() {
  return sizes.map((size) => ({ size }));
}

export async function GET(
  _request: Request,
  { params }: RouteContext<'/icons/[size]'>
) {
  const { size } = await params;
  if (!sizes.includes(size)) notFound();
  return appIcon(Number(size));
}
