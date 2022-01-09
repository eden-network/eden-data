import { request, gql } from 'graphql-request';
import { GRAPH_API_ENDPOINTS, NETWORK_CONTRACT, Network, GRAPH_MAX_ENTITIES_IN_QUERY, range } from './constants';
import { makeCodition, timestampToBlock } from './governance';
const isqrt = require('bigint-isqrt');
const lerp = require('lerp');

const ZERO = BigInt(0);
const FOUR = BigInt(4);
const TEN_THOUSAND = BigInt(10000);
const WEI = BigInt("1000000000000000000");

export async function network({block, network_, timestamp}: {block?: number, timestamp?: number, network_: Network} = {network_: 'mainnet'}) {
    const condition = await makeCodition({block, timestamp, network: network_});

    const result = await request(GRAPH_API_ENDPOINTS[network_].networkSEV,
        gql`{
                network(id: "${NETWORK_CONTRACT[network_].address}", ${condition}) {
                    ${networkProperties.properties.toString()}
                }
            }`
    );

    return result.network ? networkProperties.callback([result.network])[0] : undefined;
}

export async function staker({account, block, timestamp, network}: {account: string, block?: number, timestamp?: number, network: Network}) {
    const condition = await makeCodition({block, timestamp, network});

    const result = await request(GRAPH_API_ENDPOINTS[network].networkSEV,
        gql`{
                staker(id: "${account}", ${condition}) {
                    ${stakerProperties.properties.toString()}
                }
            }`
    );

    return result.staker ? stakerProperties.callback([result.staker])[0] : undefined;
}

export async function stakers({block, network_, timestamp}: { block?: number, timestamp?: number, network_: Network }) {
    const numStakers = (await network({block, network_, timestamp})).numStakers;
    const startIndex = 0;
    let numChunks = Math.floor(numStakers / GRAPH_MAX_ENTITIES_IN_QUERY);
    let lastAmount = numStakers % GRAPH_MAX_ENTITIES_IN_QUERY;
    if (lastAmount !== 0)
        ++numChunks
    else
        lastAmount = GRAPH_MAX_ENTITIES_IN_QUERY;

    const condition = await makeCodition({block, timestamp, network: network_});
    const boundaries = range(numChunks)
        .map(x => x * GRAPH_MAX_ENTITIES_IN_QUERY)
        .map((offset, index) => {
            const start = startIndex + offset;
            const end = start + (index === numChunks - 1 ? lastAmount : GRAPH_MAX_ENTITIES_IN_QUERY) - 1;
            return {start, end};
        });

    const results = [];
    for (let i = 0 ; i < boundaries.length ; ++i) {
        results.push(await request(GRAPH_API_ENDPOINTS[network_].networkSEV,
            gql`{
                    stakers(orderBy: index, orderDirection: asc, where: { index_gte: ${boundaries[i].start}, index_lte: ${boundaries[i].end} }, ${condition}) {
                        ${stakerProperties.properties.toString()}
                    }
                }`
        ));
    }

    return results.flatMap(result => result.stakers ? stakerProperties.callback(result.stakers) : []);
}

interface NetworkDef {
    id: string,
    totalStaked: string,
    totalNormalizedStaked: string
    totalCumulativeNormalizedStaked: string,
    totalCumulativeNormalizedStakedLastBlock: string,
    numStakers: string
}

const networkProperties = {
    properties: [
        'id',
        'totalStaked',
        'totalNormalizedStaked',
        'totalCumulativeNormalizedStaked',
        'totalCumulativeNormalizedStakedLastBlock',
        'numStakers'
    ],

    callback(results: NetworkDef[]) {
        return results.map(result => { return {
            id: result.id,
            totalStaked: BigInt(result.totalStaked),
            totalNormalizedStaked: BigInt(result.totalNormalizedStaked),
            totalCumulativeNormalizedStaked: BigInt(result.totalCumulativeNormalizedStaked),
            totalCumulativeNormalizedStakedLastBlock: Number(result.totalCumulativeNormalizedStakedLastBlock),
            numStakers: Number(result.numStakers)
        }});
    }
}

