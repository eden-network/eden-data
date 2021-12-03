import { dataSource, Address, BigInt } from '@graphprotocol/graph-ts';
import { Distributor, Distribution, Claim, Slash, Account } from '../generated/schema';
import {
    MerkleRootUpdated as MerkleRootUpdatedEvent,
    Claimed as ClaimedEvent,
    Slashed as SlashedEvent,
    AccountUpdated as AccountUpdatedEvent,
    DebtChanged as DebtChangedEvent
} from '../generated/EdenNetworkDistributionSEV/DistributionSEV';

function getDistrubtor(): Distributor {
    let distributor = Distributor.load(dataSource.address().toHex());

    if (distributor == null) {
        distributor = new Distributor(dataSource.address().toHex());
        distributor.debtTotal = BigInt.fromI32(0);
        distributor.save();
    }

    return distributor as Distributor;
}

function getAccount(address: Address) : Account {
    let account = Account.load(address.toHex());

    if (account == null) {
        account = new Account(address.toHex());
        account.totalClaimed = BigInt.fromI32(0);
        account.totalSlashed = BigInt.fromI32(0);
        account.save();
    }

    return account as Account;
}

export function merkleRootUpdated(event: MerkleRootUpdatedEvent): void {
    if (event.params.distributionNumber.equals(BigInt.fromI32(0)))
        return;

    let distributor = getDistrubtor();

    let distribution = new Distribution(event.transaction.hash.toHex());
    distribution.distributionNumber = event.params.distributionNumber;
    distribution.merkleRoot = event.params.merkleRoot;
    distribution.metadataURI = event.params.metadataURI;
    distribution.timestamp = event.block.timestamp;
    distribution.distributor = distributor.id;
    distribution.tokenTotal = event.params.tokenTotal;
    distribution.save();

    distributor.currentDistribution = distribution.id;
    distributor.save();
}

export function claimed(event: ClaimedEvent): void {
    let claim = new Claim(event.transaction.hash.toHex());
    claim.index = event.params.index;
    claim.account = event.params.account.toHex();
    claim.totalEarned = event.params.totalEarned;
    claim.claimed = event.params.claimed;
    claim.timestamp = event.block.timestamp;
    claim.save();
}

export function slashed(event: SlashedEvent): void {
    let slash = new Slash(event.transaction.hash.toHex());
    slash.account = event.params.account.toHex();
    slash.slashed = event.params.slashed;
    slash.timestamp = event.block.timestamp;
    slash.save();
}

export function accountUpdated(event: AccountUpdatedEvent): void {
    let account = getAccount(event.params.account);
    account.totalClaimed = event.params.totalClaimed;
    account.totalSlashed = event.params.totalSlashed;
    account.save();
}

export function debtChanged(event: DebtChangedEvent): void {
    let distributor = getDistrubtor();
    distributor.debtTotal = event.params.newDebt;
    distributor.save();
}
