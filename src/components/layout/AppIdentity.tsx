import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { useColors } from '../../theme/ColorTokensContext';
import { tokens } from '../../theme/tokens';

function requestQdn(options: {
  action: string;
  [key: string]: unknown;
}): Promise<unknown> {
  if (typeof qdnRequest !== 'function') {
    return Promise.reject(new Error('qdnRequest unavailable'));
  }
  return qdnRequest(options);
}

// Resolves the QDN name this app is actually published under, so a fork
// republished under another name automatically shows its own identity.
// In http render mode the name is the path segment after the service
// (/render/APP/<name>/...). Desktop archive mode renders from a file:// URL
// that carries no name, so the build-time fallback still applies there.
export function getOwnQdnName(fallback: string): string {
  const match = window.location.pathname.match(
    /^\/render\/(?:APP|WEBSITE)\/([^/]+)/i
  );
  if (!match) return fallback;
  try {
    const name = decodeURIComponent(match[1]);
    return name || fallback;
  } catch {
    return fallback;
  }
}

const avatarCache = new Map<string, string | null>();

// The bridge returns raw base64 with no content type, so the mime has to be
// recovered from the image's magic bytes for the data URL to be valid.
function toImageDataUrl(base64: string): string {
  let mime = 'image/png';
  if (base64.startsWith('/9j/')) mime = 'image/jpeg';
  else if (base64.startsWith('R0lGOD')) mime = 'image/gif';
  else if (base64.startsWith('UklGR')) mime = 'image/webp';
  else if (base64.startsWith('PHN2Zy') || base64.startsWith('PD94bW'))
    mime = 'image/svg+xml';
  return `data:${mime};base64,${base64}`;
}

export function AppIcon({
  qdnName,
  size = 24,
}: {
  qdnName: string;
  size?: number;
}) {
  const c = useColors();
  const [src, setSrc] = useState<string | null>(
    () => avatarCache.get(qdnName) ?? null
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (avatarCache.has(qdnName)) {
      setSrc(avatarCache.get(qdnName) ?? null);
      return;
    }

    let cancelled = false;
    requestQdn({
      action: 'FETCH_QDN_RESOURCE',
      service: 'THUMBNAIL',
      name: qdnName,
      identifier: 'avatar',
      encoding: 'base64',
    })
      .then((result) => {
        const base64 = typeof result === 'string' ? result.trim() : '';
        const url =
          base64 && /^[A-Za-z0-9+/=]+$/.test(base64)
            ? toImageDataUrl(base64)
            : null;
        avatarCache.set(qdnName, url);
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        avatarCache.set(qdnName, null);
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
    };
  }, [qdnName]);

  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        borderRadius: `${tokens.shape.radius / 2}px`,
        bgcolor: src && !failed ? 'transparent' : c.accent,
        color: c.accentText,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
        fontWeight: tokens.typography.weightBlack,
        fontSize: size * 0.55,
        lineHeight: 1,
        userSelect: 'none',
      }}
    >
      {src && !failed ? (
        <Box
          component="img"
          src={src}
          alt=""
          onError={() => setFailed(true)}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
        (qdnName[0] ?? '?').toUpperCase()
      )}
    </Box>
  );
}
