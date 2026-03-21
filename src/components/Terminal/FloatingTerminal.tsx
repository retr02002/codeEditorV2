import React, { useRef, useState, useCallback } from 'react';
import { X, Terminal } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { TerminalInstance } from './TerminalInstance';

interface Props {
    windowId: string;
    tabId: string;
    initialX: number;
    initialY: number;
}

export const FloatingTerminal: React.FC<Props> = ({ windowId, tabId, initialX, initialY }) => {
    const { closeFloatingTerminal } = useEditorStore();

    const [pos, setPos] = useState({ x: initialX, y: initialY });
    const [size, setSize] = useState({ w: 600, h: 400 });

    const close = useCallback(() => closeFloatingTerminal(windowId), [closeFloatingTerminal, windowId]);

    // ─── Drag ────────────────────────────────────────────────────────────────────
    const dragging = useRef(false);
    const dragOrigin = useRef({ mx: 0, my: 0, px: 0, py: 0 });

    const onTitleMouseDown = useCallback((e: React.MouseEvent) => {
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
    }, [pos]);

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

    const windowStyle: React.CSSProperties = { position: 'fixed', left: pos.x, top: pos.y, width: size.w, height: size.h, zIndex: 1000 };

    return (
        <div className="floating-preview-window" style={windowStyle}>
            {/* ── Title bar ── */}
            <div className="floating-preview-titlebar" onMouseDown={onTitleMouseDown}>
                <div className="floating-preview-titlebar-left">
                    <Terminal size={12} className="fp-tab-dot" style={{ background: 'none' }} />
                    <span className="floating-preview-title">Terminal</span>
                </div>
                <div className="floating-preview-titlebar-actions">
                    <button onClick={close} title="Close" className="fp-btn fp-btn-close">
                        <X size={12} />
                    </button>
                </div>
            </div>

            {/* ── Terminal body ── */}
            <div className="floating-preview-body" style={{ flex: 1, overflow: 'hidden' }}>
                <TerminalInstance id={tabId} isActive={true} />
            </div>

            {/* ── Resize handle ── */}
            <div className="floating-preview-resize" onMouseDown={onResizeMouseDown} title="Resize" />
        </div>
    );
};
