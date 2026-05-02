// /customize/account.js
// 用户认证模块：包含 session、登录保护中间件及所有认证路由
import express from 'express';
import fs from 'fs';
import path from 'path';
import { env } from '@flun/env';
import { createTransport } from '@flun/mailer';
import {
    generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse
} from '@flun/webauthn-server';
import { fromBuffer, toBuffer } from '@flun/webauthn-server/helpers';
import { randomBytes } from 'crypto';
import { hashSync, hash, compare } from 'bcrypt';
import { toDataURL } from 'qrcode';
import { EventEmitter } from 'events';
import session from 'express-session';
import { rateLimit } from 'express-rate-limit';
import { generateSecret, verify, generateURI } from 'otplib';
import { fileURLToPath } from 'url';
import { injectScript } from './hotReloadInjector.js';

const __filename = fileURLToPath(import.meta.url), __dirname = path.dirname(__filename), CWD = process.cwd(),
    pageDir = 'templates', accountDir = 'account', usersFile = path.join(__dirname, 'users.json'), pendingRegistrations = new Map(),
    recentPasswordResets = new Map(), mailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/, Store = session.Store;

// 邮件发送配置检查
if (!env.MAIL_HOST || !env.MAIL_USER || !env.MAIL_PWD)
    console.error('❌ 邮件服务未配置,请在根目录env文件中正确配置 MAIL_HOST、MAIL_USER、MAIL_PWD 后重新启动!'), process.exit(1);

