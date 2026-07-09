/**
 * 模板编译与打包工具
 *
 * 模块结构：
 * 1. 递归目录复制工具（copyDir）
 * 2. 路由文件处理及入口文件生成
 *    - 路由检测（checkUserRoutesExist）
 *    - 入口文件生成（generateServerEntry）—— 支持沿用开发配置（端口/HTTPS/证书/host）
 *    - 依赖管理（mergeDependencies → 返回完整 package.json）
 * 3. 编译模板所有文件（compile）
 * 4. 批量编译主流程（compileAllTemplates）
 * 5. 导出接口与执行编译
 *
 * 核心改进：
 * - 复用 parseServerConfig 读取开发阶段配置（端口、HTTPS、证书、主机名）
 * - 生成的 server.js 严格沿用这些配置，不擅自改变默认行为
 * - 若启用 HTTPS 则自动复制证书文件到输出目录/certs
 */
import {
	path, fsPromises, CWD, getAvailableTemplates, parseServerConfig, validateTemplateFile, renderTemplate, processIncludes,
	processVariables, setCompilationMode, getIncludedFiles, loadUserFeatures, findEntryFile, templatesDir, staticDir, customizeDir
} from './services/templateService.js';
import PK from './package.json' with { type: 'json' };
import util from 'util';
import { exec } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

