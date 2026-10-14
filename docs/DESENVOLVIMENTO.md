# Desenvolvimento

Como rodar, testar, compilar e publicar o SentUtility.

> Quer só ver a interface? `npm install && npm run dev` abre o app no navegador com dados de demonstração, sem precisar de Rust.

## Requisitos

- Node.js 18+
- Rust (via [rustup](https://rustup.rs)) com o toolchain `stable-x86_64-pc-windows-msvc`
- Microsoft Visual Studio Build Tools com o componente "Desktop development with C++" (necessário para compilar o Rust no Windows)
- WebView2 Runtime (já vem instalado por padrão no Windows 10/11)

> **Importante sobre o caminho do projeto**: o Windows tem um limite clássico de 260 caracteres para caminhos de arquivo (`MAX_PATH`). O linker do Rust grava arquivos intermediários com nomes longos dentro de `target/`, então o projeto **precisa** viver em um caminho curto (ex.: `C:\Sentinell\FocusFlow`). Em pastas muito aninhadas (ex.: dentro de vários níveis de `AppData`), o build falha com `LNK1104`.


## Instalação

```bash
npm install
```


## Executar em desenvolvimento

```bash
npm run tauri dev
```

Isso compila o backend Rust, inicia o Vite e abre a janela do aplicativo. O banco SQLite é criado automaticamente em `%APPDATA%\com.sentutility.app\sentutility.sqlite3` na primeira execução, com todas as migrations aplicadas. Quem já usava a versão com o nome antigo (FocusFlow, pasta `com.focusflow.app`) tem os dados copiados automaticamente na primeira abertura (`migrate_legacy_data` em `lib.rs`).


## Executar os testes

Testes do backend (reset diário com timezone, timers baseados em timestamp, recorrência de eventos, alarmes, tarefas temporizadas):

```bash
cd src-tauri
cargo test
```

Testes do frontend (linguagem natural) e verificação de tipos:

```bash
npm test
```


```bash
npx tsc --noEmit
```


## Gerar build de produção / instalador Windows

```bash
npm run tauri build
```

Gera o instalador NSIS (`SentUtility_<versão>_x64-setup.exe`) em `src-tauri/target/release/bundle/nsis/`. Instala por usuário (sem pedir administrador), em português.

Para um build local assinado (necessário para os artefatos de atualização), defina a chave antes:

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content "$HOME\.tauri\sentutility.key" -Raw
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
npm run tauri build
```


## Lançar uma nova versão (atualização automática)

Todo computador com o SentUtility instalado procura atualizações ao abrir e a cada 6 horas, no endereço `https://github.com/KaueFSS/SentUtility/releases/latest/download/latest.json`. Quando há uma versão nova, aparece um aviso com as novidades e o botão **Atualizar agora**; o app baixa, confere a assinatura, instala e reabre sozinho. Em Configurações há a versão atual e o botão **Procurar atualizações**.

Para lançar:

```bash
npm run release -- 1.1.0 "O que mudou nesta versão"
```

O script (`scripts/release.mjs`) atualiza a versão em `package.json`, `tauri.conf.json`, `Cargo.toml` e nos lockfiles, faz o commit, cria a tag `v1.1.0` (a mensagem vira as notas da versão) e envia para o GitHub. O workflow `.github/workflows/release.yml` roda os testes, compila, **assina** e publica o instalador e o `latest.json`. Acompanhe em *Actions* no GitHub.

**Assinatura**: o app só instala atualizações assinadas com a chave privada `~/.tauri/sentutility.key` (a chave pública está em `tauri.conf.json`). Guarde um backup dessa chave em lugar seguro: sem ela não é possível publicar atualizações para quem já instalou. Ela nunca vai para o repositório (`*.key` está no `.gitignore`); no GitHub ela fica nos *secrets* `TAURI_SIGNING_PRIVATE_KEY` e `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (vazio).

