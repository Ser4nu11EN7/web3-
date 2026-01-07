import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Input } from './components/UI';
import { AdminPanel, CircuitBreakerPanel, CompliancePanel, UserWalletPanel } from './components/DashboardPanels';
import { AppConfig, Role, LogEntry, SimulationState } from './types';
import { ERC20_RBAC_ABI, ROLE_LABELS, decodeRevertData, extractRevertData, PAUSER_ROLE, BLACKLIST_ROLE } from './web3';
import type { Contract, Interface, JsonRpcProvider, Wallet } from 'ethers';

// --- Utils ---
const generateId = () => Math.random().toString(36).substr(2, 9);
const now = () => new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + new Date().getMilliseconds().toString().padStart(3, '0');

const loadEthers = (() => {
  let promise: Promise<typeof import('ethers')> | null = null;
  return () => {
    if (!promise) promise = import('ethers');
    return promise;
  };
})();

type Web3Context = {
  provider: JsonRpcProvider;
  contractAddress: string;
  iface: Interface;
  contracts: {
    ro: Contract;
    admin: Contract;
    pauser: Contract;
    compliance: Contract;
    user: Contract;
  };
  wallets: {
    admin: Wallet;
    pauser: Wallet;
    compliance: Wallet;
    user: Wallet;
  };
  tokenMeta: {
    decimals: number;
    symbol: string;
  };
};

// Base64 encoded defaults to avoid plain text in source code
const ENCRYPTED_DEFAULTS = {
  contract: "MHg2MTlkNjA3RDIwODE4REZhODJlYTU3MzJBQmI3NjZlYkZhNTVGNDI0",
  rpc: "aHR0cHM6Ly9ldGgtc2Vwb2xpYS5nLmFsY2hlbXkuY29tL3YyLzFneHQxR1BkaDE3cDVfQU1tb2kzYg==",
  admin: "N2UwZDNlZTY4ZjIxMmY3NDA1NjM0YmUxNDcwNDRhZWQ5YzA3NDM5NmY5NWM2MmIxMzg3NGQzNjQyM2ExYTNmYw==",
  pauser: "NGMyY2MzZTU5OTM2MzE0ZTQ0NGUzMTE4ODE0MTdhNzhiNTVjYzI1MWUyYTRkZTcxNDhiNGI1OWI4MzliMThiMA==",
  compliance: "Mjg1N2NkMWRlOTliYmU0NjA3OWQ5ZTE2NjU2OGMyNjVmYWU2ZGMwZjNmZjQ3MzMyOTYxMmMxOGJmMDhmNDEyZQ==",
  user: "OWY0YTk2Y2JiNzUwZjJjNmQxMmM3M2VmNmNiZWZjZWI1YWY0YzcyMDYwYjRmMTExNzAyNjljNGFlOTMyM2ZlZg=="
};

