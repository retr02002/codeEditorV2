/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { useEditorStore, findNodeById } from '../../store/useEditorStore';

import { emmetHTML, emmetCSS, emmetJSX } from 'emmet-monaco-es';
import prettier from 'prettier/standalone';
import parserHtml from 'prettier/plugins/html';
import parserBabel from 'prettier/plugins/babel';
import parserPostcss from 'prettier/plugins/postcss';
import parserEstree from 'prettier/plugins/estree';
import { registerBootstrapCompletions } from './bootstrapCompletions';

const BUILTIN_THEMES = new Set(['vs-dark', 'light', 'hc-black', 'hc-light']);
const registeredThemes = new Set<string>();

async function loadAndRegisterTheme(monacoInstance: any, themeId: string): Promise<boolean> {
    if (BUILTIN_THEMES.has(themeId)) return true;
    if (registeredThemes.has(themeId)) return true;
    try {
        const res = await fetch(`/themes/${themeId}.json`);
        if (!res.ok) return false;
        const themeData = await res.json();
        monacoInstance.editor.defineTheme(themeId, themeData);
        registeredThemes.add(themeId);
        return true;
    } catch { return false; }
}

const PYTHON_COMPLETIONS = [
    { label: 'def', insertText: 'def ${1:fn}(${2:args}):\n\t${3:pass}', detail: 'Function' },
    { label: 'class', insertText: 'class ${1:Name}:\n\tdef __init__(self):\n\t\t${2:pass}', detail: 'Class' },
    { label: 'if', insertText: 'if ${1:cond}:\n\t${2:pass}', detail: 'If statement' },
    { label: 'elif', insertText: 'elif ${1:cond}:\n\t${2:pass}', detail: 'Elif clause' },
    { label: 'else', insertText: 'else:\n\t${1:pass}', detail: 'Else clause' },
    { label: 'for', insertText: 'for ${1:x} in ${2:iterable}:\n\t${3:pass}', detail: 'For loop' },
    { label: 'while', insertText: 'while ${1:cond}:\n\t${2:pass}', detail: 'While loop' },
    { label: 'try', insertText: 'try:\n\t${1:pass}\nexcept ${2:Exception} as e:\n\t${3:pass}', detail: 'Try/except' },
    { label: 'with', insertText: 'with ${1:expr} as ${2:var}:\n\t${3:pass}', detail: 'Context manager' },
    { label: 'import', insertText: 'import ${1:module}', detail: 'Import' },
    { label: 'from', insertText: 'from ${1:module} import ${2:name}', detail: 'From import' },
    { label: 'print', insertText: 'print(${1:val})', detail: 'Print' },
    { label: 'input', insertText: 'input(${1:"Prompt: "})', detail: 'Input' },
    { label: 'len', insertText: 'len(${1:iterable})', detail: 'Length' },
    { label: 'range', insertText: 'range(${1:start}, ${2:stop})', detail: 'Range' },
    { label: 'enumerate', insertText: 'enumerate(${1:iterable})', detail: 'Enumerate' },
    { label: 'zip', insertText: 'zip(${1:a}, ${2:b})', detail: 'Zip' },
    { label: 'map', insertText: 'map(${1:fn}, ${2:iterable})', detail: 'Map' },
    { label: 'filter', insertText: 'filter(${1:fn}, ${2:iterable})', detail: 'Filter' },
    { label: 'sorted', insertText: 'sorted(${1:iterable}, reverse=${2:False})', detail: 'Sorted' },
    { label: 'isinstance', insertText: 'isinstance(${1:obj}, ${2:type})', detail: 'Isinstance' },
    { label: 'lambda', insertText: 'lambda ${1:args}: ${2:expr}', detail: 'Lambda' },
    { label: 'return', insertText: 'return ${1:val}', detail: 'Return' },
    { label: 'yield', insertText: 'yield ${1:val}', detail: 'Yield' },
    { label: 'assert', insertText: 'assert ${1:cond}, "${2:msg}"', detail: 'Assert' },
    { label: 'open', insertText: 'open("${1:file}", "${2:r}")', detail: 'Open file' },
    { label: 'if __main__', insertText: 'if __name__ == "__main__":\n\t${1:main()}', detail: 'Main guard' },
    { label: 'list comp', insertText: '[${1:expr} for ${2:x} in ${3:iterable}]', detail: 'List comprehension' },
    { label: 'dict comp', insertText: '{${1:k}: ${2:v} for ${3:x} in ${4:iterable}}', detail: 'Dict comprehension' },
    { label: 'dataclass', insertText: 'from dataclasses import dataclass\n\n@dataclass\nclass ${1:Name}:\n\t${2:field}: ${3:type}', detail: 'Dataclass' },
];

