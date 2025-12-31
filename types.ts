import { Wallet, JsonRpcProvider } from 'ethers';

export interface SetupConfig {
  contractAddress: string;
  rpcUrl: string;
  adminKey: string;
  pauserKey: string;
  complianceKey: string;
  userKey: string;
}

export interface WalletBundle {
  provider: JsonRpcProvider;
  admin: Wallet;
  pauser: Wallet;
  compliance: Wallet;
  user: Wallet;
  contractAddress: string;
}

export type LogType = 'info' | 'success' | 'error' | 'warning';

export interface LogEntry {
  id: string;
  timestamp: string;
  source: 'System' | 'Admin' | 'Pauser' | 'Compliance' | 'User';
  message: string;
  type: LogType;
  txHash?: string;
}

export interface ContractState {
  decimals: number;
  symbol: string;
  isPaused: boolean;
  isUserBlacklisted: boolean;
  balances: {
    adminEth: string;
    pauserEth: string;
    complianceEth: string;
    userEth: string;
    userTokens: string;
  };
}