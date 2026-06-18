/**
 * 开发服务器模块 - 动态模板渲染服务器
 *
 * 模块结构：
 * 1. 依赖导入与服务器初始化
 * 2. 工具函数
 * 3. 全局CORS中间件和静态资源配置(/static路径)
 * 4. 服务器生命周期管理(printAvailablePages, startServer)
 * 5. 请求页面路由处理(自动路由与模板渲染) —— 已在 startServer 内部动态添加
 * 6. 热重载功能实现(文件监听、事件处理、服务器重启) —— setupHotReload, restartServer
 * 7. 导出接口与启动执行(module.exports, startServer)
 */

// ==================== 1.依赖导入与服务器初始化 ====================
import express from 'express';
import { constants, existsSync, readFileSync } from 'fs';
import http from 'http';
import https from 'https';
import { Server as socketIo } from 'socket.io';
import chokidar from 'chokidar';
import { fileURLToPath, pathToFileURL } from 'url';
import {
	path, fsPromises, CWD, getAvailableTemplates, parseServerConfig, generateUrls, findEntryFile, validateTemplateFile,
	renderTemplate, processIncludes, processVariables, loadUserFeatures, writtenFilesToIgnore, templatesAbsDir, templatesDir,
	staticDir, customizeDir, accountDir, monitorFileWrites
} from './services/templateService.js';
import { corsMiddleware, trustProxySetting } from './services/middleware.js';
import { injectScript } from './customize/hotReloadInjector.js';

