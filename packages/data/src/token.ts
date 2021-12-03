import { request, gql } from 'graphql-request';
import { GRAPH_API_ENDPOINTS, TOKEN_CONTRACT, Network, GRAPH_MAX_ENTITIES_IN_QUERY, range } from './constants';
import { makeCodition, timestampToBlock } from './governance';

export async function tokenStats({block, network, timestamp}: {block?: number, timestamp?: number, network: Network} = {network: 'mainnet'}) {
    const condition = await makeCodition({block, timestamp, network});

    const result = await request(GRAPH_API_ENDPOINTS[network].token,
        gql`{
                token(id: "${TOKEN_CONTRACT[network].address}", ${condition}) {
                    ${tokenStatsProperies.properties.toString()}
                }
            }`
    );

    return result.token ? tokenStatsProperies.callback([result.token])[0] : undefined;
}

export async function balance({account, block, timestamp, network}: {account: string, block?: number, timestamp?: number, network: Network}) {
    const condition = await makeCodition({block, timestamp, network});

    const result = await request(GRAPH_API_ENDPOINTS[network].token,
        gql`{
                balance(id: "${account}", ${condition}) {
                    ${balanceProperties.properties.toString()}
                }
            }`
    );

    return result.balance ? balanceProperties.callback([result.balance])[0].balance : BigInt(0);
}

export async function balances({block, network, timestamp}: {block?: number, timestamp?: number, network: Network} = {network: 'mainnet'}) {
    const numBalances = (await tokenStats({block, network, timestamp})).numBalances;
    const startIndex = 0;
    let numChunks = Math.floor(numBalances / GRAPH_MAX_ENTITIES_IN_QUERY);
    let lastAmount = numBalances % GRAPH_MAX_ENTITIES_IN_QUERY;
    if (lastAmount !== 0)
        ++numChunks
    else
        lastAmount = GRAPH_MAX_ENTITIES_IN_QUERY;

    const condition = await makeCodition({block, timestamp, network});
    const promises = range(numChunks)
        .map(x => x * GRAPH_MAX_ENTITIES_IN_QUERY)
        .map((offset, index) => {
            const start = startIndex + offset;
            const end = start + (index === numChunks - 1 ? lastAmount : GRAPH_MAX_ENTITIES_IN_QUERY) - 1;
            return request(GRAPH_API_ENDPOINTS[network].token,
                gql`{
                        balances(orderBy: index, orderDirection: asc, where: { index_gte: ${start}, index_lte: ${end} }, ${condition}) {
                            ${balanceProperties.properties.toString()}
                        }
                    }`
            );
        });

    return Promise.all(promises)
        .then(results => results.flatMap(result => result.balances ? balanceProperties.callback(result.balances) : []));
}

interface TokenStats {
    id: string,
    numBalances: string,
    totalSupply: string
    circulatingSupply: string,
    numHolders: string,
    numTransfers: string
}

const tokenStatsProperies = {
    properties: [
        'id',
        'numBalances',
        'totalSupply',
        'circulatingSupply',
        'numHolders',
        'numTransfers'
    ],

    callback(results: TokenStats[]) {
        return results.map(token => { return {
            id: token.id,
            numBalances: Number(token.numBalances),
            totalSupply: BigInt(token.totalSupply),
            circulatingSupply: BigInt(token.circulatingSupply),
            numHolders: Number(token.numHolders),
            numTransfers: Number(token.numTransfers)
        }});
    }
}

interface Balance {
    id: string,
    balance: string,
    index: string
}

const balanceProperties = {
    properties: [
        'id',
        'balance',
        'index'
    ],

    callback(results: Balance[]) {
        return results.map(balance => { return {
            id: balance.id,
            index: Number(balance.index),
            balance: BigInt(balance.balance)
        }});
    }
}