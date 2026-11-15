/**
 * 大臺北地方景點導覽 — 主邏輯腳本
 * 遵循 AGENTS.md 規範：Vanilla JS (ES6+)、相對路徑、無依賴打包工具
 */

(function () {
  'use strict';

  // 狀態管理
  let allSpots = [];
  let currentCity = 'all';
  let currentCategory = 'all';

  // DOM 節點快取
  const dailyPickSection = document.getElementById('dailyPickSection');
  const spotsGrid = document.getElementById('spotsGrid');
  const spotsCountEl = document.getElementById('spotsCount');
  const cityFilterPills = document.getElementById('cityFilterPills');
  const categoryFilterPills = document.getElementById('categoryFilterPills');
  const spotModal = document.getElementById('spotModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalContent = document.getElementById('modalContent');

  /**
   * HTML 字串逸出，防止 XSS
   */
  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * 取得本地日期 YYYY-MM-DD 並計算固定雜湊值輪替今日推薦
   * 同一天回傳固定景點，隔天自動切換
   */
  function getDailyPick(spots) {
    if (!spots || spots.length === 0) return null;

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // 使用字串固定雜湊演算法
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
      hash |= 0;
    }

    const index = Math.abs(hash) % spots.length;
    return {
      spot: spots[index],
      displayDate: `${year} 年 ${Number(month)} 月 ${Number(day)} 日`
    };
  }

  /**
   * 渲染今日推薦（Daily Pick）手札風便簽
   */
  function renderDailyPick(spots) {
    if (!dailyPickSection) return;

    const dailyData = getDailyPick(spots);
    if (!dailyData) {
      dailyPickSection.innerHTML = '';
      return;
    }

    const { spot, displayDate } = dailyData;

    dailyPickSection.innerHTML = `
      <div class="daily-card" role="button" tabindex="0" data-id="${escapeHtml(spot.id)}" aria-label="查看今日推薦：${escapeHtml(spot.name)}">
        <div class="daily-header-row">
          <div class="daily-stamp">
            <span>🌿</span>
            <span>今日手札推薦 · DAILY PICK</span>
          </div>
          <span class="daily-date">📅 ${displayDate}</span>
        </div>
        <div class="daily-body">
          <div class="daily-img-box">
            <img 
              src="${escapeHtml(spot.image)}" 
              alt="${escapeHtml(spot.name)}" 
              class="spot-img"
              onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.classList.remove('is-hidden');"
            />
            <div class="spot-placeholder is-hidden">
              <span class="placeholder-icon">🍃</span>
              <span class="placeholder-title">${escapeHtml(spot.name)}</span>
              <span class="placeholder-meta">${escapeHtml(spot.city)} · ${escapeHtml(spot.district)}</span>
            </div>
          </div>
          <div class="daily-content">
            <div class="daily-tags">
              <span class="tag-badge tag-city">${escapeHtml(spot.city)} · ${escapeHtml(spot.district)}</span>
              <span class="tag-badge tag-category">${escapeHtml(spot.category)}</span>
            </div>
            <h2 class="daily-title">${escapeHtml(spot.name)}</h2>
            <p class="daily-highlight">${escapeHtml(spot.highlight)}</p>
            <div class="daily-cta">
              <span>閱讀手札詳情</span>
              <span>↗</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // 綁定點擊與鍵盤 Enter 事件開啟 Modal
    const dailyCard = dailyPickSection.querySelector('.daily-card');
    if (dailyCard) {
      dailyCard.addEventListener('click', () => openModal(spot.id));
      dailyCard.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(spot.id);
        }
      });
    }
  }

  /**
   * 渲染首頁精簡景點卡片（嚴格遵循第 5 點之 3 規範，僅顯示 4 項資訊）
   * 1. 圖片（含 onerror 佔位處理）
   * 2. 景點名稱
   * 3. 縣市行政區與類型標籤
   * 4. 一句話亮點
   */
  function renderSpots(spots) {
    if (!spotsGrid) return;

    if (spotsCountEl) {
      spotsCountEl.textContent = spots.length;
    }

    if (spots.length === 0) {
      spotsGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🍂</div>
          <h3 class="empty-state-title">目前沒有符合條件的景點</h3>
          <p>試試選擇其他縣市或類型，探索更多臺北與新北的地方風景。</p>
        </div>
      `;
      return;
    }

    spotsGrid.innerHTML = spots.map(spot => `
      <article 
        class="spot-card" 
        data-id="${escapeHtml(spot.id)}" 
        role="button" 
        tabindex="0" 
        aria-label="查看景點詳情：${escapeHtml(spot.name)}"
      >
        <!-- 1. 圖片（含 onerror 佔位處理） -->
        <div class="spot-img-box">
          <img 
            src="${escapeHtml(spot.image)}" 
            alt="${escapeHtml(spot.name)}" 
            class="spot-img"
            loading="lazy"
            onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.classList.remove('is-hidden');"
          />
          <div class="spot-placeholder is-hidden">
            <span class="placeholder-icon">🌿</span>
            <span class="placeholder-title">${escapeHtml(spot.name)}</span>
            <span class="placeholder-meta">${escapeHtml(spot.city)} · ${escapeHtml(spot.district)}</span>
          </div>
        </div>
        <div class="spot-card-body">
          <!-- 2. 景點名稱 -->
          <h2 class="spot-card-name">${escapeHtml(spot.name)}</h2>
          <!-- 3. 縣市行政區與類型標籤 -->
          <div class="spot-card-tags">
            <span class="tag-badge tag-city">${escapeHtml(spot.city)} · ${escapeHtml(spot.district)}</span>
            <span class="tag-badge tag-category">${escapeHtml(spot.category)}</span>
          </div>
          <!-- 4. 一句話亮點 -->
          <p class="spot-card-highlight">${escapeHtml(spot.highlight)}</p>
        </div>
      </article>
    `).join('');

    // 綁定卡片點擊與鍵盤 Enter 事件
    spotsGrid.querySelectorAll('.spot-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        openModal(id);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const id = card.getAttribute('data-id');
          openModal(id);
        }
      });
    });
  }

  /**
   * 雙重篩選邏輯（縣市 AND 類型交集過濾）
   */
  function applyFilters() {
    const filtered = allSpots.filter(spot => {
      const matchCity = (currentCity === 'all') || (spot.city === currentCity);
      const matchCategory = (currentCategory === 'all') || (spot.category === currentCategory);
      return matchCity && matchCategory;
    });

    renderSpots(filtered);
  }

  /**
   * 設定雙重篩選列事件監聽
   */
  function setupFilters() {
    if (cityFilterPills) {
      cityFilterPills.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;

        cityFilterPills.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCity = btn.getAttribute('data-value') || 'all';
        applyFilters();
      });
    }

    if (categoryFilterPills) {
      categoryFilterPills.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;

        categoryFilterPills.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.getAttribute('data-value') || 'all';
        applyFilters();
      });
    }
  }

  /**
   * 開啟詳情彈出視窗（Modal）
   * 嚴格呈現規範完整資料：
   * - 景點名稱、縣市／行政區、類型標籤、詳細介紹
   * - 大眾運輸方式
   * - 地址與 Google Maps 連結（新分頁）
   * - 開放時間與門票資訊
   * - 建議停留時間與適合時段
   * - 推薦看點與小提醒（條列清單）
   */
  function openModal(spotId) {
    const spot = allSpots.find(s => s.id === spotId);
    if (!spot || !spotModal || !modalContent) return;

    // 推薦看點與小提醒清單 HTML
    const tipsHtml = Array.isArray(spot.tips) && spot.tips.length > 0
      ? spot.tips.map(tip => `<li>${escapeHtml(tip)}</li>`).join('')
      : '<li>參觀時請維護環境整潔並配合現場規範。</li>';

    modalContent.innerHTML = `
      <!-- Modal 影像區塊（含防破圖佔位） -->
      <div class="modal-img-box">
        <img 
          src="${escapeHtml(spot.image)}" 
          alt="${escapeHtml(spot.name)}" 
          class="modal-img"
          onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.classList.remove('is-hidden');"
        />
        <div class="spot-placeholder is-hidden">
          <span class="placeholder-icon">🍃</span>
          <span class="placeholder-title">${escapeHtml(spot.name)}</span>
          <span class="placeholder-meta">${escapeHtml(spot.city)} · ${escapeHtml(spot.district)} ｜ ${escapeHtml(spot.category)}</span>
        </div>
      </div>

      <div class="modal-body">
        <!-- 標籤與名稱 -->
        <div class="modal-header-section">
          <div class="modal-tags">
            <span class="tag-badge tag-city">${escapeHtml(spot.city)} · ${escapeHtml(spot.district)}</span>
            <span class="tag-badge tag-category">${escapeHtml(spot.category)}</span>
          </div>
          <h2 class="modal-title">${escapeHtml(spot.name)}</h2>
          <p class="modal-highlight">${escapeHtml(spot.highlight)}</p>
        </div>

        <!-- 詳細介紹 -->
        <div class="modal-desc-section">
          <h3 class="modal-desc-title">景點手札記要</h3>
          <p class="modal-description">${escapeHtml(spot.description)}</p>
        </div>

        <!-- 實用資訊卡片清單 -->
        <div class="modal-info-grid">
          <div class="info-item">
            <span class="info-icon">🚇</span>
            <div class="info-content">
              <span class="info-label">大眾運輸：</span>
              <span>${escapeHtml(spot.transport)}</span>
            </div>
          </div>

          <div class="info-item">
            <span class="info-icon">📍</span>
            <div class="info-content">
              <span class="info-label">景點地址：</span>
              <span>${escapeHtml(spot.address)}</span>
              ${spot.mapUrl ? `
                <a 
                  href="${encodeURI(spot.mapUrl)}" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  class="info-link"
                >
                  (查看 Google Maps 導航 ↗)
                </a>
              ` : ''}
            </div>
          </div>

          <div class="info-item">
            <span class="info-icon">🕒</span>
            <div class="info-content">
              <span class="info-label">開放時間：</span>
              <span>${escapeHtml(spot.hours)}</span>
            </div>
          </div>

          <div class="info-item">
            <span class="info-icon">🎫</span>
            <div class="info-content">
              <span class="info-label">門票資訊：</span>
              <span>${escapeHtml(spot.ticket)}</span>
            </div>
          </div>

          <div class="info-item">
            <span class="info-icon">⏱️</span>
            <div class="info-content">
              <span class="info-label">建議停留：</span>
              <span>${escapeHtml(spot.duration)}</span>
            </div>
          </div>

          <div class="info-item">
            <span class="info-icon">☀️</span>
            <div class="info-content">
              <span class="info-label">適合時段：</span>
              <span>${escapeHtml(spot.bestTime)}</span>
            </div>
          </div>
        </div>

        <!-- 推薦看點與小提醒 -->
        <div class="modal-tips-section">
          <h3 class="tips-title">💡 漫步看點與小提醒</h3>
          <ul class="tips-list">
            ${tipsHtml}
          </ul>
        </div>
      </div>
    `;

    // 顯示視窗並鎖定背景捲動
    spotModal.classList.add('is-active');
    spotModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // 聚焦關閉按鈕提升無障礙體驗
    if (modalCloseBtn) {
      modalCloseBtn.focus();
    }
  }

  /**
   * 關閉詳情彈出視窗
   */
  function closeModal() {
    if (!spotModal) return;
    spotModal.classList.remove('is-active');
    spotModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  /**
   * 設定 Modal 相關事件（點擊遮罩關閉、關閉按鈕、ESC 鍵關閉）
   */
  function setupModalEvents() {
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener('click', closeModal);
    }

    if (spotModal) {
      // 點擊遮罩本體才關閉
      spotModal.addEventListener('click', (e) => {
        if (e.target === spotModal) {
          closeModal();
        }
      });
    }

    // ESC 鍵關閉
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && spotModal && spotModal.classList.contains('is-active')) {
        closeModal();
      }
    });
  }

  /**
   * 初始化讀取 spots.json 資料（採用相對路徑）
   */
  async function init() {
    setupFilters();
    setupModalEvents();

    try {
      const response = await fetch('./data/spots.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      allSpots = await response.json();

      // 渲染今日推薦與景點卡片列表
      renderDailyPick(allSpots);
      renderSpots(allSpots);

    } catch (error) {
      console.error('讀取 spots.json 失敗：', error);
      if (spotsGrid) {
        spotsGrid.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <h3 class="empty-state-title">無法載入景點資料</h3>
            <p>請檢查 data/spots.json 檔案是否存在且格式正確。</p>
          </div>
        `;
      }
    }
  }

  // DOM 載入後啟動
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
