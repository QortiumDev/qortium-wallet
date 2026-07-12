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
    borderRadius: theme.shape.borderRadius,
  },
}));

export const LightwalletDialog = styled(Dialog)(
  ({ theme }: { theme: Theme }) => ({
    '& .MuiDialogContent-root': {
      padding: theme.spacing(2),
    },
    '& .MuiDialogActions-root': {
      padding: theme.spacing(1),
    },
    '& .MuiDialog-paper': {
      borderRadius: theme.shape.borderRadius,
    },
  })
);

export const SubmitDialog = styled(Dialog)(({ theme }: { theme: Theme }) => ({
  '& .MuiDialogContent-root': {
    padding: theme.spacing(2),
  },
  '& .MuiDialogActions-root': {
    padding: theme.spacing(1),
  },
  '& .MuiDialog-paper': {
    borderRadius: theme.shape.borderRadius,
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

export const WalletCard = styled(Card)(({ theme }: { theme: Theme }) => ({
  maxWidth: '100%',
  margin: '20px, auto',
  padding: '24px',
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
}));

export const WalletButtons = styled(Button)(({ theme }: { theme: Theme }) => ({
  width: 'auto',
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  padding: 'auto',
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
  [theme.breakpoints.down('sm')]: {
    width: '100%',
  },
}));

export const StyledTableCell = styled(TableCell)(
  ({ theme }: { theme: Theme }) => ({
    [`&.${tableCellClasses.head}`]: {
      backgroundColor: theme.palette.primary.dark,
      color: theme.palette.primary.contrastText,
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
  })
);

export const StyledTableRow = styled(TableRow)(
  ({ theme }: { theme: Theme }) => ({
    '&:nth-of-type(odd)': {
      backgroundColor: theme.palette.action.hover,
    },
    '&:last-child td, &:last-child th': {
      border: 0,
    },
  })
);
