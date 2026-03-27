import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, SkipForward } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import './TutorialOverlay.css';

interface TutorialStep {
    target: string; // CSS selector
    title: string;
    description: string;
    position: 'top' | 'bottom' | 'left' | 'right';
    onShow?: (state: ReturnType<typeof useEditorStore.getState>) => void;
}

interface CustomStyle extends React.CSSProperties {
    '--arrow-offset'?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
    {
        target: '.topbar',
        title: 'Menu Bar',
        description: 'Access File, Edit, View, Templates, Tutorial, and Run options from the top menu. Create files, change settings, and start debugging here.',
        position: 'bottom',
    },
    {
        target: '.activity-bar',
        title: 'Activity Bar',
        description: 'Quick access to all IDE panels — Explorer, Search, GitHub, Extensions, Environment, Terminal, and Settings. Click any icon to toggle its panel.',
        position: 'right',
    },
    {
        target: '.split > .panel:first-child',
        title: 'File Explorer',
        description: 'Browse and manage your project files here. Right-click for options like rename and delete. Drag files to reorganize them.',
        position: 'right',
    },
    {
        target: '.split > .panel:nth-child(2)',
        title: 'Code Editor',
        description: 'Write your code here with full IntelliSense support, syntax highlighting, Emmet abbreviations, and multiple language modes. Click the ⚙️ icon for editor settings.',
        position: 'bottom',
    },
    {
        target: '.split > .panel:nth-child(3)',
        title: 'Live Preview',
        description: 'See your code output in real-time. Click the ▶ Run button to execute. Use the DevTools button to inspect elements. Pop-out into a floating window with the window icon.',
        position: 'left',
    },
    {
        target: '.run-btn',
        title: 'Run Button',
        description: 'Click to execute your code and see results in the Preview panel. For Python, output also appears in the Terminal. You can set a keyboard shortcut in Settings.',
        position: 'bottom',
    },
    {
        target: '.activity-action[title="Terminal"]',
        title: 'Integrated Terminal',
        description: 'Open a full-featured terminal with Git, Python, pip, and file commands. Choose between bash, zsh, sh, Node.js, or Python shell styles. Supports Ctrl+C, tab completion, and command history.',
        position: 'right',
    },
    {
        target: '.activity-action[title="Download Project ZIP"]',
        title: 'Download Project',
        description: 'Download your entire project as a ZIP file to continue development locally. All your files and folders are included!',
        position: 'right',
    },
];

const LS_KEY = 'codespace-tutorial-done';

