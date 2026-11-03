<div align="center">

# README Component Hub

### Make your README remarkable.

A community-built collection of beautiful **GitHub README components**, including animated GIFs, SVG cards, badges, and dividers.

**Preview it. Customize it. Copy the Markdown.**

[**Explore the live gallery**](https://ruslansharifov.github.io/readme-component-hub/) · [Contribute a component](CONTRIBUTING.md) · [Browse the source](components/)

[![Validate components](https://github.com/RuslanSharifov/readme-component-hub/actions/workflows/validate.yml/badge.svg)](https://github.com/RuslanSharifov/readme-component-hub/actions/workflows/validate.yml)
[![Deploy GitHub Pages](https://github.com/RuslanSharifov/readme-component-hub/actions/workflows/deploy.yml/badge.svg)](https://github.com/RuslanSharifov/readme-component-hub/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-9bf2ba?style=flat-square)](LICENSE)

<img src="https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/generated/typing-intro/dark.gif" width="620" alt="Animated typing introduction example" />

</div>

---

## ✨ What is README Component Hub?

README Component Hub helps developers make their GitHub profiles and project documentation more expressive without setting up a backend or writing their own animations.

- **Real previews:** the gallery displays the actual SVG or GIF assets used in a README.
- **Ready-to-paste Markdown:** choose a component and copy its embed code.
- **Dark and light themes:** every component includes both variants.
- **Search and filters:** discover components by title, category, tag, or author.
- **Community contributions:** anyone can propose new components through a pull request.
- **GitHub-powered:** source, images, validation, and hosting all live on GitHub.

> [!TIP]
> Open the **[live gallery](https://ruslansharifov.github.io/readme-component-hub/)** to preview the animations, change themes and alignment, and copy the exact Markdown snippet.

## 📊 Dynamic GitHub repository card

The **Repository Stats Card** retrieves public data through GitHub Actions and publishes a standalone SVG image. It includes **stars, forks, open issues (GitHub's count also includes pull requests), latest push date and refresh time**.

<div align="center">
  <img src="https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/generated/repository-stats/dark.svg" width="680" alt="Dynamic GitHub repository statistics card" />
</div>

```md
![Repository Stats](https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/generated/repository-stats/dark.svg)
```

The card is updated by a **scheduled GitHub Action approximately once per hour** (GitHub may delay scheduled jobs). It does not refresh instantly when the number of stars changes. To track a different repository, create a new component manifest with `"renderer": "github-repo"` and `"repository": "OWNER/REPO"`, and open a PR. See [CONTRIBUTING.md](CONTRIBUTING.md).

> **Repository selection matters:** Every dynamic stats SVG is bound to a specific GitHub repository. It **cannot detect which README embeds it**. Pick the desired repository in the gallery selector; the generated Markdown will use that repository's own card. Data refreshes approximately hourly, not on every view.

### Chrome UI Gallery — dynamic stats

![Chrome UI Gallery Stats](https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/generated/chrome-ui-gallery-stats/dark.svg)

```md
![Chrome UI Gallery Stats](https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/generated/chrome-ui-gallery-stats/dark.svg)
```

## 🧱 New component collection and README Designer

**[Open README Designer](https://ruslansharifov.github.io/readme-component-hub/designer.html)** · [Browse all components](https://ruslansharifov.github.io/readme-component-hub/#explore)

The visual designer combines Markdown text, headings, bold/italic, links, dividers, lists, code blocks and reusable component cards. Add components by **clicking or dragging**, reorder them, build two- or three-column rows, then export an ordinary README.md.

| Component | Type | Preview |
|---|---|---|
| Star Growth Chart | Dynamic SVG | ![Star Growth](https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/generated/star-growth-chart/dark.svg) |
| CI/CD Status Card | Dynamic SVG | ![CI Status](https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/generated/ci-status-card/dark.svg) |
| Contribution Heatmap | Dynamic SVG | ![Activity](https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/generated/contribution-heatmap/dark.svg) |
| Tech Language Analytics | Dynamic SVG | ![Languages](https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/generated/language-analytics/dark.svg) |
| Latest Release Card | Dynamic SVG | ![Release](https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/generated/latest-release-card/dark.svg) |
| Project Progress Tracker | Dynamic SVG | ![Progress](https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/generated/project-progress-tracker/dark.svg) |
| Terminal Typing Banner | Animated GIF | ![Terminal](https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/generated/terminal-typing-banner/dark.gif) |
| Developer Identity Card | Static SVG | ![Developer card](https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/generated/developer-identity-card/dark.svg) |
| Premium Dividers Pack | Static SVG | ![Dividers](https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/generated/premium-dividers-pack/dark.svg) |
| Animated Workflow Diagram | Animated GIF | ![Workflow](https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/generated/animated-workflow-diagram/dark.gif) |

Every new component has **dark, light and neon** versions. The designer lets you choose **30%, 50%, 70%, 100% image widths**, **left/center/right alignment**, and approximate **0–40% left offsets**. It can arrange two or three components side by side using GitHub-safe HTML tables.

Example: two cards in one README row:

```html
<table width="100%">
  <tr>
    <td width="50%" align="center"><img src="https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/generated/star-growth-chart/dark.svg" width="100%" alt="Star Growth" /></td>
    <td width="50%" align="center"><img src="https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/generated/ci-status-card/neon.svg" width="100%" alt="CI Status" /></td>
  </tr>
</table>
```

### Important GitHub limitations

- GitHub README images are **not miniature web apps**. They cannot execute scripts or call arbitrary APIs. Dynamic charts are pre-rendered and updated by a scheduled GitHub Action, normally hourly, but scheduled runs and GitHub's image cache may delay visibility.
- Star-growth history begins with the first recorded snapshot. Earlier growth is **not invented**.
- The heatmap comes from repository commit history, and the progress card uses issue state rather than an imaginary project completion score.
- If there is no published release, the release card says so.
- Inline CSS in a README can be removed by GitHub. Image widths and table-based offsets are best-effort and may render/scroll differently on phones.
- The live editor is a GitHub-**style** preview, not GitHub's exact server renderer. It uses sanitized Markdown rendering.

## 🎬 Animated components

These are real, looping GIF files stored in this repository. The previews below are also usable in your own `README.md`.

| Typing Introduction | Orbit Loader |
|:---:|:---:|
| <img src="https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/generated/typing-intro/dark.gif" width="410" alt="Animated typing introduction" /> | <img src="https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/generated/orbit-loader/dark.gif" width="410" alt="Animated orbit loading dots" /> |
| An animated terminal-style greeting. [Source](components/typing-intro/) · [Light](generated/typing-intro/light.gif) | Smooth orbiting dots. [Source](components/orbit-loader/) · [Light](generated/orbit-loader/light.gif) |

| Neon Waveform | System Status |
|:---:|:---:|
| <img src="https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/generated/neon-wave/dark.gif" width="410" alt="Animated neon waveform" /> | <img src="https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/generated/pulse-status/dark.gif" width="410" alt="Animated status indicator" /> |
| A music-inspired waveform. [Source](components/neon-wave/) · [Light](generated/neon-wave/light.gif) | A pulsing operational status badge. [Source](components/pulse-status/) · [Light](generated/pulse-status/light.gif) |

## 🧩 SVG components

Lightweight, static SVG designs that work in GitHub README files.

| Minimal Divider | Tech Stack Pills |
|:---:|:---:|
| <img src="https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/components/minimal-divider/dark.svg" width="410" alt="Minimal decorative README divider" /> | <img src="https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/components/tech-pills/dark.svg" width="410" alt="Developer technology stack badges" /> |
| Separate README sections elegantly. [Source](components/minimal-divider/) · [Light](components/minimal-divider/light.svg) | Show a compact tech stack. [Source](components/tech-pills/) · [Light](components/tech-pills/light.svg) |

| Developer Quote | Terminal Card |
|:---:|:---:|
| <img src="https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/components/code-quote/dark.svg" width="410" alt="Developer quote card" /> | <img src="https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/components/terminal-card/dark.svg" width="410" alt="Developer terminal card" /> |
| A simple inspirational quote card. [Source](components/code-quote/) · [Light](components/code-quote/light.svg) | A developer-themed terminal panel. [Source](components/terminal-card/) · [Light](components/terminal-card/light.svg) |

## 🚀 Use a component in your README

**1.** Visit the [component gallery](https://ruslansharifov.github.io/readme-component-hub/).

**2.** Choose a component, then select **Dark / Light** and **Left / Center** alignment.

**3.** Click **Copy Markdown** and paste the result into any GitHub `README.md`.

For example, to display the animated **Neon Waveform**:

```md
![Neon Waveform](https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/generated/neon-wave/dark.gif)
```

For a centered component:

```html
<p align="center">
  <img src="https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/generated/neon-wave/dark.gif" alt="Neon Waveform" />
</p>
```

For the light theme, replace `dark.gif` with `light.gif`. SVG components use `dark.svg` and `light.svg` instead.

> [!IMPORTANT]
> **Use the `raw.githubusercontent.com` links generated by the gallery** in your README. The website runs on GitHub Pages, but the README-ready image files are stored directly in this repository.

## 🤝 Add your own component

This is an **open-source community gallery**. You can submit an original SVG or GIF component without installing a separate app or registering a new account beyond GitHub.

1. **Fork** this repository and create a branch.
2. Add a new directory under `components/your-component-name/`.
3. Include a `component.json` manifest, a `README.md`, and your component images (dark and light).
4. Follow the safety and file naming rules in [CONTRIBUTING.md](CONTRIBUTING.md).
5. Open a **pull request**. After review and merge, GitHub Actions rebuilds the gallery.

The component metadata looks like this:

```json
{
  "id": "minimal-divider",
  "title": "Minimal Divider",
  "description": "A precise, understated line to separate your README sections.",
  "category": "Dividers",
  "tags": ["line", "divider", "minimal"],
  "author": "RuslanSharifov",
  "format": "svg",
  "featured": true,
  "order": 5,
  "addedAt": "2026-11-03",
  "themes": {
    "dark": "components/minimal-divider/dark.svg",
    "light": "components/minimal-divider/light.svg"
  }
}
```

For animated GIF submissions, refer to [the contribution guide](CONTRIBUTING.md). The gallery accepts files and metadata through GitHub pull requests; it does **not** execute arbitrary scripts from contributors.

## 🛠️ How it works

| Part | Technology |
|---|---|
| Website | HTML, CSS, and vanilla JavaScript |
| Hosting | GitHub Pages |
| Component catalog | Per-component JSON manifests |
| Artwork | SVG + animated GIF + periodically updated repository stats SVG |
| Automated builds and checks | GitHub Actions |
| Community contributions | GitHub pull requests |
| Database / separate backend | Not required |

Dynamic GitHub stats cards are refreshed hourly by a scheduled workflow. The catalog is generated by `scripts/build_catalog.py`. The built-in animated examples are rendered by `scripts/render_gifs.py` and committed to `generated/` by the deployment workflow. Both themes are served as normal files, and the website uses the same images for its live previews.

### Run locally

Requirements: Python 3.10+ and Pillow for GIF rendering.

```bash
git clone https://github.com/RuslanSharifov/readme-component-hub.git
cd readme-component-hub
python3 -m pip install -r requirements-assets.txt
python3 scripts/build_catalog.py
python3 scripts/render_gifs.py
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000) in your browser. A separate JavaScript build tool is not needed.

### Deploy with GitHub Pages

Under **Settings → Pages → Build and deployment**, select **GitHub Actions**. The [deployment workflow](.github/workflows/deploy.yml) publishes the site whenever changes are pushed to `main`.

**Live website:** https://ruslansharifov.github.io/readme-component-hub/

---

<div align="center">

### Made for the GitHub developer community.

**[Explore components](https://ruslansharifov.github.io/readme-component-hub/)** · **[README Designer](https://ruslansharifov.github.io/readme-component-hub/designer.html)** · **[Contribute](CONTRIBUTING.md)** · **[Report an issue](https://github.com/RuslanSharifov/readme-component-hub/issues)**

Maintained by [@RuslanSharifov](https://github.com/RuslanSharifov) · Licensed under [MIT](LICENSE)

<img src="https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/components/minimal-divider/dark.svg" width="620" alt="Decorative footer divider" />

</div>
