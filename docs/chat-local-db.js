(() => {
  const DB_NAME = 'klyxe_chat_local';
  const DB_VERSION = 1;
  const STORE_SOURCES = 'sources';
  const STORE_SESSIONS = 'sessions';
  const STORE_STATE = 'state';

  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_SOURCES)) db.createObjectStore(STORE_SOURCES, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(STORE_SESSIONS)) db.createObjectStore(STORE_SESSIONS, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(STORE_STATE)) db.createObjectStore(STORE_STATE, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('db open failed'));
    });
    return dbPromise;
  }

  async function withStore(storeName, mode, action) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      let out;
      try {
        out = action(store);
      } catch (err) {
        reject(err);
        return;
      }
      tx.oncomplete = () => resolve(out);
      tx.onerror = () => reject(tx.error || new Error('transaction failed'));
      tx.onabort = () => reject(tx.error || new Error('transaction aborted'));
    });
  }

  async function saveSources(sources) {
    await withStore(STORE_SOURCES, 'readwrite', (store) => {
      store.clear();
      (sources || []).forEach((source) => store.put(source));
    });
  }

  async function loadSources() {
    return withStore(STORE_SOURCES, 'readonly', (store) =>
      new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error || new Error('load sources failed'));
      })
    );
  }

  async function saveSessions(sessions) {
    await withStore(STORE_SESSIONS, 'readwrite', (store) => {
      store.clear();
      (sessions || []).forEach((session) => store.put(session));
    });
  }

  async function loadSessions() {
    return withStore(STORE_SESSIONS, 'readonly', (store) =>
      new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error || new Error('load sessions failed'));
      })
    );
  }

  async function saveState(key, value) {
    await withStore(STORE_STATE, 'readwrite', (store) => {
      store.put({ id: key, value });
    });
  }

  async function loadState(key) {
    return withStore(STORE_STATE, 'readonly', (store) =>
      new Promise((resolve, reject) => {
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result?.value ?? null);
        req.onerror = () => reject(req.error || new Error('load state failed'));
      })
    );
  }

  window.KlyxeLocalStore = {
    saveSources,
    loadSources,
    saveSessions,
    loadSessions,
    saveState,
    loadState,
  };
})();
