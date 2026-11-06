# 变更日志

## [6.0.1] - 2026-11-06 11:43
- 优化了一些细节体验;

## [6.0.0] - 2026-11-04 19:58
### 破坏性变更
- `package.json` 的 `scripts.dev` 改名为 `scripts.start`;此前通过 `npm run dev` 启动的脚本需改为 `npm run start`;

### 新增
- 新增命令行入口 `bin/cli.js`,注册命令 `html-template`;
- 命令行支持 `start`、`build`、`restore`、`help` 四个子命令,选项与函数参数一一对应;
- `startDevServer(options, defaults)` 新增 `defaults` 参数,优先级低于 `options` 与环境变量,
  高于内置默认值;命令行入口据此读取项目根目录的 `.dev-config.json`;
- 新增依赖 `chalk`,用于终端按语义着色;

### 修复
- `.dev-config.json` 此前只被 `compile` 读取,`start` 每次都用内置默认值;现由命令行入口作为默认值传入,
  未传参时沿用上次配置;

### 文档
- README 新增「命令行」章节,含快速开始、命令表、选项表、配置优先级、自定义入口文件;
- README 参考配置章节按函数参数重写,命令行选项统一指向「命令行」章节;
- README 函数方式快速开始与命令行保持一致,新增 `initProject` 小节;
- README 移除「项目维护」章节;目录结构按文件类型分组,与 `package.json` 的 `files` 字段顺序一致;
- `package.json` 的 `files` 字段按目录、源文件、类型声明、文档、许可五类分组;
- `@flun/help` 已弃用,替代包为 `@flun/flun`,查看全部作用域包改用 `npx @flun/flun pkgs`;
  此前版本 CHANGELOG 中的旧表述属历史记录,不再回改;