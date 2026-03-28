## Распаковка архивов (Linux/macOS)

### .zip

Показать содержимое:

```bash
unzip -l "archive.zip"
```

Распаковать в текущую папку:

```bash
unzip "archive.zip"
```

Распаковать в папку:

```bash
mkdir -p "out" && unzip "archive.zip" -d "out"
```

### .tar.gz / .tgz

Показать содержимое:

```bash
tar -tzf "archive.tar.gz" | head
```

Распаковать в текущую папку:

```bash
tar -xzf "archive.tar.gz"
```

Распаковать в папку:

```bash
mkdir -p "out" && tar -xzf "archive.tar.gz" -C "out"
```

### Безопасность

- Всегда ставь кавычки вокруг путей.
- Перед распаковкой лучше посмотреть список файлов (`unzip -l` / `tar -tzf`).

