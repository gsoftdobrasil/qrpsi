# Publicação QRPSI no servidor Linux (`/var/www/qrpsi`)

Este documento descreve um **fluxo típido** para colocar o **backend Node.js** e o **frontend estático** (build Vite) em um servidor Debian/Ubuntu (ou derivado), com **Nginx** na frente e **systemd** mantendo a API como serviço.

**Subdomínio de produção (GSoft):** `https://qrpsi.gsoft.com.br`

> **Premissas usadas aqui**
>
> - Caminho-base do projeto: **`/var/www/qrpsi`**
> - API Node escuta **`127.0.0.1:3000`** (somente localhost; o público entra só pelo Nginx)
> - Banco é **Microsoft SQL Server** (pode estar em outro host; só precisa ser alcançável do Linux)
> - O frontend chama a API pelo caminho **`/api`** relativo ao mesmo domínio (valor padrão do app quando `VITE_API_URL` fica vazio)

Ajuste domínios, usuários e portas conforme a política do seu ambiente.

---

## 1. Estrutura de pastas

Sugestão:

```text
/var/www/qrpsi/
├── backend/          ← repositório (ou apenas build + deps de produção)
│   ├── dist/
│   ├── package.json
│   ├── package-lock.json
│   └── .env          ← NUNCA commitar; permissões restritas (ex.: 600)
└── frontend/         ← somente os arquivos estáticos do Vite (_dist_)
    ├── index.html
    └── assets/
```

Para o frontend, você pode usar **`/var/www/qrpsi/frontend`** como a pasta **raiz que o Nginx serve** — ou seja, o **conteúdo** gerado pelo `npm run build` (pasta `dist/` do projeto) copiado para dentro de `frontend/`.

---

## 2. Requisitos no servidor

Instale (ajuste aos nomes dos pacotes da sua distro):

- **Node.js** LTS (ex.: 22.x ou 20.x), com `npm`
- **Nginx**
- Acesso ao **SQL Server** (firewall/redes liberados a partir do Linux)
- Usuário de deploy (opcional mas recomendado), ex.: `deploy`, com permissão de escrita em `/var/www/qrpsi`

Exemplo Debian/Ubuntu:

```bash
sudo apt update
sudo apt install -y nginx
# Node: use NodeSource ou o método padrão da sua equipe
```

---

## 3. Backend — build, migrações e variáveis

### 3.1. Colocar o código

Exemplo com `git` (SSH/HTTPS conforme seu repositório):

```bash
sudo mkdir -p /var/www/qrpsi
sudo chown deploy:deploy /var/www/qrpsi   # ou o usuário que vocês usam
cd /var/www/qrpsi
git clone <URL_DO_REPO> qrpsi-src
```

Vocês podem trabalhar **só com a pasta `backend`** dentro do clone, ou mover para `/var/www/qrpsi/backend` — o importante é que **`WorkingDirectory`** do systemd aponte para a pasta onde está o `dist/` e o `package.json` de runtime.

Fluxo típido:

```bash
cd /var/www/qrpsi/backend
npm ci
npm run build           # gera dist/ via tsc
```

### 3.2. Migrações (Knex)

No servidor (com `NODE_ENV=production` e `.env` carregável):

```bash
cd /var/www/qrpsi/backend
NODE_ENV=production npm run migrate
# Seeds apenas se fizer parte do processo (geralmente não em produção repetida):
# NODE_ENV=production npm run seed
```

### 3.3. Arquivo `.env` (backend)

Copie `backend/.env.example` para `.env` e ajuste, **no mínimo**:

| Variável           | Produção típida |
|--------------------|----------------|
| `NODE_ENV`         | `production` |
| `PORT`             | `3000` (ou outra porta interna) |
| `DB_HOST`          | hostname/IP do SQL Server |
| `DB_PORT`          | `1433` (ou o que for) |
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | conforme seu DBA |
| `DB_ENCRYPT` / `DB_TRUST_CERT` | conforme política TLS do SQL Server |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | strings longas e aleatórias |
| **`FRONTEND_URL`** | **origem HTTPS exata do site** onde o React roda |

**`FRONTEND_URL`**: pode incluir várias origens separadas por vírgula se precisar (ex.: staging + produção), por exemplo:

```env
FRONTEND_URL=https://qrpsi.gsoft.com.br
```

Ou, se precisarem de **mais de uma origem** no CORS (ex.: segundo ambiente na mesma família de domínio):

```env
FRONTEND_URL=https://qrpsi.gsoft.com.br,https://outro-subdominio.gsoft.com.br
```

Proteção do arquivo:

```bash
chmod 600 /var/www/qrpsi/backend/.env
```

### 3.4. Dependências só de produção (opcional)

Para reduzir superfície e tamanho:

```bash
cd /var/www/qrpsi/backend
rm -rf node_modules
npm ci --omit=dev
```

> **Migrates em produção** normalmente precisam do Knex compilado/execuável: se vocês removerem `devDependencies`, garantam um fluxo (`npm exec knex …` ou `npx`) que ainda rode as migrations com os pacotes certos instalados.

---

## 4. Frontend — build e cópia para `/var/www/qrpsi/frontend`

No seu PC de CI/CD **ou no servidor**:

```bash
cd frontend
cp .env.example .env.local   # se necessário
```

