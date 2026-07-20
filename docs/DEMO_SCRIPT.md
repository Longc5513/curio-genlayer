# Demo recording script

Record one continuous demo whenever possible. Keep the wallet address, network, contract address, and transaction hashes visible.

1. Open the public Curio frontend and show the configured `testnetBradbury` network and contract address.
2. Connect a real MetaMask-compatible wallet. Show that no `localStorage` or simulated account is used.
3. Create a bounty with a clear brief, rubric, reference URL, and a visible positive GEN reward.
4. Approve the wallet transaction and open the transaction in Explorer. Verify that the create call carries the expected GEN value.
5. Switch to a second wallet and submit a public HTTPS deliverable.
6. Trigger adjudication as the requester or current contributor.
7. Show the transaction moving through validator consensus to finality.
8. Show the contract result: `paid`, `refunded`, or `more_info`, including the score and reasoning.
9. For a payout/refund, show the resulting external transfer or child transaction in Explorer.
10. Open the GitHub repository and point to:
   - `contracts/curio_learning_bounties.py`
   - independent validator re-evaluation
   - access control on adjudication
   - prompt-injection boundaries
   - the absence of silent fallback logic
   - frontend `genlayer-js` wallet/read/write integration
11. End with the live app URL, repository URL, contract address, and deployment transaction.

Do not splice in results from a different contract deployment.
