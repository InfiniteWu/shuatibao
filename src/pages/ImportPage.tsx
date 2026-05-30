import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiPost } from '../api/client'

export default function ImportPage() {
  const [jsonText, setJsonText] = useState('')
  const [preview, setPreview] = useState<{ name: string; desc: string; counts: Record<string, number>; errors: string[] } | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      setJsonText(text)
      previewJson(text)
    }
    reader.readAsText(file)
  }

  const previewJson = (text: string) => {
    try {
      const data = JSON.parse(text)
      const name = data.bankName || '未命名题库'
      const desc = data.description || ''
      const questions = data.questions || []
      const counts: Record<string, number> = {}
      const errors: string[] = []
      if (!Array.isArray(questions)) {
        errors.push('questions 字段必须为数组')
      } else {
        questions.forEach((q: unknown, i: number) => {
          const qq = q as Record<string, unknown>
          const type = qq.type as string
          if (['single', 'multiple', 'truefalse'].includes(type)) {
            counts[type] = (counts[type] || 0) + 1
          } else {
            errors.push(`题目 ${i + 1}: 无效的 type "${type}"`)
          }
          if (!qq.stem) errors.push(`题目 ${i + 1}: stem 不能为空`)
          if (!Array.isArray(qq.options) || (qq.options as unknown[]).length < 2) {
            errors.push(`题目 ${i + 1}: options 必须不少于 2 项`)
          }
        })
      }
      setPreview({ name, desc, counts, errors })
    } catch {
      setPreview({ name: '', desc: '', counts: {}, errors: ['JSON 格式解析失败'] })
    }
  }

  const handleImport = async () => {
    if (!jsonText.trim()) return
    setImporting(true)
    try {
      const data = JSON.parse(jsonText)
      const res = await apiPost<{ result: { bank_id: number; imported_count: number } | null; errors: string[] }>('/import', data)

      if (res.errors && res.errors.length > 0 && !res.result) {
        setResult(`导入失败，存在校验错误：\n${res.errors.join('\n')}`)
      } else if (res.result) {
        const msg = `导入成功！创建题库，共导入 ${res.result.imported_count} 题。`
        setResult(msg + (res.errors.length > 0 ? `\n警告：${res.errors.join('\n')}` : ''))
        setJsonText('')
        setPreview(null)
      }
    } catch (err) {
      setResult(`导入失败：${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <button
        className="text-sm text-blue-600 hover:underline mb-4 inline-block"
        onClick={() => navigate('/')}
      >
        &larr; 返回题库列表
      </button>
      <h2 className="text-xl font-semibold mb-6">导入题库</h2>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">上传 JSON 文件</label>
        <input
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          className="mb-4"
        />
        <div className="text-sm text-gray-400 mb-2">或直接粘贴 JSON 内容：</div>
        <textarea
          className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-48 font-mono text-sm"
          value={jsonText}
          onChange={(e) => {
            setJsonText(e.target.value)
            if (e.target.value.trim()) previewJson(e.target.value)
            else setPreview(null)
          }}
          placeholder='{"bankName": "题库名", "questions": [...]}'
        />
      </div>

      {preview && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h3 className="font-semibold mb-3">预览</h3>
          <div className="text-sm space-y-1">
            <p>题库名称：<span className="font-medium">{preview.name}</span></p>
            {preview.desc && <p>描述：{preview.desc}</p>}
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(preview.counts).map(([type, count]) => (
                <span key={type} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                  {type === 'single' ? '单选' : type === 'multiple' ? '多选' : '判断'}：{count} 题
                </span>
              ))}
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                共 {Object.values(preview.counts).reduce((a, b) => a + b, 0)} 题
              </span>
            </div>
          </div>
          {preview.errors.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg text-sm text-red-700">
              <p className="font-medium mb-1">校验警告：</p>
              {preview.errors.map((e, i) => (
                <p key={i}>{e}</p>
              ))}
              <p className="mt-2 text-red-500">有警告的题目将被跳过。</p>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          onClick={handleImport}
          disabled={!jsonText.trim() || importing}
        >
          {importing ? '导入中...' : '确认导入'}
        </button>
        <button
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          onClick={() => navigate('/')}
        >
          取消
        </button>
      </div>

      {result && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
          {result}
        </div>
      )}
    </div>
  )
}
