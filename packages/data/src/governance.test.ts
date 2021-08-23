import { BigNumber, ethers } from "ethers";
import { 
    Network, blocks, blocksPaged, epochs, producer, producerRewardCollectorChanges,
    producers, producerSetChanges, rewardSchedule
} from "./";

async function rewardCalculation(network: Network) {
    const currentRewardSchedule = await rewardSchedule({network});
    const allEpochs = (await epochs({startEpochNumber: 1, endEpochNumber: currentRewardSchedule.lastEpoch.epochNumber, includeRewards: true, network}));
    const startEpoch = allEpochs[0];
    const [startBlockResult, startRewardScheduleResult] = await Promise.all([
        blocks({startBlock: startEpoch.startBlock?.number, endBlock: startEpoch.endBlock?.number, network}),
        rewardSchedule({block: startEpoch.startBlock?.number, network})
    ]);
    
    expect(startBlockResult[0].timestamp).toBeGreaterThanOrEqual(startRewardScheduleResult?.activeRewardScheduleEntry?.startTime);

    expect(startBlockResult[startBlockResult.length - 2].timestamp).toBeLessThan(
        startEpoch.startBlock?.timestamp + startRewardScheduleResult?.activeRewardScheduleEntry?.epochDuration);
    expect(startBlockResult[startBlockResult.length - 1].timestamp).toBeGreaterThanOrEqual(
        startEpoch.startBlock?.timestamp + startRewardScheduleResult?.activeRewardScheduleEntry?.epochDuration);

    const allTimeProducerBlocks = {} as {[address: string]: number};
    let previousEpoch: typeof startEpoch | undefined = undefined;

    for(let i = 0 ; i < allEpochs.length ; ++i) {
        const epochProducerBlocks = {} as {[address: string]: number};
        let epochTotalBlocks = 0, epochProducerBlockCount = 0;

        const epoch = allEpochs[i];
        const [blockResult, rewardScheduleResult, producersResult] = await Promise.all([
            blocks({startBlock: epoch.startBlock?.number, endBlock: epoch.endBlock?.number, network}),
            rewardSchedule({block: epoch.startBlock?.number, network}),
            producers({block: epoch.endBlock?.number + 1, network})
        ]);

        blockResult.forEach(block => {
            ++epochTotalBlocks;
            if (block.fromActiveProducer) {
                ++epochProducerBlockCount;
                epochProducerBlocks[block.author] = (epochProducerBlocks[block.author] ?? 0) + 1;
                allTimeProducerBlocks[block.author] = (allTimeProducerBlocks[block.author] ?? 0) + 1;
            }
        });

        epoch.producerRewards?.forEach(reward => {
            const numberOfBlocks = epochProducerBlocks[reward.address] ?? 0;
            expect(reward.blocksProduced).toEqual(numberOfBlocks);

            let ratioOfBlocks = epochProducerBlockCount === 0 ? 0 : Math.floor(numberOfBlocks * 10000 / epochProducerBlockCount);
            let newRewards = BigInt(ratioOfBlocks) * rewardScheduleResult?.activeRewardScheduleEntry?.rewardsPerEpoch;
            expect(reward.blocksProducedRatio).toEqual(ratioOfBlocks / 10000);
            expect(reward.totalRewards).toEqual(
                newRewards / BigInt(10000) 
                + ((previousEpoch?.producerRewards?.find(x => x.address === reward.address)?.totalRewards) ?? BigInt(0))
            );
        });

        producersResult.forEach(producer => {
            expect(producer.confirmedBlocks).toEqual(allTimeProducerBlocks[producer.id] ?? 0);
        });

        previousEpoch = epoch;
    }
}

