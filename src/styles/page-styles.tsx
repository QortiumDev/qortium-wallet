import {
  Button,
  Card,
  Dialog,
  Slide,
  styled,
  TableCell,
  tableCellClasses,
  TableRow,
  Tooltip,
  tooltipClasses,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { ComponentProps, forwardRef, Ref } from 'react';

export const Transition = forwardRef(function Transition(
  props: ComponentProps<typeof Slide>,
  ref: Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export function SlideTransition(props: ComponentProps<typeof Slide>) {
  return <Slide {...props} direction="up" />;
}

export const DialogGeneral = styled(Dialog)(({ theme }: { theme: Theme }) => ({
  '& .MuiDialogContent-root': {
    padding: theme.spacing(2),
  },
  '& .MuiDialogActions-root': {
    padding: theme.spacing(1),
  },
  '& .MuiDialog-paper': {
    borderRadius: '15px',
  },
}));

export const LightwalletDialog = styled(Dialog)(({ theme }: { theme: Theme }) => ({
  '& .MuiDialogContent-root': {
    padding: theme.spacing(2),
  },
  '& .MuiDialogActions-root': {
    padding: theme.spacing(1),
  },
  '& .MuiDialog-paper': {
    borderRadius: '15px',
  },
}));

export const SubmitDialog = styled(Dialog)(({ theme }: { theme: Theme }) => ({
  '& .MuiDialogContent-root': {
    padding: theme.spacing(2),
  },
  '& .MuiDialogActions-root': {
    padding: theme.spacing(1),
  },
  '& .MuiDialog-paper': {
    borderRadius: '15px',
  },
}));

export const CustomWidthTooltip = styled(
  ({ className, ...props }: ComponentProps<typeof Tooltip>) => (
    <Tooltip {...props} classes={{ popper: className }} />
  )
)({
  [`& .${tooltipClasses.tooltip}`]: {
    maxWidth: 500,
  },
});

export const WalletCard = styled(Card)({
  maxWidth: '100%',
  margin: '20px, auto',
  padding: '24px',
  borderRadius: 16,
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
});

export const WalletButtons = styled(Button)(({ theme }: { theme: Theme }) => ({
  width: 'auto',
  backgroundColor: '#05a2e4',
  color: 'white',
  padding: 'auto',
  '&:hover': {
    backgroundColor: '#02648d',
  },
  [theme.breakpoints.down('sm')]: {
    width: '100%',
  },
}));

export const StyledTableCell = styled(TableCell)(({ theme }: { theme: Theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: '#02648d',
    color: theme.palette.common.white,
    fontSize: 14,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 13,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
}));

export const StyledTableRow = styled(TableRow)(({ theme }: { theme: Theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
  '&:last-child td, &:last-child th': {
    border: 0,
  },
}));
