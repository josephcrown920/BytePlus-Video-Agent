function findAccessToken(value: unknown, depth = 0): string | null {
  if (!value || typeof value !== "object" || depth > 3) return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.access_token === "string" &&
    record.access_token.split(".").length === 3
  ) {
    return record.access_token;
  }
  for (const nested of Object.values(record)) {
    const token = findAccessToken(nested, depth + 1);
    if (token) return token;
  }
  return null;
}

export function getSharedSupabaseAccessToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key || !key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
    try {
      const token = findAccessToken(JSON.parse(localStorage.getItem(key) ?? "null"));
      if (token) return token;
    } catch {
      // Ignore unrelated or partially-written local storage entries.
    }
  }
  return null;
}