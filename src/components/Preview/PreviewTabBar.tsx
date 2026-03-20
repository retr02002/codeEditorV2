import React from 'react';
import { Plus, X } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';

export const PreviewTabBar: React.FC = () => {
    const {
        previewTabs,
        activePreviewTabId,
        addPreviewTab,
        closePreviewTab,
        setActivePreviewTab,
    } = useEditorStore();

    return (
        <div className="preview-tab-bar">
            <div className="preview-tab-list">
                {previewTabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`preview-tab ${tab.id === activePreviewTabId ? 'active' : ''}`}
                        onClick={() => setActivePreviewTab(tab.id)}
                        title={tab.url ?? 'Project Preview'}
                    >
                        <span className="preview-tab-dot" />
                        <span className="preview-tab-label">{tab.label}</span>
                        {previewTabs.length > 1 && (
                            <span
                                className="preview-tab-close"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    closePreviewTab(tab.id);
                                }}
                                title="Close tab"
                            >
                                <X size={11} />
                            </span>
                        )}
                    </button>
                ))}
            </div>
            <button
                className="preview-tab-add"
                onClick={addPreviewTab}
                title="New preview tab"
            >
                <Plus size={13} />
            </button>
        </div>
    );
};
