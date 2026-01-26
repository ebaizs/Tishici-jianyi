
// huihua.js - 色绘设计系统（带画布图层和工具功能）
(function () {
    'use strict';

    // 确保函数在全局作用域可用
    window.initializePaintSystem = initializePaintSystem;

    // 全局变量
    let state = null;
    let backgroundCanvas = null;
    let drawingCanvas = null;
    let backgroundCtx = null;
    let drawingCtx = null;
    let isSystemInitialized = false;
    let lastTouchY = 0;
    let isTouchMoving = false;
    let resizeTimeout = null;
    let rotateImportTimeout = null;

    // 初始化色绘设计系统
    function initializePaintSystem() {
        console.log('初始化色绘设计系统（带图层功能）');

        // 防止重复初始化
        if (isSystemInitialized) {
            console.log('色绘设计系统已经初始化');
            return;
        }

        // 初始化状态
        state = {
            // 套索工具状态
            lassoPoints: [],           // 已添加的套索点
            isLassoActive: false,      // 套索是否激活
            lassoMinPoints: 3,         // 最小点数要求
            lassoPreviewPoint: null,   // 当前预览点（鼠标位置）
            // 新增：套索超时相关
            lassoTimeoutId: null,      // 超时计时器ID
            lassoTimeoutDuration: 2800, // 超时时间（2秒）
            lassoLastClickTime: 0,     // 最后一次点击时间
            // 工具状态
            currentTool: 'brush',
            operationMode: 'paint',

            // 画笔状态
            currentColor: '#233cdf',
            brushSize: 20,
            isDrawing: false,
            lastX: 0,
            lastY: 0,

            // 图层状态
            backgroundImage: null,
            originalImageSize: { width: 0, height: 0 },
            isImageFixed: false,
            // 新增：图片锁定标志
            isImageLocked: false,


            // 颜色管理
            colors: [
                { name: '清除', color: '#c42323' }
            ],

            // 历史记录
            drawingHistory: [],
            undoStack: [],
            redoStack: [],
            maxHistorySteps: 20,
            maxUndoSteps: 5,

            // 工具状态
            lassoPoints: [],
            isLassoActive: false,
            lineStartPoint: null,
            isShiftPressed: false,
            isDrawingLine: false,

            // 触摸状态
            isTouchActive: false,
            touchIdentifier: null,

            // 画布尺寸
            devicePixelRatio: window.devicePixelRatio || 1,
            displayScale: 1,
            actualCanvasSize: { width: 0, height: 0 },
            displayCanvasSize: { width: 0, height: 0 },
            canvasScale: null,

            // 鼠标坐标
            cursorCoordinates: { x: 0, y: 0 }
        };

        // 获取DOM元素
        const canvasContainer = document.querySelector('.canvas-container');
        if (!canvasContainer) {
            console.error('画布容器未找到');
            return;
        }

        // 清空容器
        canvasContainer.innerHTML = '';

        // 创建背景画布（用于显示背景图片）
        backgroundCanvas = document.createElement('canvas');
        backgroundCanvas.id = 'backgroundCanvas';
        backgroundCanvas.className = 'canvas-layer';
        backgroundCanvas.style.position = 'absolute';
        backgroundCanvas.style.zIndex = '1';
        backgroundCanvas.style.touchAction = 'none';
        backgroundCanvas.style.userSelect = 'none';
        backgroundCanvas.style.webkitUserSelect = 'none';
        backgroundCanvas.style.left = '0';
        backgroundCanvas.style.top = '0';

        // 创建绘画画布（用于用户绘制）
        drawingCanvas = document.createElement('canvas');
        drawingCanvas.id = 'drawingCanvas';
        drawingCanvas.className = 'canvas-layer';
        drawingCanvas.style.position = 'absolute';
        drawingCanvas.style.zIndex = '2';
        drawingCanvas.style.touchAction = 'none';
        drawingCanvas.style.userSelect = 'none';
        drawingCanvas.style.webkitUserSelect = 'none';
        drawingCanvas.style.left = '0';
        drawingCanvas.style.top = '0';

        // 创建预览画布（用于显示预览）
        const previewCanvas = document.createElement('canvas');
        previewCanvas.id = 'previewCanvas';
        previewCanvas.className = 'canvas-layer';
        previewCanvas.style.position = 'absolute';
        previewCanvas.style.zIndex = '3';
        previewCanvas.style.touchAction = 'none';
        previewCanvas.style.userSelect = 'none';
        previewCanvas.style.webkitUserSelect = 'none';
        previewCanvas.style.pointerEvents = 'none'; // 重要：不拦截鼠标事件
        previewCanvas.style.left = '0';
        previewCanvas.style.top = '0';

        // 添加到容器
        canvasContainer.appendChild(backgroundCanvas);
        canvasContainer.appendChild(drawingCanvas);
        canvasContainer.appendChild(previewCanvas); // 添加预览画布

        // 获取上下文
        backgroundCtx = backgroundCanvas.getContext('2d', { willReadFrequently: true });
        drawingCtx = drawingCanvas.getContext('2d', { willReadFrequently: true });
        state.previewCtx = previewCanvas.getContext('2d', { willReadFrequently: true });
        state.previewCanvas = previewCanvas;

        // 初始化应用
        try {
            initCanvas();
            initColors();
            initEventListeners();
            setTool('brush');

            // 确保画布在容器中居中
            canvasContainer.style.display = 'flex';
            canvasContainer.style.justifyContent = 'center';
            canvasContainer.style.alignItems = 'center';

            // 更新画笔预览
            updateBrushPreview();

            // 保存初始状态
            setTimeout(() => {
                // 保存初始空白状态
                if (drawingCanvas && drawingCtx) {
                    const initialImageData = drawingCtx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height);
                    state.undoStack.push(initialImageData);
                    state.drawingHistory.push(initialImageData);
                }
            }, 100);

            isSystemInitialized = true;
            console.log('色绘设计系统初始化完成（带图层）');
        } catch (error) {
            console.error('色绘设计系统初始化失败:', error);
            showToast('系统初始化失败，请刷新页面');
        }
    }
    // 辅助函数：根据图片调整画布（用于resize等场景）
    function adjustCanvasForImage() {
        if (!state.backgroundImage || !state.isImageFixed) return;

        const img = state.backgroundImage;
        const container = drawingCanvas.parentElement;
        if (!container) return;

        // 获取容器当前尺寸
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // 重新计算缩放比例（保持宽高比）
        const scaleX = containerWidth / img.width;
        const scaleY = containerHeight / img.height;
        const scale = Math.min(scaleX, scaleY);

        const drawWidth = Math.floor(img.width * scale);
        const drawHeight = Math.floor(img.height * scale);
        const offsetX = Math.floor((containerWidth - drawWidth) / 2);
        const offsetY = Math.floor((containerHeight - drawHeight) / 2);

        // 计算实际像素尺寸
        const pixelRatio = state.devicePixelRatio;
        const actualWidth = Math.max(Math.floor(drawWidth * pixelRatio), 1);
        const actualHeight = Math.max(Math.floor(drawHeight * pixelRatio), 1);

        // 更新画布尺寸（只有在尺寸变化时才更新）
        if (backgroundCanvas.width !== actualWidth || backgroundCanvas.height !== actualHeight) {
            backgroundCanvas.width = actualWidth;
            backgroundCanvas.height = actualHeight;
            drawingCanvas.width = actualWidth;
            drawingCanvas.height = actualHeight;
            state.previewCanvas.width = actualWidth;
            state.previewCanvas.height = actualHeight;

            // 重新绘制背景
            backgroundCtx.fillStyle = '#f8f9fa';
            backgroundCtx.fillRect(0, 0, actualWidth, actualHeight);
            backgroundCtx.drawImage(img, 0, 0, actualWidth, actualHeight);
        }

        // 更新显示尺寸
        backgroundCanvas.style.width = `${drawWidth}px`;
        backgroundCanvas.style.height = `${drawHeight}px`;
        drawingCanvas.style.width = `${drawWidth}px`;
        drawingCanvas.style.height = `${drawHeight}px`;
        state.previewCanvas.style.width = `${drawWidth}px`;
        state.previewCanvas.style.height = `${drawHeight}px`;

        // 更新尺寸信息
        state.actualCanvasSize = { width: actualWidth, height: actualHeight };
        state.displayCanvasSize = { width: drawWidth, height: drawHeight };
        state.displayScale = drawWidth / actualWidth;
        state.imageOffset = { x: offsetX, y: offsetY };
        state.imageDrawSize = { width: drawWidth, height: drawHeight };
        state.imageScale = scale;

        console.log('重新调整画布居中:', {
            显示尺寸: { drawWidth, drawHeight },
            偏移量: { offsetX, offsetY }
        });
    }
    function initCanvas() {
        if (!drawingCanvas || !backgroundCanvas) return;

        const container = drawingCanvas.parentElement;
        if (!container) return;

        // 如果已经有固定图片
        if (state.backgroundImage && state.isImageFixed) {
            console.log('画布已有固定图片');

            // 如果图片已锁定，只重新居中
            if (state.isImageLocked) {
                console.log('图片已锁定，只重新居中');
                centerCanvas();
                return;
            } else {
                // 否则重新调整画布
                console.log('图片未锁定，重新调整');
                adjustCanvasForImage();
                return;
            }
        }
        // 以下为原有的默认画布初始化代码（没有图片时）
        // 获取容器尺寸
        const containerWidth = container.clientWidth;
        const containerHeight = window.innerHeight;

        // 根据屏幕宽度设置画布大小
        let displayWidth, displayHeight;
        if (window.innerWidth <= 480) {
            displayWidth = 400;
            displayHeight = 300;
        } else if (window.innerWidth <= 768) {
            displayWidth = 800;
            displayHeight = 600;
        } else {
            displayWidth = 1024;
            displayHeight = 768;
        }

        console.log('初始化默认画布尺寸:', {
            displayWidth,
            displayHeight
        });

        // 确保不超过容器尺寸
        displayWidth = Math.min(displayWidth, containerWidth || displayWidth);
        displayHeight = Math.min(displayHeight, containerHeight * 0.7 || displayHeight);

        // 设置容器样式
        container.style.width = '100%';
        container.style.height = `${displayHeight}px`;
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'center';
        container.style.overflow = 'hidden';
        container.style.margin = '0 auto';

        // 计算实际像素尺寸
        const pixelRatio = state.devicePixelRatio;
        const actualWidth = Math.max(Math.floor(displayWidth * pixelRatio), 1);
        const actualHeight = Math.max(Math.floor(displayHeight * pixelRatio), 1);

        // 设置实际像素尺寸
        backgroundCanvas.width = actualWidth;
        backgroundCanvas.height = actualHeight;
        drawingCanvas.width = actualWidth;
        drawingCanvas.height = actualHeight;
        state.previewCanvas.width = actualWidth;
        state.previewCanvas.height = actualHeight;

        // 设置显示尺寸
        backgroundCanvas.style.width = `${displayWidth}px`;
        backgroundCanvas.style.height = `${displayHeight}px`;
        drawingCanvas.style.width = `${displayWidth}px`;
        drawingCanvas.style.height = `${displayHeight}px`;
        state.previewCanvas.style.width = `${displayWidth}px`;
        state.previewCanvas.style.height = `${displayHeight}px`;

        // 保存尺寸信息
        state.actualCanvasSize = { width: actualWidth, height: actualHeight };
        state.displayCanvasSize = { width: displayWidth, height: displayHeight };
        state.displayScale = displayWidth / actualWidth;

        // 设置默认画布内容
        backgroundCtx.fillStyle = '#f8f9fa';
        backgroundCtx.fillRect(0, 0, actualWidth, actualHeight);

        // 绘制边框
        backgroundCtx.strokeStyle = '#dee2e6';
        backgroundCtx.lineWidth = 2;
        backgroundCtx.strokeRect(1, 1, actualWidth - 2, actualHeight - 2);

        drawingCtx.clearRect(0, 0, actualWidth, actualHeight);
        state.previewCtx.clearRect(0, 0, actualWidth, actualHeight);

        updateCanvasScaling();
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
    // 修改 updateBrushPreview 函数
    function updateBrushPreview() {
        const brushPreviewBox = document.getElementById('brushPreviewBox');
        const brushSizeValue = document.getElementById('brushSizeValue');

        if (brushPreviewBox) {
            const previewSize = Math.max(20, Math.min(40, state.brushSize));
            brushPreviewBox.style.width = `${previewSize}px`;
            brushPreviewBox.style.height = `${previewSize}px`;
            brushPreviewBox.style.background = state.currentColor;
            brushPreviewBox.style.borderRadius = '0'; // 改为方形
        }

        if (brushSizeValue) {
            brushSizeValue.textContent = state.brushSize + 'px';
        }
    }
    // 更新颜色预览
    function updateColorPreview() {
        const colorPreview = document.getElementById('currentColorPreview');
        if (colorPreview) {
            colorPreview.style.background = state.currentColor;
        }
    }
    function setTool(tool) {
        state.currentTool = tool;
        // 新增：如果从套索工具切换到其他工具，清除套索状态和计时器
        if (state.currentTool !== 'lasso' && state.isLassoActive) {
            // 清除超时计时器
            if (state.lassoTimeoutId) {
                clearTimeout(state.lassoTimeoutId);
                state.lassoTimeoutId = null;
            }
        }
        if (tool === 'eraser') {
            state.operationMode = 'erase';
        } else if (tool === 'line') {
            state.operationMode = 'paint';
        } else {
            state.operationMode = 'paint';
        }
        // 更新按钮状态//可能要删除
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const toolBtn = document.getElementById(`${tool}Tool`) || document.getElementById(`${tool}Btn`);
        if (toolBtn) {
            toolBtn.classList.add('active');
        }

        // 更新光标
        if (drawingCanvas) {
            if (tool === 'brush' || tool === 'line' || tool === 'lasso') {
                drawingCanvas.style.cursor = 'crosshair';
            } else {
                drawingCanvas.style.cursor = 'default';
            }
        }

        // 如果是切换到套索工具，取消之前的套索
        if (tool !== 'lasso') {
            cancelLasso();
        } else {
            // 切换到套索工具时，显示提示
            showToast('套索工具：点击添加点（至少3个），双击第一个点或按Enter完成');
        }

        // 重置直线模式
        state.lineStartPoint = null;
        state.isDrawingLine = false;

        // 清空预览
        if (state.previewCtx) {
            state.previewCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        }

        // 更新工具提示
        updateToolPreview();
        //可能要删除
    }

    // 更新工具预览
    function updateToolPreview() {
        const toolPreview = document.getElementById('currentToolPreview');
        if (toolPreview) {
            let toolName = '画笔';
            if (state.currentTool === 'eraser') toolName = '橡皮';
            if (state.currentTool === 'lasso') toolName = '套索';
            if (state.currentTool === 'line') toolName = '直线';
            toolPreview.textContent = toolName;
        }
    }

    function startDrawing(e) {
        // 阻止默认行为，防止滚动
        if (e.type.includes('touch')) {
            e.preventDefault();
            if (e.touches.length === 1) {
                state.touchIdentifier = e.touches[0].identifier;
                state.isTouchActive = true;
            }
        }

        const { x, y } = getCanvasCoordinates(e);

        // 保存最后坐标
        state.lastX = x;
        state.lastY = y;

        // 根据工具类型处理
        if (state.currentTool === 'lasso') {
            // 套索工具：点击添加点
            // 注意：x 和 y 已经是画布坐标，直接传递给 startLasso
            startLasso(x, y);
        } else if (state.currentTool === 'line') {
            // 直线工具：设置起点
            state.lineStartPoint = { x, y };
            state.isDrawingLine = true;
            state.isDrawing = false;
        } else if (state.currentTool === 'brush' || state.currentTool === 'eraser') {
            // 画笔或橡皮工具
            if (state.isShiftPressed) {
                // Shift键按下：直线模式
                state.lineStartPoint = { x, y };
                state.isDrawingLine = true;
                state.isDrawing = false;
            } else {
                // 自由绘制模式
                state.isDrawing = true;
                state.lastX = x;
                state.lastY = y;

                // 绘制起始点
                drawOnCanvas(x, y);

                // 更新最后坐标
                state.lastX = x;
                state.lastY = y;
            }
        }
    }
    // 修复 drawOnCanvas 函数 - 方形笔触
    function drawOnCanvas(x, y) {
        if (!drawingCtx) return;

        // 设置绘制属性
        drawingCtx.globalCompositeOperation = state.currentTool === 'eraser' ? 'destination-out' : 'source-over';

        if (state.currentTool === 'eraser') {
            drawingCtx.fillStyle = 'rgba(0,0,0,1)';
        } else {
            drawingCtx.fillStyle = state.currentColor;
        }

        // 设置方形笔触（使用矩形填充）
        drawingCtx.lineWidth = 1;
        drawingCtx.lineCap = 'butt';
        drawingCtx.lineJoin = 'miter';

        // 计算方形笔触的起始位置
        const halfSize = state.brushSize / 2;
        const startX = Math.min(state.lastX, x) - halfSize;
        const startY = Math.min(state.lastY, y) - halfSize;
        const width = Math.abs(x - state.lastX) + state.brushSize;
        const height = Math.abs(y - state.lastY) + state.brushSize;

        // 绘制方形区域
        drawingCtx.fillRect(startX, startY, width, height);

        // 绘制当前点的方形（确保终点也被绘制）
        drawingCtx.fillRect(x - halfSize, y - halfSize, state.brushSize, state.brushSize);

        // 绘制起始点的方形（确保起点也被绘制）
        drawingCtx.fillRect(state.lastX - halfSize, state.lastY - halfSize, state.brushSize, state.brushSize);
    }
    // 修复 drawLineOnCanvas 函数 - 方形笔触
    function drawLineOnCanvas(x1, y1, x2, y2) {
        if (!drawingCtx) return;

        // 保存当前状态
        drawingCtx.save();

        // 设置绘制属性
        drawingCtx.globalCompositeOperation = state.currentTool === 'eraser' ? 'destination-out' : 'source-over';

        if (state.currentTool === 'eraser') {
            drawingCtx.fillStyle = 'rgba(0,0,0,1)';
        } else {
            drawingCtx.fillStyle = state.currentColor;
        }

        // 计算线条的矩形区域
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // 绘制方形笔触的线条
        const halfSize = state.brushSize / 2;

        // 方法1：绘制旋转的矩形（更适合方形笔触）
        drawingCtx.translate(x1, y1);
        drawingCtx.rotate(angle);

        // 绘制线条的主体矩形
        drawingCtx.fillRect(0, -halfSize, distance, state.brushSize);

        // 绘制起点和终点的方形（确保端点完整）
        drawingCtx.fillRect(-halfSize, -halfSize, state.brushSize, state.brushSize); // 起点
        drawingCtx.fillRect(distance - halfSize, -halfSize, state.brushSize, state.brushSize); // 终点

        // 恢复状态
        drawingCtx.restore();
        // 保存状态
        saveDrawingState();
    }

    // 找到 draw 函数（大约在 500-550 行之间），修改套索部分：

    function draw(e) {
        // 阻止默认行为，防止滚动
        if (e.type.includes('touch')) {
            e.preventDefault();
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

        // 根据工具类型处理
        if (state.currentTool === 'lasso') {
            // 套索工具：绘制套索预览（包括已有点和鼠标位置）
            drawLassoPreview(x, y);
        } else if ((state.currentTool === 'line' || state.isDrawingLine) && state.lineStartPoint) {
            // 直线工具：预览
            state.lastX = x;
            state.lastY = y;
            clearPreview(); // 清除之前的预览
            drawLinePreview(state.lineStartPoint.x, state.lineStartPoint.y, x, y);
        } else if ((state.currentTool === 'brush' || state.currentTool === 'eraser') && state.isDrawing) {
            // 画笔或橡皮工具：自由绘制
            drawOnCanvas(x, y);
            state.lastX = x;
            state.lastY = y;
        } else if (state.currentTool === 'lasso' && !state.isLassoActive) {
            // 套索工具未激活，只显示鼠标位置预览
            drawLassoPreview(x, y);
        }

        // 更新光标坐标
        updateCursorCoordinates();
    }
    function stopDrawing(e) {
        if (e && e.type.includes('touch')) {
            e.preventDefault();
        }

        // 根据工具类型处理
        if (state.currentTool === 'lasso' && state.isLassoActive) {
            // 套索工具：双击事件现在在单独的监听器中处理        
        } else if ((state.currentTool === 'line' || state.isDrawingLine) && state.lineStartPoint) {
            // 直线工具：完成绘制
            const { x, y } = getCanvasCoordinates(e);
            clearPreview();
            drawLineOnCanvas(state.lineStartPoint.x, state.lineStartPoint.y, x, y);
            state.lineStartPoint = null;
            state.isDrawingLine = false;
            state.isDrawing = false;
            saveDrawingState();
        } else if ((state.currentTool === 'brush' || state.currentTool === 'eraser') && state.isDrawing) {
            drawingCtx.beginPath();
            state.isDrawing = false;
            saveDrawingState();
        }

        // 重置触摸状态
        if (state.isTouchActive) {
            state.isTouchActive = false;
            state.touchIdentifier = null;
        }
    }

    // 绘制直线预览
    function drawLinePreview(x1, y1, x2, y2) {
        if (!state.previewCtx) return;

        // 清除预览画布
        state.previewCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);

        // 设置预览样式
        state.previewCtx.strokeStyle = state.currentColor + 'A0'; // 60%透明度
        state.previewCtx.fillStyle = state.currentColor + '40'; // 25%透明度
        state.previewCtx.lineWidth = state.brushSize;
        state.previewCtx.lineCap = 'square';
        state.previewCtx.setLineDash([5, 3]);

        // 绘制直线预览
        state.previewCtx.beginPath();
        state.previewCtx.moveTo(x1, y1);
        state.previewCtx.lineTo(x2, y2);
        state.previewCtx.stroke();

        state.previewCtx.setLineDash([]);
    }

    // 修改 clearPreview 函数 - 只清除预览层，不干扰实际绘制
    function clearPreview() {
        // 清除预览层，但保留实际绘制的内容
        if (state.previewCtx) {
            state.previewCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        }
    }
    // 在 getCanvasCoordinates 函数前添加一个辅助函数（大约在 713 行之前）：

    // 安全的获取画布坐标函数（处理事件对象和普通坐标）
    function getCanvasCoordinatesSafe(input) {
        // 如果输入是事件对象
        if (input && typeof input === 'object' && ('clientX' in input || 'touches' in input)) {
            return getCanvasCoordinates(input);
        }
        // 如果输入已经是坐标对象
        else if (input && typeof input === 'object' && 'x' in input && 'y' in input) {
            return input;
        }
        // 如果是单独的 x, y
        else if (arguments.length === 2) {
            return { x: arguments[0], y: arguments[1] };
        }
        // 默认返回零坐标
        return { x: 0, y: 0 };
    }
    // 获取画布坐标
    function getCanvasCoordinates(e) {
        if (!drawingCanvas || !state.canvasScale) return { x: 0, y: 0 };

        // 安全检查
        if (!e) {
            console.warn('getCanvasCoordinates 接收到无效的事件对象');
            return { x: state.lastX || 0, y: state.lastY || 0 };
        }

        let clientX, clientY;

        // 获取客户端坐标
        if (e.type && e.type.includes('touch')) {
            if (state.touchIdentifier !== null) {
                for (let i = 0; i < e.touches.length; i++) {
                    if (e.touches[i].identifier === state.touchIdentifier) {
                        clientX = e.touches[i].clientX;
                        clientY = e.touches[i].clientY;
                        break;
                    }
                }
            }
            if (clientX === undefined && e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            }
        } else if (e.clientX !== undefined) {
            clientX = e.clientX;
            clientY = e.clientY;
        } else {
            // 如果没有有效的事件数据，返回最后已知坐标
            return { x: state.lastX, y: state.lastY };
        }

        if (clientX === undefined || clientY === undefined) {
            return { x: state.lastX, y: state.lastY };
        }

        // 获取画布的实际位置和尺寸
        const rect = drawingCanvas.getBoundingClientRect();

        // 计算在显示画布上的坐标
        const displayX = clientX - rect.left;
        const displayY = clientY - rect.top;

        // 转换为实际像素坐标
        const actualX = (displayX / rect.width) * state.actualCanvasSize.width;
        const actualY = (displayY / rect.height) * state.actualCanvasSize.height;

        // 确保坐标在画布范围内
        const safeX = Math.max(0, Math.min(actualX, state.actualCanvasSize.width));
        const safeY = Math.max(0, Math.min(actualY, state.actualCanvasSize.height));

        // 更新光标坐标
        state.cursorCoordinates = { x: Math.round(safeX), y: Math.round(safeY) };
        updateCursorCoordinates();

        return {
            x: safeX,
            y: safeY,
            displayX: displayX,
            displayY: displayY
        };
    }
    // 更新光标坐标显示
    function updateCursorCoordinates() {
        const coordsElement = document.getElementById('cursorCoordinates');
        if (coordsElement) {
            coordsElement.textContent = `(${state.cursorCoordinates.x}, ${state.cursorCoordinates.y})`;
        }
    }

    // 清空画布
    function clearCanvas() {
        if (!drawingCanvas || !drawingCtx) return;

        if (confirm('确定要清空画布的所有画笔痕迹吗？背景图片将保留。')) {
            // 清除绘画画布
            drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);

            // 清空预览画布
            state.previewCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);

            // 如果图片固定，保留背景图片
            if (state.backgroundImage && state.isImageFixed) {
                // 重新绘制背景图片
                backgroundCtx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
                backgroundCtx.drawImage(state.backgroundImage, 0, 0, backgroundCanvas.width, backgroundCanvas.height);
            } else {
                // 否则恢复默认背景
                backgroundCtx.fillStyle = '#f8f9fa';
                backgroundCtx.fillRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
                backgroundCtx.strokeStyle = '#dee2e6';
                backgroundCtx.lineWidth = 2;
                backgroundCtx.strokeRect(1, 1, backgroundCanvas.width - 2, backgroundCanvas.height - 2);
            }

            // 清空历史记录和撤销/重做栈
            state.drawingHistory = [];
            state.undoStack = [];
            state.redoStack = [];

            // 保存当前状态
            saveDrawingState();

            showToast('画笔痕迹已清空，背景图片保留');
        }
    }
    function saveDrawingState() {
        if (!drawingCanvas || !drawingCtx || drawingCanvas.width === 0 || drawingCanvas.height === 0) return;

        try {
            const imageData = drawingCtx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height);

            // 保存到撤销栈（确保至少5步容量）
            state.undoStack.push(imageData);

            // 保持至少5步的容量，如果超过10步，移除最早的，保留至少5步
            if (state.undoStack.length > 10) {
                // 保留最近10步，确保至少有5步可用
                state.undoStack = state.undoStack.slice(-10);
            }

            // 确保至少保留5步
            const minSteps = 5;
            if (state.undoStack.length > minSteps) {
                // 如果栈长度超过最小步数，移除最早的，但保留至少minSteps步
                while (state.undoStack.length > minSteps && state.undoStack.length > 10) {
                    state.undoStack.shift();
                }
            }

            state.redoStack = []; // 新操作后清空重做栈

            // 同时保存到历史记录
            state.drawingHistory.push(imageData);
            if (state.drawingHistory.length > state.maxHistorySteps) {
                state.drawingHistory.shift();
            }
        } catch (error) {
            console.error('保存画布状态失败:', error);
        }
    }

    // 修改 undo 函数，确保至少有5步可撤销
    function undo() {
        if (!drawingCtx) return;

        // 确保至少有2个状态才能撤销（当前状态+上一个状态）
        if (state.undoStack.length > 1) {
            // 将当前状态保存到重做栈
            const currentState = drawingCtx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height);
            state.redoStack.push(currentState);

            // 限制重做栈大小（也设为5步）
            if (state.redoStack.length > state.maxUndoSteps) {
                state.redoStack.shift();
            }

            // 从撤销栈恢复上一个状态
            const undoState = state.undoStack.pop();
            drawingCtx.putImageData(undoState, 0, 0);

            showToast('已撤销上一步操作');
        } else if (state.undoStack.length === 1) {
            showToast('已撤回到初始状态');
        } else {
            showToast('没有可撤销的操作');
        }
    }

    // 修改 redo 函数
    function redo() {
        if (!drawingCtx) return;

        if (state.redoStack.length > 0) {
            // 将当前状态保存到撤销栈
            const currentState = drawingCtx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height);
            state.undoStack.push(currentState);

            // 限制撤销栈大小
            if (state.undoStack.length > state.maxUndoSteps) {
                state.undoStack.shift();
            }

            // 从重做栈恢复状态
            const redoState = state.redoStack.pop();
            drawingCtx.putImageData(redoState, 0, 0);

            showToast('已重做');
        } else {
            showToast('没有可重做的操作');
        }
    }

    // ================ 套索工具功能（优化版） ================
    // 开始/添加套索点（点击添加点）
    function startLasso(x, y) {
        // x 和 y 已经是画布坐标，直接使用（因为从 startDrawing 传过来时已经转换了）
        const actualX = x;
        const actualY = y;

        // 更新最后点击时间
        state.lassoLastClickTime = Date.now();

        // 清除之前的超时计时器
        if (state.lassoTimeoutId) {
            clearTimeout(state.lassoTimeoutId);
            state.lassoTimeoutId = null;
        }

        if (!state.isLassoActive) {
            // 第一次点击：开始新套索
            state.lassoPoints = [{ x: actualX, y: actualY }];
            state.isLassoActive = true;
            state.isDrawing = false; // 不处于绘制状态，只是添加点

            console.log('开始新套索，第一个点:', { x: actualX, y: actualY });
            showToast('套索工具已激活，继续点击添加点（至少3个），双击、按Enter或等待2秒自动完成');
        } else {
            // 后续点击：添加点
            // 检查是否点击在第一个点上（闭合）
            const firstPoint = state.lassoPoints[0];
            const distanceToFirst = Math.sqrt(
                Math.pow(actualX - firstPoint.x, 2) +
                Math.pow(actualY - firstPoint.y, 2)
            );

            if (distanceToFirst < 10 && state.lassoPoints.length >= state.lassoMinPoints) {
                // 点击在第一个点上且点数足够，完成套索
                completeLasso();
                return; // 直接返回，不需要设置超时
            } else {
                // 添加新点
                state.lassoPoints.push({ x: actualX, y: actualY });
                console.log(`添加第${state.lassoPoints.length}个点:`, { x: actualX, y: actualY });

                if (state.lassoPoints.length === 2) {
                    showToast('已添加2个点，继续添加至少1个点（共3个点）可完成套索');
                } else if (state.lassoPoints.length >= state.lassoMinPoints) {
                    showToast(`已添加${state.lassoPoints.length}个点，双击第一个点、按Enter或等待2秒自动完成`);

                    // 设置超时自动完成（只有点数达到最小要求时才设置）
                    state.lassoTimeoutId = setTimeout(() => {
                        // 检查是否仍然处于激活状态且点数足够
                        if (state.isLassoActive && state.lassoPoints.length >= state.lassoMinPoints) {
                            console.log('套索超时自动完成');
                            completeLasso();
                        }
                    }, state.lassoTimeoutDuration);
                }
            }
        }

        // 绘制套索预览
        drawLassoPreview();
    }
    // 添加套索点
    function addLassoPoint(x, y) {
        if (!state.isLassoActive) return;

        // 避免重复点（距离太近）
        if (state.lassoPoints.length > 0) {
            const lastPoint = state.lassoPoints[state.lassoPoints.length - 1];
            const distance = Math.sqrt(Math.pow(x - lastPoint.x, 2) + Math.pow(y - lastPoint.y, 2));
            if (distance < 10) {
                return;
            }
        }

        state.lassoPoints.push({ x, y });
        drawLassoPreview();
    }
    // 完成套索操作
    function completeLasso() {
        if (!state.isLassoActive || state.lassoPoints.length < state.lassoMinPoints) {
            showToast(`至少需要${state.lassoMinPoints}个点才能完成套索`);
            return;
        }

        console.log('完成套索，点数:', state.lassoPoints.length);

        // 清除超时计时器
        if (state.lassoTimeoutId) {
            clearTimeout(state.lassoTimeoutId);
            state.lassoTimeoutId = null;
        }

        // 创建闭合路径
        const path = new Path2D();
        path.moveTo(state.lassoPoints[0].x, state.lassoPoints[0].y);

        for (let i = 1; i < state.lassoPoints.length; i++) {
            path.lineTo(state.lassoPoints[i].x, state.lassoPoints[i].y);
        }

        path.closePath();

        // 保存当前绘制状态
        drawingCtx.save();

        // 设置绘制属性
        if (state.currentColor === '#c42323' || state.currentColor === '#ff0000') {
            // 清除模式
            drawingCtx.globalCompositeOperation = 'destination-out';
            drawingCtx.fillStyle = 'rgba(0,0,0,1)';
        } else {
            // 填充模式
            drawingCtx.globalCompositeOperation = 'source-over';
            drawingCtx.fillStyle = state.currentColor;
        }

        // 填充套索区域
        drawingCtx.fill(path);

        // 恢复绘制状态
        drawingCtx.restore();

        // 保存操作状态
        saveDrawingState();

        // 显示完成消息
        const areaDescription = state.lassoPoints.length === 3 ? '三角形' :
            state.lassoPoints.length === 4 ? '四边形' :
                `${state.lassoPoints.length}边形`;
        showToast(`套索完成！创建了${areaDescription}区域`);

        // 重置套索状态
        cancelLasso();
    }
    // 取消套索操作
    function cancelLasso() {
        // 清除超时计时器
        if (state.lassoTimeoutId) {
            clearTimeout(state.lassoTimeoutId);
            state.lassoTimeoutId = null;
        }

        state.lassoPoints = [];
        state.isLassoActive = false;
        state.isDrawing = false;
        state.lassoPreviewPoint = null;
        clearPreview();

        // 强制清除所有预览内容
        if (state.previewCtx && state.previewCanvas) {
            state.previewCtx.clearRect(0, 0, state.previewCanvas.width, state.previewCanvas.height);
        }

        // 如果当前工具是套索，保持激活状态但清空点
        if (state.currentTool === 'lasso') {
            showToast('套索已取消，点击画布重新开始');
        }
    }
    // 绘制套索预览（只显示已有点之间的连线，鼠标位置仅显示光标）
    function drawLassoPreview(mouseX = null, mouseY = null) {
        if (!state.isLassoActive) return;

        // 清除之前的预览
        clearPreview();

        if (!state.previewCtx) return;

        const points = state.lassoPoints;
        const hasMousePoint = mouseX !== null && mouseY !== null;

        // 设置预览样式
        state.previewCtx.strokeStyle = state.currentColor + 'CC'; // 80%透明度
        state.previewCtx.fillStyle = state.currentColor + '20';   // 12%透明度
        state.previewCtx.lineWidth = 2;
        state.previewCtx.setLineDash([5, 3]);
        state.previewCtx.lineJoin = 'round';
        state.previewCtx.lineCap = 'round';

        // 如果有至少2个点，才绘制连线
        if (points.length >= 2) {
            // 开始绘制路径
            state.previewCtx.beginPath();
            state.previewCtx.moveTo(points[0].x, points[0].y);

            // 绘制已确定的线段（只连接已有点）
            for (let i = 1; i < points.length; i++) {
                state.previewCtx.lineTo(points[i].x, points[i].y);
            }

            // 如果有点数大于等于最小要求，闭合路径预览
            if (points.length >= state.lassoMinPoints) {
                // 闭合路径（从最后一个点到第一个点）
                state.previewCtx.lineTo(points[0].x, points[0].y);
            }

            // 填充和描边
            state.previewCtx.closePath();
            state.previewCtx.fill();
            state.previewCtx.stroke();
            state.previewCtx.setLineDash([]);
        }

        // 绘制控制点（只要有至少1个点）
        if (points.length > 0) {
            state.previewCtx.fillStyle = state.currentColor;
            state.previewCtx.strokeStyle = '#FFFFFF';
            state.previewCtx.lineWidth = 1.5;

            points.forEach((point, index) => {
                state.previewCtx.beginPath();
                state.previewCtx.arc(point.x, point.y, 5, 0, Math.PI * 2);

                // 第一个点特殊标记（用于闭合）
                if (index === 0) {
                    state.previewCtx.fillStyle = points.length >= state.lassoMinPoints ? '#4CAF50' : state.currentColor;
                    state.previewCtx.fill();
                    state.previewCtx.stroke();

                    // 在第一个点上画一个圆圈（表示可以闭合）
                    state.previewCtx.beginPath();
                    state.previewCtx.arc(point.x, point.y, 8, 0, Math.PI * 2);
                    state.previewCtx.strokeStyle = points.length >= state.lassoMinPoints ? '#4CAF50' : '#999999';
                    state.previewCtx.setLineDash([2, 2]);
                    state.previewCtx.stroke();
                    state.previewCtx.setLineDash([]);
                } else {
                    state.previewCtx.fill();
                    state.previewCtx.stroke();
                }

                // 显示点序号
                state.previewCtx.fillStyle = '#FFFFFF';
                state.previewCtx.font = 'bold 10px Arial';
                state.previewCtx.textAlign = 'center';
                state.previewCtx.textBaseline = 'middle';
                state.previewCtx.fillText((index + 1).toString(), point.x, point.y);
                state.previewCtx.fillStyle = state.currentColor;
            });
        }

        // 如果鼠标位置有效，仅显示鼠标位置光标（不连线）
        if (hasMousePoint) {
            // 绘制十字光标
            state.previewCtx.strokeStyle = state.currentColor + 'AA';
            state.previewCtx.lineWidth = 1;
            state.previewCtx.setLineDash([]);

            // 水平线
            state.previewCtx.beginPath();
            state.previewCtx.moveTo(mouseX - 10, mouseY);
            state.previewCtx.lineTo(mouseX + 10, mouseY);
            state.previewCtx.stroke();

            // 垂直线
            state.previewCtx.beginPath();
            state.previewCtx.moveTo(mouseX, mouseY - 10);
            state.previewCtx.lineTo(mouseX, mouseY + 10);
            state.previewCtx.stroke();

            // 中心点
            state.previewCtx.beginPath();
            state.previewCtx.arc(mouseX, mouseY, 3, 0, Math.PI * 2);
            state.previewCtx.fillStyle = state.currentColor + '99';
            state.previewCtx.fill();
            state.previewCtx.strokeStyle = '#FFFFFF';
            state.previewCtx.lineWidth = 1;
            state.previewCtx.stroke();
        }
    }

    // 绘制套索点
    function drawLassoPoint(x, y) {
        if (!state.previewCtx) return;

        state.previewCtx.fillStyle = state.currentColor;
        state.previewCtx.beginPath();
        state.previewCtx.arc(x, y, 4, 0, Math.PI * 2);
        state.previewCtx.fill();
    }


    // ================ 其他功能 ================

    // 添加随机颜色
    function addRandomColor() {
        const colorNameInput = document.getElementById('colorNameInput');
        const colorName = colorNameInput ? colorNameInput.value.trim() : '';

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

    // 生成随机颜色
    function getDistinctRandomColor() {
        const avoidColor = '#ff0000';
        let attempts = 0;
        const maxAttempts = 100;

        while (attempts < maxAttempts) {
            const color = generateRandomColor();
            if (color === avoidColor) {
                attempts++;
                continue;
            }

            let isDistinct = true;
            for (const existingColor of state.colors) {
                if (existingColor.color === '#ff0000') continue;
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

        return generateRandomColor();
    }

    // 生成随机颜色（基础函数）
    function generateRandomColor() {
        const hue = Math.floor(Math.random() * 360);
        const saturation = 60 + Math.floor(Math.random() * 30);
        const lightness = 40 + Math.floor(Math.random() * 30);
        return hslToHex(hue, saturation, lightness);
    }

    // 计算两个颜色之间的距离
    function colorDistance(color1, color2) {
        const rgb1 = hexToRgb(color1);
        const rgb2 = hexToRgb(color2);

        if (!rgb1 || !rgb2) return 765;

        const dr = rgb1.r - rgb2.r;
        const dg = rgb1.g - rgb2.g;
        const db = rgb1.b - rgb2.b;

        return Math.sqrt(dr * dr + dg * dg + db * db);
    }

    // HEX转RGB
    function hexToRgb(hex) {
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
    function handleImageUpload(e, isRotate = false) {
        const file = e.target.files[0];
        if (!file || !drawingCanvas || !drawingCtx) return;

        if (!file.type.match('image.*')) {
            showToast('请选择图片文件');
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function (event) {
            const img = new Image();
            img.onload = function () {
                if (isRotate) {
                    // 竖图上传：旋转90度
                    loadRotatedImageToCanvas(img);
                } else {
                    // 直接加载图片到画布
                    loadImageToCanvas(img);
                }
                e.target.value = '';
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    // 添加旋转图片加载函数
    function loadRotatedImageToCanvas(img) {
        if (!drawingCanvas || !drawingCtx || !img) return;

        console.log('加载旋转图片，原始尺寸:', { width: img.width, height: img.height });

        // 创建临时canvas进行旋转
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        // 交换宽高（旋转90度）
        tempCanvas.width = img.height;
        tempCanvas.height = img.width;

        // 旋转并绘制图片
        tempCtx.translate(tempCanvas.width, 0);
        tempCtx.rotate(Math.PI / 2);
        tempCtx.drawImage(img, 0, 0);

        // 创建旋转后的图片
        const rotatedImg = new Image();
        rotatedImg.onload = function () {
            // 使用旋转后的图片加载到画布
            loadImageToCanvas(rotatedImg);
        };
        rotatedImg.src = tempCanvas.toDataURL();
    }


    // 加载图片到画布（锁定尺寸版）
    function loadImageToCanvas(img) {
        if (!drawingCanvas || !drawingCtx || !img) return;

        if (img.width === 0 || img.height === 0) {
            console.error('图片尺寸为0，无法加载');
            showToast('图片加载失败，请重试');
            return;
        }

        console.log('加载图片到画布，原始尺寸:', { width: img.width, height: img.height });

        // 清除现有状态（重新加载时重置）
        state.drawingHistory = [];
        state.undoStack = [];
        state.redoStack = [];

        // 保存图片和尺寸信息
        state.backgroundImage = img;
        state.originalImageSize = {
            width: img.width,
            height: img.height
        };

        // 获取画布容器
        const container = drawingCanvas.parentElement;
        if (!container) {
            console.error('容器未找到');
            return;
        }

        // 计算画布应显示的大小（基于图片和容器）
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        console.log('容器尺寸:', { containerWidth, containerHeight });

        // 计算保持宽高比的缩放比例（使图片适应容器，但不超过容器）
        const scaleX = containerWidth / img.width;
        const scaleY = containerHeight / img.height;
        const scale = Math.min(scaleX, scaleY);

        const drawWidth = Math.floor(img.width * scale);
        const drawHeight = Math.floor(img.height * scale);

        // 计算居中偏移量
        const offsetX = Math.floor((containerWidth - drawWidth) / 2);
        const offsetY = Math.floor((containerHeight - drawHeight) / 2);

        // 计算实际像素尺寸（考虑设备像素比）
        const pixelRatio = state.devicePixelRatio;
        const actualWidth = Math.max(Math.floor(drawWidth * pixelRatio), 1);
        const actualHeight = Math.max(Math.floor(drawHeight * pixelRatio), 1);

        console.log('调整后的尺寸:', {
            显示尺寸: { drawWidth, drawHeight },
            实际像素: { actualWidth, actualHeight },
            缩放比例: scale,
            偏移量: { offsetX, offsetY }
        });

        // 设置画布实际像素尺寸
        backgroundCanvas.width = actualWidth;
        backgroundCanvas.height = actualHeight;
        drawingCanvas.width = actualWidth;
        drawingCanvas.height = actualHeight;
        state.previewCanvas.width = actualWidth;
        state.previewCanvas.height = actualHeight;

        // 设置画布显示尺寸
        backgroundCanvas.style.width = `${drawWidth}px`;
        backgroundCanvas.style.height = `${drawHeight}px`;
        drawingCanvas.style.width = `${drawWidth}px`;
        drawingCanvas.style.height = `${drawHeight}px`;
        state.previewCanvas.style.width = `${drawWidth}px`;
        state.previewCanvas.style.height = `${drawHeight}px`;

        // 设置画布居中位置（绝对定位）
        backgroundCanvas.style.position = 'absolute';
        backgroundCanvas.style.left = `${offsetX}px`;
        backgroundCanvas.style.top = `${offsetY}px`;

        drawingCanvas.style.position = 'absolute';
        drawingCanvas.style.left = `${offsetX}px`;
        drawingCanvas.style.top = `${offsetY}px`;

        state.previewCanvas.style.position = 'absolute';
        state.previewCanvas.style.left = `${offsetX}px`;
        state.previewCanvas.style.top = `${offsetY}px`;

        // 保存尺寸和位置信息
        state.actualCanvasSize = { width: actualWidth, height: actualHeight };
        state.displayCanvasSize = { width: drawWidth, height: drawHeight };
        state.displayScale = drawWidth / actualWidth;
        state.imageOffset = { x: offsetX, y: offsetY };
        state.imageDrawSize = { width: drawWidth, height: drawHeight };
        state.imageScale = scale;

        // 标记为已锁定状态
        state.isImageFixed = true;
        state.isImageLocked = true; // 新增锁定标志

        // 清空所有画布层
        backgroundCtx.fillStyle = '#f8f9fa';
        backgroundCtx.fillRect(0, 0, actualWidth, actualHeight);

        drawingCtx.clearRect(0, 0, actualWidth, actualHeight);
        state.previewCtx.clearRect(0, 0, actualWidth, actualHeight);

        // 在背景画布上绘制图片（实际像素尺寸）
        backgroundCtx.drawImage(img, 0, 0, actualWidth, actualHeight);

        // 保存初始状态（只有背景图片）
        saveDrawingState();

        // 更新画布缩放信息（但标记为已锁定）
        updateCanvasScaling();

        showToast(`图片已加载，画布已锁定尺寸: ${drawWidth}×${drawHeight}px`);
    }
    // 更新画布缩放
    function updateCanvasScaling() {
        if (!drawingCanvas) return;

        const rect = drawingCanvas.getBoundingClientRect();

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
            const scaleX = rect.width > 0 ? drawingCanvas.width / rect.width : 1;
            const scaleY = rect.height > 0 ? drawingCanvas.height / rect.height : 1;

            state.canvasScale = {
                x: scaleX,
                y: scaleY,
                offsetX: rect.left,
                offsetY: rect.top,
                displayWidth: rect.width,
                displayHeight: rect.height,
                actualWidth: drawingCanvas.width,
                actualHeight: drawingCanvas.height,
                devicePixelRatio: state.devicePixelRatio
            };
        }

        console.log('更新画布缩放:', state.canvasScale);
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

    // 检测画布中使用的颜色
    function detectCanvasColors() {
        if (!drawingCanvas || !drawingCtx) return [];

        const imageData = drawingCtx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height);
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

    // 修改 saveImage 函数
    function saveImage() {
        if (!drawingCanvas || !backgroundCanvas) return;

        // 判断是否为竖图（高度大于宽度）
        const isPortrait = drawingCanvas.height > drawingCanvas.width;

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        if (isPortrait) {
            // 竖图：反向旋转90度
            tempCanvas.width = drawingCanvas.height;
            tempCanvas.height = drawingCanvas.width;

            tempCtx.translate(tempCanvas.width, 0);
            tempCtx.rotate(Math.PI / 2);
        } else {
            tempCanvas.width = drawingCanvas.width;
            tempCanvas.height = drawingCanvas.height;
        }

        // 先绘制背景层
        tempCtx.drawImage(backgroundCanvas, 0, 0);
        // 再绘制绘画层
        tempCtx.drawImage(drawingCanvas, 0, 0);

        // 添加水印
        tempCtx.font = '12px Arial';
        tempCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        tempCtx.textAlign = 'right';
        tempCtx.fillText('AI色绘设计助手', tempCanvas.width - 10, tempCanvas.height - 10);

        // 创建下载链接
        const link = document.createElement('a');
        link.download = `AI绘画_${new Date().getTime()}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('图片已保存' + (isPortrait ? '（已自动旋转为竖图）' : ''));
    }

    // 添加专门的竖图导出函数
    function saveRotatedImage() {
        if (!drawingCanvas || !backgroundCanvas) return;

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        // 强制按竖图处理：旋转90度
        tempCanvas.width = drawingCanvas.height;
        tempCanvas.height = drawingCanvas.width;

        // 旋转并绘制
        tempCtx.translate(0, tempCanvas.height);
        tempCtx.rotate(-Math.PI / 2); // 逆时针旋转90度，相当于顺时针旋转270度

        // 先绘制背景层
        tempCtx.drawImage(backgroundCanvas, 0, 0);
        // 再绘制绘画层
        tempCtx.drawImage(drawingCanvas, 0, 0);

        // 添加水印
        tempCtx.font = '12px Arial';
        tempCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        tempCtx.textAlign = 'right';
        tempCtx.fillText('AI色绘设计助手', tempCanvas.width - 10, tempCanvas.height - 10);

        // 创建下载链接
        const link = document.createElement('a');
        link.download = `AI绘画_竖图_${new Date().getTime()}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('竖图已导出');
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
            const switchPromptBtn = document.getElementById('switch-prompt');
            if (switchPromptBtn) {
                switchPromptBtn.click();
            }
        }, 1000);
    }

    // 显示提示
    function showToast(message) {
        const oldToast = document.querySelector('.toast');
        if (oldToast) oldToast.remove();

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

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 2000);
    }

    // ================ 事件监听器 ================

    function initEventListeners() {
        // 根据屏幕宽度隐藏/显示工具按钮
        function updateToolButtonsVisibility() {
            const eraserTool = document.getElementById('eraserTool');
            const lassoTool = document.getElementById('lassoTool');
            const lineTool = document.getElementById('lineTool');

            if (window.innerWidth <= 480) {
                // 小屏幕隐藏橡皮、套索、直线工具
                if (eraserTool) eraserTool.style.display = 'none';
                if (lassoTool) lassoTool.style.display = 'none';
                if (lineTool) lineTool.style.display = 'none';

                // 自动切换到画笔工具
                if (state.currentTool === 'eraser' || state.currentTool === 'lasso' || state.currentTool === 'line') {
                    setTool('brush');
                }
            } else {
                // 其他屏幕显示所有工具
                if (eraserTool) eraserTool.style.display = 'flex';
                if (lassoTool) lassoTool.style.display = 'flex';
                if (lineTool) lineTool.style.display = 'flex';
            }
        }

        // 初始更新一次
        updateToolButtonsVisibility();

        // 监听窗口大小变化
        window.addEventListener('resize', updateToolButtonsVisibility);

        // 工具按钮事件（保留原有代码）
        const brushTool = document.getElementById('brushTool');
        const eraserTool = document.getElementById('eraserTool');
        const lassoTool = document.getElementById('lassoTool');
        const lineTool = document.getElementById('lineTool');
        const clearTool = document.getElementById('clearTool');
        const undoTool = document.getElementById('undoTool');
        const redoTool = document.getElementById('redoTool');
        const saveImageBtn = document.getElementById('saveImageBtn');
        const rotateSaveBtn = document.getElementById('rotateSaveBtn');

        if (brushTool) brushTool.addEventListener('click', () => setTool('brush'));
        if (eraserTool) eraserTool.addEventListener('click', () => {
            if (window.innerWidth <= 480) {
                showToast('小屏幕下橡皮工具已禁用，请使用清除颜色');
            } else {
                setTool('eraser');
            }
        });
        if (lineTool) lineTool.addEventListener('click', () => {
            if (window.innerWidth <= 480) {
                showToast('小屏幕下直线工具已禁用');
            } else {
                setTool('line');
            }
        });
        if (lassoTool) lassoTool.addEventListener('click', () => {
            if (window.innerWidth <= 480) {
                showToast('小屏幕下套索工具已禁用');
            } else {
                setTool('lasso');
            }
        });
        if (clearTool) clearTool.addEventListener('click', clearCanvas);
        if (undoTool) undoTool.addEventListener('click', undo);
        if (redoTool) redoTool.addEventListener('click', redo);
        if (saveImageBtn) saveImageBtn.addEventListener('click', saveImage);
        if (rotateSaveBtn) {
            rotateSaveBtn.addEventListener('click', saveRotatedImage);
        }

        // 工具按钮
        if (window.innerWidth <= 480) {
            const lassoTool = document.getElementById('lassoTool');
            if (lassoTool) {
                lassoTool.style.display = 'none';
            }
        }
        if (brushTool) brushTool.addEventListener('click', () => setTool('brush'));
        if (eraserTool) eraserTool.addEventListener('click', () => setTool('eraser'));
        if (lineTool) lineTool.addEventListener('click', () => setTool('line'));
        if (lassoTool) lassoTool.addEventListener('click', () => setTool('lasso'));
        if (clearTool) clearTool.addEventListener('click', clearCanvas);
        if (undoTool) undoTool.addEventListener('click', undo);
        if (redoTool) redoTool.addEventListener('click', redo);
        if (saveImageBtn) saveImageBtn.addEventListener('click', saveImage);
        if (rotateSaveBtn) {
            rotateSaveBtn.addEventListener('click', saveRotatedImage);
        }
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
            imageUpload.addEventListener('change', (e) => handleImageUpload(e, false));
        }

        // 添加旋转上传按钮
        const rotateImportBtn = document.getElementById('rotateImportBtn');
        const rotateImageUpload = document.getElementById('rotateImageUpload');

        if (rotateImportBtn) {
            rotateImportBtn.addEventListener('click', () => {
                if (rotateImageUpload) {
                    rotateImageUpload.value = '';
                    rotateImageUpload.click();
                }
            });
        }

        if (rotateImageUpload) {
            rotateImageUpload.addEventListener('change', (e) => handleImageUpload(e, true));
        }

        // 提示词相关
        const generatePromptBtn = document.getElementById('generatePromptBtn');
        const copyPromptBtn = document.getElementById('copyPromptBtn');
        const savePromptBtn = document.getElementById('savePromptBtn');
        const optimizeBtn = document.getElementById('optimizeBtn');

        if (generatePromptBtn) generatePromptBtn.addEventListener('click', generatePrompt);
        if (copyPromptBtn) copyPromptBtn.addEventListener('click', copyPrompt);
        if (savePromptBtn) savePromptBtn.addEventListener('click', savePrompt);
        if (optimizeBtn) optimizeBtn.addEventListener('click', optimizeToAI);

        // 画布事件
        // 画布事件
        if (drawingCanvas) {
            // 鼠标事件
            drawingCanvas.addEventListener('mousedown', startDrawing);
            drawingCanvas.addEventListener('mousemove', draw);
            drawingCanvas.addEventListener('mouseup', stopDrawing);
            drawingCanvas.addEventListener('mouseleave', stopDrawing);
            drawingCanvas.addEventListener('dblclick', (e) => {
                if (state.currentTool === 'lasso' && state.isLassoActive) {
                    e.preventDefault();
                    // 双击完成套索（如果点数足够）
                    if (state.lassoPoints.length >= state.lassoMinPoints) {
                        completeLasso();
                    } else {
                        showToast(`至少需要${state.lassoMinPoints}个点才能完成套索，当前${state.lassoPoints.length}个`);
                    }
                }
            });

            // 触摸事件
            drawingCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
            drawingCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
            drawingCanvas.addEventListener('touchend', handleTouchEnd, { passive: false });
            drawingCanvas.addEventListener('touchcancel', handleTouchCancel, { passive: false });

            // 防止画布被拖动
            drawingCanvas.addEventListener('dragstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });

            // 防止右键菜单
            drawingCanvas.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        }

        // 键盘事件
        setupKeyboardEventListeners();

        window.addEventListener('resize', () => {
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }

            resizeTimeout = setTimeout(() => {
                console.log('窗口大小调整');

                // 更新工具按钮可见性
                updateToolButtonsVisibility();

                // 如果有固定图片
                if (state.backgroundImage && state.isImageFixed) {
                    // 如果图片已锁定，只重新居中，不改变画布尺寸
                    if (state.isImageLocked) {
                        centerCanvas();
                    } else {
                        // 否则重新调整画布尺寸
                        adjustCanvasForImage();
                    }
                } else {
                    // 否则重新初始化画布
                    initCanvas();
                }

                // 更新画布缩放信息
                updateCanvasScaling();
            }, 250);
        });
    }
    // 在文件末尾添加以下函数（在 initEventListeners 函数之后）：

    // 居中画布（不改变尺寸）
    function centerCanvas() {
        if (!drawingCanvas || !drawingCanvas.parentElement) return;

        const container = drawingCanvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // 使用已保存的画布显示尺寸
        const drawWidth = state.displayCanvasSize.width;
        const drawHeight = state.displayCanvasSize.height;

        // 计算新的居中偏移量
        const offsetX = Math.floor((containerWidth - drawWidth) / 2);
        const offsetY = Math.floor((containerHeight - drawHeight) / 2);

        // 更新所有画布的位置
        backgroundCanvas.style.left = `${offsetX}px`;
        backgroundCanvas.style.top = `${offsetY}px`;

        drawingCanvas.style.left = `${offsetX}px`;
        drawingCanvas.style.top = `${offsetY}px`;

        if (state.previewCanvas) {
            state.previewCanvas.style.left = `${offsetX}px`;
            state.previewCanvas.style.top = `${offsetY}px`;
        }

        // 更新偏移量信息
        state.imageOffset = { x: offsetX, y: offsetY };

        console.log('画布重新居中:', {
            容器尺寸: { containerWidth, containerHeight },
            画布尺寸: { drawWidth, drawHeight },
            新偏移量: { offsetX, offsetY }
        });
    }

    function setupKeyboardEventListeners() {
        window.addEventListener('keydown', (e) => {
            // 快捷键定义
            const key = e.key.toLowerCase();

            // 工具快捷键
            if (key === 'b') {
                e.preventDefault();
                setTool('brush');
                showToast('切换到画笔工具 (B)');
            } else if (key === 'o') {
                e.preventDefault();
                setTool('lasso');
                showToast('切换到套索工具 (O)');
            } else if (key === 'l') {
                e.preventDefault();
                setTool('line');
                showToast('切换到直线工具 (L)');
            } else if (key === 'e') {
                e.preventDefault();
                setTool('eraser');
                showToast('切换到橡皮工具 (E)');
            } else if (key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
                e.preventDefault();
                undo();
                showToast('撤销 (Ctrl+Z)');
            } else if ((key === 'y' && (e.ctrlKey || e.metaKey)) || (key === 'z' && e.shiftKey && (e.ctrlKey || e.metaKey))) {
                e.preventDefault();
                redo();
                showToast('重做 (Ctrl+Y / Ctrl+Shift+Z)');
            }

            // Shift键：直线模式（仅对画笔和橡皮有效）
            if (e.key === 'Shift') {
                state.isShiftPressed = true;
            }

            // 套索工具快捷键
            if (state.currentTool === 'lasso' && state.isLassoActive) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    completeLasso();
                    showToast('完成套索 (Enter)');
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelLasso();
                    showToast('取消套索 (ESC)');
                } else if (e.key === 'Backspace' || e.key === 'Delete') {
                    e.preventDefault();
                    // 删除最后一个点
                    if (state.lassoPoints.length > 0) {
                        state.lassoPoints.pop();
                        drawLassoPreview();
                        showToast(`已删除最后一点，剩余${state.lassoPoints.length}个点`);
                    }
                }
            }

            // 画笔大小调整
            if (e.key === 'ArrowUp' || e.key === ']') {
                e.preventDefault();
                if (state.brushSize < 100) {
                    state.brushSize += 1;
                    updateBrushPreview();
                    showToast(`画笔大小: ${state.brushSize}px (↑/])`);
                }
            } else if (e.key === 'ArrowDown' || e.key === '[') {
                e.preventDefault();
                if (state.brushSize > 1) {
                    state.brushSize -= 1;
                    updateBrushPreview();
                    showToast(`画笔大小: ${state.brushSize}px (↓/[)`);
                }
            }

            // 直线模式快捷键
            if (e.key === 'Shift') {
                state.isShiftPressed = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            // Shift键释放
            if (e.key === 'Shift') {
                state.isShiftPressed = false;
                if (!state.currentTool === 'line') {
                    state.lineStartPoint = null;
                    state.isDrawingLine = false;
                }
            }
        });
    }
    // 触摸事件处理
    function handleTouchStart(e) {
        if (e.touches.length === 1) {
            e.preventDefault();
            e.stopPropagation();

            const touch = e.touches[0];
            lastTouchY = touch.clientY;
            isTouchMoving = false;
            state.touchIdentifier = touch.identifier;
            state.isTouchActive = true;

            const { x, y } = getCanvasCoordinates(e);
            startDrawing(e);

            drawingCanvas.style.touchAction = 'none';
        }
    }

    function handleTouchMove(e) {
        if (e.touches.length === 1) {
            e.preventDefault();
            e.stopPropagation();

            const touch = e.touches[0];
            const currentY = touch.clientY;
            const deltaY = Math.abs(currentY - lastTouchY);

            if (deltaY > 10 && !state.isDrawing) {
                isTouchMoving = true;
            }

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
        
        .canvas-layer {
            position: absolute;
            top: 0;
            left: 0;
        }
        
        .canvas-container {
            position: relative;
            overflow: hidden;
        }
        
        #cursorCoordinates {
            position: absolute;
            bottom: 5px;
            right: 5px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
            z-index: 10;
            pointer-events: none;
        }
        
        @media (max-width: 480px) {
            .canvas-container {
                max-height: 50vh;
            }
            
            .tool-btn {
                min-width: 60px !important;
                padding: 8px 4px !important;
            }
            
            .tool-btn .text-xs {
                font-size: 10px !important;
            }
        }
    `;
    document.head.appendChild(style);
    // ================ 新增辅助函数 ================


    // 清除预览（只清除预览层）
    function clearPreview() {
        if (state.previewCtx && state.previewCanvas) {
            state.previewCtx.clearRect(0, 0, state.previewCanvas.width, state.previewCanvas.height);
        }
    }
    // 在画布容器中添加光标坐标显示
    function addCursorCoordinatesDisplay() {
        const canvasContainer = document.querySelector('.canvas-container');
        if (canvasContainer && !document.getElementById('cursorCoordinates')) {
            const coordsElement = document.createElement('div');
            coordsElement.id = 'cursorCoordinates';
            coordsElement.textContent = '(0, 0)';
            canvasContainer.appendChild(coordsElement);
        }
    }

    // 自动初始化
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(() => {
            initializePaintSystem();
            setTimeout(addCursorCoordinatesDisplay, 100);
        }, 100);
    } else {
        document.addEventListener('DOMContentLoaded', function () {
            setTimeout(() => {
                initializePaintSystem();
                setTimeout(addCursorCoordinatesDisplay, 100);
            }, 100);
        });
    }
})();
