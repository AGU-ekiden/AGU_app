(function () {
  const main = document.getElementById('main');
  const searchInput = document.getElementById('search');

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function cardHtml(app) {
    const url = app.liveUrl || app.repoUrl;
    const statusLabel = app.liveUrl ? '開く' : 'GitHub';
    const statusClass = app.liveUrl ? 'live' : 'repo';
    return `
      <a class="card" href="${url}" target="_blank" rel="noopener noreferrer">
        <div class="card-top">
          <span class="card-icon">${app.icon}</span>
          <span class="card-name">${escapeHtml(app.name)}</span>
        </div>
        <p class="card-desc">${escapeHtml(app.description)}</p>
        <div class="card-bottom">
          <span class="card-stack">${escapeHtml(app.stack)}</span>
          <span class="card-status ${statusClass}">${statusLabel}</span>
        </div>
      </a>
    `;
  }

  function render(filterText) {
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
            ${catApps.map(cardHtml).join('')}
          </div>
        </section>
      `;
    }).join('');

    main.innerHTML = html || '<p class="empty">該当するアプリが見つかりませんでした。</p>';
  }

  searchInput.addEventListener('input', (e) => render(e.target.value));
  render('');
})();
