# Troubleshooting Guide

This guide covers publication and automation failures for the `Vishwajitsingh-rajput-27/Vishwajitsingh-rajput-27` profile repository. Never solve a workflow problem by force-pushing or adding a personal access token unless an optional integration explicitly requires one.

## Output branch was not created

1. Confirm the repository is public and its name exactly matches `Vishwajitsingh-rajput-27`.
2. Open **Actions → Generate Contribution Snake → Run workflow** on `main`.
3. Open **Settings → Actions → General** and select **Read and write permissions**.
4. Check the `publish` job. The read-only `generate` job must complete first and upload the `contribution-snake` artifact.
5. Re-run the workflow after correcting permissions. The first successful publish creates the `output` branch without force-pushing.

## GitHub Actions is disabled

Open the repository’s **Actions** tab and select **I understand my workflows, go ahead and enable them**. Organization or enterprise policies can also disable actions; only an administrator can change those policies.

## Workflow permissions are read-only

Open **Settings → Actions → General → Workflow permissions**, select **Read and write permissions**, and save. Validation and dependency review remain read-only because their workflow files explicitly limit permissions.

## Permission denied while pushing generated files

- Confirm workflow permissions are read/write.
- Check branch protection on `main` and `output`.
- Permit GitHub Actions to push, or set `config/integrations.json` to `pull-request` mode for profile updates.
- Do not add a personal access token for the normal public-data workflow.
- Re-run the failed job after correcting the rule.

## Snake SVG returns 404

- Run the snake workflow once after publication.
- Confirm the `output` branch exists.
- Confirm these exact root-level files exist on `output`:
  - `github-contribution-grid-snake.svg`
  - `github-contribution-grid-snake-dark.svg`
  - `github-contribution-grid-snake.gif`
- Confirm README URLs use `output`, not `main`.
- File and branch names are case-sensitive.

## Repository name is incorrect

The public profile README works only when both the account and repository are named exactly `Vishwajitsingh-rajput-27`. Rename the repository under **Settings → General → Repository name**, then update the local `origin` URL.

## Username is incorrect

Search configuration, README paths, and workflows:

```bash
grep -R "Vishwajitsingh-rajput-27" README.md config scripts .github/workflows
```

The username must remain exactly `Vishwajitsingh-rajput-27`, including capitalization and hyphens.

## README references `main` instead of `output`

The contribution snake must use raw URLs with `/output/`. The 3D contribution assets intentionally use relative paths under `assets/generated/` on `main`.

Run:

```bash
npm run validate
npm run validate-workflows
```

Both commands fail when workflow outputs and README paths disagree.

## Dark-mode image does not switch

Confirm the `<picture>` element lists the dark `<source>` first, includes `media="(prefers-color-scheme: dark)"`, and has a light fallback `<img>`. Test GitHub’s actual appearance setting rather than only the operating-system setting.

## GitHub displays a cached broken image

Open the raw asset URL directly and confirm the latest commit is visible. GitHub and browser caches can lag. Refresh after the raw URL updates, or temporarily append a harmless query string while diagnosing. Do not permanently add timestamp query parameters because they cause unnecessary README changes.

## Public API rate limit

The updater uses the built-in `GITHUB_TOKEN` in Actions and authenticated `gh` locally when available. During a temporary limit or network failure, cached valid data is retained. Wait for the next scheduled run or manually rerun later. Do not erase cache files or publish blank data.

## Empty automated commit

The workflow checks both semantic change state and Git differences. An unchanged run should exit without a commit. If an empty commit is attempted, run `npm run test-change-detection` and check that timestamps, API ordering, and rate-limit metadata are excluded from the state fingerprint.

## Automatic workflow loop

The updater ignores pushes whose head commit begins with:

```text
chore(profile): refresh public GitHub data
```

The snake publishes only to `output`, while its push trigger watches `main`. Never broaden these triggers to every branch or remove the commit-message guard.

## Protected content was overwritten

Manual text must be inside exactly one block:

```markdown
<!-- MANUAL-CONTENT:START -->
Your text
<!-- MANUAL-CONTENT:END -->
```

Run `npm run test-protected-content`. Restore a known-good README from Git history if the markers were manually deleted or duplicated.

## Archived repository still appears

Run:

```bash
npm run fetch-profile
npm run discover
npm run languages
npm run detect-changes
npm run build
```

Archived repositories are filtered during discovery. If the API is temporarily unavailable, the previous valid profile remains visible until a later successful refresh rather than making an unsafe destructive update.

## Renamed repository uses an old URL

Discovery tracks stable GitHub repository IDs. Run the full refresh after the rename. The cached record will receive the new name and URL while preserving manually locked descriptions.

## Generated README is invalid

Run the complete local release gate:

```bash
npm run validate
npm run check-links
npm run validate-workflows
npm run validate-svg
npm run build
npm test
```

Do not commit if any command fails. Restore `README.md` from the last working commit, correct configuration or templates, and regenerate.

## Dependabot update failed

- Confirm Dependabot is enabled under repository security settings.
- Check `.github/dependabot.yml` syntax.
- Review whether a proposed major action release needs a runner upgrade.
- Regenerate `package-lock.json` with `npm install` when npm metadata changed.
- Never auto-merge a major or security-sensitive action update without running the complete validation suite.

## GIF generation is unsupported or fails

`Platane/snk` v3.5.0 supports GIF output. If the GIF step fails while SVG files work:

1. Review the generator log for the exact output-query syntax.
2. Keep both SVG outputs as release-blocking requirements.
3. Update the action only after reviewing official release notes and pinning the new release commit SHA.
4. Do not point the README at the GIF; the README uses theme-aware SVG files, so the profile remains functional while GIF support is investigated.
