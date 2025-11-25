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
                    <video autoPlay loop playsInline className="intro-video">
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
                        <svg
                            className="loading-logo"
                            color="#3E57DA"
                            viewBox="0 0 474 317"
                            xmlns="http://www.w3.org/2000/svg"
                            width="64"
                            height="43"
                        >
                            <style>
                                {`
                                .loading-logo .loader-scaling,
                                .loading-logo .loader-fading {
                                animation-timing-function: cubic-bezier(0.9, 0, 0.1, 1);
                                animation-duration: 0.8s;
                                animation-iteration-count: infinite;
                                animation-direction: alternate;
                                }

                                /* scale animation */
                                .loading-logo .loader-scaling {
                                animation-name: loader-scale;
                                transform-box: fill-box;
                                }

                                .loading-logo #loader-shape-left.loader-scaling {
                                transform-origin: left top;
                                }

                                .loading-logo #loader-shape-right.loader-scaling {
                                transform-origin: right bottom;
                                }

                                @keyframes loader-scale {
                                0% {
                                    transform: scale(0.94);
                                }
                                100% {
                                    transform: scale(1.06);
                                }
                                }

                                /* fade animation */
                                .loading-logo .loader-fading {
                                animation-name: loader-fade;
                                }

                                @keyframes loader-fade {
                                0% {
                                    opacity: 0;
                                }
                                100% {
                                    opacity: 1;
                                }
                                }
                                `}
                            </style>
                            <defs>
                                <path
                                    id="loader-shape-left"
                                    className="loader-scaling"
                                    d="M370.634 205.562C369.361 218.35 358.601 228.091 345.75 228.091L0 228.091L12.8957 98.5674C18.4661 42.6181 65.538 -4.91543e-06 121.764 0L391.1 2.35461e-05L370.634 205.562Z"
                                />
                                <path
                                    id="loader-shape-right"
                                    className="loader-scaling"
                                    d="M103.138 111.116C104.411 98.3277 115.171 88.5864 128.022 88.5864H473.772L460.876 218.11C455.306 274.059 408.234 316.678 352.008 316.678H82.6719L103.138 111.116Z"
                                />
                                <mask id="loader-mask-left" x="0" y="0">
                                    <use href="#loader-shape-left" fill="#FFF" />
                                    <use href="#loader-shape-right" fill="#000" />
                                </mask>
                                <mask id="loader-mask-right" x="0" y="0">
                                    <use href="#loader-shape-right" fill="#FFF" />
                                    <use href="#loader-shape-left" fill="#000" />
                                </mask>
                            </defs>

                            <use
                                href="#loader-shape-left"
                                className="loader-fading"
                                mask="url(#loader-mask-left)"
                                fill="currentColor"
                            />
                            <use
                                href="#loader-shape-right"
                                className="loader-fading"
                                mask="url(#loader-mask-right)"
                                fill="currentColor"
                            />
                        </svg>
                        <div className="loading-text">Initializing video creation...</div>
                        <div className="loading-subtext">This may take a few minutes.</div>
                    </div>
                </div>
            )}

            {step === 'success' && (
                <div className="success-screen">
                    <h1 className="success-heading">Well done!</h1>
                    <button onClick={() => setStep('config')} className="success-button">Generate another one</button>
                </div>
            )}
        </div>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
