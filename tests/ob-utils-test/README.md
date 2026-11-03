# Obsidian test vault

This fixture vault is reserved for repository-level functional and visual verification. Never point automated checks at a personal vault.

Build and install the local plugin with:

```bash
pnpm run build
pnpm run test:vault:prepare
```

Every Obsidian CLI invocation must go through `scripts/obsidian-test.mjs` with `OBSIDIAN_TEST_VAULT=ob-utils-test` set explicitly.
