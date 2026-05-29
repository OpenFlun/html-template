import fs from 'fs';
import path from 'path';

const isProduction = fs.existsSync(path.join(process.cwd(), 'middleware.js')),
	injectScript = html => {
		if (isProduction) return html; // 生产模式（存在 middleware.js）不注入热重载脚本
		if (/hot-reload-socket|socket\.io\.js/.test(html)) return html; // 已经注入过了
		const socketScript = `
        <script src="/socket.io/socket.io.js"></script>
        <script>
            (function() {
                var socket = io();
                socket.on('hot-reload', delay => {
                    console.log('[热重载] 检测到文件更改，' + delay + '毫秒后重新加载页面...');
                    setTimeout(() => window.location.reload(), delay);
                });
            })();
        </script>
    `;

		if (html.includes('</body>')) return html.replace('</body>', `${socketScript}</body>`);
		return html + socketScript;
	};

export { injectScript };