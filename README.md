# Synthesia Figma Plugin

This Figma plugin allows users to generate AI-powered videos using the Synthesia API directly within Figma. It features a seamless integration where generated videos are inserted as video nodes into the Figma canvas.

## Features

-   **Synthesia Integration:** Generate videos using Synthesia's AI avatars.
-   **Direct Insertion:** Videos are automatically inserted into the Figma canvas upon completion.
-   **Customizable:** Set video title, script, and avatar ID.
-   **Secure:** API key is stored locally in Figma's client storage.

## Prerequisites

-   **Node.js** (v16 or later)
-   **Figma Desktop App**
-   **Synthesia Account** (with API access)

## Setup

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

## Development

To run the plugin in development mode with hot reloading:

1.  Start the build watcher:
    ```bash
    npm run dev
    ```
2.  Open Figma.
3.  Go to **Plugins > Development > Import plugin from manifest...**
4.  Select the `manifest.json` file in this project directory.
5.  Run the plugin.

## Building for Production

To build the plugin for distribution:

```bash
npm run build
```

This will generate the production-ready files in the `dist/` directory.

## Project Structure

-   `src/code.ts`: Main plugin logic (runs in Figma's sandbox).
-   `src/ui.tsx`: UI logic (React).
-   `src/styles.css`: Global styles.
-   `src/synthesia.ts`: Synthesia API client.
-   `manifest.json`: Plugin configuration.

## License

ISC
