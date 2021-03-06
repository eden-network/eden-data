import { staker, stakeStats, slots, stakers, stakerLeaderboard, slotClaims, timeseries } from "./";

describe("network", () => {
    describe("staker", () => {
        it("mainnet", async () => {
            const result1 = await staker({staker: "0x295eebdfedb79952785f5ec8fa2417df04d6d59c", block: 12948565, network: "mainnet"});
            expect(result1).not.toBeUndefined();
            expect(result1.staked).toEqual(BigInt("200000000000000000000"));
            expect(result1.rank).toEqual(0);

            const result2 = await staker({staker: "0x295eebdfedb79952785f5ec8fa2417df04d6d59c", block: 13069287, network: "mainnet"});
            expect(result2).not.toBeUndefined();
            expect(result2.staked).toEqual(BigInt("200000000000000000000"));
            expect(result2.rank).toEqual(298);
        });
    });

    describe("stakers", () => {
        it("mainnet", async () => {
            const result = await stakers({block: 13069287, network: "mainnet"});
            expect(result).not.toBeUndefined();
            expect(result.length).toEqual(860);
        });
    });

    describe("stakerLeaderboard", () => {
        it("mainnet", async () => {
            const result = await stakerLeaderboard({block: 13069287, network: "mainnet", start: 130, num: 2});
            expect(result).not.toBeUndefined();

            expect(result[0].id).toEqual("0x90abcf1598ed3077861bcfb3b11efcd1d7277223");
            expect(result[0].rank).toEqual(130);
            expect(result[0].staked).toEqual(BigInt("1044631814872887769232"));

            expect(result[1].id).toEqual("0x7bd4bf18f8f9ada54624674492708767ccc2cf49");
            expect(result[1].rank).toEqual(131);
            expect(result[1].staked).toEqual(BigInt("1030411301684366746732"));
        });
    });

    describe("stakeStats", () => {
        it("mainnet", async () => {
            const result = await stakeStats({block: 13069287, network: "mainnet", includePercentiles: true});
            expect(result).not.toBeUndefined();
            expect(result.numStakers).toEqual(739);
            expect(result.totalStaked).toEqual(BigInt("1287612749679959946014557"));
            expect(result.stakedPercentiles?.length).toEqual(100);
        });

        it("mainnet timeseries blocks", async () => {
            const result = await timeseries({blocks: [13148000, 13147000, 13146000], network: "mainnet", target: stakeStats}, {includePercentiles: false});
            expect(result).not.toBeUndefined();

            expect(result[0].block).toEqual(13148000);
            expect(result[0].data.numStakers).toEqual(1794);
            expect(result[0].data.totalStaked).toEqual(BigInt("4244505866143056306602141"));
            expect(result[0].data.stakedPercentiles).toBeUndefined();

            expect(result[1].block).toEqual(13147000);
            expect(result[1].data.numStakers).toEqual(1780);
            expect(result[1].data.totalStaked).toEqual(BigInt("4045687347421179919289751"));
            expect(result[2].data.stakedPercentiles).toBeUndefined();

            expect(result[2].block).toEqual(13146000);
            expect(result[2].data.numStakers).toEqual(1773);
            expect(result[2].data.totalStaked).toEqual(BigInt("4000305237548249344695752"));
            expect(result[2].data.stakedPercentiles).toBeUndefined();
        });

        it("mainnet timeseries timestamps", async () => {
            const result = await timeseries({timestamps: [1630764013], network: "mainnet", target: stakeStats}, {includePercentiles: false});

            expect(result[0].timestamp).toEqual(1630764013);
            expect(result[0].data.numStakers).toEqual(1885);
            expect(result[0].data.totalStaked).toEqual(BigInt("4694047885628400475571953"));
            expect(result[0].data.stakedPercentiles).toBeUndefined();
        });
    });

    describe("slots", () => {
        it("mainnet", async () => {
            const result = await slots({block: 13069287, network: "mainnet"});
            expect(result).not.toBeUndefined();
            expect(result.length).toEqual(3);
            expect(result[1].id).toEqual("0x9e3382ca57f4404ac7bf435475eae37e87d1c453-1");
            expect(result[1].owner).toEqual("0xab62338ed6bbbd18fbbcd5b3f9a90bc706519cc6");
            expect(result[1].delegate).toEqual("0xbdb9509587a6e13ba5b8eff68a6b7cb318e47809");
            expect(result[1].winningBid).toEqual(BigInt("22000000000000000000000"));
            expect(result[1].oldBid).toEqual(BigInt("20000000000000000000000"));
            expect(result[1].startTime).toEqual(1628537067);
            expect(result[1].expirationTime).toEqual(1631129067);
            expect(result[1].taxRatePerDay).toEqual(0.0333);
        });
    });

    describe("slotClaims", () => {
        it("mainnet", async () => {
            const result = await slotClaims({block: 13069287, slotIndex: 0, network: "mainnet"});
        });
    });
})