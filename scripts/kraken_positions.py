#!/usr/bin/env python3
"""Report positions and unrealized P/L for a Kraken account.

Stdlib only. Local-only tool: it reads API credentials from .dev.vars
(gitignored) and is never deployed.

    python3 scripts/kraken_positions.py balance
    python3 scripts/kraken_positions.py positions
    python3 scripts/kraken_positions.py positions --basis fifo
    python3 scripts/kraken_positions.py positions --json
    python3 scripts/kraken_positions.py margin

Kraken has no spot cost-basis endpoint. `positions` derives basis by replaying
every fill from TradesHistory, so it is only correct if the full history is
reachable: assets moved in by deposit or transfer have no buy fill and show a
zero basis, flagged in the output. `margin` reports Kraken's own OpenPositions,
which covers leveraged positions only and is empty for a spot-only account.

The API key needs three read permissions and nothing else: Query Funds,
Query Open Orders & Trades, Query Closed Orders & Trades.
"""

import argparse
import base64
import hashlib
import hmac
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict, deque
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

DEV_VARS = REPO / ".dev.vars"

API = "https://api.kraken.com"
UA = "itshagennothagen-kraken/1.0"

TRADES_PAGE = 50
RETRY_MAX = 5

# Kraken prefixes most asset codes: XXBT, ZUSD. A few newer listings are bare.
QUOTES = ("ZUSD", "USD", "ZEUR", "EUR", "USDT", "USDC", "XXBT", "XBT", "ETH")

DISPLAY = {
    "XXBT": "BTC",
    "XBT": "BTC",
    "XETH": "ETH",
    "XXRP": "XRP",
    "XLTC": "LTC",
    "XXLM": "XLM",
    "XXMR": "XMR",
    "XZEC": "ZEC",
    "XETC": "ETC",
    "XREP": "REP",
    "XMLN": "MLN",
    "ZUSD": "USD",
    "ZEUR": "EUR",
    "ZGBP": "GBP",
    "ZCAD": "CAD",
    "ZJPY": "JPY",
}


def die(msg):
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


# --- .dev.vars -------------------------------------------------------------


def read_dev_vars():
    if not DEV_VARS.exists():
        die(".dev.vars not found. Expected Kraken credentials there.")
    out = {}
    for line in DEV_VARS.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip().strip("'\"")
    return out


def credentials():
    env = read_dev_vars()
    key = env.get("KRAKEN_API_KEY")
    secret = env.get("KRAKEN_API_SECRET")
    if not key or not secret:
        die(
            "KRAKEN_API_KEY / KRAKEN_API_SECRET missing from .dev.vars.\n"
            "  Add them as:\n"
            "    KRAKEN_API_KEY=...\n"
            "    KRAKEN_API_SECRET=..."
        )
    try:
        base64.b64decode(secret)
    except Exception:
        die("KRAKEN_API_SECRET is not valid base64. Copy it again from Kraken.")
    return key, secret


# --- HTTP ------------------------------------------------------------------


def sign(path, data, secret):
    """API-Sign: HMAC-SHA512(path + SHA256(nonce + postdata)) over the secret."""
    post = urllib.parse.urlencode(data)
    encoded = (str(data["nonce"]) + post).encode()
    message = path.encode() + hashlib.sha256(encoded).digest()
    mac = hmac.new(base64.b64decode(secret), message, hashlib.sha512)
    return base64.b64encode(mac.digest()).decode()


def call(path, data=None, *, key=None, secret=None):
    """One Kraken API call, retrying rate limits and transient failures."""
    url = API + path
    private = path.startswith("/0/private/")
    delay = 1.0

    for attempt in range(RETRY_MAX):
        payload = dict(data or {})
        headers = {"User-Agent": UA}
        if private:
            # Nonce must strictly increase per key; microseconds gives headroom.
            payload["nonce"] = int(time.time() * 1_000_000)
            headers["API-Key"] = key
            headers["API-Sign"] = sign(path, payload, secret)

        body = urllib.parse.urlencode(payload).encode()
        headers["Content-Type"] = "application/x-www-form-urlencoded"
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                parsed = json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and attempt < RETRY_MAX - 1:
                time.sleep(delay)
                delay *= 2
                continue
            die(f"HTTP {e.code} from {path}: {e.read().decode()[:300]}")
        except urllib.error.URLError as e:
            if attempt < RETRY_MAX - 1:
                time.sleep(delay)
                delay *= 2
                continue
            die(f"network failure on {path}: {e.reason}")

        errors = parsed.get("error") or []
        if errors:
            joined = "; ".join(errors)
            if "Rate limit" in joined and attempt < RETRY_MAX - 1:
                time.sleep(delay)
                delay *= 2
                continue
            if "Invalid key" in joined or "Invalid signature" in joined:
                die(f"{joined}\n  Check the key and secret in .dev.vars.")
            if "Permission denied" in joined:
                die(
                    f"{joined}\n  The key lacks a needed read permission "
                    "(Query Funds / Query Closed Orders & Trades)."
                )
            die(joined)

        return parsed["result"]

    die(f"exhausted retries on {path}")


