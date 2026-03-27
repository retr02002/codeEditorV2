import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, BookOpen, Code2, Terminal, Play, Folder, Blocks, Download, Layers, Eye } from 'lucide-react';
import './TutorialModal.css';

interface TutorialSlide {
    icon: React.ReactNode;
    title: string;
    description: string;
    features: string[];
    color: string;
}

const SLIDES: TutorialSlide[] = [
    {
        icon: <BookOpen size={40} />,
        title: 'Welcome to CodeSpace',
        description: 'A powerful browser-based code editor with real-time preview, integrated terminal, and support for multiple languages and frameworks.',
        features: [
            'Multi-language support (HTML, CSS, JS, Python, React, Vue, TypeScript, and more)',
            'Real-time live preview with DevTools',
            'Integrated terminal with Git support',
            'Extensions marketplace integration',
        ],
        color: '#58a6ff',
    },
    {
        icon: <Folder size={40} />,
        title: 'File Explorer',
        description: 'Manage your project files with a familiar tree view. Create, rename, delete, and drag files to organize your project.',
        features: [
            'Create files and folders via right-click or terminal commands',
            'Drag & drop to reorganize files',
            'Open local files and folders from your computer',
            'GitHub repository cloning support',
        ],
        color: '#3fb950',
    },
    {
        icon: <Code2 size={40} />,
        title: 'Code Editor',
        description: 'Powered by Monaco Editor (same engine as VS Code) with full IntelliSense, syntax highlighting, and theme support.',
        features: [
            'IntelliSense with auto-completion',
            'Emmet abbreviations for HTML/CSS',
            'Multiple themes (Dracula, Night Owl, Monokai, etc.)',
            'Configurable font size, font family, and keyboard shortcuts',
        ],
        color: '#bc8cff',
    },
    {
        icon: <Eye size={40} />,
        title: 'Live Preview',
        description: 'See your code output instantly in the preview panel. Supports HTML/CSS/JS, React, Vue, TypeScript, and Python environments.',
        features: [
            'Auto-refresh on code changes (live editing mode)',
            'Built-in Eruda DevTools for debugging',
            'Pop-out preview into a floating window',
            'Multiple preview tabs for different views',
        ],
        color: '#d29922',
    },
    {
        icon: <Terminal size={40} />,
        title: 'Integrated Terminal',
        description: 'Full-featured terminal with multiple shell styles. Run Git commands, Python scripts, and manage packages — all in the browser.',
        features: [
            'Choose between Bash, Zsh, Shell, Node.js, or Python prompts',
            'Git operations: clone, add, commit, branch, checkout',
            'Python execution with Pyodide (WebAssembly)',
            'pip package management with virtual environment support',
        ],
        color: '#39c5cf',
    },
    {
        icon: <Layers size={40} />,
        title: 'Environments & Templates',
        description: 'Switch between different development environments with boilerplate templates to get started quickly.',
        features: [
            'Vanilla Web, React, Vue, TypeScript, Python, Node.js',
            'C, C++, Rust, Go, Ruby, Lua, C#, Dart, Flutter',
            'WebGL, Canvas, SVG creative templates',
            'Each environment has optimized preview rendering',
        ],
        color: '#f85149',
    },
    {
        icon: <Blocks size={40} />,
        title: 'Extensions Marketplace',
        description: 'Browse and install extensions from the Open VSX Registry to extend your editor with themes and language support.',
        features: [
            'Search the Open VSX marketplace in real-time',
            'Browse by categories',
            'One-click install and uninstall',
            'Theme extensions apply automatically',
        ],
        color: '#e3b341',
    },
    {
        icon: <Play size={40} />,
        title: 'Run & Execute',
        description: 'Execute your code with the Run button or keyboard shortcuts. Output appears in the preview panel or terminal.',
        features: [
            'Customizable run shortcut (default: Ctrl+S)',
            'Python runs via Pyodide WebAssembly engine',
            'C/C++/Rust/Go compile via Wandbox API',
            'JavaScript executes in a sandboxed iframe',
        ],
        color: '#4CAF50',
    },
    {
        icon: <Download size={40} />,
        title: 'Export & Share',
        description: 'Download your entire project as a ZIP file to continue development in your local IDE.',
        features: [
            'Download project as ZIP with all files',
            'All file structure preserved',
            'Works with any local IDE (VS Code, WebStorm, etc.)',
            'Great for students sharing projects with teachers',
        ],
        color: '#58a6ff',
    },
];

interface TutorialModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
    const [currentSlide, setCurrentSlide] = useState(0);

    if (!isOpen) return null;

    const slide = SLIDES[currentSlide];
    const isFirst = currentSlide === 0;
    const isLast = currentSlide === SLIDES.length - 1;

    return (
        <div className="tutorial-modal-overlay" onClick={onClose}>
            <div className="tutorial-modal" onClick={e => e.stopPropagation()}>
                {/* Close button */}
                <button className="tutorial-modal-close" onClick={onClose}>
                    <X size={18} />
                </button>

                {/* Slide content */}
                <div className="tutorial-modal-content">
                    {/* Visual area */}
                    <div
                        className="tutorial-modal-visual"
                        style={{ background: `linear-gradient(135deg, ${slide.color}15, ${slide.color}08)` }}
                    >
                        <div className="tutorial-modal-icon" style={{ color: slide.color }}>
                            {slide.icon}
                        </div>
                        <div className="tutorial-modal-step-indicator">
                            {currentSlide + 1} / {SLIDES.length}
                        </div>
                    </div>

                    {/* Text area */}
                    <div className="tutorial-modal-text">
                        <h2 className="tutorial-modal-title">{slide.title}</h2>
                        <p className="tutorial-modal-desc">{slide.description}</p>
                        <ul className="tutorial-modal-features">
                            {slide.features.map((f, i) => (
                                <li key={i} style={{ borderLeftColor: slide.color }}>
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Navigation */}
                <div className="tutorial-modal-nav">
                    {/* Dot indicators */}
                    <div className="tutorial-modal-dots">
                        {SLIDES.map((_, i) => (
                            <button
                                key={i}
                                className={`tutorial-modal-dot ${i === currentSlide ? 'active' : ''}`}
                                onClick={() => setCurrentSlide(i)}
                                style={i === currentSlide ? { background: slide.color } : undefined}
                            />
                        ))}
                    </div>

                    {/* Buttons */}
                    <div className="tutorial-modal-btns">
                        <button
                            className="tutorial-modal-btn-prev"
                            onClick={() => setCurrentSlide(s => s - 1)}
                            disabled={isFirst}
                        >
                            <ChevronLeft size={16} />
                            Previous
                        </button>
                        <button
                            className="tutorial-modal-btn-next"
                            onClick={() => isLast ? onClose() : setCurrentSlide(s => s + 1)}
                            style={{ background: slide.color }}
                        >
                            {isLast ? 'Get Started' : 'Next'}
                            {!isLast && <ChevronRight size={16} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
