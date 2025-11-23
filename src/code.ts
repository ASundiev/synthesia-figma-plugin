/// <reference types="@figma/plugin-typings" />

// Show the UI
figma.showUI(__html__, { width: 400, height: 600 });

// Handle commands
if (figma.command === 'set_api_key') {
    figma.ui.postMessage({ type: 'route', route: 'api_settings' });
    figma.ui.resize(400, 300); // Smaller window for settings
} else {
    figma.ui.postMessage({ type: 'route', route: 'intro' });
}

// Handle messages from the UI
figma.ui.onmessage = async (msg) => {
    if (msg.type === 'resize-ui') {
        figma.ui.resize(msg.width, msg.height);
    } else if (msg.type === 'save-api-key') {
        await figma.clientStorage.setAsync('synthesia_api_key', msg.apiKey);
        figma.notify('API Key saved');
    } else if (msg.type === 'get-api-key') {
        const apiKey = await figma.clientStorage.getAsync('synthesia_api_key');
        figma.ui.postMessage({ type: 'api-key', apiKey });
    } else if (msg.type === 'download-and-insert') {
        try {
            const { url, title, thumbnail } = msg;

            // Download video data
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to download video: ${response.statusText}`);
            }
            const buffer = await response.arrayBuffer();
            const videoData = new Uint8Array(buffer);

            // Create node
            const node = figma.createRectangle();
            node.resize(400, 225);
            node.name = title || "Synthesia Video";

            // Center in viewport
            node.x = figma.viewport.center.x - node.width / 2;
            node.y = figma.viewport.center.y - node.height / 2;

            try {
                // Try to create video paint
                const video = await figma.createVideoAsync(videoData);
                node.fills = [{ type: 'VIDEO', scaleMode: 'FILL', videoHash: video.hash }];
                figma.notify('Video inserted successfully!');
            } catch (videoError: any) {
                // Check for Drafts/Plan limitation
                if (videoError.message.includes('Drafts') || videoError.message.includes('Pro team')) {
                    console.warn('Video insertion failed due to Drafts limitation. Falling back to thumbnail.');

                    if (thumbnail) {
                        const thumbResp = await fetch(thumbnail);
                        const thumbBuffer = await thumbResp.arrayBuffer();
                        const image = figma.createImage(new Uint8Array(thumbBuffer));
                        node.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: image.hash }];

                        figma.notify('Inserted as image. Move file to Project to enable video.', { timeout: 5000, error: true });
                    } else {
                        node.remove();
                        throw new Error("Video uploads not allowed in Drafts, and no thumbnail available.");
                    }
                } else {
                    node.remove();
                    throw videoError;
                }
            }

            figma.currentPage.selection = [node];
            figma.viewport.scrollAndZoomIntoView([node]);

            figma.ui.postMessage({ type: 'download-complete' });

        } catch (error) {
            console.error('Insertion error:', error);
            figma.ui.postMessage({ type: 'download-failed', error: String(error) });
            figma.notify('Failed to insert video', { error: true });
        }
    } else if (msg.type === 'notify') {
        figma.notify(msg.message);
    }
};

