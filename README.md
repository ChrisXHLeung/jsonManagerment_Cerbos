# Multi-Role JSON Management System

This project is a reference implementation for a secure file management system. It demonstrates the decoupling of **Identity Authentication** from **Access Control Policy Enforcement**.

## 🏗️ Project Architecture

The system manages **JavaScript Object Notation (JSON)** files through a coordinated flow between three distinct layers:

1. **Identity Provider**: Uses **Auth0** to verify user identities.
2. **Authorization Engine**: Uses **Cerbos** to evaluate permissions based on **Attribute-Based Access Control (ABAC)**.
3. **Application Tier**: A **Node.js** service that handles file **Input/Output (I/O)** and serves as the **Policy Enforcement Point (PEP)**.

---

## 🔐 Authentication: OpenID Connect (OIDC)

This project strictly implements the **OpenID Connect (OIDC)** protocol, which is an identity layer built on top of the **OAuth 2.0 (Open Authorization)** framework.

* **Identity Verification**: Instead of storing passwords locally, the application delegates authentication to **Auth0**.
* **Identity Tokens**: Upon successful login, **Auth0** issues a **JSON Web Token (JWT)** known as an **ID Token**.
* **Claims Mapping**: User roles (`admin`, `member`, `user`) are embedded into the **JSON Web Token** as **Custom Claims**.

---

## 👥 User Roles & Permissions Matrix

| Action | **User** (Observer) | **Member** (Contributor) | **Admin** (Superuser) |
| --- | --- | --- | --- |
| Read File | ✅ | ✅ | ✅ |
| Create File | ❌ | ✅ | ✅ |
| Update/Overwrite | ❌ | ❌ | ✅ |
| Delete File | ❌ | ❌ | ✅ |

---

## 📂 Repository Structure

```text
.
├── cerbos/                 # Policy Engine Configuration
│   ├── conf.yaml           # Cerbos Server Configuration
│   └── policies/           # Permission logic (YAML)
└── cerbos-api/             # Node.js Application Service
    ├── storage/            # Managed JSON files
    ├── views/              # EJS Templates
    ├── index.js            # Main Logic & gRPC Client
    └── Dockerfile          # Secure API Image

```

---

## 🚀 Deployment Workflow

To deploy the full stack, follow these steps to ensure the **Policy Decision Point (PDP)** and the **API Service** communicate correctly.

### 1. Prepare the Cerbos Instance

The Cerbos engine must be running to evaluate permissions.

* **Mount Policies**: Ensure the `cerbos/policies` folder is mounted to the container's `/policies` path.
* **Ports**: Expose port `3592` for **Hypertext Transfer Protocol (HTTP)** and `3593` for **Google Remote Procedure Call (gRPC)**.

### 2. Configure Environment Variables

Inside `cerbos-api/`, create a `.env` file with your specific credentials:

```env
# Network Configuration
CERBOS_HOST='<YOUR_CERBOS_IP_OR_HOSTNAME>:3593'
APP_SECRET='<RANDOM_SESSION_SECRET>'

# OpenID Connect (OIDC) Settings
AUTH0_DOMAIN='<YOUR_TENANT>.auth0.com'
AUTH0_CLIENT_ID='<YOUR_CLIENT_ID>'
AUTH0_CLIENT_SECRET='<YOUR_CLIENT_SECRET>'
AUTH0_AUDIENCE='https://auth.chriscn.cn'

```

### 3. Build and Execute Containers

Use the provided **Dockerfile** to build the secure API image:

```bash
# Build the API image with security patches
cd cerbos-api
docker build -t cerbos-api-service .

# Run the API Service
docker run -d \
  --name json-api \
  -p 3000:3000 \
  --env-file .env \
  cerbos-api-service

```

### 4. Verification

1. Access the web interface at `http://localhost:3000`.
2. Login via the **Auth0** portal.
3. The **Node.js** app will automatically query the **Cerbos** gRPC endpoint to determine which buttons (Download/Delete/Upload) to display based on your role.

---

## 🛡️ Security Best Practices

* **Non-Root Execution**: The API process runs as the `node` user to mitigate **Privilege Escalation** risks.
* **Minimal Attack Surface**: Built on `node:20-slim` to reduce unnecessary binaries.
* **OS Hardening**: The build process applies the latest **Operating System (OS)** security updates.
