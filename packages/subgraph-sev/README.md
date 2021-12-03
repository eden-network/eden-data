# subgraph

To build, prepare for either mainnet or ropsten
```sh
yarn run prepare:mainnet
```

Next, generate the binding code --  this needs to be done whenever the schema changes
```sh
yarn run codegen
```

Finally, build
```
yarn run build
```
