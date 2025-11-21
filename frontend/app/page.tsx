"use client";
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { DOG_ADDRESS, CAT_ADDRESS, SWAP_ADDRESS, ERC20_ABI, SWAP_ABI } from "../src/constants";

export default function Home() {
  // --- 状态变量 ---
  const [account, setAccount] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // 加载状态

  // 数据展示
  const [dogBalance, setDogBalance] = useState("0");
  const [catBalance, setCatBalance] = useState("0");
  const [reserveA, setReserveA] = useState("0");
  const [reserveB, setReserveB] = useState("0");

  // 表单输入
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");

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

  const fetchData = useCallback(async () => {
    if (!isConnected || !window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const dogContract = new ethers.Contract(DOG_ADDRESS, ERC20_ABI, provider);
      const catContract = new ethers.Contract(CAT_ADDRESS, ERC20_ABI, provider);
      const swapContract = new ethers.Contract(SWAP_ADDRESS, SWAP_ABI, provider);

      const [balDog, balCat, reserves] = await Promise.all([
        dogContract.balanceOf(account),
        catContract.balanceOf(account),
        swapContract.getReserves()
      ]);

      setDogBalance(ethers.formatEther(balDog));
      setCatBalance(ethers.formatEther(balCat));
      setReserveA(ethers.formatEther(reserves[0]));
      setReserveB(ethers.formatEther(reserves[1]));
    } catch (err) {
      console.error(err);
    }
  }, [account, isConnected]);

  useEffect(() => {
    if (isConnected) fetchData();
  }, [isConnected, fetchData]);

  // --- 核心功能：添加流动性 ---
  const handleAddLiquidity = async () => {
    if (!amountA || !amountB) return alert("请输入数量");
    setIsLoading(true);

    try {
      // 1. 获取 Signer (签名者) - 只有它能发送交易
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // 2. 创建带签名的合约实例 (与只读实例不同！)
      const dogContract = new ethers.Contract(DOG_ADDRESS, ERC20_ABI, signer);
      const catContract = new ethers.Contract(CAT_ADDRESS, ERC20_ABI, signer);
      const swapContract = new ethers.Contract(SWAP_ADDRESS, SWAP_ABI, signer);

      // 3. 转换单位 (String -> BigInt)
      const parsedAmountA = ethers.parseEther(amountA);
      const parsedAmountB = ethers.parseEther(amountB);

      console.log("1. 正在授权 DogToken...");
      const txApproveA = await dogContract.approve(SWAP_ADDRESS, parsedAmountA);
      await txApproveA.wait(); // 等待链上确认

      console.log("2. 正在授权 CatToken...");
      const txApproveB = await catContract.approve(SWAP_ADDRESS, parsedAmountB);
      await txApproveB.wait();

      console.log("3. 正在添加流动性...");
      const txAdd = await swapContract.addLiquidity(parsedAmountA, parsedAmountB);
      await txAdd.wait();

      alert("✅ 流动性添加成功！");

      // 4. 清空表单并刷新数据
      setAmountA("");
      setAmountB("");
      fetchData();

    } catch (error: any) {
      console.error(error);
      alert("交易失败: " + (error.reason || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
        🦄 SimpleSwap Dashboard
      </h1>

      <div className="w-full max-w-3xl space-y-6">
        {/* 顶部连接栏 */}
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex justify-between items-center">
          <span className="text-gray-400">
            {isConnected ? `🟢 ${account}` : "🔴 未连接"}
          </span>
          {!isConnected && (
            <button onClick={connectWallet} className="bg-blue-600 px-4 py-2 rounded font-bold">Connect</button>
          )}
        </div>

        {isConnected && (
          <>
            {/* 数据看板 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h2 className="text-lg font-bold text-blue-300 mb-2">我的钱包余额</h2>
                <p>🐕 Doge: {parseFloat(dogBalance).toFixed(2)}</p>
                <p>🐈 Cat : {parseFloat(catBalance).toFixed(2)}</p>
              </div>
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h2 className="text-lg font-bold text-pink-300 mb-2">资金池储备 (Liquidity)</h2>
                <p>📦 Reserve A: {parseFloat(reserveA).toFixed(2)}</p>
                <p>📦 Reserve B: {parseFloat(reserveB).toFixed(2)}</p>
              </div>
            </div>

            {/* 操作面板：添加流动性 */}
            <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-lg">
              <h2 className="text-2xl font-bold mb-6">➕ 添加流动性 (Add Liquidity)</h2>
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <label className="block text-sm text-gray-400 mb-2">Doge 数量</label>
                  <input
                    type="number"
                    value={amountA}
                    onChange={(e) => setAmountA(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded p-3 focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="0.0"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-gray-400 mb-2">Cat 数量</label>
                  <input
                    type="number"
                    value={amountB}
                    onChange={(e) => setAmountB(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded p-3 focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="0.0"
                  />
                </div>
              </div>

              <button
                onClick={handleAddLiquidity}
                disabled={isLoading}
                className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${isLoading
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-[1.02]"
                  }`}
              >
                {isLoading ? "交易处理中 (请在钱包确认)..." : "🚀 批准并添加流动性"}
              </button>
              <p className="text-xs text-gray-500 mt-4 text-center">
                注意：你需要连续确认 3 笔交易 (Approve Doge - Approve Cat - Add Liquidity)
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}