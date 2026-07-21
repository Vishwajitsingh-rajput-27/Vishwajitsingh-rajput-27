# Setup Guide

This repository is the special GitHub Profile README repository for `Vishwajitsingh-rajput-27`. GitHub renders `README.md` on the profile page only when the public repository name exactly matches the account username.

## 1. Create or confirm the profile repository

1. Sign in to the `Vishwajitsingh-rajput-27` GitHub account.
2. Create a **public** repository named exactly `Vishwajitsingh-rajput-27` if it does not already exist.
3. Keep the default branch named `main`.
4. Do not add secrets, private resumes, private email addresses, or private repository metadata.

Expected remote:

```text
https://github.com/Vishwajitsingh-rajput-27/Vishwajitsingh-rajput-27
```

## 2. Clone the repository

```bash
git clone https://github.com/Vishwajitsingh-rajput-27/Vishwajitsingh-rajput-27.git
cd Vishwajitsingh-rajput-27
```

## 3. Install Node.js and dependencies

Use Node.js 20 or newer.

```bash
node --version
npm --version
npm install
```

For repeatable CI-style installation after `package-lock.json` exists:

```bash
npm ci
```

## 4. Edit configuration

The generator treats the files under `config/` as the source of truth:

- `config/profile.json` — verified identity, education, focus, links, and profile text.
- `config/skills.json` — approved and suggested technologies.
- `config/projects.json` — discovery, pinning, exclusions, and manual projects.
- `config/integrations.json` — automatic updates and optional visual integrations.
- `config/theme.json` — palette and visual settings.

Unknown public links must remain empty. Do not create a social URL by guessing a username.

## 5. Generate locally

Run the complete public-data refresh:

```bash
npm run update-profile
```

Run individual stages when troubleshooting:

```bash
npm run fetch-profile
npm run discover
npm run languages
npm run detect-changes
npm run generate
npm run metrics
```

Run the complete validation suite:

```bash
npm run validate
npm run check-links
npm run validate-workflows
npm run validate-svg
npm run scan-secrets
npm run build
npm test
```

## 6. Enable GitHub Actions

Open the repository on GitHub and select **Actions**. Enable workflows when GitHub asks for confirmation.

The repository contains these independent workflows:

- **Refresh GitHub Profile** — daily public-data refresh and README generation.
- **Generate Contribution Snake** — daily contribution snake publication to `output`.
- **Refresh Profile Metrics** — weekly repository-owned metrics SVG refresh.
- **Generate 3D Contribution Calendar** — weekly light/dark contribution-calendar generation.
- **Validate GitHub Profile** — read-only validation on pull requests, relevant pushes, and manual runs.
- **Dependency Review** — dependency risk checks for pull requests.

## 7. Configure workflow permissions

Open:

**Settings → Actions → General → Workflow permissions**

Select **Read and write permissions** so the update, snake, metrics, and 3D workflows can commit generated assets with the built-in `GITHUB_TOKEN`.

Also enable **Allow GitHub Actions to create and approve pull requests** only when using `pull-request` update mode. The workflows do not need a personal access token.

## 8. Run the snake workflow

1. Open **Actions → Generate Contribution Snake**.
2. Select **Run workflow** on `main`.
3. Confirm that the run succeeds.
4. Confirm that an `output` branch now exists.
5. Open the raw files on that branch:
   - `github-contribution-grid-snake.svg`
   - `github-contribution-grid-snake-dark.svg`
   - `github-contribution-grid-snake.gif`

The workflow uses a normal fast-forward push and skips the commit when generated output is unchanged.

## 9. Run the profile update manually

1. Open **Actions → Refresh GitHub Profile**.
2. Select **Run workflow**.
3. Review the workflow summary for featured repositories and suggested skills.
4. In direct-commit mode, a commit is created only when meaningful content changed.
5. In pull-request mode, the workflow creates a review branch and pull request.

## 10. Run metrics and 3D workflows

Run **Refresh Profile Metrics** once to confirm the repository-owned metrics card validates.

Run **Generate 3D Contribution Calendar** once to replace the bundled fallback assets. If third-party generation fails, the workflow exits with an error and leaves the previous committed assets untouched.

## Troubleshooting broken SVGs

- Confirm the file path and filename match the README exactly.
- Open the raw SVG directly on GitHub.
- Run `npm run validate-svg` locally.
- Confirm the SVG contains a `viewBox`, `<title>`, and `<desc>`.
- Do not use embedded JavaScript, external fonts, or unsupported HTML inside SVGs.
- GitHub may cache raw assets; wait for the raw URL to show the new commit before rechecking the profile.

## Troubleshooting permission errors

A `403` during `git push` usually means repository workflow permissions are read-only.

1. Open **Settings → Actions → General**.
2. Set workflow permissions to **Read and write permissions**.
3. Confirm the workflow uses the built-in `GITHUB_TOKEN`.
4. Check branch protection rules. Allow GitHub Actions to push or switch to `pull-request` mode when direct commits are blocked.
5. Re-run the failed workflow.

## Restoring the last working README

Automatic generation validates before committing. A failed run does not replace the public README.

To restore an earlier version manually:

```bash
git log -- README.md
git restore --source=<GOOD_COMMIT_SHA> README.md assets/generated data
git commit -m "fix(profile): restore last working profile"
git push origin main
```

Do not force-push. Keep history intact so recovery remains simple.

For additional release and workflow failures, see [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md).
