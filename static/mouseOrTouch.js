// 项目/static/mouseOrTouch.js
const devViewSize = `${window.innerWidth}x${window.innerHeight}`; // 使用设备视口作为设备唯一标识
let zIndex = 1001; // 全局层级计数器
/**
 * 获取元素储存样式数据(位置)并通过API数据应用样式
 * @param {HTMLElement} element - 需要设置位置的DOM元素
 * @param {string} [api=null] - 获取位置信息的路由API
 * @returns {void}
 */
function getStyle(element, api = null) {
    fetch(api)
        .then(res => res.ok ? res.json() : Promise.reject(`Network error:${element}`))
        .then(position => Object.assign(element.style, position[devViewSize]?.style ?? {}))
        .catch(error => console.error(`获取${devViewSize}的储存数据失败:`, error));
}

/**
 * 为元素添加鼠标和触摸事件支持，实现拖拽和点击功能
 * @param {HTMLElement} element - 需要添加交互功能的DOM元素
 * @param {Function} onClick - 点击事件回调函数
 * @param {string} [api=null] - 更新位置信息的路由API
 * @param {boolean} [isEndShow=false] - 拖拽结束后是否显示元素
 * @returns {void}
 */
function mouseOrTouch(element, onClick = null, api = null, isEndShow = false) {
    let dragStartX, dragStartY, initialX, initialY, isDragging = false, hasDragged = false, touchStartTime = 0, touchIdentifier = null;
    const originalZIndex = element.style.zIndex || getComputedStyle(element).zIndex; // 保存原始z-index

    setupEventBubbleBlocking(); // 阻止body子元素事件冒泡
    element.onclick = (e) => {
        if (hasDragged) return e.preventDefault();
        if (onClick) onClick();
    };

    // 监听元素事件
    element.addEventListener('contextmenu', (e) => e.preventDefault());
    element.addEventListener('mousedown', startDrag);
    element.addEventListener('touchstart', handleTouchStart, { passive: true });

    // 文档事件
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    // 阻止特定元素的事件冒泡
    function setupEventBubbleBlocking() {
        const interactiveSelectors = ['textarea', 'input', 'select', 'a'];

        interactiveSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (element.dataset.bubbleBlocked) return; // 已设置过则跳过
                const stopPropagation = (e) => e.stopPropagation();
                element.addEventListener('mousedown', stopPropagation), element.dataset.bubbleBlocked = true;
                element.addEventListener('touchstart', stopPropagation, { passive: true });
            });
        });
    }
    /**
     * 处理触摸开始事件
     * @param {TouchEvent} e - 触摸事件对象
     */
    function handleTouchStart(e) {
        touchStartTime = Date.now(), touchIdentifier = e.touches[0].identifier, startDrag(e);
    }

    /**
     * 处理触摸移动事件
     * @param {TouchEvent} e - 触摸事件对象
     */
    function handleTouchMove(e) {
        // 只处理与开始触摸相同标识符的事件
        if (touchIdentifier !== null && Array.from(e.touches).some(touch => touch.identifier === touchIdentifier)) drag(e);
    }

    /**
     * 处理触摸结束事件
     * @param {TouchEvent} e - 触摸事件对象
     */
    function handleTouchEnd(e) {
        // 检查是否是对应的触摸结束
        if (touchIdentifier !== null && Array.from(e.changedTouches).some(touch => touch.identifier === touchIdentifier)) {
            const touchDuration = Date.now() - touchStartTime, touch = e.changedTouches[0];
            if (onClick && !hasDragged && touchDuration < 250) {
                // 创建模拟的点击事件
                const clickEvent = new MouseEvent('click', {
                    bubbles: true, cancelable: true, clientX: touch.clientX, clientY: touch.clientY
                });
                element.dispatchEvent(clickEvent), onClick();
            }

            endDrag(), touchIdentifier = null; // 重置触摸标识符
        }
    }

    /**
     * 开始拖拽操作
     * @param {MouseEvent|TouchEvent} e - 鼠标或触摸事件对象
     */
    function startDrag(e) {
        e.preventDefault();
        isDragging = true, hasDragged = false, preventPageScroll(true); // 阻止页面滚动

        const rect = element.getBoundingClientRect();
        initialX = rect.left, initialY = rect.top, element.style.zIndex = zIndex++; // 提升z-index到最前;

        if (e.type === 'mousedown' || e.type === 'touchstart') {
            const clientX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX,
                clientY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;

            dragStartX = clientX, dragStartY = clientY;
        }

        element.style.transition = 'none', element.style.cursor = 'grabbing';
    }

    /**
     * 处理拖拽移动
     * @param {MouseEvent|TouchEvent} e - 鼠标或触摸事件对象
     */
    function drag(e) {
        if (!isDragging) return;

        let clientX, clientY;
        if (e.type === 'mousemove') e.preventDefault(), clientX = e.clientX, clientY = e.clientY;
        else {
            const touch = Array.from(e.touches).find(t => t.identifier === touchIdentifier); // 找到对应的触摸点
            if (!touch) return;
            clientX = touch.clientX, clientY = touch.clientY;
        }

        const deltaX = clientX - dragStartX, deltaY = clientY - dragStartY, newX = initialX + deltaX, newY = initialY + deltaY,
            minX = -element.offsetWidth + 20, maxX = window.innerWidth - 20, minY = -element.offsetHeight + 20,
            maxY = window.innerHeight - 20;  // 允许大部分内容拖出屏幕外，只保留20像素在屏幕内

        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) hasDragged = true;
        element.style.left = `${Math.min(Math.max(minX, newX), maxX)}px`, element.style.right = 'auto';
        element.style.top = `${Math.min(Math.max(minY, newY), maxY)}px`, element.style.bottom = 'auto';
    }

    /**
     * 结束拖拽操作
     */
    function endDrag() {
        if (!isDragging) return;
        const { left, top, right, bottom } = element.style,
            finalPosition = { [devViewSize]: { style: { left, top, right, bottom } } }; // 创建带设备标识的样式对象

        isDragging = false, element.style.transition = '', element.style.cursor = '', preventPageScroll(false); // 恢复页面滚动;
        if (isEndShow) element.classList.add('show');

        // 更新元素样式(位置)到后端
        if (api && hasDragged) {
            fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json', }, body: JSON.stringify(finalPosition) })
                .then(res => res.ok ? res.json() : Promise.reject(`Network error:${element}`))
                .catch(error => console.error(`更新${devViewSize}储存样式数据失败:`, error));
        }
        element.style.zIndex = originalZIndex, setTimeout(() => hasDragged = false, 100); // 短暂延迟后重置拖动标记，允许下次点击
    }

    /**
     * 阻止或恢复页面滚动
     * @param {boolean} prevent - 是否阻止滚动
     */
    function preventPageScroll(prevent) {
        if (prevent) document.body.style.overflow = 'hidden', document.body.style.touchAction = 'none';
        else document.body.style.overflow = '', document.body.style.touchAction = '';
    }
}
/**
 * 为元素添加点击和触摸事件支持
 * @param {HTMLElement} element - DOM元素
 * @param {Function} handler - 事件处理函数
 * @param {Object} options - 选项（阻止默认行为等）
 */
function addTapSupport(element, handler, options = { preventDefault: true }) {
    if (!element || !handler) return;

    element.addEventListener('click', handler); // 鼠标点击事件
    // 触摸结束事件（模拟点击）
    element.addEventListener('touchend', (e) => {
        if (options.preventDefault && e.cancelable) e.preventDefault();
        handler(e);
    });
    element.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') handler(e);
    });
}