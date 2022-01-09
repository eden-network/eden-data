import { normalizeStake, getMultiplierForPercentile, applyMultiplier, stakerSEV, stakersSEV, getCumulativeNormalizedStake, networkSEV, getTotalCumulativeNormalizedStake, Network } from "./";
import { range } from "./constants";

const ZERO = BigInt(0);
const ONE_THOUSAND = BigInt(1000);

async function rewardCalcuation(startBlock: number, endBlock: number, network: Network) {
    const numBlocks = endBlock - startBlock + 1;
    const stakersPromise = Promise.all(range(numBlocks)
        .map(offset => stakersSEV({ block: startBlock + offset, network_: network })));
    const networksPromise = Promise.all(range(numBlocks)
        .map(offset => networkSEV({ block: startBlock + offset, network_: network })));
    const stakers = await stakersPromise;
    const networks = await networksPromise;

    if (networks[0].totalCumulativeNormalizedStakedLastBlock !== startBlock)
        throw new Error("Start on block with stake event");

    let totalCumulativeNormalized = networks[0].totalCumulativeNormalizedStaked;
    let accumulatedNormalized = ZERO;

    for (let i = 0; i < numBlocks ; ++i) {

        if (networks[i].totalCumulativeNormalizedStakedLastBlock === startBlock + i) {
            totalCumulativeNormalized = totalCumulativeNormalized + accumulatedNormalized;
            expect(networks[i].totalCumulativeNormalizedStaked).toEqual(totalCumulativeNormalized);
            accumulatedNormalized = ZERO;
        }
        
        const {total, totalNormalized} = stakers[i].reduce((prev, curr) => {
            const normalized = curr.normalizedStaked;
            accumulatedNormalized += normalized;
            return {
                total: prev.total + curr.staked,
                totalNormalized: prev.totalNormalized + normalized
            }
        }, {total: ZERO, totalNormalized: ZERO});

        expect(networks[i].totalStaked).toEqual(total);
        expect(networks[i].totalNormalizedStaked).toEqual(totalNormalized);

        const totalCumulativeNormalizedStake = getTotalCumulativeNormalizedStake(networks[0], startBlock, networks[i], startBlock + i);
        const calculatedTotalCumulativeNormalizedStake = totalCumulativeNormalized + accumulatedNormalized - networks[0].totalCumulativeNormalizedStaked;
        expect(totalCumulativeNormalizedStake).toEqual(calculatedTotalCumulativeNormalizedStake);
    }
}

