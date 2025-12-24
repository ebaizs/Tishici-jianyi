document.addEventListener('DOMContentLoaded', function() {
    // 初始化界面
    initializeUI();
    
    // 选项卡切换
    const tabs = document.querySelectorAll('.tab');
    const panels = document.querySelectorAll('.panel');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            
            tab.classList.add('active');
            const panelId = `${tab.dataset.panel}-panel`;
            document.getElementById(panelId).classList.add('active');
            
            // 清空动态选项
            clearDynamicOptions(tab.dataset.panel);
        });
    });
    
    // 复选框样式切换
    document.querySelectorAll('.checkbox-item').forEach(item => {
        item.addEventListener('click', function(e) {
            if (e.target.tagName !== 'INPUT') {
                const checkbox = this.querySelector('input');
                checkbox.checked = !checkbox.checked;
            }
            this.classList.toggle('checked', this.querySelector('input').checked);
        });
    });
    
    // 动态加载家具和修饰词
    function setupDynamicLoaders() {
        const sections = ['home', 'public', 'landscape', 'art'];
        
        sections.forEach(section => {
            const styleSelect = document.getElementById(`${section}-style`);
            const spaceSelect = document.getElementById(`${section}-space`);
            const furnitureContainer = document.getElementById(`${section}-furniture`);
            const modifiersContainer = document.getElementById(`${section}-modifiers`);
            
            if (styleSelect && spaceSelect) {
                const loadOptions = () => {
                    const style = styleSelect.value;
                    const space = spaceSelect.value;
                    
                    if (style && space) {
                        const data = wordBank.details[section]?.[style]?.[space];
                        
                        if (data) {
                            // 填充家具
                            furnitureContainer.innerHTML = '';
                            data.furniture.forEach(item => {
                                const label = document.createElement('label');
                                const checkbox = document.createElement('input');
                                checkbox.type = 'checkbox';
                                checkbox.value = item;
                                checkbox.name = `${section}-furniture`;
                                label.appendChild(checkbox);
                                label.appendChild(document.createTextNode(item));
                                furnitureContainer.appendChild(label);
                                
                                // 添加点击事件
                              // 在 setupDynamicLoaders 函数中
label.addEventListener('click', function(e) {
    checkbox.checked = !checkbox.checked;
    // 触发 change 事件以确保样式更新
    checkbox.dispatchEvent(new Event('change'));
});

// 添加复选框的 change 事件来更新样式
checkbox.addEventListener('change', function() {
    label.classList.toggle('checked', checkbox.checked);
});

// 初始设置样式
label.classList.toggle('checked', checkbox.checked);
                            });
                            
                            // 填充修饰词
                            modifiersContainer.innerHTML = '';
                            data.modifiers.forEach(item => {
                                const label = document.createElement('label');
                                const checkbox = document.createElement('input');
                                checkbox.type = 'checkbox';
                                checkbox.value = item;
                                checkbox.name = `${section}-modifiers`;
                                label.appendChild(checkbox);
                                label.appendChild(document.createTextNode(item));
                                modifiersContainer.appendChild(label);
                                
                                // 添加点击事件
                               // 在 setupDynamicLoaders 函数中
label.addEventListener('click', function(e) {
    checkbox.checked = !checkbox.checked;
    // 触发 change 事件以确保样式更新
    checkbox.dispatchEvent(new Event('change'));
});

// 添加复选框的 change 事件来更新样式
checkbox.addEventListener('change', function() {
    label.classList.toggle('checked', checkbox.checked);
});

// 初始设置样式
label.classList.toggle('checked', checkbox.checked);
                            });
                        } else {
                            // 如果没有特定数据，使用默认数据
                            loadDefaultOptions(section, style, space, furnitureContainer, modifiersContainer);
                        }
                    } else {
                        furnitureContainer.innerHTML = '<span class="placeholder">请先选择风格和空间</span>';
                        modifiersContainer.innerHTML = '<span class="placeholder">请先选择风格和空间</span>';
                    }
                };
                
                styleSelect.addEventListener('change', loadOptions);
                spaceSelect.addEventListener('change', loadOptions);
            }
        });
    }
    
    // 加载默认选项
    function loadDefaultOptions(section, style, space, furnitureContainer, modifiersContainer) {
        // 默认家具选项
        const defaultFurniture = {
            home: ["沙发", "茶几", "电视柜", "餐桌", "餐椅", "床", "衣柜", "书桌", "书架", "绿植", "装饰画", "灯具", "窗帘", "地毯"],
            public: ["办公桌", "会议桌", "椅子", "接待台", "展示柜", "沙发", "茶几", "绿植", "装饰品", "灯具", "标识", "书架", "文件柜", "显示屏"],
            landscape: ["座椅", "步道", "草坪", "树木", "花卉", "水景", "照明", "雕塑", "栏杆", "铺装", "指示牌", "垃圾桶", "凉亭", "儿童设施"],
            art: ["人物", "风景", "静物", "建筑", "动物", "植物", "天空", "水面", "光影", "色彩", "纹理", "构图", "透视", "情感"]
        };
        
        // 默认修饰词
        const defaultModifiers = {
            home: ["温馨舒适", "自然采光", "精致细节", "合理布局", "空间通透", "功能实用", "美观大方", "环保健康", "智能便捷", "个性化设计"],
            public: ["专业氛围", "功能性强", "高端大气", "现代感", "高效空间", "品质感", "科技智能", "环保可持续", "安全便捷", "人性化设计"],
            landscape: ["自然和谐", "生态平衡", "季节变化", "空间层次", "可持续性", "生态友好", "美观实用", "人性化设计", "安全舒适", "文化特色"],
            art: ["情感表达", "视觉冲击力", "艺术构图", "色彩丰富", "技法纯熟", "意境深远", "创意独特", "个性表达", "艺术价值", "审美高级"]
        };
        
        furnitureContainer.innerHTML = '';
        defaultFurniture[section].forEach(item => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = item;
            checkbox.name = `${section}-furniture`;
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(item));
            furnitureContainer.appendChild(label);
            
           label.addEventListener('click', function() {
    checkbox.checked = !checkbox.checked;
    // 触发 change 事件以确保样式更新
    checkbox.dispatchEvent(new Event('change'));
});

// 添加复选框的 change 事件来更新样式
checkbox.addEventListener('change', function() {
    label.classList.toggle('checked', checkbox.checked);
});

// 初始设置样式
label.classList.toggle('checked', checkbox.checked);
        });
        
        modifiersContainer.innerHTML = '';
        defaultModifiers[section].forEach(item => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = item;
            checkbox.name = `${section}-modifiers`;
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(item));
            modifiersContainer.appendChild(label);
            
            label.addEventListener('click', function() {
    checkbox.checked = !checkbox.checked;
    // 触发 change 事件以确保样式更新
    checkbox.dispatchEvent(new Event('change'));
});

