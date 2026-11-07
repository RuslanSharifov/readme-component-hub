# Contributing to README Component Hub

The gallery currently contains **one component**, Neon Waveform. Other components were intentionally removed while the site and README Designer are being refined.

## How to propose a new component

Open an issue with a visual concept or fork the repository and send a pull request. New components should include their own folder under components/, a safe component.json manifest and dark/light SVG or GIF assets. A maintainer will review the component and enable its renderer before accepting it.

For now, keep Neon Waveform as the only enabled catalog item.

## Safety and compatibility

- No scripts, remote CSS, inline event handlers or HTML inside SVG files.
- Animated README images must be real GIF files hosted on GitHub.
- Text placed next to an image is editable. Text baked into an existing GIF is not editable through a Markdown URL.
- Test the actual output on GitHub and verify responsive behavior.
- Run both GitHub Actions workflows before merging.

The project uses GitHub Pages; no database or separate hosting is required.
