#!/usr/bin/env python3
import ssl
import sys
import json
import time
import urllib.request
import urllib.parse
from html.parser import HTMLParser
from pathlib import Path

BASE_PUBLIC = "https://app.govoexpress.com"
BASE_LOCAL = "http://127.0.0.1:8090"

START_PATHS = [
    "/app",
    "/shops",
    "/services",
    "/order",
    "/service-request",
    "/merchant",
    "/rider",
    "/support",
    "/track",
    "/admin/login",
]

IMPORTANT_TEXT = {
    "/app": ["GOVO Express", "Customer Flow", "Delivery, shops, services", "Menu serial-wise"],
    "/shops": ["Shop Button Menu", "Grocery / Bazar", "Medicine", "Add Your Shop"],
    "/services": ["Service Button Menu", "Electrician", "Plumber", "Request Service"],
    "/order": ["Delivery বুক করুন", "Submit Delivery Request"],
    "/service-request": ["সার্ভিস request করুন", "Submit Service Request"],
    "/merchant": ["Merchant Partner", "Submit Merchant Info"],
    "/rider": ["Rider Partner", "Submit Rider Info"],
    "/support": ["Need Help?", "Delivery Help"],
}

ctx = ssl._create_unverified_context()

class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.forms = []
        self.assets = []
        self.buttons = []
        self.current_a = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "a":
            href = attrs.get("href", "").strip()
            self.current_a = {"href": href, "text": ""}
            if href:
                self.links.append(self.current_a)
        elif tag == "form":
            action = attrs.get("action", "").strip()
            method = attrs.get("method", "GET").upper()
            self.forms.append({"action": action, "method": method})
        elif tag in ("script", "img", "link"):
            src = attrs.get("src") or attrs.get("href") or ""
            if src:
                self.assets.append({"tag": tag, "src": src})
        elif tag == "button":
            self.buttons.append({"type": attrs.get("type", ""), "text": ""})

    def handle_data(self, data):
        if self.current_a is not None:
            self.current_a["text"] += data.strip() + " "
        if self.buttons:
            self.buttons[-1]["text"] += data.strip() + " "

    def handle_endtag(self, tag):
        if tag == "a":
            self.current_a = None

def fetch(url, method="GET", timeout=12):
    req = urllib.request.Request(url, method=method, headers={
        "User-Agent": "GOVO-QA-Scanner/11",
        "Accept-Encoding": "identity",
    })
    started = time.time()
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=timeout) as r:
            body = r.read().decode("utf-8", errors="replace")
            return {
                "ok": True,
                "status": r.status,
                "time": round(time.time() - started, 4),
                "headers": dict(r.headers),
                "body": body,
            }
    except Exception as e:
        return {
            "ok": False,
            "status": "ERR",
            "time": round(time.time() - started, 4),
            "error": str(e),
            "headers": {},
            "body": "",
        }

def normalize_internal_url(base, raw):
    if not raw:
        return None
    raw = raw.strip()
    if raw.startswith("#") or raw.startswith("javascript:") or raw.startswith("mailto:") or raw.startswith("tel:"):
        return None

    full = urllib.parse.urljoin(base, raw)
    parsed = urllib.parse.urlparse(full)

    allowed_hosts = {"app.govoexpress.com", "govoexpress.com", "merchant.govoexpress.com", "rider.govoexpress.com", "admin.govoexpress.com", "127.0.0.1"}
    if parsed.hostname not in allowed_hosts:
        return None

    return urllib.parse.urlunparse((parsed.scheme, parsed.netloc, parsed.path or "/", "", parsed.query, ""))

def public_to_local(url):
    p = urllib.parse.urlparse(url)
    path = p.path or "/"
    if p.query:
        path += "?" + p.query
    return BASE_LOCAL + path