let server, io, watcher, cachedPages = [], unmountMonitor = null, currentHttpsConfig = null, currentHost = 'localhost';
const __filename = fileURLToPath(import.meta.url), __dirname = path.dirname(__filename),
	app = express(), staticAbsDir = path.join(CWD, staticDir), customizeAbsDir = path.join(CWD, customizeDir),

	// ==================== 2.工具函数 ====================
	/**
	 * 创建带WebSocket的服务器（支持HTTP/HTTPS）
	 * @param {Express} app Express应用
	 * @param {boolean} hotReload 是否启用热重载
	 * @param {boolean} useHttps 是否使用HTTPS
	 * @param {string} keyPath HTTPS私钥路径（useHttps=true时必须）
	 * @param {string} certPath HTTPS证书路径（useHttps=true时必须）
	 * @returns {http.Server|https.Server} 创建的服务器实例
	 */
	createServerWithSocket = (app, hotReload, useHttps = false, keyPath = null, certPath = null) => {
		let serverInstance;
		if (useHttps) {
			try {
				// 确保文件存在
				if (!existsSync(keyPath)) throw new Error(`私钥文件不存在: ${keyPath}`);
				if (!existsSync(certPath)) throw new Error(`证书文件不存在: ${certPath}`);
				const key = readFileSync(keyPath, 'utf8'), cert = readFileSync(certPath, 'utf8');
				serverInstance = https.createServer({ key, cert }, app);
				console.log(`🔒 证书加载成功,HTTPS已启用`);
			} catch (err) {
				console.error(`❌ HTTPS证书加载失败: ${err.message}`);
				process.exit(1);
			}
		}
		else serverInstance = http.createServer(app);

		server = serverInstance;
		if (hotReload) {
			io = new socketIo(server);
			io.engine.on("headers", headers => headers["Content-Type"] = "text/html; charset=utf-8");
		}
		return server;
	},

	/**
	 * 清理资源
	 */
	cleanupResources = () => {
		if (watcher) watcher.close(), watcher = null;
		if (io) io.close(), io = null;
		if (unmountMonitor) unmountMonitor(); unmountMonitor = null;
	},

	/**
	 * 递归复制目录
	 */
	copyDir = async (src, dest) => {
		await fsPromises.mkdir(dest, { recursive: true });
		const entries = await fsPromises.readdir(src, { withFileTypes: true });
		for (let entry of entries) {
			const srcPath = path.join(src, entry.name), destPath = path.join(dest, entry.name);
			if (entry.isDirectory()) await copyDir(srcPath, destPath);
			else await fsPromises.copyFile(srcPath, destPath);
		}
	},

	/**
	* 根据启用状态同步 account 相关文件（统一备份目录）
	* - 启用时：若主目录已有文件则保留,否则从备份恢复或复制默认
	* - 停用时：将主目录文件移动到备份目录
	* @param {boolean} enable - true 启用,false 停用
	*/
	syncAccountFiles = async (enable) => {
		const backupRoot = path.join(CWD, 'account_bak'), jsFile = path.join(customizeAbsDir, 'account.js'),
			jsBak = path.join(backupRoot, 'account.js'), dirAccount = path.join(CWD, templatesDir, accountDir),
			dirBak = path.join(backupRoot, accountDir), pkgCustomizeDir = path.join(__dirname, customizeDir),
			pkgTemplatesDir = path.join(__dirname, templatesDir);

		if (enable) {
			// 1. 处理 account.js
			let jsExists = false;
			try {
				await fsPromises.access(jsFile, constants.F_OK), jsExists = true;
			} catch (_) { /* 不存在 */ }

			if (!jsExists) {
				// 尝试从备份恢复
				let restored = false;
				try {
					await fsPromises.access(jsBak, constants.F_OK);
					await fsPromises.mkdir(customizeAbsDir, { recursive: true });
					await fsPromises.rename(jsBak, jsFile);
					console.log('✅ 已从备份恢复 account.js'), restored = true;
				} catch (_) { /* 备份不存在 */ }

				if (!restored) {
					// 从包内复制默认
					console.log('检测到 account=true 但缺少 customize/account.js,正在从包内复制默认...');
					try {
						const defaultAccountJs = path.join(pkgCustomizeDir, 'account.js');
						await fsPromises.access(defaultAccountJs, constants.F_OK);
						await fsPromises.mkdir(customizeAbsDir, { recursive: true });
						await fsPromises.copyFile(defaultAccountJs, jsFile);
						console.log('✅ 已复制默认 account.js');
					} catch (err) {
						console.error('❌ 默认 account.js 不存在或复制失败:', err.message);
					}
				}
			}

			// 2. 处理 templates/account 目录
			let dirExists = false;
			try {
				await fsPromises.access(dirAccount, constants.F_OK), dirExists = true;
			} catch (_) { /* 不存在 */ }

			if (!dirExists) {
				let dirRestored = false;
				try {
					await fsPromises.access(dirBak, constants.F_OK);
					await fsPromises.rename(dirBak, dirAccount);
					console.log('✅ 已从备份恢复 templates/account 目录'), dirRestored = true;
				} catch (_) { /* 备份不存在 */ }

				if (!dirRestored) {
					console.log('检测到 account=true 但缺少 templates/account 目录,正在从包内复制默认...');
					try {
						const defaultTemplatesAccount = path.join(pkgTemplatesDir, accountDir);
						await fsPromises.access(defaultTemplatesAccount, constants.F_OK);
						await copyDir(defaultTemplatesAccount, dirAccount);
						console.log('✅ 已复制默认 templates/account 目录');
					} catch (err) {
						console.error('❌ 默认 templates/account 目录不存在或复制失败:', err.message);
					}
				}
			}

		} else {
			// 1. 备份 account.js
			try {
				await fsPromises.access(jsFile, constants.F_OK);
				if (await fsPromises.access(jsBak, constants.F_OK).then(() => true).catch(() => false))
					await fsPromises.unlink(jsBak);
				await fsPromises.mkdir(backupRoot, { recursive: true });
				await fsPromises.rename(jsFile, jsBak);
				console.log('📦 已备份 account.js 到 account_backup');
			} catch (_) { /* 文件不存在,无需备份 */ }

			// 2. 备份 templates/account 目录
			try {
				await fsPromises.access(dirAccount, constants.F_OK);
				if (await fsPromises.access(dirBak, constants.F_OK).then(() => true).catch(() => false))
					await fsPromises.rm(dirBak, { recursive: true, force: true });
				await fsPromises.mkdir(backupRoot, { recursive: true });
				await fsPromises.rename(dirAccount, dirBak);
				console.log('📦 已备份 templates/account 目录到 account_backup');
			} catch (_) { /* 目录不存在,无需备份 */ }
		}
	};


