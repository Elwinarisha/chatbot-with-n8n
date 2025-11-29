<template>
  <transition name="fade">
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center"
      @click.self="close"
      role="dialog"
      aria-modal="true"
      aria-label="Limit reached"
    >
      <!-- backdrop -->
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

      <!-- panel -->
      <div class="relative z-10 w-full max-w-sm mx-4">
        <div class="bg-[#0b0f1a] text-white border border-white/10 rounded-xl shadow-xl p-6">
          <div class="flex items-start justify-between mb-3">
            <h3 class="text-lg font-semibold">Limit Reached</h3>
            <button @click="close" class="text-white/60 hover:text-white" aria-label="Close">✕</button>
          </div>

          <p class="text-sm text-white/70 mb-5 text-center">
            You've reached the free limit for anonymous use. Please login to continue chatting.
          </p>

          <div class="flex items-center justify-center gap-3">
            <button
              @click="onLogin"
              class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              Login
            </button>

            <button
              @click="onSignup"
              class="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm"
            >
              Signup
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { defineEmits, defineProps } from 'vue';

const props = defineProps({
  visible: { type: Boolean, default: false }
});

const emit = defineEmits(['update:visible', 'login', 'signup']);

function close() {
  emit('update:visible', false);
}

function onLogin() {
  emit('update:visible', false);
  emit('login');
}

function onSignup() {
  emit('update:visible', false);
  emit('signup');
}
</script>

<style>
.fade-enter-active, .fade-leave-active { transition: opacity .15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
