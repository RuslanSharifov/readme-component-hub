"""Fast, offline test coverage for README-safe showcase generation."""
import importlib.util
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image

SCRIPT = Path(__file__).resolve().parent.parent / "scripts" / "render_showcase.py"
SPEC = importlib.util.spec_from_file_location("render_showcase", SCRIPT)
showcase = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(showcase)

class ShowcaseTests(unittest.TestCase):
    def test_svg_variants_are_standalone_and_safe(self):
        for kind in ("identity-card", "divider-pack"):
            for theme in ("dark", "light", "neon"):
                xml = showcase.static_svg(kind, theme)
                ET.fromstring(xml)
                self.assertNotIn("<script", xml)
                self.assertNotIn("javascript:", xml)
                self.assertNotIn("<foreignObject", xml)

    def test_data_states_are_truthful(self):
        now = datetime(2026, 11, 3, 12, 0, tzinfo=timezone.utc)
        repo = "RuslanSharifov/chrome-ui-gallery"
        data = {
            "repo": {"stargazers_count": 4, "forks_count": 1},
            "history": {repo: [{"date": "2026-11-03", "stars": 4}]},
            "release": None, "issues": [], "issues_capped": False,
            "commits": [], "commits_capped": False,
            "languages": {}, "runs": []
        }
        for renderer in ("github-stars-history", "github-ci", "github-heatmap",
                         "github-languages", "github-release", "github-progress"):
            xml = showcase.draw_repo_card({"renderer":renderer,"repository":repo},"dark",now,data)
            ET.fromstring(xml)
            self.assertIn(repo,xml)
            self.assertNotIn("<script",xml)
        self.assertIn("No historical growth is estimated",showcase.draw_repo_card(
            {"renderer":"github-stars-history","repository":repo},"dark",now,data))
        self.assertIn("NO PUBLISHED RELEASE",showcase.draw_repo_card(
            {"renderer":"github-release","repository":repo},"dark",now,data))
        self.assertIn("NO TRACKED ISSUES",showcase.draw_repo_card(
            {"renderer":"github-progress","repository":repo},"dark",now,data))

    def test_gifs_contain_multiple_frames(self):
        with tempfile.TemporaryDirectory() as folder:
            for renderer in ("typing-banner", "workflow-gif"):
                target = Path(folder) / (renderer + ".gif")
                showcase.animated_gif(renderer,"neon",target)
                with Image.open(target) as image:
                    self.assertGreater(image.n_frames,1)
                    self.assertEqual(image.format,"GIF")

    def test_compact_numbers(self):
        self.assertEqual(showcase.short(4),"4")
        self.assertEqual(showcase.short(12500),"12.5k")

if __name__ == "__main__":
    unittest.main()
