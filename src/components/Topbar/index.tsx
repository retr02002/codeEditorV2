import React, { useState } from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import './Topbar.css';
import logo from '../../assets/logo.png';

// Custom events for tutorial triggers
const dispatchTutorialEvent = (type: string) => {
    window.dispatchEvent(new CustomEvent('tutorial-action', { detail: type }));
};

export const Topbar: React.FC = () => {
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const { openFilePicker, openDirectoryPicker, toggleFullScreen } = useEditorStore();

    const handleMenuClick = (menu: string) => {
        if (activeMenu === menu) {
            setActiveMenu(null);
        } else {
            setActiveMenu(menu);
        }
    };

    const handleAction = (action: string) => {
        setActiveMenu(null);
        if (action === 'newFile') {
            const fileName = prompt('Enter file name (e.g., config.js):', 'newFile.js');
            if (fileName) {
                useEditorStore.getState().createFile(fileName);
            }
        } else if (action === 'openFile') {
            openFilePicker();
        } else if (action === 'openFolder') {
            openDirectoryPicker();
        } else if (action === 'toggleExplorer') {
            toggleFullScreen('window1Full');
        } else if (action === 'togglePreview') {
            toggleFullScreen('window3Full');
        } else if (action === 'interactiveGuide') {
            dispatchTutorialEvent('interactive-guide');
        } else if (action === 'featureOverview') {
            dispatchTutorialEvent('feature-overview');
        } else {
            console.log(`Executing ${action}`);
        }
    };

    return (
        <div className="topbar" data-tutorial-id="topbar">
            <div className="topbar-logo">
                <img src={logo} alt="CodeSpace Logo" width="22" height="22" style={{ borderRadius: '4px' }} />
                <span>CodeSpace</span>
            </div>

            <div className="topbar-menu">
                <div className="menu-item-container">
                    <button
                        className={`menu-btn ${activeMenu === 'File' ? 'active' : ''}`}
                        onClick={() => handleMenuClick('File')}
                    >
                        File
                    </button>
                    {activeMenu === 'File' && (
                        <div className="dropdown-menu">
                            <button onClick={() => handleAction('newFile')}>New File</button>
                            <button onClick={() => handleAction('openFile')}>Open File...</button>
                            <button onClick={() => handleAction('openFolder')}>Open Folder...</button>
                            <div className="menu-divider" />
                            <button onClick={() => handleAction('save')}>Save</button>
                        </div>
                    )}
                </div>

                <div className="menu-item-container">
                    <button
                        className={`menu-btn ${activeMenu === 'Edit' ? 'active' : ''}`}
                        onClick={() => handleMenuClick('Edit')}
                    >
                        Edit
                    </button>
                    {activeMenu === 'Edit' && (
                        <div className="dropdown-menu">
                            <button onClick={() => handleAction('undo')}>Undo</button>
                            <button onClick={() => handleAction('redo')}>Redo</button>
                            <div className="menu-divider" />
                            <button onClick={() => handleAction('cut')}>Cut</button>
                            <button onClick={() => handleAction('copy')}>Copy</button>
                            <button onClick={() => handleAction('paste')}>Paste</button>
                        </div>
                    )}
                </div>

                <div className="menu-item-container">
                    <button
                        className={`menu-btn ${activeMenu === 'View' ? 'active' : ''}`}
                        onClick={() => handleMenuClick('View')}
                    >
                        View
                    </button>
                    {activeMenu === 'View' && (
                        <div className="dropdown-menu">
                            <button onClick={() => handleAction('toggleExplorer')}>Toggle Explorer</button>
                            <button onClick={() => handleAction('togglePreview')}>Toggle Preview</button>
                        </div>
                    )}
                </div>

                <div className="menu-item-container">
                    <button
                        className={`menu-btn ${activeMenu === 'Templates' ? 'active' : ''}`}
                        onClick={() => handleMenuClick('Templates')}
                    >
                        Templates
                    </button>
                    {activeMenu === 'Templates' && (
                        <div className="dropdown-menu">
                            <button onClick={() => { useEditorStore.getState().loadTemplate('vanilla'); setActiveMenu(null); }}>Vanilla Web</button>
                            <button onClick={() => { useEditorStore.getState().loadTemplate('react'); setActiveMenu(null); }}>React Boilerplate</button>
                            <button onClick={() => { useEditorStore.getState().loadTemplate('python'); setActiveMenu(null); }}>Python (PyScript)</button>
                        </div>
                    )}
                </div>

                <div className="menu-item-container">
                    <button
                        className={`menu-btn ${activeMenu === 'Tutorial' ? 'active' : ''}`}
                        onClick={() => handleMenuClick('Tutorial')}
                    >
                        Tutorial
                    </button>
                    {activeMenu === 'Tutorial' && (
                        <div className="dropdown-menu">
                            <button onClick={() => handleAction('interactiveGuide')}>
                                <span style={{ marginRight: 6 }}>🎯</span>Interactive Guide
                            </button>
                            <button onClick={() => handleAction('featureOverview')}>
                                <span style={{ marginRight: 6 }}>📖</span>Feature Overview
                            </button>
                        </div>
                    )}
                </div>

                <div className="menu-item-container">
                    <button
                        className={`menu-btn ${activeMenu === 'Run' ? 'active' : ''}`}
                        onClick={() => handleMenuClick('Run')}
                    >
                        Run
                    </button>
                    {activeMenu === 'Run' && (
                        <div className="dropdown-menu">
                            <button onClick={() => handleAction('run')}>Start Debugging</button>
                            <button onClick={() => handleAction('runWithout')}>Run Without Debugging</button>
                        </div>
                    )}
                </div>
            </div>

            <div className="topbar-actions">
                {/* Right side actions logic if any */}
            </div>

            {/* Click outside to close dropdowns */}
            {activeMenu && (
                <div className="menu-overlay" onClick={() => setActiveMenu(null)} />
            )}
        </div>
    );
};
