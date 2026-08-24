# 🍏 Apple Minimalist Cloudflare Status Monitor (MVP)

基于 **Cloudflare Serverless（Workers + KV + Pages）** 打造的 **Apple 极简磨砂质感（Cupertino Glassmorphism）** 全球边缘服务状态监控与管理系统，深度对齐 **Uptime Kuma** 核心监控能力与高度自定义告警流。

---

## ✨ 核心特性与 Uptime Kuma 深度对齐

### 1. 🛡️ Uptime Kuma 级别的高度自定义告警系统
- **服务专属独立告警分流（Per-Service Alert Routing）**：
  - 支持为不同的监控服务勾选绑定**不同的告警通道**（例如：核心 API 发生故障推送到「SRE 紧急邮件 + Telegram」，而内部文档服务仅推送到「飞书/钉钉群」）。
- **细粒度触发时机规则（Trigger Conditions）**：
  - 🔴 **服务故障宕机（Trigger on Down）**：连续失败达阈值时触发；
  - 🟢 **服务恢复正常（Trigger on Up / Recovery）**：自动发送恢复通知；
  - 🟡 **性能降级（Trigger on Degraded）**：响应耗时异常升高时告警。
- **富文本与 JSON 消息模板编辑器（Custom Templates）**：
  - 支持在消息标题与正文模板中点击自动插入动态变量：
    - `{{SERVICE_NAME}}`：发生变动的服务名称
    - `{{STATUS}}`：最新状态（`UP` / `DOWN` / `DEGRADED`）
    - `{{STATUS_EMOJI}}`：状态图标（🟢 / 🔴 / 🟡）
    - `{{TIME}}`：事件触发时间
    - `{{LATENCY}}`：实时响应延迟毫秒数
    - `{{HTTP_CODE}}`：HTTP 状态码（如 502, 504）
    - `{{TARGET_URL}}`：监控目标 URL
    - `{{ERROR_MSG}}`：超时或连接拒绝具体原因
- **多元告警通道支持**：
  - 📧 **邮件告警 (Email)**：支持 Resend、SendGrid、标准 SMTP 与 Cloudflare Email Routing；
  - 🪝 **通用 Webhook**：支持自定义 URL、Auth Header 密钥与 JSON 结构体；
  - 🕊️ **国内即时通讯**：飞书 (Feishu/Lark)、钉钉 (DingTalk)、企业微信 (WeCom)；
  - ✈️ **Telegram Bot**。

---

### 2. 🎯 高级探针与协议配置 (Uptime Kuma Alignment)
- **探针协议支持**：
  - **HTTP(s) 状态码监控**：支持配置接受的状态码范围（如 `200-299,301,302`）；
  - **HTTP(s) 关键词匹配 (Keyword Match)**：响应 Body 中必须包含指定关键字；
  - **TCP 端口连通性 & DNS 查询**。
- **高级请求选项**：
  - 自定义 HTTP 请求方法（`GET` / `POST` / `PUT` / `PATCH` / `DELETE` / `HEAD`）；
  - 自定义 Request Headers 与 Request Body 负载；
  - **反向监控模式 (Upside Down Mode)**：将 200 OK 视为异常，非 200 视为正常；
  - 失败重试次数（Max Retries）与超时时间阈值。

---

### 3. 🍏 Apple 极简磨砂质感 UI
- **柔和人文排版（Humanist Typography）**：全局采用 **Plus Jakarta Sans** 与 **SF Pro Rounded** 软性字体栈，字距微调收敛，阅读舒适不刺眼。
- **无缝深浅色模式与持久化**：本地存储（`localStorage`）记忆偏好与防闪烁预加载（Zero-FOUC）。
- **90 天胶囊时间线 + 下方动态气泡（Bottom Popover Bubble）**：悬浮任意一天药丸，在下方平滑展开该日精确可用率、响应耗时及维护/故障详情（绝无顶部遮挡与截断）。
- **24 小时延迟折线图**：平滑贝塞尔曲线展示实时响应时间波动与统计（Min/Avg/Max）。
- **全自定义分类管理**：自由创建、修改服务分类，支持专属图标、名称、顶栏短标签与描述。
- **中英双语（i18n）**：顶栏一键切换简体中文与 English，动态同步 `<html lang>` 属性防止浏览器误报翻译。

