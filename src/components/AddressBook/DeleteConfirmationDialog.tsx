import React from 'react';
import {
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import { DialogGeneral } from '../../styles/page-styles';
import { uiStyleAtom } from '../../state/global/system';
import { useColors } from '../../theme/ColorTokensContext';
import { tokens } from '../../theme/tokens';

interface DeleteConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  entryName: string;
}

export const DeleteConfirmationDialog: React.FC<
  DeleteConfirmationDialogProps
> = ({ open, onClose, onConfirm, entryName }) => {
  const { t } = useTranslation(['core']);
  const c = useColors();
  const uiStyle = useAtomValue(uiStyleAtom);
  const isClassic = uiStyle === 'classic';

  return (
    <DialogGeneral
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          border: isClassic ? `1px solid ${c.border}` : undefined,
          borderRadius: isClassic ? `${tokens.shape.radiusMd}px` : undefined,
          boxShadow: isClassic ? c.shadowModal : undefined,
        },
      }}
    >
      <DialogTitle sx={{ textAlign: 'center' }} variant="h4">
        {t('core:address_book_delete', {
          postProcess: 'capitalizeFirstChar',
        })}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ textAlign: 'center' }}>
          {t('core:address_book_delete_confirm', {
            name: entryName,
            postProcess: 'capitalizeFirstChar',
          })}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>
          {t('core:address_book_cancel', {
            postProcess: 'capitalizeFirstChar',
          })}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="error"
          sx={{
            '&:hover': {
              backgroundColor: 'error.dark',
            },
          }}
        >
          {t('core:address_book_delete', {
            postProcess: 'capitalizeFirstChar',
          })}
        </Button>
      </DialogActions>
    </DialogGeneral>
  );
};
