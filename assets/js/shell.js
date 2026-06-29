/**
 * shell.js — renders the sidebar shell into <div id="app-shell"></div>
 * and wraps page-specific content. Include after auth.js. Call
 * Shell.mount('articles') near the top of each dashboard page's script,
 * passing the nav key that should be highlighted active.
 */

const NAV_ITEMS = [
  { key: 'dashboard', href: 'dashboard.html', label: 'Dashboard', icon: 'M3 13h8V3H3v10Zm10 8h8V3h-8v18ZM3 21h8v-6H3v6Z' },
  { key: 'articles', href: 'articles.html', label: 'Articles', icon: 'M4 4h16v16H4V4Zm3 4h10M7 12h10M7 16h6' },
  { key: 'media', href: 'media.html', label: 'Media Library', icon: 'M4 5h16v14H4V5Zm3 10 4-5 3 4 2-2 4 3' },
  { key: 'categories', href: 'categories.html', label: 'Categories & Tags', icon: 'M4 5h7l9 9-7 7-9-9V5Zm3 3h.01' },
  { key: 'settings', href: 'settings.html', label: 'Settings', icon: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm8 3a8 8 0 0 0-.2-1.8l2-1.6-2-3.4-2.4.9a8 8 0 0 0-3.1-1.8L14 2h-4l-.3 2.3a8 8 0 0 0-3.1 1.8l-2.4-.9-2 3.4 2 1.6A8 8 0 0 0 4 12a8 8 0 0 0 .2 1.8l-2 1.6 2 3.4 2.4-.9a8 8 0 0 0 3.1 1.8L10 22h4l.3-2.3a8 8 0 0 0 3.1-1.8l2.4.9 2-3.4-2-1.6c.1-.6.2-1.2.2-1.8Z' },
];

const Shell = {
  mount(activeKey) {
    const session = Auth.requireSession();
    if (!session) return null;
    const { account, target } = session;

    const root = document.getElementById('app-shell');
    if (!root) return session;

    const nav = NAV_ITEMS.map((item) => `
      <a href="${item.href}" class="nav-link ${item.key === activeKey ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${item.icon}"/></svg>
        ${item.label}
      </a>
    `).join('');

    root.innerHTML = `
      <div class="shell">
        <aside class="sidebar">
          <div class="sidebar-header">
            <div class="logo-mark">
              <svg viewBox="0 0 32 32" width="18" height="18">
                <path d="M5 16 Q9 8, 13 16 T21 16 T27 16" stroke="#A8762E" stroke-width="2" fill="none" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="titles">
              <p class="site-name font-display">The Raga Journal</p>
              <p class="repo-name mono">${target.owner}/${target.repo}</p>
            </div>
          </div>
          <div class="sidebar-new">
            <a href="editor.html" class="btn btn-primary btn-block">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
              New article
            </a>
          </div>
          <nav class="sidebar-nav">${nav}</nav>
          <div class="sidebar-footer">
            <div class="account-row">
              <img src="${account.avatarUrl}" alt="" />
              <span class="name">${account.name || account.login}</span>
              <button class="signout" id="shellSignOut">Sign out</button>
            </div>
          </div>
        </aside>
        <main class="content scroll" id="page-content"></main>
      </div>
    `;

    document.getElementById('shellSignOut').addEventListener('click', () => {
      Auth.logout();
      location.href = 'login.html';
    });

    return session;
  },

  /** Convenience: get the element where page-specific markup should be injected. */
  pageRoot() {
    return document.getElementById('page-content');
  },
};

window.Shell = Shell;
