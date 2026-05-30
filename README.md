# 刷题宝 (ShuatiBao)

一个轻量级刷题练习工具，支持单选题、多选题、判断题三种题型，适用于考试复习、知识巩固等场景。

## 功能特性

- **题库管理** — 创建、编辑、删除题库，支持 JSON 导入/导出
- **Excel 导入** — 通过 Python 脚本将 Excel 题库一键转换为 JSON 格式
- **练习模式** — 随机抽题、限时作答、即时判分
- **错题本** — 自动收录错题，支持按题库查看和移除
- **答题统计** — 今日练习量、正确率、错题数等仪表盘数据
- **多用户** — 内置 100 个用户 ID，方便多人共用
- **单文件部署** — 支持 PyInstaller 打包为独立 Windows exe

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19, TypeScript, Vite, TailwindCSS 4, Zustand, React Router 7 |
| 后端 | Python Flask, SQLite |
| 打包 | PyInstaller（可选） |

## 项目结构

```
├── src/                  # 前端源码
│   ├── api/              # API 客户端
│   ├── components/       # 通用组件
│   ├── pages/            # 页面组件
│   ├── store/            # Zustand 状态管理
│   └── types/            # TypeScript 类型定义
├── server/               # Flask 后端
│   ├── routes/           # API 路由
│   ├── packages/         # Python 离线依赖包
│   ├── app.py            # 应用入口
│   └── db.py             # 数据库初始化
├── public/               # 静态资源
├── xlsx2json.py          # Excel → JSON 通用转换工具
├── convert_xlsx.py       # Excel → JSON 转换脚本（特定格式）
├── build.py              # PyInstaller 打包脚本
└── index.html            # HTML 入口
```

## 快速开始

### 环境要求

- Node.js ≥ 18
- Python ≥ 3.10

### 1. 安装前端依赖

```bash
npm install
```

### 2. 启动前端开发服务器

```bash
npm run dev
```

前端运行在 `http://localhost:3000`，API 请求自动代理到后端。

### 3. 安装后端依赖

```bash
cd server
pip install -r requirements.txt
# 或者使用离线包安装：
pip install --no-index --find-links=packages flask
```

### 4. 启动后端

```bash
cd server
python app.py
```

后端运行在 `http://localhost:8008`，启动后会自动打开浏览器。

### 5. 导入题库

**方式一：Web 界面导入 JSON**

访问首页 → 点击「导入题库」→ 粘贴 JSON 数据。

**方式二：Excel 转 JSON**

```bash
# 通用脚本（4列：题型 | 题目 | 选项(;分隔) | 答案(A/B/C)）
python xlsx2json.py 题库.xlsx

# 特定格式脚本（安环2026 格式）
python convert_xlsx.py
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

## 生产部署

### 方式一：直接运行

```bash
npm run build          # 构建前端
cd server && python app.py   # 启动后端（自动托管前端静态文件）
```

### 方式二：打包为单个 exe

```bash
pip install pyinstaller
python build.py
```

生成的 `dist/shuatibao.exe` 可拷贝到任意 Windows 机器独立运行，无需安装 Python 或 Node.js。

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
| POST | `/api/practice/start` | 开始练习 |
| POST | `/api/practice/submit` | 提交练习 |
| GET | `/api/wrongbook/:bankId` | 查看错题本 |
| POST | `/api/wrongbook/remove` | 移除错题 |
| POST | `/api/import` | 导入题库 |
| GET | `/api/dashboard` | 仪表盘数据 |
| GET | `/api/sessions` | 练习记录 |

所有请求需携带 Header `X-User-Id` 进行用户识别。

## License

MIT
