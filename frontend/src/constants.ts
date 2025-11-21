// 1. 填入刚才 Terminal 2 输出的地址
export const DOG_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
export const CAT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
export const SWAP_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

// 2. 定义接口 (ABI)
// 为了省事，我们这里使用 "Human-Readable ABI" (Ethers.js 特性)
// 只需要列出我们要用到的函数即可，不需要复制一大坨 JSON
export const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 value) returns (bool)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
];

export const SWAP_ABI = [
    "function getReserves() view returns (uint256, uint256)",
    "function addLiquidity(uint256 amountA, uint256 amountB) external",
    "function swap(uint256 amountIn, address tokenIn, uint256 minAmountOut) external"
];