# --- asset and pair naming -------------------------------------------------


def label(asset):
    return DISPLAY.get(asset, asset)


def split_pair(pair, known_assets):
    """Split a Kraken pair code into (base, quote).

    Pair codes concatenate the two asset codes with no separator and no fixed
    width (XXBTZUSD, SOLUSD, ETHUSDT), so match the quote by suffix.
    """
    for quote in QUOTES:
        if pair.endswith(quote) and len(pair) > len(quote):
            base = pair[: -len(quote)]
            if base in known_assets or True:
                return base, quote
    return pair, ""


# --- data fetching ---------------------------------------------------------


def fetch_balance(key, secret):
    raw = call("/0/private/Balance", key=key, secret=secret)
    return {a: float(v) for a, v in raw.items() if float(v) != 0}


def fetch_trades(key, secret):
    """Every fill, oldest first. Paginates 50 at a time."""
    trades = []
    offset = 0
    while True:
        result = call(
            "/0/private/TradesHistory",
            {"trades": "false", "ofs": offset},
            key=key,
            secret=secret,
        )
        batch = result.get("trades", {})
        if not batch:
            break
        trades.extend(batch.values())
        offset += len(batch)
        if offset >= int(result.get("count", 0)):
            break
        time.sleep(0.5)  # private endpoints are tightly rate limited
    trades.sort(key=lambda t: float(t["time"]))
    return trades


def fetch_prices(pairs):
    if not pairs:
        return {}
    result = call("/0/public/Ticker", {"pair": ",".join(sorted(pairs))})
    # Ticker keys back in Kraken's canonical form, which may differ from the
    # requested alias, so index by the returned key.
    return {p: float(v["c"][0]) for p, v in result.items()}


# --- cost basis ------------------------------------------------------------


def basis_weighted_average(fills):
    """Weighted-average basis: one blended cost for the whole holding."""
    qty = 0.0
    cost = 0.0
    for f in fills:
        if f["type"] == "buy":
            qty += f["vol"]
            cost += f["vol"] * f["price"] + f["fee"]
        else:
            if qty <= 0:
                continue
            avg = cost / qty
            sold = min(f["vol"], qty)
            qty -= sold
            cost -= avg * sold
    return qty, cost


def basis_fifo(fills):
    """FIFO basis: sells consume the oldest lots first (US tax-lot order)."""
    lots = deque()
    for f in fills:
        if f["type"] == "buy":
            lots.append([f["vol"], f["price"] + (f["fee"] / f["vol"] if f["vol"] else 0)])
        else:
            remaining = f["vol"]
            while remaining > 1e-12 and lots:
                lot = lots[0]
                take = min(lot[0], remaining)
                lot[0] -= take
                remaining -= take
                if lot[0] <= 1e-12:
                    lots.popleft()
    qty = sum(l[0] for l in lots)
    cost = sum(l[0] * l[1] for l in lots)
    return qty, cost


# --- commands --------------------------------------------------------------


def cmd_balance(args):
    key, secret = credentials()
    balances = fetch_balance(key, secret)
    if not balances:
        print("No non-zero balances.")
        return
    width = max(len(label(a)) for a in balances)
    for asset in sorted(balances, key=label):
        print(f"{label(asset):<{width}}  {balances[asset]:>20,.8f}".rstrip("0").rstrip("."))


def cmd_margin(args):
    key, secret = credentials()
    result = call("/0/private/OpenPositions", {"docalcs": "true"}, key=key, secret=secret)
    if not result:
        print("No open margin positions. (A spot-only account always reports none.)")
        return
    for txid, p in result.items():
        pair = p["pair"]
        print(
            f"{pair:<12} {p['type']:<5} vol={float(p['vol']):.8f} "
            f"cost={float(p['cost']):,.2f} value={float(p.get('value', 0)):,.2f} "
            f"net={float(p.get('net', 0)):+,.2f}  [{txid}]"
        )


