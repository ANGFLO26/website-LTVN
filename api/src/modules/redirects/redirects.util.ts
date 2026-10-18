/* oxlint-disable no-control-regex */
import { BadRequestException } from '@nestjs/common';

/**
 * Reserved paths that must NEVER be redirected or targeted as destination
 * to prevent breaking the API, Admin portal, crawler discovery, or static assets.
 */
export const RESERVED_PATH_PREFIXES = [
  '/api',
  '/admin',
  '/assets',
  '/images',
] as const;

export const RESERVED_EXACT_PATHS = [
  '/',
  '/robots.txt',
  '/sitemap.xml',
  '/favicon.ico',
  '/index.html',
] as const;

/**
 * Normalizes a URL path for redirects:
 * - Trims whitespace
 * - Checks for control characters and backslashes
 * - Blocks open redirect vectors (protocol-relative //, schemes like http:, javascript:, data:)
 * - Enforces starting slash
 * - Collapses redundant slashes (/a//b -> /a/b)
 * - Preserves slug case, matching public routes exactly
 * - Removes trailing slash (unless root /)
 * - Decodes one URI component layer and rejects ambiguous encoded separators
 * - Rejects query strings and fragments in configured paths
 */
export function normalizeRedirectPath(rawPath: string): string {
  if (!rawPath || typeof rawPath !== 'string') {
    throw new BadRequestException('Đường dẫn không được để trống.');
  }

  const trimmed = rawPath.trim();

  if (!trimmed) {
    throw new BadRequestException('Đường dẫn không được để trống.');
  }

  // Control characters check
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    throw new BadRequestException('Đường dẫn chứa ký tự điều khiển không hợp lệ.');
  }

  // Backslash check (prevent Windows/IIS bypass and open redirect tricks like /\evil.com)
  if (trimmed.includes('\\')) {
    throw new BadRequestException('Đường dẫn không được chứa ký tự gạch chéo ngược (\\).');
  }

  // Protocol-relative check (//evil.com)
  if (trimmed.startsWith('//')) {
    throw new BadRequestException('Không cho phép đường dẫn giao thức tương đối (//).');
  }

  // Dangerous or external URI schemes (http:, https:, javascript:, data:, etc.)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    throw new BadRequestException('Chỉ cho phép đường dẫn nội bộ (bắt đầu bằng /). Không cho phép URL bên ngoài.');
  }

  // Must begin with a single slash
  if (!trimmed.startsWith('/')) {
    throw new BadRequestException('Đường dẫn phải bắt đầu bằng dấu gạch chéo (/): ví dụ /duong-dan-cu');
  }

  if (/[?#]/.test(trimmed)) {
    throw new BadRequestException('Đường dẫn cấu hình không được chứa query hoặc fragment.');
  }

  // A decoded slash/backslash can change authority or route boundaries. Reject it,
  // including a second encoded layer, rather than storing an ambiguous mapping.
  if (/%(?:2f|5c)/i.test(trimmed)) {
    throw new BadRequestException('Đường dẫn chứa dấu phân cách được mã hóa không hợp lệ.');
  }

  let pathname: string;
  try {
    pathname = decodeURIComponent(trimmed).normalize('NFC');
  } catch {
    throw new BadRequestException('Đường dẫn chứa URL encoding không hợp lệ.');
  }
  if (/[\x00-\x1F\x7F\\?#]/.test(pathname) || /%[0-9a-f]{2}/i.test(pathname)) {
    throw new BadRequestException('Đường dẫn chứa ký tự hoặc URL encoding không hợp lệ.');
  }
  if (pathname.startsWith('//')) {
    throw new BadRequestException('Không cho phép đường dẫn giao thức tương đối (//).');
  }

  // Collapse consecutive slashes
  pathname = pathname.replace(/\/+/g, '/');

  // Remove trailing slash if length > 1
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  return pathname;
}

/**
 * Checks whether a normalized path is reserved by system routing.
 */
export function isReservedPath(pathname: string): boolean {
  const route = pathname.toLowerCase();
  if (RESERVED_EXACT_PATHS.includes(route as any)) {
    return true;
  }
  for (const prefix of RESERVED_PATH_PREFIXES) {
    if (route === prefix || route.startsWith(prefix + '/')) {
      return true;
    }
  }
  return false;
}

/**
 * Validates and normalizes source and destination paths together.
 */
export function validateRedirectPaths(
  rawSource: string,
  rawDestination: string,
): { sourcePath: string; destinationPath: string } {
  const sourcePath = normalizeRedirectPath(rawSource);
  const destinationPath = normalizeRedirectPath(rawDestination);

  // 1. Reserved path checks
  if (isReservedPath(sourcePath)) {
    throw new BadRequestException(
      `Đường dẫn nguồn "${sourcePath}" là đường dẫn hệ thống được bảo vệ, không thể chuyển hướng.`
    );
  }
  if (destinationPath !== '/' && isReservedPath(destinationPath)) {
    throw new BadRequestException(
      `Đường dẫn đích "${destinationPath}" là đường dẫn hệ thống được bảo vệ.`
    );
  }
  if (sourcePath === '/') {
    throw new BadRequestException('Không thể chuyển hướng trang chủ (/).');
  }

  // 2. Self-redirect check
  if (sourcePath === destinationPath) {
    throw new BadRequestException(
      'Không thể chuyển hướng một đường dẫn về chính nó (Self-redirect).'
    );
  }

  return { sourcePath, destinationPath };
}

export interface ExistingRedirectItem {
  id?: string;
  sourcePath: string;
  destinationPath: string;
  isActive: boolean;
}

/**
 * Checks for redirect cycles and multi-hop chains:
 * - A -> A (already caught by self-redirect)
 * - A -> B -> A (2-node loop)
 * - A -> B -> C -> A (multi-node cycle)
 * - A -> B, B -> C (chaining prevention)
 */
export function detectCycleOrLoop(
  newSource: string,
  newDestination: string,
  activeRedirects: ExistingRedirectItem[],
  currentId?: string,
): void {
  // Filter out the record being edited and inactive records
  const graph = new Map<string, string>();
  for (const r of activeRedirects) {
    if (currentId && r.id === currentId) continue;
    if (!r.isActive) continue;
    graph.set(r.sourcePath, r.destinationPath);
  }

  // Check 1: Chaining prevention (newDestination is already a source of an active redirect)
  if (graph.has(newDestination)) {
    const nextHop = graph.get(newDestination);
    throw new BadRequestException(
      `Đường dẫn đích "${newDestination}" hiện đang là nguồn chuyển hướng tới "${nextHop}". Vui lòng trỏ trực tiếp đến URL cuối cùng để tránh tạo chuỗi chuyển hướng (Redirect chain).`
    );
  }

  // Check 2: Chaining prevention (another active redirect already points to newSource)
  for (const [s, d] of graph.entries()) {
    if (d === newSource) {
      throw new BadRequestException(
        `Đường dẫn "${s}" hiện đang chuyển hướng tới "${newSource}". Vui lòng cập nhật đường dẫn đó trước để tránh tạo chuỗi chuyển hướng (Redirect chain).`
      );
    }
  }

  // Check 3: Cycle detection (add new edge and traverse from destination)
  graph.set(newSource, newDestination);

  const visited = new Set<string>();
  let curr: string | undefined = newDestination;
  const path = [newSource, newDestination];

  while (curr && graph.has(curr)) {
    if (visited.has(curr) || curr === newSource) {
      throw new BadRequestException(
        `Phát hiện vòng lặp chuyển hướng (Redirect loop): ${path.join(' -> ')} -> ${curr}.`
      );
    }
    visited.add(curr);
    curr = graph.get(curr);
    if (curr) {
      path.push(curr);
    }
    if (path.length > 20) {
      throw new BadRequestException('Phát hiện chuỗi chuyển hướng quá dài hoặc tiềm ẩn vòng lặp.');
    }
  }
}
