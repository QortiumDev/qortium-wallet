import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddressBookDialog } from '../AddressBookDialog';
import { Coin } from 'qapp-core';
import * as addressBookStorage from '../../../utils/addressBookStorage';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn() },
  }),
}));

// Mock qapp-core useGlobal hook
vi.mock('qapp-core', () => ({
  Coin: {
    BTC: 'BTC',
    DOGE: 'DOGE',
    LTC: 'LTC',
    RVN: 'RVN',
    DGB: 'DGB',
    QORT: 'QORT',
    ARRR: 'ARRR',
  },
  useGlobal: () => ({
    auth: {
      name: 'testuser',
      address: 'testaddress',
    },
  }),
}));

// Mock the storage module
vi.mock('../../../utils/addressBookStorage');

// Mock QDN utilities
vi.mock('../../../utils/addressBookQDN', () => ({
  publishToQDN: vi.fn().mockResolvedValue(undefined),
}));

// Mock child components to simplify testing
vi.mock('../AddressBookTable', () => ({
  AddressBookTable: ({ entries, onEdit, onDelete, onUse }: any) => (
    <div data-testid="address-book-table">
      {entries.map((entry: any) => (
        <div key={entry.id} data-testid={`entry-${entry.id}`}>
          <span>{entry.name}</span>
          <button onClick={() => onEdit(entry)}>Edit</button>
          <button onClick={() => onDelete(entry)}>Delete</button>
          {onUse && <button onClick={() => onUse(entry)}>Use</button>}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('../AddressFormDialog', () => ({
  AddressFormDialog: ({ open, onSave, onClose }: any) =>
    open ? (
      <div data-testid="address-form-dialog">
        <button onClick={() => onSave({ name: 'New', address: 'addr123', note: '', coinType: Coin.BTC })}>
          Save
        </button>
        <button onClick={onClose}>Close Form</button>
      </div>
    ) : null,
}));

vi.mock('../DeleteConfirmationDialog', () => ({
  DeleteConfirmationDialog: ({ open, onConfirm, onClose }: any) =>
    open ? (
      <div data-testid="delete-confirmation-dialog">
        <button onClick={onConfirm}>Confirm Delete</button>
        <button onClick={onClose}>Cancel Delete</button>
      </div>
    ) : null,
}));

describe('AddressBookDialog', () => {
  const mockEntries = [
    {
      id: '1',
      name: 'Alice',
      address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      note: 'Test note',
      coinType: Coin.BTC,
      createdAt: Date.now(),
    },
    {
      id: '2',
      name: 'Bob',
      address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
      note: '',
      coinType: Coin.BTC,
      createdAt: Date.now(),
    },
  ];

  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    coinType: Coin.BTC,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(addressBookStorage.getAddressBook).mockReturnValue(mockEntries);
  });

  describe('basic rendering', () => {
    it('should display entries in table', () => {
      render(<AddressBookDialog {...defaultProps} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('should display empty state when no entries', () => {
      vi.mocked(addressBookStorage.getAddressBook).mockReturnValue([]);

      render(<AddressBookDialog {...defaultProps} />);

      expect(screen.getByText(/core:address_book_empty/)).toBeInTheDocument();
    });
  });

  describe('search functionality', () => {
    it('should filter entries when searching', async () => {
      const user = userEvent.setup();
      vi.mocked(addressBookStorage.searchAddresses).mockReturnValue([mockEntries[0]]);

      render(<AddressBookDialog {...defaultProps} />);

      const searchField = screen.getByLabelText(/core:address_book_search/);
      await user.type(searchField, 'Alice');

      await waitFor(() => {
        expect(addressBookStorage.searchAddresses).toHaveBeenCalledWith(Coin.BTC, 'Alice');
      });
    });
  });

  describe('add functionality', () => {
    it('should open form dialog when add button clicked', async () => {
      const user = userEvent.setup();

      render(<AddressBookDialog {...defaultProps} />);

      const addButton = screen.getByText(/core:address_book_add_new/);
      await user.click(addButton);

      expect(screen.getByTestId('address-form-dialog')).toBeInTheDocument();
    });

    it('should add new entry when form saved', async () => {
      const user = userEvent.setup();
      const newEntry = {
        id: '3',
        name: 'New',
        address: 'addr123',
        note: '',
        coinType: Coin.BTC,
        createdAt: Date.now(),
      };
      vi.mocked(addressBookStorage.addAddress).mockReturnValue(newEntry);

      render(<AddressBookDialog {...defaultProps} />);

      const addButton = screen.getByText(/core:address_book_add_new/);
      await user.click(addButton);

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      expect(addressBookStorage.addAddress).toHaveBeenCalled();
    });
  });

  describe('edit functionality', () => {
    it('should open form dialog when edit button clicked', async () => {
      const user = userEvent.setup();

      render(<AddressBookDialog {...defaultProps} />);

      const editButtons = screen.getAllByText('Edit');
      await user.click(editButtons[0]);

      expect(screen.getByTestId('address-form-dialog')).toBeInTheDocument();
    });
  });

  describe('delete functionality', () => {
    it('should open confirmation dialog when delete button clicked', async () => {
      const user = userEvent.setup();

      render(<AddressBookDialog {...defaultProps} />);

      const deleteButtons = screen.getAllByText('Delete');
      await user.click(deleteButtons[0]);

      expect(screen.getByTestId('delete-confirmation-dialog')).toBeInTheDocument();
    });

    it('should delete entry when confirmed', async () => {
      const user = userEvent.setup();
      vi.mocked(addressBookStorage.deleteAddress).mockReturnValue(true);

      render(<AddressBookDialog {...defaultProps} />);

      const deleteButtons = screen.getAllByText('Delete');
      await user.click(deleteButtons[0]);

      const confirmButton = screen.getByText('Confirm Delete');
      await user.click(confirmButton);

      expect(addressBookStorage.deleteAddress).toHaveBeenCalledWith('1', Coin.BTC);
    });
  });

  describe('select address functionality', () => {
    it('should call onSelectAddress when use button clicked', async () => {
      const user = userEvent.setup();
      const onSelectAddress = vi.fn();

      render(<AddressBookDialog {...defaultProps} onSelectAddress={onSelectAddress} />);

      const useButtons = screen.getAllByText('Use');
      await user.click(useButtons[0]);

      expect(onSelectAddress).toHaveBeenCalledWith(mockEntries[0].address, mockEntries[0].name);
    });
  });
});
