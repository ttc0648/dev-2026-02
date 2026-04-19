// 请在这里完成你的 JavaScript 逻辑。
// 你需要：
// 1. 页面加载后请求任务列表（GET）
// 2. 点击"刷新任务"按钮时重新获取列表
// 3. 提交表单时向 API 新增任务（POST）
// 4. 根据下拉框筛选任务
// 5. 把接口返回的数据渲染到页面上

// 全局配置
const API_URL = 'https://api.yangyus8.top/api/tasks';
let currentTasks = [];

// DOM 元素
const taskListElement = document.getElementById('task-list');
const refreshButton = document.getElementById('refresh-btn');
const taskForm = document.getElementById('task-form');
const filterSelect = document.getElementById('status-filter');
const messageBox = document.getElementById('message-box');

// 状态映射（统一使用这个版本，匹配 CSS 的 badge 类）
const statusMap = {
  'todo': { text: '待开始', class: 'todo' },
  'doing': { text: '进行中', class: 'doing' },
  'done': { text: '已完成', class: 'done' }
};

// 1. 获取任务列表
async function fetchTasks() {
  try {
    showMessage('加载中...', false);
    
    const res = await fetch(API_URL);
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: 请求失败`);
    }
    
    const result = await res.json();
    
    // API 返回格式: { success: true, data: [...] }
    if (!result.success) {
      throw new Error(result.message || '获取任务失败');
    }
    
    currentTasks = result.data || [];
    
    // 根据当前筛选条件渲染
    if (filterSelect && filterSelect.value !== 'all') {
      handleFilterChange({ target: filterSelect });
    } else {
      renderTasks(currentTasks);
    }
    
    if (currentTasks.length === 0) {
      showMessage('暂无任务数据', true);
    } else {
      showMessage(`成功加载 ${currentTasks.length} 个任务`, true);
    }
  } catch (err) {
    console.error('获取任务失败:', err);
    showMessage('错误：' + err.message, false);
    currentTasks = [];
    renderTasks([]);
  }
}

// 2. 渲染任务到页面
function renderTasks(tasksToRender) {
  if (!taskListElement) {
    console.error('找不到 task-list 元素');
    return;
  }
  
  taskListElement.innerHTML = '';

  if (!tasksToRender || tasksToRender.length === 0) {
    taskListElement.innerHTML = '<li class="empty-state">📋 暂无任务，创建一个吧</li>';
    return;
  }

  tasksToRender.forEach(task => {
    const item = document.createElement('li');
    item.className = 'task-item';
    
    // 使用全局的 statusMap
    const statusInfo = statusMap[task.status] || { text: task.status, class: '' };
    
    // 格式化时间
    const createdDate = task.createdAt 
      ? new Date(task.createdAt).toLocaleDateString('zh-CN') 
      : '未知时间';

    item.innerHTML = `
      <h3>${escapeHtml(task.title)}</h3>
      <div class="task-meta">
        <span>👤 ${escapeHtml(task.owner) || '未指派'}</span>
        <span>📅 ${createdDate}</span>
        <span class="badge ${statusInfo.class}">${statusInfo.text}</span>
      </div>
    `;

    taskListElement.appendChild(item);
  });
}

// 防 XSS 的简单转义函数
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 3. 提示信息
function showMessage(text, isSuccess = false) {
  if (!messageBox) return;
  
  messageBox.textContent = text;
  messageBox.style.color = isSuccess ? '#2e7d32' : '#d32f2f';
  messageBox.style.backgroundColor = isSuccess ? '#e8f5e9' : '#ffebee';
  messageBox.style.padding = '8px 12px';
  messageBox.style.borderRadius = '4px';
  messageBox.style.marginBottom = '12px';
  messageBox.style.display = 'block';

  // 3秒后自动隐藏
  setTimeout(() => {
    messageBox.textContent = '';
    messageBox.style.padding = '0';
    messageBox.style.display = 'none';
  }, 3000);
}

// 4. 提交新任务
async function handleFormSubmit(e) {
  e.preventDefault();

  // 获取表单元素
  const titleInput = document.getElementById('task-title');
  const ownerInput = document.getElementById('task-owner');
  const statusSelect = document.getElementById('task-status');

  const title = titleInput?.value.trim();
  const owner = ownerInput?.value.trim();
  const status = statusSelect?.value;

  // 表单验证
  if (!title) {
    showMessage('请输入任务标题', false);
    titleInput?.focus();
    return;
  }

  if (!owner) {
    showMessage('请输入负责人', false);
    ownerInput?.focus();
    return;
  }

  // 构造请求数据（只发送 API 需要的字段）
  const taskData = {
    title: title,
    owner: owner,
    status: status || 'todo'
  };

  try {
    showMessage('创建任务中...', false);
    
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.message || `请求失败 (${res.status})`);
    }

    if (!result.success) {
      throw new Error(result.message || '创建任务失败');
    }

    showMessage(`✅ 任务 "${title}" 创建成功！`, true);
    
    // 清空表单
    taskForm.reset();
    
    // 重置筛选器为"全部"
    if (filterSelect) {
      filterSelect.value = 'all';
    }
    
    // 刷新任务列表
    await fetchTasks();
    
  } catch (err) {
    console.error('创建任务失败:', err);
    showMessage('创建失败：' + err.message, false);
  }
}

// 5. 筛选状态
function handleFilterChange(e) {
  const selected = e.target.value;

  if (selected === 'all') {
    renderTasks(currentTasks);
  } else {
    // 根据中文文本找到对应的英文状态值
    let statusKey = selected;
    
    // 反向映射：中文 -> 英文
    for (const [key, value] of Object.entries(statusMap)) {
      if (value.text === selected) {
        statusKey = key;
        break;
      }
    }
    
    const filtered = currentTasks.filter(t => t.status === statusKey);
    renderTasks(filtered);
  }
}

// 初始化
async function init() {
  // 检查必要元素是否存在
  if (!taskListElement || !refreshButton || !taskForm || !filterSelect) {
    console.error('页面缺少必要的DOM元素，请检查HTML结构');
    return;
  }

  // 加载初始数据
  await fetchTasks();

  // 绑定事件监听器
  refreshButton.addEventListener('click', () => {
    fetchTasks();
  });
  
  taskForm.addEventListener('submit', handleFormSubmit);
  
  filterSelect.addEventListener('change', handleFilterChange);
}

// 页面加载完成后启动
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}