interface Staker {
    id: string,
    index: string,
    staked: string
    normalizedStaked: string,
    cumulativeNormalizedStaked: string,
    cumulativeNormalizedStakedLastBlock: string
}

const stakerProperties = {
    properties: [
        'id',
        'index',
        'staked',
        'normalizedStaked',
        'cumulativeNormalizedStaked',
        'cumulativeNormalizedStakedLastBlock'
    ],

    callback(results: Staker[]) {
        return results.map(staker => { return {
            id: staker.id,
            index: Number(staker.index),
            staked: BigInt(staker.staked),
            normalizedStaked: BigInt(staker.normalizedStaked),
            cumulativeNormalizedStaked: BigInt(staker.cumulativeNormalizedStaked),
            cumulativeNormalizedStakedLastBlock: Number(staker.cumulativeNormalizedStakedLastBlock)
        }});
    }
}

// f[x_] = Min[x, 1000] + 4 * Sqrt[Max[x - 1000, 0]]
export function normalizeStake(wei: bigint, dampening_point: bigint): bigint {
    wei = wei / WEI;
    const base = wei > dampening_point ? dampening_point : wei;
    const extra = wei > dampening_point ? wei - dampening_point : ZERO;
    return (base + (FOUR * isqrt(extra))) * WEI;
}

export function getMultiplierForPercentile(percentile: number): number {    
    if (percentile < 0 || percentile > 100)
        throw new Error("Invalid percentile");
    if (percentile === 0)
        return 1;
    else if (percentile === 100)
        return 4;
    else if (percentile < 50)
        return lerp(1, 2, 1 - ((50 - percentile) / 50));
    else if (percentile >= 50)
        return lerp(2, 4, 1 - ((50 - (percentile - 50)) / 50));
}

export function applyMultiplier(wei: bigint, multiplier: number) {
    return (BigInt(Math.floor(multiplier * 10000)) * wei) / TEN_THOUSAND;
}

interface StakerShaped {
    normalizedStaked: bigint,
    cumulativeNormalizedStaked: bigint,
    cumulativeNormalizedStakedLastBlock: number
}

export function getCumulativeNormalizedStake(first: StakerShaped, firstBlockNumber: number, last: StakerShaped, lastBlockNumber: number) {
    let start = first.cumulativeNormalizedStaked;
    if (first.cumulativeNormalizedStakedLastBlock < firstBlockNumber) {
        const extraBlocks = firstBlockNumber - first.cumulativeNormalizedStakedLastBlock;
        const extraCumulativeNormalizedStake = first.normalizedStaked * BigInt(extraBlocks);
        start += extraCumulativeNormalizedStake;
    }
    const extraBlocks = lastBlockNumber - last.cumulativeNormalizedStakedLastBlock + 1;
    const extraCumulativeNormalizedStake = last.normalizedStaked * BigInt(extraBlocks);
    return last.cumulativeNormalizedStaked - start + extraCumulativeNormalizedStake;
}

interface NetworkShaped {
    totalNormalizedStaked: bigint,
    totalCumulativeNormalizedStaked: bigint,
    totalCumulativeNormalizedStakedLastBlock: number,
}

export function getTotalCumulativeNormalizedStake(first: NetworkShaped, firstBlockNumber: number, last: NetworkShaped, lastBlockNumber: number) {
    let start = first.totalCumulativeNormalizedStaked;
    if (first.totalCumulativeNormalizedStakedLastBlock < firstBlockNumber) {
        const extraBlocks = firstBlockNumber - first.totalCumulativeNormalizedStakedLastBlock;
        const extraTotalCumulativeNormalizedStake = first.totalNormalizedStaked * BigInt(extraBlocks);
        start += extraTotalCumulativeNormalizedStake;
    }
    const extraBlocks = lastBlockNumber - last.totalCumulativeNormalizedStakedLastBlock + 1;
    const extraTotalCumulativeNormalizedStake = last.totalNormalizedStaked * BigInt(extraBlocks);
    return last.totalCumulativeNormalizedStaked - start + extraTotalCumulativeNormalizedStake;
}