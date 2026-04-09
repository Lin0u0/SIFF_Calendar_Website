# SIFF Calendar Website

一个面向电影节观影排片的纯前端小工具，适合用来导入电影节排片表、筛选场次、安排观影计划，并导出成文本、日历或分享图片。

当前版本已经从单文件脚本整理为模块化结构，实际运行入口是 `index.html` + `js/app.js`。

## 功能概览

- 导入排片表，支持拖拽或点击上传
- 支持 `csv`、`xlsx`、`xls` 格式
- 支持标准 SIFF 数据，也兼容一类 BJIFF 风格的 Excel 排片表并自动归一化字段
- 多维筛选：单元、日期、影院、片名、导演、国家/地区、活动
- 日期支持多选，并提供“周末 / 工作日”快捷筛选
- 已选影片侧栏实时汇总，并自动检测时间冲突
- 冲突检测会结合影片时长，并额外预留 30 分钟通勤缓冲
- 可生成日历视图，并导出为独立 HTML 页面或 `.ics` 日历文件
- 支持导出观影计划为 `.txt`、`.json`、`.ics`
- 支持从已导出的 `.txt` / `.json` 重新导入选择结果
- 支持生成可分享的观影计划图片
- 使用 `localStorage` 自动保存当前数据和勾选状态，刷新后可恢复

## 适用场景

- 电影节开票前后快速筛片
- 安排多天、多影院的观影路线
- 检查时间撞车和连续赶场风险
- 把观影计划同步到系统日历或发给朋友

## 快速开始

这是一个无需构建的静态网站项目。

1. 克隆仓库

```bash
git clone https://github.com/Lin0u0/SIFF_Calendar_Website.git
cd SIFF_Calendar_Website
```

2. 启动本地静态服务器

```bash
python3 -m http.server 8000
```

3. 在浏览器打开

```text
http://localhost:8000
```

建议通过本地静态服务器访问。项目使用 ES Module，直接用 `file://` 打开时，部分浏览器会因为模块加载策略导致页面无法正常工作。

## 数据格式

### SIFF CSV

项目根目录自带一份示例数据：[SIFF.csv](/Users/lin0u0/Code/Web/SIFF_Calendar_Website/SIFF.csv)。

常见字段包括：

- `单元`
- `中文片名`
- `英文片名`
- `导演`
- `制片国/地区`
- `时长`
- `日期`
- `放映时间`
- `影院`
- `影厅`
- `影院地址`
- `见面会`

### Excel 排片表

Excel 文件读取第一张工作表，并会在前几行中自动寻找表头。当前逻辑要求表头行中包含 `单元` 列。

如果表头中存在 `影片中文名` 等字段，系统会按兼容格式处理，并映射成统一字段结构后再参与筛选、导出和冲突检测。

## 使用说明

1. 上传排片表。
2. 通过筛选条件缩小候选场次。
3. 勾选想看的场次，右侧会实时显示已选结果。
4. 若时间冲突，卡片和日历视图会给出明显提示。
5. 在右侧面板执行后续操作：

- `日历视图`：查看时间排布
- `导出`：导出为文本、JSON 或 ICS
- `分享图片`：生成海报式分享图
- `导入`：从之前导出的文本或 JSON 恢复选择
- `清空`：移除当前已选内容

## 项目结构

```text
.
├── index.html          # 页面结构与入口
├── style.css           # 全局样式
├── js/
│   ├── app.js          # 应用初始化、文件上传、状态恢复
│   ├── parser.js       # CSV / Excel 解析与字段归一化
│   ├── filters.js      # 筛选逻辑与日期多选
│   ├── display.js      # 影片列表渲染
│   ├── selection.js    # 勾选状态与冲突检测
│   ├── calendar.js     # 日历视图与网页导出
│   ├── export.js       # 文本 / JSON / ICS 导入导出
│   ├── share.js        # 分享图片生成
│   ├── state.js        # 全局状态与 localStorage 持久化
│   └── utils.js        # 日期、时长、绘制等通用工具
├── SIFF.csv            # 示例数据
└── LICENSE
```

## 技术实现

- 原生 HTML / CSS / JavaScript
- 浏览器端文件读取：`FileReader`
- Excel 解析：`SheetJS`
- 图片生成：`Canvas API`
- 本地持久化：`localStorage`

项目没有后端服务，所有数据处理都在浏览器本地完成。

## 已知边界

- 当前 Excel 解析只读取第一张工作表
- 非标准排片表依赖字段名匹配，字段差异过大时需要先整理数据
- 冲突检测使用固定 30 分钟缓冲，不区分具体影院间距离
- 年份解析依赖当前年份或表格中的日期信息，跨年电影节场景可能需要额外校正

## 后续维护建议

- 如果后续继续长期维护，建议补一个简单的本地开发脚本或 `serve` 命令
- 可以补充真实截图或 GIF，降低首次使用门槛
- 可以把导入字段要求抽成单独文档，方便适配更多电影节表格
- 根目录中的旧版 [script.js](/Users/lin0u0/Code/Web/SIFF_Calendar_Website/script.js) 目前不是页面入口，如确认不再使用，可以后续单独清理

## 开源协议

项目使用 GPL-3.0 协议，详见 [LICENSE](/Users/lin0u0/Code/Web/SIFF_Calendar_Website/LICENSE)。

## 相关链接

- 仓库主页：[Lin0u0/SIFF_Calendar_Website](https://github.com/Lin0u0/SIFF_Calendar_Website)
- 问题反馈：[Issues](https://github.com/Lin0u0/SIFF_Calendar_Website/issues)
