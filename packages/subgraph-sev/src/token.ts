import { dataSource, Address, BigInt } from '@graphprotocol/graph-ts';
import { Balance, Token } from "../generated/schema";
import { Transfer as TransferEvent } from "../generated/EdenToken/EdenToken";

let ZERO = BigInt.fromI32(0);
let ONE = BigInt.fromI32(1);
let ZERO_ADDRESS = Address.fromString("0x0000000000000000000000000000000000000000");
let NON_CIRCULATING_ADDRESSES: Address[] = [
    ZERO_ADDRESS,
    Address.fromString("0xae9687192c9a640b93b758818cc1ca3d0263cbb4"),
    Address.fromString("0xe30ff60c19a9abd1a45c8656bd9f180fc80e91d6")
];

function getToken(): Token {
    let token = Token.load(dataSource.address().toHex());

    if (token == null) {
        token = new Token(dataSource.address().toHex());
        token.balances = new Array<string>();
        token.totalSupply = ZERO;
        token.circulatingSupply = ZERO;
        token.numHolders = ZERO;
        token.numTransfers = ZERO;
        token.numBalances = ZERO;
        token.save();
    }

    return token as Token;
}

function getBalance(address: Address): Balance {
    let balance = Balance.load(address.toHex());

    if (balance == null) {
        let token = getToken();

        balance = new Balance(address.toHex());
        balance.balance = ZERO;
        balance.index = BigInt.fromI32(token.balances.length);
        balance.save();
        
        let balances = token.balances;
        balances.push(balance.id);
        token.balances = balances;
        token.numBalances = BigInt.fromI32(balances.length);
        token.save();
    }

    return balance as Balance;
}

function isCirculating(address: Address): boolean {
    for (let i = 0 ; i < NON_CIRCULATING_ADDRESSES.length ; ++i) {
        if (NON_CIRCULATING_ADDRESSES[i].equals(address))
            return false;
    }
    return true;
}

export function transfer(event: TransferEvent): void {
    let from = getBalance(event.params.from);
    let to = getBalance(event.params.to);
    let value = event.params.value;
    let token = getToken();

    if (event.params.from.equals(ZERO_ADDRESS))
        token.totalSupply = token.totalSupply.plus(value);
    if (event.params.to.equals(ZERO_ADDRESS))
        token.totalSupply = token.totalSupply.minus(value);

    if (!isCirculating(event.params.from) && isCirculating(event.params.to))
        token.circulatingSupply = token.circulatingSupply.plus(value);
    if (isCirculating(event.params.from) && !isCirculating(event.params.to))
        token.circulatingSupply = token.circulatingSupply.minus(value);

    if (!event.params.from.equals(ZERO_ADDRESS)) {
        let beforeFromBalance = from.balance;
        from.balance = from.balance.minus(value);
        from.save();

        if (!beforeFromBalance.isZero() && from.balance.isZero())
            token.numHolders = token.numHolders.minus(ONE)
    }
    if (!event.params.to.equals(ZERO_ADDRESS)) {
        let beforeToBalance = to.balance;
        to.balance = to.balance.plus(value);
        to.save();

        if (beforeToBalance.isZero() && !to.balance.isZero())
            token.numHolders = token.numHolders.plus(ONE);
    }

    token.numTransfers = token.numTransfers.plus(ONE);
    token.save();
}
