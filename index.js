// index.js - 统一导出接口
import { runCopyFiles } from './copy-files.js';
import { compileAllTemplates } from './compile.js';
import { startServer } from './dev-server.js';

const compile = compileAllTemplates, startDevServer = startServer, initProject = (options = {}) => runCopyFiles(options);
export { compile, startDevServer, initProject };