// 添加复选框的 change 事件来更新样式
checkbox.addEventListener('change', function() {
    label.classList.toggle('checked', checkbox.checked);
});

// 初始设置样式
label.classList.toggle('checked', checkbox.checked);
        });
    }
    
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
    
    // 初始化界面
    function initializeUI() {
        // 填充所有下拉菜单
        const sections = ['home', 'public', 'landscape', 'art'];
        
        sections.forEach(section => {
            // 填充风格选项
            const styleSelect = document.getElementById(`${section}-style`);
            if (styleSelect) {
                wordBank.styles[section].forEach(style => {
                    const option = document.createElement('option');
                    option.value = style;
                    option.textContent = style;
                    styleSelect.appendChild(option);
                });
            }
            
            // 填充空间选项
            const spaceSelect = document.getElementById(`${section}-space`);
            if (spaceSelect) {
                wordBank.spaces[section].forEach(space => {
                    const option = document.createElement('option');
                    option.value = space;
                    option.textContent = space;
                    spaceSelect.appendChild(option);
                });
            }
            
            // 填充灯光选项
            const lightingSelect = document.getElementById(`${section}-lighting`);
            if (lightingSelect) {
                wordBank.lighting[section].forEach(light => {
                    const option = document.createElement('option');
                    option.value = light;
                    option.textContent = light;
                    lightingSelect.appendChild(option);
                });
            }
            
            // 填充视角选项
            const perspectiveSelect = document.getElementById(`${section}-perspective`);
            if (perspectiveSelect) {
                wordBank.perspectives.forEach(perspective => {
                    const option = document.createElement('option');
                    option.value = perspective;
                    option.textContent = perspective;
                    perspectiveSelect.appendChild(option);
                });
            }
            
            // 填充景别选项
            const sceneSelect = document.getElementById(`${section}-scene`);
            if (sceneSelect) {
                wordBank.scenes.forEach(scene => {
                    const option = document.createElement('option');
                    option.value = scene;
                    option.textContent = scene;
                    sceneSelect.appendChild(option);
                });
            }
            
            // 填充镜头选项
            const lensSelect = document.getElementById(`${section}-lens`);
            if (lensSelect) {
                wordBank.lenses.forEach(lens => {
                    const option = document.createElement('option');
                    option.value = lens;
                    option.textContent = lens;
                    lensSelect.appendChild(option);
                });
            }
        });
        
        setupDynamicLoaders();
        
        // 初始化所有复选框样式
        document.querySelectorAll('.checkbox-item').forEach(item => {
            const checkbox = item.querySelector('input');
            if (checkbox.checked) {
                item.classList.add('checked');
            }
        });
         // 初始化所有动态生成的复选框的事件
    document.addEventListener('change', function(e) {
        if (e.target.type === 'checkbox' && e.target.name && e.target.name.includes('furniture') || e.target.name.includes('modifiers')) {
            const label = e.target.closest('label');
            if (label) {
                label.classList.toggle('checked', e.target.checked);
            }
        }
    });
    }
    
    // 生成提示词
    const generateBtn = document.getElementById('generate-btn');
    const resultSection = document.getElementById('result-section');
    const promptOutput = document.getElementById('prompt-output');
    const loading = document.getElementById('loading');
    const notification = document.getElementById('notification');
    
    generateBtn.addEventListener('click', async () => {
        // 获取当前活动面板
        const activePanel = document.querySelector('.panel.active');
        if (!activePanel) {
            showNotification('请先选择版块', 'error');
            return;
        }
        
        const panelId = activePanel.id;
        const section = panelId.split('-')[0]; // home, public, landscape, art
        
        // 获取基础值
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
        activePanel.querySelectorAll(`input[name="${section}-furniture"]:checked`).forEach(checkbox => {
            furniture.push(checkbox.value);
        });
        
        activePanel.querySelectorAll(`input[name="${section}-modifiers"]:checked`).forEach(checkbox => {
            modifiers.push(checkbox.value);
        });
        
        // 获取特殊要求
        const specialRequirements = [];
        activePanel.querySelectorAll(`#${section}-special input[type="checkbox"]:checked`).forEach(checkbox => {
            specialRequirements.push(checkbox.value);
        });
        
        // 验证必填项
        if (!style || !space || !lighting || !perspective || !scene) {
            showNotification('请填写所有必填项！', 'error');
            return;
        }
        
        if (furniture.length === 0) {
            showNotification('请至少选择一个空间元素！', 'error');
            return;
        }
        
        // 显示加载状态
        loading.classList.add('show');
        generateBtn.disabled = true;
        generateBtn.classList.add('disabled');
        
        // 模拟API调用延迟
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // 生成提示词
        const prompt = generatePrompt(section, style, space, furniture, modifiers, lighting, perspective, scene, lens, desc, specialRequirements);
        
        // 显示结果
        promptOutput.textContent = prompt;
        resultSection.style.display = 'block';
        
        // 滚动到结果区域
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // 隐藏加载状态
        loading.classList.remove('show');
        generateBtn.disabled = false;
        generateBtn.classList.remove('disabled');
        
        showNotification('提示词生成成功！');
    });
    
    // 生成提示词的函数 - 按照新要求的顺序
    // 生成提示词的函数 - 按照新要求的顺序
