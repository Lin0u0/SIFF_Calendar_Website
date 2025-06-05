# 🎬 SIFF 电影节快速排片系统

<div align="center">
  <img src="https://img.shields.io/badge/license-GPL--3.0-green.svg" alt="License">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome">
</div>

<div align="center">
  <h3>一个优雅的上海国际电影节观影计划管理工具</h3>
  <p>智能排片 · 冲突检测 · 精美分享</p>
</div>

## ✨ 特性

### 🎯 核心功能
- **CSV 数据导入** - 支持标准 CSV 格式的排片表导入
- **智能筛选系统** - 多维度筛选：单元、日期（支持多选）、影院、片名、导演、国家/地区、见面会
- **时间冲突检测** - 自动检测选中电影的时间冲突，考虑电影时长和 30 分钟通勤时间
- **日历视图** - 横轴为日期、纵轴为时间的可视化排片表
- **多格式导出** - 支持文本、JSON、ICS 日历文件等多种导出格式

### 🎨 设计亮点
- **现代化界面** - 采用卡片式设计，响应式布局
- **精美分享海报** - 基于 Canvas 生成的个性化观影计划海报
- **流畅交互** - 优雅的动画效果和即时反馈

### 🔧 技术特点
- **纯前端实现** - 无需服务器，打开即用
- **数据安全** - 所有数据本地处理，保护隐私
- **跨平台兼容** - 支持所有现代浏览器

## 🚀 快速开始

### 在线使用
访问 [在线演示地址](#) 即可直接使用

### 本地部署
1. 克隆仓库
```bash
git clone https://github.com/Lin0u0/SIFF_Calendar_Website.git
cd SIFF_Calendar_Website
```

2. 启动本地服务器
```bash
# 使用 Python
python -m http.server 8000

# 或直接在浏览器中打开 index.html
```

## 📖 使用指南

### 1. 准备数据
准备包含以下列的 CSV 文件：
- 单元、中文片名、英文片名、导演、制片国/地区、时长、日期、放映时间、影院、影厅、影院地址、见面会信息
- 本仓库中亦有提供

### 2. 导入数据
- 点击上传区域或拖拽 CSV 文件到指定区域
- 系统会自动解析并显示数据

### 3. 筛选电影
使用筛选器找到感兴趣的电影：
- **日期多选**：支持选择多个日期，快速选择周末/工作日
- **关键词搜索**：支持片名、导演搜索
- **特殊筛选**：如只看有见面会的场次

### 4. 管理选择
- 点击复选框选择想看的电影
- 系统自动检测时间冲突（红色标记）
- 右侧面板实时显示已选电影

### 5. 查看和导出
- **日历视图**：生成可视化的观影时间表
- **导出选择**：
  - 文本格式（.txt）- 便于阅读和分享
  - JSON 格式（.json）- 便于导入和备份
  - ICS 格式（.ics）- 可导入手机日历
- **分享海报**：生成观影计划海报

## 🎯 功能详解

### 时间冲突检测
- 自动计算电影结束时间
- 考虑 30 分钟通勤缓冲时间
- 冲突电影醒目标记提示

### 导入导出系统
- **导出**：保存当前选择，支持多种格式
- **导入**：恢复之前的选择，支持文本和 JSON

### 分享海报生成
- 现代化设计风格
- 自定义昵称显示
- 自动适应内容长度
- 支持下载和复制

## 🛠️ 技术栈

- **前端框架**：原生 JavaScript（ES6+）
- **样式设计**：CSS3 with Flexbox & Grid
- **图形生成**：Canvas API
- **文件处理**：FileReader API

## 📱 浏览器兼容性

- Chrome / Edge（推荐）
- Firefox
- Safari
- 移动端浏览器

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 开源协议

本项目采用 GPL-3.0 协议 - 查看 [LICENSE](LICENSE) 文件了解详情

### GPL-3.0 协议要点：
- ✅ 商业使用
- ✅ 修改
- ✅ 分发
- ✅ 专利使用
- ✅ 私人使用
- ❗ 需要开源
- ❗ 需要相同协议
- ❗ 需要声明变更

## 🙏 致谢

- 感谢 SIFF 上海国际电影节
- 感谢所有贡献者和使用者

## 📮 联系方式

- 项目主页：[https://github.com/SIFF_Calendar_Website](https://github.com/SIFF_Calendar_Website)
- Issue 反馈：[https://github.com/SIFF_Calendar_Website/issues](https://github.com/SIFF_Calendar_Website/issues)

---

<div align="center">
  <p>如果这个项目对你有帮助，请给一个 ⭐️ Star！</p>
  <p>Made with ❤️ for SIFF movie lovers</p>
</div>
