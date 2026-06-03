# 刷题宝 (ShuatiBao)

一个轻量级刷题练习工具，支持单选题、多选题、判断题三种题型，适用于考试复习、知识巩固等场景。

## 功能特性

- **题库管理** — 创建、编辑、删除题库，支持 JSON 导入/导出
- **Excel 导入** — 通过 Python 脚本将 Excel 题库一键转换为 JSON 格式
- **练习模式** — 随机/顺序抽题、选项乱序、限时作答、即时判分
- **键盘操作** — 答题时支持 ← → 键快速切换题目
- **错题本** — 自动收录错题，支持按题库查看和移除
- **答题统计** — 今日练习量、正确率、错题数等仪表盘数据
- **断点续练** — 练习进度自动保存，24 小时内可恢复
- **多用户** — 内置 100 个用户 ID，方便多人共用
- **并发支持** — Waitress 生产级 WSGI + SQLite WAL 模式，支持多人同时使用

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19, TypeScript, Vite 8, TailwindCSS 4, Zustand 5, React Router 7 |
| 后端 | Python Flask, Waitress, SQLite (WAL 模式) |
| 打包 | PyInstaller（可选） |

## 快速开始

下载 `shuatibao-portable-windows.zip`，解压后双击 `启动.bat` 即可使用。

浏览器访问 `http://localhost:8008`，局域网内其他设备可通过本机 IP 访问。

## 开发指南

### 环境要求

- Node.js >= 18
- Python >= 3.10

### 安装与启动

```bash
# 前端
npm install
npm run dev          # Vite 开发服务器，端口 3000，API 代理至 8008

# 后端
cd server
pip install -r requirements.txt
python app.py        # Flask + Waitress，端口 8008
```

### 生产构建

```bash
npm run build                    # 前端构建 → dist/
cd server && python app.py       # 后端自动托管前端静态文件
```

### PyInstaller 打包

```bash
pip install pyinstaller
python build.py       # 生成 dist/shuatibao.exe
```

## 项目结构

```
├── src/                  # 前端源码
│   ├── api/              # API 客户端
│   ├── components/       # 通用组件（选项、答题卡、进度条等）
│   ├── pages/            # 页面组件
│   ├── store/            # Zustand 状态管理
│   └── types/            # TypeScript 类型定义
├── server/               # Flask 后端
│   ├── routes/           # API 路由（banks, questions, practice, wrongbook, dashboard）
│   ├── packages/         # Python 离线依赖包
│   ├── app.py            # 应用入口（Waitress 启动）
│   ├── db.py             # 数据库初始化 + 连接（WAL/NORMAL/busy_timeout）
│   └── import_parser.py  # JSON 导入校验与写入
├── xlsx2json.py          # Excel → JSON 通用转换工具
├── convert_xlsx.py       # Excel → JSON 转换脚本（特定格式）
├── build.py              # PyInstaller 打包脚本
└── index.html            # HTML 入口
```

## 导入题库

**方式一：Web 界面导入 JSON**

访问首页 → 点击「导入题库」→ 粘贴 JSON 数据。

**方式二：Excel 转 JSON**

```bash
# 通用脚本（4列：题型 | 题目 | 选项(;分隔) | 答案(A/B/C)）
python xlsx2json.py 题库.xlsx
```

JSON 格式示例：

```json
{
  "bankName": "示例题库",
  "description": "单选5 多选3 判断2 共10题",
  "questions": [
    {
      "type": "single",
      "stem": "以下哪个是 JavaScript 的基本数据类型？",
      "options": ["String", "Array", "Object", "Date"],
      "answer": 0,
      "explanation": "String 是基本类型，其余为引用类型"
    }
  ]
}
```

其中 `type` 取值为 `single`（单选）、`multiple`（多选）、`truefalse`（判断），`answer` 为选项索引（多选时为数组）。

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/banks` | 获取题库列表 |
| POST | `/api/banks` | 创建题库 |
| PUT | `/api/banks/:id` | 更新题库 |
| DELETE | `/api/banks/:id` | 删除题库 |
| GET | `/api/banks/:id/export` | 导出题库 |
| GET | `/api/banks/:id/questions` | 获取题目列表 |
| POST | `/api/banks/:id/questions` | 添加题目 |
| PUT | `/api/questions/:id` | 更新题目 |
| DELETE | `/api/questions/:id` | 删除题目 |
| POST | `/api/practice/pick` | 抽取题目 |
| POST | `/api/practice/submit` | 提交练习 |
| GET | `/api/practice/sessions` | 练习记录列表 |
| GET | `/api/practice/sessions/:id` | 练习详情 |
| GET | `/api/wrongbook` | 错题本列表 |
| POST | `/api/wrongbook` | 添加错题 |
| PUT | `/api/wrongbook/:id/remove` | 移除错题 |
| POST | `/api/import` | 导入题库 |
| GET | `/api/dashboard` | 仪表盘数据 |

所有请求需携带 Header `X-User-Id` 进行用户识别。

## License

Apache License 2.0
Copyright 二哥刷题宝
