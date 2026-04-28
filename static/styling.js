
// 长按设置背景色功能实现
class LongPressBackground {
    constructor() {
        this.pressTimer = null, this.longPressDuration = 2000, this.isLongPress = false;    // 定时器,长按时间 2秒,是否长按
        this.visualFeedbackTimer = null, this.visualFeedbackDelay = 600;                    // 视觉反馈定时器
        this.nowElement = null, this.longPressedElement = null; this.lastSelect = null;     // 当前元素,长按元素,最后下拉框对象
        this.dragThreshold = 10, this.startX = 0, this.startY = 0, this.isDragging = false; // 添加拖动检测相关变量
        const pressIndicator = document.createElement('div'), picker = document.createElement('div'), api = '/api/longPic';
        pressIndicator.className = 'pressIndicator', picker.id = 'picker', picker.className = 'picker';

        // 添加颜色选择器容器,长按指示器
        document.body.append(pressIndicator, picker), this.pressIndicator = pressIndicator, this.picker = picker;
        this.currentMode = 'background'; // 当前模式：初始为background

        // 提前绑定所有需要的事件处理器
        this.handleStart = this.handleStart.bind(this), this.handleEnd = this.handleEnd.bind(this);
        this.handleCancel = this.handleCancel.bind(this), this.handleMove = this.handleMove.bind(this);
        this.handleDocumentClick = this.handleDocumentClick.bind(this), this.handleGlobalClick = this.handleGlobalClick.bind(this);

        getStyle(this.picker, api), mouseOrTouch(this.picker, null, api); // 获取储存样式,绑定元素移动事件
        this.init();
    }

    init() {
        // 使用事件委托，避免为每个元素单独绑定事件
        document.addEventListener('mousedown', this.handleStart, true);
        document.addEventListener('mouseup', this.handleEnd, true);
        document.addEventListener('mouseleave', this.handleCancel, true);
        document.addEventListener('mousemove', this.handleMove);

        document.addEventListener('touchstart', this.handleStart);
        document.addEventListener('touchend', this.handleEnd);
        document.addEventListener('touchcancel', this.handleCancel);
        document.addEventListener('touchmove', this.handleMove, { passive: true });

        this.initPicker(); // 初始化选择器
        document.addEventListener('click', this.handleDocumentClick);
        document.addEventListener('touchend', this.handleDocumentClick);
        document.addEventListener('click', this.handleGlobalClick, true);  // 阻止长按后的单击
    }

    // 坐标获取
    getEventCoordinates(e) {
        let x, y;
        if (e.touches && e.touches.length > 0) x = e.touches[0].pageX, y = e.touches[0].pageY;
        else if (e.changedTouches && e.changedTouches.length > 0) x = e.changedTouches[0].pageX, y = e.changedTouches[0].pageY;
        else x = e.pageX, y = e.pageY;

        return { x, y };
    }

    // 移动事件处理
    handleMove(e) {
        if (!this.pressTimer) return;

        // 检测是否拖动
        const { x, y } = this.getEventCoordinates(e), deltaX = Math.abs(x - this.startX), deltaY = Math.abs(y - this.startY);
        // 如果拖动距离超过阈值，取消长按
        if (deltaX > this.dragThreshold || deltaY > this.dragThreshold) this.handleCancel(), this.isDragging = true;
    }

    // 全局单击事件处理
    handleGlobalClick(e) {
        if (this.isLongPress) {
            this.preventingDefault(e), e.stopImmediatePropagation();
            return false;
        }
    }

    // 设置跳过元素
    shouldSkipElement(_e) {
        return false; // 默认允许所有元素长按
    }

    // 阻止默认事件行为
    preventingDefault(e) {
        if (e.cancelable) e.preventDefault();
    }

    // 长按开始
    handleStart(e) {
        const target = e.target;

        if (this.shouldSkipElement(target)) return;
        // 记录起始位置和标记长按元素
        const { x, y } = this.getEventCoordinates(e);
        this.startX = x, this.startY = y, this.isDragging = false, this.isLongPress = false, this.nowElement = target;

        if (this.isLongPress && e.type === 'touchstart') this.preventingDefault(e);
        // 设置视觉反馈定时器
        this.visualFeedbackTimer = setTimeout(() => this.addVisualFeedback(target, e), this.visualFeedbackDelay);
        // 设置长按定时器
        this.pressTimer = setTimeout(() => {
            this.isLongPress = true, this.showPicker(e);
            if (e.type === 'touchstart' || e.type === 'touchmove') e.preventDefault(); // 长按成功后，才阻止后续默认行为
        }, this.longPressDuration);
    }

    handleEnd(e) {
        // 如果是拖动,不执行长按后的操作
        if (this.isDragging) {
            this.handleCancel();
            return;
        }
        if (this.visualFeedbackTimer) clearTimeout(this.visualFeedbackTimer), this.visualFeedbackTimer = null;
        if (this.pressTimer) clearTimeout(this.pressTimer), this.pressTimer = null;   // 清除定时器
        if (this.isLongPress && e.type === 'touchend') this.preventingDefault(e);
        this.removeVisualFeedback();                                                  // 移除视觉反馈
        if (!this.isLongPress) return;                                                // 如果不是长按，直接返回
    }

