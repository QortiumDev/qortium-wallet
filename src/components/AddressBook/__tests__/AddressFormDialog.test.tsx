import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddressFormDialog } from '../AddressFormDialog';
import { Coin } from 'qapp-core';
import * as addressValidation from '../../../utils/addressValidation';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn() },
  }),
}));

// Mock address validation
vi.mock('../../../utils/addressValidation');

// Mock fetch for QORT name resolution
global.fetch = vi.fn();

describe('AddressFormDialog', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    coinType: Coin.BTC,
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(addressValidation.validateAddress).mockReturnValue(true);
  });

  describe('basic rendering', () => {
    it('should render form fields when open', () => {
      render(<AddressFormDialog {...defaultProps} />);

      expect(screen.getByLabelText(/core:address_book_name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/core:address_book_address/)).toBeInTheDocument();
      expect(screen.getByLabelText(/core:address_book_note/)).toBeInTheDocument();
    });

    it('should show character counters', () => {
      render(<AddressFormDialog {...defaultProps} />);

      expect(screen.getByText('0/50')).toBeInTheDocument(); // Name counter
      expect(screen.getByText('0/200')).toBeInTheDocument(); // Note counter
    });
  });

  describe('form initialization', () => {
    it('should populate form with entry data in edit mode', () => {
      const entry = {
        id: '1',
        name: 'Alice',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        note: 'Test note',
        coinType: Coin.BTC,
        createdAt: Date.now(),
      };

      render(<AddressFormDialog {...defaultProps} entry={entry} />);

      const nameInput = screen.getByLabelText(/core:address_book_name/) as HTMLInputElement;
      const addressInput = screen.getByLabelText(/core:address_book_address/) as HTMLInputElement;
      const noteInput = screen.getByLabelText(/core:address_book_note/) as HTMLInputElement;

      expect(nameInput.value).toBe('Alice');
      expect(addressInput.value).toBe('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
      expect(noteInput.value).toBe('Test note');
    });
  });

  describe('form validation', () => {
    it('should update character counter as user types in name field', async () => {
      const user = userEvent.setup();

      render(<AddressFormDialog {...defaultProps} />);

      const nameInput = screen.getByLabelText(/core:address_book_name/);
      await user.type(nameInput, 'Alice');

      await waitFor(() => {
        expect(screen.getByText('5/50')).toBeInTheDocument();
      });
    });

    it('should update character counter as user types in note field', async () => {
      const user = userEvent.setup();

      render(<AddressFormDialog {...defaultProps} />);

      const noteInput = screen.getByLabelText(/core:address_book_note/);
      await user.type(noteInput, 'Test note');

      await waitFor(() => {
        expect(screen.getByText('9/200')).toBeInTheDocument();
      });
    });

    it('should disable save button when form is invalid', () => {
      render(<AddressFormDialog {...defaultProps} />);

      const saveButton = screen.getByText(/core:address_book_save/);
      expect(saveButton).toBeDisabled();
    });

    it('should enable save button when form is valid', async () => {
      const user = userEvent.setup();

      render(<AddressFormDialog {...defaultProps} />);

      const nameInput = screen.getByLabelText(/core:address_book_name/);
      const addressInput = screen.getByLabelText(/core:address_book_address/);

      await user.type(nameInput, 'Alice');
      await user.type(addressInput, '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');

      await waitFor(() => {
        const saveButton = screen.getByText(/core:address_book_save/);
        expect(saveButton).not.toBeDisabled();
      });
    });
  });

  describe('save functionality', () => {
    it('should call onSave with form data when save clicked', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();

      render(<AddressFormDialog {...defaultProps} onSave={onSave} />);

      const nameInput = screen.getByLabelText(/core:address_book_name/);
      const addressInput = screen.getByLabelText(/core:address_book_address/);
      const noteInput = screen.getByLabelText(/core:address_book_note/);

      await user.type(nameInput, 'Alice');
      await user.type(addressInput, '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
      await user.type(noteInput, 'Test note');

      const saveButton = screen.getByText(/core:address_book_save/);
      await user.click(saveButton);

      expect(onSave).toHaveBeenCalledWith({
        name: 'Alice',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        note: 'Test note',
        coinType: Coin.BTC,
      });
    });

    it('should not call onSave when form is invalid', () => {
      const onSave = vi.fn();

      render(<AddressFormDialog {...defaultProps} onSave={onSave} />);

      // Leave form empty - button should be disabled
      const saveButton = screen.getByText(/core:address_book_save/);
      expect(saveButton).toBeDisabled();
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe('cancel functionality', () => {
    it('should call onClose when cancel clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<AddressFormDialog {...defaultProps} onClose={onClose} />);

      const cancelButton = screen.getByText(/core:address_book_cancel/);
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('error display', () => {
    it('should display save error when provided', () => {
      render(<AddressFormDialog {...defaultProps} saveError="Duplicate address" />);

      expect(screen.getByText('Duplicate address')).toBeInTheDocument();
    });
  });

  describe('QORT name resolution', () => {
    it('should show loading indicator when validating QORT name', async () => {
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ owner: 'QAddress123' }),
      } as Response);

      render(<AddressFormDialog {...defaultProps} coinType={Coin.QORT} />);

      const nameInput = screen.getByLabelText(/core:address_book_name/);
      await user.type(nameInput, 'Alice');

      // Should show validating message
      await waitFor(() => {
        expect(screen.getByText(/core:message.generic.validating/)).toBeInTheDocument();
      });
    });

    it('should not resolve name for non-QORT coins', async () => {
      const user = userEvent.setup();

      render(<AddressFormDialog {...defaultProps} coinType={Coin.BTC} />);

      const nameInput = screen.getByLabelText(/core:address_book_name/);
      await user.type(nameInput, 'Alice');

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
