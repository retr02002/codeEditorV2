import React from 'react';
import { Plus, X, Terminal } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import './Terminal.css';

export const TerminalTabBar: React.FC = () => {
    const {
        terminalTabs,
        activeTerminalTabId,
        setActiveTerminalTab,
        closeTerminalTab,
        openTerminalTab,
    } = useEditorStore();

    return (
        <div className="terminal-tab-bar">
            {terminalTabs.map(tab => (
                <div
                    key={tab.id}
                    className={`terminal-tab ${activeTerminalTabId === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTerminalTab(tab.id)}
                >
                    <Terminal size={14} className="terminal-tab-icon" />
                    <span className="terminal-tab-title">{tab.name}</span>
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
            <div className="terminal-tab-add" onClick={() => openTerminalTab()}>
                <Plus size={14} />
            </div>
        </div>
    );
};
