import React from 'react';
import { X } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';

// All available themes (built-in Monaco + custom JSON themes from public/themes/)
const THEMES = [
    // Built-in Monaco themes
    { id: 'vs-dark', label: '⬛ Dark (Default)' },
    { id: 'light', label: '⬜ Light' },
    { id: 'hc-black', label: '🔲 High Contrast Dark' },
    // Custom JSON themes (loaded from /public/themes/)
    { id: 'Active4D', label: 'Active 4D' },
    { id: 'All Hallows Eve', label: 'All Hallows Eve' },
    { id: 'Amy', label: 'Amy' },
    { id: 'Birds of Paradise', label: 'Birds of Paradise' },
    { id: 'Blackboard', label: 'Blackboard' },
    { id: 'Clouds Midnight', label: 'Clouds Midnight' },
    { id: 'Cobalt', label: 'Cobalt' },
    { id: 'Cobalt2', label: 'Cobalt 2' },
    { id: 'Dawn', label: 'Dawn' },
    { id: 'Dracula', label: '🧛 Dracula' },
    { id: 'Dreamweaver', label: 'Dreamweaver' },
    { id: 'Eiffel', label: 'Eiffel' },
    { id: 'Espresso Libre', label: 'Espresso Libre' },
    { id: 'GitHub Dark', label: '🐱 GitHub Dark' },
    { id: 'GitHub Light', label: '🐱 GitHub Light' },
    { id: 'GitHub', label: '🐱 GitHub' },
    { id: 'IDLE', label: 'IDLE' },
    { id: 'Katzenmilch', label: 'Katzenmilch' },
    { id: 'Kuroir Theme', label: 'Kuroir Theme' },
    { id: 'LAZY', label: 'LAZY' },
    { id: 'Merbivore Soft', label: 'Merbivore Soft' },
    { id: 'Merbivore', label: 'Merbivore' },
    { id: 'Monokai Bright', label: '🎨 Monokai Bright' },
    { id: 'Monokai', label: '🎨 Monokai' },
    { id: 'Night Owl', label: '🦉 Night Owl' },
    { id: 'Nord', label: '❄️ Nord' },
    { id: 'Oceanic Next', label: '🌊 Oceanic Next' },
    { id: 'Pastels on Dark', label: 'Pastels on Dark' },
    { id: 'Slush and Poppies', label: 'Slush and Poppies' },
    { id: 'Solarized-dark', label: '☀️ Solarized Dark' },
    { id: 'Solarized-light', label: '☀️ Solarized Light' },
    { id: 'SpaceCadet', label: '🚀 Space Cadet' },
    { id: 'Sunburst', label: '🌅 Sunburst' },
    { id: 'Tomorrow-Night-Blue', label: 'Tomorrow Night Blue' },
    { id: 'Tomorrow-Night-Bright', label: 'Tomorrow Night Bright' },
    { id: 'Tomorrow-Night-Eighties', label: 'Tomorrow Night Eighties' },
    { id: 'Tomorrow-Night', label: 'Tomorrow Night' },
    { id: 'Tomorrow', label: 'Tomorrow' },
    { id: 'Twilight', label: 'Twilight' },
    { id: 'Upstream Sunburst', label: 'Upstream Sunburst' },
    { id: 'Vibrant Ink', label: 'Vibrant Ink' },
    { id: 'Xcode_default', label: 'Xcode Default' },
    { id: 'Zenburnesque', label: 'Zenburnesque' },
    { id: 'iPlastic', label: 'iPlastic' },
    { id: 'idleFingers', label: 'idleFingers' },
    { id: 'krTheme', label: 'krTheme' },
    { id: 'monoindustrial', label: 'Monoindustrial' },
];

interface Props {
    onClose: () => void;
}

