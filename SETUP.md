# Setup

1. Ensure the repository name exactly matches your GitHub username.
2. Install dependencies:
   - `npm ci`
3. Generate profile data and README:
   - `npm run update:profile`
4. Validate configuration and assets:
   - `npm run validate`
5. Commit changes and push to `main`.

## GitHub Actions secrets

- No personal access token is required for current workflows.
- Built-in `GITHUB_TOKEN` is used for update and publish workflows.