const App: React.FC = () => {
  const [view, setView] = useState<'setup' | 'dashboard'>('setup');
  const web3Ref = useRef<Web3Context | null>(null);
  
  // Configuration State
  const [config, setConfig] = useState<AppConfig>({
    contractAddress: '',
    rpcEndpoint: '',
    adminKey: '',
    pauserKey: '',
    complianceKey: '',
    userKey: ''
  });

  // Shortcut Listener for Alt+D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (view === 'setup' && e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        try {
          setConfig({
            contractAddress: atob(ENCRYPTED_DEFAULTS.contract),
            rpcEndpoint: atob(ENCRYPTED_DEFAULTS.rpc),
            adminKey: atob(ENCRYPTED_DEFAULTS.admin),
            pauserKey: atob(ENCRYPTED_DEFAULTS.pauser),
            complianceKey: atob(ENCRYPTED_DEFAULTS.compliance),
            userKey: atob(ENCRYPTED_DEFAULTS.user)
          });
        } catch (err) {
          console.error("Error decoding defaults", err);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view]);

  // Simulation State
  const [appState, setAppState] = useState<SimulationState>({
    isPaused: false,
    isBlacklisted: false,
    balances: {
      adminEth: 12.502,
      pauserEth: 4.200,
      complianceEth: 1.050,
      userEth: 0.850,
      userTokens: 5000
    }
  });

  // Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // --- Helper Functions ---
  const addLog = (role: Role, message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { id: generateId(), timestamp: now(), role, message, type }]);
  };

  const logEthersError = (context: string, err: any) => {
    const revertData = extractRevertData(err);
    const decoded =
      revertData && web3Ref.current ? decodeRevertData(web3Ref.current.iface, revertData) : undefined;
    const selector = decoded?.selector ?? (revertData?.slice(0, 10) || undefined);

    console.groupCollapsed(`[web3-rbac-console] ${context}`);
    console.error(err);
    console.log({
      code: err?.code,
      shortMessage: err?.shortMessage,
      reason: err?.reason,
      message: err?.message,
      revertData,
      selector,
      decoded,
    });
    console.groupEnd();

    const base = err?.shortMessage || err?.reason || err?.message || '交易失败';
    const hint = decoded?.name ? decoded.name : selector ? `selector=${selector}` : revertData ? 'revertData=present' : '';

    if (decoded?.name === 'AccessControlUnauthorizedAccount' && decoded.args?.length >= 2) {
      const account = String(decoded.args[0]);
      const neededRole = String(decoded.args[1]);
      return `${base} | ${decoded.name}(account=${account}, role=${neededRole})`;
    }

    if (decoded?.name === 'EnforcedPause') {
      return `${base} | EnforcedPause(合约已暂停)`;
    }

    return hint ? `${base} | ${hint}` : base;
  };

  const refreshOnchainState = async () => {
    const ctx = web3Ref.current;
    if (!ctx) return;

    const { formatEther, formatUnits } = await loadEthers();
    const { provider, contracts, wallets, tokenMeta } = ctx;

    const [isPaused, isBlacklisted, adminEth, pauserEth, complianceEth, userEth, userTokens] = await Promise.all([
      contracts.ro.paused(),
      contracts.ro.isBlacklisted(wallets.user.address),
      provider.getBalance(wallets.admin.address),
      provider.getBalance(wallets.pauser.address),
      provider.getBalance(wallets.compliance.address),
      provider.getBalance(wallets.user.address),
      contracts.ro.balanceOf(wallets.user.address),
    ]);

    setAppState({
      isPaused: Boolean(isPaused),
      isBlacklisted: Boolean(isBlacklisted),
      balances: {
        adminEth: Number(formatEther(adminEth)),
        pauserEth: Number(formatEther(pauserEth)),
        complianceEth: Number(formatEther(complianceEth)),
        userEth: Number(formatEther(userEth)),
        userTokens: Number(formatUnits(userTokens, tokenMeta.decimals)),
      },
    });
  };

  // --- Handlers ---
  const handleStart = async () => {
    if (
      !config.contractAddress ||
      !config.rpcEndpoint ||
      !config.adminKey ||
      !config.pauserKey ||
      !config.complianceKey ||
      !config.userKey
    ) {
      alert("请填写合约地址、RPC 与全部私钥");
      return;
    }

    addLog(Role.SYSTEM, '正在连接 RPC 节点...', 'info');
    try {
      const { JsonRpcProvider, Wallet, Contract, Interface } = await loadEthers();

      const provider = new JsonRpcProvider(config.rpcEndpoint);
      await provider.getNetwork();

      const admin = new Wallet(config.adminKey, provider);
      const pauser = new Wallet(config.pauserKey, provider);
      const compliance = new Wallet(config.complianceKey, provider);
      const user = new Wallet(config.userKey, provider);

      const iface = new Interface(ERC20_RBAC_ABI);
      const ro = new Contract(config.contractAddress, ERC20_RBAC_ABI, provider);

      const tokenMeta = { decimals: 18, symbol: 'TKN' };
      try {
        const [decimals, symbol] = await Promise.all([ro.decimals(), ro.symbol()]);
        tokenMeta.decimals = Number(decimals);
        tokenMeta.symbol = String(symbol);
      } catch (e: any) {
        console.info('[web3-rbac-console] token meta fallback', e);
      }

      web3Ref.current = {
        provider,
        contractAddress: config.contractAddress,
        iface,
        tokenMeta,
        wallets: { admin, pauser, compliance, user },
        contracts: {
          ro,
          admin: ro.connect(admin),
          pauser: ro.connect(pauser),
          compliance: ro.connect(compliance),
          user: ro.connect(user),
        },
      };

      addLog(Role.SYSTEM, `合约实例加载完成。symbol=${tokenMeta.symbol} decimals=${tokenMeta.decimals}`, 'success');
      setView('dashboard');
      await refreshOnchainState();
    } catch (e: any) {
      addLog(Role.SYSTEM, `初始化失败: ${logEthersError('init failed', e)}`, 'error');
    }
  };

  const handleGlobalRefresh = async () => {
    addLog(Role.SYSTEM, '正在同步链上状态...', 'info');
    try {
      await refreshOnchainState();
      addLog(Role.SYSTEM, '状态已同步。', 'success');
    } catch (e: any) {
      addLog(Role.SYSTEM, `同步失败: ${logEthersError('refresh failed', e)}`, 'error');
    }
  };

  // Admin Actions
  const handleGrantRole = async (role: string, address: string) => {
    const ctx = web3Ref.current;
    if (!ctx) return;

    const roleInfo = ROLE_LABELS[role];
    if (!roleInfo) {
      addLog(Role.ADMIN, `未知角色: ${role}`, 'error');
      return;
    }

    const { isAddress } = await loadEthers();
    const target =
      isAddress(address) ? address : role === 'Pauser' ? ctx.wallets.pauser.address : ctx.wallets.compliance.address;

    addLog(Role.ADMIN, `正在授予 ${roleInfo.displayName} 给 ${target}...`, 'info');
    try {
      const tx = await ctx.contracts.admin.grantRole(roleInfo.hash, target);
      addLog(Role.ADMIN, `交易已发送，等待确认... Tx: ${tx.hash.substring(0, 10)}...`, 'info');
      await tx.wait();
      addLog(Role.ADMIN, `授权成功: ${roleInfo.displayName} -> ${target}`, 'success');
      await refreshOnchainState();
    } catch (e: any) {
      addLog(Role.ADMIN, `授权失败: ${logEthersError('grantRole failed', e)}`, 'error');
    }
  };

  const handleRevokeRole = async (role: string, address: string) => {
    const ctx = web3Ref.current;
    if (!ctx) return;

    const roleInfo = ROLE_LABELS[role];
    if (!roleInfo) {
      addLog(Role.ADMIN, `未知角色: ${role}`, 'error');
      return;
    }

    const { isAddress } = await loadEthers();
    const target =
      isAddress(address) ? address : role === 'Pauser' ? ctx.wallets.pauser.address : ctx.wallets.compliance.address;

    addLog(Role.ADMIN, `正在撤销 ${target} 的 ${roleInfo.displayName}...`, 'info');
    try {
      const tx = await ctx.contracts.admin.revokeRole(roleInfo.hash, target);
      addLog(Role.ADMIN, `交易已发送，等待确认... Tx: ${tx.hash.substring(0, 10)}...`, 'info');
      await tx.wait();
      addLog(Role.ADMIN, `撤销成功: ${roleInfo.displayName} x ${target}`, 'success');
      await refreshOnchainState();
    } catch (e: any) {
      addLog(Role.ADMIN, `撤销失败: ${logEthersError('revokeRole failed', e)}`, 'error');
    }
  };

  // Circuit Breaker Actions
  const handleTogglePause = async (shouldPause: boolean) => {
    const ctx = web3Ref.current;
    if (!ctx) return;

    const action = shouldPause ? '紧急暂停 (HALT)' : '恢复系统运行 (Resume)';
    addLog(Role.PAUSER, `正在发起: ${action}...`, 'info');
    try {
      try {
        const hasRole = await ctx.contracts.ro.hasRole(PAUSER_ROLE, ctx.wallets.pauser.address);
        console.info('[web3-rbac-console] pause preflight', { pauser: ctx.wallets.pauser.address, hasRole });
      } catch (e: any) {
        console.info('[web3-rbac-console] pause preflight failed', e);
      }

      const tx = shouldPause ? await ctx.contracts.pauser.pause() : await ctx.contracts.pauser.unpause();
      addLog(Role.PAUSER, `交易已发送，等待确认... Tx: ${tx.hash.substring(0, 10)}...`, 'info');
      await tx.wait();
      addLog(Role.PAUSER, `成功: ${action} 已上链确认。`, 'success');
      await refreshOnchainState();
    } catch (e: any) {
      addLog(Role.PAUSER, `操作失败: ${logEthersError('pause toggle failed', e)}`, 'error');
    }
  };

  // Compliance Actions
  const handleComplianceUpdate = async (blacklist: boolean) => {
    const ctx = web3Ref.current;
    if (!ctx) return;

    const target = ctx.wallets.user.address;
    const action = blacklist ? '拉黑目标用户' : '洗白目标用户';
    addLog(Role.COMPLIANCE, `正在发起: ${action} ${target}...`, 'info');
    try {
      try {
        const [paused, hasRole, isBlacklisted] = await Promise.all([
          ctx.contracts.ro.paused(),
          ctx.contracts.ro.hasRole(BLACKLIST_ROLE, ctx.wallets.compliance.address),
          ctx.contracts.ro.isBlacklisted(target),
        ]);
        console.info('[web3-rbac-console] blacklist preflight', {
          paused,
          compliance: ctx.wallets.compliance.address,
          hasRole,
          target,
          isBlacklisted,
        });
      } catch (e: any) {
        console.info('[web3-rbac-console] blacklist preflight failed', e);
      }

      const tx = blacklist
        ? await ctx.contracts.compliance.addToBlacklist(target)
        : await ctx.contracts.compliance.removeFromBlacklist(target);
      addLog(Role.COMPLIANCE, `交易已发送，等待确认... Tx: ${tx.hash.substring(0, 10)}...`, 'info');
      await tx.wait();
      addLog(Role.COMPLIANCE, `成功: ${action} 已上链确认。`, 'success');
      await refreshOnchainState();
    } catch (e: any) {
      addLog(Role.COMPLIANCE, `操作失败: ${logEthersError('blacklist update failed', e)}`, 'error');
    }
  };

  // User Actions
  const handleTransfer = async (amount: string) => {
    const ctx = web3Ref.current;
    if (!ctx) return;

    const val = parseFloat(amount);
    if (!Number.isFinite(val) || val <= 0) return;

    const { parseUnits } = await loadEthers();
    const to = ctx.wallets.admin.address;
    const action = `转账 ${val} ${ctx.tokenMeta.symbol}`;

    addLog(Role.USER, `正在发起: ${action} -> ${to}...`, 'info');
    try {
      const value = parseUnits(String(val), ctx.tokenMeta.decimals);
      const tx = await ctx.contracts.user.transfer(to, value);
      addLog(Role.USER, `交易已发送，等待确认... Tx: ${tx.hash.substring(0, 10)}...`, 'info');
      await tx.wait();
      addLog(Role.USER, `成功: ${action} 已上链确认。`, 'success');
      await refreshOnchainState();
    } catch (e: any) {
      addLog(Role.USER, `转账失败: ${logEthersError('transfer failed', e)}`, 'error');
    }
  };

  // --- Views ---
  
  if (view === 'setup') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-lg space-y-8">
            <div className="text-center">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Web3 RBAC 权限管理控制台</h1>
                <p className="mt-2 text-sm text-gray-500">配置环境与密钥以开始模拟。</p>
            </div>
            
            <Card className="shadow-xl shadow-gray-200/50">
                <div className="space-y-4">
                    <Input label="合约地址 (Contract Address)" value={config.contractAddress} onChange={e => setConfig({...config, contractAddress: e.target.value})} placeholder="0x..." />
                    <Input label="RPC 节点 (RPC Endpoint)" type="password" value={config.rpcEndpoint} onChange={e => setConfig({...config, rpcEndpoint: e.target.value})} placeholder="https://..." />
                    <div className="h-px bg-gray-100 my-4"></div>
                    <Input type="password" label="管理员私钥 (Admin Key)" value={config.adminKey} onChange={e => setConfig({...config, adminKey: e.target.value})} placeholder="0x..." />
                    <Input type="password" label="暂停员私钥 (Pauser Key)" value={config.pauserKey} onChange={e => setConfig({...config, pauserKey: e.target.value})} placeholder="0x..." />
                    <Input type="password" label="合规员私钥 (Compliance Key)" value={config.complianceKey} onChange={e => setConfig({...config, complianceKey: e.target.value})} placeholder="0x..." />
                    <Input type="password" label="普通用户私钥 (User Key)" value={config.userKey} onChange={e => setConfig({...config, userKey: e.target.value})} placeholder="0x..." />
                    
                    <div className="pt-4">
                        <Button className="w-full py-3 text-base" onClick={handleStart}>初始化系统 (Initialize)</Button>
                    </div>
                </div>
            </Card>
        </div>
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F7] text-gray-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-gray-200/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold tracking-tight text-gray-900">控制中心 (Control Center)</h1>
            <span className="hidden sm:inline-block px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-500 border border-gray-200">
                {config.contractAddress || '未连接'}
            </span>
        </div>
        <Button variant="ghost" className="text-sm" onClick={handleGlobalRefresh}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21.5 2v6h-6"/><path d="M2.5 22v-6h6"/><path d="M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8"/><path d="M22 12.5a10 10 0 0 1-18.8 4.2L2.5 16"/></svg>
            刷新 (Refresh)
        </Button>
      </header>

      {/* Main Grid */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-6 h-[calc(100vh-250px)] overflow-y-auto pb-6">
        <AdminPanel 
            balance={appState.balances.adminEth}
            onGrantRole={handleGrantRole}
            onRevokeRole={handleRevokeRole}
        />
        <CircuitBreakerPanel 
            balance={appState.balances.pauserEth}
            isPaused={appState.isPaused}
            onTogglePause={handleTogglePause}
        />
        <CompliancePanel 
            balance={appState.balances.complianceEth}
            isBlacklisted={appState.isBlacklisted}
            onUpdateStatus={handleComplianceUpdate}
        />
        <UserWalletPanel 
            balanceEth={appState.balances.userEth}
            balanceTokens={appState.balances.userTokens}
            isBlacklisted={appState.isBlacklisted}
            isPaused={appState.isPaused}
            onTransfer={handleTransfer}
        />
      </main>

      {/* Logs Footer */}
      <div className="h-[200px] bg-[#1a1b1e] text-gray-300 font-mono text-sm border-t border-gray-800 flex flex-col">
        <div className="px-4 py-2 bg-[#25262b] border-b border-gray-800 flex justify-between items-center select-none">
            <span className="text-xs uppercase tracking-wider font-semibold text-gray-500">系统日志 (System Logs)</span>
            <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/20"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/20"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/20"></div>
            </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 scrollbar-hide">
            {logs.length === 0 && <div className="text-gray-600 italic">暂无活动记录...</div>}
            {logs.map((log) => (
                <div key={log.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-1 duration-200">
                    <span className="text-gray-500 min-w-[100px]">{log.timestamp}</span>
                    <span className={`min-w-[80px] font-bold ${
                        log.role === Role.ADMIN ? 'text-blue-400' : 
                        log.role === Role.PAUSER ? 'text-yellow-400' :
                        log.role === Role.COMPLIANCE ? 'text-purple-400' :
                        log.role === Role.USER ? 'text-orange-400' : 'text-gray-400'
                    }`}>
                        [{log.role}]
                    </span>
                    <span className={`${
                        log.type === 'error' ? 'text-red-400' :
                        log.type === 'success' ? 'text-green-400' : 'text-gray-300'
                    }`}>
                        {log.message}
                    </span>
                </div>
            ))}
            <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
};

export default App;
