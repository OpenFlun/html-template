import {
    path, fsPromises, CWD, templatesDir, templatesAbsDir, staticDir, customizeDir, accountDir, defaultPort,
    writtenFilesToIgnore, getAvailableTemplates, findEntryFile, validateTemplateFile, renderTemplate, processIncludes,
    setCompilationMode, getIncludedFiles, processVariables, loadUserFeatures, monitorFileWrites
} from './services/templateService.js';
import { compileAllTemplates } from './compile.js';
import { runCopyFiles } from './copy-files.js';
import { startServer } from './dev-server.js';
import { injectScript } from './customize/hotReloadInjector.js';

// =================================== services/templateService.js ===================================
/**
 * ```js
 * // 文件导出内容
 *
 * // 模块常量:
 * path;                            // Node.js 路径处理模块
 * const fsPromises;                // Node.js 异步文件系统操作 (fs.promises)
 * const CWD;                       // 当前工作目录绝对路径
 * const templatesDir;              // 模板目录名称 ("templates")
 * const templatesAbsDir;           // 模板目录绝对路径
 * const staticDir;                 // 静态资源目录名称 ("static")
 * const customizeDir;              // 用户自定义功能目录名称 ("customize")
 * const accountDir;                // 账户目录名称 ("account")
 * const defaultPort;               // 默认服务端口 (7296)
 * const writtenFilesToIgnore = []; // 热重载时需忽略的文件路径列表
 *
 * // 函数列表:
 * getAvailableTemplates();         // 获取所有可用模板文件（排除 base.html）
 * findEntryFile();                 // 动态识别入口文件('@entry'标记 > 优先级列表 > 首字母排序)
 * validateTemplateFile();          // 验证模板文件标签结构完整性
 * renderTemplate();                // 核心模板渲染（处理 extends 继承与区块合并）
 * processIncludes();               // 递归处理 [include] 包含指令
 * setCompilationMode();            // 设置编译模式并清空依赖记录
 * getIncludedFiles();              // 获取编译过程中记录的所有被包含文件
 * processVariables();              // 模板变量替换、表达式求值与用户函数执行入口
 * loadUserFeatures();              // 从 customize 目录加载用户路由、函数和变量
 * monitorFileWrites();             // 启动文件写入监控（用于热重载排除）
 * ```
 * >查看定义:@see
 * - 常量:{@link path}、{@link fsPromises}、{@link CWD}、{@link templatesDir}、{@link templatesAbsDir}、{@link staticDir}、
 *{@link customizeDir}、{@link accountDir}、{@link defaultPort}、{@link writtenFilesToIgnore}
 * - 函数:{@link getAvailableTemplates}、{@link findEntryFile}、{@link validateTemplateFile}、{@link renderTemplate}、
 *{@link processIncludes}、{@link setCompilationMode}、{@link getIncludedFiles}、{@link processVariables}、
 *{@link loadUserFeatures}、{@link monitorFileWrites}
 */
declare module './services/templateService.js' {
    export * from './services/templateService.js';
}

// =================================== compile.js ===================================
/**
 * ```js
 * // 文件导出内容
 * compileAllTemplates(); // 全量模板编译与打包
 * ```
 * >查看定义:@see {@link compileAllTemplates}
 */
declare module './compile.js' {
    export * from './compile.js';
}

// =================================== copy-files.js ===================================
/**
 * ```js
 * // 文件导出内容
 * runCopyFiles(); // 运行文件复制
 * ```
 * >查看定义:@see {@link runCopyFiles}
 */
declare module './copy-files.js' {
    export * from './copy-files.js';
}

// =================================== dev-server.js ===================================
/**
 * ```js
 * // 文件导出内容
 * startServer(); // 启动开发服务器
 * ```
 * >查看定义:@see {@link startServer}
 */
declare module './dev-server.js' {
    export * from './dev-server.js';
}

// =================================== customize/hotReloadInjector.js ===================================
/**
 * ```js
 * // 文件导出内容
 * injectScript(); // 注入热重载脚本
 * ```
 * >查看定义:@see {@link injectScript}
 */
declare module './customize/hotReloadInjector.js' {
    export * from './customize/hotReloadInjector.js';
}

// =================================== 模块导出入口 ===================================
/**
 * HTML开发服务器模块 主要功能：
 * ```js
 * startDevServer(); // 启动开发服务器
 * initProject();    // 初始化模板文件
 * compile();        // 编译所有模板文件
 * ```
 * ---
 * >查看定义:@see {@link startDevServer}、{@link initProject}、{@link compile}
 * >
 * @example
 *  // 启动服务器示例
 * import { startDevServer } from '@flun/html-template';
 *  startDevServer({ port: 7296, hotReload: true, account: false }); // 默认参数:开发服务器端口7296,启用热更新,不启用登录系统;
 *
 *  // -----------------------------------------------
 *  // 恢复包示例文件
 *  import { initProject } from '@flun/html-template';
 *  initProject({
 *      mode: 'skip-dirs',  // 模式:跳过已存在的文件(默认)
 *      verbose: false,     // 禁用控制台详细输出(静默模式)
 *      account: false      // 禁用登录系统(登录验证系统文件)
 *  });
 *
 *  // -----------------------------------------------
 *  // 编译模板示例
 *  import { compile } from '@flun/html-template';
 *  compile({outputDir: 'my-dist'}); // 可选参数:指定输出目录,默认为'dist'
 */
declare module './index.js' {
    export { compileAllTemplates as compile } from './compile.js';
    export { runCopyFiles as initProject } from './copy-files.js';
    export { startServer as startDevServer } from './dev-server.js';
}