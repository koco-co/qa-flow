#!/usr/bin/env python3
"""Scan all MD files and extract image references."""
import os
import re
import json

BASE_DIR = "/Users/poco/Documents/DTStack/WorkSpaces"
ZENTAO_DIR = os.path.join(BASE_DIR, "zentao-cases")

results = []

for root, dirs, files in os.walk(ZENTAO_DIR):
    # Skip non-MD processing for non-relevant dirs
    for fname in sorted(files):
        if not fname.endswith(".md"):
            continue
        fpath = os.path.join(root, fname)
        rel_fpath = os.path.relpath(fpath, BASE_DIR)

        with open(fpath, encoding="utf-8") as f:
            content = f.read()
            lines = content.split("\n")

        for i, line in enumerate(lines, 1):
            # Obsidian format: ![[filename]]
            obsidian_matches = re.findall(r"!\[\[([^\]]+)\]\]", line)
            for img in obsidian_matches:
                results.append(
                    {
                        "type": "OBSIDIAN",
                        "file": rel_fpath,
                        "line": i,
                        "src": img,
                        "alt": img,
                        "original": line.strip(),
                    }
                )

            # Standard markdown: ![alt](src)
            std_matches = re.findall(r"!\[([^\]]*)\]\(([^)]+)\)", line)
            for alt, src in std_matches:
                results.append(
                    {
                        "type": "STANDARD",
                        "file": rel_fpath,
                        "line": i,
                        "src": src,
                        "alt": alt,
                        "original": line.strip(),
                    }
                )

print(json.dumps(results, ensure_ascii=False, indent=2))
