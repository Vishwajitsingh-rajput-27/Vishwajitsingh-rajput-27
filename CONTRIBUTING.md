# Contributing

Contributions that improve correctness, accessibility, reliability, documentation, or workflow security are welcome.

## Development process

1. Fork or create a branch from `main`.
2. Install Node.js 20 or newer.
3. Run `npm ci`.
4. Make focused changes.
5. Keep identity claims, links, project metadata, and achievements verified.
6. Run the complete validation suite.
7. Open a pull request describing the reason for the change and its effect on generated output.

## Required checks

```bash
npm run validate
npm run check-links
npm run validate-workflows
npm run validate-svg
npm run build
```

After `npm run build`, verify that only expected generated files changed.

## Content rules

- Do not add invented achievements, metrics, deployments, awards, or project results.
- Do not expose private email addresses or secrets.
- Do not turn newly detected dependencies into public skills automatically.
- Do not overwrite protected manual content.
- Do not add excessive animations, large badge walls, or unreliable widgets.
- Keep mobile rendering and accessibility in scope.

## Workflow rules

- Use explicit minimum permissions.
- Do not add force-push behavior.
- Do not use personal access tokens when `GITHUB_TOKEN` is sufficient.
- Pin actions to reviewed stable versions.
- Preserve last working content on failure.
- Prevent empty commits and workflow loops.

## Pull-request description

Include:

- What changed
- Why it changed
- Which generated files changed
- Validation commands run
- Any new external service or workflow permission introduced
