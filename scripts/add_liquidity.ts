import { ethers } from "hardhat";

async function main() {
    // 1. 获取角色
    // 注意：getSigners 返回数组，Linda是第一个(索引0)，也就是部署者
    const [Linda, Jack, Lucas] = await ethers.getSigners();

    console.log("👥 角色分配:");
    console.log("   Linda (Owner):", Linda.address);
    console.log("   Jack:", Jack.address);
    console.log("   Lucas:", Lucas.address);

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

    // 4. 扶贫计划：Linda 给 Jack 和 Lucas 发钱 (FIX 2)
    console.log("\n💸 Linda 正在给 Jack 和 Lucas 转账...");
    const giftAmount = ethers.parseEther("100");
    await (await dog.connect(Linda).transfer(Jack.address, giftAmount)).wait();
    await (await cat.connect(Linda).transfer(Jack.address, giftAmount)).wait();
    await (await dog.connect(Linda).transfer(Lucas.address, giftAmount)).wait();
    await (await cat.connect(Linda).transfer(Lucas.address, giftAmount)).wait();
    console.log("✅ 转账完成，大家都有钱了");

    // 5. Linda 添加流动性
    console.log("\n--- Linda 操作中 ---");
    const amountLinda = ethers.parseEther("10");

    // 授权
    await (await dog.connect(Linda).approve(swap.target, amountLinda)).wait();
    await (await cat.connect(Linda).approve(swap.target, amountLinda)).wait();

    // 添加流动性 (FIX 3: 参数要和你的 Solidity 合约一致，只有两个参数)
    await (await swap.connect(Linda).addLiquidity(amountLinda, amountLinda)).wait();
    console.log("✅ Linda 添加流动性成功");

    // 6. Jack 添加流动性
    console.log("\n--- Jack 操作中 ---");
    const amountJack = ethers.parseEther("5"); // Jack 比较穷，少存点

    await (await dog.connect(Jack).approve(swap.target, amountJack)).wait();
    await (await cat.connect(Jack).approve(swap.target, amountJack)).wait();

    await (await swap.connect(Jack).addLiquidity(amountJack, amountJack)).wait();
    console.log("✅ Jack 添加流动性成功");

    // 7. Lucas 添加流动性
    console.log("\n--- Lucas 操作中 ---");
    const amountLucas = ethers.parseEther("20");

    await (await dog.connect(Lucas).approve(swap.target, amountLucas)).wait();
    await (await cat.connect(Lucas).approve(swap.target, amountLucas)).wait();

    await (await swap.connect(Lucas).addLiquidity(amountLucas, amountLucas)).wait();
    console.log("✅ Lucas 添加流动性成功");

    // 8. 最终查账
    console.log("\n📊 最终资金池状态:");
    // 获取合约当前的状态
    const [reserveA, reserveB] = await swap.getReserves();
    console.log(`   池子里的 Doge: ${ethers.formatEther(reserveA)}`);
    console.log(`   池子里的 Cat : ${ethers.formatEther(reserveB)}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});