import json
from db import get_db
from routes.banks import recount_bank


VALID_TYPES = {'single', 'multiple', 'truefalse'}


def validate_question(q, index):
    errors = []

    if not isinstance(q, dict):
        return [f'题目 {index}: 格式错误，应为对象']

    qtype = q.get('type')
    if qtype not in VALID_TYPES:
        errors.append(f'题目 {index}: type 无效，必须为 single/multiple/truefalse')

    stem = q.get('stem', '')
    if not stem or not isinstance(stem, str):
        errors.append(f'题目 {index}: stem 不能为空')

    options = q.get('options')
    if not isinstance(options, list) or len(options) < 2:
        errors.append(f'题目 {index}: options 必须是不少于 2 项的数组')
    elif not all(isinstance(o, str) for o in options):
        errors.append(f'题目 {index}: options 每项必须为字符串')

    answer = q.get('answer')
    if qtype == 'multiple':
        if not isinstance(answer, list):
            errors.append(f'题目 {index}: 多选题 answer 必须为数组')
        elif options and isinstance(options, list):
            if any(a < 0 or a >= len(options) for a in answer if isinstance(a, int)):
                errors.append(f'题目 {index}: answer 索引超出 options 范围')
    else:
        if not isinstance(answer, int):
            errors.append(f'题目 {index}: 单选题/判断题 answer 必须为整数')
        elif options and isinstance(options, list) and (answer < 0 or answer >= len(options)):
            errors.append(f'题目 {index}: answer 索引超出 options 范围')

    return errors


def parse_import(data):
    if isinstance(data, str):
        data = json.loads(data)

    errors = []
    bank_name = data.get('bankName', '未命名题库')
    description = data.get('description', '')
    questions = data.get('questions', [])

    if not isinstance(questions, list):
        return None, ['questions 字段必须为数组']

    valid_questions = []
    for i, q in enumerate(questions):
        q_errors = validate_question(q, i + 1)
        if q_errors:
            errors.extend(q_errors)
        else:
            valid_questions.append(q)

    return {
        'bank_name': bank_name,
        'description': description,
        'questions': valid_questions
    }, errors


def do_import(data, bank_id=None):
    parsed, errors = parse_import(data)

    if errors and not parsed:
        return None, errors

    conn = get_db()

    try:
        if bank_id is None:
            cursor = conn.execute(
                'INSERT INTO question_banks (name, description) VALUES (?, ?)',
                (parsed['bank_name'], parsed['description'])
            )
            bank_id = cursor.lastrowid
        else:
            conn.execute(
                'UPDATE question_banks SET name = ?, description = ? WHERE id = ?',
                (parsed['bank_name'], parsed['description'], bank_id)
            )

        for q in parsed['questions']:
            conn.execute(
                'INSERT INTO questions (bank_id, type, stem, options, answer, explanation) VALUES (?, ?, ?, ?, ?, ?)',
                (
                    bank_id,
                    q['type'],
                    q['stem'],
                    json.dumps(q['options'], ensure_ascii=False),
                    json.dumps(q['answer']),
                    q.get('explanation', '')
                )
            )

        recount_bank(conn, bank_id)
        conn.commit()
        return {'bank_id': bank_id, 'imported_count': len(parsed['questions'])}, errors
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()
