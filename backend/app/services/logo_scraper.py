import re
import httpx
from urllib.parse import urljoin

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; SippingRover/1.0)"}

SOCIAL_DOMAINS = {"instagram.com", "facebook.com", "tiktok.com", "yelp.com", "twitter.com", "x.com", "linktr.ee"}


def _is_social(website: str) -> bool:
    try:
        from urllib.parse import urlparse
        host = urlparse(website).hostname or ""
        return any(host == d or host.endswith("." + d) for d in SOCIAL_DOMAINS)
    except Exception:
        return False


def _to_absolute(base: str, url: str) -> str:
    return urljoin(base, url)


async def fetch_logo_url(website: str) -> str | None:
    if not website or _is_social(website):
        return None

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=6.0, headers=HEADERS) as client:
            resp = await client.get(website)
            resp.raise_for_status()
            html = resp.text
    except Exception:
        return None

    base = website.rstrip("/")

    # 1. apple-touch-icon — usually 180×180, clean logo
    for pattern in [
        r'<link[^>]+rel=["\']apple-touch-icon(?:-precomposed)?["\'][^>]+href=["\']([^"\']+)["\']',
        r'<link[^>]+href=["\']([^"\']+)["\'][^>]+rel=["\']apple-touch-icon(?:-precomposed)?["\']',
    ]:
        m = re.search(pattern, html, re.I)
        if m:
            return _to_absolute(base, m.group(1))

    # 3. <img> with "logo" in src path or alt text
    for m in re.finditer(r'<img[^>]+>', html, re.I):
        tag = m.group(0)
        src_m = re.search(r'\bsrc=["\']([^"\']+)["\']', tag, re.I)
        alt_m = re.search(r'\balt=["\']([^"\']*)["\']', tag, re.I)
        if src_m:
            src = src_m.group(1)
            alt = alt_m.group(1) if alt_m else ""
            if "logo" in src.lower() or "logo" in alt.lower():
                return _to_absolute(base, src)

    return None
