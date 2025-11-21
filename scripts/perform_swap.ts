import { ethers } from "hardhat";

async function main() {

    const [Linda, Jack] = await ethers.getSigners();

    console.log("👤 LP (Linda):", Linda.address);
    console.log("👤 Trader (Jack):", Jack.address);

    // 2. 部署代币
    console.log("\n🚀 部署代币...");
    const DogTokenFactory = await ethers.getContractFactory("DogToken");
    // 部署时，Linda 会自动获得所有初始代币
    const dog = await DogTokenFactory.connect(Linda).deploy();

    const CatTokenFactory = await ethers.getContractFactory("CatToken");
    const cat = await CatTokenFactory.connect(Linda).deploy();

    await dog.waitForDeployment();
    await cat.waitForDeployment();

    // FIX 1: 使用 .target 获取合约地址
    console.log("🐕 DogeToken 地址:", dog.target);
    console.log("🐈 CatToken 地址:", cat.target);

    // 3. 部署交易所
    console.log("\n🏦 部署交易所...");
    const SwapFactory = await ethers.getContractFactory("SimpleSwap");
    // FIX 1: 使用 .target
    const swap = await SwapFactory.connect(Linda).deploy(dog.target, cat.target);
    await swap.waitForDeployment();
    console.log("SimpleSwap 地址:", swap.target);

    // 添加流动性
    const liquidityAmount = ethers.parseEther("1000");
    await (await cat.connect(Linda).approve(swap.target, liquidityAmount)).wait();
    await (await dog.connect(Linda).approve(swap.target, liquidityAmount)).wait();
    await (await swap.connect(Linda).addLiquidity(liquidityAmount, liquidityAmount)).wait();

    // Linda空头100dog给jack
    const giftAmount = ethers.parseEther("100");
    await (await dog.connect(Linda).transfer(Jack.address, giftAmount)).wait();

    // jack进行swap将50dog换成50cat
    const swapAmount = ethers.parseEther("100");
    await (await dog.connect(Jack).approve(swap.target, swapAmount)).wait();

    await (await swap.connect(Jack).swap(swapAmount, dog.target, 0)).wait();
    console.log("✅ 交易完成！");
    const jackCatBalance = await cat.balanceOf(Jack.address);
    const jackDogBalance = await dog.balanceOf(Jack.address);

    console.log("\n📊 最终结果:");
    console.log(`   Jack 剩余 Doge: ${ethers.formatEther(jackDogBalance)}`);
    console.log(`   Jack 买到 Cat : ${ethers.formatEther(jackCatBalance)}`);
    // 获取合约当前的状态
    const [reserveA, reserveB] = await swap.getReserves();
    console.log(`   池子里的 Doge: ${ethers.formatEther(reserveA)}`);
    console.log(`   池子里的 Cat : ${ethers.formatEther(reserveB)}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});