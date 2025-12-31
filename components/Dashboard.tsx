import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WalletBundle, ContractState, LogEntry, LogType } from '../types';
import { ERC20_RBAC_ABI, PAUSER_ROLE, BLACKLIST_ROLE } from '../constants';
import { Contract, formatEther, parseUnits, formatUnits, EthersError } from 'ethers';
import { Shield, PauseCircle, Ban, Wallet as WalletIcon, PlayCircle, CheckCircle, XCircle, Send, Terminal } from 'lucide-react';

interface DashboardProps {
  wallets: WalletBundle;
}

export const Dashboard: React.FC<DashboardProps> = ({ wallets }) => {
  // --- State ---
  const [contractState, setContractState] = useState<ContractState>({
    decimals: 18,
    symbol: 'TKN',
    isPaused: false,
    isUserBlacklisted: false,
    balances: {
      adminEth: '0',
      pauserEth: '0',
      complianceEth: '0',
      userEth: '0',
      userTokens: '0',
    },
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Inputs
  const [pauserAddressInput, setPauserAddressInput] = useState(wallets.pauser.address);
  const [complianceAddressInput, setComplianceAddressInput] = useState(wallets.compliance.address);
  const [targetUserAddressInput, setTargetUserAddressInput] = useState(wallets.user.address);
  const [transferAmount, setTransferAmount] = useState('100');

  // Loading States for Actions
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // --- Helpers ---
  const addLog = (source: LogEntry['source'], message: string, type: LogType, txHash?: string) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      source,
      message,
      type,
      txHash,
    };
    setLogs(prev => [...prev, newLog]);
  };

  const getContract = (wallet: any) => {
    return new Contract(wallets.contractAddress, ERC20_RBAC_ABI, wallet);
  };

  const parseError = (err: any): string => {
    if (err.reason) return err.reason;
    if (err.shortMessage) return err.shortMessage;
    if (err.info?.error?.message) return err.info.error.message;
    return err.message || "发生未知错误";
  };

  // --- Data Fetching ---
  const refreshData = useCallback(async () => {
    try {
      const provider = wallets.provider;
      const contract = getContract(wallets.provider); // Read-only

      const [
        decimals,
        symbol,
        isPaused,
        isBlacklisted,
        adminEth,
        pauserEth,
        complianceEth,
        userEth,
        userTokens
      ] = await Promise.all([
        contract.decimals(),
        contract.symbol(),
        contract.paused(),
        contract.isBlacklisted(wallets.user.address),
        provider.getBalance(wallets.admin.address),
        provider.getBalance(wallets.pauser.address),
        provider.getBalance(wallets.compliance.address),
        provider.getBalance(wallets.user.address),
        contract.balanceOf(wallets.user.address),
      ]);

      setContractState({
        decimals: Number(decimals),
        symbol,
        isPaused,
        isUserBlacklisted: isBlacklisted,
        balances: {
          adminEth: formatEther(adminEth),
          pauserEth: formatEther(pauserEth),
          complianceEth: formatEther(complianceEth),
          userEth: formatEther(userEth),
          userTokens: formatUnits(userTokens, Number(decimals)),
        }
      });
    } catch (e: any) {
      addLog('System', `获取数据失败: ${parseError(e)}`, 'error');
    }
  }, [wallets]);

  // Initial Load
  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 10000); // Auto refresh every 10s
    return () => clearInterval(interval);
  }, [refreshData]);

  // Scroll to bottom of logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);


  // --- Actions ---

  const handleGrantRole = async (roleName: string, roleHash: string, address: string) => {
    if (!address) return;
    setLoadingAction(`grant-${roleName}`);
    try {
      addLog('Admin', `正在授予 ${roleName} 给 ${address}...`, 'info');
      const contract = getContract(wallets.admin);
      const tx = await contract.grantRole(roleHash, address);
      addLog('Admin', '交易已发送，等待确认...', 'info', tx.hash);
      await tx.wait();
      addLog('Admin', `角色 ${roleName} 授权成功。`, 'success', tx.hash);
      refreshData();
    } catch (e: any) {
      addLog('Admin', `授权失败: ${parseError(e)}`, 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const handlePauseToggle = async (shouldPause: boolean) => {
    setLoadingAction('pause-toggle');
    try {
      const action = shouldPause ? '暂停' : '恢复';
      addLog('Pauser', `正在尝试 ${action} 合约...`, 'info');
      const contract = getContract(wallets.pauser);
      const tx = shouldPause ? await contract.pause() : await contract.unpause();
      addLog('Pauser', '交易已发送，等待确认...', 'info', tx.hash);
      await tx.wait();
      addLog('Pauser', `合约已成功 ${shouldPause ? '暂停' : '恢复'}。`, 'success', tx.hash);
      refreshData();
    } catch (e: any) {
      addLog('Pauser', `暂停操作失败: ${parseError(e)}`, 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleBlacklistToggle = async (shouldBlacklist: boolean) => {
    setLoadingAction('blacklist-toggle');
    try {
      const action = shouldBlacklist ? '拉黑' : '洗白';
      addLog('Compliance', `正在尝试 ${action} 用户 ${targetUserAddressInput}...`, 'info');
      const contract = getContract(wallets.compliance);
      const tx = shouldBlacklist 
        ? await contract.addToBlacklist(targetUserAddressInput) 
        : await contract.removeFromBlacklist(targetUserAddressInput);
      addLog('Compliance', '交易已发送，等待确认...', 'info', tx.hash);
      await tx.wait();
      addLog('Compliance', `用户已成功 ${shouldBlacklist ? '被拉黑' : '洗白'}。`, 'success', tx.hash);
      refreshData();
    } catch (e: any) {
      addLog('Compliance', `黑名单操作失败: ${parseError(e)}`, 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleTransfer = async () => {
    if (!transferAmount || isNaN(Number(transferAmount))) return;
    setLoadingAction('transfer');
    try {
      addLog('User', `正在转账 ${transferAmount} ${contractState.symbol} 给管理员...`, 'info');
      const contract = getContract(wallets.user);
      const amount = parseUnits(transferAmount, contractState.decimals);
      
      // Attempt transfer
      const tx = await contract.transfer(wallets.admin.address, amount);
      addLog('User', '交易已发送，等待确认...', 'info', tx.hash);
      await tx.wait();
      addLog('User', '转账成功。', 'success', tx.hash);
      refreshData();
    } catch (e: any) {
      // Robust error extraction for "EnforcedPause" or "Blacklisted"
      const errorMsg = parseError(e);
      addLog('User', `转账失败: ${errorMsg}`, 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  // --- UI Components ---
  const ActionButton = ({ onClick, loading, label, icon: Icon, colorClass, disabled }: any) => (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`flex items-center justify-center gap-2 px-4 py-2 rounded font-bold text-sm shadow-md transition-all
        ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-700 text-gray-400' : `${colorClass} text-white hover:brightness-110 active:scale-95`}
      `}
    >
      {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Icon size={16} />}
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-6 font-sans">
      <div className="max-w-7xl mx-auto h-full flex flex-col gap-6">
        
        {/* Header */}
        <header className="flex justify-between items-center bg-gray-900/50 p-4 rounded-xl border border-gray-800 backdrop-blur">
          <div className="flex items-center gap-3">
             <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
             <h2 className="font-bold text-lg tracking-wide text-white">Web3 智能合约管理终端</h2>
             <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded font-mono border border-gray-700">
               {wallets.contractAddress.substring(0, 8)}...{wallets.contractAddress.substring(38)}
             </span>
          </div>
          <button onClick={refreshData} className="text-xs text-blue-400 hover:text-blue-300 underline">刷新数据</button>
        </header>

        {/* 2x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 1. ADMIN PANEL (Red) */}
          <div className="bg-gray-900 border border-red-900/50 rounded-xl p-6 shadow-[0_0_20px_rgba(153,27,27,0.1)] relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-2 text-red-500">
                <Shield size={24} />
                <h3 className="text-xl font-bold">管理员 (ADMIN)</h3>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">ETH 余额</p>
                <p className="font-mono text-lg">{parseFloat(contractState.balances.adminEth).toFixed(4)} ETH</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-950/50 p-4 rounded-lg border border-gray-800">
                <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">授予暂停员角色 (Pauser Role)</label>
                <div className="flex gap-2">
                  <input 
                    className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs font-mono focus:border-red-500 outline-none"
                    value={pauserAddressInput}
                    onChange={(e) => setPauserAddressInput(e.target.value)}
                  />
                  <ActionButton 
                    onClick={() => handleGrantRole('PAUSER_ROLE', PAUSER_ROLE, pauserAddressInput)}
                    loading={loadingAction === 'grant-PAUSER_ROLE'}
                    label="授权"
                    icon={CheckCircle}
                    colorClass="bg-red-700"
                  />
                </div>
              </div>
              
              <div className="bg-gray-950/50 p-4 rounded-lg border border-gray-800">
                <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">授予合规员角色 (Compliance Role)</label>
                <div className="flex gap-2">
                  <input 
                    className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs font-mono focus:border-red-500 outline-none"
                    value={complianceAddressInput}
                    onChange={(e) => setComplianceAddressInput(e.target.value)}
                  />
                  <ActionButton 
                    onClick={() => handleGrantRole('BLACKLIST_ROLE', BLACKLIST_ROLE, complianceAddressInput)}
                    loading={loadingAction === 'grant-BLACKLIST_ROLE'}
                    label="授权"
                    icon={CheckCircle}
                    colorClass="bg-red-700"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. PAUSER PANEL (Yellow) */}
          <div className="bg-gray-900 border border-amber-900/50 rounded-xl p-6 shadow-[0_0_20px_rgba(180,83,9,0.1)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-2 text-amber-500">
                <PauseCircle size={24} />
                <h3 className="text-xl font-bold">暂停员 (PAUSER)</h3>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">ETH 余额</p>
                <p className="font-mono text-lg">{parseFloat(contractState.balances.pauserEth).toFixed(4)} ETH</p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center h-48 gap-4 bg-gray-950/30 rounded-lg border border-gray-800">
               <div className="text-center">
                 <p className="text-sm text-gray-400 mb-1">当前状态</p>
                 <span className={`text-2xl font-black tracking-wider px-4 py-1 rounded border ${contractState.isPaused ? 'text-red-500 border-red-900 bg-red-900/20' : 'text-green-500 border-green-900 bg-green-900/20'}`}>
                   {contractState.isPaused ? '已暂停' : '运行中'}
                 </span>
               </div>
               
               <div className="flex gap-4 mt-2">
                 <ActionButton 
                    onClick={() => handlePauseToggle(true)}
                    loading={loadingAction === 'pause-toggle'}
                    label="暂停合约"
                    icon={PauseCircle}
                    colorClass="bg-amber-600"
                    disabled={contractState.isPaused}
                  />
                  <ActionButton 
                    onClick={() => handlePauseToggle(false)}
                    loading={loadingAction === 'pause-toggle'}
                    label="恢复合约"
                    icon={PlayCircle}
                    colorClass="bg-green-700"
                    disabled={!contractState.isPaused}
                  />
               </div>
            </div>
          </div>

          {/* 3. COMPLIANCE PANEL (Blue) */}
          <div className="bg-gray-900 border border-blue-900/50 rounded-xl p-6 shadow-[0_0_20px_rgba(30,58,138,0.1)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-2 text-blue-500">
                <Ban size={24} />
                <h3 className="text-xl font-bold">合规员 (COMPLIANCE)</h3>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">ETH 余额</p>
                <p className="font-mono text-lg">{parseFloat(contractState.balances.complianceEth).toFixed(4)} ETH</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-950/50 p-4 rounded-lg border border-gray-800">
                <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">管理用户状态</label>
                <input 
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs font-mono mb-3 focus:border-blue-500 outline-none"
                  value={targetUserAddressInput}
                  onChange={(e) => setTargetUserAddressInput(e.target.value)}
                  placeholder="目标地址 (Target Address)"
                />
                
                <div className="flex justify-between items-center mb-4 p-2 bg-gray-900 rounded border border-gray-700">
                   <span className="text-xs text-gray-400">目标状态：</span>
                   <span className={`text-xs font-bold ${contractState.isUserBlacklisted ? 'text-red-500' : 'text-green-500'}`}>
                     {contractState.isUserBlacklisted ? '已拉黑 (BLACKLISTED)' : '正常 (CLEAN)'}
                   </span>
                </div>

                <div className="flex gap-3">
                  <ActionButton 
                    onClick={() => handleBlacklistToggle(true)}
                    loading={loadingAction === 'blacklist-toggle'}
                    label="拉黑"
                    icon={XCircle}
                    colorClass="bg-red-600 flex-1"
                    disabled={contractState.isUserBlacklisted}
                  />
                  <ActionButton 
                    onClick={() => handleBlacklistToggle(false)}
                    loading={loadingAction === 'blacklist-toggle'}
                    label="洗白"
                    icon={CheckCircle}
                    colorClass="bg-blue-600 flex-1"
                    disabled={!contractState.isUserBlacklisted}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. USER PANEL (Green) */}
          <div className="bg-gray-900 border border-emerald-900/50 rounded-xl p-6 shadow-[0_0_20px_rgba(6,78,59,0.1)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-2 text-emerald-500">
                <WalletIcon size={24} />
                <h3 className="text-xl font-bold">普通用户 (USER)</h3>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">代币余额</p>
                <p className="font-mono text-lg text-emerald-400">{parseFloat(contractState.balances.userTokens).toFixed(2)} {contractState.symbol}</p>
                <p className="text-xs text-gray-600 mt-1">{parseFloat(contractState.balances.userEth).toFixed(4)} ETH</p>
              </div>
            </div>

            <div className="bg-gray-950/50 p-4 rounded-lg border border-gray-800 h-48 flex flex-col justify-center">
               <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">转账给管理员</label>
               <div className="flex gap-2 mb-4">
                 <input 
                   type="number"
                   className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm font-mono focus:border-emerald-500 outline-none"
                   value={transferAmount}
                   onChange={(e) => setTransferAmount(e.target.value)}
                 />
                 <span className="flex items-center text-gray-500 font-bold text-sm">{contractState.symbol}</span>
               </div>
               <ActionButton 
                  onClick={handleTransfer}
                  loading={loadingAction === 'transfer'}
                  label="发送代币"
                  icon={Send}
                  colorClass="bg-emerald-700 w-full"
                />
               {contractState.isPaused && <p className="text-red-500 text-xs mt-2 text-center">⚠️ 合约已暂停</p>}
               {contractState.isUserBlacklisted && <p className="text-red-500 text-xs mt-2 text-center">⚠️ 账户已被拉黑</p>}
            </div>
          </div>

        </div>

        {/* LOG CONSOLE */}
        <div className="bg-black border border-gray-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-64">
           <div className="bg-gray-900 px-4 py-2 border-b border-gray-800 flex items-center gap-2">
             <Terminal size={16} className="text-gray-500" />
             <span className="text-xs font-mono text-gray-400">系统日志</span>
           </div>
           <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 scrollbar-thin">
             {logs.length === 0 && <span className="text-gray-700 italic">暂无活动...</span>}
             {logs.map((log) => (
               <div key={log.id} className="flex gap-3 hover:bg-gray-900/50 p-1 rounded">
                 <span className="text-gray-600 shrink-0">[{log.timestamp}]</span>
                 <span className={`font-bold shrink-0 w-24
                   ${log.source === 'Admin' ? 'text-red-500' : ''}
                   ${log.source === 'Pauser' ? 'text-amber-500' : ''}
                   ${log.source === 'Compliance' ? 'text-blue-500' : ''}
                   ${log.source === 'User' ? 'text-emerald-500' : ''}
                   ${log.source === 'System' ? 'text-gray-400' : ''}
                 `}>[{log.source}]</span>
                 <span className={`flex-1 break-all
                    ${log.type === 'error' ? 'text-red-400' : 'text-gray-300'}
                    ${log.type === 'success' ? 'text-green-400' : ''}
                 `}>
                   {log.message}
                   {log.txHash && <span className="ml-2 opacity-50 underline cursor-pointer hover:opacity-100 text-blue-400">Tx: {log.txHash.substring(0, 10)}...</span>}
                 </span>
               </div>
             ))}
             <div ref={logsEndRef} />
           </div>
        </div>

      </div>
    </div>
  );
};