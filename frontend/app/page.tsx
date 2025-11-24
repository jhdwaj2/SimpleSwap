"use client";
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { DOG_ADDRESS, CAT_ADDRESS, SWAP_ADDRESS, ERC20_ABI, SWAP_ABI } from "../src/constants";

export default function Home() {
  // --- 基础状态 ---
  const [account, setAccount] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"swap" | "pool">("swap"); // 页面切换

  // --- 链上数据 ---
  const [dogBalance, setDogBalance] = useState("0");
  const [catBalance, setCatBalance] = useState("0");
  const [reserveA, setReserveA] = useState("0"); // Doge Reserve
  const [reserveB, setReserveB] = useState("0"); // Cat Reserve

  // --- 交易输入状态 ---
  const [inputAmount, setInputAmount] = useState(""); // 用户输入的卖出数量
  const [outputAmount, setOutputAmount] = useState(""); // 自动计算的买入数量
  const [isSellingDog, setIsSellingDog] = useState(true); // true: 卖Dog买Cat, false: 卖Cat买Dog

  // --- 流动性输入状态 ---
  const [addAmountA, setAddAmountA] = useState("");
  const [addAmountB, setAddAmountB] = useState("");

  // 连接钱包
  const connectWallet = async () => {
    if (typeof window.ethereum === "undefined") return alert("请安装 MetaMask");
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accounts[0]);
      setIsConnected(true);
    } catch (error) { console.error(error); }
  };

  // 读取数据
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
    } catch (err) { console.error(err); }
  }, [account, isConnected]);

  useEffect(() => {
    if (isConnected) fetchData();
  }, [isConnected, fetchData]);

  // --- 核心算法：前端预估价格 ---
  // 当用户输入数字时，我们用 JS 算一下大概能换多少，提升体验
  useEffect(() => {
    if (!inputAmount || parseFloat(reserveA) === 0) {
      setOutputAmount("");
      return;
    }

    const amountIn = parseFloat(inputAmount);
    // 储备量根据方向决定
    const reserveIn = isSellingDog ? parseFloat(reserveA) : parseFloat(reserveB);
    const reserveOut = isSellingDog ? parseFloat(reserveB) : parseFloat(reserveA);

    // 恒定乘积公式 (含 0.3% 手续费)
    // y = (x * Y * 997) / (X * 1000 + x * 997)
    const amountInWithFee = amountIn * 997;
    const numerator = amountInWithFee * reserveOut;
    const denominator = (reserveIn * 1000) + amountInWithFee;
    const amountOut = numerator / denominator;

    setOutputAmount(amountOut.toFixed(6)); // 保留6位小数
  }, [inputAmount, reserveA, reserveB, isSellingDog]);


  // --- 功能 1: 执行 Swap 交易 ---
  const handleSwap = async () => {
    if (!inputAmount) return;
    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // 1. 确定合约和参数
      const tokenInAddress = isSellingDog ? DOG_ADDRESS : CAT_ADDRESS;
      const tokenInContract = new ethers.Contract(tokenInAddress, ERC20_ABI, signer);
      const swapContract = new ethers.Contract(SWAP_ADDRESS, SWAP_ABI, signer);

      const parsedAmountIn = ethers.parseEther(inputAmount);

      // 2. 授权 (Approve)
      console.log("Approving...");
      const txApprove = await tokenInContract.approve(SWAP_ADDRESS, parsedAmountIn);
      await txApprove.wait();

      // 3. 交易 (Swap)
      console.log("Swapping...");
      // minAmountOut 设为 0 (演示用，生产环境需要设为 outputAmount * 0.99 以防滑点)
      const txSwap = await swapContract.swap(parsedAmountIn, tokenInAddress, 0);
      await txSwap.wait();

      alert("✅ 交易成功！");
      setInputAmount("");
      fetchData();
    } catch (error: any) {
      console.error(error);
      alert("交易失败: " + (error.reason || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  // --- 功能 2: 添加流动性 (复用之前的逻辑) ---
  const handleAddLiquidity = async () => {
    if (!addAmountA || !addAmountB) return;
    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const dogContract = new ethers.Contract(DOG_ADDRESS, ERC20_ABI, signer);
      const catContract = new ethers.Contract(CAT_ADDRESS, ERC20_ABI, signer);
      const swapContract = new ethers.Contract(SWAP_ADDRESS, SWAP_ABI, signer);

      const amtA = ethers.parseEther(addAmountA);
      const amtB = ethers.parseEther(addAmountB);

      await (await dogContract.approve(SWAP_ADDRESS, amtA)).wait();
      await (await catContract.approve(SWAP_ADDRESS, amtB)).wait();
      await (await swapContract.addLiquidity(amtA, amtB)).wait();

      alert("✅ 流动性添加成功！");
      setAddAmountA("");
      setAddAmountB("");
      fetchData();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-900 text-white p-4">
      <h1 className="text-4xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
        🦄 SimpleSwap
      </h1>

      <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">

        {/* 头部状态栏 */}
        <div className="bg-gray-700 p-4 flex justify-between items-center text-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span>{isConnected ? `${account.slice(0, 6)}...` : "未连接"}</span>
          </div>
          {!isConnected && <button onClick={connectWallet} className="text-blue-300 font-bold">连接钱包</button>}
        </div>

        {/* Tab 切换 */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab("swap")}
            className={`flex-1 py-3 font-bold ${activeTab === 'swap' ? 'bg-gray-800 text-white border-b-2 border-purple-500' : 'bg-gray-700 text-gray-400'}`}
          >
            Swap (交易)
          </button>
          <button
            onClick={() => setActiveTab("pool")}
            className={`flex-1 py-3 font-bold ${activeTab === 'pool' ? 'bg-gray-800 text-white border-b-2 border-purple-500' : 'bg-gray-700 text-gray-400'}`}
          >
            Pool (资金池)
          </button>
        </div>

        <div className="p-6">
          {/* --- 页面 1: Swap --- */}
          {activeTab === "swap" && (
            <div className="space-y-4">
              {/* 输入框：卖出 */}
              <div className="bg-gray-900 p-4 rounded-xl border border-gray-600">
                <div className="flex justify-between mb-2 text-sm text-gray-400">
                  <span>Pay (卖出)</span>
                  <span>余额: {isSellingDog ? parseFloat(dogBalance).toFixed(2) : parseFloat(catBalance).toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    value={inputAmount}
                    onChange={(e) => setInputAmount(e.target.value)}
                    className="w-full bg-transparent text-2xl font-bold outline-none"
                    placeholder="0.0"
                  />
                  <button
                    onClick={() => setIsSellingDog(!isSellingDog)}
                    className="bg-gray-700 px-3 py-1 rounded-lg font-bold hover:bg-gray-600"
                  >
                    {isSellingDog ? "🐶 DOGE" : "🐱 CAT"}
                  </button>
                </div>
              </div>

              {/* 交换按钮 (视觉装饰) */}
              <div className="flex justify-center -my-2 relative z-10">
                <button
                  onClick={() => setIsSellingDog(!isSellingDog)}
                  className="bg-gray-700 p-2 rounded-full border-4 border-gray-800 hover:rotate-180 transition-transform"
                >
                  ⬇️
                </button>
              </div>

              {/* 输入框：买入 (只读) */}
              <div className="bg-gray-900 p-4 rounded-xl border border-gray-600">
                <div className="flex justify-between mb-2 text-sm text-gray-400">
                  <span>Receive (得到)</span>
                  <span>余额: {isSellingDog ? parseFloat(catBalance).toFixed(2) : parseFloat(dogBalance).toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    value={outputAmount}
                    readOnly
                    className="w-full bg-transparent text-2xl font-bold outline-none text-gray-400 cursor-not-allowed"
                    placeholder="0.0"
                  />
                  <span className="font-bold text-gray-300 px-3">
                    {isSellingDog ? "🐱 CAT" : "🐶 DOGE"}
                  </span>
                </div>
              </div>

              {/* 价格信息 */}
              {inputAmount && outputAmount && (
                <div className="flex justify-between text-sm text-gray-500 px-2">
                  <span>价格影响 (Price Impact)</span>
                  <span>自动计算中...</span>
                </div>
              )}

              {/* 主按钮 */}
              <button
                onClick={handleSwap}
                disabled={isLoading || !inputAmount}
                className={`w-full py-4 rounded-xl font-bold text-lg mt-4 ${isLoading ? "bg-gray-600" : "bg-purple-600 hover:bg-purple-700"
                  }`}
              >
                {isLoading ? "交易中..." : "🔥 立即交换 (Swap)"}
              </button>
            </div>
          )}

          {/* --- 页面 2: Pool --- */}
          {activeTab === "pool" && (
            <div className="space-y-6">
              {/* 现有流动性展示 */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-gray-700 p-3 rounded-lg">
                  <p className="text-xs text-gray-400">Doge Reserve</p>
                  <p className="font-mono font-bold">{parseFloat(reserveA).toFixed(2)}</p>
                </div>
                <div className="bg-gray-700 p-3 rounded-lg">
                  <p className="text-xs text-gray-400">Cat Reserve</p>
                  <p className="font-mono font-bold">{parseFloat(reserveB).toFixed(2)}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-gray-300">添加流动性</h3>
                <input
                  type="number"
                  placeholder="Doge 数量"
                  value={addAmountA}
                  onChange={(e) => setAddAmountA(e.target.value)}
                  className="w-full bg-gray-900 p-3 rounded-lg border border-gray-600 outline-none"
                />
                <input
                  type="number"
                  placeholder="Cat 数量"
                  value={addAmountB}
                  onChange={(e) => setAddAmountB(e.target.value)}
                  className="w-full bg-gray-900 p-3 rounded-lg border border-gray-600 outline-none"
                />
                <button
                  onClick={handleAddLiquidity}
                  disabled={isLoading}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-xl font-bold"
                >
                  {isLoading ? "处理中..." : "➕ 添加流动性"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}