def cmd_positions(args):
    key, secret = credentials()

    balances = fetch_balance(key, secret)
    trades = fetch_trades(key, secret)

    # Group fills by base asset, keeping only fiat-quoted pairs. A crypto-quoted
    # fill (ETH/BTC) has a basis in BTC, not dollars, and blending the two would
    # silently produce a wrong number.
    by_asset = defaultdict(list)
    skipped_pairs = set()
    for t in trades:
        base, quote = split_pair(t["pair"], set(balances))
        if quote not in ("ZUSD", "USD"):
            skipped_pairs.add(t["pair"])
            continue
        by_asset[base].append(
            {
                "type": t["type"],
                "vol": float(t["vol"]),
                "price": float(t["price"]),
                "fee": float(t["fee"]),
                "time": float(t["time"]),
            }
        )

    compute = basis_fifo if args.basis == "fifo" else basis_weighted_average

    held = {a: v for a, v in balances.items() if label(a) not in ("USD", "EUR", "GBP", "CAD", "JPY")}
    wanted = {}
    for asset in held:
        canonical = asset if asset.startswith(("X", "Z")) else asset
        wanted[asset] = f"{canonical}ZUSD" if asset.startswith("X") else f"{asset}USD"

    prices_raw = fetch_prices(set(wanted.values()))

    def price_for(asset):
        want = wanted[asset]
        if want in prices_raw:
            return prices_raw[want]
        base_label = label(asset)
        for pair, px in prices_raw.items():
            if pair.startswith(asset) or pair.startswith(base_label):
                return px
        return None

    rows = []
    for asset, qty_held in sorted(held.items(), key=lambda kv: label(kv[0])):
        fills = by_asset.get(asset) or by_asset.get(label(asset)) or []
        qty_traded, cost = compute(fills)
        price = price_for(asset)

        # Trades reconstruct a quantity; the balance is the truth. They diverge
        # when coins were deposited, staked, earned, or bought before the
        # reachable history, so report against the balance and flag the gap.
        untracked = qty_held - qty_traded
        avg = (cost / qty_traded) if qty_traded > 1e-12 else None
        value = (price * qty_held) if price is not None else None
        pl = (value - cost) if (value is not None and qty_traded > 1e-12) else None
        pct = (pl / cost * 100) if (pl is not None and cost > 0) else None

        rows.append(
            {
                "asset": label(asset),
                "quantity": qty_held,
                "tracked_quantity": qty_traded,
                "untracked_quantity": untracked,
                "avg_cost": avg,
                "cost_basis": cost,
                "price": price,
                "value": value,
                "unrealized_pl": pl,
                "return_pct": pct,
            }
        )

    if args.json:
        print(json.dumps({"basis": args.basis, "positions": rows}, indent=2))
        return

    if not rows:
        print("No non-fiat holdings.")
        return

    header = (
        f"{'ASSET':<8}{'QUANTITY':>16}{'AVG COST':>14}{'PRICE':>14}"
        f"{'COST':>14}{'VALUE':>14}{'P/L':>14}{'RET':>9}"
    )
    print(f"cost basis: {args.basis}")
    print(header)
    print("-" * len(header))

    def fmt(v, spec):
        return format(v, spec) if v is not None else "-"

    total_cost = 0.0
    total_value = 0.0
    for r in rows:
        print(
            f"{r['asset']:<8}"
            f"{r['quantity']:>16,.8f}"
            f"{fmt(r['avg_cost'], ',.2f'):>14}"
            f"{fmt(r['price'], ',.2f'):>14}"
            f"{r['cost_basis']:>14,.2f}"
            f"{fmt(r['value'], ',.2f'):>14}"
            f"{fmt(r['unrealized_pl'], '+,.2f'):>14}"
            f"{(format(r['return_pct'], '+.1f') + '%') if r['return_pct'] is not None else '-':>9}"
        )
        total_cost += r["cost_basis"]
        if r["value"] is not None:
            total_value += r["value"]

    print("-" * len(header))
    total_pl = total_value - total_cost
    total_pct = (total_pl / total_cost * 100) if total_cost > 0 else 0.0
    print(
        f"{'TOTAL':<8}{'':>16}{'':>14}{'':>14}"
        f"{total_cost:>14,.2f}{total_value:>14,.2f}"
        f"{total_pl:>+14,.2f}{total_pct:>+8.1f}%"
    )

    cash = {label(a): v for a, v in balances.items() if label(a) in ("USD", "EUR", "GBP", "CAD", "JPY")}
    if cash:
        print()
        for c, v in sorted(cash.items()):
            print(f"cash: {c} {v:,.2f}")

    flagged = [r for r in rows if abs(r["untracked_quantity"]) > 1e-8]
    if flagged:
        print("\nnote: quantity held exceeds what trade history accounts for.")
        print("      These have an understated cost basis (deposit, staking reward,")
        print("      or a fill older than the reachable history):")
        for r in flagged:
            print(f"      {r['asset']}: {r['untracked_quantity']:+,.8f} untracked")

    if skipped_pairs:
        print(
            "\nnote: ignored non-USD-quoted fills (basis is not in dollars): "
            + ", ".join(sorted(skipped_pairs))
        )


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("balance", help="every non-zero balance")

    p = sub.add_parser("positions", help="spot positions with cost basis and P/L")
    p.add_argument(
        "--basis",
        choices=("average", "fifo"),
        default="average",
        help="cost basis method (default: average)",
    )
    p.add_argument("--json", action="store_true", help="emit JSON instead of a table")

    sub.add_parser("margin", help="Kraken's own open margin positions")

    args = parser.parse_args()
    {"balance": cmd_balance, "positions": cmd_positions, "margin": cmd_margin}[
        args.command
    ](args)


if __name__ == "__main__":
    main()
