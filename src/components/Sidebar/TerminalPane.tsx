import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Terminal } from 'lucide-react';
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

export const TerminalPane: React.FC = () => {
    const outputRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [collapsed, setCollapsed] = useState(false);
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

    const { files, cloneGitHubRepo, createFile } = useEditorStore();

    const print = useCallback((text: string) => {
        setLines(prev => [...prev, text]);
    }, []);

    const printLines = useCallback((texts: string[]) => {
        setLines(prev => [...prev, ...texts]);
    }, []);

    const buildPrompt = useCallback(() =>
        `${C.green}${cwd}${C.reset} ${C.blue}(${branch})${C.reset} ${C.white}$${C.reset} `,
        [cwd, branch]);

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
                `${C.yellow}Files:${C.reset}`,
                `  ${C.green}ls${C.reset}  ${C.green}pwd${C.reset}  ${C.green}cd <dir>${C.reset}  ${C.green}touch <name>${C.reset}  ${C.green}clear${C.reset}`,
            ]);
            return;
        }

        print(`${C.red}command not found: ${C.white}${cmd}${C.reset} — type ${C.cyan}help${C.reset}`);
    }, [files, branch, stagedFiles, commits, cwd, cloneGitHubRepo, createFile, print, printLines, buildPrompt]);

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
        if (outputRef.current && !collapsed) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [lines, collapsed]);

    return (
        <div className={`terminal-container${collapsed ? ' collapsed' : ''}`}>
            {/* Header — click to collapse/expand */}
            <div className="terminal-header" onClick={() => setCollapsed(c => !c)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Terminal size={12} />
                    TERMINAL
                </div>
                {collapsed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </div>

            {!collapsed && (
                <div
                    className="terminal-wrapper"
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        background: '#0d1117',
                        fontFamily: 'Fira Code, Courier New, monospace',
                        fontSize: '12px',
                        cursor: 'text',
                    }}
                    onClick={() => inputRef.current?.focus()}
                >
                    {/* Output */}
                    <div
                        ref={outputRef}
                        style={{ flex: 1, overflowY: 'auto', padding: '6px 10px', lineHeight: '1.65', minHeight: 0 }}
                    >
                        {lines.map((line, i) => (
                            <div
                                key={i}
                                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#c9d1d9', minHeight: '1em' }}
                                dangerouslySetInnerHTML={{ __html: ansiToHtml(line) }}
                            />
                        ))}

                        {/* Input row */}
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
                    </div>
                </div>
            )}
        </div>
    );
};
