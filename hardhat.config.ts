import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
// 引入 dotenv 来读取 .env 文件
import * as dotenv from "dotenv";
dotenv.config();

// 简单的检查，防止报错
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

const config: HardhatUserConfig = {
    // 显式配置 Solidity 编译器设置
    solidity: {
        version: "0.8.28",
        settings: {
            // 1. 强制指定 EVM 版本为 shanghai (包含 PUSH0 指令)
            // 这样可以确保与 Etherscan 的默认行为一致
            evmVersion: "shanghai",
            // 2. 显式开启优化器，并设置为 200 runs
            // 这样我们在 Etherscan 上就可以直接选 "Optimization: Yes"
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        hardhat: {
            chainId: 1337,
        },
        localhost: {
            url: "http://127.0.0.1:8545",
            chainId: 1337,
        },
        // 配置 Sepolia 网络
        sepolia: {
            url: SEPOLIA_RPC_URL,
            accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [], // 使用你的私钥
            chainId: 11155111, // Sepolia 的链 ID
        },
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY,
    },
};

export default config;