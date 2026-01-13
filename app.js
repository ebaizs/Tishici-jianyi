document.addEventListener('DOMContentLoaded', function() {
    // 简化的登录检查 - 只检查登录状态
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    const userName = sessionStorage.getItem('userName');
    
    // 如果未登录，不执行后续代码
    if (isLoggedIn !== 'true' || !userName) {
        console.log('未登录，无法访问应用功能');
        return;
    }
    
    console.log('用户已登录:', userName);
    
    // 显示用户信息（确保存在）
    const userInfo = document.getElementById('user-info');
    if (userInfo && userName) {
        userInfo.innerHTML = `
            <span><i class="fas fa-user"></i> ${userName}</span>
            <button onclick="logout()" class="logout-btn">
                <i class="fas fa-sign-out-alt"></i> 退出
            </button>
        `;
    }
    
    // 初始化界面
    initializeUI();
    
    // 选项卡切换
    const tabs = document.querySelectorAll('.tab');
    const panels = document.querySelectorAll('.panel');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.classList.contains('active')) return;
            
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            
            tab.classList.add('active');
            const panelId = `${tab.dataset.panel}-panel`;
            document.getElementById(panelId).classList.add('active');
            
            // 清空动态选项
            clearDynamicOptions(tab.dataset.panel);
        });
    });
   
   // 创建一个辅助函数来规范化风格名称（去除"风格"后缀，便于匹配）
function normalizeStyleName(styleName) {
  if (!styleName) return '';
  
  // 如果是带"=="的字符串，提取显示部分
  if (styleName.includes('==')) {
    const parts = styleName.split('==');
    styleName = parts[0]; // 使用显示部分
  }
  
   // 如果是常见风格但没带"风格"后缀，加上
  const commonStyles = ['现代简约', '新中式', '日式', '北欧', '轻奢', '工业', '传统中式', '生态自然', '油画', '水彩', '素描', '中国', '抽象'];
  
  for (const commonStyle of commonStyles) {
    if (styleName.includes(commonStyle) && !styleName.includes('风格')) {
        return commonStyle + '风格';
    }
  }
  
  return styleName;
}
// 在 app.js 中找到 setupDynamicLoaders 函数，修改 loadOptions 函数：

