import React, { useRef, useState, useCallback, useEffect } from 'react';
import { X, Maximize2, Minimize2, RotateCw, Globe, Lock, ArrowLeft, Monitor, Tablet, Smartphone, Terminal } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { IframeRenderer } from './IframeRenderer';

type ViewportSize = 'desktop' | 'tablet' | 'mobile';

interface Props {
    windowId: string;
    tabId: string;
    initialX: number;
    initialY: number;
}

function normalizeUrl(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === 'localhost:3000/' || trimmed === 'about:blank') return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^localhost(:\d+)?/.test(trimmed)) return '';
    return 'https://' + trimmed;
}

function showToast(msg: string) {
    const tip = document.createElement('div');
    tip.textContent = msg;
    tip.style.cssText = 'position:fixed;bottom:60px;right:24px;background:#1e1e2e;color:#f38ba8;border:1px solid #f38ba8;border-radius:6px;padding:6px 12px;font-size:12px;z-index:9999;pointer-events:none;box-shadow:0 4px 12px rgba(0,0,0,0.5);';
    document.body.appendChild(tip);
    setTimeout(() => tip.remove(), 2500);
}

export const FloatingPreview: React.FC<Props> = ({ windowId, tabId, initialX, initialY }) => {
    const { closeFloatingWindow, previewTabs } = useEditorStore();

    // Unique iframe id per window instance
    const iframeId = `preview-iframe-${windowId}`;

    const tab = previewTabs.find(t => t.id === tabId);
    const tabUrl = tab?.url ?? null;
    const tabLabel = tab?.label ?? 'Preview';

    const [pos, setPos] = useState({ x: initialX, y: initialY });
    const [size, setSize] = useState({ w: 680, h: 480 });
    const [isMaximized, setIsMaximized] = useState(false);
    const [activeSize, setActiveSize] = useState<ViewportSize>('desktop');
    const [reloadKey, setReloadKey] = useState(0);
    const [externalUrl, setExternalUrl] = useState<string | null>(tabUrl);
    const [draft, setDraft] = useState<string | null>(null);

    // Sync when the tab's URL changes from the panel
    useEffect(() => {
        setExternalUrl(tabUrl);
    }, [tabUrl]);

    const displayUrl = draft ?? (externalUrl ?? 'localhost:3000/');

    const commit = (raw: string) => {
        setDraft(null);
        const normalized = normalizeUrl(raw);
        setExternalUrl(normalized || null);
    };

    const getFrameWidth = () => {
        if (activeSize === 'mobile') return '375px';
        if (activeSize === 'tablet') return '768px';
        return '100%';
    };

    const close = useCallback(() => closeFloatingWindow(windowId), [closeFloatingWindow, windowId]);

    const toggleDevTools = () => {
        if (externalUrl) {
            showToast('DevTools unavailable for external sites');
            return;
        }
        const iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
        iframe?.contentWindow?.postMessage('TOGGLE_ERUDA', '*');
    };

    // ─── Drag ────────────────────────────────────────────────────────────────────
    const dragging = useRef(false);
    const dragOrigin = useRef({ mx: 0, my: 0, px: 0, py: 0 });

    const onTitleMouseDown = useCallback((e: React.MouseEvent) => {
        if (isMaximized) return;
        e.preventDefault();
        dragging.current = true;
        dragOrigin.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
        const onMove = (ev: MouseEvent) => {
            if (!dragging.current) return;
            setPos({
                x: Math.max(0, dragOrigin.current.px + ev.clientX - dragOrigin.current.mx),
                y: Math.max(0, dragOrigin.current.py + ev.clientY - dragOrigin.current.my),
            });
        };
        const onUp = () => {
            dragging.current = false;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [isMaximized, pos]);

    // ─── Resize ──────────────────────────────────────────────────────────────────
    const resizing = useRef(false);
    const resizeOrigin = useRef({ mx: 0, my: 0, w: 0, h: 0 });

    const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        resizing.current = true;
        resizeOrigin.current = { mx: e.clientX, my: e.clientY, w: size.w, h: size.h };
        const onMove = (ev: MouseEvent) => {
            if (!resizing.current) return;
            setSize({
                w: Math.max(340, resizeOrigin.current.w + (ev.clientX - resizeOrigin.current.mx)),
                h: Math.max(260, resizeOrigin.current.h + (ev.clientY - resizeOrigin.current.my)),
            });
        };
        const onUp = () => {
            resizing.current = false;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [size]);

    // Escape → close
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [close]);

    const windowStyle: React.CSSProperties = isMaximized
        ? { position: 'fixed', inset: 0, width: '100vw', height: '100vh', borderRadius: 0, zIndex: 1000 }
        : { position: 'fixed', left: pos.x, top: pos.y, width: size.w, height: size.h, zIndex: 1000 };

    return (
        <div className="floating-preview-window" style={windowStyle}>
            {/* ── Title bar ── */}
            <div className="floating-preview-titlebar" onMouseDown={onTitleMouseDown}>
                <div className="floating-preview-titlebar-left">
                    <span className="fp-tab-dot" />
                    <span className="floating-preview-title">{tabLabel}</span>
                </div>
                <div className="floating-preview-titlebar-actions">
                    <button onClick={() => setReloadKey(k => k + 1)} title="Reload" className="fp-btn">
                        <RotateCw size={12} />
                    </button>
                    <button
                        onClick={toggleDevTools}
                        title={externalUrl ? 'DevTools unavailable for external sites' : 'Toggle DevTools'}
                        className="fp-btn"
                    >
                        <Terminal size={12} />
                    </button>
                    <button onClick={() => setIsMaximized(m => !m)} title={isMaximized ? 'Restore' : 'Maximize'} className="fp-btn">
                        {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                    </button>
                    <button onClick={close} title="Close" className="fp-btn fp-btn-close">
                        <X size={12} />
                    </button>
                </div>
            </div>

            {/* ── Toolbar: address bar + responsive device buttons ── */}
            <div className="floating-preview-toolbar">
                <button
                    className="fp-nav-btn"
                    title="Back to project preview"
                    onClick={() => { setExternalUrl(null); setDraft(null); }}
                    style={{ opacity: externalUrl ? 1 : 0.35 }}
                >
                    <ArrowLeft size={13} />
                </button>

                <div className="fp-address-bar">
                    {externalUrl
                        ? <Globe size={10} style={{ color: '#56d364', flexShrink: 0 }} />
                        : <Lock size={10} style={{ color: '#8b949e', flexShrink: 0 }} />
                    }
                    <input
                        type="text"
                        className="fp-address-input"
                        value={displayUrl}
                        placeholder="Enter URL (e.g. example.com)"
                        spellCheck={false}
                        onChange={e => setDraft(e.target.value)}
                        onFocus={e => { setDraft(e.target.value); e.target.select(); }}
                        onBlur={() => setDraft(null)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') commit(draft ?? '');
                            if (e.key === 'Escape') { setDraft(null); setExternalUrl(null); }
                        }}
                    />
                </div>

                {/* ── Responsive device toggles ── */}
                <div className="fp-device-toggles">
                    <button
                        className={`fp-device-btn ${activeSize === 'mobile' ? 'active' : ''}`}
                        onClick={() => setActiveSize('mobile')}
                        title="Mobile (375px)"
                    >
                        <Smartphone size={12} />
                    </button>
                    <button
                        className={`fp-device-btn ${activeSize === 'tablet' ? 'active' : ''}`}
                        onClick={() => setActiveSize('tablet')}
                        title="Tablet (768px)"
                    >
                        <Tablet size={12} />
                    </button>
                    <button
                        className={`fp-device-btn ${activeSize === 'desktop' ? 'active' : ''}`}
                        onClick={() => setActiveSize('desktop')}
                        title="Desktop (full)"
                    >
                        <Monitor size={12} />
                    </button>
                </div>
            </div>

            {/* ── Preview body ── */}
            <div className="floating-preview-body">
                <div className="floating-preview-viewport" style={{ width: getFrameWidth() }}>
                    {externalUrl ? (
                        <iframe
                            key={externalUrl + reloadKey}
                            src={externalUrl}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                            title={`Floating Preview — ${tabLabel}`}
                        />
                    ) : (
                        <IframeRenderer key={reloadKey} iframeId={iframeId} />
                    )}
                </div>
            </div>

            {/* ── Resize handle ── */}
            {!isMaximized && (
                <div className="floating-preview-resize" onMouseDown={onResizeMouseDown} title="Resize" />
            )}
        </div>
    );
};
