import { useState, useEffect, useMemo } from 'react';

declare global {
  interface Window {
    _setMobileTab?: (tab: 'explorer' | 'search' | 'github' | 'extensions' | 'environment' | 'terminal' | 'editor' | 'preview') => void;
  }
}

import Split from 'react-split';
import { Maximize2, Minimize2, Folder, Code2, Play, Settings, Terminal, Search, GitBranch, Blocks, DownloadCloud, Layers, AppWindow } from 'lucide-react';
import { useEditorStore, type EditorState } from './store/useEditorStore';

import { Topbar } from './components/Topbar';
import { Sidebar } from './components/Sidebar';
import { EditorWorkspace } from './components/Editor';
import { PreviewWindow } from './components/Preview';
import { FloatingPreview } from './components/Preview/FloatingPreview';
import { FloatingTerminal } from './components/Terminal/FloatingTerminal';
import { TutorialOverlay } from './components/Tutorial/TutorialOverlay';
import { TutorialModal } from './components/Tutorial/TutorialModal';
import { DevelopmentNotice } from './components/Notifications/DevelopmentNotice';

function App() {
  const { layout, toggleFullScreen, showEditorSettings, setShowEditorSettings, activeSidebarTab, setActiveSidebarTab, sidebarVisible, toggleSidebar, previewTabs, activePreviewTabId, floatingWindows, openFloatingWindow, floatingTerminals, openFloatingTerminal, activeTerminalTabId } = useEditorStore();
  const activePreviewTab = previewTabs.find(t => t.id === activePreviewTabId);
  const previewExternalUrl = activePreviewTab?.url ?? null;
  const [isMobile, setIsMobile] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'explorer' | 'search' | 'github' | 'extensions' | 'environment' | 'editor' | 'preview' | 'terminal'>('editor');
  const [showInteractiveGuide, setShowInteractiveGuide] = useState(false);
  const [showFeatureOverview, setShowFeatureOverview] = useState(false);

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
                store.openTerminalTab('python-run');
            }
        }
    };
    
    // Use capture phase to intercept before Monaco Editor or browser defaults
    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
  }, []);

  // Listen for tutorial menu actions from Topbar
  useEffect(() => {
    const handleTutorialAction = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === 'interactive-guide') setShowInteractiveGuide(true);
      if (detail === 'feature-overview') setShowFeatureOverview(true);
    };
    window.addEventListener('tutorial-action', handleTutorialAction);
    return () => window.removeEventListener('tutorial-action', handleTutorialAction);
  }, []);

  useEffect(() => {
    window._setMobileTab = setActiveMobileTab;
  }, [setActiveMobileTab]);

  const renderPanelHeader = (title: string, windowKey: 'window1Full' | 'window2Full' | 'window3Full') => {
    const isFull = layout[windowKey];
    return (
      <div className="panel-header">
        <span>{title}</span>
        <div className="panel-header-actions">
          {title === 'PREVIEW' && (
            <>
              <button
                className="icon-btn run-btn"
                onClick={() => {
                  const store = useEditorStore.getState();
                  store.incrementRunCounter();
                  if (store.environment === 'python') store.openTerminalTab('python-run');
                }}
                title="Run Code"
                style={{ color: '#4CAF50' }}
              >
                <Play size={16} />
              </button>
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
                  if (store.environment === 'python') store.openTerminalTab('python-run');
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
          <button className="mobile-tab" onClick={() => useEditorStore.getState().exportProjectZip()} data-tutorial-id="download-icon-mobile">
            <DownloadCloud size={18} /><span>Download</span>
          </button>
        </div>
      </div>
    );
  };

  const renderDesktopLayout = () => {
    return (
      <>
        {/* Split layout — always rendered; fullscreen uses position:fixed overlay on top */}
          <Split
            sizes={sidebarVisible ? [20, 50, 30] : [0, 55, 45]}
            minSize={sidebarVisible ? [250, 400, 300] : [0, 400, 300]}
            gutterSize={5}
            className="split"
          >
            {/* Window 1 — Sidebar */}
            {sidebarVisible ? (
              <div className={`panel ${layout.window1Full ? 'panel-fullscreen-overlay' : ''}`} data-tutorial-id="sidebar">
                {renderPanelHeader(activeSidebarTab.toUpperCase(), 'window1Full')}
                <Sidebar />
              </div>
            ) : (
              <div className="panel hidden" />
            )}

            {/* Window 2 — Editor */}
            <div className={`panel ${layout.window2Full ? 'panel-fullscreen-overlay' : ''}`} data-tutorial-id="editor">
              {renderPanelHeader('EDITOR', 'window2Full')}
              <EditorWorkspace />
            </div>

            {/* Window 3 — Preview (never unmounted, iframe preserved) */}
            <div className={`panel ${layout.window3Full ? 'panel-fullscreen-overlay' : ''}`} data-tutorial-id="preview">
              {renderPanelHeader('PREVIEW', 'window3Full')}
              <PreviewWindow />
            </div>
          </Split>
      </>
    );
  };

  return (
    <div className="app-container">
      <DevelopmentNotice />
      <Topbar />
      <div className="main-workspace">
        {!isMobile && (
          <div className="activity-bar" data-tutorial-id="activity-bar">
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
              className={`activity-action ${activeSidebarTab === 'environment' ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (activeSidebarTab === 'environment') toggleSidebar();
                else setActiveSidebarTab('environment');
              }}
              title="Environment"
              data-tutorial-id="env-icon"
            >
              <Layers size={22} strokeWidth={1.5} />
            </div>
            <div
              className={`activity-action ${activeSidebarTab === 'terminal' ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (activeSidebarTab === 'terminal') {
                  toggleSidebar();
                } else {
                  setActiveSidebarTab('terminal');
                  const { terminalTabs, openTerminalTab } = useEditorStore.getState();
                  if (terminalTabs.length === 0) {
                     openTerminalTab();
                  }
                }
              }}
              title="Terminal"
              data-tutorial-id="terminal-icon"
            >
              <Terminal size={22} strokeWidth={1.5} />
            </div>
            <div
              className={`activity-action`}
              onClick={() => useEditorStore.getState().exportProjectZip()}
              title="Download Project ZIP"
              data-tutorial-id="download-icon"
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
      {/* Tutorial components */}
      <TutorialOverlay
        forceShow={showInteractiveGuide}
        onClose={() => setShowInteractiveGuide(false)}
        steps={useMemo(() => [
          {
            target: '[data-tutorial-id="topbar"]',
            title: 'Menu Bar',
            description: 'Access File, Edit, View, Templates, Tutorial, and Run options from the top menu. Create files, change settings, and start debugging here.',
            position: 'bottom',
          },
          {
            target: '[data-tutorial-id="activity-bar"]',
            title: 'Activity Bar & Panels',
            description: 'Quick access to all IDE panels — Explorer, Search, GitHub, Extensions, and Terminal. Click any icon to toggle its panel.',
            position: 'right',
          },
          {
            target: '[data-tutorial-id="env-tab"]',
            title: 'Environment Settings',
            description: 'Switch between Python, React, Vue, Node.js, and more. Each environment comes with its own runtime and boilerplates.',
            position: 'right',
            onShow: (state: EditorState) => {
              state.setActiveSidebarTab('environment');
              if (isMobile) window._setMobileTab?.('environment');
            }
          },
          {
            target: '[data-tutorial-id="editor"]',
            title: 'Code Editor',
            description: 'Write your code here with full IntelliSense support, syntax highlighting, and Emmet. Click the ⚙️ icon for editor settings.',
            position: 'top',
            onShow: () => {
              if (isMobile) window._setMobileTab?.('editor');
            }
          },
          {
            target: '[data-tutorial-id="preview"]',
            title: 'Live Preview',
            description: 'See your code output in real-time. Use the Run button, pop-out windows, and devtools to debug your apps.',
            position: 'left',
            onShow: () => {
              if (isMobile) window._setMobileTab?.('preview');
            }
          },
          {
            target: '[data-tutorial-id="preview-toolbar"]',
            title: 'Preview Features',
            description: 'Powerful browser tools: Switch between Mobile, Tablet, and Desktop views, reload the frame, or open it in a new tab for full-screen preview.',
            position: 'bottom',
            onShow: () => {
              if (isMobile) window._setMobileTab?.('preview');
            }
          },
          {
            target: '[data-tutorial-id="terminal-icon"]',
            title: 'Integrated Terminal',
            description: 'Open a full-featured terminal. Type help to see available commands like python, git, and more.',
            position: 'right',
            onShow: (state: EditorState) => {
              if (isMobile) window._setMobileTab?.('terminal');
              else state.openTerminalTab();
            }
          },
          {
            target: isMobile ? '[data-tutorial-id="download-icon-mobile"]' : '[data-tutorial-id="download-icon"]',
            title: 'Download Project',
            description: 'Ready to take your work offline? Download your entire project as a ZIP file with all files and folders preserved.',
            position: isMobile ? 'top' : 'right',
          }
        ], [isMobile])}
      />
      <TutorialModal
        isOpen={showFeatureOverview}
        onClose={() => setShowFeatureOverview(false)}
      />
    </div>
  );
}

export default App;
