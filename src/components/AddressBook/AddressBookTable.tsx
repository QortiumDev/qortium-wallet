import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  IconButton,
  Box,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Edit, Delete, Send, ContentCopy } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { StyledTableCell } from '../../styles/page-styles';
import { AddressBookEntry } from '../../utils/Types';
import { copyToClipboard, cropString } from '../../common/functions';
import { EMPTY_STRING, TIME_SECONDS_2 } from '../../common/constants';

interface AddressBookTableProps {
  entries: AddressBookEntry[];
  onEdit: (entry: AddressBookEntry) => void;
  onDelete: (entry: AddressBookEntry) => void;
  onUse?: (entry: AddressBookEntry) => void;
  page: number;
  rowsPerPage: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AddressBookTable: React.FC<AddressBookTableProps> = ({
  entries,
  onEdit,
  onDelete,
  onUse,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}) => {
  const { t } = useTranslation(['core']);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Calculate paginated entries
  const paginatedEntries = entries.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleCopy = async (address: string, id: string) => {
    try {
      await copyToClipboard(address);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), TIME_SECONDS_2);
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  // Responsive rendering for mobile
  if (isMobile) {
    return (
      <Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {paginatedEntries.map((entry) => (
          <Paper
            key={entry.id}
            elevation={2}
            sx={{ p: 2, borderRadius: 2 }}
          >
            <Box sx={{ mb: 1 }}>
              <Box sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                {entry.name}
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  color: 'text.secondary',
                  fontSize: '0.875rem'
                }}
              >
                <span>{cropString(entry.address)}</span>
                <IconButton
                  size="small"
                  onClick={() => handleCopy(entry.address, entry.id)}
                  aria-label={t('core:address_book_copy', {
                    postProcess: 'capitalizeFirstChar',
                  })}
                >
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Box>
              {entry.note && (
                <Box sx={{ color: 'text.secondary', fontSize: '0.75rem', mt: 1 }}>
                  {entry.note}
                </Box>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              {onUse && (
                <IconButton
                  size="small"
                  onClick={() => onUse(entry)}
                  color="primary"
                  aria-label={t('core:address_book_use', {
                    postProcess: 'capitalizeFirstChar',
                  })}
                >
                  <Send fontSize="small" />
                </IconButton>
              )}
              <IconButton
                size="small"
                onClick={() => onEdit(entry)}
                color="primary"
                aria-label={t('core:address_book_edit', {
                  postProcess: 'capitalizeFirstChar',
                })}
              >
                <Edit fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => onDelete(entry)}
                color="error"
                aria-label={t('core:address_book_delete', {
                  postProcess: 'capitalizeFirstChar',
                })}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Box>
          </Paper>
        ))}
        </Box>
        <TablePagination
          component="div"
          count={entries.length}
          page={page}
          onPageChange={onPageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={onRowsPerPageChange}
          labelRowsPerPage={t('core:rows_per_page', {
            postProcess: 'capitalizeFirstChar',
          })}
        />
      </Box>
    );
  }

  // Desktop table view
  return (
    <Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <StyledTableCell sx={{ width: '15%' }}>
                {t('core:address_book_name', {
                  postProcess: 'capitalizeFirstChar',
                })}
              </StyledTableCell>
              <StyledTableCell sx={{ width: '25%' }}>
                {t('core:address_book_address', {
                  postProcess: 'capitalizeFirstChar',
                })}
              </StyledTableCell>
              <StyledTableCell sx={{ width: '40%' }}>
                {t('core:address_book_note', {
                  postProcess: 'capitalizeFirstChar',
                })}
              </StyledTableCell>
              <StyledTableCell align="right" sx={{ width: '20%' }}>
                {t('core:address_book_actions', {
                  postProcess: 'capitalizeFirstChar',
                })}
              </StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedEntries.map((entry) => (
            <TableRow
              key={entry.id}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              <StyledTableCell component="th" scope="row">
                 <Tooltip title={entry.name || EMPTY_STRING} placement="top">
                  <span>{entry.name ? cropString(entry.name, 20) : '-'}</span>
                </Tooltip>
              </StyledTableCell>
              <StyledTableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Tooltip title={entry.address} placement="top">
                    <span>{cropString(entry.address)}</span>
                  </Tooltip>
                  <Tooltip
                    title={
                      copiedId === entry.id
                        ? t('core:address_book_copied', {
                            postProcess: 'capitalizeFirstChar',
                          })
                        : t('core:address_book_copy', {
                            postProcess: 'capitalizeFirstChar',
                          })
                    }
                    placement="top"
                  >
                    <IconButton
                      size="small"
                      onClick={() => handleCopy(entry.address, entry.id)}
                      sx={{
                        color: copiedId === entry.id ? 'success.main' : 'inherit',
                      }}
                    >
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </StyledTableCell>
              <StyledTableCell>
                <Tooltip title={entry.note || EMPTY_STRING} placement="top">
                  <span>{entry.note ? cropString(entry.note, 50) : '-'}</span>
                </Tooltip>
              </StyledTableCell>
              <StyledTableCell align="right">
                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                  {onUse && (
                    <Tooltip
                      title={t('core:address_book_use', {
                        postProcess: 'capitalizeFirstChar',
                      })}
                      placement="top"
                    >
                      <IconButton
                        size="small"
                        onClick={() => onUse(entry)}
                        color="primary"
                      >
                        <Send fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip
                    title={t('core:address_book_edit', {
                      postProcess: 'capitalizeFirstChar',
                    })}
                    placement="top"
                  >
                    <IconButton
                      size="small"
                      onClick={() => onEdit(entry)}
                      color="primary"
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip
                    title={t('core:address_book_delete', {
                      postProcess: 'capitalizeFirstChar',
                    })}
                    placement="top"
                  >
                    <IconButton
                      size="small"
                      onClick={() => onDelete(entry)}
                      color="error"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </StyledTableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        rowsPerPageOptions={[5, 10, 15]}
        component="div"
        count={entries.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
        labelRowsPerPage={t('core:rows_per_page', {
          postProcess: 'capitalizeFirstChar',
        })}
      />
    </TableContainer>
    </Box>
  );
};
