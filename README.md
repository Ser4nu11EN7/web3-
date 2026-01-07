# Web3 RBAC Console

一个纯前端的 Web3 权限管理/演示控制台（React + Vite + ethers）。用于连接一个带 RBAC（AccessControl）的 ERC20 合约，在浏览器里直观地执行并观察：授权/撤权、暂停/恢复、黑名单、转账等操作以及链上回滚原因。

## 功能

- 连接任意 JSON-RPC 节点与合约地址
- 多角色视角：管理员 / 暂停员 / 合规员 / 普通用户（分别用不同私钥签名）
- 常用操作：`grantRole` / `revokeRole`、`pause` / `unpause`、`addToBlacklist` / `removeFromBlacklist`、`transfer`
- 终端式日志：展示调用结果与常见 revert（包含 `AccessControlUnauthorizedAccount` 等）

## 先决条件

- Node.js 18+（建议 20+）
- npm（或 pnpm/yarn，自行替换命令）

## 快速开始

```bash
npm install
npm run dev
```

启动后打开：`http://localhost:3000`

## 使用说明

1. 在 Setup 页面填写：
   - 合约地址（`Contract Address`）
   - RPC 节点（`RPC Endpoint`）
   - 4 个角色私钥（Admin / Pauser / Compliance / User）
2. 点击 `Initialize` 后进入 Dashboard。
3. 在各面板中执行授权/暂停/黑名单/转账等操作，底部日志会展示结果与失败原因。

## 合约要求（ABI）

本项目默认按 `web3.ts` 里的 `ERC20_RBAC_ABI` 与以下接口交互：

- AccessControl：`grantRole(bytes32,address)` / `revokeRole(bytes32,address)` / `hasRole(bytes32,address)`
- Pausable：`pause()` / `unpause()` / `paused()`
- Blacklist：`addToBlacklist(address)` / `removeFromBlacklist(address)` / `isBlacklisted(address)`
- ERC20：`decimals()` / `symbol()` / `balanceOf(address)` / `transfer(address,uint256)`

如果你的合约函数名/签名不同，请同步修改 `web3.ts`。

## 构建与预览

```bash
npm run build
npm run preview
```

构建产物在 `dist/`，可直接静态部署（GitHub Pages / Nginx / 任意静态托管）。

## 常见问题（FAQ）

- 页面“自动填入邮箱/奇怪的内容”？  
  这是浏览器/密码管理器对输入框的自动填充行为（无痕模式通常不会触发）。可关闭自动填充/密码管理器，或使用无痕窗口。

## 安全提示

本项目可能包含用于演示的硬编码配置（例如内置 RPC/合约/私钥等）。请勿在生产环境使用真实资产与敏感密钥；建议只在本地或隔离环境中运行。
