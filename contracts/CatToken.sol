// SPDX-License-Identifier: MIT
// 1. 声明 Solidity 版本，通常与 Hardhat 配置一致
pragma solidity ^0.8.28;

// 2. 引入 OpenZeppelin 的 ERC20 标准合约
// 这就像是引入一个已经写好的“父类”
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// 3. 定义合约 TokenA，并声明它 "is" (继承自) ERC20
contract CatToken is ERC20 {
    // 4. 构造函数：合约部署的那一瞬间执行一次，之后永远不再执行
    constructor() ERC20("Cat Token", "CATD") {
        // "Cat Token" 是全名
        // "CATD" 是代币符号 (Symbol)

        // 5. 铸造代币 (Mint)
        // _mint 是 ERC20 父合约里的一个内部函数，用来凭空创造代币。
        // 参数1: 给谁？ msg.sender 就是部署这个合约的人（也就是你）。
        // 参数2: 给多少？ 1000 * 10^18。
        // 为什么是 10 ** 18？因为 Solidity 不支持小数。
        // 在以太坊里，1个代币通常等于 10的18次方个最小单位 (Wei)。
        _mint(msg.sender, 1000 * 10 ** 18);
    }
}
