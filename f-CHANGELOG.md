# 变更日志
## [4.4.0] - 2026-05-29 10:05
### 新增
- 开发服务器支持 HTTPS 协议，可通过示例文件: `dev.js` 中的 `https`、`httpsKey`、`httpsCert` 参数启用。
- 集成 `@flun/dns-auto-ssl` 自动生成受信任的证书，简化本地 HTTPS 配置（推荐方式）。
- 在配置选项中补充完整的 HTTPS 启用说明（含自定义证书与自动 SSL 两种方式）。
- 启动服务器时增加对证书文件存在性的校验，避免因路径错误导致服务崩溃。
- 控制台输出增加 HTTPS 协议访问提示，并在使用 localhost 访问 HTTPS 时给出警告。
### 修复:
- 修复个人资料页中硬件信息过长时导致删除按钮文字挤压样式改变的问题;
- 修复打包后运行项目时,自定义目录中的 hotReloadInjector.js 文件逻辑中对是否发送 IO 到页面判断的缺失,造成的错误提示;
### 优化:
- 将 account.js 中 cookie 的 secure 属性由固定 false 改为 'auto';
现在会根据请求是否为 HTTPS 自动设置 Secure 标志：HTTPS 下自动设为 true，HTTP 下保持 false，从而同时兼容本地开发环境和线上安全传输;