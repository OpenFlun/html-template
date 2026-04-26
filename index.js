// index.js - 统一导出接口
import { compileAllTemplates } from './compile.js';
import { runCopyFiles } from './copy-files.js';
import { startServer } from './dev-server.js';

const compile = compileAllTemplates, initProject = (options = {}) => runCopyFiles(options), startDevServer = startServer;
export { compile, initProject, startDevServer };