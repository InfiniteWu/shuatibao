import json
from datetime import datetime
from flask import Blueprint, request, jsonify
from db import get_db

wrongbook_bp = Blueprint('wrongbook', __name__)


@wrongbook_bp.route('/wrongbook', methods=['GET'])
def list_wrongbook():
    user_id = request.headers.get('X-User-Id')
    bank_id = request.args.get('bank_id')

    if not user_id:
        return jsonify({'error': '缺少 X-User-Id'}), 400

    conn = get_db()
    sql = '''
        SELECT wb.*, q.stem, q.type,
            (SELECT COUNT(*) FROM study_records sr
             WHERE sr.question_id = wb.question_id AND sr.user_id = wb.user_id AND sr.is_correct = 0
            ) as error_count
        FROM wrong_book wb
        JOIN questions q ON wb.question_id = q.id
        WHERE wb.user_id = ? AND wb.status = 'active'
    '''
    params = [int(user_id)]
    if bank_id:
        sql += ' AND wb.bank_id = ?'
        params.append(int(bank_id))
    sql += ' ORDER BY wb.added_at DESC'

    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@wrongbook_bp.route('/wrongbook', methods=['POST'])
def add_wrongbook():
    user_id = request.headers.get('X-User-Id')
    if not user_id:
        return jsonify({'error': '缺少 X-User-Id'}), 400

    data = request.get_json()
    question_id = data.get('question_id')
    bank_id = data.get('bank_id')

    if not question_id or not bank_id:
        return jsonify({'error': '缺少 question_id 或 bank_id'}), 400

    conn = get_db()
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    conn.execute('''
        INSERT INTO wrong_book (user_id, question_id, bank_id, status, added_at)
        VALUES (?, ?, ?, 'active', ?)
        ON CONFLICT(user_id, question_id, bank_id)
        DO UPDATE SET status = 'active', added_at = ?, removed_at = NULL
    ''', (int(user_id), question_id, bank_id, now, now))

    conn.commit()
    conn.close()
    return jsonify({'ok': True})


@wrongbook_bp.route('/wrongbook/today', methods=['GET'])
def list_today_wrongbook():
    user_id = request.headers.get('X-User-Id')
    bank_id = request.args.get('bank_id')

    if not user_id:
        return jsonify({'error': '缺少 X-User-Id'}), 400

    conn = get_db()
    sql = '''
        SELECT wb.*, q.stem, q.type,
            (SELECT COUNT(*) FROM study_records sr
             WHERE sr.question_id = wb.question_id AND sr.user_id = wb.user_id AND sr.is_correct = 0
            ) as error_count
        FROM wrong_book wb
        JOIN questions q ON wb.question_id = q.id
        WHERE wb.user_id = ? AND wb.status = 'active'
          AND wb.added_at >= datetime('now', 'start of day', 'localtime')
    '''
    params = [int(user_id)]
    if bank_id:
        sql += ' AND wb.bank_id = ?'
        params.append(int(bank_id))
    sql += ' ORDER BY wb.added_at DESC'

    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@wrongbook_bp.route('/wrongbook/<int:entry_id>/remove', methods=['PUT'])
def remove_wrongbook(entry_id):
    conn = get_db()
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    conn.execute(
        "UPDATE wrong_book SET status = 'removed', removed_at = ? WHERE id = ?",
        (now, entry_id)
    )
    conn.commit()
    conn.close()
    return jsonify({'ok': True})
