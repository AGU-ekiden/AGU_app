(function () {
  const main = document.getElementById('main');
  const headerNav = document.getElementById('headerNav');
  const searchInput = document.getElementById('search');
  const ROLE_STORAGE_KEY = 'agu_portal_role';
  const AUTH_STORAGE_KEY = 'agu_portal_auth';

  let view = 'login'; // 'login' | 'pinchange' | 'role' | 'all'
  let currentRoleId = localStorage.getItem(ROLE_STORAGE_KEY);
  let authedName = localStorage.getItem(AUTH_STORAGE_KEY);
  let pendingName = null;
  let pendingPin = null;
  let pendingRole = null;

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

  function showAll() {
    view = 'all';
    renderHeaderNav();
    renderMain();
  }

  function backToRole() {
    view = 'role';
    renderHeaderNav();
    renderMain();
  }

  function logout() {
    authedName = null;
    currentRoleId = null;
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(ROLE_STORAGE_KEY);
    view = 'login';
    renderHeaderNav();
    renderMain();
  }

  function completeLogin(name, roleId) {
    authedName = name;
    currentRoleId = roleId;
    localStorage.setItem(AUTH_STORAGE_KEY, name);
    localStorage.setItem(ROLE_STORAGE_KEY, roleId);
    view = 'role';
    renderHeaderNav();
    renderMain('');
  }

  // ---------- header nav ----------
  function renderHeaderNav() {
    if (view === 'login' || view === 'pinchange') {
      headerNav.innerHTML = '';
      return;
    }

    const role = window.ROLES.find((r) => r.id === currentRoleId);
    const parts = [];
    if (view === 'role' && role) {
      parts.push(`<span class="nav-current">${role.icon} ${escapeHtml(role.name)} メニュー</span>`);
      parts.push('<button type="button" class="nav-btn" data-action="show-all">すべてのアプリ</button>');
    } else if (view === 'all') {
      if (role) {
        parts.push(`<button type="button" class="nav-btn" data-action="back-to-role">${role.icon} ${escapeHtml(role.name)}メニューに戻る</button>`);
      }
    }
    if (authedName) {
      parts.push(`<button type="button" class="nav-btn" data-action="logout">${escapeHtml(authedName)} / ログアウト</button>`);
    }
    headerNav.innerHTML = parts.join('');

    headerNav.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        if (action === 'show-all') showAll();
        else if (action === 'back-to-role') backToRole();
        else if (action === 'logout') logout();
      });
    });
  }

  // ---------- login / pin change views ----------
  function renderAuthError(message) {
    const errorEl = document.getElementById('authError');
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  function renderLogin() {
    searchInput.style.display = 'none';
    main.innerHTML = `
      <section class="auth">
        <div class="auth-card">
          <h1 class="auth-title">ログイン</h1>
          <p class="auth-sub">氏名と6桁の暗証番号を入力してください。<br>初めての方は暗証番号に【000000】を入力してください。</p>
          <form id="loginForm" class="auth-form" autocomplete="off">
            <label class="field">
              <span>氏名</span>
              <input type="text" id="loginName" autocomplete="name" required>
            </label>
            <label class="field">
              <span>暗証番号(6桁)</span>
              <input type="password" id="loginPin" inputmode="numeric" pattern="\\d{6}" maxlength="6" required>
            </label>
            <p class="auth-error" id="authError" hidden></p>
            <button type="submit" class="auth-btn">ログイン</button>
          </form>
        </div>
      </section>
    `;

    const form = document.getElementById('loginForm');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      document.getElementById('authError').hidden = true;
      const name = document.getElementById('loginName').value.trim();
      const pin = document.getElementById('loginPin').value.trim();
      if (!name || !/^\d{6}$/.test(pin)) {
        renderAuthError('氏名と6桁の暗証番号を入力してください');
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, pin }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          renderAuthError(data.error || 'ログインに失敗しました');
          return;
        }
        if (data.needsPinChange) {
          pendingName = name;
          pendingPin = pin;
          pendingRole = data.role;
          view = 'pinchange';
          renderHeaderNav();
          renderMain();
        } else {
          completeLogin(name, data.role);
        }
      } catch (err) {
        renderAuthError('通信エラーが発生しました。しばらくしてから再度お試しください。');
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  function renderPinChange() {
    searchInput.style.display = 'none';
    main.innerHTML = `
      <section class="auth">
        <div class="auth-card">
          <h1 class="auth-title">暗証番号の変更</h1>
          <p class="auth-sub">初回ログインのため、6桁の暗証番号を新しく設定してください。</p>
          <form id="pinForm" class="auth-form" autocomplete="off">
            <label class="field">
              <span>新しい暗証番号(6桁)</span>
              <input type="password" id="newPin1" inputmode="numeric" pattern="\\d{6}" maxlength="6" required>
            </label>
            <label class="field">
              <span>新しい暗証番号(確認)</span>
              <input type="password" id="newPin2" inputmode="numeric" pattern="\\d{6}" maxlength="6" required>
            </label>
            <p class="auth-error" id="authError" hidden></p>
            <button type="submit" class="auth-btn">変更してログイン</button>
          </form>
        </div>
      </section>
    `;

    const form = document.getElementById('pinForm');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      document.getElementById('authError').hidden = true;
      const p1 = document.getElementById('newPin1').value.trim();
      const p2 = document.getElementById('newPin2').value.trim();
      if (!/^\d{6}$/.test(p1)) {
        renderAuthError('6桁の数字で入力してください');
        return;
      }
      if (p1 !== p2) {
        renderAuthError('確認用の暗証番号が一致しません');
        return;
      }
      if (p1 === '000000') {
        renderAuthError('初期値以外の暗証番号を設定してください');
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      try {
        const res = await fetch('/api/change-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: pendingName, currentPin: pendingPin, newPin: p1 }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          renderAuthError(data.error || '変更に失敗しました');
          return;
        }
        const name = pendingName;
        const roleId = pendingRole;
        pendingName = null;
        pendingPin = null;
        pendingRole = null;
        completeLogin(name, roleId);
      } catch (err) {
        renderAuthError('通信エラーが発生しました。しばらくしてから再度お試しください。');
      } finally {
        submitBtn.disabled = false;
      }
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
      <a class="feature-item" href="${link.url}">
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
    if (!role) { logout(); return; }

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
      <a class="card" href="${link.url}">
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
    if (view === 'login') renderLogin();
    else if (view === 'pinchange') renderPinChange();
    else if (view === 'role') renderRoleMenu(filterText);
    else renderAllApps(filterText);
  }

  searchInput.addEventListener('input', (e) => renderMain(e.target.value));

  view = (authedName && currentRoleId) ? 'role' : 'login';
  renderHeaderNav();
  renderMain('');
})();
