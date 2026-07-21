# Security Policy

## Never commit secrets

Do not commit API keys, personal access tokens, passwords, private email credentials, OAuth client secrets, service-account files, session cookies, private resumes, or private repository data.

Local secret files are excluded through `.gitignore`, but ignore rules are not a substitute for reviewing staged changes.

Before every commit, inspect and scan:

```bash
git diff --cached
npm run scan-secrets
```

If a secret is committed, revoke and rotate it immediately. Removing it in a later commit does not erase it from Git history.

## GitHub repository secrets

Repository secrets are encrypted values configured under:

**Settings → Secrets and variables → Actions**

Workflows can reference an approved secret through the `secrets` context. This profile repository intentionally requires no custom secret for normal operation. It uses GitHub’s short-lived built-in `GITHUB_TOKEN`.

Never print secret values to logs or store them in generated JSON, README content, SVG assets, workflow summaries, artifacts, or caches.

## Minimum workflow permissions

Each workflow declares the narrowest practical permission set:

- Validation uses `contents: read`.
- Dependency review uses `contents: read` and `pull-requests: read`.
- Workflows that publish generated files use `contents: write`.
- The automatic updater adds `pull-requests: write` only because the supported configuration includes pull-request mode.

The built-in token is scoped to the current repository and current workflow run. No personal access token is required.

## Review third-party actions

Before updating an action:

1. Confirm the repository is the official upstream project.
2. Review its release notes and recent maintenance activity.
3. Inspect permission and token requirements.
4. Pin every external action to a verified full-length commit SHA and keep the corresponding release tag in a comment.
5. Review changes proposed by Dependabot.
6. Run the validation and dependency-review workflows.
7. Do not automatically merge major or security-sensitive action changes.

Third-party generated assets are treated as untrusted input and validated before commit.

## Public-data boundary

The profile fetcher retrieves only public GitHub information. It does not query private repositories and does not publish GitHub email fields. Manually configured professional information remains the primary source of truth.

When an API or widget fails, the system preserves the last valid public content instead of publishing blank data or error messages.

## Reporting a security concern

Do not open a public issue containing sensitive details. Use a verified private contact method published by the repository owner when one becomes available. Until then, open a minimal public issue asking for a private reporting channel without including exploit details, credentials, or personal information.
