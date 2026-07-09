import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ChainConfig } from '../../config/chains';
import { tokens } from '../../theme/tokens';
import { useColors } from '../../theme/ColorTokensContext';
import { formatAtomicAmount } from '../../utils/walletSend';

export interface PreparedTransaction {
  activeNetwork?: string;
  amount?: string;
  fee?: string;
  feePerByte?: string;
  inputAmount?: string;
  inputCount?: string | number;
  outputAmount?: string;
  outputCount?: string | number;
  receivingAddress?: string;
  transactionSize?: string | number;
  txHash?: string;
  sendMax?: boolean;
  blockchain?: string;
  currencyCode?: string;
}

interface Props {
  chain: ChainConfig;
  prepared: PreparedTransaction;
}

export function PreparedTransactionPreview({ chain, prepared }: Props) {
  const c = useColors();
  const { t } = useTranslation('core');

  const amount = (value?: string) =>
    `${formatAtomicAmount(value, chain.decimalPlaces)} ${chain.ticker}`;

  const rows = [
    {
      label: t('prepared_transaction.mode'),
      value: prepared.sendMax
        ? t('prepared_transaction.mode_max')
        : t('prepared_transaction.mode_fixed'),
    },
    {
      label: t('prepared_transaction.network'),
      value: prepared.activeNetwork ?? prepared.blockchain,
    },
    {
      label: t('prepared_transaction.send_amount'),
      value: amount(prepared.amount),
    },
    { label: t('prepared_transaction.fee'), value: amount(prepared.fee) },
    {
      label: t('prepared_transaction.fee_per_byte'),
      value: prepared.feePerByte
        ? `${amount(prepared.feePerByte)}/byte`
        : undefined,
    },
    {
      label: t('prepared_transaction.input_amount'),
      value: amount(prepared.inputAmount),
    },
    {
      label: t('prepared_transaction.input_count'),
      value: prepared.inputCount,
    },
    {
      label: t('prepared_transaction.output_amount'),
      value: amount(prepared.outputAmount),
    },
    {
      label: t('prepared_transaction.output_count'),
      value: prepared.outputCount,
    },
    {
      label: t('prepared_transaction.transaction_size'),
      value:
        prepared.transactionSize != null
          ? `${prepared.transactionSize} ${t('prepared_transaction.bytes')}`
          : undefined,
    },
    { label: t('prepared_transaction.tx_hash'), value: prepared.txHash },
  ].filter((row) => row.value !== undefined && row.value !== '');

  return (
    <Box
      data-testid="prepared-transaction-preview"
      sx={{
        mt: 2,
        p: 2,
        border: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
        borderRadius: `${tokens.shape.radiusMd}px`,
        bgcolor: c.surfaceAlt,
        textAlign: 'left',
      }}
    >
      <Typography
        sx={{
          mb: 1.5,
          fontSize: '0.72rem',
          fontWeight: tokens.typography.weightBold,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: c.textSecondary,
        }}
      >
        {t('prepared_transaction.title')}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {rows.map((row) => (
          <Box
            key={row.label}
            sx={{
              display: 'grid',
              gridTemplateColumns: 'minmax(96px, 0.42fr) minmax(0, 1fr)',
              gap: 1.5,
              alignItems: 'baseline',
            }}
          >
            <Box
              sx={{
                color: c.textSecondary,
                fontSize: '0.68rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {row.label}
            </Box>
            <Box
              sx={{
                color: c.textPrimary,
                fontFamily:
                  row.label === t('prepared_transaction.tx_hash')
                    ? c.monoFontFamily
                    : undefined,
                fontSize: '0.78rem',
                wordBreak: 'break-all',
              }}
            >
              {String(row.value)}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
