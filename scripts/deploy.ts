import { ethers } from "hardhat";

async function main() {
    // 1. 获取默认的“管理员”账户
    // 在本地网络中，Hardhat 会默认给你生成20个账号，第一个就是 owner
    const [owner] = await ethers.getSigners();

    console.log("🚀 开始部署合约...");
    console.log("👨‍✈️ 部署者地址 (Owner):", owner.address);

    // 2. 部署 DogeToken
    // getContractFactory 会去 artifacts 文件夹找编译好的字节码
    // 注意：这里的名字必须和你合约代码里的 `contract DogeToken` 名字一致（区分大小写）
    const DogToken = await ethers.getContractFactory("DogToken");
    const dog = await DogToken.deploy();

    await dog.waitForDeployment(); // 等待链上确认
    console.log(`🐕 DogeToken 部署成功，地址: ${await dog.getAddress()}`);

    // 3. 部署 CatToken
    const CatToken = await ethers.getContractFactory("CatToken");
    const cat = await CatToken.deploy();

    await cat.waitForDeployment();
    console.log(`🐈 CatToken 部署成功，地址: ${await cat.getAddress()}`);

    // 4. 查账 (验证环节)
    // 调用合约的 balanceOf 函数
    const dogeBalance = await dog.balanceOf(owner.address);
    const catBalance = await cat.balanceOf(owner.address);

    // ethers.formatEther 是把最小单位 Wei (10^18) 转换成我们会读的数字 (比如 1.0)
    console.log("\n💰 钱包余额核对:");
    console.log(`   - Doge 余额: ${ethers.formatEther(dogeBalance)}`);
    console.log(`   - Cat  余额: ${ethers.formatEther(catBalance)}`);
}

// 运行主函数，并处理可能出现的错误
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});