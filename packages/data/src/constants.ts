type GraphQLEndpoints = {
    governance: string;
    distribution: string;
    network: string;
}

type Network = 'mainnet' | 'ropsten';

const GRAPH_API_ENDPOINTS: { [key in Network]: GraphQLEndpoints} = {
    ['mainnet']: {
        governance: process.env['GRAPH_MAINNET_GOVERNANCE'] ?? 'https://api.thegraph.com/subgraphs/name/eden-network/eden-network',
        distribution: process.env['GRAPH_MAINNET_DISTRIBUTION'] ?? 'https://api.thegraph.com/subgraphs/name/eden-network/eden-network',
        network: process.env['GRAPH_MAINNET_NETWORK'] ?? 'https://api.thegraph.com/subgraphs/name/eden-network/eden-network'
    },
    ['ropsten']: {
        governance: process.env['GRAPH_ROPSTEN_GOVERNANCE'] ?? 'https://api.thegraph.com/subgraphs/name/eden-network/eden-network-ropsten',
        distribution: process.env['GRAPH_ROPSTEN_DISTRIBUTION'] ?? 'https://api.thegraph.com/subgraphs/name/eden-network/eden-network-ropsten',
        network: process.env['GRAPH_MAINNET_NETWORK'] ?? 'https://api.thegraph.com/subgraphs/name/eden-network/eden-network-ropsten'
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

export { 
    GRAPH_API_ENDPOINTS,
    GOVERNANCE_CONTRACT, DISTRIBUTOR_CONTRACT, NETWORK_CONTRACT, TOKEN_CONTRACT,
    Network 
};
