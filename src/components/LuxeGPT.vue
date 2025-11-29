<template>
  <div class="h-screen bg-[#0b0f1a] text-textMain font-inter">
    <div class="flex h-screen">

      <!-- Sidebar: only shown when user is logged in -->
      <aside v-if="user" class="w-64 bg-panel/90 backdrop-blur border-r border-white/5 flex flex-col p-5">
        <div class="flex items-center justify-between mb-4">
          <div class="font-bold text-blue-400 text-lg tracking-wide">LuxeGPT</div>

          <!-- NEW CHAT BUTTON (only for logged users) -->
          <button @click="createNewChat"
            class="px-3 py-1 bg-blue-300/30 hover:bg-blue-300/50 text-blue-300 text-sm rounded-lg transition">
            +
          </button>
        </div>

        <ul id="chatList" class="flex-1 space-y-2 overflow-y-auto pr-1">
          <li v-for="chat in chats" :key="chat.id" @click="setActiveChat(chat.id)" :class="[
            'p-3 mb-1 rounded-lg cursor-pointer hover:bg-gray-700',
            chat.id === activeChatId ? 'bg-gray-700 text-white' : 'text-gray-300'
          ]">
            <div class="text-sm truncate">{{ chat.title }}</div>
          </li>
        </ul>

        <div class="text-xs text-white/40 mt-4">© 2025 Luxeveda</div>
      </aside>

      <!-- Main Chat -->
      <main class="flex-1 flex flex-col">

        <!-- Header -->
        <header class="px-6 py-4 border-b border-white/5 bg-panel/40 backdrop-blur flex items-center justify-between">
          <h2 class="text-blue-400 font-medium text-base">Ask LuxeGPT</h2>

          <!-- right-side: show auth buttons when NOT logged in,
               show email + logout when logged in -->
          <div class="flex items-center gap-3">
            <template v-if="user">
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-medium text-white">
                  {{ user.email.charAt(0).toUpperCase() }}
                </div>
                <div class="text-sm text-white">Hi, {{ user.email }}</div>
                <button @click="logout"
                  class="px-3 py-1 rounded-md bg-white/5 hover:bg-white/10 text-sm text-white">Logout</button>
              </div>
            </template>

            <template v-else>
              <button @click="openModal('signup')"
                class="px-3 py-1 rounded-md bg-white/5 hover:bg-white/10 text-sm text-white">
                Signup
              </button>
              <button @click="openModal('login')"
                class="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-sm text-white">
                Login
              </button>
            </template>
          </div>
        </header>

        <!-- Chat Area -->
        <div ref="chatBoxRef" id="chatBox"
          class="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-gradient-to-b from-white/5 to-transparent">
          <div v-for="(msg, idx) in activeChatMessages" :key="idx" :class="[
            (msg.who === 'user' ? 'ml-auto bg-gray-500/20 text-white' : 'mr-auto bg-gray-800 text-white'),
            'px-4 py-2 mb-2 rounded-xl w-fit max-w-[70%] break-words'
          ]">
            {{ msg.text }}
          </div>
        </div>

        <!-- Input Area -->
        <form @submit.prevent="sendMessage" autocomplete="off"
          class="flex gap-3 px-6 py-4 bg-panel/60 backdrop-blur border-t border-white/5">

          <input v-model="userInput" id="userInput" type="text" placeholder="Type your question..." class="flex-1 px-4 py-3 bg-[#0f1422] border border-white/10 rounded-xl 
       text-white placeholder-white/40 outline-none 
       focus:ring-2 focus:ring-blue-500/40 transition" />

          <button type="submit"
            class="px-6 py-3 bg-blue-500 rounded-xl text-white font-medium hover:bg-blue-600 active:scale-95 transition">
            Send
          </button>

        </form>

        <!-- Modal (Tailwind) -->
        <transition name="fade">
          <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center" @click.self="closeModal"
            @keydown.window.esc="closeModal">
            <!-- backdrop -->
            <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

            <!-- modal panel -->
            <div class="relative z-10 w-full max-w-lg mx-4">
              <div class="bg-[#0b0f1a] text-white border border-white/5 rounded-2xl shadow-2xl p-6">
                <div class="flex items-start justify-between mb-4">
                  <h3 class="text-lg text-white text-center">{{ modalMode === 'login' ? 'Login' : 'Sign up' }}</h3>
                  <button @click="closeModal" class="text-white/60 hover:text-white">✕</button>
                </div>

                <!-- Email component remounts when modalMode changes -->
                <!-- inside LuxeGPT.vue template -->
                <Email :key="modalMode" :initial-mode="modalMode"
                  webhook-url="https://n8nluxe.luxeveda.com/webhook/e66ef1a8-be19-4944-8a24-ed44b9958adf"
                  @submitted="handleAuthSubmitted" />

              </div>
            </div>
          </div>
        </transition>

        <!-- Limit popup component -->
        <LimitPopup :visible="showLimitPopup" @update:visible="val => showLimitPopup = val"
          @login="() => openModal('login')" @signup="() => openModal('signup')" />
      </main>
    </div>
  </div>
