// /static/auth.js
let account = false;   // 全局登录标记

(function () {
    const userCenter = document.getElementById('userCenter');
    if (!userCenter) return;

    async function checkLoginStatus() {
        try {
            const res = await fetch('/api/user', {
                method: 'GET', credentials: 'include'
            }), data = await res.json();

            if (data?.username) {
                account = true, userCenter.style.display = 'flex';
                const link = userCenter.querySelector('a');
                if (link) link.innerHTML = `👤 ${data.username}`;
            }
            else userCenter.style.display = 'none';
        } catch (err) {
            userCenter.style.display = 'none';
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', checkLoginStatus);
    else checkLoginStatus();
})();