let cachedPages = [];
const __filename = fileURLToPath(import.meta.url), __dirname = path.dirname(__filename), execPromise = util.promisify(exec),

	// ==================== 1. 递归目录复制工具 ====================
	copyDir = async (src, destDir) => {
		try {
			await fsPromises.mkdir(destDir, { recursive: true });
			const entries = await fsPromises.readdir(src, { withFileTypes: true });
			for (const entry of entries) {
				const srcPath = path.join(src, entry.name), destPath = path.join(destDir, entry.name);
				if (entry.isDirectory()) await copyDir(srcPath, destPath);
				else await fsPromises.copyFile(srcPath, destPath);
			}
		} catch (error) {
			if (error.code !== 'ENOENT') console.error(`❌ 复制目录出错: ${src} -> ${destDir}`, error.message);
		}
	},

	// ==================== 2. 路由文件处理及入口文件生成 ====================
	checkUserRoutesExist = async () => {
		try {
			const featuresDir = path.join(CWD, customizeDir);
			await fsPromises.access(featuresDir);
			const files = (await fsPromises.readdir(featuresDir)).filter(f => f.endsWith('.js'));
			for (const file of files) {
				try {
					const modulePath = path.join(featuresDir, file), moduleUrl = pathToFileURL(modulePath);
					moduleUrl.search = 'update=' + Date.now();
					const mod = await import(moduleUrl.href), feature = mod.default?.setupRoutes ? mod.default : mod;
					if (typeof feature.setupRoutes === 'function') return true;
				} catch (e) { /* ignore */ }
			}
			return false;
		} catch {
			return false;
		}
	},

	mergeDependencies = async (hasUserRoutes) => {
		let basePkg = {}, userDeps = {}, mergedDeps = {};
		const userPkgPath = path.join(CWD, 'package.json');
		try {
			const userPkgRaw = await fsPromises.readFile(userPkgPath, 'utf8'), userPkg = JSON.parse(userPkgRaw);
			basePkg.author = userPkg.author || '';
			basePkg.license = userPkg.license || 'ISC';
			userDeps = userPkg.dependencies || {};
		} catch (err) { }
		if (hasUserRoutes) {
			const templateDeps = PK.dependencies || {}, excludeList = ['chokidar', 'socket.io', '@flun/html-template'];
			mergedDeps = { ...templateDeps, ...userDeps };
			for (const pkg of excludeList) delete mergedDeps[pkg];
		}
		if (!mergedDeps.express) mergedDeps.express = '^5.2.1';
		const finalPkg = {
			name: 'dist-server', version: '1.0.0', ...basePkg,
			type: 'module', main: 'server.js',
			scripts: { dev: 'node server.js' },
			dependencies: mergedDeps,
			overrides: { 'fast-xml-parser': '^5.9.3' },
			allowScripts: {
				"node": true, "bcrypt": true, "electron-winstaller": true,
				"@flun/desktop-builder": true, "@flun/webauthn-server": true,
				"@flun/env": true, "@flun/mailer": true
			}
		};
		return JSON.stringify(finalPkg, null, 2);
	},

	installDependencies = async (targetDir) => {
		console.log('📦 正在安装项目依赖，请稍候...');
		try {
			const { stdout, stderr } = await execPromise('npm install', { cwd: targetDir });
			if (stdout) console.log(stdout);
			if (stderr) console.error(stderr);
			console.log('✅ 依赖安装完成');
		} catch (error) {
			console.error('❌ 依赖安装失败:', error.message);
			console.log('💡 请手动进入目标目录执行 npm install');
		}
	},

	/**
	 * 生成服务端入口文件内容（ESM 格式），沿用开发配置
	 * @param {boolean} hasUserRoutes - 是否存在用户自定义路由
	 * @param {string} entryFile - 入口文件名
	 * @param {object} buildConfig - 编译配置（port, host, httpsEnabled, httpsKeyPath, httpsCertPath）
	 * @returns {string} server.js 文件内容
	 */
	generateServerEntry = async (hasUserRoutes, entryFile, buildConfig) => {
		const { port, host, httpsEnabled, httpsKeyPath, httpsCertPath } = buildConfig,

			// 基础导入
			baseImports = `import express from 'express';
			import path from 'path';
			import { fileURLToPath, pathToFileURL } from 'url';
			import fs from 'fs';
			import http from 'http';
			import https from 'https';
			import { corsMiddleware, trustProxySetting } from './middleware.js';`,

			// 变量声明
			declarations = `const __filename = fileURLToPath(import.meta.url),
			 __dirname = path.dirname(__filename), app = express(), port = ${port}, host = ${JSON.stringify(host)};
			let server, protocol = 'http';`,

			// 公共中间件
			corsAndSecurity = `
			app.use(corsMiddleware);
			app.set('trust proxy', trustProxySetting);`,

			// 静态文件服务
			staticMiddleware = `
			app.use('/static', express.static(path.join(__dirname, '${staticDir}')));
			app.use(express.static(path.join(__dirname, '${templatesDir}')));`,

			// 默认根路由
			defaultRootRoute = `app.get('/', (req, res) => res.redirect('/${entryFile}'));`,
			httpServerCreation = ` server = http.createServer(app),	protocol = 'http';`;


		// 服务器创建代码（仅赋值,不再重复声明）
		let serverCreationCode;
		if (httpsEnabled && httpsKeyPath && httpsCertPath) {
			const safeKeyPath = JSON.stringify(httpsKeyPath), safeCertPath = JSON.stringify(httpsCertPath);
			serverCreationCode = `
				try {
				    const options = {
				        key: fs.readFileSync(${safeKeyPath}), cert: fs.readFileSync(${safeCertPath})
				    };
				    server = https.createServer(options, app);
				    protocol = 'https';
				    console.log(\`🔒 使用 HTTPS，证书路径: ${safeKeyPath}, ${safeCertPath}\`);
				} catch (err) {
				    console.error('HTTPS 证书加载失败，降级为 HTTP:', err.message);
				    ${httpServerCreation}
				}`;
		} else {
			const warning = httpsEnabled ? `console.warn('⚠️ HTTPS 已启用但未提供证书路径，降级为 HTTP 启动');` : '';
			serverCreationCode = `
				${httpServerCreation}
				${warning}`;
		}

		// 有用户路由时
		if (hasUserRoutes) {
			return `${baseImports}
					${declarations}

				let allRoutes = [];
				const wrapAppMethods = app => {
				    const methodsToWrap = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'all'];
				    const originals = {};
				    methodsToWrap.forEach(method => {
				        originals[method] = app[method].bind(app);
				        app[method] = function(routePath, ...handlers) {
				            allRoutes.push({ method: method.toUpperCase(), path: routePath });
				            return originals[method](routePath, ...handlers);
				        };
				    });
				};
				wrapAppMethods(app);

				const printRoutes = () => {
				    if (allRoutes.length) {
				        console.log(\`   🗺️ 检测到 \${ allRoutes.length } 条注册路由\`);
						// allRoutes.forEach(r => console.log(\`      \${r.method.padEnd(6)} \${r.path}\`));
				    } else {
				        console.log('   ℹ️ 未找到任何路由');
				    }
				};

				const loadUserRoutes = async () => {
				    const featuresDir = path.join(__dirname, '${customizeDir}');
				    if (!fs.existsSync(featuresDir)) {
				        return console.log(\`   ℹ️ \${featuresDir} 目录不存在，跳过路由加载\`);
				    }
				    const routeFiles = fs.readdirSync(featuresDir).filter(file => file.endsWith('.js'));
				    for (const file of routeFiles) {
				        try {
				            const modulePath = path.join(featuresDir, file);
				            const moduleUrl = pathToFileURL(modulePath);
				            moduleUrl.search = 'update=' + Date.now();
				            const feature = await import(moduleUrl.href);
				            if (typeof feature.default?.setupRoutes === 'function') {
				                feature.default.setupRoutes(app);
				                console.log(\`   ✅ 路由加载文件: \${file}\`);
				            } else if (typeof feature?.setupRoutes === 'function') {
				                feature.setupRoutes(app);
				                console.log(\`   ✅ 路由加载文件: \${file}\`);
				            }
				        } catch (e) {
				            console.error(\`   ❌ \${file} 加载失败:\`, e.message);
				        }
				    }
				};

				${corsAndSecurity}

				const start = async () => {
				    await loadUserRoutes();
				    ${staticMiddleware}
				    if (!allRoutes.some(r => r.method === 'GET' && r.path === '/')) ${defaultRootRoute}

				    ${serverCreationCode}
				    server.listen(port, host, () => {
				        console.log(\`\\n🚀 服务已启动: \${protocol}://\${host}:\${port}\`);
				        printRoutes();
						console.log('按 Ctrl+C 停止服务器');
				    });
				};
				start();`;
		}

		// 无用户路由（纯静态服务器）
		return `${baseImports}
			${declarations}
			${corsAndSecurity}
			${staticMiddleware}
			${defaultRootRoute}
			${serverCreationCode}
			server.listen(port, host, () => {
			    console.log(\`\\n🚀 静态服务器已启动: \${protocol}://\${host}:\${port}\`);
			    console.log('📁 当前仅提供静态文件服务（未检测到用户路由）');
				console.log('按 Ctrl+C 停止服务器');
			});`;
	},

	// ==================== 3. 编译模板文件 ====================
	compile = async (cachedPages, outputDir) => {
		for (const templateFile of cachedPages) {
			try {
				let rendered = await renderTemplate(templateFile);
				rendered = await processIncludes(rendered, templateFile);
				rendered = processVariables(rendered, { currentUrl: `/${templateFile}`, query: {} });
				const includedFiles = getIncludedFiles();
				if (includedFiles.has(templateFile)) continue;
				const outputPath = path.join(CWD, outputDir, templatesDir, templateFile);
				await fsPromises.mkdir(path.dirname(outputPath), { recursive: true });
				await fsPromises.writeFile(outputPath, rendered);
				console.log(`✅ ${templateFile} ->已编译: ${path.join(outputDir, templatesDir, templateFile)}`);
			} catch (error) {
				console.error(`❌ 编译 ${templateFile} 时出错: ${error.message}`);
			}
		}
	};

