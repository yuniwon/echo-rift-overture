#!/usr/bin/env python3
"""Dependency-free local launcher for ECHO RIFT."""
from __future__ import annotations

import contextlib
import http.server
import os
import socket
import socketserver
import sys
import threading
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def find_port(start: int = 8000, attempts: int = 30) -> int:
    for port in range(start, start + attempts):
        with contextlib.closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
            try:
                sock.bind(("127.0.0.1", port))
            except OSError:
                continue
            return port
    raise RuntimeError("사용 가능한 로컬 포트를 찾지 못했습니다.")


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt: str, *args: object) -> None:
        if "404" in fmt % args:
            super().log_message(fmt, *args)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        super().end_headers()


def main() -> int:
    os.chdir(ROOT)
    port = find_port()
    url = f"http://127.0.0.1:{port}/index.html"
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("127.0.0.1", port), QuietHandler) as server:
        print("\nECHO RIFT — 시간의 잔향")
        print(f"게임 주소: {url}")
        print("종료: 이 창에서 Ctrl+C\n")
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\n시간선 연결을 종료합니다.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
