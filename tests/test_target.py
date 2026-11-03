"""Mock GitHub API and verify target-specific cards are generated without real network."""
import importlib.util
import json
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from unittest.mock import patch

SCRIPT_DIR = Path(__file__).resolve().parent.parent / "scripts"
sys.path.insert(0,str(SCRIPT_DIR))
SPEC=importlib.util.spec_from_file_location("render_target",SCRIPT_DIR/"render_target.py")
target=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(target)

class RepositoryRendererTests(unittest.TestCase):
    def test_creates_card_collection_for_selected_repository(self):
        repo="TestOwner/MyProject"
        def get(path):
            if path == "/repos/"+repo:
                return {"stargazers_count":11,"forks_count":2,"open_issues_count":3,
                        "pushed_at":"2026-11-02T12:00:00Z"}
            if path.endswith("/actions/runs?per_page=15"):
                return {"workflow_runs":[{"conclusion":"success","name":"CI"}]}
            if path.endswith("/languages"):
                return {"Python":2300,"TypeScript":1700}
            if path.endswith("/releases/latest"):
                return None
            return []
        with tempfile.TemporaryDirectory() as temp:
            out=Path(temp)/".github"/"readme-component-hub"
            with patch.object(target,"api",side_effect=get), \
                 patch.object(target,"fetch_commits",return_value=([],False)), \
                 patch.object(target,"fetch_issues",return_value=([],False)):
                count=target.write(repo,out)
            self.assertEqual(count,24)
            for name in target.BUILTIN:
                for theme in target.THEMES:
                    svg=(out/name/(theme+".svg")).read_text()
                    ET.fromstring(svg)
                    self.assertIn(repo,svg)
                    self.assertNotIn("<script",svg)
            history=json.loads((out/"data"/"stars-history.json").read_text())
            self.assertEqual(history[repo][-1]["stars"],11)
    def test_rejects_unsafe_repository_path(self):
        with tempfile.TemporaryDirectory() as temp:
            with self.assertRaises(ValueError):
                target.write("Owner/../Other",Path(temp))

if __name__ == "__main__":
    unittest.main()
