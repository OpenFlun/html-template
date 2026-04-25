/* 基于[@simplewebauthn/browser@13.3.0] 开发 */
!function (e, t) {
    "object" == typeof exports && "undefined" != typeof module ? t(exports) : "function" == typeof define && define.amd
        ? define(["exports"], t) : t((e = "undefined" != typeof globalThis ? globalThis : e || self).flunWebAuthnBrowser = {})
}(this, e => {
    "use strict";

    const defaultPropDescriptor = { enumerable: true, configurable: true, writable: true, value: void 0 },
        falsePromise = Promise.resolve(false),
        // 将 ArrayBuffer 转换为 Base64URL 字符串
        bufferToBase64URLString = (e) => {
            const t = new Uint8Array(e);
            let r = "";
            for (const e of t) r += String.fromCharCode(e);
            return btoa(r).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
        },
        // 将 Base64URL 字符串转换为 ArrayBuffer
        base64URLStringToBuffer = (e) => {
            const t = e.replace(/-/g, "+").replace(/_/g, "/"), r = (4 - t.length % 4) % 4, n = t.padEnd(t.length + r, "="),
                o = atob(n), i = new ArrayBuffer(o.length), a = new Uint8Array(i);
            for (let e = 0; e < o.length; e++) a[e] = o.charCodeAt(e);
            return i
        },
        o = { stubThis: e => e },
        // 检查浏览器是否支持 WebAuthn
        browserSupportsWebAuthn = () =>
            o.stubThis(void 0 !== globalThis?.PublicKeyCredential && "function" == typeof globalThis.PublicKeyCredential),
        // 转换允许凭证中的 ID 字段
        convertAllowCredential = e => {
            const { id: t } = e;
            return { ...e, id: base64URLStringToBuffer(t), transports: e.transports }
        },
        // 验证域名有效性
        isValidDomain = e =>
            "localhost" === e || /^((xn--[a-z0-9-]+|[a-z0-9]+(-[a-z0-9]+)*)\.)+([a-z]{2,}|xn--[a-z0-9-]+)$/i.test(e),

        // WebAuthn 中止服务（用于取消进行中的认证/注册）
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
        normalizeAuthenticatorAttachment = (e) => {
            if (e && !(authenticatorAttachmentValues.indexOf(e) < 0)) return e
        },
        warnExtensionMishandling = (e, t) => {
            console.warn(`拦截此 WebAuthn API 调用的浏览器扩展错误地实现了 ${e};请向扩展开发者报告此问题;\n`, t)
        },
        p = { stubThis: e => e },
        // 检查浏览器是否支持 WebAuthn 自动填充
        browserSupportsWebAuthnAutofill = () => {
            if (!browserSupportsWebAuthn()) return p.stubThis(falsePromise);
            const e = globalThis.PublicKeyCredential;
            return void 0 === e?.isConditionalMediationAvailable ? p.stubThis(falsePromise)
                : p.stubThis(e.isConditionalMediationAvailable())
        };

    // 自定义 WebAuthn 错误类
    class WebAuthnError extends Error {
        constructor({ message: e, code: t, cause: r, name: n }) {
            super(e, { cause: r });
            Object.defineProperty(this, "code", defaultPropDescriptor), this.name = n ?? r.name, this.code = t
        }
    };

    // 导出内部工具（供测试/扩展使用）
    e.WebAuthnAbortService = WebAuthnAbortService;
    e.WebAuthnError = WebAuthnError;
    e._browserSupportsWebAuthnAutofillInternals = p;
    e._browserSupportsWebAuthnInternals = o;
    e.base64URLStringToBuffer = base64URLStringToBuffer;
    e.browserSupportsWebAuthn = browserSupportsWebAuthn;
    e.browserSupportsWebAuthnAutofill = browserSupportsWebAuthnAutofill;
    e.bufferToBase64URLString = bufferToBase64URLString;
    e.platformAuthenticatorIsAvailable = () => {
        return browserSupportsWebAuthn() ? PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable() : falsePromise;
    };

    // 开始认证（登录）
    e.startAuthentication = async e => {
        if (!e.optionsJSON && e.challenge) {
            console.warn(`startAuthentication() 调用方式不正确;将尝试继续使用提供的选项,但建议按照正确的调用结构重构;`);
            e = { optionsJSON: e }
        }
        const { optionsJSON: o, useBrowserAutofill: c = !1, verifyBrowserAutofillInput: d = !0 } = e;
        if (!browserSupportsWebAuthn()) throw new Error("当前浏览器不支持 WebAuthn");
        let p, R;
        if (0 !== o.allowCredentials?.length) p = o.allowCredentials?.map(convertAllowCredential);
        const f = { ...o, challenge: base64URLStringToBuffer(o.challenge), allowCredentials: p }, b = {};
        if (c) {
            if (!await browserSupportsWebAuthnAutofill()) throw new Error("当前浏览器不支持 WebAuthn 自动填充");
            if (document.querySelectorAll("input[autocomplete$='webauthn']").length < 1 && d)
                throw new Error('未检测到任何 `autocomplete` 属性值以 "webauthn" 结尾的 <input> 元素');
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

    // 开始注册（创建凭证）
    e.startRegistration = async e => {
        if (!e.optionsJSON && e.challenge) {
            console.warn("startRegistration() 调用方式不正确;将尝试继续使用提供的选项,但建议按照正确的调用结构重构;");
            e = { optionsJSON: e }
        }
        const { optionsJSON: o, useAutoRegister: c = !1 } = e;
        if (!browserSupportsWebAuthn()) throw new Error("当前浏览器不支持 WebAuthn");
        const h = {
            ...o, challenge: base64URLStringToBuffer(o.challenge),
            user: {
                ...o.user, id: base64URLStringToBuffer(o.user.id)
            },
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
    }
});