function generatePrompt(section, style, space, furniture, modifiers, lighting, perspective, scene, lens, desc, specialRequirements) {
    let prompt = '';
    
    // 1. 转换要求
    if (specialRequirements.length > 0) {
        specialRequirements.forEach(req => {
            if (req === 'ignore-requirements') {
                prompt += '忽略之前要求，';
            } else if (req === 'transform-room') {
                if (section === 'home' || section === 'public') {
                    prompt += '将毛坯房转换为完工后的实景照片，';
                } else if (section === 'landscape') {
                    prompt += '将毛坯场地转换为完工后的实景照片，';
                } else if (section === 'art') {
                    prompt += '将线稿/草图转换为完整艺术作品，';
                }
            }
        });
    }
    
    // 2. 版块和空间
    const sectionNames = {
        home: '家装',
        public: '公装',
        landscape: '景观',
        art: '艺术'
    };
    
    const spaceName = wordBank.spaceNames[section][space] || `${space}图片`;
    prompt += `设计一个${sectionNames[section]}${spaceName}，`;
    
    // 3. 元素
    if (furniture.length > 0) {
        const furnitureText = furniture.join('、');
        prompt += `重点突出${furnitureText}`;
    }
    
    // 4. 附加描述
    if (desc) {
        prompt += ` ${desc}，`;
    }
    
    // 5. 风格
    prompt += `${style}风格，`;
    
    // 6. 视角
    prompt += `${perspective}，`;
    
    // 7. 画面景别
    prompt += `${scene}视角，`;
    
    // 8. 灯光
    prompt += `运用${lighting}与人工照明的完美融合，打造富有层次的光环境，`;
    
    // 9. 设计修饰词
    if (modifiers.length > 0) {
        const modifiersText = modifiers.join('、');
        prompt += `营造${modifiersText}的氛围，`;
    }
    
    // 10. 固定文字部分
    const feelings = ['身心放松', '心旷神怡', '舒适惬意', '宁静致远', '灵感迸发', '专注投入'];
    const randomFeeling = feelings[Math.floor(Math.random() * feelings.length)];
    prompt += `让人${randomFeeling}，`;
    
    prompt += wordBank.fixedText;
    
    // 11. 镜头类型
    if (lens) {
        prompt += ` 使用${lens}拍摄。`;
    }
    
    // 12. 优化词
    const randomOptimizations = wordBank.optimizationWords[section]
        .sort(() => 0.5 - Math.random())
        .slice(0, 2)
        .join('，');
    
    prompt += ` ${randomOptimizations}。`;
    
    // 13. 通用优化词
    const randomCommon = wordBank.commonOptimizations
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .join('，');
    
    prompt += ` ${randomCommon}。`;
    
    return prompt;
}
    
    // 复制功能
    const copyBtn = document.getElementById('copy-btn');
    copyBtn.addEventListener('click', () => {
        const prompt = promptOutput.textContent;
        if (!prompt || prompt === '可编辑，点击复制') return;
        
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
    });
    
    // 保存记录
    const saveBtn = document.getElementById('save-btn');
    saveBtn.addEventListener('click', () => {
        const prompt = promptOutput.textContent;
        if (!prompt || prompt === '可编辑，点击复制') return;
        
        // 获取当前活动面板信息
        const activePanel = document.querySelector('.panel.active');
        const panelId = activePanel.id;
        const section = panelId.split('-')[0];
        const sectionNames = {
            home: '家装设计',
            public: '公装设计',
            landscape: '景观设计',
            art: '绘画创作'
        };
        
        // 创建历史记录对象
        const record = {
            id: Date.now(),
            section: sectionNames[section],
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
    });
    
    // 导出功能
    const exportBtn = document.getElementById('export-btn');
    exportBtn.addEventListener('click', () => {
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
    });
    
    // 清空历史记录
    const clearHistoryBtn = document.getElementById('clear-history');
    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('确定要清空所有历史记录吗？此操作不可恢复！')) {
            localStorage.removeItem('aiPromptHistory');
            renderHistory();
            showNotification('历史记录已清空');
        }
    });
    
    // 渲染历史记录
    function renderHistory() {
        const historyList = document.getElementById('history-list');
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
                <div class="prompt">${record.prompt}</div>
                <div style="font-size: 0.75rem; color: #6c757d; margin-bottom: 8px;">${record.timestamp}</div>
                <div class="history-item-actions">
                    <button class="edit-btn" data-id="${record.id}"><i class="fas fa-edit"></i> 编辑</button>
                    <button class="copy-btn" data-id="${record.id}"><i class="fas fa-copy"></i> 复制</button>
                    <button class="delete-btn" data-id="${record.id}"><i class="fas fa-trash"></i> 删除</button>
                </div>
            </div>
        `).join('');
        
        // 为按钮添加事件
        historyList.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = parseInt(this.dataset.id);
                const record = history.find(r => r.id === id);
                if (record) {
                    promptOutput.textContent = record.prompt;
                    resultSection.style.display = 'block';
                    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    showNotification('已加载历史记录，可以再次编辑');
                }
            });
        });
        
        historyList.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', function() {
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
            btn.addEventListener('click', function() {
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
    
    // 显示通知
    function showNotification(message, type = 'success') {
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
    
    // 初始化历史记录
    renderHistory();
});