---

## 📁 目录结构

```
apple-status-page/
├── worker/
│   ├── index.ts        # Cloudflare Worker 探测脚本 (Cron 定时并发探测 + RESTful API)
│   └── types.ts        # 全局状态数据结构与类型定义
├── src/
│   ├── components/
│   │   ├── Navbar.tsx            # Apple 磨砂顶部导航 (中英切换、深浅色、Admin入口)
│   │   ├── HeroStatus.tsx        # 顶部全局运行状态大卡片 (同心呼吸状态环)
│   │   ├── ServiceCard.tsx       # 服务状态卡片 (只读延迟徽章、折叠抽屉)
│   │   ├── TimelineBar.tsx       # 30/60/90 天可用率状态条与下方 Popover 气泡
│   │   ├── LatencySparkline.tsx  # 24 小时平滑延迟趋势图
│   │   ├── IncidentSection.tsx   # 故障事件与维护历史记录
│   │   ├── AdminPanel.tsx        # macOS 系统设置风格 Admin 管理面板
│   │   └── Footer.tsx            # 页脚与 JSON Feed 链接
│   ├── App.tsx                   # 状态管理、路由与中英双语协调
│   ├── i18n.ts                   # 双语强类型字典模块 (ZH / EN)
│   ├── mockData.ts               # 开箱即用的高质量演示数据源
│   ├── index.css                 # Apple 磨砂设计系统样式与软性排版
│   └── main.tsx
├── wrangler.jsonc      # Cloudflare Worker 部署配置文件 (Cron + KV 绑定)
├── package.json
└── vite.config.ts
```

---

## 🚀 本地开发与运行

```bash
# 进入项目目录
cd apple-status-page

# 安装依赖
pnpm install

# 启动本地开发服务
pnpm dev
```

- 访问前台监控看板：`http://localhost:3001`
- 访问管理控制台：`http://localhost:3001/#admin`（或点击顶栏右侧的「管理后台」按钮）

---

## ☁️ 部署到 Cloudflare（0 服务器成本）

### 1. 部署探测端 Worker (后端)

1. 在 Cloudflare 控制台创建一个 KV 命名空间（例如 `STATUS_KV`）：
   ```bash
   npx wrangler kv namespace create STATUS_KV
   ```
2. 将返回的 `id` 填入 `wrangler.jsonc`：
   ```jsonc
   "kv_namespaces": [
     {
       "binding": "STATUS_KV",
       "id": "<YOUR_KV_NAMESPACE_ID>"
     }
   ]
   ```
3. 部署 Worker：
   ```bash
   npx wrangler deploy
   ```

### 2. 部署前端看板 (Cloudflare Pages)

1. 将代码推送到 GitHub / GitLab 仓库。
2. 登录 **Cloudflare Dashboard** -> **Workers & Pages** -> **Create Application** -> **Pages**。
3. 连接你的 Git 仓库，设置构建参数：
   - **Framework preset**: `Vite`
   - **Build command**: `pnpm build`
   - **Build output directory**: `dist`
4. 点击 **Save and Deploy**，几秒内即可在全球边缘 CDN 上线。

---

## 🔒 1 分钟配置 Cloudflare Zero Trust (Access) 管理门禁

无需在代码中写任何账号密码或登录表单，直接通过 Cloudflare 边缘门禁保护你的管理后台：

1. 打开 **Cloudflare Dashboard** -> 左侧导航点击 **Zero Trust** -> 展开 **Access** -> **Applications**。
2. 点击 **Add an Application** -> 选择 **Self-hosted（自托管）**。
3. 配置应用规则：
   - **Application name**: `Status Page Admin`
   - **Application domain**: `status.yourdomain.com`（路径留空，或填 `admin*`）
4. 在 **Policies（策略）** 步骤中：
   - **Policy name**: `Admin Only`
   - **Action**: `Allow`
   - **Configure rules**:
     - **Selector**: `Emails`
     - **Value**: 填入你的管理员个人邮箱（如 `yourname@example.com`）或者 `GitHub Organization`。
5. 点击 **Save Application** 完成。
