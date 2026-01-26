// tishici.js - 提示词生成系统
(function () {
    'use strict';

    // 确保函数在全局作用域可用
    window.initializePromptSystem = initializePromptSystem;

    // 全局变量
    let currentSection = 'home';
    let isSystemInitialized = false;

    function initializePromptSystem() {
        console.log('初始化提示词生成系统');

        // 防止重复初始化
        if (isSystemInitialized) {
            console.log('系统已经初始化');
            return;
        }

        // 等待词库加载
        if (typeof wordBank === 'undefined') {
            console.log('等待词库加载...');
            setTimeout(initializePromptSystem, 100);
            return;
        }

        // 初始化界面
        try {
            initializeUI();
            setupDynamicLoaders();
            bindEvents();
            renderHistory();

            isSystemInitialized = true;
            console.log('提示词生成系统初始化完成');
        } catch (error) {
            console.error('提示词系统初始化失败:', error);
            showNotification('提示词系统初始化失败，请刷新页面', 'error');
        }
    }

    // 初始化界面
    function initializeUI() {
        console.log('初始化UI界面');

        // 填充所有下拉菜单
        const sections = ['home', 'public', 'architecture', 'landscape', 'art'];

        sections.forEach(section => {
            // 填充风格选项
            const styleSelect = document.getElementById(`${section}-style`);
            if (styleSelect) {
                styleSelect.innerHTML = '<option value="">请选择风格</option>';
                if (wordBank.styles && wordBank.styles[section]) {
                    wordBank.styles[section].forEach(item => {
                        const option = document.createElement('option');
                        const parts = item.split("==");
                        const displayText = parts[0];
                        const actualValue = parts[1] || parts[0];
                        option.value = actualValue;
                        option.textContent = displayText;
                        styleSelect.appendChild(option);
                    });
                }
            }

            // 填充空间选项
            const spaceSelect = document.getElementById(`${section}-space`);
            if (spaceSelect) {
                spaceSelect.innerHTML = '<option value="">请选择空间</option>';
                if (wordBank.spaces && wordBank.spaces[section]) {
                    wordBank.spaces[section].forEach(space => {
                        const option = document.createElement('option');
                        option.value = space;
                        option.textContent = space;
                        spaceSelect.appendChild(option);
                    });
                }
            }

            // 填充灯光选项
            const lightingSelect = document.getElementById(`${section}-lighting`);
            if (lightingSelect) {
                lightingSelect.innerHTML = '<option value="">请选择灯光</option>';
                if (wordBank.lighting && wordBank.lighting[section]) {
                    wordBank.lighting[section].forEach(light => {
                        const option = document.createElement('option');
                        option.value = light;
                        option.textContent = light;
                        lightingSelect.appendChild(option);
                    });
                }
            }

            // 填充视角选项
            const perspectiveSelect = document.getElementById(`${section}-perspective`);
            if (perspectiveSelect) {
                perspectiveSelect.innerHTML = '<option value="">请选择视角</option>';
                if (wordBank.perspectives) {
                    wordBank.perspectives.forEach(perspective => {
                        const option = document.createElement('option');
                        option.value = perspective;
                        option.textContent = perspective;
                        perspectiveSelect.appendChild(option);
                    });
                }
            }

            // 填充功能选项
            const sceneSelect = document.getElementById(`${section}-scene`);
            if (sceneSelect) {
                sceneSelect.innerHTML = '<option value="">请选择功能</option>';
                const sceneOptions = (section === 'art') ? gongneng : indoorGongneng;
                if (sceneOptions) {
                    sceneOptions.forEach(item => {
                        const option = document.createElement('option');
                        const parts = item.split("==");
                        const displayText = parts[0];
                        const actualValue = parts[1] || parts[0];
                        option.value = actualValue;
                        option.textContent = displayText;
                        sceneSelect.appendChild(option);
                    });
                }
            }

            // 填充画风选项
            const lensSelect = document.getElementById(`${section}-lens`);
            if (lensSelect) {
                lensSelect.innerHTML = '<option value="">请选择画风</option>';
                if (wordBank.lenses) {
                    wordBank.lenses.forEach(lens => {
                        const option = document.createElement('option');
                        option.value = lens;
                        option.textContent = lens;
                        lensSelect.appendChild(option);
                    });
                }
            }
        });

        // 初始化其它要求选项
        initializeSpecialRequirements();

        // 选项卡切换
        setupTabSwitching();
        // 检查是否有从导出页面传递的编辑记录
        checkForEditRecord();

    }

    // 设置选项卡切换
    function setupTabSwitching() {
        const tabs = document.querySelectorAll('.tab');
        const panels = document.querySelectorAll('.panel');

        tabs.forEach(tab => {
            // 移除旧的事件监听器
            tab.addEventListener('click', handleTabClick);
        });

        function handleTabClick() {
            if (this.classList.contains('active')) return;

            // 更新选项卡状态
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));

            this.classList.add('active');
            const panelId = `${this.dataset.panel}-panel`;
            const targetPanel = document.getElementById(panelId);

            if (targetPanel) {
                targetPanel.classList.add('active');
                currentSection = this.dataset.panel;

                // 清空动态选项的占位符
                clearDynamicOptions(currentSection);
            }
        }
    }

    // 设置动态加载器
    function setupDynamicLoaders() {
        const sections = ['home', 'public', 'architecture', 'landscape', 'art'];

        // 定义各板块的默认风格
        const defaultStyles = {
            'home': '现代简约风格',
            'public': '商务现代风格',    // 更新为公装默认风格
            'architecture': '现代主义风格',
            'landscape': '极简主义风格',
            'art': '写实风格'
        };

        sections.forEach(section => {
            const styleSelect = document.getElementById(`${section}-style`);
            const spaceSelect = document.getElementById(`${section}-space`);
            const furnitureContainer = document.getElementById(`${section}-furniture`);
            const modifiersContainer = document.getElementById(`${section}-modifiers`);

            if (styleSelect && spaceSelect) {
                // 存储每个容器的默认元素
                let defaultFurnitureItems = [];
                let defaultModifiersItems = [];

                // 存储当前显示的元素
                let currentDisplayedItems = {
                    furniture: [],
                    modifiers: []
                };

                const loadOptions = () => {
                    const styleValue = styleSelect.value;
                    const styleDisplay = styleSelect.options[styleSelect.selectedIndex].textContent;
                    const space = spaceSelect.value;

                    if (!space) {
                        // 清空容器
                        if (furnitureContainer) {
                            furnitureContainer.innerHTML = '<span class="placeholder">请先选择空间</span>';
                        }
                        if (modifiersContainer) {
                            modifiersContainer.innerHTML = '<span class="placeholder">请先选择空间</span>';
                        }

                        // 重置存储
                        defaultFurnitureItems = [];
                        defaultModifiersItems = [];
                        currentDisplayedItems = { furniture: [], modifiers: [] };
                        return;
                    }

                    // 查找数据 - 优先使用选择的风格
                    let data = null;
                    let isStyleSpecific = false;
                    let usedStyle = styleValue || defaultStyles[section]; // 使用选择的风格或默认风格

                    // 1. 如果用户选择了风格，查找风格特定数据
                    if (styleValue && wordBank.details && wordBank.details[section]) {
                        // 使用显示文本查找
                        if (wordBank.details[section][styleDisplay] && wordBank.details[section][styleDisplay][space]) {
                            data = wordBank.details[section][styleDisplay][space];
                            isStyleSpecific = true;
                        }
                        // 使用实际值查找
                        else if (wordBank.details[section][styleValue] && wordBank.details[section][styleValue][space]) {
                            data = wordBank.details[section][styleValue][space];
                            isStyleSpecific = true;
                        }
                        // 查找包含关键词的风格
                        else {
                            for (const styleKey in wordBank.details[section]) {
                                if (styleKey.includes(styleDisplay) || styleDisplay.includes(styleKey)) {
                                    if (wordBank.details[section][styleKey][space]) {
                                        data = wordBank.details[section][styleKey][space];
                                        isStyleSpecific = true;
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    // 2. 如果没有找到风格特定数据，使用默认风格查找数据
                    if (!data && wordBank.details && wordBank.details[section]) {
                        const defaultStyle = defaultStyles[section];
                        // 先尝试默认风格
                        if (wordBank.details[section][defaultStyle] && wordBank.details[section][defaultStyle][space]) {
                            data = wordBank.details[section][defaultStyle][space];
                        }
                        // 如果默认风格没有数据，查找该空间下的任何数据
                        else {
                            for (const styleKey in wordBank.details[section]) {
                                if (wordBank.details[section][styleKey] && wordBank.details[section][styleKey][space]) {
                                    data = wordBank.details[section][styleKey][space];
                                    break;
                                }
                            }
                        }
                    }

                    // 处理家具元素
                    if (furnitureContainer) {
                        // 清空容器
                        furnitureContainer.innerHTML = '';

                        // 如果没有数据，显示占位符
                        if (!data || !data.furniture) {
                            furnitureContainer.innerHTML = `<span class="placeholder">${space}暂无元素数据</span>`;
                        } else {
                            // 如果是风格特定的（用户选择了风格），同时显示默认元素和风格特定元素
                            if (isStyleSpecific && defaultFurnitureItems.length > 0) {
                                // 先显示默认元素（黑色字体）
                                defaultFurnitureItems.forEach(item => {
                                    createTextSelectItem(furnitureContainer, item, false);
                                });

                                // 再显示风格特定元素（蓝色字体）
                                data.furniture.forEach(item => {
                                    // 检查是否已经在默认元素中存在
                                    if (!defaultFurnitureItems.includes(item)) {
                                        createTextSelectItem(furnitureContainer, item, true);
                                    }
                                });
                            } else {
                                // 没有选择风格或使用默认风格，只显示默认元素
                                data.furniture.forEach(item => {
                                    createTextSelectItem(furnitureContainer, item, false);
                                    // 存储为默认元素
                                    if (!defaultFurnitureItems.includes(item)) {
                                        defaultFurnitureItems.push(item);
                                    }
                                });
                            }
                        }
                    }

                    // 处理修饰词元素
                    if (modifiersContainer) {
                        // 清空容器
                        modifiersContainer.innerHTML = '';

                        // 如果没有数据，显示占位符
                        if (!data || !data.modifiers) {
                            modifiersContainer.innerHTML = `<span class="placeholder">${space}暂无修饰词数据</span>`;
                        } else {
                            // 如果是风格特定的（用户选择了风格），同时显示默认元素和风格特定元素
                            if (isStyleSpecific && defaultModifiersItems.length > 0) {
                                // 先显示默认元素（黑色字体）
                                defaultModifiersItems.forEach(item => {
                                    createTextSelectItem(modifiersContainer, item, false);
                                });

                                // 再显示风格特定元素（蓝色字体）
                                data.modifiers.forEach(item => {
                                    // 检查是否已经在默认元素中存在
                                    if (!defaultModifiersItems.includes(item)) {
                                        createTextSelectItem(modifiersContainer, item, true);
                                    }
                                });
                            } else {
                                // 没有选择风格或使用默认风格，只显示默认元素
                                data.modifiers.forEach(item => {
                                    createTextSelectItem(modifiersContainer, item, false);
                                    // 存储为默认元素
                                    if (!defaultModifiersItems.includes(item)) {
                                        defaultModifiersItems.push(item);
                                    }
                                });
                            }
                        }
                    }

                    // 更新当前显示的元素
                    if (data) {
                        if (data.furniture) {
                            currentDisplayedItems.furniture = [...data.furniture];
                        }
                        if (data.modifiers) {
                            currentDisplayedItems.modifiers = [...data.modifiers];
                        }
                    }
                };

                // 绑定事件
                spaceSelect.addEventListener('change', function () {
                    // 当空间改变时，重置默认元素存储
                    defaultFurnitureItems = [];
                    defaultModifiersItems = [];
                    loadOptions();
                });

                styleSelect.addEventListener('change', loadOptions);

                // 初始加载
                loadOptions();
            }
        });
    }
    // 创建文字选择项
    function createTextSelectItem(container, text, isBlue = false) {
        const label = document.createElement('label');
        label.textContent = text;
        label.dataset.value = text;
        label.classList.add('text-select-item');

        // 如果是蓝色字体，添加 dynamic-item 类
        if (isBlue) {
            label.classList.add('dynamic-item');
            label.style.color = '#080899'; // 蓝色
            label.style.fontWeight = '500';
        } else {
            label.classList.add('default-item');
        }

        label.addEventListener('click', function () {
            this.classList.toggle('selected');
        });

        if (container) {
            container.appendChild(label);
        }
    }

    // 初始化其它要求选项
    function initializeSpecialRequirements() {
        const sections = ['home', 'public', 'landscape', 'art'];

        sections.forEach(section => {
            const specialContainer = document.getElementById(`${section}-special`);
            if (specialContainer && wordBank.specialRequirements) {
                specialContainer.innerHTML = '';

                wordBank.specialRequirements.forEach(itemStr => {
                    const parts = itemStr.split("==");
                    const displayText = parts[0];
                    const actualValue = parts[1] || parts[0];

                    const label = document.createElement('label');
                    label.textContent = displayText;
                    label.dataset.value = actualValue;
                    label.classList.add('text-select-item');

                    if (itemStr.includes("==") && parts[1]) {
                        label.classList.add('has-detail');
                        label.title = `详细内容: ${parts[1]}`;
                    }

                    label.addEventListener('click', function () {
                        this.classList.toggle('selected');
                    });

                    specialContainer.appendChild(label);
                });
            }
        });
    }

    // 清空动态选项
    function clearDynamicOptions(section) {
        const furnitureContainer = document.getElementById(`${section}-furniture`);
        const modifiersContainer = document.getElementById(`${section}-modifiers`);

        if (furnitureContainer) {
            furnitureContainer.innerHTML = '<span class="placeholder">请先选择风格和空间</span>';
        }
        if (modifiersContainer) {
            modifiersContainer.innerHTML = '<span class="placeholder">请先选择风格和空间</span>';
        }
    }

    // 绑定事件
    function bindEvents() {
        // 生成提示词按钮
        const generateBtn = document.getElementById('generate-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', handleGeneratePrompt);
        }

        // 复制功能
        const copyBtn = document.getElementById('copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', handleCopyPrompt);
        }

        // 保存记录
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', handleSavePrompt);
        }

        // 导出功能
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', function () {
                // 切换到导出页面
                const switchExportBtn = document.getElementById('switch-export');
                if (switchExportBtn) {
                    switchExportBtn.click();
                }
            });
        }

        // 清空历史记录
        const clearHistoryBtn = document.getElementById('clear-history');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', handleClearHistory);
        }
    }

    // 生成提示词
    async function handleGeneratePrompt() {
        // 获取当前活动面板
        const activePanel = document.querySelector('.panel.active');
        if (!activePanel) {
            showNotification('请先选择版块', 'error');
            return;
        }

        const panelId = activePanel.id;
        const section = panelId.split('-')[0];

        // 获取所有值
        const style = document.getElementById(`${section}-style`).value;
        const space = document.getElementById(`${section}-space`).value;
        const lighting = document.getElementById(`${section}-lighting`).value;
        const perspective = document.getElementById(`${section}-perspective`).value;
        const scene = document.getElementById(`${section}-scene`).value;
        const lens = document.getElementById(`${section}-lens`).value;
        const desc = document.getElementById(`${section}-desc`).value;

        // 获取选中的家具和修饰词
        const furniture = [];
        const modifiers = [];

        const furnitureItems = activePanel.querySelectorAll(`#${section}-furniture .text-select-item.selected`);
        furnitureItems.forEach(item => {
            furniture.push(item.dataset.value || item.textContent);
        });

        const modifierItems = activePanel.querySelectorAll(`#${section}-modifiers .text-select-item.selected`);
        modifierItems.forEach(item => {
            modifiers.push(item.dataset.value || item.textContent);
        });

        // 获取特殊要求
        const specialRequirements = [];
        const specialItems = activePanel.querySelectorAll(`#${section}-special .text-select-item.selected`);
        specialItems.forEach(item => {
            const value = item.dataset.value || item.textContent;
            specialRequirements.push(value);
        });

        // 验证：只要有任何一项被填写或选中就可以生成
        const hasAnySelection =
            style ||
            space ||
            lighting ||
            perspective ||
            scene ||
            lens ||
            desc ||
            furniture.length > 0 ||
            modifiers.length > 0 ||
            specialRequirements.length > 0;

        if (!hasAnySelection) {
            showNotification('请至少填写一项内容！', 'error');
            return;
        }

        // 显示加载状态
        const loading = document.getElementById('loading');
        const generateBtn = document.getElementById('generate-btn');
        const resultSection = document.getElementById('result-section');
        const promptOutput = document.getElementById('prompt-output');

        if (loading) loading.classList.add('show');
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.classList.add('disabled');
        }

        try {
            // 模拟API调用延迟
            await new Promise(resolve => setTimeout(resolve, 800));

            // 生成提示词
            const prompt = generatePrompt(section, style, space, furniture, modifiers, lighting, perspective, scene, lens, desc, specialRequirements);

            // 显示结果
            if (promptOutput) {
                promptOutput.textContent = prompt;
            }
            if (resultSection) {
                resultSection.style.display = 'block';
                resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            showNotification('提示词生成成功！');
        } catch (error) {
            console.error('生成提示词失败:', error);
            showNotification('生成提示词失败，请重试', 'error');
        } finally {
            // 隐藏加载状态
            if (loading) loading.classList.remove('show');
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.classList.remove('disabled');
            }
        }
    }

    // 生成提示词的函数
    function generatePrompt(section, style, space, furniture, modifiers, lighting, perspective, scene, lens, desc, specialRequirements) {
        let prompt = '';

        // 1. 功能（如果选择了功能类型）
        if (scene) {
            prompt += `${scene}，`;
        }

        // 2. 空间
        if (space) {
            const sectionNames = {
                home: '家装',
                public: '公装',
                landscape: '景观',
                art: '艺术'
            };

            const spaceName = wordBank.spaceNames && wordBank.spaceNames[section] && wordBank.spaceNames[section][space]
                ? wordBank.spaceNames[section][space]
                : `${space}图片`;

            prompt += `设计一个${sectionNames[section] || '设计'}${spaceName}，`;
        }

        // 3. 空间元素
        if (furniture.length > 0) {
            const furnitureText = furniture.join('、');
            prompt += `包含${furnitureText}，`;
        }

        // 4. 附加描述
        if (desc) {
            prompt += ` ${desc}，`;
        }

        // 5. 其它要求（移到附加描述后面）
        if (specialRequirements.length > 0) {
            specialRequirements.forEach(req => {
                prompt += req + '，';
            });
        }

        // 6. 视角
        if (perspective) {
            prompt += `采用${perspective}，`;
        }

        // 7. 画风类型
        if (lens) {
            prompt += `画风类型为${lens}，`;
        }

        // 8. 灯光
        if (lighting) {
            prompt += `运用${lighting}与人工照明的完美融合，打造富有层次的光环境，`;
        }

        // 9. 风格
        if (style) {
            prompt += `${style}风格，`;
        }

        // 10. 设计修饰词
        if (modifiers.length > 0) {
            const modifiersText = modifiers.join('、');
            prompt += `营造${modifiersText}的氛围，`;
        }

        // 11. 随机感受词和固定文字部分
        if (prompt.length > 0) {
            const feelings = ['身心放松', '心旷神怡', '舒适惬意', '宁静致远', '灵感迸发', '专注投入'];
            const randomFeeling = feelings[Math.floor(Math.random() * feelings.length)];
            prompt += `让人${randomFeeling}，`;

            // 添加固定文字
            if (wordBank.fixedText) {
                prompt += wordBank.fixedText;
            }
        }

        // 12. 优化词
        if (prompt.length > 0 && wordBank.optimizationWords && wordBank.optimizationWords[section]) {
            const randomOptimizations = wordBank.optimizationWords[section]
                .sort(() => 0.5 - Math.random())
                .slice(0, 2)
                .join('，');
            prompt += ` ${randomOptimizations}。`;
        }

        // 13. 通用优化词
        if (prompt.length > 0 && wordBank.commonOptimizations) {
            const randomCommon = wordBank.commonOptimizations
                .sort(() => 0.5 - Math.random())
                .slice(0, 3)
                .join('，');
            prompt += ` ${randomCommon}。`;
        }

        // 如果什么都没选，返回默认提示
        if (prompt.trim() === '') {
            prompt = '请至少选择一个选项或填写附加描述来生成提示词。';
        }

        // 清理多余的逗号
        prompt = prompt.replace(/，+$/g, '。');
        if (!prompt.endsWith('。') && !prompt.endsWith('.')) {
            prompt += '。';
        }

        return prompt;
    }

    // 复制提示词
    function handleCopyPrompt() {
        const promptOutput = document.getElementById('prompt-output');
        if (!promptOutput) return;

        const prompt = promptOutput.textContent;
        if (!prompt || prompt === '可编辑，点击复制') {
            showNotification('请先生成提示词', 'error');
            return;
        }

        try {
            navigator.clipboard.writeText(prompt).then(() => {
                showNotification('提示词已复制到剪贴板！');
            }).catch(() => {
                // 降级方案
                const textArea = document.createElement('textarea');
                textArea.value = prompt;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                showNotification('提示词已复制到剪贴板！');
            });
        } catch (err) {
            console.error('复制失败:', err);
            showNotification('复制失败，请手动复制', 'error');
        }
    }
    // 保存提示词
    function handleSavePrompt() {
        const promptOutput = document.getElementById('prompt-output');
        if (!promptOutput) return;

        const prompt = promptOutput.textContent.trim();
        if (!prompt || prompt === '可编辑，点击复制') {
            showNotification('提示词为空', 'error');
            return;
        }

        // 获取当前活动面板信息
        const activePanel = document.querySelector('.panel.active');
        const panelId = activePanel ? activePanel.id : 'unknown';
        const section = panelId.split('-')[0];
        const sectionNames = {
            home: '家装设计',
            public: '公装设计',
            architecture: '建筑设计',
            landscape: '景观设计',
            art: '绘画创作'
        };

        // 获取风格和空间
        const style = document.getElementById(`${section}-style`).value;
        const styleDisplay = document.getElementById(`${section}-style`).options[document.getElementById(`${section}-style`).selectedIndex].textContent;
        const space = document.getElementById(`${section}-space`).value;
        const spaceDisplay = document.getElementById(`${section}-space`).options[document.getElementById(`${section}-space`).selectedIndex].textContent;

        // 创建历史记录对象
        const record = {
            id: Date.now(),
            section: sectionNames[section] || '未知板块',
            sectionRaw: section, // 保存原始版块ID
            style: styleDisplay || '未选择风格',
            styleRaw: style || '',
            space: spaceDisplay || '未选择空间',
            spaceRaw: space || '',
            prompt: prompt,
            timestamp: new Date().toLocaleString('zh-CN')
        };

        // 从localStorage获取现有记录
        let history = JSON.parse(localStorage.getItem('aiPromptHistory') || '[]');
        history.unshift(record);

        // 最多保存15条记录
        if (history.length > 15) {
            history = history.slice(0, 15);
        }

        // 保存到localStorage
        localStorage.setItem('aiPromptHistory', JSON.stringify(history));

        // 更新历史记录显示
        renderHistory();

        showNotification('提示词已保存！');

        // 如果导出页面有刷新函数，也调用它以更新导出页面的数据
        if (typeof window.refreshExportPageData === 'function') {
            // 延迟一点时间确保数据已保存
            setTimeout(() => {
                window.refreshExportPageData();
            }, 100);
        }
    }

    // 导出历史记录
    function handleExportHistory() {
        const history = JSON.parse(localStorage.getItem('aiPromptHistory') || '[]');
        if (history.length === 0) {
            showNotification('暂无记录可导出', 'error');
            return;
        }

        const exportData = history.map(r => `【${r.section}】${r.timestamp}\n${r.prompt}\n\n`).join('='.repeat(50) + '\n\n');
        const blob = new Blob([exportData], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AI绘画提示词记录_${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
        URL.revokeObjectURL(url);

        showNotification('记录已导出！');
    }

    // 清空历史记录
    function handleClearHistory() {
        if (confirm('确定要清空所有历史记录吗？此操作不可恢复！')) {
            localStorage.removeItem('aiPromptHistory');
            renderHistory();
            showNotification('历史记录已清空');
        }
    }

    // 渲染历史记录
    function renderHistory() {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;

        const history = JSON.parse(localStorage.getItem('aiPromptHistory') || '[]');

        if (history.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>暂无历史记录，请生成并保存提示词</p>
                </div>
            `;
            return;
        }

        historyList.innerHTML = history.map(record => `
            <div class="history-item">
                <span class="tag">${record.section}</span>
                <div class="prompt">${record.prompt.substring(0, 100)}${record.prompt.length > 100 ? '...' : ''}</div>
                <div class="timestamp">${record.timestamp}</div>
                <div class="history-item-actions">
                    <button class="btn edit-btn" data-id="${record.id}"><i class="fas fa-edit"></i> 编辑</button>
                    <button class="btn copy-btn" data-id="${record.id}"><i class="fas fa-copy"></i> 复制</button>
                    <button class="btn delete-btn" data-id="${record.id}"><i class="fas fa-trash"></i> 删除</button>
                </div>
            </div>
        `).join('');

        // 为按钮添加事件
        historyList.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const id = parseInt(this.dataset.id);
                const record = history.find(r => r.id === id);
                if (record) {
                    const promptOutput = document.getElementById('prompt-output');
                    const resultSection = document.getElementById('result-section');
                    if (promptOutput) {
                        promptOutput.textContent = record.prompt;
                    }
                    if (resultSection) {
                        resultSection.style.display = 'block';
                        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                    showNotification('已加载历史记录，可以再次编辑');
                }
            });
        });

        historyList.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const id = parseInt(this.dataset.id);
                const record = history.find(r => r.id === id);
                if (record) {
                    navigator.clipboard.writeText(record.prompt).then(() => {
                        showNotification('提示词已复制！');
                    });
                }
            });
        });

        historyList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const id = parseInt(this.dataset.id);
                if (confirm('确定要删除这条记录吗？')) {
                    const newHistory = history.filter(r => r.id !== id);
                    localStorage.setItem('aiPromptHistory', JSON.stringify(newHistory));
                    renderHistory();
                    showNotification('记录已删除');
                }
            });
        });
    }
    // 检查编辑记录
    function checkForEditRecord() {
        const editRecordStr = sessionStorage.getItem('editRecord');
        if (editRecordStr) {
            try {
                const record = JSON.parse(editRecordStr);

                // 根据记录的 sectionRaw 切换到对应选项卡
                const tab = document.querySelector(`.tab[data-panel="${record.sectionRaw}"]`);
                if (tab) {
                    tab.click(); // 切换到对应选项卡

                    // 延迟填充表单
                    setTimeout(() => {
                        // 填充风格
                        if (record.styleRaw) {
                            const styleSelect = document.getElementById(`${record.sectionRaw}-style`);
                            if (styleSelect) {
                                styleSelect.value = record.styleRaw;
                                styleSelect.dispatchEvent(new Event('change'));
                            }
                        }

                        // 填充空间
                        if (record.spaceRaw) {
                            const spaceSelect = document.getElementById(`${record.sectionRaw}-space`);
                            if (spaceSelect) {
                                spaceSelect.value = record.spaceRaw;
                                spaceSelect.dispatchEvent(new Event('change'));
                            }
                        }

                        // 填充提示词
                        const promptOutput = document.getElementById('prompt-output');
                        const resultSection = document.getElementById('result-section');
                        if (promptOutput && resultSection) {
                            promptOutput.textContent = record.prompt;
                            resultSection.style.display = 'block';
                            resultSection.scrollIntoView({ behavior: 'smooth' });
                        }

                        showNotification('已加载历史记录进行编辑');
                    }, 500);
                }

                // 清除存储
                sessionStorage.removeItem('editRecord');
            } catch (error) {
                console.error('加载编辑记录失败:', error);
            }
        }
    }
    // 自动初始化（如果DOM已经加载）
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(initializePromptSystem, 100);
    } else {
        document.addEventListener('DOMContentLoaded', function () {
            setTimeout(initializePromptSystem, 100);
        });
    }
})();