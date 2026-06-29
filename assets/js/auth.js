/**
 * auth.js — manages GitHub accounts, the active session, and the chosen
 * repo/branch target. Everything persists to localStorage so a refresh
 * doesn't log you out. Every page includes this file before app.js.
 */

const STORAGE = {
  accounts: 'raga-cms:accounts',
  activeLogin: 'raga-cms:active-login',
  target: 'raga-cms:repo-target',
};

const Auth = {
  getAccounts() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE.accounts) || '[]');
    } catch {
      return [];
    }
  },

  saveAccounts(accounts) {
    localStorage.setItem(STORAGE.accounts, JSON.stringify(accounts));
  },

  getActiveLogin() {
    return localStorage.getItem(STORAGE.activeLogin);
  },

  getActiveAccount() {
    const login = this.getActiveLogin();
    if (!login) return null;
    return this.getAccounts().find((a) => a.login === login) || null;
  },

  async addAccount(token) {
    const user = await window.GitHubAPI.validateToken(token);
    const account = {
      login: user.login,
      name: user.name,
      avatarUrl: user.avatar_url,
      token,
    };
    const accounts = this.getAccounts().filter((a) => a.login !== account.login);
    accounts.push(account);
    this.saveAccounts(accounts);
    localStorage.setItem(STORAGE.activeLogin, account.login);
    return account;
  },

  switchAccount(login) {
    localStorage.setItem(STORAGE.activeLogin, login);
    localStorage.removeItem(STORAGE.target);
  },

  removeAccount(login) {
    const accounts = this.getAccounts().filter((a) => a.login !== login);
    this.saveAccounts(accounts);
    if (this.getActiveLogin() === login) {
      localStorage.removeItem(STORAGE.activeLogin);
      localStorage.removeItem(STORAGE.target);
    }
  },

  getTarget() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE.target) || 'null');
    } catch {
      return null;
    }
  },

  setTarget(target) {
    localStorage.setItem(STORAGE.target, JSON.stringify(target));
  },

  logout() {
    localStorage.removeItem(STORAGE.activeLogin);
    localStorage.removeItem(STORAGE.target);
  },

  /**
   * Call at the top of every protected page. Redirects to login or repo
   * selection as needed, and returns { account, target } when both are
   * present. Returns null if it redirected (caller should stop running).
   */
  requireSession() {
    const account = this.getActiveAccount();
    if (!account) {
      if (!location.pathname.endsWith('login.html')) {
        location.href = 'login.html';
      }
      return null;
    }
    const target = this.getTarget();
    if (!target) {
      if (!location.pathname.endsWith('select-repo.html')) {
        location.href = 'select-repo.html';
      }
      return null;
    }
    return { account, target };
  },
};

window.Auth = Auth;
