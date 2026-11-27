/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/scratchers.json`.
 */
export type Scratchers = {
  "address": "CwvfeJmKV5cEJwrUU3M12C3d97vf7MyUoT6BnSCJNqCP",
  "metadata": {
    "name": "scratchers",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Stock Scratchers — VRF scratch cards that pay prizes in tokenized stocks & Solana assets"
  },
  "instructions": [
    {
      "name": "addAsset",
      "docs": [
        "Register a prize asset + its house inventory vault."
      ],
      "discriminator": [
        81,
        53,
        134,
        142,
        243,
        73,
        42,
        179
      ],
      "accounts": [
        {
          "name": "house",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  111,
                  117,
                  115,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "house"
          ]
        },
        {
          "name": "mint"
        },
        {
          "name": "asset",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  115,
                  115,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "house"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "symbol",
          "type": {
            "array": [
              "u8",
              8
            ]
          }
        },
        {
          "name": "kind",
          "type": {
            "defined": {
              "name": "assetKind"
            }
          }
        }
      ]
    },
    {
      "name": "buyCard",
      "docs": [
        "Buy a sealed card with USDC. Snapshots the prize table + price paid."
      ],
      "discriminator": [
        113,
        142,
        149,
        246,
        22,
        115,
        156,
        154
      ],
      "accounts": [
        {
          "name": "house",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  111,
                  117,
                  115,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "asset",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  115,
                  115,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "asset.mint",
                "account": "asset"
              }
            ]
          }
        },
        {
          "name": "card",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "house.cardNonce",
                "account": "house"
              }
            ]
          }
        },
        {
          "name": "ownerAta",
          "writable": true
        },
        {
          "name": "usdcTreasury",
          "writable": true
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "claimPayout",
      "docs": [
        "Claim the prize on base layer, valued at the keeper's latest price.",
        "Blank cards (prize 0) just close out — no transfer."
      ],
      "discriminator": [
        127,
        240,
        132,
        62,
        227,
        198,
        146,
        133
      ],
      "accounts": [
        {
          "name": "house",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  111,
                  117,
                  115,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "card",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "cardId"
              }
            ]
          }
        },
        {
          "name": "asset",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  115,
                  115,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "asset.mint",
                "account": "asset"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "assetMint"
        },
        {
          "name": "ownerAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "assetMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "cardId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "delegateCard",
      "docs": [
        "Delegate the card PDA to the Ephemeral Rollup (base layer)."
      ],
      "discriminator": [
        143,
        76,
        125,
        25,
        4,
        123,
        254,
        155
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "bufferCard",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "card"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                177,
                130,
                153,
                187,
                108,
                213,
                164,
                85,
                183,
                9,
                8,
                141,
                193,
                127,
                55,
                17,
                192,
                8,
                227,
                97,
                54,
                121,
                149,
                24,
                236,
                116,
                225,
                142,
                123,
                201,
                179,
                76
              ]
            }
          }
        },
        {
          "name": "delegationRecordCard",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "card"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataCard",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "card"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "card",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "cardId"
              }
            ]
          }
        },
        {
          "name": "ownerProgram",
          "address": "CwvfeJmKV5cEJwrUU3M12C3d97vf7MyUoT6BnSCJNqCP"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "cardId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeHouse",
      "docs": [
        "One-time house setup: authority, keeper, card price, prize table."
      ],
      "discriminator": [
        180,
        46,
        86,
        125,
        135,
        107,
        214,
        28
      ],
      "accounts": [
        {
          "name": "house",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  111,
                  117,
                  115,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "usdcTreasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "house"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "keeper",
          "type": "pubkey"
        },
        {
          "name": "cardPriceUsdc",
          "type": "u64"
        },
        {
          "name": "tiers",
          "type": {
            "vec": {
              "defined": {
                "name": "tier"
              }
            }
          }
        },
        {
          "name": "maxPriceAgeSecs",
          "type": "i64"
        }
      ]
    },
    {
      "name": "processUndelegation",
      "discriminator": [
        196,
        28,
        41,
        206,
        48,
        37,
        51,
        167
      ],
      "accounts": [
        {
          "name": "baseAccount",
          "writable": true
        },
        {
          "name": "buffer",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  110,
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  101,
                  45,
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "baseAccount"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                181,
                183,
                0,
                225,
                242,
                87,
                58,
                192,
                204,
                6,
                34,
                1,
                52,
                74,
                207,
                151,
                184,
                53,
                6,
                235,
                140,
                229,
                25,
                152,
                204,
                98,
                126,
                24,
                147,
                128,
                167,
                62
              ]
            }
          }
        },
        {
          "name": "payer",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "accountSeeds",
          "type": {
            "vec": "bytes"
          }
        }
      ]
    },
    {
      "name": "scratch",
      "docs": [
        "Scratch the card on the ER: fire a VRF request against the",
        "(fee-exempt) delegated oracle queue.",
        "",
        "A pending request may be retried after a timeout. The pending seed and",
        "timestamp use the randomness field until the callback replaces it with",
        "the actual VRF result. A superseded callback cannot resolve the card."
      ],
      "discriminator": [
        201,
        202,
        192,
        54,
        188,
        196,
        244,
        22
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "card",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "cardId"
              }
            ]
          }
        },
        {
          "name": "oracleQueue",
          "docs": [
            "the base queue on Solana, and the localnet test queues."
          ],
          "writable": true
        },
        {
          "name": "programIdentity",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  100,
                  101,
                  110,
                  116,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "vrfProgram",
          "address": "Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz"
        },
        {
          "name": "slotHashes",
          "address": "SysvarS1otHashes111111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "cardId",
          "type": "u64"
        },
        {
          "name": "clientSeed",
          "type": "u8"
        }
      ]
    },
    {
      "name": "sellAsset",
      "docs": [
        "Devnet dealer redemption: return mock asset tokens to the house and",
        "receive mock USDC from its funded treasury at the current keeper price.",
        "This is a treasury quote, not a DEX trade or a redeemable stock sale."
      ],
      "discriminator": [
        234,
        62,
        61,
        70,
        99,
        53,
        89,
        20
      ],
      "accounts": [
        {
          "name": "house",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  111,
                  117,
                  115,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "asset",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  115,
                  115,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "asset.mint",
                "account": "asset"
              }
            ]
          }
        },
        {
          "name": "assetMint"
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "ownerAssetAta",
          "writable": true
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "usdcTreasury",
          "writable": true
        },
        {
          "name": "ownerUsdcAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "minUsdcOut",
          "type": "u64"
        }
      ]
    },
    {
      "name": "setPrice",
      "docs": [
        "Keeper price push (base layer). Claims read this."
      ],
      "discriminator": [
        16,
        19,
        182,
        8,
        149,
        83,
        72,
        181
      ],
      "accounts": [
        {
          "name": "house",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  111,
                  117,
                  115,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "keeper",
          "signer": true
        },
        {
          "name": "asset",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  115,
                  115,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "asset.mint",
                "account": "asset"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "priceUsdE8",
          "type": "u64"
        }
      ]
    },
    {
      "name": "settleCard",
      "docs": [
        "Commit the revealed card and undelegate it back to base (ER)."
      ],
      "discriminator": [
        150,
        103,
        52,
        73,
        54,
        67,
        201,
        57
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "card",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "cardId"
              }
            ]
          }
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "cardId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "vrfCallback",
      "docs": [
        "VRF oracle fulfillment (ER). First fulfillment wins; duplicate or late",
        "callbacks are no-ops so a card can never resolve twice."
      ],
      "discriminator": [
        248,
        224,
        55,
        227,
        56,
        10,
        108,
        36
      ],
      "accounts": [
        {
          "name": "vrfProgramIdentity",
          "docs": [
            "Scoped VRF identity signer — see SCOPED_VRF_IDENTITY note above.",
            "(Declared manually so the macro does not inject the runtime-derivation variant.)"
          ],
          "signer": true,
          "address": "2H8Qw2c1iAyQFTHfx6A16JZkDVBaCc4eLxU6s1RS94YR"
        },
        {
          "name": "card",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "randomness",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "clientSeed",
          "type": "u8"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "asset",
      "discriminator": [
        234,
        180,
        241,
        252,
        139,
        224,
        160,
        8
      ]
    },
    {
      "name": "card",
      "discriminator": [
        166,
        250,
        46,
        230,
        152,
        63,
        140,
        182
      ]
    },
    {
      "name": "house",
      "discriminator": [
        21,
        145,
        94,
        109,
        254,
        199,
        210,
        151
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "weightsMustSumToTotal",
      "msg": "Prize table weights must sum to 10_000_000 ppm"
    },
    {
      "code": 6001,
      "name": "tooManyTiers",
      "msg": "Too many prize tiers (max 8)"
    },
    {
      "code": 6002,
      "name": "emptyPrizeTable",
      "msg": "Prize table must have at least one tier"
    },
    {
      "code": 6003,
      "name": "houseInactive",
      "msg": "House is paused"
    },
    {
      "code": 6004,
      "name": "assetInactive",
      "msg": "Asset is not active"
    },
    {
      "code": 6005,
      "name": "cardNotSealed",
      "msg": "Card is not sealed"
    },
    {
      "code": 6006,
      "name": "cardNotRequested",
      "msg": "Card is not waiting on randomness"
    },
    {
      "code": 6007,
      "name": "cardNotRevealed",
      "msg": "Card is not revealed yet"
    },
    {
      "code": 6008,
      "name": "stalePrice",
      "msg": "Asset price is stale — keeper update required"
    },
    {
      "code": 6009,
      "name": "mathOverflow",
      "msg": "Math overflow"
    },
    {
      "code": 6010,
      "name": "notKeeper",
      "msg": "Only the house keeper can push prices"
    },
    {
      "code": 6011,
      "name": "invalidOracleQueue",
      "msg": "Invalid oracle queue for this runtime"
    },
    {
      "code": 6012,
      "name": "invalidCardPrice",
      "msg": "Card price must be greater than zero"
    },
    {
      "code": 6013,
      "name": "invalidPrice",
      "msg": "Price must be greater than zero"
    },
    {
      "code": 6014,
      "name": "invalidPriceAge",
      "msg": "Maximum price age must be greater than zero"
    },
    {
      "code": 6015,
      "name": "retryTooSoon",
      "msg": "Wait before retrying the VRF request"
    },
    {
      "code": 6016,
      "name": "retrySeedUnchanged",
      "msg": "Use a new seed for the retried VRF request"
    },
    {
      "code": 6017,
      "name": "invalidSellAmount",
      "msg": "Sell amount must be greater than zero"
    },
    {
      "code": 6018,
      "name": "sellSlippageExceeded",
      "msg": "Sale quote is below the requested minimum"
    },
    {
      "code": 6019,
      "name": "invalidUsdcDecimals",
      "msg": "House payment mint must have six decimals"
    }
  ],
  "types": [
    {
      "name": "asset",
      "docs": [
        "A prize asset the house pays out (xStock mock, memecoin mock, …).",
        "The keeper writes `price_usd_e8` on the BASE layer; claims read it there."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "docs": [
              "ATA of the house PDA holding the prize inventory."
            ],
            "type": "pubkey"
          },
          {
            "name": "symbol",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "kind",
            "type": {
              "defined": {
                "name": "assetKind"
              }
            }
          },
          {
            "name": "priceUsdE8",
            "docs": [
              "Latest keeper-written USD price, 8 decimals."
            ],
            "type": "u64"
          },
          {
            "name": "priceUpdatedAt",
            "type": "i64"
          },
          {
            "name": "active",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "assetKind",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "stock"
          },
          {
            "name": "coin"
          },
          {
            "name": "collectible"
          }
        ]
      }
    },
    {
      "name": "card",
      "docs": [
        "One scratch card. Delegated to the ER for the scratch, committed back,",
        "settled on base. Small on purpose (well under the 10,240-byte commit cap).",
        "",
        "`card_price_usdc` + `tiers` are snapshotted from House at buy time because",
        "the VRF callback runs on the ER, where the base-layer House is unreadable."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "asset",
            "docs": [
              "Prize asset chosen at buy time. (Mystery pool = V2.)"
            ],
            "type": "pubkey"
          },
          {
            "name": "state",
            "type": {
              "defined": {
                "name": "cardState"
              }
            }
          },
          {
            "name": "multiplierBps",
            "docs": [
              "Set when the VRF callback lands."
            ],
            "type": "u32"
          },
          {
            "name": "prizeUsdE6",
            "docs": [
              "Final USD value of the prize, e6. 0 = blank."
            ],
            "type": "u64"
          },
          {
            "name": "randomness",
            "docs": [
              "Pending: request timestamp in bytes 0..8 and seed in byte 8.",
              "Revealed: the VRF result (audit trail)."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "cardPriceUsdc",
            "type": "u64"
          },
          {
            "name": "tiers",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "tier"
                  }
                },
                8
              ]
            }
          },
          {
            "name": "tierCount",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "cardState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "sealed"
          },
          {
            "name": "randomnessRequested"
          },
          {
            "name": "revealed"
          },
          {
            "name": "claimed"
          }
        ]
      }
    },
    {
      "name": "house",
      "docs": [
        "Global game configuration + treasury pointer. One per deployment."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "keeper",
            "docs": [
              "Keeper wallet allowed to push price updates."
            ],
            "type": "pubkey"
          },
          {
            "name": "usdcMint",
            "type": "pubkey"
          },
          {
            "name": "usdcTreasury",
            "docs": [
              "ATA of this PDA for `usdc_mint`; card payments land here."
            ],
            "type": "pubkey"
          },
          {
            "name": "cardPriceUsdc",
            "docs": [
              "Card price in USDC e6 (1 USDC = 1_000_000)."
            ],
            "type": "u64"
          },
          {
            "name": "tiers",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "tier"
                  }
                },
                8
              ]
            }
          },
          {
            "name": "tierCount",
            "type": "u8"
          },
          {
            "name": "cardNonce",
            "docs": [
              "Monotonic card id counter."
            ],
            "type": "u64"
          },
          {
            "name": "maxPriceAgeSecs",
            "docs": [
              "Reject claims whose price is older than this (seconds)."
            ],
            "type": "i64"
          },
          {
            "name": "active",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "tier",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "multiplierBps",
            "docs": [
              "Prize multiplier in bps of `MULTIPLIER_BASE_BPS`. 0 = blank card."
            ],
            "type": "u32"
          },
          {
            "name": "weightPpm",
            "docs": [
              "Weight in ppm; all tiers in a table sum to TOTAL_PPM."
            ],
            "type": "u32"
          }
        ]
      }
    }
  ]
};
