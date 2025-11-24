// Sources flattened with hardhat v2.27.0 https://hardhat.org

// SPDX-License-Identifier: MIT

// File @openzeppelin/contracts/token/ERC20/IERC20.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (token/ERC20/IERC20.sol)

pragma solidity >=0.4.16;

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);
}

// File contracts/SimpleSwap.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.28;
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
