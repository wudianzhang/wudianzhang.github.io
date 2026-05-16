// 吴店长工具授权中心 - ModelScope模型库风格

let allTools = [];
let allTags = [];
let currentFilter = 'all';
let searchQuery = '';
let currentSort = 'default';

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 吴店长工具授权中心初始化中...');
    
    try {
        await loadLicenseData();
        renderCategories();
        renderToolsList();
        updateResultCount();
        bindEvents();
        
        console.log('✅ 初始化完成，共加载', allTools.length, '个工具');
    } catch (error) {
        console.error('❌ 初始化失败:', error);
        showError('加载数据失败: ' + error.message);
    }
});

// 加载授权数据
async function loadLicenseData() {
    try {
        // 使用可配置的数据路径
        const dataPath = window.TOOLS_DATA_PATH || 'jsons/pages.json';
        console.log(`📡 正在请求 ${dataPath} ...`);
        const timestamp = new Date().getTime();
        const response = await fetch(`${dataPath}?t=${timestamp}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ JSON 解析成功');
        
        // JSON 现在是数组
        allTools = Array.isArray(data) ? data : (data.tools || data || []);
        
        // 收集所有标签
        const tagSet = new Set();
        allTools.forEach(tool => {
            (tool.tags || []).forEach(tag => tagSet.add(tag));
        });
        allTags = Array.from(tagSet);
        
        console.log('📦 加载工具:', allTools.length);
        console.log('📦 加载标签:', allTags.length, allTags);
        
    } catch (error) {
        console.error('❌ 加载失败:', error);
        throw error;
    }
}

// 渲染左侧分类导航（使用标签）
function renderCategories() {
    const container = document.getElementById('categoryList');
    if (!container) return;
    
    container.innerHTML = '';
    
    // 全部选项
    const allCount = allTools.length;
    const allItem = document.createElement('div');
    allItem.className = 'category-item active';
    allItem.dataset.tag = 'all';
    allItem.innerHTML = `
        <span class="category-icon">📋</span>
        <span>全部</span>
        <span class="category-count">${allCount}</span>
    `;
    allItem.addEventListener('click', () => filterByTag('all'));
    container.appendChild(allItem);
    
    // 标签列表（不添加分割线）
    allTags.forEach(tag => {
        const count = allTools.filter(t => (t.tags || []).includes(tag)).length;
        
        const item = document.createElement('div');
        item.className = 'category-item';
        item.dataset.tag = tag;
        item.innerHTML = `
            <span>${tag}</span>
            <span class="category-count">${count}</span>
        `;
        item.addEventListener('click', () => filterByTag(tag));
        container.appendChild(item);
    });
}

// 渲染热门标签
function renderTagCloud() {
    // 不再需要，标签已整合到分类导航中
}

// 渲染工具列表
function renderToolsList() {
    const list = document.getElementById('toolsList');
    const emptyState = document.getElementById('emptyState');
    
    if (!list) return;
    
    let filtered = getFilteredTools();
    filtered = sortTools(filtered);
    
    console.log(`🎨 渲染 ${filtered.length} 个工具`);
    
    list.innerHTML = '';
    
    if (filtered.length === 0) {
        list.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
        return;
    }
    
    list.style.display = 'flex';
    if (emptyState) emptyState.style.display = 'none';
    
    filtered.forEach((tool, index) => {
        try {
            // 支持自定义卡片创建
            const card = window.customCreateCard ? window.customCreateCard(tool, index) : createToolCard(tool, index);
            list.appendChild(card);
        } catch (e) {
            console.error('❌ 渲染卡片失败:', tool.name, e);
        }
    });
}

// 获取筛选后的工具
function getFilteredTools() {
    let filtered = allTools;
    
    // 标签筛选
    if (currentFilter !== 'all') {
        filtered = filtered.filter(t => (t.tags || []).includes(currentFilter));
    }
    
    // 搜索筛选
    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(t => 
            t.name.toLowerCase().includes(query) ||
            t.description.toLowerCase().includes(query) ||
            (t.tags || []).some(tag => tag.toLowerCase().includes(query))
        );
    }
    
    return filtered;
}

// 排序
function sortTools(tools) {
    const sorted = [...tools];
    
    switch (currentSort) {
        case 'downloads':
            sorted.sort((a, b) => (b.view || 0) - (a.view || 0));
            break;
        case 'newest':
            sorted.sort((a, b) => {
                const da = a.publishDate || '';
                const db = b.publishDate || '';
                return db.localeCompare(da);
            });
            break;
        default:
            break;
    }
    
    return sorted;
}

// 创建工具卡片 - ModelScope风格
function createToolCard(tool, index) {
    const card = document.createElement('div');
    card.className = 'tool-card';
    
    const isExpiring = isExpiringSoon(tool.expiryDate);
    const isNew = isNewTool(tool);
    
    card.innerHTML = `
        <div class="card-icon">${tool.icon || '🔧'}</div>
        <div class="card-content">
            <div class="card-header">
                <span class="card-title">${tool.name}</span>
                ${isNew ? '<span class="card-badge">NEW</span>' : ''}
            </div>
            <p class="card-description">${tool.description}</p>
            <div class="license-area">
                <span class="license-code" title="${tool.licenseCode || ''}">${tool.licenseCode || 'N/A'}</span>
                <button class="copy-btn" data-code="${tool.licenseCode || ''}">复制</button>
                ${tool.url ? `<a href="${tool.url}" target="_blank" class="open-btn">打开</a>` : ''}
            </div>
            <div class="card-meta">
                <span class="meta-item">
                    <svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"/><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"/></svg>
                    ${formatNumber(tool.view || 0)}
                </span>
                <span class="meta-item">
                    <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>
                    ${tool.version || 'v1.0'}
                </span>
                <span class="meta-item">
                    <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>
                    发布: ${tool.publishDate || '未知'}
                </span>
            </div>
        </div>
    `;
    
    // 复制按钮事件
    const copyBtn = card.querySelector('.copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const code = copyBtn.dataset.code;
            if (code) {
                copyToClipboard(code);
                copyBtn.textContent = '已复制';
                copyBtn.style.background = 'var(--success-color)';
                copyBtn.style.color = 'white';
                setTimeout(() => {
                    copyBtn.textContent = '复制';
                    copyBtn.style.background = '';
                    copyBtn.style.color = '';
                }, 2000);
            }
        });
    }
    
    return card;
}

// 检查是否即将到期（30天内）
function isExpiringSoon(dateStr) {
    if (!dateStr) return false;
    const expiryDate = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
}

// 检查是否是新工具（30天内）
function isNewTool(tool) {
    // 可以根据创建时间判断，这里简单处理
    return false;
}

// 复制到剪贴板
async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
        showToast('✅ 激活码已复制');
    } catch (error) {
        console.error('❌ 复制失败:', error);
        showToast('❌ 复制失败');
    }
}

// 显示Toast
function showToast(message, duration = 2000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

// 显示错误
function showError(message) {
    const emptyState = document.getElementById('emptyState');
    if (emptyState) {
        emptyState.style.display = 'flex';
        emptyState.innerHTML = `
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#ff4d4f" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4m0 4h.01"/>
            </svg>
            <p class="empty-text">${message}</p>
            <button class="btn-reset" onclick="location.reload()">🔄 刷新页面</button>
        `;
    }
}

// 按标签筛选
function filterByTag(tag) {
    currentFilter = tag;
    
    // 更新分类激活状态
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tag === tag);
    });
    
    renderToolsList();
    updateResultCount();
}

// 重置筛选
function resetFilters() {
    currentFilter = 'all';
    searchQuery = '';
    document.getElementById('searchInput').value = '';
    renderCategories();
    renderToolsList();
    updateResultCount();
}

// 格式化数字
function formatNumber(num) {
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
    }
    return num.toString();
}

// 更新总统计
function updateResultCount() {
    // 更新总统计（现在只有这一个统计显示）
    updateTotalStats();
}

// 更新总统计
function updateTotalStats() {
    const statsElement = document.getElementById('totalStats');
    if (!statsElement) return;
    
    const filtered = getFilteredTools();
    const totalTools = filtered.length;
    const totalView = filtered.reduce((sum, tool) => sum + (tool.view || 0), 0);
    
    statsElement.innerHTML = `
        <span class="stat-item">共 ${totalTools} 个工具</span>
        <span class="stat-divider">|</span>
        <span class="stat-item">总热度 ${formatNumber(totalView)}</span>
    `;
}

// 执行搜索
function performSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchQuery = searchInput.value;
        renderToolsList();
        updateResultCount();
    }
}

// 绑定事件
function bindEvents() {
    // 搜索输入
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                searchQuery = e.target.value;
                renderToolsList();
                updateResultCount();
            }, 300);
        });
        
        // 回车键搜索
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch();
            }
        });
    }
    
    // 排序标签
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentSort = tab.dataset.sort;
            renderToolsList();
        });
    });
}

// 全局暴露
window.resetFilters = resetFilters;
window.performSearch = performSearch;
