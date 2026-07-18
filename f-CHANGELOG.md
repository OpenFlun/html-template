# 变更日志
## [5.1.1] - 2026-07-18 22:36
### 优化
- 进一步优化`browser.js` 文件->只要是 Windows 环境并且hello可用,都优先调用底层 Windows hello;
## [5.1.0] - 2026-07-16 19:53
### 新增
- `browser.js` 文件新增对 @flun/desktop-builder + @flun/webauthn-server 构建的桌面应用前端认证支持(调用底层 Windows hello);
## [5.0.33] - 2026-07-13 11:49
### 优化
- 对静态目录文件和模板目录文件整体细节做了一次优化;