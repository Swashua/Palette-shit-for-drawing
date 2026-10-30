# Palette

Pick colours from an image. Upload, drop or paste a picture, then drag the points to sample its pixels. Hex codes, colour names and swatches update as you move.

[Open Palette](https://palette-image-studio-joshua.grandcoati14.chatgpt.site)

## Run locally

No dependencies or API keys needed. From the project folder:

```sh
python -m http.server 5173 --directory dist
```

Open http://localhost:5173.

## Deploy on Vercel

Import this repository and leave Root Directory empty. The included `vercel.json` serves `dist` directly. No install or build command is needed.

## Features

- Extract 4 to 12 main colours from an image.
- Drag points to pick exact pixel colours. Labels stay spaced out and lines do not cross.
- Zoom from 100% to 800% with the buttons or mouse wheel. Drag the enlarged image to pan, and use Fit to see the whole image again.
- Copy individual hex codes or the full palette.
- Export an annotated PNG, CSS variables, JSON or CSV.
- Export every unique pixel colour as a CSV with pixel counts.
- Switch between light and dark mode. Your preference is saved in the browser.

Focus a point and use the arrow keys to move one pixel, or Shift and an arrow key to move ten. Press Escape to cancel a drag.

Focus the image view to use + and - for zoom, 0 for Fit, or arrow keys to pan. Samples outside the visible area reappear when you pan back or choose Fit. Exports always include the full image.

Images are processed in your browser. Colour names are approximate. Images can be up to 20 MB and 40 megapixels; pixels with alpha below 128 are skipped. Moving a point replaces its original coverage percentage with "Picked".

## Checks

Requires Node.js:

```sh
node --check dist/app.js
node tests/routing.cjs
node tests/viewport.cjs
```

The routing checks cover line intersections, label spacing, equal-row points and duplicate samples at different screen sizes.

## Example image

The included landscape is from [Unsplash](https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05). The interface uses DM Sans from Google Fonts with a system font fallback.
