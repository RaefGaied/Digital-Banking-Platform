-- V11__create_workflow_tasks_table.sql
-- Workflow Task Management for Support & Approvals

CREATE TABLE IF NOT EXISTS workflow_tasks (
  id BIGSERIAL PRIMARY KEY,
  process_instance_id VARCHAR(255) NOT NULL,
  support_ticket_id BIGINT,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, REJECTED, CANCELLED
  task_type VARCHAR(100) NOT NULL, -- TRANSFER_VALIDATION, FRAUD_CHECK, COMPLIANCE_REVIEW, ESCALATION
  description TEXT,
  assigned_to UUID,
  action_type VARCHAR(100), -- APPROVE, REJECT, REVIEW, ESCALATE
  due_date TIMESTAMPTZ,
  breached_at TIMESTAMPTZ,
  escalation_level INT DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  FOREIGN KEY (support_ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_workflow_tasks_process_instance_id ON workflow_tasks(process_instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_support_ticket_id ON workflow_tasks(support_ticket_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_status ON workflow_tasks(status);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_assigned_to ON workflow_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_due_date ON workflow_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_created_at ON workflow_tasks(created_at DESC);