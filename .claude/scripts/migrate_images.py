#!/usr/bin/env python3
"""
Image migration script for WorkSpaces repository.
1. Create images/ directory
2. Copy local images (resources/, media/) to images/ with conflict-avoiding names
3. Download external images (PicGo CDN, lanhuapp)
4. Update all MD files with standard Markdown references
5. Report failures
"""

import os
import re
import shutil
import sys
import json
import urllib.request
import urllib.parse

BASE_DIR = "/Users/poco/Documents/DTStack/WorkSpaces"
IMAGES_DIR = os.path.join(BASE_DIR, "images")
ZENTAO_DIR = os.path.join(BASE_DIR, "zentao-cases")

# Source directories for images
STORY322_RESOURCES = os.path.join(
    ZENTAO_DIR, "customItem-platform/信永中和/Requirement/Story-20260322/resources"
)
ASSETS_IMG_DIR = os.path.join(ZENTAO_DIR, "XMind/Assets/img")
STORY305_MEDIA = os.path.join(
    ZENTAO_DIR, "customItem-platform/信永中和/Requirement/Story-20260305/media"
)
STORY311_MEDIA = os.path.join(
    ZENTAO_DIR, "customItem-platform/信永中和/Requirement/Story-20260311/media"
)

failures = []  # List of (url, reason) for download failures


def ensure_images_dir():
    os.makedirs(IMAGES_DIR, exist_ok=True)
    print(f"[OK] images/ directory ready: {IMAGES_DIR}")


def find_obsidian_image(filename, md_file):
    """Find actual file path for Obsidian ![[filename]] reference."""
    # Check Story-20260322 resources (for Story-20260322 PRDs)
    p = os.path.join(STORY322_RESOURCES, filename)
    if os.path.exists(p):
        return p
    # Check XMind/Assets/img (for dtstack-platform Stories)
    p = os.path.join(ASSETS_IMG_DIR, filename)
    if os.path.exists(p):
        return p
    # Check other possible resource locations
    p = os.path.join(BASE_DIR, "images", "local", "zentao-cases", filename)
    if os.path.exists(p):
        return p
    return None


def get_story_prefix_from_path(src_path):
    """Extract story prefix from CustomItem/... path."""
    m = re.search(r"Story-(\d{8})", src_path)
    if m:
        return f"s{m.group(1)}-"
    return ""


def find_local_image(src_path, md_file_path):
    """
    Find actual file for a standard markdown reference.
    src_path can be:
    - CustomItem/信永中和/v0.2.1/Story-YYYYMMDD/media/imageN.png
    - imageN.png (bare name, in same story's media/)
    - any other relative path
    """
    # CustomItem/... path pattern
    if src_path.startswith("CustomItem/"):
        m = re.search(
            r"Story-(\d{8})/media/(image\d+\.(?:png|jpg|jpeg|gif|webp))", src_path, re.I
        )
        if m:
            story_date = m.group(1)
            img_name = m.group(2)
            media_dir = os.path.join(
                ZENTAO_DIR,
                f"customItem-platform/信永中和/Requirement/Story-{story_date}/media",
            )
            full_path = os.path.join(media_dir, img_name)
            if os.path.exists(full_path):
                return full_path, f"s{story_date}-{img_name}"
        return None, None

    # Bare imageN.png - infer story from MD file path
    if re.match(r"^image\d+\.(png|jpg|jpeg|gif|webp)$", src_path, re.I):
        md_dir = os.path.dirname(md_file_path)
        # Determine which story this MD is in
        story_m = re.search(r"Story-(\d{8})", md_dir)
        if story_m:
            story_date = story_m.group(1)
            media_dir = os.path.join(md_dir, "media")
            full_path = os.path.join(media_dir, src_path)
            if os.path.exists(full_path):
                return full_path, f"s{story_date}-{src_path}"
            # Also try md_dir directly
            full_path2 = os.path.join(md_dir, src_path)
            if os.path.exists(full_path2):
                return full_path2, f"s{story_date}-{src_path}"

    return None, None


def get_filename_from_url(url):
    """Extract a safe filename from a URL."""
    parsed = urllib.parse.urlparse(url)
    path = parsed.path
    filename = os.path.basename(path)
    # URL-decode the filename (handle single encoding)
    decoded = urllib.parse.unquote(filename)
    # If still has % signs (double encoded), decode again
    if "%" in decoded:
        decoded = urllib.parse.unquote(decoded)
    return decoded


def download_image(url, dest_dir):
    """Download image from URL to dest_dir. Returns (local_filename, success)."""
    filename = get_filename_from_url(url)
    if not filename or not any(
        filename.lower().endswith(ext)
        for ext in [".png", ".jpg", ".jpeg", ".gif", ".webp"]
    ):
        filename = "downloaded-" + url.split("/")[-1][:40] + ".png"

    dest_path = os.path.join(dest_dir, filename)

    # Skip if already downloaded
    if os.path.exists(dest_path):
        print(f"  [SKIP] Already exists: {filename}")
        return filename, True

    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
            },
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            data = response.read()

        with open(dest_path, "wb") as f:
            f.write(data)

        print(f"  [DL] {filename} ({len(data)//1024}KB)")
        return filename, True
    except Exception as e:
        print(f"  [FAIL] {url}: {e}")
        failures.append({"url": url, "error": str(e), "filename": filename})
        return filename, False


