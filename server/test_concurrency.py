"""
并发优化验证测试
用法: python server/test_concurrency.py
"""
import sys, os, time, json, threading, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 使用独立端口避免冲突
PORT = 8009
BASE = f'http://localhost:{PORT}'
TEST_USER = '99'

from app import create_app
from db import get_db

results = []


def record(name, ok, detail=''):
    status = 'PASS' if ok else 'FAIL'
    results.append((name, status, detail))
    print(f'  [{status}] {name}')
    if detail:
        print(f'         {detail}')


# ──── 1. PRAGMA 配置 ────
def test_pragma():
    conn = get_db()
    try:
        wal = conn.execute('PRAGMA journal_mode').fetchone()[0]
        sync = conn.execute('PRAGMA synchronous').fetchone()[0]
        timeout = conn.execute('PRAGMA busy_timeout').fetchone()[0]

        ok = wal == 'wal' and sync == 1 and timeout == 3000
        record('PRAGMA 配置',
               ok,
               f'journal_mode={wal}, synchronous={sync}, busy_timeout={timeout}')
    finally:
        conn.close()


# ──── 2. 服务启动 ────
def test_startup(server_thread):
    for _ in range(30):
        try:
            req = urllib.request.Request(f'{BASE}/api/banks')
            req.add_header('X-User-Id', TEST_USER)
            resp = urllib.request.urlopen(req, timeout=2)
            data = json.loads(resp.read())
            if isinstance(data, list):
                record('Waitress 服务启动', True, f'返回 {len(data)} 个题库')
                return True
        except Exception:
            time.sleep(0.3)
    record('Waitress 服务启动', False, '30 次重试后仍无法连接')
    return False


# ──── 辅助：获取测试题库 ────
def get_test_bank():
    """直接从 DB 获取测试题库（避免 HTTP 层缓存问题）"""
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT id, question_count, single_count, multiple_count, truefalse_count "
            "FROM question_banks WHERE name = '_test_concurrency'"
        ).fetchone()
        if row:
            return dict(row)
        return None
    finally:
        conn.close()


def setup_test_data():
    """若无题库，直接从数据库创建最小测试题库供并发测试使用"""
    conn = get_db()
    try:
        # 检查是否已有测试题库
        row = conn.execute(
            "SELECT id FROM question_banks WHERE name = '_test_concurrency'"
        ).fetchone()
        if row:
            return {'id': row['id'], 'question_count': 10,
                    'single_count': 10, 'multiple_count': 0, 'truefalse_count': 0}

        print('  [setup] 创建测试题库...')
        cur = conn.execute(
            "INSERT INTO question_banks (name, description, question_count, single_count) VALUES (?, ?, ?, ?)",
            ('_test_concurrency', '并发测试题库', 10, 10)
        )
        bank_id = cur.lastrowid

        for i in range(10):
            conn.execute(
                "INSERT INTO questions (bank_id, type, stem, options, answer, explanation) VALUES (?, ?, ?, ?, ?, ?)",
                (bank_id, 'single', f'测试题目 {i+1}？',
                 json.dumps(['选项A', '选项B', '选项C', '选项D'], ensure_ascii=False),
                 json.dumps(0), f'解析 {i+1}')
            )
        conn.commit()
        return {'id': bank_id, 'question_count': 10,
                'single_count': 10, 'multiple_count': 0, 'truefalse_count': 0}
    finally:
        conn.close()


def cleanup_test_data():
    """删除测试题库"""
    conn = get_db()
    try:
        conn.execute("DELETE FROM question_banks WHERE name = '_test_concurrency'")
        conn.commit()
    finally:
        conn.close()


# ──── 3. 并发读 ────
def test_concurrent_reads():
    bank = get_test_bank()
    if not bank:
        record('并发读 (8线程)', False, '无可用的测试题库')
        return

    def do_read():
        for attempt in range(3):
            try:
                req = urllib.request.Request(f'{BASE}/api/banks')
                req.add_header('X-User-Id', TEST_USER)
                resp = urllib.request.urlopen(req, timeout=5)
                body = resp.read()
                if not body:
                    if attempt < 2:
                        time.sleep(0.2)
                        continue
                    return f'Empty body, status={resp.status}'
                banks = json.loads(body)
                return len(banks)
            except urllib.error.HTTPError as e:
                body = e.read().decode()[:100]
                return f'HTTP {e.code}: {body}'
            except Exception as e:
                if attempt < 2:
                    time.sleep(0.2)
                else:
                    return str(e)

    with ThreadPoolExecutor(max_workers=8) as ex:
        futures = [ex.submit(do_read) for _ in range(8)]
        results_list = [f.result() for f in as_completed(futures)]

    errors = [r for r in results_list if isinstance(r, str)]
    if errors:
        record('并发读 (8线程)', False, f'错误: {errors[:3]}')
    else:
        record('并发读 (8线程)', True, f'8 请求全部成功, 每题 {results_list[0]} 题')


