# README Component Hub

**An open-source, GitHub-hosted gallery of beautiful README images and animations.**

- [Open the gallery](https://ruslansharifov.github.io/readme-component-hub/)
- [Contribute a component](CONTRIBUTING.md)
- [Browse the component source](components/)

## What it does

Explore SVG and animated GIF components, search or filter by category, choose light/dark versions, preview the **actual image shown in GitHub README**, and copy ready-to-paste Markdown. Everything is stored in this repository. No database, token, API key or independent server is needed.

GitHub Pages hosts the gallery and its previews. GitHub Actions validates manifests, generates animated GIFs, **commits them to the repository**, and publishes the static site. The generated Markdown uses raw GitHub asset URLs for reliable README embedding.

## Live animated example

This is the same GIF that the gallery provides for GitHub README files. It is stored in the repository, so it does not depend on GitHub Pages' image-hosting cache.

![Neon Waveform](https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/generated/neon-wave/dark.gif)

## Quick start

1. Open the [gallery](https://ruslansharifov.github.io/readme-component-hub/).
2. Select a component and a theme.
3. Copy the generated Markdown into your `README.md`.

## Local development

Requires Python 3.10+; Pillow is needed only for GIF generation.

```bash
git clone https://github.com/RuslanSharifov/readme-component-hub.git
cd readme-component-hub
python3 -m pip install -r requirements-assets.txt
python3 scripts/build_catalog.py
python3 scripts/render_gifs.py
python3 -m http.server 8000
```

Open **http://localhost:8000/** in your browser.

## GitHub Pages deployment

In repository **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the source. Pushing to `main` will trigger `.github/workflows/deploy.yml`. The site appears at:

https://ruslansharifov.github.io/readme-component-hub/

For new community components, see [CONTRIBUTING.md](CONTRIBUTING.md). All artwork/source lives in Git, and the deploy workflow commits generated GIF assets to `generated/` on `main`. Markdown embeds load these files from `raw.githubusercontent.com`; gallery previews use the matching Pages copies.
