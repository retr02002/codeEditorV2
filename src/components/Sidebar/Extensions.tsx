import React, { useState } from 'react';
import { ChevronDown, ChevronRight, DownloadCloud, Search, CheckCircle2, Star, Filter, Trash2 } from 'lucide-react';

interface Ext {
    id: string; name: string; author: string; description: string;
    installed: boolean; recommended?: boolean; downloads: string; rating: number; verified?: boolean;
}

const initialExtensions: Ext[] = [
    { id: 'emmet', name: 'Emmet', author: 'Emmet', description: 'HTML/CSS abbreviations: type "div.box>p" and expand to full tags instantly.', installed: true, downloads: '12.4M', rating: 4.8, verified: true },
    { id: 'prettier', name: 'Prettier - Code formatter', author: 'Prettier', description: 'Auto-format HTML, CSS, JS & TS with Shift+Alt+F. Keeps your code clean.', installed: false, recommended: true, downloads: '38.2M', rating: 4.5, verified: true },
    { id: 'python', name: 'Python', author: 'Microsoft', description: 'Python IntelliSense: snippets for def, class, for, import, list comprehensions, etc.', installed: false, recommended: true, downloads: '100M+', rating: 4.5, verified: true },
    { id: 'angular', name: 'Angular Language Service', author: 'Angular', description: 'Angular directives: *ngIf, *ngFor, [(ngModel)], [ngClass], @Component and more.', installed: false, recommended: true, downloads: '4.8M', rating: 4.5, verified: true },
    { id: 'bootstrap-snippets', name: 'Bootstrap 5 Snippets', author: 'HansUXdev', description: 'Bootstrap 5 HTML snippets: cards, navbars, modals, alerts, tables and more.', installed: false, recommended: true, downloads: '2.1M', rating: 4.5, verified: true },
    { id: 'dracula', name: 'Dracula Official', author: 'Dracula Theme', description: 'Official Dracula dark theme. Select it via the Editor Settings dropdown.', installed: true, downloads: '5.9M', rating: 5, verified: true },
    { id: 'night-owl', name: 'Night Owl', author: 'sarah.drasner', description: 'A VS Code dark theme tuned for night owls. Select it via Editor Settings.', installed: false, downloads: '3.0M', rating: 5, verified: true },
    { id: 'nord', name: 'Nord', author: 'arcticicestudio', description: 'Arctic, north-bluish color palette. Select it via Editor Settings dropdown.', installed: false, downloads: '1.5M', rating: 4.5, verified: true },
];

import { useEditorStore } from '../../store/useEditorStore';

