#!/usr/bin/env python3
"""Sort Spotify liked songs into the playlists in src/data/playlists.json.

Stdlib only. Local-only tool: it uses a user OAuth token stored in .dev.vars
(gitignored) and is never deployed. The site's client-credentials integration
in functions/api/_spotify.ts is untouched by this.

    python3 scripts/spotify_library.py auth
    python3 scripts/spotify_library.py dump
    python3 scripts/spotify_library.py plan
    python3 scripts/spotify_library.py apply --dry-run
    python3 scripts/spotify_library.py apply
    python3 scripts/spotify_library.py undo docs/music/undo-<stamp>.json
    python3 scripts/spotify_library.py stats

One-time setup: add http://127.0.0.1:8888/callback as a redirect URI in the
Spotify app dashboard, then run `auth`.

`plan` assigns nothing on its own. It emits a plan file with every track set to
playlist=null for review; a human (or Claude reading the dump) fills in the
target. `apply` only acts on entries with a non-null playlist and a decision of
"approved", so an unreviewed plan is a no-op.
"""

import argparse
import base64
import http.server
import json
import os
import secrets
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

DEV_VARS = REPO / ".dev.vars"
PLAYLISTS = REPO / "src" / "data" / "playlists.json"
DUMP = REPO / "docs" / "music" / "liked-songs.json"
PLAN = REPO / "docs" / "music" / "sort-plan.json"
UNDO_DIR = REPO / "docs" / "music"

API = "https://api.spotify.com/v1"
TOKEN_URL = "https://accounts.spotify.com/api/token"
AUTH_URL = "https://accounts.spotify.com/authorize"

REDIRECT_URI = "http://127.0.0.1:8888/callback"
CALLBACK_PORT = 8888

# library-modify is only used when a plan row carries "unlike": true, which is
# set by hand. The rest is read plus playlist writes.
SCOPES = (
    "user-library-read user-library-modify "
    "playlist-read-private playlist-modify-private playlist-modify-public"
)

UA = "itshagennothagen-dev/1.0 (+https://itshagennothagen.dev)"

PAGE_LIMIT = 50
ADD_BATCH = 100
RETRY_MAX = 5
DESC_MAX = 300


# --- .dev.vars -------------------------------------------------------------


def read_dev_vars():
    if not DEV_VARS.exists():
        die(".dev.vars not found. Expected Spotify credentials there.")
    out = {}
    for line in DEV_VARS.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip().strip("'\"")
    return out


def write_dev_var(key, value):
    """Set or replace a single key, leaving every other line byte-identical."""
    lines = DEV_VARS.read_text().splitlines() if DEV_VARS.exists() else []
    replaced = False
    for i, line in enumerate(lines):
        if line.strip().startswith(f"{key}="):
            lines[i] = f"{key}={value}"
            replaced = True
            break
    if not replaced:
        lines.append(f"{key}={value}")
    # Atomic replace: a kill mid-write must not truncate the credentials file.
    tmp = DEV_VARS.with_suffix(".tmp")
    tmp.write_text("\n".join(lines) + "\n")
    tmp.chmod(0o600)
    os.replace(tmp, DEV_VARS)


def die(msg):
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


# --- HTTP ------------------------------------------------------------------


def http_json(url, *, method="GET", headers=None, data=None, form=None):
    body = None
    headers = dict(headers or {})
    headers.setdefault("User-Agent", UA)
    if form is not None:
        body = urllib.parse.urlencode(form).encode()
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    elif data is not None:
        body = json.dumps(data).encode()
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as res:
        raw = res.read()
    return json.loads(raw) if raw else {}


