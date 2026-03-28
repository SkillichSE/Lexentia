## Archive Extraction (Linux/macOS)

### .zip

Show contents:

```bash
unzip -l "archive.zip"
```

Extract to current directory:

```bash
unzip "archive.zip"
```

Extract to folder:

```bash
mkdir -p "out" && unzip "archive.zip" -d "out"
```

### .tar.gz / .tgz

Show contents:

```bash
tar -tzf "archive.tar.gz" | head
```

Extract to current directory:

```bash
tar -xzf "archive.tar.gz"
```

Extract to folder:

```bash
mkdir -p "out" && tar -xzf "archive.tar.gz" -C "out"
```

### Safety

- Always quote paths.
- Before extraction, better to check file list (`unzip -l` / `tar -tzf`).

