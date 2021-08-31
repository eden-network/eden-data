import { dataSource, Address, BigInt, log, BigDecimal } from '@graphprotocol/graph-ts';
import { Slot, Staker, Network, SlotClaim } from "../generated/schema";
import {
    SlotClaimed as SlotClaimedEvent,
    SlotDelegateUpdated as SlotDelegateUpdatedEvent,
    Stake as StakeEvent,
    Unstake as UnstakeEvent,
    EdenNetwork as EdenNetworkContract
} from "../generated/EdenNetwork/EdenNetwork";

let ZERO = BigInt.fromI32(0);
let TEN_THOUSAND = BigInt.fromI32(10000);
let WEI = BigInt.fromString("1000000000000000000");

function getNetwork(): Network {
    let network = Network.load(dataSource.address().toHex());

    if (network == null) {
        network = new Network(dataSource.address().toHex());
        network.stakers = new Array<string>();
        network.totalStaked = ZERO;
        let stakedPercentiles = new Array<BigInt>(100);
        stakedPercentiles.fill(ZERO);
        network.stakedPercentiles = stakedPercentiles;
        network.save();
    }

    return network as Network;
}

function i32ToString(i: i32): string {
    return i.toString();
}

function getSlotID(slot: i32): string {
    return dataSource.address().toHex() + '-' + i32ToString(slot);
}

export function slotClaimed(event: SlotClaimedEvent): void {
    let network = getNetwork();
    let contract = EdenNetworkContract.bind(dataSource.address());

    let slot = Slot.load(getSlotID(event.params.slot));
    if (slot == null)
        slot = new Slot(getSlotID(event.params.slot));

    let taxRatePerDay = BigInt.fromI32(event.params.taxNumerator).times(TEN_THOUSAND).div(BigInt.fromI32(event.params.taxDenominator)).toBigDecimal().div(TEN_THOUSAND.toBigDecimal());
    slot.owner = event.params.owner;
    slot.delegate = event.params.delegate;
    slot.winningBid = event.params.newBidAmount;
    slot.oldBid = event.params.oldBidAmount;
    slot.startTime = event.block.timestamp;
    slot.expirationTime = contract.slotExpiration(event.params.slot);
    slot.taxRatePerDay = taxRatePerDay;
    slot.save();

    let claim = new SlotClaim(event.transaction.hash.toHexString());
    claim.owner = event.params.owner;
    claim.winningBid = event.params.newBidAmount;
    claim.oldBid = event.params.oldBidAmount;
    claim.startTime = event.block.timestamp;
    claim.expirationTime = slot.expirationTime;
    claim.taxRatePerDay = taxRatePerDay;
    claim.slot = slot.id;
    claim.save();

    if (event.params.slot == 0)
        network.slot0 = slot.id;
    else if (event.params.slot == 1)
        network.slot1 = slot.id;
    else if (event.params.slot == 2)
        network.slot2 = slot.id;
    else
        log.error("Unknown slot {}", [i32ToString(event.params.slot)]);
    network.save();
}

export function slotDelegateUpdated(event: SlotDelegateUpdatedEvent): void {
    let slot = Slot.load(getSlotID(event.params.slot));
    if (slot != null) {
        slot.delegate = event.params.newDelegate;
        slot.save();
    }
    else
        log.error("Unknown slot {}", [i32ToString(event.params.slot)]);
}

var sumStaked = ZERO;
function stakeUnstake(address: Address): void {
    let network = getNetwork();
    let contract = EdenNetworkContract.bind(dataSource.address());

    let staker = Staker.load(address.toHex());
    if (staker == null) {
        staker = new Staker(address.toHex());
        staker.staked = ZERO;
        staker.save();

        let stakers = network.stakers;
        stakers.push(staker.id);
        network.stakers = stakers;
        network.save();
    }
    staker.staked = contract.stakedBalance(address);
    staker.save();

    let allStakers = network.stakers.map<Staker | null>(id => Staker.load(id)).filter(staker => staker != null);
    let nonZeroStakers = allStakers.filter(staker => !staker.staked.isZero());
    let zeroStakers = allStakers.filter(staker => staker.staked.isZero());

    zeroStakers.forEach(staker => {
        staker.rank = null;
        staker.save();
    });

    let sortedNonZeroStakers = nonZeroStakers.sort((a, b) => 
        b.staked.div(WEI).minus(a.staked.div(WEI)).toI32()
    );

    sortedNonZeroStakers.forEach((staker, index) => {
        sumStaked = sumStaked.plus(staker.staked);
        staker.rank = BigInt.fromI32(index);
        staker.save();
    });

    network.totalStaked = sumStaked;
    network.numStakers = BigInt.fromI32(nonZeroStakers.length);

    let stakedPercentiles = new Array<BigInt>(100);
    for (let i = 0; i < 100 ; ++i) {
        let percentile = i / 100.0;
        let index = Math.floor(percentile * sortedNonZeroStakers.length) as i32;
        stakedPercentiles[i] = sortedNonZeroStakers[index].staked;
    }
    network.stakedPercentiles = stakedPercentiles;

    network.save();
}

export function stake(event: StakeEvent): void {
    stakeUnstake(event.params.staker);
}

export function unstake(event: UnstakeEvent): void {
    stakeUnstake(event.params.staker);
}
