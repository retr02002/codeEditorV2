import React, { useEffect, useRef, useState, useCallback } from 'react';
// import { Terminal } from 'lucide-react';
import { useEditorStore, type FileNode } from '../../store/useEditorStore';

// ANSI color helpers
const C = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    red: '\x1b[31m',
    gray: '\x1b[90m',
    white: '\x1b[97m',
    brightGreen: '\x1b[92m',
};

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

// Minimal ANSI → HTML converter
function ansiToHtml(text: string): string {
    const map: Record<string, string> = {
        '0': 'color:inherit;font-weight:normal',
        '1': 'font-weight:bold',
        '31': 'color:#f85149',
        '32': 'color:#3fb950',
        '33': 'color:#d29922',
        '34': 'color:#58a6ff',
        '36': 'color:#39c5cf',
        '37': 'color:#c9d1d9',
        '90': 'color:#6e7681',
        '92': 'color:#56d364',
        '97': 'color:#f0f6fc',
    };
    // Use unicode escape \u001b to avoid control-character lint error
    const ESC = '\u001b';
    const ansiRe = new RegExp(ESC + '\\[([0-9;]+)m', 'g');
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    html = html.replace(ansiRe, (_: string, codes: string) => {
        const parts = codes.split(';');
        const styles = parts.map((c: string) => map[c] || '').filter(Boolean).join(';');
        return styles ? `<span style="${styles}">` : '</span>';
    });
    const opens = (html.match(/<span/g) || []).length;
    const closes = (html.match(/<\/span>/g) || []).length;
    html += '</span>'.repeat(Math.max(0, opens - closes));
    return html;
}

interface TerminalInstanceProps {
    id: string;
    isActive: boolean;
}

