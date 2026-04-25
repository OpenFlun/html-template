// 根目录/utils/custom-css-hint.js
(function () {
    'use strict';
    // ---------- CSS 自动补全数据源 ----------
    const GLOBAL_KEYWORDS = ['inherit', 'initial', 'unset', 'revert', 'revert-layer', 'var()'],

        // 常用颜色名
        COLOR_KEYWORDS = [
            'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque', 'black', 'blanchedalmond', 'blue',
            'blueviolet', 'brown', 'burlywood', 'cadetblue', 'chartreuse', 'chocolate', 'coral', 'cornflowerblue', 'cornsilk',
            'crimson', 'cyan', 'darkblue', 'darkcyan', 'darkgoldenrod', 'darkgray', 'darkgreen', 'darkgrey', 'darkkhaki',
            'darkmagenta', 'darkolivegreen', 'darkorange', 'darkorchid', 'darkred', 'darksalmon', 'darkseagreen', 'darkslateblue',
            'darkslategray', 'darkslategrey', 'darkturquoise', 'darkviolet', 'deeppink', 'deepskyblue', 'dimgray', 'dimgrey',
            'dodgerblue', 'firebrick', 'floralwhite', 'forestgreen', 'fuchsia', 'gainsboro', 'ghostwhite', 'gold', 'goldenrod',
            'gray', 'green', 'greenyellow', 'grey', 'honeydew', 'hotpink', 'indianred', 'indigo', 'ivory', 'khaki', 'lavender',
            'lavenderblush', 'lawngreen', 'lemonchiffon', 'lightblue', 'lightcoral', 'lightcyan', 'lightgoldenrodyellow',
            'lightgray', 'lightgreen', 'lightgrey', 'lightpink', 'lightsalmon', 'lightseagreen', 'lightskyblue', 'lightslategray',
            'lightslategrey', 'lightsteelblue', 'lightyellow', 'lime', 'limegreen', 'linen', 'magenta', 'maroon', 'mediumaquamarine',
            'mediumblue', 'mediumorchid', 'mediumpurple', 'mediumseagreen', 'mediumslateblue', 'mediumspringgreen', 'mediumturquoise',
            'mediumvioletred', 'midnightblue', 'mintcream', 'mistyrose', 'moccasin', 'navajowhite', 'navy', 'oldlace', 'olive',
            'olivedrab', 'orange', 'orangered', 'orchid', 'palegoldenrod', 'palegreen', 'paleturquoise', 'palevioletred', 'papayawhip',
            'peachpuff', 'peru', 'pink', 'plum', 'powderblue', 'purple', 'rebeccapurple', 'red', 'rosybrown', 'royalblue',
            'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell', 'sienna', 'silver', 'skyblue', 'slateblue', 'slategray',
            'slategrey', 'snow', 'springgreen', 'steelblue', 'tan', 'teal', 'thistle', 'tomato', 'turquoise', 'violet', 'wheat',
            'white', 'whitesmoke', 'yellow', 'yellowgreen', 'transparent',
            // 系统颜色
            'ActiveText', 'ButtonFace', 'ButtonText', 'Canvas', 'CanvasText', 'Field', 'FieldText', 'GrayText', 'Highlight',
            'HighlightText', 'LinkText', 'Mark', 'MarkText', 'VisitedText'
        ],

        // 常规 CSS 属性名 (约200个)
        CSS_PROPERTIES = [
            'align-content', 'align-items', 'align-self', 'all', 'animation', 'animation-delay', 'animation-direction',
            'animation-duration', 'animation-fill-mode', 'animation-iteration-count', 'animation-name', 'animation-play-state',
            'animation-timing-function', 'backdrop-filter', 'backface-visibility', 'background', 'background-attachment',
            'background-blend-mode', 'background-clip', 'background-color', 'background-image', 'background-origin',
            'background-position', 'background-repeat', 'background-size',
            'border', 'border-bottom', 'border-bottom-color', 'border-bottom-style', 'border-bottom-width', 'border-collapse',
            'border-color', 'border-image', 'border-image-outset', 'border-image-repeat', 'border-image-slice', 'border-image-source',
            'border-image-width', 'border-left', 'border-left-color', 'border-left-style', 'border-left-width', 'border-radius',
            'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius',
            'border-right', 'border-right-color', 'border-right-style', 'border-right-width', 'border-spacing', 'border-style',
            'border-top', 'border-top-color', 'border-top-style', 'border-top-width', 'border-width', 'bottom',
            'box-shadow', 'box-sizing', 'break-after', 'break-before', 'break-inside',
            'caption-side', 'caret-color', 'clear', 'clip', 'clip-path', 'color', 'column-count', 'column-fill', 'column-gap',
            'column-rule', 'column-rule-color', 'column-rule-style', 'column-rule-width', 'column-span', 'column-width',
            'columns', 'content', 'counter-increment', 'counter-reset', 'cursor', 'direction', 'display', 'empty-cells',
            'filter', 'flex', 'flex-basis', 'flex-direction', 'flex-flow', 'flex-grow', 'flex-shrink', 'flex-wrap', 'float', 'font',
            'font-family', 'font-feature-settings', 'font-variation-settings', 'font-kerning', 'font-size', 'font-size-adjust',
            'font-stretch', 'font-style', 'font-synthesis', 'font-variant', 'font-variant-alternates', 'font-variant-caps',
            'font-variant-east-asian', 'font-variant-ligatures', 'font-variant-numeric', 'font-variant-position', 'font-weight',
            'gap', 'grid', 'grid-area', 'grid-auto-columns', 'grid-auto-flow', 'grid-auto-rows', 'grid-column', 'grid-column-end',
            'grid-column-gap', 'grid-column-start', 'grid-gap', 'grid-row', 'grid-row-end', 'grid-row-gap', 'grid-row-start',
            'grid-template', 'grid-template-areas', 'grid-template-columns', 'grid-template-rows',
            'height', 'hyphens', 'image-rendering', 'isolation', 'justify-content', 'justify-items', 'justify-self',
            'left', 'letter-spacing', 'line-height', 'list-style', 'list-style-image', 'list-style-position', 'list-style-type',
            'margin', 'margin-bottom', 'margin-left', 'margin-right', 'margin-top', 'mask', 'mask-clip', 'mask-composite',
            'mask-image', 'mask-mode', 'mask-origin', 'mask-position', 'mask-repeat', 'mask-size', 'mask-type',
            'max-height', 'max-width', 'min-height', 'min-width', 'mix-blend-mode',
            'object-fit', 'object-position', 'opacity', 'order', 'orphans', 'outline', 'outline-color', 'outline-offset',
            'outline-style', 'outline-width', 'overflow', 'overflow-x', 'overflow-y',
            'padding', 'padding-bottom', 'padding-left', 'padding-right', 'padding-top', 'page-break-after',
            'page-break-before', 'page-break-inside', 'perspective', 'perspective-origin', 'pointer-events', 'position',
            'quotes', 'resize', 'right', 'row-gap', 'scroll-behavior',
            'tab-size', 'table-layout', 'text-align', 'text-align-last', 'text-decoration', 'text-decoration-color',
            'text-decoration-line', 'text-decoration-skip', 'text-decoration-skip-ink', 'text-decoration-style', 'text-indent',
            'text-justify', 'text-overflow', 'text-rendering', 'text-shadow', 'text-transform', 'text-underline-offset',
            'text-underline-position', 'top', 'transform', 'transform-origin', 'transform-style', 'transition', 'transition-delay',
            'transition-duration', 'transition-property', 'transition-timing-function',
            'unicode-bidi', 'user-select', 'vertical-align', 'visibility',
            'white-space', 'widows', 'width', 'will-change', 'word-break', 'word-spacing', 'word-wrap', 'writing-mode', 'z-index'
        ],

        // 常规 CSS公用值数组
        BORDER_STYLE_VALUES = ['none', 'hidden', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset'],
        BORDER_WIDTH_VALUES = ['/* 长度值; 例如: 10px */', 'thin', 'medium', 'thick'],
        LENGTH_AND_PERCENTAGE = ['/* 长度值; 例如: 10px */', '/* 百分比值; 例如: 50% */'],
        MARGIN_VALUES = ['/* 长度值; 例如: 10px */', '/* 百分比值; 例如: 50% */', 'auto'],
        MIN_WIDTH_HEIGHT_VALUES = ['/* 长度值; 例如: 10px */', '/* 百分比值; 例如: 50% */', 'min-content', 'max-content', 'fit-content'],
        MAX_WIDTH_HEIGHT_VALUES = ['/* 长度值; 例如: 10px */', '/* 百分比值; 例如: 50% */', 'min-content', 'max-content', 'fit-content',
            'none'],
        WIDTH_HEIGHT_VALUES = ['/* 长度值; 例如: 10px */', '/* 百分比值; 例如: 50% */', 'min-content', 'max-content', 'fit-content',
            'auto'],
        GRID_TEMPLATE_VALUES = ['/* 长度值; 例如: 10px */', '/* 百分比值; 例如: 50% */', 'min-content', 'max-content', 'auto',
            'minmax(/* 2个参数：最小值，最大值；例如: 100px, 1fr */)', 'repeat(/* 2个参数：重复次数，轨道列表；例如: 3, 1fr */)', 'none'],
        GAP_VALUES = ['/* 长度值; 例如: 10px */', '/* 百分比值; 例如: 50% */', 'normal'],
        OVERFLOW_VALUES = ['visible', 'hidden', 'clip', 'scroll', 'auto'],
        SPACING_VALUES = ['normal', '/* 长度值; 例如: 10px */'],
        PAGE_BREAK_SIDES_VALUES = ['auto', 'always', 'avoid', 'left', 'right', 'recto', 'verso'],
        FILTER_VALUES = ['blur(/* 1个参数：长度值；例如: 5px */)', 'brightness(/* 1个参数：数字或百分比；例如: 0.5 或 50% */)',
            'contrast(/* 1个参数：数字或百分比；例如: 200% */)', 'url(/* 1个参数：字符串；例如: "image.png" */)',
            'drop-shadow(/* 2-4个参数：偏移x, 偏移y, 模糊半径(可选), 颜色(可选)；例如: 5px 5px 5px black */)',
            'grayscale(/* 1个参数：数字或百分比；例如: 0.5 */)', 'hue-rotate(/* 1个参数：角度值；例如: 90deg */)',
            'invert(/* 1个参数：数字或百分比；例如: 100% */)', 'none', 'opacity(/* 1个参数：数字或百分比；例如: 0.5 */)',
            'saturate(/* 1个参数：数字或百分比；例如: 200% */)', 'sepia(/* 1个参数：数字或百分比；例如: 0.5 */)'],

        TIME_VALUES = ['/* 时间值; 例如: 2s */'],
        TIMING_FUNCTION_VALUES = ['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out', 'step-start', 'step-end',
            'steps(/* 2个参数:步数,方向(可选)；例如: 5, start */)', 'cubic-bezier(/* 4个0~1参数:x1,y1,x2,y2；例如: 0.25, 0.1, 0.25, 1 */)'],
        SHADOW_VALUES = ['none', '/* 长度值; 例如: 10px */', 'inset', ...COLOR_KEYWORDS],
        BORDER_SHORTHAND_VALUES = ['none', '/* 长度值; 例如: 10px */', 'inset', 'outset', 'thin', 'medium', 'thick', 'solid',
            'dashed', 'dotted', 'double', 'groove', 'ridge', ...COLOR_KEYWORDS],
        FONT_FEATURE_VALUES = ['normal', '/* OpenType 特性值; 例如: "kern" 1 */'],
        FONT_VARIATION_VALUES = ['normal', '/* 字符串+数字; 例如: "wght" 700 */'],

        // 常规 CSS 属性值映射
        PROPERTY_VALUES = {
            // 颜色类
            'color': COLOR_KEYWORDS, 'background-color': COLOR_KEYWORDS, 'border-color': COLOR_KEYWORDS, 'outline-color': COLOR_KEYWORDS,
            'text-decoration-color': COLOR_KEYWORDS, 'column-rule-color': COLOR_KEYWORDS, 'border-top-color': COLOR_KEYWORDS,
            'border-right-color': COLOR_KEYWORDS, 'border-bottom-color': COLOR_KEYWORDS, 'border-left-color': COLOR_KEYWORDS,

            // 边框样式
            'border-style': BORDER_STYLE_VALUES, 'border-top-style': BORDER_STYLE_VALUES, 'border-right-style': BORDER_STYLE_VALUES,
            'border-bottom-style': BORDER_STYLE_VALUES, 'border-left-style': BORDER_STYLE_VALUES, 'outline-style': BORDER_STYLE_VALUES,

            // 边框宽度
            'border-width': BORDER_WIDTH_VALUES, 'border-top-width': BORDER_WIDTH_VALUES, 'border-right-width': BORDER_WIDTH_VALUES,
            'border-bottom-width': BORDER_WIDTH_VALUES, 'border-left-width': BORDER_WIDTH_VALUES, 'outline-width': BORDER_WIDTH_VALUES,

            // 外边距
            'margin': MARGIN_VALUES, 'margin-top': MARGIN_VALUES, 'margin-right': MARGIN_VALUES,
            'margin-bottom': MARGIN_VALUES, 'margin-left': MARGIN_VALUES,

            // 内边距和边框圆角
            'padding': LENGTH_AND_PERCENTAGE, 'padding-top': LENGTH_AND_PERCENTAGE, 'padding-right': LENGTH_AND_PERCENTAGE,
            'padding-bottom': LENGTH_AND_PERCENTAGE, 'padding-left': LENGTH_AND_PERCENTAGE, 'border-radius': LENGTH_AND_PERCENTAGE,
            'border-top-left-radius': LENGTH_AND_PERCENTAGE, 'border-top-right-radius': LENGTH_AND_PERCENTAGE,
            'border-bottom-right-radius': LENGTH_AND_PERCENTAGE, 'border-bottom-left-radius': LENGTH_AND_PERCENTAGE,

            // 尺寸
            'width': WIDTH_HEIGHT_VALUES, 'height': WIDTH_HEIGHT_VALUES,
            'min-width': MIN_WIDTH_HEIGHT_VALUES, 'min-height': MIN_WIDTH_HEIGHT_VALUES,
            'max-width': MAX_WIDTH_HEIGHT_VALUES, 'max-height': MAX_WIDTH_HEIGHT_VALUES,

            // 显示与定位
            'display': ['block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'inline-grid', 'flow-root', 'none',
                'contents', 'table', 'table-row', 'table-cell', 'list-item'],
            'position': ['static', 'relative', 'absolute', 'fixed', 'sticky'],
            'float': ['left', 'right', 'inline-start', 'inline-end', 'none'],
            'clear': ['left', 'right', 'inline-start', 'inline-end', 'none', 'both'],
            'visibility': ['visible', 'hidden', 'collapse'],

            // 溢出
            'overflow': OVERFLOW_VALUES, 'overflow-x': OVERFLOW_VALUES, 'overflow-y': OVERFLOW_VALUES,

            // 弹性布局
            'flex-direction': ['row', 'row-reverse', 'column', 'column-reverse'],
            'flex-wrap': ['nowrap', 'wrap', 'wrap-reverse'],
            'flex-basis': ['auto', 'content', 'min-content', 'max-content', 'fit-content', '/* 长度值; 例如: 10px */',
                '/* 百分比值; 例如: 50% */',],
            'justify-content': ['center', 'space-between', 'space-around', 'space-evenly', 'start', 'end', 'left', 'right',
                'flex-start', 'flex-end'],
            'align-content': ['center', 'space-between', 'space-around', 'space-evenly', 'stretch', 'flex-start', 'flex-end',],
            'align-items': ['center', 'baseline', 'stretch', 'start', 'end', 'flex-start', 'flex-end'],
            'align-self': ['center', 'baseline', 'stretch', 'start', 'end', 'flex-start', 'flex-end', 'auto'],


            // 网格布局
            'grid-template-columns': GRID_TEMPLATE_VALUES, 'grid-template-rows': GRID_TEMPLATE_VALUES,
            'gap': GAP_VALUES, 'row-gap': GAP_VALUES, 'column-gap': GAP_VALUES,

            // 文本相关
            'text-align': ['left', 'right', 'center', 'justify', 'start', 'end'],
            'vertical-align': ['baseline', 'sub', 'super', 'text-top', 'text-bottom', 'middle', 'top', 'bottom',
                '/* 长度值; 例如: 10px */', '/* 百分比值; 例如: 50% */'],
            'white-space': ['normal', 'nowrap', 'pre', 'pre-wrap', 'pre-line', 'break-spaces'],
            'word-break': ['normal', 'break-all', 'keep-all', 'break-word'],
            'font-style': ['normal', 'italic', 'oblique'],
            'font-weight': ['normal', 'bold', 'lighter', 'bolder', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
            'font-size': ['small', 'x-small', 'xx-small', 'medium', 'large', 'x-large', 'xx-large', 'smaller', 'larger',
                '/* 长度值; 例如: 10px */', '/* 百分比值; 例如: 50% */'],
            'font-family': ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'Arial', 'Helvetica',
                'Times New Roman', 'Courier New'],
            'font-feature-settings': FONT_FEATURE_VALUES,
            'font-variation-settings': FONT_VARIATION_VALUES,
            'text-transform': ['none', 'capitalize', 'uppercase', 'lowercase', 'full-width'],
            'text-decoration-line': ['none', 'underline', 'overline', 'line-through', 'blink'],
            'text-decoration-style': ['solid', 'double', 'dotted', 'dashed', 'wavy'],
            'text-decoration-thickness': ['auto', 'from-font', '/* 长度值; 例如: 10px */', '/* 百分比值; 例如: 50% */'],
            'line-height': ['normal', '/* 数字值; 例如: 1.5 */', '/* 长度值; 例如: 10px */', '/* 百分比值; 例如: 50% */'],
            'letter-spacing': SPACING_VALUES, 'word-spacing': SPACING_VALUES,
            'cursor': ['auto', 'default', 'none', 'context-menu', 'help', 'pointer', 'progress', 'wait', 'cell', 'crosshair', 'text',
                'vertical-text', 'alias', 'copy', 'move', 'no-drop', 'not-allowed', 'grab', 'grabbing', 'all-scroll', 'col-resize',
                'row-resize', 'n-resize', 'e-resize', 's-resize', 'w-resize', 'ne-resize', 'nw-resize', 'se-resize', 'sw-resize',
                'ew-resize', 'ns-resize', 'nesw-resize', 'nwse-resize', 'zoom-in', 'zoom-out'],

            // 列表
            'list-style-type': ['disc', 'circle', 'square', 'decimal', 'decimal-leading-zero', 'lower-roman', 'upper-roman',
                'lower-greek', 'lower-alpha', 'upper-alpha', 'none'],

            // 盒模型
            'box-sizing': ['content-box', 'border-box'],
            'object-fit': ['fill', 'contain', 'cover', 'none', 'scale-down'],

            // 背景
            'background-size': ['auto', 'cover', 'contain'],
            'background-attachment': ['scroll', 'fixed', 'local'],
            'background-origin': ['border-box', 'padding-box', 'content-box'],
            'background-clip': ['border-box', 'padding-box', 'content-box', 'text'],
            'background-repeat': ['repeat', 'repeat-x', 'repeat-y', 'no-repeat', 'space', 'round'],


            // 表格
            'border-collapse': ['collapse', 'separate'],
            'caption-side': ['top', 'bottom'],
            'empty-cells': ['show', 'hide'],
            'table-layout': ['auto', 'fixed'],

            // 书写模式
            'direction': ['ltr', 'rtl'],
            'unicode-bidi': ['normal', 'embed', 'isolate', 'bidi-override', 'isolate-override', 'plaintext'],
            'writing-mode': ['horizontal-tb', 'vertical-rl', 'vertical-lr', 'sideways-rl', 'sideways-lr'],

            // 分页
            'page-break-before': PAGE_BREAK_SIDES_VALUES, 'page-break-after': PAGE_BREAK_SIDES_VALUES,
            'page-break-inside': ['auto', 'avoid'],

            // 效果
            'z-index': ['auto', '/* 整数值; 例如: 5 */'],
            'opacity': ['/* 数字值; 例如: 0.5 */'],
            'transform': ['none', 'matrix(/* 6个参数: a, b, c, d, tx, ty；例如: 1, 0, 0, 1, 0, 0 */)',
                'matrix3d(/* 16个参数: 矩阵值；例如: 1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1 */)',
                'translate(/* 1-2个参数: 长度值X, 长度值Y(可选)；例如: 10px, 20px */)',
                'translate3d(/* 3个参数: tx, ty, tz；例如: 10px, 20px, 30px */)', 'translateX(/* 1个参数: 长度值；例如: 10px */)',
                'translateY(/* 1个参数: 长度值；例如: 10px */)', 'translateZ(/* 1个参数: 长度值；例如: 10px */)',
                'scale(/* 1-2个参数: 缩放倍数X, 缩放倍数Y(可选)；例如: 2 */)', 'scale3d(/* 3个参数: sx, sy, sz；例如: 2, 0.5, 1 */)',
                'scaleX(/* 1个参数: 缩放倍数；例如: 2 */)', 'scaleY(/* 1个参数: 缩放倍数；例如: 2 */)',
                'scaleZ(/* 1个参数: 缩放倍数；例如: 2 */)', 'rotate(/* 1个参数: 角度值；例如: 45deg */)',
                'rotate3d(/* 4个参数: x, y, z, angle；例如: 1, 1, 0, 45deg */)', 'rotateX(/* 1个参数: 角度值；例如: 45deg */)',
                'rotateY(/* 1个参数: 角度值；例如: 45deg */)', 'rotateZ(/* 1个参数: 角度值；例如: 45deg */)',
                'skew(/* 1-2个参数: 角度X, 角度Y(可选)；例如: 10deg, 20deg */)', 'skewX(/* 1个参数: 角度值；例如: 10deg */)',
                'skewY(/* 1个参数: 角度值；例如: 10deg */)', 'perspective(/* 1个参数: 长度值；例如: 100px */)'],
            'filter': FILTER_VALUES, 'backdrop-filter': FILTER_VALUES,
            'clip-path': ['none', 'inset(/* 1-4个参数: 长度值(上右下左)；例如: 10px 20px */)',
                'circle(/* 1-2个参数: 半径值, at 圆心位置(可选)；例如: 50% */)',
                'ellipse(/* 1-3个参数: rx ry, at 圆心位置(可选)；例如: 50% 30% */)',
                'polygon(/* 2个以上参数: 填充规则(可选) + 坐标对列表；例如: 0% 0%, 100% 0%, 100% 100% */)',
                'path(/* 1个参数: 路径字符串；例如: "M 0 0 L 100 100" */)', 'url(/* 1个参数: 字符串；例如: "clip.svg#id" */)'],
            'mask-mode': ['alpha', 'luminance', 'match-source'],
            'mask-type': ['alpha', 'luminance'],
            'isolation': ['auto', 'isolate'],
            'mix-blend-mode': ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'color',
                'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'luminosity', 'plus-darker', 'plus-lighter'],
            'background-blend-mode': ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn',
                'color', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'luminosity'],

            // 过渡与动画
            'transition-property': ['all', 'none', ...CSS_PROPERTIES],
            'animation-name': ['none', ...CSS_PROPERTIES],
            'transition-timing-function': TIMING_FUNCTION_VALUES, 'animation-timing-function': TIMING_FUNCTION_VALUES,
            'transition-duration': TIME_VALUES, 'transition-delay': TIME_VALUES,
            'animation-duration': TIME_VALUES, 'animation-delay': TIME_VALUES,
            'animation-iteration-count': ['infinite', '/* 数字值; 例如: 1.0 */'],
            'animation-direction': ['normal', 'reverse', 'alternate', 'alternate-reverse'],
            'animation-fill-mode': ['none', 'forwards', 'backwards', 'both'],
            'animation-play-state': ['running', 'paused'],

            // 缩写属性
            'border': BORDER_SHORTHAND_VALUES, 'border-top': BORDER_SHORTHAND_VALUES, 'border-right': BORDER_SHORTHAND_VALUES,
            'border-bottom': BORDER_SHORTHAND_VALUES, 'border-left': BORDER_SHORTHAND_VALUES, 'outline': BORDER_SHORTHAND_VALUES,

            'background': ['none', 'transparent',
                'url(/* 1个参数: 字符串；例如: "image.png" */)',
                'linear-gradient(/* 2个以上参数: 方向(可选) + 颜色停止列表；例如: to right, red, blue */)',
                'radial-gradient(/* 2个以上参数: 形状/位置(可选) + 颜色停止列表；例如: circle, red, blue */)',
                'repeat', 'no-repeat', 'repeat-x', 'repeat-y', 'scroll', 'fixed', 'local', 'cover', 'contain', 'auto',
                '/* 长度值; 例如: 10px */', '/* 百分比值; 例如: 50% */', 'left', 'center', 'right', 'top', 'bottom', ...COLOR_KEYWORDS],
            'font': ['normal', 'italic', 'oblique', 'bold', 'bolder', 'lighter', '100', '200', '300', '400', '500', '600', '700',
                '800', '900', 'small-caps', '/* 长度值; 例如: 10px */', '/* 百分比值; 例如: 50% */', 'xx-small', 'x-small', 'small',
                'medium', 'large', 'x-large', 'xx-large', 'smaller', 'larger', 'serif', 'sans-serif', 'monospace', 'cursive',
                'fantasy', 'system-ui'],
            'list-style': ['none', 'disc', 'circle', 'square', 'decimal', 'decimal-leading-zero', 'lower-roman', 'upper-roman',
                'lower-greek', 'lower-alpha', 'upper-alpha', 'armenian', 'georgian', 'inside', 'outside',
                'url(/* 1个参数: 图像路径，用于自定义列表标记图像；例如: "marker.png" */)'],
            'text-decoration': ['none', 'underline', 'overline', 'line-through', 'blink', 'solid', 'double', 'dotted', 'dashed',
                'wavy', ...COLOR_KEYWORDS],
            'transition': ['none', 'all', '/* 属性名; 例如: color */', '/* 时间值; 例如: 2s */', 'ease', 'linear', 'ease-in',
                'ease-out', 'ease-in-out', 'step-start', 'step-end'],
            'animation': ['none', '/* 动画名称; 例如: myanimation */', '/* 时间值; 例如: 2s */', 'ease', 'linear', 'ease-in',
                'ease-out', 'ease-in-out', 'step-start', 'step-end', 'infinite', 'normal', 'reverse', 'alternate-reverse',
                'alternate', 'forwards', 'backwards', 'both', 'running', 'paused'],
            'box-shadow': SHADOW_VALUES, 'text-shadow': SHADOW_VALUES
        },

        // 伪类 (以 : 开头)
        PSEUDO_CLASSES = [':active', ':any-link', ':blank', ':checked', ':current', ':default', ':defined',
            ':dir(/* 1个参数: 文字方向；例如: ltr或rtl */)', ':disabled', ':empty', ':enabled',
            ':first', ':first-child', ':first-of-type', ':fullscreen', ':future', ':focus', ':focus-visible', ':focus-within',
            ':has(/* 1个参数: 选择器；例如: img */)', ':host', ':host(/* 1个参数: 选择器；例如: div */)',
            ':host-context(/* 1个参数: 选择器；例如: .theme */)', ':hover', ':indeterminate', ':in-range', ':invalid',
            ':is(/* 1个选择器列表参数；例如: h1, h2, h3 */)', ':lang(/* 1个参数: 语言代码；例如: en */)',
            ':last-child', ':last-of-type', ':left', ':link', ':local-link', ':not(/* 1个参数: 选择器；例如: .hidden */)',
            ':nth-child(/* 1个匹配位置参数: an+b 表达式或关键字；例如: 2n+1 */)', ':nth-col(/* 1个匹配位置参数: an+b 表达式；例如: 2n */)',
            ':nth-last-child(/* 1个匹配位置参数: an+b 表达式；例如: 2n+1 */)', ':nth-of-type(/* 1个匹配位置参数: an+b 表达式；例如: 2n+1 */)',
            ':nth-last-of-type(/* 1个匹配位置参数: an+b 表达式；例如: 2n+1 */)', ':only-child', ':only-of-type', ':optional',
            ':out-of-range', ':past', ':paused', ':picture-in-picture', ':placeholder-shown', ':playing', ':read-only',
            ':read-write', ':required', ':right', ':root', ':scope', ':target', ':user-invalid', ':valid', ':visited',
            ':where(/* 1个选择器列表参数；例如: h1, h2 */)'
        ],
        // @page 专用伪类
        PAGE_PSEUDO_CLASSES = [':first', ':left', ':right', ':blank'],

        // 伪元素 (以 :: 开头)
        PSEUDO_ELEMENTS = [
            '::after', '::backdrop', '::before', '::cue', '::cue-region', '::first-letter', '::first-line', '::grammar-error',
            '::marker', '::part(/* 1个参数: 部件名；例如: button */)', '::placeholder', '::selection', '::spelling-error',
            '::slotted(/* 1个参数: 选择器；例如: span */)'
        ],

        // HTML 元素名
        HTML_ELEMENTS = [
            'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base', 'bdi', 'bdo', 'blockquote', 'body', 'br', 'button',
            'canvas', 'caption', 'cite', 'code', 'col', 'colgroup', 'data', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog',
            'div', 'dl', 'dt', 'em', 'embed', 'fieldset', 'figcaption', 'figure', 'footer', 'form',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html',
            'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'link', 'main', 'map', 'mark', 'menu', 'meta', 'meter',
            'nav', 'noscript', 'object', 'ol', 'optgroup', 'option', 'output', 'p', 'picture', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby',
            's', 'samp', 'script', 'section', 'select', 'slot', 'small', 'source', 'span', 'strong', 'style', 'sub', 'summary', 'sup',
            'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'track', 'u', 'ul',
            'var', 'video', 'wbr'
        ],

        // @规则名
        AT_RULES = [
            '@charset', '@color-profile', '@container', '@counter-style', '@document', '@font-face', '@font-feature-values',
            '@import', '@keyframes', '@layer', '@media', '@namespace', '@page', '@property', '@scroll-timeline',
            '@supports', '@viewport', '@scope', '@starting-style', '@view-transition', '@font-palette-values'
        ],

        // @media媒体特性名
        MEDIA_FEATURES = [
            'width', 'min-width', 'max-width', 'height', 'min-height', 'max-height',
            'aspect-ratio', 'min-aspect-ratio', 'max-aspect-ratio', 'orientation', 'color', 'color-index', 'monochrome',
            'resolution', 'min-resolution', 'max-resolution', 'scan', 'grid', 'update', 'overflow-block', 'overflow-inline',
            'hover', 'any-hover', 'pointer', 'any-pointer', 'prefers-color-scheme', 'prefers-reduced-motion', 'prefers-contrast',
            'dynamic-range', 'video-dynamic-range', 'scripting', 'display-mode', 'forced-colors', 'inverted-colors', 'prefers-reduced-data'
        ],

        // @media 媒体类型
        MEDIA_TYPES = ['all', 'print', 'screen', 'speech', 'tv', 'projection', 'handheld', 'braille', 'embossed', 'tty'],
        // @规则运算符
        MEDIA_OPERATORS = ['only', 'not', 'and'],
        SUPPORTS_OPERATORS = ['not', 'and', 'or'],


        // @media媒体通用值
        MEDIA_GENERIC_VALUES = ['/* 长度值; 例如: 10px */', '/* 百分比值; 例如: 50% */', '/* 分辨率值; 例如: 300dpi */',
            '/* 整数值; 例如: 5 */', '/* 数字值; 例如: 0.5 */', 'portrait', 'landscape', 'progressive', 'interlace', 'infinite'],

        // ----- 媒体特性共用值 -----
        INTEGER_VALUES = ['/* 整数值; 例如: 5 */'],
        HOVER_VALUES = ['none', 'hover'],
        POINTER_VALUES = ['none', 'coarse', 'fine'],
        DYNAMIC_RANGE_VALUES = ['standard', 'high'],

        // @media媒体特性值映射
        MEDIA_FEATURE_VALUES = {
            'orientation': ['portrait', 'landscape'],
            'scan': ['progressive', 'interlace'],
            'grid': ['0', '1'],
            'color': INTEGER_VALUES, 'color-index': INTEGER_VALUES, 'monochrome': INTEGER_VALUES,
            'resolution': ['/* 分辨率值; 例如: 300dpi */', 'infinite'],
            'update': ['none', 'slow', 'normal'],
            'overflow-inline': ['none', 'scroll'],
            'overflow-block': ['none', 'scroll', 'optional-paged'],
            'hover': HOVER_VALUES, 'any-hover': HOVER_VALUES,
            'pointer': POINTER_VALUES, 'any-pointer': POINTER_VALUES,
            'prefers-color-scheme': ['light', 'dark'],
            'prefers-reduced-motion': ['no-preference', 'reduce'],
            'prefers-contrast': ['no-preference', 'high', 'low', 'forced'],
            'dynamic-range': DYNAMIC_RANGE_VALUES, 'video-dynamic-range': DYNAMIC_RANGE_VALUES,
            'scripting': ['none', 'initial-only', 'enabled'],
            'display-mode': ['fullscreen', 'standalone', 'minimal-ui', 'browser'],
            'forced-colors': ['none', 'active'],
            'inverted-colors': ['none', 'inverted'],
            'prefers-reduced-data': ['no-preference', 'reduce']
        },

        // @规则块内专有属性名
        AT_RULE_BLOCK_DESCRIPTORS = {
            'font-face': ['font-family', 'src', 'font-weight', 'font-style', 'font-stretch', 'unicode-range', 'font-variant',
                'font-feature-settings', 'font-variation-settings'],
            'page': ['size', 'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'marks', 'bleed'],
            'counter-style': ['system', 'symbols', 'additive-symbols', 'negative', 'prefix', 'suffix', 'range', 'pad',
                'speak-as', 'fallback'],
            'property': ['syntax', 'inherits', 'initial-value'],
            'font-palette-values': ['font-family', 'base-palette', 'override-colors']
        },

        // @规则括号内专有特性
        AT_RULE_PARENS_DESCRIPTORS = {
            'media': MEDIA_FEATURES, 'container': MEDIA_FEATURES, 'scope': MEDIA_FEATURES, 'supports': CSS_PROPERTIES
        },

        // @规则专有属性值映射
        AT_RULE_DESCRIPTOR_VALUES = {
            // @font-face 描述符值
            'src': ['url(/* 1个参数: 字符串；例如: "font.woff2" */)', 'local(/* 1个参数: 字体名称；例如: "Arial" */)'],
            'font-stretch': ['normal', 'ultra-condensed', 'extra-condensed', 'condensed', 'semi-condensed', 'semi-expanded',
                'expanded', 'extra-expanded', 'ultra-expanded'],
            'font-variant': ['normal', 'small-caps'],
            'font-feature-settings': FONT_FEATURE_VALUES,
            'font-variation-settings': FONT_VARIATION_VALUES,

            // @counter-style 描述符值
            'system': ['cyclic', 'numeric', 'alphabetic', 'symbolic', 'additive', 'fixed', 'extends'],
            'negative': ['/* 字符串序列; 例如: "-" ")" */'],
            'prefix': ['/* 前缀字符串（一个或多个），在计数器符号前添加；例如: "第" 或 "(" */'],
            'suffix': ['/* 后缀字符串（一个或多个），在计数器符号后添加；例如: "、" 或 ". " 或 ")" */'],
            'range': ['auto', '/* 整数或 infinite 范围; 例如: [ 1 5 ] */'],
            'pad': ['/* 整数+字符串; 例如: 5 "★" */'],
            'speak-as': ['auto', 'bullets', 'numbers', 'words', 'spell-out', '/* 计数器样式名; 例如: mycounter */'],
            'fallback': ['/* 计数器样式名; 例如: mycounter */'],

            // @property 描述符值
            'syntax': [`'<length>'`, `'<number>'`, `'<percentage>'`, `'<color>'`, `'®'`, `'<integer>'`, `'<angle>'`,
                `'<time>'`, `'<resolution>'`, `'<transform-function>'`, `'<custom-ident>'`, `'<string>'`],
            'inherits': ['true', 'false'],
            'initial-value': ['/* 任意合法初始值; 例如: 10px */'],

            // @page 描述符值
            'size': ['auto', 'landscape', 'portrait', '/* 长度值(1-2个); 例如: 10cm 20cm */', 'A5', 'A4', 'A3', 'B5', 'B4', 'JIS-B5', 'JIS-B4', 'letter',
                'legal', 'ledger'],
            'marks': ['none', 'crop', 'cross', 'crop cross'],
            'bleed': ['auto', '/* 长度值; 例如: 10px */'],

            // @font-palette-values 描述符值
            'base-palette': ['/* 整数值; 例如: 3 */', 'light', 'dark'],
            'override-colors': ['/* 整数+颜色; 例如: 3 #ff0000 */']
        },

        // 关键帧选择器
        KEYFRAME_SELECTORS = (() => {
            const selectors = ['from', 'to'];
            for (let i = 0; i <= 100; i += 10) selectors.push(i + '%');
            return selectors;
        })(),

        // ---------- 集合定义 ----------
        allAtRules = new Set(['media', 'supports', 'font-face', 'keyframes', 'page', 'counter-style', 'property', 'container',
            'scope', 'starting-style', 'view-transition', 'font-palette-values']),
        descriptorAtRules = new Set(['font-face', 'counter-style', 'property', 'page', 'font-palette-values']),
        parensAtRules = new Set(['media', 'supports', 'container', 'scope']),
        whitespace = /\s/, commentRegex = /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, stringRegex = /(["'])(?:\\.|(?!\1)[^\\])*\1/g,
        PU = /[-\w\p{L}\p{N}]/u;

    // ---------- 工具函数 ----------
    // 移除CSS中的注释和字符串
    function stripCommentsAndStrings(cssText) {
        return cssText.replace(commentRegex, '').replace(stringRegex, '');
    }
    // 判断字符串是否包含指定模式
    function strIncludesAny(str, substrings) {
        if (str == null) return false;
        return substrings.some(sub => str.includes(sub));
    }
    // 判断字符是否为单词字符（用于值补全中的边界识别）
    function isWordChar(c) {
        return c && /[^\s;:(){}]/.test(c);
    }

    // 判断从指定位置开始是否为逻辑运算符
    function isLogicOpStart(line, pos) {
        return SUPPORTS_OPERATORS.some(op => line.slice(pos, pos + op.length).toLowerCase() === op);
    }

    // 在字符串中向前或向后查找单词边界
    function findWordBoundary(line, lineLen, start, direction = 'forward', charTest = PU) {
        let pos = start;
        if (direction === 'forward') while (pos < lineLen && charTest.test(line[pos])) pos++;
        else while (pos >= 0 && charTest.test(line[pos])) pos--;
        return pos;
    }

    // 获取属性值候选列表
    function getValueCandidates(insideParensWithAtRule, atRuleType, featureName) {
        if (insideParensWithAtRule && atRuleType === 'media') return MEDIA_FEATURE_VALUES[featureName] || MEDIA_GENERIC_VALUES;
        if (descriptorAtRules.has(atRuleType)) return AT_RULE_DESCRIPTOR_VALUES[featureName] || PROPERTY_VALUES[featureName] || [];
        return PROPERTY_VALUES[featureName] || [];
    }

    // 获取非值候选项
    function getNonValueCandidates(atRuleType, insideBlock, insideParensWithAtRule, atMatch) {
        if (insideParensWithAtRule) {
            if (AT_RULE_PARENS_DESCRIPTORS[atRuleType]) return AT_RULE_PARENS_DESCRIPTORS[atRuleType];
            if (atMatch) return atMatch[1].toLowerCase() === 'supports' ? CSS_PROPERTIES : MEDIA_FEATURES;
            return [];
        }
        if (insideBlock) {
            if (atRuleType === 'keyframes') return KEYFRAME_SELECTORS;
            if (descriptorAtRules.has(atRuleType)) return AT_RULE_BLOCK_DESCRIPTORS[atRuleType] || [];
            return HTML_ELEMENTS;
        }
        return HTML_ELEMENTS;
    }

    // 获取当前光标所在位置的上下文信息
    function getContextInfo(type, sliceLine, state, posCh, atMatch) {
        const colonIndex = sliceLine.lastIndexOf(':'), afterColon = sliceLine.slice(colonIndex + 1);
        let ctx = state?.context, atRuleType = null, insideBlock = false, insideParensWithAtRule = false, inValue = false;

        // 追踪上下文栈
        while (ctx) {
            const ctxType = ctx.type, ctxPrev = ctx.prev;
            if (allAtRules.has(ctxType)) atRuleType = ctxType;
            if (ctxType === 'block') insideBlock = true;
            if (ctxType === 'parens' && parensAtRules.has(ctxPrev?.type)) insideParensWithAtRule = true;
            ctx = ctxPrev;
        }

        if (!insideParensWithAtRule && atMatch) insideParensWithAtRule = true;
        if (!atRuleType && atMatch) atRuleType = atMatch[1].toLowerCase();

        if (strIncludesAny(type, ['def', 'variable-2'])) inValue = true;
        else if (!insideBlock && !insideParensWithAtRule) inValue = false;
        else if (colonIndex === -1) inValue = false;
        else if (insideParensWithAtRule && afterColon.includes(')')) inValue = false;
        else if (strIncludesAny(afterColon, [';', '}'])) inValue = false;
        else inValue = posCh > colonIndex;

        return { inValue, atRuleType, insideBlock, insideParensWithAtRule };
    }

    // 根据输入前缀过滤候选项,并转换为 CodeMirror 补全项格式
    function filterHints(prefix, candidates, transform = item => item) {
        return candidates.filter(item => {
            const matchStr = transform(item).toLowerCase();
            return !prefix || matchStr.startsWith(prefix.toLowerCase());
        }).map(text => ({ text, displayText: text }));
    }

    // 获取伪类/伪元素上下文信息
    function getPseudoContext(line, lineLen, posCh) {
        // 向左找到最后一个冒号的位置
        let colonPos = -1;
        for (let i = posCh - 1; i >= 0; i--) {
            if (line[i] === ':') {
                colonPos = i;
                break;
            }
        }
        if (colonPos === -1) return { pType: 'none' };

        // 从 colonPos 向左找到连续冒号的起始
        let pStart = colonPos;
        while (pStart > 0 && line[pStart - 1] === ':') pStart--;

        // 判断类型：连续冒号个数 >=2 为伪元素,否则为伪类
        const colonCount = colonPos - pStart + 1, pType = colonCount >= 2 ? 'element' : 'class',
            pPrefix = line.slice(colonPos + 1, posCh);

        // 括号闭合检查：光标位于已闭合的伪类括号后则不补全
        let parenLevel = 0, hasClosedParen = false;
        for (let i = colonPos + 1; i < posCh; i++) {
            const c = line[i];
            if (c === '(') parenLevel++;
            else if (c === ')') {
                parenLevel--;
                if (parenLevel === 0) hasClosedParen = true;
            }
        }
        if (hasClosedParen && parenLevel === 0) return { pType: 'none' };

        // 处理语法结构和表达式内容,边界
        let pEnd = pStart, depth = 0;
        while (pEnd < lineLen && line[pEnd] === ':') pEnd++;
        while (pEnd < lineLen) {
            const c = line[pEnd];
            if (c === '(') depth++;
            else if (c === ')') depth--;
            if (depth === 0) {
                if (c === ':' || /[;{}>,+~\[\]]/.test(c)) break;
            }
            pEnd++;
        }

        if (posCh > pEnd) return { pType: 'none' };
        return { pType, pStart, pPrefix, pEnd };
    }

    // 检测光标是否在var()内部,并返回右括号的位置
    function getVarCallInfo(line, posCh, sliceLine) {
        const lastVarIndex = sliceLine.lastIndexOf('var(');
        if (lastVarIndex === -1) return { inside: false, closed: false, closePos: -1 };

        let balance = 0, closed = false, closePos = -1;
        for (let i = lastVarIndex + 4; i < line.length; i++) {
            const ch = line[i];
            if (ch === '(') balance++;
            else if (ch === ')') {
                if (balance === 0) {
                    closed = true, closePos = i;
                    break;
                }
                else balance--;
            }
        }

        const inside = lastVarIndex + 4 <= posCh && (!closed || posCh <= closePos);
        return { inside, closed, closePos };
    }

    // 获取当前光标所在值单词的范围
    function getReplacementRangeForValue(line, lineLen, posLine, posCh, inside, insideParensWithAtRule) {
        if (inside) {
            let start = posCh;
            while (start > 0 && PU.test(line[start - 1])) start--;
            let end = posCh;
            while (end < lineLen && PU.test(line[end])) end++;
            return { from: CodeMirror.Pos(posLine, start), to: CodeMirror.Pos(posLine, end) };
        }

        // 普通值逻辑
        let colonIndex = -1;
        for (let i = posCh - 1; i >= 0; i--) {
            if (line[i] === ':') {
                let j = i - 1;
                while (j >= 0 && whitespace.test(line[j])) j--;
                let end = j;
                while (j >= 0 && isWordChar(line[j])) j--;
                if (j < end) {
                    colonIndex = i;
                    break;
                }
            }
        }

        if (colonIndex === -1) {
            let end = posCh;
            while (end < lineLen && isWordChar(line[end])) end++;
            return {
                from: CodeMirror.Pos(posLine, Math.min(posCh, end)), to: CodeMirror.Pos(posLine, end)
            };
        }

        let start = colonIndex + 1;
        while (start < lineLen && whitespace.test(line[start])) start++;

        let end = start;
        while (end < lineLen) {
            const char = line[end];
            if (insideParensWithAtRule) {
                if (char === ')' || char === ';' || char === '}') break;
                if (isLogicOpStart(line, end) && (end === start || whitespace.test(line[end - 1]))) break;
            }
            else if (char === ';' || char === '}') break;
            end++;
        }

        while (end > start && whitespace.test(line[end - 1])) end--;
        return {
            from: CodeMirror.Pos(posLine, Math.min(start, posCh, end)), to: CodeMirror.Pos(posLine, end)
        };
    }

    // 提取 CSS 变量名
    function extractCSSVariables(cssText) {
        if (!cssText) return [];
        const cleanCss = stripCommentsAndStrings(cssText), varRegex = /--([-\w\p{L}\p{N}]+)\s*:/gu, varNames = new Set();
        let match;
        while ((match = varRegex.exec(cleanCss)) !== null) varNames.add(`--${match[1]}`);
        return Array.from(varNames);
    }

    /**
     * 检查从 startPos 开始（含）之后，第一个非空白字符是否为分号
     * @param {string} line 当前行完整字符串
     * @param {number} startPos 起始索引（包含）
     * @returns {boolean} 若找到的第一个非空白字符是分号,返回 true,否则返回 false
     */
    function hasSemicolonAfter(line, startPos) {
        const after = line.slice(startPos);
        for (let i = 0; i < after.length; i++) {
            const ch = after[i];
            if (ch === ';') return true;
            if (!whitespace.test(ch)) return false;
        }
        return false;
    }

    /**
     * 尝试获取当前光标所在位置的 @规则类型，优先使用传入的 atRuleType，
     * 若不可信则通过向上查找括号匹配来获取真正的规则名。
     * @param {string|null} atRuleType 初始的规则类型
     * @param {boolean} insideBlock 是否在块内
     * @param {CodeMirror} cm CodeMirror 实例
     * @param {number} posLine 光标行号
     * @param {number} posCh 光标列号
     * @returns {string|null} 有效的规则名（小写），若未找到则返回 null
     */
    function resolveAtRuleType(atRuleType, insideBlock, cm, posLine, posCh) {
        let effective = atRuleType;
        if (insideBlock && (!effective || !descriptorAtRules.has(effective))) {
            let sLine = posLine;
            while (sLine >= 0) {
                const lineText = cm.getLine(sLine), atRegex = /@([-\w\p{L}\p{N}]+)\s*([^{]*)?\{/gu;
                let match;
                while ((match = atRegex.exec(lineText)) !== null) {
                    const ruleName = match[1].toLowerCase(), bPos = match.index + match[0].length - 1,
                        startPos = { line: sLine, ch: bPos }, endMatch = cm.findMatchingBracket(startPos);
                    if (endMatch?.match) {
                        const { line: endL, ch: endC } = endMatch.to;
                        if ((sLine < posLine || (sLine === posLine && bPos < posCh)) && (endL > posLine
                            || (endL === posLine && endC > posCh))) return ruleName;
                    }
                }
                sLine--;
            }
        }
        return effective;
    }

    // ---------- 主 hint 函数 ----------
    CodeMirror.registerHelper('hint', 'css', cm => {
        const pos = cm.getCursor(), posLine = pos.line, line = cm.getLine(posLine), posCh = pos.ch;
        if (posCh > 0 && whitespace.test(line[posCh - 1])) return null;

        const sliceLine = line.slice(0, posCh), { state, type, start, end, string } = cm.getTokenAt(pos), lineLen = line.length,
            cssText = cm.getValue(), oFrom = CodeMirror.Pos(posLine, start), oTo = CodeMirror.Pos(posLine, end),
            atMatch = sliceLine.match(/@(media|supports|container|scope)\s*\([^)]*$/i),
            { inValue, atRuleType, insideBlock, insideParensWithAtRule } = getContextInfo(type, sliceLine, state, posCh, atMatch);

        let prefix = string.trim(), candidates = [];
        // @ 规则补全
        if (prefix.startsWith('@')) {
            const list = filterHints(prefix, AT_RULES);
            if (list.length > 0) return { list, from: oFrom, to: oTo };
        }

        // 属性值补全
        if (inValue) {
            const { inside, closed, closePos } = getVarCallInfo(line, posCh, sliceLine), range = getReplacementRangeForValue(
                line, lineLen, posLine, posCh, inside, insideParensWithAtRule);
            let from, to, needSemicolon = false;
            if (range) from = range.from, to = range.to, needSemicolon = range.needSemicolon || false;
            else from = to = pos;

            const match = sliceLine.match(/([-\w\p{L}\p{N}]+)\s*:\s*[^;)]*$/u), featureName = match ? match[1] : null;
            let effectiveAtRuleType = resolveAtRuleType(atRuleType, insideBlock, cm, posLine, posCh),
                specificCandidates = getValueCandidates(insideParensWithAtRule, effectiveAtRuleType, featureName);

            candidates = [...new Set([...specificCandidates, ...GLOBAL_KEYWORDS])];
            // CSS 变量补全
            const varNames = extractCSSVariables(cssText), shouldAddVarHints = (prefix?.startsWith('--')) || inside;
            if (shouldAddVarHints && varNames.length) {
                const varCandidates = filterHints(prefix, varNames);
                candidates = [...new Set([...candidates, ...varCandidates.map(c => c.text)])];
            }

            if (candidates.length === 0) return null;
            if (prefix === ':' || prefix === '::' || !prefix) prefix = '';
            let list = filterHints(prefix, candidates);
            if (list.length) {
                let suffix = '';
                if (inside) {
                    if (closed) {
                        const afterClosePos = closePos + 1, hasSemicolon = hasSemicolonAfter(line, afterClosePos);
                        if (!hasSemicolon) to = CodeMirror.Pos(posLine, afterClosePos), suffix = ');';
                    } else {
                        const hasSemicolon = hasSemicolonAfter(line, posCh);
                        suffix = hasSemicolon ? ')' : ');';
                    }
                } else suffix = ';';
                if (suffix) list = list.map(item => ({ text: `${item.text}${suffix}`, displayText: item.displayText }));
                return { list, from, to };
            }
            return null;
        }
        // 非值补全
        else {
            // 1. 处理各种 @规则 后面的运算符或名称补全
            const atRuleMatch = sliceLine.match(/@(media|supports|container|layer|keyframes|page)\s+([^;{]*)$/i);
            if (atRuleMatch) {
                const atRule = atRuleMatch[1].toLowerCase(), after = atRuleMatch[2], hasOpenParen = after.includes('('),
                    hasOpenBrace = after.includes('{'), commonMatch = after.match(/([\w-]*)$/),
                    commonPrefix = commonMatch ? commonMatch[1] : '', commonWordStart = posCh - commonPrefix.length;

                function buildCompletion(prefix, candidates, wordStart = commonWordStart) {
                    const list = filterHints(prefix, candidates);
                    if (list.length)
                        return { list, from: CodeMirror.Pos(posLine, wordStart), to: CodeMirror.Pos(posLine, posCh) };
                    return null;
                }

                if (atRule === 'media' && !hasOpenParen && !hasOpenBrace) {
                    if (after.includes(':')) return null;
                    let candidates;
                    if (commonPrefix && MEDIA_OPERATORS.some(op => op.startsWith(commonPrefix.toLowerCase())))
                        candidates = MEDIA_OPERATORS;
                    else candidates = MEDIA_TYPES;
                    const result = buildCompletion(commonPrefix, candidates);
                    if (result) return result;
                }

                if ((atRule === 'supports' || atRule === 'container') && !hasOpenParen && !hasOpenBrace) {
                    if (commonPrefix && /^\w*$/.test(commonPrefix)) {
                        const result = buildCompletion(commonPrefix, SUPPORTS_OPERATORS);
                        if (result) return result;
                    }
                }

                if (atRule === 'layer' || atRule === 'keyframes') {
                    const cleanCss = stripCommentsAndStrings(cssText), regex = atRule === 'layer'
                        ? /@layer\s+([-\w\p{L}\p{N}]+)(?=\s*[;{,]|\s*\{)/gu : /@keyframes\s+([-\w\p{L}\p{N}]+)(?=\s*\{)/gu,
                        matches = [...cleanCss.matchAll(regex)], names = [...new Set(matches.map(m => m[1]))],
                        result = buildCompletion(commonPrefix, names);
                    if (result) return result;
                }

                if (atRule === 'page' && !hasOpenBrace) {
                    const colonMatch = after.match(/:([\w-]*)$/);
                    if (colonMatch) {
                        const prefix = colonMatch[1], wordStart = posCh - prefix.length - 1,
                            rawCandidates = PAGE_PSEUDO_CLASSES.map(p => p.slice(1)),
                            list = filterHints(prefix, rawCandidates).map(item => ({
                                text: `: ${item.text}`, displayText: `: ${item.displayText}`
                            }));
                        if (list.length)
                            return { list, from: CodeMirror.Pos(posLine, wordStart), to: CodeMirror.Pos(posLine, posCh) };
                    }
                }
            }

            // 2. 伪类/伪元素补全
            const { pType, pStart, pPrefix, pEnd } = getPseudoContext(line, lineLen, posCh);
            if (pType !== 'none') {
                const [source, stripCount] = pType === 'element' ? [PSEUDO_ELEMENTS, 2] : [PSEUDO_CLASSES, 1];
                let list = filterHints(pPrefix, source, item => item.slice(stripCount));
                if (list.length) {
                    let from = CodeMirror.Pos(posLine, pStart), to = CodeMirror.Pos(posLine, pEnd);
                    if (!pPrefix) {
                        let wordEnd = findWordBoundary(line, lineLen, pEnd);
                        if (wordEnd > pEnd) to = CodeMirror.Pos(posLine, wordEnd);
                    }
                    return { list, from, to };
                }
            }

            // 3. ID/类选择器补全
            if (prefix.startsWith('#') || prefix.startsWith('.')) {
                const candidatesSet = new Set(), regex = /([#.](?![#.\d])[-\w\p{L}\p{N}]+)(?=[,\s>+~[:{@(]|$)/gmu,
                    cleanCss = stripCommentsAndStrings(cssText);
                let match, braceDepth = 0, lastIndex = 0;
                while ((match = regex.exec(cleanCss)) !== null) {
                    const segment = cleanCss.slice(lastIndex, match.index);
                    for (let i = 0; i < segment.length; i++) {
                        if (segment[i] === '{') braceDepth++;
                        else if (segment[i] === '}') braceDepth--;
                    }
                    lastIndex = match.index;
                    if (braceDepth === 0) {
                        const fullMatch = match[1];
                        if ((prefix.startsWith('#') && fullMatch[0] === '#') || (prefix.startsWith('.') && fullMatch[0] === '.'))
                            candidatesSet.add(fullMatch);
                    }
                }
                const candidates = Array.from(candidatesSet), list = filterHints(prefix, candidates);
                return list.length ? { list, from: oFrom, to: oTo } : null;
            }

            // 4. 属性名/其他元素补全
            if (strIncludesAny(type, ['property', 'variable-2'])) {
                let effectiveAtRuleType = resolveAtRuleType(atRuleType, insideBlock, cm, posLine, posCh);

                if (insideBlock && descriptorAtRules.has(effectiveAtRuleType))
                    candidates = AT_RULE_BLOCK_DESCRIPTORS[effectiveAtRuleType] || [];
                else candidates = CSS_PROPERTIES;
            }
            else candidates = getNonValueCandidates(atRuleType, insideBlock, insideParensWithAtRule, atMatch);

            let list = filterHints(prefix, candidates);
            return list.length ? { list, from: oFrom, to: oTo } : null;
        }
    });
})();