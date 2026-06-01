import React, { useState, useEffect } from 'react';
import {
  Dialog,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  DialogContent,
  TextField,
  Box,
  Button,
  useTheme,
  useMediaQuery,
  Snackbar,
  Alert,
} from '@mui/material';
import { Close, Add, Save } from '@mui/icons-material';
import { Coin, useGlobal } from 'qapp-core';
import { useTranslation } from 'react-i18next';
import { Transition } from '../../styles/page-styles';
import { AddressBookEntry } from '../../utils/Types';
import {
  getAddressBook,
  searchAddresses,
  deleteAddress,
  addAddress,
  updateAddress,
} from '../../utils/addressBookStorage';
import { publishToQDN } from '../../utils/addressBookQDN';
import { AddressBookTable } from './AddressBookTable';
import { AddressFormDialog } from './AddressFormDialog';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';
import { EMPTY_STRING, ADDRESSBOOK_ROWS_PER_PAGE } from '../../common/constants';

interface AddressBookDialogProps {
  open: boolean;
  onClose: () => void;
  coinType: Coin;
  onSelectAddress?: (address: string, name: string) => void;
  prefillData?: { name: string; address: string } | null;
}

export const AddressBookDialog: React.FC<AddressBookDialogProps> = ({
  open,
  onClose,
  coinType,
  onSelectAddress,
  prefillData,
}) => {
  const { t } = useTranslation(['core']);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  const [entries, setEntries] = useState<AddressBookEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState(EMPTY_STRING);
  const [openForm, setOpenForm] = useState(false);
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<AddressBookEntry | undefined>(undefined);
  const [deletingEntry, setDeletingEntry] = useState<AddressBookEntry | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(ADDRESSBOOK_ROWS_PER_PAGE);
  const [saveError, setSaveError] = useState<string>(EMPTY_STRING);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);

  // Get authenticated username for QDN sync
  const userName = useGlobal().auth.name;

  // Load entries when dialog opens or coinType changes
  useEffect(() => {
    if (open) {
      setPage(0);
      loadEntries();
      // Reset unsynced changes flag when dialog opens
      setHasUnsyncedChanges(false);
    }
  }, [open, coinType]);

  // Open form with prefilled data when prefillData is provided
  useEffect(() => {
    if (open && prefillData) {
      // Don't set editingEntry, just open the form
      // The prefill data will be passed as props to AddressFormDialog
      setEditingEntry(undefined);
      setOpenForm(true);
    }
  }, [open, prefillData]);

  // Filter entries when search query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = searchAddresses(coinType, searchQuery);
      setEntries(filtered);
    } else {
      loadEntries();
    }
    // Reset to first page when search query changes
    setPage(0);
  }, [searchQuery, coinType]);

  const loadEntries = () => {
    const allEntries = getAddressBook(coinType);
    setEntries(allEntries);
  };

  const handleAddNew = () => {
    setEditingEntry(undefined);
    setSaveError(EMPTY_STRING);
    setOpenForm(true);
  };

  const handleEdit = (entry: AddressBookEntry) => {
    setEditingEntry(entry);
    setSaveError(EMPTY_STRING);
    setOpenForm(true);
  };

  const handleDeleteClick = (entry: AddressBookEntry) => {
    setDeletingEntry(entry);
    setOpenDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    if (deletingEntry) {
      deleteAddress(deletingEntry.id, coinType);
      loadEntries();
      setOpenDeleteConfirm(false);
      setDeletingEntry(undefined);
      setHasUnsyncedChanges(true);

      // Adjust page if we deleted the last item on the current page
      const newTotalEntries = entries.length - 1;
      const maxPage = Math.max(0, Math.ceil(newTotalEntries / rowsPerPage) - 1);
      if (page > maxPage) {
        setPage(maxPage);
      }
    }
  };

  const handleDeleteCancel = () => {
    setOpenDeleteConfirm(false);
    setDeletingEntry(undefined);
  };

  const handleSave = (entry: Omit<AddressBookEntry, 'id' | 'createdAt'>) => {
    try {
      if (editingEntry) {
        // Update existing entry
        updateAddress(editingEntry.id, coinType, {
          name: entry.name,
          address: entry.address,
          note: entry.note,
        });
      } else {
        // Add new entry
        addAddress(entry);
      }
      loadEntries();
      setOpenForm(false);
      setEditingEntry(undefined);
      setSaveError(EMPTY_STRING);
      setHasUnsyncedChanges(true);
    } catch (error: any) {
      console.error('Error saving address:', error);
      // Set the error message to display in the form
      const errorMessage = error?.message || t('core:message.error.something_went_wrong');
      setSaveError(
        errorMessage === 'Address already exists in the address book'
          ? t('core:message.error.address_already_exists')
          : errorMessage
      );
    }
  };

  const handleFormClose = () => {
    setOpenForm(false);
    setEditingEntry(undefined);
    setSaveError(EMPTY_STRING);
  };

  const handleUse = (entry: AddressBookEntry) => {
    if (onSelectAddress) {
      console.log(`Address Book: Using address ${entry.name} for ${coinType}`);
      onSelectAddress(entry.address, entry.name);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSyncToQDN = async () => {
    setIsSyncing(true);

    try {
      const currentEntries = getAddressBook(coinType);
      await publishToQDN(coinType, currentEntries, userName || undefined);

      // Show success notification
      console.log(`Address Book: Successfully synced ${coinType} to QDN`);
      // Reset unsynced changes flag after successful sync
      setHasUnsyncedChanges(false);
      // Show success snackbar
      setShowSyncSuccess(true);
    } catch (error) {
      console.error('Failed to sync to QDN:', error);
      // Optional: Show error notification to user
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCloseSyncSuccess = () => {
    setShowSyncSuccess(false);
  };

  return (
    <>
      <Dialog
        fullScreen={fullScreen}
        open={open}
        onClose={onClose}
        slots={{ transition: Transition }}
        maxWidth="md"
        fullWidth
      >
        <AppBar sx={{ position: 'relative' }}>
          <Toolbar>
            <Typography sx={{ ml: 2, flex: 1, textAlign: 'center' }} variant="h4" component="div">
              {t('core:address_book_title', {
                coinType: coinType,
                postProcess: 'capitalizeFirstChar',
              })}
            </Typography>
            <IconButton
              edge="end"
              color="inherit"
              onClick={onClose}
              aria-label={t('core:action.close', { postProcess: 'capitalizeFirstChar' })}
            >
              <Close />
            </IconButton>
          </Toolbar>
        </AppBar>

        <DialogContent>
          <Box sx={{ p: 2 }}>
            {/* Search Field */}
            <TextField
              fullWidth
              label={t('core:address_book_search', {
                postProcess: 'capitalizeFirstChar',
              })}
              variant="outlined"
              value={searchQuery}
              onChange={handleSearchChange}
              sx={{ mb: 3 }}
            />

            {/* QDN Sync and Add New Buttons */}
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                startIcon={<Save />}
                onClick={handleSyncToQDN}
                disabled={isSyncing || !hasUnsyncedChanges}
                sx={{
                  backgroundColor: '#4caf50',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: '#45a049',
                  },
                  '&:disabled': {
                    backgroundColor: '#a5d6a7',
                    color: 'white',
                  },
                }}
              >
                {t('core:address_book_sync_qdn', { postProcess: 'capitalizeFirstChar' })}
                {isSyncing && '...'}
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleAddNew}
                sx={{
                  backgroundColor: '#05a2e4',
                  '&:hover': {
                    backgroundColor: '#02648d',
                  },
                }}
              >
                {t('core:address_book_add_new', {
                  postProcess: 'capitalizeFirstChar',
                })}
              </Button>
            </Box>

            {/* Address List */}
            {entries.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '200px',
                }}
              >
                <Typography variant="body1" color="text.secondary">
                  {t('core:address_book_empty', {
                    postProcess: 'capitalizeFirstChar',
                  })}
                </Typography>
              </Box>
            ) : (
              <AddressBookTable
                entries={entries}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onUse={onSelectAddress ? handleUse : undefined}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}
              />
            )}
          </Box>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Form Dialog */}
      <AddressFormDialog
        open={openForm}
        onClose={handleFormClose}
        coinType={coinType}
        entry={editingEntry}
        onSave={handleSave}
        prefillName={prefillData?.name}
        prefillAddress={prefillData?.address}
        saveError={saveError}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={openDeleteConfirm}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        entryName={deletingEntry?.name || EMPTY_STRING}
      />

      {/* QDN Sync Success Notification */}
      <Snackbar
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        open={showSyncSuccess}
        autoHideDuration={4000}
        onClose={handleCloseSyncSuccess}
      >
        <Alert onClose={handleCloseSyncSuccess} severity="success" sx={{ width: '100%' }}>
          {t('core:message.success.qdn_sync', {
            coinType: coinType,
            defaultValue: `Successfully synced ${coinType} address book to QDN`,
            postProcess: 'capitalizeFirstChar',
          })}
        </Alert>
      </Snackbar>
    </>
  );
};