export const TerminalInstance: React.FC<TerminalInstanceProps> = ({ isActive }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const [lines, setLines] = useState<string[]>([
        `${C.brightGreen}${C.bold}Welcome to CodeSpace Terminal${C.reset}`,
        `${C.gray}Type ${C.cyan}help${C.reset}${C.gray} for available commands.${C.reset}`,
        '',
    ]);
    const [inputVal, setInputVal] = useState('');
    const [history, setHistory] = useState<string[]>([]);
    // useRef: histIdx only tracks arrow-key position, never drives renders
    const histIdx = useRef(-1);
    const [cwd, setCwd] = useState('~/project');
    const [branch, setBranch] = useState('main');
    const [stagedFiles, setStagedFiles] = useState<string[]>([]);
    const [commits, setCommits] = useState<{ hash: string; msg: string; date: string }[]>([]);

    const { files, cloneGitHubRepo, createFile, createFolder, deleteNode, pipPackages, addPipPackage, removePipPackage, activeVenv, setActiveVenv } = useEditorStore();

    const print = useCallback((text: string) => {
        setLines(prev => [...prev, text]);
    }, []);

    const printLines = useCallback((texts: string[]) => {
        setLines(prev => [...prev, ...texts]);
    }, []);

    const buildPrompt = useCallback(() => {
        const venvPrefix = activeVenv ? `${C.cyan}(${activeVenv})${C.reset} ` : '';
        return `${venvPrefix}${C.green}${cwd}${C.reset} ${C.blue}(${branch})${C.reset} ${C.white}$${C.reset} `;
    }, [cwd, branch, activeVenv]);

    const handleCommand = useCallback(async (raw: string) => {
        const input = raw.trim();
        if (!input) { print(''); return; }

        setHistory(prev => [input, ...prev.slice(0, 49)]);
        histIdx.current = -1;

        // Echo command with prompt
        print(`${buildPrompt()}${C.white}${input}${C.reset}`);

        const args = input.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
        const cmd = args[0];
        const sub = args[1];

        // ── git ──────────────────────────────────────────────
        if (cmd === 'git') {
            if (!sub) { print(`${C.red}git: missing subcommand${C.reset}`); return; }

            if (sub === 'clone') {
                const url = args[2];
                if (!url) { print(`${C.red}git clone: missing repository URL${C.reset}`); return; }
                printLines([
                    `${C.cyan}Cloning into repository...${C.reset}`,
                    `${C.gray}Fetching file tree from GitHub API...${C.reset}`,
                ]);
                try {
                    await cloneGitHubRepo(url);
                    const match = url.match(/\/([^/]+?)(?:\.git)?$/);
                    const repoName = match ? match[1] : 'repo';
                    setCwd(`~/project/${repoName}`);
                    printLines([
                        `${C.green}remote: Enumerating objects: done.${C.reset}`,
                        `${C.brightGreen}✓ Clone complete! Files loaded into Explorer.${C.reset}`,
                    ]);
                } catch (e: unknown) {
                    print(`${C.red}error: ${e instanceof Error ? e.message : String(e)}${C.reset}`);
                }
                return;
            }

            if (sub === 'status') {
                const allFiles = flattenFiles(files);
                printLines([
                    `${C.bold}On branch ${branch}${C.reset}`,
                    '',
                    stagedFiles.length
                        ? `${C.green}Changes staged for commit:${C.reset}`
                        : `${C.gray}Nothing staged. Use 'git add .' to stage files.${C.reset}`,
                    ...stagedFiles.map(f => `  ${C.green}modified: ${f}${C.reset}`),
                    '',
                    `${C.gray}Workspace has ${allFiles.length} file(s).${C.reset}`,
                ]);
                return;
            }

            if (sub === 'add') {
                const target = args[2];
                if (!target) { print(`${C.red}git add: missing file argument. Try 'git add .'${C.reset}`); return; }
                const allFiles = flattenFiles(files);
                if (target === '.' || target === '-A' || target === '--all') {
                    setStagedFiles(allFiles);
                    print(`${C.green}✓ Staged ${allFiles.length} files.${C.reset}`);
                } else {
                    const match = allFiles.find(f => f.endsWith(target));
                    if (match) {
                        setStagedFiles(prev => [...new Set([...prev, match])]);
                        print(`${C.green}✓ Staged: ${match}${C.reset}`);
                    } else {
                        print(`${C.red}pathspec '${target}' did not match any files.${C.reset}`);
                    }
                }
                return;
            }

            if (sub === 'commit') {
                if (!stagedFiles.length) { print(`${C.yellow}nothing to commit, working tree clean${C.reset}`); return; }
                const mIdx = (args as string[]).indexOf('-m');
                const msg = mIdx !== -1
                    ? args.slice(mIdx + 1).join(' ').replace(/^["']|["']$/g, '')
                    : 'Update';
                const hash = Math.random().toString(16).slice(2, 9);
                setCommits(prev => [{ hash, msg, date: new Date().toLocaleString() }, ...prev]);
                setStagedFiles([]);
                printLines([
                    `${C.yellow}[${branch} ${hash}]${C.reset} ${msg}`,
                    `${C.green} ${stagedFiles.length} file(s) changed${C.reset}`,
                ]);
                return;
            }

            if (sub === 'log') {
                if (!commits.length) { print(`${C.gray}No commits yet. Use 'git add .' then 'git commit -m "msg"'${C.reset}`); return; }
                for (const c of commits) {
                    printLines([`${C.yellow}commit ${c.hash}${C.reset}`, `${C.gray}Date: ${c.date}${C.reset}`, `    ${c.msg}`, '']);
                }
                return;
            }

            if (sub === 'branch') {
                const name = args[2];
                if (!name) { print(`${C.green}* ${branch}${C.reset}`); }
                else { print(`${C.green}✓ Branch '${name}' created.${C.reset}`); }
                return;
            }

            if (sub === 'checkout') {
                const isNew = args[2] === '-b';
                const name = isNew ? args[3] : args[2];
                if (!name) { print(`${C.red}git checkout: missing branch name${C.reset}`); return; }
                setBranch(name);
                print(`${C.green}✓ Switched to ${isNew ? 'new ' : ''}branch '${name}'${C.reset}`);
                return;
            }

            if (sub === 'pull') {
                printLines([
                    `${C.cyan}Fetching from origin...${C.reset}`,
                    `${C.yellow}ℹ To pull actual changes, use the GitHub Clone sidebar with the latest URL.${C.reset}`,
                    `${C.green}Already up to date.${C.reset}`,
                ]);
                return;
            }

            if (sub === 'push') {
                printLines([
                    `${C.cyan}Enumerating objects...${C.reset}`,
                    `${C.yellow}⚠  git push requires authentication not available in the browser.${C.reset}`,
                    `${C.gray}   Download your project (Download tab) and push from your local terminal.${C.reset}`,
                ]);
                return;
            }

            if (sub === 'diff') { print(`${C.gray}No diff (all edits are in-memory).${C.reset}`); return; }
            if (sub === 'stash') {
                const n = stagedFiles.length;
                setStagedFiles([]);
                print(`${C.green}✓ Stashed ${n} file(s).${C.reset}`);
                return;
            }
            if (sub === 'remote') { print(`${C.gray}origin${C.reset}`); return; }

            print(`${C.red}git: '${sub}' is not a recognized git command. Type 'help' for help.${C.reset}`);
            return;
        }

        // ── npm ──────────────────────────────────────────────
        if (cmd === 'npm') {
            printLines([
                `${C.cyan}> npm ${args.slice(1).join(' ')}${C.reset}`,
                `${C.yellow}ℹ npm commands cannot execute in the browser.${C.reset}`,
                `${C.gray}  Download your project and run npm locally.${C.reset}`,
            ]);
            return;
        }

        // ── ls ───────────────────────────────────────────────
        if (cmd === 'ls' || cmd === 'dir') {
            const entries = files.map(f =>
                f.type === 'folder' ? `${C.blue}${f.name}/${C.reset}` : `${C.white}${f.name}${C.reset}`
            );
            print(entries.join('   ') || `${C.gray}(empty)${C.reset}`);
            return;
        }

        if (cmd === 'pwd') { print(`${C.white}${cwd}${C.reset}`); return; }

        if (cmd === 'cd') {
            const dir = args[1] || '~';
            if (dir === '~' || dir === '') setCwd('~/project');
            else if (dir === '..') setCwd(prev => prev.includes('/') ? prev.slice(0, prev.lastIndexOf('/')) || '~' : '~');
            else setCwd(prev => `${prev}/${dir}`);
            return;
        }

        if (cmd === 'touch') {
            const name = args[1];
            if (!name) { print(`${C.red}touch: missing file name${C.reset}`); return; }
            createFile(name);
            print(`${C.green}✓ Created: ${name}${C.reset}`);
            return;
        }
        
        if (cmd === 'mkdir') {
            const name = args[1];
            if (!name) { print(`${C.red}mkdir: missing operand${C.reset}`); return; }
            createFolder(name);
            print(`${C.green}✓ Created folder: ${name}${C.reset}`);
            return;
        }

        if (cmd === 'rm') {
            const name = args[1];
            if (!name) { print(`${C.red}rm: missing operand${C.reset}`); return; }
            const allFilesDetails = flattenFilesDetails(files);
            const target = allFilesDetails.find(f => f.name === name);
            if (target) {
                deleteNode(target.id);
                print(`${C.green}✓ Removed: ${name}${C.reset}`);
            } else {
                print(`${C.red}rm: cannot remove '${name}': No such file or directory${C.reset}`);
            }
            return;
        }
        
        if (cmd === 'source') {
            const path = args[1];
            if (!path) { print(`${C.red}source: filename argument required${C.reset}`); return; }
            if (path.endsWith('/bin/activate') || path.endsWith('/Scripts/activate')) {
                const venvName = path.split('/')[0];
                setActiveVenv(venvName);
                print(`${C.green}✓ Activated virtual environment '${venvName}'${C.reset}`);
            } else {
                print(`${C.red}source: ${path}: No such file or directory${C.reset}`);
            }
            return;
        }

        if (cmd === 'deactivate') {
            if (activeVenv) {
                setActiveVenv(null);
                print(`${C.green}✓ Deactivated virtual environment${C.reset}`);
            } else {
                print(`${C.red}deactivate: No virtual environment active${C.reset}`);
            }
            return;
        }

        if (cmd === 'python' || cmd === 'python3') {
            if (args[1] === '-m' && args[2] === 'venv') {
                const venvName = args[3];
                if (!venvName) { print(`${C.red}Error: Command '['python', '-m', 'venv']' requires an argument${C.reset}`); return; }
                
                printLines([`${C.cyan}Creating virtual environment '${venvName}'...${C.reset}`]);
                createFolder(venvName);
                createFolder(`${venvName}/bin`);
                createFolder(`${venvName}/lib`);
                createFile('activate', `${venvName}/bin`); // mock activate script
                print(`${C.green}✓ Virtual environment created. Run 'source ${venvName}/bin/activate' to activate it.${C.reset}`);
                return;
                return;
            }

            if (args[1] === '--version' || args[1] === '-V' || args[1] === '--v') {
                print('Python 3.12.1 (Pyodide WebAssembly)');
                return;
            }

            const name = args[1];
            if (!name) { print(`${C.red}python: missing file name${C.reset}`); return; }
            const file = flattenFilesDetails(files).find(f => f.name === name);
            if (!file || !file.content) { print(`${C.red}python: can't open file '${name}': [Errno 2] No such file or directory${C.reset}`); return; }
            
            printLines([`${C.cyan}Starting Python (Pyodide WebAssembly)...${C.reset}`]);
            try {
                const pyodide = await getPyodide();
                const sessionPkgs = pipPackages[activeVenv || 'global'] || [];
                if (sessionPkgs.length > 0) {
                    const micropip = pyodide.pyimport("micropip");
                    await micropip.install(sessionPkgs);
                }

                pyodide.setStdout({ batched: (str: string) => print(str) });
                pyodide.setStderr({ batched: (str: string) => print(`${C.red}${str}${C.reset}`) });
                
                await pyodide.runPythonAsync(file.content);
                print(`${C.brightGreen}Process finished with exit code 0${C.reset}`);
            } catch (e: unknown) {
                print(`${C.red}${e instanceof Error ? e.message : String(e)}${C.reset}`);
            }
            return;
        }

        if (cmd === 'pip' || cmd === 'pip3') {
            if (sub === 'install') {
                const pkg = args[2];
                if (!pkg) { print(`${C.red}pip install: missing package name${C.reset}`); return; }
                
                if (pkg === '-r') {
                    const reqFile = args[3];
                    if (!reqFile) { print(`${C.red}pip install -r: missing requirements file name${C.reset}`); return; }
                    const file = flattenFilesDetails(files).find(f => f.name === reqFile);
                    if (!file || typeof file.content !== 'string') { print(`${C.red}ERROR: Could not open requirements file: [Errno 2] No such file or directory: '${reqFile}'${C.reset}`); return; }
                    
                    const pkgs = file.content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
                    if (pkgs.length === 0) { print(`${C.yellow}Requirements file is empty.${C.reset}`); return; }

                    printLines([`${C.cyan}Collecting packages from ${reqFile}...${C.reset}`, `${C.gray}Downloading wheels from PyPI via Pyodide micropip...${C.reset}`]);
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
                                print(`${C.red}Failed to install ${p}: ${e instanceof Error ? e.message.split('\n')[0] : String(e)}${C.reset}`);
                            }
                        }
                        
                        if (installed.length > 0) {
                            printLines([
                                `${C.green}Successfully installed ${installed.join(', ')}${C.reset}`
                            ]);
                        } else {
                            print(`${C.yellow}No packages were installed successfully.${C.reset}`);
                        }
                    } catch (e: unknown) {
                        print(`${C.red}ERROR initializing micropip: ${e instanceof Error ? e.message : String(e)}${C.reset}`);
                    }
                    return;
                }

                printLines([`${C.cyan}Collecting ${pkg}...${C.reset}`, `${C.gray}Downloading wheel from PyPI via Pyodide micropip...${C.reset}`]);
                try {
                    const pyodide = await getPyodide();
                    const micropip = pyodide.pyimport("micropip");
                    await micropip.install(pkg);
                    addPipPackage(pkg, activeVenv || 'global');
                    printLines([
                        `${C.green}Successfully installed ${pkg}${C.reset}`,
                    ]);
                } catch (e: unknown) {
                    print(`${C.red}ERROR: Could not find a version that satisfies the requirement ${pkg}${C.reset}`);
                    print(`${C.red}${e instanceof Error ? e.message : String(e)}${C.reset}`);
                }
                return;
            } else if (sub === 'uninstall') {
                const pkg = args[2];
                if (!pkg) { print(`${C.red}pip uninstall: missing package name${C.reset}`); return; }
                
                printLines([`${C.cyan}Found existing installation: ${pkg}${C.reset}`, `${C.gray}Uninstalling ${pkg}...${C.reset}`]);
                try {
                    const pyodide = await getPyodide();
                    const micropip = pyodide.pyimport("micropip");
                    // Pyodide micropip supports uninstalling
                    try { await micropip.uninstall(pkg); } catch { /* ignore if not deeply installed */ }
                    removePipPackage(pkg, activeVenv || 'global');
                    print(`${C.green}Successfully uninstalled ${pkg}${C.reset}`);
                } catch (e: unknown) {
                    print(`${C.red}ERROR: Uninstall failed.${C.reset} ${e instanceof Error ? e.message : String(e)}`);
                }
                return;
            } else {
                print(`${C.red}pip: '${sub}' command is not simulated in the browser${C.reset}`);
                return;
            }
        }

        if (cmd === 'clear' || cmd === 'cls') { setLines([]); return; }

        if (cmd === 'help') {
            printLines([
                `${C.bold}${C.cyan}CodeSpace Terminal — Available Commands${C.reset}`,
                '',
                `${C.yellow}Git:${C.reset}`,
                `  ${C.green}git clone <url>${C.reset}         Clone a GitHub repo (real API)`,
                `  ${C.green}git status${C.reset}              Show staged files`,
                `  ${C.green}git add <file|.>${C.reset}        Stage files`,
                `  ${C.green}git commit -m "msg"${C.reset}     Commit staged files`,
                `  ${C.green}git log${C.reset}                 Show commit history`,
                `  ${C.green}git branch [name]${C.reset}       List or create branch`,
                `  ${C.green}git checkout [-b] <name>${C.reset} Switch/create branch`,
                `  ${C.green}git pull / push / diff${C.reset}  Git operations`,
                '',
                `${C.yellow}Files & Script Execution:${C.reset}`,
                `  ${C.green}ls${C.reset}  ${C.green}pwd${C.reset}  ${C.green}cd <dir>${C.reset}  ${C.green}clear${C.reset}`,
                `  ${C.green}touch <name>${C.reset}  ${C.green}mkdir <name>${C.reset}  ${C.green}rm <name>${C.reset}`,
                `  ${C.green}python <file.py>${C.reset}        Execute Python using Pyodide`,
                `  ${C.green}python -m venv <name>${C.reset}   Create virtual environment`,
                `  ${C.green}source <env>/bin/activate${C.reset} Activate venv`,
                `  ${C.green}deactivate${C.reset}              Deactivate venv`,
                `  ${C.green}pip install / uninstall${C.reset} Install/Remove packages`,
            ]);
            return;
        }

        print(`${C.red}command not found: ${C.white}${cmd}${C.reset} — type ${C.cyan}help${C.reset}`);
    }, [files, branch, stagedFiles, commits, cwd, cloneGitHubRepo, createFile, createFolder, deleteNode, pipPackages, activeVenv, setActiveVenv, addPipPackage, removePipPackage, print, printLines, buildPrompt]);

    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const val = inputVal;
            setInputVal('');
            await handleCommand(val);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const next = Math.min(histIdx.current + 1, history.length - 1);
            histIdx.current = next;
            setInputVal(history[next] || '');
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = Math.max(histIdx.current - 1, -1);
            histIdx.current = next;
            setInputVal(next === -1 ? '' : history[next]);
        }
    };

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [lines]);

    return (
        <div
            className="terminal-wrapper"
            style={{
                display: isActive ? 'flex' : 'none',
                flexDirection: 'column',
                background: '#0d1117',
                fontFamily: 'Fira Code, Courier New, monospace',
                fontSize: '12px',
                cursor: 'text',
                height: '100%',
                overflow: 'hidden'
            }}
            onClick={() => inputRef.current?.focus()}
        >
            <div
                style={{ flex: 1, overflowY: 'auto', padding: '6px 10px', lineHeight: '1.65', minHeight: 0 }}
            >
                {lines.map((line, i) => (
                    <div
                        key={i}
                        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#c9d1d9', minHeight: '1em' }}
                        dangerouslySetInnerHTML={{ __html: ansiToHtml(line) }}
                    />
                ))}

                <div style={{ display: 'flex', alignItems: 'center', marginTop: '2px' }}>
                    <span
                        style={{ whiteSpace: 'pre', flexShrink: 0 }}
                        dangerouslySetInnerHTML={{ __html: ansiToHtml(buildPrompt()) }}
                    />
                    <input
                        ref={inputRef}
                        value={inputVal}
                        onChange={e => setInputVal(e.target.value)}
                        onKeyDown={handleKeyDown}
                        style={{
                            flex: 1,
                            minWidth: 0,
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: '#c9d1d9',
                            fontFamily: 'inherit',
                            fontSize: 'inherit',
                            caretColor: '#58a6ff',
                        }}
                        autoFocus
                        spellCheck={false}
                        autoComplete="off"
                    />
                </div>
                <div ref={bottomRef} />
            </div>
        </div>
    );
};