# ──── 4. 并发写 (submit) ────
def test_concurrent_submit():
    bank = get_test_bank()
    if not bank:
        record('并发写 submit (8线程)', False, '无可用的测试题库')
        return

    # 抽一套题
    body = json.dumps({
        'bank_id': bank['id'],
        'mode': 'random',
        'single_count': min(5, bank['single_count']),
        'multiple_count': min(3, bank['multiple_count']),
        'truefalse_count': min(2, bank['truefalse_count']),
        'shuffle_options': False,
    }).encode()
    req = urllib.request.Request(f'{BASE}/api/practice/pick', data=body,
                                 headers={'Content-Type': 'application/json', 'X-User-Id': TEST_USER})
    resp = urllib.request.urlopen(req)
    questions = json.loads(resp.read())['questions']

    if not questions:
        record('并发写 submit (8线程)', False, '抽题结果为空')
        return

    # 构造答案
    def make_answers():
        ans = {}
        for q in questions:
            if q['type'] == 'multiple':
                sel = q['answer']  # 全选答对
            else:
                sel = q['answer']  # 单选/判断答对
            ans[str(q['id'])] = {'selected': sel, 'is_correct': True}
        return ans

    # 改为每线程独立构造答案（模拟各自的答题过程）
    answers_list = [make_answers() for _ in range(8)]

    def do_submit(answers, idx):
        try:
            body = json.dumps({
                'bank_id': bank['id'],
                'mode': 'random',
                'total_count': len(questions),
                'answers': answers,
            }).encode()
            req = urllib.request.Request(f'{BASE}/api/practice/submit', data=body,
                                         headers={'Content-Type': 'application/json', 'X-User-Id': str(TEST_USER)})
            resp = urllib.request.urlopen(req, timeout=10)
            data = json.loads(resp.read())
            return ('ok', data['session_id'])
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            return ('http_error', f'HTTP {e.code}: {body[:100]}')
        except Exception as e:
            return ('error', str(e))

    with ThreadPoolExecutor(max_workers=8) as ex:
        futures = [ex.submit(do_submit, answers_list[i], i) for i in range(8)]
        results_list = [f.result() for f in as_completed(futures)]

    oks = [r for r in results_list if r[0] == 'ok']
    fails = [r for r in results_list if r[0] != 'ok']
    if fails:
        record('并发写 submit (8线程)', False, f'{len(oks)} 成功, {len(fails)} 失败: {fails[:3]}')
    else:
        record('并发写 submit (8线程)', True, f'8/8 提交成功, session_ids: {[r[1] for r in oks]}')


# ──── 5. 事务完整性 ────
def test_transaction_integrity():
    bank = get_test_bank()
    if not bank:
        record('事务完整性', False, '无可用的测试题库')
        return

    # 抽题并提交
    body = json.dumps({
        'bank_id': bank['id'],
        'mode': 'random',
        'single_count': min(2, bank['single_count']),
        'multiple_count': 0,
        'truefalse_count': 0,
        'shuffle_options': False,
    }).encode()
    req = urllib.request.Request(f'{BASE}/api/practice/pick', data=body,
                                 headers={'Content-Type': 'application/json', 'X-User-Id': TEST_USER})
    resp = urllib.request.urlopen(req)
    questions = json.loads(resp.read())['questions']

    answers = {}
    for q in questions:
        answers[str(q['id'])] = {'selected': q['answer'], 'is_correct': True}

    body = json.dumps({
        'bank_id': bank['id'],
        'mode': 'random',
        'total_count': len(questions),
        'answers': answers,
    }).encode()
    req = urllib.request.Request(f'{BASE}/api/practice/submit', data=body,
                                 headers={'Content-Type': 'application/json', 'X-User-Id': TEST_USER})
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read())
    session_id = data['session_id']

    # 验证 session detail 完整性
    req = urllib.request.Request(f'{BASE}/api/practice/sessions/{session_id}')
    req.add_header('X-User-Id', TEST_USER)
    resp = urllib.request.urlopen(req)
    detail = json.loads(resp.read())

    ok = (
        detail['total_count'] == len(questions)
        and detail['correct_count'] == len(questions)
        and len(detail['answers']) == len(questions)
    )
    record('事务完整性', ok,
           f'session {session_id}: total={detail["total_count"]}, '
           f'correct={detail["correct_count"]}, answers={len(detail["answers"])}')