</template>

<script setup>
import axios from 'axios';
import { ref, computed, onMounted, nextTick } from 'vue';
import Email from './Email.vue';
import LimitPopup from './LimitPopup.vue';
import { makeSessionId, saveSessionLocally, readLocalSession, postCreateSession } from './useSession.js';

// n8n endpoints
const CREATE_CHAT_WEBHOOK = 'https://n8nluxe.luxeveda.com/webhook/create_chat';
const SAVE_MESSAGE_WEBHOOK = 'https://n8nluxe.luxeveda.com/webhook/save_message';

// keep same webhook (bot) if you use it
const WEBHOOK_URL = 'https://n8nluxe.luxeveda.com/webhook/ask';

const userInput = ref('');
const chats = ref([]); // [{id, title, messages:[] }]
const activeChatId = ref(null);
const chatBoxRef = ref(null);

// user state: null when anonymous
const user = ref(null);

const anonQuestionCount = ref(0);
const ANON_LIMIT = 4;
const showLimitPopup = ref(false);

// modal state and selected mode
const show = ref(false);
const modalMode = ref('login');

function openModal(mode) {
  modalMode.value = mode === 'signup' ? 'signup' : 'login';
  show.value = true;
  nextTick(() => {
    const input = document.querySelector('.z-10 input') || document.querySelector('.max-w-lg input');
    if (input) input.focus();
  });
}
function closeModal() {
  show.value = false;
}
async function handleAuthSubmitted(payload) {
  const email = payload?.email || payload?.data?.email || '';
  if (!email) { closeModal(); return; }

  // generate a new session id and attach it server-side to the old session
  const oldSession = readLocalSession();
  const newSession = makeSessionId();

  // ask n8n to update the user doc(s) and move chats to newSession (attachSession)
  try {
    await attachSession(oldSession, newSession, email);
  } catch (err) {
    console.error('attachSession error', err);
  }

  // set user locally and persist
  user.value = { email };
  try { localStorage.setItem('luxe_user', JSON.stringify(user.value)); } catch (e) { }

  // save new session locally (overwrites old cookie/localStorage)
  saveSessionLocally(newSession);

  closeModal();
}

function logout() {
  // remove user
  user.value = null;
  localStorage.removeItem('luxe_user');

  // reset chats completely
  chats.value = [];
  activeChatId.value = null;

  // reset anonymous limit counter
  anonQuestionCount.value = 0;

  // clear input
  userInput.value = '';

  // recreate one empty chat for anonymous user UI
  createNewChat();
}

function setActiveChat(id) {
  activeChatId.value = id;
  nextTick(() => scrollToBottom());
}

function findChat(id) {
  return chats.value.find(c => c.id === id);
}

function addMessageToChat(text, who, chatId) {
  const id = chatId || activeChatId.value;
  const chat = findChat(id);
  if (!chat) return;
  chat.messages.push({ text, who, ts: new Date().toISOString() });
  if (who === 'user') {
    chat.title = text.slice(0, 30) || 'New Chat';
  }
  if (id === activeChatId.value) {
    nextTick(() => scrollToBottom());
  }
}

const activeChatMessages = computed(() => {
  const chat = findChat(activeChatId.value);
  return chat ? chat.messages : [];
});

// Helper: read sessionId safely
function getSessionId() {
  try {
    const s = readLocalSession();
    if (s) return s;
    const raw = localStorage.getItem('luxe_sessionId');
    if (raw) return raw;
    const m = document.cookie.match(/(^|;\s*)luxe_sessionId=([^;]+)/);
    return m ? m[2] : null;
  } catch (e) {
    return null;
  }
}

// Helper: user email if logged
function getUserEmail() {
  return user.value?.email || null;
}

