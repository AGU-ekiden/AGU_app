(function () {
  const main = document.getElementById('main');
  const headerNav = document.getElementById('headerNav');
  const searchInput = document.getElementById('search');
  const ROLE_STORAGE_KEY = 'agu_portal_role';

  let view = 'picker'; // 'picker' | 'role' | 'all'
  let currentRoleId = localStorage.getItem(ROLE_STORAGE_KEY);

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function getApp(id) {
    return window.APPS.find((a) => a.id === id) || null;
  }

  function resolveAppLink(app) {
    if (!app) return null;
    if (app.liveUrl) {
      return { url: app.liveUrl, label: app.urlConfidence === 'guess' ? '開く(推定)' : '開く', kind: app.urlConfidence === 'guess' ? 'guess' : 'live' };
    }
    return { url: app.repoUrl, label: app.external ? 'GitHub(別リポジトリ)' : 'コード', kind: 'repo' };
  }

  function setRole(roleId) {
    currentRoleId = roleId;
    localStorage.setItem(ROLE_STORAGE_KEY, roleId);
    view = 'role';
    searchInput.value = '';
    renderHeaderNav();
    renderMain();
  }

  function clearRole() {
    currentRoleId = null;
    localStorage.removeItem(ROLE_STORAGE_KEY);
    view = 'picker';
    renderHeaderNav();
    renderMain();
  }

  function showAll() {
    view = 'all';
    renderHeaderNav();
    renderMain();
  }

  function backToRole() {
    if (!currentRoleId) { view = 'picker'; } else { view = 'role'; }
    renderHeaderNav();
    renderMain();
  }

  // ---------- header nav ----------
  function renderHeaderNav() {
    const role = window.ROLES.find((r) => r.id === currentRoleId);
    const parts = [];
    if (view === 'role' && role) {
      parts.push(`<span class="nav-current">${role.icon} ${escapeHtml(role.name)} メニュー</span>`);
      parts.push('<button type="button" class="nav-btn" data-action="change-role">役割を変更</button>');
      parts.push('<button type="button" class="nav-btn" data-action="show-all">すべてのアプリ</button>');
    } else if (view === 'all') {
      if (role) {
        parts.push(`<button type="button" class="nav-btn" data-action="back-to-role">${role.icon} ${escapeHtml(role.name)}メニューに戻る</button>`);
      } else {
        parts.push('<button type="button" class="nav-btn" data-action="change-role">役割を選ぶ</button>');
      }
    } else {
      parts.push('<button type="button" class="nav-btn" data-action="show-all">役割を選ばずすべてのアプリを見る</button>');
    }
    headerNav.innerHTML = parts.join('');

    headerNav.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        if (action === 'change-role') clearRole();
        else if (action === 'show-all') showAll();
        else if (action === 'back-to-role') backToRole();
      });
    });
  }

  // ---------- picker view ----------
  function renderPicker() {
    searchInput.style.display = 'none';
    const cards = window.ROLES.map((role) => `
      <button type="button" class="role-card" data-role="${role.id}">
        <span class="role-icon">${role.icon}</span>
        <span class="role-name">${escapeHtml(role.name)}</span>
      </button>
    `).join('');

    main.innerHTML = `
      <section class="picker">
        <h1 class="picker-title">あなたの役割を選んでください</h1>
        <p class="picker-sub">役割に合わせたメニューを表示します(次回から自動的に表示されます)</p>
        <div class="role-grid">${cards}</div>
      </section>
    `;

    main.querySelectorAll('[data-role]').forEach((btn) => {
      btn.addEventListener('click', () => setRole(btn.getAttribute('data-role')));
    });
  }

  // ---------- role menu view ----------
  function featureItemHtml(featureKey) {
    const feature = window.FEATURES[featureKey];
    if (!feature) return '';
    const app = feature.target ? getApp(feature.target) : null;
    const link = feature.target ? resolveAppLink(app) : null;
    if (link && feature.hash && link.kind !== 'repo') {
      link.url = `${link.url}#${feature.hash}`;
    }

    const noteHtml = feature.note ? `<span class="feature-note">${escapeHtml(feature.note)}</span>` : '';

    if (!link) {
      return `
        <div class="feature-item is-disabled">
          <span class="feature-icon">${feature.icon}</span>
          <span class="feature-body">
            <span class="feature-name">${escapeHtml(feature.name)}</span>
            ${noteHtml}
          </span>
          <span class="feature-status pending">準備中</span>
        </div>
      `;
    }

    const statusClass = link.kind === 'repo' ? 'repo' : (link.kind === 'guess' ? 'guess' : 'live');
    return `
      <a class="feature-item" href="${link.url}" target="_blank" rel="noopener noreferrer">
        <span class="feature-icon">${feature.icon}</span>
        <span class="feature-body">
          <span class="feature-name">${escapeHtml(feature.name)}</span>
          ${noteHtml}
        </span>
        <span class="feature-status ${statusClass}">${link.label}</span>
      </a>
    `;
  }

  function renderRoleMenu(filterText) {
    searchInput.style.display = '';
    searchInput.placeholder = 'メニューを検索…';
    const role = window.ROLES.find((r) => r.id === currentRoleId);
    if (!role) { view = 'picker'; renderPicker(); return; }

    const q = (filterText || '').trim().toLowerCase();
    const keys = role.features.filter((key) => {
      if (!q) return true;
      const f = window.FEATURES[key];
      return f && f.name.toLowerCase().includes(q);
    });

    if (keys.length === 0) {
      main.innerHTML = '<p class="empty">該当するメニューが見つかりませんでした。</p>';
      return;
    }

    main.innerHTML = `
      <section class="feature-list">
        ${keys.map(featureItemHtml).join('')}
      </section>
    `;
  }

  // ---------- all apps view (grid by category) ----------
  function appCardHtml(app) {
    const link = resolveAppLink(app);
    const statusClass = link.kind === 'repo' ? 'repo' : (link.kind === 'guess' ? 'guess' : 'live');
    return `
      <a class="card" href="${link.url}" target="_blank" rel="noopener noreferrer">
        <div class="card-top">
          <span class="card-icon">${app.icon}</span>
          <span class="card-name">${escapeHtml(app.name)}</span>
        </div>
        <p class="card-desc">${escapeHtml(app.description)}</p>
        <div class="card-bottom">
          <span class="card-stack">${escapeHtml(app.stack)}</span>
          <span class="card-status ${statusClass}">${link.label}</span>
        </div>
      </a>
    `;
  }

  function renderAllApps(filterText) {
    searchInput.style.display = '';
    searchInput.placeholder = 'アプリを検索…';
    const q = (filterText || '').trim().toLowerCase();
    const apps = window.APPS.filter((app) => {
      if (!q) return true;
      return (
        app.name.toLowerCase().includes(q) ||
        app.description.toLowerCase().includes(q) ||
        app.stack.toLowerCase().includes(q)
      );
    });

    if (apps.length === 0) {
      main.innerHTML = '<p class="empty">該当するアプリが見つかりませんでした。</p>';
      return;
    }

    const html = window.CATEGORIES.map((cat) => {
      const catApps = apps.filter((a) => a.category === cat.id);
      if (catApps.length === 0) return '';
      return `
        <section class="category">
          <h2 class="category-title">${cat.name}</h2>
          <div class="card-grid">
            ${catApps.map(appCardHtml).join('')}
          </div>
        </section>
      `;
    }).join('');

    main.innerHTML = html || '<p class="empty">該当するアプリが見つかりませんでした。</p>';
  }

  // ---------- dispatch ----------
  function renderMain(filterText) {
    if (view === 'picker') renderPicker();
    else if (view === 'role') renderRoleMenu(filterText);
    else renderAllApps(filterText);
  }

  searchInput.addEventListener('input', (e) => renderMain(e.target.value));

  view = currentRoleId ? 'role' : 'picker';
  renderHeaderNav();
  renderMain('');
})();
