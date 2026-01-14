// app.js - 主要调度程序（合并了登录功能）
(function() {
    'use strict';
    
    // 应用全局状态
    const AppState = {
        isLoggedIn: false,
        userName: null,
        userRole: null,
        currentPage: 'prompt'
    };
    
    // 本地默认用户（备用）
    const defaultUsers = [
        {
            "username": "qiyu",
            "password": "8418",
            "name": "系统管理员",
            "isLocal": true,
            "isAdmin": true
        }
    ];
    
    // ==================== DOM加载初始化 ====================
    document.addEventListener('DOMContentLoaded', function() {
        console.log('AI绘画工具系统初始化...');
        
        // 检查登录状态
        const savedLogin = sessionStorage.getItem('isLoggedIn');
        const savedName = sessionStorage.getItem('userName');
        
        if (savedLogin === 'true' && savedName) {
            AppState.isLoggedIn = true;
            AppState.userName = savedName;
            AppState.userRole = sessionStorage.getItem('userRole') || 'user';
            showMainApp();
        } else {
            showLoginPage();
        }
        
        // 初始化页面切换功能
        initPages();
        
        // 导出关键函数到全局作用域
        exportFunctionsToGlobal();
    });
    
    // ==================== 登录相关功能 ====================
    function showLoginPage() {
        document.getElementById('login-container').style.display = 'flex';
        document.getElementById('main-container').style.display = 'none';
        initLogin();
    }
    
    function initLogin() {
        // 清除之前的登录状态，强制每次都登录
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('userName');
        sessionStorage.removeItem('userRole');
        
        // 绑定登录按钮事件
        const loginButton = document.getElementById('login-button');
        if (loginButton) {
            loginButton.addEventListener('click', handleLogin);
        }
        
        // 绑定回车键登录
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    handleLogin();
                }
            });
        }
        
        const usernameInput = document.getElementById('username');
        if (usernameInput) {
            usernameInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    document.getElementById('password').focus();
                }
            });
        }
    }
    
    async function handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const loginButton = document.getElementById('login-button');
        const loginLoading = document.getElementById('login-loading');
        const loginError = document.getElementById('login-error');
        
        if (!username || !password) {
            showLoginMessage('请输入用户名和密码', 'error');
            return;
        }
        
        loginButton.style.display = 'none';
        loginLoading.style.display = 'block';
        loginError.textContent = '';
        loginError.className = 'login-error';
        
        try {
            // 尝试从云端加载账号信息
            let user = null;
            
            try {
                const cloudUsers = await loadCloudUsers();
                user = cloudUsers.find(u => u.username === username && u.password === password);
            } catch (cloudError) {
                console.warn('云端账号加载失败，使用本地账号:', cloudError);
            }
            
            // 如果云端没有找到，检查本地用户
            if (!user) {
                user = defaultUsers.find(u => u.username === username && u.password === password);
            }
            
            if (user) {
                handleLoginSuccess(user);
            } else {
                showLoginMessage('用户名或密码错误', 'error');
                loginButton.style.display = 'block';
                loginLoading.style.display = 'none';
            }
        } catch (error) {
            console.error('登录过程出错:', error);
            showLoginMessage('登录失败，请检查网络连接或联系管理员', 'error');
            loginButton.style.display = 'block';
            loginLoading.style.display = 'none';
        }
    }
    
    async function loadCloudUsers() {
        const cloudUrl = 'https://gist.githubusercontent.com/ebaizs/2769a9e28995f23cf9be60dd8f2891ca/raw/my-zhanghao.js';
        
        try {
            const response = await fetch(cloudUrl);
            const jsContent = await response.text();
            const users = parseUsersFromJS(jsContent);
            return users || [];
        } catch (error) {
            console.error('加载云端账号失败:', error);
            throw error;
        }
    }
    
    function parseUsersFromJS(jsContent) {
        try {
            const patterns = [
                /const\s+builtInUsers\s*=\s*(\[[\s\S]*?\]);/,
                /var\s+builtInUsers\s*=\s*(\[[\s\S]*?\]);/,
                /let\s+builtInUsers\s*=\s*(\[[\s\S]*?\]);/,
                /builtInUsers\s*=\s*(\[[\s\S]*?\]);/
            ];
            
            let usersArray = null;
            
            for (const pattern of patterns) {
                const match = jsContent.match(pattern);
                if (match) {
                    try {
                        usersArray = JSON.parse(match[1].replace(/(\w+):/g, '"$1":'));
                        break;
                    } catch (parseError) {
                        continue;
                    }
                }
            }
            
            if (!usersArray) {
                try {
                    const jsWithReturn = jsContent + '; return builtInUsers || [];';
                    const getUsers = new Function(jsWithReturn);
                    usersArray = getUsers();
                } catch (evalError) {
                    console.error('eval方式也失败了:', evalError);
                }
            }
            
            return usersArray || [];
        } catch (error) {
            console.error('解析用户数据失败:', error);
            return [];
        }
    }
    
    function handleLoginSuccess(user) {
        AppState.isLoggedIn = true;
        AppState.userName = user.name;
        AppState.userRole = user.isAdmin ? 'admin' : 'user';
        
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('userName', user.name);
        sessionStorage.setItem('userRole', user.isAdmin ? 'admin' : 'user');
        
        const loginError = document.getElementById('login-error');
        loginError.textContent = '登录成功，正在进入系统...';
        loginError.className = 'login-error success';
        
        setTimeout(() => {
            location.reload();
        }, 800);
    }
    
    function showLoginMessage(message, type) {
        const loginError = document.getElementById('login-error');
        if (loginError) {
            loginError.textContent = message;
            loginError.className = `login-error ${type}`;
        }
    }
    
    // ==================== 主应用功能 ====================
  function showMainApp() {
    const userName = AppState.userName || '用户';
    
    // 显示主应用，隐藏登录界面
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('main-container').style.display = 'block';
    
    // 更新用户信息
    const userInfo = document.getElementById('user-info');
    if (userInfo) {
        userInfo.innerHTML = `
            <span><i class="fas fa-user"></i> ${userName}</span>
            <button onclick="logout()" class="logout-btn">
                <i class="fas fa-sign-out-alt"></i> 退出
            </button>
        `;
    }
    
    // 根据当前状态显示页面，隐藏其他页面
    const promptPage = document.getElementById('prompt-page');
    const paintPage = document.getElementById('paint-page');
    
    if (promptPage) promptPage.style.display = 'none';
    if (paintPage) paintPage.style.display = 'none';
    
    if (AppState.currentPage === 'prompt') {
        if (promptPage) {
            promptPage.style.display = 'block';
        }
        loadPromptPage();
    } else if (AppState.currentPage === 'paint') {
        if (paintPage) {
            paintPage.style.display = 'block';
        }
        loadPaintPage();
    }
}
    
    function logout() {
        if (confirm('确定要退出登录吗？')) {
            sessionStorage.clear();
            localStorage.removeItem('aiPromptHistory');
            location.reload();
        }
    }
    
    // ==================== 页面管理功能 ====================
    function initPages() {
        // 获取页面切换按钮
        const switchPromptBtn = document.getElementById('switch-prompt');
        const switchPaintBtn = document.getElementById('switch-paint');
        
        if (!switchPromptBtn || !switchPaintBtn) {
            console.warn('页面切换按钮未找到，延迟初始化...');
            setTimeout(initPages, 100);
            return;
        }
        
        // 移除旧的事件监听器
        switchPromptBtn.replaceWith(switchPromptBtn.cloneNode(true));
        switchPaintBtn.replaceWith(switchPaintBtn.cloneNode(true));
        
        // 重新获取按钮
        const newSwitchPromptBtn = document.getElementById('switch-prompt');
        const newSwitchPaintBtn = document.getElementById('switch-paint');
        
       // 切换到提示词生成页面
newSwitchPromptBtn.addEventListener('click', function() {
    if (!this.classList.contains('active')) {
        // 更新按钮状态
        newSwitchPromptBtn.classList.add('active');
        newSwitchPaintBtn.classList.remove('active');
        
        // 切换页面
        document.getElementById('prompt-page').style.display = 'block';
        document.getElementById('paint-page').style.display = 'none';
        
        // 更新状态并加载页面内容
        AppState.currentPage = 'prompt';
        loadPromptPage();
    }
});

// 切换到色绘设计页面
newSwitchPaintBtn.addEventListener('click', function() {
    if (!this.classList.contains('active')) {
        // 更新按钮状态
        newSwitchPaintBtn.classList.add('active');
        newSwitchPromptBtn.classList.remove('active');
        
        // 切换页面
        document.getElementById('paint-page').style.display = 'block';
        document.getElementById('prompt-page').style.display = 'none';
        
        // 更新状态并加载页面内容
        AppState.currentPage = 'paint';
        loadPaintPage();
    }
});
        
        // 初始激活提示词页面按钮
        if (AppState.currentPage === 'prompt') {
            newSwitchPromptBtn.classList.add('active');
            newSwitchPaintBtn.classList.remove('active');
        } else {
            newSwitchPaintBtn.classList.add('active');
            newSwitchPromptBtn.classList.remove('active');
        }
    }
