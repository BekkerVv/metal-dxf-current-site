# -*- coding: utf-8 -*-
"""Локальный сервер DXF-калькулятора.
Запускается через run.bat. Нужен для нормального сохранения project.json в папки заказов.
"""
from __future__ import annotations

import json
import mimetypes
import os
import re
import sys
import threading
import time
import urllib.parse
import webbrowser
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parent
PORT = int(os.environ.get("PORT", "5180"))
DEFAULT_ORDERS_ROOT = Path(os.environ.get("USERPROFILE", str(APP_ROOT))) / "Desktop" / "Заявки Новая форма"
ORDERS_ROOT = Path(os.environ.get("ORDERS_ROOT", str(DEFAULT_ORDERS_ROOT))).expanduser()
STATE_DIR = APP_ROOT / ".pm_dxf_state"
RECENT_FILE = STATE_DIR / "recent_projects.json"
MAX_BODY = 60 * 1024 * 1024

INVALID_CHARS = r'<>:"|?*'

def safe_name(name: str, fallback: str = "project") -> str:
    name = str(name or "").strip()
    for ch in INVALID_CHARS:
        name = name.replace(ch, "_")
    name = name.replace("\\", "_").replace("/", "_")
    name = re.sub(r"\s+", " ", name)
    name = re.sub(r"_+", "_", name).strip(" ._")
    return (name or fallback)[:140]

def ensure_root() -> None:
    ORDERS_ROOT.mkdir(parents=True, exist_ok=True)
    STATE_DIR.mkdir(parents=True, exist_ok=True)

def resolve_under_root(rel: str) -> Path:
    rel = urllib.parse.unquote(str(rel or "")).replace("\\", "/").lstrip("/")
    parts = [p for p in rel.split("/") if p and p not in (".", "..")]
    target = ORDERS_ROOT.joinpath(*parts).resolve()
    root = ORDERS_ROOT.resolve()
    if target != root and root not in target.parents:
        raise ValueError("Путь вне папки заявок запрещен")
    return target

def rel_to_root(path: Path) -> str:
    return path.resolve().relative_to(ORDERS_ROOT.resolve()).as_posix()

def read_recent():
    try:
        data = json.loads(RECENT_FILE.read_text("utf-8"))
        return data if isinstance(data, list) else []
    except Exception:
        return []

def write_recent(items):
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    RECENT_FILE.write_text(json.dumps(items[:30], ensure_ascii=False, indent=2), "utf-8")

def add_recent(item):
    items = read_recent()
    rel = item.get("relPath")
    items = [x for x in items if x.get("relPath") != rel]
    item["openedAt"] = time.strftime("%Y-%m-%d %H:%M:%S")
    items.insert(0, item)
    write_recent(items)

def project_file_name(order_name: str) -> str:
    return safe_name(order_name, "project") + ".project.json"

def launcher_content(rel_path: str) -> str:
    # Server должен быть запущен через run.bat. Батник открывает именно этот проект.
    url = f"http://127.0.0.1:{PORT}/?project={urllib.parse.quote(rel_path)}"
    return f'@echo off\r\nstart "" "{url}"\r\n'

def url_file_content(rel_path: str) -> str:
    url = f"http://127.0.0.1:{PORT}/?project={urllib.parse.quote(rel_path)}"
    return f"[InternetShortcut]\r\nURL={url}\r\n"

