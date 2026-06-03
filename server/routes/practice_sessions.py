import json
from datetime import datetime
from flask import Blueprint, request, jsonify
from db import get_db

sessions_bp = Blueprint('sessions', __name__)


@sessions_bp.route('/practice/submit', methods=['POST'])
def submit_practice():
    user_id = request.headers.get('X-User-Id')
    if not user_id:
        return jsonify({'error': '缺少 X-User-Id'}), 400

    data = request.get_json()
    if not data:
        return jsonify({'error': '无效的请求数据'}), 400

    bank_id = data.get('bank_id')
    mode = data.get('mode', 'random')
    total_count = data.get('total_count', 0)
    answers = data.get('answers', {})

    if not bank_id:
        return jsonify({'error': '缺少 bank_id'}), 400

    conn = get_db()
    uid = int(user_id)

    # Collect question IDs to look up their answer data
    question_ids = [int(qid) for qid in answers.keys()]
    if not question_ids:
        conn.close()
        return jsonify({'error': '没有作答数据'}), 400

    placeholders = ','.join('?' * len(question_ids))
    rows = conn.execute(
        f'SELECT id, type, answer FROM questions WHERE id IN ({placeholders})',
        question_ids
    ).fetchall()
    question_map = {row['id']: row for row in rows}

    correct_count = 0
    wrong_count = 0
    unanswered_count = 0

    conn.execute('BEGIN')
    try:
        cursor = conn.execute(
            'INSERT INTO practice_sessions (user_id, bank_id, mode, total_count) VALUES (?, ?, ?, ?)',
            (uid, bank_id, mode, total_count)
        )
        session_id = cursor.lastrowid

        for qid_str, ans in answers.items():
            qid = int(qid_str)
            qrow = question_map.get(qid)
            if not qrow:
                continue

            selected = ans.get('selected')
            is_correct = ans.get('is_correct')

            if selected is None:
                unanswered_count += 1
                is_correct_val = None
            elif is_correct:
                correct_count += 1
                is_correct_val = 1
            else:
                wrong_count += 1
                is_correct_val = 0

            conn.execute(
                'INSERT INTO practice_answers (session_id, question_id, selected_answer, correct_answer, is_correct) VALUES (?, ?, ?, ?, ?)',
                (session_id, qid, json.dumps(selected), qrow['answer'], is_correct_val)
            )

        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        conn.execute(
            'UPDATE practice_sessions SET correct_count=?, wrong_count=?, unanswered_count=?, submitted_at=? WHERE id=?',
            (correct_count, wrong_count, unanswered_count, now, session_id)
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise

    accuracy = round(correct_count / total_count, 2) if total_count > 0 else 0

    conn.close()
    return jsonify({
        'session_id': session_id,
        'total_count': total_count,
        'correct_count': correct_count,
        'wrong_count': wrong_count,
        'unanswered_count': unanswered_count,
        'accuracy': accuracy,
        'submitted_at': now
    }), 201


@sessions_bp.route('/practice/sessions', methods=['GET'])
def list_sessions():
    user_id = request.headers.get('X-User-Id')
    if not user_id:
        return jsonify({'error': '缺少 X-User-Id'}), 400

    bank_id = request.args.get('bank_id')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))

    conn = get_db()
    uid = int(user_id)

    sql = '''
        SELECT ps.*, qb.name as bank_name
        FROM practice_sessions ps
        JOIN question_banks qb ON ps.bank_id = qb.id
        WHERE ps.user_id = ?
    '''
    params = [uid]

    if bank_id:
        sql += ' AND ps.bank_id = ?'
        params.append(int(bank_id))

    total = conn.execute(
        f'SELECT COUNT(*) FROM ({sql})',
        params
    ).fetchone()[0]

    sql += ' ORDER BY ps.submitted_at DESC LIMIT ? OFFSET ?'
    params.append(per_page)
    params.append((page - 1) * per_page)

    rows = conn.execute(sql, params).fetchall()
    conn.close()

    sessions_list = []
    for r in rows:
        d = dict(r)
        d['accuracy'] = round(d['correct_count'] / d['total_count'], 2) if d['total_count'] > 0 else 0
        sessions_list.append(d)

    return jsonify({
        'sessions': sessions_list,
        'total': total,
        'page': page,
        'per_page': per_page
    })


@sessions_bp.route('/practice/sessions/<int:session_id>', methods=['GET'])
def get_session_detail(session_id):
    user_id = request.headers.get('X-User-Id')
    if not user_id:
        return jsonify({'error': '缺少 X-User-Id'}), 400

    conn = get_db()

    session_row = conn.execute(
        '''SELECT ps.*, qb.name as bank_name
           FROM practice_sessions ps
           JOIN question_banks qb ON ps.bank_id = qb.id
           WHERE ps.id = ? AND ps.user_id = ?''',
        (session_id, int(user_id))
    ).fetchone()

    if not session_row:
        conn.close()
        return jsonify({'error': '练习记录不存在'}), 404

    session = dict(session_row)
    session['accuracy'] = round(session['correct_count'] / session['total_count'], 2) if session['total_count'] > 0 else 0

    answer_rows = conn.execute(
        '''SELECT pa.*, q.stem, q.options, q.explanation, q.type as question_type
           FROM practice_answers pa
           LEFT JOIN questions q ON pa.question_id = q.id
           WHERE pa.session_id = ?
           ORDER BY pa.id''',
        (session_id,)
    ).fetchall()

    answers = []
    for ar in answer_rows:
        a = dict(ar)
        a['selected_answer'] = json.loads(a['selected_answer']) if a['selected_answer'] else None
        a['correct_answer'] = json.loads(a['correct_answer'])
        a['options'] = json.loads(a['options']) if a.get('options') else []
        answers.append(a)

    conn.close()
    session['answers'] = answers
    return jsonify(session)
