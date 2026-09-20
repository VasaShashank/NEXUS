"""Container entrypoint for the NEXUS backend.

The docker-compose stack mounts a named volume at /data (SQLite persistence).
Named volumes are initialized as root-owned, so doing a `chown` inside the
Dockerfile only affects layers — commands run at image build time, before the
volume is mounted into the running container. The result is that the
unprivileged `nexususer` (UID 10001) cannot write to /data/nexus.db and every
DB write fails with `attempt to write a readonly database`.

Fix: run this entrypoint as root at container START, chown /data (and the
yfinance cache dir) to UID/GID 10001, then permanently drop privileges to
`nexususer` and exec the real command (uvicorn, or whatever CMD/healthcheck
passed in).
"""

import os
import sys

NX_USER_UID = 10001
NX_USER_GID = 10001

DATA_DIR = "/data"
CACHE_DIR = "/app/.cache"


def _chown_tree(path: str) -> None:
    if not os.path.isdir(path):
        return
    for root, dirs, files in os.walk(path):
        for name in dirs:
            os.chown(os.path.join(root, name), NX_USER_UID, NX_USER_GID)
        for name in files:
            os.chown(os.path.join(root, name), NX_USER_UID, NX_USER_GID)


def main() -> None:
    for path in (DATA_DIR, CACHE_DIR):
        os.makedirs(path, exist_ok=True)
        os.chown(path, NX_USER_UID, NX_USER_GID)

    # Fix any pre-existing files (e.g. a SQLite DB written while the volume
    # was accidentally root-owned) so writes succeed immediately.
    _chown_tree(DATA_DIR)
    _chown_tree(CACHE_DIR)

    # Drop privileges once permissions are fixed, then run the real command.
    if os.geteuid() == 0:
        os.setgid(NX_USER_GID)
        os.setuid(NX_USER_UID)

    cmd = sys.argv[1:] or [
        "uvicorn",
        "main:app",
        "--host",
        "0.0.0.0",
        "--port",
        "8000",
    ]
    os.execvpe(cmd[0], cmd, os.environ)


if __name__ == "__main__":
    main()