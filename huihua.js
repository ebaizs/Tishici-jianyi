// huihua.js - 色绘设计系统
(function() {
    'use strict';
    
    // 确保函数在全局作用域可用
    window.initializePaintSystem = initializePaintSystem;
    
    // 应用状态管理
    let state = null;
    let canvas = null;
    let ctx = null;
    let isSystemInitialized = false;
    
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
            currentColor: '#000000',
            brushSize: 20,
            isDrawing: false,
            lastX: 0,
            lastY: 0,
            colors: [
                { name: '清除', color: '#000000' }
            ],
            drawingHistory: [],
            maxHistorySteps: 20,
            backgroundImage: null,
            imageScale: 1,
            undoStack: [],
            redoStack: [],
            originalImageSize: { width: 0, height: 0 }
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
            
            // 设置画布初始状态
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
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
    
 // 初始化画布
function initCanvas() {
    if (!canvas) return;
    
    // 保存当前画布内容
    let imageData = null;
    if (ctx) {
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
    
    // 确保画布尺寸正确
    const container = canvas.parentElement;
    if (!container) return;
    
    const maxWidth = container.clientWidth - 4;
    const maxHeight = maxWidth * 0.75;
    
    const oldWidth = canvas.width;
    const oldHeight = canvas.height;
    
    // 只有尺寸确实发生变化时才重新设置
    if (Math.abs(oldWidth - maxWidth) > 2 || Math.abs(oldHeight - maxHeight) > 2) {
        console.log(`调整画布尺寸: ${oldWidth}x${oldHeight} -> ${maxWidth}x${maxHeight}`);
        
        // 创建临时画布保存内容
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = oldWidth;
        tempCanvas.height = oldHeight;
        
        if (imageData) {
            tempCtx.putImageData(imageData, 0, 0);
        }
        
        // 设置新尺寸
        canvas.width = maxWidth;
        canvas.height = maxHeight;
        
        // 恢复画布内容
        if (ctx && imageData) {
            ctx.save();
            
            if (state.backgroundImage) {
                // 如果有背景图片，重新绘制
                const img = state.backgroundImage;
                const isLargeScreen = window.innerWidth >= 1024;
                const shouldRotate = state.originalImageSize.width > state.originalImageSize.height && !isLargeScreen;
                const { width, height } = resizeCanvasToFitImage(img, shouldRotate);
                
                if (shouldRotate) {
                    ctx.translate(canvas.width / 2, canvas.height / 2);
                    ctx.rotate(Math.PI / 2);
                    ctx.drawImage(img, -height / 2, -width / 2, height, width);
                    ctx.restore();
                } else {
                    const x = (canvas.width - width) / 2;
                    const y = (canvas.height - height) / 2;
                    ctx.drawImage(img, x, y, width, height);
                }
            } else {
                // 如果没有背景图片，用白色填充
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            // 绘制之前的绘制内容
            if (state && state.drawingHistory && state.drawingHistory.length > 0) {
                const lastState = state.drawingHistory[state.drawingHistory.length - 1];
                ctx.putImageData(lastState, 0, 0);
            }
            
            ctx.restore();
        }
    }
    
    // 设置画布样式
    if (ctx) {
        ctx.lineCap = 'square';
        ctx.lineJoin = 'miter';
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
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
                <div class="flex items-center gap-2">
                    <div class="color-preview" style="background: ${colorObj.color};">
                        ${colorObj.name === '清除' ? '<i class="fas fa-times text-white text-xs"></i>' : ''}
                    </div>
                    <span class="text-xs whitespace-nowrap" style="${colorObj.name === '清除' ? 'color: #ff9500' : ''}">${colorObj.name}</span>
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
    
    // 保存绘图状态
    function saveDrawingState() {
        if (!canvas || !ctx) return;
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        state.drawingHistory.push(imageData);
        
        if (state.drawingHistory.length > state.maxHistorySteps) {
            state.drawingHistory.shift();
        }
    }
    
    // 开始绘图
function startDrawing(e) {
    // 阻止默认行为，防止滚动
    if (e.type.includes('touch')) {
        e.preventDefault();
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
    if (state.isDrawing && ctx) {
        if (e.type.includes('touch')) {
            e.preventDefault();
        }
        state.isDrawing = false;
        ctx.beginPath();
    }
}
    
    // 在画布上绘制
    function drawOnCanvas(x, y) {
        if (!ctx) return;
        
        if (state.currentColor === '#000000') {
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
    
    // 停止绘图
    function stopDrawing() {
        if (state.isDrawing && ctx) {
            state.isDrawing = false;
            ctx.beginPath();
        }
    }
    
    // 获取画布坐标
    function getCanvasCoordinates(e) {
        if (!canvas) return { x: 0, y: 0 };
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        let clientX, clientY;
        
        if (e.type.includes('touch')) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;
        
        return { x, y };
    }
    
    // 清空画布
    function clearCanvas() {
        if (!canvas || !ctx) return;
        
        if (confirm('确定要清空画布吗？')) {
            if (state.backgroundImage) {
                const img = state.backgroundImage;
                const { width, height } = calculateImageSize(img);
                
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                const x = (canvas.width - width) / 2;
                const y = (canvas.height - height) / 2;
                ctx.drawImage(img, x, y, width, height);
            } else {
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            state.drawingHistory = [];
            showToast('画布已清空');
            saveDrawingState();
        }
    }
    
    // 计算图片尺寸
    function calculateImageSize(img) {
        const maxSize = 1024;
        let width = img.width;
        let height = img.height;
        
        let shouldRotate = width > height;
        
        if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
        }
        
        if (shouldRotate) {
            [width, height] = [height, width];
        }
        
        return { width, height, shouldRotate };
    }
    
// 调整画布大小以适应图片（支持旋转）
function resizeCanvasToFitImage(img, shouldRotate = false) {
    if (!canvas) return { width: 0, height: 0 };
    
    const container = canvas.parentElement;
    const maxWidth = container.clientWidth - 4;
    const maxHeight = maxWidth * 0.75;
    
    state.originalImageSize = { width: img.width, height: img.height };
    
    let width = img.width;
    let height = img.height;
    
    // 如果需要旋转，交换宽高
    if (shouldRotate) {
        [width, height] = [height, width];
    }
    
    // 简单缩放
    if (width > 1024 || height > 1024) {
        const ratio = Math.min(1024 / width, 1024 / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
    }
    
    if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
    }
    
    if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
    }
    
    // 设置画布尺寸
    canvas.width = width;
    canvas.height = height;
    
    return { width, height };
}
    
    // 撤销操作
    function undo() {
        if (!ctx) return;
        
        if (state.drawingHistory.length > 0) {
            const lastState = state.drawingHistory.pop();
            ctx.putImageData(lastState, 0, 0);
            showToast('已撤销上一步操作');
        } else {
            showToast('没有可撤销的操作');
        }
    }
    
    // 添加随机颜色
    function addRandomColor() {
        const colorNameInput = document.getElementById('colorNameInput');
        const colorName = colorNameInput ? colorNameInput.value.trim() : `颜色${state.colors.length}`;
        const randomColor = getRandomColor();
        
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
    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }
 // 处理图片上传
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
            // 检测屏幕尺寸，大屏不旋转
            const isLargeScreen = window.innerWidth >= 1024;
            const shouldRotate = img.width > img.height && !isLargeScreen;
            
            // 根据是否需要旋转来调整画布大小
            const { width, height } = resizeCanvasToFitImage(img, shouldRotate);
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (shouldRotate) {
                // 小屏时横屏图片旋转
                ctx.save();
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate(Math.PI / 2);
                ctx.drawImage(img, -height / 2, -width / 2, height, width);
                ctx.restore();
                
                showToast('图片上传成功，已自动缩放并旋转（小屏优化）');
            } else {
                // 大屏时不旋转，保持原图方向
                const x = (canvas.width - width) / 2;
                const y = (canvas.height - height) / 2;
                ctx.drawImage(img, x, y, width, height);
                
                showToast('图片上传成功，已自动缩放' + (width > height ? '（保持横屏）' : ''));
            }
            
            state.backgroundImage = img;
            state.imageScale = width / img.width;
            
            saveDrawingState();
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
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
        
        const clearColor = usedColors.find(c => c.color === '#000000' || c.name === '清除');
        if (clearColor) {
            colorDescriptions.push('将#000000颜色区域的物体清除');
        }
        
        usedColors.forEach(colorObj => {
            if (colorObj.color !== '#000000' && colorObj.name !== '清除') {
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
        state.currentColor = '#000000';
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
    
    // 初始化事件监听器
    function initEventListeners() {
        // 工具按钮
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
        
    // 触摸事件
if (canvas) {
    // 阻止画布区域的默认触摸行为，防止滚动
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startDrawing(e);
    }, { passive: false });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        draw(e);
    }, { passive: false });
    
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        stopDrawing(e);
    }, { passive: false });
    
    canvas.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        stopDrawing(e);
    }, { passive: false });
}

// 阻止画布区域的默认触摸行为，防止滚动
canvas.addEventListener('touchstart', function(e) {
    if (e.target === canvas) {
        e.preventDefault();
    }
}, { passive: false });

canvas.addEventListener('touchmove', function(e) {
    if (e.target === canvas) {
        e.preventDefault();
    }
}, { passive: false });
        
// 窗口调整大小事件 - 添加防抖
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        console.log('窗口大小调整，重新初始化画布');
        initCanvas();
        
        if (state && state.backgroundImage) {
            const img = state.backgroundImage;
            // 检测屏幕尺寸，大屏不旋转
            const isLargeScreen = window.innerWidth >= 1024;
            const shouldRotate = state.originalImageSize.width > state.originalImageSize.height && !isLargeScreen;
            
            // 根据是否需要旋转来调整画布大小
            const { width, height } = resizeCanvasToFitImage(img, shouldRotate);
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (shouldRotate) {
                // 小屏时横屏图片旋转
                ctx.save();
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate(Math.PI / 2);
                ctx.drawImage(img, -height / 2, -width / 2, height, width);
                ctx.restore();
            } else {
                // 大屏时不旋转，保持原图方向
                const x = (canvas.width - width) / 2;
                const y = (canvas.height - height) / 2;
                ctx.drawImage(img, x, y, width, height);
            }
            
            saveDrawingState();
        }
    }, 250); // 250ms防抖
});
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