class Handler(BaseHTTPRequestHandler):
    server_version = "ParkMetalDXF/1.5"

    def log_message(self, fmt, *args):
        sys.stdout.write("%s - %s\n" % (self.address_string(), fmt % args))

    def send_text(self, code: int, body: str, ctype: str = "text/plain; charset=utf-8"):
        data = body.encode("utf-8") if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def send_json(self, obj, code: int = 200):
        self.send_text(code, json.dumps(obj, ensure_ascii=False), "application/json; charset=utf-8")

    def read_json(self):
        n = int(self.headers.get("Content-Length", "0") or "0")
        if n > MAX_BODY:
            raise ValueError("Слишком большой проект. Уменьши картинки раскладок или сохрани без них.")
        raw = self.rfile.read(n)
        return json.loads(raw.decode("utf-8") or "{}")

    def do_GET(self):
        try:
            parsed = urllib.parse.urlparse(self.path)
            path = parsed.path
            qs = urllib.parse.parse_qs(parsed.query)
            if path == "/api/local/status":
                ensure_root()
                return self.send_json({"ok": True, "root": str(ORDERS_ROOT), "recent": read_recent()})
            if path == "/api/local/list":
                ensure_root()
                rel = qs.get("rel", [""])[0]
                folder = resolve_under_root(rel)
                folder.mkdir(parents=True, exist_ok=True)
                folders, projects = [], []
                for child in sorted(folder.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower())):
                    if child.is_dir():
                        folders.append({"name": child.name, "rel": rel_to_root(child)})
                    elif child.suffix.lower() == ".json" or child.name.endswith(".project.json"):
                        projects.append({"name": child.name, "rel": rel_to_root(child), "size": child.stat().st_size})
                return self.send_json({"root": str(ORDERS_ROOT), "rel": rel, "folders": folders, "projects": projects})
            if path == "/api/local/project":
                ensure_root()
                rel = qs.get("rel", [""])[0]
                file_path = resolve_under_root(rel)
                if not file_path.is_file():
                    return self.send_text(404, "Проект не найден")
                add_recent({"relPath": rel_to_root(file_path), "folderRel": rel_to_root(file_path.parent), "fileName": file_path.name, "orderName": file_path.stem.replace(".project", "")})
                return self.send_text(200, file_path.read_text("utf-8"), "application/json; charset=utf-8")
            return self.serve_static(path)
        except Exception as e:
            return self.send_text(500, str(e))

    def do_POST(self):
        try:
            parsed = urllib.parse.urlparse(self.path)
            path = parsed.path
            if path == "/api/local/save-as":
                ensure_root()
                data = self.read_json()
                folder_rel = safe_name(data.get("folderRel") or data.get("orderName") or "Новый заказ", "Новый заказ")
                order_name = safe_name(data.get("orderName") or folder_rel, "project")
                project = data.get("project") or {}
                folder = resolve_under_root(folder_rel)
                folder.mkdir(parents=True, exist_ok=True)
                file_name = project_file_name(order_name)
                file_path = folder / file_name
                file_path.write_text(json.dumps(project, ensure_ascii=False, indent=2), "utf-8")
                rel_path = rel_to_root(file_path)
                (folder / "Открыть заказ.bat").write_text(launcher_content(rel_path), "utf-8")
                (folder / "Открыть заказ.url").write_text(url_file_content(rel_path), "utf-8")
                add_recent({"relPath": rel_path, "folderRel": rel_to_root(folder), "fileName": file_name, "orderName": order_name})
                return self.send_json({"ok": True, "relPath": rel_path, "folderRel": rel_to_root(folder), "fileName": file_name, "fullPath": str(file_path)})
            if path == "/api/local/save-current":
                ensure_root()
                data = self.read_json()
                rel_path = data.get("relPath") or ""
                project = data.get("project") or {}
                file_path = resolve_under_root(rel_path)
                if not file_path.parent.exists():
                    file_path.parent.mkdir(parents=True, exist_ok=True)
                file_path.write_text(json.dumps(project, ensure_ascii=False, indent=2), "utf-8")
                rel_path = rel_to_root(file_path)
                (file_path.parent / "Открыть заказ.bat").write_text(launcher_content(rel_path), "utf-8")
                (file_path.parent / "Открыть заказ.url").write_text(url_file_content(rel_path), "utf-8")
                add_recent({"relPath": rel_path, "folderRel": rel_to_root(file_path.parent), "fileName": file_path.name, "orderName": file_path.stem.replace(".project", "")})
                return self.send_json({"ok": True, "relPath": rel_path, "folderRel": rel_to_root(file_path.parent), "fileName": file_path.name, "fullPath": str(file_path)})
            return self.send_text(404, "Not found")
        except Exception as e:
            return self.send_text(500, str(e))

    def serve_static(self, url_path: str):
        rel = urllib.parse.unquote(url_path).lstrip("/") or "index.html"
        if "/" in rel or "\\" in rel:
            rel_path = (APP_ROOT / rel).resolve()
        else:
            rel_path = (APP_ROOT / rel).resolve()
        if rel_path != APP_ROOT and APP_ROOT.resolve() not in rel_path.parents:
            return self.send_text(403, "Forbidden")
        if not rel_path.is_file():
            return self.send_text(404, "Not found")
        ctype = mimetypes.guess_type(str(rel_path))[0] or "application/octet-stream"
        if rel_path.suffix.lower() in (".html", ".js", ".css"):
            ctype += "; charset=utf-8"
        data = rel_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)


def main():
    ensure_root()
    httpd = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    url = f"http://127.0.0.1:{PORT}"
    print("Парк Металл DXF калькулятор v1.5")
    print(f"Сайт: {url}")
    print(f"Папка заявок: {ORDERS_ROOT}")
    threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    httpd.serve_forever()

if __name__ == "__main__":
    main()
