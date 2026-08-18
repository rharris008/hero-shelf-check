#!/usr/bin/env python3
"""
import_ww_stores.py
-------------------
Reads ww_stores.csv (Woolworths SUPERMARKETS division only) and
bulk-upserts into the Supabase `stores` table.

Usage:
  SUPABASE_URL=https://xxx.supabase.co \
  SUPABASE_ANON_KEY=eyJhb... \
  python3 scripts/import_ww_stores.py --csv store_db/out/ww_stores.csv

Requires: requests (pip install requests)
"""

import argparse
import csv
import json
import os
import sys
import time
import urllib.request

BATCH_SIZE = 200   # Supabase REST upsert handles up to 500 rows per call


def load_csv(path: str) -> list[dict]:
    """Load ww_stores.csv, filter to Woolworths Supermarkets only."""
    rows = []
    with open(path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            if row.get("division", "").upper() == "SUPERMARKETS":
                rows.append(row)
    return rows


def map_row(row: dict) -> dict:
    """Map CSV columns to Supabase stores table columns."""
    def safe_float(val):
        try:
            return float(val) if val else None
        except ValueError:
            return None

    return {
        "retailer":     "woolworths",
        "store_number": row["store_no"].strip(),
        "name":         row["store_name"].strip(),
        "address_line1": row.get("address_line", "").strip() or None,
        "suburb":       row.get("suburb", "").strip() or None,
        "state":        row.get("state", "").strip() or None,
        "postcode":     row.get("postcode", "").strip() or None,
        "latitude":     safe_float(row.get("latitude")),
        "longitude":    safe_float(row.get("longitude")),
        "is_active":    True,
    }


def upsert_batch(url: str, key: str, rows: list[dict]) -> dict:
    """POST a batch to Supabase REST API with upsert (on conflict store_number+retailer)."""
    endpoint = f"{url}/rest/v1/stores"
    data = json.dumps(rows).encode("utf-8")
    req = urllib.request.Request(
        endpoint,
        data=data,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return {"status": resp.status, "count": len(rows)}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        return {"status": e.code, "error": body, "count": 0}


def main():
    parser = argparse.ArgumentParser(description="Import WW stores into Supabase.")
    parser.add_argument("--csv", required=True, help="Path to ww_stores.csv")
    parser.add_argument("--dry-run", action="store_true", help="Print rows, do not upsert")
    args = parser.parse_args()

    supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")

    if not args.dry_run:
        if not supabase_url or not supabase_key:
            print("ERROR: Set SUPABASE_URL and SUPABASE_ANON_KEY (or VITE_ prefixed variants).", file=sys.stderr)
            sys.exit(1)

    raw = load_csv(args.csv)
    records = [map_row(r) for r in raw]

    print(f"Loaded {len(records)} Woolworths Supermarkets from {args.csv}")

    if args.dry_run:
        print("Dry-run — first 3 mapped rows:")
        for r in records[:3]:
            print(" ", json.dumps(r))
        return

    total_ok = 0
    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i : i + BATCH_SIZE]
        result = upsert_batch(supabase_url, supabase_key, batch)
        if result.get("error"):
            print(f"Batch {i//BATCH_SIZE + 1} FAILED (HTTP {result['status']}): {result['error']}", file=sys.stderr)
            sys.exit(1)
        total_ok += result["count"]
        print(f"  Batch {i//BATCH_SIZE + 1}: {result['count']} rows → HTTP {result['status']}")
        time.sleep(0.1)   # gentle rate-limit courtesy pause

    print(f"\nDone. {total_ok} rows upserted into stores table.")


if __name__ == "__main__":
    main()