// 邮件发送配置
const transporter = createTransport({
    host: env.MAIL_HOST,
    port: env.MAIL_PORT,
    secure: true,
    auth: { user: env.MAIL_USER, pass: env.MAIL_PWD }
}),
    // ========== 辅助函数 ==========
    readUsers = () => {
        try {
            if (!fs.existsSync(usersFile)) return [];
            const data = fs.readFileSync(usersFile, 'utf8');
            return JSON.parse(data);
        } catch (err) { return []; }
    },
    writeUsers = users => fs.writeFileSync(usersFile, JSON.stringify(users, null, 2)),
    createUserObject = (username, email, hashedPassword, emailVerified = false) => {
        const now = Date.now();
        return {
            id: now,
            username, email, password: hashedPassword,
            emailVerified, emailVerificationToken: null,
            passwordResetToken: null, passwordResetExpires: null,
            twoFactorSecret: null, twoFactorEnabled: false,
            backupCodes: [],
            webauthnCredentials: [], webauthnEnabled: false,
            createdAt: now, updatedAt: now, passwordChangedAt: now,
            pendingEmail: null, pendingEmailToken: null, pendingEmailExpires: null
        };
    },
    initAdminUser = () => {
        const users = readUsers();
        if (users.length <= 0) {
            const adminPassword = env.PWD || 'admin', hashedPassword = hashSync(adminPassword, 10),
                adminUser = createUserObject('admin', null, hashedPassword);
            users.push(adminUser), writeUsers(users);
        }
    },
    sendEmail = async (to, subject, html) => {
        if (transporter) await transporter.sendMail({ from: `"Your App" <${env.MAIL_USER}>`, to, subject, html });
        else console.log(`\n--- 模拟邮件 ---\n收件人: ${to}\n主题: ${subject}\n内容:\n${html}\n---`);
    },
    validateEmail = email => mailRegex.test(email), generateToken = () => randomBytes(32).toString('hex'),
    hasAllFields = (body, fields) => fields.every(f => body[f]),
    getCurrentUser = req => {
        const users = readUsers(), user = users.find(u => u.id === req.session.userId);
        if (!user) return null;
        return { user, users };
    },
    findUserByToken = (users, token, tokenField, expiresField) =>
        users.find(u => u[tokenField] === token && u[expiresField] > Date.now()),
    clearPendingFields = user => {
        user.pendingEmail = null, user.pendingEmailToken = null, user.pendingEmailExpires = null;
    },
    generateBackupCodes = () => {
        const plainCodes = [], hashedCodes = [];
        for (let i = 0; i < 10; i++) {
            const code = randomBytes(5).toString('hex').toUpperCase();
            plainCodes.push(code), hashedCodes.push(hashSync(code, 10));
        }
        return { plainCodes, hashedCodes };
    },
    validatePasswordLength = password => password && password.length >= 6,
    hashPassword = async password => await hash(password, 10),
    verifyPassword = async (plain, hash) => await compare(plain, hash),
    isUsernameTaken = (users, username, excludeUserId = null) =>
        users.some(u => u.id !== excludeUserId && u.username === username),
    isEmailTaken = (users, email, excludeUserId = null) => users.some(u => u.id !== excludeUserId && u.email === email),
    touchAndSaveUser = (users, user) => { user.updatedAt = Date.now(), writeUsers(users); },
    verifyTotp = async (secret, token) => (await verify({ secret, token, window: 1 })).valid,
    getAppBaseUrl = req => env.APP_URL || `http://${req.headers.host}`,
    sendVerificationEmail = async (req, email, token, type) => {
        const baseUrl = getAppBaseUrl(req);
        let subject, link;
        switch (type) {
            case 'register':
                subject = '请验证您的邮箱';
                link = 'verify-email?';
                break;
            case 'reset':
                subject = '密码重置请求';
                link = 'reset-password?';
                break;
            case 'change-email':
                subject = '请验证您的新邮箱';
                link = 'verify-email?type=new-email&';
                break;
            default: return;
        }

        const html = `<p>点击👉 <a href="${baseUrl}/${link}token=${token}">验证链接</a> 完成验证；此链接一小时内有效！</p>`;
        await sendEmail(email, subject, html);
    },
    sendSecurityAlertEmail = async (req, user, actionType) => {
        const clientIp = getClientIp(req), now = new Date().toLocaleString('zh-CN');
        let subject, actionDescription;
        switch (actionType) {
            case 'password_change':
                subject = '修改密码通知';
                actionDescription = '修改了密码';
                break;
            case 'webauthn_added':
                subject = '添加验证硬件通知';
                actionDescription = '添加了一台新的硬件验证设备';
                break;
            default: return;
        }

        const html = `
            <p>您好!</p>
            <p>您的账户(${user.username})于 <strong>${now}</strong>在 <strong>${clientIp}</strong> 成功${actionDescription};</p>
            <p>如果是您本人操作,请忽略此邮件,否则请立即处理;</p>
            <p style="margin-left:65%;">此致<br/>&emsp;&nbsp;安全中心</p>
        `;
        await sendEmail(user.email, subject, html);
    },
    getRpId = req => {
        let hostname = req.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') return hostname;

        const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (domainRegex.test(hostname)) return hostname;
        throw new Error(`无效的 RP ID (${hostname}),请使用有效的域名、localhost或127.0.0.1,并确保使用HTTPS或localhost访问;`);
    },
    getOrigin = req => `${req.protocol}://${req.get('host')}`,
    getClientIp = req => {
        const xForwardedFor = req.headers['x-forwarded-for'],
            ip = xForwardedFor ? xForwardedFor.split(',')[0].trim() : (req.socket.remoteAddress || req.ip);
        return (['::1', '127.0.0.1', '::ffff:127.0.0.1'].includes(ip)) ? '本地' : `IP(${ip})`;
    };