    // 取消长按
    handleCancel(e) {
        if (this.visualFeedbackTimer) clearTimeout(this.visualFeedbackTimer), this.visualFeedbackTimer = null;
        if (this.pressTimer) clearTimeout(this.pressTimer), this.pressTimer = null;
        this.removeVisualFeedback(), this.isLongPress = false;
    }

    // 处理文档点击事件（关闭选择器）
    handleDocumentClick(e) {
        // 如果选择器正在显示，并且点击的不是选择器内部，也不是长按元素
        if (this.picker.style.display === 'grid' && !this.picker.contains(e.target)
            && this.nowElement !== this.longPressedElement) this.hidepicker();
    }

    // 添加长按视觉反馈
    addVisualFeedback(element, e) {
        element.classList.add('element-highlight');

        // 创建指示器
        const { x, y } = this.getEventCoordinates(e);
        if (x && y) {
            // 添加倒计时条
            const countdownBar = document.createElement('div');
            this.pressIndicator.classList.add('long-press-indicator');
            this.pressIndicator.style.left = `${x - 30}px`, this.pressIndicator.style.top = `${y - 30}px`;
            this.pressIndicator.innerHTML = '长按中<br><span style="font-size:10px">2秒</span>';
            countdownBar.className = 'countdown-bar', this.pressIndicator.append(countdownBar);
        }
    }

    // 移除指示器及长按视觉反馈
    removeVisualFeedback() {
        if (this.nowElement) this.nowElement.classList.remove('element-highlight');
        this.pressIndicator.classList.remove('long-press-indicator'), this.pressIndicator.innerHTML = '';
    }

    // 显示选择器并保存长按元素
    showPicker(e) {
        this.picker.style.display = 'grid';

        // 定位到事件发生位置并确保选择器不会超出屏幕
        const { x, y } = this.getEventCoordinates(e), rect = this.picker.getBoundingClientRect(),
            viewportWidth = window.innerWidth, viewportHeight = window.innerHeight;

        let left = x, top = y;
        if (x + rect.width > viewportWidth) left = viewportWidth - rect.width - 20;
        if (y + rect.height > viewportHeight) top = viewportHeight - rect.height - 20;

        this.picker.style.left = `${left}px`, this.picker.style.top = `${top}px`, this.picker.style.transform = 'none';
        this.longPressedElement = e.target;
    }

    // 隐藏颜色选择器(重置状态,移除视觉反馈)
    hidepicker() {
        if (this.lastSelect) {
            const { btn, list, txt, arrow } = this.lastSelect;
            btn.textContent = txt, btn.append(arrow), list.style.display = 'none'
        };
        this.picker.style.display = 'none', this.isLongPress = false, this.nowElement = null, this.longPressedElement = null;
        this.removeVisualFeedback();
    }

    // =================================================================================================================
    initPicker() {
        // 创建模式切换按钮组和添加跳转到编辑器按钮
        const modeBtns = [{ text: '背景', mode: 'background', isActive: true }, { text: '字体', mode: 'font', isActive: false }
            , { text: '边框', mode: 'border', isActive: false }, { text: '宽高', mode: 'size', isActive: false }],
            modeToggle = document.createElement('div'), saveEditor = document.createElement('div'),
            toEditorBtn = document.createElement('button'), toSaveBtn = document.createElement('button');

        modeToggle.className = 'mode-toggle';
        modeBtns.forEach(value => {
            const btn = document.createElement('button');
            btn.type = 'button', btn.className = `mode-btn ${value.isActive ? 'active' : ''}`;
            btn.textContent = value.text, btn.setAttribute('data-mode', value.mode);
            addTapSupport(btn, () => this.switchMode(value.mode)), modeToggle.append(btn);
        });
        saveEditor.className = 'saveEditor';
        toEditorBtn.className = 'toEditorBtn', toEditorBtn.textContent = '去编辑样式', toEditorBtn.type = 'button';
        toSaveBtn.className = 'toSaveBtn', toSaveBtn.textContent = '保存到文件', toSaveBtn.type = 'button';

        this.picker.append(modeToggle), this.createBackgroundContent(); // 初始化默认内容（背景模式）
        addTapSupport(toEditorBtn, () => this.navigateToEditor()), addTapSupport(toSaveBtn, () => this.saveStylesToFile());
        saveEditor.append(toEditorBtn, toSaveBtn), this.picker.append(saveEditor);
    }

    // 切换模式
    switchMode(mode) {
        if (this.currentMode === mode) return;

        // 更新所有模式按钮的状态
        const modeBtns = this.picker.querySelectorAll('.mode-btn'), modeToggle = this.picker.querySelector('.mode-toggle'),
            saveEditor = this.picker.querySelector('.saveEditor');

        modeBtns.forEach(modeBtn => {
            const btnMode = modeBtn.getAttribute('data-mode');
            if (btnMode === mode) modeBtn.classList.add('active');
            else modeBtn.classList.remove('active');
        });

        this.currentMode = mode, this.picker.innerHTML = '', this.picker.append(modeToggle);// 清空picker内容(除了模式按钮和编辑器按钮)

        // 根据模式创建内容
        if (mode === 'background') this.createBackgroundContent();
        else if (mode === 'font') this.createFontContent();
        else if (mode === 'border') this.createBorderContent();
        else if (mode === 'size') this.createSizeContent();

        this.picker.append(saveEditor);
    }

