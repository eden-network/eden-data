# eden-data

This repository contains tools for collecting and reporting on data in the Eden Network.

## subgraph

This subgraph indexes distributions of rewards, slot tenant changes and staking of EDEN, additions/removals of block producers from Eden Network, as well as calculates the rewards due to them based on their relative block production ratio as applied to the active emission schedule.
For full details of the calculation, see the [Eden Network whitepaper](https://edennetwork.io/EDEN_Network___Whitepaper___2021_07.pdf).

## data

This package is a Javascript library that abstracts access to Eden Network subgraphs/contracts and gives a simple API for retreiving information about the Eden Network.

