#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { compile, initProject, startDevServer } from '../index.js';

const [, , sub, ...args] = process.argv, cwd = process.env.INIT_CWD || process.cwd(),
  // 读取项目根目录的持久化配置,缺失或损坏时降级为空对象
  loadDevConfig = () => {
    const f = path.join(cwd, '.dev-config.json');
    if (!fs.existsSync(f)) return {};
    try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return {} }
  },
  // 判断参数中是否含指定标志
  hasFlag = (...names) => names.some(n => args.includes(n)),
  // 取参数后紧跟的值,跳过以 - 开头的下一个参数
  getOption = (...names) => {
    for (const n of names) {
      const i = args.indexOf(n);
      if (i !== -1 && args[i + 1] && !args[i + 1].startsWith('-')) return args[i + 1];
    }
    return undefined;
  },
  // 输出用法
  printHelp = () => {
    const cmd = (name, desc) => `      ${chalk.cyanBright(name.padEnd(26))}${chalk.gray(desc)}`,
      grp = name => `    ${chalk.cyan(name)}`;
    console.log([
      `  ${chalk.blueBright('用法:')} html-template <命令> [选项]`, '',
      grp('命令'),
      cmd('start', '启动开发服务器'),
      cmd('build', '编译模板'),
      cmd('restore', '恢复默认模板与资源'),
      cmd('help', '显示本帮助'), '',
      grp('start 选项'),
      cmd('-p <port>', '监听端口,默认 7296;完整写法 --port'),
      cmd('-H <host>', '监听主机名,默认 localhost;完整写法 --host'),
      cmd('--account', '启用登录系统;加 --no-account 禁用,默认禁用'),
      cmd('--hot-reload', '启用热重载;加 --no-hot-reload 禁用,默认启用'),
      cmd('--https', '启用 HTTPS;加 --no-https 禁用,默认关闭'),
      cmd('--https-key <path>', 'HTTPS 私钥路径,启用 HTTPS 时必填'),
      cmd('--https-cert <path>', 'HTTPS 证书路径,启用 HTTPS 时必填'), '',
      grp('build 选项'),
      cmd('-o <dir>', '输出目录,默认 dist;完整写法 --out'), '',
      grp('restore 选项'),
      cmd('--overwrite', '覆盖已存在的文件与目录'),
      cmd('--skip-files', '跳过已存在文件,仅复制缺失项'),
      cmd('--skip-dirs', '跳过已存在目录,默认'),
      cmd('--account', '启用登录系统;加 --no-account 禁用,默认禁用'),
      cmd('--verbose', '显示详细日志'), '',
      `  ${chalk.gray('不传参时,start 读取项目根目录 .dev-config.json 作为默认配置;')}`,
      `  ${chalk.gray('显式参数优先级最高,其次是环境变量,最后是 .dev-config.json;')}`
    ].join('\n'));
  },
  // 启动开发服务器,持久化配置作为 defaults 传入
  runStart = async () => {
    if (hasFlag('--help', '-h')) return printHelp();
    await startDevServer({}, loadDevConfig());
  },
  // 编译模板
  runBuild = async () => {
    if (hasFlag('--help', '-h')) return printHelp();
    const out = getOption('--out', '-o');
    await compile(out ? { outputDir: out } : {});
    console.log(chalk.green('✓ ') + chalk.greenBright('编译完成'));
  },
  // 恢复默认模板与资源
  runRestore = async () => {
    if (hasFlag('--help', '-h')) return printHelp();
    const mode = hasFlag('--overwrite') ? 'overwrite' : hasFlag('--skip-files') ? 'skip-files' : 'skip-dirs',
      account = hasFlag('--account'), verbose = hasFlag('--verbose');
    await initProject({ mode, account, verbose });
    console.log(chalk.green('✓ ') + chalk.greenBright('恢复完成'));
  },
  // 命令分发入口
  main = async () => {
    if (!sub || sub === 'help' || sub === '-h' || sub === '--help') return printHelp();
    if (sub === 'start') return runStart();
    if (sub === 'build') return runBuild();
    if (sub === 'restore') return runRestore();
    console.error(chalk.red('✗ 未知命令: ') + chalk.yellow(sub)), console.log(''), printHelp(), process.exit(1);
  };

main().catch(e => (console.error(chalk.red('✗ ') + e.message), process.exit(1)));