# 家庭每周点菜助手 🍳

一个供情侣 / 家庭使用的**每周点菜 Web APP**。像点外卖一样挑选喜欢的菜，为星期一至星期日安排主菜、配菜与主食，自动生成采购清单与备菜计划。

- 纯 **HTML / CSS / 原生 JavaScript**，无任何框架、无后端、无付费 API。
- 数据保存在浏览器 **localStorage**，刷新不丢失；支持 **导出 / 导入 JSON 备份**。
- 支持 **PWA**：可添加到手机主屏幕，可离线访问基础功能。
- 移动端优先，同时适配电脑浏览器。

---

## 一、项目结构

```
family-meal-app/
├── index.html              # 应用入口（HTML 壳）
├── manifest.webmanifest    # PWA 清单
├── sw.js                   # Service Worker（离线缓存）
├── css/
│   └── style.css           # 全部样式
├── js/
│   ├── data.js             # 菜品数据库 + 分类 + 食材 + 图片配置
│   └── app.js              # 全部交互逻辑
├── icons/                  # 应用图标（180/192/512/maskable）
├── scripts/
│   ├── gen_icons.py        # 重新生成图标的脚本（需 Pillow）
│   └── verify_data.js      # 校验菜品数据完整性（需 Node）
└── README.md
```

## 二、本地运行

直接双击 `index.html` 也能使用核心功能，但为了 **PWA 安装、离线访问、Service Worker**，建议用本地静态服务器启动：

```bash
# 方式一：Node（推荐）
npx serve family-meal-app

# 方式二：Python
cd family-meal-app
python -m http.server 8080

# 方式三：任意静态服务器（VSCode Live Server 等）
```

浏览器打开 `http://localhost:8080`（或 serve / Live Server 给出的端口）即可。

> 说明：`file://` 直接打开时功能完整，但浏览器不允许注册 Service Worker，因此无法离线与添加到主屏幕；通过 http(s) 访问即可启用完整 PWA 能力。

## 三、手机访问（局域网）

1. 让手机和电脑连接**同一个 Wi-Fi**。
2. 电脑上启动静态服务器（如 `npx serve family-meal-app`），记下局域网地址（例如 `http://192.168.1.5:3000`）。
3. 手机浏览器打开该地址即可。

> 注意 Windows 防火墙：如手机打不开，请允许 Node/Python 通过防火墙，或临时关闭专用网络防火墙测试。

## 四、添加到手机主屏幕（PWA）

- **Android（Chrome）**：打开页面 → 浏览器菜单 →「添加到主屏幕 / 安装应用」。
- **iPhone（Safari）**：打开页面 → 分享按钮 →「添加到主屏幕」。

安装后即可像 App 一样全屏打开，并支持离线访问基础功能。

## 五、部署到免费静态托管平台

任选其一，把整个 `family-meal-app` 文件夹内容上传即可（无需任何构建）：

1. **GitHub Pages**：仓库 Settings → Pages → 选择分支与根目录 → 访问 `https://用户名.github.io/仓库名/`。
2. **Netlify**：把文件夹拖到 Netlify Drop（`app.netlify.com/drop`）即可上线。
3. **Vercel**：`vercel` 或导入仓库，框架选「Other / Static」。
4. **Cloudflare Pages**：导入仓库，构建命令留空，输出目录填 `.`（或直接上传）。

## 六、菜品图片替换

所有菜品默认使用**统一风格的 emoji 占位图**（暖色背景 + 食物 emoji）。想换成真实照片时，只需编辑 `js/data.js` 顶部的 `IMAGE_CONFIG`：

```js
const IMAGE_CONFIG = {
  'd1': 'images/heijiao-jipa.jpg',   // 本地图片（放在项目内）
  'd5': 'https://example.com/huangmenji.jpg', // 或远程图片
};
```

图片地址不写在业务逻辑里，改这一处即可；未配置的菜自动回退到 emoji 占位图。

## 七、数据备份与恢复

数据只保存在当前浏览器。换设备 / 换浏览器前：

1. 打开「**我的收藏**」页底部，或点首页右上角 ⚙ 设置图标。
2. 点「**导出数据**」下载 JSON 备份文件。
3. 在新设备点「**导入数据 / 恢复备份**」选择该文件即可。

## 八、功能清单

| 功能 | 说明 |
| --- | --- |
| 点菜大厅 | 分类横滑、实时搜索、双列卡片、收藏、添加 |
| 菜品详情 | 大图、标签、食材、收藏、一键加菜单 |
| 添加点菜 | 选星期 / 主菜·配菜·主食 / 份量，可修改与取消 |
| 我的菜单 | 七天安排、增删改、调顺序、清空、复制、随机 |
| 随机点菜 | 随机一道 / 一天 / 一周，含荤素多样性约束 |
| 采购清单 | 按菜单自动汇总食材，可勾选、复制、清除 |
| 备菜计划 | 提前一晚准备 + 当天烹饪安排 |
| 我的收藏 | 收藏 / 取消 / 搜索 / 一键加入菜单 |
| 数据 | localStorage 持久化 + JSON 导入导出 |

## 九、数据校验

内置 58 道不同菜品（已去除重复名称并保留其分类属性）。可随时运行校验脚本确认：

```bash
node scripts/verify_data.js
```

重新生成图标：

```bash
python scripts/gen_icons.py   # 需 pip install Pillow
```
