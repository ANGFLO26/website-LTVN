import { isIP } from 'node:net';

/** Explicitly trusted immediate proxies. Hop counts and blanket trust permit XFF spoofing. */
export function resolveTrustProxy(raw: unknown): false | string[] {
  if (raw === undefined || raw === null || raw === '' || raw === 'false') return false;
  if (typeof raw !== 'string') throw new Error('TRUST_PROXY must be false, loopback, or trusted IP/CIDR values');

  const proxies = raw.split(',').map((value) => value.trim());
  if (proxies.some((value) => !value)) {
    throw new Error('TRUST_PROXY contains an empty proxy entry');
  }
  for (const proxy of proxies) {
    if (proxy === 'loopback') continue;
    const [address, prefix, ...extra] = proxy.split('/');
    const family = isIP(address);
    if (!family || extra.length > 0 ||
        (prefix !== undefined && (!/^\d+$/.test(prefix) || Number(prefix) === 0 || Number(prefix) > (family === 4 ? 32 : 128)))) {
      throw new Error('TRUST_PROXY must contain only loopback or exact trusted IP/CIDR values');
    }
  }
  return proxies;
}
