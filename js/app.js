/* ============================================================
 * 家庭每周点菜助手 - 核心逻辑（精简版）
 * 页面：点菜 / 我的菜单 / 我的收藏
 * 同步：女朋友保存后生成分享链接，男朋友打开即看到结果。
 * ============================================================ */

(function () {
  'use strict';

  /* ---------------- 常量 ---------------- */
  const STORAGE = {
    menu: 'fma.menu.v2',
    fav: 'fma.fav.v2',
    shared: 'fma.shared.v2',
  };

  const TYPE_LABEL = { main: '主菜', side: '配菜', staple: '主食' };
  const TYPE_ORDER = ['main', 'side', 'staple'];
  const TYPE_CODE = { main: 'm', side: 's', staple: 't' };
  const TYPE_FROM_CODE = { m: 'main', s: 'side', t: 'staple' };
  const PORTION_MAX = 4;
  const DEFAULT_PORTIONS = 2;

  const PASTELS = ['#FFF3E0', '#FFE9D6', '#FFEFE3', '#FDF0D5', '#FFF0E6', '#FBE9E0', '#FDEBD8', '#FFF4E3'];

  /* ---------------- 状态 ---------------- */
  const state = {
    dishes: DISHES,
    menu: {},          // dayId -> { items: [{key, dishId, type, portions}] }
    favorites: [],     // 收藏的菜品 id
    shared: { savedAt: null },  // 收到的分享结果
    tab: 'hall',
    category: 'all',
    search: '',
    favSearch: '',
  };

  const ui = {
    add: { dishId: null, day: 'mon', type: 'main', portions: DEFAULT_PORTIONS },
    edit: { dayId: null, key: null, type: 'main', portions: DEFAULT_PORTIONS },
    random: { day: 'mon', resultId: null },
    lastDetailId: null,
  };

  /* ---------------- 工具函数 ---------------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function newKey() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function hash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
    return h;
  }

  function todayDayId() {
    const wd = (new Date().getDay() + 6) % 7;
    return DAYS[wd].id;
  }

  function weekDays() {
    const now = new Date();
    const offset = (now.getDay() + 6) % 7;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    return DAYS.map((d, i) => {
      const dt = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      return {
        id: d.id, label: d.label, date: dt,
        dateStr: (dt.getMonth() + 1) + '月' + dt.getDate() + '日',
      };
    });
  }

  function weekRange() {
    const wd = weekDays();
    return wd[0].dateStr + ' ~ ' + wd[6].dateStr;
  }

  function fmtTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  function selectedCount() {
    let n = 0;
    DAYS.forEach(d => { const day = state.menu[d.id]; if (day && day.items) n += day.items.length; });
    return n;
  }

  function dayOf(id) {
    return state.menu[id] || { items: [] };
  }

  function findItemByType(day, type) {
    return (day.items || []).find(it => it.type === type) || null;
  }

  function findItemByDish(day, dishId) {
    return (day.items || []).find(it => it.dishId === dishId) || null;
  }

  function ensureDay(id) {
    if (!state.menu[id]) state.menu[id] = { items: [] };
    if (!state.menu[id].items) state.menu[id].items = [];
    return state.menu[id];
  }

  /* ---------------- 存储 ---------------- */
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function load(k, dflt) {
    try { const v = localStorage.getItem(k); return v == null ? dflt : JSON.parse(v); } catch (e) { return dflt; }
  }

  function persist() {
    save(STORAGE.menu, state.menu);
    save(STORAGE.fav, state.favorites);
    save(STORAGE.shared, state.shared);
  }

  function loadState() {
    state.menu = load(STORAGE.menu, {});
    state.favorites = load(STORAGE.fav, []);
    state.shared = Object.assign({ savedAt: null }, load(STORAGE.shared, {}));
    if (!Array.isArray(state.favorites)) state.favorites = [];
  }

  /* ---------------- Toast ---------------- */
  let toastTimer = null;
  function toast(msg, type) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast show' + (type ? ' toast-' + type : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = 'toast'; }, 2400);
  }

  /* ---------------- 图片渲染 ---------------- */
  function imageHtml(dish, cls) {
    const url = dishImage(dish);
    if (url) {
      return '<div class="dish-img ' + cls + '"><img src="' + esc(url) + '" alt="' + esc(dish.name) + '" loading="lazy"></div>';
    }
    const bg = PASTELS[hash(dish.id) % PASTELS.length];
    return '<div class="dish-img ' + cls + ' emoji-bg" style="background:' + bg + '"><span class="dish-emoji">' + dish.emoji + '</span></div>';
  }

  /* ---------------- 导航 ---------------- */
  function switchTab(tab) {
    state.tab = tab;
    document.querySelectorAll('.tab-item').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tab);
    });
    render();
    window.scrollTo(0, 0);
  }

  function render() {
    const view = document.getElementById('view');
    if (state.tab === 'hall') renderHall(view);
    else if (state.tab === 'menu') renderMenu(view);
    else if (state.tab === 'fav') renderFav(view);
  }

  /* ---------------- 页面一：点菜 ---------------- */
  function renderHall(view) {
    view.innerHTML =
      '<div class="page hall">' +
        '<header class="topbar">' +
          '<div class="topbar-title">' +
            '<h1>今天想吃什么？</h1>' +
            '<p>把喜欢的菜选出来，剩下的交给我。</p>' +
          '</div>' +
          '<button class="icon-btn" data-action="openRandom" title="随机点菜">🎲</button>' +
        '</header>' +
        '<div class="week-strip">' +
          '<div class="week-strip-left">' +
            '<span class="week-strip-label">本周</span>' +
            '<span class="week-strip-range">' + esc(weekRange()) + '</span>' +
          '</div>' +
          '<div class="week-strip-count">已选 <b id="hallCount">' + selectedCount() + '</b> 道</div>' +
        '</div>' +
        '<div class="search-wrap">' +
          '<span class="search-icon">' + searchIcon() + '</span>' +
          '<input id="hallSearch" class="search-input" type="search" placeholder="搜索菜品，如：鸡、虾、茄子…" value="' + esc(state.search) + '" oninput="App.onSearch(this.value)">' +
        '</div>' +
        '<div id="hallChips" class="chips"></div>' +
        '<div id="hallGrid" class="dish-grid"></div>' +
        '<button class="float-btn" data-action="gotoMenu">' +
          '<span>查看本周菜单</span><span class="float-badge" id="floatBadge">已选 ' + selectedCount() + ' 道</span>' +
        '</button>' +
      '</div>';

    renderHallChips();
    renderHallGrid();
  }

  function renderHallChips() {
    const box = document.getElementById('hallChips');
    if (!box) return;
    box.innerHTML = CATEGORIES.map(c =>
      '<button class="chip' + (state.category === c.key ? ' active' : '') + '" data-action="category" data-cat="' + c.key + '">' + esc(c.label) + '</button>'
    ).join('');
  }

  function filteredDishes() {
    const q = state.search.trim().toLowerCase();
    let list = state.dishes;
    if (state.category !== 'all') list = list.filter(d => d.tags.includes(state.category));
    if (q) {
      list = list.filter(d => {
        if (d.name.toLowerCase().includes(q)) return true;
        if (d.tags.some(t => (CATEGORY_LABEL[t] || '').toLowerCase().includes(q))) return true;
        if (d.ingredients && d.ingredients.some(ing => ing.name.toLowerCase().includes(q))) return true;
        return false;
      });
    }
    return list;
  }

  function renderHallGrid() {
    const grid = document.getElementById('hallGrid');
    if (!grid) return;
    const list = filteredDishes();
    if (!list.length) {
      grid.innerHTML = '<div class="empty">没有找到相关菜品，换个关键词试试～</div>';
      return;
    }
    grid.innerHTML = list.map(d => dishCard(d)).join('');
  }

  function dishCard(d) {
    const fav = state.favorites.includes(d.id);
    const tags = d.tags.slice(0, 2).map(t => '<span class="tag">' + esc(CATEGORY_LABEL[t]) + '</span>').join('');
    return '' +
      '<div class="dish-card" data-action="detail" data-id="' + d.id + '">' +
        imageHtml(d, 'card') +
        '<button class="fav-btn' + (fav ? ' on' : '') + '" data-action="fav" data-id="' + d.id + '">' + (fav ? '♥' : '♡') + '</button>' +
        '<div class="dish-info">' +
          '<div class="dish-name">' + esc(d.name) + '</div>' +
          '<div class="dish-tags">' + tags + '</div>' +
          '<button class="add-btn" data-action="add" data-id="' + d.id + '">' +
            '<span class="add-plus">＋</span> 添加' +
          '</button>' +
        '</div>' +
      '</div>';
  }

  /* ---------------- 页面二：我的菜单（精简） ---------------- */
  function renderMenu(view) {
    const wd = weekDays();
    const sharedNote = state.shared && state.shared.savedAt
      ? '<div class="banner">📥 已同步她的点餐结果 · ' + esc(fmtTime(state.shared.savedAt)) + '</div>'
      : '';

    let body = '';
    wd.forEach(d => {
      const day = dayOf(d.id);
      body += dayBlock(d, day);
    });

    view.innerHTML =
      '<div class="page menu-page">' +
        '<header class="topbar">' +
          '<div class="topbar-title"><h1>我的菜单</h1><p>点一下菜品可修改或移除</p></div>' +
        '</header>' +
        sharedNote +
        '<div class="day-list">' + body + '</div>' +
        '<div class="confirm-bar">' +
          '<button class="confirm-btn" data-action="saveAndShare">保存并发送</button>' +
        '</div>' +
      '</div>';
  }

  function dayBlock(d, day) {
    const items = day.items || [];
    const itemRows = items.map(it => {
      const dish = findDish(it.dishId);
      if (!dish) return '';
      return '' +
        '<div class="menu-item tappable" data-action="editItem" data-day="' + d.id + '" data-key="' + it.key + '">' +
          '<div class="menu-item-img">' + imageHtml(dish, 'mini') + '</div>' +
          '<div class="menu-item-info">' +
            '<div><span class="type-badge type-' + it.type + '">' + TYPE_LABEL[it.type] + '</span></div>' +
            '<span class="menu-item-name">' + esc(dish.name) + '</span>' +
            '<span class="menu-item-portion">' + it.portions + '人份</span>' +
          '</div>' +
        '</div>';
    }).join('');

    return '' +
      '<div class="day-card">' +
        '<div class="day-head">' +
          '<div class="day-title">' +
            '<span class="day-name">' + esc(d.label) + '</span>' +
            '<span class="day-date">' + esc(d.dateStr) + '</span>' +
          '</div>' +
          (items.length ? '<span class="day-count">' + items.length + ' 道</span>' : '') +
        '</div>' +
        '<div class="day-body">' +
          (itemRows || '<div class="day-empty">未安排</div>') +
        '</div>' +
      '</div>';
  }

  /* ---------------- 页面三：我的收藏 ---------------- */
  function renderFav(view) {
    view.innerHTML =
      '<div class="page fav">' +
        '<header class="topbar">' +
          '<div class="topbar-title"><h1>我的收藏</h1><p>收藏爱吃的菜，一键加入本周菜单</p></div>' +
        '</header>' +
        '<div class="search-wrap">' +
          '<span class="search-icon">' + searchIcon() + '</span>' +
          '<input id="favSearch" class="search-input" type="search" placeholder="搜索收藏的菜品" value="' + esc(state.favSearch) + '" oninput="App.onFavSearch(this.value)">' +
        '</div>' +
        '<div id="favGrid" class="dish-grid"></div>' +
      '</div>';
    renderFavGrid();
  }

  function renderFavGrid() {
    const grid = document.getElementById('favGrid');
    if (!grid) return;
    const q = state.favSearch.trim().toLowerCase();
    const list = state.dishes.filter(d => state.favorites.includes(d.id))
      .filter(d => !q || d.name.toLowerCase().includes(q));
    if (!list.length) {
      grid.innerHTML = '<div class="empty">' + (state.favorites.length ? '没有匹配的收藏菜品' : '还没有收藏，去点菜大厅点 ♡ 收藏吧') + '</div>';
      return;
    }
    grid.innerHTML = list.map(d => {
      const tags = d.tags.slice(0, 2).map(t => '<span class="tag">' + esc(CATEGORY_LABEL[t]) + '</span>').join('');
      return '' +
        '<div class="dish-card" data-action="detail" data-id="' + d.id + '">' +
          imageHtml(d, 'card') +
          '<button class="fav-btn on" data-action="fav" data-id="' + d.id + '">♥</button>' +
          '<div class="dish-info">' +
            '<div class="dish-name">' + esc(d.name) + '</div>' +
            '<div class="dish-tags">' + tags + '</div>' +
            '<button class="add-btn" data-action="add" data-id="' + d.id + '">＋ 加入菜单</button>' +
          '</div>' +
        '</div>';
    }).join('');
  }

  /* ---------------- 弹窗 ---------------- */
  function openModal(html) {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.add('show');
    document.getElementById('modalBox').innerHTML = html;
  }
  function closeModal() {
    document.getElementById('modalOverlay').classList.remove('show');
    document.getElementById('modalBox').innerHTML = '';
  }

  /* ---------------- 菜品详情 ---------------- */
  function openDetail(dishId) {
    const dish = findDish(dishId);
    if (!dish) return;
    ui.lastDetailId = dishId;
    const fav = state.favorites.includes(dish.id);
    const tags = dish.tags.map(t => '<span class="tag">' + esc(CATEGORY_LABEL[t]) + '</span>').join('');
    const ings = (dish.ingredients || []).map(i =>
      '<div class="detail-ing"><span>' + esc(i.name) + '</span><span>' + (typeof i.qty === 'number' ? i.qty + i.unit : '适量') + '</span></div>'
    ).join('');

    openModal(
      '<div class="sheet detail-sheet">' +
        '<button class="sheet-close" data-action="closeModal">✕</button>' +
        imageHtml(dish, 'hero') +
        '<div class="detail-body">' +
          '<div class="detail-head">' +
            '<h2>' + esc(dish.name) + '</h2>' +
            '<button class="fav-btn big' + (fav ? ' on' : '') + '" data-action="fav" data-id="' + dish.id + '">' + (fav ? '♥' : '♡') + '</button>' +
          '</div>' +
          '<div class="dish-tags">' + tags + '</div>' +
          '<p class="detail-desc">' + esc(dish.desc || '') + '</p>' +
          '<div class="detail-section"><div class="detail-sec-title">主要食材</div>' + (ings || '<div class="empty">暂无</div>') + '</div>' +
          '<div class="sheet-actions">' +
            '<button class="btn-primary" data-action="add" data-id="' + dish.id + '">＋ 添加到本周菜单</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  /* ---------------- 添加菜品 ---------------- */
  function openAdd(dishId) {
    const dish = findDish(dishId);
    if (!dish) return;
    ui.add.dishId = dishId;
    ui.add.day = todayDayId();
    ui.add.portions = DEFAULT_PORTIONS;

    let foundDay = null;
    DAYS.forEach(d => { if (findItemByDish(dayOf(d.id), dishId)) foundDay = d.id; });
    if (foundDay) ui.add.day = foundDay;
    const existing = findItemByDish(dayOf(ui.add.day), dishId);
    ui.add.type = existing ? existing.type : (dish.roles[0] || 'main');
    if (existing) ui.add.portions = existing.portions;

    renderAddModal();
  }

  function renderAddModal() {
    const dish = findDish(ui.add.dishId);
    const day = ui.add.day;
    const type = ui.add.type;
    const existing = findItemByDish(dayOf(day), dish.id);
    const occupied = findItemByType(dayOf(day), type);
    const isReplace = occupied && occupied.dishId !== dish.id;

    const dayChips = DAYS.map(d => {
      const has = findItemByDish(dayOf(d.id), dish.id);
      return '<button class="chip' + (day === d.id ? ' active' : '') + (has ? ' marked' : '') + '" data-action="addPickDay" data-day="' + d.id + '">' + d.label.slice(2) + '</button>';
    }).join('');

    const typeBtns = TYPE_ORDER.map(t => {
      const occ = findItemByType(dayOf(day), t);
      return '<button class="chip type-chip' + (type === t ? ' active' : '') + '" data-action="addPickType" data-type="' + t + '">' +
        TYPE_LABEL[t] + (occ && occ.dishId !== dish.id ? '（已占用）' : '') + '</button>';
    }).join('');

    const portionBtns = Array.from({ length: PORTION_MAX }, (_, i) => i + 1).map(p =>
      '<button class="chip' + (ui.add.portions === p ? ' active' : '') + '" data-action="addPickPortion" data-p="' + p + '">' + p + '人份</button>'
    ).join('');

    let note = '';
    if (isReplace) note = '<div class="form-note warn">该日「' + TYPE_LABEL[type] + '」已安排「' + esc(findDish(occupied.dishId).name) + '」，保存后将替换。</div>';
    else if (existing) note = '<div class="form-note ok">这道菜已安排在这一天，可修改份量或类型。</div>';

    const confirmLabel = isReplace ? '保存并替换' : (existing ? '保存修改' : '添加到菜单');

    openModal(
      '<div class="sheet">' +
        '<button class="sheet-close" data-action="closeModal">✕</button>' +
        '<div class="sheet-title-row">' +
          '<div class="sheet-emoji">' + dish.emoji + '</div>' +
          '<div><h2>' + esc(dish.name) + '</h2><p class="muted">安排到本周菜单</p></div>' +
        '</div>' +
        '<div class="form-group"><div class="form-label">星期几</div><div class="chips wrap">' + dayChips + '</div></div>' +
        '<div class="form-group"><div class="form-label">作为</div><div class="chips wrap">' + typeBtns + '</div></div>' +
        '<div class="form-group"><div class="form-label">份量</div><div class="chips wrap">' + portionBtns + '</div></div>' +
        note +
        '<div class="sheet-actions">' +
          (existing ? '<button class="btn-danger-ghost" data-action="removeAddExisting">从这天移除</button>' : '') +
          '<button class="btn-primary" data-action="confirmAdd">' + confirmLabel + '</button>' +
        '</div>' +
      '</div>'
    );
  }

  function doConfirmAdd() {
    const dish = findDish(ui.add.dishId);
    if (!dish) return;
    const day = ensureDay(ui.add.day);
    const type = ui.add.type;

    const occupied = findItemByType(day, type);
    if (occupied && occupied.dishId !== dish.id) {
      day.items = day.items.filter(it => it.key !== occupied.key);
    }
    const existing = findItemByDish(day, dish.id);
    if (existing) {
      existing.type = type;
      existing.portions = ui.add.portions;
      day.items = day.items.filter(it => it === existing || it.type !== type);
    } else {
      day.items.push({ key: newKey(), dishId: dish.id, type: type, portions: ui.add.portions });
    }
    persist();
    closeModal();
    toast('已安排：' + dish.name + '（' + TYPE_LABEL[type] + '）');
    render();
  }

  function removeAddExisting() {
    const day = dayOf(ui.add.day);
    day.items = day.items.filter(it => it.dishId !== ui.add.dishId);
    persist();
    closeModal();
    toast('已从该日移除');
    render();
  }

  /* ---------------- 编辑 / 移除菜品 ---------------- */
  function openEditItem(dayId, key) {
    const it = dayOf(dayId).items.find(x => x.key === key);
    if (!it) return;
    const dish = findDish(it.dishId);
    if (!dish) return;
    ui.edit = { dayId, key, type: it.type, portions: it.portions };
    renderEditItem(dish);
  }

  function renderEditItem(dish) {
    const day = dayOf(ui.edit.dayId);
    const type = ui.edit.type;

    const typeBtns = TYPE_ORDER.map(t => {
      const occ = findItemByType(day, t);
      const isOther = occ && occ.key !== ui.edit.key;
      return '<button class="chip type-chip' + (type === t ? ' active' : '') + '" data-action="editPickType" data-type="' + t + '">' +
        TYPE_LABEL[t] + (isOther ? '（已占用）' : '') + '</button>';
    }).join('');

    const portionBtns = Array.from({ length: PORTION_MAX }, (_, i) => i + 1).map(p =>
      '<button class="chip' + (ui.edit.portions === p ? ' active' : '') + '" data-action="editPickPortion" data-p="' + p + '">' + p + '人份</button>'
    ).join('');

    openModal(
      '<div class="sheet">' +
        '<button class="sheet-close" data-action="closeModal">✕</button>' +
        '<div class="sheet-title-row">' +
          '<div class="sheet-emoji">' + dish.emoji + '</div>' +
          '<div><h2>' + esc(dish.name) + '</h2><p class="muted">修改这道菜</p></div>' +
        '</div>' +
        '<div class="form-group"><div class="form-label">作为</div><div class="chips wrap">' + typeBtns + '</div></div>' +
        '<div class="form-group"><div class="form-label">份量</div><div class="chips wrap">' + portionBtns + '</div></div>' +
        '<div class="sheet-actions">' +
          '<button class="btn-danger-ghost" data-action="editRemove">移除</button>' +
          '<button class="btn-primary" data-action="editSave">保存</button>' +
        '</div>' +
      '</div>'
    );
  }

  function doEditSave() {
    const day = dayOf(ui.edit.dayId);
    const it = day.items.find(x => x.key === ui.edit.key);
    if (!it) { closeModal(); return; }
    const type = ui.edit.type;
    const occupied = findItemByType(day, type);
    if (occupied && occupied.key !== it.key) {
      day.items = day.items.filter(x => x.key !== occupied.key);
    }
    it.type = type;
    it.portions = ui.edit.portions;
    day.items = day.items.filter(x => x === it || x.type !== type);
    persist();
    closeModal();
    toast('已保存修改');
    render();
  }

  function doEditRemove() {
    const day = dayOf(ui.edit.dayId);
    day.items = day.items.filter(x => x.key !== ui.edit.key);
    persist();
    closeModal();
    toast('已移除');
    render();
  }

  /* ---------------- 随机点菜 ---------------- */
  function weightedPick(pool, excludeIds, avoidMeat) {
    let list = pool.filter(d => !excludeIds.has(d.id));
    if (avoidMeat) {
      const filtered = list.filter(d => meatOf(d) !== avoidMeat);
      if (filtered.length) list = filtered;
    }
    if (!list.length) list = pool.filter(d => !excludeIds.has(d.id));
    if (!list.length) list = pool.slice();
    const weights = list.map(d => {
      let w = 10;
      if (state.favorites.includes(d.id)) w += 8;
      if (d.tags.includes('takeout')) w = 1;
      return w;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < list.length; i++) { r -= weights[i]; if (r <= 0) return list[i]; }
    return list[list.length - 1];
  }

  function mainsPool() { return state.dishes.filter(d => d.roles.includes('main') && !d.tags.includes('takeout')); }
  function sidesPool() { return state.dishes.filter(d => d.roles.includes('side') && !d.tags.includes('takeout')); }
  function staplesPool() { return state.dishes.filter(d => d.roles.includes('staple') && !d.tags.includes('takeout')); }

  function fillDayRandom(dayId, usedIds) {
    const day = ensureDay(dayId);
    const exclude = new Set(usedIds);
    const items = [];
    const main = weightedPick(mainsPool(), exclude, null);
    if (main) { items.push({ key: newKey(), dishId: main.id, type: 'main', portions: DEFAULT_PORTIONS }); exclude.add(main.id); }
    const side = weightedPick(sidesPool(), exclude, null);
    if (side) { items.push({ key: newKey(), dishId: side.id, type: 'side', portions: DEFAULT_PORTIONS }); exclude.add(side.id); }
    const staple = weightedPick(staplesPool(), exclude, null);
    if (staple) { items.push({ key: newKey(), dishId: staple.id, type: 'staple', portions: DEFAULT_PORTIONS }); exclude.add(staple.id); }
    day.items = items;
    return items.map(i => i.dishId);
  }

  function fillWeekRandom() {
    const used = new Set();
    let prevMainMeat = null;
    DAYS.forEach(d => {
      const day = ensureDay(d.id);
      const exclude = new Set(used);
      const items = [];
      const main = weightedPick(mainsPool(), exclude, prevMainMeat);
      if (main) { items.push({ key: newKey(), dishId: main.id, type: 'main', portions: DEFAULT_PORTIONS }); exclude.add(main.id); used.add(main.id); prevMainMeat = meatOf(main); }
      const side = weightedPick(sidesPool(), exclude, null);
      if (side) { items.push({ key: newKey(), dishId: side.id, type: 'side', portions: DEFAULT_PORTIONS }); exclude.add(side.id); used.add(side.id); }
      const staple = weightedPick(staplesPool(), exclude, null);
      if (staple) { items.push({ key: newKey(), dishId: staple.id, type: 'staple', portions: DEFAULT_PORTIONS }); exclude.add(staple.id); used.add(staple.id); }
      day.items = items;
    });
    persist();
    toast('已随机安排一周，可手动修改 ✨');
    render();
  }

  function openRandom() {
    ui.random.day = todayDayId();
    ui.random.resultId = null;
    renderRandomModal();
  }

  function renderRandomModal() {
    const dayChips = DAYS.map(d =>
      '<button class="chip' + (ui.random.day === d.id ? ' active' : '') + '" data-action="randomPickDay" data-day="' + d.id + '">' + d.label + '</button>'
    ).join('');

    let result = '';
    if (ui.random.resultId) {
      const dish = findDish(ui.random.resultId);
      result = '<div class="random-result">' +
        '<div class="random-result-emoji">' + dish.emoji + '</div>' +
        '<div class="random-result-name">' + esc(dish.name) + '</div>' +
        '<div class="random-result-actions">' +
          '<button class="btn-ghost" data-action="randomAgain">换一个</button>' +
          '<button class="btn-primary" data-action="randomAddResult">加到菜单</button>' +
        '</div>' +
        '</div>';
    }

    openModal(
      '<div class="sheet">' +
        '<button class="sheet-close" data-action="closeModal">✕</button>' +
        '<h2>🎲 随机点菜</h2>' +
        '<p class="muted">随机有惊喜，收藏的菜更容易被选中。</p>' +
        '<div class="random-actions">' +
          '<button class="random-card" data-action="randomOne"><span class="random-card-ico">🍽</span><span>随机一道菜</span></button>' +
          '<button class="random-card" data-action="confirmRandomDay"><span class="random-card-ico">📅</span><span>随机安排一天</span></button>' +
          '<button class="random-card" data-action="confirmRandomWeek"><span class="random-card-ico">🗓</span><span>随机安排一整周</span></button>' +
        '</div>' +
        '<div class="form-group"><div class="form-label">随机一天：选择日期</div><div class="chips wrap">' + dayChips + '</div></div>' +
        result +
      '</div>'
    );
  }

  function doRandomOne() {
    const dish = weightedPick(state.dishes.filter(d => !d.tags.includes('takeout')), new Set(), null);
    if (!dish) { toast('没有可选菜品'); return; }
    ui.random.resultId = dish.id;
    renderRandomModal();
  }

  function doRandomDay() {
    fillDayRandom(ui.random.day, new Set());
    persist();
    closeModal();
    toast('已随机安排「' + DAYS.find(d => d.id === ui.random.day).label + '」');
    switchTab('menu');
  }

  function doRandomWeek() {
    closeModal();
    openConfirm('随机安排一整周', '将覆盖当前整周的菜单安排，确定吗？', function () {
      fillWeekRandom();
      switchTab('menu');
    });
  }

  /* ---------------- 通用确认弹窗 ---------------- */
  function openConfirm(title, msg, onOk) {
    openModal(
      '<div class="sheet confirm-sheet">' +
        '<button class="sheet-close" data-action="closeModal">✕</button>' +
        '<div class="confirm-ico">❓</div>' +
        '<h2>' + esc(title) + '</h2>' +
        '<p class="muted">' + esc(msg) + '</p>' +
        '<div class="sheet-actions">' +
          '<button class="btn-ghost" data-action="closeModal">取消</button>' +
          '<button class="btn-primary" id="confirmOk">确定</button>' +
        '</div>' +
      '</div>'
    );
    document.getElementById('confirmOk').addEventListener('click', function () {
      closeModal();
      onOk();
    });
  }

  /* ---------------- 保存并发送（同步） ---------------- */
  function encodeMenu() {
    const data = { v: 1, t: Date.now(), m: {} };
    DAYS.forEach(d => {
      const day = dayOf(d.id);
      data.m[d.id] = (day.items || []).map(it => [it.dishId, TYPE_CODE[it.type] || 'm', it.portions || 1]);
    });
    const json = JSON.stringify(data);
    let b64 = btoa(unescape(encodeURIComponent(json)));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodeMenu(str) {
    try {
      let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      const json = decodeURIComponent(escape(atob(b64)));
      const data = JSON.parse(json);
      if (data.v !== 1 || !data.m) return null;
      const menu = {};
      DAYS.forEach(d => {
        const arr = data.m[d.id] || [];
        menu[d.id] = { items: arr.map(([id, ty, p]) => ({
          key: newKey(),
          dishId: id,
          type: TYPE_FROM_CODE[ty] || 'main',
          portions: p || 1,
        })).filter(it => findDish(it.dishId)) };
      });
      return { menu, savedAt: data.t };
    } catch (e) { return null; }
  }

  function buildShareUrl() {
    return location.href.split('#')[0] + '#m=' + encodeMenu();
  }

  function saveAndShare() {
    persist();
    const url = buildShareUrl();
    openModal(
      '<div class="sheet share-sheet">' +
        '<button class="sheet-close" data-action="closeModal">✕</button>' +
        '<div class="confirm-ico">✅</div>' +
        '<h2>菜单已保存</h2>' +
        '<p class="muted">把下面链接发给 TA，TA 点开就能看到你点的菜。</p>' +
        '<textarea id="shareLink" class="share-link" readonly rows="3">' + esc(url) + '</textarea>' +
        '<div class="sheet-actions">' +
          '<button class="btn-primary" data-action="copyShare">复制链接</button>' +
          '<button class="btn-ghost" data-action="nativeShare">直接分享</button>' +
        '</div>' +
      '</div>'
    );
  }

  function copyShare() {
    const url = buildShareUrl();
    const ta = document.getElementById('shareLink');
    if (ta) ta.value = url;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => toast('链接已复制，去粘贴发送吧')).catch(() => fallbackCopy(url));
    } else fallbackCopy(url);
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('链接已复制'); } catch (e) { toast('请长按上方链接手动复制', 'warn'); }
    document.body.removeChild(ta);
  }

  function nativeShare() {
    const url = buildShareUrl();
    const payload = { title: '这周我点的菜', text: '看看这周吃什么～', url: url };
    if (navigator.share) {
      navigator.share(payload).catch(function () { copyShare(); });
    } else {
      copyShare();
    }
  }

  /* ---------------- 收藏 ---------------- */
  function toggleFav(id) {
    const idx = state.favorites.indexOf(id);
    if (idx >= 0) { state.favorites.splice(idx, 1); toast('已取消收藏'); }
    else { state.favorites.push(id); toast('已收藏 ♥'); }
    save(STORAGE.fav, state.favorites);
    render();
    if (ui.lastDetailId === id && document.getElementById('modalOverlay').classList.contains('show')) {
      openDetail(id);
    }
  }

  /* ---------------- 搜索 ---------------- */
  function onSearch(v) {
    state.search = v;
    renderHallGrid();
    const count = document.getElementById('hallCount');
    if (count) count.textContent = selectedCount();
  }
  function onFavSearch(v) {
    state.favSearch = v;
    renderFavGrid();
  }

  window.App = { onSearch, onFavSearch };
  window.__test = { encodeMenu, decodeMenu };

  /* ---------------- 图标 ---------------- */
  function searchIcon() {
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
  }

  /* ---------------- 事件处理 ---------------- */
  function onDocClick(e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;

    if (action === 'fav') {
      e.stopPropagation();
      toggleFav(el.dataset.id);
      return;
    }

    switch (action) {
      case 'nav': switchTab(el.dataset.tab); break;
      case 'gotoMenu': switchTab('menu'); break;

      case 'category': state.category = el.dataset.cat; renderHallChips(); renderHallGrid(); break;
      case 'detail': openDetail(el.dataset.id); break;
      case 'add': openAdd(el.dataset.id); break;

      case 'addPickDay': ui.add.day = el.dataset.day; renderAddModal(); break;
      case 'addPickType': ui.add.type = el.dataset.type; renderAddModal(); break;
      case 'addPickPortion': ui.add.portions = parseInt(el.dataset.p, 10); renderAddModal(); break;
      case 'confirmAdd': doConfirmAdd(); break;
      case 'removeAddExisting': removeAddExisting(); break;

      case 'editItem': openEditItem(el.dataset.day, el.dataset.key); break;
      case 'editPickType': ui.edit.type = el.dataset.type; renderEditItem(findDish(dayOf(ui.edit.dayId).items.find(x => x.key === ui.edit.key).dishId)); break;
      case 'editPickPortion': ui.edit.portions = parseInt(el.dataset.p, 10); renderEditItem(findDish(dayOf(ui.edit.dayId).items.find(x => x.key === ui.edit.key).dishId)); break;
      case 'editSave': doEditSave(); break;
      case 'editRemove': doEditRemove(); break;

      case 'openRandom': openRandom(); break;
      case 'randomOne': doRandomOne(); break;
      case 'randomAgain': doRandomOne(); break;
      case 'randomPickDay': ui.random.day = el.dataset.day; renderRandomModal(); break;
      case 'confirmRandomDay': doRandomDay(); break;
      case 'confirmRandomWeek': doRandomWeek(); break;
      case 'randomAddResult': openAdd(ui.random.resultId); break;

      case 'saveAndShare': saveAndShare(); break;
      case 'copyShare': copyShare(); break;
      case 'nativeShare': nativeShare(); break;

      case 'closeModal': closeModal(); break;
      default: break;
    }
  }

  /* ---------------- 接收分享（男朋友端） ---------------- */
  function handleShareHash() {
    const m = (location.hash.match(/[#&]m=([^&]+)/) || [])[1];
    if (!m) return;
    const decoded = decodeMenu(m);
    if (decoded) {
      state.menu = decoded.menu;
      state.shared = { savedAt: decoded.savedAt };
      persist();
      state.tab = 'menu';
      toast('已载入她发来的点餐结果 📥');
    } else {
      toast('分享链接无效或已损坏', 'warn');
    }
    history.replaceState(null, '', location.pathname + location.search);
  }

  /* ---------------- 初始化 ---------------- */
  function init() {
    loadState();
    handleShareHash();
    document.addEventListener('click', onDocClick);

    const nav = document.getElementById('nav');
    const tabs = [
      { key: 'hall', label: '点菜', icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h18a1 1 0 0 1 1 1v0a8 8 0 0 1-8 8H10a8 8 0 0 1-8-8v0a1 1 0 0 1 1-1z"></path><path d="M7 11V8a5 5 0 0 1 10 0v3"></path></svg>' },
      { key: 'menu', label: '我的菜单', icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="M8 14h2M14 14h2M8 18h2M14 18h2"></path></svg>' },
      { key: 'fav', label: '我的收藏', icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>' },
    ];
    nav.innerHTML = tabs.map(t =>
      '<button class="tab-item' + (state.tab === t.key ? ' active' : '') + '" data-action="nav" data-tab="' + t.key + '">' +
        '<span class="tab-icon">' + t.icon + '</span>' +
        '<span class="tab-label">' + t.label + '</span>' +
      '</button>'
    ).join('');

    document.getElementById('modalOverlay').addEventListener('click', function (e) {
      if (e.target === this) closeModal();
    });

    render();

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function () {});
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
