// 根目录/static/script.js
function scriptFun() {
    const modal = document.querySelector('.modal'), cssEditor = document.getElementById('cssEditor'),
        closeBtn = document.querySelector('.close-btn'), saveBtn = document.getElementById('saveBtn'),
        cancelBtn = document.getElementById('cancelBtn'), loader = document.getElementById('loader'), api = '/api/cssEditor',
        previewBtn = document.getElementById('previewBtn'), cancelPreviewBtn = document.getElementById('cancelPreviewBtn'),
        preview = document.getElementById('preview'), previewFrame = document.getElementById('previewFrame'), pApi = '/api/preview',
        urlParams = new URLSearchParams(window.location.search), fileDir = urlParams.get('fileDir'),
        returnUrl = urlParams.get('return'), cm = window.cssEditor;  // cm 是 CodeMirror 实例，由外部库创建

    let isEditingColor = false, editColorRange = null, isPreviewMode = false, globalColorPicker = null;

    // ----- 阻止 CodeMirror 编辑器区域事件冒泡，避免触发父容器拖拽和阻止默认菜单 -----
    cm.getWrapperElement().addEventListener('mousedown', e => e.stopPropagation());
    cm.getWrapperElement().addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
    cm.getWrapperElement().addEventListener('contextmenu', e => e.stopPropagation());

    // ---------- 🎨 全局颜色选择器 ----------
    function initGlobalColorPicker() {
        if (globalColorPicker) return;
        globalColorPicker = document.createElement('input');
        globalColorPicker.type = 'color';
        globalColorPicker.style.position = 'fixed';
        globalColorPicker.style.width = '0';
        globalColorPicker.style.height = '0';
        globalColorPicker.style.opacity = '0';
        globalColorPicker.style.pointerEvents = 'none';
        globalColorPicker.style.zIndex = '9999';
        globalColorPicker.style.left = '0px';
        globalColorPicker.style.top = '0px';
        document.body.append(globalColorPicker);
    }
    initGlobalColorPicker();

    // ---------- 颜色关键字映射 ----------
    const COLOR_KEYWORDS = {
        'aliceblue': '#F0F8FF', 'antiquewhite': '#FAEBD7', 'aqua': '#00FFFF', 'aquamarine': '#7FFFD4', 'azure': '#F0FFFF',
        'beige': '#F5F5DC', 'bisque': '#FFE4C4', 'black': '#000000', 'blanchedalmond': '#FFEBCD', 'blue': '#0000FF',
        'blueviolet': '#8A2BE2', 'brown': '#A52A2A', 'burlywood': '#DEB887', 'cadetblue': '#5F9EA0', 'chartreuse': '#7FFF00',
        'chocolate': '#D2691E', 'coral': '#FF7F50', 'cornflowerblue': '#6495ED', 'cornsilk': '#FFF8DC', 'crimson': '#DC143C',
        'cyan': '#00FFFF', 'darkblue': '#00008B', 'darkcyan': '#008B8B', 'darkgoldenrod': '#B8860B', 'darkgray': '#A9A9A9',
        'darkgreen': '#006400', 'darkgrey': '#A9A9A9', 'darkkhaki': '#BDB76B', 'darkred': '#8B0000', 'dimgray': '#696969',
        'dimgrey': '#696969', 'darkorange': '#FF8C00', 'darkmagenta': '#8B008B', 'deeppink': '#FF1493',
        'darkorchid': '#9932CC', 'darkolivegreen': '#556B2F', 'darksalmon': '#E9967A', 'darkseagreen': '#8FBC8F',
        'darkslateblue': '#483D8B', 'darkslategray': '#2F4F4F', 'darkslategrey': '#2F4F4F', 'darkturquoise': '#00CED1',
        'darkviolet': '#9400D3', 'deepskyblue': '#00BFFF', 'dodgerblue': '#1E90FF', 'firebrick': '#B22222',
        'floralwhite': '#FFFAF0', 'forestgreen': '#228B22', 'fuchsia': '#FF00FF', 'gainsboro': '#DCDCDC', 'gold': '#FFD700',
        'ghostwhite': '#F8F8FF', 'goldenrod': '#DAA520', 'gray': '#808080', 'green': '#008000', 'greenyellow': '#ADFF2F',
        'grey': '#808080', 'honeydew': '#F0FFF0', 'hotpink': '#FF69B4', 'indianred': '#CD5C5C', 'indigo': '#4B0082',
        'ivory': '#FFFFF0', 'khaki': '#F0E68C', 'lavender': '#E6E6FA', 'lavenderblush': '#FFF0F5', 'lawngreen': '#7CFC00',
        'lemonchiffon': '#FFFACD', 'lightblue': '#ADD8E6', 'lightcoral': '#F08080', 'lightcyan': '#E0FFFF',
        'lightgoldenrodyellow': '#FAFAD2', 'lightgray': '#D3D3D3', 'lightgreen': '#90EE90', 'lightgrey': '#D3D3D3',
        'lightpink': '#FFB6C1', 'lightsalmon': '#FFA07A', 'lightseagreen': '#20B2AA', 'lightskyblue': '#87CEFA',
        'lightslategray': '#778899', 'lightslategrey': '#778899', 'lightsteelblue': '#B0C4DE', 'lightyellow': '#FFFFE0',
        'lime': '#00FF00', 'limegreen': '#32CD32', 'linen': '#FAF0E6', 'magenta': '#FF00FF', 'maroon': '#800000',
        'mediumaquamarine': '#66CDAA', 'mediumblue': '#0000CD', 'mediumorchid': '#BA55D3', 'mediumpurple': '#9370DB',
        'mediumseagreen': '#3CB371', 'mediumslateblue': '#7B68EE', 'mediumspringgreen': '#00FA9A', 'moccasin': '#FFE4B5',
        'mediumturquoise': '#48D1CC', 'mediumvioletred': '#C71585', 'midnightblue': '#191970', 'mintcream': '#F5FFFA',
        'mistyrose': '#FFE4E1', 'navajowhite': '#FFDEAD', 'navy': '#000080', 'oldlace': '#FDF5E6', 'olive': '#808000',
        'olivedrab': '#6B8E23', 'orange': '#FFA500', 'orangered': '#FF4500', 'orchid': '#DA70D6', 'peru': '#CD853F',
        'palegoldenrod': '#EEE8AA', 'palegreen': '#98FB98', 'paleturquoise': '#AFEEEE', 'palevioletred': '#DB7093',
        'papayawhip': '#FFEFD5', 'peachpuff': '#FFDAB9', 'pink': '#FFC0CB', 'plum': '#DDA0DD', 'powderblue': '#B0E0E6',
        'purple': '#800080', 'rebeccapurple': '#663399', 'red': '#FF0000', 'rosybrown': '#BC8F8F', 'royalblue': '#4169E1',
        'saddlebrown': '#8B4513', 'salmon': '#FA8072', 'sandybrown': '#F4A460', 'seagreen': '#2E8B57', 'snow': '#FFFAFA',
        'seashell': '#FFF5EE', 'sienna': '#A0522D', 'silver': '#C0C0C0', 'skyblue': '#87CEEB', 'slateblue': '#6A5ACD',
        'slategray': '#708090', 'slategrey': '#708090', 'springgreen': '#00FF7F', 'steelblue': '#4682B4', 'tan': '#D2B48C',
        'teal': '#008080', 'thistle': '#D8BFD8', 'tomato': '#FF6347', 'turquoise': '#40E0D0', 'violet': '#EE82EE',
        'wheat': '#F5DEB3', 'white': '#FFFFFF', 'whitesmoke': '#F5F5F5', 'yellow': '#FFFF00', 'yellowgreen': '#9ACD32',
        'transparent': 'transparent'
    };

    // ---------- 颜色正则（支持所有格式）----------
    const KEYWORDS = Object.keys(COLOR_KEYWORDS).concat('transparent').join('|'),
        HEX = '#(?:[0-9a-fA-F]{3,4}){1,2}\\b', RGB = 'rgba?\\(\\s*\\d+\\s*,\\s*\\d+\\s*,\\s*\\d+\\s*(?:,\\s*[\\d.]+\\s*)?\\)',
        HSL = 'hsla?\\(\\s*\\d+\\s*,\\s*\\d+%\\s*,\\s*\\d+%\\s*(?:,\\s*[\\d.]+\\s*)?\\)',
        COLOR_REGEX = new RegExp(`${HEX}|${RGB}|${HSL}|\\b(${KEYWORDS})\\b`, 'gi'),
        RGB_EXTRACT = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i;

    // ---------- 颜色工具函数 ----------
    function rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const h = parseInt(x).toString(16);
            return h.length === 1 ? '0' + h : h;
        }).join('');
    }

    function extractColorAndAlpha(c) {
        const l = c.toLowerCase(), kw = COLOR_KEYWORDS[l];
        let r = 0, g = 0, b = 0, a = 1, t = 'keyword';

        // 1. 颜色关键字（含 transparent）
        if (kw) {
            if (l === 'transparent') return { r: 0, g: 0, b: 0, a: 0, t, o: c, tr: true };
            const hex = kw.slice(1); // "#ff0000" → "ff0000"
            [r, g, b] = hex.match(/.{2}/g).map(v => parseInt(v, 16)), a = 1;
        }
        // 2. 十六进制 #RRGGBB / #RGB / #RRGGBBAA / #RGBA
        else if (c.startsWith('#')) {
            t = 'hex';
            let h = c.slice(1).toLowerCase();
            if (h.length === 3 || h.length === 4) h = h.split('').map(x => x + x).join('');
            const hexMatch = h.match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/);
            if (hexMatch)
                [r, g, b] = hexMatch.slice(1, 4).map(v => parseInt(v, 16)), a = hexMatch[4] ? parseInt(hexMatch[4], 16) / 255 : 1;
        }
        // 3. rgb() / rgba()
        else if (c.startsWith('rgb')) {
            const m = RGB_EXTRACT.exec(c);
            if (m) t = 'rgb', [r, g, b] = [m[1], m[2], m[3]].map(Number), a = m[4] ? parseFloat(m[4]) : 1;
        }
        // 4. hsl() / hsla()
        else if (c.startsWith('hsl')) {
            t = 'hsl';
            const d = document.createElement('div');
            d.style.color = c, document.body.append(d);
            const computed = window.getComputedStyle(d).color; // "rgb(r, g, b)" 或 "rgba(r, g, b, a)"
            d.remove();

            const m = RGB_EXTRACT.exec(computed);
            if (m) [r, g, b] = [m[1], m[2], m[3]].map(Number), a = m[4] ? parseFloat(m[4]) : 1;
            else r = 128, g = 128; b = 128, a = 1;  // 解析失败时的默认值
        }

        return { r, g, b, a, t, o: c };
    }

    function getColorForSwatch(c) {
        const o = extractColorAndAlpha(c);
        if (o.tr || c.toLowerCase() === 'transparent') return 'transparent';
        if (o.a < 1) return `rgba(${o.r},${o.g},${o.b},${o.a})`;
        else if (c.startsWith('#')) return c;
        else if (c.startsWith('rgb')) return `rgb(${o.r},${o.g},${o.b})`;
        else return c;
    }

    // ---------- 创建颜色部件 ----------
    function createColorWidget(ct, fr, to) {
        const w = document.createElement('span'), s = document.createElement('span'), t = document.createElement('span');
        w.className = 'cm-color-widget', w.style.display = 'inline-flex', w.style.alignItems = 'center'; w.style.margin = '0 2px',
            w.style.padding = '2px 4px', w.style.borderRadius = '3px', w.style.backgroundColor = 'rgba(0,0,0,0.1)';

        const bg = getColorForSwatch(ct);
        s.className = 'cm-color-swatch', s.style.backgroundColor = bg, s.title = '点击修改颜色', s.style.display = 'inline-block',
            s.style.width = '16px', s.style.height = '16px', s.style.borderRadius = '3px', s.style.marginRight = '6px',
            s.style.border = bg === 'transparent' ? '1px dashed #999' : '1px solid rgba(255,255,255,1)';
        s.style.cursor = 'pointer', s.style.flexShrink = '0';

        t.className = 'cm-color-text', t.textContent = ct, t.style.color = '#f8f8f2', t.style.fontSize = '13px';
        t.style.userSelect = 'text', t.style.cursor = 'text', t.style.marginRight = '8px', w.append(s, t);

        // 透明度滑块
        const o = extractColorAndAlpha(ct), as = document.createElement('input'), av = document.createElement('span');
        if (as) {
            as.type = 'range', as.min = 0, as.max = 100, as.value = Math.round(o.a * 100), as.style.width = '120px',
                as.style.marginRight = '8px', as.title = '调整透明度 (0-100%)', as.className = 'cm-alpha-slider';
            av.className = 'cm-alpha-value', av.textContent = `${Math.round(o.a * 100)}%`, av.style.fontSize = '12px',
                av.style.color = '#ccc', av.style.minWidth = '30px', av.style.textAlign = 'center';

            // 根据透明度计算新颜色（供 input/change 复用）
            const getUpdatedColor = (alpha) => {
                const na = alpha / 100;
                let nc = ct;
                const lc = ct.toLowerCase();
                if (lc === 'transparent') nc = `rgba(0,0,0,${na})`;
                if (COLOR_KEYWORDS[lc]) {
                    const h = COLOR_KEYWORDS[lc], hr = parseInt(h.slice(1, 3), 16), hg = parseInt(h.slice(3, 5), 16),
                        hb = parseInt(h.slice(5, 7), 16);
                    nc = `rgba(${hr},${hg},${hb},${na})`;
                } else if (ct.includes('rgba') || ct.includes('hsla')) {
                    if (ct.includes('rgba')) nc = ct.replace(RGB_EXTRACT, `rgba($1,$2,$3,${na})`);
                    else nc = ct.replace(/hsla?\((\d+,\s*\d+%,\s*\d+%)(?:,\s*[\d.]+)?\)/i, `hsla($1,${na})`);
                } else if (ct.startsWith('rgb(')) nc = ct.replace('rgb(', `rgba(`).replace(')', `,${na})`);
                else if (ct.startsWith('hsl(')) nc = ct.replace('hsl(', `hsla(`).replace(')', `,${na})`);
                else if (ct.startsWith('#')) {
                    let h = ct.slice(1), hr, hg, hb;
                    if (h.length === 3)
                        hr = parseInt(h[0] + h[0], 16), hg = parseInt(h[1] + h[1], 16), hb = parseInt(h[2] + h[2], 16);
                    else if (h.length === 6)
                        hr = parseInt(h.slice(0, 2), 16), hg = parseInt(h.slice(2, 4), 16), hb = parseInt(h.slice(4, 6), 16);
                    else hr = 128, hg = 128, hb = 128;
                    nc = `rgba(${hr},${hg},${hb},${na})`;
                }
                return nc;
            };

            // 实时更新 UI（色块、文本、百分比），但不修改文档
            as.addEventListener('input', function () {
                const na = this.value / 100;
                av.textContent = `${this.value}%`;
                const nc = getUpdatedColor(this.value);
                s.style.backgroundColor = getColorForSwatch(nc);
            });

            // 滑块松开或失去焦点时，一次性更新文档
            as.addEventListener('change', function () {
                const nc = getUpdatedColor(this.value);
                cm.replaceRange(nc, fr, to), updateColorWidgets(cm);
            });

            // 阻止滑块上的鼠标/触摸事件冒泡，使滑块可拖动
            as.addEventListener('mousedown', e => e.stopPropagation());
            as.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });

            w.append(as, av);
        }

        // 色块点击事件
        s.addEventListener('click', e => {
            e.stopPropagation();
            const r = s.getBoundingClientRect(), cc = extractColorAndAlpha(ct), ch = rgbToHex(cc.r, cc.g, cc.b);
            globalColorPicker.style.left = `${r.left}px`, globalColorPicker.style.top = `${r.bottom + 5}px`;
            globalColorPicker.value = ch;

            if (globalColorPicker._ch) globalColorPicker.removeEventListener('change', globalColorPicker._ch);
            const chf = function () {
                const nh = this.value, na = as ? as.value / 100 : cc.a, hr = parseInt(nh.slice(1, 3), 16),
                    hg = parseInt(nh.slice(3, 5), 16), hb = parseInt(nh.slice(5, 7), 16);
                let nc = na < 1 ? `rgba(${hr},${hg},${hb},${na})` : nh;
                const nhu = nh.toUpperCase(), kw = Object.keys(COLOR_KEYWORDS).find(k => COLOR_KEYWORDS[k].toUpperCase() === nhu);
                if (kw && na >= 1) nc = kw;
                cm.replaceRange(nc, fr, to), updateColorWidgets(cm), t.textContent = nc;
                s.style.backgroundColor = getColorForSwatch(nc);
                if (av) av.textContent = `${Math.round(na * 100)}%`;
                to = { line: to.line, ch: fr.ch + nc.length };
                this.removeEventListener('change', chf), globalColorPicker._ch = null;
            };
            globalColorPicker._ch = chf, globalColorPicker.addEventListener('change', chf), globalColorPicker.getBoundingClientRect();
            if (typeof globalColorPicker.showPicker === 'function') globalColorPicker.showPicker();
            else globalColorPicker.click();
        });

        return w;
    }

    // ---------- 扫描编辑器添加部件 ----------
    function updateColorWidgets(cm) {
        isEditingColor = false, editColorRange = null; // 退出编辑模式

        cm.getAllMarks().forEach(m => { if (m.isColorWidget) m.clear(); });
        const d = cm.getDoc(), lc = d.lineCount();
        for (let i = 0; i < lc; i++) {
            const l = d.getLine(i); let m;
            COLOR_REGEX.lastIndex = 0;
            while ((m = COLOR_REGEX.exec(l)) !== null) {
                const s = m.index, e = s + m[0].length, fr = { line: i, ch: s }, to = { line: i, ch: e };
                if (d.findMarksAt(fr).some(x => x.replacedWith)) continue;

                const w = createColorWidget(m[0], fr, to),
                    mark = cm.markText(fr, to, {
                        replacedWith: w, inclusiveLeft: false, inclusiveRight: false, clearOnEnter: true
                    });
                mark.isColorWidget = true, w._colorMark = mark;

                // 为颜色值文本添加双击事件
                const textSpan = w.querySelector('.cm-color-text');
                if (textSpan) {
                    textSpan.title = '双击编辑颜色值';
                    textSpan.addEventListener('dblclick', (e) => {
                        e.stopPropagation();
                        const widget = e.target.closest('.cm-color-widget');
                        if (!widget) return;
                        const mark = widget._colorMark;
                        if (mark) {
                            const pos = mark.find();
                            if (pos) {
                                // 记录当前正在编辑的颜色值范围
                                isEditingColor = true;
                                editColorRange = {
                                    from: { line: pos.from.line, ch: pos.from.ch },
                                    to: { line: pos.to.line, ch: pos.to.ch }
                                };
                                mark.clear(), cm.setCursor(pos.from), cm.focus();
                            }
                        }
                    });
                }
            }
        }
    }

    updateColorWidgets(cm);

    // 编辑期间不自动重建部件，但允许手动触发重建
    cm.on('change', () => {
        if (isEditingColor) return;
        setTimeout(() => updateColorWidgets(cm), 10);
    });

    // 监听光标活动，检测是否离开正在编辑的颜色值区域
    cm.on('cursorActivity', () => {
        if (isEditingColor && editColorRange) {
            const cursor = cm.getCursor(), range = editColorRange,
                // 检查光标是否离开了正在编辑的颜色值范围
                isOutsideRange = cursor.line < range.from.line || cursor.line > range.to.line ||
                    (cursor.line === range.from.line && cursor.ch < range.from.ch) ||
                    (cursor.line === range.to.line && cursor.ch > range.to.ch);

            if (isOutsideRange) isEditingColor = false, editColorRange = null, updateColorWidgets(cm);
        }
    });

    // ============================== 预览功能 ==============================
    function startPreview() {
        isPreviewMode = true, preview.style.display = 'block';
        const er = cssEditor.getBoundingClientRect();
        preview.style.width = `${er.width}px`, preview.style.height = `${er.height}px`;
        previewBtn.style.display = 'none', cancelPreviewBtn.style.display = 'block';
        previewFrame.src = returnUrl, cm.on('change', updatePreviewStyles);
    }

    function updatePreviewStyles() {
        if (!isPreviewMode || !previewFrame.contentWindow?.document) return;
        try {
            const sc = cm.getValue(), id = previewFrame.contentDocument || previewFrame.contentWindow.document,
                os = id.getElementById('dynamic-css'), s = id.createElement('style');
            if (os) os.remove();
            s.id = 'dynamic-css', s.textContent = sc, id.head.append(s);
        } catch (e) { console.log('预览更新失败', e); }
    }

    function cancelPreview() {
        isPreviewMode = false, preview.style.display = 'none', previewBtn.style.display = 'block';
        cancelPreviewBtn.style.display = 'none', previewFrame.src = 'about:blank', cm.off('change', updatePreviewStyles);
    }

    addTapSupport(previewBtn, startPreview), addTapSupport(cancelPreviewBtn, cancelPreview);

    // 获取储存样式并应用
    getStyle(cssEditor, api), getStyle(preview, pApi);
    modal.append(cssEditor, preview), loadCssContent(fileDir);

    mouseOrTouch(cssEditor, () => { cssEditor.style.zIndex = '1002', preview.style.zIndex = '1001'; }, api);
    mouseOrTouch(preview, () => { preview.style.zIndex = '1002', cssEditor.style.zIndex = '1001'; }, pApi);

    addTapSupport(saveBtn, saveCSS), addTapSupport(cancelBtn, cancelEdit), addTapSupport(closeBtn, cancelEdit);

    // 键盘事件
    document.addEventListener('keydown', e => {
        // Escape 优先处理编辑退出
        if (e.key === 'Escape') {
            if (isEditingColor) {
                e.preventDefault(), isEditingColor = false, editColorRange = null, updateColorWidgets(cm);
                return;
            }
            if (cssEditor.style.display === 'flex') {
                if (isPreviewMode) cancelPreview();
                else cancelEdit();
            }
        }
        if (e.ctrlKey && e.key === 's') e.preventDefault(), saveCSS();
        if (e.ctrlKey && e.key === 'p') e.preventDefault(), startPreview();
    });

    // ---------- 加载CSS内容 ----------
    async function loadCssContent(fd) {
        showLoader();
        try {
            const r = await fetch(`/api/css?fileDir=${encodeURIComponent(fd)}`);
            if (r.ok) { const ct = await r.text(); cm.setValue(ct), updateEditorTitle(fd); }
            else throw new Error(`无法加载CSS文件:${fd}`);
        } catch (err) { alert(`加载CSS失败:${err.message}`), updateEditorTitle(fd); }
        finally { hideLoader(); }
    }

    function updateEditorTitle(fd) {
        const te = document.querySelector('#cssEditor h2');
        if (te) te.textContent = `编辑文件:${fd}`;
    }

    async function saveCSS() {
        showLoader();
        try {
            const r = await fetch('/api/css', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileDir, content: cm.getValue() })
            });
            if (r.ok) window.location.href = returnUrl;
            else { const et = await r.text(); throw new Error(et || '保存失败'); }
        } catch (err) { alert(`保存CSS失败:${err.message}`); }
        finally { hideLoader(); }
    }

    function cancelEdit() { if (confirm('确定要取消编辑吗')) window.location.href = returnUrl; }

    function showLoader() { if (loader) loader.style.display = 'block'; }
    function hideLoader() { if (loader) loader.style.display = 'none'; }
}

// 页面加载启动
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scriptFun);
else scriptFun();