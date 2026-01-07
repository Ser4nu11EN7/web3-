export interface AppConfig {
  contractAddress: string;
  rpcEndpoint: string;
  adminKey: string;
  pauserKey: string;
  complianceKey: string;
  userKey: string;
}

export enum Role {
  ADMIN = 'Admin',
  PAUSER = 'Pauser',
  COMPLIANCE = 'Compliance',
  USER = 'User',
  SYSTEM = 'System'
}

export interface LogEntry {
  id: string;
  timestamp: string;
  role: Role;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export interface SimulationState {
  isPaused: boolean;
  isBlacklisted: boolean;
  balances: {
    adminEth: number;
    pauserEth: number;
    complianceEth: number;
    userEth: number;
    userTokens: number;
  };
}