    // 创建自定义输入组件
    createCustomInput(options) {
        const { labelText = '', inputType = 'text', inputId = '', inputValue = '', placeholder = '', accept = '', buttonText = null,
            onApply = null, containerClass = 'custom' } = options, container = document.createElement('div'),
            label = document.createElement('label'), input = document.createElement('input'), btn = document.createElement('button');

        container.className = containerClass;
        // 设置标签
        if (inputId) input.id = inputId, label.setAttribute('for', inputId);
        label.textContent = labelText, label.style.marginRight = '10px';

        // 设置输入框
        if (inputType === 'range') input.min = '0', input.max = inputValue, input.step = '1';
        if (inputValue) input.value = inputValue;
        if (placeholder) input.placeholder = placeholder;
        if (accept) input.accept = accept;
        input.type = inputType, input.style.marginRight = '10px';

        btn.type = 'button', btn.textContent = buttonText, btn.setAttribute('aria-label', '应用按钮');
        if (!buttonText) btn.style.display = 'none';

        // 绑定监听事件
        if (typeof onApply === 'function') {
            if (inputType === 'text') addTapSupport(btn, () => {
                const value = input.value.trim();
                if (value) onApply(value), input.value = '';
            });
            else if (inputType === 'color') input.addEventListener('input', e => onApply(input.value, e));
            else input.addEventListener('change', e => onApply(input.value, e));
        }

        container.append(label, input, btn), this.picker.append(container);
    }

    // 创建背景内容
    createBackgroundContent() {
        // 预定义颜色选项
        const bgColors = [
            '#FF5733', '#33FF57', '#3357FF', '#F333FF', '#FF33A1', '#33FFF6', '#FFC733', '#8D33FF',
            '#33FF8D', '#FF3333', '#33A1FF', '#FF8D33', '#FFFFFF', '#E0E0E0', '#9E9E9E', '#000000',
            '#FFEAA7', '#74B9FF', '#55EFC4', '#FD79A8', '#FDCB6E', '#E17055', '#00CEC9', '#6C5CE7'
        ];

        this.createColorItem(bgColors, '背景', 'background'); // 添加背景颜色选项
        // 自定义颜色输入
        this.createCustomInput({
            labelText: '自定义颜色:', inputType: 'color', inputId: 'customColorInput', inputValue: '#3498db',
            onApply: color => { this.resetOpacity(), this.setStyle('background', color) }
        });
        // 添加背景透明度输入框
        this.createCustomInput({
            labelText: '背景透明度:', inputType: 'range', inputId: 'bgOpacityInput', inputValue: '255', placeholder: '0-255之间',
            onApply: opacit => {
                // 获取当前自定义颜色输入框的值
                const colorInput = this.picker.querySelector('#customColorInput'), baseColor = colorInput.value,
                    opacityHex = parseInt(opacit).toString(16).padStart(2, '0').toUpperCase();

                this.setStyle('background', `${baseColor}${opacityHex}`);
            }
        });

        this.createImagePickerDiv(); // 添加背景图选择器触发容器
    }

    // 获取图片列表
    async getImageList() {
        try {
            const response = await fetch('/api/images');
            if (!response.ok) throw new Error('获取图片列表失败');
            return await response.json();
        } catch (error) {
            console.error('获取图片列表失败:', error);
            return null;
        }
    }

    // 创建图片选择器触发容器(标题,选择按钮,移除按钮)
    createImagePickerDiv() {
        const container = document.createElement('div'), title = document.createElement('span'),
            selectBtn = document.createElement('button'), removeBgBtn = document.createElement('button');

        container.id = 'imagePickerDiv', title.textContent = '背景图:', title.style.fontWeight = 'bold';
        selectBtn.type = 'button', selectBtn.className = 'selectImageBtn';
        selectBtn.innerHTML = `
        <span style="display:inline-flex;align-items:center;gap:8px;">
            选择
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
        </span>`;
        removeBgBtn.className = 'selectImageBtn remove-bg-btn', removeBgBtn.textContent = '移除', removeBgBtn.type = 'button';

        addTapSupport(removeBgBtn, () => this.setStyle('background-image', 'none'));
        addTapSupport(selectBtn, () => this.showImagePickerOverlay());
        container.append(title, selectBtn, removeBgBtn), this.picker.append(container);
    }

