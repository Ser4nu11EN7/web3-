import React, { useState } from 'react';
import { SetupConfig } from '../types';
import { Wallet, JsonRpcProvider } from 'ethers';
import { Rocket, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface SetupViewProps {
  onSetupComplete: (config: SetupConfig, wallets: {
    provider: JsonRpcProvider;
    admin: Wallet;
    pauser: Wallet;
    compliance: Wallet;
    user: Wallet;
  }) => void;
}

const PasswordInput = ({ 
  label, 
  value, 
  onChange, 
  placeholder 
}: { 
  label: string, 
  value: string, 
  onChange: (v: string) => void, 
  placeholder: string 
}) => {
  const [show, setShow] = useState(false);
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-300"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
};

export const SetupView: React.FC<SetupViewProps> = ({ onSetupComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<SetupConfig>({
    contractAddress: '',
    rpcUrl: 'https://rpc.sepolia.org',
    adminKey: '',
    pauserKey: '',
    complianceKey: '',
    userKey: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Basic validation
      if (!Object.values(formData).every(val => (val as string).trim() !== '')) {
        throw new Error("所有字段均为必填项。");
      }

      // Initialize Ethers components
      const provider = new JsonRpcProvider(formData.rpcUrl);
      
      // Test connection (lightweight check)
      await provider.getNetwork();

      const wallets = {
        provider,
        admin: new Wallet(formData.adminKey, provider),
        pauser: new Wallet(formData.pauserKey, provider),
        compliance: new Wallet(formData.complianceKey, provider),
        user: new Wallet(formData.userKey, provider),
      };

      onSetupComplete(formData, wallets);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "初始化钱包失败，请检查 RPC URL 和私钥。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('https://picsum.photos/1920/1080?blur=10')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
      
      <div className="relative z-10 w-full max-w-2xl bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl p-8">
        <div className="flex items-center gap-3 mb-8 border-b border-gray-800 pb-4">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Rocket className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Web3 智能合约管理终端</h1>
            <p className="text-gray-400 text-sm">RBAC 资产权限配置与测试系统</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-800 rounded-lg flex items-center gap-3 text-red-200">
            <AlertCircle size={20} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-1">合约地址 (Contract Address)</label>
              <input
                type="text"
                value={formData.contractAddress}
                onChange={(e) => setFormData({...formData, contractAddress: e.target.value})}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="0x..."
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-1">RPC URL</label>
              <input
                type="text"
                value={formData.rpcUrl}
                onChange={(e) => setFormData({...formData, rpcUrl: e.target.value})}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>

            <PasswordInput 
              label="管理员私钥 (Admin/Deployer)" 
              value={formData.adminKey} 
              onChange={(k) => setFormData({...formData, adminKey: k})} 
              placeholder="0x..."
            />
            <PasswordInput 
              label="暂停员私钥 (Pauser)" 
              value={formData.pauserKey} 
              onChange={(k) => setFormData({...formData, pauserKey: k})} 
              placeholder="0x..."
            />
            <PasswordInput 
              label="合规员私钥 (Compliance)" 
              value={formData.complianceKey} 
              onChange={(k) => setFormData({...formData, complianceKey: k})} 
              placeholder="0x..."
            />
            <PasswordInput 
              label="普通用户私钥 (User)" 
              value={formData.userKey} 
              onChange={(k) => setFormData({...formData, userKey: k})} 
              placeholder="0x..."
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-lg
              ${isLoading ? 'bg-blue-800 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'}`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                正在初始化终端...
              </span>
            ) : (
              '🚀 启动管理终端'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};