interface TutorialOverlayProps {
    forceShow?: boolean;
    onClose?: () => void;
    steps?: TutorialStep[];
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ forceShow, onClose, steps }) => {
    const activeSteps = steps || TUTORIAL_STEPS;
    const [visible, setVisible] = useState(false);
    const [step, setStep] = useState(0);
    const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
    const [tooltipSize, setTooltipSize] = useState({ width: 340, height: 200 });
    const tooltipRef = useRef<HTMLDivElement>(null);

    // Measure tooltip size whenever it's shown or step changes
    useEffect(() => {
        if (!visible || !tooltipRef.current) return;
        
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.target === tooltipRef.current) {
                    setTooltipSize({
                        width: entry.contentRect.width,
                        height: entry.contentRect.height
                    });
                }
            }
        });

        resizeObserver.observe(tooltipRef.current);
        return () => resizeObserver.disconnect();
    }, [visible, step]);


    useEffect(() => {
        if (forceShow) {
            // Use setTimeout to avoid cascading render lint error
            const t = setTimeout(() => {
                setVisible(true);
                setStep(0);
            }, 0);
            return () => clearTimeout(t);
        } else {
            const done = localStorage.getItem(LS_KEY);
            if (!done) {
                const t = setTimeout(() => setVisible(true), 1200);
                return () => clearTimeout(t);
            }
        }
    }, [forceShow]);

    const updateSpotlight = useCallback(() => {
        if (step >= activeSteps.length) return;
        const currentStep = activeSteps[step];
        const el = document.querySelector(currentStep.target);
        if (el) {
            setSpotlightRect(el.getBoundingClientRect());
        } else {
            setSpotlightRect(null);
        }
    }, [step, activeSteps]);

    useEffect(() => {
        if (!visible) return;
        
        // Trigger onShow if defined
        const currentStepData = activeSteps[step];
        if (currentStepData && currentStepData.onShow) {
            currentStepData.onShow(useEditorStore.getState());
        }

        // Use setTimeout to avoid cascading render lint error
        const t = setTimeout(updateSpotlight, 0);
        window.addEventListener('resize', updateSpotlight);
        const interval = setInterval(updateSpotlight, 500);
        return () => {
            clearTimeout(t);
            window.removeEventListener('resize', updateSpotlight);
            clearInterval(interval);
        };
    }, [visible, step, updateSpotlight, activeSteps]);

    const close = useCallback(() => {
        setVisible(false);
        localStorage.setItem(LS_KEY, 'true');
        onClose?.();
    }, [onClose]);

    const next = useCallback(() => {
        if (step < activeSteps.length - 1) setStep(s => s + 1);
        else close();
    }, [step, close, activeSteps.length]);

    const prev = useCallback(() => {
        if (step > 0) setStep(s => s - 1);
    }, [step]);

    useEffect(() => {
        if (!visible) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close();
            if (e.key === 'ArrowRight' || e.key === 'Enter') next();
            if (e.key === 'ArrowLeft') prev();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [visible, next, prev, close]);

    if (!visible) return null;

    const current = activeSteps[step]; // Changed from TUTORIAL_STEPS to activeSteps
    const isLast = step === activeSteps.length - 1; // Changed from TUTORIAL_STEPS to activeSteps

    // Calculate tooltip position with smart flipping and clamping
    const calculatePosition = () => {
        if (!spotlightRect) {
            return { 
                style: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' } as React.CSSProperties, 
                actualPosition: 'center' 
            };
        }

        const gap = 32; // Increased to 32px to move tooltips "upwards/downwards" from target
        const padding = 16;
        const { width: tw, height: th } = tooltipSize;
        const { innerWidth: vw, innerHeight: vh } = window;
        const isMobile = vw <= 768;

        // Mobile Bottom Sheet Layout
        if (isMobile) {
            return {
                style: {
                    bottom: padding,
                    left: padding,
                    right: padding,
                    width: 'auto',
                    transform: 'none',
                    position: 'fixed' as const
                },
                actualPosition: 'bottom-sheet',
                arrowOffset: '0px'
            };
        }

        let pos = current.position;

        // Smart Flip logic
        if (pos === 'bottom' && spotlightRect.bottom + gap + th > vh - padding) pos = 'top';
        if (pos === 'top' && spotlightRect.top - gap - th < padding) pos = 'bottom';
        if (pos === 'right' && spotlightRect.right + gap + tw > vw - padding) pos = 'left';
        if (pos === 'left' && spotlightRect.left - gap - tw < padding) pos = 'right';

        let top = 0;
        let left = 0;
        let arrowOffset = '50%';

        switch (pos) {
            case 'bottom': {
                top = spotlightRect.bottom + gap;
                left = spotlightRect.left + spotlightRect.width / 2 - tw / 2;
                // Calculate arrow offset to point at center of spotlight
                const targetCenterX = spotlightRect.left + spotlightRect.width / 2;
                const tooltipLeft = Math.max(padding, Math.min(left, vw - tw - padding));
                arrowOffset = `${targetCenterX - tooltipLeft}px`;
                break;
            }
            case 'top': {
                top = spotlightRect.top - th - gap;
                left = spotlightRect.left + spotlightRect.width / 2 - tw / 2;
                const tcx = spotlightRect.left + spotlightRect.width / 2;
                const tl = Math.max(padding, Math.min(left, vw - tw - padding));
                arrowOffset = `${tcx - tl}px`;
                break;
            }
            case 'right': {
                top = spotlightRect.top + spotlightRect.height / 2 - th / 2;
                left = spotlightRect.right + gap;
                const targetCenterY = spotlightRect.top + spotlightRect.height / 2;
                const tooltipTop = Math.max(padding, Math.min(top, vh - th - padding));
                arrowOffset = `${targetCenterY - tooltipTop}px`;
                break;
            }
            case 'left': {
                top = spotlightRect.top + spotlightRect.height / 2 - th / 2;
                left = spotlightRect.left - tw - gap;
                const tcy = spotlightRect.top + spotlightRect.height / 2;
                const tt = Math.max(padding, Math.min(top, vh - th - padding));
                arrowOffset = `${tcy - tt}px`;
                break;
            }
        }

        return {
            style: {
                top: Math.max(padding, Math.min(top, vh - th - padding)),
                left: Math.max(padding, Math.min(left, vw - tw - padding)),
                position: 'fixed' as const
            },
            actualPosition: pos,
            arrowOffset
        };
    };

    const { style: tooltipStyle, actualPosition, arrowOffset } = calculatePosition();

    // Arrow direction
    const getArrowClass = () => {
        switch (actualPosition) {
            case 'bottom': return 'tutorial-arrow-up';
            case 'top': return 'tutorial-arrow-down';
            case 'right': return 'tutorial-arrow-left';
            case 'left': return 'tutorial-arrow-right';
            default: return '';
        }
    };

    return (
        <div className="tutorial-overlay">
            {/* Dark backdrop with cutout */}
            <svg className="tutorial-backdrop" width="100%" height="100%">
                <defs>
                    <mask id="tutorial-mask">
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        {spotlightRect && (
                            <rect
                                x={spotlightRect.left - 6}
                                y={spotlightRect.top - 6}
                                width={spotlightRect.width + 12}
                                height={spotlightRect.height + 12}
                                rx="8"
                                fill="black"
                            />
                        )}
                    </mask>
                </defs>
                <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.72)" mask="url(#tutorial-mask)" />
            </svg>

            {/* Spotlight border glow */}
            {spotlightRect && (
                <div
                    className="tutorial-spotlight-border"
                    style={{
                        top: spotlightRect.top - 6,
                        left: spotlightRect.left - 6,
                        width: spotlightRect.width + 12,
                        height: spotlightRect.height + 12,
                    }}
                />
            )}

            {/* Tooltip */}
            <div
                ref={tooltipRef}
                className={`tutorial-tooltip ${getArrowClass()} ${actualPosition === 'bottom-sheet' ? 'mobile-sheet' : ''}`}
                style={{
                    ...tooltipStyle,
                    '--arrow-offset': arrowOffset,
                } as CustomStyle}
            >
                <div className="tutorial-tooltip-header">
                    <div className="tutorial-step-badge">
                        Step {step + 1} of {activeSteps.length}
                    </div>
                    <button className="tutorial-close-btn" onClick={close}>
                        <X size={14} />
                    </button>
                </div>
                <h3 className="tutorial-tooltip-title">{current.title}</h3>
                <p className="tutorial-tooltip-desc">{current.description}</p>
                <div className="tutorial-tooltip-actions">
                    <button className="tutorial-skip-btn" onClick={close}>
                        <SkipForward size={14} />
                        Skip Tutorial
                    </button>
                    <div className="tutorial-nav-btns">
                        {step > 0 && (
                            <button className="tutorial-prev-btn" onClick={prev}>
                                <ChevronLeft size={16} />
                                Back
                            </button>
                        )}
                        <button className="tutorial-next-btn" onClick={next}>
                            {isLast ? 'Finish' : 'Next'}
                            {!isLast && <ChevronRight size={16} />}
                        </button>
                    </div>
                </div>
                {/* Progress dots */}
                <div className="tutorial-dots">
                    {activeSteps.map((_, i) => (
                        <div
                            key={i}
                            className={`tutorial-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
                            onClick={() => setStep(i)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
