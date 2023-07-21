# MyCoin Chain

## Description
- This repository is a homework of new technologies course at University of Science - HCM
- This repository runs a blockchain (core) and serves REST API on it

## Usage
- Create .env file at root folder
- Install packages: ```npm install```
- Start app
```bash
npm run build
npm start
```

- Start app with dev mode:
```bash
npm run start:dev
```

## Usefull APIs for miner
- View blockchain
```
curl --location 'http://localhost:5000/blocks'
```

- Mine block: you will get mining reward
```
curl --location --request POST 'http://localhost:5000/blocks/mining'
```

- View public address:
```
curl --location 'http://localhost:5000/wallet/me'
```

- Download keystore file (will be used in wallet UI)
```
curl --location 'http://localhost:5000/wallet/keystore'
```

- View transaction pool:
```
curl --location 'http://localhost:5000/transactions/pool'
```

- Add peer connection
```
curl --location 'http://localhost:5000/peers' \
--header 'Content-Type: application/json' \
--data '{
    "address": "ws://localhost:6001"
}'
```

## Frontend repository
https://github.com/huyleminh/mycoin-frontend

## SDK
https://github.com/huyleminh/mycoin-sdk

## References
- https://github.com/lhartikk/naivecoin
