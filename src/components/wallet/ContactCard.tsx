import { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import { uiStyleAtom } from '../../state/global/system';
import { useColors } from '../../theme/ColorTokensContext';
import { tokens } from '../../theme/tokens';
import { useSupportedChains } from '../../hooks/useSupportedChains';
import { useCoinImageUrl } from '../../hooks/useCoinImageUrl';
import { addAddress, getAddressBook } from '../../utils/addressBookStorage';

interface ContactCardData {
  qortName: string;
  qortAddress: string;
  addresses: Record<string, string>;
  updatedAt: number;
}

function CoinAddressRow({ ticker, address }: { ticker: string; address: string }) {
  const c = useColors();
  const coinImageUrl = useCoinImageUrl(ticker);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75 }}>
      {coinImageUrl && (
        <Box component="img" src={coinImageUrl} alt={ticker} sx={{ height: 18, width: 18, objectFit: 'contain', flexShrink: 0 }} />
      )}
      <Box sx={{ fontWeight: tokens.typography.weightBold, fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: c.textSecondary, minWidth: 36 }}>
        {ticker}
      </Box>
      <Box sx={{ fontFamily: c.monoFontFamily, fontSize: '0.75rem', color: c.textPrimary, wordBreak: 'break-all', flex: 1 }}>
        {address}
      </Box>
    </Box>
  );
}

export function ContactCard() {
  const { qortName } = useParams<{ qortName: string }>();
  const { t } = useTranslation('core');
  const c = useColors();
  const uiStyle = useAtomValue(uiStyleAtom);
  const isClassic = uiStyle === 'classic';
  const navigate = useNavigate();
  const { chains } = useSupportedChains();

  const [card, setCard] = useState<ContactCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [imported, setImported] = useState(false);

  useEffect(() => {
    if (!qortName) { setLoading(false); setNotFound(true); return; }
    setLoading(true);
    qdnRequest({
      action: 'FETCH_QDN_RESOURCE',
      service: 'ARBITRARY',
      name: qortName,
      identifier: 'wallet-contact-card',
      encoding: 'base64',
    } as any)
      .then((data: string) => {
        const parsed: ContactCardData = JSON.parse(atob(data));
        setCard(parsed);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [qortName]);

  const handleImport = () => {
    if (!card) return;
    chains.forEach((chain) => {
      const addr = card.addresses[chain.ticker];
      if (!addr) return;
      const existing = getAddressBook(chain.coinEnum as any);
      if (existing.some((e) => e.address === addr)) return;
      try {
        addAddress({
          name: card.qortName,
          address: addr,
          note: '',
          qortAddress: card.qortAddress,
          coinType: chain.coinEnum as any,
        });
      } catch {
        /* duplicate or other error - skip */
      }
    });
    setImported(true);
    setTimeout(() => setImported(false), 3000);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: isClassic ? c.frameBg : c.bg }}>
      {/* Sub-header */}
      <Box
        sx={{
          position: 'sticky',
          top: `var(--wallet-top-bar-height, ${tokens.spacing.topBarHeight}px)`,
          zIndex: 90,
          bgcolor: c.surface,
          borderBottom: `${isClassic ? tokens.shape.classicBorderWidth : tokens.shape.borderWidth} solid ${isClassic ? c.border : c.borderLight}`,
          display: 'flex',
          alignItems: 'center',
          px: { xs: isClassic ? 1.5 : 3, sm: 3 },
          minHeight: tokens.spacing.topBarHeight,
          gap: 2,
        }}
      >
        <IconButton onClick={() => navigate('/')} size="small" sx={{ borderRadius: 0, color: c.textPrimary }}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Box sx={{ fontWeight: tokens.typography.weightBold, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '0.85rem' }}>
          {t('contact_card_title')}
        </Box>
      </Box>

      <Box sx={{ width: '100%', maxWidth: isClassic ? c.layoutWideMaxWidth : c.layoutMaxWidth, mx: 'auto', px: { xs: isClassic ? 1.5 : 2, md: isClassic ? 3 : 4 }, py: isClassic ? 3 : 4 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={28} sx={{ color: c.accent }} />
          </Box>
        ) : notFound || !card ? (
          <Box sx={{ py: 6, textAlign: 'center', color: c.textSecondary, fontSize: '0.85rem' }}>
            {t('contact_card_not_found')}
          </Box>
        ) : (
          <Box
            sx={{
              border: `${isClassic ? tokens.shape.classicBorderWidth : tokens.shape.borderWidth} solid ${isClassic ? c.border : c.borderLight}`,
              borderRadius: `${isClassic ? tokens.shape.radiusMd : tokens.shape.radius}px`,
              bgcolor: c.surface,
              boxShadow: c.shadowCard,
              p: { xs: 3, md: 4 },
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            {/* QORT identity */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[
                { label: t('contact_card_qort_name'), value: card.qortName },
                { label: t('contact_card_qort_address'), value: card.qortAddress, mono: true },
              ].map(({ label, value, mono }) => (
                <Box key={label} sx={{ display: 'flex', gap: 2 }}>
                  <Box sx={{ fontSize: '0.65rem', fontWeight: tokens.typography.weightBold, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.textSecondary, minWidth: 90, flexShrink: 0 }}>
                    {label}
                  </Box>
                  <Box sx={{ fontFamily: mono ? c.monoFontFamily : undefined, fontSize: '0.8rem', color: c.textPrimary, wordBreak: 'break-all' }}>
                    {value}
                  </Box>
                </Box>
              ))}
            </Box>

            {/* Wallet addresses */}
            <Box>
              <Box sx={{ fontSize: '0.65rem', fontWeight: tokens.typography.weightBold, letterSpacing: '0.14em', textTransform: 'uppercase', color: c.textSecondary, mb: 1 }}>
                {t('contact_card_addresses')}
              </Box>
              {Object.entries(card.addresses).map(([ticker, addr]) => (
                <CoinAddressRow key={ticker} ticker={ticker} address={addr} />
              ))}
            </Box>

            {/* Import button */}
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={imported}
              disableElevation
              sx={{
                alignSelf: 'flex-start',
                bgcolor: imported ? c.success : c.accent,
                color: c.accentText,
                '&:hover': { bgcolor: imported ? c.success : c.accentHover },
                borderRadius: isClassic ? `${tokens.shape.radiusMd}px` : '50px',
                px: 3,
                fontSize: '0.78rem',
              }}
            >
              {imported ? t('contact_card_import_success') : t('contact_card_add_all')}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
