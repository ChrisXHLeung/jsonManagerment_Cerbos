# Multi-Role JSON Management System

  

This is a sample open-source project demonstrating a secure file management system. It showcases the decoupling of **Identity Authentication** (Who you are) from **Access Control Policy Enforcement** (What you can do).

  

## 🏗️ Project Architecture

  

The system manages **JavaScript Object Notation (JSON)** files through a coordinated flow between three distinct layers:

  

1.  **Identity Provider (IdP)**: Uses **Auth0** to verify user identities and manage user sessions.

2.  **Authorization Engine**: Uses **Cerbos** to evaluate permissions based on **Attribute-Based Access Control (ABAC)**.

3.  **Application Tier**: A **Node.js** service that handles file **Input/Output (I/O)** and serves as the **Policy Enforcement Point (PEP)**.

  

---

  

## 👥 User Groups & Permissions

  

The project manages access to `json_file` resources (JSON files) for teams divided into three role levels. All access decisions are evaluated at runtime by the **Cerbos Policy Decision Point (PDP)**.

An important resource-level restriction applies across all roles:  
- Any file whose name contains `sensitive` (case-insensitive) is completely inaccessible to everyone.  
- **User** role can only access files whose name contains `release` (case-insensitive) and does **not** contain `sensitive`.  
- **Member** and **Admin** roles can access any file that does **not** contain `sensitive`.

### Access Matrix

| Action              | **User** (Observer)                                      | **Member** (Contributor)                                      | **Admin** (Superuser)                          |
|---------------------|----------------------------------------------------------|---------------------------------------------------------------|------------------------------------------------|
| List & Read         | ✅ Only files containing `release` and **not** `sensitive` | ✅ All files **not** containing `sensitive`                    | ✅ All files  |
| Create File         | ❌                                                        | ✅ All files **not** containing `sensitive`<br>**Only allowed Monday–Friday, 09:00–16:59** (UTC) | ✅ All files |
| Update/Overwrite    | ❌                                                        | ❌                                                             | ✅ All files **not** containing `sensitive`     |
| Delete File         | ❌                                                        | ❌                                                             | ✅ All files **not** containing `sensitive`     |

### Additional Notes
- The time restriction applies **exclusively** to the **Member** role's `create` action. **Admin** creations have no time limit.
- Files with `sensitive` in the name are denied for all actions and all roles.
- The **User** role has the most restricted access: read-only on specifically marked "release" files, with no ability to create, update, or delete.
  

---

  

## 🔐 Authentication: OpenID Connect (OIDC)

  

This project strictly implements the **OpenID Connect (OIDC)** protocol, which is an identity layer built on top of the **OAuth 2.0 (Open Authorization)** framework.

  

*  **Delegated Authentication**: Instead of storing sensitive credentials locally, the application delegates the login process to **Auth0**.

*  **Identity Tokens**: Upon successful authentication, the application receives a **JSON Web Token (JWT)** known as an **ID Token**.

*  **Custom Claims**: User group memberships (roles) are extracted from the **ID Token** as **Custom Claims** and passed to the authorization engine.

  

---

  

## 📂 Repository Structure

  

```text

.

├── cerbos/ # Cerbos Engine Configuration

│ ├── conf.yaml # Cerbos Server Settings

│ └── policies/ # Authorization Logic (YAML)

└── cerbos-api/ # Node.js API Service

├── storage/ # Managed JSON Repository

├── views/ # Embedded JavaScript (EJS) Templates

├── index.js # Business Logic & gRPC Client

└── Dockerfile # Production-Hardened Container Image

  

```

  
---

  

## 🔐 Auth0 workflow setting
1. Add your Roles, Users, and assign your users with roles.
![enter image description here](https://raw.githubusercontent.com/ChrisXHLeung/jsonManagerment_Cerbos/refs/heads/main/images/auth0_role_0.png)

2. Add the code of  "Add Roles to Token" in "Actions>Library", then, draw it into the workflow in "Actions>Triggers".
![enter image description here](https://raw.githubusercontent.com/ChrisXHLeung/jsonManagerment_Cerbos/refs/heads/main/images/auth0_role_1.png)
![enter image description here](https://raw.githubusercontent.com/ChrisXHLeung/jsonManagerment_Cerbos/refs/heads/main/images/auth0_role_2.png)
![enter image description here](https://raw.githubusercontent.com/ChrisXHLeung/jsonManagerment_Cerbos/refs/heads/main/images/auth0_role_3.png)
3.  Modify your application in auth0, incuding login URL, Allow Callback URLs and Allowed Logout URLs. 
![enter image description here](https://raw.githubusercontent.com/ChrisXHLeung/jsonManagerment_Cerbos/refs/heads/main/images/auth0_role_4.png)

4.  And don't forget Grant Types
![enter image description here](https://raw.githubusercontent.com/ChrisXHLeung/jsonManagerment_Cerbos/refs/heads/main/images/auth0_role_5.png)

---

  

## 🚀 Deployment Workflow

  

### 1. Configure the Identity Provider

  

* Set up a **Regular Web Application** in your **Auth0** dashboard.

* Ensure user roles are included in the token via an Auth0 Action (e.g., `event.authorization.roles`).

  

### 2. Environment Setup

  

Configure the following in `cerbos-api/.env`:

  

```env

# Network

CERBOS_HOST='<INTERNAL_IP_OR_DNS>:3593'

APP_SECRET='<YOUR_SESSION_SIGNING_SECRET>'

  

# OpenID Connect (OIDC)

AUTH0_DOMAIN='<YOUR_TENANT>.auth0.com'

AUTH0_CLIENT_ID='<YOUR_CLIENT_ID>'

AUTH0_CLIENT_SECRET='<YOUR_CLIENT_SECRET>'

AUTH0_AUDIENCE='<YOUR_API_IDENTIFIER>'

  

```

  

### 3. Container Deployment
 

```bash
# Navigate to API directory
cd  cerbos-api

# Build secure image
docker  build  -t  json-management-api  .

# Run container
docker  run  -d  -p  3000:3000  --env-file  .env  json-management-api
```

  

---

  

## 🛠️ Technology Stack

  

*  **Identity**: **OpenID Connect (OIDC)** via **Auth0**.

*  **Authorization**: **Attribute-Based Access Control (ABAC)** via **Cerbos**.

*  **Communication**: **Google Remote Procedure Call (gRPC)**.

*  **Backend**: **Node.js** with **Express.js**.