// ==================== 3.全局CORS中间件和静态资源配置 ====================
app.use(corsMiddleware);
app.set('trust proxy', trustProxySetting);
app.use('/static', express.static(staticAbsDir));

// ==================== 4.服务器生命周期管理 ====================
/**
 * 控制台输出可访问页面信息
 * @param {string[]} pages - 有效的模板文件名集合
 * @param {number} port - 服务器端口号
 * @param {boolean} hotReload - 是否启用热重载
 * @param {boolean} useHttps - 是否使用HTTPS
 * @param {string} host - 服务器主机名
 */
const printAvailablePages = (pages, port, hotReload, useHttps, host) => {
	const protocol = useHttps ? 'https' : 'http';
	console.log(`开发服务器启动成功!\n访问地址: ${protocol}://${host}:${port}`);
	if (hotReload) console.log(`✅ 热重载功能已启用(监听目录->${templatesAbsDir},${staticDir},${customizeDir})`);

	if (useHttps && (host === 'localhost' || host === '127.0.0.1')) {
		console.warn('⚠️  警告: 使用 HTTPS 访问 localhost 会导致浏览器证书安全警告（自签名证书或证书域名不匹配）');
		console.warn('   请使用 --host 参数指定与证书 CN/SAN 匹配的域名,例如: --host www.abc.com');
	}

	console.log('\n可访问页面:');
	pages.sort().forEach(page => {
		const { url, encodedUrl, needsEncoding } = generateUrls(page, port, useHttps, host);
		if (needsEncoding) console.log(`  原始路径: ${url} (需复制访问)\n  编码路径: ${encodedUrl} (直接访问)`);
		else console.log(`  直接访问: ${url}`);
	});
	console.log(`\n共发现 ${pages.length} 个可用模板`), console.log('-----------------------------------');
};

/**
 * 服务器启动主函数
 * >查看定义:@see {@link startServer}
 * @async
 * @param {Object} [options] - 配置对象
 * @param {number} [options.port] - 可选端口号
 * @param {string} [options.host] - 服务器主机名（默认localhost）
 * @param {boolean} [options.hotReload] - 是否启用热重载
 * @param {boolean} [options.account] - 是否启用登录模式
 * @param {boolean} [options.https] - 是否启用HTTPS
 * @param {string} [options.httpsKey] - HTTPS私钥路径（启用HTTPS时必须）
 * @param {string} [options.httpsCert] - HTTPS证书路径（启用HTTPS时必须）
 * @returns {Promise<number>} 启动成功后返回实际使用的端口号
 */
