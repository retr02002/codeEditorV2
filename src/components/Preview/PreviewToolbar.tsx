import React, { useState } from 'react';
import { Monitor, Tablet, Smartphone, ExternalLink, ArrowLeft, ArrowRight, RotateCw, Lock, Globe } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';

export type ViewportSize = 'desktop' | 'tablet' | 'mobile';

interface Props {
    activeSize: ViewportSize;
    onSizeChange: (size: ViewportSize) => void;
    onReload: () => void;
    onNavigate: (url: string) => void;
    isExternal: boolean;
}

function normalizeUrl(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === 'localhost:3000/' || trimmed === 'about:blank') return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^localhost(:\d+)?/.test(trimmed)) return '';
    return 'https://' + trimmed;
}

export const PreviewToolbar: React.FC<Props> = ({ activeSize, onSizeChange, onReload, onNavigate, isExternal }) => {
    const { previewTabs, activePreviewTabId } = useEditorStore();
    const activeTab = previewTabs.find(t => t.id === activePreviewTabId) ?? previewTabs[0];

    // Local draft: only exists while the user is actively typing
    const [draft, setDraft] = useState<string | null>(null);
    const displayUrl = draft ?? (activeTab?.url ?? 'localhost:3000/');

    const commit = (raw: string) => {
        setDraft(null);
        onNavigate(normalizeUrl(raw));
    };

    const openInNewTab = () => {
        if (isExternal && activeTab?.url?.startsWith('http')) {
            window.open(activeTab.url, '_blank');
            return;
        }
        const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
        if (iframe && iframe.srcdoc) {
            const blob = new Blob([iframe.srcdoc], { type: 'text/html' });
            window.open(URL.createObjectURL(blob), '_blank');
        }
    };

    return (
        <div className="preview-toolbar browser-toolbar" data-tutorial-id="preview-toolbar">
            <div className="browser-nav-btns">
                <button
                    title="Back to project preview"
                    onClick={() => { if (isExternal) { setDraft(null); onNavigate(''); } }}
                >
                    <ArrowLeft size={16} />
                </button>
                <button title="Forward"><ArrowRight size={16} /></button>
                <button title="Reload" onClick={onReload}><RotateCw size={14} /></button>
            </div>

            <div className="browser-address-bar">
                {isExternal
                    ? <Globe size={12} className="lock-icon" style={{ color: '#56d364' }} />
                    : <Lock size={12} className="lock-icon" />
                }
                <input
                    type="text"
                    value={displayUrl}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            commit(draft ?? '');
                        }
                        if (e.key === 'Escape') { setDraft(null); onNavigate(''); }
                    }}
                    onFocus={e => { setDraft(e.target.value); e.target.select(); }}
                    onBlur={() => setDraft(null)}
                    className="address-url-input"
                    spellCheck={false}
                    placeholder="Enter URL or domain (e.g. google.com)"
                />
            </div>

            <div className="browser-actions">
                <div className="browser-device-toggles">
                    <button className={activeSize === 'mobile' ? 'active' : ''} onClick={() => onSizeChange('mobile')} title="Mobile (375px)">
                        <Smartphone size={14} />
                    </button>
                    <button className={activeSize === 'tablet' ? 'active' : ''} onClick={() => onSizeChange('tablet')} title="Tablet (768px)">
                        <Tablet size={14} />
                    </button>
                    <button className={activeSize === 'desktop' ? 'active' : ''} onClick={() => onSizeChange('desktop')} title="Desktop (100%)">
                        <Monitor size={14} />
                    </button>
                </div>
                <button onClick={openInNewTab} title="Open in New Tab" className="browser-open-btn">
                    <ExternalLink size={14} />
                </button>
            </div>
        </div>
    );
};
