# 诉状工作人员后台

**在线工作台：[点击打开 GitHub 网页版](https://tophung48162-cell.github.io/lawsuit-staff-admin/)**

GitHub Pages 托管页面，案件与收退款连接原云端数据库，免登录使用。

人身损害诉状服务的工作人员网页后台，支持手机与电脑。采用 React、TypeScript、Vinext、Cloudflare Workers 和 D1 数据库。

## 功能

- 案件新建、搜索、办理状态跟进。
- 收款与退款台账；退款关联原收款并检查可退余额。
- 金额按整数分存储，保留操作记录，重复请求不重复入账。
- 按日期、经办人、渠道和类型筛选；按月、经办人、渠道汇总；CSV 导出。
- 手机底部导航、卡片列表、全屏单列表单和日期快捷筛选。
- `/api/dify?q=本月统计` 提供确定性计算的统计文本，可接入 Dify HTTP 请求节点。

## 重要说明

当前源码为用户选择的**公开免登录版本**。任何能够访问部署地址的人都能读取案件、联系方式、收退款和操作日志，并进行登记及状态更新。经办人字段未经身份验证，操作人标记为“公开访客”。正式处理个人或财务信息前，应实现身份验证和服务端权限校验。

本仓库不含线上数据库、真实案件、账户密码、Dify 密钥或 Sites 发布凭证；开源许可针对代码，不授权获取或公开他人的业务数据。

这不是微信小程序，也没有微信一键登录。移动端网页可以按手机宽度显示，但具体域名能否在微信中打开取决于托管与微信的访问策略，发布源码或启用 GitHub Pages 不保证解决域名拦截。

## 本地运行

需要 Node.js 22.13 或以上、npm，以及 Python 3（仅用于可选测试）。

```sh
npm run install:ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_tired_electro.sql
npm run dev
```

访问启动日志中的本机地址（默认 `http://127.0.0.1:5173`）。本地 D1 数据写入 `.wrangler/`，不会提交到 Git。

修改 `db/schema.ts` 后使用 `npm run db:generate` 生成新增迁移；不要重复执行已经应用的 SQL 文件。

```sh
npx tsc --noEmit
npm run build
```

## 部署

应用依赖服务端 API 与 D1，**不能仅靠 GitHub Pages 运行完整后台**。GitHub Pages 只托管静态内容；不能执行本项目的案件/收退款写入接口。

- **Sites**：`.openai/hosting.json` 仅保留逻辑绑定 `DB`，已移除原站点身份。新建自己的 Site 后填入自己的 `project_id`，再按对应发布流程构建部署。不要复用他人的站点身份或凭证。
- **独立 Cloudflare Workers**：构建产生 `dist/server/wrangler.json`。部署前配置你自己的 Worker 名称、D1 数据库 ID、域名及认证策略，先应用 `drizzle/` 中的迁移，再使用自己的 Cloudflare 账号发布。模板中用于本地开发的全零数据库 ID 不是生产数据库。
- Dify 接入时使用你自己部署的 `/api/dify`，按需传入 `q` 参数；生产部署应先为接口增加鉴权。

## 项目结构

```text
app/                    页面、手机界面、业务与统计 API
app/api/office/         案件、收退款及操作记录
app/api/dify/           汇总统计接口
app/chatgpt-auth.ts     保留的可选 Sites 登录辅助函数（公开版未启用）
db/                     Drizzle 数据结构
drizzle/                数据库迁移
scripts/                构建及本地开发辅助工具
worker/                 Cloudflare Worker 入口
```

## 许可证与第三方声明

业务代码使用 [MIT License](LICENSE)。保留的 Sites Vite 插件见 `scripts/vite/sites-vite-plugin.LICENSE`，样式资源声明见 `vendor/shadcn-tailwind-4.13.0.LICENSE.md`；依赖包适用各自许可证。

## GitHub Pages 前端

执行 `npm run build:pages` 生成 `docs/`，在仓库 Settings → Pages 选择 `main` 分支的 `/docs` 目录发布。该入口使用 `vite.pages.config.ts` 中的云端 API 地址；案件及收退款仍由该 API 的数据库保存。更换服务地址后需重新构建。

首次连接必须在 API 端允许该 GitHub Pages 来源的 CORS 请求与 JSON POST 预检。若接口受到网络或微信拦截，网页会提示无法连接；不会把未保存的数据报为成功。本地静态网页不保存独立的真实台账。
