# Push Curio to GitHub

The repository is prepared for a normal public GitHub project: CI, Dependabot, a Pages workflow, issue/PR templates, secret checks, and push helper scripts are included.

## 1. Create an empty GitHub repository

Create the repository without adding a README, license, or `.gitignore`, because those files already exist here.

## 2. Push from Windows PowerShell

From the extracted `curio-main` folder:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\push-github.ps1 -RepoUrl "https://github.com/YOUR_NAME/curio-genlayer.git"
```

Or run the commands manually:

```powershell
git init
git add .
git commit -m "feat: launch Curio learning bounties on GenLayer"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/curio-genlayer.git
git push -u origin main
```

## 3. Verify GitHub Actions

Open the repository's **Actions** tab. The `Curio checks` workflow must pass. It checks source invariants, lints the Intelligent Contract, runs GenLayer direct-mode tests, and builds the frontend.

## 4. Deploy the contract before enabling the public app

```bash
npm install -g genlayer
genlayer network testnet-bradbury
genlayer deploy --contract contracts/curio_learning_bounties.py
```

Keep the real contract address and deployment transaction printed by the CLI. Never commit a private key or seed phrase.

Record verified evidence:

```bash
python scripts/record_deployment.py \
  --network testnetBradbury \
  --address 0xYOUR_CONTRACT_ADDRESS \
  --transaction 0xYOUR_DEPLOYMENT_TRANSACTION \
  --explorer-url https://YOUR_VERIFIED_EXPLORER_BASE
```

This creates `deployment.json`, writes the local ignored `app/.env`, and prints the three GitHub repository variables needed by the Pages workflow.

## 5. Configure GitHub Pages

In **Settings → Secrets and variables → Actions → Variables**, add:

- `GENLAYER_CONTRACT_ADDRESS`
- `GENLAYER_NETWORK` with value `testnetBradbury`
- `GENLAYER_EXPLORER_URL`

Then open **Settings → Pages** and choose **GitHub Actions** as the source. Run `Deploy frontend to GitHub Pages` from the Actions tab, or push a change under `app/`.

The frontend intentionally shows no fake data when a real deployed contract is not configured.

## 6. Final evidence check

```bash
python scripts/verify_submission.py
```

Then follow `docs/DEMO_SCRIPT.md` and complete `DORAHACKS_SUBMISSION.md` with only verified links.
