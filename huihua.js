  
(function() {
    'use strict';
    
    // 确保函数在全局作用域可用
    window.initializePaintSystem = initializePaintSystem;
    
    // 应用状态管理
    let state = null;
    let canvas = null;
    let ctx = null;
    let isSystemInitialized = false;
    let lastTouchY = 0;
    let isTouchMoving = false;
    let resizeTimeout = null; // 保留这行

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
            undoStack: [],
            redoStack: [],
            maxUndoSteps: 5, // 最大撤销/重做步数
            isImageFixed: false       // 新增：图片是否已固定
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
            
          // 在 initializePaintSystem 函数中找到初始化画布的部分
        // 设置画布初始状态
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

// 确保画布在容器中居中
const container = canvas.parentElement;
if (container) {
    container.style.display = 'flex';
    container.style.justifyContent = 'center';
    container.style.alignItems = 'center';
}
            
            // 更新画笔预览
            updateBrushPreview();
            
            // 初始绘制
            saveDrawingState();
            
            isSystemInitialized = true;
            console.log('色绘设计系统初始化完成');
        } catch (error) {
            console.error('色绘设计系统初始化失败:', error);
            showToast('系统初始化失败，请刷新页面');
        }
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
    <div class="color-preview" style="background: ${colorObj.color};">
        ${colorObj.name === '清除' ? '<i class="fas fa-times text-white text-xs"></i>' : ''}
    </div>
    <span class="text-xs whitespace-nowrap" style="${colorObj.name === '清除' ? 'color: #ff9500' : ''}">${colorObj.name}</span>
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
  // 修改 saveDrawingState 函数：
function saveDrawingState() {
    if (!canvas || !ctx) return;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    state.drawingHistory.push(imageData);
    
    if (state.drawingHistory.length > state.maxHistorySteps) {
        state.drawingHistory.shift();
    }
    
    // 保存到撤销栈（自动清空重做栈）
    state.undoStack.push(imageData);
    if (state.undoStack.length > state.maxUndoSteps) {
        state.undoStack.shift();
    }
    state.redoStack = []; // 新操作后清空重做栈
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
    
// 获取画布坐标
function getCanvasCoordinates(e) {
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if (e.type.includes('touch')) {
        // 找到正确的触摸点
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
    
    // 确保坐标有效
    if (clientX === undefined || clientY === undefined) {
        return { x: state.lastX, y: state.lastY };
    }
    
    // 计算坐标（不使用 canvasScale，直接计算）
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    
    return { 
        x: Math.max(0, Math.min(x, canvas.width)),
        y: Math.max(0, Math.min(y, canvas.height))
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
    
// 初始化画布
function initCanvas() {
    if (!canvas) return;
    
    const container = canvas.parentElement;
    if (!container) return;
    
    // 获取容器尺寸
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // 设置画布尺寸（保持比例，最大宽度为容器宽度）
    const maxWidth = containerWidth - 8; // 减去边框和padding
    const aspectRatio = 4/3; // 默认宽高比
    
    let canvasWidth = maxWidth;
    let canvasHeight = canvasWidth / aspectRatio;
    
    // 如果有背景图片，使用图片比例
    if (state.backgroundImage) {
        const img = state.backgroundImage;
        const imgAspectRatio = img.width / img.height;
        canvasHeight = canvasWidth / imgAspectRatio;
    }
    
    // 设置画布像素尺寸
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // 设置CSS尺寸（用于显示）
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    
    // 设置画布内容
    if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 如果有背景图片，绘制它
        if (state.backgroundImage) {
            const img = state.backgroundImage;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
    }
    
    // 居中画布
    canvas.style.margin = '0 auto';
    canvas.style.display = 'block';
}

// 2. 添加图片处理函数 - 调整图片长边为1024
function resizeImageToMax1024(img) {
    return new Promise((resolve) => {
        const maxDimension = 1024;
        let width = img.width;
        let height = img.height;
        
        // 如果长边大于1024，按比例缩放
        if (width > maxDimension || height > maxDimension) {
            const ratio = Math.min(maxDimension / width, maxDimension / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
        }
        
        // 创建临时画布进行缩放
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = width;
        tempCanvas.height = height;
        
        // 绘制缩放后的图片
        tempCtx.drawImage(img, 0, 0, width, height);
        
        // 创建新图片对象
        const resizedImg = new Image();
        resizedImg.onload = () => resolve(resizedImg);
        resizedImg.src = tempCanvas.toDataURL('image/png');
    });
}

function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file || !canvas || !ctx) return;
    
    if (!file.type.match('image.*')) {
        showToast('请选择图片文件');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const container = canvas.parentElement;
            const maxWidth = container ? container.clientWidth - 8 : 800;
            
            // 计算新的画布尺寸（保持图片比例）
            let newWidth = img.width;
            let newHeight = img.height;
            
            // 如果图片宽度超过最大宽度，按比例缩放
            if (newWidth > maxWidth) {
                const scale = maxWidth / newWidth;
                newWidth = maxWidth;
                newHeight = Math.floor(newHeight * scale);
            }
            
            // 设置画布新尺寸
            canvas.width = newWidth;
            canvas.height = newHeight;
            
            // 设置CSS尺寸
            canvas.style.width = newWidth + 'px';
            canvas.style.height = newHeight + 'px';
            
            // 清除画布并绘制图片
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // 保存图片信息和状态
            state.backgroundImage = img;
            state.originalImageSize = {
                width: img.width,
                height: img.height
            };
            state.imageScale = newWidth / img.width;
            state.isImageFixed = true;
            
            // 清空历史记录
            state.drawingHistory = [];
            state.undoStack = [];
            state.redoStack = [];
            
            // 保存当前状态
            saveDrawingState();
            
            showToast('图片上传成功');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// 4. 修改竖屏图片上传函数
function handleRotateImageUpload(e) {
    const file = e.target.files[0];
    if (!file || !canvas || !ctx) return;
    
    if (!file.type.match('image.*')) {
        showToast('请选择图片文件');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async function(event) {
        const img = new Image();
        img.onload = async function() {
            // 先旋转90度
            const rotatedImg = await rotateImage90(img);
            // 再处理图片尺寸
            const resizedImg = await resizeImageToMax1024(rotatedImg);
            loadImageToCanvas(resizedImg);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// 5. 添加图片旋转90度函数
function rotateImage90(img) {
    return new Promise((resolve) => {
        // 创建临时画布进行旋转
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        // 交换宽高以旋转90度
        tempCanvas.width = img.height;
        tempCanvas.height = img.width;
        
        // 旋转90度
        tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
        tempCtx.rotate(Math.PI / 2);
        
        // 绘制图像
        tempCtx.drawImage(img, -img.width / 2, -img.height / 2);
        
        // 创建旋转后的图片
        const rotatedImg = new Image();
        rotatedImg.onload = () => resolve(rotatedImg);
        rotatedImg.src = tempCanvas.toDataURL('image/png');
    });
}

// 6. 修改 loadImageToCanvas 函数
function loadImageToCanvas(img) {
    if (!canvas || !ctx) return;
    
    // 设置画布尺寸等于图片尺寸（保持比例）
    canvas.width = img.width;
    canvas.height = img.height;
    
    // 更新容器高度以适应图片
    const container = canvas.parentElement;
    if (container) {
        container.style.height = `${canvas.height}px`;
    }
    
    // 清除画布并绘制图片（完整显示，不变形）
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    // 保存图片信息和状态
    state.backgroundImage = img;
    state.imageScale = 1; // 不再需要缩放，因为画布尺寸等于图片尺寸
    state.originalImageSize = {
        width: img.width,
        height: img.height
    };
    state.isImageFixed = true; // 标记为已固定，不随窗口变化
    
    // 清空历史记录，只保留当前背景
    state.drawingHistory = [];
    state.undoStack = [];
    state.redoStack = [];
    
    // 保存当前状态（只有背景图片）
    saveDrawingState();
    
    // 更新画布缩放信息
    updateCanvasScaling();
    
    // 设置画布样式防止滚动
    canvas.style.touchAction = 'none';
    canvas.style.userSelect = 'none';
    canvas.style.webkitUserSelect = 'none';
    
    showToast(`图片已导入，画布尺寸调整为${Math.round(canvas.width)}×${Math.round(canvas.height)}px`);
}

// 7. 修改 updateCanvasScaling 函数 - 只更新坐标计算，不改变画布尺寸
function updateCanvasScaling() {
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    
    // 确保缩放比例不为0
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
    
    state.canvasScale = {
        x: scaleX,
        y: scaleY,
        offsetX: rect.left,
        offsetY: rect.top,
        width: rect.width,
        height: rect.height
    };
    
    // 保持画布的CSS尺寸匹配实际像素尺寸
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';
    
    console.log('更新画布缩放:', state.canvasScale);
}

// 窗口调整大小事件处理
window.addEventListener('resize', () => {
    if (resizeTimeout) {
        clearTimeout(resizeTimeout);
    }
    
    resizeTimeout = setTimeout(() => {
        console.log('窗口大小调整，重新初始化画布');
        
        // 如果画布已初始化，重新设置画布尺寸
        if (canvas && ctx) {
            const container = canvas.parentElement;
            if (container) {
                const containerWidth = container.clientWidth;
                const maxWidth = containerWidth - 8;
                
                // 如果有背景图片，保持图片比例
                if (state.backgroundImage) {
                    const img = state.backgroundImage;
                    const aspectRatio = img.width / img.height;
                    
                    let newWidth = maxWidth;
                    let newHeight = newWidth / aspectRatio;
                    
                    // 设置画布新尺寸
                    canvas.width = newWidth;
                    canvas.height = newHeight;
                    
                    // 设置CSS尺寸
                    canvas.style.width = newWidth + 'px';
                    canvas.style.height = newHeight + 'px';
                    
                    // 重新绘制背景图片
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    // 如果有绘画历史，重新绘制
                    if (state.drawingHistory.length > 0) {
                        const lastState = state.drawingHistory[state.drawingHistory.length - 1];
                        ctx.putImageData(lastState, 0, 0);
                    }
                } else {
                    // 没有背景图片，保持当前比例
                    const currentAspectRatio = canvas.width / canvas.height;
                    let newWidth = maxWidth;
                    let newHeight = newWidth / currentAspectRatio;
                    
                    // 设置画布新尺寸
                    canvas.width = newWidth;
                    canvas.height = newHeight;
                    
                    // 设置CSS尺寸
                    canvas.style.width = newWidth + 'px';
                    canvas.style.height = newHeight + 'px';
                    
                    // 重新绘制白色背景
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    // 如果有绘画历史，重新绘制
                    if (state.drawingHistory.length > 0) {
                        const lastState = state.drawingHistory[state.drawingHistory.length - 1];
                        ctx.putImageData(lastState, 0, 0);
                    }
                }
                
                // 居中画布
                canvas.style.margin = '0 auto';
                canvas.style.display = 'block';
            }
        }
    }, 300);
});

// 9. 修改 resizeCanvasToFitImage 函数（如果需要的话，可以简化或移除）
function resizeCanvasToFitImage(img) {
    if (!canvas) return { width: 0, height: 0 };
    
    // 如果图片已固定，使用当前画布尺寸
    if (state.isImageFixed) {
        return { width: canvas.width, height: canvas.height };
    }
    
    // 这里可以保留原始的逻辑，但不再被使用
    return {
        width: Math.min(img.width, 1024),
        height: Math.min(img.height, 1024)
    };
}
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
                if (imageUpload) imageUpload.click();
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
        
        // 触摸事件 - 使用被动监听器防止滚动
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
        

    }
    
// 触摸事件处理函数 - 替换现有的四个函数
function handleTouchStart(e) {
    if (e.touches.length === 1) {
        // 只阻止默认行为，不调用 preventDefault()
        // 记录触摸标识符
        state.touchIdentifier = e.touches[0].identifier;
        state.isTouchActive = true;
        
        // 记录初始触摸位置
        lastTouchY = e.touches[0].clientY;
        isTouchMoving = false;
        
        // 开始绘图
        startDrawing(e);
    }
}

function handleTouchMove(e) {
    if (state.isTouchActive && state.touchIdentifier !== null) {
        // 找到对应的触摸点
        let touch = null;
        for (let i = 0; i < e.touches.length; i++) {
            if (e.touches[i].identifier === state.touchIdentifier) {
                touch = e.touches[i];
                break;
            }
        }
        
        if (touch) {
            // 检测滚动行为
            const currentY = touch.clientY;
            const deltaY = Math.abs(currentY - lastTouchY);
            
            if (deltaY > 10) { // 增加到10px阈值
                isTouchMoving = true;
            }
            
            // 如果不是明显的滚动行为，则绘图
            if (!isTouchMoving || state.isDrawing) {
                draw(e);
                lastTouchY = currentY;
            }
        }
    }
}

function handleTouchEnd(e) {
    if (state.isTouchActive) {
        stopDrawing(e);
        state.isTouchActive = false;
        state.touchIdentifier = null;
        isTouchMoving = false;
    }
}

function handleTouchCancel(e) {
    if (state.isTouchActive) {
        stopDrawing(e);
        state.isTouchActive = false;
        state.touchIdentifier = null;
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
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initializePaintSystem, 100);
        });
    }
})();