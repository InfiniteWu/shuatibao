from flask import Blueprint, request, jsonify
from db import get_db

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/dashboard', methods=['GET'])
def get_dashboard():
    user_id = request.headers.get('X-User-Id')
    if not user_id:
        return jsonify({'error': '缺少 X-User-Id'}), 400

    conn = get_db()
    uid = int(user_id)

    today_practice_count = conn.execute(
        "SELECT COUNT(*) FROM study_records WHERE user_id = ? AND answered_at >= datetime('now', 'start of day', 'localtime')",
        (uid,)
    ).fetchone()[0]

    accuracy_row = conn.execute(
        "SELECT ROUND(CAST(SUM(is_correct) AS REAL) / NULLIF(COUNT(*), 0), 2) FROM study_records WHERE user_id = ? AND answered_at >= datetime('now', 'start of day', 'localtime')",
        (uid,)
    ).fetchone()
    today_accuracy = accuracy_row[0] if accuracy_row[0] is not None else 0

    today_new_wrong = conn.execute(
        "SELECT COUNT(*) FROM wrong_book WHERE user_id = ? AND status = 'active' AND added_at >= datetime('now', 'start of day', 'localtime')",
        (uid,)
    ).fetchone()[0]

    today_wrong_per_bank = conn.execute(
        "SELECT wb.bank_id, qb.name as bank_name, COUNT(*) as count "
        "FROM wrong_book wb "
        "JOIN question_banks qb ON wb.bank_id = qb.id "
        "WHERE wb.user_id = ? AND wb.status = 'active' AND wb.added_at >= datetime('now', 'start of day', 'localtime') "
        "GROUP BY wb.bank_id",
        (uid,)
    ).fetchall()

    conn.close()

    return jsonify({
        'today_practice_count': today_practice_count,
        'today_accuracy': today_accuracy,
        'today_new_wrong': today_new_wrong,
        'today_wrong_per_bank': [dict(r) for r in today_wrong_per_bank]
    })
