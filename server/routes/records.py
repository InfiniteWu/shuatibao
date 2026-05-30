from flask import Blueprint, request, jsonify
from db import get_db

records_bp = Blueprint('records', __name__)


@records_bp.route('/records', methods=['POST'])
def create_record():
    user_id = request.headers.get('X-User-Id')
    if not user_id:
        return jsonify({'error': '缺少 X-User-Id'}), 400

    data = request.get_json()
    question_id = data.get('question_id')
    bank_id = data.get('bank_id')
    is_correct = data.get('is_correct')

    if question_id is None or bank_id is None or is_correct is None:
        return jsonify({'error': '缺少必填字段'}), 400

    conn = get_db()
    conn.execute(
        'INSERT INTO study_records (user_id, question_id, bank_id, is_correct) VALUES (?, ?, ?, ?)',
        (int(user_id), question_id, bank_id, 1 if is_correct else 0)
    )
    conn.commit()
    conn.close()
    return jsonify({'ok': True}), 201
