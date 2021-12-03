import { 
    producer, producers, producerSetChanges, producerRewardCollectorChanges,
    blocks, blocksPaged, epochs, rewardSchedule
} from './governance';
import { currentDistribution, distribution, distributions, account, accounts } from './distribution';
import { stakeStats, staker, stakers, stakerLeaderboard, slots, slotClaims } from './network';
import { tokenStats, balances, balance } from './token';
import {
    network as networkSEV, staker as stakerSEV, stakers as stakersSEV,
    normalizeStake, getMultiplierForPercentile, applyMultiplier,
    getCumulativeNormalizedStake, getTotalCumulativeNormalizedStake
} from './network-sev';
import { currentDistribution as currentDistributionSEV, distribution as distributionSEV,
    distributions as distributionsSEV, account as accountSEV, accounts as accountsSEV,
    debtTotal
} from './distribution-sev';
import { Network, GOVERNANCE_CONTRACT, DISTRIBUTOR_CONTRACT, NETWORK_CONTRACT, TOKEN_CONTRACT, DISTRIBUTORSEV_CONTRACT } from './constants';

// https://stackoverflow.com/questions/48011353/how-to-unwrap-type-of-a-promise
type ThenArgRecursive<T> = T extends PromiseLike<infer U>
  ? { 0: ThenArgRecursive<U>; 1: U }[U extends PromiseLike<any> ? 0 : 1]
  : T;

async function timeseries<F extends (...any) => any>({blocks, timestamps, network, target}: {blocks?: number[], timestamps?: number[], network: Network, target: F}, targetArguments?: {}): Promise<{block?: number, timestamp?: number, data: ThenArgRecursive<ReturnType<F>>}[]> {
    if(!target)
        throw new Error("Target function undefined");
	if(!blocks && !timestamps)
        throw new Error("Timeframe undefined");

    if (blocks) {
        return Promise.all(blocks.map(async (block) => ({
            block,
            data: await target({block, network, ...targetArguments})
        })));
    }
    else {
        return Promise.all(timestamps.map(async (timestamp) => ({
            timestamp,
            data: await target({timestamp, network, ...targetArguments})
        })));
    }
}

export { 
    producer, producers, producerSetChanges, producerRewardCollectorChanges,
    blocks, blocksPaged, epochs, rewardSchedule,
    currentDistribution, distribution, distributions, account, accounts,
    stakeStats, staker, stakers, stakerLeaderboard, slots, slotClaims,
    tokenStats, balances, balance,
    networkSEV, stakerSEV, stakersSEV,
    normalizeStake, getMultiplierForPercentile, applyMultiplier,
    getCumulativeNormalizedStake, getTotalCumulativeNormalizedStake,
    currentDistributionSEV, distributionSEV, distributionsSEV, accountSEV,
    accountsSEV, debtTotal,
    timeseries,
    Network, GOVERNANCE_CONTRACT, DISTRIBUTOR_CONTRACT, NETWORK_CONTRACT, TOKEN_CONTRACT, DISTRIBUTORSEV_CONTRACT
};
