import { request, gql } from 'graphql-request';
import { GRAPH_API_ENDPOINTS, GOVERNANCE_CONTRACT, Network } from './constants';
const graphResultsPager = require('graph-results-pager');

export async function timestampToBlock(timestamp: number, network: Network) {
    timestamp = String(timestamp).length > 10 ? Math.floor(timestamp / 1000) : timestamp;

    const result = await request(GRAPH_API_ENDPOINTS[network].governance,
        gql`{
            blocks(first: 1, orderBy: timestamp, orderDirection: desc, where: { timestamp_lte: ${timestamp} }) {
                number
            }
        }`
    );

    return Number(result.blocks[0].number);
}

export async function makeCodition({block, timestamp, network}: {block?: number, timestamp?: number, network: Network}) {
    if (block)
        return `block: { number: ${block} }`;
    else if (timestamp)
        return `block: { number: ${await timestampToBlock(timestamp, network)} }`;
    else
        return '';
}

export async function producer({producerAddress, block, timestamp, network}: {producerAddress: string, block?: number, timestamp?: number, network: Network}) {
    const condition = await makeCodition({block, timestamp, network});

    const result = await request(GRAPH_API_ENDPOINTS[network].governance,
        gql`{
                producer(id: "${producerAddress.toLowerCase()}", ${condition}) {
                    ${producerProperties.properties.toString()}
                }
            }`
    );

    return result.producer ? producerProperties.callback([result.producer])[0] : undefined;
}

export async function producers({block, timestamp, network}: {block?: number, timestamp?: number, network: Network} = {network: 'mainnet'}) {
    const promise = graphResultsPager({
        api: GRAPH_API_ENDPOINTS[network].governance,
        query: {
            entity: 'producers',
            selection: {
                block: block ? { number: block } : timestamp ? { number: await timestampToBlock(timestamp, network) } : undefined
            },
            properties: producerProperties.properties
        }
    }) as Promise<Producer[]>;

    return promise.then(results => producerProperties.callback(results));
}

export async function producerSetChanges({startBlock, endBlock, network}: {startBlock: number, endBlock: number, network: Network}) {
    const promise = graphResultsPager({
        api: GRAPH_API_ENDPOINTS[network].governance,
        query: {
            entity: 'producerSetChanges',
            selection: {
                where: {
                    blockNumber_gte: startBlock,
                    blockNumber_lte: endBlock,
                }
            },
            properties: producerSetChangeProperties.properties
        }
    }) as Promise<ProducerSetChange[]>;

    return promise
        .then(results => producerSetChangeProperties.callback(results))
        .then(results => results.sort((a, b) => a.blockNumber - b.blockNumber));
}

export async function producerRewardCollectorChanges({startBlock, endBlock, network}: {startBlock: number, endBlock: number, network: Network}) {
    const promise = graphResultsPager({
        api: GRAPH_API_ENDPOINTS[network].governance,
        query: {
            entity: 'producerRewardCollectorChanges',
            selection: {
                where: {
                    blockNumber_gte: startBlock,
                    blockNumber_lte: endBlock,
                }
            },
            properties: producerRewardCollectorChangeProperties.properties
        }
    }) as Promise<ProducerRewardCollectorChange[]>;

    return promise
        .then(results => producerRewardCollectorChangeProperties.callback(results))
        .then(results => results.sort((a, b) => a.blockNumber - b.blockNumber));
}

export async function blocks({startBlock, endBlock, fromActiveProducerOnly, network}: {startBlock: number, endBlock: number, fromActiveProducerOnly: boolean, network: Network}) {
    const promise = graphResultsPager({
        api: GRAPH_API_ENDPOINTS[network].governance,
        query: {
            entity: 'blocks',
            selection: {
                where: {
                    number_gte: startBlock,
                    number_lte: endBlock,
                    fromActiveProducer: fromActiveProducerOnly ? true : undefined
                }
            },
            properties: block.properties
        }
    }) as Promise<Block[]>;

    return promise
        .then(results => block.callback(results))
        .then(results => results.sort((a, b) => a.number - b.number));
}

export async function blocksPaged({start, num, fromActiveProducerOnly, network}: {start: number, num: number, fromActiveProducerOnly: boolean, network: Network}) {
    const condition = fromActiveProducerOnly ? `, where: {fromActiveProducer: true}` : '';
    const result = await request(GRAPH_API_ENDPOINTS[network].governance,
        gql`{
                blocks(orderBy: number, orderDirection: desc, first: ${num}, skip: ${start}${condition}) {
                    ${block.properties.toString()}
                }
            }`
    );

    return result.blocks ? block.callback(result.blocks) : undefined;
}

