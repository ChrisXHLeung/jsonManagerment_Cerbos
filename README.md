# 🛡️ Multi-Role JSON Management System

This project is a high-performance, secure file management showcase. It demonstrates the industry-standard **Decoupled Authorization** architecture, separating **Identity Authentication** (Auth0) from **Granular Access Control** (Cerbos).

## 🏗️ System Architecture

The system operates as a **Policy Enforcement Point (PEP)**, delegating all logic to a centralized **Policy Decision Point (PDP)**.
![](https://raw.githubusercontent.com/ChrisXHLeung/jsonManagerment_Cerbos/refs/heads/main/images/systemWorkFlow.png)

1. **Identity Layer (OIDC)**: **Auth0** handles user sessions and issues JWTs containing role claims.
2. **Authorization Layer (ABAC)**: **Cerbos** evaluates requests against YAML-defined policies using real-time attributes (time, filename).
3. **Application Layer (PEP)**: A **Node.js** service that manages JSON I/O and enforces the decisions received from Cerbos via **gRPC**.
![](https://raw.githubusercontent.com/ChrisXHLeung/jsonManagerment_Cerbos/refs/heads/main/images/systemDiagram.png)
---

## 👥 Access Control Logic (ABAC)


Unlike traditional static RBAC, this system uses **Attribute-Based Access Control (ABAC)** to enforce dynamic rules.
![](https://raw.githubusercontent.com/ChrisXHLeung/jsonManagerment_Cerbos/refs/heads/main/images/auth0-abac.png)
### 🔐 Global Security Guardrails

* **Sensitivity Filter**: Any file matching `(?i)sensitive` in its name is strictly **Isolated**. No role (including Admin) can delete or modify these files via the standard API path.
* **Release Filter**: The **User** role is restricted to a "Discovery Mode," only seeing files tagged with `release`.

### 📊 Permission Matrix

| Action | User (Observer) | Member (Contributor) | Admin (Superuser) |
| --- | --- | --- | --- |
| **List & Read** | ✅ `release` files only | ✅ All non-sensitive | ✅ Full Access |
| **Create** | ❌ Denied | ✅ **Work Hours Only**¹ | ✅ Full Access |
| **Update** | ❌ Denied | ❌ Denied | ⚠️ Non-sensitive only |
| **Delete** | ❌ Denied | ❌ Denied | ⚠️ Non-sensitive only |

> ¹ **Time Attribute**: Member `create` actions are restricted to **Mon–Fri, 09:00–17:00 UTC**.

---

## 📂 Repository Structure

```bash
.
├── PDP/                   # Policy Decision Point (PDP)
│   ├── conf.yaml          # Cerbos server configuration
│   └── policies/          # ABAC/RBAC logic defined in YAML
└── PEP/                   # Policy Enforcement Point (PEP)
    ├── storage/           # Flat-file JSON database
    ├── views/             # UI Templates (EJS)
    └── index.js           # Express logic & Cerbos gRPC Client

```

---

## 🔧 Setup & Configuration

### 1. Auth0 (Identity Provider) Configuration

To pass roles to the application, you must configure an **Auth0 Post-Login Action**:

1. **Create Action**: `Actions > Library > Build Custom`.
2. **Add Roles to Token**:
```javascript
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://my-app.example.com';
  if (event.authorization) {
    api.idToken.setCustomClaim(`${namespace}/roles`, event.authorization.roles);
  }
};

```


3. **Deploy**: Add this action to your "Login" flow.

### 2. Environment Variables

Create `PEP/.env`:

```env
# Infrastructure
CERBOS_HOST='localhost:3593'
APP_SECRET='your_session_secret'

# OIDC Settings
AUTH0_DOMAIN='your-tenant.auth0.com'
AUTH0_CLIENT_ID='your_client_id'
AUTH0_CLIENT_SECRET='your_client_secret'

```

### 3. Quick Start (Docker)

```bash
# Start Cerbos PDP
docker run -d --name cerbos -p 3593:3593 -v $(pwd)/PDP/policies:/policies cerbos/cerbos:0.50.0

# Start PEP Service
cd PEP && npm install && npm start

```

---

## 🛠️ Tech Stack Highlights

* **Communication**: **gRPC** for ultra-low latency between API and Authorization engine.
* **Identity**: **OpenID Connect (OIDC)** flow with PKCE.
* **Policy Engine**: **Cerbos** - stateless, scalable, and audit-ready.
* **Express Middleware**: Custom middleware to bridge JWT claims to Cerbos principal context.
