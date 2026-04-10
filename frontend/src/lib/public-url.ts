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

const isLocalHost = (host: string): boolean =>
  LOCAL_HOSTS.has(host.trim().toLowerCase());

const normalizeAssetPath = (path: string): string =>
  path.startsWith("/") ? path : `/${path}`;

const buildPathVariants = (path: string): string[] => {
  const normalizedPath = normalizeAssetPath(path);
  const variants = [normalizedPath];

  if (normalizedPath.startsWith("/uploads/")) {
    variants.unshift(`/api/v1${normalizedPath}`);
  }

  return uniqueUrls(variants);
};

const uniqueUrls = (urls: string[]): string[] => {
  return Array.from(new Set(urls.filter(Boolean)));
};

const buildImageExtensionVariants = (path: string): string[] => {
  const basePath = stripQueryHash(path);
  const suffix = path.slice(basePath.length);

  if (/\.jpg$/i.test(basePath)) {
    return uniqueUrls([
      `${basePath}${suffix}`,
      `${basePath.replace(/\.jpg$/i, ".jpeg")}${suffix}`,
      `${basePath.replace(/\.jpg$/i, ".png")}${suffix}`,
    ]);
  }

  if (/\.jpeg$/i.test(basePath)) {
    return uniqueUrls([
      `${basePath}${suffix}`,
      `${basePath.replace(/\.jpeg$/i, ".jpg")}${suffix}`,
      `${basePath.replace(/\.jpeg$/i, ".png")}${suffix}`,
    ]);
  }

  if (/\.png$/i.test(basePath)) {
    return uniqueUrls([
      `${basePath}${suffix}`,
      `${basePath.replace(/\.png$/i, ".jpg")}${suffix}`,
      `${basePath.replace(/\.png$/i, ".jpeg")}${suffix}`,
    ]);
  }

  return [path];
};

const buildOriginCandidates = (): string[] => {
  const apiOrigin = getApiOrigin();

  if (typeof window === "undefined") {
    return apiOrigin ? [apiOrigin] : [];
  }

  const currentOrigin = window.location.origin;
  const currentHost = window.location.hostname;
  const isLocalFrontend = isLocalHost(currentHost);

  if (isLocalFrontend) {
    return uniqueUrls([apiOrigin, currentOrigin]);
  }

  if (!apiOrigin) {
    return [currentOrigin];
  }

  let apiHost = "";
  try {
    apiHost = new URL(apiOrigin).hostname;
  } catch {
    return [currentOrigin];
  }

  if (isLocalHost(apiHost)) {
    return [currentOrigin];
  }

  // In production, prefer explicit API origin first for uploaded assets.
  return uniqueUrls([apiOrigin, currentOrigin]);
};

const stripQueryHash = (url: string): string => url.split(/[?#]/)[0];

const buildRelativeAssetCandidates = (path: string): string[] => {
  const normalizedPath = normalizeAssetPath(path);
  const origins = buildOriginCandidates();
  const candidates = buildImageExtensionVariants(normalizedPath).flatMap(
    (imagePath) =>
      buildPathVariants(imagePath).flatMap((candidatePath) => [
        ...origins.map((origin) => `${origin}${candidatePath}`),
        candidatePath,
      ]),
  );

  return uniqueUrls(candidates);
};

export function resolvePublicAssetCandidates(path?: string | null): string[] {
  if (!path) {
    return [];
  }

  if (/^https?:\/\//i.test(path)) {
    const absoluteCandidates = buildImageExtensionVariants(path);
    try {
      const parsed = new URL(path);
      if (parsed.pathname.startsWith("/uploads/")) {
        const fromPathCandidates = buildRelativeAssetCandidates(
          `${parsed.pathname}${parsed.search || ""}`,
        );
        return uniqueUrls([...fromPathCandidates, ...absoluteCandidates]);
      }
    } catch {
      // Keep absolute fallback candidates only.
    }

    return uniqueUrls(absoluteCandidates);
  }

  return buildRelativeAssetCandidates(path);
}

export function resolvePublicAssetUrl(path?: string | null): string {
  return resolvePublicAssetCandidates(path)[0] || "";
}

export function resolveAlternateImageAssetUrl(
  path?: string | null,
  currentSrc?: string | null,
): string {
  const candidates = resolvePublicAssetCandidates(path);
  if (candidates.length <= 1) {
    return "";
  }

  if (!currentSrc) {
    return candidates[1] || "";
  }

  const normalizedCurrentSrc = stripQueryHash(currentSrc);
  const currentIndex = candidates.findIndex(
    (candidate) => stripQueryHash(candidate) === normalizedCurrentSrc,
  );

  if (currentIndex === -1) {
    return candidates[1] || "";
  }

  return candidates[currentIndex + 1] || "";
}