// ==================== 4. 批量编译主流程 ====================
/**
 * 全量模板编译与打包，沿用开发阶段配置（端口、HTTPS、证书、主机名）
 * @param {string|Object} [options] - 配置项，可以是字符串（输出目录）或对象（支持 outputDir 字段）
 * @param {string} [options.outputDir='dist'] - 自定义打包输出目录
 */
const compileAllTemplates = async (options = {}) => {
	if (typeof options === 'string') options = { outputDir: options };
	const outputDir = options.outputDir || 'dist';

	try {
		// 1. 读取开发阶段配置（与 dev-server 行为完全一致）
		let defaults = {};
		const configFile = path.join(CWD, '.dev-config.json');
		try {
			const content = await fsPromises.readFile(configFile, 'utf8');
			defaults = JSON.parse(content), console.log('📋 已读取上次开发配置作为默认值');
		} catch (err) {
			if (err.code !== 'ENOENT') console.warn('⚠️ 读取开发配置失败:', err.message);
		}

		const { port, host, httpsEnabled, httpsKeyPath, httpsCertPath } = parseServerConfig({}, defaults);
		console.log(`🔧 沿用开发配置: 端口=${port}, 主机=${host}, HTTPS=${httpsEnabled}`);

		// 2. 设置编译模式并清空包含文件记录
		setCompilationMode(true), cachedPages = await getAvailableTemplates();
		for (const file of cachedPages) await validateTemplateFile(file);

		// 3. 加载用户自定义功能（编译模式）
		await loadUserFeatures(null, true), console.log(`ℹ️ 变量已从${customizeDir}目录加载`);

		// 4. 创建打包目录
		await fsPromises.rm(outputDir, { recursive: true, force: true });
		await fsPromises.mkdir(outputDir, { recursive: true }), console.log(`📁 已创建输出目录: ${outputDir}`);

		// 5. 编译模板文件
		await compile(cachedPages, outputDir), console.log(`\n🎉 编译文件完成!`);

		// 6. 检测路由、生成 package.json 和 server.js
		const hasUserRoutes = await checkUserRoutesExist(), pkgContent = await mergeDependencies(hasUserRoutes),
			entryFile = await findEntryFile(cachedPages), buildConfig = { port, host, httpsEnabled, httpsKeyPath, httpsCertPath };
		// 如果启用了 HTTPS 且证书路径存在;
		if (httpsEnabled && httpsKeyPath && httpsCertPath) {
			console.log(`   证书路径: ${httpsKeyPath}, ${httpsCertPath}`);
			console.warn('   证书文件将使用原路径,如果部署时证书路径发生变化,请自行调整 server.js 中的证书路径;');
		}

		const serverContent = await generateServerEntry(hasUserRoutes, entryFile, buildConfig);
		await Promise.all([
			fsPromises.writeFile(path.join(outputDir, 'server.js'), serverContent),
			fsPromises.writeFile(path.join(outputDir, 'package.json'), pkgContent)
		]);

		// 7. 复制静态资源与用户功能目录
		await copyDir(staticDir, path.join(outputDir, staticDir));
		await copyDir(customizeDir, path.join(outputDir, customizeDir));
		const middlewareSrc = path.join(__dirname, 'services', 'middleware.js'),
			middlewareDest = path.join(outputDir, 'middleware.js');
		await fsPromises.copyFile(middlewareSrc, middlewareDest);
		console.log('✅ 公共中间件已复制到输出目录/middleware.js');
		try {
			await fsPromises.copyFile(path.join(CWD, '.env'), path.join(outputDir, '.env'));
		} catch (err) {
			if (err.code !== 'ENOENT') console.error(`⚠️ 复制 .env 文件失败: ${err.message}`);
		}
		console.log('✅ 资源打包完成');

		// 8. 安装依赖
		await installDependencies(outputDir);

		if (hasUserRoutes) console.log('\n🚀 检测到自定义路由，已创建完整服务端入口文件');
		else console.log('\n📄 已生成静态文件服务器（无用户路由）');

		console.log(`👉 启动服务器命令: cd ${outputDir} && node server.js`);
		setCompilationMode(false);
	} catch (error) {
		console.error('❌ 编译流程出错:', error.message);
		setCompilationMode(false);
	}
};

// ==================== 5. 导出接口与执行编译 ====================
export { compileAllTemplates };

if (process.argv[1] === __filename) {
	const customDir = process.argv[2];
	compileAllTemplates(customDir);
}