import React, { useState } from 'react';
import { Github, Loader2 } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';

export const GithubImporter: React.FC = () => {
    const [repoUrl, setRepoUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const { cloneGitHubRepo } = useEditorStore();

    const handleImport = async () => {
        if (!repoUrl.trim()) return;
        setLoading(true);
        try {
            await cloneGitHubRepo(repoUrl.trim());
            setRepoUrl('');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleImport();
    };

    return (
        <div className="github-importer">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 'bold', marginBottom: '10px' }}>
                <Github size={16} />
                Clone Repository
            </div>
            <input
                type="text"
                placeholder="https://github.com/owner/repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                style={{ opacity: loading ? 0.6 : 1 }}
            />
            <button onClick={handleImport} disabled={loading || !repoUrl.trim()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                {loading ? (
                    <>
                        <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                        Cloning…
                    </>
                ) : (
                    'Clone'
                )}
            </button>
            {loading && (
                <p style={{ fontSize: '11px', color: '#8b949e', marginTop: '6px' }}>
                    Fetching files from GitHub API… (up to 80 files)
                </p>
            )}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};