# ──── 6. 无 database locked 错误 ────
def test_no_db_locked():
    """高压力并发写入，验证 WAL + busy_timeout 防止 database locked"""
    bank = get_test_bank()
    if not bank:
        record('锁竞争防护', False, '无可用的测试题库')
        return

    body = json.dumps({
        'bank_id': bank['id'],
        'mode': 'random',
        'single_count': min(3, bank['single_count']),
        'multiple_count': 0,
        'truefalse_count': 0,
        'shuffle_options': False,
    }).encode()
    req = urllib.request.Request(f'{BASE}/api/practice/pick', data=body,
                                 headers={'Content-Type': 'application/json', 'X-User-Id': TEST_USER})
    resp = urllib.request.urlopen(req)
    questions = json.loads(resp.read())['questions']

    def do_submit():
        answers = {}
        for q in questions:
            answers[str(q['id'])] = {'selected': q['answer'], 'is_correct': True}
        try:
            body_s = json.dumps({
                'bank_id': bank['id'],
                'mode': 'random',
                'total_count': len(questions),
                'answers': answers,
            }).encode()
            req_r = urllib.request.Request(f'{BASE}/api/practice/submit', data=body_s,
                                           headers={'Content-Type': 'application/json', 'X-User-Id': TEST_USER})
            resp_r = urllib.request.urlopen(req_r, timeout=10)
            return ('ok',)
        except Exception as e:
            msg = str(e)
            if 'locked' in msg.lower():
                return ('locked', msg)
            return ('error', msg)

    with ThreadPoolExecutor(max_workers=8) as ex:
        futures = [ex.submit(do_submit) for _ in range(8)]
        raw = [f.result() for f in as_completed(futures)]

    locked = [r for r in raw if r[0] == 'locked']
    errors = [r for r in raw if r[0] == 'error']
    oks = [r for r in raw if r[0] == 'ok']

    if locked:
        record('锁竞争防护', False, f'{len(locked)} 次 database locked')
    elif errors:
        record('锁竞争防护', False, f'{len(errors)} 次异常: {errors[0][1][:80]}')
    else:
        record('锁竞争防护', True, f'{len(oks)} 次并发写入, 无 database locked')


# ──── Main ────
def main():
    print('=' * 60)
    print('刷题宝 并发优化验证测试')
    print(f'测试端口: {PORT}  测试用户: {TEST_USER}')
    print('=' * 60)

    # 清理端口残留
    import subprocess, platform
    try:
        if platform.system() == 'Windows':
            subprocess.run(
                f'for /f "tokens=5" %a in (\'netstat -ano ^| findstr :{PORT}\') do taskkill /F /PID %a >nul 2>&1',
                shell=True, capture_output=True, timeout=5
            )
    except Exception:
        pass

    # 1. PRAGMA（无需启动服务）
    test_pragma()

    # 启动 Waitress 后台线程
    app = create_app()
    server_thread = threading.Thread(
        target=lambda: __import__('waitress').serve(app, host='127.0.0.1', port=PORT),
        daemon=True
    )
    server_thread.start()
    time.sleep(0.5)

    try:
        # 2. 服务启动
        if not test_startup(server_thread):
            print('\n服务无法启动，终止后续测试')
            return

        # 准备测试数据
        bank = setup_test_data()
        time.sleep(0.3)  # 确保服务端 WAL 可见

        # 3-6. 功能测试
        test_concurrent_reads()
        test_concurrent_submit()
        test_transaction_integrity()
        test_no_db_locked()

        # 清理
        cleanup_test_data()

    finally:
        # 清理：关闭后台线程不方便，进程退出时自动终止
        pass

    # 汇总
    print('\n' + '=' * 60)
    total = len(results)
    passed = sum(1 for _, s, _ in results if s == 'PASS')
    for name, status, detail in results:
        print(f'  [{status}] {name}')
    print(f'\n  结果: {passed}/{total} 通过')
    print('=' * 60)
    return passed == total


if __name__ == '__main__':
    ok = main()
    sys.exit(0 if ok else 1)
