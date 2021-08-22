# @eden-network/data

This package is a Javascript library that abstracts access to Eden Network subgraphs/contracts and gives a simple API for retreiving information about the Eden Network.

## Supported Queries

The below all return a Promise that resolves with the requested results.

1. `producer({producerAddress, block, network})` Get information on a specific block producer
2. `producers({block, network})` Get information about block producers
3. `producerSetChanges({startBlock, endBlock, network})` Get changes to the block producer set
4. `producerRewardCollectorChanges({startBlock, endBlock, network})` Get changes to block producer collectors
5. `blocks({startBlock, endBlock, network})` Get a range of blocks
6. `blocksPaged({start, num, network})` Get blocks paginated 
7. `rewardSchedule({block, network})` Get information on rewards
8. `epochs({startEpochNumber, endEpochNumber, includeRewards, network})` Get a range of reward epochs
9. `currentDistribution({block, network})` Get current reward distribution
10. `distribution({distributionNumber, block, network})` Get a specific reward distribution
11. `distributions({block, network})` Get reward distributions
12. `account({accountAddress, block, network})` Get a specific reward account
13. `accounts({block, network})` Get reward accounts
14. `claims({accountAddress, block, network})` Get reward claims for an account
15. `slashes({accountAddress, block, network})` Get reward slashes for an account
16. `stakerStats({block, network})` Get statistics on stakers
17. `staker({staker, block, network})` Get information on a specific staker
18. `stakers({block, network})` Get information on stakers
19. `stakerLeaderboard({block, network, start, num})` Get stakers paginated
20. `slots({block, network})` Get information on slots
21. `slotClaims({block, slotIndex, network})` Get slot claims
## Example

```javascript
import { slots } from '@eden-network/data';

slots({block: 13069287, network: "mainnet"})
    .then(slots => console.log(slots));
```
