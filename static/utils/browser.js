/* 基于 @simplewebauthn/browser 修改,前端自动检测操作系统,Windows 下启用原生模拟 */
!function (e, t) {
    "object" == typeof exports && "undefined" != typeof module ? t(exports) : "function" == typeof define && define.amd
        ? define(["exports"], t) : t((e = "undefined" != typeof globalThis ? globalThis : e || self).flunWebAuthnBrowser = {})
}(this, e => {
    "use strict";
    const defaultPropDescriptor = { enumerable: true, configurable: true, writable: true, value: void 0 },
        falsePromise = Promise.resolve(false),
        bufferToBase64URLString = e => {
            const t = new Uint8Array(e);
            let r = "";
            for (const e of t) r += String.fromCharCode(e);
            return btoa(r).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
        },
        base64URLStringToBuffer = e => {
            const t = e.replace(/-/g, "+").replace(/_/g, "/"), r = (4 - t.length % 4) % 4, n = t.padEnd(t.length + r, "="),
                o = atob(n), i = new ArrayBuffer(o.length), a = new Uint8Array(i);
            for (let e = 0; e < o.length; e++) a[e] = o.charCodeAt(e);
            return i
        },
        o = { stubThis: e => e },
        browserSupportsWebAuthn = () =>
            o.stubThis(void 0 !== globalThis?.PublicKeyCredential && "function" == typeof globalThis.PublicKeyCredential),
        convertAllowCredential = e => {
            const { id: t } = e;
            return { ...e, id: base64URLStringToBuffer(t), transports: e.transports }
        },
        isValidDomain = e =>
            "localhost" === e || /^((xn--[a-z0-9-]+|[a-z0-9]+(-[a-z0-9]+)*)\.)+([a-z]{2,}|xn--[a-z0-9-]+)$/i.test(e),
        WebAuthnAbortService = new class {
            constructor() {
                Object.defineProperty(this, "controller", defaultPropDescriptor)
            }
            createNewAbortSignal() {
                if (this.controller) {
                    const e = new Error("正在取消已有的 WebAuthn API 调用,然后进行新的调用");
                    e.name = "AbortError", this.controller.abort(e)
                }
                const e = new AbortController;
                return this.controller = e, e.signal
            }
            cancelCeremony() {
                if (this.controller) {
                    const e = new Error("正在取消 WebAuthn API 调用");
                    e.name = "AbortError", this.controller.abort(e), this.controller = void 0
                }
            }
        },
        authenticatorAttachmentValues = ["cross-platform", "platform"],
        normalizeAuthenticatorAttachment = e => {
            if (e && !(authenticatorAttachmentValues.indexOf(e) < 0)) return e
        },
        warnExtensionMishandling = (e, t) => {
            console.warn(`拦截此 WebAuthn API 调用的浏览器扩展错误地实现了 ${e};请向扩展开发者报告此问题;\n`, t)
        },
        p = { stubThis: e => e },
        browserSupportsWebAuthnAutofill = () => {
            if (!browserSupportsWebAuthn()) return p.stubThis(falsePromise);
            const e = globalThis.PublicKeyCredential;
            return void 0 === e?.isConditionalMediationAvailable ? p.stubThis(falsePromise)
                : p.stubThis(e.isConditionalMediationAvailable())
        },
        // 提取 base64url ID
        extractBase64Id = obj => {
            if (!obj) return undefined;
            const id = obj.id;
            if (typeof id === 'string') return id;
            if (id && typeof id === 'object' && id.type === 'Buffer' && Array.isArray(id.data))
                return bufferToBase64URLString(Uint8Array.from(id.data));
            if (id instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(id)))
                return bufferToBase64URLString(id);
            return undefined;
        },
        normalizeOptions = input => {
            if (!input) return null;
            if (input.optionsJSON) return input;
            if (input.challenge) return { optionsJSON: input };
            return null;
        },
        // 前端自动检测操作系统是否为 Windows
        isWindows = (() => {
            const ua = navigator.userAgent || '';
            return /Windows/i.test(ua) || /Win32/i.test(ua) || /Win64/i.test(ua);
        })();

    class WebAuthnError extends Error {
        constructor({ message: e, code: t, cause: r, name: n }) {
            super(e, { cause: r });
            Object.defineProperty(this, "code", defaultPropDescriptor), this.name = n ?? r.name, this.code = t
        }
    };

    // 导出
    // 1. 内部工具（高级用户使用）
    e.WebAuthnAbortService = WebAuthnAbortService;
    e._browserSupportsWebAuthnAutofillInternals = p;
    e._browserSupportsWebAuthnInternals = o;
    // 2. 编解码工具
    e.base64URLStringToBuffer = base64URLStringToBuffer;
    e.bufferToBase64URLString = bufferToBase64URLString;
    // 3. 环境/功能检测工具
    e.browserSupportsWebAuthn = browserSupportsWebAuthn;
    e.browserSupportsWebAuthnAutofill = browserSupportsWebAuthnAutofill;
    e.platformAuthenticatorIsAvailable = () => {
        return browserSupportsWebAuthn() ? PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable() : falsePromise;
    };
    // 4. 错误类
    e.WebAuthnError = WebAuthnError;
    // 5. 核心方法（注册和认证）
    e.startRegistration = async e => {
        const normalized = normalizeOptions(e);
        if (!normalized) throw new Error('startRegistration 需要传入包含 optionsJSON 或 challenge 的对象');

        e = normalized;
        if (isWindows) {
            const optionsJSON = e.optionsJSON || e, userId = extractBase64Id(optionsJSON?.user) || crypto.randomUUID();
            return {
                id: userId,
                rawId: bufferToBase64URLString(base64URLStringToBuffer(userId)),
                response: {
                    attestationObject: '', clientDataJSON: '', transports: [],
                    publicKeyAlgorithm: -7, publicKey: '', authenticatorData: ''
                },
                type: 'public-key',
                clientExtensionResults: {},
                authenticatorAttachment: 'platform',
                native: true
            };
        }

        // 标准 WebAuthn
        if (!browserSupportsWebAuthn()) throw new Error("当前浏览器不支持 WebAuthn");
        const { optionsJSON: o, useAutoRegister: c = !1 } = e,
            h = {
                ...o, challenge: base64URLStringToBuffer(o.challenge),
                user: { ...o.user, id: base64URLStringToBuffer(o.user.id) },
                excludeCredentials: o.excludeCredentials?.map(convertAllowCredential)
            }, p = {};
        let f;
        if (c) p.mediation = "conditional";
        p.publicKey = h, p.signal = WebAuthnAbortService.createNewAbortSignal();
        try {
            f = await navigator.credentials.create(p)
        } catch (error) {
            throw (({ error: e, options: t }) => {
                const { publicKey: r } = t;
                if (!r) throw new Error("options 缺少必需的 publicKey 属性");
                if ("AbortError" === e.name) {
                    if (t.signal instanceof AbortSignal) return new WebAuthnError({
                        message: "注册流程收到了中止信号", code: "ERROR_CEREMONY_ABORTED", cause: e
                    })
                } else if ("ConstraintError" === e.name) {
                    if (!0 === r.authenticatorSelection?.requireResidentKey) return new WebAuthnError({
                        message: "要求使用可发现凭证,但可用的验证器不支持",
                        code: "ERROR_AUTHENTICATOR_MISSING_DISCOVERABLE_CREDENTIAL_SUPPORT", cause: e
                    });
                    if ("conditional" === t.mediation && "required" === r.authenticatorSelection?.userVerification)
                        return new WebAuthnError({
                            message: "自动注册时要求用户验证,但无法执行",
                            code: "ERROR_AUTO_REGISTER_USER_VERIFICATION_FAILURE", cause: e
                        });
                    if ("required" === r.authenticatorSelection?.userVerification) return new WebAuthnError({
                        message: "要求用户验证,但可用的验证器不支持",
                        code: "ERROR_AUTHENTICATOR_MISSING_USER_VERIFICATION_SUPPORT", cause: e
                    })
                } else {
                    if ("InvalidStateError" === e.name) return new WebAuthnError({
                        message: "该验证器已被注册过", code: "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED", cause: e
                    });
                    if ("NotAllowedError" === e.name) return new WebAuthnError({
                        message: e.message, code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY", cause: e
                    });
                    if ("NotSupportedError" === e.name) {
                        if (0 === r.pubKeyCredParams.filter((e => "public-key" === e.type)).length) return new WebAuthnError({
                            message: 'pubKeyCredParams 中没有 type 为 "public-key" 的条目',
                            code: "ERROR_MALFORMED_PUBKEYCREDPARAMS", cause: e
                        });
                        return new WebAuthnError({
                            message: "没有可用的验证器支持指定的任何 pubKeyCredParams 算法",
                            code: "ERROR_AUTHENTICATOR_NO_SUPPORTED_PUBKEYCREDPARAMS_ALG", cause: e
                        })
                    }
                    if ("SecurityError" === e.name) {
                        const t = globalThis.location.hostname;
                        if (!isValidDomain(t)) return new WebAuthnError({
                            message: `${globalThis.location.hostname} 是无效域名`, code: "ERROR_INVALID_DOMAIN", cause: e
                        });
                        if (r.rp.id !== t) return new WebAuthnError({
                            message: `RP ID "${r.rp.id}" 对于当前域名无效`, code: "ERROR_INVALID_RP_ID", cause: e
                        })
                    } else if ("TypeError" === e.name) {
                        if (r.user.id.byteLength < 1 || r.user.id.byteLength > 64) return new WebAuthnError({
                            message: "用户 ID 长度不在1~64字节之间", code: "ERROR_INVALID_USER_ID_LENGTH", cause: e
                        })
                    } else if ("UnknownError" === e.name) return new WebAuthnError({
                        message: "验证器无法处理指定的选项或创建新的凭证", code: "ERROR_AUTHENTICATOR_GENERAL_ERROR", cause: e
                    })
                }
                return e
            })({ error, options: p })
        }
        if (!f) throw new Error("注册未完成");
        const { id: b, rawId: R, response: g, type: w } = f;
        let A, E, m, y;
        if ("function" == typeof g.getTransports) A = g.getTransports();
        if ("function" == typeof g.getPublicKeyAlgorithm) {
            try { E = g.getPublicKeyAlgorithm() }
            catch (e) { warnExtensionMishandling("getPublicKeyAlgorithm()", e) }
        }
        if ("function" == typeof g.getPublicKey) {
            try {
                const e = g.getPublicKey();
                null !== e && (m = bufferToBase64URLString(e))
            } catch (e) { warnExtensionMishandling("getPublicKey()", e) }
        }
        if ("function" == typeof g.getAuthenticatorData) {
            try { y = bufferToBase64URLString(g.getAuthenticatorData()) }
            catch (e) { warnExtensionMishandling("getAuthenticatorData()", e) }
        }
        return {
            id: b,
            rawId: bufferToBase64URLString(R),
            response: {
                attestationObject: bufferToBase64URLString(g.attestationObject),
                clientDataJSON: bufferToBase64URLString(g.clientDataJSON),
                transports: A, publicKeyAlgorithm: E, publicKey: m, authenticatorData: y
            },
            type: w,
            clientExtensionResults: f.getClientExtensionResults(),
            authenticatorAttachment: normalizeAuthenticatorAttachment(f.authenticatorAttachment)
        }
    };
    e.startAuthentication = async e => {
        const normalized = normalizeOptions(e);
        if (!normalized) throw new Error('startAuthentication 需要传入包含 optionsJSON 或 challenge 的对象');
        e = normalized;

        // Windows 下自动启用原生认证模块
        if (isWindows) {
            const accountId = e.accountId || extractBase64Id(e.optionsJSON?.allowCredentials?.[0]);
            if (!accountId) throw new Error('未找到硬件凭证 ID,请确认已注册设备或使用备用码登录');
            return {
                id: accountId,
                rawId: bufferToBase64URLString(base64URLStringToBuffer(accountId)),
                response: { authenticatorData: '', clientDataJSON: '', signature: '', userHandle: '' },
                type: 'public-key',
                clientExtensionResults: {},
                authenticatorAttachment: 'platform',
                native: true
            };
        }

        // 标准 WebAuthn
        if (!browserSupportsWebAuthn()) throw new Error("当前浏览器不支持 WebAuthn");
        const { optionsJSON: o, useBrowserAutofill: c = !1, verifyBrowserAutofillInput: d = !0 } = e;
        let p, R;
        if (0 !== o.allowCredentials?.length) p = o.allowCredentials?.map(convertAllowCredential);
        const f = { ...o, challenge: base64URLStringToBuffer(o.challenge), allowCredentials: p }, b = {};
        if (c) {
            if (!await browserSupportsWebAuthnAutofill()) throw new Error("当前浏览器不支持 WebAuthn 自动填充");
            if (document.querySelectorAll("input[autocomplete$='webauthn']").length < 1 && d)
                throw new Error('未检测到任何 autocomplete 属性值以 "webauthn" 结尾的 <input> 元素');
            b.mediation = "conditional", f.allowCredentials = []
        }
        b.publicKey = f, b.signal = WebAuthnAbortService.createNewAbortSignal();
        try {
            R = await navigator.credentials.get(b)
        } catch (error) {
            throw (({ error: e, options: t }) => {
                const { publicKey: r } = t;
                if (!r) throw new Error("options 缺少必需的 publicKey 属性");
                if ("AbortError" === e.name) {
                    if (t.signal instanceof AbortSignal) return new WebAuthnError({
                        message: "认证流程收到了中止信号", code: "ERROR_CEREMONY_ABORTED", cause: e
                    })
                } else {
                    if ("NotAllowedError" === e.name) return new WebAuthnError({
                        message: e.message, code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY", cause: e
                    });
                    if ("SecurityError" === e.name) {
                        const t = globalThis.location.hostname;
                        if (!isValidDomain(t)) return new WebAuthnError({
                            message: `${globalThis.location.hostname} 是无效域名`, code: "ERROR_INVALID_DOMAIN", cause: e
                        });
                        if (r.rpId !== t) return new WebAuthnError({
                            message: `RP ID "${r.rpId}" 对于当前域名无效`, code: "ERROR_INVALID_RP_ID", cause: e
                        })
                    } else if ("UnknownError" === e.name) return new WebAuthnError({
                        message: "验证器无法处理指定的选项或创建新的断言签名", code: "ERROR_AUTHENTICATOR_GENERAL_ERROR", cause: e
                    })
                }
                return e
            })({ error, options: b })
        }
        if (!R) throw new Error("认证未完成");
        const { id: g, rawId: w, response: A, type: E } = R;
        let m;
        if (A.userHandle) m = bufferToBase64URLString(A.userHandle);
        return {
            id: g,
            rawId: bufferToBase64URLString(w),
            response: {
                authenticatorData: bufferToBase64URLString(A.authenticatorData),
                clientDataJSON: bufferToBase64URLString(A.clientDataJSON),
                signature: bufferToBase64URLString(A.signature),
                userHandle: m
            },
            type: E,
            clientExtensionResults: R.getClientExtensionResults(),
            authenticatorAttachment: normalizeAuthenticatorAttachment(R.authenticatorAttachment)
        }
    };
});