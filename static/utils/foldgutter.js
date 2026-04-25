// CodeMirror库 - 折叠处理逻辑的优化和扩展 (https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/addon/fold/foldgutter.min.js)

(function (mod) {
    if (typeof exports == "object" && typeof module == "object") mod(require("../../lib/codemirror"), require("./foldcode"));
    else if (typeof define == "function" && define.amd) define(["../../lib/codemirror", "./foldcode"], mod);
    else mod(CodeMirror);
})((CodeMirror) => {
    "use strict";

    class State {
        constructor(options) {
            this.options = options, this.from = 0, this.to = 0;
        }
    };

    CodeMirror.defineOption("foldGutter", false, (cm, val, old) => {
        if (old && old != CodeMirror.Init) {
            cm.clearGutter(cm.state.foldGutter.options.gutter), cm.state.foldGutter = null;
            cm.off("gutterClick", onGutterClick).off("changes", onChange).off("viewportChange", onViewportChange)
                .off("fold", onFold).off("unfold", onFold).off("swapDoc", onChange);
        }
        if (val) {
            cm.state.foldGutter = new State(parseOptions(val)), updateInViewport(cm, cm.state.foldGutter);
            cm.on("gutterClick", onGutterClick), cm.on("changes", onChange), cm.on("viewportChange", onViewportChange);
            cm.on("fold", onFold), cm.on("unfold", onFold), cm.on("swapDoc", onChange);
        }
    });

    const Pos = CodeMirror.Pos,
        parseOptions = opts => {
            if (opts === true) opts = {};
            if (opts.gutter == null) opts.gutter = "CodeMirror-foldgutter";
            if (opts.indicatorOpen == null) opts.indicatorOpen = "CodeMirror-foldgutter-open";
            if (opts.indicatorFolded == null) opts.indicatorFolded = "CodeMirror-foldgutter-folded";
            return opts;
        },

        // 安全获取 state 并注入回调
        withFoldState = fn => (cm, ...args) => {
            const state = cm.state.foldGutter;
            if (!state) return;
            return fn(cm, state, ...args);
        },

        isFolded = (cm, line) => {
            const marks = cm.findMarks(Pos(line, 0), Pos(line + 1, 0));
            for (let i = 0; i < marks.length; ++i) {
                if (marks[i].__isFold) {
                    const fromPos = marks[i].find(-1);
                    if (fromPos && fromPos.line === line) return marks[i];
                }
            }
        },

        marker = spec => {
            if (typeof spec == "string") {
                const elt = document.createElement("div");
                elt.className = `${spec} CodeMirror-guttermarker-subtle`;
                return elt;
            }
            else return spec.cloneNode(true);
        },
        classTest = cls => new RegExp(`(^|\\s)${cls}(?:$|\\s)\\s*`),
        updateFoldInfo = (cm, state, from, to) => {
            const opts = state.options, minSize = cm.foldOption(opts, "minFoldSize"), func = cm.foldOption(opts, "rangeFinder"),
                { indicatorFolded, indicatorOpen, gutter } = opts, clsOpen = typeof indicatorOpen == "string" && classTest(indicatorOpen),
                clsFolded = typeof indicatorFolded == "string" && classTest(indicatorFolded);

            // 根据条件返回应使用的标记元素
            const getMarker = (shouldShow, clsTest, indicator, title, old) => {
                if (shouldShow) {
                    const { className, nodeType } = old || {};
                    if (clsTest && old && clsTest.test(className)) {
                        if (nodeType === 1) old.title = title;
                        return old;
                    }
                    const mark = marker(indicator);
                    if (mark?.nodeType === 1) mark.title = title;
                    return mark;
                }
                return null;
            };

            let cur = from - 1;
            cm.eachLine(from, to, line => {
                ++cur;
                const old = line.gutterMarkers?.[gutter], folded = isFolded(cm, cur);
                let range = null, shouldShow = false, clsTest, indicator, title;

                // 已折叠 → 应显示折叠标记
                if (folded) shouldShow = true, clsTest = clsFolded, indicator = indicatorFolded, title = "点击展开";
                // 未折叠，检查是否有可折叠范围
                else {
                    range = func?.(cm, Pos(cur, 0));
                    if (range?.to.line - range?.from.line >= minSize)
                        shouldShow = true, clsTest = clsOpen, indicator = indicatorOpen, title = "点击折叠";
                }

                const newMarker = getMarker(shouldShow, clsTest, indicator, title, old);
                if (newMarker !== old) cm.setGutterMarker(line, gutter, newMarker);
            });
        },

        updateInViewport = (cm, state) => {
            const { from, to } = cm.getViewport();
            cm.operation(() => updateFoldInfo(cm, state, from, to)), state.from = from, state.to = to;
        },

        onGutterClick = withFoldState((cm, state, line, gutter) => {
            const opts = state.options;
            if (gutter != opts.gutter) return;
            const folded = isFolded(cm, line);
            if (folded) folded.clear();
            else cm.foldCode(Pos(line, 0), opts);
        }),

        onChange = withFoldState((cm, state) => {
            const { foldOnChangeTimeSpan } = state.options;
            state.from = state.to = 0, clearTimeout(state.changeUpdate);
            state.changeUpdate = setTimeout(() => updateInViewport(cm, state), foldOnChangeTimeSpan || 600);
        }),

        onViewportChange = withFoldState((cm, state) => {
            const { options, changeUpdate, from: sFrom, to: sTo } = state, { updateViewportTimeSpan } = options;
            clearTimeout(changeUpdate);
            state.changeUpdate = setTimeout(() => {
                const { from, to } = cm.getViewport();
                if (sFrom == sTo || from - sTo > 20 || sFrom - to > 20) updateInViewport(cm, state);
                else
                    cm.operation(() => {
                        if (from < sFrom) updateFoldInfo(cm, state, from, sFrom), state.from = from;
                        if (to > sTo) updateFoldInfo(cm, state, sTo, to), state.to = to;
                    });
            }, updateViewportTimeSpan || 400);
        }),

        onFold = withFoldState((cm, state, from) => {
            const { from: stateFrom, to } = state, line = from.line;
            if (line >= stateFrom && line < to) updateFoldInfo(cm, state, line, line + 1);
        });
});