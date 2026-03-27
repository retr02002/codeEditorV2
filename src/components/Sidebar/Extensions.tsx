import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    DownloadCloud, Search, CheckCircle2, Star,
    Trash2, Loader2, AlertCircle, Package, ArrowLeft
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import type { InstalledExtension } from '../../store/useEditorStore';
import {
    searchExtensions, formatDownloads, extensionId, getExtensionDetail,
} from '../../services/openVsxApi';
import type { OpenVsxExtension, OpenVsxExtensionDetail } from '../../services/openVsxApi';

// ─── Main Extensions Component ──────────────────────────────────────────────

type Tab = 'marketplace' | 'installed';
type SortBy = 'downloadCount' | 'averageRating' | 'timestamp' | 'relevance';

export const Extensions: React.FC = () => {
    const { installedExtensions, installExtension, uninstallExtension } = useEditorStore();

    const [tab, setTab] = useState<Tab>('marketplace');
    const [query, setQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortBy>('downloadCount');
    const [results, setResults] = useState<OpenVsxExtension[]>([]);
    const [totalSize, setTotalSize] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedExt, setSelectedExt] = useState<OpenVsxExtensionDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Search Open VSX
    const doSearch = useCallback(async (q: string, sort: SortBy) => {
        setLoading(true);
        setError(null);
        try {
            const data = await searchExtensions(q, { size: 30, sortBy: sort, sortOrder: 'desc' });
            setResults(data.extensions);
            setTotalSize(data.totalSize);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Search failed');
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Debounced search on query/sort change
    useEffect(() => {
        if (tab !== 'marketplace') return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(query, sortBy), 400);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query, sortBy, tab, doSearch]);

    // Load popular on mount
    useEffect(() => { doSearch('', 'downloadCount'); }, [doSearch]);

    const handleInstall = (ext: OpenVsxExtension) => {
        const entry: InstalledExtension = {
            id: extensionId(ext),
            name: ext.name,
            namespace: ext.namespace,
            displayName: ext.displayName || ext.name,
            description: ext.description || '',
            version: ext.version,
            iconUrl: ext.files?.icon,
        };
        installExtension(entry);
    };

    const handleUninstall = (id: string) => {
        uninstallExtension(id);
    };

    const isInstalled = (ext: OpenVsxExtension) =>
        installedExtensions.some(e => e.id === extensionId(ext));

    const handleShowDetail = async (ext: OpenVsxExtension) => {
        setDetailLoading(true);
        setSelectedExt(null);
        try {
            const detail = await getExtensionDetail(ext.namespace, ext.name);
            setSelectedExt(detail);
        } catch {
            // Fallback to basic data
            setSelectedExt(ext as OpenVsxExtensionDetail);
        } finally {
            setDetailLoading(false);
        }
    };

    // ─── Detail View ─────────────────────────────────────────────────────────
    if (selectedExt || detailLoading) {
        return (
            <div className="ext-panel">
                <div className="ext-header">
                    <button className="ext-back-btn" onClick={() => setSelectedExt(null)}>
                        <ArrowLeft size={14} />
                        <span>Back</span>
                    </button>
                </div>
                {detailLoading ? (
                    <div className="ext-center"><Loader2 size={20} className="ext-spin" /> Loading...</div>
                ) : selectedExt && (
                    <div className="ext-detail">
                        <div className="ext-detail-hero">
                            {selectedExt.files?.icon ? (
                                <img src={selectedExt.files.icon} alt="" className="ext-detail-icon" />
                            ) : (
                                <div className="ext-detail-icon ext-icon-placeholder">
                                    {(selectedExt.displayName || selectedExt.name).charAt(0)}
                                </div>
                            )}
                            <div className="ext-detail-meta">
                                <div className="ext-detail-name">{selectedExt.displayName || selectedExt.name}</div>
                                <div className="ext-detail-ns">{selectedExt.namespace}</div>
                                <div className="ext-detail-version">v{selectedExt.version}</div>
                            </div>
                        </div>

                        <div className="ext-detail-stats">
                            <span><DownloadCloud size={12} /> {formatDownloads(selectedExt.downloadCount)}</span>
                            {selectedExt.averageRating != null && (
                                <span><Star size={12} fill="#e3b341" color="#e3b341" /> {selectedExt.averageRating.toFixed(1)}</span>
                            )}
                            {selectedExt.verified && (
                                <span className="ext-verified"><CheckCircle2 size={12} /> Verified</span>
                            )}
                        </div>

                        <p className="ext-detail-desc">{selectedExt.description}</p>

                        {selectedExt.categories && selectedExt.categories.length > 0 && (
                            <div className="ext-detail-tags">
                                {selectedExt.categories.map(c => (
                                    <span key={c} className="ext-tag">{c}</span>
                                ))}
                            </div>
                        )}

                        {selectedExt.repository && (
                            <a href={selectedExt.repository} target="_blank" rel="noopener noreferrer" className="ext-detail-link">
                                Repository ↗
                            </a>
                        )}

                        <div className="ext-detail-actions">
                            {installedExtensions.some(e => e.id === extensionId(selectedExt)) ? (
                                <button className="ext-btn ext-btn-uninstall" onClick={() => handleUninstall(extensionId(selectedExt))}>
                                    <Trash2 size={12} /> Uninstall
                                </button>
                            ) : (
                                <button className="ext-btn ext-btn-install" onClick={() => handleInstall(selectedExt)}>
                                    <DownloadCloud size={12} /> Install
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ─── Main List View ──────────────────────────────────────────────────────
    return (
        <div className="ext-panel">
            {/* Header */}
            <div className="ext-header">
                <div className="ext-title">Extensions</div>
            </div>

            {/* Search */}
            <div className="ext-search-wrap">
                <Search size={13} className="ext-search-icon" />
                <input
                    type="text"
                    placeholder="Search Open VSX Marketplace..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="ext-search-input"
                    spellCheck={false}
                />
            </div>

            {/* Tabs */}
            <div className="ext-tabs">
                <button
                    className={`ext-tab ${tab === 'marketplace' ? 'ext-tab-active' : ''}`}
                    onClick={() => setTab('marketplace')}
                >
                    <Package size={12} /> Marketplace
                </button>
                <button
                    className={`ext-tab ${tab === 'installed' ? 'ext-tab-active' : ''}`}
                    onClick={() => setTab('installed')}
                >
                    <CheckCircle2 size={12} /> Installed
                    <span className="ext-tab-badge">{installedExtensions.length}</span>
                </button>
            </div>

            {/* Sort (marketplace only) */}
            {tab === 'marketplace' && (
                <div className="ext-sort-row">
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as SortBy)}
                        className="ext-sort-select"
                    >
                        <option value="downloadCount">Most Downloads</option>
                        <option value="averageRating">Highest Rated</option>
                        <option value="timestamp">Recently Updated</option>
                        <option value="relevance">Relevance</option>
                    </select>
                    {!loading && <span className="ext-result-count">{totalSize.toLocaleString()} results</span>}
                </div>
            )}

            {/* Content */}
            <div className="ext-list-scroll">
                {tab === 'marketplace' && (
                    <>
                        {loading && results.length === 0 && (
                            <div className="ext-center"><Loader2 size={18} className="ext-spin" /> Searching...</div>
                        )}
                        {error && (
                            <div className="ext-center ext-error"><AlertCircle size={16} /> {error}</div>
                        )}
                        {!loading && !error && results.length === 0 && (
                            <div className="ext-center">No extensions found</div>
                        )}
                        {results.map(ext => (
                            <MarketplaceItem
                                key={`${ext.namespace}.${ext.name}`}
                                ext={ext}
                                installed={isInstalled(ext)}
                                onInstall={() => handleInstall(ext)}
                                onUninstall={() => handleUninstall(extensionId(ext))}
                                onClick={() => handleShowDetail(ext)}
                            />
                        ))}
                    </>
                )}

                {tab === 'installed' && (
                    <>
                        {installedExtensions.length === 0 && (
                            <div className="ext-center">No extensions installed</div>
                        )}
                        {installedExtensions.map(ext => (
                            <InstalledItem
                                key={ext.id}
                                ext={ext}
                                onUninstall={() => handleUninstall(ext.id)}
                            />
                        ))}
                    </>
                )}
            </div>
        </div>
    );
};

// ─── Marketplace Extension Card ──────────────────────────────────────────────

const MarketplaceItem: React.FC<{
    ext: OpenVsxExtension;
    installed: boolean;
    onInstall: () => void;
    onUninstall: () => void;
    onClick: () => void;
}> = ({ ext, installed, onInstall, onUninstall, onClick }) => {
    return (
        <div className="ext-card" onClick={onClick}>
            {ext.files?.icon ? (
                <img src={ext.files.icon} alt="" className="ext-card-icon" />
            ) : (
                <div className="ext-card-icon ext-icon-placeholder">
                    {(ext.displayName || ext.name).charAt(0)}
                </div>
            )}
            <div className="ext-card-body">
                <div className="ext-card-top">
                    <span className="ext-card-name">{ext.displayName || ext.name}</span>
                    {ext.verified && <CheckCircle2 size={11} color="#3794ff" fill="rgba(55,148,255,0.2)" />}
                </div>
                <div className="ext-card-desc">{ext.description}</div>
                <div className="ext-card-footer">
                    <span className="ext-card-ns">{ext.namespace}</span>
                    <span className="ext-card-stat"><DownloadCloud size={10} /> {formatDownloads(ext.downloadCount)}</span>
                    {ext.averageRating != null && (
                        <span className="ext-card-stat"><Star size={10} fill="#e3b341" color="#e3b341" /> {ext.averageRating.toFixed(1)}</span>
                    )}
                    <div className="ext-card-action">
                        {installed ? (
                            <button className="ext-btn ext-btn-uninstall ext-btn-sm" onClick={e => { e.stopPropagation(); onUninstall(); }}>
                                <Trash2 size={10} /> Uninstall
                            </button>
                        ) : (
                            <button className="ext-btn ext-btn-install ext-btn-sm" onClick={e => { e.stopPropagation(); onInstall(); }}>
                                Install
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Installed Extension Card ────────────────────────────────────────────────

const InstalledItem: React.FC<{
    ext: InstalledExtension;
    onUninstall: () => void;
}> = ({ ext, onUninstall }) => {
    return (
        <div className="ext-card">
            {ext.iconUrl ? (
                <img src={ext.iconUrl} alt="" className="ext-card-icon" />
            ) : (
                <div className="ext-card-icon ext-icon-placeholder">
                    {ext.displayName.charAt(0)}
                </div>
            )}
            <div className="ext-card-body">
                <div className="ext-card-top">
                    <span className="ext-card-name">{ext.displayName}</span>
                </div>
                <div className="ext-card-desc">{ext.description}</div>
                <div className="ext-card-footer">
                    <span className="ext-card-ns">{ext.namespace}</span>
                    <span className="ext-card-stat">v{ext.version}</span>
                    <div className="ext-card-action">
                        <button className="ext-btn ext-btn-uninstall ext-btn-sm" onClick={onUninstall}>
                            <Trash2 size={10} /> Uninstall
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
