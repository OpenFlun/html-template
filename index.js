// index.js - 统一导出接口
export { compileAllTemplates as compile } from './compile.js';
export { runCopyFiles as initProject } from './copy-files.js';
export { startServer as startDevServer } from './dev-server.js';