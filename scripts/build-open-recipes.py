#!/usr/bin/env python3
"""Convert the open-recipes CSV to a JSON dataset for fast loading."""

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "data" / "open-recipes" / "full_dataset.csv"
OUTPUT_PATH = ROOT / "data" / "open-recipes" / "dataset.json"


def normalize_ingredient(entry: str) -> dict:
    return {"name": entry, "qty": 0, "unit": ""}


def parse_array(value: str) -> list:
    try:
        return json.loads(value)
    except Exception:
        return []


def build_dataset() -> None:
    if not CSV_PATH.exists():
        raise SystemExit(f"CSV file not found at {CSV_PATH}")

    rows = []
    with CSV_PATH.open("r", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for raw in reader:
            title = raw.get("title") or ""
            if not title:
                continue
            ingredients = [normalize_ingredient(entry) for entry in parse_array(raw.get("ingredients", "[]"))]
            if not ingredients:
                continue
            ner_tokens = [token.lower().strip() for token in parse_array(raw.get("NER", "[]")) if token]
            directions = parse_array(raw.get("directions", "[]"))
            rows.append(
                {
                    "title": title,
                    "ingredients": ingredients,
                    "directions": directions,
                    "ner_tokens": ner_tokens,
                    "link": raw.get("link") or None,
                    "source": raw.get("source") or None,
                }
            )

    OUTPUT_PATH.write_text(json.dumps(rows), encoding="utf-8")
    print(f"Wrote {len(rows)} recipes to {OUTPUT_PATH}")


if __name__ == "__main__":
    build_dataset()
