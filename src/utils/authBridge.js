import { registerPlugin } from '@capacitor/core';

const AuthBridge = registerPlugin('AuthBridge');

/** Call after successful login (Supabase/Google) */
export async function onLoginSuccess() {
  if (window.Capacitor?.isNativePlatform()) {
    await AuthBridge.notifyLoggedIn();
  }
}

/** Call on logout */
export async function onLogout() {
  if (window.Capacitor?.isNativePlatform()) {
    await AuthBridge.notifyLoggedOut();
  }
}

/** Returns true if native layer already has auth saved → skip login screen */
export async function checkNativeAuth() {
  if (!window.Capacitor?.isNativePlatform()) return false;
  const { value } = await AuthBridge.isLoggedIn();
  return value;
}