const ANGULAR_COMPLETIONS = [
    { label: '*ngIf', insertText: '*ngIf="${1:cond}"', detail: 'Conditional' },
    { label: '*ngFor', insertText: '*ngFor="let ${1:item} of ${2:items}"', detail: 'Loop' },
    { label: '[(ngModel)]', insertText: '[(ngModel)]="${1:model}"', detail: 'Two-way bind' },
    { label: '[ngClass]', insertText: '[ngClass]="${1:expr}"', detail: 'Dynamic class' },
    { label: '[ngStyle]', insertText: '[ngStyle]="${1:expr}"', detail: 'Dynamic style' },
    { label: '(click)', insertText: '(click)="${1:handler()}"', detail: 'Click event' },
    { label: '(submit)', insertText: '(submit)="${1:onSubmit()}"', detail: 'Submit event' },
    { label: '[disabled]', insertText: '[disabled]="${1:cond}"', detail: 'Disable binding' },
    { label: '[routerLink]', insertText: '[routerLink]="[\'/${1:path}\']"', detail: 'Router link' },
    { label: '@Input', insertText: '@Input() ${1:prop}: ${2:type};', detail: '@Input' },
    { label: '@Output', insertText: '@Output() ${1:ev} = new EventEmitter<${2:void}>();', detail: '@Output' },
    { label: 'ng-container', insertText: '<ng-container *ngIf="${1:cond}">\n\t${2}\n</ng-container>', detail: 'ng-container' },
    { label: 'ng-template', insertText: '<ng-template #${1:ref}>\n\t${2}\n</ng-template>', detail: 'ng-template' },
];

