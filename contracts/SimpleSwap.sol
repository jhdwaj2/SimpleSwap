// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SimpleSwap {
    // 状态变量：记录这个交易所支持哪两个代币
    IERC20 public tokenA;
    IERC20 public tokenB;

    // 状态变量：记录池子里的储备量 (Reserve)
    uint256 public reserveA;
    uint256 public reserveB;

    // 构造函数：部署时决定支持哪两个币
    constructor(address _tokenA, address _tokenB) {
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }

    // 功能：添加流动性 (也就是往池子里存钱)
    // amountA: 用户想存多少 TokenA
    // amountB: 用户想存多少 TokenB
    function addLiquidity(uint256 amountA, uint256 amountB) external {
        // 步骤 1: 把币从用户手里转到合约手里
        // 注意：这里需要用户先在前端或者脚本里 "approve" (授权) 给这个合约

        // 思考题：为什么这里用 transferFrom 而不是 transfer?
        require(
            tokenA.transferFrom(msg.sender, address(this), amountA),
            "Transfer A failed"
        );
        require(
            tokenB.transferFrom(msg.sender, address(this), amountB),
            "Transfer B failed"
        );

        // 步骤 2: 更新合约内部的账本
        reserveA += amountA;
        reserveB += amountB;
    }

    // 功能：查询当前池子的储备量
    function getReserves() external view returns (uint256, uint256) {
        return (reserveA, reserveB);
    }

    // 核心功能：交换代币
    // amountIn: 用户想要卖出的代币数量
    // tokenIn: 用户卖出的是哪种币的地址 (TokenA 还是 TokenB?)
    // minAmountOut: 用户要求最少买到多少币 (防止滑点过大，这是保护用户的)
    function swap(
        uint256 amountIn,
        address tokenIn,
        uint256 minAmountOut
    ) external {
        require(amountIn > 0, "Amount in must be greater than 0");
        require(
            tokenIn == address(tokenA) || tokenIn == address(tokenB),
            "Invalid token"
        );

        // 1. 判断方向：是用 A 换 B，还是用 B 换 A？
        bool isTokenA = tokenIn == address(tokenA);

        (
            IERC20 tIn,
            IERC20 tOut,
            uint256 reserveIn,
            uint256 reserveOut
        ) = isTokenA
                ? (tokenA, tokenB, reserveA, reserveB)
                : (tokenB, tokenA, reserveB, reserveA);

        // 2. 将用户的代币转入合约 (必须先 Approve)
        tIn.transferFrom(msg.sender, address(this), amountIn);

        // 3. 计算能换出多少代币 (核心算法 x * y = k)
        // 公式推导：
        // (reserveIn + amountIn) * (reserveOut - amountOut) = reserveIn * reserveOut
        // 解出 amountOut:
        // amountOut = (amountIn * reserveOut) / (reserveIn + amountIn)

        // 为了不仅让除法变 0，我们先做乘法。
        // 另外，为了收取 0.3% 的手续费，我们把 amountIn 乘以 997
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        uint256 amountOut = numerator / denominator;

        // 4. 检查是否满足用户的最低要求
        require(amountOut >= minAmountOut, "Insufficient output amount");

        // 5. 将换出来的币转给用户
        tOut.transfer(msg.sender, amountOut);

        // 6. 更新账本
        reserveA = tokenA.balanceOf(address(this));
        reserveB = tokenB.balanceOf(address(this));
    }
}
