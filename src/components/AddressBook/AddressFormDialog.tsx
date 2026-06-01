import React, { useState, useEffect } from 'react';
import {
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import { Coin } from 'qapp-core';
import { useTranslation } from 'react-i18next';
import { DialogGeneral } from '../../styles/page-styles';
import { AddressBookEntry } from '../../utils/Types';
import { validateAddress } from '../../utils/addressValidation';
import { ADDRESSBOOK_NAME_LENGTH, ADDRESSBOOK_NOTE_LENGTH, EMPTY_STRING } from '../../common/constants';

const ADDRESS_LOOKUP_DEBOUNCE_MS = 1000;
const ADDRESS_MIN_LENGTH = 3;

interface AddressFormDialogProps {
  open: boolean;
  onClose: () => void;
  coinType: Coin;
  entry?: AddressBookEntry;
  onSave: (entry: Omit<AddressBookEntry, 'id' | 'createdAt'>) => void;
  prefillName?: string;
  prefillAddress?: string;
  saveError?: string;
}

export const AddressFormDialog: React.FC<AddressFormDialogProps> = ({
  open,
  onClose,
  coinType,
  entry,
  onSave,
  prefillName,
  prefillAddress,
  saveError,
}) => {
  const { t } = useTranslation(['core']);

  const [name, setName] = useState(EMPTY_STRING);
  const [address, setAddress] = useState(EMPTY_STRING);
  const [note, setNote] = useState(EMPTY_STRING);

  const [nameError, setNameError] = useState(EMPTY_STRING);
  const [addressError, setAddressError] = useState(EMPTY_STRING);
  const [noteError, setNoteError] = useState(EMPTY_STRING);

  // QORT-specific state for username resolution
  const [addressValidating, setAddressValidating] = useState(false);

  const isEditMode = !!entry;

  // Load entry data when editing
  useEffect(() => {
    if (open) {
      if (entry) {
        setName(entry.name);
        setAddress(entry.address);
        setNote(entry.note);
      } else {
        // Reset form for new entry or use prefill data
        setName(prefillName || EMPTY_STRING);
        setAddress(prefillAddress || EMPTY_STRING);
        setNote(EMPTY_STRING);
      }
      // Clear errors when dialog opens
      setNameError(EMPTY_STRING);
      setAddressError(EMPTY_STRING);
      setNoteError(EMPTY_STRING);
      setAddressValidating(false);
    }
  }, [open, entry, prefillName, prefillAddress]);

  // QORT username resolution - validate and auto-fill address from username
  useEffect(() => {
    if (coinType !== Coin.QORT || !name || name.length < ADDRESS_MIN_LENGTH) {
      return;
    }

    setAddressValidating(true);
    const controller = new AbortController();

    const timeout = setTimeout(async () => {
      try {
        const nameRes = await fetch(`/names/${encodeURIComponent(name)}`, {
          signal: controller.signal,
        }).then(async (r) => {
          if (!r.ok) {
            console.warn(`No name found: ${name}`);
            return { error: 'Name not found' };
          }
          return r.json();
        });

        // If name was found, update address field with the owner address
        if (!nameRes?.error && nameRes?.owner) {
          console.log(`QORT name resolved: ${name} -> ${nameRes.owner}`);
          setAddress(nameRes.owner);
          setAddressError(EMPTY_STRING);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('Name lookup failed:', err.message);
      } finally {
        setAddressValidating(false);
      }
    }, ADDRESS_LOOKUP_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [name, coinType, t]);

  const validateName = (value: string): boolean => {
    if (!value.trim()) {
      setNameError(
        t('core:address_book_name_required', {
          postProcess: 'capitalizeFirstChar',
        })
      );
      return false;
    }
    if (value.length > ADDRESSBOOK_NAME_LENGTH) {
      setNameError(
        t('core:address_book_name_max_length', {
          postProcess: 'capitalizeFirstChar',
        })
      );
      return false;
    }
    setNameError(EMPTY_STRING);
    return true;
  };

  const validateAddressField = (value: string): boolean => {
    if (!value.trim()) {
      setAddressError(
        t('core:address_book_address_required', {
          postProcess: 'capitalizeFirstChar',
        })
      );
      return false;
    }
    if (!validateAddress(coinType, value)) {
      setAddressError(
        t('core:address_book_address_invalid', {
          coinType: coinType,
          postProcess: 'capitalizeFirstChar',
        })
      );
      return false;
    }
    setAddressError(EMPTY_STRING);
    return true;
  };

  const validateNote = (value: string): boolean => {
    if (value.length > ADDRESSBOOK_NOTE_LENGTH) {
      setNoteError(
        t('core:address_book_note_max_length', {
          max_note: ADDRESSBOOK_NOTE_LENGTH,
          postProcess: 'capitalizeFirstChar',
        })
      );
      return false;
    }
    setNoteError(EMPTY_STRING);
    return true;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    validateName(value);
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setAddress(value);
    validateAddressField(value);
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNote(value);
    validateNote(value);
  };

  const handleSave = () => {
    // Validate all fields
    const isNameValid = validateName(name);
    const isAddressValid = validateAddressField(address);
    const isNoteValid = validateNote(note);

    if (isNameValid && isAddressValid && isNoteValid) {
      onSave({
        name: name.trim(),
        address: address.trim(),
        note: note.trim(),
        coinType,
      });
    }
  };

  const isFormValid =
    name.trim() !== EMPTY_STRING &&
    address.trim() !== EMPTY_STRING &&
    !nameError &&
    !addressError &&
    !noteError &&
    (coinType === Coin.QORT ? !addressValidating : true);

  return (
    <DialogGeneral open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{textAlign: 'center'}} variant="h4">
        {isEditMode
          ? t('core:address_book_edit', {
              postProcess: 'capitalizeFirstChar',
            })
          : t('core:address_book_add_new', {
              postProcess: 'capitalizeFirstChar',
            })}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Name Field */}
          <TextField
            required
            fullWidth
            label={t('core:address_book_name', {
              postProcess: 'capitalizeFirstChar',
            })}
            value={name}
            onChange={handleNameChange}
            error={!!nameError}
            helperText={
              nameError || (coinType === Coin.QORT && addressValidating
                ? t('core:message.generic.validating')
                : (
                  <Box
                    component="span"
                    sx={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <span></span>
                    <span style={{ fontSize: '0.75rem' }}>{name.length}/{ADDRESSBOOK_NAME_LENGTH}</span>
                  </Box>
                ))
            }
            slotProps={{
              htmlInput: {
                maxLength: ADDRESSBOOK_NAME_LENGTH,
              },
              input: {
                endAdornment: coinType === Coin.QORT && addressValidating ? (
                  <InputAdornment position="end">
                    <CircularProgress size={20} />
                  </InputAdornment>
                ) : undefined,
              },
            }}
          />

          {/* Address Field */}
          <TextField
            required
            fullWidth
            label={t('core:address_book_address', {
              postProcess: 'capitalizeFirstChar',
            })}
            value={address}
            onChange={handleAddressChange}
            error={!!addressError}
            helperText={addressError}
          />

          {/* Note Field */}
          <TextField
            fullWidth
            label={t('core:address_book_note', {
              postProcess: 'capitalizeFirstChar',
            })}
            value={note}
            onChange={handleNoteChange}
            error={!!noteError}
            helperText={
              noteError || (
                <Box
                  component="span"
                  sx={{ display: 'flex', justifyContent: 'space-between' }}
                >
                  <span></span>
                  <span style={{ fontSize: '0.75rem' }}>{note.length}/{ADDRESSBOOK_NOTE_LENGTH}</span>
                </Box>
              )
            }
            multiline
            rows={5}
            slotProps={{
              htmlInput: {
                maxLength: ADDRESSBOOK_NOTE_LENGTH,
              },
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ ml: 1, px: 3, pb: 2, justifyContent: 'space-between' }}>
        <Box sx={{ color: 'error.main', fontSize: '1rem', maxWidth: '60%' }}>
          {saveError}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose}>
            {t('core:address_book_cancel', {
              postProcess: 'capitalizeFirstChar',
            })}
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!isFormValid}
            sx={{
              backgroundColor: '#05a2e4',
              '&:hover': {
                backgroundColor: '#02648d',
              },
              '&:disabled': {
                backgroundColor: 'rgba(0, 0, 0, 0.12)',
              },
            }}
          >
            {t('core:address_book_save', {
              postProcess: 'capitalizeFirstChar',
            })}
          </Button>
        </Box>
      </DialogActions>
    </DialogGeneral>
  );
};
