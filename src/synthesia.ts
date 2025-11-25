import axios from 'axios';

const API_BASE_URL = 'https://api.synthesia.io/v2';

export interface VideoConfig {
    title: string;
    description: string;
    avatar: string; // avatar ID
    background?: string; // background ID or 'green_screen'
    scriptText: string;
}

export const createVideo = async (apiKey: string, config: VideoConfig) => {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/videos`,
            {
                title: config.title,
                description: config.description,
                visibility: 'public',
                test: false, // Disabled to remove watermarks (consumes credits)
                input: [
                    {
                        scriptText: config.scriptText,
                        avatar: config.avatar,
                        background: config.background || 'green_screen',
                    },
                ],
            },
            {
                headers: {
                    Authorization: apiKey,
                    'Content-Type': 'application/json',
                },
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error creating video:', error);
        throw error;
    }
};

export const getVideoStatus = async (apiKey: string, videoId: string) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/videos/${videoId}`, {
            headers: {
                Authorization: apiKey,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error getting video status:', error);
        throw error;
    }
};

