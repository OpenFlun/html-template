/**
 * @description 公共中间件（如 CORS 设置等）
 * @type {import('express').RequestHandler<
 *   import('express-serve-static-core').ParamsDictionary,
 *   unknown,   // 响应体类型
 *   unknown,   // 请求体类型
 *   import('qs').ParsedQs,
 *   Record<string, unknown>  // locals 类型
 * >}
 */
const corsMiddleware = (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-CSRF-Token');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");

    if (req.method === 'OPTIONS') {
        res.setHeader('Content-Length', '0');
        return res.status(204).end();
    }
    next();
};

/** @type {boolean} */
const trustProxySetting = false;

export { corsMiddleware, trustProxySetting };