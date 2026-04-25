const { initProject } = require('flun-html-template');

// 恢复文件(默认参数)
initProject({
    mode: 'skip-files', // 模式:跳过已存在的文件
    verbose: false,     // 不显示详细日志
    account: false      // 不恢复登录主文件
});