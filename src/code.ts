/// <reference types="@figma/plugin-typings" />

// Handle commands
if (figma.command === 'set_api_key') {
    figma.showUI(__html__, { width: 400, height: 300 });
    figma.ui.postMessage({ type: 'route', route: 'api_key_settings' });
} else {
    figma.showUI(__html__, { width: 432, height: 768 }); // 400px content + 32px padding
    figma.ui.postMessage({ type: 'route', route: 'intro' });
}

// Handle messages from the UI
figma.ui.onmessage = async (msg) => {
    if (msg.type === 'save-api-key') {
        await figma.clientStorage.setAsync('synthesia_api_key', msg.apiKey);
        figma.notify('API Key saved');
        // After saving, we can resize to main screen size
        figma.ui.resize(432, 768);
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

            // Check if there's a selected node we can use
            let node: RectangleNode | FrameNode;
            const selection = figma.currentPage.selection;

            if (selection.length === 1 && (selection[0].type === 'RECTANGLE' || selection[0].type === 'FRAME')) {
                // Use the selected node
                node = selection[0] as RectangleNode | FrameNode;
                node.name = title || "Synthesia Video";
            } else {
                // Create a new node
                node = figma.createRectangle();
                node.resize(400, 225);
                node.name = title || "Synthesia Video";

                // Center in viewport
                node.x = figma.viewport.center.x - node.width / 2;
                node.y = figma.viewport.center.y - node.height / 2;
            }

            try {
                // Try to create video paint
                const video = await figma.createVideoAsync(videoData);
                node.fills = [{ type: 'VIDEO', scaleMode: 'FILL', videoHash: video.hash }];
                figma.notify('Video inserted successfully!');
            } catch (videoError: any) {
                const errorMessage = videoError?.message || String(videoError);
                console.warn('Video insertion failed:', errorMessage);

                if (thumbnail) {
                    console.log('Falling back to thumbnail...');
                    const thumbResp = await fetch(thumbnail);
                    const thumbBuffer = await thumbResp.arrayBuffer();
                    const image = figma.createImage(new Uint8Array(thumbBuffer));
                    node.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: image.hash }];

                    // Customize message based on error type if needed, or keep it generic
                    const isDraftsError = errorMessage.includes('Drafts') || errorMessage.includes('Pro team');
                    const notifyMsg = isDraftsError
                        ? 'Inserted as image. Move file to Project to enable video.'
                        : 'Video insertion failed. Inserted as image.';

                    figma.notify(notifyMsg, { timeout: 5000, error: !isDraftsError });
                } else {
                    node.remove();
                    // Re-throw if no thumbnail to fallback to
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

