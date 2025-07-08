# [card.ubq.fi](https://card.ubq.fi)

Claim your UbiquityOS Reward in Visa or Mastercard.

## Setup Local Testing Environment

- copy `env.example` to `.env` and fill env vars
- fill `wrangler.toml` env vars and [set up cloudflare KV](https://developers.cloudflare.com/kv/get-started/#2-create-a-kv-namespace)
- run `yarn install`
- run the following in separate terminals

```
yarn ganache:start
yarn ganache:fund
yarn build && yarn start
```

- Use the erc20 permit url to claim a card

## How to deploy

Add following secrets to the github repository. Build and deploy workflows in this repository will take care of the rest.

- CLOUDFLARE_ACCOUNT_ID
- CLOUDFLARE_API_TOKEN
- RELOADLY_API_CLIENT_ID
- RELOADLY_API_CLIENT_SECRET
- RELOADLY_SANDBOX_API_CLIENT_ID
- RELOADLY_SANDBOX_API_CLIENT_SECRET