    // 显示半透明遮罩图片选择器(头部->标题,关闭按钮;搜索筛选->输入框,搜索按钮;图片网格;按钮容器->取消按钮,应用按钮)
    async showImagePickerOverlay() {
        this.picker.style.display = 'none';

        const overlay = document.createElement('div'), pickerContainer = document.createElement('div'),
            header = document.createElement('div'), title = document.createElement('div'),
            closeBtn = document.createElement('button'), filterSection = document.createElement('div'),
            searchInput = document.createElement('input'), searchBtn = document.createElement('button'),
            imageGrid = document.createElement('div'), actions = document.createElement('div'),
            cancelBtn = document.createElement('button'), applyBtn = document.createElement('button'),
            removeAndShow = () => {
                overlay.remove(), setTimeout(() => this.showPicker({ target: this.longPressedElement }), 50); // 延迟确保DOM更新完成
            };

        overlay.className = 'image-picker-overlay', pickerContainer.className = 'image-picker-container';
        header.className = 'image-picker-header', title.className = 'image-picker-title', title.textContent = '选择背景图片';
        closeBtn.className = 'close-image-btn', closeBtn.type = 'button'; closeBtn.innerHTML = '&times;';

        // 搜索和筛选区域
        filterSection.className = 'image-filter-section', searchInput.type = 'text', searchInput.placeholder = '输入图片名称...';
        searchInput.className = 'image-search-input', searchInput.name = "fullname"
        searchBtn.className = 'selectImageBtn image-search-btn', searchBtn.type = 'button', searchBtn.textContent = '搜索';

        imageGrid.className = 'image-grid-overlay'; // 图片网格容器
        // 底部操作区域
        actions.className = 'image-picker-actions', cancelBtn.className = 'cancel-image-btn', cancelBtn.type = 'button';
        cancelBtn.textContent = '取消', applyBtn.className = 'apply-image-btn', applyBtn.type = 'button';
        applyBtn.textContent = '应用选择', applyBtn.disabled = true;

        // 事件监听
        closeBtn.onclick = removeAndShow, cancelBtn.onclick = removeAndShow;

        // 搜索按钮点击事件
        searchBtn.onclick = () => this.filterImages(imageGrid, searchInput.value);
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.filterImages(imageGrid, searchInput.value);
        });

        // 点击遮罩背景关闭
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) removeAndShow();
        });

        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') removeAndShow();
        }, { once: true });

        // 组装容器
        header.append(title, closeBtn), filterSection.append(searchInput, searchBtn), actions.append(cancelBtn, applyBtn);
        pickerContainer.append(header, filterSection, imageGrid, actions);
        overlay.append(pickerContainer), document.body.append(overlay);

        this.loadImagesToOverlay(imageGrid, applyBtn, removeAndShow);  // 加载图片
    }

    // 加载图片到遮罩层
    async loadImagesToOverlay(container, applyBtn, removeAndShow) {
        container.innerHTML = '<div class="loading-overlay">加载图片中...</div>';

        try {
            const images = await this.getImageList(), path = '/static/img/';
            if (!images) return container.innerHTML = `<div class="no-images-overlay">暂无图片,请上传图片到 ${path} 目录</div>`;
            container.innerHTML = '';

            let selectedImage = null;
            // 创建图片项(缩略图->原图;图片名称,选择指示器)
            images.forEach(imgName => {
                const imgItem = document.createElement('div'), thumbnail = document.createElement('div'),
                    img = document.createElement('img'), N = document.createElement('div'), checkmark = document.createElement('div');

                imgItem.className = 'image-item-overlay', imgItem.dataset.image = imgName, imgItem.title = "双击预览原图";
                thumbnail.className = 'image-thumbnail-overlay', img.src = `${path}${imgName}`, img.alt = imgName;
                img.onerror = () => thumbnail.innerHTML = '<span>加载失败</span>', N.className = 'image-name-overlay';
                N.textContent = imgName, checkmark.className = 'image-checkmark', checkmark.innerHTML = '✓';
                thumbnail.append(img), imgItem.append(thumbnail, N, checkmark), container.append(imgItem);

                // 点击选择图片(移除其他图片的选择状态并添加自己为选中)
                imgItem.addEventListener('click', () => {
                    container.querySelectorAll('.image-item-overlay').forEach(item => item.classList.remove('selected'));
                    imgItem.classList.add('selected'), selectedImage = imgName, applyBtn.disabled = false;
                });

                // 双击预览大图
                imgItem.addEventListener('dblclick', () => this.previewImageOverlay(`${path}${imgName}`, imgName, removeAndShow));
            });

            // 应用按钮事件
            applyBtn.onclick = () => {
                if (selectedImage) {
                    const imagePath = `${path}${selectedImage}`;
                    this.setStyle('background-image', `url(${imagePath})`), removeAndShow();
                }
            };
        } catch (error) {
            container.innerHTML = '<div class="error-overlay">加载图片失败，请检查网络连接</div>';
        }
    }

    // 图片搜索过滤
    filterImages(container, searchTerm) {
        const items = container.querySelectorAll('.image-item-overlay'), term = searchTerm.toLowerCase().trim();

        for (const item of items) {
            const imageName = item.dataset.image.toLowerCase();
            if (imageName.includes(term)) return item.click();
        };
        alert('没有找到匹配图片!');
    }

    // 原始大图预览功能
    previewImageOverlay(imageUrl, imageName, removeAndShow) {
        // 创建预览层
        const previewOverlay = document.createElement('div'),
            previewContent = `
            <div class="preview-modal">
                <div class="preview-header">
                    <h3>${imageName}</h3>
                    <button class="close-preview">&times;</button>
                </div>
                <div class="preview-body">
                    <img src="${imageUrl}" alt="${imageName}" class="preview-image" />
                </div>
                <div class="preview-footer">
                    <button class="use-this-image">使用此图片</button>
                    <button class="close-preview-btn">关闭</button>
                </div>
            </div>`, closePreview = () => previewOverlay.remove();

        previewOverlay.className = 'image-preview-overlay', previewOverlay.innerHTML = previewContent;
        document.body.append(previewOverlay);

        // 事件处理
        previewOverlay.querySelectorAll('.close-preview, .close-preview-btn').forEach(btn => btn.onclick = closePreview);
        previewOverlay.querySelector('.use-this-image').onclick = () => {
            this.setStyle('background-image', `url(${imageUrl})`), closePreview(), removeAndShow(); // 关闭预览,遮罩层并显示选择器
        };

        // 点击背景关闭
        previewOverlay.addEventListener('click', e => {
            if (e.target === previewOverlay) closePreview();
        });

        // ESC键关闭
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') closePreview();
        }, { once: true });
    }

    // 创建字体内容
    createFontContent() {
        // 字体颜色选项
        const fontColors = [
            '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF', '#FF5733', '#33FF57',
            '#3357FF', '#F333FF', '#FF33A1', '#33FFF6', '#FFC733', '#8D33FF', '#33FF8D'
        ],
            // 常用字体列表
            fontFamilies = [
                { name: '默认', value: '' }, { name: 'Arial', value: 'Arial, sans-serif' },
                { name: '微软雅黑', value: 'Microsoft YaHei, sans-serif' }, { name: '宋体', value: 'SimSun, serif' },
                { name: '黑体', value: 'SimHei, sans-serif' }, { name: '楷体', value: 'KaiTi, serif' },
                { name: 'Times New Roman', value: 'Times New Roman, serif' }, { name: 'Verdana', value: 'Verdana, sans-serif' },
                { name: 'Georgia', value: 'Georgia, serif' }, { name: 'Courier New', value: 'Courier New, monospace' },
                { name: 'Comic Sans MS', value: 'Comic Sans MS, cursive' }, { name: 'Trebuchet MS', value: 'Trebuchet MS, sans-serif' }
            ],
            // 水平对齐方式列表
            textAlignments = [{ name: '左对齐', value: 'left' }, { name: '居中对齐', value: 'center' },
            { name: '右对齐', value: 'right' }, { name: '两端对齐', value: 'justify' }, { name: '起始对齐', value: 'start' },
            { name: '结束对齐', value: 'end' }, { name: '继承父元素', value: 'inherit' }],
            // 垂直对齐方式列表
            verticalAlignments = [{ name: '基线对齐', value: 'baseline' }, { name: '顶部对齐', value: 'top' },
            { name: '中间对齐', value: 'middle' }, { name: '底部对齐', value: 'bottom' }, { name: '文本顶部', value: 'text-top' },
            { name: '文本底部', value: 'text-bottom' }, { name: '上标', value: 'super' }, { name: '下标', value: 'sub' },
            { name: '继承父元素', value: 'inherit' }, { name: '初始值', value: 'initial' }];

        this.createColorItem(fontColors, '字体', 'color'); // 添加字体颜色选项
        // 自定义边框颜色输入
        this.createCustomInput({
            labelText: '自定义颜色:', inputType: 'color', inputId: 'fontColorInput', inputValue: '#3498db',
            onApply: color => this.setStyle('color', color)
        });
        // 创建字体大小输入
        this.createCustomInput({
            labelText: '字体大小:', inputType: 'text', inputId: 'fontSizeLabel', placeholder: '例如:16px,1rem', buttonText: '应用',
            onApply: fontSize => this.setStyle('font-size', fontSize)
        });
        // 创建字体选择器
        this.createSelectContainer(fontFamilies, '选择字体', 'font-family', font => this.setStyle('font-family', font));
        // 创建水平对齐方式选择器
        this.createSelectContainer(textAlignments, '水平对齐', 'text-align', align => this.setStyle('text-align', align));
        // 创建垂直对齐方式选择器
        this.createSelectContainer(verticalAlignments, '垂直对齐', 'vertical-align', align => this.setStyle('vertical-align', align));
        // 添加垂直对齐数值输入
        this.createCustomInput({
            labelText: '垂直对齐值:', inputType: 'text', inputId: 'verticalAlignInput', placeholder: '例如:10px, -5px, 50%',
            buttonText: '应用', onApply: value => { this.setStyle('vertical-align', value); }
        });
    }

    // 创建边框内容
    createBorderContent() {

        const styleNames = {
            'solid': '实线', 'dashed': '虚线', 'dotted': '点线', 'double': '双线', 'groove': '凹槽', 'ridge': '凸起',
            'inset': '内嵌', 'outset': '外凸', 'none': '无'
        }, container = document.createElement('div'),
            borderColors = [
                '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FF5733', '#33FF57', '#3357FF', '#F333FF',
                '#FF33A1', '#33FFF6', '#FFC733', '#8D33FF', '#33FF8D', '#FF3333'
            ], title = document.createElement('h3'),
            clearBtn = document.createElement('button'); // 清除按钮

        // 边框样式选择
        container.className = 'borderCustom';
        for (const style in styleNames) {
            const option = document.createElement('div');
            option.className = 'borderOption', option.textContent = styleNames[style];
            option.style.border = `2px ${style} #333`, option.style.background = '#666666';
            option.setAttribute('role', 'button'), option.setAttribute('tabindex', '0');
            option.setAttribute('aria-label', `选择边框样式 ${styleNames[style]}`);
            addTapSupport(option, () => this.setStyle('borderStyle', style));
            container.append(option);
        }
        this.picker.append(container);

        // 边框颜色项选择
        title.textContent = '边框颜色', title.style.gridColumn = '1 / -1', title.style.marginTop = '-3px';
        this.picker.append(title);
        this.createColorItem(borderColors, '边框', 'borderColor'); // 添加边框颜色选项

        // 自定义边框颜色
        this.createCustomInput({
            labelText: '自定义颜色:', inputType: 'color', inputId: 'borderColorInput', inputValue: '#3498db',
            onApply: color => this.setStyle('borderColor', color)
        });

        // 边框宽度设置
        this.createCustomInput({
            labelText: '边框宽度:', inputType: 'text', inputId: 'borderWidthInput', placeholder: '例如: 1px, 2px, 0.5rem',
            buttonText: '应用', onApply: width => this.setStyle('borderWidth', width)
        });

        // 边框圆角设置
        this.createCustomInput({
            labelText: '圆角大小:', inputType: 'text', inputId: 'borderRadiusInput', placeholder: '例如: 5px, 10px, 50%',
            buttonText: '应用', onApply: radius => this.setStyle('borderRadius', radius)
        });

        // 添加清除边框按钮
        clearBtn.className = 'clearBorder', clearBtn.type = 'button', clearBtn.textContent = '清除边框';
        addTapSupport(clearBtn, () => this.clearAllBorders());

        this.picker.append(clearBtn);
    }

    // 清除所有边框设置
    clearAllBorders() {
        const borderProperties = ['border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft', 'borderWidth', 'borderStyle',
            'borderColor', 'borderRadius'];

        borderProperties.forEach(prop => this.longPressedElement.style[prop] = '');
    }

    // 创建下拉选择器
    createSelectContainer(arr, btnText = '', property = '', onApply = null) {
        const container = document.createElement('div'), btn = document.createElement('button'),
            arrow = document.createElement('span'), list = document.createElement('div');

        container.className = 'custom', btn.type = 'button', btn.className = 'select-btn', btn.textContent = btnText;
        arrow.className = 'dropdown-arrow', arrow.innerHTML = '▼', list.className = 'select-list', list.style.display = 'none';

        // 创建字体选项
        arr?.forEach(obj => {
            const item = document.createElement('div');
            item.className = 'select-item', item.textContent = obj.name;
            item.setAttribute('select-item-data', obj.value);

            if (obj.value) item.style[property] = obj.value;
            // 添加点击事件
            addTapSupport(item, e => {
                if (onApply) onApply(obj.value);
                this.closeList(obj.name, btn, list, arrow);
                document.querySelectorAll('.select-item').forEach(item => item.classList.remove('selected'));
                item.classList.add('selected');
            });

            list.append(item);
        });

        // 下拉按钮点击事件
        addTapSupport(btn, e => {
            if (this.lastSelect && this.lastSelect.btn !== btn) {
                const { btn: lBtn, list: lList, txt: lTxt, arrow: lArrow } = this.lastSelect;
                this.closeList(lTxt, lBtn, lList, lArrow);
                lList.querySelectorAll('.select-item').forEach(item => item.classList.remove('selected'));
            }

            if (list.style.display === 'none') {
                this.openList(list, arrow), this.lastSelect = { btn, list, txt: btnText, arrow };
                // 点击picker其他部分时关闭字体列表(执行一次)
                setTimeout(() => {
                    this.picker.addEventListener('click', e => {
                        if (!container.contains(e.target))
                            this.closeList(btnText, btn, list, arrow), this.lastSelect = null;
                    }, { once: true });
                }, 0);
            }
            else this.closeList(btnText, btn, list, arrow), this.lastSelect = null;
        });

        btn.append(arrow), container.append(btn, list); this.picker.append(container);
    }

    // 创建元素大小内容
    createSizeContent() {
        // 设置宽度输入
        this.createCustomInput({
            labelText: '宽度:', inputType: 'text', inputId: 'widthInput', placeholder: '单位:px, %,em, vw等',
            buttonText: '应用', onApply: width => this.setStyle('width', width)
        });
        // 设置高度输入
        this.createCustomInput({
            labelText: '高度:', inputType: 'text', inputId: 'heightInput', placeholder: '单位:px, %,em, vh等',
            buttonText: '应用', onApply: height => this.setStyle('height', height)
        });
    }

    // 打开列表
    openList(list, arrow) {
        list.style.display = 'block', arrow.style.transform = 'rotate(180deg)';
    }

    // 关闭列表
    closeList(btnText, btn, list, arrow) {
        btn.textContent = btnText, btn.append(arrow), list.style.display = 'none', arrow.style.transform = 'rotate(0deg)';
    }

    // 循环创建颜色数组项
    createColorItem = (arr, labelTxt, property) => {
        arr.forEach(color => {
            const customOption = document.createElement('div');
            customOption.className = 'custom-option', customOption.style.background = color;
            customOption.setAttribute('role', 'button'), customOption.setAttribute('tabindex', '0');
            customOption.setAttribute('aria-label', `选择${labelTxt}颜色 ${color}`);
            if (property === 'background') {
                addTapSupport(customOption, () => {
                    this.resetOpacity(), this.setStyle(property, color);
                });
            }
            else addTapSupport(customOption, () => this.setStyle(property, color));
            this.picker.append(customOption);
        });
    };
    // 重置透明度
    resetOpacity() {
        const opacity = this.picker.querySelector('#bgOpacityInput');
        opacity.value = '255';
    }

    // 设置元素样式
    setStyle = (property, value) => {
        if (this.longPressedElement) this.longPressedElement.style[property] = value;// 如果长按元素存在,设置其属性值;
    };

    // =================================================================================================================
    // 跳转到编辑器页面
    navigateToEditor() {
        // 获取当前页面的外部样式文件
        const styleFileDir = this.getCurrentStyleFile();
        if (!styleFileDir) return;

        // 构建跳转URL并以当前页面作为返回地址
        const params = new URLSearchParams({ fileDir: styleFileDir, return: window.location.href });
        window.location.href = `script.html?${params.toString()}`;
    }

    // 获取当前页面的样式文件
    getCurrentStyleFile(fileDir) {
        // 如果全局函数已定义，则调用它来获取样式文件路径
        if (typeof window.getCurrentStyleFile === 'function') return window.getCurrentStyleFile();

        // 否则尝试从link标签获取
        const links = document.querySelectorAll('link[rel="stylesheet"]');
        for (let link of links) if (link.href && link.href.includes('/static/')) return link.href;

        return null;
    }
    // =================================================================================================================
    // 保存样式到文件
    async saveStylesToFile() {
        const lement = this.longPressedElement; // 长按的元素
        if (!lement) return alert('请先长按一个元素以设置样式！');

        try {
            // 1. 获取当前页面使用的CSS文件
            const styleFileDir = this.getCurrentStyleFile();
            if (!styleFileDir) return alert('无法获取当前页面的CSS文件！');

            // 2. 生成元素的选择器
            const selector = this.generateElementSelector(lement);
            if (!selector) return alert('无法为元素生成有效的选择器！');

            // 3. 获取当前元素的内联样式
            const styles = this.getInlineStyles(lement);
            if (Object.keys(styles).length === 0) return alert('当前元素没有通过长按设置的样式！');

            // 5. 获取现有的CSS文件内容
            const existingContent = await this.fetchCSSFile(styleFileDir);
            if (existingContent === null) return alert('无法读取CSS文件！');

            // 6. 更新CSS内容
            const updatedContent = this.updateCSSContent(existingContent, selector, styles);

            // 7. 保存到服务器
            const result = await this.saveCSSFile(styleFileDir, updatedContent);

            if (result.success) {
                alert(`样式已保存到 ${styleFileDir}\n操作元素: ${selector}`);
                setTimeout(() => this.applyStylesFromCSS(lement, styles), 100);// 移除元素的内联样式,让保存样式生效
            }
            else throw new Error(result.error || '保存失败');
        } catch (error) {
            alert(`保存失败: ${error.message}`);
        }
    }

    // 生成元素的选择器
    generateElementSelector(element) {
        if (element === document.body) return 'body';
        // CSS选择器生成器
        const getSelector = (el, classLimit = 0) => {
            if (el.id) return `#${CSS.escape(el.id)}`;

            let selector = el.tagName.toLowerCase();
            if (classLimit > 0 && el.classList?.length > 0) {
                const classes = Array.from(el.classList).slice(0, classLimit).map(cls => `.${CSS.escape(cls)}`).join('');
                selector += classes;
            }

            return selector;
        },// 1. 优先使用ID
            idSelector = getSelector(element);
        if (idSelector.startsWith('#')) return idSelector;

        // 2. 尝试使用所有类名的选择器
        const fullClassSelector = getSelector(element, Infinity);
        if (fullClassSelector !== element.tagName.toLowerCase()) {
            const matches = document.querySelectorAll(fullClassSelector);
            if (matches.length === 1) return fullClassSelector;// 类名唯一，直接使用
        }

        // 3. 生成层级路径(最多8层)
        const path = [];
        let current = element;
        for (let depth = 0; depth < 8 && current && current !== document.body; depth++) {
            let selector = getSelector(current, 2); // 最多两个类

            // 为当前元素添加兄弟位置
            if (!selector.startsWith('#')) {
                const siblings = Array.from(current.parentElement?.children || []).filter(el => el.tagName === current.tagName);
                if (siblings.length > 1) {
                    const index = siblings.indexOf(current) + 1;
                    selector += `:nth-of-type(${index})`;
                }
            }

            path.unshift(selector);
            if (current.id) break; // 如果当前元素有ID，停止向上
            current = current.parentElement;
        }

        // 优化单元素路径
        const parent = element.parentElement;
        if (path.length === 1 && parent) {
            const parentSelector = getSelector(parent, 1); // 最多一个类
            path.unshift(parentSelector);
        }

        return path.join(' > ');
    }

    // 解析样式属性对字符串
    parseStylePair(styleStr, targetObj = {}) {
        // 更安全地解析style属性,处理包含分号的属性值(如Data URL)
        let inQuotes = false, quoteChar = null, currentPair = '';
        const addPairToObj = pairStr => {
            const trimmed = pairStr.trim();
            if (!trimmed) return;

            const colonIndex = trimmed.indexOf(':');
            if (colonIndex === -1) return;

            const property = trimmed.slice(0, colonIndex).trim(), value = trimmed.slice(colonIndex + 1).trim();
            if (property && value) targetObj[property] = value;
        };

        for (let i = 0; i < styleStr.length; i++) {
            const char = styleStr[i];

            // 处理引号
            if (char === '"' || char === "'") {
                if (!inQuotes) inQuotes = true, quoteChar = char;
                else if (quoteChar === char) inQuotes = false, quoteChar = null;
            }
            // 只有不在引号内且遇到分号时,才分割属性对
            if (char === ';' && !inQuotes) addPairToObj(currentPair), currentPair = '';
            else currentPair += char;
        }

        addPairToObj(currentPair); // 处理最后一个属性对(没有结尾分号的情况)
        return targetObj;
    }

    // 获取元素内联样式(长按设置的style属性)
    getInlineStyles(element) {
        const styles = {}, styleAttr = element.getAttribute('style');
        if (!styleAttr) return styles;
        return this.parseStylePair(styleAttr, styles);
    }

    // 生成CSS规则
    generateCSSRule(selector, styles) {
        const styleLines = Object.entries(styles).map(([property, value]) => `  ${property}: ${value};`).join('\n');
        return `${selector} {\n${styleLines}\n}`;
    }

    // 获取CSS文件内容
    async fetchCSSFile(fileDir) {
        try {
            const response = await fetch(`/api/css?fileDir=${encodeURIComponent(fileDir)}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.text();
        } catch (error) {
            console.error('读取CSS文件失败:', fileDir, error.message);
            return null;
        }
    }

    // 更新CSS内容（添加新规则或更新现有规则）
    updateCSSContent(cssContent, selector, newStyles) {
        // 检查是否已经存在该选择器的规则
        const lines = cssContent.split('\n');
        let inTargetRule = false, targetStart = -1, targetEnd = -1, braceCount = 0;

        // 找到现有规则的位置
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.includes(selector) && line.includes('{')) inTargetRule = true, targetStart = i, braceCount = 1;
            else if (inTargetRule) {
                if (line.includes('{')) braceCount++;
                if (line.includes('}')) {
                    braceCount--;
                    if (braceCount === 0) {
                        targetEnd = i;
                        break;
                    }
                }
            }
        }

        // 如果找到了现有规则,只更新特定属性
        if (targetStart !== -1 && targetEnd !== -1) {
            // 提取规则块内的所有行
            const ruleLines = lines.slice(targetStart, targetEnd + 1), ruleText = ruleLines.join('\n'),
                existingDeclarations = this.parseCSSDeclarations(ruleText),       // 解析规则块,获取所有现有声明
                mergedDeclarations = { ...existingDeclarations, ...newStyles },   // 合并现有声明和新声明(新声明覆盖旧声明)
                updatedRule = this.generateCSSRule(selector, mergedDeclarations); // 生成更新后的规则

            lines.splice(targetStart, ruleLines.length, updatedRule); // 替换旧规则
        }
        // 如果没有找到,创建一个新规则
        else {
            const newRule = this.generateCSSRule(selector, newStyles);
            if (cssContent.trim().length > 0 && !cssContent.endsWith('\n')) lines.push(''); // 确保最后一行有换行符
            lines.push(newRule); // 添加到文件末尾
        }

        return lines.join('\n');
    }

    // 解析CSS规则中的声明
    parseCSSDeclarations(cssRule) {
        const declarations = {}, ruleMatch = cssRule.match(/\{([^}]+)\}/s); // 提取规则块内容(大括号内的部分)
        if (!ruleMatch) return declarations;
        return this.parseStylePair(ruleMatch[1], declarations);
    }

    // 保存CSS文件到服务器
    async saveCSSFile(fileDir, content) {
        try {
            const response = await fetch('/api/css', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileDir, content })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('保存CSS文件失败:', error);
            return null;
        }
    }

    // 从CSS文件中应用样式到元素（移除内联样式）
    applyStylesFromCSS(element, styles) {
        element.removeAttribute('style'), void element.offsetWidth; // 强制浏览器重新计算样式
    }
}

// 监听用户中心准备就绪事件,初始化长按背景功能
document.addEventListener('userCenterReady', () => new LongPressBackground(), { once: true });