# 香港四径 - Hong Kong Four Trails

一个展示和规划香港四径徒步路线的网站。

## 功能特性

- 🏔️ 展示香港四径的详细介绍
- 🗺️ 交互式地图显示路径
- 📍 标记点导航（如 M001, M050 等）
- 📅 行程规划功能
- 📊 爬升高度图表
- 🎨 现代化响应式设计

## 技术栈

- React 18
- TypeScript
- Vite
- React Router
- Leaflet (地图)
- Tailwind CSS

## 安装和运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 项目结构

```
src/
├── components/      # React 组件
│   ├── TrailMap.tsx        # 地图组件
│   ├── ItineraryPlanner.tsx # 行程规划组件
│   └── ElevationChart.tsx   # 高度图表组件
├── data/           # 数据文件
│   └── trails.ts   # 四径数据
├── pages/          # 页面组件
│   ├── Home.tsx    # 首页
│   └── TrailDetail.tsx # 径详情页
├── App.tsx         # 主应用组件
└── main.tsx        # 入口文件
```

## 使用说明

1. 首页展示四条径的基本信息
2. 点击任意径进入详情页
3. 在详情页可以：
   - 查看完整路径地图
   - 规划行程（选择日期和标记点）
   - 查看选定路径的轨迹和爬升高度

## Todo

- [x] 轨迹换向
- [x] 露营点标识
- [x] 点开地图后，轨迹居中
- [x] 去除地图放大缩小图标
- [x] 生成一个计划模板，可以复制保存计划
- [x] 贝澳营地
- [ ] 营地图片介绍
- [ ] 行程优化
- [ ] 会路过哪些地方和风景
- [ ] 补给点标识
- [ ] 生成分享图
- [ ] 行程导出 gpx 到两步路
- [ ] 国内网站打不开
- [ ] 多语言切换
- [ ] 支持添加自定义标注点

## 许可证

MIT