// ==================== 页面加载功能 ====================
function loadPromptPage() {
    const promptPage = document.getElementById('prompt-page');
    if (!promptPage) {
        console.error('提示词页面容器未找到');
        return;
    }
    
    // 显示页面
    promptPage.style.display = 'block';
    
    // 检查是否已经初始化过
    if (promptPage.querySelector('.tabs') && !promptPage.querySelector('.tabs').hasAttribute('data-initialized')) {
        // 标记为已初始化
        promptPage.querySelector('.tabs').setAttribute('data-initialized', 'true');
        
        // 初始化提示词系统
        if (typeof initializePromptSystem === 'function') {
            console.log('正在初始化提示词生成系统...');
            try {
                initializePromptSystem();
            } catch (error) {
                console.error('提示词系统初始化失败:', error);
            }
        } else {
            console.warn('initializePromptSystem 函数未找到，等待脚本加载');
            // 如果函数还没加载，等待一下
            setTimeout(() => {
                if (typeof initializePromptSystem === 'function') {
                    initializePromptSystem();
                }
            }, 500);
        }
    }
    
    // 检查是否有从色绘设计传递的提示词
    checkForColorDesignPrompt();
}

function loadPaintPage() {
    const paintPage = document.getElementById('paint-page');
    if (!paintPage) {
        console.error('色绘设计页面容器未找到');
        return;
    }
    
    // 显示页面
    paintPage.style.display = 'block';
    
    // 检查是否已经初始化过
    if (paintPage.querySelector('.canvas-container') && !paintPage.querySelector('.canvas-container').hasAttribute('data-initialized')) {
        // 标记为已初始化
        paintPage.querySelector('.canvas-container').setAttribute('data-initialized', 'true');
        
        // 初始化色绘设计系统
        if (typeof initializePaintSystem === 'function') {
            console.log('正在初始化色绘设计系统...');
            try {
                initializePaintSystem();
            } catch (error) {
                console.error('色绘设计系统初始化失败:', error);
            }
        } else {
            console.warn('initializePaintSystem 函数未找到，等待脚本加载');
            // 如果函数还没加载，等待一下
            setTimeout(() => {
                if (typeof initializePaintSystem === 'function') {
                    initializePaintSystem();
                }
            }, 500);
        }
    }
}

