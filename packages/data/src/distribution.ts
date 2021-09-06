import { request, gql } from 'graphql-request';
import { GRAPH_API_ENDPOINTS, DISTRIBUTOR_CONTRACT, Network } from './constants';
import { makeCodition, timestampToBlock } from './governance';
const graphResultsPager = require('graph-results-pager');

export async function currentDistribution({block, timestamp, network}: {block?: number, timestamp?: number, network: Network} = {network: 'mainnet'}) {
    const condition = await makeCodition({block, timestamp, network});

    const result = await request(GRAPH_API_ENDPOINTS[network].distribution,
        gql`{
                distributor(id: "${DISTRIBUTOR_CONTRACT[network]?.address}", ${condition}) {
                    currentDistribution {
                        ${distributionProperties.properties.toString()}
                    }
                }
            }`
    );

    return result.distributor?.currentDistribution
        ? distributionProperties.callback([result.distributor?.currentDistribution])[0]
        : undefined;
}

export async function distribution({distributionNumber, block, timestamp, network}: {distributionNumber: number, block?: number, timestamp?: number, network: Network}) {
    const condition = await makeCodition({block, timestamp, network});

    const result = await request(GRAPH_API_ENDPOINTS[network].distribution,
        gql`{
                distributions(where: {distributionNumber: ${distributionNumber}}, ${condition}) {
                    ${distributionProperties.properties.toString()}
                }
            }`
    );

    return result.distributions ? distributionProperties.callback(result.distributions)[0] : undefined;
}

export async function distributions({block, timestamp, network}: {block?: number, timestamp?: number, network: Network} = {network: 'mainnet'}) {
    const promise = graphResultsPager({
        api: GRAPH_API_ENDPOINTS[network].distribution,
        query: {
            entity: 'distributions',
            selection: {
                block: block ? { number: block } : timestamp ? { number: await timestampToBlock(timestamp, network) } : undefined
            },
            properties: distributionProperties.properties
        }
    }) as Promise<Distribution[]>;

    return promise
        .then(results => distributionProperties.callback(results))
        .then(results => results.sort((a, b) => a.distributionNumber - b.distributionNumber));
}

export async function account({accountAddress, block, timestamp, network}: {accountAddress: string, block?: number, timestamp?: number, network: Network}) {
    const condition = await makeCodition({block, timestamp, network});

    const result = await request(GRAPH_API_ENDPOINTS[network].distribution,
        gql`{
                account(id: "${accountAddress.toLowerCase()}", ${condition}) {
                    ${accountProperties.properties.toString()}
                }
            }`
    );

    return result.account ? accountProperties.callback([result.account])[0] : undefined;
}

export async function accounts({block, network}: {block?: number, network: Network} = {network: 'mainnet'}) {
    const promise = graphResultsPager({
        api: GRAPH_API_ENDPOINTS[network].distribution,
        query: {
            entity: 'accounts',
            selection: {
                block: block ? { number: block } : undefined
            },
            properties: accountProperties.properties
        }
    }) as Promise<Account[]>;

    return promise.then(results => accountProperties.callback(results));
}

export async function claims({accountAddress, block, timestamp, network}: {accountAddress?: string, block?: number, timestamp?: number, network: Network} = {network: 'mainnet'}) {
    const promise = graphResultsPager({
        api: GRAPH_API_ENDPOINTS[network].distribution,
        query: {
            entity: 'claims',
            selection: {
                block: block ? { number: block } : timestamp ? { number: await timestampToBlock(timestamp, network) } : undefined,
                where: accountAddress ? {
                    account: accountAddress
                } : undefined
            },
            properties: claimProperties.properties.concat(accountAddress ? claimProperties.accountProperties : [])
        }
    }) as Promise<Claim[]>;

    return promise
        .then(results => claimProperties.callback(results))
        .then(results => results.sort((a, b) => a.timestamp - b.timestamp));
}

export async function slashes({accountAddress, block, timestamp, network}: {accountAddress?: string, block?: number, timestamp?: number, network: Network} = {network: 'mainnet'}) {
    const promise = graphResultsPager({
        api: GRAPH_API_ENDPOINTS[network].distribution,
        query: {
            entity: 'slashes',
            selection: {
                block: block ? { number: block } : timestamp ? { number: await timestampToBlock(timestamp, network) } : undefined,
                where: accountAddress ? {
                    account: accountAddress
                } : undefined
            },
            properties: slashProperties.properties.concat(accountAddress ? slashProperties.accountProperties : [])
        }
    }) as Promise<Slash[]>;

    return promise
        .then(results => slashProperties.callback(results))
        .then(results => results.sort((a, b) => a.timestamp - b.timestamp));
}
interface Distribution {
    id: string,
    timestamp: string,
    distributionNumber: string,
    merkleRoot: string,
    metadataURI: string
}

const distributionProperties = {
    properties: [
        'id',
        'timestamp',
        'distributionNumber',
        'merkleRoot',
        'metadataURI'
    ],

    callback(results: Distribution[]) {
        return results.map(distribution => { return {
            ...distribution,
            timestamp: Number(distribution.timestamp),
            distributionNumber: Number(distribution.distributionNumber)
        }});
    }
}

interface Account {
    id: string,
    totalClaimed: string,
    totalSlashed: string
}

const accountProperties = {
    properties: [
        'id',
        'totalClaimed',
        'totalSlashed'
    ],

    callback(results: Account[]) {
        return results.map(account => { return {
            id: account.id,
            totalClaimed: BigInt(account.totalClaimed),
            totalSlashed: BigInt(account.totalSlashed)
        }});
    }
}

interface Claim {
    id: string,
    timestamp: string,
    index: string,
    totalEarned: string,
    claimed: string,
    account?: {
        id: string,
        totalClaimed: string,
        totalSlashed: string
    }
}

const claimProperties = {
    properties: [
        'id',
        'timestamp',
        'index',
        'totalEarned',
        'claimed'
    ],

    accountProperties: [
        'account { id, totalClaimed, totalSlashed }'
    ],

    callback(results: Claim[]) {
        return results.map(claim => { return {
            id: claim.id,
            timestamp: Number(claim.timestamp),
            index: Number(claim.index),
            totalEarned: BigInt(claim.totalEarned),
            claimed: BigInt(claim.claimed),
            account: claim.account ? { 
                id: claim.account.id,
                totalClaimed: BigInt(claim.account.totalClaimed),
                totalSlashed: BigInt(claim.account.totalSlashed)
            } : undefined
        }});
    }
}

interface Slash {
    id: string,
    timestamp: string,
    slashed: string,
    account?: {
        id: string,
        totalClaimed: string,
        totalSlashed: string
    }
}

const slashProperties = {
    properties: [
        'id',
        'timestamp',
        'slashed'
    ],

    accountProperties: [
        'account { id, totalClaimed, totalSlashed }'
    ],

    callback(results: Slash[]) {
        return results.map(slash => { return {
            id: slash.id,
            timestamp: Number(slash.timestamp),
            slashed: BigInt(slash.slashed),
            account: slash.account ? {
                id: slash.account.id,
                totalClaimed: BigInt(slash.account.totalClaimed),
                totalSlashed: BigInt(slash.account.totalSlashed)
            } : undefined
        }});
    }
}
