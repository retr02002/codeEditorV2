import React, { useState } from 'react';
import { Plus, X, Terminal, ChevronDown } from 'lucide-react';
import { useEditorStore, type ShellType } from '../../store/useEditorStore';
import './Terminal.css';

const SHELL_OPTIONS: { value: ShellType; label: string; icon: string }[] = [
    { value: 'bash', label: 'Bash', icon: '$' },
    { value: 'zsh', label: 'Zsh', icon: '❯' },
    { value: 'sh', label: 'Shell', icon: '$' },
    { value: 'node', label: 'Node.js', icon: '>' },
    { value: 'python', label: 'Python', icon: '>>>' },
];

const SHELL_ICONS: Record<ShellType, string> = {
    bash: '⚡',
    zsh: '✦',
    sh: '⬡',
    node: '⬢',
    python: '🐍',
};

export const TerminalTabBar: React.FC = () => {
    const {
        terminalTabs,
        activeTerminalTabId,
        setActiveTerminalTab,
        closeTerminalTab,
        openTerminalTab,
    } = useEditorStore();

    const [showShellMenu, setShowShellMenu] = useState(false);

    const handleNewTerminal = (shellType: ShellType) => {
        openTerminalTab(undefined, shellType);
        setShowShellMenu(false);
    };

    return (
        <div className="terminal-tab-bar">
            <div className="terminal-tabs-scroll-area">
                {terminalTabs.map(tab => (
                    <div
                        key={tab.id}
                        className={`terminal-tab ${activeTerminalTabId === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTerminalTab(tab.id)}
                    >
                        <span className="terminal-tab-shell-icon">{SHELL_ICONS[tab.shellType]}</span>
                        <Terminal size={14} className="terminal-tab-icon" />
                        <span className="terminal-tab-title">
                            {tab.shellType}: {tab.name}
                        </span>
                        <div
                            className="terminal-tab-close"
                            onClick={(e) => {
                                e.stopPropagation();
                                closeTerminalTab(tab.id);
                            }}
                        >
                            <X size={12} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="terminal-tab-add-group">
                <div className="terminal-tab-add" onClick={() => handleNewTerminal('bash')}>
                    <Plus size={14} />
                </div>
                <div className="terminal-shell-selector" onClick={() => setShowShellMenu(!showShellMenu)}>
                    <ChevronDown size={12} />
                </div>
                {showShellMenu && (
                    <>
                        <div className="shell-menu-overlay" onClick={() => setShowShellMenu(false)} />
                        <div className="shell-selector-menu">
                            <div className="shell-menu-header">New Terminal</div>
                            {SHELL_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    className="shell-menu-item"
                                    onClick={() => handleNewTerminal(opt.value)}
                                >
                                    <span className="shell-menu-icon">{SHELL_ICONS[opt.value]}</span>
                                    <span className="shell-menu-label">{opt.label}</span>
                                    <span className="shell-menu-prompt">{opt.icon}</span>
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
