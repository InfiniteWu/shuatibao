import json
from flask import Blueprint, request, jsonify
from db import get_db
from routes.banks import recount_bank

questions_bp = Blueprint('questions', __name__)


def question_to_dict(row):
    q = dict(row)
    q['options'] = json.loads(q['options'])
    q['answer'] = json.loads(q['answer'])
    return q


@questions_bp.route('/questions', methods=['GET'])
def list_questions():
    bank_id = request.args.get('bank_id')
    qtype = request.args.get('type')
    search = request.args.get('search')
    conn = get_db()
    sql = 'SELECT * FROM questions WHERE 1=1'
    params = []
    if bank_id:
        sql += ' AND bank_id = ?'
        params.append(int(bank_id))
    if qtype:
        sql += ' AND type = ?'
        params.append(qtype)
    if search:
        sql += ' AND stem LIKE ?'
        params.append('%' + search + '%')
    sql += ' ORDER BY id ASC'
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return jsonify([question_to_dict(r) for r in rows])


@questions_bp.route('/questions/<int:question_id>', methods=['GET'])
def get_question(question_id):
    conn = get_db()
    row = conn.execute(
        'SELECT * FROM questions WHERE id = ?', (question_id,)
    ).fetchone()
    conn.close()
    if not row:
        return jsonify({'error': '题目不存在'}), 404
    return jsonify(question_to_dict(row))


@questions_bp.route('/questions', methods=['POST'])
def create_question():
    data = request.get_json()
    if not data:
        return jsonify({'error': '无效的请求数据'}), 400

    required = ['bank_id', 'type', 'stem', 'options', 'answer']
    for field in required:
        if field not in data:
            return jsonify({'error': f'缺少必填字段: {field}'}), 400

    if data['type'] not in ('single', 'multiple', 'truefalse'):
        return jsonify({'error': '无效的题目类型'}), 400

    conn = get_db()
    cursor = conn.execute(
        'INSERT INTO questions (bank_id, type, stem, options, answer, explanation) VALUES (?, ?, ?, ?, ?, ?)',
        (
            data['bank_id'],
            data['type'],
            data['stem'],
            json.dumps(data['options'], ensure_ascii=False),
            json.dumps(data['answer']),
            data.get('explanation', '')
        )
    )
    question_id = cursor.lastrowid
    recount_bank(conn, data['bank_id'])
    conn.commit()

    row = conn.execute(
        'SELECT * FROM questions WHERE id = ?', (question_id,)
    ).fetchone()
    conn.close()
    return jsonify(question_to_dict(row)), 201


@questions_bp.route('/questions/<int:question_id>', methods=['PUT'])
def update_question(question_id):
    data = request.get_json()
    conn = get_db()
    existing = conn.execute(
        'SELECT * FROM questions WHERE id = ?', (question_id,)
    ).fetchone()
    if not existing:
        conn.close()
        return jsonify({'error': '题目不存在'}), 404

    old_bank_id = existing['bank_id']
    new_bank_id = data.get('bank_id', old_bank_id)

    conn.execute(
        'UPDATE questions SET bank_id=?, type=?, stem=?, options=?, answer=?, explanation=? WHERE id=?',
        (
            new_bank_id,
            data.get('type', existing['type']),
            data.get('stem', existing['stem']),
            json.dumps(data.get('options', json.loads(existing['options'])), ensure_ascii=False),
            json.dumps(data.get('answer', json.loads(existing['answer']))),
            data.get('explanation', existing['explanation']),
            question_id
        )
    )
    recount_bank(conn, new_bank_id)
    if new_bank_id != old_bank_id:
        recount_bank(conn, old_bank_id)
    conn.commit()

    row = conn.execute(
        'SELECT * FROM questions WHERE id = ?', (question_id,)
    ).fetchone()
    conn.close()
    return jsonify(question_to_dict(row))


@questions_bp.route('/questions/<int:question_id>', methods=['DELETE'])
def delete_question(question_id):
    conn = get_db()
    q = conn.execute(
        'SELECT bank_id FROM questions WHERE id = ?', (question_id,)
    ).fetchone()
    if not q:
        conn.close()
        return jsonify({'error': '题目不存在'}), 404

    bank_id = q['bank_id']
    conn.execute('DELETE FROM questions WHERE id = ?', (question_id,))
    recount_bank(conn, bank_id)
    conn.commit()
    conn.close()
    return jsonify({'ok': True})
