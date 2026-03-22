import { useState, useEffect } from 'react';
import Split from 'react-split';
import { Maximize2, Minimize2, Folder, Code2, Play, Settings, Terminal, Search, GitBranch, Blocks, DownloadCloud, Layers, AppWindow } from 'lucide-react';
import { useEditorStore } from './store/useEditorStore';

import { Topbar } from './components/Topbar';
import { Sidebar } from './components/Sidebar';
import { EditorWorkspace } from './components/Editor';
import { PreviewWindow } from './components/Preview';
import { FloatingPreview } from './components/Preview/FloatingPreview';
import { FloatingTerminal } from './components/Terminal/FloatingTerminal';

function App() {
  const { layout, toggleFullScreen, showEditorSettings, setShowEditorSettings, activeSidebarTab, setActiveSidebarTab, sidebarVisible, previewTabs, activePreviewTabId, floatingWindows, openFloatingWindow, floatingTerminals, openFloatingTerminal, activeTerminalTabId } = useEditorStore();
  const activePreviewTab = previewTabs.find(t => t.id === activePreviewTabId);
  const previewExternalUrl = activePreviewTab?.url ?? null;
  const [isMobile, setIsMobile] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'explorer' | 'search' | 'github' | 'extensions' | 'environment' | 'editor' | 'preview' | 'terminal'>('editor');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
        const settings = useEditorStore.getState().settings;
        const shortcut = settings.runShortcut;
        if (!shortcut || shortcut === 'None') return;

        const parts = shortcut.split('+');
        const needsCtrl = parts.includes('Ctrl');
        const needsMeta = parts.includes('Meta');
        const needsAlt = parts.includes('Alt');
        const needsShift = parts.includes('Shift');
        const keyPart = parts[parts.length - 1]; 

        let pressedKey = e.key.toUpperCase();
        if (pressedKey === ' ') pressedKey = 'SPACE';

        if (
            e.ctrlKey === needsCtrl &&
            e.metaKey === needsMeta &&
            e.altKey === needsAlt &&
            e.shiftKey === needsShift &&
            pressedKey === keyPart
        ) {
            e.preventDefault();
            e.stopPropagation();
            const event = new CustomEvent('run-code-shortcut');
            window.dispatchEvent(event);

            // Execute "Run Code" logic
            const store = useEditorStore.getState();
            store.incrementRunCounter();
            
            if (store.environment === 'python') {
                store.openTerminalTab();
            }
        }
    };
    
    // Use capture phase to intercept before Monaco Editor or browser defaults
    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
  }, []);

  const isAnyFullScreen = layout.window1Full || layout.window2Full || layout.window3Full;

  const renderPanelHeader = (title: string, windowKey: 'window1Full' | 'window2Full' | 'window3Full') => {
    const isFull = layout[windowKey];
    return (
      <div className="panel-header">
        <span>{title}</span>
        <div className="panel-header-actions">
          {title === 'PREVIEW' && (
            <>
              {!isMobile && (
                <button
                  className="icon-btn"
                  onClick={() => openFloatingWindow(activePreviewTabId)}
                  title="Pop out active tab as window"
                >
                  <AppWindow size={15} />
                </button>
              )}
              <button
                className="icon-btn"
                onClick={() => {
                  if (previewExternalUrl) {
                    const btn = document.getElementById('devtools-btn');
                    if (btn) {
                      const tip = document.createElement('div');
                      tip.textContent = 'DevTools unavailable for external sites';
                      tip.style.cssText = 'position:fixed;bottom:60px;right:24px;background:#1e1e2e;color:#f38ba8;border:1px solid #f38ba8;border-radius:6px;padding:6px 12px;font-size:12px;z-index:9999;pointer-events:none;box-shadow:0 4px 12px rgba(0,0,0,0.5);';
                      document.body.appendChild(tip);
                      setTimeout(() => tip.remove(), 2500);
                    }
                    return;
                  }
                  const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
                  iframe?.contentWindow?.postMessage('TOGGLE_ERUDA', '*');
                }}
                id="devtools-btn"
                title={previewExternalUrl ? 'DevTools unavailable for external sites' : 'Toggle DevTools'}
              >
                <Terminal size={16} />
              </button>
            </>
          )}
          {title === 'TERMINAL' && (
            <>
              {!isMobile && (
                <button
                  className="icon-btn"
                  onClick={() => {
                    if (activeTerminalTabId) openFloatingTerminal(activeTerminalTabId);
                  }}
                  title="Pop out active tab as window"
                >
                  <AppWindow size={15} />
                </button>
              )}
            </>
          )}
          {title === 'EDITOR' && (
            <>
              <button
                className="icon-btn run-btn"
                onClick={() => {
                  const store = useEditorStore.getState();
                  store.incrementRunCounter();
                  if (store.environment === 'python') store.openTerminalTab();
                }}
                title="Run Code"
                style={{ color: '#4CAF50' }}
              >
                <Play size={16} />
              </button>
              <button
                className="icon-btn"
                onClick={() => setShowEditorSettings(!showEditorSettings)}
                title="Editor Settings"
              >
                <Settings size={16} />
              </button>
            </>
          )}
          {!isMobile && (
            <button className="icon-btn" onClick={() => toggleFullScreen(windowKey)} title={isFull ? "Exit Full Screen" : "Maximize"}>
              {isFull ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderMobileLayout = () => {
    return (
      <div className="mobile-layout">
        <div className="mobile-content">
          {['explorer', 'search', 'github', 'extensions', 'environment', 'terminal'].includes(activeMobileTab) && (
            <div className="panel full-screen-panel" style={{ borderTop: 'none', paddingTop: 0 }}>
              <Sidebar />
            </div>
          )}
          {activeMobileTab === 'editor' && (
            <div className="panel full-screen-panel" style={{ borderTop: 'none', paddingTop: 0 }}>
              <EditorWorkspace />
            </div>
          )}
          {activeMobileTab === 'preview' && (
            <div className="panel full-screen-panel" style={{ borderTop: 'none', paddingTop: 0 }}>
              <PreviewWindow />
            </div>
          )}
        </div>
        <div className="mobile-bottom-tabs">
          <button className={`mobile-tab ${activeMobileTab === 'explorer' ? 'active' : ''}`} onClick={() => { setActiveMobileTab('explorer'); setActiveSidebarTab('explorer'); }}>
            <Folder size={18} /><span>Explorer</span>
          </button>
          <button className={`mobile-tab ${activeMobileTab === 'extensions' ? 'active' : ''}`} onClick={() => { setActiveMobileTab('extensions'); setActiveSidebarTab('extensions'); }}>
            <Blocks size={18} /><span>Extensions</span>
          </button>
          <button className={`mobile-tab ${activeMobileTab === 'environment' ? 'active' : ''}`} onClick={() => { setActiveMobileTab('environment'); setActiveSidebarTab('environment'); }}>
            <Layers size={18} /><span>Env</span>
          </button>
          <button className={`mobile-tab ${activeMobileTab === 'terminal' ? 'active' : ''}`} onClick={() => { setActiveMobileTab('terminal'); setActiveSidebarTab('terminal'); }}>
            <Terminal size={18} /><span>Terminal</span>
          </button>
          <button className={`mobile-tab ${activeMobileTab === 'editor' ? 'active' : ''}`} onClick={() => setActiveMobileTab('editor')}>
            <Code2 size={18} /><span>Editor</span>
          </button>
          <button className={`mobile-tab ${activeMobileTab === 'preview' ? 'active' : ''}`} onClick={() => setActiveMobileTab('preview')}>
            <Play size={18} /><span>Preview</span>
          </button>
          <button className="mobile-tab" onClick={() => useEditorStore.getState().exportProjectZip()}>
            <DownloadCloud size={18} /><span>Download</span>
          </button>
        </div>
      </div>
    );
  };

  const renderDesktopLayout = () => {
    return (
      <>
        {/* If no windows are full-screen, render the split layout */}
        {!isAnyFullScreen && (
          <Split
            sizes={sidebarVisible ? [20, 50, 30] : [0, 55, 45]}
            minSize={sidebarVisible ? [250, 400, 300] : [0, 400, 300]}
            gutterSize={5}
            className="split"
          >
            {/* Window 1 */}
            {sidebarVisible ? (
              <div className="panel">
                {renderPanelHeader(activeSidebarTab.toUpperCase(), 'window1Full')}
                <Sidebar />
              </div>
            ) : (
              <div className="panel hidden" />
            )}

            {/* Window 2 */}
            <div className="panel">
              {renderPanelHeader('EDITOR', 'window2Full')}
              <EditorWorkspace />
            </div>

            {/* Window 3 */}
            <div className="panel">
              {renderPanelHeader('PREVIEW', 'window3Full')}
              <PreviewWindow />
            </div>
          </Split>
        )}

        {/* Render full-screen window if any is maximized */}
        {layout.window1Full && (
          <div className="panel full-screen-panel">
            {renderPanelHeader(activeSidebarTab.toUpperCase(), 'window1Full')}
            <Sidebar />
          </div>
        )}
        {layout.window2Full && (
          <div className="panel full-screen-panel">
            {renderPanelHeader('EDITOR', 'window2Full')}
            <EditorWorkspace />
          </div>
        )}
        {layout.window3Full && (
          <div className="panel full-screen-panel">
            {renderPanelHeader('PREVIEW', 'window3Full')}
            <PreviewWindow />
          </div>
        )}
      </>
    );
  };

  return (
    <div className="app-container">
      <Topbar />
      <div className="main-workspace">
        {!isMobile && (
          <div className="activity-bar">
            <div
              className={`activity-action ${activeSidebarTab === 'explorer' && sidebarVisible ? 'active' : ''}`}
              onClick={() => setActiveSidebarTab('explorer')}
            >
              <Folder size={24} strokeWidth={1.5} />
            </div>
            <div
              className={`activity-action ${activeSidebarTab === 'search' && sidebarVisible ? 'active' : ''}`}
              onClick={() => setActiveSidebarTab('search')}
            >
              <Search size={22} strokeWidth={1.5} />
            </div>
            <div
              className={`activity-action ${activeSidebarTab === 'github' && sidebarVisible ? 'active' : ''}`}
              onClick={() => setActiveSidebarTab('github')}
            >
              <GitBranch size={22} strokeWidth={1.5} />
            </div>
            <div
              className={`activity-action ${activeSidebarTab === 'extensions' && sidebarVisible ? 'active' : ''}`}
              onClick={() => setActiveSidebarTab('extensions')}
            >
              <Blocks size={24} strokeWidth={1.5} />
            </div>
            <div
              className={`activity-action ${activeSidebarTab === 'environment' && sidebarVisible ? 'active' : ''}`}
              onClick={() => setActiveSidebarTab('environment')}
              title="Environment / Templates"
            >
              <Layers size={22} strokeWidth={1.5} />
            </div>
            <div
              className={`activity-action ${activeSidebarTab === 'terminal' && sidebarVisible ? 'active' : ''}`}
              onClick={() => {
                if (!sidebarVisible || activeSidebarTab !== 'terminal') {
                  useEditorStore.setState({ activeSidebarTab: 'terminal', sidebarVisible: true });
                  const { terminalTabs, openTerminalTab } = useEditorStore.getState();
                  if (terminalTabs.length === 0) {
                     openTerminalTab();
                  }
                } else {
                  useEditorStore.setState({ sidebarVisible: false });
                }
              }}
              title="Terminal"
            >
              <Terminal size={22} strokeWidth={1.5} />
            </div>
            <div
              className={`activity-action`}
              onClick={() => useEditorStore.getState().exportProjectZip()}
              title="Download Project ZIP"
            >
              <DownloadCloud size={24} strokeWidth={1.5} />
            </div>
            <div
              className={`activity-action ${activeSidebarTab === 'settings' && sidebarVisible ? 'active' : ''}`}
              onClick={() => setActiveSidebarTab('settings')}
              style={{ marginTop: 'auto', marginBottom: '12px' }}
            >
              <Settings size={22} strokeWidth={1.5} />
            </div>
          </div>
        )}
        <div className="workspace-content">
          {isMobile ? renderMobileLayout() : renderDesktopLayout()}
        </div>
      </div>
      {floatingWindows.map(w => (
        <FloatingPreview
          key={w.id}
          windowId={w.id}
          tabId={w.tabId}
          initialX={w.x}
          initialY={w.y}
        />
      ))}
      {floatingTerminals.map(w => (
        <FloatingTerminal
          key={w.id}
          windowId={w.id}
          tabId={w.tabId}
          initialX={w.x}
          initialY={w.y}
        />
      ))}
    </div>
  );
}

export default App;
