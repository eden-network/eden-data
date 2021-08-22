import { account, accounts, currentDistribution, distribution, distributions } from "./";

describe("distribution", () => {
    describe("currentDistribution", () => {
        it("ropsten", async () => {
            const result = await currentDistribution({network: "ropsten", block: 10602905});
            expect(result).toBeUndefined();

            const result2 = await currentDistribution({network: "ropsten", block: 10766537});
            expect(result2).not.toBeUndefined();
            expect(result2?.distributionNumber).toEqual(38);
            expect(result2?.merkleRoot).toEqual("0x71db23b1876c90bd43988a4583d8bf02d9e2faaf11aafc70e74a61a21c2a2762");
            expect(result2?.metadataURI).toEqual("ipfs://QmSZLbtm9MGDU1U46f5HQiY6rNE3bUP4FefNbkSrp1QTyQ");
            expect(result2.timestamp).toEqual(1628003987);
        });
    });

    describe("distribution", () => {
        it("ropsten", async () => {
            const result = await distribution({distributionNumber: 35, network: "ropsten"});
            expect(result).not.toBeUndefined();
            expect(result?.distributionNumber).toEqual(35);
            expect(result?.merkleRoot).toEqual("0x0d76590b74f3b209db618b5ba5e4d2e2d753f87ff7c0ead5ade0014a43548750");
            expect(result?.metadataURI).toEqual("ipfs://QmcygzwJBUf8A31uHrTHV1WX8zybq1TgfuhsYeBTENj9hh");
            expect(result?.timestamp).toEqual(1627994739);
        });
    });

    describe("distributions", () => {
        it("ropsten", async () => {
            const result = await distributions({network: "ropsten", block: 10769195});
            expect(result.length).toEqual(46);
        });
    })

    describe("account", () => {
        it("ropsten", async () => {
            const result = await account({accountAddress: "0xfbb61B8b98a59FbC4bD79C23212AddbEFaEB289f", network: "ropsten", block: 10630465});
            expect(result).toBeUndefined();

            const result2 = await account({accountAddress: "0xfbb61B8b98a59FbC4bD79C23212AddbEFaEB289f", network: "ropsten", block: 10769194});
            expect(result2).not.toBeUndefined();
            expect(result2?.totalClaimed).toEqual(BigInt("354256031700000000000000"));
            expect(result2?.totalSlashed).toEqual(BigInt("0"));
        })
    });

    describe("accounts", () => {
        it("ropsten", async () => {
            const result = await accounts({network: "ropsten", block: 10769280});
            expect(result.length).toEqual(1);

            const xfb = result.find(x => x.id === "0xfbb61b8b98a59fbc4bd79c23212addbefaeb289f");
            expect(xfb.totalClaimed).toEqual(BigInt("363395690900000000000000"));
            expect(xfb.totalSlashed).toEqual(BigInt("0"));
        });
    });
});