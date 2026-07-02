/**
 * shell.js — renders the CMS chrome into <div id="app-shell"></div>:
 * a top bar (mobile) + sidebar (desktop) that becomes a slide-out drawer
 * on small screens, plus the page content mount point.
 *
 * Contract unchanged from before: call Shell.mount('key') near the top
 * of a page's script, then Shell.pageRoot() to get the element to render
 * page content into. Existing pages built against the old shell keep
 * working without modification.
 */

const NAV_SECTIONS = [
  {
    label: null,
    items: [
      { key: 'dashboard', href: 'dashboard.html', label: 'Dashboard', icon: 'M3 13h8V3H3v10Zm10 8h8V3h-8v18ZM3 21h8v-6H3v6Z' },
    ],
  },
  {
    label: 'Content',
    items: [
      { key: 'articles', href: 'articles.html', label: 'Articles', icon: 'M4 4h16v16H4V4Zm3 4h10M7 12h10M7 16h6' },
      { key: 'editor-pro', href: 'editor-pro.html', label: 'Editor Pro ✦', icon: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z' },
      { key: 'media', href: 'media.html', label: 'Media Library', icon: 'M4 5h16v14H4V5Zm3 10 4-5 3 4 2-2 4 3' },
      { key: 'categories', href: 'categories.html', label: 'Categories & Tags', icon: 'M4 5h7l9 9-7 7-9-9V5Zm3 3h.01' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { key: 'activity', href: 'activity.html', label: 'Activity Log', icon: 'M12 8v4l3 3M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9Z' },
      { key: 'tools', href: 'tools.html', label: 'Tools', icon: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z' },
    ],
  },
  {
    label: 'Account',
    items: [
      { key: 'profile', href: 'profile.html', label: 'Profile', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z' },
      { key: 'customizer', href: 'customizer.html', label: 'Customize Site', icon: 'M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83' },
      { key: 'settings', href: 'settings.html', label: 'Settings', icon: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm8 3a8 8 0 0 0-.2-1.8l2-1.6-2-3.4-2.4.9a8 8 0 0 0-3.1-1.8L14 2h-4l-.3 2.3a8 8 0 0 0-3.1 1.8l-2.4-.9-2 3.4 2 1.6A8 8 0 0 0 4 12a8 8 0 0 0 .2 1.8l-2 1.6 2 3.4 2.4-.9a8 8 0 0 0 3.1 1.8L10 22h4l.3-2.3a8 8 0 0 0 3.1-1.8l2.4.9 2-3.4-2-1.6c.1-.6.2-1.2.2-1.8Z' },
    ],
  },
];

function iconSvg(path) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;
}

const Shell = {
  mount(activeKey) {
    const session = Auth.requireSession();
    if (!session) return null;
    const { account, target } = session;

    const root = document.getElementById('app-shell');
    if (!root) return session;

    const navHtml = NAV_SECTIONS.map((section) => `
      ${section.label ? `<p class="nav-section-label">${section.label}</p>` : ''}
      ${section.items.map((item) => `
        <a href="${item.href}" class="nav-link ${item.key === activeKey ? 'active' : ''}" data-nav-link>
          ${iconSvg(item.icon)}
          <span>${item.label}</span>
        </a>
      `).join('')}
    `).join('');

    root.innerHTML = `
      <div class="shell">
        <div class="drawer-overlay" id="drawerOverlay"></div>

        <aside class="sidebar" id="sidebarDrawer">
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
            <button class="drawer-close" id="drawerCloseBtn" aria-label="Close menu">
              ${iconSvg('M18 6 6 18M6 6l12 12')}
            </button>
          </div>
          <div class="sidebar-new">
            <a href="editor-pro.html" class="btn btn-primary btn-block">
              ${iconSvg('M12 5v14M5 12h14')}
              New article
            </a>
          </div>
          <nav class="sidebar-nav scroll">${navHtml}</nav>
          <div class="sidebar-footer">
            <div class="account-row">
              <img src="${account.avatarUrl}" alt="" />
              <span class="name">${account.name || account.login}</span>
              <button class="signout" id="shellSignOut">Sign out</button>
            </div>
          </div>
        </aside>

        <div class="shell-main">
          <header class="topbar">
            <button class="hamburger-btn" id="hamburgerBtn" aria-label="Open menu">
              ${iconSvg('M4 7h16M4 12h16M4 17h16')}
            </button>
            <div class="topbar-title">
              <span class="logo-mark logo-mark-sm">
                <svg viewBox="0 0 32 32" width="14" height="14">
                  <path d="M5 16 Q9 8, 13 16 T21 16 T27 16" stroke="#A8762E" stroke-width="2" fill="none" stroke-linecap="round"/>
                </svg>
              </span>
              <span class="font-display">The Raga Journal</span>
            </div>
            <a href="editor.html" class="topbar-new-btn" aria-label="New article">
              ${iconSvg('M12 5v14M5 12h14')}
            </a>
          </header>
          <main class="content scroll" id="page-content"></main>
          <nav class="bottom-tabbar">
            <a href="dashboard.html" class="tab-link ${activeKey === 'dashboard' ? 'active' : ''}">${iconSvg(NAV_SECTIONS[0].items[0].icon)}<span>Home</span></a>
            <a href="articles.html" class="tab-link ${activeKey === 'articles' ? 'active' : ''}">${iconSvg(NAV_SECTIONS[1].items[0].icon)}<span>Articles</span></a>
            <a href="editor.html" class="tab-link tab-link-new" aria-label="New article">${iconSvg('M12 5v14M5 12h14')}</a>
            <a href="media.html" class="tab-link ${activeKey === 'media' ? 'active' : ''}">${iconSvg(NAV_SECTIONS[1].items[1].icon)}<span>Media</span></a>
            <button class="tab-link" id="tabMoreBtn">${iconSvg('M5 12h.01M12 12h.01M19 12h.01')}<span>More</span></button>
          </nav>
        </div>
      </div>
    `;

    const drawer = document.getElementById('sidebarDrawer');
    const overlay = document.getElementById('drawerOverlay');

    function openDrawer() {
      drawer.classList.add('open');
      overlay.classList.add('open');
    }
    function closeDrawer() {
      drawer.classList.remove('open');
      overlay.classList.remove('open');
    }

    document.getElementById('hamburgerBtn').addEventListener('click', openDrawer);
    document.getElementById('drawerCloseBtn').addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);
    document.getElementById('tabMoreBtn').addEventListener('click', openDrawer);
    root.querySelectorAll('[data-nav-link]').forEach((link) => link.addEventListener('click', closeDrawer));

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
