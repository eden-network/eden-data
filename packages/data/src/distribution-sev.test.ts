import { debtTotal } from "./";

describe("distribution-sev", () => {
    describe("debtTotal", () => {
        it("ropsten", async () => {
            const result = await debtTotal({ block: 11438017, network: "ropsten"});
            expect(result).toEqual(BigInt(0));
        });
    });
});
