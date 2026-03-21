import React from 'react';
import { TerminalTabBar } from './TerminalTabBar';
import { TerminalInstance } from './TerminalInstance';
import { useEditorStore } from '../../store/useEditorStore';
import './Terminal.css';

export const TerminalWindow: React.FC = () => {
    const { terminalTabs, activeTerminalTabId } = useEditorStore();

    if (terminalTabs.length === 0) {
        return (
            <div className="terminal-window empty">
                <p>No terminal tabs open.</p>
                <button onClick={() => useEditorStore.getState().openTerminalTab()}>Open Terminal</button>
            </div>
        );
    }

    return (
        <div className="terminal-window">
            <TerminalTabBar />
            <div className="terminal-instances-container">
                {terminalTabs.map(tab => (
                    <TerminalInstance 
                        key={tab.id} 
                        id={tab.id} 
                        isActive={tab.id === activeTerminalTabId} 
                    />
                ))}
            </div>
        </div>
    );
};
