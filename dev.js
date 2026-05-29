import { startDevServer } from '@flun/html-template';
/**
 * 如果需要启用https,请先安装 @flun/dns-auto-ssl,并在生成的示例文件(DnsAutoSSL.js)中配置相关参数,
 * 然后将下面导入部分注释取消并使用这些配置项,或使用自己已有的证书路径和域名配置项进行替换;
 */
// import { domains, certPath, keyPath } from './DnsAutoSSL.js';

// 启动开发服务器
startDevServer({
    port: 7296, hotReload: true, account: false, // 默认参数:开发服务器端口7296,启用热更新,不启用登录系统;
    // https: true,
    // httpsKey: keyPath,
    // httpsCert: certPath,
    // host: domains[0],
});