import { SetStateAction } from 'jotai';
import { createContext, Dispatch } from 'react';
import { EMPTY_STRING } from '../common/constants';

export interface IContextProps {
  address: string | null;
  avatar: string | null;
  name: string | null;
  isAuthenticated: boolean;
  isUsingGateway: boolean;
  nodeInfo: any;
  setWalletState?: Dispatch<SetStateAction<IContextProps>>;
}

export const defaultState: IContextProps = {
  address: EMPTY_STRING,
  avatar: EMPTY_STRING,
  name: EMPTY_STRING,
  isAuthenticated: false,
  isUsingGateway: true,
  nodeInfo: null,
};

export default createContext(defaultState);