describe("network-sev", () => {
    describe("normalizeStake", () => {
        it("undampened", () => {
            expect(normalizeStake(BigInt("0"), ONE_THOUSAND)).toEqual(BigInt("0"));
            expect(normalizeStake(BigInt("50000000000000000000"), ONE_THOUSAND)).toEqual(BigInt("50000000000000000000"));
            expect(normalizeStake(BigInt("100000000000000000000"), ONE_THOUSAND)).toEqual(BigInt("100000000000000000000"));
            expect(normalizeStake(BigInt("1000000000000000000000"), ONE_THOUSAND)).toEqual(BigInt("1000000000000000000000"));
        });

        it("dampened", () => {
            expect(normalizeStake(BigInt("1100000000000000000000"), ONE_THOUSAND)).toEqual(BigInt("1040000000000000000000"));
            expect(normalizeStake(BigInt("133700000000000000000000"), ONE_THOUSAND)).toEqual(BigInt("2456000000000000000000"));
        });
    });

    describe("getMultiplierForPercentile", () => {
        it("values", () => {
            expect(getMultiplierForPercentile(0)).toEqual(1);
            expect(getMultiplierForPercentile(10)).toEqual(1.2);
            expect(getMultiplierForPercentile(45)).toEqual(1.9);
            expect(getMultiplierForPercentile(50)).toEqual(2);
            expect(getMultiplierForPercentile(75)).toEqual(3);
            expect(getMultiplierForPercentile(95)).toEqual(3.8);
            expect(getMultiplierForPercentile(100)).toEqual(4);
        });

        it.skip("table", () => {
            const line = (nominalStake: number) => {
                const normalizedStake = normalizeStake(BigInt("1000000000000000000") * BigInt(nominalStake), ONE_THOUSAND);
                const s = Number((normalizedStake / BigInt("1000000000000000000")).toString());
                console.log(`${nominalStake}: ${getMultiplierForPercentile(0)*s} ${getMultiplierForPercentile(10)*s} ${getMultiplierForPercentile(20)*s} ${getMultiplierForPercentile(30)*s} ${getMultiplierForPercentile(40)*s} ${getMultiplierForPercentile(50)*s} ${getMultiplierForPercentile(60)*s} ${getMultiplierForPercentile(70)*s} ${getMultiplierForPercentile(80)*s} ${getMultiplierForPercentile(90)*s} ${getMultiplierForPercentile(100)*s}`)
            };

            line(0);
            line(100);
            line(500);
            line(1000);
            line(5000);
            line(10000);
            line(100000);
        });
    });
    
    describe("applyMultiplier", () => {
        it("values", () => {
            expect(applyMultiplier(BigInt("100000000000000000000"), 1)).toEqual(BigInt("100000000000000000000"));
            expect(applyMultiplier(BigInt("100000000000000000000"), 1.337)).toEqual(BigInt("133700000000000000000"));
            expect(applyMultiplier(BigInt("8035888000000000000000000"), 2.6399999999999997)).toEqual(BigInt("21213940731200000000000000"));
        });
    });

    describe("staker", () => {
        it("ropsten", async () => {
            const before = await stakerSEV({account: "0x6d048c853c4b335396f37f640ea517969ed50d43", block: 11416000, network: "ropsten" });
            expect(before).toBeUndefined();

            const start = await stakerSEV({account: "0x6d048c853c4b335396f37f640ea517969ed50d43", block: 11416340, network: "ropsten" });
            expect(start).not.toBeUndefined();
            expect(start.staked).toEqual(BigInt("1337000000000000000000"));
            expect(start.normalizedStaked).toEqual(BigInt("1072000000000000000000"));
            expect(start.cumulativeNormalizedStaked).toEqual(ZERO);
            expect(start.cumulativeNormalizedStakedLastBlock).toEqual(11416339);

            const end = await stakerSEV({account: "0x6d048c853c4b335396f37f640ea517969ed50d43", block: 11420091, network: "ropsten" });
            expect(end.staked).toEqual(BigInt("1000000000000000000000"));
            expect(end.normalizedStaked).toEqual(BigInt("1000000000000000000000"));
            expect(end.cumulativeNormalizedStaked).toEqual(BigInt("4021072000000000000000000"));
            expect(end.cumulativeNormalizedStakedLastBlock).toEqual(11420090);
            expect(end).not.toBeUndefined();
        });
    });

    describe("stakers", () => {
        it("ropsten", async () => {
            const result = await stakersSEV({ block: 11437311, network_: "ropsten" });
            expect(result).not.toBeUndefined();
            expect(result.length).toEqual(18);
        });
    });

    describe("getCumulativeNormalizedStake", () => {
        it("ropsten", async () => {
            const [first, last] = await Promise.all([
                stakerSEV({account: "0x6d048c853c4b335396f37f640ea517969ed50d43", block: 11416341, network: "ropsten" }),
                stakerSEV({account: "0x6d048c853c4b335396f37f640ea517969ed50d43", block: 11420340, network: "ropsten" })
            ]);
            const result = getCumulativeNormalizedStake(first, 11416341, last, 11420340);

            // verify the calculation
            const firstStake = normalizeStake(BigInt("1337000000000000000000"), ONE_THOUSAND);
            // from block [11416341, 11420089]
            const firstCumulative = firstStake * BigInt(3749);
            const secondStake = normalizeStake(BigInt("1000000000000000000000"), ONE_THOUSAND);
            // from block [11420090, 11420340]
            const secondCumulative = secondStake * BigInt(251);
            const cumulative = firstCumulative + secondCumulative;

            expect(result).toEqual(cumulative);
        });
    });

    describe("getTotalCumulativeNormalizedStake", () => {
        it("ropsten", async () => {
            const [first, last] = await Promise.all([
                networkSEV({ block: 11416341, network_: "ropsten" }),
                networkSEV({ block: 11420340, network_: "ropsten" })
            ]);
            const result = await getTotalCumulativeNormalizedStake(first, 11416341, last, 11420340);

            // verify the calculation
            const firstStake = BigInt("6530000000000000000000");
            // from block [11416341, 11420089]
            const firstCumulative = firstStake * BigInt(3749);
            const secondStake = BigInt("6458000000000000000000");
            const diff = firstStake - secondStake;
            expect(diff).toEqual(normalizeStake(BigInt("1337000000000000000000"), ONE_THOUSAND) - normalizeStake(BigInt("1000000000000000000000"), ONE_THOUSAND));
            // from block [11420090, 11420340]
            const secondCumulative = secondStake * BigInt(251);
            const cumulative = firstCumulative + secondCumulative;

            expect(result).toEqual(cumulative);
        });
    });

    describe("cumulativeStake", () => {
        it("ropsten", async () => {
            const [startStakers, endStakers] = await Promise.all([
                stakersSEV({ block: 11416345, network_: "ropsten" }),
                stakersSEV({ block: 11420340, network_: "ropsten" })
            ]);
            const [startNetwork, endNetwork] = await Promise.all([
                networkSEV({ block: 11416345, network_: "ropsten" }),
                networkSEV({ block: 11420340, network_: "ropsten" })
            ]);
            const result = await getTotalCumulativeNormalizedStake(startNetwork, 11416345, endNetwork, 11420340);

            if (startStakers.length !== endStakers.length)
                throw new Error("cumulativeStake pick range with no new stakers");

            const total = endStakers.reduce((prev, curr, index) =>
                prev + getCumulativeNormalizedStake(startStakers[index], 11416345, curr, 11420340), ZERO);

            expect(total).toEqual(result);
        });
    });

    describe("rewardCalcuation-sev", () => {
        it("ropsten", async () => rewardCalcuation(11438743, 11438771, "ropsten"));
    });
});