// 移除 loadScript 函数，因为不再需要动态加载
function loadScript(src) {
    console.log(`脚本 ${src} 已预加载`);
    return Promise.resolve();
}
    
    // ==================== 工具函数 ====================
    function checkForColorDesignPrompt() {
        const colorDesignPrompt = sessionStorage.getItem('colorDesignPrompt');
        if (colorDesignPrompt) {
            console.log('检测到来自色绘设计的提示词:', colorDesignPrompt);
            
            // 延迟执行确保DOM已加载
            setTimeout(() => {
                const activePanel = document.querySelector('.panel.active');
                if (activePanel) {
                    const panelId = activePanel.id;
                    const section = panelId.split('-')[0];
                    const descTextarea = document.getElementById(`${section}-desc`);
                    
                    if (descTextarea) {
                        descTextarea.value = colorDesignPrompt;
                        showNotification('已从色绘设计导入提示词', 'success');
                    }
                }
                
                // 清除存储
                sessionStorage.removeItem('colorDesignPrompt');
            }, 1000);
        }
    }
    
    function showNotification(message, type = 'success') {
        // 检查是否已存在通知容器
        let notification = document.getElementById('global-notification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'global-notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'error' ? '#ff4d4f' : '#52c41a'};
                color: white;
                padding: 12px 24px;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 9999;
                opacity: 0;
                transform: translateY(-20px);
                transition: all 0.3s ease;
                max-width: 300px;
                word-break: break-word;
            `;
            document.body.appendChild(notification);
        }
        
        notification.textContent = message;
        notification.style.background = type === 'error' ? '#ff4d4f' : '#52c41a';
        notification.style.display = 'block';
        
        // 触发重绘
        notification.offsetHeight;
        
        // 显示动画
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10);
        
        // 3秒后隐藏
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                notification.style.display = 'none';
            }, 300);
        }, 3000);
    }
    
    // ==================== 全局函数导出 ====================
    function exportFunctionsToGlobal() {
        window.showNotification = showNotification;
        window.logout = logout;
        window.loadPromptPage = loadPromptPage;
        window.loadPaintPage = loadPaintPage;
        window.initPages = initPages;
        window.showMainApp = showMainApp;
        window.handleLogin = handleLogin;
        window.initLogin = initLogin;
    }
    
    // 立即执行初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', exportFunctionsToGlobal);
    } else {
        exportFunctionsToGlobal();
    }
})();