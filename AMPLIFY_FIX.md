# Amplify build fix

Current AWS error:

```txt
error TS18003: No inputs were found in config file .../tsconfig.app.json.
Specified 'include' paths were '["src"]'
```

This means Amplify can see `package.json` and `tsconfig.app.json`, but it cannot see the `src/` folder in the same build directory.

## Fix in AWS Amplify

Open the Amplify app settings and check the app root.

Use one of these setups:

### If the GitHub repo root contains `outputs/fora-cmp`

Use the root-level `amplify.yml`:

```txt
App root: outputs/fora-cmp
Build command: pnpm build
Output directory: dist
```

The repository root must include:

```txt
outputs/fora-cmp/src
outputs/fora-cmp/public
outputs/fora-cmp/package.json
outputs/fora-cmp/pnpm-lock.yaml
```

### If the GitHub repo root is the app itself

The repository root must include:

```txt
src
public
package.json
pnpm-lock.yaml
tsconfig.app.json
amplify.yml
```

In this case leave App root empty or set it to `/`.

## Most likely cause

Only root files were pushed to GitHub, while folders like `src/` and `public/` were not pushed. Re-push the full project folder, including directories.

## Quick check before redeploy

In the GitHub repository, verify that this file exists:

```txt
src/App.tsx
```

If it does not exist, Amplify will fail exactly with TS18003.
