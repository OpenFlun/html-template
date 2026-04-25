// 根目录/utils/closebrackets.js
/**
 * closebrackets.js - CodeMirror 自定义自动括号补全插件(基于6.65.7版本的优化)
 *
 * 本插件为 CodeMirror 编辑器提供智能括号补全功能。当用户输入左括号时，自动插入对应的右括号，
 * 并支持在空括号对中使用退格键同时删除两个括号，以及在括号对中按回车时自动缩进;
 * 可通过配置选项自定义括号对、触发字符等;优化:添加了括号平衡检查,代码现代化;
 *
 * @author flun and others
 * @license ISC
 */

(function (mod) {
    // CommonJS, AMD 和普通浏览器环境的模块加载兼容处理
    if (typeof exports === "object" && typeof module === "object") mod(require("../../lib/codemirror"));
    else if (typeof define === "function" && define.amd) define(["../../lib/codemirror"], mod);
    else mod(CodeMirror);
})(CodeMirror => {
    const { Pos } = CodeMirror, defaults = { pairs: `()[]{}''""`, closeBefore: `)]}'":;>`, triples: "", explode: "[]{}" },
        bstring = /\bstring/,
        getOption = (conf, name) =>
            name === "pairs" && typeof conf === "string" ? conf : conf && conf[name] != null ? conf[name] : defaults[name],
        getConfig = cm => {
            const deflt = cm.state.closeBrackets;
            if (!deflt || deflt.override) return deflt;
            const mode = cm.getModeAt(cm.getCursor());
            return mode.closeBrackets || deflt;
        },
        charsAround = (cm, pos) => {
            const str = cm.getRange(Pos(pos.line, pos.ch - 1), Pos(pos.line, pos.ch + 1));
            return str.length === 2 ? str : null;
        },
        stringStartsAfter = (cm, pos) => {
            const { type, start } = cm.getTokenAt(Pos(pos.line, pos.ch + 1));
            return bstring.test(type) && start === pos.ch && (pos.ch === 0 || !bstring.test(cm.getTokenTypeAt(pos)));
        },
        moveSel = (cm, dir) => {
            const ranges = cm.listSelections(), newRanges = [];
            let primary = 0;
            for (let i = 0; i < ranges.length; i++) {
                const range = ranges[i], { ch, line } = range.head, pos = ch || dir > 0 ? { line, ch: ch + dir } : { line: line - 1 };
                if (range.head === cm.getCursor()) primary = i;
                newRanges.push({ anchor: pos, head: pos });
            }
            cm.setSelections(newRanges, primary);
        },
        contractSelection = sel => {
            const { anchor, head } = sel, dir = CodeMirror.cmpPos(anchor, head) > 0 ? -1 : 1;
            return { anchor: new Pos(anchor.line, anchor.ch + dir), head: new Pos(head.line, head.ch - dir) };
        },
        // 通用按键处理：封装配置、禁用输入、选项存在性、选区合法性检查,通过后执行 action
        handleWithOption = (optionName, action) => cm => {
            const conf = getConfig(cm);
            if (!conf || cm.getOption("disableInput")) return CodeMirror.Pass;
            const optionValue = getOption(conf, optionName);
            if (!optionValue) return CodeMirror.Pass;

            const ranges = cm.listSelections(),
                isValid = ranges.every(range => {
                    if (!range.empty()) return false;
                    const around = charsAround(cm, range.head);
                    return around && optionValue.indexOf(around) % 2 === 0;
                });
            if (!isValid) return CodeMirror.Pass;

            return action(cm, ranges);
        },
        // ----- 核心处理 -----
        handleBackspace = handleWithOption("pairs", (cm, ranges) => {
            for (let i = ranges.length - 1; i >= 0; i--) {
                const { line, ch } = ranges[i].head;
                cm.replaceRange("", Pos(line, ch - 1), Pos(line, ch + 1), "+delete");
            }
        }),
        handleEnter = handleWithOption("explode", cm => {
            cm.operation(() => {
                const linesep = cm.lineSeparator() || "\n", newRanges = cm.listSelections();
                cm.replaceSelection(linesep.repeat(2), null), moveSel(cm, -1);

                for (const range of newRanges) {
                    const line = range.head.line;
                    cm.indentLine(line, null, true), cm.indentLine(line + 1, null, true);
                }
            });
        }),
        handleChar = (cm, ch) => {
            const conf = getConfig(cm);
            if (!conf || cm.getOption("disableInput")) return CodeMirror.Pass;

            const pairs = getOption(conf, "pairs"), pos = pairs.indexOf(ch);
            if (pos === -1) return CodeMirror.Pass;

            const nextChar = pairs.charAt(pos + 1), opening = pos % 2 === 0, left = pos % 2 ? pairs.charAt(pos - 1) : ch,
                right = pos % 2 ? ch : nextChar, bracketPair = `${left}${right}`, closeBefore = getOption(conf, "closeBefore"),
                triples = getOption(conf, "triples"), identical = nextChar === ch, ranges = cm.listSelections();

            // 基于光标后文本的括号平衡检查
            let suppressBoth = false;
            if (opening && left !== right) {
                const cursor = cm.getCursor(), from = cursor, to = Pos(cm.lastLine(), cm.getLine(cm.lastLine()).length),
                    textAfter = cm.getRange(from, to), countChar = (str, ch) => str.split(ch).length - 1,
                    leftAfter = countChar(textAfter, left), rightAfter = countChar(textAfter, right);

                if (rightAfter > leftAfter) suppressBoth = true; // 如果光标后右括号多于左括号,不补全
            }

            let type;
            const allValid = ranges.every(range => {
                const cur = range.head, { line, ch: cCh } = cur, next = cm.getRange(cur, Pos(line, cCh + 1));
                let curType;
                if (opening && !range.empty()) curType = "surround";
                else if ((identical || !opening) && next === ch) {
                    if (identical && stringStartsAfter(cm, cur)) curType = "both";
                    else if (triples.includes(ch) && cm.getRange(cur, Pos(line, cCh + 3)) === ch.repeat(3)) curType = "skipThree";
                    else curType = "skip";
                } else if (identical && cCh > 1 && triples.includes(ch) && cm.getRange(Pos(line, cCh - 2), cur) === ch.repeat(2)) {
                    if (cCh > 2 && bstring.test(cm.getTokenTypeAt(Pos(line, cCh - 2)))) return false;
                    curType = "addFour";
                } else if (identical) {
                    const prev = cCh === 0 ? " " : cm.getRange(Pos(line, cCh - 1), cur);
                    if (!CodeMirror.isWordChar(next) && prev !== ch && !CodeMirror.isWordChar(prev)) curType = "both";
                    else return false;
                } else if (opening && (next.length === 0 || /\s/.test(next) || closeBefore.includes(next))) {
                    if (suppressBoth) return false; // 如果光标后有多余右括号，则抑制补全
                    curType = "both";
                }
                else return false;

                if (!type) type = curType;
                else if (type !== curType) return false;
                return true;
            });

            if (!allValid) return CodeMirror.Pass;

            cm.operation(() => {
                if (type === "skip") moveSel(cm, 1);
                else if (type === "skipThree") moveSel(cm, 3);
                else if (type === "surround") {
                    let sels = cm.getSelections();
                    for (let i = 0; i < sels.length; i++) sels[i] = `${left}${sels[i]}${right}`;
                    cm.replaceSelections(sels, "around");
                    const newSels = cm.listSelections().slice();
                    for (let i = 0; i < newSels.length; i++)  newSels[i] = contractSelection(newSels[i]);
                    cm.setSelections(newSels);
                }
                else if (type === "both") cm.replaceSelection(bracketPair, null), cm.triggerElectric(bracketPair), moveSel(cm, -1);
                else if (type === "addFour") cm.replaceSelection(left.repeat(4), "before"), moveSel(cm, 1);
            });
        },
        // 键映射和初始化
        ensureBound = (chars) => {
            for (let i = 0; i < chars.length; i++) {
                const ch = chars.charAt(i), key = `'${ch}'`;
                if (!keyMap[key]) keyMap[key] = (cm) => handleChar(cm, ch);
            }
        },
        keyMap = { Backspace: handleBackspace, Enter: handleEnter };
    ensureBound(`${defaults.pairs}\``);

    // ----- 选项注册 -----
    CodeMirror.defineOption("autoCloseBrackets", false, (cm, val, old) => {
        if (old && old !== CodeMirror.Init) cm.removeKeyMap(keyMap), cm.state.closeBrackets = null;
        if (val) ensureBound(getOption(val, "pairs")), cm.state.closeBrackets = val, cm.addKeyMap(keyMap);
    });
});