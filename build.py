"""
PyInstaller 打包脚本
用法: python build.py

生成 dist/app.exe，包含 Flask 后端 + 前端静态文件。
部署时只需将 app.exe 拷贝到目标 Windows 机器，双击运行。
"""
import os
import sys
import shutil
import subprocess

ROOT = os.path.dirname(os.path.abspath(__file__))


def build_frontend():
    print('[1/3] 构建前端...')
    subprocess.run(['npm', 'run', 'build'], cwd=ROOT, check=True)
    print('  前端构建完成 -> dist/')


def clean_pyinstaller():
    for d in ['build', '__pycache__']:
        path = os.path.join(ROOT, d)
        if os.path.isdir(path):
            shutil.rmtree(path)
    for f in os.listdir(ROOT):
        if f.endswith('.spec'):
            os.remove(os.path.join(ROOT, f))


def build_exe():
    print('[2/3] PyInstaller 打包...')

    dist_dir = os.path.join(ROOT, 'dist')
    server_dir = os.path.join(ROOT, 'server')

    cmd = [
        sys.executable, '-m', 'PyInstaller',
        '--onefile',
        '--name', 'shuatibao',
        '--add-data', f'{dist_dir}{os.pathsep}dist',
        '--clean',
        '--noconsole',
        os.path.join(server_dir, 'app.py'),
    ]

    subprocess.run(cmd, cwd=ROOT, check=True)
    print('  打包完成 -> dist/shuatibao.exe')


def main():
    build_frontend()
    build_exe()
    clean_pyinstaller()
    print('[3/3] 完成！部署文件: dist/shuatibao.exe')


if __name__ == '__main__':
    main()