// POST create_chat to n8n (fire-and-forget, but logs errors)
async function createChatOnServer(chatObj) {
  try {
    const payload = {
      chatId: chatObj.id,
      title: chatObj.title || 'New Chat',
      sessionId: getSessionId(),
      userEmail: getUserEmail(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await axios.post(CREATE_CHAT_WEBHOOK, payload, { timeout: 5000 });
    // no response-handling required; n8n will insert into mongo
  } catch (err) {
    console.warn('create_chat webhook failed', err);
  }
}

// POST save_message to n8n (appends to messages array)
async function sendSaveMessage(chatId, who, text) {
  try {
    if (!chatId || !text) return;
    const cleanText = text.toString().replace(/\r?\n/g, ' ').trim();
    const payload = {
      chatId,
      who,
      text: cleanText,
      ts: new Date().toISOString(),
      sessionId: getSessionId(),
      userEmail: getUserEmail()
    };
    await axios.post(SAVE_MESSAGE_WEBHOOK, payload, { timeout: 5000 });
  } catch (err) {
    console.warn('save_message webhook failed', err);
  }
}

async function sendMessage() {
  // anonymous usage limit
  if (!user.value) {
    if (anonQuestionCount.value >= ANON_LIMIT) {
      showLimitPopup.value = true;
      return;
    }
    anonQuestionCount.value++;
  }

  const question = userInput.value.trim();
  if (!question || !activeChatId.value) return;
  const sendChatId = activeChatId.value;

  // add local user message immediately
  addMessageToChat(question, 'user', sendChatId);
  userInput.value = '';

  // save user message to server (non-blocking)
  sendSaveMessage(sendChatId, 'user', question).catch(()=>{});

  // Resolve sessionId: prefer readLocalSession() from composable if available,
  // otherwise check localStorage/cookie as a fallback.
  let sessionId = null;
  try {
    if (typeof readLocalSession === 'function') {
      sessionId = readLocalSession();
    } else {
      // fallback to localStorage
      sessionId = localStorage.getItem('luxe_sessionId') || null;
      if (!sessionId) {
        const m = document.cookie.match(/(^|;\s*)luxe_sessionId=([^;]+)/);
        sessionId = m ? m[2] : null;
      }
    }
  } catch (e) {
    sessionId = null;
  }

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, sessionId }) // <-- sessionId included here
    });

    // parse response
    const data = await res.json().catch(() => ({}));
    const answer = (data.answer || data.output || data.data || JSON.stringify(data)).toString();

    addMessageToChat(answer, 'bot', sendChatId);

    // save bot message to server (non-blocking)
    sendSaveMessage(sendChatId, 'bot', answer).catch(()=>{});
  } catch (err) {
    console.error('sendMessage error', err);
    addMessageToChat('Error connecting to server', 'bot', sendChatId);
    sendSaveMessage(sendChatId, 'bot', 'Error connecting to server').catch(()=>{});
  }
}

function scrollToBottom() {
  const el = chatBoxRef.value;
  if (!el) return;
  el.scrollTop = el.scrollHeight;
}

async function createNewChat() {
  const id = Date.now().toString();
  const chatObj = { id, title: 'New Chat', messages: [] };
  chats.value.unshift(chatObj);
  activeChatId.value = id;
  nextTick(() => scrollToBottom());

  // send create_chat webhook to n8n (store in Mongo) - fire-and-forget
  createChatOnServer(chatObj).catch(()=>{});
}

// on mount: create first chat and restore user from localStorage
onMounted(async () => {
  // existing behavior: create first chat and restore user
  createNewChat();

  try {
    const raw = localStorage.getItem('luxe_user');
    if (raw) user.value = JSON.parse(raw);
  } catch (e) { }

  // --- START: session init + server notify ---
  try {
    let sid = readLocalSession();
    if (!sid) {
      sid = makeSessionId();
      saveSessionLocally(sid);
      console.log('[session] created local sid:', sid);
    } else {
      console.log('[session] existing local sid:', sid);
    }

    // Fire-and-forget call to create_session webhook so Mongo stores the anon session.
    // We call it every load if necessary — the server side should handle duplicates gracefully.
    try {
      const resp = await postCreateSession(sid, null, null);
      console.log('[session] create_session response:', resp);
    } catch (err) {
      console.warn('[session] create_session call failed:', err);
    }
  } catch (err) {
    console.error('[session] init error', err);
  }
  // --- END: session init ---
});
</script>

<style>
/* small transition for modal appearance */
.fade-enter-active,
.fade-leave-active {
  transition: opacity .15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
