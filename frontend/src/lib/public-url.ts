const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

export function getApiOrigin(): string {
  const envApiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  if (!envApiUrl) {
    return "";
  }

  try {
    return new URL(envApiUrl).origin;
  } catch {
    return "";
  }
}

export function resolvePublicAssetUrl(path?: string | null): string {
  if (!path) {
    return "";
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (!LOCAL_HOSTS.has(host)) {
      return `${window.location.origin}${normalizedPath}`;
    }
  }

  const apiOrigin = getApiOrigin();
  if (apiOrigin) {
    return `${apiOrigin}${normalizedPath}`;
  }

  return normalizedPath;
}

export function resolveAlternateImageAssetUrl(path?: string | null): string {
  if (!path) {
    return "";
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (/\.jpe?g$/i.test(normalizedPath)) {
    const swappedPath = normalizedPath.endsWith(".jpg")
      ? normalizedPath.replace(/\.jpg$/i, ".jpeg")
      : normalizedPath.replace(/\.jpeg$/i, ".jpg");

    return resolvePublicAssetUrl(swappedPath);
  }

  return "";
}
