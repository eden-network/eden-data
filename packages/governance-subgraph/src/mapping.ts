import { 
    dataSource, Address, BigInt, ethereum, BigDecimal, log,
    crypto, Bytes, ByteArray
} from '@graphprotocol/graph-ts';
import { 
    Producer, ProducerSetChange, ProducerRewardCollectorChange, RewardSchedule, 
    RewardScheduleEntry, Block, Epoch, ProducerSet, ProducerEpoch
} from '../generated/schema';
import {
    BlockProducerAdded as BlockProducerAddedEvent,
    BlockProducerRemoved as BlockProducerRemovedEvent,
    BlockProducerRewardCollectorChanged as BlockProducerRewardCollectorChangedEvent,
    RewardScheduleChanged as RewardScheduleChangedEvent,
    Governance as GovernanceContract
} from '../generated/EdenNetworkGovernance/Governance';

let ZERO = BigInt.fromI32(0);
let ONE = BigInt.fromI32(1);
let TEN_THOUSAND = BigInt.fromI32(10000);

function createOrGetProducerSet(): ProducerSet {
    let producerSet = ProducerSet.load(dataSource.address().toHex());

    if (producerSet == null) {
        producerSet = new ProducerSet(dataSource.address().toHex());
        producerSet.producers = new Array<string>();
        producerSet.save();
    }

    return producerSet as ProducerSet;
}

function createOrGetProducer(address: Address): Producer {
    let producer = Producer.load(address.toHex());

    if (producer == null) {
        producer = new Producer(address.toHex());
        producer.active = false;
        producer.rewards = ZERO;
        producer.pendingEpochBlocks = ZERO;
        producer.confirmedBlocks = ZERO;
        producer.save();

        let producerSet = createOrGetProducerSet();
        let producers = producerSet.producers;
        producers.push(producer.id);
        producerSet.producers = producers;
        producerSet.save();

        log.info("Governance: createOrGetProducer: Created producer {}", [producer.id]);
    }

    return producer as Producer;
}

function createOrGetRewardSchedule(): RewardSchedule {
    let rewardSchedule = RewardSchedule.load(dataSource.address().toHex());

    if (rewardSchedule == null) {
        rewardSchedule = new RewardSchedule(dataSource.address().toHex());
        rewardSchedule.rewardScheduleEntries = [] as string[];
    }

    return rewardSchedule as RewardSchedule;
}

function getRewardScheduleEntryByTimestamp(entries: RewardScheduleEntry[], timestamp: BigInt): RewardScheduleEntry | null {
    let ret: RewardScheduleEntry | null = null;
    for (let i = 0, k = entries.length ; i < k ; ++i) {
        if (timestamp.lt(entries[i].startTime))
            break;
        ret = entries[i];
    }
    return ret as RewardScheduleEntry | null;
}

function getRewardScheduleEntryByID(entries: RewardScheduleEntry[], id: string): RewardScheduleEntry | null {
    for (let i = 0, k = entries.length ; i < k ; ++i) {
        if (entries[i].id == id)
            return entries[i];
    }
    return null;
}

function createEmptyEpoch(epochNumber: BigInt): Epoch {
    let epoch = new Epoch(dataSource.address().toHex() + "+epoch" + epochNumber.toString());
    epoch.finalized = false;
    epoch.epochNumber = epochNumber;
    epoch.producerBlocks = ZERO;
    epoch.allBlocks = ZERO;
    epoch.producerBlocksRatio = ZERO.toBigDecimal();
    return epoch;
}

export function blockProducerAdded(event: BlockProducerAddedEvent): void {
    let producer = createOrGetProducer(event.params.producer, );
    producer.active = true;
    producer.save();

    let producerSetChange = new ProducerSetChange(event.transaction.hash.toHex());
    producerSetChange.blockNumber = event.block.number;
    producerSetChange.changeType = "Added";
    producerSetChange.producer = event.params.producer;
    producerSetChange.save();
}

export function blockProducerRemoved(event: BlockProducerRemovedEvent): void {
    let producer = createOrGetProducer(event.params.producer);
    producer.active = false;
    producer.save();

    let producerSetChange = new ProducerSetChange(event.transaction.hash.toHex());
    producerSetChange.blockNumber = event.block.number;
    producerSetChange.changeType = "Removed";
    producerSetChange.producer = event.params.producer;
    producerSetChange.save();
}

