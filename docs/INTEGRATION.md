# MagicBlock integration and transaction proof

[Back to 1Scratch](../README.md) · [Development guide](DEVELOPMENT.md)

This page explains where MagicBlock runs in 1Scratch and links a completed devnet game. The evidence snapshot records the verification date and scope for the completed game below.

## A completed game

This is the actual journey of **Card #12: a 1x TSLAx win**, rechecked against Solana and MagicBlock ER history on **November 27, 2026**.

| Step                                                      | Where it happened | Open the transaction                                                                                                                                                                                                      |
| --------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Buy the card and send its gameplay state to MagicBlock | Solana devnet     | [Buy + delegate](https://explorer.solana.com/tx/53UANEKHo88VbJ9FnYNNW4SMfAp89cqt6ScZj9GfpHcAuDQBregASRFoTjaVwpeS24h1HjdVWXYubo39PCoaUK8X?cluster=devnet)                                                                  |
| 2. Ask MagicBlock VRF for a random result                 | MagicBlock ER     | [Scratch / VRF request](https://explorer.solana.com/tx/45U9ihPYjS4PyZTNBNwF5RBNdyiJsgkZCuyP2SgWxueUrhLkCdTEfLBLPp29tB2QwrtV5h4maMAWZSh1SzVKknMS?cluster=custom&customUrl=https%3A%2F%2Fdevnet-as.magicblock.app%2F)       |
| 3. Receive the VRF answer and record the prize            | MagicBlock ER     | [VRF callback](https://explorer.solana.com/tx/2qry4Xuu5dZ6du3TunAP5hnSy1xy7XCGpseQ26BkiyrYsbG6U7DrVA7adPBdwX7d9jqxrZ1qnsah3MVCEF4HjdxE?cluster=custom&customUrl=https%3A%2F%2Fdevnet-as.magicblock.app%2F)                |
| 4. Finalize the result and return the card to Solana      | MagicBlock ER     | [Settle / commit + undelegate](https://explorer.solana.com/tx/Nfbsie1wBnwUNmskNw3eTVE5aBcj6Y3KrQmLwm1Kn4r1ytLn1kcLMBfhGPofaiKLbQ8dTSquiTU2WCWLWsZiESa?cluster=custom&customUrl=https%3A%2F%2Fdevnet-as.magicblock.app%2F) |
| 5. Receive the winning tokens in the wallet               | Solana devnet     | [Claim payout](https://explorer.solana.com/tx/4Z25qV2jP7m2RbQZ5ECsBVi9EJacyMWcQ7LQZXNDKx796drqGy6tDjN5Z2bcAQ3UYqBebRYbHE4z2dokbWZRd3BS?cluster=devnet)                                                                    |
| 6. Sell those tokens back to the demo treasury            | Solana devnet     | [Treasury sale](https://explorer.solana.com/tx/nLUzxgmnGQMYUnM5R6csQsuc3uH4XtHPMkEAdPhGMoLZpHniRFTcJ4JB3T78N6uux85qc224hB7YyyNCgZgRJUM?cluster=devnet)                                                                    |

The claim transferred **0.00256352 devnet TSLAx** into the player's wallet. The wallet then sold that amount for **0.999998 devnet USDC**. These are the actual recorded amounts.

There is also a **2x TSLAx win on Card #11**: [VRF callback](https://explorer.solana.com/tx/5diYtoDJZurTtknxdZdYqJBQHpK1MNVcP5CukGPN4oqfHbzAoe6jQrnLtq5oxCGVJF9BroDGTBidFt3MQQnUSkqZ?cluster=custom&customUrl=https%3A%2F%2Fdevnet-as.magicblock.app%2F) → [payout transaction](https://explorer.solana.com/tx/2Qr5iudLwfvFNsYY5BJy21WGuRrgjXNzkjvVpPVZc1o87FpQPdP9RMxWHki5E95W5vtpnK2Tb9u7Kydw7XbojwAu?cluster=devnet).

[View both card receipts and the checked on-chain data](DEVNET_EVIDENCE.json). ER links use the card's MagicBlock RPC as Solana Explorer's custom cluster.

## What MagicBlock does

### VRF: the random prize draw

**VRF means Verifiable Random Function.** 1Scratch requests randomness from MagicBlock's VRF oracle. When its answer arrives, the game uses those random bytes to select a tier from the card's public prize table.

The table is saved with the card when it is bought. That means the card's prize calculation uses the odds attached to that purchase. The app displays those odds before play and lets readers recompute a completed card's payout from the saved randomness.

The [request above](https://explorer.solana.com/tx/45U9ihPYjS4PyZTNBNwF5RBNdyiJsgkZCuyP2SgWxueUrhLkCdTEfLBLPp29tB2QwrtV5h4maMAWZSh1SzVKknMS?cluster=custom&customUrl=https%3A%2F%2Fdevnet-as.magicblock.app%2F) invokes MagicBlock's VRF program, and the [callback above](https://explorer.solana.com/tx/2qry4Xuu5dZ6du3TunAP5hnSy1xy7XCGpseQ26BkiyrYsbG6U7DrVA7adPBdwX7d9jqxrZ1qnsah3MVCEF4HjdxE?cluster=custom&customUrl=https%3A%2F%2Fdevnet-as.magicblock.app%2F) calls the 1Scratch game program with the answer.

### ER: where the scratch and reveal run

**ER means Ephemeral Rollup.** Think of it as the card's gameplay desk: the card's state temporarily runs in MagicBlock's execution environment while the scratch request and VRF answer are processed.

When the player finishes, the result is committed back and the card is returned to Solana. Buying, prize-token ownership, payouts, and treasury sales are recorded on Solana devnet.

| Part of the journey | Job                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------- |
| **Solana**          | Records the purchase, holds prize inventory, transfers tokens, and handles treasury sales |
| **MagicBlock ER**   | Runs the delegated card's scratch request, VRF callback, and settlement request           |
| **MagicBlock VRF**  | Supplies the randomness used to choose the prize tier                                     |

The app's **Verify this card** panel exposes the transactions and checks the payout calculation. The receipts and arithmetic check are inspectable evidence; the panel does not independently verify the oracle's cryptographic proof.

## Follow the implementation

| Integration | Source |
| --- | --- |
| MagicBlock ER and VRF SDK dependency | [Program dependencies](../programs/scratchers/Cargo.toml#L31) |
| Delegate a purchased card | [`delegate_card`](../programs/scratchers/src/lib.rs#L171) |
| Request randomness on ER | [`scratch`](../programs/scratchers/src/lib.rs#L189) |
| Record the VRF result | [`vrf_callback`](../programs/scratchers/src/lib.rs#L218) |
| Commit and undelegate | [`settle_card`](../programs/scratchers/src/lib.rs#L254) |
| Authenticate the callback signer | [`VrfCallbackCtx`](../programs/scratchers/src/lib.rs#L494) |
| Route gameplay to the card's ER | [MagicBlock router lookup](../app/lib/program.ts#L71) |
| Run the player's transactions | [Frontend game flow](../app/lib/game.ts) |

Only the card's state is delegated. The program is deployed on Solana, and the house, reference prices, token inventory, claims, and treasury sales stay on Solana. VRF supplies the randomness; ER supplies the gameplay execution environment. VRF can also be used without ER; 1Scratch uses both.

## Why can the VRF identity show “Account does not exist”?

`2H8Qw2c1iAyQFTHfx6A16JZkDVBaCc4eLxU6s1RS94YR` is the scoped callback signer PDA for this game, derived under MagicBlock's VRF program from `identity` and the game program ID. It is an authority address, not the executable VRF program or a prize-data account. A PDA can be used for signing without an initialized storage account at that address; deriving an address and creating an account are separate operations. See [Solana's PDA account documentation](https://solana.com/developers/docs/core/pda/pda-accounts).

The actual VRF program is `Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz`. The callback context checks both the expected identity address and its signer privilege. In Card #12's successful callback, the VRF program invokes the game with that identity. This signer privilege is granted within the cross-program call; the PDA is not an outer transaction signer.

## Recheck a receipt

```sh
npx tsx scripts/verify_receipt.ts 2QrwExUdu93o8mSdfEh6kvbNLTbN1UnVRrfyjQsDSUPE 12
```

This read-only command checks the saved prize calculation and locates the Solana purchase/claim and ER request/callback/settlement history. It does not sign or send transactions. See [the development guide](DEVELOPMENT.md#checks-and-transaction-evidence) for the wider verification workflow.
