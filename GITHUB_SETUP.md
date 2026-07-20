# Publish Curio to GitHub

This package is ready to replace the contents of:

```text
https://github.com/Longc5513/curio-genlayer
```

It includes the source contract, real GenLayerJS wallet flow, source tests, locked frontend dependencies, CI, and GitHub Pages deployment.

## 1. Replace the repository contents

Extract the ZIP. Open PowerShell inside the `curio-genlayer` folder and run:

```powershell
git init
git branch -M main
git remote remove origin 2>$null
git remote add origin https://github.com/Longc5513/curio-genlayer.git
git add .
git commit -m "fix: complete Studio wallet and on-chain escrow flow"
git fetch origin main
git push -u origin main --force-with-lease
```

Use `--force-with-lease` only because this package is intended to replace the earlier generated version. It refuses to overwrite unexpected remote changes.

## 2. Current Studio configuration

The production frontend already defaults to:

```text
Network: studionet
Contract: 0x679737cCE4804439f2CF6d6082224A58658D0011
Studio: https://studio.genlayer.com/?import-contract=0x679737cCE4804439f2CF6d6082224A58658D0011
```

Repository variables are optional. Add them only to override the defaults after a new deployment:

- `GENLAYER_CONTRACT_ADDRESS`
- `GENLAYER_NETWORK`
- `GENLAYER_EXPLORER_URL`

## 3. Enable GitHub Pages

Open **Settings → Pages** and select **GitHub Actions** as the source. Then open **Actions → Deploy frontend to GitHub Pages → Run workflow**.

The workflow uses `npm ci`, builds the locked frontend, injects the GitHub Pages base path, and publishes `app/dist`.

## 4. Verify before submission

Run locally:

```bash
python -m pytest tests/test_contract_source.py tests/test_frontend_source.py -q
python scripts/check_project.py
npm --prefix app ci
npm --prefix app run lint
npm --prefix app run build
```

Then test the real flow in the published app:

1. Connect a MetaMask-compatible EIP-1193 wallet.
2. Allow the app to add/switch to GenLayer Studio Network.
3. Create a bounty with a positive GEN value.
4. Confirm the finalized execution and submitted GEN value shown by the UI.
5. Submit from a second account.
6. Run adjudication as requester or current contributor.
7. Confirm payout/refund external-message evidence.

The repository does not use `wallet_getSnaps`, a localStorage wallet, simulated bounties, or a silent settlement fallback.

## 5. Source/deployment match

The address above was supplied from Studio. Before final review, open the Studio import link and verify that its deployed source matches `contracts/curio_learning_bounties.py`. The packaged contract is the v1.1.0 source from the deployment bundle used before this Studio address was supplied. Verify the imported source hash before final review; redeploy and replace the address only when Studio shows a mismatch.
