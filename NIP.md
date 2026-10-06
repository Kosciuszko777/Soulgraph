# SoulGraph custom kinds

SoulGraph's custom Nostr event kinds and NIP usage are documented in
[`docs/NIP-SOULGRAPH.md`](./docs/NIP-SOULGRAPH.md).

Summary:

| Kind  | Type        | Purpose                        | Source           |
| ----- | ----------- | ------------------------------ | ---------------- |
| 30078 | addressable | Encrypted facet envelope       | NIP-78 (reused)  |
| 33719 | addressable | Relationship edge              | SoulGraph        |
| 38881 | addressable | Permission grant record        | SoulGraph        |
| 7481  | regular     | Grant / key delivery (wrapped) | SoulGraph        |
