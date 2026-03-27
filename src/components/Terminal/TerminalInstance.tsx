import React, { useEffect, useRef, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { useEditorStore, type FileNode, type ShellType } from '../../store/useEditorStore';

function flattenFiles(nodes: FileNode[]): string[] {
    const result: string[] = [];
    for (const n of nodes) {
        if (n.type === 'file') result.push(n.id);
        if (n.children) result.push(...flattenFiles(n.children));
    }
    return result;
}

function flattenFilesDetails(nodes: FileNode[]): FileNode[] {
    const result: FileNode[] = [];
    for (const n of nodes) {
        if (n.type === 'file') result.push(n);
        if (n.children) result.push(...flattenFilesDetails(n.children));
    }
    return result;
}

declare global {
    interface Window {
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        loadPyodide: (config: { indexURL: string }) => Promise<any>;
        pyodideInstance: unknown;
    }
}

async function getPyodide() {
    if (window.pyodideInstance) return window.pyodideInstance;
    if (!window.loadPyodide) {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    const pyodide = await window.loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.1/full/' });
    await pyodide.loadPackage("micropip");
    window.pyodideInstance = pyodide;
    return pyodide;
}

const SHELL_PROMPTS: Record<ShellType, (cwd: string, branch: string, venv: string | null) => string> = {
    bash: (cwd, branch, venv) => `${venv ? `(${venv}) ` : ''}\x1b[32m${cwd}\x1b[0m \x1b[34m(${branch})\x1b[0m \x1b[97m$\x1b[0m `,
    zsh: (cwd, _branch, venv) => `${venv ? `\x1b[36m(${venv})\x1b[0m ` : ''}\x1b[32m${cwd}\x1b[0m \x1b[33m❯\x1b[0m `,
    sh: (cwd, _branch, venv) => `${venv ? `(${venv}) ` : ''}${cwd} $ `,
    node: () => `\x1b[32m>\x1b[0m `,
    python: () => `\x1b[33m>>>\x1b[0m `,
};

interface TerminalInstanceProps {
    id: string;
    isActive: boolean;
}

export const TerminalInstance: React.FC<TerminalInstanceProps> = ({ id, isActive }) => {
    const termRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const inputBufferRef = useRef('');
    const historyRef = useRef<string[]>([]);
    const histIdxRef = useRef(-1);
    const cwdRef = useRef('~/project');
    const branchRef = useRef('main');
    const stagedFilesRef = useRef<string[]>([]);
    const commitsRef = useRef<{ hash: string; msg: string; date: string }[]>([]);
    const isProcessingRef = useRef(false);

    // Get shell type from store
    const shellType = useEditorStore(s => {
        const tab = s.terminalTabs.find(t => t.id === id);
        return tab?.shellType || 'bash';
    });

    const getStoreState = useCallback(() => useEditorStore.getState(), []);

    const buildPrompt = useCallback(() => {
        const { activeVenv } = getStoreState();
        return SHELL_PROMPTS[shellType](cwdRef.current, branchRef.current, activeVenv);
    }, [shellType, getStoreState]);

    const writePrompt = useCallback(() => {
        const term = xtermRef.current;
        if (!term) return;
        term.write('\r\n' + buildPrompt());
    }, [buildPrompt]);

    const writeLine = useCallback((text: string) => {
        const term = xtermRef.current;
        if (!term) return;
        term.write('\r\n' + text);
    }, []);

    const writeLines = useCallback((texts: string[]) => {
        const term = xtermRef.current;
        if (!term) return;
        texts.forEach(t => term.write('\r\n' + t));
    }, []);

    const handleCommand = useCallback(async (raw: string) => {
        const term = xtermRef.current;
        if (!term) return;
        const input = raw.trim();
        if (!input) { writePrompt(); return; }

        historyRef.current = [input, ...historyRef.current.slice(0, 49)];
        histIdxRef.current = -1;

        const args = input.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
        const cmd = args[0];
        const sub = args[1];

        const { files, cloneGitHubRepo, createFile, createFolder, deleteNode, pipPackages, activeVenv, setActiveVenv, addPipPackage, removePipPackage } = getStoreState();

        // ── git ──────────────────────────────────────────────
        if (cmd === 'git') {
            if (!sub) { writeLine('\x1b[31mgit: missing subcommand\x1b[0m'); writePrompt(); return; }

            if (sub === 'clone') {
                const url = args[2];
                if (!url) { writeLine('\x1b[31mgit clone: missing repository URL\x1b[0m'); writePrompt(); return; }
                writeLines(['\x1b[36mCloning into repository...\x1b[0m', '\x1b[90mFetching file tree from GitHub API...\x1b[0m']);
                try {
                    await cloneGitHubRepo(url);
                    const match = url.match(/\/([^/]+?)(?:\.git)?$/);
                    const repoName = match ? match[1] : 'repo';
                    cwdRef.current = `~/project/${repoName}`;
                    writeLines(['\x1b[32mremote: Enumerating objects: done.\x1b[0m', '\x1b[92m✓ Clone complete! Files loaded into Explorer.\x1b[0m']);
                } catch (e: unknown) {
                    writeLine(`\x1b[31merror: ${e instanceof Error ? e.message : String(e)}\x1b[0m`);
                }
                writePrompt(); return;
            }

            if (sub === 'status') {
                const allFiles = flattenFiles(files);
                writeLines([
                    `\x1b[1mOn branch ${branchRef.current}\x1b[0m`, '',
                    stagedFilesRef.current.length
                        ? '\x1b[32mChanges staged for commit:\x1b[0m'
                        : "\x1b[90mNothing staged. Use 'git add .' to stage files.\x1b[0m",
                    ...stagedFilesRef.current.map(f => `  \x1b[32mmodified: ${f}\x1b[0m`), '',
                    `\x1b[90mWorkspace has ${allFiles.length} file(s).\x1b[0m`,
                ]);
                writePrompt(); return;
            }

            if (sub === 'add') {
                const target = args[2];
                if (!target) { writeLine("\x1b[31mgit add: missing file argument. Try 'git add .'\x1b[0m"); writePrompt(); return; }
                const allFiles = flattenFiles(files);
                if (target === '.' || target === '-A' || target === '--all') {
                    stagedFilesRef.current = allFiles;
                    writeLine(`\x1b[32m✓ Staged ${allFiles.length} files.\x1b[0m`);
                } else {
                    const match = allFiles.find(f => f.endsWith(target));
                    if (match) {
                        stagedFilesRef.current = [...new Set([...stagedFilesRef.current, match])];
                        writeLine(`\x1b[32m✓ Staged: ${match}\x1b[0m`);
                    } else {
                        writeLine(`\x1b[31mpathspec '${target}' did not match any files.\x1b[0m`);
                    }
                }
                writePrompt(); return;
            }

            if (sub === 'commit') {
                if (!stagedFilesRef.current.length) { writeLine('\x1b[33mnothing to commit, working tree clean\x1b[0m'); writePrompt(); return; }
                const mIdx = (args as string[]).indexOf('-m');
                const msg = mIdx !== -1 ? args.slice(mIdx + 1).join(' ').replace(/^["']|["']$/g, '') : 'Update';
                const hash = Math.random().toString(16).slice(2, 9);
                commitsRef.current = [{ hash, msg, date: new Date().toLocaleString() }, ...commitsRef.current];
                const n = stagedFilesRef.current.length;
                stagedFilesRef.current = [];
                writeLines([`\x1b[33m[${branchRef.current} ${hash}]\x1b[0m ${msg}`, `\x1b[32m ${n} file(s) changed\x1b[0m`]);
                writePrompt(); return;
            }

            if (sub === 'log') {
                if (!commitsRef.current.length) { writeLine("\x1b[90mNo commits yet. Use 'git add .' then 'git commit -m \"msg\"'\x1b[0m"); writePrompt(); return; }
                for (const c of commitsRef.current) {
                    writeLines([`\x1b[33mcommit ${c.hash}\x1b[0m`, `\x1b[90mDate: ${c.date}\x1b[0m`, `    ${c.msg}`, '']);
                }
                writePrompt(); return;
            }

            if (sub === 'branch') {
                const name = args[2];
                if (!name) { writeLine(`\x1b[32m* ${branchRef.current}\x1b[0m`); }
                else { writeLine(`\x1b[32m✓ Branch '${name}' created.\x1b[0m`); }
                writePrompt(); return;
            }

            if (sub === 'checkout') {
                const isNew = args[2] === '-b';
                const name = isNew ? args[3] : args[2];
                if (!name) { writeLine('\x1b[31mgit checkout: missing branch name\x1b[0m'); writePrompt(); return; }
                branchRef.current = name;
                writeLine(`\x1b[32m✓ Switched to ${isNew ? 'new ' : ''}branch '${name}'\x1b[0m`);
                writePrompt(); return;
            }

            if (sub === 'pull') {
                writeLines(['\x1b[36mFetching from origin...\x1b[0m', '\x1b[33mℹ To pull actual changes, use the GitHub Clone sidebar with the latest URL.\x1b[0m', '\x1b[32mAlready up to date.\x1b[0m']);
                writePrompt(); return;
            }
            if (sub === 'push') {
                writeLines(['\x1b[36mEnumerating objects...\x1b[0m', '\x1b[33m⚠  git push requires authentication not available in the browser.\x1b[0m', '\x1b[90m   Download your project (Download tab) and push from your local terminal.\x1b[0m']);
                writePrompt(); return;
            }
            if (sub === 'diff') { writeLine('\x1b[90mNo diff (all edits are in-memory).\x1b[0m'); writePrompt(); return; }
            if (sub === 'stash') {
                const n = stagedFilesRef.current.length;
                stagedFilesRef.current = [];
                writeLine(`\x1b[32m✓ Stashed ${n} file(s).\x1b[0m`);
                writePrompt(); return;
            }
            if (sub === 'remote') { writeLine('\x1b[90morigin\x1b[0m'); writePrompt(); return; }

            writeLine(`\x1b[31mgit: '${sub}' is not a recognized git command. Type 'help' for help.\x1b[0m`);
            writePrompt(); return;
        }

        // ── npm ──────────────────────────────────────────────
        if (cmd === 'npm') {
            writeLines([`\x1b[36m> npm ${args.slice(1).join(' ')}\x1b[0m`, '\x1b[33mℹ npm commands cannot execute in the browser.\x1b[0m', '\x1b[90m  Download your project and run npm locally.\x1b[0m']);
            writePrompt(); return;
        }

        // ── ls ───────────────────────────────────────────────
        if (cmd === 'ls' || cmd === 'dir') {
            const entries = files.map(f => f.type === 'folder' ? `\x1b[34m${f.name}/\x1b[0m` : `\x1b[97m${f.name}\x1b[0m`);
            writeLine(entries.join('   ') || '\x1b[90m(empty)\x1b[0m');
            writePrompt(); return;
        }

        if (cmd === 'pwd') { writeLine(`\x1b[97m${cwdRef.current}\x1b[0m`); writePrompt(); return; }

        if (cmd === 'cd') {
            const dir = args[1] || '~';
            if (dir === '~' || dir === '') cwdRef.current = '~/project';
            else if (dir === '..') {
                const cur = cwdRef.current;
                cwdRef.current = cur.includes('/') ? cur.slice(0, cur.lastIndexOf('/')) || '~' : '~';
            }
            else cwdRef.current = `${cwdRef.current}/${dir}`;
            writePrompt(); return;
        }

        if (cmd === 'touch') {
            const name = args[1];
            if (!name) { writeLine('\x1b[31mtouch: missing file name\x1b[0m'); writePrompt(); return; }
            createFile(name);
            writeLine(`\x1b[32m✓ Created: ${name}\x1b[0m`);
            writePrompt(); return;
        }

        if (cmd === 'mkdir') {
            const name = args[1];
            if (!name) { writeLine('\x1b[31mmkdir: missing operand\x1b[0m'); writePrompt(); return; }
            createFolder(name);
            writeLine(`\x1b[32m✓ Created folder: ${name}\x1b[0m`);
            writePrompt(); return;
        }

        if (cmd === 'rm') {
            const name = args[1];
            if (!name) { writeLine('\x1b[31mrm: missing operand\x1b[0m'); writePrompt(); return; }
            const allFilesDetails = flattenFilesDetails(files);
            const target = allFilesDetails.find(f => f.name === name);
            if (target) {
                deleteNode(target.id);
                writeLine(`\x1b[32m✓ Removed: ${name}\x1b[0m`);
            } else {
                writeLine(`\x1b[31mrm: cannot remove '${name}': No such file or directory\x1b[0m`);
            }
            writePrompt(); return;
        }

        if (cmd === 'source') {
            const path = args[1];
            if (!path) { writeLine('\x1b[31msource: filename argument required\x1b[0m'); writePrompt(); return; }
            if (path.endsWith('/bin/activate') || path.endsWith('/Scripts/activate')) {
                const venvName = path.split('/')[0];
                setActiveVenv(venvName);
                writeLine(`\x1b[32m✓ Activated virtual environment '${venvName}'\x1b[0m`);
            } else {
                writeLine(`\x1b[31msource: ${path}: No such file or directory\x1b[0m`);
            }
            writePrompt(); return;
        }

        if (cmd === 'deactivate') {
            if (activeVenv) {
                setActiveVenv(null);
                writeLine('\x1b[32m✓ Deactivated virtual environment\x1b[0m');
            } else {
                writeLine('\x1b[31mdeactivate: No virtual environment active\x1b[0m');
            }
            writePrompt(); return;
        }

        if (cmd === 'python' || cmd === 'python3') {
            if (args[1] === '-m' && args[2] === 'venv') {
                const venvName = args[3];
                if (!venvName) { writeLine("\x1b[31mError: Command '['python', '-m', 'venv']' requires an argument\x1b[0m"); writePrompt(); return; }
                writeLine(`\x1b[36mCreating virtual environment '${venvName}'...\x1b[0m`);
                createFolder(venvName);
                createFolder(`${venvName}/bin`);
                createFolder(`${venvName}/lib`);
                createFile('activate', `${venvName}/bin`);
                writeLine(`\x1b[32m✓ Virtual environment created. Run 'source ${venvName}/bin/activate' to activate it.\x1b[0m`);
                writePrompt(); return;
            }

            if (args[1] === '--version' || args[1] === '-V' || args[1] === '--v') {
                writeLine('Python 3.12.1 (Pyodide WebAssembly)');
                writePrompt(); return;
            }

            const name = args[1];
            if (!name) { writeLine('\x1b[31mpython: missing file name\x1b[0m'); writePrompt(); return; }
            const file = flattenFilesDetails(files).find(f => f.name === name);
            if (!file || !file.content) { writeLine(`\x1b[31mpython: can't open file '${name}': [Errno 2] No such file or directory\x1b[0m`); writePrompt(); return; }

            writeLine('\x1b[36mStarting Python (Pyodide WebAssembly)...\x1b[0m');
            try {
                const pyodide = await getPyodide();
                const sessionPkgs = pipPackages[activeVenv || 'global'] || [];
                if (sessionPkgs.length > 0) {
                    const micropip = pyodide.pyimport("micropip");
                    await micropip.install(sessionPkgs);
                }
                pyodide.setStdout({ batched: (str: string) => writeLine(str) });
                pyodide.setStderr({ batched: (str: string) => writeLine(`\x1b[31m${str}\x1b[0m`) });
                await pyodide.runPythonAsync(file.content);
                writeLine('\x1b[92mProcess finished with exit code 0\x1b[0m');
            } catch (e: unknown) {
                writeLine(`\x1b[31m${e instanceof Error ? e.message : String(e)}\x1b[0m`);
            }
            writePrompt(); return;
        }

        if (cmd === 'pip' || cmd === 'pip3') {
            if (sub === 'install') {
                const pkg = args[2];
                if (!pkg) { writeLine('\x1b[31mpip install: missing package name\x1b[0m'); writePrompt(); return; }

                if (pkg === '-r') {
                    const reqFile = args[3];
                    if (!reqFile) { writeLine('\x1b[31mpip install -r: missing requirements file name\x1b[0m'); writePrompt(); return; }
                    const file = flattenFilesDetails(files).find(f => f.name === reqFile);
                    if (!file || typeof file.content !== 'string') { writeLine(`\x1b[31mERROR: Could not open requirements file: [Errno 2] No such file or directory: '${reqFile}'\x1b[0m`); writePrompt(); return; }

                    const pkgs = file.content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
                    if (pkgs.length === 0) { writeLine('\x1b[33mRequirements file is empty.\x1b[0m'); writePrompt(); return; }

                    writeLines([`\x1b[36mCollecting packages from ${reqFile}...\x1b[0m`, '\x1b[90mDownloading wheels from PyPI via Pyodide micropip...\x1b[0m']);
                    try {
                        const pyodide = await getPyodide();
                        const micropip = pyodide.pyimport("micropip");
                        const installed: string[] = [];
                        for (const p of pkgs) {
                            try {
                                await micropip.install(p);
                                installed.push(p);
                                addPipPackage(p, activeVenv || 'global');
                            } catch (e: unknown) {
                                writeLine(`\x1b[31mFailed to install ${p}: ${e instanceof Error ? e.message.split('\n')[0] : String(e)}\x1b[0m`);
                            }
                        }
                        if (installed.length > 0) writeLine(`\x1b[32mSuccessfully installed ${installed.join(', ')}\x1b[0m`);
                        else writeLine('\x1b[33mNo packages were installed successfully.\x1b[0m');
                    } catch (e: unknown) {
                        writeLine(`\x1b[31mERROR initializing micropip: ${e instanceof Error ? e.message : String(e)}\x1b[0m`);
                    }
                    writePrompt(); return;
                }

                writeLines([`\x1b[36mCollecting ${pkg}...\x1b[0m`, '\x1b[90mDownloading wheel from PyPI via Pyodide micropip...\x1b[0m']);
                try {
                    const pyodide = await getPyodide();
                    const micropip = pyodide.pyimport("micropip");
                    await micropip.install(pkg);
                    addPipPackage(pkg, activeVenv || 'global');
                    writeLine(`\x1b[32mSuccessfully installed ${pkg}\x1b[0m`);
                } catch (e: unknown) {
                    writeLine(`\x1b[31mERROR: Could not find a version that satisfies the requirement ${pkg}\x1b[0m`);
                    writeLine(`\x1b[31m${e instanceof Error ? e.message : String(e)}\x1b[0m`);
                }
                writePrompt(); return;
            } else if (sub === 'uninstall') {
                const pkg = args[2];
                if (!pkg) { writeLine('\x1b[31mpip uninstall: missing package name\x1b[0m'); writePrompt(); return; }
                writeLines([`\x1b[36mFound existing installation: ${pkg}\x1b[0m`, `\x1b[90mUninstalling ${pkg}...\x1b[0m`]);
                try {
                    const pyodide = await getPyodide();
                    const micropip = pyodide.pyimport("micropip");
                    try { await micropip.uninstall(pkg); } catch { /* ignore */ }
                    removePipPackage(pkg, activeVenv || 'global');
                    writeLine(`\x1b[32mSuccessfully uninstalled ${pkg}\x1b[0m`);
                } catch (e: unknown) {
                    writeLine(`\x1b[31mERROR: Uninstall failed.\x1b[0m ${e instanceof Error ? e.message : String(e)}`);
                }
                writePrompt(); return;
            } else {
                writeLine(`\x1b[31mpip: '${sub}' command is not simulated in the browser\x1b[0m`);
                writePrompt(); return;
            }
        }

        if (cmd === 'clear' || cmd === 'cls') {
            term.clear();
            term.write(buildPrompt());
            return;
        }

        if (cmd === 'echo') {
            writeLine(args.slice(1).join(' ').replace(/^["']|["']$/g, ''));
            writePrompt(); return;
        }

        if (cmd === 'whoami') {
            writeLine('codespace-user');
            writePrompt(); return;
        }

        if (cmd === 'date') {
            writeLine(new Date().toString());
            writePrompt(); return;
        }

        if (cmd === 'uname') {
            writeLine('CodeSpace Browser OS 1.0 WASM');
            writePrompt(); return;
        }

        if (cmd === 'cat') {
            const name = args[1];
            if (!name) { writeLine('\x1b[31mcat: missing file name\x1b[0m'); writePrompt(); return; }
            const file = flattenFilesDetails(files).find(f => f.name === name);
            if (file && file.content) {
                file.content.split('\n').forEach(line => writeLine(line));
            } else {
                writeLine(`\x1b[31mcat: ${name}: No such file or directory\x1b[0m`);
            }
            writePrompt(); return;
        }

        if (cmd === 'head') {
            const name = args[1];
            if (!name) { writeLine('\x1b[31mhead: missing file name\x1b[0m'); writePrompt(); return; }
            const file = flattenFilesDetails(files).find(f => f.name === name);
            if (file && file.content) {
                file.content.split('\n').slice(0, 10).forEach(line => writeLine(line));
            } else {
                writeLine(`\x1b[31mhead: ${name}: No such file or directory\x1b[0m`);
            }
            writePrompt(); return;
        }

        if (cmd === 'wc') {
            const name = args[1];
            if (!name) { writeLine('\x1b[31mwc: missing file name\x1b[0m'); writePrompt(); return; }
            const file = flattenFilesDetails(files).find(f => f.name === name);
            if (file && file.content) {
                const lines = file.content.split('\n').length;
                const words = file.content.split(/\s+/).filter(Boolean).length;
                const chars = file.content.length;
                writeLine(`  ${lines}  ${words}  ${chars} ${name}`);
            } else {
                writeLine(`\x1b[31mwc: ${name}: No such file or directory\x1b[0m`);
            }
            writePrompt(); return;
        }

        if (cmd === 'help') {
            writeLines([
                '\x1b[1m\x1b[36mCodeSpace Terminal — Available Commands\x1b[0m', '',
                '\x1b[33mGit:\x1b[0m',
                '  \x1b[32mgit clone <url>\x1b[0m         Clone a GitHub repo (real API)',
                '  \x1b[32mgit status\x1b[0m              Show staged files',
                '  \x1b[32mgit add <file|.>\x1b[0m        Stage files',
                '  \x1b[32mgit commit -m "msg"\x1b[0m     Commit staged files',
                '  \x1b[32mgit log\x1b[0m                 Show commit history',
                '  \x1b[32mgit branch [name]\x1b[0m       List or create branch',
                '  \x1b[32mgit checkout [-b] <name>\x1b[0m Switch/create branch',
                '  \x1b[32mgit pull / push / diff\x1b[0m  Git operations', '',
                '\x1b[33mFiles & Script Execution:\x1b[0m',
                '  \x1b[32mls\x1b[0m  \x1b[32mpwd\x1b[0m  \x1b[32mcd <dir>\x1b[0m  \x1b[32mclear\x1b[0m',
                '  \x1b[32mtouch <name>\x1b[0m  \x1b[32mmkdir <name>\x1b[0m  \x1b[32mrm <name>\x1b[0m',
                '  \x1b[32mcat <file>\x1b[0m  \x1b[32mhead <file>\x1b[0m  \x1b[32mwc <file>\x1b[0m',
                '  \x1b[32mecho <text>\x1b[0m  \x1b[32mwhoami\x1b[0m  \x1b[32mdate\x1b[0m  \x1b[32muname\x1b[0m',
                '  \x1b[32mpython <file.py>\x1b[0m        Execute Python using Pyodide',
                '  \x1b[32mpython -m venv <name>\x1b[0m   Create virtual environment',
                '  \x1b[32msource <env>/bin/activate\x1b[0m Activate venv',
                '  \x1b[32mdeactivate\x1b[0m              Deactivate venv',
                '  \x1b[32mpip install / uninstall\x1b[0m Install/Remove packages',
            ]);
            writePrompt(); return;
        }

        writeLine(`\x1b[31mcommand not found: \x1b[97m${cmd}\x1b[0m — type \x1b[36mhelp\x1b[0m`);
        writePrompt();
    }, [getStoreState, writeLine, writeLines, writePrompt, buildPrompt]);

    // Initialize xterm
    useEffect(() => {
        if (!termRef.current || xtermRef.current) return;

        const term = new Terminal({
            cursorBlink: true,
            cursorStyle: 'bar',
            fontSize: 13,
            fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace",
            theme: {
                background: '#0d1117',
                foreground: '#c9d1d9',
                cursor: '#58a6ff',
                selectionBackground: '#264f78',
                selectionForeground: '#ffffff',
                black: '#0d1117',
                red: '#f85149',
                green: '#3fb950',
                yellow: '#d29922',
                blue: '#58a6ff',
                magenta: '#bc8cff',
                cyan: '#39c5cf',
                white: '#c9d1d9',
                brightBlack: '#6e7681',
                brightRed: '#ffa198',
                brightGreen: '#56d364',
                brightYellow: '#e3b341',
                brightBlue: '#79c0ff',
                brightMagenta: '#d2a8ff',
                brightCyan: '#56d4dd',
                brightWhite: '#f0f6fc',
            },
            allowTransparency: true,
            scrollback: 5000,
            convertEol: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(termRef.current);

        try { fitAddon.fit(); } catch { /* container not visible yet */ }

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        // Welcome message
        term.writeln('\x1b[92m\x1b[1m  ┌──────────────────────────┐\x1b[0m');
        term.writeln('\x1b[92m\x1b[1m  │    CodeSpace Terminal    │\x1b[0m');
        term.writeln('\x1b[92m\x1b[1m  └──────────────────────────┘\x1b[0m');
        term.writeln('');
        term.writeln('\x1b[90m  Type \x1b[36mhelp\x1b[90m for commands.\x1b[0m');
        term.write('\r\n' + buildPrompt());

        // Handle key input  
        term.onData((data: string) => {
            if (isProcessingRef.current) return;

            // Handle special characters
            if (data === '\r') {
                // Enter
                const cmd = inputBufferRef.current;
                inputBufferRef.current = '';
                isProcessingRef.current = true;
                handleCommand(cmd).finally(() => { isProcessingRef.current = false; });
            } else if (data === '\x7f') {
                // Backspace
                if (inputBufferRef.current.length > 0) {
                    inputBufferRef.current = inputBufferRef.current.slice(0, -1);
                    term.write('\b \b');
                }
            } else if (data === '\x1b[A') {
                // Arrow Up - history
                const next = Math.min(histIdxRef.current + 1, historyRef.current.length - 1);
                if (next >= 0 && historyRef.current[next]) {
                    // Clear current input
                    const clearLen = inputBufferRef.current.length;
                    term.write('\b \b'.repeat(clearLen));
                    histIdxRef.current = next;
                    inputBufferRef.current = historyRef.current[next];
                    term.write(inputBufferRef.current);
                }
            } else if (data === '\x1b[B') {
                // Arrow Down - history
                const clearLen = inputBufferRef.current.length;
                term.write('\b \b'.repeat(clearLen));
                const next = Math.max(histIdxRef.current - 1, -1);
                histIdxRef.current = next;
                inputBufferRef.current = next === -1 ? '' : historyRef.current[next];
                term.write(inputBufferRef.current);
            } else if (data === '\x03') {
                // Ctrl+C
                inputBufferRef.current = '';
                term.write('^C');
                writePrompt();
            } else if (data === '\x0c') {
                // Ctrl+L (clear)
                term.clear();
                term.write(buildPrompt());
                inputBufferRef.current = '';
            } else if (data === '\t') {
                // Tab completion - basic
                const partial = inputBufferRef.current;
                const { files } = useEditorStore.getState();
                const allNames = flattenFilesDetails(files).map(f => f.name);
                const parts = partial.split(' ');
                const lastPart = parts[parts.length - 1];
                if (lastPart) {
                    const matches = allNames.filter(n => n.startsWith(lastPart));
                    if (matches.length === 1) {
                        const completion = matches[0].slice(lastPart.length);
                        inputBufferRef.current += completion;
                        term.write(completion);
                    } else if (matches.length > 1) {
                        writeLine('');
                        writeLine(matches.join('  '));
                        term.write('\r\n' + buildPrompt() + inputBufferRef.current);
                    }
                }
            } else if (data.charCodeAt(0) >= 32) {
                // Normal printable characters
                inputBufferRef.current += data;
                term.write(data);
            }
        });

        return () => {
            term.dispose();
            xtermRef.current = null;
            fitAddonRef.current = null;
        };
    // buildPrompt and handleCommand are stable callbacks, we only want to init once
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fit on visibility change
    useEffect(() => {
        if (isActive && fitAddonRef.current) {
            setTimeout(() => {
                try { fitAddonRef.current?.fit(); } catch { /* ignore */ }
            }, 50);
        }
    }, [isActive]);

    // Fit on resize
    useEffect(() => {
        const handleResize = () => {
            if (isActive && fitAddonRef.current) {
                try { fitAddonRef.current.fit(); } catch { /* ignore */ }
            }
        };
        window.addEventListener('resize', handleResize);
        const observer = new ResizeObserver(() => handleResize());
        if (termRef.current) observer.observe(termRef.current);
        return () => {
            window.removeEventListener('resize', handleResize);
            observer.disconnect();
        };
    }, [isActive]);

    return (
        <div
            ref={termRef}
            className="xterm-container"
            style={{
                display: isActive ? 'block' : 'none',
                width: '100%',
                height: '100%',
                background: '#0d1117',
            }}
        />
    );
};
