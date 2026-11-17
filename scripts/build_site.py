"""Assemble the GitHub Pages site from every static project.

Each project with project.json type "static" is copied from its publish
folder (default "public") into _site/<slug>/. A hub page lists them all.
Run: python3 scripts/build_site.py
"""
import html
import json
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "_site"


def main() -> None:
    if SITE.exists():
        shutil.rmtree(SITE)
    SITE.mkdir()
    cards = []
    for meta_file in sorted((ROOT / "projects").glob("*/project.json")):
        proj = meta_file.parent
        meta = json.loads(meta_file.read_text(encoding="utf-8"))
        slug = meta.get("slug", proj.name)
        kind = meta.get("type", "static")
        if kind != "static":
            link = meta.get("url") or f"https://github.com/bjb81/claude-projects/tree/main/projects/{slug}"
            label = {"python": "Python tool", "vercel": "Web app (Vercel)"}.get(kind, kind)
            cards.append(
                f'<li><a href="{html.escape(link)}"><strong>{html.escape(meta.get("name", slug))}</strong>'
                f'<span>{html.escape(label)}: {html.escape(meta.get("description", ""))}</span></a></li>'
            )
            print(f"listed {slug} ({kind})")
            continue
        pkg = proj / "package.json"
        if pkg.exists() and "build" in json.loads(pkg.read_text()).get("scripts", {}):
            subprocess.run(["npm", "run", "build"], cwd=proj, check=True)
        src = proj / meta.get("publish", "public")
        shutil.copytree(src, SITE / slug)
        cards.append(
            f'<li><a href="{html.escape(slug)}/"><strong>{html.escape(meta.get("name", slug))}</strong>'
            f'<span>{html.escape(meta.get("description", ""))}</span></a></li>'
        )
        print(f"added {slug}")

    (SITE / "index.html").write_text(HUB.replace("{{cards}}", "\n".join(cards) or "<li>No projects yet.</li>"), encoding="utf-8")
    (SITE / ".nojekyll").write_text("")


HUB = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Brad's projects</title>
<style>
body{font-family:system-ui,sans-serif;max-width:720px;margin:3rem auto;padding:0 1rem;color:#1d2433;background:#f6f4ef}
h1{font-size:1.8rem;margin-bottom:.25rem} p{color:#5b6372}
ul{list-style:none;padding:0;display:grid;gap:.75rem}
a{display:block;padding:1rem 1.25rem;background:#fff;border:1px solid #e3e0d8;border-radius:12px;text-decoration:none;color:inherit}
a:hover{border-color:#1d2433} strong{display:block;font-size:1.1rem} span{color:#5b6372}
</style></head><body>
<h1>Brad's projects</h1><p>Built, tested, and published by Claude.</p>
<ul>
{{cards}}
</ul></body></html>
"""

if __name__ == "__main__":
    main()
