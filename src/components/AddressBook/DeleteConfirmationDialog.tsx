import React from 'react';
import {
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { DialogGeneral } from '../../styles/page-styles';

interface DeleteConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  entryName: string;
}

export const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  entryName,
}) => {
  const { t } = useTranslation(['core']);

  return (
    <DialogGeneral open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{textAlign: 'center'}} variant="h4">
        {t('core:address_book_delete', {
          postProcess: 'capitalizeFirstChar',
        })}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{textAlign: 'center'}}>
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
