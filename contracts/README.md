# Contract changelog

One markdown file per compatibility-sensitive or breaking change to a shared contract
(`packages/types/src/**` or `packages/config/public.ts`), named `NNNN-short-title.md` and
written from `CONTRACT_CHANGELOG_TEMPLATE.md`. Additive changes still need a short entry (use
the template's Summary section) so consumers can find what changed.

CI (`npm run check:contracts`, workflow `contract-check.yml`) fails a pull request that edits
those paths without adding or changing a file in this folder, or whose PR body has no contract
classification checked.

Package versions of the shared packages are bumped with changesets (`npm run changeset`).
