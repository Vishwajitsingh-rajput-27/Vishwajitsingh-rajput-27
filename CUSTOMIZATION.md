# Customization Guide

All public profile changes should start in `config/`. `README.md` is generated and should not be edited inside generated blocks.

## Edit profile information

Update `config/profile.json`. Keep the configured professional information accurate and verified. Empty GitHub API fields never replace configured values.

Useful fields include:

- `displayName`, `headline`, `tagline`, and `location`
- `education`
- `about`
- `currentProjects`
- `learningFocus`
- `collaborationInterests`
- `askMeAbout`
- `developmentGoal`

After editing, run:

```bash
npm run build
npm run validate
```

## Add LinkedIn, portfolio, resume, or public email

Edit `profile.publicLinks` in `config/profile.json`.

```json
{
  "linkedin": "",
  "portfolio": "",
  "resume": "",
  "email": ""
}
```

Only add a link that is public and intentionally shareable. For email, use a dedicated public contact address. Never add a private institutional or personal address by accident.

The same rule applies to LeetCode, Codeforces, Dev.to, Hashnode, Medium, Stack Overflow, and X/Twitter: keep the field empty until the exact public URL is verified.

## Switch themes or change colours

Edit `config/theme.json`.

The default Cyber Neon Professional palette is:

- Cyan: `#22D3EE`
- Blue: `#3B82F6`
- Violet: `#8B5CF6`
- Dark background: `#070B14`
- Primary text: `#E5E7EB`
- Muted text: `#94A3B8`

After changing colours, update the local SVG assets and snake query colours together so the profile remains visually consistent. Validate contrast in both GitHub light and dark appearances.

## Pin repositories

Add exact public repository names to `pinnedRepositories` in `config/projects.json`:

```json
"pinnedRepositories": ["notenexus", "Resume_Forge"]
```

A valid pinned repository receives priority but must still be public, non-archived, non-empty, and complete enough to display.

## Exclude repositories

Add exact names to `excludedRepositories`:

```json
"excludedRepositories": ["temporary-test-repo"]
```

Excluded repositories never appear in featured results or the public language summary.

## Approve suggested skills

Repository discovery may add evidence-backed entries to `suggestedSkills`. Suggestions never appear publicly.

To approve one:

1. Review its repository evidence.
2. Move it to `approvedSkills`.
3. Set `verificationStatus` to `approved`.
4. Choose a category and numeric priority.
5. Set `visible` to `true` only when it belongs in the curated primary section.
6. Remove it from `suggestedSkills`.
7. Run validation to catch duplicates.

Dependencies alone are not evidence of professional proficiency.

## Add manual projects

Add complete entries to `manualProjects` in `config/projects.json`. A manual project should include a name, accurate description, status, technology categories, and only verified public links.

Incomplete manual projects must remain hidden. The discovery script never overwrites a manual description without an explicit configuration change.

## Use protected README sections

Content between these markers is preserved exactly:

```markdown
<!-- MANUAL-CONTENT:START -->
Your manually maintained content.
<!-- MANUAL-CONTENT:END -->
```

Automatically maintained content is isolated inside one block:

```markdown
<!-- AUTO-GENERATED:START -->
Generated content, including the protected manual block.
<!-- AUTO-GENERATED:END -->
```

The generator replaces only the automatic block and reinserts the manual block byte-for-byte.

Do not move, rename, nest, or remove these markers. The validation suite verifies them.

## Change automatic-update mode

Edit `config/integrations.json`:

```json
"automaticUpdates": {
  "enabled": true,
  "mode": "direct-commit"
}
```

Supported modes:

- `direct-commit` — validated meaningful changes commit directly to `main`.
- `pull-request` — validated changes are pushed to a temporary branch and opened as a pull request.

Use pull-request mode when branch protection requires review.

## Disable automatic updates

Set:

```json
"enabled": false
```

Scheduled runs will still validate but restore generated workspace changes and create no commit. Individual visual workflows can be disabled from GitHub Actions or by setting their integration flags and updating workflow conditions.

## Customize snake colours

Edit the output query strings in `.github/workflows/snake.yml`. Keep light and dark palettes separate. Use restrained colours with sufficient contrast and retain all three filenames referenced by the README.

After editing, run:

```bash
npm run validate-workflows
```

## Reduce animation

- Keep the static role fallback visible below `assets/role-line.svg`.
- Remove or lengthen SVG animation cycles rather than adding flashing effects.
- The contribution snake remains the primary animated element.
- Keep the 3D calendar as an SVG and avoid autoplay video or large GIF collections.

## Test light and dark mode

1. Open `README.md` in GitHub preview.
2. Switch GitHub appearance between light and dark.
3. Test on a narrow Android screen.
4. Verify banner, text, terminal card, statistics, snake, and 3D calendar remain readable.
5. Confirm every `<picture>` has a usable fallback `<img>`.
6. Run the complete local validation suite before publishing.