// ========== 路由设置 ==========
export const accountRouter = app => {
    // ========== 1. 配置 session ==========
    class SimpleFileStore extends Store {
        constructor(sessionsDir) {
            super(), this.sessionsDir = sessionsDir;
        }

        get(sid, cb) {
            const file = path.join(this.sessionsDir, `${sid}.json`);
            try {
                if (fs.existsSync(file)) {
                    const data = fs.readFileSync(file, 'utf8');
                    cb(null, JSON.parse(data));
                }
                else cb(null, null);
            } catch (e) { cb(e); }
        }

        set(sid, session, cb) {
            const file = path.join(this.sessionsDir, `${sid}.json`);
            try {
                fs.writeFileSync(file, JSON.stringify(session));
                cb(null);
            } catch (e) { cb(e); }
        }

        destroy(sid, cb) {
            const file = path.join(this.sessionsDir, `${sid}.json`);
            try {
                if (fs.existsSync(file)) fs.unlinkSync(file);
                cb(null);
            } catch (e) { cb(e); }
        }

        touch(sid, session, cb) {
            const file = path.join(this.sessionsDir, `${sid}.json`);
            try {
                if (fs.existsSync(file)) {
                    const now = new Date();
                    fs.utimesSync(file, now, now);
                }
                cb(null);
            } catch (e) { cb(e); }
        }
    }

    const sessionsDir = path.join(CWD, 'sessions');
    if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });

    const sessionStore = new SimpleFileStore(sessionsDir), oneHour = 3600000, fifteenMin = 900000;

    // 定期清理超过 30 天的 session 文件(每天执行一次)
    setInterval(() => {
        const now = Date.now();
        fs.readdirSync(sessionsDir).forEach(f => {
            if (!f.endsWith('.json')) return;
            const p = path.join(sessionsDir, f);
            try {
                if (now - fs.statSync(p).mtimeMs > 30 * 24 * oneHour) fs.unlinkSync(p);
            } catch (_) { }
        });
    }, 24 * oneHour);

    app.use(session({
        secret: env.SESSION_SECRET || 'dev-secret-change-in-production',
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false, httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * oneHour }
    }));

    app.use(express.json(), express.urlencoded({ extended: true })), initAdminUser();

    // 2. 全局登录保护中间件
    const publicPage = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/2fa'],
        publicPaths = [...publicPage, '/api/login', '/api/register', '/api/verify-email', '/api/forgot-password',
            '/api/reset-password', '/api/verify-new-email', '/api/check-email-verified', '/api/check-password-reset',
            '/api/verify-2fa', '/api/webauthn/login/begin', '/api/webauthn/login/complete', '/static', '/favicon.ico'];
    app.use((req, res, next) => {
        if (publicPaths.some(p => req.path.startsWith(p))) return next();
        if (!req.session.userId) {
            if (req.path.startsWith('/api/')) return res.status(401).json({ message: '请先登录' });
            return req.session.returnTo = req.originalUrl, res.redirect('/login');
        }

        // 检查密码是否在本次登录后被修改
        const { user } = getCurrentUser(req);
        if (user?.passwordChangedAt) {
            const sessionLoginTime = req.session.loginTime || 0;
            if (user.passwordChangedAt > sessionLoginTime) {
                req.session.destroy(() => {
                    if (req.path.startsWith('/api/')) return res.status(401).json({ message: '密码已修改,请重新登录' });
                    return res.redirect('/login');
                });
                return;
            }
        }
        next();
    });

    // 3. 每小时清理过期临时数据
    setInterval(() => {
        const now = Date.now();
        for (const [token, data] of pendingRegistrations.entries())
            if (data.expires < now) pendingRegistrations.delete(token);
        for (const [email, timestamp] of recentPasswordResets.entries())
            if (timestamp < now) recentPasswordResets.delete(email);
    }, oneHour);

    // 定义安全限制和所有页面(公共页面 + 受保护页面)
    const authLimiter = rateLimit({ windowMs: fifteenMin, max: 50, message: { message: '尝试次数过多，请稍后再试' } }),
        allPages = [...publicPage, '/profile'];
    allPages.forEach(page => {
        app.get(page, (req, res) => {
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.set('Pragma', 'no-cache'), res.set('Expires', '0');
            if ((page === '/login' || page === '/2fa') && req.session.userId) {
                const { user } = getCurrentUser(req), reset = recentPasswordResets.get(user.email);
                if (!reset || reset <= Date.now()) return res.redirect('/');
            }

            const filePath = path.join(CWD, pageDir, accountDir, `.${page}.html`);
            try {
                const html = fs.readFileSync(filePath, 'utf8'), injectedHtml = injectScript(html);
                res.type('html').send(injectedHtml);
            } catch (err) {
                console.error(`读取页面文件失败: ${filePath}`, err);
                res.status(500).send('服务器内部错误');
            }
        });
    });

    // ========== 公开认证API ==========
    app.post('/api/register', authLimiter, async (req, res) => {
        const { username, email, password } = req.body;
        if (!hasAllFields(req.body, ['username', 'email', 'password']))
            return res.status(400).json({ message: '所有字段必填' });
        if (!validateEmail(email)) return res.status(400).json({ message: '邮箱格式不正确' });
        if (!validatePasswordLength(password)) return res.status(400).json({ message: '密码至少6位' });

        const users = readUsers();
        if (isUsernameTaken(users, username)) return res.status(409).json({ message: '用户名已存在' });
        if (isEmailTaken(users, email)) return res.status(409).json({ message: '邮箱已被注册' });

        const hashedPassword = await hashPassword(password), verificationToken = generateToken();
        pendingRegistrations.set(verificationToken, {
            username, email, password: hashedPassword, expires: Date.now() + oneHour
        });
        await sendVerificationEmail(req, email, verificationToken, 'register');
        res.json({ success: true, message: '验证邮件已发送,请查收并点击链接完成注册' });
    });

    app.get('/api/verify-email', async (req, res) => {
        const { token } = req.query;
        if (!token) return res.status(400).json({ message: '缺少令牌' });

        const pending = pendingRegistrations.get(token);
        if (!pending) return res.status(400).json({ message: '链接已失效或不存在' });
        const { expires, username, email, password } = pending;
        if (expires < Date.now()) return pendingRegistrations.delete(token), res.status(400).json({ message: '链接已过期' });

        const users = readUsers(), newUser = createUserObject(username, email, password, true);
        users.push(newUser), writeUsers(users), pendingRegistrations.delete(token);
        res.json({ success: true, message: '邮箱验证成功' });
    });

    app.get('/api/check-email-verified', authLimiter, (req, res) => {
        const { email } = req.query;
        if (!email) return res.status(400).json({ message: '缺少邮箱参数' });
        const users = readUsers(), user = users.find(u => u.email === email);
        res.json({ verified: user?.emailVerified || false });
    });

    app.post('/api/login', authLimiter, async (req, res) => {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ message: '用户名/邮箱和密码不能为空' });

        const users = readUsers(), user = users.find(u => u.username === username || u.email === username);
        if (!user) return res.status(401).json({ message: '用户名/邮箱或密码错误' });

        const valid = await verifyPassword(password, user.password);
        if (!valid) return res.status(401).json({ message: '用户名/邮箱或密码错误' });
        if (!user.emailVerified) return res.status(403).json({ message: '请先验证邮箱', needsVerification: true });
        if (user.webauthnEnabled && user.webauthnCredentials.length > 0)
            return req.session.tempUserId = user.id, res.json({ requireWebAuthn: true });
        if (user.twoFactorEnabled) return req.session.tempUserId = user.id, res.json({ require2FA: true });

        req.session.userId = user.id, req.session.username = user.username, req.session.loginTime = Date.now();
        recentPasswordResets.delete(user.email), res.json({ success: true, message: '登录成功' });
    });

    app.post('/api/verify-2fa', authLimiter, async (req, res) => {
        const { token } = req.body;
        if (!token) return res.status(400).json({ message: '验证码不能为空' });

        const tempUserId = req.session.tempUserId;
        if (!tempUserId) return res.status(401).json({ message: '请先完成第一步登录' });

        const users = readUsers(), user = users.find(u => u.id === tempUserId);
        if (!user?.twoFactorEnabled) return res.status(400).json({ message: '用户未启用2FA' });

        const { twoFactorSecret, backupCodes } = user, verified = await verifyTotp(twoFactorSecret, token);
        let backupValid = false;
        if (!verified && backupCodes?.length)
            for (let i = 0; i < backupCodes.length; i++) {
                const match = await verifyPassword(token, backupCodes[i]);
                if (match) {
                    backupValid = true, backupCodes.splice(i, 1), touchAndSaveUser(users, user);
                    break;
                }
            }

        if (verified || backupValid) {
            delete req.session.tempUserId, req.session.userId = user.id, req.session.username = user.username;
            req.session.loginTime = Date.now(), recentPasswordResets.delete(user.email);
            res.json({ success: true, message: '2FA验证成功' });
        }
        else res.status(401).json({ message: '验证码无效' });
    });

    app.post('/api/logout', (req, res) => {
        req.session.destroy(err => {
            if (err) return res.status(500).json({ message: '退出登录失败' });
            res.json({ success: true });
        });
    });

    app.post('/api/forgot-password', authLimiter, async (req, res) => {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: '邮箱必填' });

        const users = readUsers(), user = users.find(u => u.email === email);
        if (!user) return res.json({ success: true, message: '如果邮箱存在,你将收到一封重置邮件' });

        const resetToken = generateToken();
        user.passwordResetToken = resetToken, user.passwordResetExpires = Date.now() + oneHour;
        touchAndSaveUser(users, user), await sendVerificationEmail(req, email, resetToken, 'reset');
        res.json({ success: true, message: '请查收重置邮件,重置后将自动跳转!' });
    });

    app.post('/api/reset-password', async (req, res) => {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) return res.status(400).json({ message: '缺少参数' });
        if (!validatePasswordLength(newPassword)) return res.status(400).json({ message: '密码至少6位' });

        const users = readUsers(), user = findUserByToken(users, token, 'passwordResetToken', 'passwordResetExpires');
        if (!user) return res.status(400).json({ message: '令牌无效或已过期' });

        const now = Date.now();
        user.password = await hashPassword(newPassword), user.passwordChangedAt = now, user.passwordResetToken = null;
        user.passwordResetExpires = null, touchAndSaveUser(users, user);
        recentPasswordResets.set(user.email, Date.now() + fifteenMin), res.json({ success: true, message: '密码已重置' });
    });

    app.get('/api/verify-new-email', async (req, res) => {
        const { token } = req.query;
        if (!token) return res.status(400).json({ message: '缺少令牌' });

        const users = readUsers(), user = findUserByToken(users, token, 'pendingEmailToken', 'pendingEmailExpires');
        if (!user) return res.status(400).json({ message: '链接无效或已过期' });

        const emailTaken = isEmailTaken(users, user.pendingEmail, user.id);
        if (emailTaken)
            return clearPendingFields(user), writeUsers(users), res.status(409).json({ message: '该邮箱已被使用,请检查修改' });

        user.email = user.pendingEmail, user.emailVerified = true, clearPendingFields(user);
        touchAndSaveUser(users, user), res.json({ success: true, message: '新邮箱验证成功' });
    });

    app.get('/api/check-password-reset', authLimiter, (req, res) => {
        const { email } = req.query;
        if (!email) return res.status(400).json({ message: '缺少邮箱参数' });
        const resetTimes = recentPasswordResets.get(email);
        res.json({ reset: resetTimes && resetTimes > Date.now() });
    });

    // ========== 需要登录的认证 API ==========
    app.get('/api/user', (req, res) => {
        const result = getCurrentUser(req);
        if (!result) return res.status(404).json({ message: '用户不存在' });
        const { id, username, email, emailVerified, twoFactorEnabled, createdAt, pendingEmail, webauthnEnabled,
            webauthnCredentials } = result.user;
        res.json({
            id, username, email, emailVerified, twoFactorEnabled, createdAt, pendingEmail, webauthnEnabled,
            webauthnCredentials
        });
    });

    app.post('/api/delete-account', async (req, res) => {
        const { password } = req.body;
        if (!password) return res.status(400).json({ message: '密码不能为空' });

        const result = getCurrentUser(req);
        if (!result) return res.status(404).json({ message: '用户不存在' });

        const { user, users } = result, valid = await verifyPassword(password, user.password);
        if (!valid) return res.status(401).json({ message: '密码错误' });

        const userIndex = users.findIndex(u => u.id === user.id);
        users.splice(userIndex, 1), writeUsers(users);
        req.session.destroy(err => {
            if (err) console.error('销毁 session 失败:', err);
            res.json({ success: true, message: '账户已永久注销' });
        });
    });

    app.post('/api/update-profile', async (req, res) => {
        const { username: newUsername, email: newEmail, currentPassword } = req.body;
        if (!hasAllFields(req.body, ['username', 'email', 'currentPassword']))
            return res.status(400).json({ message: '所有字段必填' });
        if (!validateEmail(newEmail)) return res.status(400).json({ message: '邮箱格式不正确' });

        const result = getCurrentUser(req);
        if (!result) return res.status(404).json({ message: '用户不存在' });
        const { user, users } = result, valid = await verifyPassword(currentPassword, user.password);
        if (!valid) return res.status(401).json({ message: '当前密码错误' });
        if (isUsernameTaken(users, newUsername, user.id)) return res.status(409).json({ message: '用户名已存在' });
        if (isEmailTaken(users, newEmail, user.id)) return res.status(409).json({ message: '邮箱已被注册' });

        const emailChanged = newEmail !== user.email;
        if (emailChanged) {
            const token = generateToken();
            user.pendingEmail = newEmail, user.pendingEmailToken = token, user.pendingEmailExpires = Date.now() + oneHour;
            user.username = newUsername, touchAndSaveUser(users, user);
            await sendVerificationEmail(req, newEmail, token, 'change-email');
            res.json({ success: true, message: '资料修改已提交,请查收新邮箱,并完成验证更新', emailChanged: true });
        }
        else user.username = newUsername, touchAndSaveUser(users, user), res.json({ success: true, message: '资料修改成功' });
    });

    app.post('/api/change-password', async (req, res) => {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) return res.status(400).json({ message: '当前密码和新密码不能为空' });
        if (!validatePasswordLength(newPassword)) return res.status(400).json({ message: '新密码至少6位' });

        const result = getCurrentUser(req);
        if (!result) return res.status(404).json({ message: '用户不存在' });

        const { user, users } = result;
        if (!(await verifyPassword(currentPassword, user.password))) return res.status(401).json({ message: '当前密码错误' });
        if (await verifyPassword(newPassword, user.password)) return res.status(400).json({ message: '新旧密码不能相同' });

        const now = Date.now();
        user.password = await hashPassword(newPassword), user.passwordChangedAt = now, touchAndSaveUser(users, user);
        await sendSecurityAlertEmail(req, user, 'password_change'), res.json({ success: true, message: '密码已修改' });
    });

    app.post('/api/enable-2fa', async (req, res) => {
        const result = getCurrentUser(req);
        if (!result) return res.status(404).json({ message: '用户不存在' });

        const { user, users } = result, secret = generateSecret({ length: 32 }), otpauth_url = generateURI({
            issuer: 'YourApp', label: user.username, secret,
        }), qrCodeUrl = await toDataURL(otpauth_url);

        user.twoFactorSecret = secret, touchAndSaveUser(users, user), res.json({ secret, qrCode: qrCodeUrl });
    });

    app.post('/api/confirm-2fa', async (req, res) => {
        const { token } = req.body;
        if (!token) return res.status(400).json({ message: '验证码必填' });

        const result = getCurrentUser(req);
        if (!result) return res.status(404).json({ message: '用户不存在' });

        const { user, users } = result, verified = await verifyTotp(user.twoFactorSecret, token);
        if (!verified) return res.status(400).json({ message: '验证码错误' });

        const { plainCodes, hashedCodes } = generateBackupCodes();
        user.backupCodes = hashedCodes, user.twoFactorEnabled = true, touchAndSaveUser(users, user);
        res.json({ success: true, backupCodes: plainCodes, message: '2FA 已启用' });
    });

    app.post('/api/disable-2fa', async (req, res) => {
        const result = getCurrentUser(req);
        if (!result) return res.status(404).json({ message: '用户不存在' });

        const { user, users } = result;
        user.twoFactorEnabled = false, user.twoFactorSecret = null, user.backupCodes = [];
        touchAndSaveUser(users, user), res.json({ success: true });
    });

    app.post('/api/regenerate-backup-codes', async (req, res) => {
        const result = getCurrentUser(req);
        if (!result) return res.status(404).json({ message: '用户不存在' });
        const { user, users } = result;
        if (!user.twoFactorEnabled) return res.status(400).json({ message: '2FA未启用' });

        const { plainCodes, hashedCodes } = generateBackupCodes();
        user.backupCodes = hashedCodes, touchAndSaveUser(users, user), res.json({ backupCodes: plainCodes });
    });

    // ========== WebAuthn 硬件验证 API ==========
    app.post('/api/webauthn/register/begin', authLimiter, async (req, res) => {
        try {
            const result = getCurrentUser(req);
            if (!result) return res.status(401).json({ message: '未登录' });
            const { id, username, webauthnCredentials } = result.user, rpID = getRpId(req),
                options = await generateRegistrationOptions({
                    rpName: 'Your App',
                    rpID, userID: Buffer.from(String(id)),
                    userName: username, userDisplayName: username,
                    attestationType: 'none',
                    excludeCredentials: webauthnCredentials.map(cred => ({
                        id: cred.id,
                        type: 'public-key',
                        transports: cred.transports
                    })),
                    authenticatorSelection: { userVerification: 'preferred' },
                });
            req.session.webauthnRegisterChallenge = options.challenge, res.json(options);
        } catch (err) {
            return res.status(400).json({ message: err.message || '硬件验证初始化失败,请确保使用 HTTPS 或 localhost 访问;' });
        }
    });

    // 完成注册,保存凭证,并发送邮件通知
    app.post('/api/webauthn/register/complete', authLimiter, async (req, res) => {
        const { attestationResponse } = req.body, result = getCurrentUser(req);
        if (!result) return res.status(401).json({ message: '未登录' });

        const challenge = req.session.webauthnRegisterChallenge;
        if (!challenge) return res.status(400).json({ message: '缺少注册挑战' });

        const rpID = getRpId(req), origin = getOrigin(req);
        let verification;
        try {
            verification = await verifyRegistrationResponse({
                response: attestationResponse,
                expectedChallenge: challenge, expectedOrigin: origin, expectedRPID: rpID,
                requireUserVerification: false,
            });
        } catch (err) {
            return res.status(400).json({ message: err.message });
        }

        const { verified, registrationInfo } = verification;
        if (!verified || !registrationInfo) return res.status(400).json({ message: '注册验证未通过' });

        const cred = registrationInfo.credential;
        if (!cred) return res.status(400).json({ message: '凭证数据不完整' });

        const clientIp = getClientIp(req), { id, publicKey, counter, transports = [], deviceType, backedUp } = cred,
            newCredential = {
                id,
                publicKey: fromBuffer(publicKey),
                counter: Number(counter),
                transports, deviceType, backedUp,
                deviceName: clientIp, createdAt: Date.now()
            };

        result.user.webauthnCredentials.push(newCredential);
        if (!result.user.webauthnEnabled) result.user.webauthnEnabled = true;
        touchAndSaveUser(result.users, result.user), delete req.session.webauthnRegisterChallenge;
        await sendSecurityAlertEmail(req, result.user, 'webauthn_added');
        res.json({ success: true, credentials: result.user.webauthnCredentials });
    });

    // 获取用户凭证列表
    app.get('/api/webauthn/credentials', (req, res) => {
        const result = getCurrentUser(req);
        if (!result) return res.status(401).json({ message: '未登录' });
        res.json({ credentials: result.user.webauthnCredentials, enabled: result.user.webauthnEnabled });
    });

    // 删除某个硬件凭证
    app.post('/api/webauthn/credentials/delete', authLimiter, async (req, res) => {
        const { credentialId } = req.body;
        if (!credentialId) return res.status(400).json({ message: '缺少凭证ID' });

        const result = getCurrentUser(req);
        if (!result) return res.status(401).json({ message: '未登录' });
        if (!result.user) return res.status(500).json({ message: '用户数据异常' });

        const credentials = result.user.webauthnCredentials ?? [], index = credentials.findIndex(c => c.id === credentialId);
        if (index === -1) return res.status(404).json({ message: '凭证不存在' });

        credentials.splice(index, 1);
        if (credentials.length === 0) result.user.webauthnEnabled = false;
        result.user.webauthnCredentials = credentials;
        touchAndSaveUser(result.users, result.user), res.json({ success: true, message: '设备已删除' });
    });

    // 切换硬件验证启用状态
    app.post('/api/webauthn/toggle', authLimiter, async (req, res) => {
        const result = getCurrentUser(req);
        if (!result) return res.status(401).json({ message: '未登录' });
        if (!result.user.webauthnEnabled && result.user.webauthnCredentials.length === 0)
            return res.status(400).json({ message: '没有可用的硬件凭证,请先添加设备' });

        result.user.webauthnEnabled = !result.user.webauthnEnabled, touchAndSaveUser(result.users, result.user);
        res.json({ success: true, enabled: result.user.webauthnEnabled });
    });

    // 开始硬件验证登录（生成断言选项）
    app.post('/api/webauthn/login/begin', authLimiter, async (req, res) => {
        try {
            const { username } = req.body;
            if (!username) return res.status(400).json({ message: '缺少用户名' });
            const users = readUsers(), user = users.find(u => u.username === username || u.email === username);
            if (!user || !user.webauthnEnabled || user.webauthnCredentials.length === 0)
                return res.status(400).json({ message: '未启用硬件验证或无凭证' });

            const rpID = getRpId(req), origin = getOrigin(req),
                options = await generateAuthenticationOptions({
                    rpID,
                    allowCredentials: user.webauthnCredentials.map(cred => ({
                        id: cred.id,
                        type: 'public-key',
                        transports: cred.transports,
                    })),
                    userVerification: 'preferred', timeout: 60000,
                });

            req.session.webauthnLoginChallenge = options.challenge, req.session.webauthnLoginUserId = user.id;
            req.session.webauthnRpID = rpID, req.session.webauthnOrigin = origin, res.json(options);
        } catch (err) {
            return res.status(400).json({ message: err.message });
        }
    });

    // 完成硬件验证登录
    app.post('/api/webauthn/login/complete', authLimiter, async (req, res) => {
        try {
            const { assertionResponse } = req.body, { webauthnLoginChallenge, webauthnLoginUserId, webauthnRpID,
                webauthnOrigin } = req.session;

            if (!webauthnLoginChallenge || !webauthnLoginUserId || !webauthnRpID || !webauthnOrigin)
                return res.status(400).json({ message: '会话无效或已过期' });

            const users = readUsers(), user = users.find(u => u.id === webauthnLoginUserId);
            if (!user) return res.status(404).json({ message: '用户不存在' });

            let credential = user.webauthnCredentials.find(c => c.id === assertionResponse.id);
            if (!credential) {
                credential = user.webauthnCredentials.find(c => c.id.toLowerCase() === assertionResponse.id.toLowerCase());
                if (!credential) return res.status(400).json({ message: '凭证不匹配' });
            }

            const webauthnCredential = {
                id: credential.id,
                publicKey: toBuffer(credential.publicKey),
                counter: Number(credential.counter),
            },
                verification = await verifyAuthenticationResponse({
                    response: assertionResponse,
                    expectedChallenge: webauthnLoginChallenge,
                    expectedOrigin: webauthnOrigin,
                    expectedRPID: webauthnRpID,
                    credential: webauthnCredential,
                    requireUserVerification: false,
                }), { verified, authenticationInfo } = verification;
            if (!verified) return res.status(400).json({ message: '签名验证失败' });

            credential.counter = authenticationInfo.newCounter, touchAndSaveUser(users, user);
            ['webauthnLoginChallenge', 'webauthnLoginUserId', 'webauthnRpID', 'webauthnOrigin']
                .forEach(key => delete req.session[key]);
            req.session.userId = user.id, req.session.username = user.username, req.session.loginTime = Date.now();
            recentPasswordResets.delete(user.email), res.json({ success: true });
        } catch (err) {
            return res.status(400).json({ message: err.message });
        }
    });
    console.log('✅ 认证路由已加载（account.js）');
}