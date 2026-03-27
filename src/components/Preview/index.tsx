import React, { useState } from 'react';
import { PreviewTabBar } from './PreviewTabBar';
import { PreviewToolbar, type ViewportSize } from './PreviewToolbar';
import { IframeRenderer } from './IframeRenderer';
import { useEditorStore } from '../../store/useEditorStore';
import './Preview.css';

export const PreviewWindow: React.FC = () => {
    const [activeSize, setActiveSize] = useState<ViewportSize>('desktop');
    const {
        previewTabs,
        activePreviewTabId,
        reloadPreviewTab,
        setPreviewTabUrl,
    } = useEditorStore();

    const activeTab = previewTabs.find(t => t.id === activePreviewTabId) ?? previewTabs[0];

    const getWidth = () => {
        switch (activeSize) {
            case 'mobile': return '375px';
            case 'tablet': return '768px';
            case 'desktop': return '100%';
        }
    };

    const getHeight = () => {
        switch (activeSize) {
            case 'mobile': return '667px';
            case 'tablet': return '1024px';
            case 'desktop': return '100%';
        }
    };

    return (
        <div className="preview-window">
            {/* Tab bar */}
            <PreviewTabBar />

            {/* Browser toolbar — per active tab */}
            <PreviewToolbar
                activeSize={activeSize}
                onSizeChange={setActiveSize}
                onReload={() => reloadPreviewTab(activeTab.id)}
                onNavigate={(url) => setPreviewTabUrl(activeTab.id, url || null)}
                isExternal={!!activeTab.url}
            />

            <div className={`preview-content-wrapper ${activeSize}`}>
                <div
                    className="preview-content"
                    style={{
                        width: getWidth(),
                        height: getHeight(),
                        transition: 'width 0.3s ease, height 0.3s ease',
                    }}
                >
                    {activeTab.url ? (
                        <iframe
                            key={activeTab.url + activeTab.reloadKey}
                            src={activeTab.url}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                            title="External Preview"
                            onError={() => { }}
                        />
                    ) : (
                        <IframeRenderer key={activeTab.reloadKey} />
                    )}
                </div>
            </div>
        </div>
    );
};
