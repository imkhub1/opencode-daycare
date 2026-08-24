"use client";

const LOGOUT_HISTORY_KEY = "opendaycare:logged-out";

export function clearLogoutHistoryMarker() {
  window.sessionStorage.removeItem(LOGOUT_HISTORY_KEY);
}

export function markLogoutHistory() {
  window.sessionStorage.setItem(LOGOUT_HISTORY_KEY, "1");
}
