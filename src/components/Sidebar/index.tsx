import React from 'react';
import { Explorer } from './Explorer';
import { GithubImporter } from './GithubImporter';
import { Extensions } from './Extensions';
import { TerminalPane } from './TerminalPane';
import { EnvironmentPicker } from './EnvironmentPicker';
import { useEditorStore } from '../../store/useEditorStore';
import './Sidebar.css';

export const Sidebar: React.FC = () => {
    const { activeSidebarTab, sidebarVisible } = useEditorStore();

    if (!sidebarVisible) return null;

    return (
        <div className="sidebar">
            <div className="sidebar-content">
                {activeSidebarTab === 'explorer' && <Explorer />}
                {activeSidebarTab === 'github' && <GithubImporter />}
                {activeSidebarTab === 'extensions' && <Extensions />}
                {activeSidebarTab === 'environment' && <EnvironmentPicker />}
                {activeSidebarTab === 'settings' && <div style={{ padding: 20, color: '#888' }}>Settings UI coming soon.</div>}
                {activeSidebarTab === 'search' && <div style={{ padding: 20, color: '#888' }}>Global Search coming soon.</div>}
            </div>
            <TerminalPane />
        </div>
    );
};
