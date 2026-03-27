import React, { useState, useEffect } from 'react';
import { AlertCircle, X, RefreshCw, Smartphone } from 'lucide-react';
import './DevelopmentNotice.css';

export const DevelopmentNotice: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Show notice after a short delay for better UX
        const timer = setTimeout(() => setIsVisible(true), 1500);
        return () => clearTimeout(timer);
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="dev-notice-overlay">
            <div className="dev-notice-card">
                <button className="dev-notice-close" onClick={handleDismiss}>
                    <X size={18} />
                </button>
                
                <div className="dev-notice-header">
                    <div className="dev-notice-icon">
                        <AlertCircle size={24} />
                    </div>
                    <h2>Under Development</h2>
                </div>

                <div className="dev-notice-body">
                    <p>Welcome to <strong>CodeSpace Beta</strong>! We're constantly improving the experience. To ensure you have the latest features and fixes:</p>
                    
                    <div className="dev-notice-tips">
                        <div className="dev-tip">
                            <RefreshCw size={16} className="tip-icon" />
                            <span>On Desktop: Use <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd> (or <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd>) for a <strong>Hard Reload</strong>.</span>
                        </div>
                        <div className="dev-tip">
                            <Smartphone size={16} className="tip-icon" />
                            <span>On Mobile: If things look off, please <strong>clear your browser cache</strong> to fetch latest updates.</span>
                        </div>
                    </div>
                </div>

                <div className="dev-notice-footer">
                    <button className="dev-notice-btn" onClick={handleDismiss}>
                        Got it, thanks!
                    </button>
                </div>
            </div>
        </div>
    );
};
