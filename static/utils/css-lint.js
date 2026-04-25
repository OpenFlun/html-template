// 根目录/utils/css-lint.js
/**
 * 自定义 CSS Lint 函数(适配 CSSTree 的中文消息)，由 CodeMirror 的 lint 插件自动调用;
 *
 * @param {string} text           - 编辑器文本:用于解析和检查语法;
 * @param {function} callback     - 回调函数,接收检查结果数组:用于向编辑器反馈错误/警告;
 * @param {object} [_options]     - lint 配置选项中传入的自定义属性:用于传递用户偏好、开关、环境变量等;
 * @param {CodeMirror} [_cm]      - 当前的编辑器实例:获取光标位置、选中的文本、行信息、编辑器状态等，
 *                                      实现更智能的检查(如只检查可见区域、根据光标位置优化提示等);
 */
function customCssLint(text, callback, _options, _cm) {
    const annotations = [], lines = text.split('\n'), syntaxErrors = [];
    let ast = null;
    if (!text.trim()) return callback(annotations);
    if (typeof csstree === 'undefined') return console.error('csstree未加载,lint功能不可用'), callback(annotations);

    /**
     * 将CSSTree原始的英文错误消息转换为中文提示；
     * @param {string} originalMsg - 原始错误消息；
     * @returns {string} 本地化后的错误消息；
     */
    function localizeLintMessage(originalMsg) {
        if (originalMsg.includes("Unexpected input")) return "意外的输入,波浪线后缺少分号或大括号或存在非法字符";
        if (originalMsg.includes("Identifier is expected")) return "波浪线后存在非法字符或缺少大括号或使用了CSS嵌套";
        if (originalMsg.includes("Declaration is expected")) return "声明错误，波浪线后缺少分号或大括号";
        if (originalMsg.includes("Selector is expected")) return "选择器错误，波浪线后不应为大括号或多余";
        if (originalMsg.includes('")" is expected')) return "当前行缺少闭合小括号或某个单词书写错误或参数中存在注释";
        if (originalMsg.includes('Identifier or parenthesis is expected')) return "当前行缺少标识符或括号";
        if (originalMsg.includes('Semicolon or block is expected')) return "当前行缺少分号或大括号";
        if (originalMsg.includes('<empty string>')) return "输入空字符串无效";

        const mismatchMatch = originalMsg.match(/Mismatch\s*(?:syntax\s*:)?\s*(.+?)(?:\s*value\s*:|\s*$)/is);
        if (mismatchMatch) {
            let expectedRaw = mismatchMatch[1].trim(), actualRaw = '';
            const valueMatch = originalMsg.match(/value\s*:\s*(.+?)(?:\s*$|\n)/is);
            if (valueMatch) actualRaw = valueMatch[1].trim();

            // 清理->只取第一行
            expectedRaw = expectedRaw.split('\n')[0].trim(), actualRaw = actualRaw.split('\n')[0].trim();
            const expectedParts = expectedRaw.split(/\s*\|\s*/),
                translatedParts = expectedParts.map(part => {
                    part = part.trim();
                    if (part === '<length>') return '长度单位';
                    if (part === '<percentage>') return '百分比';
                    if (part === '<color>') return '颜色值';
                    if (part === '<number>') return '数字';
                    if (part === '<integer>') return '整数';
                    if (part === '<string>') return '字符串';
                    if (part === 'auto') return 'auto';
                    if (part === 'none') return 'none';
                    if (part === 'inherit') return 'inherit';
                    if (part === 'initial') return 'initial';
                    return part;
                }),

                expectedDisplay = translatedParts.join(' | ');
            return actualRaw ? `当前行属性无效:${actualRaw}\n 请修正:${expectedDisplay}` : `请修正为:${expectedDisplay}`;
        }

        if (originalMsg.startsWith('Unknown property')) {
            const prop = originalMsg.replace('Unknown property', '').trim();
            return `未知属性 ${prop}`;
        }

        // 未知@规则映射
        if (originalMsg.startsWith('Unknown at-rule')) {
            const atRule = originalMsg.replace('Unknown at-rule', '').trim();
            return `未知的 @规则 ${atRule}`;
        }

        return `CSS 错误:${originalMsg}`;
    }

    /**
     * 判断 AST 节点中是否包含 var() 函数
     * @param {object} node - CSSTree 节点
     * @returns {boolean}
     */
    function containsVar(node) {
        if (!node) return false;
        let found = false;
        csstree.walk(node, {
            visit: 'Function',
            enter: funcNode => {
                if (funcNode.name === 'var') {
                    found = true;
                    return csstree.walk.BREAK;
                }
            }
        });
        return found;
    }

    /**
     * 处理匹配失败的情况，添加本地化错误注解
     * @param {object} match - 匹配结果对象 (包含 matched 和 error)
     * @param {object} location - 错误位置 (如 node.loc)
     * @param {string} defaultMsg - 默认错误消息（当 match.error 不存在时使用）
     * @param {Array} annotations - 存储注解的数组
     */
    function addMatchError(match, location, defaultMsg, annotations) {
        if (!match.matched) {
            let message = match.error ? match.error.message : defaultMsg;
            message = localizeLintMessage(message);
            addAnnotation(annotations, location, message, 'error');
        }
    }

    try {
        ast = csstree.parse(text, {
            positions: true,
            onParseError: error => {
                if (syntaxErrors.length > 0) return; // 重要设计:只保留第一个解析错误
                const lineText = lines[error.line - 1] || '';
                if (error.message.includes('Identifier is expected') && /^\s*@\w+\s*:/.test(lineText)) return;

                let line = error.line - 1, ch = error.column - 1;
                const msg = error.message, missingErrors =
                    ["Unexpected input", "Identifier is expected", "Declaration is expected", "Selector is expected"];

                if (missingErrors.some(e => msg.includes(e))) {
                    if (line >= lines.length) line = lines.length - 1, ch = lines[line].length;
                    if (line > 0) {
                        let targetLine = line - 1;
                        while (targetLine >= 0 && lines[targetLine].trim() === '') targetLine--;
                        if (targetLine >= 0) line = targetLine, ch = lines[line].length;
                    }
                }

                const lineLength = lines[line] ? lines[line].length : 0, toCh = (ch === lineLength) ? ch : ch + 1;
                let fromCh = (ch > 0) ? ch - 1 : ch;
                if (ch === lineLength) fromCh = Math.max(0, lineLength - 1);
                else fromCh = ch;

                syntaxErrors.push({
                    from: { line, ch: fromCh }, to: { line, ch: toCh },
                    message: localizeLintMessage(msg), severity: 'error'
                });
            }
        });
    } catch (e) {
        return callback(syntaxErrors);
    }

    if (syntaxErrors.length > 0) return callback(syntaxErrors);

    /**
     * 将 CSSTree 的位置信息转换为 CodeMirror 注解并添加到结果数组
     * @param {Array} annotations - 存储注解的数组
     * @param {object} location - 包含 start/end 的位置对象 (如 node.loc)
     * @param {string} message - 提示信息
     * @param {string} severity - 严重级别 ('error' 或 'warning')
     */
    function addAnnotation(annotations, location, message, severity = 'error') {
        if (!location) return;
        const { start, end } = location;
        if (start && end) {
            annotations.push({
                from: { line: start.line - 1, ch: start.column - 1 },
                to: { line: end.line - 1, ch: end.column },
                message, severity
            });
        }
    }

    /**
     * 遍历CSS AST节点，检查并报告未知的CSS单位；
     * @param {object} node - CSSTree 语法树节点；
     * @param {Array} annotations - 用于存储错误信息的数组；
     */
    function validateUnits(node, annotations) {
        if (containsVar(node)) return;

        csstree.walk(node, {
            visit: 'Dimension',
            enter: dimNode => {
                const unit = dimNode.unit,
                    // 常见 CSS 单位列表
                    validUnits = [
                        'px', 'em', 'rem', 'ex', 'ch', 'vw', 'vh', 'vmin', 'vmax', '%', 'cm', 'mm', 'in', 'pt', 'pc', 'q',
                        'dpi', 'dpcm', 'dppx', 's', 'ms', 'hz', 'khz', 'deg', 'grad', 'rad', 'turn'
                    ];
                if (!validUnits.includes(unit)) addAnnotation(annotations, dimNode.loc, `未知的单位:${unit}`);
            }
        });
    }

    // 语义检查
    if (ast) {
        // 收集所有 @规则
        const atRules = [];
        csstree.walk(ast, { visit: 'Atrule', enter: node => atRules.push(node) });

        // @charset 检查
        const charsetNodes = atRules.filter(node => node.name === 'charset');
        if (charsetNodes.length > 1)
            charsetNodes.forEach(node => addAnnotation(annotations, node.loc, '@charset 只能出现一次', 'error'));
        else if (charsetNodes.length === 1 && atRules[0]?.name !== 'charset')
            addAnnotation(annotations, atRules[0].loc, '@charset 必须位于样式表最前面', 'error');

        // @import 位置检查
        let seenNonImport = false; // 是否出现过非 @charset 且非 @import 的规则
        for (const node of atRules) {
            if (node.name === 'charset') continue;
            if (node.name === 'import' && seenNonImport)
                addAnnotation(annotations, node.loc, '@import 必须在其他规则（除 @charset 外）之前', 'error');
            else if (node.name !== 'import') seenNonImport = true;
        }

        // ---------- 上下文感知：维护@规则栈 ----------
        const descriptorAtrules = new Set(['page', 'font-face', 'viewport', 'counter-style', 'property']), atruleStack = [];

        // 详细检查（带 enter/leave 以维护栈）
        csstree.walk(ast, {
            enter: node => {
                const { type, property, value, loc, name, prelude } = node;

                // 进入 @规则时压栈
                if (type === 'Atrule') atruleStack.push(name);
                if (type === 'Declaration') {
                    const hasVar = containsVar(value);

                    // 处理自定义属性（以 -- 开头）
                    if (property.startsWith('--')) {
                        if (!hasVar) validateUnits(value, annotations);
                        return;
                    }

                    // 判断当前所处的@规则上下文(最近嵌套的 @规则)
                    const currentAtrule = atruleStack.length > 0 ? atruleStack[atruleStack.length - 1] : null,
                        isInsideDescriptorAtrule = currentAtrule && descriptorAtrules.has(currentAtrule);

                    // 位于支持描述符的@规则内,使用 matchAtruleDescriptor
                    if (isInsideDescriptorAtrule) {
                        const currentAtrule = atruleStack[atruleStack.length - 1];
                        let matched = false, match = null;

                        try {
                            match = csstree.lexer.matchAtruleDescriptor(currentAtrule, property, value);
                            if (match.matched) matched = true;
                        } catch (e) { }

                        // 如果描述符匹配失败,且属性不是自定义属性,尝试作为普通属性匹配
                        if (!matched && !property.startsWith('--')) {
                            const propDef = csstree.lexer.getProperty(property);
                            if (propDef) {
                                try {
                                    match = csstree.lexer.matchProperty(property, value);
                                    if (match.matched) matched = true;
                                } catch (e) { }
                            }
                        }

                        // 根据匹配结果处理
                        if (matched && !hasVar) validateUnits(value, annotations);
                        if (!matched) {
                            const errMsg = match && !match.matched ? match.error?.message
                                : `无效的 ${currentAtrule} 描述符 '${property}'`;
                            addMatchError({ matched: false, error: { message: errMsg } }, value.loc || loc, errMsg, annotations);
                        }
                        return;
                    }

                    // 普通规则或位于不支持描述符的@规则内,使用标准属性验证
                    const propertyDef = csstree.lexer.getProperty(property);
                    if (!propertyDef) {
                        addAnnotation(annotations, loc, `未知属性 '${property}'`, 'warning');
                        if (!hasVar) validateUnits(value, annotations);
                        return;
                    }
                    if (hasVar) return;

                    const match = csstree.lexer.matchProperty(property, value);
                    addMatchError(match, value.loc || loc, `无效的属性值 '${property}'`, annotations);
                    validateUnits(value, annotations);
                }
                else if (type === 'Atrule') {
                    if (prelude) {
                        if (name !== 'page') {
                            const preludeSyntax = csstree.lexer.getAtrulePrelude(name);
                            if (preludeSyntax) {
                                const match = csstree.lexer.matchAtrulePrelude(name, prelude);
                                addMatchError(match, prelude.loc || loc, `无效的 ${name} 规则条件`, annotations);
                                if (!containsVar(prelude)) validateUnits(prelude, annotations);
                            }
                        }
                        if (!containsVar(prelude)) validateUnits(prelude, annotations);
                    }
                }
                else if (type === 'KeyframeSelector') {
                    csstree.walk(node, {
                        visit: 'Identifier',
                        enter: idNode => {
                            const name = idNode.name;
                            if (name !== 'from' && name !== 'to')
                                addAnnotation(annotations, idNode.loc, `关键帧选择器只能为 from、to 或百分比`, 'error');
                        }
                    });
                }
            },
            leave: node => {
                if (node.type === 'Atrule') atruleStack.pop();
            }
        });
    }

    callback(annotations);
}