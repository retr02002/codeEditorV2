import React, { useEffect, useRef } from 'react';
import { useEditorStore, type FileNode } from '../../store/useEditorStore';

interface IframeRendererProps {
    iframeId?: string;
}

export const IframeRenderer: React.FC<IframeRendererProps> = ({ iframeId = 'preview-iframe' }) => {
    const { files, settings, activeFileId, environment, pipPackages, activeVenv, runCounter } = useEditorStore();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const prevCounterRef = useRef(-1);
    const hasMountedRef = useRef(false);

    useEffect(() => {
        // Always render on first mount; after that, only when runCounter changes or liveEditing is on
        if (hasMountedRef.current && !settings.liveEditing && runCounter === prevCounterRef.current) {
            return;
        }

        const renderContent = () => {
            const iframe = iframeRef.current;
            if (!iframe) return;

            const allFiles: FileNode[] = [];
            const flatten = (nodes: FileNode[]) => {
                nodes.forEach(n => {
                    allFiles.push(n);
                    if (n.children) flatten(n.children);
                });
            };
            flatten(files);

            const devToolsScript = `
            <style>
                html body .eruda-container .eruda-entry-btn { display: none !important; }
            </style>
            <script src="https://cdn.jsdelivr.net/npm/eruda"></script>
            <script>
                if (window.eruda) {
                    eruda.init({
                        useShadowDom: false,
                        defaults: { displaySize: 50, transparency: 0.9, theme: 'Dark' },
                        tools: ['console', 'elements', 'network', 'resources']
                    });

                    if (eruda._entryBtn) eruda._entryBtn.hide();
                    setInterval(function() {
                        var btn = document.querySelector('.eruda-entry-btn');
                        if (btn) btn.remove();
                    }, 50);

                    /* Inject fix CSS AFTER eruda.init so it overrides Eruda's own styles */
                    function applyErudaFix() {
                        var s = document.getElementById('eruda-fix-css');
                        if (!s) {
                            s = document.createElement('style');
                            s.id = 'eruda-fix-css';
                            document.head.appendChild(s);
                        }
                        s.textContent = [
                            /* Constrain entire container to iframe width */
                            '.eruda-container{left:0!important;right:0!important;width:100%!important;max-width:100vw!important;box-sizing:border-box!important;overflow:hidden!important;}',
                            /* Make the nav tab bar horizontally scrollable */
                            '.eruda-tool-nav{overflow:hidden!important;}',
                            '.eruda-tool-nav ul{display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;overflow-y:hidden!important;-webkit-overflow-scrolling:touch!important;scrollbar-width:none!important;max-width:100%!important;width:100%!important;}',
                            '.eruda-tool-nav ul::-webkit-scrollbar{display:none!important;}',
                            '.eruda-tool-nav li{flex-shrink:0!important;}'
                        ].join('');
                    }
                    applyErudaFix();
                    /* Re-apply after a short delay in case Eruda appends more styles */
                    setTimeout(applyErudaFix, 300);
                    setTimeout(applyErudaFix, 800);

                    window.addEventListener('message', function(e) {
                        if (e.data === 'TOGGLE_ERUDA') {
                            var instance = eruda.get();
                            if (window._erudaVisible) {
                                instance.hide();
                                window._erudaVisible = false;
                            } else {
                                instance.show();
                                window._erudaVisible = true;
                                /* Re-apply fix every time panel opens */
                                setTimeout(applyErudaFix, 100);
                            }
                        }
                    });
                }
            </script>`;

            // ── Python environment: Pyodide REPL ───────────────────────────────
            if (environment === 'python') {
                const pyFile = allFiles.find(f => f.name.endsWith('.py') && f.id === activeFileId)
                    || allFiles.find(f => f.name === 'main.py')
                    || allFiles.find(f => f.name.endsWith('.py'));

                const pyCode = pyFile?.content || '# Write your Python code here\nprint("Hello, World!")';
                const escaped = JSON.stringify(pyCode);
                const packagesJson = JSON.stringify(pipPackages[activeVenv || 'global'] || []);

                iframe.srcdoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<script src="https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js"></script>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0d1117; font-family: 'Fira Code', monospace; font-size: 13px; display: flex; flex-direction: column; height: 100vh; }
  #header { background: #161b22; border-bottom: 1px solid #30363d; padding: 8px 14px; font-size: 11px; color: #3fb950; font-weight: 700; letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px; }
  #output { flex: 1; overflow-y: auto; padding: 14px; color: #c9d1d9; line-height: 1.7; white-space: pre-wrap; word-break: break-word; }
  .stdout { color: #c9d1d9; }
  .stderr { color: #f85149; }
  .info { color: #58a6ff; font-style: italic; }
</style>
${devToolsScript}
</head>
<body>
<div id="header">🐍 Python — Pyodide Runtime</div>
<div id="output"></div>
<script>
const out = document.getElementById('output');
const append = (text, cls) => {
  const d = document.createElement('div');
  d.className = cls;
  d.textContent = text;
  out.appendChild(d);
  out.scrollTop = out.scrollHeight;
};

const code = ${escaped};
const pipPkgs = ${packagesJson};

async function main() {
    append('⏳ Loading Pyodide...', 'info');
    try {
        let pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/"
        });
        
        pyodide.setStdout({ batched: (str) => append(str, 'stdout') });
        pyodide.setStderr({ batched: (str) => append(str, 'stderr') });

        if (pipPkgs && pipPkgs.length > 0) {
            append('📦 Installing packages: ' + pipPkgs.join(', '), 'info');
            await pyodide.loadPackage("micropip");
            const micropip = pyodide.pyimport("micropip");
            await micropip.install(pipPkgs);
        }

        const filesData = ${JSON.stringify(allFiles.map(f => ({ path: (f.id && f.id.startsWith('/') ? f.id : '/' + (f.id || f.name)), content: f.content })))};
        filesData.forEach(f => {
            if (f.content !== undefined && f.content !== null && f.content !== "") {
                try {
                    const parts = f.path.split('/');
                    let curr = '';
                    for (let i = 1; i < parts.length - 1; i++) {
                        curr += '/' + parts[i];
                        try { pyodide.FS.mkdir(curr); } catch(e) {}
                    }
                    pyodide.FS.writeFile(f.path, f.content);
                    // Also write to the root for simplicity if it's a flat structure
                    if (parts.length > 2) {
                        try { pyodide.FS.writeFile('/' + parts[parts.length - 1], f.content); } catch(e) {}
                    }
                    // For paths without leading slash
                    try { pyodide.FS.writeFile(f.path.replace(/^\\//, ''), f.content); } catch(e) {}
                } catch(e) {
                    console.error("Error writing file", f.path, e);
                }
            }
        });

        append('▶ Running...', 'info');
        try { pyodide.FS.chdir('/'); } catch(e) {}
        await pyodide.runPythonAsync(code);
        
        append('\\n✓ Done', 'info');
    } catch (err) {
        append(err.toString(), 'stderr');
    }
}
main();
</script>
</body>
</html>`;
                return;
            }

            // ── Node.js / JS REPL environment ─────────────────────────────────
            if (environment === 'nodejs') {
                const jsFile = allFiles.find(f => f.id === activeFileId && f.name.endsWith('.js'))
                    || allFiles.find(f => f.name === 'main.js')
                    || allFiles.find(f => f.name.endsWith('.js'));

                const jsCode = jsFile?.content || 'console.log("Hello from Node.js REPL!");';
                const escaped = JSON.stringify(jsCode);

                iframe.srcdoc = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0d1117; font-family: 'Fira Code', monospace; font-size: 13px; display: flex; flex-direction: column; height: 100vh; }
  #header { background: #161b22; border-bottom: 1px solid #30363d; padding: 8px 14px; font-size: 11px; color: #68a063; font-weight: 700; letter-spacing: 0.5px; }
  #output { flex: 1; overflow-y: auto; padding: 14px; color: #c9d1d9; line-height: 1.7; }
  .log { color: #c9d1d9; white-space: pre-wrap; word-break: break-all; }
  .error { color: #f85149; white-space: pre-wrap; }
  .warn { color: #d29922; white-space: pre-wrap; }
  .info { color: #58a6ff; white-space: pre-wrap; }
  .sys { color: #6e7681; font-style: italic; font-size: 11px; }
  .sep { border: none; border-top: 1px solid #21262d; margin: 6px 0; }
</style>
${devToolsScript}
</head>
<body>
<div id="header">🟢 Node.js — Browser Sandbox</div>
<div id="output"></div>
<script>
const out = document.getElementById('output');
const fmt = (args) => args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
const append = (text, cls) => {
  const d = document.createElement('div');
  d.className = cls;
  d.textContent = text;
  out.appendChild(d);
  out.scrollTop = out.scrollHeight;
};
const _log = console.log, _err = console.error, _warn = console.warn, _info = console.info;
console.log = (...a) => { append(fmt(a), 'log'); };
console.error = (...a) => { append('✖ ' + fmt(a), 'error'); };
console.warn = (...a) => { append('⚠ ' + fmt(a), 'warn'); };
console.info = (...a) => { append('ℹ ' + fmt(a), 'info'); };
window.onerror = (m, s, l, c, e) => { append('Error: ' + m, 'error'); return true; };

append('> Running main.js', 'sys');
const hr = document.createElement('hr'); hr.className = 'sep'; out.appendChild(hr);
try {
  eval(${escaped});
  const hr2 = document.createElement('hr'); hr2.className = 'sep'; out.appendChild(hr2);
  append('✓ Execution complete', 'sys');
} catch(e) { append('Error: ' + e.message, 'error'); }
</script>
</body>
</html>`;
                return;
            }

            // ── React environment ─────────────────────────────────────────────
            if (environment === 'react') {
                const jsFile = allFiles.find(f => f.id === activeFileId && (f.name.endsWith('.js') || f.name.endsWith('.jsx')))
                    || allFiles.find(f => f.name === 'App.js' || f.name === 'App.jsx')
                    || allFiles.find(f => f.name.endsWith('.js') || f.name.endsWith('.jsx'));
                const cssFile = allFiles.find(f => f.name.endsWith('.css'));
                const jsCode = jsFile?.content || 'ReactDOM.createRoot(document.getElementById("root")).render(<h1>Hello React!</h1>);';
                const cssCode = cssFile?.content || '';

                iframe.srcdoc = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<style>${cssCode}</style>
${devToolsScript}
</head>
<body>
<div id="root"></div>
<script type="text/babel">
${jsCode}
</script>
</body>
</html>`;
                return;
            }

            // ── Vue 3 environment ─────────────────────────────────────────────
            if (environment === 'vue') {
                const jsFile = allFiles.find(f => f.id === activeFileId && f.name.endsWith('.js'))
                    || allFiles.find(f => f.name === 'app.js' || f.name === 'App.js')
                    || allFiles.find(f => f.name.endsWith('.js'));
                const cssFile = allFiles.find(f => f.name.endsWith('.css'));
                const jsCode = jsFile?.content || `const { createApp, ref } = Vue;\ncreateApp({ setup() { return { msg: ref('Hello Vue 3!') }; }, template: '<h1>{{msg}}</h1>' }).mount('#app');`;
                const cssCode = cssFile?.content || '';

                iframe.srcdoc = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
<style>${cssCode}</style>
${devToolsScript}
</head>
<body>
<div id="app"></div>
<script>
${jsCode}
</script>
</body>
</html>`;
                return;
            }

            // ── Wandbox API environments ─────────────────────────────────────────
            const wandboxEnvs = ['c', 'cpp', 'rust', 'go', 'ruby', 'lua', 'csharp'];
            if (wandboxEnvs.includes(environment)) {
                let compilerName = 'gcc-head';
                let fileExt = '.cpp';
                let icon = '⚙️';
                let label = 'Compiler';
                
                if (environment === 'c') { compilerName = 'gcc-13.2.0-c'; fileExt = '.c'; icon = '⚙️'; label = 'C'; }
                if (environment === 'cpp') { compilerName = 'gcc-head'; fileExt = '.cpp'; icon = '⚙️'; label = 'C++'; }
                if (environment === 'rust') { compilerName = 'rust-1.82.0'; fileExt = '.rs'; icon = '🦀'; label = 'Rust'; }
                if (environment === 'go') { compilerName = 'go-1.23.2'; fileExt = '.go'; icon = '🐹'; label = 'Go'; }
                if (environment === 'ruby') { compilerName = 'ruby-3.4.1'; fileExt = '.rb'; icon = '💎'; label = 'Ruby'; }
                if (environment === 'lua') { compilerName = 'lua-5.4.7'; fileExt = '.lua'; icon = '🌙'; label = 'Lua'; }
                if (environment === 'csharp') { compilerName = 'mono-6.12.0.199'; fileExt = '.cs'; icon = '🟣'; label = 'C# (.NET)'; }

                const mainFile = allFiles.find(f => f.id === activeFileId && f.name.endsWith(fileExt))
                    || allFiles.find(f => f.name.endsWith(fileExt))
                    || allFiles[0];

                const sourceCode = mainFile?.content || '';
                const escaped = JSON.stringify(sourceCode);

                iframe.removeAttribute('src'); // using srcdoc
                iframe.srcdoc = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body { background: #0d1117; font-family: 'Fira Code', monospace; font-size: 13px; display: flex; flex-direction: column; height: 100vh; margin: 0; padding: 0; }
  #header { background: #161b22; border-bottom: 1px solid #30363d; padding: 8px 14px; font-size: 11px; color: #a8b9cc; font-weight: 700; letter-spacing: 0.5px; }
  #output { flex: 1; overflow-y: auto; padding: 14px; color: #c9d1d9; line-height: 1.7; white-space: pre-wrap; word-break: break-all; }
  .info { color: #58a6ff; font-style: italic; font-size: 12px; margin-bottom: 10px; }
  .error { color: #f85149; }
</style>
</head>
<body>
<div id="header">${icon} ${label} — Wandbox API</div>
<div id="output">
  <div class="info" id="status">⏳ Sending code to Wandbox Compilation API...</div>
</div>
<script>
  const out = document.getElementById('output');
  const status = document.getElementById('status');
  
  let slowTimer = setTimeout(() => {
     if(status) status.innerHTML = '⏳ Compiling... (Wandbox can sometimes take up to 10 seconds for safe execution if cold)';
  }, 2500);

  fetch('https://wandbox.org/api/compile.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      compiler: "${compilerName}",
      code: ${escaped}
    })
  })
  .then(res => res.json())
  .then(data => {
      clearTimeout(slowTimer);
      if(status) status.remove();
      if (data.status !== "0") {
          out.innerHTML = '<span class="error">Compilation Error:\\n' + (data.compiler_error || data.program_error || 'Unknown Error') + '</span>';
      } else {
          out.textContent = data.program_output || data.compiler_message || '';
          if (data.program_error) {
              out.innerHTML += '\\n<span class="error">\\n' + data.program_error + '</span>';
          }
      }
  })
  .catch(err => {
      clearTimeout(slowTimer);
      if(status) status.remove();
      out.innerHTML = '<span class="error">Network Error: ' + err.toString() + '</span>';
  });
</script>
</body>
</html>`;
                return;
            }

            // ── Blazor fallback ───────────────────────────────────────────────
            if (environment === 'blazor') {
                iframe.removeAttribute('src'); // using srcdoc
                iframe.srcdoc = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body { background: #0d1117; font-family: 'system-ui', sans-serif; font-size: 14px; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; color: #c9d1d9; text-align: center; padding: 20px; }
  .box { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 30px; max-width: 500px; }
  h2 { color: #a371f7; margin-top: 0; }
</style>
</head>
<body>
<div class="box">
  <h2>Blazor WASM</h2>
  <p>In-browser compilation of full Blazor WebAssembly applications requires heavy .NET SDK downloads which are not optimal for this lightweight editor.</p>
  <p>For full Blazor support, consider using a dedicated tool like <a href="https://blazorrepl.telerik.com" target="_blank" style="color:#58a6ff;">Blazor REPL</a>.</p>
</div>
</body>
</html>`;
                return;
            }

            // ── Dart CLI and Flutter Native React Embedding ──────────────────
            if (environment === 'dart' || environment === 'flutter') {
                const url = environment === 'dart' 
                    ? 'https://dartpad.dev/embed-dart.html?theme=dark&run=true' 
                    : 'https://dartpad.dev/embed-flutter.html?theme=dark&run=true';
                
                const activeFile = allFiles.find(f => f.id === activeFileId && f.name.endsWith('.dart'))
                    || allFiles.find(f => f.name === 'main.dart')
                    || allFiles.find(f => f.name.endsWith('.dart'));

                const sourceCode = activeFile?.content || '';

                // We load the DartPad iframe DIRECTLY into the main iframe block.
                // This ensures e.source matches iframe.contentWindow exactly and has a valid origin to receive postMessage code!
                iframe.removeAttribute('srcdoc');
                if (iframe.src !== url) {
                    iframe.src = url;
                }

                if ((window as any)._dartPadListener) {
                    window.removeEventListener('message', (window as any)._dartPadListener);
                }

                const listener = (e: MessageEvent) => {
                    if (e.data && e.data.type === 'ready') {
                        iframe.contentWindow?.postMessage({
                            type: 'sourceCode',
                            sourceCode: {
                                'main.dart': sourceCode
                            }
                        }, '*');
                    }
                };

                (window as any)._dartPadListener = listener;
                window.addEventListener('message', listener);

                // Fallback in case the iframe was already loaded from a previous run and doesn't fire 'ready' again
                if (iframe.contentWindow) {
                    iframe.contentWindow.postMessage({
                        type: 'sourceCode',
                        sourceCode: {
                            'main.dart': sourceCode
                        }
                    }, '*');
                }

                return;
            }

            // ── TypeScript environment ────────────────────────────────────────
            if (environment === 'typescript') {
                const tsFile = allFiles.find(f => f.id === activeFileId && (f.name.endsWith('.ts') || f.name.endsWith('.tsx')))
                    || allFiles.find(f => f.name.endsWith('.ts') || f.name.endsWith('.tsx'))
                    || allFiles.find(f => f.name.endsWith('.js'));
                const cssFile = allFiles.find(f => f.name.endsWith('.css'));
                const tsCode = tsFile?.content || `const greet = (name: string) => \`Hello \${name}!\`;\ndocument.getElementById('app')!.textContent = greet('TypeScript');`;
                const cssCode = cssFile?.content || '';

                const escapedTs = tsCode.replace(/<\/script>/gi, '<\\/script>');

                iframe.srcdoc = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<style>
${cssCode}
#_ts_loading { position:fixed;top:0;left:0;right:0;background:#0f172a;color:#64748b;font:12px monospace;padding:8px 14px;z-index:99; }
#_ts_err { background:#1e1b1b;color:#f87171;padding:14px;font:13px/1.6 monospace;white-space:pre-wrap;border-left:3px solid #ef4444;margin:12px; }
</style>
${devToolsScript}
</head>
<body>
<div id="_ts_loading">⏳ Loading TypeScript compiler…</div>
<div id="app"></div>
<script type="text/plain" id="_ts_code">
${escapedTs}
</script>
<script>
window.onerror = function(msg, src, line, col, err) {
  var l = document.getElementById('_ts_loading'); if (l) l.style.display='none';
  var d = document.getElementById('_ts_err') || document.createElement('div');
  d.id = '_ts_err'; d.textContent = '❌ ' + msg + (err ? '\\n' + err.stack : '');
  document.body.appendChild(d);
  return true;
};

try {
    const code = document.getElementById('_ts_code').textContent;
    const result = Babel.transform(code, {
        presets: ['typescript', 'env'],
        filename: 'main.ts'
    });
    
    var l = document.getElementById('_ts_loading'); if (l) l.style.display = 'none';
    
    const script = document.createElement('script');
    script.textContent = result.code;
    document.body.appendChild(script);
} catch (err) {
    var l = document.getElementById('_ts_loading'); if (l) l.style.display = 'none';
    var d = document.getElementById('_ts_err') || document.createElement('div');
    d.id = '_ts_err'; d.textContent = '❌ Compile Error: ' + err.message;
    document.body.appendChild(d);
}
</script>
</body>
</html>`;
                return;
            }

            // ── HTML / Vanilla / WebGL / SVG / Canvas ────────────────────────
            const htmlNode = allFiles.find(f => f.id === activeFileId && f.name.endsWith('.html'))
                || allFiles.find(f => f.name === 'index.html')
                || allFiles.find(f => f.name.endsWith('.html'));

            if (!htmlNode) return;

            let htmlFile = htmlNode.content;
            const htmlPath = htmlNode.id.substring(0, htmlNode.id.lastIndexOf('/'));

            const resolvePath = (relativePath: string, basePath: string) => {
                if (relativePath.startsWith('/')) return relativePath;
                const parts = basePath.split('/').filter(Boolean);
                const relParts = relativePath.split('/');
                for (const part of relParts) {
                    if (part === '.') continue;
                    if (part === '..') parts.pop();
                    else parts.push(part);
                }
                return '/' + parts.join('/');
            };

            const blobMap = new Map<string, string>();
            allFiles.forEach(f => {
                if (f.fileObject && !f.content) {
                    blobMap.set(f.id, URL.createObjectURL(f.fileObject));
                } else if (f.name.toLowerCase().endsWith('.svg') && f.content) {
                    const blob = new Blob([f.content], { type: 'image/svg+xml' });
                    blobMap.set(f.id, URL.createObjectURL(blob));
                } else if (f.remoteUrl) {
                    // GitHub-cloned binary assets: use the raw remote URL directly
                    blobMap.set(f.id, f.remoteUrl);
                }
            });

            // Inline helper for CSS @import statements to recursively trace and merge CSS trees manually
            const inlineCssImports = (cssContent: string, cssId: string, visited: Set<string> = new Set()): string => {
                if (visited.has(cssId)) return cssContent;
                visited.add(cssId);
                const cssDir = cssId.substring(0, cssId.lastIndexOf('/'));

                let parsed = cssContent.replace(/@import\s+url\(['"]?([^)'"]+)['"]?\)\s*;/gi, (m: string, val: string) => {
                    if (val.startsWith('http') || val.startsWith('data:')) return m;
                    const absolutePath = resolvePath(val, cssDir);
                    const targetFile = allFiles.find(f => f.id === absolutePath || f.id === val || f.name === val.split('/').pop());
                    if (targetFile) return inlineCssImports(targetFile.content, targetFile.id, new Set(visited));
                    return m;
                });

                parsed = parsed.replace(/@import\s+["']([^"']+)["']\s*;/gi, (m: string, val: string) => {
                    if (val.startsWith('http') || val.startsWith('data:')) return m;
                    const absolutePath = resolvePath(val, cssDir);
                    const targetFile = allFiles.find(f => f.id === absolutePath || f.id === val || f.name === val.split('/').pop());
                    if (targetFile) return inlineCssImports(targetFile.content, targetFile.id, new Set(visited));
                    return m;
                });

                return parsed;
            };

            const resolveCssUrl = (cssContent: string, cssFileId: string) => {
                const cssDir = cssFileId.substring(0, cssFileId.lastIndexOf('/'));
                return cssContent.replace(/url\(['"]?([^)'"]+)['"]?\)/gi, (match, urlValue) => {
                    if (urlValue.startsWith('http') || urlValue.startsWith('data:')) return match;
                    const absolutePath = resolvePath(urlValue, cssDir);
                    const targetFile = allFiles.find(f => f.id === absolutePath || f.id === urlValue || f.name === urlValue.split('/').pop());
                    if (targetFile && blobMap.has(targetFile.id)) {
                        return `url("${blobMap.get(targetFile.id)}")`;
                    }
                    return match;
                });
            };

            // 1. Inline CSS Files
            htmlFile = htmlFile.replace(/<link\s+[^>]*href=["']([^"']+)["'][^>]*>/gi, (match, href) => {
                if (href.startsWith('http')) return match;
                const isCss = match.toLowerCase().includes('stylesheet') || href.endsWith('.css') || href.endsWith('.scss') || href.endsWith('.less');
                if (!isCss) return match;

                const absolutePath = resolvePath(href, htmlPath);
                const cssFile = allFiles.find(f => f.id === absolutePath || f.id === href || f.name === href.split('/').pop());

                if (cssFile) {
                    let compiledCss = inlineCssImports(cssFile.content, cssFile.id);
                    compiledCss = resolveCssUrl(compiledCss, cssFile.id);
                    if (settings.cssMode === 'LESS' || href.endsWith('.less')) {
                        return `<style type="text/less">\n${compiledCss}\n</style>`;
                    } else if (settings.cssMode === 'SCSS' || href.endsWith('.scss')) {
                        return `<style type="text/scss" class="scss-code">\n${compiledCss}\n</style>`;
                    }
                    return `<style>\n${compiledCss}\n</style>`;
                }
                return match;
            });

            // 2. Inline Javascript Files — preserve type/data-* attrs (critical for type="text/babel" and type="module")
            htmlFile = htmlFile.replace(/<script(\s[^>]*)?src=["']([^"']+)["']([^>]*)><\/script>/gi,
                (match: string, before: string = '', src: string, after: string = '') => {
                    if (src.startsWith('http')) return match;
                    const absolutePath = resolvePath(src, htmlPath);
                    const jsFile = allFiles.find(f => f.id === absolutePath || f.id === src || f.name === src.split('/').pop());
                    if (jsFile) {
                        const allAttrs = (before || '') + ' ' + (after || '');
                        let typeAttr = allAttrs.match(/type=["']([^"']+)["']/i)?.[0] || '';
                        let presetsAttr = allAttrs.match(/data-presets=["']([^"']+)["']/i)?.[0] || '';
                        const dataTypeAttr = allAttrs.match(/data-type=["']([^"']+)["']/i)?.[0] || '';
                        
                        if (settings.jsMode === 'Babel' || settings.jsMode === 'TypeScript' || src.endsWith('.ts') || src.endsWith('.jsx') || src.endsWith('.tsx')) {
                            if (!typeAttr) typeAttr = 'type="text/babel"';
                            if (!presetsAttr) {
                                presetsAttr = (settings.jsMode === 'TypeScript' || src.endsWith('.ts') || src.endsWith('.tsx')) 
                                    ? 'data-presets="env,typescript"' 
                                    : 'data-presets="env,react"';
                            }
                        }
                        return `<script ${typeAttr} ${presetsAttr} ${dataTypeAttr}>\n${jsFile.content}\n</script>`;
                    }
                    return match;
                });

            // 3. Inject raw blob tags for IMG, AUDIO, VIDEO etc.
            htmlFile = htmlFile.replace(/(src|href)=["']([^"']+)["']/gi, (match, attr, val) => {
                if (val.startsWith('http') || val.startsWith('data:')) return match;

                const absolutePath = resolvePath(val, htmlPath);
                const targetFile = allFiles.find(f => f.id === absolutePath || f.id === val || f.name === val.split('/').pop());

                if (targetFile && blobMap.has(targetFile.id)) {
                    return `${attr}="${blobMap.get(targetFile.id)}"`;
                }
                return match;
            });

            let extraTags = '';
            
            // UI Libraries
            if (settings.bootstrapVersion === '5.3.0') {
                extraTags += '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">\n';
            } else if (settings.bootstrapVersion === '4.5.2') {
                extraTags += '<link href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet">\n';
            } else if (settings.bootstrapVersion === '3.4.1') {
                extraTags += '<link href="https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css" rel="stylesheet">\n';
            }
            if (settings.jquery) extraTags += '<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>\n';
            if (settings.fontAwesome) extraTags += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">\n';
            if (settings.iconify) extraTags += '<script src="https://code.iconify.design/3/3.1.0/iconify.min.js"></script>\n';
            if (settings.owlCarousel) {
                extraTags += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/OwlCarousel2/2.3.4/assets/owl.carousel.min.css">\n';
                extraTags += '<script src="https://cdnjs.cloudflare.com/ajax/libs/OwlCarousel2/2.3.4/owl.carousel.min.js"></script>\n';
            }

            // Compilers
            if (settings.htmlMode === 'Pug') {
                extraTags += '<script src="https://pugjs.org/js/pug.js"></script>\n';
            } else if (settings.htmlMode === 'Markdown') {
                extraTags += '<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>\n';
            } else if (settings.htmlMode === 'Haml') {
                extraTags += '<script src="https://cdnjs.cloudflare.com/ajax/libs/clientside-haml-js/5.4.0/haml.min.js"></script>\n';
            } else if (settings.htmlMode === 'Mustache') {
                extraTags += '<script src="https://cdnjs.cloudflare.com/ajax/libs/mustache.js/4.2.0/mustache.min.js"></script>\n';
            } else if (settings.htmlMode === 'EJS') {
                extraTags += '<script src="https://cdn.jsdelivr.net/npm/ejs@3.1.9/ejs.min.js"></script>\n';
            }

            if (settings.cssMode === 'LESS' || htmlFile.includes('type="text/less"')) {
                extraTags += '<script src="https://cdn.jsdelivr.net/npm/less"></script>\n';
            }
            if (settings.cssMode === 'SCSS' || htmlFile.includes('type="text/scss"')) {
                extraTags += '<script src="https://unpkg.com/sass.js@0.11.1/dist/sass.sync.min.js"></script>\n';
                extraTags += `<script>
                    window.addEventListener('DOMContentLoaded', () => {
                        if (typeof Sass !== 'undefined') {
                            document.querySelectorAll('style.scss-code').forEach(el => {
                                Sass.compile(el.textContent, result => {
                                    if(result.status === 0) {
                                        const style = document.createElement('style');
                                        style.textContent = result.text;
                                        document.head.appendChild(style);
                                    } else { console.error('SCSS Error:', result.message); }
                                });
                            });
                        }
                    });
                </script>\n`;
            }
            if (settings.jsMode === 'Babel' || settings.jsMode === 'TypeScript' || htmlFile.includes('type="text/babel"')) {
                extraTags += '<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>\n';
            }

            let finalDoc: string;
            const srcEscaped = htmlFile.replace(/`/g, '\\`').replace(/\$/g, '\\$').replace(/<\/script>/gi, '<\\/script>');
            
            if (settings.htmlMode === 'Pug') {
                finalDoc = `<!DOCTYPE html>\n<html>\n<head>\n${devToolsScript}\n${extraTags}\n</head>\n<body>\n<script>\ntry{ const src=\`${srcEscaped}\`; const html = typeof pug !== 'undefined' ? pug.render(src) : require('pug').render(src); document.write(html); }catch(e){console.error('Pug err:', e);}\n</script>\n</body>\n</html>`;
            } else if (settings.htmlMode === 'Markdown') {
                finalDoc = `<!DOCTYPE html>\n<html>\n<head>\n${devToolsScript}\n${extraTags}\n</head>\n<body>\n<script>\ntry{ document.write(marked.parse(\`${srcEscaped}\`)); }catch(e){console.error('Markdown err:', e);}\n</script>\n</body>\n</html>`;
            } else if (settings.htmlMode === 'Haml') {
                finalDoc = `<!DOCTYPE html>\n<html>\n<head>\n${devToolsScript}\n${extraTags}\n</head>\n<body>\n<script>\ntry{ document.write(haml.compileHaml({source: \`${srcEscaped}\`})()); }catch(e){console.error('Haml err:', e);}\n</script>\n</body>\n</html>`;
            } else if (settings.htmlMode === 'Mustache') {
                finalDoc = `<!DOCTYPE html>\n<html>\n<head>\n${devToolsScript}\n${extraTags}\n</head>\n<body>\n<script>\ntry{ document.write(Mustache.render(\`${srcEscaped}\`, {})); }catch(e){console.error('Mustache err:', e);}\n</script>\n</body>\n</html>`;
            } else if (settings.htmlMode === 'EJS') {
                finalDoc = `<!DOCTYPE html>\n<html>\n<head>\n${devToolsScript}\n${extraTags}\n</head>\n<body>\n<script>\ntry{ document.write(ejs.render(\`${srcEscaped}\`, {})); }catch(e){console.error('EJS err:', e);}\n</script>\n</body>\n</html>`;
            } else {
                const isFullDoc = /^\s*<!doctype\s+html/i.test(htmlFile);
                if (isFullDoc) {
                    let doc = htmlFile;
                    doc = doc.replace(/<head>/i, `<head>\n${devToolsScript}\n${extraTags}`);
                    finalDoc = doc;
                } else {
                    finalDoc = `<!DOCTYPE html>\n<html>\n<head>\n${devToolsScript}\n${extraTags}\n</head>\n<body>\n${htmlFile}\n</body>\n</html>`;
                }
            }

            iframe.srcdoc = finalDoc;
        };

        const timeoutId = setTimeout(() => {
            renderContent();
            hasMountedRef.current = true;
            prevCounterRef.current = runCounter;
        }, 50);
        return () => clearTimeout(timeoutId);
    }, [files, settings.bootstrapVersion, activeFileId, environment, settings.liveEditing, runCounter, activeVenv, pipPackages, settings.cssMode, settings.fontAwesome, settings.htmlMode, settings.iconify, settings.jquery, settings.jsMode, settings.owlCarousel]);

    return (
        <iframe
            id={iframeId}
            ref={iframeRef}
            title="preview"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
            style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#fff' }}
        />
    );
};