def copy_to_images(src_path, target_name):
    """Copy a local image to images/ directory."""
    dest = os.path.join(IMAGES_DIR, target_name)
    if not os.path.exists(dest):
        shutil.copy2(src_path, dest)
        print(f"  [CP] {os.path.basename(src_path)} -> images/{target_name}")
    else:
        print(f"  [SKIP] Already exists: images/{target_name}")
    return target_name


def process_md_file(md_file_full_path):
    """Process a single MD file: find all image references and build replacement map."""
    with open(md_file_full_path, encoding="utf-8") as f:
        content = f.read()

    replacements = []  # list of (old_text, new_text)
    failed_downloads = []

    # 1. Obsidian format: ![[filename]]
    for m in re.finditer(r"!\[\[([^\]]+)\]\]", content):
        original = m.group(0)
        filename = m.group(1).strip()

        # Get existing context to understand better alt text
        # For now use the filename (will be updated with AI analysis later)

        src_path = find_obsidian_image(filename, md_file_full_path)
        if src_path:
            target_name = copy_to_images(src_path, filename)
            new_ref = f"![{filename}](images/{target_name})"
            replacements.append((original, new_ref))
            print(f"    OBS: {filename} -> images/{target_name}")
        else:
            print(f"    [WARN] Obsidian image not found: {filename}")

    # 2. Standard markdown: ![alt](src)
    for m in re.finditer(r"!\[([^\]]*)\]\(([^)]+)\)", content):
        original = m.group(0)
        alt = m.group(1)
        src = m.group(2)

        # Skip if already pointing to images/
        if src.startswith("images/"):
            continue

        # External URL
        if src.startswith("http://") or src.startswith("https://"):
            filename, success = download_image(src, IMAGES_DIR)
            if success:
                new_ref = f"![{alt}](images/{filename})"
                replacements.append((original, new_ref))
                print(f"    URL: {src[-40:]} -> images/{filename}")
            else:
                # Keep original if download failed
                print(f"    [KEEP_URL] Download failed, keeping original: {src[-50:]}")
                failed_downloads.append(src)

        # Local relative path
        else:
            src_path, target_name = find_local_image(src, md_file_full_path)
            if src_path and target_name:
                copy_to_images(src_path, target_name)
                new_ref = f"![{alt}](images/{target_name})"
                replacements.append((original, new_ref))
                print(f"    LOCAL: {src} -> images/{target_name}")
            else:
                print(
                    f"    [WARN] Local image not found: {src} (in {os.path.basename(md_file_full_path)})"
                )

    return replacements, failed_downloads


def apply_replacements(md_file_full_path, replacements):
    """Apply all replacements to an MD file."""
    if not replacements:
        return

    with open(md_file_full_path, encoding="utf-8") as f:
        content = f.read()

    for old, new in replacements:
        if old in content:
            content = content.replace(old, new)
        else:
            print(f"  [WARN] Could not find in file: {repr(old[:60])}")

    with open(md_file_full_path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"  [SAVED] {os.path.relpath(md_file_full_path, BASE_DIR)}")


def write_failures():
    """Write download failures to images/IMPORT-FAILURES.md."""
    if not failures:
        return

    lines = ["# Image Import Failures\n\n"]
    lines.append(
        "The following external image URLs could not be downloaded and retain their original URLs:\n\n"
    )
    for f in failures:
        lines.append(f"- **{f['filename']}**: `{f['url']}`\n")
        lines.append(f"  - Error: {f['error']}\n")

    path = os.path.join(IMAGES_DIR, "IMPORT-FAILURES.md")
    with open(path, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print(f"\n[FAILURES] Written to images/IMPORT-FAILURES.md ({len(failures)} items)")


def main():
    print("=== Image Migration Script ===\n")

    ensure_images_dir()

    # Find all MD files with image references
    all_md_files = []
    for root, dirs, files in os.walk(ZENTAO_DIR):
        # Skip hidden dirs
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        for fname in sorted(files):
            if fname.endswith(".md"):
                all_md_files.append(os.path.join(root, fname))

    print(f"\n[INFO] Found {len(all_md_files)} MD files to process\n")

    all_replacements_count = 0

    for md_path in all_md_files:
        rel_path = os.path.relpath(md_path, BASE_DIR)
        print(f"\n>>> Processing: {rel_path}")

        replacements, failed = process_md_file(md_path)

        if replacements:
            apply_replacements(md_path, replacements)
            all_replacements_count += len(replacements)
        else:
            print("  (no image references)")

    write_failures()

    print(f"\n=== Migration Complete ===")
    print(f"Total replacements: {all_replacements_count}")
    print(f"Failed downloads: {len(failures)}")

    # List all images in images/
    img_files = [f for f in os.listdir(IMAGES_DIR) if not f.endswith(".md")]
    print(f"Images in images/: {len(img_files)}")


if __name__ == "__main__":
    main()