export const MonacoWrapper: React.FC = () => {
    const { files, activeFileId, settings, updateFileContent, installedExtensions } = useEditorStore();
    const activeFile = findNodeById(files, activeFileId);
    const monaco = useMonaco();
    const [activeTheme, setActiveTheme] = useState(settings.theme);

    const emmetRegistered = useRef(false);
    const prettierProvider = useRef<any[] | null>(null);
    const pythonProvider = useRef<any | null>(null);
    const angularProvider = useRef<any | null>(null);
    const bootstrapProvider = useRef<any | null>(null);

    // Dynamic Theme Loading — only applies AFTER the theme JSON is loaded
    useEffect(() => {
        if (!monaco) return;
        const themeId = settings.theme;
        if (BUILTIN_THEMES.has(themeId)) {
            setActiveTheme(themeId);
        } else {
            loadAndRegisterTheme(monaco, themeId).then(ok => {
                setActiveTheme(ok ? themeId : 'vs-dark');
            });
        }
    }, [monaco, settings.theme]);

    // Extension Providers Registration
    useEffect(() => {
        if (!monaco) return;

        // Emmet
        if (installedExtensions.includes('emmet') && !emmetRegistered.current) {
            emmetHTML(monaco); emmetCSS(monaco); emmetJSX(monaco);
            emmetRegistered.current = true;
        }

        // Prettier
        if (installedExtensions.includes('prettier') && !prettierProvider.current) {
            const fp = {
                provideDocumentFormattingEdits: async (model: any) => {
                    const text = model.getValue();
                    const lang = model.getLanguageId();
                    let parser = ''; const plugins: any[] = [parserEstree];
                    if (lang === 'html') { parser = 'html'; plugins.push(parserHtml); }
                    else if (lang === 'css') { parser = 'css'; plugins.push(parserPostcss); }
                    else if (lang === 'javascript' || lang === 'typescript') { parser = 'babel'; plugins.push(parserBabel); }
                    if (!parser) return [];
                    try {
                        const fmt = await prettier.format(text, { parser, plugins, singleQuote: true, tabWidth: 2 });
                        return [{ range: model.getFullModelRange(), text: fmt }];
                    } catch { return []; }
                }
            };
            prettierProvider.current = ['html', 'css', 'javascript', 'typescript'].map(l =>
                monaco.languages.registerDocumentFormattingEditProvider(l, fp)
            );
        } else if (!installedExtensions.includes('prettier') && prettierProvider.current) {
            prettierProvider.current.forEach((d: any) => d.dispose());
            prettierProvider.current = null;
        }

        // Python IntelliSense
        if (installedExtensions.includes('python') && !pythonProvider.current) {
            pythonProvider.current = monaco.languages.registerCompletionItemProvider('python', {
                provideCompletionItems: (model: any, position: any) => {
                    const word = model.getWordUntilPosition(position);
                    const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
                    return {
                        suggestions: PYTHON_COMPLETIONS.map(item => ({
                            label: item.label,
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText: item.insertText,
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            detail: `🐍 Python · ${item.detail}`,
                            range,
                        }))
                    };
                }
            });
        } else if (!installedExtensions.includes('python') && pythonProvider.current) {
            pythonProvider.current.dispose(); pythonProvider.current = null;
        }

        // Angular IntelliSense
        if (installedExtensions.includes('angular') && !angularProvider.current) {
            angularProvider.current = monaco.languages.registerCompletionItemProvider('html', {
                provideCompletionItems: (model: any, position: any) => {
                    const word = model.getWordUntilPosition(position);
                    const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
                    return {
                        suggestions: ANGULAR_COMPLETIONS.map(item => ({
                            label: item.label,
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText: item.insertText,
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            detail: `🅰️ Angular · ${item.detail}`,
                            range,
                        }))
                    };
                }
            });
        } else if (!installedExtensions.includes('angular') && angularProvider.current) {
            angularProvider.current.dispose(); angularProvider.current = null;
        }

        // Bootstrap 5 Class Completions (context-aware inside class="...")
        if (installedExtensions.includes('bootstrap-snippets') && !bootstrapProvider.current) {
            bootstrapProvider.current = registerBootstrapCompletions(monaco);
        } else if (!installedExtensions.includes('bootstrap-snippets') && bootstrapProvider.current) {
            bootstrapProvider.current.dispose(); bootstrapProvider.current = null;
        }

    }, [monaco, installedExtensions]);

    if (!activeFile) {
        return <div style={{ padding: 20, color: '#888' }}>Select a file to start editing</div>;
    }

    let activeLanguage = activeFile.language;
    if (activeFile.name === 'index.html' && settings.htmlMode !== 'Normal') {
        activeLanguage = settings.htmlMode.toLowerCase();
    } else if (activeFile.name === 'styles.css' && settings.cssMode !== 'CSS') {
        activeLanguage = settings.cssMode.toLowerCase();
    } else if (activeFile.name === 'script.js' && settings.jsMode === 'TypeScript') {
        activeLanguage = 'typescript';
    }

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <Editor
                height="100%"
                language={activeLanguage}
                theme={activeTheme}
                value={activeFile.content}
                onChange={(val) => { if (val !== undefined) updateFileContent(activeFileId!, val); }}
                options={{
                    fontSize: settings.fontSize,
                    fontFamily: settings.fontFamily,
                    minimap: { enabled: true },
                    wordWrap: 'off',
                    scrollBeyondLastLine: false,
                    suggestOnTriggerCharacters: settings.suggestions,
                    quickSuggestions: settings.suggestions,
                    formatOnPaste: true,
                }}
                loading={<span style={{ color: '#888', padding: 20 }}>Loading Editor...</span>}
            />
        </div>
    );
};
