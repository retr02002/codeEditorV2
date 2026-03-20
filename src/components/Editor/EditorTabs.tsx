import React, { useRef, useEffect } from 'react';
import { useEditorStore, findNodeById } from '../../store/useEditorStore';
import { X } from 'lucide-react';

export const EditorTabs: React.FC = () => {
    const { files, openFiles, activeFileId, openFile, closeFile } = useEditorStore();
    const tabsContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll the active tab into view
    useEffect(() => {
        if (tabsContainerRef.current) {
            const activeTab = tabsContainerRef.current.querySelector('.editor-tab.active') as HTMLElement;
            if (activeTab) {
                activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
            }
        }
    }, [activeFileId, openFiles]);

    if (openFiles.length === 0) return null;

    return (
        <div className="editor-tabs-container" ref={tabsContainerRef}>
            {openFiles.map(id => {
                const node = findNodeById(files, id);
                if (!node) return null;

                const isActive = activeFileId === id;

                return (
                    <div
                        key={id}
                        className={`editor-tab ${isActive ? 'active' : ''}`}
                        onClick={() => openFile(id)}
                    >
                        <span className="tab-name" title={node.id}>{node.name}</span>
                        <div
                            className="tab-close"
                            onClick={(e) => {
                                e.stopPropagation();
                                closeFile(id);
                            }}
                        >
                            <X size={14} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
