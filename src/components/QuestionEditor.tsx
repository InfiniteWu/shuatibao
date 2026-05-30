import { useState, useEffect } from 'react'
import type { Question, QuestionType } from '../types'

interface Props {
  bankId: number
  question?: Question | null
  onSave: (data: {
    bank_id: number
    type: QuestionType
    stem: string
    options: string[]
    answer: number | number[]
    explanation: string
  }) => void
  onCancel: () => void
}

export default function QuestionEditor({ bankId, question, onSave, onCancel }: Props) {
  const [type, setType] = useState<QuestionType>(question?.type ?? 'single')
  const [stem, setStem] = useState(question?.stem ?? '')
  const [options, setOptions] = useState<string[]>(question?.options ?? ['', ''])
  const [answer, setAnswer] = useState<number | number[]>(question?.answer ?? 0)
  const [explanation, setExplanation] = useState(question?.explanation ?? '')

  const isMultiple = type === 'multiple'

  useEffect(() => {
    if (type === 'truefalse' && options.length !== 2) {
      setOptions(['对', '错'])
      setAnswer(0)
    }
  }, [type])

  const addOption = () => setOptions([...options, ''])
  const removeOption = (i: number) => {
    const next = options.filter((_, idx) => idx !== i)
    setOptions(next)
    if (isMultiple) {
      const arr = (answer as number[]).filter((a) => a !== i).map((a) => (a > i ? a - 1 : a))
      setAnswer(arr)
    } else if ((answer as number) === i) {
      setAnswer(0)
    } else if ((answer as number) > i) {
      setAnswer((answer as number) - 1)
    }
  }
  const updateOption = (i: number, val: string) => {
    const next = [...options]
    next[i] = val
    setOptions(next)
  }

  const handleMultipleToggle = (i: number) => {
    const arr = answer as number[]
    if (arr.includes(i)) {
      setAnswer(arr.filter((a) => a !== i))
    } else {
      setAnswer([...arr, i].sort((a, b) => a - b))
    }
  }

  const handleSave = () => {
    if (!stem.trim()) return
    if (isMultiple && (answer as number[]).length === 0) return
    onSave({
      bank_id: bankId,
      type,
      stem: stem.trim(),
      options: type === 'truefalse' ? ['对', '错'] : options,
      answer,
      explanation: explanation.trim(),
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 w-16">类型</label>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2"
          value={type}
          onChange={(e) => {
            const t = e.target.value as QuestionType
            setType(t)
            setAnswer(t === 'multiple' ? [] : 0)
          }}
        >
          <option value="single">单选题</option>
          <option value="multiple">多选题</option>
          <option value="truefalse">判断题</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">题干</label>
        <textarea
          className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-20"
          value={stem}
          onChange={(e) => setStem(e.target.value)}
          placeholder="输入题目内容"
        />
      </div>

      {type !== 'truefalse' && (
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            选项（点击左侧标记正确答案）
          </label>
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <button
                type="button"
                className={`w-8 h-8 rounded-full text-sm font-bold border-2 flex-shrink-0 ${
                  isMultiple
                    ? (answer as number[]).includes(i)
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 text-gray-400'
                    : answer === i
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 text-gray-400'
                }`}
                onClick={() => (isMultiple ? handleMultipleToggle(i) : setAnswer(i))}
              >
                {String.fromCharCode(65 + i)}
              </button>
              <input
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`选项 ${String.fromCharCode(65 + i)}`}
              />
              {options.length > 2 && (
                <button
                  className="text-red-400 hover:text-red-600 text-sm"
                  onClick={() => removeOption(i)}
                >
                  删除
                </button>
              )}
            </div>
          ))}
          <button className="text-blue-600 text-sm hover:underline" onClick={addOption}>
            + 添加选项
          </button>
        </div>
      )}

      {type === 'truefalse' && (
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">答案</label>
          <div className="flex gap-4">
            {['对', '错'].map((label, i) => (
              <button
                key={i}
                className={`px-6 py-2 rounded-lg border-2 ${
                  answer === i
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-300 text-gray-600'
                }`}
                onClick={() => setAnswer(i)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">解析（选填）</label>
        <textarea
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="输入题目解析"
        />
      </div>

      <div className="flex justify-end gap-3">
        <button
          className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
          onClick={onCancel}
        >
          取消
        </button>
        <button
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          onClick={handleSave}
          disabled={!stem.trim() || (isMultiple && (answer as number[]).length === 0)}
        >
          保存
        </button>
      </div>
    </div>
  )
}
