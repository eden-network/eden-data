type GraphQLEndpoints = {
    governance: string;
    distribution: string;
    network: string;
    token: string;
    networkSEV: string;
    distributionSEV: string;
}

type Network = 'mainnet' | 'ropsten';

const GRAPH_API_ENDPOINTS: { [key in Network]: GraphQLEndpoints} = {
    ['mainnet']: {
        governance: process.env['GRAPH_MAINNET_GOVERNANCE'] ?? 'https://api.thegraph.com/subgraphs/name/eden-network/eden-network',
        distribution: process.env['GRAPH_MAINNET_DISTRIBUTION'] ?? 'https://api.thegraph.com/subgraphs/name/eden-network/eden-network',
        network: process.env['GRAPH_MAINNET_NETWORK'] ?? 'https://api.thegraph.com/subgraphs/name/eden-network/eden-network',
        token: process.env['GRAPH_MAINNET_TOKEN'] ?? 'https://api.thegraph.com/subgraphs/name/eden-network/eden-network-sev-2',
        networkSEV: process.env['GRAPH_MAINNET_NETWORKSEV'] ?? 'https://api.thegraph.com/subgraphs/name/eden-network/eden-network-sev-2',
        distributionSEV: process.env['GRAPH_MAINNET_DISTRIBUTIONSEV'] ?? 'https://api.thegraph.com/subgraphs/name/eden-network/eden-network-sev-2'
    },
    ['ropsten']: {
        governance: process.env['GRAPH_ROPSTEN_GOVERNANCE'] ?? 'https://api.thegraph.com/subgraphs/name/eden-network/eden-network-ropsten',
        distribution: process.env['GRAPH_ROPSTEN_DISTRIBUTION'] ?? 'https://api.thegraph.com/subgraphs/name/eden-network/eden-network-ropsten',
        network: process.env['GRAPH_ROPSTEN_NETWORK'] ?? 'https://api.thegraph.com/subgraphs/name/eden-network/eden-network-ropsten',
        token: process.env['GRAPH_ROPSTEN_TOKEN'] ?? 'https://api.thegraph.com/subgraphs/name/eden-network/eden-network-sev-ropsten',
        networkSEV: process.env['GRAPH_ROPSTEN_NETWORKSEV'] ?? 'https://api.thegraph.com/subgraphs/name/eden-network/eden-network-sev-ropsten',
        distributionSEV: process.env['GRAPH_ROPSTEN_DISTRIBUTIONSEV'] ?? 'https://api.thegraph.com/subgraphs/name/eden-network/eden-network-sev-ropsten',
    }
};

const GOVERNANCE_CONTRACT: { [key in Network]: {address: string, startBlock: number} } = {
    ['mainnet']: {
        address: '0x726adc632871ff796379da14f9d5aeb199bed505',
        startBlock: 12948292
    },
    ['ropsten']: {
        address: '0x2ee6af00afd2470f4421f4f5198bd4b30efcbee2',
        startBlock: 10746923
    }
};

const DISTRIBUTOR_CONTRACT: { [key in Network]: {address: string, startBlock: number} } = {
    ['mainnet']: {
        address: '0x2ae0f92498346b9e011ed15d8c98142dcf62f774',
        startBlock: 12948356
    },
    ['ropsten']: {
        address: '0x705b28c4214766f4c7ef599ed98832d967357303',
        startBlock: 10746924
    }
}

const NETWORK_CONTRACT: { [key in Network]: {address: string, startBlock: number} } = {
    ['mainnet']: {
        address: '0x9e3382ca57f4404ac7bf435475eae37e87d1c453',
        startBlock: 12948381
    },
    ['ropsten']: {
        address: '0xaa75de4acc8590cf8299106b24656cda2357c458',
        startBlock: 10753059
    }
}

const TOKEN_CONTRACT: { [key in Network]: {address: string, startBlock: number} } = {
    ['mainnet']: {
        address: '0x1559fa1b8f28238fd5d76d9f434ad86fd20d1559',
        startBlock: 12917300
    },
    ['ropsten']: {
        address: '0x1559fa1b8f28238fd5d76d9f434ad86fd20d1559',
        startBlock: 10727375
    }
}

const DISTRIBUTORSEV_CONTRACT: { [key in Network]: {address: string, startBlock: number} } = {
    ['mainnet']: {
        address: '0xbf5cbdfc6ef9b56501edf1d4ac97bf021e595340',
        startBlock: 13717246
    },
    ['ropsten']: {
        address: '0x7115c01915a5f48c6ee9135becba67ead4faf180',
        startBlock: 11527073
    }
}

const GRAPH_MAX_ENTITIES_IN_QUERY = 100;

const SEV_FORK_DAMPENING_POINT_BEFORE = BigInt(1000);
const SEV_FORK_DAMPENING_POINT_AFTER = BigInt(100000);
const SEV_FORK_MAINNET_BLOCK = 13987000;

const range = n => Array.from({length: n}, (value, key) => key);

export {
    GRAPH_MAX_ENTITIES_IN_QUERY, range,
    GRAPH_API_ENDPOINTS,
    GOVERNANCE_CONTRACT, DISTRIBUTOR_CONTRACT, NETWORK_CONTRACT, TOKEN_CONTRACT, DISTRIBUTORSEV_CONTRACT,
    SEV_FORK_DAMPENING_POINT_BEFORE, SEV_FORK_DAMPENING_POINT_AFTER, SEV_FORK_MAINNET_BLOCK,
    Network 
};
