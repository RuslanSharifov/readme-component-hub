# Contributing to README Component Hub

Thanks for helping build a community-powered gallery!

## Add a component

1. Fork this repository and create a feature branch.
2. Add a folder named `components/my-component/`.
3. Include `component.json` and your assets (normally `dark.svg` and `light.svg`, or GIFs).
4. Follow the manifest schema illustrated in `components/minimal-divider/component.json`. Categories: Animations, Badges, Dividers, Cards, Dynamic.
5. Run `python3 scripts/build_catalog.py` locally. To render the bundled animated examples, install `requirements-assets.txt` and run `python3 scripts/render_gifs.py`.
6. Open a pull request describing the component, its author and any relevant accessibility considerations.

### Dynamic repository stats cards

Dynamic cards are **static SVG snapshots refreshed automatically** by GitHub Actions, so they can be embedded in any GitHub README without a backend. To track a different public repository:

1. Copy `components/repository-stats/component.json` to a new folder with a unique component ID.
2. Set `"category": "Dynamic"`, `"format": "svg"`, `"renderer": "github-repo"` and `"repository": "OWNER/REPO"`.
3. Set the two theme paths to `generated/YOUR-ID/dark.svg` and `generated/YOUR-ID/light.svg`.
4. Include a README and open a pull request. Once merged, the scheduled workflow fetches the public GitHub metadata and publishes both images.

No extra server or reader access token is required. GitHub's scheduled jobs can be delayed; data is not instant.

### Image rules

- Assets must be ordinary standalone images. SVG may contain shapes, paths, gradients and text, but **no scripts, external resources, embedded HTML, links or event handlers**.
- Use relative files inside your own component folder, with both dark and light versions.
- GIFs must be actual animated GIF files if advertised as animated; avoid huge or flashing animations.
- No tracking pixels, third-party URLs, remotely loaded fonts or copyrighted artwork you do not have permission to share.
- GIF and SVG components must work in GitHub README's image renderer. Web-only CSS animations are not sufficient.

The catalog is generated from the per-folder manifest during build; do not edit `components/catalog.json` manually. The gallery uses no login or user database.

## Reviewing

Maintainers review pull requests before merging. CI validates each manifest and blocks unsafe SVG markup. Untrusted PRs are **not allowed to run arbitrary build scripts** in a privileged deployment context.

By contributing you agree to publish your contribution under the repository's MIT license.
