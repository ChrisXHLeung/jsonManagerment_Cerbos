# Secure File Management System (Build by AI)

A distributed system using **Node.js** for the API and **Cerbos** for policy-based authorization.

## 📂 Project Structure

```text
.
├── cerbos/                 # Cerbos Engine configuration & data
│   ├── conf.yaml           # Cerbos server config
│   └── policies/           # YAML Policy definitions
│       └── resource_json_file.yaml
└── cerbos-api/             # Node.js API Service
    ├── storage/            # Local JSON file storage
    ├── views/              # EJS templates
    ├── index.js            # Main API logic
    ├── Dockerfile          # Secure API image
    └── .env                # Environment secrets

```

---

## 🛠️ Security Model

Authorization is decoupled from the code. The `admin` role has full ownership, while `member` and `user` roles are restricted.

| Role | Read | Create | Update | Delete |
| --- | --- | --- | --- | --- |
| **admin** | ✅ | ✅ | ✅ | ✅ |
| **member** | ✅ | ✅ | ❌ | ❌ |
| **user** | ✅ | ❌ | ❌ | ❌ |

---

## ⚙️ Configuration

### 1. API Setup (`cerbos-api/.env`)

```env
# Network
CERBOS_HOST='your_cerbos_server_ip:3593'
APP_SECRET='your_random_secret'

# Auth0 Configuration
AUTH0_DOMAIN='your-tenant.auth0.com'
AUTH0_CLIENT_ID='your-id'
AUTH0_CLIENT_SECRET='your-secret'
AUTH0_AUDIENCE='your-api-audience'

```

### 2. Cerbos Setup (`cerbos/conf.yaml`)

Ensure the storage driver is set to disk pointing to the internal `/policies` path.

---

## 🐳 Docker Deployment

### Building the API Service

The `cerbos-api` Dockerfile includes security updates and runs as a non-privileged user:

```bash
cd cerbos-api
docker build -t cerbos-api:latest .

```

### Running the Services

The API communicates with the Cerbos engine via **gRPC (Port 3593)**. Ensure your network or firewall allows traffic between the two containers/hosts on this port.

---

## 🚀 API Endpoints

* `GET /`: List all available JSON files.
* `GET /download/:name`: Download a file (Requires `read` permission).
* `POST /upload`: Upload a new file (`create`) or overwrite existing (`update`).
* `GET /delete/:name`: Remove a file (Requires `delete` permission).

---

## 🛡️ Security Best Practices

* **Non-Root**: The API container runs under the `node` user to prevent privilege escalation.
* **Minimal Image**: Built on `node:20-slim` to reduce the attack surface.
* **External Policies**: Update authorization rules in the `cerbos/` folder without modifying or redeploying the API code.

Would you like me to create a shell script to automate the deployment of both containers at once?
