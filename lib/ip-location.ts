import 'server-only';

import { BlockList, isIP } from 'node:net';

export type IpLocation = {
  /** e.g. 'Germany' */
  country: string;
  /** Network provider, e.g. 'Deutsche Telekom AG' */
  provider: string | null;
};

/** Addresses that don't point to a place: local, private and reserved. */
const notPublic = new BlockList();
notPublic.addSubnet('0.0.0.0', 8, 'ipv4');
notPublic.addSubnet('10.0.0.0', 8, 'ipv4');
notPublic.addSubnet('100.64.0.0', 10, 'ipv4');
notPublic.addSubnet('127.0.0.0', 8, 'ipv4');
notPublic.addSubnet('169.254.0.0', 16, 'ipv4');
notPublic.addSubnet('172.16.0.0', 12, 'ipv4');
notPublic.addSubnet('192.168.0.0', 16, 'ipv4');
notPublic.addAddress('::', 'ipv6');
notPublic.addAddress('::1', 'ipv6');
notPublic.addSubnet('fc00::', 7, 'ipv6');
notPublic.addSubnet('fe80::', 10, 'ipv6');

/**
 * Looks up the country and network provider of an IP address with IPinfo
 * Lite. Each address is fetched at most once a week, and local or private
 * addresses are never sent. Returns null without an IPINFO_TOKEN, or when
 * the lookup fails.
 */
export async function getIpLocation(
  ip: string | null | undefined
): Promise<IpLocation | null> {
  const token = process.env.IPINFO_TOKEN;
  const version = ip ? isIP(ip) : 0;
  if (!token || !ip || !version) return null;
  if (notPublic.check(ip, version === 4 ? 'ipv4' : 'ipv6')) return null;

  try {
    const response = await fetch(
      `https://api.ipinfo.io/lite/${encodeURIComponent(ip)}?token=${token}`,
      { next: { revalidate: 60 * 60 * 24 * 7 } }
    );
    if (!response.ok) return null;
    const data: { country?: string; as_name?: string } = await response.json();
    if (!data.country) return null;
    return { country: data.country, provider: data.as_name ?? null };
  } catch {
    return null;
  }
}
