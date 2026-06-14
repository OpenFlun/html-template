# 变更日志
## [5.0.16] - 2026-06-14 20:20
### 优化
- 将'public.css'中的部分样式分离到'base.html'中,使公共变量更加通用,避免携带冗余样式;
- 对'constants.css'中的3个'--header-link + X'替换成了'--link + X',使其也适应更多场景;
- 将'base.html'中的个人中心标签的隐藏属性也统一为'hidden'字段,另外也对'auth.js'做了同步调整;
### 修复
- 修复了'profile.html'文件中漏掉'constants.css'文件导入的问题;

## [5.0.7] - 2026-06-12 21:49
### 重构与优化
- **模块导出统一化**：
  - `account.js` 中的 accountRouter 函数改为在末尾统一导出;
- **邮件发送函数优化**：
  - 将 `sendEmail` 参数改为对象形式，支持自定义 `from` 字段，默认使用网站邮箱。
  - 新增 `transporter` 有效性检查，若创建失败则直接退出进程，避免后续运行时错误。
  - 移除 `sendEmail` 内部冗余的 `if (transporter)` 判断，简化代码逻辑。
- 优化 `routes.js` 中 `if (!accountRouter)` 的判断逻辑;