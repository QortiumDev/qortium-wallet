import { useEffect, useState } from 'react';
import { Box, IconButton, Popover, Tooltip, Typography } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
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

type RatingSummary = {
  ratingCount: number;
  weightedAverageRating: number | null;
};

const STAR_VALUES = Array.from({ length: 10 }, (_, i) => i + 1);

export function RatingControl({ qdnName }: { qdnName: string }) {
  const c = useColors();
  const [summary, setSummary] = useState<RatingSummary>({
    ratingCount: 0,
    weightedAverageRating: null,
  });
  const [myRating, setMyRating] = useState<number | null>(null);
  const [canRate, setCanRate] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [hovered, setHovered] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    requestQdn({
      action: 'GET_RESOURCE_RATING',
      service: 'APP',
      name: qdnName,
      identifier: 'default',
    })
      .then((res) => {
        const data = res as {
          summary?: {
            ratingCount?: number;
            weightedAverageRating?: number | null;
          } | null;
          rating?: { rating?: number } | null;
        } | null;
        const s = data?.summary;
        if (s && typeof s.ratingCount === 'number') {
          setSummary({
            ratingCount: s.ratingCount,
            weightedAverageRating: s.weightedAverageRating ?? null,
          });
        }
        const r = data?.rating?.rating;
        if (typeof r === 'number' && r >= 1 && r <= 10) setMyRating(r);
      })
      .catch(() => {});

    requestQdn({ action: 'SHOW_ACTIONS' })
      .then((actions) => {
        if (Array.isArray(actions))
          setCanRate(actions.includes('RATE_RESOURCE'));
      })
      .catch(() => {});
  }, [qdnName]);

  async function submitRating(value: number) {
    if (busy) return;
    setBusy(true);
    const previous = myRating;
    setMyRating(value === 0 ? null : value);
    try {
      const account = await requestQdn({ action: 'UNLOCK_SELECTED_ACCOUNT' });
      if (!(account as { isUnlocked?: boolean } | null)?.isUnlocked)
        throw new Error('Account is locked.');
      await requestQdn({
        action: 'RATE_RESOURCE',
        service: 'APP',
        name: qdnName,
        identifier: 'default',
        rating: value,
      });
    } catch {
      setMyRating(previous);
    }
    setBusy(false);
  }

  const average =
    summary.ratingCount > 0 ? summary.weightedAverageRating : null;
  const hasMyRating = myRating !== null;

  return (
    <>
      <Tooltip title="Rate this app" placement="bottom">
        <IconButton
          size="small"
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{
            borderRadius: `${tokens.shape.radius}px`,
            color: hasMyRating ? c.accent : c.textSecondary,
            gap: 0.5,
            px: average !== null ? 1 : undefined,
            '&:hover': { color: c.accent },
            transition: '0.15s ease',
          }}
          aria-label="rate this app"
        >
          {hasMyRating ? (
            <StarIcon fontSize="small" />
          ) : (
            <StarBorderIcon fontSize="small" />
          )}
          {average !== null && (
            <Typography
              component="span"
              sx={{
                fontSize: '0.8rem',
                fontWeight: tokens.typography.weightBold,
                lineHeight: 1,
              }}
            >
              {average.toFixed(1)}
            </Typography>
          )}
        </IconButton>
      </Tooltip>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              bgcolor: c.surface,
              border: `1px solid ${c.borderLight}`,
              borderRadius: `${tokens.shape.radius}px`,
              p: 1.5,
              minWidth: 240,
            },
          },
        }}
      >
        <Typography sx={{ fontSize: '0.75rem', color: c.textSecondary, mb: 1 }}>
          {average !== null
            ? `Community rating: ${average.toFixed(1)} / 10 (${summary.ratingCount} rating${summary.ratingCount === 1 ? '' : 's'})`
            : 'No ratings yet'}
        </Typography>

        {canRate ? (
          <>
            <Typography
              sx={{ fontSize: '0.7rem', color: c.textSecondary, mb: 0.5 }}
            >
              {hasMyRating ? `Your rating: ${myRating} / 10` : 'Rate this app:'}
            </Typography>
            <Box sx={{ display: 'flex' }} onMouseLeave={() => setHovered(0)}>
              {STAR_VALUES.map((value) => {
                const filled =
                  hovered > 0
                    ? value <= hovered
                    : hasMyRating && value <= (myRating ?? 0);
                return (
                  <IconButton
                    key={value}
                    size="small"
                    disabled={busy}
                    onClick={() => void submitRating(value)}
                    onMouseEnter={() => setHovered(value)}
                    sx={{ p: 0.25, color: filled ? c.accent : c.textSecondary }}
                    aria-label={`rate ${value} out of 10`}
                  >
                    {filled ? (
                      <StarIcon sx={{ fontSize: 18 }} />
                    ) : (
                      <StarBorderIcon sx={{ fontSize: 18 }} />
                    )}
                  </IconButton>
                );
              })}
            </Box>
            {hasMyRating && (
              <Typography
                onClick={() => {
                  if (!busy) void submitRating(0);
                }}
                sx={{
                  fontSize: '0.7rem',
                  color: c.textSecondary,
                  mt: 1,
                  cursor: 'pointer',
                  userSelect: 'none',
                  '&:hover': { color: c.accent },
                }}
              >
                Remove my rating
              </Typography>
            )}
          </>
        ) : (
          <Typography sx={{ fontSize: '0.7rem', color: c.textSecondary }}>
            Rating requires a local node on an updated Qortium Home.
          </Typography>
        )}
      </Popover>
    </>
  );
}
