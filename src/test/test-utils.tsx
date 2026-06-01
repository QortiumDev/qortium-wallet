import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';

// Initialize i18n for testing
i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['core'],
  defaultNS: 'core',
  resources: {
    en: {
      core: {
        address_book: 'address book',
        address_book_title: 'address book - {{coinType}}',
        address_book_empty: 'no addresses saved yet',
        address_book_add_new: 'add new address',
        address_book_search: 'search by name or address',
        address_book_name: 'name',
        address_book_address: 'address',
        address_book_note: 'note',
        address_book_actions: 'actions',
        address_book_edit: 'edit',
        address_book_delete: 'delete',
        address_book_use: 'use address',
        address_book_save: 'save',
        address_book_cancel: 'cancel',
        address_book_delete_confirm: 'are you sure you want to delete {{name}}?',
        address_book_name_required: 'name is required',
        address_book_name_max_length: 'name must be 50 characters or less',
        address_book_address_required: 'address is required',
        address_book_address_invalid: 'invalid {{coinType}} address format',
        address_book_note_max_length: 'note must be 200 characters or less',
        address_book_copy: 'copy address',
        address_book_copied: 'address copied to clipboard',
        close: 'close',
      },
    },
  },
  interpolation: {
    escapeValue: false,
  },
});

const theme = createTheme();

interface AllTheProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  return (
    <ThemeProvider theme={theme}>
      <I18nextProvider i18n={i18n}>
        {children}
      </I18nextProvider>
    </ThemeProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
