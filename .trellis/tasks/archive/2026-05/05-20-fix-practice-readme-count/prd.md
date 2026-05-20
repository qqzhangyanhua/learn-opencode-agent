# Fix Practice README Count

## Goal

Keep `practice/README.md` aligned with the current practice project set so readers do not see stale counts or an incomplete chapter list.

## What I already know

* The repository currently contains practice pages and scripts through P28.
* `practice/README.md` still says the directory contains 23 runnable examples.
* The README chapter list stops at P23, while P24-P28 exist as supplemental practice topics.
* `docs/practice/index.md` and `docs/practice/setup.md` also contain stale `23 个项目` / `P1-P23` wording.

## Requirements

* Update practice entry documentation to distinguish the 23 mainline projects from P24-P28 supplemental practice chapters.
* Add P24-P28 to `practice/README.md` chapter list in the same phase grouping used by the root README.
* Keep the change narrow and avoid unrelated documentation rewrites.

## Acceptance Criteria

* [ ] The README count no longer says 23 when the repository contains P1-P28.
* [ ] P24-P28 are visible in the README chapter list.
* [ ] Practice landing/setup docs no longer imply only P1-P23 exist.
* [ ] Existing practice validation still passes.

## Out of Scope

* Changing practice source files.
* Changing VitePress navigation or page metadata.
* Broad copyediting of the README.

## Technical Notes

* Relevant files: `practice/README.md`, `docs/practice/`, `practice/`.
* Verification target: `pnpm.cmd run check:practice` or equivalent project check.
