// js/storage.js — abstracted storage layer, swap for Supabase later

const KEY = 'jam_world_sessions';

function getSessions() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function saveSessions(sessions) {
  localStorage.setItem(KEY, JSON.stringify(sessions));
}

export const storage = {
  save(session) {
    const sessions = getSessions();
    const existing = sessions.findIndex(s => s.id === session.id);
    const entry = { ...session, updatedAt: Date.now() };
    if (existing >= 0) {
      sessions[existing] = { ...sessions[existing], ...entry };
    } else {
      sessions.unshift({ ...entry, createdAt: Date.now() });
    }
    saveSessions(sessions);
    return entry;
  },

  load(id) {
    return getSessions().find(s => s.id === id) || null;
  },

  list() {
    return getSessions();
  },

  delete(id) {
    saveSessions(getSessions().filter(s => s.id !== id));
  }
};

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
