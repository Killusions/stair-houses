<script setup lang="ts">
  import { useRoute, useRouter } from 'vue-router';
  import {
    authFailure,
    checkSessionAsync,
    hasConfirmedUserSession,
    hasSetUserSession,
    hasUserSession,
    redeemPath,
  } from '../data';
  import { resetFilters, resetSettings, resetState } from '../settings';
  import QrScanner from 'qr-scanner';
  import { ref, watch } from 'vue';
  const router = useRouter();

  authFailure.subscribe(() => {
    resetState();
    resetSettings();
    resetFilters();
    router.push('/login');
  });

  const route = useRoute();

  // fetch the user information when params change
  watch(
    () => route.params.code,
    (code) => {
      if (
        typeof code === 'string' &&
        code.length === 20 &&
        code.match(/^[a-zA-Z0-9]+$/)
      ) {
        console.log(code);
      }
    }
  );

  const qrScannerElement = ref<HTMLVideoElement>();
  let qrScanner: QrScanner;
  const scanning = ref(false);
  const devices = ref<MediaDeviceInfo[]>();
  const currentDevice = ref<string>();
  let skipNextEvent = false;

  const toggleScanning = () => {
    if (qrScanner) {
      if (scanning.value) {
        qrScanner.stop();
      } else {
        qrScanner.start();
        if (
          !devices.value?.length &&
          navigator.mediaDevices?.enumerateDevices
        ) {
          (async () => {
            try {
              devices.value = (
                await navigator.mediaDevices.enumerateDevices()
              ).filter((item) => item.deviceId && item.kind === 'videoinput');
              if (devices.value?.length) {
                currentDevice.value = devices.value[0].deviceId;
                skipNextEvent = true;
              }
            } catch (e: unknown) {
              console.error(e);
              throw e;
            }
          })();
        }
      }
      scanning.value = !scanning.value;
    }
  };

  const addQrScanner = (element: HTMLVideoElement) => {
    qrScanner = new QrScanner(element, (result: string) => {
      if (result.startsWith(redeemPath)) {
        const code = result.replace(redeemPath, '');
        if (code.length === 20 && code.match(/^[a-zA-Z0-9]+$/))
          console.log('decoded qr code:', code);
        if (scanning.value) {
          toggleScanning();
        }
      }
    });
  };

  watch(currentDevice, (id) => {
    if (skipNextEvent) {
      skipNextEvent = false;
    } else if (qrScanner && scanning.value && id) {
      qrScanner.setCamera(id);
    }
  });

  if (!hasUserSession()) {
    router.push('/admin');
  } else if (!hasSetUserSession()) {
    router.push('/login');
  } else if (!hasConfirmedUserSession()) {
    router.push('/login');
  } else {
    (async () => {
      try {
        if (await checkSessionAsync(false, true)) {
          if (qrScannerElement.value) {
            addQrScanner(qrScannerElement.value);
          } else {
            const stopWatching = watch(qrScannerElement, (element) => {
              if (element) {
                addQrScanner(element);
                stopWatching();
              }
            });
          }
        }
      } catch (e: unknown) {
        console.error(e);
        throw e;
      }
    })();
  }
</script>

<template>
  <div class="content-base redeem">
    <div class="redeemtitle">Redeem</div>
    <video ref="qrScannerElement"></video>
    <button @click="toggleScanning()">
      {{ scanning ? 'Stop Scanning' : 'Start Scanning' }}
    </button>
    <select v-if="scanning && devices?.length" v-model="currentDevice">
      <option
        v-for="device in devices"
        :key="device.deviceId"
        :value="device.deviceId"
        :selected="device.deviceId === currentDevice"
      >
        {{ device.label }}
      </option>
    </select>
  </div>
</template>

<style scoped lang="scss">
  .redeem {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 2rem;

    .redeemtitle {
      display: flex;
      flex-direction: row;
      align-items: center;

      .icon {
        font-size: 1.5rem;
        cursor: pointer;
      }
    }
  }
</style>
