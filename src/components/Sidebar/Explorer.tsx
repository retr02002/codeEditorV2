import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    ChevronDown, ChevronRight, FileJson, FileCode2, FileText, FileImage,
    Folder, FolderOpen, FilePlus, FolderPlus, Trash2, Pencil
} from 'lucide-react';
import { useEditorStore, type FileNode } from '../../store/useEditorStore';

// ─── File icon helper ──────────────────────────────────────────────────────────
const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'js': case 'ts': case 'jsx': case 'tsx': return <FileCode2 size={14} color="#fcd53f" />;
        case 'json': return <FileJson size={14} color="#cb5258" />;
        case 'css': case 'scss': case 'sass': return <FileCode2 size={14} color="#42a5f5" />;
        case 'html': return <FileCode2 size={14} color="#e34f26" />;
        case 'py': return <FileCode2 size={14} color="#3572A5" />;
        case 'md': return <FileText size={14} color="#58a6ff" />;
        case 'png': case 'jpg': case 'jpeg': case 'gif': case 'svg': case 'webp':
            return <FileImage size={14} color="#4caf50" />;
        default: return <FileText size={14} color="#9aa0a6" />;
    }
};

// ─── Inline name input (VS Code-style) ────────────────────────────────────────
const InlineInput: React.FC<{
    icon: React.ReactNode; depth: number;
    onConfirm: (name: string) => void; onCancel: () => void;
}> = ({ icon, depth, onConfirm, onCancel }) => {
    const [val, setVal] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => { inputRef.current?.focus(); }, []);

    return (
        <div className="file-item" style={{ paddingLeft: `${8 + depth * 12 + 20}px`, gap: 5, display: 'flex', alignItems: 'center' }}>
            {icon}
            <input
                ref={inputRef}
                value={val}
                onChange={e => setVal(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') { if (val.trim()) onConfirm(val.trim()); else onCancel(); }
                    if (e.key === 'Escape') onCancel();
                }}
                onBlur={() => { if (val.trim()) onConfirm(val.trim()); else onCancel(); }}
                style={{
                    background: '#1c2128', border: '1px solid #58a6ff', borderRadius: 3,
                    color: '#e6edf3', font: 'inherit', fontSize: 13,
                    padding: '1px 4px', outline: 'none', flex: 1,
                }}
                placeholder="name..." spellCheck={false}
            />
        </div>
    );
};

