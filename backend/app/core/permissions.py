from typing import List
from app.core.security import require_role
from app.models.user import User

ROLE_ADMIN = "admin"
ROLE_OPERATOR = "operator"
ROLE_VIEWER = "viewer"

ADMIN_ROLES: List[str] = [ROLE_ADMIN]
OPERATOR_ROLES: List[str] = [ROLE_ADMIN, ROLE_OPERATOR]
VIEWER_ROLES: List[str] = [ROLE_ADMIN, ROLE_OPERATOR, ROLE_VIEWER]

# FastAPI dependency shortcuts for endpoint protection
require_admin = require_role(ADMIN_ROLES)
require_operator = require_role(OPERATOR_ROLES)
require_viewer = require_role(VIEWER_ROLES)


def can_trigger_remediation(user: User) -> bool:
    return user.role in OPERATOR_ROLES


def can_approve_remediation(user: User) -> bool:
    return user.role in OPERATOR_ROLES


def can_manage_policies(user: User) -> bool:
    return user.role in ADMIN_ROLES


def can_activate_kill_switch(user: User) -> bool:
    return user.role in ADMIN_ROLES


def can_view_audit_logs(user: User) -> bool:
    return user.role in VIEWER_ROLES