function setupDynamicLoaders() {
  const sections = ['home', 'public', 'landscape', 'art'];
  sections.forEach(section => {
    const styleSelect = document.getElementById(`${section}-style`);
    const spaceSelect = document.getElementById(`${section}-space`);
    const furnitureContainer = document.getElementById(`${section}-furniture`);
    const modifiersContainer = document.getElementById(`${section}-modifiers`);
    
    if (styleSelect && spaceSelect) {
 const loadOptions = () => {
  const styleValue = styleSelect.value;
  const styleDisplay = styleSelect.options[styleSelect.selectedIndex].textContent;
  const space = spaceSelect.value;
  
  if (space) {
    // 尝试多种方式查找数据
    let data = null;
    
    // 1. 方式1：使用显示文本查找
    if (wordBank.details[section]?.[styleDisplay]?.[space]) {
      data = wordBank.details[section][styleDisplay][space];
    }
    // 2. 方式2：使用实际值查找
    else if (wordBank.details[section]?.[styleValue]?.[space]) {
      data = wordBank.details[section][styleValue][space];
    }
    // 3. 方式3：规范化名称后查找
    else if (styleDisplay && styleDisplay.endsWith('风格')) {
      const styleWithoutSuffix = styleDisplay.replace('风格', '');
      if (wordBank.details[section]?.[styleWithoutSuffix]?.[space]) {
        data = wordBank.details[section][styleWithoutSuffix][space];
      }
    }
    // 4. 方式4：查找包含关键词的风格
    else if (wordBank.details[section]) {
      for (const styleKey in wordBank.details[section]) {
        if (styleKey.includes(styleDisplay) || styleDisplay.includes(styleKey)) {
          if (wordBank.details[section][styleKey][space]) {
            data = wordBank.details[section][styleKey][space];
            break;
          }
        }
      }
    }
    
    // 5. 如果还是没有找到，使用默认风格的元素
    if (!data) {
      let defaultStyle = '现代简约风格'; // 默认使用现代简约风格
      if (section === 'art') {
        defaultStyle = '油画风格'; // 艺术板块使用油画风格作为默认
      }
      
      // 检查默认风格是否有这个空间/主题的元素
      if (wordBank.details[section]?.[defaultStyle]?.[space]) {
        data = wordBank.details[section][defaultStyle][space];
      }
      // 如果默认风格也没有这个空间，尝试找第一个有该空间的风格
      else if (wordBank.details[section]) {
        for (const styleKey in wordBank.details[section]) {
          if (wordBank.details[section][styleKey][space]) {
            data = wordBank.details[section][styleKey][space];
            break;
          }
        }
      }
    }
    
    if (data) {
      // 有数据，显示特定风格或默认风格元素
      furnitureContainer.innerHTML = '';
      data.furniture.forEach(item => {
        createTextSelectItem(furnitureContainer, item);
      });
      
      modifiersContainer.innerHTML = '';
      data.modifiers.forEach(item => {
        createTextSelectItem(modifiersContainer, item);
      });
    } else {
      // 没有任何数据，显示提示
      furnitureContainer.innerHTML = '<span class="placeholder">该风格暂无此空间的元素数据</span>';
      modifiersContainer.innerHTML = '<span class="placeholder">该风格暂无此空间的元素数据</span>';
    }
  } else {
    furnitureContainer.innerHTML = '<span class="placeholder">请先选择空间</span>';
    modifiersContainer.innerHTML = '<span class="placeholder">请先选择空间</span>';
  }
};
      
      // 空间变化时加载默认元素
      spaceSelect.addEventListener('change', loadOptions);
      // 风格变化时更新为特定风格元素
      styleSelect.addEventListener('change', loadOptions);
    }
  });
}
    
    // 创建文字选择项
    function createTextSelectItem(container, text) {
        const label = document.createElement('label');
        label.textContent = text;
        label.dataset.value = text;
        label.classList.add('text-select-item');
        
        // 点击文字切换选中状态
        label.addEventListener('click', function() {
            this.classList.toggle('selected');
        });
        
        container.appendChild(label);
    }
    
  function loadDefaultOptions(section, space, furnitureContainer, modifiersContainer) {
  // 从 wordBank.defaultBySpace 中获取基于空间的默认元素
  const furniture = wordBank.defaultBySpace.furniture[section]?.[space] || [];
  const modifiers = wordBank.defaultBySpace.modifiers[section]?.[space] || [];

  // 清空容器并创建选项
  furnitureContainer.innerHTML = '';
  furniture.forEach(item => {
    createTextSelectItem(furnitureContainer, item);
  });
  
  modifiersContainer.innerHTML = '';
  modifiers.forEach(item => {
    createTextSelectItem(modifiersContainer, item);
  });
}
// 初始化其它要求选项
function initializeSpecialRequirements() {
    const sections = ['home', 'public', 'landscape', 'art'];
    sections.forEach(section => {
        const specialContainer = document.getElementById(`${section}-special`);
        if (specialContainer && wordBank.specialRequirements) {
            specialContainer.innerHTML = '';
            
            wordBank.specialRequirements.forEach(itemStr => {
                // 解析显示文本和实际值
                const parts = itemStr.split('==');
                const displayText = parts[0]; // 显示的内容（==前面的部分）
                const actualValue = parts[1] || parts[0]; // 生成时使用的内容（==后面的部分，如果没有就使用前面的）
                
                const label = document.createElement('label');
                label.textContent = displayText; // 界面上显示==前面的内容
                label.dataset.display = displayText; // 保存显示文本
                label.dataset.value = actualValue; // 保存实际使用的值
                label.classList.add('text-select-item');
                
                // 如果词条带==，添加蓝色样式类
                if (itemStr.includes('==') && parts[1]) {
                    label.classList.add('has-detail');
                    // 添加title提示，显示完整信息
                    label.title = `详细内容: ${parts[1]}`;
                }
                
                label.addEventListener('click', function() {
                    this.classList.toggle('selected');
                });
                
                specialContainer.appendChild(label);
            });
        }
    });
}
    // 初始化界面
    function initializeUI() {
        // 填充所有下拉菜单
        const sections = ['home', 'public', 'landscape', 'art'];
        
        sections.forEach(section => {
          // 填充风格选项
const styleSelect = document.getElementById(`${section}-style`);
if (styleSelect) {
    wordBank.styles[section].forEach(item => {
        const option = document.createElement('option');
        // 处理显示文本和实际值
        const parts = item.split('==');
        const displayText = parts[0]; // 显示==前面的内容
        const actualValue = parts[1] || parts[0]; // 如果有==后面的内容就用后面的，否则用前面的
        option.value = actualValue; // 实际值使用==后面的内容，如果没有则使用整个字符串
        option.textContent = displayText; // 显示==前面的内容
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
            
          // 填充景别选项（功能选项）
const sceneSelect = document.getElementById(`${section}-scene`);
if (sceneSelect) {
    // 判断板块，使用不同的功能选项
    const sceneOptions = (section === 'art') ? gongneng : commonGongneng;
    
    sceneOptions.forEach(item => {
        const option = document.createElement('option');
        // 处理显示文本和实际值
        const parts = item.split('==');
        const displayText = parts[0]; // 显示==前面的内容
        const actualValue = parts[1] || parts[0]; // 如果有==后面的内容就用后面的，否则用前面的
        option.value = actualValue; // 实际值使用==后面的内容，如果没有则使用整个字符串
        option.textContent = displayText; // 显示==前面的内容
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
        initializeSpecialRequirements();
    }
    
   function clearDynamicOptions(section) {
  const furnitureContainer = document.getElementById(`${section}-furniture`);
  const modifiersContainer = document.getElementById(`${section}-modifiers`);
  
  if(furnitureContainer) {
    furnitureContainer.innerHTML = '<span class="placeholder">请先选择风格和空间</span>';
  }
  if(modifiersContainer) {
    modifiersContainer.innerHTML = '<span class="placeholder">请先选择风格和空间</span>';
  }
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
    activePanel.querySelectorAll(`#${section}-furniture .text-select-item.selected`).forEach(item => {
        furniture.push(item.dataset.value || item.textContent);
    });
    
    activePanel.querySelectorAll(`#${section}-modifiers .text-select-item.selected`).forEach(item => {
        modifiers.push(item.dataset.value || item.textContent);
    });
    
   
   // 获取特殊要求
const specialRequirements = [];
activePanel.querySelectorAll(`#${section}-special .text-select-item.selected`).forEach(item => {
    // 如果有==后面的值，使用后面的值；否则使用显示值
    const value = item.dataset.value || item.textContent;
    specialRequirements.push(value);
});
    
    // 放宽验证：只要有任何一项被填写或选中就可以生成
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
    loading.classList.add('show');
    generateBtn.disabled = true;
    generateBtn.classList.add('disabled');
    
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // 生成提示词（修改后的函数会处理空值）
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
    
 // 生成提示词的函数
function generatePrompt(section, style, space, furniture, modifiers, lighting, perspective, scene, lens, desc, specialRequirements) {
    let prompt = '';
    
    // 1. 处理特殊要求 - 确保使用正确的值
    if (specialRequirements.length > 0) {
        specialRequirements.forEach(req => {
            // req已经是从dataset.value获取的，直接使用
            prompt += req + '，';
        });
    }
    
    // 2. 版块和空间（如果有选择）
    if (space) {
        const sectionNames = {
            home: '家装',
            public: '公装',
            landscape: '景观',
            art: '艺术'
        };
        
        const spaceName = wordBank.spaceNames[section][space] || `${space}图片`;
        prompt += `设计一个${sectionNames[section]}${spaceName}，`;
    }
    
    // 3. 元素（如果有选择）
    if (furniture.length > 0) {
        const furnitureText = furniture.join('、');
        prompt += `重点突出${furnitureText}`;
        
        // 如果furniture有内容但后面没有逗号，加一个逗号
        if (!prompt.endsWith('，')) {
            prompt += '，';
        }
    }
    
    // 4. 附加描述（如果有）
    if (desc) {
        prompt += ` ${desc}，`;
    }
    
    // 5. 风格（如果有选择） - 使用显示文本
    if (style) {
        const styleSelect = document.getElementById(`${section}-style`);
        let styleDisplay = style;
        if (styleSelect) {
            const option = styleSelect.options[styleSelect.selectedIndex];
            if (option.textContent) {
                styleDisplay = option.textContent.split('==')[0] || option.textContent;
            }
        }
        prompt += `${styleDisplay}，`;
    }
    
    // 6. 视角（如果有选择）
    if (perspective) {
        prompt += `${perspective}，`;
    }
    
    // 7. 画面景别（功能类型）
    if (scene) {
        const sceneSelect = document.getElementById(`${section}-scene`);
        let sceneDisplay = scene;
        if (sceneSelect) {
            const option = sceneSelect.options[sceneSelect.selectedIndex];
            if (option.textContent) {
                sceneDisplay = option.textContent.split('==')[0] || option.textContent;
            }
        }
        prompt += `${sceneDisplay}，`;
    }
    
    // 8. 灯光（如果有选择）
    if (lighting) {
        prompt += `运用${lighting}与人工照明的完美融合，打造富有层次的光环境，`;
    }
    
    // 9. 设计修饰词（如果有选择）
    if (modifiers.length > 0) {
        const modifiersText = modifiers.join('、');
        prompt += `营造${modifiersText}的氛围，`;
    }
    
    // 10. 随机感受词和固定文字部分（如果前面有内容）
    if (prompt.length > 0) {
        const feelings = ['身心放松', '心旷神怡', '舒适惬意', '宁静致远', '灵感迸发', '专注投入'];
        const randomFeeling = feelings[Math.floor(Math.random() * feelings.length)];
        prompt += `让人${randomFeeling}，`;
        prompt += wordBank.fixedText;
    }
    
    // 11. 画风类型（如果有选择）
    if (lens) {
        prompt += ` 使用${lens}画风。`;
    }
    
    // 12. 优化词（如果前面有内容）
    if (prompt.length > 0 && wordBank.optimizationWords[section]) {
        const randomOptimizations = wordBank.optimizationWords[section]
            .sort(() => 0.5 - Math.random())
            .slice(0, 2)
            .join('，');
        prompt += ` ${randomOptimizations}。`;
    }
    
    // 13. 通用优化词（如果前面有内容）
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
  // 显示通知
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    
    if (!notification) {
        console.log('通知:', message); // 备用方案
        return;
    }
    
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}
    
    // 初始化历史记录
    renderHistory();
});