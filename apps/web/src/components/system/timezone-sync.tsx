"use client";

import { useEffect } from "react";

const CACHE_KEY = "harmonizing:last-timezone-sync";

export function TimezoneSync() {
  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timezone) return;

    const previous = window.localStorage.getItem(CACHE_KEY);
    if (previous === timezone) return;

    void fetch("/api/viewer/timezone", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone }),
    }).then((response) => {
      if (response.ok) {
        window.localStorage.setItem(CACHE_KEY, timezone);
      }
    });
  }, []);

  return null;
}

