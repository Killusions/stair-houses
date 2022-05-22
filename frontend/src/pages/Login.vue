<script setup lang="ts">
  import { useRouter, useRoute } from 'vue-router';
  import {
    authFailure,
    change,
    checkHasSetCode,
    checkSessionAsync,
    clearSetCode,
    emailLogIn,
    getUserInfo,
    hasSession,
    hasUserSession,
    logIn,
    register,
    reset,
    set,
    verify,
  } from '../data';
  import { onUnmounted, ref } from 'vue';
  import moment from 'moment';
  import Captcha from '../components/Captcha.vue';
  import { EMAIL_ENDING, EMAIL_REGEX } from '../../../backend/src/constants';
  import { base64Decode } from '../helpers';
  import {
    loggedIn,
    resetSettings,
    resetState,
    userSet,
    userConfirmed,
    userLoggedIn,
    resetFilters,
  } from '../settings';

  enum LoginType {
    logIn,
    emailLogIn,
    register,
    confirm,
    change,
    set,
    setAgain,
    none,
  }

  const route = useRoute();

  const queryIsRegister = !!route.query.register;

  const type = ref(
    loggedIn.value
      ? userLoggedIn.value
        ? userSet.value
          ? LoginType.change
          : LoginType.set
        : LoginType.none
      : queryIsRegister
      ? LoginType.register
      : LoginType.logIn
  );

  const captchaSitekey =
    import.meta.env.VITE_STAIR_HOUSES_CAPTCHA_SITEKEY?.toString() ?? '';

  const router = useRouter();

  const email = ref('');
  const password = ref('');
  const newPassword = ref('');
  const previousName = ref('');
  const name = ref('');

  const message = ref('');
  const emailMessage = ref('');
  const passwordMessage = ref('');
  const newPasswordMessage = ref('');
  const captchaMessage = ref('');
  const nameMessage = ref('');

  const clearMessages = () => {
    message.value = '';
    emailMessage.value = '';
    passwordMessage.value = '';
    newPasswordMessage.value = '';
    captchaMessage.value = '';
    nameMessage.value = '';
  };

  const showCaptcha = ref(false);

  const buttonDisabled = ref(false);

  let captchaToken = '';

  onUnmounted(() => {
    if (type.value === LoginType.setAgain) {
      clearSetCode();
    }
  });

  const setFieldsWithPrevious = async (correctType: LoginType) => {
    if (type.value === correctType) {
      const userInfo = await getUserInfo();
      if (userInfo && type.value === correctType) {
        if (!name.value && userInfo.name) {
          name.value = userInfo.name;
          previousName.value = userInfo.name;
        }
      }
    }
  };

  (async () => {
    try {
      if (
        (await checkSessionAsync(false, true)) &&
        (type.value !== LoginType.set || (await checkHasSetCode()))
      ) {
        await setFieldsWithPrevious(LoginType.change);
      }
    } catch (e: unknown) {
      console.error(e);
      throw e;
    }
  })();

  authFailure.subscribe(() => {
    resetState();
    resetSettings();
    resetFilters();
    type.value = LoginType.logIn;
    buttonDisabled.value = false;
    message.value = 'Your session expired, please log in again.';
  });

  const queryUserId =
    route.query.id && typeof route.query.id === 'string' ? route.query.id : '';
  const queryCode =
    route.query.code && typeof route.query.code === 'string'
      ? base64Decode(route.query.code)
      : '';

  if (queryUserId && queryCode) {
    type.value = LoginType.confirm;
    message.value = queryIsRegister
      ? 'Are you sure you want to verify your email address?'
      : 'Are you sure you want to log in using your email address?';
  }

  const confirmAction = async () => {
    try {
      clearMessages();
      buttonDisabled.value = true;
      const result = await verify(queryUserId, queryCode);
      buttonDisabled.value = false;
      if (result.success) {
        loggedIn.value = true;
        router.replace({ query: {} });
        resetState();
        if (result.admin) {
          router.push('/admin');
        } else {
          if (queryIsRegister || !userSet.value) {
            type.value = LoginType.set;
          } else {
            type.value = LoginType.setAgain;
            await setFieldsWithPrevious(LoginType.setAgain);
          }
        }
      } else {
        message.value =
          'Could not ' +
          (queryIsRegister ? 'verify' : 'log in using') +
          ' your email address, please try again in a bit.';
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const setAction = async () => {
    try {
      clearMessages();
      let fail = false;
      if (!newPassword.value) {
        newPasswordMessage.value = 'The password cannot be empty';
        fail = true;
      }
      if (!name.value) {
        nameMessage.value = 'The name cannot be empty';
        fail = true;
      }
      if (fail) {
        return;
      }
      clearMessages();
      buttonDisabled.value = true;
      const result = await set(newPassword.value, name.value);
      buttonDisabled.value = false;
      resetState();
      if (result) {
        if (userConfirmed.value) {
          router.push('/user');
        } else {
          router.push('/stateinfo');
        }
      } else if (userLoggedIn.value) {
        message.value = 'Could not set values, please try again in a bit.';
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const resetAction = async () => {
    try {
      clearMessages();
      if (
        !newPassword.value &&
        (!name.value || name.value === previousName.value)
      ) {
        message.value =
          'New password and name cannot both be empty or the same as before';
        return;
      }
      clearMessages();
      buttonDisabled.value = true;
      const result = await reset(
        newPassword.value,
        name.value === previousName.value ? undefined : name.value
      );
      previousName.value = name.value;
      buttonDisabled.value = false;
      resetState();
      if (result) {
        if (userConfirmed.value) {
          router.push('/user');
        } else {
          router.push('/stateinfo');
        }
      } else {
        message.value = 'Could not set value, please try again in a bit.';
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const changeAction = async () => {
    try {
      clearMessages();
      let fail = false;
      if (!password.value) {
        passwordMessage.value = 'Password cannot be empty';
        fail = true;
      }
      if (
        !newPassword.value &&
        (!name.value || name.value === previousName.value)
      ) {
        message.value =
          'New password and name cannot both be empty or the same as before';
        fail = true;
      }
      if (fail) {
        return;
      }
      clearMessages();
      buttonDisabled.value = true;
      const result = await change(
        password.value,
        newPassword.value,
        name.value === previousName.value ? undefined : name.value
      );
      previousName.value = name.value;
      buttonDisabled.value = false;
      resetState();
      if (result) {
        if (userConfirmed.value) {
          router.push('/user');
        } else {
          router.push('/stateinfo');
        }
      } else {
        message.value = 'Incorrect password';
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const emailLogInAction = async (isRegister = false) => {
    try {
      clearMessages();
      let fail = false;
      if (
        !email.value ||
        !email.value.endsWith(EMAIL_ENDING) ||
        !email.value.match(EMAIL_REGEX)
      ) {
        emailMessage.value = 'E-Mail needs to be a valid address';
        fail = true;
      }
      if (showCaptcha.value && captchaSitekey && !captchaToken) {
        captchaMessage.value = 'Captcha invalid';
        fail = true;
      }
      if (fail) {
        return;
      }
      clearMessages();
      buttonDisabled.value = true;
      const result = isRegister
        ? await register(
            email.value,
            showCaptcha.value && captchaSitekey ? captchaToken : undefined
          )
        : await emailLogIn(
            email.value,
            showCaptcha.value && captchaSitekey ? captchaToken : undefined
          );
      buttonDisabled.value = false;
      captchaExpired();
      if (result.success) {
        message.value =
          (isRegister ? 'Verification' : 'Log-in') +
          ' E-Mail sent, please also check your spam folder';
      } else {
        const difference = result.nextTry.getTime() - Date.now();
        emailMessage.value =
          (isRegister
            ? 'Duplicate E-Mail address (maybe log in instead?)'
            : 'Incorrect E-Mail address') +
          (difference > 0
            ? ': try again in ' + moment.duration(difference).humanize()
            : '');
        showCaptcha.value = result.showCaptcha;
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const logInAction = async () => {
    try {
      clearMessages();
      let fail = false;
      if (!password.value) {
        passwordMessage.value = 'Password cannot be empty';
        fail = true;
      }
      if (
        email.value &&
        (!email.value.match(EMAIL_REGEX) || !email.value.endsWith(EMAIL_ENDING))
      ) {
        emailMessage.value =
          'E-Mail needs to either be a valid student address or empty';
        fail = true;
      }
      if (showCaptcha.value && captchaSitekey && !captchaToken) {
        captchaMessage.value = 'Captcha invalid';
        fail = true;
      }
      if (fail) {
        return;
      }
      clearMessages();
      buttonDisabled.value = true;
      const result = await logIn(
        password.value,
        email.value || undefined,
        showCaptcha.value && captchaSitekey ? captchaToken : undefined
      );
      buttonDisabled.value = false;
      captchaExpired();
      resetState();
      if (result.success) {
        loggedIn.value = true;
        if (result.admin) {
          router.push('/admin');
        } else {
          if (userConfirmed.value) {
            router.push('/user');
          } else {
            router.push('/stateinfo');
          }
        }
      } else {
        const difference = result.nextTry.getTime() - Date.now();
        passwordMessage.value =
          'Incorrect password' +
          (difference > 0
            ? ': try again in ' + moment.duration(difference).humanize()
            : '');
        showCaptcha.value = result.showCaptcha;
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const triggerAction = async () => {
    switch (type.value) {
      case LoginType.logIn:
        logInAction();
        break;
      case LoginType.emailLogIn:
        emailLogInAction();
        break;
      case LoginType.register:
        emailLogInAction(true);
        break;
      case LoginType.change:
        changeAction();
        break;
      case LoginType.setAgain:
        resetAction();
        break;
      case LoginType.set:
        setAction();
        break;
      case LoginType.confirm:
        confirmAction();
        break;
      case LoginType.none:
        if (hasSession()) {
          if (hasUserSession()) {
            router.push('/user');
          } else {
            router.push('/admin');
          }
        } else {
          router.push('/');
        }
        break;
    }
  };

  const captchaVerfiy = (token: string) => {
    captchaToken = token;
  };

  const captchaExpired = () => {
    captchaToken = '';
  };
</script>

<template>
  <div class="content-base login">
    <label v-if="message" class="label general-label login-item">{{
      message
    }}</label>
    <template
      v-if="
        type === LoginType.logIn ||
        type === LoginType.emailLogIn ||
        type === LoginType.register
      "
    >
      <label class="label email-label login-item" for="email"
        >Please enter your student E-Mail address{{
          emailMessage ? ': ' + emailMessage : ''
        }}<template v-if="type === LoginType.emailLogIn">
          <br />
          <div
            class="label-button"
            tabindex="0"
            @click="
              clearMessages();
              type = LoginType.logIn;
            "
            @keyup.enter="
              clearMessages();
              type = LoginType.logIn;
            "
          >
            Log in with password instead
          </div>
        </template></label
      >
      <input
        id="email"
        v-model="email"
        type="email"
        class="field email login-item"
        name="email"
        :placeholder="
          'x.y@stud.hslu.ch' + (type === LoginType.logIn ? ' (optional)' : '')
        "
        maxlength="200"
        @keyup.enter="triggerAction()"
      />
    </template>
    <template v-if="type === LoginType.logIn || type === LoginType.change">
      <label class="label password-label login-item" for="password"
        >Please enter your password{{
          passwordMessage ? ': ' + passwordMessage : ''
        }}<br />
        <div
          class="label-button"
          tabindex="0"
          @click="
            clearMessages();
            type = LoginType.emailLogIn;
          "
          @keyup.enter="
            clearMessages();
            type = LoginType.emailLogIn;
          "
        >
          Log in without password (E-Mail) instead / reset password
        </div></label
      >
      <input
        id="password"
        v-model="password"
        type="password"
        class="field password login-item"
        name="password"
        placeholder="password"
        maxlength="20"
        autocomplete="current-password"
        @keyup.enter="triggerAction()"
      />
    </template>
    <label
      v-if="type === LoginType.setAgain"
      class="label change-label login-item"
      ><router-link
        :to="userConfirmed ? '/user' : 'stateinfo'"
        class="label-button label-button-solo"
      >
        Don't want to change anything? Go to the user page instead.
      </router-link></label
    >
    <template
      v-if="
        type === LoginType.set ||
        type === LoginType.setAgain ||
        type === LoginType.change
      "
    >
      <label class="label new-password-label login-item" for="new-password"
        >Please{{ type === LoginType.set ? '' : ' (optionally)' }} enter a new
        password{{ newPasswordMessage ? ': ' + newPasswordMessage : '' }}
      </label>
      <input
        id="new-password"
        v-model="newPassword"
        type="password"
        class="field new-password login-item"
        name="new-password"
        placeholder="new password"
        maxlength="20"
        autocomplete="new-password"
        @keyup.enter="triggerAction()"
      />
    </template>
    <template v-if="type === LoginType.set">
      <label class="label name-label login-item" for="name"
        >Please enter your name{{ nameMessage ? ': ' + nameMessage : '' }}
      </label>
      <input
        id="name"
        v-model="name"
        type="text"
        class="field name login-item"
        name="name"
        placeholder="John Doe"
        maxlength="200"
        autocomplete="name"
        @keyup.enter="triggerAction()"
      />
    </template>
    <label v-if="captchaMessage" class="label captcha-label login-item">{{
      captchaMessage
    }}</label>
    <Captcha
      v-if="showCaptcha && captchaSitekey"
      :sitekey="captchaSitekey"
      @verify="captchaVerfiy($event)"
      @expired="captchaExpired()"
    ></Captcha>
    <button
      class="login-item login-button"
      @keyup.enter="triggerAction()"
      @click="triggerAction()"
    >
      {{
        type === LoginType.logIn
          ? 'Log in'
          : type === LoginType.emailLogIn
          ? 'Send'
          : type === LoginType.register
          ? 'Register'
          : type === LoginType.set
          ? 'Set'
          : type === LoginType.confirm
          ? 'Confirm'
          : type === LoginType.none
          ? 'Back'
          : 'Change'
      }}
    </button>
    <label
      v-if="type === LoginType.logIn || type === LoginType.emailLogIn"
      class="label change-label login-item"
      ><div
        class="label-button label-button-solo"
        tabindex="0"
        @click="
          clearMessages();
          type = LoginType.register;
        "
        @keyup.enter="
          clearMessages();
          type = LoginType.register;
        "
      >
        No account yet? Register here
      </div></label
    >
    <label
      v-if="type === LoginType.register"
      class="label change-label login-item"
      ><div
        class="label-button label-button-solo"
        tabindex="0"
        :disabled="buttonDisabled"
        @click="
          clearMessages();
          type = LoginType.logIn;
        "
        @keyup.enter="
          clearMessages();
          type = LoginType.logIn;
        "
      >
        Already registered? Log in here
      </div></label
    >
  </div>
</template>

<style scoped lang="scss">
  .login {
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow-y: auto;

    .login-item {
      margin: 0.5rem;
    }

    .label {
      font-size: 1.2rem;
      line-height: 1.2rem;
      padding: 0;
      text-align: center;
      font-weight: bold;

      .label-button {
        font-size: 1.1rem;
        font-weight: normal;
        line-height: 1.2rem;
        color: rgb(226, 226, 226);
        text-decoration: underline;
        padding: 0;
        margin: 0;
        margin-top: 0.5rem;
        cursor: pointer;

        &.label-button-solo {
          margin: 0;
        }
      }
    }
  }

  .field {
    font-family: Arial, Helvetica, sans-serif;
    height: 1rem;
    font-size: 1rem;
    line-height: 1rem;
    width: 90%;
    max-width: 40vh;
    max-width: calc((40 * (100vh - var(--vh-offset, 0px)) / 100));
    padding: 0.25rem;
    border: solid 0.1rem rgb(179, 179, 179);
    border-radius: 1rem;
    box-shadow: 0 0.125rem 0.125rem rgba(0, 0, 0, 0.3);
  }

  .login-button {
    color: #000000;
    height: 1.9rem;
    font-size: 1rem;
    line-height: 1rem;
    width: 30%;
    max-width: 12vh;
    max-width: calc((12 * (100vh - var(--vh-offset, 0px)) / 100));
    min-width: 10vw;
    font-weight: bold;
    padding: 0.35rem;
    background-color: #ffffff;
    border: solid 0.05rem rgb(179, 179, 179);
    border-radius: 1rem;
    box-shadow: 0 0.125rem 0.125rem rgba(0, 0, 0, 0.3);
  }
</style>
