import os
import socket
import sys
import webbrowser
from flask import Flask, send_from_directory
from waitress import serve

# 确保当前目录在 sys.path 中（便携式 embeddable Python 兼容）
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db import init_db
from routes.banks import banks_bp
from routes.questions import questions_bp
from routes.practice import practice_bp
from routes.wrongbook import wrongbook_bp
from routes.records import records_bp
from routes.import_route import import_bp
from routes.dashboard import dashboard_bp
from routes.practice_sessions import sessions_bp


def create_app():
    app = Flask(__name__, static_folder=None)

    init_db()

    app.register_blueprint(banks_bp, url_prefix='/api')
    app.register_blueprint(questions_bp, url_prefix='/api')
    app.register_blueprint(practice_bp, url_prefix='/api')
    app.register_blueprint(wrongbook_bp, url_prefix='/api')
    app.register_blueprint(records_bp, url_prefix='/api')
    app.register_blueprint(import_bp, url_prefix='/api')
    app.register_blueprint(dashboard_bp, url_prefix='/api')
    app.register_blueprint(sessions_bp, url_prefix='/api')

    # Production: serve static files
    dist_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dist')
    if os.path.isdir(dist_dir):
        @app.route('/', defaults={'path': ''})
        @app.route('/<path:path>')
        def serve_frontend(path):
            if path and os.path.isfile(os.path.join(dist_dir, path)):
                return send_from_directory(dist_dir, path)
            return send_from_directory(dist_dir, 'index.html')

    @app.after_request
    def add_cors(response):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, X-User-Id'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        return response

    return app


def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'


app = create_app()

if __name__ == '__main__':
    port = 8008
    local_ip = get_local_ip()
    print(f'刷题宝已启动')
    print(f'  本地访问: http://localhost:{port}')
    print(f'  局域网访问: http://{local_ip}:{port}')
    if not getattr(sys, 'frozen', False):
        webbrowser.open(f'http://localhost:{port}')
    serve(app, host='0.0.0.0', port=port, threads=16)