Para produção, defina **`VITE_APP_PUBLIC_URL`** como a **URL pública HTTPS** onde os colaboradores abrem o link (afeta montagem dos links `/responder/…` ao copiar no admin):

```env
VITE_APP_PUBLIC_URL=https://qrpsi.gsoft.com.br
```

**`VITE_API_URL`**: deixe **vazio** se o navegador deve usar **`/api` no mesmo domínio** (recomendado com o proxy Nginx abaixo).

Build:

```bash
npm ci
npm run build
```

Envie os arquivos de `frontend/dist/` para o servidor:

```bash
rsync -av ./dist/ servidor:/var/www/qrpsi/frontend/
# ou git + build no servidor, conforme política da equipe
```

---

## 5. systemd — serviço da API

### 5.1. Unidade (`/etc/systemd/system/qrpsi-backend.service`)

Exemplo (**revise usuário/grupo** e caminhos):

```ini
[Unit]
Description=QRPSI API (Node.js / Express)
After=network.target

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=/var/www/qrpsi/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure
RestartSec=5

# Opcional: hardening simples (ajuste se precisarem de outros paths)
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

### 5.2. Comandos systemd (⭐ destaque operacional)

Sempre que **criar ou alterar** o arquivo `.service`:

```bash
sudo systemctl daemon-reload
```

Habilitar e subir na inicialização:

```bash
sudo systemctl enable --now qrpsi-backend
```

**Reinício após deploy** da API (nova `dist/` ou novo `.env`):

```bash
sudo systemctl restart qrpsi-backend
```

Conferência e logs:

```bash
sudo systemctl status qrpsi-backend --no-pager
sudo journalctl -u qrpsi-backend -f
```

---

## 6. Nginx — site HTTPS + SPA + `/api`

### 6.1. Arquivo do site

Exemplo: `/etc/nginx/sites-available/qrpsi` (Ubuntu/Debian).

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name qrpsi.gsoft.com.br;
    # Redirecionar tudo para HTTPS (recomendado em produção)
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name qrpsi.gsoft.com.br;

    ssl_certificate     /etc/letsencrypt/live/qrpsi.gsoft.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/qrpsi.gsoft.com.br/privkey.pem;

    root /var/www/qrpsi/frontend;
    index index.html;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;

    # API → Node na porta interna (não exponha essa porta publicamente no firewall)
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # Cookies / JWT costumam precisar de caminho coerente
        proxy_cookie_path /api /api;
        proxy_read_timeout 60s;
    }

    location /health {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend (React SPA)
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "public, max-age=3600";
    }

    # Assets fingerprintados podem cachear forte
    location /assets/ {
        try_files $uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

Ative o site (symlink):

```bash
sudo ln -s /etc/nginx/sites-available/qrpsi /etc/nginx/sites-enabled/qrpsi
```

### 6.2. Testar sintaxe e recarregar (⭐ destaque operacional)

Sempre antes de aplicar cambios grandes:

```bash
sudo nginx -t
```

Aplicar configurações **sem derrubar** conexões (reload):

```bash
sudo systemctl reload nginx
```

Se precisar **repartir todo o nginx** por algum motivo:

```bash
sudo systemctl restart nginx
```

> **Fluxo habitual após mudar apenas o arquivo do site**: `nginx -t` → `reload`.

---

## 7. Firewall (resumo)

- **Internet → 443/tcp** para o Nginx
- **Não exponha `3000`** publicamente — só `127.0.0.1` no `proxy_pass`.

---

## 8. Deploy (checklist rápido)

### Backend atualizado

```bash
cd /var/www/qrpsi/backend
git pull                               # ou upload do artefato
npm ci
npm run build
NODE_ENV=production npm run migrate     # quando houver migrações pendentes
sudo systemctl restart qrpsi-backend
```

### Frontend atualizado

```bash
# após novo build copiando dist/ para /var/www/qrpsi/frontend
sudo nginx -t && sudo systemctl reload nginx
```

> Normalmente não é obrigatório reiniciar a API apenas por mudança de arquivos estáticos — **reload do Nginx** basta para servir `.html`/`.js` atualizados. Use **purge de cache**/hard refresh nos browsers se usar CDN intermediário.

---

## 9. Problemas comuns

| Sintoma | O que conferir |
|--------|----------------|
| Login falha por CORS | `FRONTEND_URL` igual à origem real (`https://qrpsi.gsoft.com.br`); vírgulas sem espaço extra |
| 502 em `/api` | `qrpsi-backend` ativo (`systemctl status`); porta `PORT` igual ao `proxy_pass` |
| SPA 404 ao dar F5 em rota | `try_files` com `/index.html` |
| Links públicos apontando para `localhost` | `VITE_APP_PUBLIC_URL` corretamente definido na **hora do build do frontend** |

---

## 10. Resumo dos comandos operacionais (referência rápida)

```bash
# API
sudo systemctl daemon-reload          # nova/mudou unit
sudo systemctl restart qrpsi-backend  # aplicar novo build ou .env
sudo journalctl -u qrpsi-backend -e

# Nginx
sudo nginx -t
sudo systemctl reload nginx           # aplicar novo site/ssl (preferível)
sudo systemctl restart nginx          # se realmente precisar
```

---

Documento pensado para o padrão **Nginx reverso para Node** + SPA em **`/var/www/qrpsi`**. Ajuste domínios, certificados, usuários e política de migrações conforme seu **runbook interno**.