def api(token, path, *, method="GET", data=None, params=None):
    """Call the Spotify API, retrying on 429 and 5xx with the Retry-After hint."""
    if path.startswith("http"):
        # Pagination follows response-supplied `next` URLs through this
        # argument, and the Bearer token goes on every request; without the
        # pin, a hostile cursor walks the token off to another host.
        if not path.startswith(API + "/"):
            die(f"refusing to follow off-origin cursor: {path}")
        url = path
    else:
        url = f"{API}{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    headers = {"Authorization": f"Bearer {token}"}
    for attempt in range(RETRY_MAX):
        try:
            return http_json(url, method=method, headers=headers, data=data)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                # Retry-After may be an HTTP-date, and a hostile value could
                # park the run for years; clamp to something a human would sit
                # through.
                try:
                    wait = min(int(e.headers.get("Retry-After", "2")), 60) + 1
                except ValueError:
                    wait = 3
                print(f"  rate limited, waiting {wait}s", file=sys.stderr)
                time.sleep(wait)
                continue
            if e.code >= 500 and attempt < RETRY_MAX - 1:
                time.sleep(2**attempt)
                continue
            raise
    die(f"gave up after {RETRY_MAX} attempts: {url}")


# --- auth ------------------------------------------------------------------


def cmd_auth(args):
    env = read_dev_vars()
    cid = env.get("SPOTIFY_CLIENT_ID")
    secret = env.get("SPOTIFY_CLIENT_SECRET")
    if not cid or not secret:
        die("SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET missing from .dev.vars")

    state = secrets.token_urlsafe(16)
    received = {}
    done = threading.Event()

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            received.update({k: v[0] for k, v in q.items()})
            ok = received.get("state") == state and "code" in received
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(
                b"Authorized. Close this tab and return to the terminal."
                if ok
                else b"Authorization failed. Check the terminal."
            )
            done.set()

        def log_message(self, *a):
            pass

    server = http.server.HTTPServer(("127.0.0.1", CALLBACK_PORT), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()

    url = f"{AUTH_URL}?" + urllib.parse.urlencode(
        {
            "client_id": cid,
            "response_type": "code",
            "redirect_uri": REDIRECT_URI,
            "scope": SCOPES,
            "state": state,
            "show_dialog": "true",
        }
    )
    print("Opening Spotify consent page. If it does not open, visit:\n")
    print(url + "\n")
    webbrowser.open(url)

    if not done.wait(timeout=300):
        die("timed out waiting for the Spotify redirect")
    server.shutdown()

    if received.get("state") != state:
        die("state mismatch on the callback; aborted")
    if "code" not in received:
        die(f"no code returned: {received.get('error', 'unknown error')}")

    creds = base64.b64encode(f"{cid}:{secret}".encode()).decode()
    tok = http_json(
        TOKEN_URL,
        method="POST",
        headers={"Authorization": f"Basic {creds}"},
        form={
            "grant_type": "authorization_code",
            "code": received["code"],
            "redirect_uri": REDIRECT_URI,
        },
    )
    refresh = tok.get("refresh_token")
    if not refresh:
        die("no refresh_token in the token response")
    write_dev_var("SPOTIFY_REFRESH_TOKEN", refresh)
    me = api(tok["access_token"], "/me")
    print(f"authorized as {me.get('display_name') or me['id']}")
    print("refresh token written to .dev.vars")


def access_token():
    env = read_dev_vars()
    refresh = env.get("SPOTIFY_REFRESH_TOKEN")
    if not refresh:
        die("no SPOTIFY_REFRESH_TOKEN in .dev.vars. Run `auth` first.")
    creds = base64.b64encode(
        f"{env['SPOTIFY_CLIENT_ID']}:{env['SPOTIFY_CLIENT_SECRET']}".encode()
    ).decode()
    tok = http_json(
        TOKEN_URL,
        method="POST",
        headers={"Authorization": f"Basic {creds}"},
        form={"grant_type": "refresh_token", "refresh_token": refresh},
    )
    if "access_token" not in tok:
        die("refresh failed; re-run `auth`")
    # Spotify may hand back a rotated refresh token; losing it means re-auth.
    if tok.get("refresh_token"):
        write_dev_var("SPOTIFY_REFRESH_TOKEN", tok["refresh_token"])
    return tok["access_token"]


# --- dump ------------------------------------------------------------------


def cmd_dump(args):
    token = access_token()
    tracks = []
    url = "/me/tracks"
    params = {"limit": PAGE_LIMIT, "market": "from_token"}
    while url:
        page = api(token, url, params=params)
        params = None
        for item in page.get("items", []):
            t = item.get("track") or {}
            if not t.get("id"):
                continue  # local files have no id and cannot be added remotely
            tracks.append(
                {
                    "id": t["id"],
                    "uri": t.get("uri"),
                    "name": t.get("name"),
                    "artists": [a["name"] for a in t.get("artists", [])],
                    "artist_ids": [a["id"] for a in t.get("artists", []) if a.get("id")],
                    "album": (t.get("album") or {}).get("name"),
                    "release": (t.get("album") or {}).get("release_date"),
                    "duration_ms": t.get("duration_ms"),
                    "popularity": t.get("popularity"),
                    "added_at": item.get("added_at"),
                    "url": (t.get("external_urls") or {}).get("spotify"),
                }
            )
        url = page.get("next")
        print(f"  fetched {len(tracks)}", file=sys.stderr)

    genres = fetch_artist_genres(token, tracks)
    for t in tracks:
        seen = []
        for aid in t["artist_ids"]:
            for g in genres.get(aid, []):
                if g not in seen:
                    seen.append(g)
        t["genres"] = seen

    DUMP.parent.mkdir(parents=True, exist_ok=True)
    DUMP.write_text(json.dumps(tracks, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {len(tracks)} tracks to {DUMP.relative_to(REPO)}")


def fetch_artist_genres(token, tracks):
    ids = []
    for t in tracks:
        for aid in t["artist_ids"]:
            if aid not in ids:
                ids.append(aid)
    out = {}
    for i in range(0, len(ids), PAGE_LIMIT):
        chunk = ids[i : i + PAGE_LIMIT]
        res = api(token, "/artists", params={"ids": ",".join(chunk)})
        for a in res.get("artists") or []:
            if a:
                out[a["id"]] = a.get("genres", [])
        print(f"  artists {min(i + PAGE_LIMIT, len(ids))}/{len(ids)}", file=sys.stderr)
    return out


# --- plan ------------------------------------------------------------------


def playlist_track_ids(token, pid):
    ids, url = set(), f"/playlists/{pid}/tracks"
    params = {"limit": 100, "fields": "next,items(track(id))"}
    while url:
        page = api(token, url, params=params)
        params = None
        for it in page.get("items", []):
            t = it.get("track") or {}
            if t.get("id"):
                ids.add(t["id"])
        url = page.get("next")
    return ids


def load_playlists():
    entries = json.loads(PLAYLISTS.read_text())
    for e in entries:
        e["id"] = e["url"].rstrip("/").split("/")[-1].split("?")[0]
    return entries


def cmd_plan(args):
    if not DUMP.exists():
        die(f"{DUMP.relative_to(REPO)} not found. Run `dump` first.")
    tracks = json.loads(DUMP.read_text())
    playlists = load_playlists()

    existing = {}
    if PLAN.exists():
        for row in json.loads(PLAN.read_text()).get("tracks", []):
            existing[row["id"]] = row

    rows = []
    for t in tracks:
        prev = existing.get(t["id"])
        if prev:
            rows.append(prev)  # never clobber a reviewed decision on re-run
            continue
        rows.append(
            {
                "id": t["id"],
                "uri": t["uri"],
                "name": t["name"],
                "artists": t["artists"],
                "genres": t.get("genres", []),
                "url": t.get("url"),
                "playlist": None,
                "confidence": None,
                "reason": None,
                "decision": "pending",
                "unlike": False,
            }
        )

    plan = {
        "playlists": [
            {"id": p["id"], "tags": p["tags"], "notes": p["notes"], "url": p["url"]}
            for p in playlists
        ],
        "tracks": rows,
    }
    PLAN.write_text(json.dumps(plan, indent=2, ensure_ascii=False) + "\n")
    pending = sum(1 for r in rows if r["decision"] == "pending")
    print(f"wrote {len(rows)} tracks to {PLAN.relative_to(REPO)} ({pending} pending)")
    print('Fill in "playlist" and set "decision" to "approved" to act on a track.')


# --- apply -----------------------------------------------------------------


def cmd_apply(args):
    if not PLAN.exists():
        die(f"{PLAN.relative_to(REPO)} not found. Run `plan` first.")
    plan = json.loads(PLAN.read_text())
    valid = {p["id"] for p in plan["playlists"]}

    approved = [
        r
        for r in plan["tracks"]
        if r.get("decision") == "approved" and r.get("playlist")
    ]
    if not approved:
        print("nothing approved; no changes")
        return

    unknown = {r["playlist"] for r in approved if r["playlist"] not in valid}
    if unknown:
        die(f"plan references playlists not in playlists.json: {sorted(unknown)}")

    by_playlist = {}
    for r in approved:
        by_playlist.setdefault(r["playlist"], []).append(r)

    # Spotify happily adds a track that is already in the playlist, so skip
    # against live contents rather than trusting the plan to be current.
    token = access_token()
    skipped = 0
    for pid, rows in list(by_playlist.items()):
        have = playlist_track_ids(token, pid)
        keep = [r for r in rows if r["id"] not in have]
        skipped += len(rows) - len(keep)
        if keep:
            by_playlist[pid] = keep
        else:
            del by_playlist[pid]
    if skipped:
        print(f"skipping {skipped} tracks already in their target playlist")
    if not by_playlist:
        print("nothing left to add")
        return

    for pid, rows in by_playlist.items():
        print(f"{pid}: +{len(rows)} tracks")
        for r in rows[:5]:
            print(f"    {r['name']} - {', '.join(r['artists'])}")
        if len(rows) > 5:
            print(f"    ... and {len(rows) - 5} more")
    unlikes = [r for rows in by_playlist.values() for r in rows if r.get("unlike")]
    if unlikes:
        print(f"unlike: {len(unlikes)} tracks")

    if args.dry_run:
        print("\ndry run; nothing sent")
        return

    stamp = time.strftime("%Y%m%dT%H%M%S")
    undo = {"stamp": stamp, "added": {}, "unliked": []}
    undo_path = UNDO_DIR / f"undo-{stamp}.json"

    def save_undo():
        tmp = undo_path.with_suffix(".tmp")
        tmp.write_text(json.dumps(undo, indent=2, ensure_ascii=False) + "\n")
        os.replace(tmp, undo_path)

    try:
        for pid, rows in by_playlist.items():
            uris = [r["uri"] for r in rows if r.get("uri")]
            for i in range(0, len(uris), ADD_BATCH):
                chunk = uris[i : i + ADD_BATCH]
                api(token, f"/playlists/{pid}/tracks", method="POST", data={"uris": chunk})
                undo["added"].setdefault(pid, []).extend(chunk)
                save_undo()
                print(f"  {pid}: added {len(chunk)}")

        # Only unlike what is verifiably in the playlist now. Unliking a track
        # whose add silently failed would lose it from the library entirely.
        landed = set()
        for pid in by_playlist:
            landed |= playlist_track_ids(token, pid)
        ids = [r["id"] for r in unlikes if r["id"] in landed]
        if len(ids) != len(unlikes):
            print(f"  not unliking {len(unlikes) - len(ids)} tracks whose add is unconfirmed")
        for i in range(0, len(ids), PAGE_LIMIT):
            chunk = ids[i : i + PAGE_LIMIT]
            api(token, "/me/tracks", method="DELETE", data={"ids": chunk})
            undo["unliked"].extend(chunk)
            save_undo()
            print(f"  unliked {len(chunk)}")
    finally:
        save_undo()

    for r in approved:
        r["decision"] = "applied"
    PLAN.write_text(json.dumps(plan, indent=2, ensure_ascii=False) + "\n")
    print(f"\nundo log: {undo_path.relative_to(REPO)}")


def cmd_undo(args):
    log = json.loads(Path(args.file).read_text())
    token = access_token()
    for pid, uris in log.get("added", {}).items():
        for i in range(0, len(uris), ADD_BATCH):
            chunk = [{"uri": u} for u in uris[i : i + ADD_BATCH]]
            api(token, f"/playlists/{pid}/tracks", method="DELETE",
                data={"tracks": chunk})
            print(f"  {pid}: removed {len(chunk)}")
    ids = log.get("unliked", [])
    for i in range(0, len(ids), PAGE_LIMIT):
        chunk = ids[i : i + PAGE_LIMIT]
        api(token, "/me/tracks", method="PUT", data={"ids": chunk})
        print(f"  re-liked {len(chunk)}")
    print("undo complete")


# --- stats -----------------------------------------------------------------


def cmd_describe(args):
    """Write playlist descriptions from a {playlist_id: text} JSON file."""
    new = json.loads(Path(args.file).read_text())
    playlists = {p["id"]: p for p in load_playlists()}
    unknown = [k for k in new if k not in playlists]
    if unknown:
        die(f"ids not in playlists.json: {unknown}")
    too_long = {k: len(v) for k, v in new.items() if len(v) > DESC_MAX}
    if too_long:
        die(f"over {DESC_MAX} chars: {too_long}")

    token = access_token()
    changed = []
    for pid, text in new.items():
        cur = api(token, f"/playlists/{pid}", params={"fields": "name,description"})
        if (cur.get("description") or "").strip() == text.strip():
            print(f"  {cur.get('name')}: unchanged")
            continue
        changed.append((pid, cur.get("name"), cur.get("description") or "", text))

    if not changed:
        print("nothing to change")
        return
    if args.dry_run:
        for _, name, old, text in changed:
            print(f"\n{name}\n  - {old or '(empty)'}\n  + {text}")
        print(f"\ndry run; {len(changed)} would change")
        return

    stamp = time.strftime("%Y%m%dT%H%M%S")
    backup = UNDO_DIR / f"descriptions-before-{stamp}.json"
    backup.write_text(
        json.dumps({pid: old for pid, _, old, _ in changed}, indent=2,
                   ensure_ascii=False) + "\n"
    )
    for pid, name, _, text in changed:
        api(token, f"/playlists/{pid}", method="PUT", data={"description": text})
        print(f"  {name}: updated")
    print(f"\nprevious descriptions saved to {backup.relative_to(REPO)}")


def cmd_stats(args):
    if DUMP.exists():
        tracks = json.loads(DUMP.read_text())
        print(f"liked songs: {len(tracks)}")
        genres = {}
        for t in tracks:
            for g in t.get("genres", []):
                genres[g] = genres.get(g, 0) + 1
        top = sorted(genres.items(), key=lambda kv: -kv[1])[:20]
        print(f"distinct artist genres: {len(genres)}")
        for g, n in top:
            print(f"  {n:5d}  {g}")
        no_genre = sum(1 for t in tracks if not t.get("genres"))
        print(f"tracks with no artist genre: {no_genre}")
    else:
        print("no dump yet")

    if PLAN.exists():
        plan = json.loads(PLAN.read_text())
        counts = {}
        for r in plan["tracks"]:
            counts[r.get("decision", "pending")] = (
                counts.get(r.get("decision", "pending"), 0) + 1
            )
        print("\nplan decisions:")
        for k, v in sorted(counts.items()):
            print(f"  {v:5d}  {k}")


def main():
    p = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = p.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("auth", help="one-time browser OAuth, writes refresh token")
    a.set_defaults(func=cmd_auth)
    d = sub.add_parser("dump", help="fetch all liked songs plus artist genres")
    d.set_defaults(func=cmd_dump)
    pl = sub.add_parser("plan", help="build/refresh the review file")
    pl.set_defaults(func=cmd_plan)
    ap = sub.add_parser("apply", help="add approved tracks to their playlists")
    ap.add_argument("--dry-run", action="store_true")
    ap.set_defaults(func=cmd_apply)
    u = sub.add_parser("undo", help="reverse an apply run from its undo log")
    u.add_argument("file")
    u.set_defaults(func=cmd_undo)
    de = sub.add_parser("describe", help="write playlist descriptions from a JSON file")
    de.add_argument("file", help='JSON {playlist_id: "description"}')
    de.add_argument("--dry-run", action="store_true")
    de.set_defaults(func=cmd_describe)
    s = sub.add_parser("stats", help="summarize the dump and plan")
    s.set_defaults(func=cmd_stats)
    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
