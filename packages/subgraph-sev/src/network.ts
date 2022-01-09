import { dataSource, Address, BigInt} from '@graphprotocol/graph-ts';
import { Staker, Network } from "../generated/schema";
import {
    Stake as StakeEvent,
    Unstake as UnstakeEvent,
    EdenNetwork as EdenNetworkContract
} from "../generated/EdenNetwork/EdenNetwork";

let ZERO = BigInt.fromI32(0);
let FOUR = BigInt.fromI32(4);
let WEI = BigInt.fromString("1000000000000000000");

let SEV_FORK_DAMPENING_POINT_BEFORE = BigInt.fromI32(1000);
let SEV_FORK_DAMPENING_POINT_AFTER = BigInt.fromI32(100000);
let SEV_FORK_MAINNET_BLOCK = BigInt.fromI32(13987000);

function getNetwork(): Network {
    let network = Network.load(dataSource.address().toHex());

    if (network == null) {
        network = new Network(dataSource.address().toHex());
        network.stakers = new Array<string>();
        network.totalStaked = ZERO;
        network.totalNormalizedStaked = ZERO;
        network.totalCumulativeNormalizedStaked = ZERO;
        network.totalCumulativeNormalizedStakedLastBlock = ZERO;
        network.numStakers = ZERO;
        network.save();
    }

    return network as Network;
}

// f[x_] = Min[x, 1000] + 4 * Sqrt[Max[x - 1000, 0]]
function normalizeStake(wei: BigInt, dampening_point: BigInt): BigInt {
    wei = wei.div(WEI);
    let base = wei.gt(dampening_point) ? dampening_point : wei;
    let extra = wei.gt(dampening_point) ? wei.minus(dampening_point) : ZERO;
    return base.plus(FOUR.times(extra.sqrt())).times(WEI);
}

function getBlockDiff(then: BigInt, now: BigInt): BigInt {
    return then.equals(ZERO) || then.gt(now)
        ? ZERO
        : now.minus(then);
}

function stakeUnstake(address: Address, blockNumber: BigInt): void {
    let network = getNetwork();
    let contract = EdenNetworkContract.bind(dataSource.address());

    let staker = Staker.load(address.toHex());
    if (staker == null) {
        staker = new Staker(address.toHex());
        staker.staked = ZERO;
        staker.normalizedStaked = ZERO;
        staker.cumulativeNormalizedStaked = ZERO;
        staker.cumulativeNormalizedStakedLastBlock = ZERO;
        staker.index = BigInt.fromI32(network.stakers.length);
        staker.save();

        let stakers = network.stakers;
        stakers.push(staker.id);
        network.stakers = stakers;
        network.numStakers = BigInt.fromI32(stakers.length);
        network.save();
    }

    // calculate cumulative normalized stake accumulated before changing to new stake

    let stakerBlockDiff = getBlockDiff(staker.cumulativeNormalizedStakedLastBlock, blockNumber);
    let stakerAccumulated = staker.normalizedStaked.times(stakerBlockDiff);
    staker.cumulativeNormalizedStaked = staker.cumulativeNormalizedStaked.plus(stakerAccumulated);
    staker.cumulativeNormalizedStakedLastBlock = blockNumber;

    let networkBlockDiff = getBlockDiff(network.totalCumulativeNormalizedStakedLastBlock, blockNumber);
    let networkAccumulated = network.totalNormalizedStaked.times(networkBlockDiff);
    network.totalCumulativeNormalizedStaked = network.totalCumulativeNormalizedStaked.plus(networkAccumulated);
    network.totalCumulativeNormalizedStakedLastBlock = blockNumber;

    let oldStake = staker.staked;
    let oldNormalizedStake = staker.normalizedStaked;

    staker.staked = contract.stakedBalance(address);
    staker.normalizedStaked = normalizeStake(staker.staked,
        dataSource.network() == 'mainnet' && blockNumber.ge(SEV_FORK_MAINNET_BLOCK)
        ? SEV_FORK_DAMPENING_POINT_AFTER
        : SEV_FORK_DAMPENING_POINT_BEFORE
    );

    staker.save();

    network.totalStaked = network.totalStaked.minus(oldStake).plus(staker.staked);
    network.totalNormalizedStaked = network.totalNormalizedStaked.minus(oldNormalizedStake).plus(staker.normalizedStaked);

    network.save();
}

export function stake(event: StakeEvent): void {
    stakeUnstake(event.params.staker, event.block.number);
}

export function unstake(event: UnstakeEvent): void {
    stakeUnstake(event.params.staker, event.block.number);
}