describe("governance", () => {
    describe("producer", () => {
        it("ropsten", async () => {
            const result = await producer({producerAddress: "0xfbb61b8b98a59fbc4bd79c23212addbefaeb289f", network: "ropsten", block: 10766537});
            expect(result).not.toBeUndefined();
            expect(result?.active).toEqual(true);
            expect(result?.rewardCollector).toBeNull();
            expect(result?.pendingEpochBlocks).toEqual(3);
            expect(BigNumber.from(result?.rewards)).toEqual(BigNumber.from("0x4bbbef0d112343e80000"));

            const result2 = await producer({producerAddress: "0x9ffed2297c7b81293413550db675073ab46980b2", network: "ropsten", block: 10766537});
            expect(result2).not.toBeUndefined();
            expect(result2?.active).toEqual(true);
            expect(result2?.rewardCollector).toEqual("0x5b0ac3279dbf84bb8da59be1ecab118198f022e5");
            expect(result2?.pendingEpochBlocks).toEqual(3);
            expect(BigNumber.from(result2?.rewards)).toEqual(BigNumber.from("0x335c00fcaa3b895b8000"));
        });
    });

    describe("producers", () => {
        it("ropsten", async () => {
            const result = await producers({network: "ropsten", block: 10766537});

            const x86 = result.find(x => x.id === "0x9ffed2297c7b81293413550db675073ab46980b2");
            expect(x86).not.toBeUndefined();
            expect(x86?.active).toEqual(true);
            expect(x86?.rewardCollector).toEqual("0x5b0ac3279dbf84bb8da59be1ecab118198f022e5");

            const x2f = result.find(x => x.id === "0xfbb61b8b98a59fbc4bd79c23212addbefaeb289f");
            expect(x2f).not.toBeUndefined();
            expect(x2f?.active).toEqual(true);
            expect(x2f?.rewardCollector).toBeNull();
        });
    });

    describe("producerSetChanges", () => {
        it("ropsten", async () => {
            const result = await producerSetChanges({startBlock: 10765377, endBlock: 10765439, network: "ropsten"});
            expect(result.length).toEqual(2);

            expect(result[0].blockNumber).toEqual(10765377);
            expect(result[0].changeType).toEqual("Added");
            expect(result[0].producer).toEqual("0x977546fc3c7d8295282f1eaa943441eb498022c7");
        
            expect(result[1].blockNumber).toEqual(10765439);
            expect(result[1].changeType).toEqual("Added");
            expect(result[1].producer).toEqual("0xecc482245127f2dd69aaf849f18064459506157b");
        });
    });

    describe("producerRewardCollectorChanges", () => {
        it("ropsten", async () => {
            const result = await producerRewardCollectorChanges({startBlock: 10765191, endBlock: 10765193, network: "ropsten"});
            expect(result.length).toEqual(1);

            expect(result[0].blockNumber).toEqual(10765192);
            expect(result[0].producer).toEqual("0x0c91bd44ea7877af95ee905342b9b88f4fff961c");
            expect(result[0].rewardCollector).toEqual("0x3278466301a1d5152f3ad297698f247cb1496393");
        });
    });

    describe("blocks", () => {
        it("ropsten", async () => {
            const results = await blocks({
                startBlock: 10766656,
                endBlock:  10766657,
                network: 'ropsten'
            });
            expect(results.length).toEqual(2);

            expect(results[0].number).toEqual(10766656);
            expect(results[0].id).toEqual("0x3224b0dcf26fdb05ebc7f3f63a38f2315ddbf5f41ef33dacd368c8d404a9400e");
            expect(results[0].author).toEqual("0x09ab1303d3ccaf5f018cd511146b07a240c70294");
            expect(results[0].timestamp).toEqual(1628008365);

            expect(results[1].number).toEqual(10766657);
            expect(results[1].id).toEqual("0xc707df242c600ce72d2c7bfb518455ac233e398a99d4b181f81bf5b5a09d542b");
            expect(results[1].author).toEqual("0x09ab1303d3ccaf5f018cd511146b07a240c70294");
            expect(results[1].timestamp).toEqual(1628008376);
        });
    });

    describe("blocksPaged", () => {
        it("mainnet", async () => {
            const results = await blocksPaged({start: 0, num: 10, network: "mainnet"});
            expect(results.length).toEqual(10);
        });
    });

    describe("rewardSchedule", () => {
        it("ropsten", async () => {
            const result = await rewardSchedule({block: 10766657, network: "ropsten"});

            expect(result).not.toBeUndefined();
            expect(result?.id).toEqual("0x2ee6af00afd2470f4421f4f5198bd4b30efcbee2");

            expect(result?.activeRewardScheduleEntry).not.toBeUndefined();
            expect(BigNumber.from(result?.activeRewardScheduleEntry.rewardsPerEpoch)).toEqual(BigNumber.from("0xffb5866c434d940000"));

            expect(result?.lastEpoch).not.toBeUndefined();
            expect(result?.lastEpoch.epochNumber).toEqual(41);

            expect(result?.pendingEpoch).not.toBeUndefined();
            expect(result?.pendingEpoch.epochNumber).toEqual(42);
        });

        it("mainnet", async () => {
            const result = await rewardSchedule();

            expect(result).not.toBeUndefined();
            expect(result.pendingEpoch.producerBlocksRatio).toBeGreaterThan(0);
        });
    });

    describe("reward calculation", () => {
        it("ropsten", async () => rewardCalculation("ropsten"));
        it("mainnet", async () => rewardCalculation("mainnet"));
    })
});
