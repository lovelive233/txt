  // 增强版阻止长按事件的函数，特别针对QQ浏览器链接长按
  function preventLongPressMenu() {
    // 阻止上下文菜单（右键菜单和长按菜单）
    document.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      return false;
    });
    
    // 阻止触摸相关事件
    let touchStartTime = 0;
    const MIN_LONG_PRESS_TIME = 500; // 长按判定时间
    
    // 触摸开始 - 增强版：特别处理链接元素
    document.addEventListener('touchstart', function(e) {
      touchStartTime = new Date().getTime();
      // 检测是否触摸在链接上
      if (e.target.tagName === 'A') {
        e.preventDefault(); // 阻止链接的默认触摸行为
      }
    }, { passive: false });
    
    // 触摸结束
    document.addEventListener('touchend', function(e) {
      // 如果是短按且触摸在链接上，则触发点击
      if (e.target.tagName === 'A') {
        const touchTime = new Date().getTime() - touchStartTime;
        if (touchTime < MIN_LONG_PRESS_TIME && touchTime > 0) {
          e.target.click(); // 模拟点击
        }
      }
      touchStartTime = 0;
    }, { passive: false });
    
    // 触摸移动
    document.addEventListener('touchmove', function(e) {
      // 移动超过一定距离就不算长按
      touchStartTime = 0;
    }, { passive: false });
    
    // 触摸取消
    document.addEventListener('touchcancel', function(e) {
      touchStartTime = 0;
    }, { passive: false });
    
    // 阻止选择文本
    document.addEventListener('selectstart', function(e) {
      // 只允许在搜索框内选择文本
      if (e.target.id !== 'searchInput') {
        e.preventDefault();
        return false;
      }
    });
    // 额外针对QQ浏览器的样式阻止
    const style = document.createElement('style');
    style.textContent = `
      a {
        -webkit-touch-callout: none !important;
        touch-callout: none !important;
        user-select: none !important;
        -webkit-user-select: none !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  // 页面加载时立即执行阻止长按的函数
  preventLongPressMenu();
  
  // 链接点击次数限制相关变量
  const MAX_CLICKS_PER_DAY = 3;
  const STORAGE_KEY = 'linkClickCount_';
  
  // 获取当前日期作为存储键的一部分
  function getCurrentDateKey() {
    const date = new Date();
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }
  
  // 获取当前点击次数
  function getClickCount() {
    const key = STORAGE_KEY + getCurrentDateKey();
    const count = localStorage.getItem(key);
    return count ? parseInt(count, 10) : 0;
  }
  
  // 增加点击次数
  function incrementClickCount() {
    const key = STORAGE_KEY + getCurrentDateKey();
    const count = getClickCount() + 1;
    localStorage.setItem(key, count.toString());
    return count;
  }
  
  // 链接跳转处理函数 - 带次数限制
  function openLink(url) {
    const currentCount = getClickCount();
    
    if (currentCount >= MAX_CLICKS_PER_DAY) {
      alert(`哒咩，今天下载的小说已经(${MAX_CLICKS_PER_DAY}本)了，不少啦，攒着慢慢看才更有滋味呢～不如先休息一下，剩下的明天再继续`);
      return false;
    }
    
    // 增加点击次数并检查是否达到上限
    const newCount = incrementClickCount();
    if (newCount === MAX_CLICKS_PER_DAY) {
      alert(`今天已经下载(${MAX_CLICKS_PER_DAY}本)了，囤积太多看不过来的哦～`);
    }
    
    // 更新所有链接状态
    updateAllLinksState();
    
    window.open(url, '_blank', 'noopener,noreferrer');
    return false;
  }
  
  // 更新所有链接的状态（是否可点击）
  function updateAllLinksState() {
    const currentCount = getClickCount();
    const links = document.querySelectorAll('a[onclick^="return openLink"]');
    
    links.forEach(link => {
      if (currentCount >= MAX_CLICKS_PER_DAY) {
        link.classList.add('link-disabled');
        link.title = `每日链接点击已达上限(${MAX_CLICKS_PER_DAY}次)`;
      } else {
        link.classList.remove('link-disabled');
        link.title = `剩余点击次数: ${MAX_CLICKS_PER_DAY - currentCount}`;
      }
    });
  }
  
  // 存储原始内容和分页相关变量
  let originalText = '';
  let originalHtmlSegments = [];
  let allParagraphElements = []; // 所有段落元素
  let lastSearchTerm = '';
  let currentPage = 1;
  let totalPages = 1;
  let itemsPerPage = 1000; // 每页显示1000个段落
  
  // 页面加载完成后初始化
  document.addEventListener('DOMContentLoaded', function() {
    // 预加载资源提升速度
    const preloadResources = () => {
      return Promise.all([
        new Promise((resolve) => {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.href = 'https://cdn.jsdelivr.net/gh/lovelive233/music1@main/txt(2026).txt';
          link.as = 'fetch';
          link.crossOrigin = 'anonymous';
          link.onload = resolve;
          link.onerror = resolve;
          document.head.appendChild(link);
        })
      ]);
    };
    
    // 先预加载资源，再加载文本内容
    preloadResources().then(() => {
      // 加载文本内容
      fetch('https://cdn.jsdelivr.net/gh/lovelive233/music1@main/txt(2026).txt')
        .then(response => {
          if (!response.ok) throw new Error('内容加载失败');
          return response.text();
        })
        .then(text => {
          originalText = text;
          const lines = originalText.split(/\r?\n/);
          
          // 处理所有段落并存储
          const linkRegex = /(https?:\/\/[^\s]+)/g;
          allParagraphElements = [];
          originalHtmlSegments = [];
          
          lines.forEach(line => {
            if (line.trim() === '') {
              const emptyLine = document.createElement('div');
              emptyLine.className = 'empty-line';
              allParagraphElements.push(emptyLine);
              originalHtmlSegments.push('');
            } else {
              const pElement = document.createElement('p');
              pElement.className = 'adapt-text';
              // 修改链接显示方式：隐藏URL，显示"点击跳转"文字
              const lineWithLinks = line.replace(linkRegex, '<a onclick="return openLink(\'$1\')" style="color: #FADEE0 !important;" class="backdrop-blur-sm bg-white/10 px-2 py-0.5 rounded-md border border-blue-200/30 hover:bg-white/20 transition-all duration-200 inline-block">点击跳转</a>');

              pElement.innerHTML = lineWithLinks;
              allParagraphElements.push(pElement);
              originalHtmlSegments.push(lineWithLinks);
            }
          });
          // 计算总页数
          totalPages = Math.ceil(allParagraphElements.length / itemsPerPage);
          
          // 显示第一页内容
          renderCurrentPage();
          
          // 更新分页按钮状态
          updatePaginationButtons();
          
          // 内容加载完成后显示查找按钮
          document.getElementById('toggleSearchBtn').style.display = 'block';

// ==================== 长按3秒解锁 只显示查找按钮 ====================
const toggleBtn = document.getElementById('toggleSearchBtn');
const searchContainer = document.getElementById('searchContainer');
const searchInput = document.getElementById('searchInput');
const content = document.getElementById('content');
let unlockTimer = null;
let unlocked = false;

// 初始状态：只留查找按钮，其余全部隐藏+禁用
content.style.display = 'none';
searchContainer.style.display = 'none';
searchInput.disabled = true;

// 长按3秒解锁
toggleBtn.addEventListener('touchstart', function () {
  unlockTimer = setTimeout(() => {
    unlocked = true;
    content.style.display = 'block';
    searchContainer.style.display = 'block';
    searchInput.disabled = false;
  }, 3000);
});

// 松开/移动 取消计时
toggleBtn.addEventListener('touchend', () => clearTimeout(unlockTimer));
toggleBtn.addEventListener('touchcancel', () => clearTimeout(unlockTimer));
toggleBtn.addEventListener('touchmove', () => clearTimeout(unlockTimer));

// 未解锁：禁止搜索框任何操作
searchInput.addEventListener('focus', (e) => {
  if (!unlocked) e.target.blur();
});
toggleBtn.addEventListener('click', function (e) {
  if (!unlocked) e.preventDefault();
});
// ==================== 结束 ====================
          
          // 所有内容加载完成，隐藏加载层并显示页面
          setTimeout(() => {
            document.getElementById('loadingOverlay').style.opacity = '0';
            setTimeout(() => {
              document.getElementById('loadingOverlay').style.display = 'none';
              document.body.style.opacity = '1';
              // 初始化链接状态
              updateAllLinksState();
            }, 300);
          }, 100);
        })
        .catch(error => {
          document.getElementById('textContainer').textContent = '加载失败：' + error.message;
          // 即使加载失败也显示查找按钮
          document.getElementById('toggleSearchBtn').style.display = 'block';
          
          // 隐藏加载层
          document.getElementById('loadingOverlay').style.opacity = '0';
          setTimeout(() => {
            document.getElementById('loadingOverlay').style.display = 'none';
            document.body.style.opacity = '1';
          }, 300);
        });
    });
    
    // 搜索相关变量
    let searchResults = []; // 存储所有页面的搜索结果
    let currentIndex = -1;
    let searchTimeout = null;
    const searchInput = document.getElementById('searchInput');
    const resultCount = document.getElementById('resultCount');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const clearBtn = document.getElementById('clearBtn');
    const searchContainer = document.getElementById('searchContainer');
    const toggleSearchBtn = document.getElementById('toggleSearchBtn');
    const contentScroll = document.querySelector('.content-scroll');
    let searchVisible = false; // 初始设置为隐藏
    
    // 分页控制元素
    const firstPageBtn = document.getElementById('firstPageBtn');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const lastPageBtn = document.getElementById('lastPageBtn');
    const pageInfo = document.getElementById('pageInfo');
    
    // 渲染当前页内容
    function renderCurrentPage() {
      const textContainer = document.getElementById('textContainer');
      textContainer.innerHTML = '';
      
      // 清除所有高亮
      document.querySelectorAll('mark.highlight, mark.highlight-current').forEach(mark => {
        const parent = mark.parentNode;
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
      });
      
      // 计算当前页显示的段落范围
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, allParagraphElements.length);
      
      // 克隆并添加当前页的段落
      for (let i = startIndex; i < endIndex; i++) {
        const clone = allParagraphElements[i].cloneNode(true);
        textContainer.appendChild(clone);
      }
      
      // 更新页码信息
      pageInfo.textContent = `第 ${currentPage} / ${totalPages} 页`;
      
      // 重置滚动位置到顶部
      contentScroll.scrollTop = 0;
      
      // 如果有搜索结果，重新应用高亮
      if (searchResults.length > 0) {
        applySearchHighlights();
      }
      
      // 更新链接状态
      updateAllLinksState();
    }
    
    // 更新分页按钮状态
    function updatePaginationButtons() {
      firstPageBtn.disabled = currentPage === 1;
      prevPageBtn.disabled = currentPage === 1;
      nextPageBtn.disabled = currentPage === totalPages;
      lastPageBtn.disabled = currentPage === totalPages;
    }
    
    // 分页控制函数
    function goToFirstPage() {
      if (currentPage !== 1) {
        currentPage = 1;
        renderCurrentPage();
        updatePaginationButtons();
      }
    }
    
    function goToPrevPage() {
      if (currentPage > 1) {
        currentPage--;
        renderCurrentPage();
        updatePaginationButtons();
      }
    }
    
    function goToNextPage() {
      if (currentPage < totalPages) {
        currentPage++;
        renderCurrentPage();
        updatePaginationButtons();
      }
    }
    
    function goToLastPage() {
      if (currentPage !== totalPages) {
        currentPage = totalPages;
        renderCurrentPage();
        updatePaginationButtons();
      }
    }
    
    // 切换搜索框显示/隐藏
function toggleSearch() {
  searchVisible = !searchVisible;
  searchContainer.classList.toggle('active', searchVisible);
  if (searchVisible) {
    searchInput.focus(); // 仅保留聚焦输入框的必要逻辑
  }
}

    
    // 搜索处理 - 搜索所有页面
    function handleSearch() {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      searchTimeout = setTimeout(() => {
        const searchTerm = searchInput.value.trim();
        
        if (searchTerm === lastSearchTerm) return;
        lastSearchTerm = searchTerm;
        
        if (!searchTerm) {
          clearSearch();
          return;
        }
        
        // 清除之前的高亮
        clearSearchHighlights();
        
        searchResults = [];
        currentIndex = -1;
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        
        // 搜索所有页面的内容
        allParagraphElements.forEach((element, index) => {
          if (element.className.includes('empty-line')) return;
          
          const originalHtml = originalHtmlSegments[index];
          if (!originalHtml || !originalHtml.toLowerCase().includes(searchTerm.toLowerCase())) {
            return;
          }
          
          // 记录搜索结果信息（段落索引和文本）
          const textContent = element.textContent;
          let match;
          let lastIndex = 0;
          
          while ((match = regex.exec(textContent)) !== null) {
            searchResults.push({
              paragraphIndex: index,
              start: match.index,
              end: match.index + match[0].length,
              text: match[0]
            });
            lastIndex = regex.lastIndex;
          }
        });
        
        updateSearchState();
        
        if (searchResults.length > 0) {
          goToResult(0);
        }
      }, 100);
    }
    
    // 清除搜索高亮
    function clearSearchHighlights() {
      // 清除所有页面的高亮（存储的段落元素）
      allParagraphElements.forEach((element, index) => {
        if (element.className.includes('empty-line')) return;
        
        const clone = element.cloneNode(true);
        const marks = clone.querySelectorAll('mark.highlight, mark.highlight-current');
        marks.forEach(mark => {
          const parent = mark.parentNode;
          parent.replaceChild(document.createTextNode(mark.textContent), mark);
          parent.normalize();
        });
        allParagraphElements[index] = clone;
      });
      
      // 清除当前页面已渲染的高亮（新增部分）
      const currentPageElements = document.getElementById('textContainer').children;
      Array.from(currentPageElements).forEach(element => {
        if (element.className.includes('empty-line')) return;
        
        const marks = element.querySelectorAll('mark.highlight, mark.highlight-current');
        marks.forEach(mark => {
          const parent = mark.parentNode;
          parent.replaceChild(document.createTextNode(mark.textContent), mark);
          parent.normalize();
        });
      });
    }
    
    // 应用搜索高亮
    function applySearchHighlights() {
      const currentPageElements = document.getElementById('textContainer').children;
      const startIndex = (currentPage - 1) * itemsPerPage;
      
      // 为当前页的匹配项添加高亮
      Array.from(currentPageElements).forEach((element, offset) => {
        const paragraphIndex = startIndex + offset;
        if (element.className.includes('empty-line')) return;
        
        // 找到当前段落的所有匹配项
        const paragraphMatches = searchResults.filter(
          result => result.paragraphIndex === paragraphIndex
        );
        
        if (paragraphMatches.length > 0) {
          let html = originalHtmlSegments[paragraphIndex];
          const regex = new RegExp(`(${lastSearchTerm})`, 'gi');
          html = html.replace(regex, '<mark class="highlight">$1</mark>');
          
          // 为当前激活项添加特殊高亮
          paragraphMatches.forEach(match => {
            if (match.paragraphIndex === searchResults[currentIndex]?.paragraphIndex) {
              const currentMatchRegex = new RegExp(`(<mark class="highlight">)(${lastSearchTerm})(<\/mark>)`, 'gi');
              html = html.replace(currentMatchRegex, '<mark class="highlight-current">$2</mark>');
            }
          });
          
          element.innerHTML = html;
        }
      });
      
      // 重新更新链接状态（高亮后可能重建了链接元素）
      updateAllLinksState();
    }
    
    // 清除搜索
    function clearSearch() {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      
      clearSearchHighlights();
      
      searchResults = [];
      currentIndex = -1;
      searchInput.value = '';
      lastSearchTerm = '';
      updateSearchState();
    }
    
    // 更新搜索状态显示
    function updateSearchState() {
      resultCount.textContent = `${currentIndex + 1}/${searchResults.length}`;
      prevBtn.disabled = searchResults.length === 0;
      nextBtn.disabled = searchResults.length === 0;
    }
    
    // 跳转到结果
    function goToResult(index) {
      if (index < 0 || index >= searchResults.length) return;
      
      currentIndex = index;
      const target = searchResults[currentIndex];
      
      // 计算目标所在页面
      const targetPage = Math.ceil((target.paragraphIndex + 1) / itemsPerPage);
      
      // 如果不在当前页，跳转到目标页
      if (currentPage !== targetPage) {
        currentPage = targetPage;
        renderCurrentPage();
        updatePaginationButtons();
      } else {
        // 已经在当前页，只需更新高亮
        applySearchHighlights();
      }
      
      // 滚动到目标位置
      setTimeout(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const offset = target.paragraphIndex - startIndex;
        const currentPageElements = document.getElementById('textContainer').children;
        
        if (currentPageElements[offset]) {
          currentPageElements[offset].scrollIntoView({ behavior: 'instant', block: 'center' });
        }
      }, 100);
      
      updateSearchState();
    }
    
    // 上一个结果 - 循环逻辑
    function goToPrevResult() {
      if (searchResults.length === 0) return;
      
      if (currentIndex <= 0) {
        goToResult(searchResults.length - 1);
      } else {
        goToResult(currentIndex - 1);
      }
    }
    
    // 下一个结果 - 循环逻辑
    function goToNextResult() {
      if (searchResults.length === 0) return;
      
      if (currentIndex >= searchResults.length - 1) {
        goToResult(0);
      } else {
        goToResult(currentIndex + 1);
      }
    }
    
    // 事件监听
    searchInput.addEventListener('input', handleSearch);
    prevBtn.addEventListener('click', goToPrevResult);
    nextBtn.addEventListener('click', goToNextResult);
    clearBtn.addEventListener('click', clearSearch);
    toggleSearchBtn.addEventListener('click', () => {
  requestAnimationFrame(toggleSearch); // 让浏览器优先处理点击事件
});
    
    // 分页按钮事件
    firstPageBtn.addEventListener('click', goToFirstPage);
    prevPageBtn.addEventListener('click', goToPrevPage);
    nextPageBtn.addEventListener('click', goToNextPage);
    lastPageBtn.addEventListener('click', goToLastPage);
    
    // 键盘导航
    document.addEventListener('keydown', (e) => {
      if (searchInput !== document.activeElement) return;
      
      if (e.key === 'Enter' && e.shiftKey) {
        goToPrevResult();
        e.preventDefault();
      } else if (e.key === 'Enter') {
        goToNextResult();
        e.preventDefault();
      }
    });
    
    // 窗口大小变化处理
    let resizeTimeout = null;
    window.addEventListener('resize', () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (currentIndex >= 0 && searchResults.length > 0) {
          goToResult(currentIndex);
        }
      }, 300);
    });
  });

           // 禁止链接拖拽
     document.addEventListener('dragstart', function(e) {
       if (e.target.tagName === 'A') {
         e.preventDefault();
       }
     });
     // 点击链接手动触发跳转
     document.addEventListener('click', function(e) {
       const target = e.target;
       if (target.tagName === 'A' && target.dataset.href) {
         // 保留原生跳转行为
         window.location.href = target.dataset.href;
         // 如需新窗口打开，替换为 window.open(target.dataset.href)
         e.preventDefault();
       }
     });


     // 终极防调试：打开开发者工具即永久锁死空白页，返回/刷新均无法恢复
(function antiDevTools() {
  // 1. 拦截所有调试快捷键（F12/Ctrl+Shift+I/C/U等）
  document.addEventListener('keydown', e => {
    if (e.keyCode === 123 || (e.ctrlKey && e.shiftKey && [73,67].includes(e.keyCode)) || (e.ctrlKey && e.keyCode === 85)) {
      e.preventDefault();e.stopPropagation();lockBlank();
    }
  }, true);

  // 2. 禁用右键（除搜索框），右键直接锁空白
  document.addEventListener('contextmenu', e => {
    if (!e.target.closest('#searchInput')) {
      e.preventDefault();e.stopPropagation();
    }
  }, true);

  // 3. 核心：检测开发者工具打开 → 立即锁死空白页
  function checkDev() {
    // 检测调试器窗口/debugger触发，任一条件满足即锁死
    const devOpen = window.outerWidth - window.innerWidth > 150 || window.outerHeight - window.innerHeight > 150;
    if (devOpen) lockBlank();
  }

  // 4. 关键：永久锁死空白页的核心方法（销毁页面+替换所有历史+拦截所有操作）
  function lockBlank() {
    // 销毁原页面所有内容
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    // 强制跳空白页并替换**所有**历史记录（返回会到浏览器最开始的页面，而非原页面）
    window.location.href = 'about:blank';
    history.replaceState(null, null, 'about:blank');
    history.pushState(null, null, 'about:blank');
    // 拦截所有历史记录操作（返回/前进）
    window.addEventListener('popstate', () => history.replaceState(null, null, 'about:blank'), true);
    window.addEventListener('hashchange', () => window.location.href = 'about:blank', true);
    // 拦截刷新（刷新仍为空白）
    window.addEventListener('beforeunload', e => {
      e.preventDefault();
      window.location.href = 'about:blank';
    }, true);
  }

  // 5. debugger死循环：强制触发调试检测，打开控制台即锁死
  setInterval(() => {
    try {debugger;} catch (e) {lockBlank();}
  }, 50);

  // 6. 实时检测窗口变化（调试器打开/关闭都会触发）
  window.addEventListener('resize', checkDev, true);
  window.addEventListener('load', checkDev, true);
  window.addEventListener('DOMContentLoaded', checkDev, true);
})();
