# Contributing to README Component Hub

Thanks for helping build a community-powered gallery!

## Add a component

1. Fork this repository and create a feature branch.
2. Add a folder named \`components/my-component/\`.
3. Include \`component.json\` and your assets (normally \`dark.svg\` and \`light.svg\`, or GIFs).
4. Follow the manifest schema illustrated in \`components/minimal-divider/component.json\`. Categories: Animations, Badges, Dividers, Cards.
5. Run \`python3 scripts/build_catalog.py\` locally. To render the bundled animated examples, install \`requirements-assets.txt\` and run \`python3 scripts/render_gifs.py\`.
6. Open a pull request describing the component, its author and any relevant accessibility considerations.

### Image rules

- Assets must be ordinary standalone images. SVG may contain shapes, paths, gradients and text, but **no scripts, external resources, embedded HTML, links or event handlers**.
- Use relative files inside your own component folder, with both dark and light versions.
- GIFs must be actual animated GIF files if advertised as animated; avoid huge or flashing animations.
- No tracking pixels, third-party URLs, remotely loaded fonts or copyrighted artwork you do not have permission to share.
- GIF and SVG components must work in GitHub README's image renderer. Web-only CSS animations are not sufficient.

The catalog is generated from the per-folder manifest during build; do not edit \`components/catalog.json\` manually. The gallery uses no login or user database.

## Reviewing

Maintainers review pull requests before merging. CI validates each manifest and blocks unsafe SVG markup. Untrusted PRs are **not allowed to run arbitrary build scripts** in a privileged deployment context.

By contributing you agree to publish your contribution under the repository's MIT license.
