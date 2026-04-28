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
 *    -
 * ```js
 *  // 启动服务器示例
 * import { startDevServer } from 'flun-html-template';
 *  startDevServer({ port: 7296, hotReload: true, account: false }); // 默认参数:开发服务器端口7296,启用热更新,不启用登录系统;
 *
 *  // -----------------------------------------------
 *  // 恢复包示例文件
 *  import { initProject } from 'flun-html-template';
 *  initProject({
 *      mode: 'skip-dirs',  // 模式:跳过已存在的文件(默认)
 *      verbose: false,     // 禁用控制台详细输出(静默模式)
 *      account: false      // 禁用登录系统(登录验证系统文件)
 *  });
 *
 *  // -----------------------------------------------
 *  // 编译模板示例
 *  import { compile } from 'flun-html-template';
 *  compile({outputDir: 'my-dist'}); // 可选参数:指定输出目录,默认为'dist'
 * ```
 *    -
 */
declare module './index.js' {
    // ==================== 核心函数类型 ====================

    /**
     * 启动开发服务器
     * @param {Object} [options] - 配置对象
     * @param {number} [options.port] - 可选端口号(默认7296)
     * @param {boolean} [options.hotReload] - 是否启用热重载(默认启用)
     * @param {boolean} [options.account] - 是否启用登录模式(默认禁用)
     * @returns Promise<number> 实际使用的端口号
     *
     * @example
     * ```javascript
     * import { startDevServer } from 'flun-html-template';
     * // 方式1: 使用默认端口,热重载和登录系统设置
     *      startDevServer();
     *
     * // 方式2: 指定端口并禁用热重载,启用登录系统
     *      startDevServer({ port: 8080, hotReload: false, account: true });
     *
     * // 方式3: 使用async/await
     * (async () => {
     *   try {
     *           await startDevServer({ port: 3000, hotReload: true, account: false });
     *      } catch (error) {
     *           console.error('服务器启动失败:', error);
     *      }
     * })();
     * ```
     */
    export function startDevServer(options?: { port?: number; hotReload?: boolean; account?: boolean }): Promise<number>;

    /**
     * 初始化项目文件
     * 提供与命令行工具相同的文件拷贝功能，支持多种复制模式
     *
     * 【拷贝行为说明】
     * -
     * - 默认行为(skip-dirs):
     *   - 跳过已存在的目录,没有的目录执行复制
     *   - 根目录已有的文件跳过,根目录没有的文件复制
     *
     * 【通过命令行调用时的参数对应关系】
     * 1. --overwrite     → mode: 'overwrite'  (覆盖所有已存在的文件和目录)
     * 2. --skip-files    → mode: 'skip-files' (跳过所有已存在的文件,仅复制新文件)
     * 3. --skip-dirs     → mode: 'skip-dirs'  (跳过已存在的目录)
     *  - --account       → account: true      (启用登录系统文件)
     *  - --no-account    → account: false     (禁用登录系统文件)
     *  - --verbose       → verbose: true      (显示详细执行记录)
     *  - --help          → 显示帮助信息(仅在命令行调用时生效)
     *
     * 【特殊处理文件】
     * 不受模式影响的文件(总是覆盖)：
     *   f-README.md、f-CHANGELOG.md
     *
     * 【拷贝项目列表】
     * -
     *   - templates, customize, static, .env, dev.js, build.js, restoreDefault.js, f-README.md, f-CHANGELOG.md
     *
     * @param options 初始化选项
     * @returns Promise<void>
     *
     * @example
     * ```javascript
     * import { initProject } from 'flun-html-template';
     *
     * // 示例1: 使用默认设置（跳过已存在的目录）
     * initProject().then(() => {
     *   console.log('项目初始化完成（跳过已存在的目录）');
     * });
     *
     * // 示例2: 覆盖所有文件并显示详细信息
     * initProject({
     *   mode: 'overwrite',
     *   verbose: true
     * }).then(() => {
     *   console.log('已覆盖所有项目文件');
     * });
     *
     * // 示例3: 仅复制新文件（跳过已存在的文件并且安装登录系统文件）
     * initProject({
     *   mode: 'skip-files',
     *   verbose: false  // 静默模式
     *   account: false  // 禁用登录系统文件
     * }).then(() => {
     *   console.log('仅复制了新文件');
     * });
     *
     * // 示例4: 在异步函数中使用
     * async function setupProject() {
     *   try {
     *     await initProject({ mode: 'overwrite' });
     *     console.log('项目文件已完全恢复');
     *   } catch (error) {
     *     console.error('初始化失败:', error);
     *   }
     * }
     *
     * ```
     */
    export function initProject(options?: InitProjectOptions): Promise<void>;

    /**
     * 编译所有模板文件
     * 将模板文件编译为最终的HTML文件,默认生成到dist目录中
     *
     * @returns Promise<void>
     *
     * @example
     * ```javascript
     * import { compile } from 'flun-html-template';
     *
     * // 示例1: 基础编译
     * compile().then(() => {
     *   console.log('模板编译完成，文件已生成到dist目录');
     * });
     *
     * // 示例2: 在构建流程中使用
     * async function buildProject() {
     *   console.log('开始编译模板...');
     *   await compile({ outputDir: 'my-dist' }); // 可选参数:指定输出目录
     *   console.log('模板编译完成，开始打包静态资源...');
     *   // 这里可以添加其他构建步骤
     * }
     *
     * // 示例3: 错误处理
     * compile().catch(error => {
     *   console.error('编译过程中发生错误:');
     *   console.error('错误信息:', error.message);
     *   console.error('请检查模板语法是否正确');
     * });
     * ```
     */
    export function compile(): Promise<void>;

    // ==================== 选项接口 ====================

    /**
     * 项目初始化选项
     *
     * 此选项接口与命令行参数一一对应,用于编程方式调用时控制文件复制行为
     */
    export interface InitProjectOptions {
        /**
         * 文件复制模式:
         *  - 'overwrite': 覆盖所有已存在的文件和目录
         *  - 'skip-files': 跳过所有已存在的文件,仅复制新文件
         *  - 'skip-dirs':  跳过已存在的目录(默认)
         * @default 'skip-dirs'
         */
        mode?: 'overwrite' | 'skip-files' | 'skip-dirs';

        /**
         * 是否启用详细输出模式,显示详细的操作日志
         * 对应命令行参数 --verbose
         * @default false
         */
        verbose?: boolean;

        /**
         * 是否启用登录系统文件的复制
         * 对应命令行参数 --account / --no-account
         * @default false
         */
        account?: boolean;
    }
}