export function blockProducerRewardCollectorChanged(event: BlockProducerRewardCollectorChangedEvent): void {
    let producer = createOrGetProducer(event.params.producer);
    producer.rewardCollector = event.params.collector;
    producer.save();

    let producerRewardCollectorChange = new ProducerRewardCollectorChange(event.transaction.hash.toHex());
    producerRewardCollectorChange.blockNumber = event.block.number;
    producerRewardCollectorChange.rewardCollector = event.params.collector;
    producerRewardCollectorChange.producer = event.params.producer;
    producerRewardCollectorChange.save();
}

var rewardScheduleChangedHash: string;
export function rewardScheduleChanged(event: RewardScheduleChangedEvent): void {
    let rewardSchedule = createOrGetRewardSchedule();
    let contract = GovernanceContract.bind(dataSource.address());

    rewardScheduleChangedHash = event.transaction.hash.toHex();

    let entriesCount = contract.rewardScheduleEntries().toI32();
    let entries = [] as RewardScheduleEntry[];
    for (let i = 0; i < entriesCount; ++i) {
        let entry = contract.rewardScheduleEntry(BigInt.fromI32(i));
        let ret = new RewardScheduleEntry(rewardScheduleChangedHash + "+index" + i.toString());
        ret.startTime = entry.startTime;
        ret.epochDuration = entry.epochDuration;
        ret.rewardsPerEpoch = entry.rewardsPerEpoch;
        ret.save();
        entries.push(ret);
    }
    rewardSchedule.rewardScheduleEntries = entries.map<string>(entry => entry.id) as string[];
    
    let activeRewardScheduleEntry = getRewardScheduleEntryByTimestamp(entries, event.block.timestamp);
    rewardSchedule.activeRewardScheduleEntry = activeRewardScheduleEntry != null ? activeRewardScheduleEntry.id : null;

    if (activeRewardScheduleEntry != null)
        log.info("Governance: rewardScheduleChanged: Set active reward schedule entry to {}", [activeRewardScheduleEntry.id]);
    else
        log.info("Governance: rewardScheduleChanged: Reward schedule not active yet", []);

    rewardSchedule.save();
}