export async function rewardSchedule({block, timestamp, network}: {block?: number, timestamp?: number, network: Network} = {network: 'mainnet'}) {
    const condition = await makeCodition({block, timestamp, network});

    const result = await request(GRAPH_API_ENDPOINTS[network].governance,
        gql`{
                rewardSchedule(id: "${GOVERNANCE_CONTRACT[network].address}", ${condition}) {
                    ${rewardScheduleProperties.properties.toString()}
                }
            }`
    );

    return result.rewardSchedule ? rewardScheduleProperties.callback([result.rewardSchedule])[0] : undefined;
}

export async function epochs({startEpochNumber, endEpochNumber, includeRewards, network}: {startEpochNumber: number, endEpochNumber: number, includeRewards: boolean, network: Network}) {
    const promise = graphResultsPager({
        api: GRAPH_API_ENDPOINTS[network].governance,
        query: {
            entity: 'epoches',
            selection: {
                where: {
                    epochNumber_gte: startEpochNumber,
                    epochNumber_lte: endEpochNumber,
                }
            },
            properties: epochProperties.properties.concat(includeRewards ? epochProperties.producerRewardsProperties : [])
        }
    }) as Promise<Epoch[]>;

    return promise
        .then(results => epochProperties.callback(results))
        .then(results => results.sort((a, b) => a.epochNumber - b.epochNumber));
}

interface Producer {
    id: string,
    active: boolean,
    rewardCollector?: string
    rewards: string,
    confirmedBlocks: string,
    pendingEpochBlocks: string
}

const producerProperties = {
    properties: [
        'id',
        'active',
        'rewardCollector',
        'rewards',
        'confirmedBlocks',
        'pendingEpochBlocks',
    ],

    callback(results: Producer[]) {
        return results.map(producer => { return {
            ...producer,
            confirmedBlocks: Number(producer.confirmedBlocks),
            pendingEpochBlocks: Number(producer.pendingEpochBlocks)
        }});
    }
}

interface ProducerSetChange {
    id: string,
    blockNumber: string,
    producer: string,
    changeType: 'Added' | 'Removed'
}

const producerSetChangeProperties = {
    properties: [
        'id',
        'blockNumber',
        'producer',
        'changeType'
    ],

    callback(results: ProducerSetChange[]) {
        return results.map(change => { return {
            ...change,
            blockNumber: Number(change.blockNumber),
        }});
    }
}

interface ProducerRewardCollectorChange {
    id: string,
    blockNumber: string,
    producer: string,
    rewardCollector: string
}

const producerRewardCollectorChangeProperties = {
    properties: [
        'id',
        'blockNumber',
        'producer',
        'rewardCollector'
    ],

    callback(results: ProducerRewardCollectorChange[]) {
        return results.map(change => { return {
            ...change,
            blockNumber: Number(change.blockNumber),
        }});
    }
}

interface Block {
    id: string,
    number: string,
    timestamp: string,
    author: string,
    fromActiveProducer: boolean
}

const block = {
    properties: [
        'id',
        'number',
        'timestamp',
        'author',
        'fromActiveProducer'
    ],

    callback(results: Block[]) {
        return results.map(block => { return {
            ...block,
            timestamp: Number(block.timestamp),
            number: Number(block.number)
        }});
    }
}

interface RewardSchedule {
    id: string,
    lastEpoch?: {
        startBlock: {
            id: string,
            number: string,
            timestamp: string
        },
        endBlock: {
            id: string,
            number: string,
            timestamp: string
        },
        epochNumber: string
    },
    pendingEpoch?: {
        startBlock?: {
            id: string,
            number: string,
            timestamp: string
        },
        epochNumber: string,
        producerBlocks: string,
        allBlocks: string,
        producerBlocksRatio: string
    },
    activeRewardScheduleEntry?: {
        startTime: string,
        epochDuration: string,
        rewardsPerEpoch: string
    }
}

