import React, { useEffect, useRef } from 'react';
import { useEditorStore, type FileNode } from '../../store/useEditorStore';

interface IframeRendererProps {
    iframeId?: string;
}

export const IframeRenderer: React.FC<IframeRendererProps> = ({ iframeId = 'preview-iframe' }) => {
    const { files, settings, activeFileId, environment } = useEditorStore();
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
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

            // ── Python environment: Skulpt REPL ───────────────────────────────
            if (environment === 'python') {
                const pyFile = allFiles.find(f => f.name.endsWith('.py') && f.id === activeFileId)
                    || allFiles.find(f => f.name === 'main.py')
                    || allFiles.find(f => f.name.endsWith('.py'));

                const pyCode = pyFile?.content || '# Write your Python code here\nprint("Hello, World!")';
                const escaped = JSON.stringify(pyCode);

                iframe.srcdoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<script src="https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt-stdlib.js"></script>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0d1117; font-family: 'Fira Code', monospace; font-size: 13px; display: flex; flex-direction: column; height: 100vh; }
  #header { background: #161b22; border-bottom: 1px solid #30363d; padding: 8px 14px; font-size: 11px; color: #3fb950; font-weight: 700; letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px; }
  #output { flex: 1; overflow-y: auto; padding: 14px; color: #c9d1d9; line-height: 1.7; white-space: pre-wrap; }
  .stdout { color: #c9d1d9; }
  .stderr { color: #f85149; }
  .info { color: #58a6ff; font-style: italic; }
</style>
</head>
<body>
<div id="header">🐍 Python — Skulpt Runtime</div>
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

function builtinRead(x) {
  if (Sk.builtinFiles === undefined || Sk.builtinFiles.files[x] === undefined)
    throw Error("File not found: '" + x + "'");
  return Sk.builtinFiles.files[x];
}

Sk.configure({
  output: text => { if (text.trim()) append(text, 'stdout'); },
  read: builtinRead,
  retainGlobals: true,
});

const code = ${escaped};
append('Running...', 'info');
Sk.misceval.asyncToPromise(() => Sk.importMainWithBody('<stdin>', false, code, true))
  .then(() => append('\\n✓ Done', 'info'))
  .catch(e => append('Error: ' + e.toString(), 'stderr'));
</script>
${devToolsScript}
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
${devToolsScript}
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
</head>
<body>
<div id="root"></div>
<script type="text/babel">
${jsCode}
</script>
${devToolsScript}
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
</head>
<body>
<div id="app"></div>
<script>
${jsCode}
</script>
${devToolsScript}
</body>
</html>`;
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
${devToolsScript}
</body>
</html>`;
                return;
            }

            // ── HTML / Vanilla — existing pipeline ───────────────────────────
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
                    const targetFile = allFiles.find(f => f.id === absolutePath);
                    if (targetFile) return inlineCssImports(targetFile.content, targetFile.id, new Set(visited));
                    return m;
                });

                parsed = parsed.replace(/@import\s+["']([^"']+)["']\s*;/gi, (m: string, val: string) => {
                    if (val.startsWith('http') || val.startsWith('data:')) return m;
                    const absolutePath = resolvePath(val, cssDir);
                    const targetFile = allFiles.find(f => f.id === absolutePath);
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
                    const targetFile = allFiles.find(f => f.id === absolutePath);
                    if (targetFile && blobMap.has(targetFile.id)) {
                        return `url("${blobMap.get(targetFile.id)}")`;
                    }
                    return match;
                });
            };

            // 1. Inline CSS Files
            htmlFile = htmlFile.replace(/<link\s+[^>]*href=["']([^"']+)["'][^>]*>/gi, (match, href) => {
                if (href.startsWith('http')) return match;
                const isCss = match.toLowerCase().includes('stylesheet') || href.endsWith('.css');
                if (!isCss) return match;

                const absolutePath = resolvePath(href, htmlPath);
                const cssFile = allFiles.find(f => f.id === absolutePath);

                if (cssFile) {
                    let compiledCss = inlineCssImports(cssFile.content, cssFile.id);
                    compiledCss = resolveCssUrl(compiledCss, cssFile.id);
                    return `<style>\n${compiledCss}\n</style>`;
                }
                return match;
            });

            // 2. Inline Javascript Files — preserve type/data-* attrs (critical for type="text/babel" and type="module")
            htmlFile = htmlFile.replace(/<script(\s[^>]*)?src=["']([^"']+)["']([^>]*)><\/script>/gi,
                (match: string, before: string = '', src: string, after: string = '') => {
                    if (src.startsWith('http')) return match;
                    const absolutePath = resolvePath(src, htmlPath);
                    const jsFile = allFiles.find(f => f.id === absolutePath);
                    if (jsFile) {
                        const allAttrs = (before || '') + ' ' + (after || '');
                        const typeMatch = allAttrs.match(/type=["']([^"']+)["']/i);
                        const presetsMatch = allAttrs.match(/data-presets=["']([^"']+)["']/i);
                        const dataTypeMatch = allAttrs.match(/data-type=["']([^"']+)["']/i);
                        const typeAttr = typeMatch ? ` type="${typeMatch[1]}"` : '';
                        const presetsAttr = presetsMatch ? ` data-presets="${presetsMatch[1]}"` : '';
                        const dataTypeAttr = dataTypeMatch ? ` data-type="${dataTypeMatch[1]}"` : '';
                        return `<script${typeAttr}${presetsAttr}${dataTypeAttr}>\n${jsFile.content}\n</script>`;
                    }
                    return match;
                });

            // 3. Inject raw blob tags for IMG, AUDIO, VIDEO etc.
            htmlFile = htmlFile.replace(/(src|href)=["']([^"']+)["']/gi, (match, attr, val) => {
                if (val.startsWith('http') || val.startsWith('data:')) return match;

                const absolutePath = resolvePath(val, htmlPath);
                const targetFile = allFiles.find(f => f.id === absolutePath);

                if (targetFile && blobMap.has(targetFile.id)) {
                    return `${attr}="${blobMap.get(targetFile.id)}"`;
                }
                return match;
            });

            let bootstrapTag = '';
            if (settings.bootstrapVersion === '5.3.0') {
                bootstrapTag = '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">';
            } else if (settings.bootstrapVersion === '4.5.2') {
                bootstrapTag = '<link href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet">';
            } else if (settings.bootstrapVersion === '3.4.1') {
                bootstrapTag = '<link href="https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css" rel="stylesheet">';
            }

            let finalDoc: string;
            const isFullDoc = /^\s*<!doctype\s+html/i.test(htmlFile);

            if (isFullDoc) {
                // Inject bootstrap into <head> and eruda before </body>
                let doc = htmlFile;
                if (bootstrapTag) {
                    doc = doc.replace(/<\/head>/i, `${bootstrapTag}\n</head>`);
                }
                doc = doc.replace(/<\/body>/i, `${devToolsScript}\n</body>`);
                finalDoc = doc;
            } else {
                finalDoc = `<!DOCTYPE html>\n<html>\n<head>\n${bootstrapTag}\n</head>\n<body>\n${htmlFile}\n${devToolsScript}\n</body>\n</html>`;
            }

            iframe.srcdoc = finalDoc;
        };

        const timeoutId = setTimeout(renderContent, 500);
        return () => clearTimeout(timeoutId);
    }, [files, settings.bootstrapVersion, activeFileId, environment]);

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
