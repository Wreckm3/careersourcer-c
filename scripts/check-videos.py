#!/usr/bin/env python3
"""Curriculum video gate.

Checks every `yt("<id>")` in src/data/curriculum/*.ts (or explicit ids passed as
arguments) for: (1) still available + embeddable, (2) within the 20-minute
maximum from docs/lesson-quality-checklist.md.

Usage:
    python3 scripts/check-videos.py            # audit the whole curriculum
    python3 scripts/check-videos.py ID [ID..]  # vet candidate replacements

Requires AGW_URL / AGW_TOKEN (Lovable agent gateway) for duration lookup.
Exit code 1 if any video fails the gate.
"""
import concurrent.futures
import glob
import os
import re
import sys

import requests

MAX_SECONDS = 20 * 60
AGW = os.environ.get("AGW_URL")
TOK = os.environ.get("AGW_TOKEN")


def iso_to_seconds(s: str) -> int:
    h = re.search(r"(\d+)H", s)
    m = re.search(r"(\d+)M", s)
    sec = re.search(r"(\d+)S", s)
    return (
        int(h.group(1) if h else 0) * 3600
        + int(m.group(1) if m else 0) * 60
        + int(sec.group(1) if sec else 0)
    )


def check(video_id: str):
    duration, title = -1, "UNKNOWN"
    if AGW and TOK:
        try:
            r = requests.post(
                f"{AGW}/f/website-fetch/v1/scrape",
                headers={"Authorization": f"Bearer {TOK}"},
                json={
                    "url": f"https://www.youtube.com/watch?v={video_id}",
                    "formats": ["html"],
                },
                timeout=90,
            ).json()
            md = (r.get("data") or {}).get("metadata") or {}
            if md.get("duration"):
                duration = iso_to_seconds(md["duration"])
                title = (md.get("title") or "")[:80]
        except Exception as exc:  # network / gateway hiccup
            title = f"ERR {exc}"[:60]

    embeddable = False
    try:
        embeddable = (
            requests.get(
                "https://www.youtube.com/oembed",
                params={
                    "url": f"https://www.youtube.com/watch?v={video_id}",
                    "format": "json",
                },
                timeout=30,
            ).status_code
            == 200
        )
    except Exception:
        pass

    return video_id, duration, embeddable, title


def collect_ids():
    ids = {}
    for path in sorted(glob.glob("src/data/curriculum/*.ts")):
        for m in re.finditer(r'yt\("([\w-]+)"\)', open(path).read()):
            ids.setdefault(m.group(1), set()).add(os.path.basename(path))
    return ids


def main() -> int:
    args = sys.argv[1:]
    sources = {i: {"(cli)"} for i in args} if args else collect_ids()
    if not sources:
        print("No video ids found.")
        return 0

    failures = 0
    with concurrent.futures.ThreadPoolExecutor(8) as ex:
        results = sorted(ex.map(check, sources), key=lambda r: -r[1])

    for vid, dur, embed, title in results:
        ok = embed and 0 < dur <= MAX_SECONDS
        failures += 0 if ok else 1
        mins = f"{dur // 60}:{dur % 60:02d}" if dur > 0 else "  ?"
        print(
            f"{'OK    ' if ok else 'REJECT'} {mins:>7}  embed={str(embed):<5} "
            f"{vid}  {sorted(sources[vid])[0]}  {title}"
        )

    print(f"\n{len(results) - failures}/{len(results)} pass the gate.")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
