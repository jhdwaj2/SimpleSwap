// 1. 填入刚才 Terminal 2 输出的地址
export const DOG_ADDRESS = "0xa1ea3C8a5Fe5bFCAbC11865198481A99a1f42a23";
export const CAT_ADDRESS = "0x9eb65B8fB2Cb3b506ee96eA31F204454c2b9e172";
export const SWAP_ADDRESS = "0x335a3c65C940c9bfDA964747C16CfA55d0e051D7";

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