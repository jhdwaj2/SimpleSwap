"use client";
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
// 引入我们刚才定义的配置
import { DOG_ADDRESS, CAT_ADDRESS, SWAP_ADDRESS, ERC20_ABI, SWAP_ABI } from "../src/constants";

export default function Home() {
  const [account, setAccount] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  // 新增状态：代币余额和池子状态
  const [dogBalance, setDogBalance] = useState("0");
  const [catBalance, setCatBalance] = useState("0");
  const [reserveA, setReserveA] = useState("0");
  const [reserveB, setReserveB] = useState("0");

  const connectWallet = async () => {
    if (typeof window.ethereum === "undefined") return alert("请安装 MetaMask");
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accounts[0]);
      setIsConnected(true);
    } catch (error) {
      console.error(error);
    }
  };

  // --- 核心：读取链上数据 ---
  // 使用 useCallback 避免无限循环重渲染
  const fetchData = useCallback(async () => {
    if (!isConnected || !window.ethereum) return;

    try {
      // 1. 建立连接提供者 (Provider) - 它是通往区块链的读写管道
      const provider = new ethers.BrowserProvider(window.ethereum);

      // 2. 创建合约实例 (只读模式)
      const dogContract = new ethers.Contract(DOG_ADDRESS, ERC20_ABI, provider);
      const catContract = new ethers.Contract(CAT_ADDRESS, ERC20_ABI, provider);
      const swapContract = new ethers.Contract(SWAP_ADDRESS, SWAP_ABI, provider);

      // 3. 并行读取数据 (Promise.all 提速)
      const [balDog, balCat, reserves] = await Promise.all([
        dogContract.balanceOf(account),
        catContract.balanceOf(account),
        swapContract.getReserves()
      ]);

      // 4. 格式化数据 (把 Wei 变成人类可读的数字)
      setDogBalance(ethers.formatEther(balDog));
      setCatBalance(ethers.formatEther(balCat));
      setReserveA(ethers.formatEther(reserves[0]));
      setReserveB(ethers.formatEther(reserves[1]));

    } catch (err) {
      console.error("读取数据失败:", err);
    }
  }, [account, isConnected]);

  // 当连接状态或账户改变时，触发数据读取
  useEffect(() => {
    if (isConnected) {
      fetchData();
    }
  }, [isConnected, fetchData]);

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-8 text-purple-400">🦄 SimpleSwap</h1>

      <div className="w-full max-w-2xl space-y-6">
        {/* 钱包连接区 */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex justify-between items-center">
          <div>
            <p className="text-gray-400 text-sm">当前账户</p>
            <p className="font-mono text-yellow-400">
              {isConnected ? `${account.slice(0, 6)}...${account.slice(-4)}` : "未连接"}
            </p>
          </div>
          {!isConnected && (
            <button onClick={connectWallet} className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-bold">
              连接钱包
            </button>
          )}
          {isConnected && (
            <button onClick={fetchData} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm">
              🔄 刷新数据
            </button>
          )}
        </div>

        {/* 数据展示区 (只有连接后才显示) */}
        {isConnected && (
          <div className="grid grid-cols-2 gap-4">
            {/* 左边：我的余额 */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h2 className="text-xl font-bold mb-4 text-blue-300">💰 我的钱包</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Doge:</span>
                  <span className="font-mono">{parseFloat(dogBalance).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cat:</span>
                  <span className="font-mono">{parseFloat(catBalance).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* 右边：资金池状态 */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h2 className="text-xl font-bold mb-4 text-pink-300">🏦 交易所资金池</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Reserve Doge:</span>
                  <span className="font-mono">{parseFloat(reserveA).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Reserve Cat:</span>
                  <span className="font-mono">{parseFloat(reserveB).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}