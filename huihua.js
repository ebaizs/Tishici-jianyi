// 应用状态管理
let state = null;
let canvas = null;
let ctx = null;
let isSystemInitialized = false;
let lastTouchY = 0;
let isTouchMoving = false;
let resizeTimeout = null; // 添加这行
let rotateImportTimeout = null;
// huihua.js - 色绘设计系统
(function () {
    'use strict';

    // 确保函数在全局作用域可用
    window.initializePaintSystem = initializePaintSystem;
    function initializePaintSystem() {
        console.log('初始化色绘设计系统');

        // 防止重复初始化
        if (isSystemInitialized) {
            console.log('色绘设计系统已经初始化');
            return;
        }

        // 初始化状态
        state = {
            currentTool: 'brush',
            currentColor: '#233cdf',
            brushSize: 20,
            isDrawing: false,
            lastX: 0,
            lastY: 0,
            colors: [
                { name: '清除', color: '#c42323' }
            ],
            drawingHistory: [],
            maxHistorySteps: 20,
            backgroundImage: null,
            imageScale: 1,
            undoStack: [],
            redoStack: [],
            originalImageSize: { width: 0, height: 0 },
            isTouchActive: false,
            touchIdentifier: null,
            maxUndoSteps: 5,
            isImageFixed: false,
            devicePixelRatio: window.devicePixelRatio || 1,
            displayScale: 1,
            actualCanvasSize: { width: 0, height: 0 },
            displayCanvasSize: { width: 0, height: 0 },
        };

        // 获取DOM元素
        canvas = document.getElementById('drawingCanvas');
        if (!canvas) {
            console.error('画布元素未找到');
            return;
        }

        ctx = canvas.getContext('2d', { willReadFrequently: true });

        // 初始化应用
        try {
            initCanvas();
            initColors();
            initEventListeners();
            setTool('brush');

            // 确保画布在容器中居中
            const container = canvas.parentElement;
            if (container) {
                container.style.display = 'flex';
                container.style.justifyContent = 'center';
                container.style.alignItems = 'center';
            }

            // 更新画笔预览
            updateBrushPreview();

            // 只有在画布有有效尺寸时才保存状态
            if (canvas.width > 0 && canvas.height > 0) {
                // 延迟一点时间确保画布已完全渲染
                setTimeout(() => {
                    saveDrawingState();
                }, 100);
            } else {
                console.warn('画布尺寸为0，跳过初始状态保存');
            }

            isSystemInitialized = true;
            console.log('色绘设计系统初始化完成');
        } catch (error) {
            console.error('色绘设计系统初始化失败:', error);
            showToast('系统初始化失败，请刷新页面');
        }
    }
    // 在 initCanvas 函数中修改显示高度计算
    function initCanvas() {
        if (!canvas) return;

        const container = canvas.parentElement;
        if (!container) return;

        // 获取容器尺寸
        const containerWidth = container.clientWidth;

        // 如果容器宽度为0，使用一个默认值或父容器的宽度
        let actualContainerWidth = containerWidth;
        if (actualContainerWidth === 0) {
            // 尝试获取父容器的宽度
            const parentContainer = container.parentElement;
            if (parentContainer) {
                actualContainerWidth = parentContainer.clientWidth || 800; // 默认800px
            } else {
                actualContainerWidth = 800; // 默认宽度
            }
        }

        // 修改：初始高度设为300px
        const displayHeight = 300;

        // 确保最小宽度
        const minWidth = 300;
        const displayWidth = Math.max(actualContainerWidth, minWidth);

        // 设置显示尺寸
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;

        // 计算实际像素尺寸
        const pixelRatio = state.devicePixelRatio;
        const actualWidth = Math.max(Math.floor(displayWidth * pixelRatio), 1); // 确保至少1px
        const actualHeight = Math.max(Math.floor(displayHeight * pixelRatio), 1); // 确保至少1px

        console.log('初始化画布尺寸:', { displayWidth, displayHeight, actualWidth, actualHeight });

        // 设置实际像素尺寸
        canvas.width = actualWidth;
        canvas.height = actualHeight;

        // 保存尺寸信息
        state.actualCanvasSize = { width: actualWidth, height: actualHeight };
        state.displayCanvasSize = { width: displayWidth, height: displayHeight };
        state.displayScale = displayWidth / actualWidth;

        // 设置画布样式防止滚动
        canvas.style.touchAction = 'none';
        canvas.style.userSelect = 'none';
        canvas.style.webkitUserSelect = 'none';

        // 设置画布内容
        if (ctx) {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, actualWidth, actualHeight);

            // 如果有背景图片，绘制它
            if (state.backgroundImage) {
                // 调用函数根据图片调整画布高度
                adjustCanvasForImage(state.backgroundImage);
            }
        }

        updateCanvasScaling();
    }
    function adjustCanvasForImage(img) {
        if (!canvas || !ctx || !img) {
            console.error('adjustCanvasForImage: 缺少参数');
            return;
        }

        const container = canvas.parentElement;
        if (!container) {
            console.error('adjustCanvasForImage: 容器未找到');
            return;
        }

        const containerWidth = container.clientWidth;
        if (containerWidth === 0) {
            console.warn('adjustCanvasForImage: 容器宽度为0，使用默认宽度');
            // 使用一个默认宽度
            const defaultWidth = 800;
            container.style.width = `${defaultWidth}px`;
        }

        console.log('adjustCanvasForImage: 开始', {
            containerWidth: container.clientWidth,
            imgWidth: img.width,
            imgHeight: img.height,
            imgRatio: img.width / img.height
        });

        // 获取容器的最大允许高度
        const containerMaxHeight = 800;
        const computedStyle = window.getComputedStyle(container);
        const cssMaxHeight = parseInt(computedStyle.maxHeight);
        const maxDisplayHeight = !isNaN(cssMaxHeight) && cssMaxHeight > 0 ? cssMaxHeight : containerMaxHeight;

        console.log('adjustCanvasForImage: 高度限制', { cssMaxHeight, maxDisplayHeight });

        // 计算新的显示尺寸
        let displayWidth, displayHeight;

        // 竖图处理逻辑
        if (img.width < img.height) {
            console.log('adjustCanvasForImage: 处理竖图');
            // 竖图：高度为主要维度
            displayHeight = Math.min(maxDisplayHeight, 600); // 竖图最大600px高度
            displayWidth = (img.width / img.height) * displayHeight;

            // 确保宽度不超过容器
            if (displayWidth > container.clientWidth) {
                displayWidth = container.clientWidth;
                displayHeight = (img.height / img.width) * displayWidth;
            }
        } else {
            console.log('adjustCanvasForImage: 处理横图');
            // 横图：宽度为主要维度
            displayWidth = Math.min(container.clientWidth, 1024);
            displayHeight = (img.height / img.width) * displayWidth;
        }

        // 确保最小尺寸
        displayWidth = Math.max(300, displayWidth);
        displayHeight = Math.max(200, displayHeight);

        console.log('adjustCanvasForImage: 计算显示尺寸', { displayWidth, displayHeight });

        // 计算实际像素尺寸
        const pixelRatio = state.devicePixelRatio;
        const actualWidth = Math.max(Math.floor(displayWidth * pixelRatio), 1);
        const actualHeight = Math.max(Math.floor(displayHeight * pixelRatio), 1);

        console.log('adjustCanvasForImage: 实际像素尺寸', { actualWidth, actualHeight });

        // 创建临时画布保存当前内容
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCtx.drawImage(canvas, 0, 0);

        // 更新画布尺寸
        canvas.width = actualWidth;
        canvas.height = actualHeight;
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;

        console.log('adjustCanvasForImage: 画布已更新', {
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            canvasStyleWidth: canvas.style.width,
            canvasStyleHeight: canvas.style.height
        });

        // 恢复之前的内容
        if (tempCanvas.width > 0 && tempCanvas.height > 0) {
            ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, actualWidth, actualHeight);
        }

        // 更新状态
        state.actualCanvasSize = { width: actualWidth, height: actualHeight };
        state.displayCanvasSize = { width: displayWidth, height: displayHeight };
        state.displayScale = displayWidth / actualWidth;

        // 重新绘制图片
        const scaleX = actualWidth / img.width;
        const scaleY = actualHeight / img.height;
        state.imageScale = Math.min(scaleX, scaleY);

        const drawWidth = img.width * state.imageScale;
        const drawHeight = img.height * state.imageScale;
        const offsetX = (actualWidth - drawWidth) / 2;
        const offsetY = (actualHeight - drawHeight) / 2;

        console.log('adjustCanvasForImage: 绘制图片', {
            scaleX, scaleY, stateImageScale: state.imageScale,
            drawWidth, drawHeight, offsetX, offsetY
        });

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        state.imageOffset = { x: offsetX, y: offsetY };
        state.imageDrawSize = { width: drawWidth, height: drawHeight };

        console.log('adjustCanvasForImage: 完成');
    }
    // 初始化颜色
    function initColors() {
        updateColorList();
        updateColorPreview();
    }

    // 更新颜色列表
    function updateColorList() {
        const colorList = document.getElementById('colorList');
        if (!colorList) return;

        colorList.innerHTML = '';

        state.colors.forEach((colorObj, index) => {
            const colorElement = document.createElement('div');
            colorElement.className = `color-item ${colorObj.color === state.currentColor ? 'active' : ''}`;

            // 修复HTML结构，使用简单的div而不是复杂的flex布局
            colorElement.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <div class="color-preview" style="width: 24px; height: 24px; border-radius: 4px; border: 1px solid #ccc; background: ${colorObj.color}; display: flex; align-items: center; justify-content: center;">
                    ${colorObj.name === '清除' ? '<i class="fas fa-times" style="color: white; font-size: 12px;"></i>' : ''}
                </div>
                <span class="color-name" style="font-size: 12px; white-space: nowrap; ${colorObj.name === '清除' ? 'color: #ff9500' : ''}">${colorObj.name}</span>
            </div>
        `;

            colorElement.addEventListener('click', () => {
                state.currentColor = colorObj.color;
                updateColorPreview();
                updateColorList();

                if (colorObj.name === '清除') {
                    setTool('brush');
                } else {
                    setTool('brush');
                }
            });

            colorList.appendChild(colorElement);
        });
    }

    // 更新颜色预览
    function updateColorPreview() {
        const colorPreview = document.getElementById('currentColorPreview');
        if (colorPreview) {
            colorPreview.style.background = state.currentColor;
        }
    }

    // 更新画笔预览
    function updateBrushPreview() {
        const brushPreviewBox = document.getElementById('brushPreviewBox');
        const brushSizeValue = document.getElementById('brushSizeValue');

        if (brushPreviewBox) {
            const previewSize = Math.max(20, Math.min(40, state.brushSize));
            brushPreviewBox.style.width = `${previewSize}px`;
            brushPreviewBox.style.height = `${previewSize}px`;
            brushPreviewBox.style.background = state.currentColor;
            brushPreviewBox.style.borderRadius = '0';
        }

        if (brushSizeValue) {
            brushSizeValue.textContent = state.brushSize + 'px';
        }
    }

    // 设置当前工具
    function setTool(tool) {
        state.currentTool = tool;

        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const toolBtn = document.getElementById(`${tool}Tool`) || document.getElementById(`${tool}Btn`);
        if (toolBtn) {
            toolBtn.classList.add('active');
        }

        if (canvas) {
            if (tool === 'brush') {
                canvas.style.cursor = 'crosshair';
            } else if (tool === 'clear') {
                canvas.style.cursor = 'not-allowed';
            } else {
                canvas.style.cursor = 'default';
            }
        }
    }
    // 替换现有的 saveDrawingState 函数
    function saveDrawingState() {
        if (!canvas || !ctx || canvas.width === 0 || canvas.height === 0) return;

        try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            // 保存到撤销栈（自动清空重做栈）
            state.undoStack.push(imageData);
            if (state.undoStack.length > state.maxUndoSteps) {
                state.undoStack.shift();
            }
            state.redoStack = []; // 新操作后清空重做栈

            // 同时保存到历史记录（用于其他功能）
            state.drawingHistory.push(imageData);
            if (state.drawingHistory.length > state.maxHistorySteps) {
                state.drawingHistory.shift();
            }
        } catch (error) {
            console.error('保存画布状态失败:', error);
        }
    }
    // 开始绘图
    function startDrawing(e) {
        // 阻止默认行为，防止滚动
        if (e.type.includes('touch')) {
            e.preventDefault();
            // 记录触摸标识符
            if (e.touches.length === 1) {
                state.touchIdentifier = e.touches[0].identifier;
                state.isTouchActive = true;
            }
        }

        const { x, y } = getCanvasCoordinates(e);
        state.isDrawing = true;
        state.lastX = x;
        state.lastY = y;

        if (state.currentTool === 'brush') {
            ctx.beginPath();
            ctx.moveTo(x, y);
            drawOnCanvas(x, y);
            saveDrawingState();
        }
    }

    // 绘图
    function draw(e) {
        if (!state.isDrawing || !ctx) return;

        // 阻止默认行为，防止滚动
        if (e.type.includes('touch')) {
            e.preventDefault();
            // 检查是否是同一个触摸点
            if (state.touchIdentifier !== null) {
                let touchFound = false;
                for (let i = 0; i < e.touches.length; i++) {
                    if (e.touches[i].identifier === state.touchIdentifier) {
                        touchFound = true;
                        break;
                    }
                }
                if (!touchFound) {
                    stopDrawing(e);
                    return;
                }
            }
        }

        const { x, y } = getCanvasCoordinates(e);

        if (state.currentTool === 'brush') {
            ctx.lineTo(x, y);
            ctx.stroke();
            state.lastX = x;
            state.lastY = y;
        }
    }

    // 停止绘图
    function stopDrawing(e) {
        if (e && e.type.includes('touch')) {
            e.preventDefault();
        }

        if (state.isDrawing && ctx) {
            state.isDrawing = false;
            ctx.beginPath();
        }

        // 重置触摸状态
        if (state.isTouchActive) {
            state.isTouchActive = false;
            state.touchIdentifier = null;
        }
    }

    // 在画布上绘制
    function drawOnCanvas(x, y) {
        if (!ctx) return;

        if (state.currentColor === '#ff0000') {
            // 清除模式
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
            // 正常绘制模式
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = state.currentColor;
        }

        ctx.lineWidth = state.brushSize;
        ctx.lineTo(x, y);
        ctx.stroke();

        // 重置混合模式
        ctx.globalCompositeOperation = 'source-over';
    }

    // 修改 getCanvasCoordinates 函数
    function getCanvasCoordinates(e) {
        if (!canvas || !state.canvasScale) return { x: 0, y: 0 };

        let clientX, clientY;

        if (e.type.includes('touch')) {
            if (state.touchIdentifier !== null) {
                for (let i = 0; i < e.touches.length; i++) {
                    if (e.touches[i].identifier === state.touchIdentifier) {
                        clientX = e.touches[i].clientX;
                        clientY = e.touches[i].clientY;
                        break;
                    }
                }
            }
            if (clientX === undefined && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            }
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        if (clientX === undefined || clientY === undefined) {
            return { x: state.lastX, y: state.lastY };
        }

        // 获取画布的实际位置和尺寸
        const rect = canvas.getBoundingClientRect();

        // 计算在显示画布上的坐标
        const displayX = clientX - rect.left;
        const displayY = clientY - rect.top;

        // 转换为实际像素坐标
        const actualX = (displayX / rect.width) * state.actualCanvasSize.width;
        const actualY = (displayY / rect.height) * state.actualCanvasSize.height;

        // 确保坐标在画布范围内
        const safeX = Math.max(0, Math.min(actualX, state.actualCanvasSize.width));
        const safeY = Math.max(0, Math.min(actualY, state.actualCanvasSize.height));

        return {
            x: safeX,
            y: safeY,
            displayX: displayX,
            displayY: displayY
        };
    }
    // 清空画布
    function clearCanvas() {
        if (!canvas || !ctx) return;

        if (confirm('确定要清空画布的所有画笔痕迹吗？背景图片将保留。')) {
            // 清除整个画布
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 重新绘制背景图片（如果存在）
            if (state.backgroundImage) {
                const img = state.backgroundImage;
                const x = 0;
                const y = 0;
                ctx.drawImage(img, x, y, canvas.width, canvas.height);
            } else {
                // 如果没有背景图片，用白色填充
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // 清空历史记录和撤销/重做栈
            state.drawingHistory = [];
            state.undoStack = [];
            state.redoStack = [];

            // 保存当前状态（只有背景图片）
            saveDrawingState();

            showToast('画笔痕迹已清空，背景图片保留');
        }
    }



    // 修改 undo 函数：
    function undo() {
        if (!ctx) return;

        if (state.undoStack.length > 1) { // 保留一个基础状态（背景图片）
            // 将当前状态保存到重做栈
            const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
            state.redoStack.push(currentState);

            // 限制重做栈大小
            if (state.redoStack.length > state.maxUndoSteps) {
                state.redoStack.shift();
            }

            // 从撤销栈恢复状态（保留第一个状态作为基础）
            const undoState = state.undoStack.pop();
            ctx.putImageData(undoState, 0, 0);

            showToast('已撤销上一步操作');
        } else if (state.undoStack.length === 1) {
            // 已经撤回到基础状态（只有背景图片）
            showToast('已撤回到初始状态');
        } else {
            showToast('没有可撤销的操作');
        }
    }

    // 添加随机颜色
    function addRandomColor() {
        const colorNameInput = document.getElementById('colorNameInput');
        const colorName = colorNameInput ? colorNameInput.value.trim() : '';

        // 检查颜色名是否为空
        if (!colorName) {
            showToast('请输入颜色名称');
            if (colorNameInput) {
                colorNameInput.focus();
            }
            return;
        }

        const randomColor = getDistinctRandomColor();

        if (!state.colors.some(c => c.color === randomColor)) {
            state.colors.push({
                name: colorName,
                color: randomColor
            });

            state.currentColor = randomColor;
            updateColorPreview();
            updateColorList();
            setTool('brush');

            if (colorNameInput) {
                colorNameInput.value = '';
            }

            showToast(`已添加颜色: ${colorName}，已切换到画笔模式`);
        } else {
            showToast('该颜色已存在');
        }
    }

    // 生成随机颜色（避开#ff0000且颜色相差明显）
    function getDistinctRandomColor() {
        const avoidColor = '#ff0000'; // 清除颜色
        let attempts = 0;
        const maxAttempts = 100;

        while (attempts < maxAttempts) {
            const color = generateRandomColor();

            // 避开清除颜色
            if (color === avoidColor) {
                attempts++;
                continue;
            }

            // 检查与现有颜色的差异
            let isDistinct = true;
            for (const existingColor of state.colors) {
                if (existingColor.color === '#ff0000') continue; // 跳过清除颜色

                if (colorDistance(color, existingColor.color) < 150) {
                    isDistinct = false;
                    break;
                }
            }

            if (isDistinct) {
                return color;
            }

            attempts++;
        }

        // 如果尝试多次都找不到明显不同的颜色，返回一个随机颜色
        return generateRandomColor();
    }

    // 生成随机颜色（基础函数）
    function generateRandomColor() {
        // 使用HSL色彩空间生成更鲜艳的颜色
        const hue = Math.floor(Math.random() * 360);

        // 限制饱和度和亮度，避免太暗或太淡的颜色
        const saturation = 60 + Math.floor(Math.random() * 30); // 60-90%
        const lightness = 40 + Math.floor(Math.random() * 30); // 40-70%

        return hslToHex(hue, saturation, lightness);
    }

    // 计算两个颜色之间的距离（0-765之间）
    function colorDistance(color1, color2) {
        const rgb1 = hexToRgb(color1);
        const rgb2 = hexToRgb(color2);

        if (!rgb1 || !rgb2) return 765; // 最大值

        const dr = rgb1.r - rgb2.r;
        const dg = rgb1.g - rgb2.g;
        const db = rgb1.b - rgb2.b;

        // 使用欧几里得距离
        return Math.sqrt(dr * dr + dg * dg + db * db);
    }

    // HEX转RGB
    function hexToRgb(hex) {
        // 去掉#号
        hex = hex.replace('#', '');

        if (hex.length !== 6) return null;

        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        return { r, g, b };
    }

    // HSL转HEX
    function hslToHex(h, s, l) {
        s /= 100;
        l /= 100;

        let c = (1 - Math.abs(2 * l - 1)) * s;
        let x = c * (1 - Math.abs((h / 60) % 2 - 1));
        let m = l - c / 2;

        let r, g, b;

        if (0 <= h && h < 60) {
            [r, g, b] = [c, x, 0];
        } else if (60 <= h && h < 120) {
            [r, g, b] = [x, c, 0];
        } else if (120 <= h && h < 180) {
            [r, g, b] = [0, c, x];
        } else if (180 <= h && h < 240) {
            [r, g, b] = [0, x, c];
        } else if (240 <= h && h < 300) {
            [r, g, b] = [x, 0, c];
        } else if (300 <= h && h < 360) {
            [r, g, b] = [c, 0, x];
        }

        r = Math.round((r + m) * 255);
        g = Math.round((g + m) * 255);
        b = Math.round((b + m) * 255);

        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
    }
    // 修改 handleImageUpload 函数
    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file || !canvas || !ctx) return;

        if (!file.type.match('image.*')) {
            showToast('请选择图片文件');
            // 重置input
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function (event) {
            const img = new Image();
            img.onload = function () {
                loadImageToCanvas(img);
                // 重置input，以便下次可以选择同一个文件
                e.target.value = '';
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    function handleRotateImageUpload(e) {
        const file = e.target.files[0];
        if (!file || !canvas || !ctx) {
            console.error('handleRotateImageUpload: 缺少参数');
            return;
        }

        console.log('handleRotateImageUpload: 开始处理文件', file.name, file.type);

        if (!file.type.match('image.*')) {
            showToast('请选择图片文件');
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function (event) {
            console.log('handleRotateImageUpload: 文件读取完成');
            const img = new Image();
            img.onload = function () {
                console.log('handleRotateImageUpload: 图片加载完成，尺寸:', img.width, img.height);
                // 创建旋转后的图片
                rotateAndLoadImage(img);
            };
            img.onerror = function () {
                console.error('handleRotateImageUpload: 图片加载失败');
                showToast('图片加载失败，请重试');
                e.target.value = '';
            };
            img.src = event.target.result;
        };
        reader.onerror = function () {
            console.error('handleRotateImageUpload: 文件读取失败');
            showToast('文件读取失败，请重试');
            e.target.value = '';
        };
        reader.readAsDataURL(file);
    }
    // 替换现有的 rotateAndLoadImage 函数
    function rotateAndLoadImage(img) {
        console.log('旋转图片，原始尺寸:', img.width, img.height);

        if (img.width === 0 || img.height === 0) {
            console.error('图片尺寸为0，无法旋转');
            showToast('图片加载失败，请重试');
            return;
        }

        // 创建临时画布进行旋转
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        // 交换宽高以旋转90度
        tempCanvas.width = img.height;
        tempCanvas.height = img.width;

        console.log('旋转后画布尺寸:', tempCanvas.width, tempCanvas.height);

        try {
            // 保存原始变换状态
            tempCtx.save();

            // 旋转90度
            tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
            tempCtx.rotate(Math.PI / 2);
            tempCtx.drawImage(img, -img.width / 2, -img.height / 2);

            // 恢复状态
            tempCtx.restore();

            // 创建旋转后的图片
            const rotatedImg = new Image();
            rotatedImg.onload = function () {
                console.log('旋转图片加载完成，尺寸:', rotatedImg.width, rotatedImg.height);
                loadImageToCanvas(rotatedImg);
            };
            rotatedImg.onerror = function (error) {
                console.error('旋转图片加载失败:', error);
                showToast('图片旋转失败，请重试');
            };
            rotatedImg.src = tempCanvas.toDataURL('image/png');
        } catch (error) {
            console.error('旋转图片时出错:', error);
            showToast('图片处理失败，请重试其他图片');
            // 尝试直接加载原图
            loadImageToCanvas(img);
        }
    }
    function loadImageToCanvas(img) {
        if (!canvas || !ctx || !img) return;

        // 检查图片是否已加载
        if (img.width === 0 || img.height === 0) {
            console.error('图片尺寸为0，无法加载');
            showToast('图片加载失败，请重试');
            return;
        }

        console.log('加载图片尺寸:', { width: img.width, height: img.height });

        // 保存图片
        state.backgroundImage = img;
        state.originalImageSize = {
            width: img.width,
            height: img.height
        };

        // 根据图片调整画布尺寸
        adjustCanvasForImage(img);

        // 设置图片固定标志
        state.isImageFixed = true;

        // 清空历史记录
        state.drawingHistory = [];
        state.undoStack = [];
        state.redoStack = [];

        // 保存当前状态（只有背景图片）
        saveDrawingState();

        // 更新画布缩放信息
        updateCanvasScaling();

        showToast(`图片已导入，显示尺寸: ${Math.round(state.displayCanvasSize.width)}×${Math.round(state.displayCanvasSize.height)}px`);
    }
    //更新画布缩放
    // 修改 updateCanvasScaling 函数
    function updateCanvasScaling() {
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();

        // 如果画布有实际尺寸，使用它来计算缩放
        if (state.actualCanvasSize.width > 0) {
            const scaleX = state.actualCanvasSize.width / rect.width;
            const scaleY = state.actualCanvasSize.height / rect.height;

            state.canvasScale = {
                x: scaleX,
                y: scaleY,
                offsetX: rect.left,
                offsetY: rect.top,
                displayWidth: rect.width,
                displayHeight: rect.height,
                actualWidth: state.actualCanvasSize.width,
                actualHeight: state.actualCanvasSize.height,
                devicePixelRatio: state.devicePixelRatio
            };
        } else {
            // 如果没有实际尺寸，使用默认计算
            const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
            const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;

            state.canvasScale = {
                x: scaleX,
                y: scaleY,
                offsetX: rect.left,
                offsetY: rect.top,
                displayWidth: rect.width,
                displayHeight: rect.height,
                actualWidth: canvas.width,
                actualHeight: canvas.height,
                devicePixelRatio: state.devicePixelRatio
            };
        }

        console.log('更新画布缩放:', state.canvasScale);
    }


    // 检测画布中使用的颜色
    function detectCanvasColors() {
        if (!canvas || !ctx) return [];

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const colorMap = new Map();

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            if (a > 128) {
                if (!(r > 240 && g > 240 && b > 240)) {
                    const hex = rgbToHex(r, g, b);

                    const colorObj = state.colors.find(c => c.color.toLowerCase() === hex.toLowerCase());
                    if (colorObj) {
                        colorMap.set(hex, colorObj);
                    }
                }
            }
        }

        return Array.from(colorMap.values());
    }

    // RGB转十六进制
    function rgbToHex(r, g, b) {
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }

    // 生成智能提示词
    function generatePrompt() {
        const usedColors = detectCanvasColors();
        const promptTextarea = document.getElementById('promptTextarea');

        if (!promptTextarea) return;

        let prompt = '';
        const colorDescriptions = [];

        const clearColor = usedColors.find(c => c.color === '#ff0000' || c.name === '清除');
        if (clearColor) {
            colorDescriptions.push('将#ff0000颜色区域的物体清除');
        }

        usedColors.forEach(colorObj => {
            if (colorObj.color !== '#ff0000' && colorObj.name !== '清除') {
                colorDescriptions.push(`在${colorObj.color}颜色区域添加${colorObj.name}`);
            }
        });

        if (colorDescriptions.length > 0) {
            prompt += colorDescriptions.join('，') + '。';
        } else {
            prompt = '画布中没有检测到颜色标记，请先使用颜色工具在画布上绘制。';
        }

        promptTextarea.textContent = prompt;
        showToast('提示词已生成');
    }

    // 复制提示词
    function copyPrompt() {
        const promptTextarea = document.getElementById('promptTextarea');
        if (!promptTextarea) return;

        const text = promptTextarea.textContent;
        if (!text.trim()) {
            showToast('请先生成提示词');
            return;
        }

        try {
            navigator.clipboard.writeText(text).then(() => {
                showToast('提示词已复制到剪贴板');
            }).catch(() => {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                showToast('提示词已复制到剪贴板');
            });
        } catch (err) {
            showToast('复制失败，请手动复制');
        }
    }

    // 保存提示词
    function savePrompt() {
        const promptTextarea = document.getElementById('promptTextarea');
        const savedPromptsList = document.getElementById('savedPromptsList');

        if (!promptTextarea || !savedPromptsList) return;

        const prompt = promptTextarea.textContent.trim();
        if (!prompt) {
            showToast('提示词为空');
            return;
        }

        const timestamp = new Date().toLocaleString();
        const promptItem = document.createElement('div');
        promptItem.className = 'prompt-item';
        promptItem.innerHTML = `
            <div class="text-xs text-label mb-1">${timestamp}</div>
            <div class="text-sm">${prompt.substring(0, 80)}${prompt.length > 80 ? '...' : ''}</div>
        `;

        promptItem.addEventListener('click', () => {
            promptTextarea.textContent = prompt;
            showToast('提示词已加载');
        });

        savedPromptsList.appendChild(promptItem);

        if (savedPromptsList.children.length > 10) {
            savedPromptsList.removeChild(savedPromptsList.firstChild);
        }

        showToast('提示词已保存');
    }

    // 反向旋转和保存图片（反向旋转导图）
    function rotateAndSave() {
        if (!canvas) return;

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        // 交换宽高
        tempCanvas.width = canvas.height;
        tempCanvas.height = canvas.width;

        tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);

        // 改为反向旋转（逆时针90度）
        tempCtx.rotate(-Math.PI / 2);

        // 绘制图像（注意偏移量调整）
        tempCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

        // 添加水印
        tempCtx.font = '12px Arial';
        tempCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        tempCtx.textAlign = 'right';
        tempCtx.fillText('AI色绘设计助手', tempCanvas.width - 10, tempCanvas.height - 10);

        // 创建下载链接
        const link = document.createElement('a');
        link.download = `AI绘画_反向旋转_${new Date().getTime()}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('图片已反向旋转并保存');
    }

    // 保存图片（不旋转）
    function saveImage() {
        if (!canvas) return;

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;

        // 直接绘制，不旋转
        tempCtx.drawImage(canvas, 0, 0);

        // 添加水印
        tempCtx.font = '12px Arial';
        tempCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        tempCtx.textAlign = 'right';
        tempCtx.fillText('AI色绘设计助手', tempCanvas.width - 10, tempCanvas.height - 10);

        // 创建下载链接
        const link = document.createElement('a');
        link.download = `AI绘画_原图_${new Date().getTime()}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('图片已保存（原图）');
    }

    // 优化到AI功能
    function optimizeToAI() {
        const promptTextarea = document.getElementById('promptTextarea');
        if (!promptTextarea) return;

        const prompt = promptTextarea.textContent.trim();
        if (!prompt) {
            showToast('请先生成提示词');
            return;
        }

        // 保存到sessionStorage
        sessionStorage.setItem('colorDesignPrompt', prompt);

        // 显示提示
        showToast('提示词已保存，正在切换到提示词生成页面...');

        // 延迟切换到提示词生成页面
        setTimeout(() => {
            // 切换到提示词生成页面
            const switchPromptBtn = document.getElementById('switch-prompt');
            if (switchPromptBtn) {
                switchPromptBtn.click();
            }
        }, 1000);
    }

    // 清除画笔功能
    function activateClearBrush() {
        state.currentColor = '#ff0000';
        updateColorPreview();
        updateColorList();
        setTool('brush');
        showToast('已切换到清除画笔模式，点击画布可清除内容');
    }

    // 显示提示
    function showToast(message) {
        // 移除旧的提示
        const oldToast = document.querySelector('.toast');
        if (oldToast) oldToast.remove();

        // 创建新提示
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 12px 24px;
            border-radius: 24px;
            font-size: 0.9rem;
            z-index: 1001;
            animation: fadeInOut 2s ease;
            white-space: nowrap;
            max-width: 90%;
            overflow: hidden;
            text-overflow: ellipsis;
        `;
        toast.textContent = message;

        document.body.appendChild(toast);

        // 2秒后移除
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 2000);
    }
    // 在 undo 函数后面添加 redo 函数：
    function redo() {
        if (!ctx) return;

        if (state.redoStack.length > 0) {
            // 将当前状态保存到撤销栈
            const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
            state.undoStack.push(currentState);

            // 限制撤销栈大小
            if (state.undoStack.length > state.maxUndoSteps) {
                state.undoStack.shift();
            }

            // 从重做栈恢复状态
            const redoState = state.redoStack.pop();
            ctx.putImageData(redoState, 0, 0);

            showToast('已重做');
        } else {
            showToast('没有可重做的操作');
        }
    }
    // 初始化事件监听器
    function initEventListeners() {
        // 工具按钮
        const redoTool = document.getElementById('redoTool');
        if (redoTool) redoTool.addEventListener('click', redo);
        const brushTool = document.getElementById('brushTool');
        const clearBrushTool = document.getElementById('clearBrushTool');
        const clearTool = document.getElementById('clearTool');
        const undoTool = document.getElementById('undoTool');
        const saveImageBtn = document.getElementById('saveImageBtn');
        const rotateSaveBtn = document.getElementById('rotateSaveBtn');
        const optimizeBtn = document.getElementById('optimizeBtn');

        if (brushTool) brushTool.addEventListener('click', () => setTool('brush'));
        if (clearBrushTool) clearBrushTool.addEventListener('click', activateClearBrush);
        if (clearTool) clearTool.addEventListener('click', clearCanvas);
        if (undoTool) undoTool.addEventListener('click', undo);
        if (saveImageBtn) saveImageBtn.addEventListener('click', saveImage);
        if (rotateSaveBtn) rotateSaveBtn.addEventListener('click', rotateAndSave);
        if (optimizeBtn) optimizeBtn.addEventListener('click', optimizeToAI);

        // 画笔大小控制
        const brushSizeSlider = document.getElementById('brushSize');
        if (brushSizeSlider) {
            brushSizeSlider.addEventListener('input', (e) => {
                state.brushSize = parseInt(e.target.value);
                updateBrushPreview();
            });
        }

        // 颜色管理
        const randomColorBtn = document.getElementById('randomColorBtn');
        const colorNameInput = document.getElementById('colorNameInput');

        if (randomColorBtn) {
            randomColorBtn.addEventListener('click', addRandomColor);
        }

        if (colorNameInput) {
            colorNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    addRandomColor();
                }
            });
        }

        // 上传图片
        const uploadBtn = document.getElementById('uploadBtn');
        const imageUpload = document.getElementById('imageUpload');

        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                if (imageUpload) {
                    imageUpload.value = '';
                    imageUpload.click();
                }
            });
        }

        if (imageUpload) {
            imageUpload.addEventListener('change', handleImageUpload);
        }

        // 旋转导入按钮
        const rotateImportBtn = document.getElementById('rotateImportBtn');
        const rotateImageUpload = document.createElement('input');
        rotateImageUpload.type = 'file';
        rotateImageUpload.accept = 'image/*';
        rotateImageUpload.style.display = 'none';
        document.body.appendChild(rotateImageUpload);

        if (rotateImportBtn) {
            rotateImportBtn.addEventListener('click', () => {
                rotateImageUpload.click();
            });
        }

        if (rotateImageUpload) {
            rotateImageUpload.addEventListener('change', handleRotateImageUpload);
        }

        // 提示词相关
        const generatePromptBtn = document.getElementById('generatePromptBtn');
        const copyPromptBtn = document.getElementById('copyPromptBtn');
        const savePromptBtn = document.getElementById('savePromptBtn');

        if (generatePromptBtn) {
            generatePromptBtn.addEventListener('click', generatePrompt);
        }
        if (copyPromptBtn) {
            copyPromptBtn.addEventListener('click', copyPrompt);
        }
        if (savePromptBtn) {
            savePromptBtn.addEventListener('click', savePrompt);
        }

        // 画布事件
        if (canvas) {
            // 设置画布样式防止滚动
            canvas.style.touchAction = 'none';
            canvas.style.userSelect = 'none';
            canvas.style.webkitUserSelect = 'none';

            // 鼠标事件
            canvas.addEventListener('mousedown', startDrawing);
            canvas.addEventListener('mousemove', draw);
            canvas.addEventListener('mouseup', stopDrawing);
            canvas.addEventListener('mouseleave', stopDrawing);

            // 在 initEventListeners 函数中修改触摸事件
            canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
            canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
            canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
            canvas.addEventListener('touchcancel', handleTouchCancel, { passive: false });

            // 防止画布被拖动
            canvas.addEventListener('dragstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });

            // 防止右键菜单
            canvas.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        }

        // 窗口大小变化时重新计算画布尺寸
        window.addEventListener('resize', () => {
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }

            resizeTimeout = setTimeout(() => {
                console.log('窗口大小调整，更新画布尺寸');

                if (state.backgroundImage) {
                    // 如果有背景图片，重新计算显示尺寸
                    const container = canvas.parentElement;
                    const containerWidth = container.clientWidth;

                    // 重新计算显示尺寸
                    const img = state.backgroundImage;
                    let displayWidth, displayHeight;

                    if (img.width > img.height) {
                        displayWidth = Math.min(containerWidth, 1024);
                        displayHeight = (img.height / img.width) * displayWidth;
                    } else {
                        displayWidth = Math.min(containerWidth, 1024);
                        displayHeight = (img.height / img.width) * displayWidth;

                        if (displayHeight > 800) {
                            displayHeight = 800;
                            displayWidth = (img.width / img.height) * displayHeight;
                        }
                    }

                    // 更新显示尺寸
                    canvas.style.width = `${displayWidth}px`;
                    canvas.style.height = `${displayHeight}px`;

                    // 更新状态
                    state.displayCanvasSize = { width: displayWidth, height: displayHeight };
                    state.displayScale = displayWidth / state.actualCanvasSize.width;
                } else {
                    // 没有背景图片，重新初始化画布
                    initCanvas();
                }

                updateCanvasScaling();
            }, 250);
        });
    }

    // 修改 handleTouchStart 函数，添加更严格的检查
    function handleTouchStart(e) {
        if (e.touches.length === 1) {
            e.preventDefault();
            e.stopPropagation();

            // 记录触摸点位置
            const touch = e.touches[0];
            lastTouchY = touch.clientY;
            isTouchMoving = false;
            state.touchIdentifier = touch.identifier;
            state.isTouchActive = true;

            // 调用开始绘图
            startDrawing(e);

            // 锁定画布滚动
            canvas.style.touchAction = 'none';
        }
    }
    // 修改 handleTouchMove 函数，减少误判
    function handleTouchMove(e) {
        if (e.touches.length === 1) {
            e.preventDefault();
            e.stopPropagation();

            const touch = e.touches[0];
            const currentY = touch.clientY;

            // 减少误判阈值，增加水平移动检测
            const deltaY = Math.abs(currentY - lastTouchY);

            // 只有当垂直移动距离较大时才认为是滚动
            if (deltaY > 10 && !state.isDrawing) {
                isTouchMoving = true;
            }

            // 如果不是明显的滚动行为，则绘图
            if (!isTouchMoving || state.isDrawing) {
                draw(e);
            }

            lastTouchY = currentY;
        }
    }

    function handleTouchEnd(e) {
        if (e.touches.length === 0) {
            e.preventDefault();
            stopDrawing(e);
            isTouchMoving = false;
        }
    }

    function handleTouchCancel(e) {
        if (e.touches.length === 0) {
            e.preventDefault();
            stopDrawing(e);
            isTouchMoving = false;
        }
    }

    // 添加toast动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
            15% { opacity: 1; transform: translateX(-50%) translateY(0); }
            85% { opacity: 1; transform: translateX(-50%) translateY(0); }
            100% { opacity: 0; transform: translateX(-50%) translateY(10px); }
        }
    `;
    document.head.appendChild(style);

    // 自动初始化
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(initializePaintSystem, 100);
    } else {
        document.addEventListener('DOMContentLoaded', function () {
            setTimeout(initializePaintSystem, 100);
        });
    }
})();