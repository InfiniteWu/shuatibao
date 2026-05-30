from flask import Blueprint, request, jsonify
from import_parser import do_import

import_bp = Blueprint('import', __name__)


@import_bp.route('/import', methods=['POST'])
def import_questions():
    if 'file' not in request.files:
        data = request.get_json()
        if not data:
            return jsonify({'error': '请上传 JSON 文件或提供 JSON 数据'}), 400
        try:
            result, errors = do_import(data)
            return jsonify({'result': result, 'errors': errors})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    file = request.files['file']
    try:
        content = file.read().decode('utf-8')
        import json
        data = json.loads(content)
        result, errors = do_import(data)
        return jsonify({'result': result, 'errors': errors})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
