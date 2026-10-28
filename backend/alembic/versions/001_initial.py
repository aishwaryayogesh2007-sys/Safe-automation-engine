"""initial migration for ao-04 schema

Revision ID: 001_initial
Revises: 
Create Date: 2026-10-28 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('username', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # Runbooks table
    op.create_table(
        'runbooks',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('trigger_conditions', sa.JSON(), nullable=False),
        sa.Column('preconditions', sa.JSON(), nullable=False),
        sa.Column('allowed_actions', sa.JSON(), nullable=False),
        sa.Column('risk_tier', sa.String(length=50), nullable=False),
        sa.Column('target_restrictions', sa.JSON(), nullable=False),
        sa.Column('execution_timeout_seconds', sa.Integer(), nullable=False),
        sa.Column('max_retries', sa.Integer(), nullable=False),
        sa.Column('cooldown_seconds', sa.Integer(), nullable=False),
        sa.Column('max_changes', sa.Integer(), nullable=False),
        sa.Column('required_approvals', sa.Integer(), nullable=False),
        sa.Column('verification_criteria', sa.JSON(), nullable=False),
        sa.Column('rollback_action', sa.String(length=255), nullable=True),
        sa.Column('escalation_rules', sa.JSON(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_runbooks_name'), 'runbooks', ['name'], unique=True)

    # Incidents table
    op.create_table(
        'incidents',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('severity', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('incident_type', sa.String(length=100), nullable=False),
        sa.Column('affected_service', sa.String(length=100), nullable=False),
        sa.Column('affected_target', sa.String(length=255), nullable=False),
        sa.Column('metrics_snapshot', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('assigned_runbook_id', sa.String(length=36), nullable=True),
        sa.ForeignKeyConstraint(['assigned_runbook_id'], ['runbooks.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )

    # Remediations table
    op.create_table(
        'remediations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('incident_id', sa.String(length=36), nullable=False),
        sa.Column('runbook_id', sa.String(length=36), nullable=False),
        sa.Column('runbook_version', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('triggered_by', sa.String(length=36), nullable=True),
        sa.Column('baseline_metrics', sa.JSON(), nullable=False),
        sa.Column('post_metrics', sa.JSON(), nullable=False),
        sa.Column('execution_result', sa.JSON(), nullable=False),
        sa.Column('verification_result', sa.JSON(), nullable=False),
        sa.Column('rollback_result', sa.JSON(), nullable=False),
        sa.Column('idempotency_key', sa.String(length=255), nullable=False),
        sa.Column('policy_version', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['incident_id'], ['incidents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['runbook_id'], ['runbooks.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['triggered_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_remediations_idempotency_key'), 'remediations', ['idempotency_key'], unique=True)

    # Approvals table
    op.create_table(
        'approvals',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('remediation_id', sa.String(length=36), nullable=False),
        sa.Column('requested_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('approved_by', sa.String(length=36), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('runbook_version', sa.Integer(), nullable=False),
        sa.Column('policy_version', sa.String(length=50), nullable=False),
        sa.Column('action_hash', sa.String(length=128), nullable=False),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['remediation_id'], ['remediations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # Audit Events table
    op.create_table(
        'audit_events',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('incident_id', sa.String(length=36), nullable=True),
        sa.Column('remediation_id', sa.String(length=36), nullable=True),
        sa.Column('approval_id', sa.String(length=36), nullable=True),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('actor_id', sa.String(length=36), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('details', sa.JSON(), nullable=False),
        sa.Column('runbook_id', sa.String(length=36), nullable=True),
        sa.Column('runbook_version', sa.Integer(), nullable=True),
        sa.Column('policy_version', sa.String(length=50), nullable=True),
        sa.Column('risk_tier', sa.String(length=50), nullable=True),
        sa.Column('status_before', sa.String(length=50), nullable=True),
        sa.Column('status_after', sa.String(length=50), nullable=True),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['approval_id'], ['approvals.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['incident_id'], ['incidents.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['remediation_id'], ['remediations.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['runbook_id'], ['runbooks.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_audit_events_event_type'), 'audit_events', ['event_type'], unique=False)
    op.create_index(op.f('ix_audit_events_timestamp'), 'audit_events', ['timestamp'], unique=False)

    # Policies table
    op.create_table(
        'policies',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('version', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('rules', sa.JSON(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('kill_switch_active', sa.Boolean(), nullable=False),
        sa.Column('kill_switch_activated_by', sa.String(length=36), nullable=True),
        sa.Column('kill_switch_activated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('kill_switch_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['kill_switch_activated_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_policies_version'), 'policies', ['version'], unique=True)

    # Simulation Scenarios table
    op.create_table(
        'simulation_scenarios',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('scenario_type', sa.String(length=100), nullable=False),
        sa.Column('parameters', sa.JSON(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_simulation_scenarios_name'), 'simulation_scenarios', ['name'], unique=True)
    op.create_index(op.f('ix_simulation_scenarios_scenario_type'), 'simulation_scenarios', ['scenario_type'], unique=False)


def downgrade() -> None:
    op.drop_table('simulation_scenarios')
    op.drop_table('policies')
    op.drop_table('audit_events')
    op.drop_table('approvals')
    op.drop_table('remediations')
    op.drop_table('incidents')
    op.drop_table('runbooks')
    op.drop_table('users')
