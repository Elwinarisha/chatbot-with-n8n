<template>
  <div class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
    <div class="bg-black rounded-xl shadow-2xl p-8 w-full max-w-md">

      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-[#19a8ff]">Login / Sign Up</h2>
        <button @click="$emit('close-email')" class="text-gray-400 hover:text-gray-700 cursor-pointer">✕</button>
      </div>

      <form v-if="step === 1" @submit.prevent="sendOtp">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-200 mb-1">Email</label>
          <input type="email" v-model="email" required
            class="w-full px-4 py-2 border border-[#19a8ff] focus:outline-none rounded-lg text-white" />
        </div>

        <button type="submit" class=" px-4 py-2 bg-[#19a8ff] text-white font-semibold rounded-lg cursor-pointer">
          {{ isLoading ? 'Sending OTP...' : 'Send OTP' }}
        </button>

        <p v-if="errorMessage" class="mt-4 text-sm text-red-600 text-center">
          {{ errorMessage }}
        </p>
      </form>


      <form v-else @submit.prevent="verifyOtp">
        <p class="text-sm mb-3 text-gray-300">OTP sent to <b>{{ email }}</b></p>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-200 mb-1">Enter OTP</label>
          <!-- <input type="text" v-model="otp" required maxlength="6" class="w-full px-4 py-2 border border-[#19a8ff] focus:outline-none rounded-lg text-white" /> -->
          <div class="flex items-center justify-between mb-4 mt-4">
            <input v-for="i in 6" :key="i" ref="otpInputs" type="text" maxlength="1"
              class="w-10 h-10 text-center text-lg border border-[#19a8ff] focus:outline-none rounded-lg bg-black text-white"
              @input="handleOtpInput(i - 1, $event)" @keydown.backspace="handleBackspace(i - 1)" />
          </div>
        </div>
        <button type="submit" class="px-4 py-2 bg-[#19a8ff] text-white font-semibold rounded-lg cursor-pointer">
          {{ isLoading ? 'Verifying...' : 'Verify OTP' }}
        </button>

        <!-- <button @click="step = 1" class="mt-4 text-sm text-indigo-600">Change Email</button> -->

        <p v-if="errorMessage" class="mt-4 text-sm text-red-600 text-center">
          {{ errorMessage }}
        </p>
      </form>

    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import axios from "axios";

const BACKEND_URL = "http://localhost:3001/api";

const emit = defineEmits(["auth-success", "close-email"]);

const step = ref(1);
const email = ref("");
const otp = ref("");
const isLoading = ref(false);
const errorMessage = ref("");
const otpInputs = ref([]);

async function sendOtp() {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    await axios.post(`${BACKEND_URL}/send-otp`, { email: email.value });
    step.value = 2;
  } catch (err) {
    errorMessage.value = err.response?.data?.message || "Failed to send OTP";
  }

  isLoading.value = false;
}

async function verifyOtp() {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const resp = await axios.post(`${BACKEND_URL}/verify-otp`, {
      email: email.value,
      otp: otp.value,
    });

    localStorage.setItem("token", resp.data.token);
    localStorage.setItem("email", resp.data.email);
    localStorage.setItem("sessionId", resp.data.sessionId);

    emit("auth-success", resp.data);
  } catch (err) {
    errorMessage.value = err.response?.data?.message || "Invalid OTP";
  }

  isLoading.value = false;
}
function handleOtpInput(index, event) {
  const value = event.target.value;

  // Move to next box automatically
  if (value && index < 5) {
    otpInputs.value[index + 1].focus();
  }

  // Build OTP string from all boxes
  otp.value = otpInputs.value.map(i => i.value).join("");
}

function handleBackspace(index) {
  // Move to previous box on backspace
  if (index > 0 && !otpInputs.value[index].value) {
    otpInputs.value[index - 1].focus();
  }

  otp.value = otpInputs.value.map(i => i.value).join("");
}

</script>