const rewardScheduleProperties = {
    properties: [
        'id',
        'lastEpoch { startBlock { id, number, timestamp }, endBlock { id, number, timestamp }, epochNumber }',
        'pendingEpoch { startBlock { id, number, timestamp }, epochNumber, producerBlocks, allBlocks, producerBlocksRatio }',
        'activeRewardScheduleEntry { startTime, epochDuration, rewardsPerEpoch }'
    ],

    callback(results: RewardSchedule[]) {
        return results.map(rewardSchedule => { return {
            id: rewardSchedule.id,
            lastEpoch: rewardSchedule.lastEpoch ? {
                startBlock: rewardSchedule.lastEpoch.startBlock ? {
                    id: rewardSchedule.lastEpoch.startBlock.id,
                    number: Number(rewardSchedule.lastEpoch.startBlock.number),
                    timestamp: Number(rewardSchedule.lastEpoch.startBlock.timestamp)
                } : undefined,
                endBlock: rewardSchedule.lastEpoch.endBlock ? {
                    id: rewardSchedule.lastEpoch.endBlock.id,
                    number: Number(rewardSchedule.lastEpoch.endBlock.number),
                    timestamp: Number(rewardSchedule.lastEpoch.endBlock.timestamp)
                } : undefined,
                epochNumber: Number(rewardSchedule.lastEpoch.epochNumber)
            } : undefined,
            pendingEpoch: rewardSchedule.pendingEpoch ? {
                startBlock: rewardSchedule.pendingEpoch.startBlock ? {
                    id: rewardSchedule.pendingEpoch.startBlock.id,
                    number: Number(rewardSchedule.pendingEpoch.startBlock.number),
                    timestamp: Number(rewardSchedule.pendingEpoch.startBlock.timestamp)
                } : undefined,
                epochNumber: Number(rewardSchedule.pendingEpoch.epochNumber),
                producerBlocks: Number(rewardSchedule.pendingEpoch.producerBlocks),
                allBlocks: Number(rewardSchedule.pendingEpoch.allBlocks),
                producerBlocksRatio: Number(rewardSchedule.pendingEpoch.producerBlocksRatio)
            } : undefined,
            activeRewardScheduleEntry: rewardSchedule.activeRewardScheduleEntry ? {
                startTime: Number(rewardSchedule.activeRewardScheduleEntry.startTime),
                epochDuration: Number(rewardSchedule.activeRewardScheduleEntry.epochDuration),
                rewardsPerEpoch: BigInt(rewardSchedule.activeRewardScheduleEntry.rewardsPerEpoch)
            } : undefined
        }});
    }
}

interface Epoch {
    id: string,
    finalized: boolean,
    epochNumber: string,
    startBlock?: {
        id: string,
        number: string,
        timestamp: string
    },
    endBlock?: {
        id: string,
        number: string,
        timestamp: string
    },
    producerBlocks: string,
    allBlocks: string,
    producerBlocksRatio: string,
    producerRewards?: {
        address: string,
        totalRewards: string,
        blocksProduced: string,
        blocksProducedRatio: string
    }[]
}

const epochProperties = {
    properties: [
        'finalized',
        'epochNumber',
        'startBlock { id, number, timestamp }',
        'endBlock { id, number, timestamp }',
        'producerBlocks',
        'allBlocks',
        'producerBlocksRatio'
    ],

    producerRewardsProperties: 'producerRewards { address, totalRewards, blocksProduced, blocksProducedRatio }',

    callback(results: Epoch[]) {
        return results.map(epoch => { return {
            id: epoch.id,
            finalizied: epoch.finalized,
            epochNumber: Number(epoch.epochNumber),
            startBlock: epoch.startBlock ? {
                id: epoch.startBlock.id,
                number: Number(epoch.startBlock.number),
                timestamp: Number(epoch.startBlock.timestamp)
            } : undefined,
            endBlock: epoch.endBlock ? {
                id: epoch.endBlock.id,
                number: Number(epoch.endBlock.number),
                timestamp: Number(epoch.endBlock.timestamp)
            } : undefined,
            producerBlocks: Number(epoch.producerBlocks),
            allBlocks: Number(epoch.allBlocks),
            producerBlocksRatio: Number(epoch.producerBlocksRatio),
            producerRewards: epoch.producerRewards ? epoch.producerRewards.map(reward => { return {
                address: reward.address,
                totalRewards: BigInt(reward.totalRewards),
                blocksProduced: Number(reward.blocksProduced),
                blocksProducedRatio: Number(reward.blocksProducedRatio)
            }}) : undefined
        }});
    }
}