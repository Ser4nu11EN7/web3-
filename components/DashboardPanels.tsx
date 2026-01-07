import React, { useState } from 'react';
import { Card, Button, Input, Badge } from './UI';

// --- Icons (Using SVG for low LCP/no dependency) ---
const Icons = {
  Shield: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Zap: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Lock: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Wallet: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"/></svg>,
};

// --- Panel 1: Admin Panel ---
interface AdminPanelProps {
  balance: number;
  onGrantRole: (role: string, address: string) => void;
  onRevokeRole: (role: string, address: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ balance, onGrantRole, onRevokeRole }) => {
  const [pauserAddr, setPauserAddr] = useState('');
  
  return (
    <Card 
      title="管理员控制台 (Admin Control)" 
      action={<div className="flex items-center gap-2 text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded-md">ETH: {balance.toFixed(4)}</div>}
      className="border-l-4 border-l-apple-blue"
    >
      <div className="space-y-6">
        {/* Manage Pauser */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Icons.Zap /> 管理暂停员角色 (Pauser)
          </div>
          <Input 
            placeholder="0x..." 
            value={pauserAddr} 
            onChange={(e) => setPauserAddr(e.target.value)} 
          />
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={() => onGrantRole('Pauser', pauserAddr || '新暂停员')}>授予权限 (Grant)</Button>
            <Button variant="ghost" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => onRevokeRole('Pauser', pauserAddr || '当前暂停员')}>撤销权限 (Revoke)</Button>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Manage Compliance */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Icons.Shield /> 管理合规员 (Compliance)
          </div>
          <div className="text-xs text-gray-400 mb-2">预设合规员地址</div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={() => onGrantRole('Compliance', '0xComp...Default')}>授予权限 (Grant)</Button>
            <Button variant="ghost" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => onRevokeRole('Compliance', '0xComp...Default')}>撤销权限 (Revoke)</Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

// --- Panel 2: Circuit Breaker ---
interface CircuitBreakerPanelProps {
  balance: number;
  isPaused: boolean;
  onTogglePause: (pause: boolean) => void;
}

export const CircuitBreakerPanel: React.FC<CircuitBreakerPanelProps> = ({ balance, isPaused, onTogglePause }) => {
  return (
    <Card 
      title="熔断机制控制 (Circuit Breaker)" 
      action={<div className="flex items-center gap-2 text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded-md">ETH: {balance.toFixed(4)}</div>}
      className={`border-l-4 transition-colors duration-500 ${isPaused ? 'border-l-apple-red' : 'border-l-apple-green'}`}
    >
      <div className="flex flex-col h-full justify-between py-2">
        
        <div className="flex flex-col items-center justify-center py-6 bg-gray-50 rounded-xl mb-6 border border-gray-100">
          <div className={`w-4 h-4 rounded-full mb-3 shadow-[0_0_10px_currentColor] transition-colors duration-500 ${isPaused ? 'bg-red-500 text-red-500' : 'bg-green-500 text-green-500'}`}></div>
          <span className="text-2xl font-bold tracking-tight text-gray-800">
            {isPaused ? '已暂停 (HALTED)' : '运行中 (OPERATIONAL)'}
          </span>
          <span className="text-xs text-gray-400 mt-1 uppercase tracking-wide">
            系统状态 (System Status)
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button 
            variant="danger" 
            disabled={isPaused} 
            onClick={() => onTogglePause(true)}
            className="h-12"
          >
            暂停合约
          </Button>
          <Button 
            variant="success" 
            disabled={!isPaused} 
            onClick={() => onTogglePause(false)}
            className="h-12"
          >
            恢复运行
          </Button>
        </div>
      </div>
    </Card>
  );
};

// --- Panel 3: Compliance ---
interface CompliancePanelProps {
  balance: number;
  isBlacklisted: boolean;
  onUpdateStatus: (blacklist: boolean) => void;
}

export const CompliancePanel: React.FC<CompliancePanelProps> = ({ balance, isBlacklisted, onUpdateStatus }) => {
  return (
    <Card 
      title="合规与反洗钱审查 (Compliance)" 
      action={<div className="flex items-center gap-2 text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded-md">ETH: {balance.toFixed(4)}</div>}
      className="border-l-4 border-l-purple-500"
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-gray-400 uppercase">目标用户状态</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-lg font-medium ${isBlacklisted ? 'text-red-600' : 'text-green-600'}`}>
                {isBlacklisted ? '受限 (Restricted)' : '正常 (Clean)'}
              </span>
              {isBlacklisted && <Icons.Lock />}
            </div>
          </div>
          <Badge 
            status={isBlacklisted ? 'danger' : 'active'} 
            text={isBlacklisted ? '已拉黑 (BLACKLISTED)' : '白名单 (WHITELISTED)'} 
          />
        </div>

        <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-gray-500 ml-1">操作 (Action)</label>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                className="bg-gray-800 text-white hover:bg-black shadow-lg shadow-gray-400/20"
                disabled={isBlacklisted}
                onClick={() => onUpdateStatus(true)}
              >
                拉黑用户
              </Button>
              <Button 
                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                disabled={!isBlacklisted}
                onClick={() => onUpdateStatus(false)}
              >
                解除拉黑
              </Button>
            </div>
        </div>
      </div>
    </Card>
  );
};

// --- Panel 4: User Wallet ---
interface UserWalletPanelProps {
  balanceEth: number;
  balanceTokens: number;
  isBlacklisted: boolean;
  isPaused: boolean;
  onTransfer: (amount: string) => void;
}

export const UserWalletPanel: React.FC<UserWalletPanelProps> = ({ balanceEth, balanceTokens, isBlacklisted, isPaused, onTransfer }) => {
  const [amount, setAmount] = useState('');

  const handleSend = () => {
    onTransfer(amount);
    setAmount('');
  };

  const isDisabled = isBlacklisted || isPaused;

  return (
    <Card 
      title="用户钱包 (User Wallet)" 
      className="border-l-4 border-l-orange-400"
      action={
        <div className="flex gap-2">
           {isPaused && <Badge status="warning" text="暂停中" />}
           {isBlacklisted && <Badge status="danger" text="已冻结" />}
        </div>
      }
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col items-center justify-center space-y-2 mb-6">
            <div className="text-4xl font-light tracking-tight text-gray-900">
                {balanceTokens.toLocaleString()} <span className="text-lg font-medium text-gray-500">TKN</span>
            </div>
            <div className="text-sm text-gray-400 font-mono">
                {balanceEth.toFixed(4)} ETH
            </div>
        </div>

        <div className="space-y-3">
          <Input 
            placeholder="转账数量 (Amount)" 
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isDisabled}
          />
          <Button 
            className="w-full bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20" 
            onClick={handleSend}
            disabled={isDisabled || !amount || parseFloat(amount) <= 0}
          >
            发送交易 (Send)
          </Button>
          {isDisabled && (
            <div className="text-xs text-center text-red-500 mt-2 bg-red-50 py-1 px-2 rounded">
              {isPaused ? "转账功能已被管理员暂停。" : "账户已被合规员冻结。"}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};