// ─── Right-click context menu ──────────────────────────────────────────────────
const ContextMenu: React.FC<{
    x: number; y: number; node: FileNode; onClose: () => void;
    onNewFile: () => void; onNewFolder: () => void; onDelete: () => void; onRename: () => void;
}> = ({ x, y, node, onClose, onNewFile, onNewFolder, onDelete, onRename }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [onClose]);

    // Clamp to viewport
    const [pos, setPos] = useState({ top: y, left: x });
    useEffect(() => {
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            setPos({
                top: y + rect.height > window.innerHeight ? y - rect.height : y,
                left: x + rect.width > window.innerWidth ? x - rect.width : x,
            });
        }
    }, [x, y]);

    const btn = (onClick: () => void, label: string, icon: React.ReactNode, danger = false) => (
        <button onClick={() => { onClick(); onClose(); }} style={{
            display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
            color: danger ? '#f85149' : '#c9d1d9', padding: '6px 14px', width: '100%',
            textAlign: 'left', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
        }} onMouseEnter={e => (e.currentTarget.style.background = danger ? 'rgba(248,81,73,.1)' : 'rgba(88,166,255,.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
            {icon}{label}
        </button>
    );

    return (
        <div ref={ref} style={{
            position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999,
            background: '#1c2128', border: '1px solid #30363d', borderRadius: 6,
            boxShadow: '0 8px 24px rgba(0,0,0,.6)', padding: '4px 0', minWidth: 165, fontSize: 12,
        }}>
            {node.type === 'folder' && <>
                {btn(onNewFile, 'New File', <FilePlus size={13} />)}
                {btn(onNewFolder, 'New Folder', <FolderPlus size={13} />)}
                <div style={{ borderTop: '1px solid #30363d', margin: '4px 0' }} />
            </>}
            {btn(onRename, 'Rename', <Pencil size={13} />)}
            {btn(onDelete, 'Delete', <Trash2 size={13} />, true)}
        </div>
    );
};

interface CreatingState { parentId: string | undefined; type: 'file' | 'folder' }

// ─── Single file/folder row ────────────────────────────────────────────────────
const FileNodeItem: React.FC<{
    node: FileNode; depth: number;
    onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
    creating: CreatingState | null;
    onStartCreate: (parentId: string, type: 'file' | 'folder') => void;
    onCreated: (name: string) => void;
    onCancelCreate: () => void;
    dragOverId: string | null;
    setDragOverId: (id: string | null) => void;
    renaming: string | null;
    onStartRename: (id: string) => void;
    onRenamed: (newName: string) => void;
    onCancelRename: () => void;
}> = ({ node, depth, onContextMenu, creating, onStartCreate, onCreated, onCancelCreate, dragOverId, setDragOverId, renaming, onStartRename, onRenamed, onCancelRename }) => {
    const { activeFileId, openFile, deleteNode, moveNode } = useEditorStore();
    const [isOpen, setIsOpen] = useState(true);
    const [hovered, setHovered] = useState(false);
    const isFolder = node.type === 'folder';
    const isDragTarget = dragOverId === node.id && isFolder;

    // ── drag source ──
    const handleDragStart = (e: React.DragEvent) => {
        e.stopPropagation();
        e.dataTransfer.setData('nodeId', node.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    // ── drop target (folders only) ──
    const handleDragOver = (e: React.DragEvent) => {
        if (!isFolder) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        setDragOverId(node.id);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const draggedId = e.dataTransfer.getData('nodeId');
        if (draggedId && draggedId !== node.id && isFolder) {
            moveNode(draggedId, node.id);
            setIsOpen(true);
        }
        setDragOverId(null);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm(`Delete "${node.name}"?`)) return;
        deleteNode(node.id);
    };

    const handleRenameClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onStartRename(node.id);
    };

    return (
        <div>
            <div
                className={`file-item ${activeFileId === node.id ? 'active' : ''}`}
                style={{
                    paddingLeft: `${8 + depth * 12}px`,
                    paddingRight: 6,
                    background: isDragTarget ? 'rgba(88,166,255,0.12)' : undefined,
                    outline: isDragTarget ? '1px solid #58a6ff' : undefined,
                    transition: 'background 0.1s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'grab',
                    position: 'relative',
                }}
                draggable
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragLeave={() => setDragOverId(null)}
                onClick={() => isFolder ? setIsOpen(o => !o) : openFile(node.id)}
                onContextMenu={e => { e.preventDefault(); onContextMenu(e, node); }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            >
                {/* Left: icon + name */}
                <div className="file-item-content" style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {isFolder ? (
                        <>
                            {isOpen ? <ChevronDown size={13} className="folder-chevron" /> : <ChevronRight size={13} className="folder-chevron" />}
                            {isOpen
                                ? <FolderOpen size={14} color="#dbb557" style={{ flexShrink: 0 }} />
                                : <Folder size={14} color="#dbb557" fill="#dbb557" style={{ flexShrink: 0 }} />
                            }
                        </>
                    ) : (
                        <div style={{ marginLeft: 18, display: 'flex', flexShrink: 0 }}>{getFileIcon(node.name)}</div>
                    )}
                    {renaming === node.id ? (
                        <input
                            autoFocus
                            defaultValue={node.name}
                            onKeyDown={e => {
                                if (e.key === 'Enter') { e.preventDefault(); onRenamed(e.currentTarget.value); }
                                if (e.key === 'Escape') { e.preventDefault(); onCancelRename(); }
                            }}
                            onBlur={e => onRenamed(e.currentTarget.value)}
                            onClick={e => e.stopPropagation()}
                            style={{
                                background: '#1c2128', border: '1px solid #58a6ff', borderRadius: 3,
                                color: '#e6edf3', font: 'inherit', fontSize: 13,
                                padding: '1px 4px', outline: 'none', flex: 1, minWidth: 0
                            }}
                            spellCheck={false}
                        />
                    ) : (
                        <span className="file-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {node.name}
                        </span>
                    )}
                </div>

                {/* Right: hover action buttons */}
                {hovered && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        {isFolder && (
                            <>
                                <button
                                    title="New File inside"
                                    onClick={() => { onStartCreate(node.id, 'file'); setIsOpen(true); }}
                                    style={actionBtnStyle}
                                ><FilePlus size={12} /></button>
                                <button
                                    title="New Folder inside"
                                    onClick={() => { onStartCreate(node.id, 'folder'); setIsOpen(true); }}
                                    style={actionBtnStyle}
                                ><FolderPlus size={12} /></button>
                            </>
                        )}
                        <button title="Rename" onClick={handleRenameClick} style={actionBtnStyle}>
                            <Pencil size={12} />
                        </button>
                        <button title="Delete" onClick={handleDelete} style={{ ...actionBtnStyle, color: '#f85149' }}>
                            <Trash2 size={12} />
                        </button>
                    </div>
                )}
            </div>

            {/* Children */}
            {isFolder && isOpen && (
                <div>
                    {creating?.parentId === node.id && (
                        <InlineInput
                            depth={depth + 1}
                            icon={creating.type === 'file' ? <FileText size={14} color="#9aa0a6" /> : <Folder size={14} color="#dbb557" />}
                            onConfirm={onCreated}
                            onCancel={onCancelCreate}
                        />
                    )}
                    {node.children?.map(child => (
                        <FileNodeItem
                            key={child.id} node={child} depth={depth + 1}
                            onContextMenu={onContextMenu}
                            creating={creating} onStartCreate={onStartCreate}
                            onCreated={onCreated} onCancelCreate={onCancelCreate}
                            dragOverId={dragOverId} setDragOverId={setDragOverId}
                            renaming={renaming} onStartRename={onStartRename}
                            onRenamed={onRenamed} onCancelRename={onCancelRename}
                        />
                    ))}
                    {/* Drop zone inside empty open folder */}
                    {!node.children?.length && !creating && (
                        <div
                            style={{ height: 24, paddingLeft: `${8 + (depth + 1) * 12}px`, fontSize: 11, color: '#3e4754', lineHeight: '24px' }}
                            onDragOver={e => { e.preventDefault(); setDragOverId(node.id); }}
                            onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('nodeId'); if (id) moveNode(id, node.id); setDragOverId(null); }}
                        >
                            (empty)
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const actionBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer',
    padding: '2px 3px', borderRadius: 3, lineHeight: 1,
};

// ─── Root drop zone (move to root) ────────────────────────────────────────────
const RootDropZone: React.FC<{ onDrop: (id: string) => void }> = ({ onDrop }) => {
    const [over, setOver] = useState(false);
    return (
        <div
            style={{ height: 8, background: over ? 'rgba(88,166,255,.15)' : 'transparent', transition: 'background .1s' }}
            onDragOver={e => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('nodeId'); if (id) onDrop(id); setOver(false); }}
        />
    );
};

// ─── Explorer ─────────────────────────────────────────────────────────────────
export const Explorer: React.FC = () => {
    const { files, createFile, createFolder, moveNode, renameNode, deleteNode } = useEditorStore();
    const [isOpen, setIsOpen] = useState(true);
    const [creating, setCreating] = useState<CreatingState | null>(null);
    const [renaming, setRenaming] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode } | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);

    const handleCreate = useCallback((name: string) => {
        if (!creating) return;
        if (creating.type === 'file') createFile(name, creating.parentId);
        else createFolder(name, creating.parentId);
        setCreating(null);
    }, [creating, createFile, createFolder]);

    return (
        <div style={{ position: 'relative', height: '100%' }}>
            {/* ── Header ── */}
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div onClick={() => setIsOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flex: 1 }}>
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span style={{ marginLeft: 4 }}>EXPLORER</span>
                </div>
                <div style={{ display: 'flex', gap: 6, paddingRight: 8, color: '#9aa0a6' }}>
                    <button title="New File at root" onClick={e => {
                        e.stopPropagation();
                        setCreating({ parentId: undefined, type: 'file' });
                        setIsOpen(true);
                    }} style={actionBtnStyle}>
                        <FilePlus size={14} />
                    </button>
                    <button title="New Folder at root" onClick={e => {
                        e.stopPropagation();
                        setCreating({ parentId: undefined, type: 'folder' });
                        setIsOpen(true);
                    }} style={actionBtnStyle}>
                        <FolderPlus size={14} />
                    </button>
                </div>
            </div>

            {isOpen && (
                <div className="file-list">
                    {creating && creating.parentId === undefined && (
                        <InlineInput
                            depth={0}
                            icon={creating.type === 'file' ? <FileText size={14} color="#9aa0a6" /> : <Folder size={14} color="#dbb557" />}
                            onConfirm={handleCreate}
                            onCancel={() => setCreating(null)}
                        />
                    )}
                    {files.map(file => (
                        <FileNodeItem
                            key={file.id} node={file} depth={0}
                            onContextMenu={(e, node) => setContextMenu({ x: e.clientX, y: e.clientY, node })}
                            creating={creating}
                            onStartCreate={(parentId, type) => setCreating({ parentId, type })}
                            onCreated={handleCreate}
                            onCancelCreate={() => setCreating(null)}
                            dragOverId={dragOverId}
                            setDragOverId={setDragOverId}
                            renaming={renaming}
                            onStartRename={setRenaming}
                            onRenamed={(n) => { if (n.trim()) renameNode(renaming!, n.trim()); setRenaming(null); }}
                            onCancelRename={() => setRenaming(null)}
                        />
                    ))}

                    {files.length === 0 && !creating && (
                        <div style={{ padding: '16px 12px', fontSize: 12, color: '#6e7681', textAlign: 'center' }}>
                            No files yet.<br />Click <strong>+</strong> to create one.
                        </div>
                    )}

                    {/* Drop to root zone at bottom */}
                    <RootDropZone onDrop={id => moveNode(id, null)} />
                </div>
            )}

            {/* Context menu */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x} y={contextMenu.y} node={contextMenu.node}
                    onClose={() => setContextMenu(null)}
                    onNewFile={() => { setCreating({ parentId: contextMenu.node.id, type: 'file' }); if (!isOpen) setIsOpen(true); }}
                    onNewFolder={() => { setCreating({ parentId: contextMenu.node.id, type: 'folder' }); if (!isOpen) setIsOpen(true); }}
                    onDelete={() => { if (window.confirm(`Delete "${contextMenu.node.name}"?`)) deleteNode(contextMenu.node.id); }}
                    onRename={() => setRenaming(contextMenu.node.id)}
                />
            )}
        </div>
    );
};
