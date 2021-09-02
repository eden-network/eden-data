import { request, gql } from 'graphql-request';
import { GRAPH_API_ENDPOINTS, NETWORK_CONTRACT, Network } from './constants';
const graphResultsPager = require('graph-results-pager');

export async function stakeStats({block, network, includePercentiles}: {block?: number, network: Network, includePercentiles: boolean} = {network: 'mainnet', includePercentiles: true}) {
    const blockCondition = block ? `block: { number: ${block} }` : '';

    const result = await request(GRAPH_API_ENDPOINTS[network].network,
        gql`{
                network(id: "${NETWORK_CONTRACT[network].address}", ${blockCondition}) {
                    ${includePercentiles ? stakeStatsProperies.properties.toString() : stakeStatsProperies.propertiesWithoutPercentiles.toString()}
                }
            }`
    );

    return result.network ? stakeStatsProperies.callback([result.network])[0] : undefined;
}

export async function staker({staker, block, network}: {staker: string, block?: number, network: Network}) {
    const blockCondition = block ? `block: { number: ${block} }` : '';

    const result = await request(GRAPH_API_ENDPOINTS[network].network,
        gql`{
                staker(id: "${staker}", ${blockCondition}) {
                    ${stakerProperties.properties.toString()}
                }
            }`
    );

    return result.staker ? stakerProperties.callback([result.staker])[0] : undefined;
}

export async function stakers({block, network}: {block?: number, network: Network} = {network: 'mainnet'}) {
    const promise = graphResultsPager({
        api: GRAPH_API_ENDPOINTS[network].network,
        query: {
            entity: 'stakers',
            selection: {
                block: block ? { number: block } : undefined
            },
            properties: stakerProperties.properties
        }
    }) as Promise<Staker[]>;

    return promise
        .then(results => stakerProperties.callback(results))
        .then(results => results.sort((a, b) => a.rank - b.rank));
}

export async function stakerLeaderboard({block, network, start, num}: {block?: number, start: number, num: number, network: Network}) {
    const blockCondition = block ? `block: { number: ${block} }` : '';

    const result = await request(GRAPH_API_ENDPOINTS[network].network,
        gql`{
                stakers(where: {rank_gte: ${start}}, orderBy: rank, first: ${num}, ${blockCondition}) {
                    ${stakerProperties.properties.toString()}
                }
            }`
    );

    return result.stakers ? stakerProperties.callback(result.stakers) : undefined;
}

export async function slots({block, network}: {block?: number, network: Network} = {network: 'mainnet'}) {
    const blockCondition = block ? `block: { number: ${block} }` : '';

    const result = await request(GRAPH_API_ENDPOINTS[network].network,
        gql`{
                network(id: "${NETWORK_CONTRACT[network].address}", ${blockCondition}) {
                    slot0 { ${slotProperties.properties.toString()} },
                    slot1 { ${slotProperties.properties.toString()} },
                    slot2 { ${slotProperties.properties.toString()} }
                }
            }`
    );

    return result.network 
        ? slotProperties.callback([result.network.slot0, result.network.slot1, result.network.slot2])
        : undefined;
}

export async function slotClaims({block, slotIndex, network}: {block?: number, slotIndex: number, network: Network}) {
    const blockCondition = block ? `block: { number: ${block} }` : '';

    const key = `slot${slotIndex}`;
    const result = await request(GRAPH_API_ENDPOINTS[network].network,
        gql`{
                network(id: "${NETWORK_CONTRACT[network].address}", ${blockCondition}) {
                    ${key} { claims {${slotClaimProperties.properties.toString()} } }
                }
            }`
    );

    return result?.network[key]?.claims 
        ? slotClaimProperties.callback(result?.network[key]?.claims)
        : undefined;
}

interface StakeStats {
    id: string,
    numStakers: string,
    totalStaked: string
    stakedPercentiles?: string[]
}

const stakeStatsProperies = {
    properties: [
        'id',
        'numStakers',
        'totalStaked',
        'stakedPercentiles'
    ],

    propertiesWithoutPercentiles: [
        'id',
        'numStakers',
        'totalStaked'
    ],

    callback(results: StakeStats[]) {
        return results.map(network => { return {
            id: network.id,
            numStakers: Number(network.numStakers),
            totalStaked: BigInt(network.totalStaked),
            stakedPercentiles: network.stakedPercentiles !== undefined ? network.stakedPercentiles.map(x => BigInt(x)) : undefined
        }});
    }
}

interface Staker {
    id: string,
    staked: string,
    rank?: string
}

const stakerProperties = {
    properties: [
        'id',
        'staked',
        'rank'
    ],

    callback(results: Staker[]) {
        return results.map(staker => { return {
            id: staker.id,
            staked: BigInt(staker.staked),
            rank: staker.rank != null ? Number(staker.rank) : undefined
        }});
    }
}

interface Slot {
    id: string,
    owner: string,
    delegate: string,
    winningBid: string,
    oldBid: string,
    startTime: string
    expirationTime: string,
    taxRatePerDay: string
}

const slotProperties = {
    properties: [
        'id',
        'owner',
        'delegate',
        'winningBid',
        'oldBid',
        'startTime',
        'expirationTime',
        'taxRatePerDay'
    ],

    callback(results: Slot[]) {
        return results.map(slot => { return {
            id: slot.id,
            owner: slot.owner,
            delegate: slot.delegate,
            winningBid: BigInt(slot.winningBid),
            oldBid: BigInt(slot.oldBid),
            startTime: Number(slot.startTime),
            expirationTime: Number(slot.expirationTime),
            taxRatePerDay: Number(slot.taxRatePerDay)
        }});
    }
}

interface SlotClaim {
    id: string,
    owner: string,
    winningBid: string,
    oldBid: string,
    startTime: string,
    expirationTime: string,
    taxRatePerDay: string
}

const slotClaimProperties = {
    properties: [
        'id',
        'owner',
        'winningBid',
        'oldBid',
        'startTime',
        'expirationTime',
        'taxRatePerDay'
    ],

    callback(results: SlotClaim[]) {
        return results.map(slot => { return {
            id: slot.id,
            owner: slot.owner,
            winningBid: BigInt(slot.winningBid),
            oldBid: BigInt(slot.oldBid),
            startTime: Number(slot.startTime),
            expirationTime: Number(slot.expirationTime),
            taxRatePerDay: Number(slot.taxRatePerDay)
        }});
    }
}