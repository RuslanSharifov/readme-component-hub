# README Component Hub

**An open-source, GitHub-hosted gallery of beautiful README images and animations.**

- [Open the gallery](https://ruslansharifov.github.io/readme-component-hub/)
- [Contribute a component](CONTRIBUTING.md)
- [Browse the component source](components/)

## What it does

Explore SVG and animated GIF components, search or filter by category, choose light/dark versions, preview the **actual image shown in GitHub README**, and copy ready-to-paste Markdown. Everything is stored in this repository. No database, token, API key or independent server is needed.

GitHub Pages hosts the gallery and the resulting assets. GitHub Actions validates manifests, renders built-in GIFs, and publishes the static site.

## Quick start

1. Open the [gallery](https://ruslansharifov.github.io/readme-component-hub/).
2. Select a component and a theme.
3. Copy the generated Markdown into your \`README.md\`.

## Local development

Requires Python 3.10+; Pillow is needed only for GIF generation.

\`\`\`bash
git clone https://github.com/RuslanSharifov/readme-component-hub.git
cd readme-component-hub
python3 -m pip install -r requirements-assets.txt
python3 scripts/build_catalog.py
python3 scripts/render_gifs.py
python3 -m http.server 8000
\`\`\`

Open http://localhost:8000/readme-component-hub/ if using a suitable project-root proxy, or simply http://localhost:8000/ when serving this repository directory directly.

## GitHub Pages deployment

In repository **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the source. Pushing to \`main\` will trigger \`.github/workflows/deploy.yml\`. The site appears at:

https://ruslansharifov.github.io/readme-component-hub/

For new community components, see [CONTRIBUTING.md](CONTRIBUTING.md). All artwork/source is versioned in Git; generated GIFs are produced at deploy time and served by GitHub Pages.
