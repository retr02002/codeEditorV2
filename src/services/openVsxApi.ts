// ─── Open VSX Registry API Service ───────────────────────────────────────────

const BASE = '/openvsx-api/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OpenVsxExtension {
  url: string;
  name: string;
  namespace: string;
  version: string;
  displayName: string;
  description: string;
  verified: boolean;
  downloadCount: number;
  averageRating: number | null;
  reviewCount: number;
  timestamp: string;
  deprecated: boolean;
  files: {
    download?: string;
    icon?: string;
    readme?: string;
    changelog?: string;
    license?: string;
    [key: string]: string | undefined;
  };
}

export interface OpenVsxSearchResult {
  offset: number;
  totalSize: number;
  extensions: OpenVsxExtension[];
}

export interface OpenVsxExtensionDetail extends OpenVsxExtension {
  // detail endpoint returns extra fields
  categories?: string[];
  tags?: string[];
  license?: string;
  homepage?: string;
  repository?: string;
  bugs?: string;
  engines?: Record<string, string>;
  publishedBy?: {
    loginName: string;
    fullName?: string;
    avatarUrl?: string;
    homepage?: string;
  };
  dependencies?: Array<{ namespace: string; extension: string }>;
  bundledExtensions?: Array<{ namespace: string; extension: string }>;
}

// ─── API Functions ───────────────────────────────────────────────────────────

export async function searchExtensions(
  query: string = '',
  options: {
    size?: number;
    offset?: number;
    category?: string;
    sortBy?: 'relevance' | 'timestamp' | 'downloadCount' | 'averageRating';
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<OpenVsxSearchResult> {
  const {
    size = 20,
    offset = 0,
    category,
    sortBy = 'downloadCount',
    sortOrder = 'desc',
  } = options;

  const params = new URLSearchParams({
    size: String(size),
    offset: String(offset),
    sortBy,
    sortOrder,
  });

  if (query) params.set('query', query);
  if (category) params.set('category', category);

  const res = await fetch(`${BASE}/-/search?${params.toString()}`);
  if (!res.ok) throw new Error(`Open VSX search failed: ${res.status}`);
  return res.json();
}

export async function getExtensionDetail(
  namespace: string,
  name: string
): Promise<OpenVsxExtensionDetail> {
  const res = await fetch(`${BASE}/${namespace}/${name}`);
  if (!res.ok) throw new Error(`Failed to fetch extension: ${res.status}`);
  return res.json();
}

export async function getExtensionReadme(
  namespace: string,
  name: string,
  version?: string
): Promise<string> {
  const versionPath = version ? `/${version}` : '';
  const res = await fetch(
    `${BASE}/${namespace}/${name}${versionPath}/file/README.md`
  );
  if (!res.ok) return '';
  return res.text();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatDownloads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function extensionId(ext: { namespace: string; name: string }): string {
  return `${ext.namespace}.${ext.name}`;
}
