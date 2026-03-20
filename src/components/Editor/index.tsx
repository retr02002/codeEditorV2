import React from 'react';
import { MonacoWrapper } from './MonacoWrapper';
import { EditorTabs } from './EditorTabs';
import { SettingsModal } from './SettingsModal';
import { useEditorStore } from '../../store/useEditorStore';
import './Editor.css';

export const EditorWorkspace: React.FC = () => {
    const { showEditorSettings, setShowEditorSettings } = useEditorStore();

    return (
        <div className="editor-workspace">
            <EditorTabs />
            <div className="editor-container">
                <MonacoWrapper />
            </div>

            {showEditorSettings && (
                <SettingsModal onClose={() => setShowEditorSettings(false)} />
            )}
        </div>
    );
};
