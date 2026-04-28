// /static/auth.js

(function () {
    const userCenter = document.getElementById('userCenter');
    if (!userCenter) return;

    async function checkLoginStatus() {
        try {
            const res = await fetch('/api/user', {
                method: 'GET', credentials: 'include'
            }), data = await res.json();

            if (data?.username) {
                userCenter.style.display = 'flex';
                const link = userCenter.querySelector('a');
                if (link) link.innerHTML = `👤 ${data.username}`;
                document.dispatchEvent(new CustomEvent('userCenterReady')); // 创建并派发自定义事件,通知用户中心已准备好
            }
            else userCenter.style.display = 'none';
        } catch (err) {
            userCenter.style.display = 'none';
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', checkLoginStatus);
    else checkLoginStatus();
})();