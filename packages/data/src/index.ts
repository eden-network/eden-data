import { 
    producer, producers, producerSetChanges, producerRewardCollectorChanges,
    blocks, blocksPaged, epochs, rewardSchedule
} from './governance';
import { currentDistribution, distribution, distributions, account, accounts } from './distribution';
import { stakeStats, staker, stakers, stakerLeaderboard, slots, slotClaims } from './network';
import { Network, GOVERNANCE_CONTRACT, DISTRIBUTOR_CONTRACT, NETWORK_CONTRACT, TOKEN_CONTRACT } from './constants';

async function timeseries({blocks, network, target}: {blocks: number[], network: Network, target}, targetArguments: {}) {
    return Promise.all(blocks.map(async (block) => ({
        block,
        data: await target({block, network, ...targetArguments})
    })));
}

export { 
    producer, producers, producerSetChanges, producerRewardCollectorChanges,
    blocks, blocksPaged, epochs, rewardSchedule,
    currentDistribution, distribution, distributions, account, accounts,
    stakeStats, staker, stakers, stakerLeaderboard, slots, slotClaims,
    timeseries,
    Network, GOVERNANCE_CONTRACT, DISTRIBUTOR_CONTRACT, NETWORK_CONTRACT, TOKEN_CONTRACT
};
