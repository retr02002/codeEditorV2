import React, { useState } from 'react';
import { useEditorStore } from '../../store/useEditorStore';

type EnvId = 'vanilla' | 'react' | 'vue' | 'typescript' | 'python' | 'nodejs';

interface EnvCard {
    id: EnvId;
    label: string;
    icon: string;
    color: string;
    description: string;
    badge: string;
}

const environments: EnvCard[] = [
    {
        id: 'vanilla',
        label: 'HTML / CSS / JS',
        icon: '🌐',
        color: '#e34f26',
        description: 'Classic web trio — instant live preview',
        badge: 'Live Preview',
    },
    {
        id: 'react',
        label: 'React',
        icon: '⚛️',
        color: '#61dafb',
        description: 'React 18 + JSX via Babel Standalone',
        badge: 'CDN Powered',
    },
    {
        id: 'vue',
        label: 'Vue 3',
        icon: '💚',
        color: '#41b883',
        description: 'Vue 3 Composition API in the browser',
        badge: 'CDN Powered',
    },
    {
        id: 'typescript',
        label: 'TypeScript',
        icon: '🔷',
        color: '#3178c6',
        description: 'TypeScript compiled in-browser via Babel',
        badge: 'In-Browser',
    },
    {
        id: 'python',
        label: 'Python',
        icon: '🐍',
        color: '#ffd343',
        description: 'Python 3 via Skulpt WASM — runs in preview',
        badge: 'Skulpt WASM',
    },
    {
        id: 'nodejs',
        label: 'Node.js',
        icon: '🟢',
        color: '#68a063',
        description: 'JavaScript console / REPL environment',
        badge: 'Console',
    },
];

const limitations: Partial<Record<EnvId, string>> = {
    python: 'Standard library only (no pip). Uses Skulpt runtime.',
    nodejs: 'No File System / npm. Sandboxed JS engine with console output.',
    react: 'Uses UMD build — no import/export. Write in window scope.',
};

export const EnvironmentPicker: React.FC = () => {
    const { environment, loadTemplate } = useEditorStore();
    const [confirming, setConfirming] = useState<EnvId | null>(null);

    const handleSelect = (id: EnvId) => {
        if (id === environment) return;
        setConfirming(id);
    };

    const handleConfirm = () => {
        if (confirming) {
            loadTemplate(confirming);
            setConfirming(null);
        }
    };

    return (
        <div style={{ padding: '10px 8px', overflowY: 'auto' }}>
            <div style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, marginBottom: 10, paddingLeft: 4 }}>
                Environment
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {environments.map(env => {
                    const active = env.id === environment;
                    return (
                        <button
                            key={env.id}
                            onClick={() => handleSelect(env.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '10px 10px',
                                background: active ? `${env.color}18` : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${active ? env.color : '#30363d'}`,
                                borderRadius: 8,
                                cursor: active ? 'default' : 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.15s',
                                width: '100%',
                                position: 'relative',
                            }}
                            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                        >
                            <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{env.icon}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: active ? env.color : '#e6edf3' }}>
                                        {env.label}
                                    </span>
                                    {active && (
                                        <span style={{
                                            fontSize: 9, fontWeight: 700, color: env.color,
                                            background: `${env.color}22`, padding: '1px 5px',
                                            borderRadius: 10, textTransform: 'uppercase', letterSpacing: '0.5px',
                                        }}>
                                            ACTIVE
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontSize: 11, color: '#8b949e', lineHeight: 1.4, whiteSpace: 'normal' }}>
                                    {env.description}
                                </div>
                            </div>
                            <span style={{
                                fontSize: 9, fontWeight: 700, color: '#6e7681',
                                background: '#21262d', padding: '2px 6px',
                                borderRadius: 10, textTransform: 'uppercase', letterSpacing: '0.4px',
                                flexShrink: 0,
                            }}>
                                {env.badge}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Confirmation dialog */}
            {confirming && (() => {
                const env = environments.find(e => e.id === confirming)!;
                return (
                    <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backdropFilter: 'blur(2px)', zIndex: 100, padding: 16,
                    }}>
                        <div style={{
                            background: '#161b22', border: '1px solid #30363d', borderRadius: 10,
                            padding: 20, maxWidth: 280, width: '100%',
                        }}>
                            <div style={{ fontSize: 24, marginBottom: 8 }}>{env.icon}</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#e6edf3', marginBottom: 6 }}>
                                Switch to {env.label}?
                            </div>
                            <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 16, lineHeight: 1.5 }}>
                                This will load a new starter template and replace your current workspace files.
                                {limitations[confirming] && (
                                    <div style={{ marginTop: 8, color: '#d29922', background: '#272115', padding: '6px 8px', borderRadius: 6, border: '1px solid #3d2f0a' }}>
                                        ⚠️ {limitations[confirming]}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => setConfirming(null)} style={{
                                    flex: 1, padding: '7px', background: 'none', border: '1px solid #30363d',
                                    color: '#8b949e', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                                }}>
                                    Cancel
                                </button>
                                <button onClick={handleConfirm} style={{
                                    flex: 1, padding: '7px', background: env.color, border: 'none',
                                    color: '#000', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                                }}>
                                    Switch
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};
