/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { create } from "zustand";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export interface FileNode {
  id: string;
  name: string;
  content: string;
  language: string;
  type: "file" | "folder";
  children?: FileNode[];
  fileObject?: File;
  remoteUrl?: string; // used for GitHub-cloned binary assets (images, fonts, etc.)
}

export interface EditorSettings {
  suggestions: boolean;
  emmet: boolean;
  liveEditing: boolean;
  saveToRun: boolean;
  fontSize: number;
  fontFamily: string;
  theme: string;
  bootstrapVersion: string;
}

interface EditorState {
  files: FileNode[];
  activeFileId: string | null;
  settings: EditorSettings;
  layout: {
    window1Full: boolean;
    window2Full: boolean;
    window3Full: boolean;
  };
  showEditorSettings: boolean;
  activeSidebarTab: 'explorer' | 'search' | 'github' | 'extensions' | 'settings' | 'environment';
  sidebarVisible: boolean;
  openFiles: string[];
  installedExtensions: string[];
  toggleExtension: (id: string) => void;
  isExtensionInstalled: (id: string) => boolean;
  setFiles: (files: FileNode[]) => void;
  setActiveFileId: (id: string | null) => void;
  openFile: (id: string) => void;
  closeFile: (id: string) => void;
  setShowEditorSettings: (show: boolean) => void;
  setActiveSidebarTab: (tab: 'explorer' | 'search' | 'github' | 'extensions' | 'settings' | 'environment') => void;
  updateFileContent: (id: string, content: string) => void;
  updateSettings: (settings: Partial<EditorSettings>) => void;
  toggleFullScreen: (
    window: "window1Full" | "window2Full" | "window3Full",
  ) => void;
  openFilePicker: () => Promise<void>;
  openDirectoryPicker: () => Promise<void>;
  cloneGitHubRepo: (url: string) => Promise<void>;
  createFile: (name: string, parentId?: string) => void;
  createFolder: (name: string, parentId?: string) => void;
  deleteNode: (id: string) => void;
  renameNode: (id: string, newName: string) => void;
  moveNode: (draggedId: string, targetFolderId: string | null) => void;
  exportProjectZip: () => Promise<void>;
  loadTemplate: (template: 'vanilla' | 'react' | 'vue' | 'typescript' | 'python' | 'nodejs') => void;
  environment: 'vanilla' | 'react' | 'vue' | 'typescript' | 'python' | 'nodejs';
  devServerUrl: string | null;
  setDevServerUrl: (url: string | null) => void;
  // Multi-tab preview state — survives fullscreen remounts
  previewTabs: PreviewTab[];
  activePreviewTabId: string;
  addPreviewTab: () => void;
  closePreviewTab: (id: string) => void;
  setActivePreviewTab: (id: string) => void;
  setPreviewTabUrl: (id: string, url: string | null) => void;
  reloadPreviewTab: (id: string) => void;
  // Floating draggable windows — per-tab, multiple allowed
  floatingWindows: FloatingWindowConfig[];
  openFloatingWindow: (tabId: string) => void;
  closeFloatingWindow: (windowId: string) => void;
}

export interface PreviewTab {
  id: string;
  label: string;
  url: string | null;  // null = project preview, string = external URL
  reloadKey: number;
}

export interface FloatingWindowConfig {
  id: string;       // unique window ID
  tabId: string;    // which preview tab this window mirrors
  x: number;
  y: number;
}

const initialFiles: FileNode[] = [
  {
    id: "1",
    name: "index.html",
    language: "html",
    content:
      '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Document</title>\n</head>\n<body>\n  <h1>Hello Advanced Editor</h1>\n</body>\n</html>',
    type: "file",
  },
  {
    id: "2",
    name: "styles.css",
    language: "css",
    content: "body {\n  background-color: var(--bg-color);\n  color: #fff;\n}",
    type: "file",
  },
  {
    id: "3",
    name: "script.js",
    language: "javascript",
    content: 'console.log("Hello from Javascript!");',
    type: "file",
  },
];

