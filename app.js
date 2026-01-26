// app.js - 主要调度程序（合并了登录功能）
(function () {
    'use strict';

    // 应用全局状态
    const AppState = {
        isLoggedIn: false,
        userName: null,
        userRole: null,
        currentPage: 'prompt'  // 可以是 'prompt', 'paint', 'export'
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
    document.addEventListener('DOMContentLoaded', function () {
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
            passwordInput.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    handleLogin();
                }
            });
        }

        const usernameInput = document.getElementById('username');
        if (usernameInput) {
            usernameInput.addEventListener('keypress', function (e) {
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
        const exportPage = document.getElementById('export-page'); // 新增

        if (promptPage) promptPage.style.display = 'none';
        if (paintPage) paintPage.style.display = 'none';
        if (exportPage) exportPage.style.display = 'none'; // 新增

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
        } else if (AppState.currentPage === 'export') { // 新增
            if (exportPage) {
                exportPage.style.display = 'block';
            }
            loadExportPage();
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
        const switchExportBtn = document.getElementById('switch-export'); // 新增

        if (!switchPromptBtn || !switchPaintBtn || !switchExportBtn) { // 修改条件
            console.warn('页面切换按钮未找到，延迟初始化...');
            setTimeout(initPages, 100);
            return;
        }

        // 移除旧的事件监听器
        switchPromptBtn.replaceWith(switchPromptBtn.cloneNode(true));
        switchPaintBtn.replaceWith(switchPaintBtn.cloneNode(true));
        switchExportBtn.replaceWith(switchExportBtn.cloneNode(true)); // 新增

        // 重新获取按钮
        const newSwitchPromptBtn = document.getElementById('switch-prompt');
        const newSwitchPaintBtn = document.getElementById('switch-paint');
        const newSwitchExportBtn = document.getElementById('switch-export'); // 新增

        // 切换到提示词生成页面
        newSwitchPromptBtn.addEventListener('click', function () {
            if (!this.classList.contains('active')) {
                // 更新按钮状态
                newSwitchPromptBtn.classList.add('active');
                newSwitchPaintBtn.classList.remove('active');
                newSwitchExportBtn.classList.remove('active'); // 新增

                // 切换页面
                document.getElementById('prompt-page').style.display = 'block';
                document.getElementById('paint-page').style.display = 'none';
                document.getElementById('export-page').style.display = 'none'; // 新增

                // 更新状态并加载页面内容
                AppState.currentPage = 'prompt';
                loadPromptPage();
            }
        });

        // 切换到色绘设计页面
        newSwitchPaintBtn.addEventListener('click', function () {
            if (!this.classList.contains('active')) {
                // 更新按钮状态
                newSwitchPaintBtn.classList.add('active');
                newSwitchPromptBtn.classList.remove('active');
                newSwitchExportBtn.classList.remove('active'); // 新增

                // 切换页面
                document.getElementById('paint-page').style.display = 'block';
                document.getElementById('prompt-page').style.display = 'none';
                document.getElementById('export-page').style.display = 'none'; // 新增

                // 更新状态并加载页面内容
                AppState.currentPage = 'paint';
                loadPaintPage();
            }
        });

        // 切换到导出页面（新增）
        newSwitchExportBtn.addEventListener('click', function () {
            if (!this.classList.contains('active')) {
                // 更新按钮状态
                newSwitchExportBtn.classList.add('active');
                newSwitchPromptBtn.classList.remove('active');
                newSwitchPaintBtn.classList.remove('active');

                // 切换页面
                document.getElementById('export-page').style.display = 'block';
                document.getElementById('prompt-page').style.display = 'none';
                document.getElementById('paint-page').style.display = 'none';

                // 更新状态并加载页面内容
                AppState.currentPage = 'export';
                loadExportPage();
            }
        });

        // 初始激活提示词页面按钮
        if (AppState.currentPage === 'prompt') {
            newSwitchPromptBtn.classList.add('active');
            newSwitchPaintBtn.classList.remove('active');
            newSwitchExportBtn.classList.remove('active'); // 新增
        } else if (AppState.currentPage === 'paint') {
            newSwitchPaintBtn.classList.add('active');
            newSwitchPromptBtn.classList.remove('active');
            newSwitchExportBtn.classList.remove('active'); // 新增
        } else if (AppState.currentPage === 'export') { // 新增
            newSwitchExportBtn.classList.add('active');
            newSwitchPromptBtn.classList.remove('active');
            newSwitchPaintBtn.classList.remove('active');
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
    // ==================== 导出页面加载功能 ====================
    function loadExportPage() {
        const exportPage = document.getElementById('export-page');
        if (!exportPage) {
            console.error('导出页面容器未找到');
            return;
        }

        // 显示页面
        exportPage.style.display = 'block';

        // 初始化导出系统
        if (typeof initializeExportSystem === 'function') {
            console.log('正在初始化导出系统...');
            try {
                initializeExportSystem();
            } catch (error) {
                console.error('导出系统初始化失败:', error);
                showNotification('导出系统初始化失败，请刷新页面', 'error');
            }
        } else {
            console.warn('initializeExportSystem 函数未找到');
            // 加载yun.js脚本
            const script = document.createElement('script');
            script.src = 'yun.js';
            script.onload = function () {
                if (typeof initializeExportSystem === 'function') {
                    initializeExportSystem();
                }
            };
            document.head.appendChild(script);
        }

        // 每次切换到导出页面时都刷新数据
        if (typeof window.refreshExportPageData === 'function') {
            console.log('切换到导出页面，刷新数据...');
            // 延迟一点时间确保DOM已完全加载
            setTimeout(() => {
                window.refreshExportPageData();
            }, 300);
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


    (function () {
        'use strict';
    
        // 云端配置
        const CLOUD_CONFIG = {
            gistId: '0742fa52c4e33f8115fc60ce8c216732',
            gistUrl: 'https://api.github.com/gists',
            token: localStorage.getItem('cloudToken') || '',
            fileName: 'tishici.json'
        };
    
        // 导出页面状态
        let exportState = null;
    
        // 防止重复初始化的标志
        let isExportSystemInitialized = false;
    
        // 检查并从云端加载
        async function checkAndLoadCloud() {
            let token = localStorage.getItem('cloudToken') || '';
    
            if (!token) {
                token = prompt('请输入GitHub Personal Access Token:');
                if (!token) {
                    showExportNotification('操作已取消', 'error');
                    return;
                }
                localStorage.setItem('cloudToken', token);
            }
    
            // 更新 CLOUD_CONFIG
            CLOUD_CONFIG.token = token;
            await handleLoadCloud();
        }
    
        // ==================== 统一的刷新函数 ====================
        function refreshExportPageData() {
            console.log('刷新导出页面数据');
    
            // 1. 更新记录列表
            loadLocalRecords();
    
            // 2. 更新筛选器下拉菜单词条
            initializeFilters();
    
            // 3. 更新Token状态显示
            updateTokenDisplay();
    
            console.log('导出页面数据刷新完成');
        }
    
        // ==================== 初始化导出系统 ====================
        window.initializeExportSystem = function () {
            console.log('初始化导出系统');
    
            // 防止重复初始化
            if (isExportSystemInitialized) {
                console.log('导出系统已经初始化，跳过');
                return;
            }
    
            isExportSystemInitialized = true;
    
            // 初始化 exportState
            exportState = {
                currentSection: 'all',
                currentSpace: 'all',
                currentStyle: 'all',
                filteredRecords: [],
                cloudToken: CLOUD_CONFIG.token
            };
    
            // 绑定事件
            bindExportEvents();
    
            // 使用统一的刷新函数
            refreshExportPageData();
        };
    
        // ==================== 绑定事件 ====================
        function bindExportEvents() {
            // 导出到本地按钮
            const exportLocalBtn = document.getElementById('export-local-btn');
            if (exportLocalBtn) {
                exportLocalBtn.addEventListener('click', handleExportLocal);
            }
            // 上传到云端按钮
            const uploadCloudBtn = document.getElementById('upload-cloud-btn');
            if (uploadCloudBtn) {
                // 移除可能已存在的事件监听器，然后添加新的
                uploadCloudBtn.removeEventListener('click', handleUploadCloudWrapper);
                uploadCloudBtn.addEventListener('click', handleUploadCloudWrapper);
            }
    
            // 从云端加载按钮
            const loadCloudBtn = document.getElementById('load-cloud-btn');
            if (loadCloudBtn) {
                // 移除可能已存在的事件监听器，然后添加新的
                loadCloudBtn.removeEventListener('click', handleLoadCloudWrapper);
                loadCloudBtn.addEventListener('click', handleLoadCloudWrapper);
            }
    
            // 全部清空按钮
            const clearAllBtn = document.getElementById('clear-all-records');
            if (clearAllBtn) {
                clearAllBtn.addEventListener('click', handleClearAllRecords);
            }
    
    
            // 筛选器变化事件
            const sectionFilter = document.getElementById('section-filter');
            const spaceFilter = document.getElementById('space-filter');
            const styleFilter = document.getElementById('style-filter');
    
            if (sectionFilter) {
                sectionFilter.addEventListener('change', handleFilterChange);
            }
            if (spaceFilter) {
                spaceFilter.addEventListener('change', handleFilterChange);
            }
            if (styleFilter) {
                styleFilter.addEventListener('change', handleFilterChange);
            }
    
            // 返回按钮
            const backBtn = document.getElementById('export-back-btn');
            if (backBtn) {
                backBtn.addEventListener('click', function () {
                    // 切换到提示词页面
                    document.getElementById('export-page').style.display = 'none';
                    document.getElementById('prompt-page').style.display = 'block';
    
                    // 更新页面切换按钮状态
                    const switchPromptBtn = document.getElementById('switch-prompt');
                    const switchPaintBtn = document.getElementById('switch-paint');
                    const switchExportBtn = document.getElementById('switch-export');
    
                    if (switchPromptBtn) switchPromptBtn.classList.add('active');
                    if (switchPaintBtn) switchPaintBtn.classList.remove('active');
                    if (switchExportBtn) switchExportBtn.classList.remove('active');
                });
            }
        }
    
        // ==================== 包装函数 ====================
        async function handleUploadCloudWrapper() {
            await checkAndUploadCloud();
        }
    
        async function handleLoadCloudWrapper() {
            await checkAndLoadCloud();
        }
    
        // ==================== 云端操作函数 ====================
        async function checkAndUploadCloud() {
            let token = localStorage.getItem('cloudToken') || '';
    
            if (!token) {
                token = prompt('请输入GitHub Personal Access Token:');
                if (!token) {
                    showExportNotification('操作已取消', 'error');
                    return;
                }
                localStorage.setItem('cloudToken', token);
            }
    
            // 更新 CLOUD_CONFIG
            CLOUD_CONFIG.token = token;
            await handleUploadCloud();
        }
    
        // ==================== 数据加载函数 ====================
        function loadLocalRecords() {
            const history = JSON.parse(localStorage.getItem('aiPromptHistory') || '[]');
            exportState.filteredRecords = history;
    
            // 更新显示
            updateExportDisplay();
    
            // 更新统计信息
            updateStats(history.length);
        }
    
        // ==================== 筛选器初始化函数 ====================
        function initializeFilters() {
            const history = JSON.parse(localStorage.getItem('aiPromptHistory') || '[]');
    
            // 收集所有板块、空间、风格
            const sections = new Set(['all']);
            const spaces = new Set(['all']);
            const styles = new Set(['all']);
    
            history.forEach(record => {
                if (record.section && record.section !== '未知板块') {
                    sections.add(record.section);
                }
                if (record.space && record.space !== '未选择空间') {
                    spaces.add(record.space);
                }
                if (record.style && record.style !== '未选择风格') {
                    styles.add(record.style);
                }
            });
    
            // 填充板块筛选器
            const sectionFilter = document.getElementById('section-filter');
            if (sectionFilter) {
                sectionFilter.innerHTML = '';
                sections.forEach(section => {
                    const option = document.createElement('option');
                    option.value = section === 'all' ? 'all' : section;
                    option.textContent = section === 'all' ? '所有版块' : section;
                    sectionFilter.appendChild(option);
                });
            }
    
            // 填充空间筛选器
            const spaceFilter = document.getElementById('space-filter');
            if (spaceFilter) {
                spaceFilter.innerHTML = '';
                spaces.forEach(space => {
                    const option = document.createElement('option');
                    option.value = space === 'all' ? 'all' : space;
                    option.textContent = space === 'all' ? '所有空间' : space;
                    spaceFilter.appendChild(option);
                });
            }
    
            // 填充风格筛选器
            const styleFilter = document.getElementById('style-filter');
            if (styleFilter) {
                styleFilter.innerHTML = '';
                styles.forEach(style => {
                    const option = document.createElement('option');
                    option.value = style === 'all' ? 'all' : style;
                    option.textContent = style === 'all' ? '所有风格' : style;
                    styleFilter.appendChild(option);
                });
            }
        }
    
        // ==================== 筛选器处理函数 ====================
        function handleFilterChange() {
            const sectionFilter = document.getElementById('section-filter');
            const spaceFilter = document.getElementById('space-filter');
            const styleFilter = document.getElementById('style-filter');
    
            exportState.currentSection = sectionFilter ? sectionFilter.value : 'all';
            exportState.currentSpace = spaceFilter ? spaceFilter.value : 'all';
            exportState.currentStyle = styleFilter ? styleFilter.value : 'all';
    
            // 应用筛选
            applyFilters();
        }
    
        function applyFilters() {
            const history = JSON.parse(localStorage.getItem('aiPromptHistory') || '[]');
    
            let filtered = history;
    
            // 按板块筛选
            if (exportState.currentSection !== 'all') {
                filtered = filtered.filter(record =>
                    record.section && record.section === exportState.currentSection
                );
            }
    
            // 按空间筛选
            if (exportState.currentSpace !== 'all') {
                filtered = filtered.filter(record =>
                    record.space && record.space === exportState.currentSpace
                );
            }
    
            // 按风格筛选
            if (exportState.currentStyle !== 'all') {
                filtered = filtered.filter(record =>
                    record.style && record.style === exportState.currentStyle
                );
            }
    
            exportState.filteredRecords = filtered;
            updateExportDisplay();
            updateStats(filtered.length);
        }
    
        // ==================== 显示更新函数 ====================
        function updateExportDisplay() {
            const exportContent = document.getElementById('export-content');
            if (!exportContent) return;
    
            if (exportState.filteredRecords.length === 0) {
                exportContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>暂无提示词记录</p>
                </div>
            `;
                return;
            }
    
            let html = '';
            exportState.filteredRecords.forEach((record, index) => {
                html += `
                <div class="export-record-item" data-id="${record.id}">
                    <div class="export-record-header">
                        <div class="export-record-tags">
                            <span class="export-record-section">${record.section || '未知板块'}</span>
                            ${record.style && record.style !== '未选择风格' ? `<span class="export-record-tag">${record.style}</span>` : ''}
                            ${record.space && record.space !== '未选择空间' ? `<span class="export-record-tag">${record.space}</span>` : ''}
                        </div>
                        <span class="export-record-time">${record.timestamp}</span>
                    </div>
                    <div class="export-record-prompt" contenteditable="true" data-id="${record.id}">${record.prompt}</div>
                    <div class="export-record-actions">
                        <button class="btn small-btn edit-record-btn" data-id="${record.id}">
                            <i class="fas fa-edit"></i> 编辑
                        </button>
                        <button class="btn small-btn save-record-btn" data-id="${record.id}" style="display:none;">
                            <i class="fas fa-save"></i> 保存
                        </button>
                        <button class="btn small-btn copy-record-btn" data-id="${record.id}">
                            <i class="fas fa-copy"></i> 复制
                        </button>
                        <button class="btn small-btn delete-record-btn" data-id="${record.id}">
                            <i class="fas fa-trash"></i> 删除
                        </button>
                    </div>
                </div>
            `;
            });
            exportContent.innerHTML = html;
    
            // 为编辑按钮绑定事件
            exportContent.querySelectorAll('.edit-record-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    const id = parseInt(this.dataset.id);
                    const recordItem = this.closest('.export-record-item');
                    const promptElement = recordItem.querySelector('.export-record-prompt');
                    const saveBtn = recordItem.querySelector('.save-record-btn');
                    const editBtn = recordItem.querySelector('.edit-record-btn');
    
                    // 启用编辑模式
                    promptElement.focus();
                    promptElement.style.border = "1px solid var(--primary)";
                    promptElement.style.padding = "8px";
                    promptElement.style.borderRadius = "4px";
                    promptElement.style.backgroundColor = "var(--bg-secondary)";
    
                    // 显示保存按钮，隐藏编辑按钮
                    saveBtn.style.display = "inline-block";
                    editBtn.style.display = "none";
    
                    // 自动选中文本
                    const range = document.createRange();
                    range.selectNodeContents(promptElement);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                });
            });
    
            // 为保存按钮绑定事件
            exportContent.querySelectorAll('.save-record-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    const id = parseInt(this.dataset.id);
                    const recordItem = this.closest('.export-record-item');
                    const promptElement = recordItem.querySelector('.export-record-prompt');
                    const saveBtn = recordItem.querySelector('.save-record-btn');
                    const editBtn = recordItem.querySelector('.edit-record-btn');
    
                    // 获取编辑后的内容
                    const newPrompt = promptElement.textContent.trim();
    
                    if (!newPrompt) {
                        showExportNotification('提示词不能为空', 'error');
                        return;
                    }
    
                    // 更新本地存储中的记录
                    let history = JSON.parse(localStorage.getItem('aiPromptHistory') || '[]');
                    const index = history.findIndex(r => r.id === id);
    
                    if (index !== -1) {
                        // 更新提示词内容
                        history[index].prompt = newPrompt;
    
                        // 更新修改时间
                        history[index].timestamp = new Date().toLocaleString('zh-CN');
    
                        // 保存回本地存储
                        localStorage.setItem('aiPromptHistory', JSON.stringify(history));
    
                        // 更新当前显示的状态
                        const record = exportState.filteredRecords.find(r => r.id === id);
                        if (record) {
                            record.prompt = newPrompt;
                            record.timestamp = history[index].timestamp;
                        }
    
                        // 恢复显示状态
                        promptElement.style.border = "none";
                        promptElement.style.padding = "0";
                        promptElement.style.backgroundColor = "transparent";
                        saveBtn.style.display = "none";
                        editBtn.style.display = "inline-block";
    
                        showExportNotification('记录已更新', 'success');
    
                        // 更新统计信息
                        updateStats(exportState.filteredRecords.length);
    
                        // 更新时间显示
                        const timeElement = recordItem.querySelector('.export-record-time');
                        if (timeElement) {
                            timeElement.textContent = history[index].timestamp;
                        }
                    } else {
                        showExportNotification('未找到要更新的记录', 'error');
                    }
                });
            });
    
            // 为复制和删除按钮绑定事件
            exportContent.querySelectorAll('.copy-record-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    const id = parseInt(this.dataset.id);
                    const record = exportState.filteredRecords.find(r => r.id === id);
                    if (record) {
                        navigator.clipboard.writeText(record.prompt).then(() => {
                            showExportNotification('提示词已复制', 'success');
                        }).catch(() => {
                            // 降级方案
                            const textArea = document.createElement('textarea');
                            textArea.value = record.prompt;
                            document.body.appendChild(textArea);
                            textArea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textArea);
                            showExportNotification('提示词已复制', 'success');
                        });
                    }
                });
            });
    
            exportContent.querySelectorAll('.delete-record-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    const id = parseInt(this.dataset.id);
                    if (confirm('确定要删除这条记录吗？')) {
                        let history = JSON.parse(localStorage.getItem('aiPromptHistory') || '[]');
                        history = history.filter(r => r.id !== id);
                        localStorage.setItem('aiPromptHistory', JSON.stringify(history));
    
                        // 使用统一的刷新函数
                        refreshExportPageData();
                        showExportNotification('记录已删除', 'success');
                    }
                });
            });
    
            // 添加失焦自动保存功能
            exportContent.addEventListener('blur', function (e) {
                if (e.target.classList.contains('export-record-prompt')) {
                    const id = parseInt(e.target.dataset.id);
                    const recordItem = e.target.closest('.export-record-item');
                    const saveBtn = recordItem.querySelector('.save-record-btn');
    
                    // 如果有保存按钮且可见，则触发保存
                    if (saveBtn && saveBtn.style.display === 'inline-block') {
                        saveBtn.click();
                    }
                }
            }, true);
    
            // 添加回车保存功能
            exportContent.addEventListener('keydown', function (e) {
                if (e.target.classList.contains('export-record-prompt') && e.key === 'Enter') {
                    e.preventDefault();
                    const id = parseInt(e.target.dataset.id);
                    const recordItem = e.target.closest('.export-record-item');
                    const saveBtn = recordItem.querySelector('.save-record-btn');
    
                    if (saveBtn && saveBtn.style.display === 'inline-block') {
                        saveBtn.click();
                    }
                }
            }, true);
        }
    
        // ==================== 工具函数 ====================
        function updateStats(count) {
            const statsElement = document.getElementById('export-stats');
            if (statsElement) {
                statsElement.textContent = `共找到 ${count} 条记录`;
            }
        }
    
        function updateTokenDisplay() {
            const tokenStatus = document.getElementById('token-status');
            if (tokenStatus) {
                if (exportState.cloudToken) {
                    tokenStatus.textContent = '已设置Token';
                    tokenStatus.className = 'token-status success';
                } else {
                    tokenStatus.textContent = '未设置Token';
                    tokenStatus.className = 'token-status error';
                }
            }
        }
    
        function showExportNotification(message, type = 'success') {
            const notification = document.getElementById('export-notification');
            if (!notification) return;
    
            notification.textContent = message;
            notification.className = `export-notification ${type}`;
            notification.style.display = 'block';
    
            // 3秒后隐藏
            setTimeout(() => {
                notification.style.display = 'none';
            }, 3000);
        }
    
        // ==================== 导出功能函数 ====================
        function handleExportLocal() {
            if (exportState.filteredRecords.length === 0) {
                showExportNotification('没有可导出的记录', 'error');
                return;
            }
    
            const exportData = exportState.filteredRecords.map(r =>
                `【${r.section}】${r.timestamp}\n${r.prompt}\n${'='.repeat(50)}`
            ).join('\n\n');
    
            const blob = new Blob([exportData], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `AI绘画提示词_${new Date().toISOString().slice(0, 10)}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
    
            showExportNotification(`已导出 ${exportState.filteredRecords.length} 条记录`);
        }
    
        // ==================== 云端操作函数 ====================
        async function handleUploadCloud() {
            if (!exportState.cloudToken) {
                showExportNotification('请先设置GitHub Token', 'error');
                return;
            }
    
            const history = JSON.parse(localStorage.getItem('aiPromptHistory') || '[]');
            if (history.length === 0) {
                showExportNotification('没有可上传的记录', 'error');
                return;
            }
    
            try {
                showExportNotification('正在上传到云端...', 'info');
    
                // 检查是否已存在Gist
                let gist = null;
                try {
                    const response = await fetch(`${CLOUD_CONFIG.gistUrl}/${CLOUD_CONFIG.gistId}`, {
                        headers: {
                            'Authorization': `token ${exportState.cloudToken}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    });
    
                    if (response.ok) {
                        gist = await response.json();
                    }
                } catch (error) {
                    console.log('Gist不存在，将创建新的');
                }
    
                // 准备数据
                const data = {
                    files: {
                        [CLOUD_CONFIG.fileName]: {
                            content: JSON.stringify(history, null, 2)
                        }
                    },
                    description: `AI绘画提示词备份 - ${new Date().toLocaleString()}`,
                    public: false
                };
    
                let response;
                if (gist) {
                    // 更新现有Gist
                    response = await fetch(`${CLOUD_CONFIG.gistUrl}/${CLOUD_CONFIG.gistId}`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `token ${exportState.cloudToken}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/vnd.github.v3+json'
                        },
                        body: JSON.stringify(data)
                    });
                } else {
                    // 创建新Gist
                    data.files['tishici.json'] = data.files[CLOUD_CONFIG.fileName];
                    delete data.files[CLOUD_CONFIG.fileName];
    
                    response = await fetch(CLOUD_CONFIG.gistUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': `token ${exportState.cloudToken}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/vnd.github.v3+json'
                        },
                        body: JSON.stringify(data)
                    });
                }
    
                if (response.ok) {
                    const result = await response.json();
                    showExportNotification('上传成功！', 'success');
                    console.log('云端备份成功:', result);
                } else {
                    const error = await response.text();
                    throw new Error(`上传失败: ${error}`);
                }
            } catch (error) {
                console.error('上传到云端失败:', error);
                showExportNotification(`上传失败: ${error.message}`, 'error');
            }
        }
    
        async function handleLoadCloud() {
            if (!exportState.cloudToken) {
                showExportNotification('请先设置GitHub Token', 'error');
                return;
            }
    
            // 修复：将 confirm 对话框提取到变量，避免重复触发
            let userConfirmed = false;
            try {
                userConfirmed = confirm('这将用云端记录覆盖本地记录，确定继续吗？');
            } catch (e) {
                console.error('Confirm对话框出错:', e);
                return;
            }
    
            if (!userConfirmed) {
                return;
            }
    
            try {
                showExportNotification('正在从云端加载...', 'info');
    
                const response = await fetch(`${CLOUD_CONFIG.gistUrl}/${CLOUD_CONFIG.gistId}`, {
                    headers: {
                        'Authorization': `token ${exportState.cloudToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
    
                if (!response.ok) {
                    throw new Error(`请求失败: ${response.status}`);
                }
    
                const gist = await response.json();
                const file = gist.files[CLOUD_CONFIG.fileName] || gist.files['tishici.json'];
    
                if (!file || !file.content) {
                    throw new Error('云端文件不存在或为空');
                }
    
                const cloudData = JSON.parse(file.content);
    
                // 保存到本地
                localStorage.setItem('aiPromptHistory', JSON.stringify(cloudData));
    
                // 使用统一的刷新函数更新页面
                refreshExportPageData();
    
                showExportNotification(`已加载 ${cloudData.length} 条云端记录`, 'success');
    
                // 如果提示词页面有历史记录，也更新它
                if (typeof renderHistory === 'function') {
                    renderHistory();
                }
            } catch (error) {
                console.error('从云端加载失败:', error);
                showExportNotification(`加载失败: ${error.message}`, 'error');
            }
        }
    
        // ==================== 清空记录函数 ====================
        function handleClearAllRecords() {
            if (exportState.filteredRecords.length === 0) {
                showExportNotification('没有可清空的记录', 'error');
                return;
            }
    
            if (confirm('确定要清空所有提示词记录吗？此操作不可恢复！')) {
                localStorage.removeItem('aiPromptHistory');
    
                // 使用统一的刷新函数
                refreshExportPageData();
    
                showExportNotification('所有记录已清空', 'success');
            }
        }
    
        // ==================== 全局函数导出 ====================
        // 导出刷新函数到全局，供其他模块调用
        window.refreshExportPageData = refreshExportPageData;
    
        // ==================== 自动初始化 ====================
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setTimeout(() => {
                if (typeof initializeExportSystem === 'function') {
                    initializeExportSystem();
                }
            }, 100);
        } else {
            document.addEventListener('DOMContentLoaded', function () {
                setTimeout(() => {
                    if (typeof initializeExportSystem === 'function') {
                        initializeExportSystem();
                    }
                }, 100);
            });
        }
    })();
    


    // ==================== 全局函数导出 ====================
    function exportFunctionsToGlobal() {
        window.showNotification = showNotification;
        window.logout = logout;
        window.loadPromptPage = loadPromptPage;
        window.loadPaintPage = loadPaintPage;
        window.loadExportPage = loadExportPage; // 新增
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