export const SettingsModal: React.FC<Props> = ({ onClose }) => {
    const { settings, updateSettings } = useEditorStore();
    const [isRecordingKey, setIsRecordingKey] = React.useState(false);

    const handleKeyRecord = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (!isRecordingKey) return;
        
        e.preventDefault();
        e.stopPropagation();

        const key = e.key;
        if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) return;

        // Check if there is a primary modifier (Ctrl, Alt, or Meta)
        const hasPrimaryModifier = e.ctrlKey || e.altKey || e.metaKey;
        const isCharOrNumber = /^[a-zA-Z0-9]$/.test(key);

        // Exclude single typical keys without a strong modifier (preventing problem combinations inside editing mode)
        if (isCharOrNumber && !hasPrimaryModifier) {
            return;
        }

        const keys = [];
        if (e.ctrlKey) keys.push('Ctrl');
        if (e.metaKey) keys.push('Meta');
        if (e.altKey) keys.push('Alt');
        if (e.shiftKey) keys.push('Shift');
        
        let keyName = key.toUpperCase();
        if (keyName === ' ') keyName = 'SPACE';

        keys.push(keyName);
        
        updateSettings({ runShortcut: keys.join('+') });
        setIsRecordingKey(false);
    };

    return (
        <div className="settings-sidebar">
            <div className="settings-header">
                Editor Settings
                <button className="icon-btn" onClick={onClose}><X size={16} /></button>
            </div>
            <div className="settings-content">

                <div className="setting-group">
                    <label>Theme</label>
                    <select value={settings.theme} onChange={(e) => updateSettings({ theme: e.target.value })}>
                        {THEMES.map(t => (
                            <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                    </select>
                </div>

                <div className="setting-group">
                    <label>Font Family</label>
                    <select value={settings.fontFamily} onChange={(e) => updateSettings({ fontFamily: e.target.value })}>
                        <option value="Fira Code, Courier, monospace">Fira Code</option>
                        <option value="Courier New, monospace">Courier New</option>
                        <option value="Roboto Mono, monospace">Roboto Mono</option>
                        <option value="Montserrat, sans-serif">Montserrat</option>
                        <option value="JetBrains Mono, monospace">JetBrains Mono</option>
                        <option value="Source Code Pro, monospace">Source Code Pro</option>
                        <option value="Cascadia Code, monospace">Cascadia Code</option>
                    </select>
                </div>

                <div className="setting-group">
                    <label>Font Size ({settings.fontSize}px)</label>
                    <input
                        type="number"
                        min="10" max="30"
                        value={settings.fontSize}
                        onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
                    />
                </div>

                <div className="setting-group">
                    <label>Bootstrap Version</label>
                    <select value={settings.bootstrapVersion} onChange={(e) => updateSettings({ bootstrapVersion: e.target.value })}>
                        <option value="none">None</option>
                        <option value="5.3.0">Bootstrap 5.3.0</option>
                        <option value="4.5.2">Bootstrap 4.5.2</option>
                        <option value="3.4.1">Bootstrap 3.4.1</option>
                    </select>
                </div>

                <hr style={{ borderColor: 'var(--border-color)' }} />

                <label className="setting-toggle">
                    <input
                        type="checkbox"
                        checked={settings.suggestions}
                        onChange={(e) => updateSettings({ suggestions: e.target.checked })}
                    />
                    Enable IntelliSense (Suggestions)
                </label>

                <label className="setting-toggle">
                    <input
                        type="checkbox"
                        checked={settings.emmet}
                        onChange={(e) => updateSettings({ emmet: e.target.checked })}
                    />
                    Enable Emmet Abbreviations
                </label>

                <label className="setting-toggle">
                    <input
                        type="checkbox"
                        checked={settings.liveEditing}
                        onChange={(e) => updateSettings({ liveEditing: e.target.checked })}
                    />
                    Live Editing
                </label>

                <div className="setting-group" style={{ marginTop: '16px' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        Custom Run Shortcut
                        <button 
                            className="run-shortcut-input"
                            style={{ 
                                padding: '8px', 
                                background: isRecordingKey ? 'var(--button-hover)' : 'var(--bg-lighter)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                color: 'var(--text-color)',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontFamily: 'monospace'
                            }}
                            onClick={() => setIsRecordingKey(true)}
                            onKeyDown={handleKeyRecord}
                            onBlur={() => setIsRecordingKey(false)}
                        >
                            {isRecordingKey ? 'Press any combination (Esc to cancel)...' : (settings.runShortcut || 'None')}
                        </button>
                    </label>
                    <small style={{ color: '#888', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                        Requires a modifier (Ctrl, Meta/Cmd, Alt) for normal keys to prevent editor conflicts.
                    </small>
                </div>

            </div>
        </div>
    );
};
