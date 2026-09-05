#!/usr/bin/env python3
"""Favicon generator.

Writes each page's favicon.svg from the shapes below, then the raster
fallbacks (favicon.ico with 16 and 32 px entries, apple-touch-icon.png at
180 px) using the macOS tools qlmanage and sips. Run from the repo root:

    python3 tools/favicons.py

Every icon sits on the same dark rounded tile so the family reads as one
set in a tab bar regardless of the browser theme.
"""
import shutil
import struct
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TILE = '<rect width="64" height="64" rx="14" fill="#0e1118"/>'

ICONS = {
    # Home and projects: a planet with an orbit, the site's space theme in one
    # shape. The moon sits on the ring at its rotated apex.
    ".": (
        '<ellipse cx="32" cy="32" rx="24" ry="8" fill="none" stroke="#c4b5fd" stroke-width="3" transform="rotate(-24 32 32)"/>'
        '<circle cx="32" cy="32" r="11" fill="#a78bfa"/>'
        '<circle cx="53.9" cy="22.2" r="3.2" fill="#eef1f8"/>'
    ),
    # Element Lab: the brand dot from lab.css, glowing.
    "lab": (
        '<circle cx="32" cy="32" r="20" fill="#7fb0ff" fill-opacity="0.10"/>'
        '<circle cx="32" cy="32" r="14" fill="#7fb0ff" fill-opacity="0.22"/>'
        '<circle cx="32" cy="32" r="8" fill="#7fb0ff"/>'
    ),
}


def svg(body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">{TILE}{body}</svg>\n'


def ico(pngs):
    """Build a .ico from PNG-compressed entries: (size, bytes) pairs."""
    header = struct.pack("<HHH", 0, 1, len(pngs))
    offset = 6 + 16 * len(pngs)
    entries, data = b"", b""
    for size, blob in pngs:
        entries += struct.pack("<BBBBHHII", size % 256, size % 256, 0, 0, 1, 32, len(blob), offset + len(data))
        data += blob
    return header + entries + data


def raster(svg_path, outdir):
    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        subprocess.run(["qlmanage", "-t", "-s", "512", "-o", str(td), str(svg_path)], capture_output=True)
        big = td / (svg_path.name + ".png")
        if not big.exists():
            raise SystemExit(f"qlmanage did not render {svg_path}")
        sizes = {}
        for size in (180, 32, 16):
            out = td / f"{size}.png"
            subprocess.run(["sips", "-z", str(size), str(size), str(big), "--out", str(out)], check=True, capture_output=True)
            sizes[size] = out
        shutil.copy(sizes[180], outdir / "apple-touch-icon.png")
        (outdir / "favicon.ico").write_bytes(ico([(16, sizes[16].read_bytes()), (32, sizes[32].read_bytes())]))


if __name__ == "__main__":
    for rel, body in ICONS.items():
        outdir = ROOT / rel
        outdir.mkdir(exist_ok=True)
        svg_path = outdir / "favicon.svg"
        svg_path.write_text(svg(body))
        raster(svg_path, outdir)
        print(f"{rel + '/' if rel != '.' else '/'}: favicon.svg favicon.ico apple-touch-icon.png")