export function handleBlock(block: ethereum.Block): void {
    let blockEntity = new Block(block.hash.toHex());
    let producer = Producer.load(block.author.toHex());

    blockEntity.hash = block.hash;
    blockEntity.parentHash = block.parentHash;
    blockEntity.unclesHash = block.unclesHash;
    blockEntity.author = block.author;
    blockEntity.stateRoot = block.stateRoot;
    blockEntity.transactionsRoot = block.transactionsRoot;
    blockEntity.receiptsRoot = block.receiptsRoot;
    blockEntity.number = block.number;
    blockEntity.gasUsed = block.gasUsed;
    blockEntity.gasLimit = block.gasLimit;
    blockEntity.timestamp = block.timestamp;
    blockEntity.difficulty = block.difficulty;
    blockEntity.totalDifficulty = block.totalDifficulty;
    blockEntity.size = block.size;
    blockEntity.fromActiveProducer = producer != null && producer.active;
    blockEntity.save();

    let rewardSchedule = RewardSchedule.load(dataSource.address().toHex());
    if (rewardSchedule == null) {
        log.debug("Governance: handleBlock: No reward schedule applied", []);
        return; // no schedule applied yet, and so no rewards accrue
    }

    let rewardScheduleEntries = rewardSchedule.rewardScheduleEntries.map<RewardScheduleEntry | null>(
        entry => RewardScheduleEntry.load(entry)).filter(x => x != null) as RewardScheduleEntry[];
    if (rewardScheduleEntries.length === 0) {
        log.error("Governance: handleBlock: Reward schedule applied, but entries empty", []);
        return;
    }

    let pendingEpoch = Epoch.load(rewardSchedule.pendingEpoch);
    if (pendingEpoch == null) {
        if (block.timestamp.lt(rewardScheduleEntries[0].startTime)) {
            log.debug("Governance: handleBlock: First reward schedule entry start time hasn't been reached yet", []);
            return;
        }

        // this is the first block after the reward schedule was applied with active rewards
        // make the initial pending epoch
        log.info("Governance: handleBlock: Hello, world!", []);
        pendingEpoch = createEmptyEpoch(ONE);
        pendingEpoch.save();

        rewardSchedule.pendingEpoch = pendingEpoch.id;
        rewardSchedule.activeRewardScheduleEntry = rewardScheduleEntries[0].id;
        rewardSchedule.save();
    }

    let pendingEpochStartBlock = Block.load(pendingEpoch.startBlock);
    if (pendingEpochStartBlock == null) {
        log.info("Governance: handleBlock: Starting epoch {}", [pendingEpoch.epochNumber.toString()]);
        pendingEpoch.startBlock = blockEntity.id;
        pendingEpochStartBlock = blockEntity;
    }

    let activeRewardScheduleEntry = getRewardScheduleEntryByID(rewardScheduleEntries, rewardSchedule.activeRewardScheduleEntry);
    if (activeRewardScheduleEntry == null) {
        log.error("Governance: handleBlock: Active reward schedule entry {} not found", [rewardSchedule.activeRewardScheduleEntry]);
        return;
    }

    pendingEpoch.allBlocks = pendingEpoch.allBlocks.plus(ONE);

    if (blockEntity.fromActiveProducer) {
        pendingEpoch.producerBlocks = pendingEpoch.producerBlocks.plus(ONE);
        
        producer.pendingEpochBlocks = producer.pendingEpochBlocks.plus(ONE);
        producer.save();
    }

    pendingEpoch.producerBlocksRatio =
        pendingEpoch.producerBlocks.times(TEN_THOUSAND).div(pendingEpoch.allBlocks).toBigDecimal().div(TEN_THOUSAND.toBigDecimal());

    if (block.timestamp.ge(pendingEpochStartBlock.timestamp.plus(activeRewardScheduleEntry.epochDuration))) {
        log.info("Governance: handleBlock: Ending epoch {}", [pendingEpoch.epochNumber.toString()]);

        pendingEpoch.finalized = true;
        pendingEpoch.endBlock = blockEntity.id;
        pendingEpoch.save();

        let producerSet = createOrGetProducerSet();
        let producers = producerSet.producers;
        for (let i = 0, k = producers.length; i < k; ++i) {
            let producer = Producer.load(producers[i]);
            if (producer == null) {
                log.warning("Governance: handleBlock: Error loading producer {} that was in producer set", [producers[i]]);
                continue;
            }

            let producerEpoch = new ProducerEpoch(producer.id + "+epoch" + pendingEpoch.epochNumber.toString());
            producerEpoch.address = Address.fromString(producer.id);
            producerEpoch.epoch = pendingEpoch.id;
            producerEpoch.blocksProduced = producer.pendingEpochBlocks;

            // here we calculate the actual rewards. the rewards of a given epoch are given proportionally
            // to the number of blocks an active producer has produced relative to the number of blocks
            // produced by all active producers

            // use fixed point math to make calculations stable across different platforms
            let ratioOfBlocks = producer.pendingEpochBlocks.equals(ZERO)
                ? ZERO
                : producer.pendingEpochBlocks.times(TEN_THOUSAND).div(pendingEpoch.producerBlocks);
            let newRewards = ratioOfBlocks.times(activeRewardScheduleEntry.rewardsPerEpoch).div(TEN_THOUSAND);
            
            producer.rewards = producer.rewards.plus(newRewards);
            producer.confirmedBlocks = producer.confirmedBlocks.plus(producer.pendingEpochBlocks);
            producer.pendingEpochBlocks = ZERO;
            producer.save();

            producerEpoch.blocksProducedRatio = ratioOfBlocks.toBigDecimal().div(TEN_THOUSAND.toBigDecimal());
            producerEpoch.totalRewards = producer.rewards;
            producerEpoch.save();
        }

        rewardSchedule.lastEpoch = pendingEpoch.id;

        pendingEpoch = createEmptyEpoch(pendingEpoch.epochNumber.plus(ONE));
        pendingEpoch.save();
        rewardSchedule.pendingEpoch = pendingEpoch.id;

        // check if we've entered a new part of the reward schedule. this is only done upon epoch close
        // to simplify accounting compared to cross-reward schedule epochs. essentially this means 
        // that the reward schedule entry's start time is the minimum time it can take effect

        let currentRewardScheduleEntry = getRewardScheduleEntryByTimestamp(rewardScheduleEntries, block.timestamp);
        if (currentRewardScheduleEntry.id !== activeRewardScheduleEntry.id) {
            rewardSchedule.activeRewardScheduleEntry = currentRewardScheduleEntry.id;
            log.info("Governance: handleBlock: Set active reward schedule entry to {}", [currentRewardScheduleEntry.id]);
        }   
        
        rewardSchedule.save();
    }
    else
        pendingEpoch.save();
}
