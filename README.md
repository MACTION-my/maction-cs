# Maction 客服中心

红色品牌 CRM：课程、Preview 场次、客户筛选、Stage、Team Notes、转场记录、课程自动分配与广告消费记录。

## Firebase 部署

- Firebase project: `maction-cs`
- Next.js + Firebase App Hosting；Firebase Google 登录与 HttpOnly session cookie；Firestore 使用服务器 Admin SDK。
- 登录白名单由 App Hosting 环境变量 `CRM_ALLOWED_EMAILS` 控制，默认管理员 marketing.maction@gmail.com。负责人名单不会自动授权登录。
- Google 登录需在 Firebase Authentication 启用，并允许 App Hosting 网站域名。
- `apphosting.yaml` 保存非敏感配置；Meta Token、App Secret 与 Verify Token 通过 Secret Manager 配置，切勿提交到 Git。
- App Hosting 使用默认服务身份访问 Firestore / Firebase Auth，部署环境不需要下载服务账号私钥。
- `firebase deploy --only apphosting --project maction-cs` 发布源码。

## Meta 直接接入

Callback: 当前 Firebase 网站的 `/api/integrations/meta`。GET 验证 Verify Token；POST 校验 Meta HMAC，再保存 Firestore 接收记录并读取 Lead。按广告账号、Page ID、Form ID 匹配课程并分配下一场／负责人。没有 GHL 依赖。

需要配置 `META_APP_SECRET`, `META_VERIFY_TOKEN`, `META_GRAPH_VERSION`, `META_PAGE_TOKENS`（Page ID → Token 的 JSON）。Token 必须能读取 Page Lead 和对应广告归因。Meta App 权限、Page leadgen 订阅、App Review 和真实测试仍需要完成；不因部署网站而自动接通。

重复 Lead ID 去重；同课程重复电话追加报名 Notes；无匹配规则或读取失败保留待处理。每次通知最多同步处理 2 条；当前通过 Meta 连接页手动重试，每次 5 条。高流量需升级至任务队列、自动重试与定期对账。

## 数据与范围

Firestore `maction_crm/workspace` 保存带版本号的 CRM JSON，事务防止覆盖并发更新；900KB 应用容量保护。`maction_meta_inbox` 保存通知处理状态。公开客户端规则禁止读写这些集合，只能走认证的服务器 API。

初始工作区为空；示例数据只在主动加载时生成。原 Sites 工作区数据不会自动复制。广告报告已接入 Meta Insights；手动消费记录独立保留。WhatsApp／OpenAI 尚未授权，不会自动发送。

## 本地检查

`npm ci` · `npm run typecheck` · `npm test` · `npm run build`

本地运行数据操作需要自己的 Firebase Admin ADC 或 Firestore Emulator；不要在生产启用模拟登录，也不要相信客户端传来的身份 Headers。

## Meta Ads Report

META_ADS_TOKEN 通过 Secret Manager 保存具有 ads_read 的用户 Token，META_AD_ACCOUNTS 为账户清单。到期或撤销后需要重新授权。服务器读取 Campaign 每日 Insights，存入 maction_ads 账户／日期文档；重复同步覆盖同一天，不重复累计。客户端禁止直接读取。

广告成效页支持账户／日期筛选、CSV、花费、展示、点击、原生表单 Lead 和 CPL，每次最多 31 天，币种分别汇总。Lead 只计 onsite_conversion.lead_grouped，避免重复累计。打开页面时缓存超过 15 分钟或日期不完整会同步，另有手动同步按钮；未配置无人值守定时任务。Meta 归因提交数可能与 CRM 去重客户数不同。

## 团队权限

总管理员由 CRM_ALLOWED_EMAILS 指定。总管理员在团队人员中填写已验证 Google 邮箱、开启登录、勾选授权课程／项目。负责人分配名单和登录授权分别维护，避免仅因被分配为负责人而自动获得访问权。每次 API 请求均重新读取有效权限，停用成员、关闭登录或移除课程权限对后续请求立即生效。团队 CRM 响应只包含授权课程的场次与客户，管理成员、课程、规则、广告账户及 Meta 接收记录仅管理员开放。所有 Firestore 客户端访问默认拒绝，必须通过认证的服务器 API。Google 账号 MFA 由各自账号的安全设置开启。
