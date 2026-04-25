// /static/auth.js
(function () {
    const userCenter = document.getElementById('userCenter');
    if (!userCenter) return;

    async function checkLoginStatus() {
        try {
            const res = await fetch('/api/user', {
                method: 'GET',
                credentials: 'include'
            });

            if (res.ok) {
                const user = await res.json();
                userCenter.style.display = 'flex'; // 登录成功:显示个人中心按钮,并可显示用户名
                const link = userCenter.querySelector('a');
                if (link && user.username) link.innerHTML = `👤 ${user.username}`;
            }
            else if (res.status === 401) userCenter.style.display = 'none';
            else userCenter.style.display = 'none';
        } catch (err) {
            userCenter.style.display = 'none';
        }
    }

    // 页面加载完成后执行
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', checkLoginStatus);
    else checkLoginStatus();
})();