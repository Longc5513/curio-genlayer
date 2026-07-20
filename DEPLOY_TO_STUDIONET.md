# Deploying Curio to GenLayer studionet

The contract address `0x679737cCE4804439f2CF6d6082224A58658D0011` exists only in **GenLayer Studio** (local sandbox). To use the live Vercel app, you must deploy to **studionet** (public testnet).

## Method 1: Deploy via GenLayer CLI (Recommended)

### Prerequisites
```bash
npm install -g @genlayer/cli
```

### Deploy command
```bash
cd c:\Users\Asus\Desktop\curio-genlayer
gl contract deploy --file contracts/curio_learning_bounties.py --network studionet
```

This will output a new contract address like `0x...`. Copy this address.

## Method 2: Deploy via GenLayer Studio UI

1. Go to https://studio.genlayer.com
2. Import or open `curio_learning_bounties.py`
3. Deploy to studionet from the UI
4. Copy the resulting contract address

## After Deployment

### Update Vercel environment variables

```bash
# Set contract address in Production environment
npx vercel@latest env add VITE_GENLAYER_CONTRACT_ADDRESS production \
  --cwd app \
  --token <VERCEL_TOKEN>

# When prompted, enter: [new contract address from deployment]

# Set contract address in Preview environment
npx vercel@latest env add VITE_GENLAYER_CONTRACT_ADDRESS preview \
  --cwd app \
  --token <VERCEL_TOKEN>

# When prompted, enter: [same contract address]
```

### Verify network is set to studionet

```bash
npx vercel@latest env ls --cwd app --token <VERCEL_TOKEN>
```

Should show:
- `VITE_GENLAYER_NETWORK` = `studionet` (Production)
- `VITE_GENLAYER_CONTRACT_ADDRESS` = `0x...` (your deployed contract)

### Redeploy frontend

```bash
npx vercel@latest --prod --cwd app \
  --token <VERCEL_TOKEN> \
  --yes
```

## Verify Deployment

1. Check [GenLayer Explorer](https://genlayer-explorer.vercel.app) for your contract
2. Visit https://curio-genlayer.vercel.app
3. You should see the contract is now reachable

## Testing Flow

Once deployed:
1. Connect wallet via MetaMask
2. Create a bounty (escrow GEN)
3. Submit a solution
4. Run validator consensus
5. Check payout result
