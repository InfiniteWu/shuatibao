import json
from datetime import datetime
from flask import Blueprint, request, jsonify
from db import get_db

banks_bp = Blueprint('banks', __name__)


@banks_bp.route('/banks', methods=['GET'])
def list_banks():
    conn = get_db()
    rows = conn.execute(
        'SELECT * FROM question_banks ORDER BY created_at DESC'
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@banks_bp.route('/banks', methods=['POST'])
def create_bank():
    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({'error': '题库名称不能为空'}), 400
    conn = get_db()
    cursor = conn.execute(
        'INSERT INTO question_banks (name, description) VALUES (?, ?)',
        (data['name'], data.get('description', ''))
    )
    bank_id = cursor.lastrowid
    conn.commit()
    bank = conn.execute(
        'SELECT * FROM question_banks WHERE id = ?', (bank_id,)
    ).fetchone()
    conn.close()
    return jsonify(dict(bank)), 201


@banks_bp.route('/banks/<int:bank_id>', methods=['PUT'])
def update_bank(bank_id):
    data = request.get_json()
    conn = get_db()
    conn.execute(
        'UPDATE question_banks SET name = ?, description = ? WHERE id = ?',
        (data.get('name', ''), data.get('description', ''), bank_id)
    )
    conn.commit()
    bank = conn.execute(
        'SELECT * FROM question_banks WHERE id = ?', (bank_id,)
    ).fetchone()
    conn.close()
    if not bank:
        return jsonify({'error': '题库不存在'}), 404
    return jsonify(dict(bank))


@banks_bp.route('/banks/<int:bank_id>', methods=['DELETE'])
def delete_bank(bank_id):
    conn = get_db()
    conn.execute('DELETE FROM question_banks WHERE id = ?', (bank_id,))
    conn.commit()
    conn.close()
    return jsonify({'ok': True})


def recount_bank(conn, bank_id):
    counts = conn.execute(
        'SELECT type, COUNT(*) as cnt FROM questions WHERE bank_id = ? GROUP BY type',
        (bank_id,)
    ).fetchall()
    single = multiple = truefalse = 0
    for row in counts:
        if row['type'] == 'single':
            single = row['cnt']
        elif row['type'] == 'multiple':
            multiple = row['cnt']
        elif row['type'] == 'truefalse':
            truefalse = row['cnt']
    total = single + multiple + truefalse
    conn.execute(
        'UPDATE question_banks SET question_count=?, single_count=?, multiple_count=?, truefalse_count=? WHERE id=?',
        (total, single, multiple, truefalse, bank_id)
    )


@banks_bp.route('/banks/<int:bank_id>/export', methods=['GET'])
def export_bank(bank_id):
    conn = get_db()
    bank = conn.execute(
        'SELECT * FROM question_banks WHERE id = ?', (bank_id,)
    ).fetchone()
    if not bank:
        conn.close()
        return jsonify({'error': '题库不存在'}), 404

    questions = conn.execute(
        'SELECT * FROM questions WHERE bank_id = ? ORDER BY id', (bank_id,)
    ).fetchall()

    conn.close()

    q_list = []
    for q in questions:
        q_list.append({
            'type': q['type'],
            'stem': q['stem'],
            'options': json.loads(q['options']),
            'answer': json.loads(q['answer']),
            'explanation': q['explanation']
        })

    return jsonify({
        'bankName': bank['name'],
        'description': bank['description'],
        'questions': q_list
    })


@banks_bp.route('/banks/<int:bank_id>/recount', methods=['POST'])
def recount(bank_id):
    conn = get_db()
    recount_bank(conn, bank_id)
    conn.commit()
    bank = conn.execute(
        'SELECT * FROM question_banks WHERE id = ?', (bank_id,)
    ).fetchone()
    conn.close()
    if not bank:
        return jsonify({'error': '题库不存在'}), 404
    return jsonify(dict(bank))
