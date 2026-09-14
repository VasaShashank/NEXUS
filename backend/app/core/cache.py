"""
Lightweight in-process TTL cache for external market-data calls.

Why this exists:
NEXUS's market data provider (app/providers/market_data.py) was calling
yfinance directly on every single request with no caching at all — every
page load, every symbol search result, every chart render triggered a
fresh network round-trip to Yahoo Finance. That's the main cause of slow
initial loads and it also burns through Yahoo's informal rate limit much
faster than necessary.

This module adds a simple thread-safe, in-memory TTL cache with a
`@ttl_cache(seconds)` decorator. It requires no new infrastructure and
works today on any deployment target.

Scope / limitations (documented honestly, not hidden):
- This is a PER-PROCESS cache. On a long-running server (Docker, Render,
  Railway, a VM) it persists for the life of that process and helps every
  subsequent request/user.
- On serverless platforms (e.g. Vercel Functions), each cold start gets a
  fresh, empty cache — it will NOT eliminate first-request latency after a
  cold start, only repeat requests within the same warm invocation.
- For caching that survives across serverless invocations / multiple
  backend instances, back this with Redis instead: settings.REDIS_URL is
  already defined in app/core/config.py but currently unused. Swapping the
  TTLCache internals below for a Redis-backed store (same get/set/clear
  interface) is the natural upgrade path if/when Redis is provisioned.
"""
import os
import time
import threading
from functools import wraps
from typing import Any, Callable, Dict, Optional, Tuple

try:
    import requests_cache
    _CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".cache")
    os.makedirs(_CACHE_DIR, exist_ok=True)
    _SQLITE_PATH = os.path.join(_CACHE_DIR, "yfinance_http.sqlite")
    _cached_session = requests_cache.CachedSession(
        cache_name=_SQLITE_PATH,
        backend="sqlite",
        expire_after=300,  # 5 minutes default for HTTP scrape calls
        allowable_methods=("GET", "POST"),
        stale_if_error=True
    )
except Exception:
    import requests
    _cached_session = requests.Session()


def get_cached_session():
    """
    Returns the persistent SQLite-backed requests-cache session
    to eliminate duplicate network calls to Yahoo Finance endpoints.
    """
    return _cached_session


class TTLCache:
    def __init__(self):
        self._store: Dict[Tuple, Tuple[float, Any]] = {}
        self._lock = threading.Lock()

    def get(self, key: Tuple) -> Tuple[Optional[Any], bool]:
        with self._lock:
            entry = self._store.get(key)
            if not entry:
                return None, False
            expires_at, value = entry
            if time.time() > expires_at:
                del self._store[key]
                return None, False
            return value, True

    def set(self, key: Tuple, value: Any, ttl_seconds: float) -> None:
        with self._lock:
            self._store[key] = (time.time() + ttl_seconds, value)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()

    def size(self) -> int:
        with self._lock:
            return len(self._store)


# Process-wide singleton cache store shared by all @ttl_cache-decorated functions.
_cache = TTLCache()


def get_global_cache() -> TTLCache:
    return _cache


def ttl_cache(ttl_seconds: float):
    """
    Cache a function's return value in-process for `ttl_seconds`.

    Deliberately does NOT cache exceptions — a failed provider call is
    retried on the next request rather than "sticking" as a cached failure.
    `None` results (e.g. get_quote() for an unknown symbol) ARE cached
    briefly, since repeatedly hammering yfinance for a symbol that just
    returned nothing is exactly the kind of redundant call this exists to
    prevent — but only for a quarter of the normal TTL, so a genuinely
    transient provider hiccup recovers quickly.
    """
    def decorator(fn: Callable):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            key = (fn.__qualname__, args, tuple(sorted(kwargs.items())))
            value, hit = _cache.get(key)
            if hit:
                return value
            result = fn(*args, **kwargs)
            effective_ttl = ttl_seconds if result is not None else max(ttl_seconds / 4, 5)
            _cache.set(key, result, effective_ttl)
            return result
        wrapper.cache_clear = _cache.clear  # exposed for tests
        return wrapper
    return decorator