export const Extensions: React.FC = () => {
    const { installedExtensions, toggleExtension } = useEditorStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [installedOpen, setInstalledOpen] = useState(true);
    const [recommendedOpen, setRecommendedOpen] = useState(true);

    const extensions = initialExtensions.map(ext => ({
        ...ext,
        installed: installedExtensions.includes(ext.id)
    }));

    const handleToggleInstall = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        toggleExtension(id);
    };

    const filtered = extensions.filter(ext =>
        ext.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ext.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ext.author.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const installed = filtered.filter(e => e.installed);
    const recommended = filtered.filter(e => !e.installed && e.recommended).concat(filtered.filter(e => !e.installed && !e.recommended));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#181818', color: '#ccc' }}>
            {/* Header + Search */}
            <div style={{ padding: '10px 14px 6px' }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', marginBottom: 10, color: '#ccc', letterSpacing: 0.5 }}>Extensions</div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={14} style={{ position: 'absolute', left: 6, color: '#888' }} />
                    <input
                        type="text"
                        placeholder="Search Extensions in Marketplace"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%', padding: '4px 28px', backgroundColor: '#3c3c3c',
                            border: '1px solid transparent', color: '#fff', borderRadius: 2, fontSize: 12, outline: 'none'
                        }}
                        onFocus={(e) => e.target.style.border = '1px solid #007fd4'}
                        onBlur={(e) => e.target.style.border = '1px solid transparent'}
                        spellCheck={false}
                    />
                    <Filter size={14} style={{ position: 'absolute', right: 6, color: '#888', cursor: 'pointer' }} />
                </div>
            </div>

            {/* Lists Container */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {/* INSTALLED */}
                {installed.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                        <div
                            style={{ display: 'flex', alignItems: 'center', padding: '4px 2px', cursor: 'pointer', fontSize: 11, fontWeight: 'bold' }}
                            onClick={() => setInstalledOpen(!installedOpen)}
                        >
                            {installedOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span style={{ marginLeft: 2, textTransform: 'uppercase' }}>Installed</span>
                            <span style={{ marginLeft: 8, padding: '1px 6px', backgroundColor: '#333', borderRadius: 10, fontSize: 10, fontWeight: 'normal' }}>{installed.length}</span>
                        </div>
                        {installedOpen && installed.map(ext => <ExtensionItem key={ext.id} ext={ext} onToggle={handleToggleInstall} />)}
                    </div>
                )}

                {/* RECOMMENDED */}
                {recommended.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                        <div
                            style={{ display: 'flex', alignItems: 'center', padding: '4px 2px', cursor: 'pointer', fontSize: 11, fontWeight: 'bold' }}
                            onClick={() => setRecommendedOpen(!recommendedOpen)}
                        >
                            {recommendedOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span style={{ marginLeft: 2, textTransform: 'uppercase' }}>Recommended</span>
                            <span style={{ marginLeft: 8, padding: '1px 6px', backgroundColor: '#333', borderRadius: 10, fontSize: 10, fontWeight: 'normal' }}>{recommended.length}</span>
                        </div>
                        {recommendedOpen && recommended.map(ext => <ExtensionItem key={ext.id} ext={ext} onToggle={handleToggleInstall} />)}
                    </div>
                )}
            </div>
        </div>
    );
};

const ExtensionItem: React.FC<{ ext: Ext, onToggle: (id: string, e?: React.MouseEvent) => void }> = ({ ext, onToggle }) => {
    const [hovered, setHovered] = useState(false);

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex', padding: '8px 14px', cursor: 'pointer',
                backgroundColor: hovered ? '#2a2d2e' : 'transparent',
                position: 'relative'
            }}
        >
            <div style={{ width: 44, height: 44, backgroundColor: '#333', marginRight: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 0, padding: 4, overflow: 'hidden' }}>
                <span style={{ fontSize: 24, fontWeight: 'bold', color: '#58a6ff' }}>{ext.name.charAt(0)}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <span style={{ color: '#fff', fontSize: 13, fontWeight: 500, marginRight: 4 }}>{ext.name}</span>
                        {ext.verified && <CheckCircle2 size={12} color="#3794ff" fill="rgba(55, 148, 255, 0.2)" style={{ flexShrink: 0 }} />}
                    </div>
                </div>

                <div style={{ fontSize: 12, color: '#aaa', margin: '2px 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ext.description}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', fontSize: 11, color: '#888', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{ext.author}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><DownloadCloud size={10} /> {ext.downloads}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Star size={10} fill={ext.rating >= 4 ? "#888" : "none"} /></span>
                    </div>

                    {!ext.installed ? (
                        <button
                            onClick={(e) => onToggle(ext.id, e)}
                            style={{
                                backgroundColor: '#0e639c', color: '#ffffff', border: 'none', padding: '3px 10px',
                                fontSize: 11, borderRadius: 2, cursor: 'pointer', outline: 'none'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1177bb'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0e639c'}
                        >
                            Install
                        </button>
                    ) : (
                        <button
                            onClick={(e) => onToggle(ext.id, e)}
                            title="Uninstall extension"
                            style={{
                                backgroundColor: 'transparent', color: '#cc6666', border: '1px solid #cc6666',
                                padding: '2px 8px', fontSize: 11, borderRadius: 2, cursor: 'pointer',
                                outline: 'none', display: 'flex', alignItems: 'center', gap: 4
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(204,102,102,0.15)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                            <Trash2 size={11} /> Uninstall
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
