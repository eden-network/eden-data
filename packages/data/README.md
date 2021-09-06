# @eden-network/data

This package is a Javascript library that abstracts access to Eden Network subgraphs/contracts and gives a simple API for retreiving information about the Eden Network.

## Supported Queries

The below all return a Promise that resolves with the requested results.

For most queries, `block` and `timestamp` are optional parameters to do a time-travel query.

1. `producer({producerAddress, block, timestamp, network})` Get information on a specific block producer
2. `producers({block, timestamp, network})` Get information about block producers
3. `producerSetChanges({startBlock, endblock, timestamp, network})` Get changes to the block producer set
4. `producerRewardCollectorChanges({startBlock, endblock, timestamp, network})` Get changes to block producer collectors
5. `blocks({startBlock, endblock, timestamp, network})` Get a range of blocks
6. `blocksPaged({start, num, network})` Get blocks paginated 
7. `rewardSchedule({block, timestamp, network})` Get information on rewards
8. `epochs({startEpochNumber, endEpochNumber, includeRewards, network})` Get a range of reward epochs
9. `currentDistribution({block, timestamp, network})` Get current reward distribution
10. `distribution({distributionNumber, block, timestamp, network})` Get a specific reward distribution
11. `distributions({block, timestamp, network})` Get reward distributions
12. `account({accountAddress, block, timestamp, network})` Get a specific reward account
13. `accounts({block, timestamp, network})` Get reward accounts
14. `claims({accountAddress, block, timestamp, network})` Get reward claims for an account
15. `slashes({accountAddress, block, timestamp, network})` Get reward slashes for an account
16. `stakerStats({block, timestamp, network})` Get statistics on stakers
17. `staker({staker, block, timestamp, network})` Get information on a specific staker
18. `stakers({block, timestamp, network})` Get information on stakers
19. `stakerLeaderboard({block, timestamp, network, start, num})` Get stakers paginated
20. `slots({block, timestamp, network})` Get information on slots
21. `slotClaims({block, slotIndex, network})` Get slot claims
## Example

```javascript
import { slots } from '@eden-network/data';

slots({block: 13069287, network: "mainnet"})
    .then(slots => console.log(slots));
```
