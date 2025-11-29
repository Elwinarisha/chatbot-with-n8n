<template>
    <div class="w-full max-w-md">
        <h3 class="text-3xl font-medium mb-4 text-center">Login or Sign up</h3>

        <form @submit.prevent="submit" class="space-y-3">
            <label class="block text-sm">Email</label>
            <input v-model="email" type="email" placeholder="you@domain.com"
                class="w-full px-3 py-2 border rounded-md bg-transparent outline-none focus:ring-2 focus:ring-blue-400"
                autocomplete="email" />

            <p v-if="emailError" class="text-xs text-rose-500">{{ emailError }}</p>

            <div class="flex items-center gap-3">
                <button type="submit"
                    class="flex-1 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition">
                    {{ submitText }}
                </button>

                <button type="button" @click="toggleMode"
                    class="px-3 py-2 rounded-md bg-gray-100/10 text-sm hover:bg-gray-100/20">
                    {{ toggleText }}
                </button>
            </div>
        </form>

        <p v-if="message" :class="['mt-3 text-sm', messageType === 'error' ? 'text-rose-500' : 'text-green-400']">
            {{ message }}
        </p>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
    initialMode: { type: String, default: 'login' }, // 'login' | 'signup'
    webhookUrl: { type: String, default: '' }        // pass your n8n webhook here
});
const emit = defineEmits(['submitted', 'error']);

const email = ref('');
const emailError = ref('');
const mode = ref(props.initialMode);
const message = ref('');
const messageType = ref('');
const loading = ref(false);

watch(() => props.initialMode, (v) => {
    if (v === 'login' || v === 'signup') mode.value = v;
});

const modeTitle = computed(() => (mode.value === 'login' ? 'Login' : 'Sign Up'));
const submitText = computed(() => (mode.value === 'login' ? 'Login' : 'Create Account'));
const toggleText = computed(() => (mode.value === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Login'));

function validateEmail(value) {
    if (!value) return 'Email is required.';
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(value) ? '' : 'Enter a valid email.';
}

function toggleMode() {
    mode.value = mode.value === 'login' ? 'signup' : 'login';
    emailError.value = '';
    message.value = '';
}

async function submit() {
    emailError.value = validateEmail(email.value.trim());
    if (emailError.value) return;

    // --------------------------
    // Build payload
    // --------------------------
    const payload = {
        mode: mode.value,
        email: email.value.trim()
    };

    // Attach sessionId if available
    try {
        const sid =
            localStorage.getItem('luxe_sessionId') ||
            (document.cookie.match(/(^|;\s*)luxe_sessionId=([^;]+)/) || [])[2] ||
            null;

        if (sid) payload.sessionId = sid;
    } catch (e) {
        console.warn('[auth] Could not read sessionId');
    }

    // If no webhook URL provided (dev mode)
    if (!props.webhookUrl) {
        emit('submitted', payload);
        message.value = mode.value === 'login' ? 'Login submitted.' : 'Signup submitted.';
        messageType.value = 'success';
        return;
    }

    loading.value = true;
    message.value = '';
    messageType.value = '';

    // --------------------------
    // Diagnostic FETCH
    // --------------------------
    try {
        console.log('[auth] webhookUrl:', props.webhookUrl);
        console.log('[auth] payload:', payload);

        const res = await fetch(props.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log('[auth] fetch completed - status:', res.status, res.statusText);

        // read raw text for debugging
        const rawText = await res.text().catch(() => null);
        console.log('[auth] response raw text:', rawText);

        if (!res.ok) {
            throw new Error(`Server returned ${res.status} ${res.statusText}. Body: ${rawText}`);
        }

        // Parse JSON if possible
        let data = {};
        try {
            data = rawText ? JSON.parse(rawText) : {};
        } catch (_) {
            data = {};
        }

        // Return to parent
        const returned = { ...(data || {}), email: (data?.email || payload.email) };
        emit('submitted', returned);

        message.value = 'Success — check header.';
        messageType.value = 'success';
    } catch (err) {
        console.error('[auth] submit error:', err);
        message.value = 'Failed to communicate with server — see console';
        messageType.value = 'error';
        emit('error', { error: String(err) });
    } finally {
        loading.value = false;
    }
}
</script>