const templates = {
  vanilla: initialFiles,
  react: [
    {
      id: 'react-1',
      name: 'index.html',
      language: 'html',
      type: 'file' as const,
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React App</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></meta>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" src="App.js"></script>
</body>
</html>`
    },
    {
      id: 'react-2',
      name: 'App.js',
      language: 'javascript',
      type: 'file' as const,
      content: `const { useState } = React;

function App() {
  const [count, setCount] = useState(0);
  return (
    <div className="container">
      <h1>\u26a1 React 18 Live Editor</h1>
      <p>Powered by Babel Standalone \u2014 edit and see changes instantly!</p>
      <p className="count">{count}</p>
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button onClick={() => setCount(c => c - 1)}>\u2212</button>
        <button onClick={() => setCount(0)}>Reset</button>
        <button onClick={() => setCount(c => c + 1)}>+</button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);`
    },
    {
      id: 'react-3',
      name: 'style.css',
      language: 'css',
      type: 'file' as const,
      content: `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: #0d1117; color: #e6edf3; padding: 24px; }
.container { max-width: 480px; margin: 0 auto; text-align: center; }
h1 { font-size: 1.8rem; margin-bottom: 8px; }
p { color: #8b949e; margin-bottom: 20px; }
.count { font-size: 3rem; font-weight: 700; color: #58a6ff; margin: 16px 0; }
button { background: #21262d; border: 1px solid #30363d; color: #e6edf3; padding: 10px 22px; border-radius: 6px; cursor: pointer; font-size: 1rem; }
button:hover { background: #2f81f7; border-color: #2f81f7; }`
    }
  ],
  python: [
    {
      id: 'py-1',
      name: 'main.py',
      language: 'python',
      type: 'file' as const,
      content: `# Python runs in your browser via Skulpt (Python 3 subset)
import datetime

def greet(name):
    return f"Hello, {name}! 🐍"

result = greet("World")
print(result)

for i in range(5):
    print(f"  {i+1}: {'*' * (i+1)}")

print("Python is running in the browser!")`
    }
  ],
  vue: [
    {
      id: 'vue-1',
      name: 'index.html',
      language: 'html',
      type: 'file' as const,
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Vue 3 App</title>
  <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"><\/script>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="app">
    <h1>{{ title }}</h1>
    <p>Count: <strong>{{ count }}</strong></p>
    <button @click="increment">Increment</button>
    <button @click="reset" style="margin-left:8px">Reset</button>
    <ul>
      <li v-for="item in items" :key="item">{{ item }}</li>
    </ul>
  </div>
  <script type="module" src="app.js"><\/script>
</body>
</html>`
    },
    {
      id: 'vue-2',
      name: 'app.js',
      language: 'javascript',
      type: 'file' as const,
      content: `const { createApp, ref, reactive } = Vue;

createApp({
  template: \`
    <div>
      <h1>{{ title }}</h1>
      <p class="sub">Vue 3 Composition API ⚡</p>
      <p class="count">{{ count }}</p>
      <div class="btns">
        <button @click="increment">+</button>
        <button @click="reset" class="reset">Reset</button>
        <button @click="decrement">−</button>
      </div>
      <ul>
        <li v-for="item in items" :key="item">{{ item }}</li>
      </ul>
    </div>
  \`,
  setup() {
    const title = ref('Vue 3 Live Editor');
    const count = ref(0);
    const items = reactive(['Reactivity ✅', 'Composition API ✅', 'Template Syntax ✅']);
    const increment = () => count.value++;
    const decrement = () => count.value--;
    const reset = () => count.value = 0;
    return { title, count, items, increment, decrement, reset };
  }
}).mount('#app');`
    },
    {
      id: 'vue-3',
      name: 'style.css',
      language: 'css',
      type: 'file' as const,
      content: `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; padding: 2rem; background: #0d1117; color: #e6edf3; }
h1 { font-size: 1.8rem; margin-bottom: 4px; }
.sub { color: #8b949e; font-size: 13px; margin-bottom: 20px; }
.count { font-size: 3.5rem; font-weight: 700; color: #41b883; text-align: center; margin: 16px 0; }
.btns { display: flex; gap: 8px; justify-content: center; margin-bottom: 20px; }
button { background: #41b883; color: #fff; border: none; padding: 10px 22px; border-radius: 6px; cursor: pointer; font-size: 1rem; transition: background 0.15s; }
button:hover { background: #33a473; }
.reset { background: #21262d; border: 1px solid #30363d; }
.reset:hover { background: #30363d; }
ul { list-style: none; padding: 0; } li { padding: 6px 10px; background: #161b22; border: 1px solid #30363d; border-radius: 6px; margin-bottom: 6px; color: #58a6ff; }`
    }
  ],
  typescript: [
    {
      id: 'ts-1',
      name: 'main.ts',
      language: 'typescript',
      type: 'file' as const,
      content: `// TypeScript — compiled by Babel Standalone in the browser

interface User {
  name: string;
  age: number;
  role: 'admin' | 'viewer';
}

const greet = (user: User): string =>
  \`Hello, \${user.name}! You are a \${user.role}.\`;

const users: User[] = [
  { name: 'Alice', age: 28, role: 'admin' },
  { name: 'Bob', age: 34, role: 'viewer' },
];

const app = document.getElementById('app')!;
app.innerHTML = [
  '<h1>🔷 TypeScript Playground</h1>',
  '<p>Compiled in the browser via Babel Standalone + TypeScript preset</p>',
  '<ul>' + users.map(u => \`<li>\${greet(u)} (age \${u.age})</li>\`).join('') + '</ul>',
].join('');
`
    },
    {
      id: 'ts-2',
      name: 'style.css',
      language: 'css',
      type: 'file' as const,
      content: `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; padding: 2rem; }
h1 { color: #3b82f6; margin-bottom: 8px; font-size: 1.6rem; }
p { color: #94a3b8; margin-bottom: 16px; font-size: 13px; }
ul { padding-left: 20px; } li { margin: 6px 0; color: #c7d2fe; }`
    }
  ],
  nodejs: [
    {
      id: 'node-1',
      name: 'main.js',
      language: 'javascript',
      type: 'file' as const,
      content: `// Node.js REPL — output appears below via console.log
// (runs in browser using a sandboxed JS engine)

const os = { platform: 'browser', version: 'Node.js 20 (simulated)' };
const path = { join: (...parts) => parts.join('/') };

console.log('Node.js Environment:', os.version);
console.log('Platform:', os.platform);

// Example: working with data
const data = [1, 2, 3, 4, 5];
const doubled = data.map(n => n * 2);
console.log('Original:', data);
console.log('Doubled:', doubled);
console.log('Sum:', data.reduce((a, b) => a + b, 0));

// Example: async/await
async function fetchData() {
  return { status: 'ok', message: 'Hello from async Node!' };
}

fetchData().then(res => console.log('Async result:', JSON.stringify(res)));`
    }
  ],
};


async function recursivelyReadDirectory(directoryHandle: any, path: string = ''): Promise<FileNode[]> {
  const nodes: FileNode[] = [];
  for await (const entry of directoryHandle.values()) {
    const entryPath = `${path}/${entry.name}`;
    if (entry.kind === 'file') {
      const file = await entry.getFile();
      try {
        const isTxt = /\.(txt|html|css|js|ts|json|md|csv|xml|svg|py)$/i.test(entry.name);
        const text = isTxt ? await file.text() : '';
        let lang = 'plaintext';
        if (entry.name.endsWith('.js') || entry.name.endsWith('.ts')) lang = 'javascript';
        else if (entry.name.endsWith('.html')) lang = 'html';
        else if (entry.name.endsWith('.css')) lang = 'css';
        else if (entry.name.endsWith('.json')) lang = 'json';
        else if (entry.name.endsWith('.py')) lang = 'python';

        nodes.push({
          id: entryPath,
          name: entry.name,
          content: text,
          language: lang,
          type: 'file',
          fileObject: file
        });
      } catch (e) {
        console.warn(`Skipping unreadable file ${entry.name}`);
      }
    } else if (entry.kind === 'directory') {
      // ignore node_modules
      if (entry.name === 'node_modules' || entry.name === '.git') continue;

      const children = await recursivelyReadDirectory(entry, entryPath);
      nodes.push({
        id: entryPath,
        name: entry.name,
        content: '',
        language: 'plaintext',
        type: 'folder',
        children
      });
    }
  }
  return nodes;
}

export const findNodeById = (nodes: FileNode[], id: string | null): FileNode | undefined => {
  if (!id) return undefined;
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
};

export const useEditorStore = create<EditorState>((set, get) => ({
  files: initialFiles,
  activeFileId: "1",
  environment: 'vanilla' as const,
  devServerUrl: null,
  previewTabs: [{ id: 'tab-1', label: 'Preview 1', url: null, reloadKey: 0 }],
  activePreviewTabId: 'tab-1',
  floatingWindows: [],
  settings: {
    suggestions: true,
    emmet: true,
    liveEditing: true,
    saveToRun: false,
    fontSize: 14,
    fontFamily: "Fira Code, Courier, monospace",
    theme: "vs-dark",
    bootstrapVersion: "none",
  },
  layout: {
    window1Full: false,
    window2Full: false,
    window3Full: false,
  },
  installedExtensions: ['emmet', 'dracula'], // Pre-install emmet and dracula
  showEditorSettings: false,
  activeSidebarTab: 'explorer',
  sidebarVisible: true,
  openFiles: ["1", "2", "3"],
  setDevServerUrl: (url) => set({ devServerUrl: url }),
  openFloatingWindow: (tabId) => set((state) => {
    // Cascade each new window 36px down-right from previous
    const offset = state.floatingWindows.length * 36;
    const newWin: FloatingWindowConfig = {
      id: `fw-${Date.now()}`,
      tabId,
      x: 80 + offset,
      y: 80 + offset,
    };
    return { floatingWindows: [...state.floatingWindows, newWin] };
  }),
  closeFloatingWindow: (windowId) => set((state) => ({
    floatingWindows: state.floatingWindows.filter(w => w.id !== windowId)
  })),
  addPreviewTab: () => set((state) => {
    const newId = `tab-${Date.now()}`;
    const newTab: PreviewTab = { id: newId, label: `Preview ${state.previewTabs.length + 1}`, url: null, reloadKey: 0 };
    return { previewTabs: [...state.previewTabs, newTab], activePreviewTabId: newId };
  }),
  closePreviewTab: (id) => set((state) => {
    if (state.previewTabs.length <= 1) return {}; // can't close last tab
    const newTabs = state.previewTabs.filter(t => t.id !== id);
    const newActive = state.activePreviewTabId === id
      ? newTabs[newTabs.length - 1].id
      : state.activePreviewTabId;
    return { previewTabs: newTabs, activePreviewTabId: newActive };
  }),
  setActivePreviewTab: (id) => set({ activePreviewTabId: id }),
  setPreviewTabUrl: (id, url) => set((state) => ({
    previewTabs: state.previewTabs.map(t => t.id === id ? { ...t, url } : t)
  })),
  reloadPreviewTab: (id) => set((state) => ({
    previewTabs: state.previewTabs.map(t => t.id === id ? { ...t, reloadKey: t.reloadKey + 1 } : t)
  })),
  setFiles: (files) => set({ files }),
  openFile: (id) => set((state) => ({
    openFiles: state.openFiles.includes(id) ? state.openFiles : [...state.openFiles, id],
    activeFileId: id
  })),
  setActiveFileId: (id) => set((state) => {
    if (id === null) return { activeFileId: null };
    if (!state.openFiles.includes(id)) {
      return { openFiles: [...state.openFiles, id], activeFileId: id };
    }
    return { activeFileId: id };
  }),
  closeFile: (id) => set((state) => {
    const newOpenFiles = state.openFiles.filter(fid => fid !== id);
    const newActiveFile = state.activeFileId === id
      ? (newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null)
      : state.activeFileId;
    return { openFiles: newOpenFiles, activeFileId: newActiveFile };
  }),
  setShowEditorSettings: (show) => set({ showEditorSettings: show }),
  setActiveSidebarTab: (tab) => set((state) => {
    if (state.activeSidebarTab === tab && state.sidebarVisible) {
      return { sidebarVisible: false };
    }
    return { activeSidebarTab: tab, sidebarVisible: true };
  }),
  toggleExtension: (id: string) => set(state => ({
    installedExtensions: state.installedExtensions.includes(id)
      ? state.installedExtensions.filter(e => e !== id)
      : [...state.installedExtensions, id]
  })),
  isExtensionInstalled: (id: string) => get().installedExtensions.includes(id),
  updateFileContent: (id, content) =>
    set((state) => {
      const deepUpdate = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
          if (node.id === id) return { ...node, content };
          if (node.children) return { ...node, children: deepUpdate(node.children) };
          return node;
        });
      };
      return { files: deepUpdate(state.files) };
    }),
  updateSettings: (newSettings) =>
    set((state) => ({ settings: { ...state.settings, ...newSettings } })),
  toggleFullScreen: (window) =>
    set((state) => {
      const isCurrentlyFull = state.layout[window];
      return {
        layout: {
          window1Full: window === "window1Full" ? !isCurrentlyFull : false,
          window2Full: window === "window2Full" ? !isCurrentlyFull : false,
          window3Full: window === "window3Full" ? !isCurrentlyFull : false,
        },
      };
    }),
  createFile: (name, parentId) =>
    set((state) => {
      const extension = name.split('.').pop() || '';
      let lang = 'plaintext';
      if (extension === 'js' || extension === 'ts') lang = 'javascript';
      else if (extension === 'html') lang = 'html';
      else if (extension === 'css') lang = 'css';
      else if (extension === 'json') lang = 'json';
      else if (extension === 'py') lang = 'python';

      const newNode: FileNode = {
        id: `local-${Date.now()}`,
        name,
        content: '',
        language: lang,
        type: 'file',
      };

      if (!parentId) {
        return { files: [...state.files, newNode], activeFileId: newNode.id, openFiles: [...state.openFiles, newNode.id] };
      }

      const insertNode = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
          if (node.id === parentId && node.type === 'folder') {
            return { ...node, children: [...(node.children || []), newNode] };
          }
          if (node.children) return { ...node, children: insertNode(node.children) };
          return node;
        });
      };

      return { files: insertNode(state.files), activeFileId: newNode.id, openFiles: [...state.openFiles, newNode.id] };
    }),
  createFolder: (name, parentId) =>
    set((state) => {
      const newNode: FileNode = {
        id: `local-folder-${Date.now()}`,
        name,
        content: '',
        language: 'plaintext',
        type: 'folder',
        children: []
      };

      if (!parentId) {
        return { files: [...state.files, newNode] };
      }

      const insertNode = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
          if (node.id === parentId && node.type === 'folder') {
            return { ...node, children: [...(node.children || []), newNode] };
          }
          if (node.children) return { ...node, children: insertNode(node.children) };
          return node;
        });
      };

      return { files: insertNode(state.files) };
    }),
  exportProjectZip: async () => {
    const zip = new JSZip();

    const buildZip = (nodes: FileNode[], currentZip: JSZip) => {
      nodes.forEach(node => {
        if (node.type === 'file') {
          currentZip.file(node.name, node.fileObject || node.content || '');
        } else if (node.type === 'folder') {
          const folder = currentZip.folder(node.name);
          if (folder && node.children) buildZip(node.children, folder);
        }
      });
    };

    buildZip(get().files, zip);

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'project.zip');
  },
  loadTemplate: (template) =>
    set(() => {
      const payload = templates[template];
      return {
        files: payload,
        activeFileId: payload[0].id,
        openFiles: [payload[0].id],
        environment: template,
      };
    }),
  deleteNode: (id) =>
    set((state) => {
      const remove = (nodes: FileNode[]): FileNode[] =>
        nodes.filter(n => n.id !== id).map(n => n.children ? { ...n, children: remove(n.children) } : n);
      const newFiles = remove(state.files);
      const newOpenFiles = state.openFiles.filter(fid => fid !== id);
      const newActiveFile = state.activeFileId === id
        ? (newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null)
        : state.activeFileId;
      return { files: newFiles, openFiles: newOpenFiles, activeFileId: newActiveFile };
    }),
  renameNode: (id, newName) =>
    set((state) => {
      const rename = (nodes: FileNode[]): FileNode[] =>
        nodes.map(n =>
          n.id === id ? { ...n, name: newName } : n.children ? { ...n, children: rename(n.children) } : n
        );
      return { files: rename(state.files) };
    }),
  moveNode: (draggedId, targetFolderId) =>
    set((state) => {
      // Extract the dragged node
      let dragged: FileNode | null = null;
      const extract = (nodes: FileNode[]): FileNode[] =>
        nodes.filter(n => {
          if (n.id === draggedId) { dragged = { ...n }; return false; }
          return true;
        }).map(n => n.children ? { ...n, children: extract(n.children) } : n);

      const filesWithout = extract(state.files);
      if (!dragged) return {};

      // Insert into target
      if (targetFolderId === null) {
        return { files: [...filesWithout, dragged] };
      }
      const insert = (nodes: FileNode[]): FileNode[] =>
        nodes.map(n => {
          if (n.id === targetFolderId && n.type === 'folder') {
            return { ...n, children: [...(n.children || []), dragged!] };
          }
          return n.children ? { ...n, children: insert(n.children) } : n;
        });
      return { files: insert(filesWithout) };
    }),
  openFilePicker: async () => {
    if (!('showOpenFilePicker' in window)) {
      alert("Your browser does not support the Local File System API. Please use Chrome or Edge Desktop.");
      return;
    }
    try {
      const [fileHandle] = await (window as any).showOpenFilePicker();
      const file = await fileHandle.getFile();
      const isTxt = /\.(txt|html|css|js|ts|json|md|csv|xml|svg|py)$/i.test(file.name);
      const text = isTxt ? await file.text() : '';
      let lang = 'plaintext';
      if (file.name.endsWith('.js') || file.name.endsWith('.ts')) lang = 'javascript';
      else if (file.name.endsWith('.html')) lang = 'html';
      else if (file.name.endsWith('.css')) lang = 'css';
      else if (file.name.endsWith('.json')) lang = 'json';
      else if (file.name.endsWith('.py')) lang = 'python';

      const newNode: FileNode = {
        id: `/${file.name}`,
        name: file.name,
        content: text,
        language: lang,
        type: "file",
        fileObject: file
      };
      set((state) => ({
        files: [...state.files, newNode],
        activeFileId: newNode.id
      }));
    } catch (err) {
      console.error("Failed to open file", err);
    }
  },
  openDirectoryPicker: async () => {
    // Prefer native File System Access API (Chrome/Edge)
    if ('showDirectoryPicker' in window) {
      try {
        const directoryHandle = await (window as any).showDirectoryPicker();
        const nodes = await recursivelyReadDirectory(directoryHandle);
        set({ files: nodes, activeFileId: null });
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') console.error('Failed to open directory', err);
        return;
      }
    }
    // Fallback: use a hidden <input webkitdirectory> — works in Brave, Firefox, Safari
    const input = document.createElement('input');
    input.type = 'file';
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('multiple', '');
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = async () => {
      const fileList = Array.from(input.files || []);
      document.body.removeChild(input);
      if (!fileList.length) return;

      // Build a nested FileNode tree from the flat webkitRelativePath list
      const resultNodes: FileNode[] = [];

      const getOrCreateFolder = (parts: string[], arr: FileNode[]): FileNode[] => {
        if (!parts.length) return arr;
        const name = parts[0];
        let folder = arr.find(n => n.type === 'folder' && n.name === name);
        if (!folder) {
          folder = { id: parts.join('/'), name, content: '', language: 'plaintext', type: 'folder', children: [] };
          arr.push(folder);
        }
        return getOrCreateFolder(parts.slice(1), folder.children!);
      };

      for (const file of fileList) {
        const relPath = (file as any).webkitRelativePath as string || file.name;
        const parts = relPath.split('/');
        // Skip node_modules and .git
        if (parts.some((p: string) => p === 'node_modules' || p === '.git')) continue;
        const fileName = parts[parts.length - 1];
        const folderParts = parts.slice(1, parts.length - 1); // skip root folder name

        const isTxt = /\.(txt|html|css|js|ts|jsx|tsx|json|md|csv|xml|svg|py)$/i.test(fileName);
        let text = '';
        try { if (isTxt) text = await file.text(); } catch (e) { /* binary */ }

        let lang = 'plaintext';
        if (/\.(js|ts|jsx|tsx)$/.test(fileName)) lang = 'javascript';
        else if (/\.html$/.test(fileName)) lang = 'html';
        else if (/\.css$/.test(fileName)) lang = 'css';
        else if (/\.json$/.test(fileName)) lang = 'json';
        else if (/\.py$/.test(fileName)) lang = 'python';

        const node: FileNode = { id: '/' + relPath, name: fileName, content: text, language: lang, type: 'file', fileObject: file };
        const targetArr = folderParts.length ? getOrCreateFolder(folderParts, resultNodes) : resultNodes;
        targetArr.push(node);
      }
      set({ files: resultNodes, activeFileId: null });
    };
    input.click();
  },
  cloneGitHubRepo: async (repoUrl: string) => {
    // Parse a GitHub URL like https://github.com/owner/repo or owner/repo
    const match = repoUrl.match(/(?:github\.com\/)([^\/]+)\/([^\/\s\.]+)/);
    if (!match) {
      alert('Invalid GitHub URL. Use format: https://github.com/owner/repo');
      return;
    }
    const [, owner, repo] = match;
    try {
      // Try to get the default branch
      const repoInfo = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
      if (!repoInfo.ok) throw new Error(`Repo not found: ${repoInfo.status}`);
      const repoData = await repoInfo.json();
      const branch = repoData.default_branch || 'main';

      // Get the full recursive file tree
      const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
      if (!treeRes.ok) throw new Error(`Failed to fetch tree: ${treeRes.status}`);
      const treeData = await treeRes.json();

      const treeItems = (treeData.tree || []).filter((item: any) =>
        item.type === 'blob' &&
        !item.path.startsWith('node_modules/') &&
        !item.path.startsWith('.git/')
      );

      // Limit to 80 files to avoid API rate limits
      const limited = treeItems.slice(0, 80);
      const resultNodes: FileNode[] = [];

      const getOrCreateFolder = (parts: string[], arr: FileNode[]): FileNode[] => {
        if (!parts.length) return arr;
        const name = parts[0];
        let folder = arr.find(n => n.type === 'folder' && n.name === name);
        if (!folder) {
          folder = { id: '/' + parts.join('/'), name, content: '', language: 'plaintext', type: 'folder', children: [] };
          arr.push(folder);
        }
        return getOrCreateFolder(parts.slice(1), folder.children!);
      };

      for (const item of limited) {
        const parts = item.path.split('/');
        const fileName = parts[parts.length - 1];
        const folderParts = parts.slice(0, parts.length - 1);

        const isText = /\.(txt|html|css|js|ts|jsx|tsx|json|md|xml|svg|py|sh|yaml|yml|toml|env)$/i.test(fileName);
        const isImage = /\.(png|jpg|jpeg|gif|webp|ico|bmp|avif|tiff)$/i.test(fileName);
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${item.path}`;

        let text = '';
        if (isText) {
          try {
            const raw = await fetch(rawUrl);
            if (raw.ok) text = await raw.text();
          } catch (e) { /* skip */ }
        }

        let lang = 'plaintext';
        if (/\.(js|ts|jsx|tsx)$/.test(fileName)) lang = 'javascript';
        else if (/\.html$/.test(fileName)) lang = 'html';
        else if (/\.css$/.test(fileName)) lang = 'css';
        else if (/\.json$/.test(fileName)) lang = 'json';
        else if (/\.py$/.test(fileName)) lang = 'python';

        const node: FileNode = {
          id: '/' + item.path,
          name: fileName,
          content: text,
          language: lang,
          type: 'file',
          // For images/binary, store the remote URL so IframeRenderer can substitute it directly
          ...(isImage ? { remoteUrl: rawUrl } : {}),
        };
        const targetArr = folderParts.length ? getOrCreateFolder(folderParts, resultNodes) : resultNodes;
        targetArr.push(node);
      }

      const firstFile = limited[0];
      const firstId = firstFile ? '/' + firstFile.path : null;
      set({ files: resultNodes, activeFileId: firstId, openFiles: firstId ? [firstId] : [] });
    } catch (err: any) {
      alert(`Failed to clone repository: ${err.message}`);
    }
  },
}));