def scan_base(base_name, base_url):
    results = {
        "base": base_name,
        "base_url": base_url,
        "pages": [],
        "links_checked": [],
        "forms": [],
        "assets": [],
        "failures": [],
    }

    discovered = set(START_PATHS)

    for path in START_PATHS:
        url = base_url + path
        r = fetch(url)
        page = {
            "path": path,
            "url": url,
            "status": r["status"],
            "time": r["time"],
            "x_govo_rescue_shell": r["headers"].get("X-GOVO-Rescue-Shell") or r["headers"].get("x-govo-rescue-shell"),
            "x_govo_perf": r["headers"].get("X-GOVO-Perf") or r["headers"].get("x-govo-perf"),
            "x_govo_cache": r["headers"].get("X-GOVO-Cache") or r["headers"].get("x-govo-cache"),
            "content_type": r["headers"].get("Content-Type") or r["headers"].get("content-type"),
            "important_text_missing": [],
            "link_count": 0,
            "form_count": 0,
        }

        if r["status"] != 200:
            results["failures"].append(f"PAGE_FAIL {path} status={r['status']} error={r.get('error','')}")
        else:
            for text in IMPORTANT_TEXT.get(path, []):
                if text not in r["body"]:
                    page["important_text_missing"].append(text)
                    results["failures"].append(f"TEXT_MISSING {path}: {text}")

            parser = LinkParser()
            parser.feed(r["body"])
            page["link_count"] = len(parser.links)
            page["form_count"] = len(parser.forms)

            for link in parser.links:
                norm = normalize_internal_url(base_url, link.get("href", ""))
                if norm:
                    discovered.add(urllib.parse.urlparse(norm).path or "/")
                    results["links_checked"].append({
                        "source": path,
                        "text": (link.get("text") or "").strip(),
                        "href": link.get("href"),
                        "url": norm,
                    })

            for form in parser.forms:
                norm = normalize_internal_url(base_url, form.get("action", ""))
                results["forms"].append({
                    "source": path,
                    "method": form.get("method"),
                    "action": form.get("action"),
                    "url": norm,
                })

            for asset in parser.assets:
                norm = normalize_internal_url(base_url, asset.get("src", ""))
                if norm:
                    results["assets"].append({
                        "source": path,
                        "tag": asset.get("tag"),
                        "src": asset.get("src"),
                        "url": norm,
                    })

        results["pages"].append(page)

    # Check unique internal href targets by GET only.
    unique_urls = {}
    for item in results["links_checked"]:
        url = item["url"]
        unique_urls[url] = item

    for url, item in sorted(unique_urls.items()):
        check_url = url
        if base_name == "public":
            r = fetch(check_url)
        else:
            r = fetch(check_url)

        item["status"] = r["status"]
        item["time"] = r["time"]

        if isinstance(r["status"], int) and r["status"] >= 400:
            results["failures"].append(f"LINK_FAIL from {item['source']} href={item['href']} status={r['status']} url={url}")
        elif r["status"] == "ERR":
            results["failures"].append(f"LINK_ERR from {item['source']} href={item['href']} error={r.get('error','')} url={url}")

    return results

def write_markdown(report, outdir):
    md = []
    md.append(f"# GOVO UI QA Report — {report['base']}")
    md.append("")
    md.append(f"Base URL: `{report['base_url']}`")
    md.append("")
    md.append("## Page Status")
    md.append("")
    md.append("| Path | HTTP | Time | Shell | Perf | Cache | Missing Text | Links | Forms |")
    md.append("|---|---:|---:|---|---|---|---|---:|---:|")
    for p in report["pages"]:
        missing = ", ".join(p["important_text_missing"]) if p["important_text_missing"] else "OK"
        md.append(f"| `{p['path']}` | {p['status']} | {p['time']}s | {p.get('x_govo_rescue_shell') or ''} | {p.get('x_govo_perf') or ''} | {p.get('x_govo_cache') or ''} | {missing} | {p['link_count']} | {p['form_count']} |")

    md.append("")
    md.append("## Internal Links Checked")
    md.append("")
    md.append("| Source | Text | Href | HTTP | Time |")
    md.append("|---|---|---|---:|---:|")
    for l in report["links_checked"]:
        if "status" in l:
            text = (l.get("text") or "").replace("|", "/")[:60]
            href = (l.get("href") or "").replace("|", "/")
            md.append(f"| `{l['source']}` | {text} | `{href}` | {l['status']} | {l.get('time','')}s |")

    md.append("")
    md.append("## Forms Found")
    md.append("")
    md.append("| Source | Method | Action | URL |")
    md.append("|---|---|---|---|")
    for f in report["forms"]:
        md.append(f"| `{f['source']}` | {f.get('method')} | `{f.get('action')}` | `{f.get('url')}` |")

    md.append("")
    md.append("## Failures")
    md.append("")
    if report["failures"]:
        for f in report["failures"]:
            md.append(f"- ❌ {f}")
    else:
        md.append("- ✅ No 404/500/link/text failures found.")

    (outdir / f"{report['base']}_qa_report.md").write_text("\n".join(md), encoding="utf-8")

def main():
    outdir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
    outdir.mkdir(parents=True, exist_ok=True)

    reports = [
        scan_base("local_8090", BASE_LOCAL),
        scan_base("public_https", BASE_PUBLIC),
    ]

    all_failures = []
    for rep in reports:
        (outdir / f"{rep['base']}_qa_report.json").write_text(json.dumps(rep, indent=2, ensure_ascii=False), encoding="utf-8")
        write_markdown(rep, outdir)
        all_failures.extend([f"{rep['base']}: {x}" for x in rep["failures"]])

    print("")
    print("===== GOVO UI QA SUMMARY =====")
    for rep in reports:
        bad_pages = [p for p in rep["pages"] if p["status"] != 200 or p["important_text_missing"]]
        bad_links = [l for l in rep["links_checked"] if l.get("status") not in (None, 200, 301, 302)]
        print(f"{rep['base']}: pages={len(rep['pages'])}, links={len(rep['links_checked'])}, forms={len(rep['forms'])}, failures={len(rep['failures'])}")
        print(f"  bad_pages={len(bad_pages)} bad_links={len(bad_links)}")

    print("")
    if all_failures:
        print("❌ FAILURES FOUND:")
        for f in all_failures:
            print(" -", f)
        sys.exit(2)
    else:
        print("✅ PASS: No broken internal links, no 404/500, important UI text found.")
        sys.exit(0)

if __name__ == "__main__":
    main()
