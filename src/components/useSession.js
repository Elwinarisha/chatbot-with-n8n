// src/components/useSession.js
// Minimal session composable used by LuxeGPT.vue.
// Keeps sessionId in localStorage + cookie and posts to n8n create_session.
// Also exposes attachSession for when user logs in and session must be rotated.

const CREATE_SESSION_WEBHOOK = 'https://n8nluxe.luxeveda.com/webhook/create_session';
const ATTACH_WEBHOOK = 'https://n8nluxe.luxeveda.com/webhook/attach_session';

export function makeSessionId() {
  const rand = () => Math.random().toString(36).slice(2, 7); // 5 chars
  const raw = `${Date.now()}-${rand()}`;
  try { return btoa(raw); } catch { return raw.replace(/[^a-z0-9]/gi, '') + rand(); }
}

export function saveSessionLocally(sid) {
  try { localStorage.setItem('luxe_sessionId', sid); } catch (e) {}
  const expires = new Date(Date.now() + 30*24*60*60*1000).toUTCString();
  document.cookie = `luxe_sessionId=${sid}; path=/; expires=${expires}; SameSite=Lax`;
}

export function readLocalSession() {
  try {
    const s = localStorage.getItem('luxe_sessionId');
    if (s) return s;
  } catch (e) {}
  const match = document.cookie.match(/(^|;\s*)luxe_sessionId=([^;]+)/);
  return match ? match[2] : null;
}

export async function postCreateSession(sid, userId = null, email = null) {
  try {
    const payload = { sessionId: sid, userId, email };
    const res = await fetch(CREATE_SESSION_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json().catch(() => ({ ok: res.ok }));
  } catch (err) {
    console.error('create_session webhook error', err);
    return { ok: false, error: String(err) };
  }
}

export async function attachSession(oldSid, newSid, email) {
  try {
    const res = await fetch(ATTACH_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldSessionId: oldSid, newSessionId: newSid, email })
    });
    return await res.json().catch(() => ({ ok: res.ok }));
  } catch (err) {
    console.error('attach_session error', err);
    return { ok: false, error: String(err) };
  }
}
