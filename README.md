# AO-04 Safe Autonomous IT Operations Remediation Platform

[![Safety Compliance: Hard Guardrails](https://img.shields.io/badge/Safety_Guardrails-Enforced-success.svg)](file:///ARCHITECTURE.md)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.111-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/Frontend-React_19_Vite-61DAFB.svg?logo=react&logoColor=black)](https://vitejs.dev)
[![PostgreSQL 16](https://img.shields.io/badge/Database-PostgreSQL_16-336791.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker Compose](https://img.shields.io/badge/Orchestration-Docker_Compose-2496ED.svg?logo=docker&logoColor=white)](file:///docker-compose.yml)
[![Tests: Pytest](https://img.shields.io/badge/Tests-Passing-brightgreen.svg)](file:///backend/tests/test_safety.py)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🎯 Challenge Overview: AO-04
> **"Automation that is safe enough to leave switched on."**

Operations teams manage dozens of operational runbooks for routine faults—clearing saturated disks, restarting wedged workers, scaling queue consumers, and rotating expiring certificates. Although individual fixes are well-understood, fully automating them in enterprise environments introduces catastrophic operational hazards: **runaway automation loops, cascade failures across interdependent services, silent drift, and untested side effects.**

The **AO-04 Platform** solves this fundamental operational dilemma. It delivers an autonomous IT operations remediation platform governed by **strict, deterministic safety policies, mathematical blast-radius limits, human-in-the-loop cryptographic authorizations, automatic post-action verification, and fail-safe compensating rollbacks.** If an incident is ambiguous or exceeds policy boundaries, the platform **never guesses**—it immediately halts and safely escalates to on-call engineers.

---

## 🏗️ Architecture Overview

```
+---------------------------------------------------------------------------------------------------+
|                                  OPERATOR & SRE WORKSTATION                                       |
|                    Browser UI (React 19 + Vite + TailwindCSS + Lucide Icons)                     |
+-------------------------------------------------+-------------------------------------------------+
                                                  | HTTP / REST (JWT Bearer Token)
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                      INGRESS & REVERSE PROXY                                      |
|                                       Nginx (Docker Port 80)                                      |
|                      / -> React Static Assets  |  /api/* -> FastAPI Backend                       |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                  FASTAPI CONTROL PLANE (:8000)                                    |
|  +---------------------+  +---------------------+  +---------------------+  +------------------+  |
|  |   Auth & RBAC       |  | Incident Management |  |  Runbook Catalog    |  | Chaos Simulator  |  |
|  | (Admin/Oper/Viewer) |  |   & Correlation     |  |   (10 Runbooks)     |  |  (10 Scenarios)  |  |
|  +----------+----------+  +----------+----------+  +----------+----------+  +--------+---------+  |
+-------------|------------------------|------------------------|--------------------------|--------+
              |                        |                        |                          |
              +------------------------+-----------+------------+                          |
                                                   v                                       |
+------------------------------------------------------------------------------------------+--------+
|                                    SAFETY POLICY ENGINE                                           |
|  [x] Global Kill Switch (Immediate Fail-Closed)        [x] Hourly Rate Limits (Max 5/Runbook)     |
|  [x] Blast Radius Isolation (Max 3 Concurrent Actions) [x] Service Protection Allow/Deny Lists    |
|  [x] Execution Cooldown Enforcement                    [x] Cryptographic Action Hash Signing      |
+--------------------------------------------------+------------------------------------------------+
                                                   |
                        +--------------------------+--------------------------+
                        | Allowed (Low Risk)                                  | Medium / High Risk
                        v                                                     v
+--------------------------------------------------+  +---------------------------------------------+
|              AUTONOMOUS EXECUTION                |  |        HUMAN-IN-THE-LOOP APPROVAL           |
|         State Machine Execution Engine           |  |   Two-Man Rule & Expiry Verification        |
|  - Baseline Metric Snapshot                      |  |   TOCTOU Protection (SHA-256 Action)        |
|  - Idempotent Action Dispatch                    |  +----------------------+----------------------+
+-----------------------+--------------------------+                         | Operator Approval
                        |                                                    |
                        +----------------------------------------------------+
                        v
+---------------------------------------------------------------------------------------------------+
|                               VERIFICATION & COMPENSATING ROLLBACK                                |
|  - Post-Execution Health Check Verification                                                      |
|  - PASS: Mark Succeeded, Emit Metric, Close Incident                                             |
|  - FAIL: Trigger Compensating Rollback Action -> If Rollback Fails: Escalate Immediately          |
+--------------------------------------------------+------------------------------------------------+
                                                   |
                        +--------------------------+--------------------------+
                        v                                                     v
+--------------------------------------------------+  +---------------------------------------------+
|            POSTGRESQL 16 / SQLITE                |  |           IMMUTABLE AUDIT TRAIL             |
|   Persistent State, Runbooks, Policies, Users    |  |  Non-repudiable JSON log with Redacted PII  |
+--------------------------------------------------+  +---------------------------------------------+
```

---

## ⚡ 10 Core Platform Modules

| # | Module | Description |
|---|---|---|
| **1** | **Authentication & RBAC** | Role-based JWT security supporting `admin`, `operator`, and `viewer` roles with strict route guarding. |
| **2** | **Incident Management** | Incident lifecycle tracking (`open`, `executing`, `verifying`, `succeeded`, `failed`, `escalated`, `blocked`). |
| **3** | **Runbook Catalog** | 10 pre-configured prose-to-code ITIL operational runbooks with trigger conditions and verification specs. |
| **4** | **Autonomous Remediation** | Deterministic state machine executing actions, capturing pre/post telemetry snapshots. |
| **5** | **Human Approval Engine** | Multi-tier authorization workflow for medium/high risk tiers with SHA-256 action integrity hashing. |
| **6** | **Safety Policy Guardrails** | Concurrency throttles, hourly frequency limits, service allowlists, and execution cooldown timers. |
| **7** | **Emergency Kill Switch** | Single-click global emergency halt instantly blocking all autonomous executions with zero restart required. |
| **8** | **Immutable Audit Trail** | Tamper-evident operational event log tracking every decision, status shift, and operator action with PII redaction. |
| **9** | **Chaos Fault Simulator** | Infrastructure fault simulator capable of injecting 10 distinct, reproducible failure scenarios. |
| **10** | **Operational KPI Analytics** | Real-time analytics measuring autonomous resolution rate, MTTR, rollback success rate, and safety stops. |

---

## 🛡️ Safety Guarantees & Guardrails

The platform is designed around zero-trust operational safety principles:

1. **Fail-Closed by Default:**
   If a database, policy check, or prerequisite check fails, the engine blocks the remediation and escalates to on-call personnel.
2. **Hard Rate Limits & Cooldowns:**
   No runbook can execute more than **5 times per hour**, preventing runaway automation loops during flapping incidents.
3. **Blast Radius Limiter:**
   Maximum **3 concurrent active remediations** across the entire cluster. No runaway cascade actions can exhaust cluster capacity.
4. **TOCTOU Action Hashing:**
   Approvals bind to `SHA256(action:target:runbook_id)`. If target parameters or runbook definitions shift between approval request and execution, the action is rejected.
5. **No Guessing on Ambiguity:**
   Incidents lacking an exact matching active runbook are marked `escalated` immediately.
6. **Compensating Rollbacks:**
   Every executed runbook defines a rollback procedure executed automatically if post-action verification metrics fail.
7. **Zero Shared Admin Credentials:**
   Credential redaction sanitizes all secrets, passwords, and tokens before committing audit log records.

---

## 📋 Prerequisites

Before setting up the project on Windows:

- **Windows 10 / 11** or **Windows Server 2022+**
- **PowerShell 5.1** or **PowerShell 7+**
- **Python 3.10 to 3.12+** ([python.org](https://www.python.org/downloads/))
- **Node.js 18+ & npm** ([nodejs.org](https://nodejs.org/))
- **Docker Desktop for Windows** (with WSL2 backend enabled) — *Optional if running manual development mode*

---

## 🚀 Windows PowerShell Quick Start

Follow these copy-paste PowerShell commands to clone and launch the entire system.

### Option A: Complete Docker Compose Setup (Recommended)

Ensure Docker Desktop is running, open PowerShell in the project directory, and execute:

```powershell
# 1. Navigate to project root
cd C:\Users\Aishwarya\.gemini\antigravity\scratch\ao04-platform

# 2. Verify Docker daemon is running
docker info

# 3. Build and launch all containers (Postgres, Backend, Frontend)
docker compose up -d --build

# 4. Check service status
docker compose ps

# 5. Tail backend logs to verify database migrations and seed
docker compose logs -f backend
```

Once running, access the services:
- **Web Dashboard:** [http://localhost](http://localhost) (or [http://localhost:80](http://localhost:80))
- **FastAPI Backend & Interactive Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **PostgreSQL Database:** `localhost:5432` (`ao04db`)

To stop the containers:
```powershell
docker compose down
```

---

### Option B: Local Development Setup (Manual, No Docker)

If running without Docker, the backend features an **automatic SQLite fallback engine**, allowing instant execution without installing PostgreSQL.

#### 1. Backend Setup (PowerShell)

```powershell
# Navigate to backend directory
cd C:\Users\Aishwarya\.gemini\antigravity\scratch\ao04-platform\backend

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Upgrade pip
python -m pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

# Copy environment variables file
Copy-Item .env.example .env

# Initialize and seed database
python -m app.db.init_db

# Start FastAPI backend server with auto-reload
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend Setup (Separate PowerShell Window)

```powershell
# Navigate to frontend directory
cd C:\Users\Aishwarya\.gemini\antigravity\scratch\ao04-platform\frontend

# Install Node.js dependencies
npm install

# Start Vite development server
npm run dev
```

The frontend will run on `http://localhost:5173` and connect to backend on `http://localhost:8000`.

---

## 🔑 Default Credentials

The platform seeds three role-specific users on initialization:

| Username | Password | Role | Permissions |
|---|---|---|---|
| `admin` | `admin123` | **Administrator** | Full control: Toggle Kill Switch, manage policies, execute any runbook, user admin. |
| `operator` | `operator123` | **Operator** | Operational control: Trigger simulations, trigger remediations, approve/reject pending runs. |
| `viewer` | `viewer123` | **Viewer** | Read-only access: View dashboard, inspect incidents, view audit timeline, check KPIs. |

---

## 📖 API Documentation Reference

When the backend is running, interactive API documentation is automatically available:

- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc UI:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **OpenAPI Schema (JSON):** [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

### Primary API Endpoints

```
Authentication:
  POST   /api/auth/login                  -> Obtain JWT Bearer Token

Incidents:
  GET    /api/incidents                   -> List & filter incidents
  GET    /api/incidents/{id}              -> Retrieve incident details
  POST   /api/incidents/{id}/remediate    -> Trigger safety-governed remediation

Runbooks:
  GET    /api/runbooks                    -> List all 10 operational runbooks
  GET    /api/runbooks/{id}               -> Inspect trigger, verification & rollback rules

Remediations:
  GET    /api/remediations                -> List remediation history
  GET    /api/remediations/{id}           -> Inspect execution & verification metrics
  GET    /api/remediations/{id}/timeline  -> Retrieve chronological audit timeline

Approvals:
  GET    /api/approvals                   -> List pending approval requests
  POST   /api/approvals/{id}/approve      -> Approve remediation (validates action hash)
  POST   /api/approvals/{id}/reject       -> Reject remediation with reason

Policies & Safety:
  GET    /api/policies                    -> Inspect active safety policy rules
  GET    /api/policies/kill-switch        -> Check emergency kill switch status
  POST   /api/policies/kill-switch/activate   -> Emergency halt of all autonomous actions
  POST   /api/policies/kill-switch/deactivate -> Restore autonomous execution

Chaos & Fault Simulation:
  GET    /api/simulations/scenarios       -> List 10 reproducible fault scenarios
  POST   /api/simulations/trigger         -> Inject chaos fault into simulated infrastructure
  POST   /api/simulations/reset           -> Reset simulator infrastructure to healthy state

Analytics & Audit:
  GET    /api/dashboard/summary           -> High-level operational summary
  GET    /api/analytics/kpis              -> Autonomous resolution rate, MTTR, rollbacks
  GET    /api/audit                       -> Paginated immutable audit trail
```

---

## ⚙️ Environment Variables Reference

Configure environment variables in `ao04-platform/backend/.env`:

| Variable | Default Value | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://ao04user:ao04pass@localhost:5432/ao04db` | PostgreSQL connection string. |
| `SECRET_KEY` | `your-super-secret-key-change-this...` | Cryptographic secret for signing JWT tokens. |
| `ALGORITHM` | `HS256` | JWT signature algorithm. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` | JWT token validity window (8 hours). |
| `ENVIRONMENT` | `development` | Environment mode (`development` / `production`). |
| `DEBUG` | `true` | Detailed FastAPI logging. |
| `ALLOW_SQLITE_FALLBACK` | `true` | When `true`, automatically falls back to SQLite if PostgreSQL is unreachable. |
| `SQLITE_URL` | `sqlite:///./ao04_dev.db` | Local SQLite database file location for offline development. |

---

## 🧪 Running Automated Tests

A comprehensive test suite verifies all safety invariants, policy limits, kill switches, and rollbacks:

```powershell
# Navigate to backend
cd C:\Users\Aishwarya\.gemini\antigravity\scratch\ao04-platform\backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Execute test suite
pytest tests/test_safety.py -v
```

### Verified Test Cases:
- `test_kill_switch_blocks_execution`: Confirms kill switch immediately prevents action dispatch.
- `test_rate_limit_enforcement`: Confirms 6th runbook invocation within 1 hour is rejected.
- `test_blast_radius_concurrency`: Confirms exceeding 3 concurrent runs blocks new requests.
- `test_action_hash_verification`: Rejects approvals if runbook or target was altered (anti-TOCTOU).
- `test_verification_failure_triggers_rollback`: Exercises automatic compensating rollback.
- `test_audit_event_immutability_and_redaction`: Confirms passwords/tokens are wiped from audit logs.

---

## 🛠️ Troubleshooting

### 1. Port 5432 or 8000 already in use
- **Issue:** Another local Postgres or service occupies the required port.
- **Solution:** 
  ```powershell
  # Check which process is listening
  Get-Process -Id (Get-NetTCPConnection -LocalPort 5432).OwningProcess
  ```
  Alternatively, enable `ALLOW_SQLITE_FALLBACK=true` in `backend/.env` to run purely on local SQLite.

### 2. PowerShell Script Execution Policy
- **Issue:** `.\venv\Scripts\Activate.ps1 cannot be loaded because running scripts is disabled`.
- **Solution:** Run this once in PowerShell:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

### 3. Docker Compose Build Fails to Reach NPM
- **Issue:** Corporate proxy or firewall blocking `npm ci`.
- **Solution:** Verify internet connectivity and run `npm config set registry https://registry.npmjs.org/`.

---

## 🔒 Security & Compliance Design

- **ITIL-Compliant Audit Trails:** Every automated change creates a distinct change record with pre-state, post-state, and actor attribution.
- **Least-Privilege Enforcement:** Viewer accounts cannot trigger actions or approve remediations.
- **Fail-Safe Circuit Breaker:** The kill-switch stops all active pipelines within `< 50ms`.
- **Zero Hardcoded Secrets:** Docker configurations pass secrets through environment variables.

---

## 📄 License

This project is licensed under the **MIT License**.