const startServer = async (options = {}) => {
	try {
		const config = parseServerConfig(options),
			{ port, host, hotReload, account, httpsEnabled, httpsKeyPath, httpsCertPath } = config,

			// 保存配置到文件（用于后续编译时沿用）
			configToSave = {
				port, host, https: httpsEnabled, httpsKey: httpsKeyPath, httpsCert: httpsCertPath
			};
		await fsPromises.writeFile(path.join(CWD, '.dev-config.json'), JSON.stringify(configToSave, null, 2), 'utf8');

		currentHttpsConfig = { https: httpsEnabled, keyPath: httpsKeyPath, certPath: httpsCertPath };
		currentHost = host;

		await syncAccountFiles(account), await loadUserFeatures(app);
		cachedPages = await getAvailableTemplates();

		// 核心模板渲染中间件
		app.use(async (req, res, next) => {
			try {
				const decodedPath = decodeURIComponent(req.path);
				if (decodedPath === '/') {
					const entryFile = await findEntryFile(cachedPages);
					return res.redirect(`/${entryFile}`);
				}
				const templateFile = decodedPath.endsWith('.html') ? decodedPath.slice(1) : `${decodedPath.slice(1)}.html`;
				if (cachedPages.includes(templateFile)) {
					let rendered = await renderTemplate(templateFile);
					rendered = await processIncludes(rendered, templateFile);
					rendered = processVariables(rendered, { currentUrl: decodedPath, query: req.query ? JSON.stringify(req.query) : '' });
					if (io) rendered = injectScript(rendered);
					return res.type('html').send(rendered);
				}
				next();
			} catch (error) {
				console.error(`处理请求时出错: ${error.message}`, error.stack);
				next(error);
			}
		});

		for (const page of cachedPages) await validateTemplateFile(page, true);

		if (hotReload) setupHotReload();
		createServerWithSocket(app, hotReload, httpsEnabled, httpsKeyPath, httpsCertPath);
		printAvailablePages(cachedPages, port, hotReload, httpsEnabled, host);

		server.listen(port, () => {
			console.log(`服务器运行中,按 Ctrl+C 退出`), console.log('-----------------------------------');
		});
		return port;
	} catch (error) {
		console.error('服务器启动失败:', error.message);
		process.exit(1);
	}
},

	// ==================== 6.热重载功能实现 ====================
	/**
	 * 设置文件监听和热重载功能
	 */
	setupHotReload = () => {
		const watchDirs = [templatesAbsDir, staticAbsDir, customizeAbsDir].filter(dir => existsSync(dir));
		if (watchDirs.length === 0) return console.warn('[热重载] 没有可监听的目录');

		unmountMonitor = monitorFileWrites();
		const handleFileEvent = (event, filePath) => {
			const normalizedPath = path.normalize(filePath);
			if (writtenFilesToIgnore.includes(normalizedPath)) return;

			const isBackendFile = filePath.startsWith(customizeAbsDir);
			if (isBackendFile) {
				console.log(`检测到${event}了${normalizedPath}后端文件,[热重载] 执行服务器重启并刷新页面...`);
				io.emit('hot-reload', 3500);
				setTimeout(() => restartServer(), 500);
			} else {
				console.log(`检测到${event}了${normalizedPath}前端文件,[热重载] 已刷新页面...`);
				if (event === '删除' && filePath.startsWith(templatesAbsDir) && filePath.endsWith('.html')) {
					const templateName = path.relative(templatesAbsDir, filePath).replace(/\\/g, '/');
					cachedPages = cachedPages.filter(page => page !== templateName);
				}
				io.emit('hot-reload', 100);
			}
		};

		watcher = chokidar.watch(watchDirs, {
			ignored: /(^|[\/\\])\../, persistent: true, ignoreInitial: true
		});
		watcher.on('change', (filePath) => handleFileEvent('更改', filePath))
			.on('add', (filePath) => handleFileEvent('添加', filePath))
			.on('unlink', (filePath) => handleFileEvent('删除', filePath))
			.on('error', (error) => console.error('[热重载] 文件监听错误:', error));
	},

	/**
	 * 重启服务器（保持HTTPS和主机名配置）
	 */
	restartServer = async () => {
		try {
			if (!currentHttpsConfig) return console.error('[热重载] 无法获取当前HTTPS配置,重启失败');

			const port = server.address().port, { https, keyPath, certPath } = currentHttpsConfig, host = currentHost;
			cleanupResources();
			server.close(async () => {
				await loadUserFeatures(app, false, true);
				cachedPages = await getAvailableTemplates();
				createServerWithSocket(app, true, https, keyPath, certPath);
				server.listen(port, () => setupHotReload());
				printAvailablePages(cachedPages, port, true, https, host); // 重启后重新打印可访问页面
			});
		} catch (error) {
			console.error('[热重载] 重启过程中发生错误:', error);
		}
	};

// ==================== 7.导出接口与启动执行 ====================
export { startServer };
if (process.argv[1] === __filename) startServer().catch(error => (console.error('服务器启动失败:', error), process.exit(1)));