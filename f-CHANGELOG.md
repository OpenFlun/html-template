# 变更日志
## [5.1.2] - 2026-07-20 15:38
### 优化
- 对'browser.js'文件做了一些细节上的优化;
- 对依赖包进行了更新;
## [5.1.1] - 2026-07-18 22:36
### 优化
- 进一步优化`browser.js` 文件->只要是 Windows 环境并且hello可用,都优先调用底层 Windows hello;
## [5.1.0] - 2026-07-16 19:53
### 新增
- `browser.js` 文件新增对 @flun/desktop-builder + @flun/webauthn-server 构建的桌面应用前端认证支持(调用底层 Windows hello);