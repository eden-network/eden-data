import { tokenStats, balance, balances } from "./";

describe("token", () => {
    describe("tokenStats", () => {
        it("ropsten", async () => {
            const result1 = await tokenStats({block: 11419872, network: "ropsten"});
            expect(result1).not.toBeUndefined();
            expect(result1.totalSupply).toEqual(BigInt("1809152867868944356539180"));
            expect(result1.circulatingSupply).toEqual(BigInt("1809152867868944356539180"));
            expect(result1.numHolders).toEqual(30);
            expect(result1.numBalances).toEqual(42);
            expect(result1.numTransfers).toEqual(179);

            const result2 = await tokenStats({block: 11421806, network: "ropsten"});
            expect(result2).not.toBeUndefined();
            expect(result2.totalSupply).toEqual(BigInt("1809152867868944356539180"));
            expect(result2.circulatingSupply).toEqual(BigInt("1808815867868944356539180"));
            expect(result2.numHolders).toEqual(31);
            expect(result2.numBalances).toEqual(43);
            expect(result2.numTransfers).toEqual(181);
        });
    });

    describe("balance", () => {
        it("ropsten", async () => {
            const result = await balance({account: "0xfbb61b8b98a59fbc4bd79c23212addbefaeb289f", block: 11419872, network: "ropsten"});
            expect(result).toEqual(BigInt("66490481072348016725616"));
        });
    });

    describe("balances", () => {
        it("ropsten", async () => {
            const result = await balances({block: 11419872, network: "ropsten"});
            expect(result).not.toBeUndefined();
            expect(result.length).toEqual(42);
            expect(result.find(x => x.id === "0xfbb61b8b98a59fbc4bd79c23212addbefaeb289f").balance).toEqual(BigInt("66490481072348016725616"));
        });
    });
});