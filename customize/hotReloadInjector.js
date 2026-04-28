/**注入热重载脚本到 HTML 中
 * > 查看定义:@see {@link injectScript}
 * @param {string} html - 原始 HTML 内容
 * @returns {string} 注入热重载脚本后的 HTML 内容
 */
const injectScript = html => {
	if (/hot-reload-socket|socket\.io\.js/.test(html)) return html; // 避免重复注入
	const socketScript = `
       		<script src="/socket.io/socket.io.js"></script>
       		<script>
       		  (function() {
       		    var socket = io();
       		    socket.on('hot-reload', delay => {
       		      console.log('[热重载] 检测到文件更改,' + delay + '毫秒后重新加载页面...');
       		      setTimeout(() => window.location.reload(), delay);
       		    });
       		  })();
       		</script>
   		`;

	if (html.includes('</body>')) return html.replace('</body>', `${socketScript}</body>`);
	return html + socketScript;
};

export { injectScript };