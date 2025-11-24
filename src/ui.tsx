import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { createVideo, getVideoStatus } from './synthesia';
import bgVideo from './assets/bg-video.mp4';

const App = () => {
    const [step, setStep] = useState<'intro' | 'auth' | 'config' | 'generating' | 'success' | 'api_settings'>('intro');
    const [apiKey, setApiKey] = useState('');
    const [config, setConfig] = useState({
        title: '',
        description: 'Created via Figma Plugin',
        scriptText: '',
        avatar: '', // Default avatar
    });
    const [error, setError] = useState('');
    const [showIntroButton, setShowIntroButton] = useState(true);

    useEffect(() => {
        if (step === 'intro') {
            const interval = setInterval(() => {
                setShowIntroButton(prev => !prev);
            }, 15000);
            return () => clearInterval(interval);
        }
    }, [step]);

    useEffect(() => {
        // Listen for route messages from code.ts
        window.onmessage = (event) => {
            const msg = event.data.pluginMessage;
            if (msg.type === 'route') {
                setStep(msg.route);
            } else if (msg.type === 'api-key' && msg.apiKey) {
                setApiKey(msg.apiKey);
            } else if (msg.type === 'download-complete') {
                setStep('success');
            } else if (msg.type === 'download-failed') {
                setError(`Download failed: ${msg.error}`);
                setStep('config');
            }
        };

        // Check for existing API key on load (silently)
        window.parent.postMessage({ pluginMessage: { type: 'get-api-key' } }, '*');
    }, []);

    const handleSaveKey = () => {
        if (!apiKey) return;
        window.parent.postMessage({ pluginMessage: { type: 'save-api-key', apiKey } }, '*');
        setStep('intro');
    };

    const handleGenerate = async () => {
        if (!apiKey) {
            setError('API Key is missing. Please set it in the menu.');
            return;
        }
        setStep('generating');
        // setStatus('Initializing video creation...'); // Removed
        setError('');

        // Use defaults if empty
        const finalConfig = {
            ...config,
            title: config.title || 'My Synthesia Video',
            scriptText: config.scriptText || 'Hello! This is a video generated directly from Figma.',
            avatar: config.avatar || 'anna_costume1_cameraA'
        };

        try {
            // 1. Create Video
            const videoData = await createVideo(apiKey, finalConfig);
            const videoId = videoData.id;

            // 2. Poll for status
            const pollInterval = setInterval(async () => {
                try {
                    const statusData = await getVideoStatus(apiKey, videoId);

                    if (statusData.status === 'complete') {
                        clearInterval(pollInterval);

                        // 3. Download and Insert (Delegated to code.ts)
                        if (statusData.download) {
                            window.parent.postMessage({
                                pluginMessage: {
                                    type: 'download-and-insert',
                                    url: statusData.download,
                                    thumbnail: statusData.thumbnail || statusData.thumbnail_url,
                                    title: finalConfig.title
                                }
                            }, '*');
                        } else {
                            setError('Video completed but no download URL found.');
                            setStep('config');
                        }
                    } else if (statusData.status === 'failed') {
                        clearInterval(pollInterval);
                        setError('Video generation failed.');
                        setStep('config');
                    }
                } catch (err: any) {
                    clearInterval(pollInterval);
                    console.error('Polling error:', err);
                    setError(`Error: ${err.message || 'Unknown error checking status'}`);
                    setStep('config');
                }
            }, 5000);

        } catch (err: any) {
            console.error('Creation error:', err);
            setError(`Failed to create video: ${err.message || 'Unknown error'}`);
            setStep('config');
        }
    };

    return (
        <div className="container">
            {step === 'intro' && (
                <div className="intro-container">
                    <video autoPlay loop muted playsInline className="intro-video">
                        <source src={bgVideo} type="video/mp4" />
                    </video>

                    <div className={`intro-button-wrapper ${showIntroButton ? 'visible' : 'hidden'}`}>
                        <button className="primary-button-large" onClick={() => setStep('config')}>
                            Get started
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M13.75 6.75L19.25 12L13.75 17.25" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M19 12H4.75" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {step === 'api_settings' && (
                <div className="settings-container">
                    <h3>Set API Key</h3>
                    <div className="settings-steps">
                        <p>1. Go to the <a href="https://synthesia.io" target="_blank">Synthesia website</a> and log in.</p>
                        <p>2. Find your API key in the settings dashboard.</p>
                    </div>
                    <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Api Key"
                        className="settings-input"
                    />
                    <button onClick={handleSaveKey}>Save</button>
                    <div className="settings-footer">
                        More information about API keys <a href="#">here</a>.
                    </div>
                </div>
            )}

            {(step === 'config' || step === 'generating') && (
                <div className="main-layout">
                    <div className="left-column">
                        <h1>Create a video</h1>

                        <div className="form-card">
                            <div>
                                <label>Title</label>
                                <input
                                    value={config.title}
                                    onChange={(e) => setConfig({ ...config, title: e.target.value })}
                                    placeholder="My Synthesia Video"
                                    disabled={step === 'generating'}
                                />
                            </div>

                            <div>
                                <label>Avatar ID</label>
                                <input
                                    value={config.avatar}
                                    onChange={(e) => setConfig({ ...config, avatar: e.target.value })}
                                    placeholder="e.g. anna_costume1_cameraA"
                                    disabled={step === 'generating'}
                                />
                            </div>

                            <div className="script-container">
                                <label>Script</label>
                                <textarea
                                    value={config.scriptText}
                                    onChange={(e) => setConfig({ ...config, scriptText: e.target.value })}
                                    placeholder="Hello! This is a video generated directly from Figma."
                                    disabled={step === 'generating'}
                                />
                            </div>

                            {error && <div className="error-message">{error}</div>}

                            <button onClick={handleGenerate} disabled={step === 'generating'}>Generate</button>
                        </div>
                    </div>
                </div>
            )}

            {step === 'generating' && (
                <div className="loading-overlay">
                    <div className="loading-content">
                        <svg width="64" height="43" viewBox="0 0 252 168" fill="none" xmlns="http://www.w3.org/2000/svg" className="loading-logo">
                            <path d="M43.784 167.963H184.095C218.661 167.963 240.681 146.713 244.266 114.195L251.434 46.8554H203.041L196.385 108.307C195.616 116.501 190.495 121.108 182.046 121.108H48.393L43.784 167.963ZM48.393 121.108L55.0497 59.6568C55.8185 51.4625 60.9394 46.8554 69.3887 46.8554H203.041L207.652 0H67.3392C32.7733 0 10.7538 21.2526 7.16856 53.7689L0 121.108H48.393Z" fill="#3E57DA" />
                        </svg>
                        <div className="loading-text">Initializing video creation...</div>
                        <div className="loading-subtext">This may take a few minutes.</div>
                    </div>
                </div>
            )}

            {step === 'success' && (
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ color: '#52c41a' }}>Success!</h2>
                    <p>Video has been inserted into Figma.</p>
                    <button onClick={() => setStep('config')} style={{ marginTop: '24px' }}>Create Another</button>
                </div>
            )}
        </div>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
