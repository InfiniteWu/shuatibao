import json
import random
from flask import Blueprint, request, jsonify
from db import get_db

practice_bp = Blueprint('practice', __name__)


def shuffle_options(options, answer):
    indices = list(range(len(options)))
    random.shuffle(indices)
    new_options = [options[i] for i in indices]

    if isinstance(answer, list):
        new_answer = [indices.index(a) for a in answer]
    else:
        new_answer = indices.index(answer)

    return new_options, new_answer


@practice_bp.route('/practice/pick', methods=['POST'])
def pick_questions():
    data = request.get_json()
    if not data:
        return jsonify({'error': '无效的请求数据'}), 400

    bank_id = data.get('bank_id')
    mode = data.get('mode', 'random')
    single_count = data.get('single_count', 0)
    multiple_count = data.get('multiple_count', 0)
    truefalse_count = data.get('truefalse_count', 0)
    shuffle_opts = data.get('shuffle_options', False)

    conn = get_db()

    result = []
    for qtype, count in [('single', single_count), ('multiple', multiple_count), ('truefalse', truefalse_count)]:
        if count <= 0:
            continue

        rows = conn.execute(
            'SELECT * FROM questions WHERE bank_id = ? AND type = ? ORDER BY RANDOM() LIMIT ?',
            (bank_id, qtype, count)
        ).fetchall()

        for row in rows:
            q = dict(row)
            q['options'] = json.loads(q['options'])
            q['answer'] = json.loads(q['answer'])

            if shuffle_opts:
                q['options'], q['answer'] = shuffle_options(q['options'], q['answer'])

            result.append(q)

    conn.close()

    if mode == 'random':
        random.shuffle(result)

    return jsonify({
        'questions': result,
        'total': len(result)
    })
