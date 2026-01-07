import type { Interface } from 'ethers';

export const PAUSER_ROLE = '0x65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a';
// keccak256("BLACKLIST_ROLE")
export const BLACKLIST_ROLE = '0x22435ed027edf5f902dc0093fbc24cdb50c05b5fd5f311b78c67c1cbaff60e13';

export const ERC20_RBAC_ABI = [
  // AccessControl
  {
    inputs: [
      { internalType: 'bytes32', name: 'role', type: 'bytes32' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'grantRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'role', type: 'bytes32' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'revokeRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'role', type: 'bytes32' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'hasRole',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },

  // Pausable
  { inputs: [], name: 'pause', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'unpause', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'paused', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },

  // Blacklist
  { inputs: [{ internalType: 'address', name: 'account', type: 'address' }], name: 'addToBlacklist', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'account', type: 'address' }], name: 'removeFromBlacklist', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'account', type: 'address' }], name: 'isBlacklisted', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },

  // ERC20
  { inputs: [], name: 'decimals', outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'symbol', outputs: [{ internalType: 'string', name: '', type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // Common custom errors (OpenZeppelin v5 + solidity builtins)
  { inputs: [], name: 'EnforcedPause', type: 'error' },
  { inputs: [], name: 'ExpectedPause', type: 'error' },
  {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'bytes32', name: 'neededRole', type: 'bytes32' },
    ],
    name: 'AccessControlUnauthorizedAccount',
    type: 'error',
  },
  {
    inputs: [
      { internalType: 'address', name: 'sender', type: 'address' },
      { internalType: 'uint256', name: 'balance', type: 'uint256' },
      { internalType: 'uint256', name: 'needed', type: 'uint256' },
    ],
    name: 'ERC20InsufficientBalance',
    type: 'error',
  },
  { inputs: [{ internalType: 'uint256', name: 'code', type: 'uint256' }], name: 'Panic', type: 'error' },
  { inputs: [{ internalType: 'string', name: 'reason', type: 'string' }], name: 'Error', type: 'error' },
];

export const ROLE_LABELS: Record<string, { hash: string; displayName: string }> = {
  Pauser: { hash: PAUSER_ROLE, displayName: 'PAUSER_ROLE' },
  Compliance: { hash: BLACKLIST_ROLE, displayName: 'BLACKLIST_ROLE' },
};

export function decodeRevertData(iface: Interface, data: string) {
  const selector = data?.startsWith('0x') && data.length >= 10 ? data.slice(0, 10) : undefined;
  try {
    const parsed = iface.parseError(data);
    return { selector, name: parsed.name, args: Array.from(parsed.args ?? []) };
  } catch {
    return { selector };
  }
}

export function extractRevertData(err: any): string | undefined {
  const candidates = [
    err?.data,
    err?.info?.error?.data,
    err?.error?.data,
    err?.cause?.data,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.startsWith('0x') && candidate.length >= 10) return candidate;
  }

  const maybeMessage: unknown[] = [err?.info?.error?.message, err?.message];
  for (const msg of maybeMessage) {
    if (typeof msg !== 'string') continue;
    const match = msg.match(/data=(0x[0-9a-fA-F]+)/);
    if (match?.[1]) return match[1];
  }

  return undefined;
}
