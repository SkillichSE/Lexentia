## Terminal: Basic Command Execution Rules

### Context

The built-in terminal works like a regular shell. Commands can only be executed **after user confirmation**.

### Recommendations

- For potentially dangerous commands, first show "dry run" / verification.
- For commands that create files/folders, first run `ls` / verification.
- If paths contain spaces, use double quotes:

```bash
cd "/path/with spaces"
```

### Useful Commands

Current directory:

```bash
pwd
```

List files:

```bash
ls -la
```

Search text (ripgrep):

```bash
rg "pattern"
```
