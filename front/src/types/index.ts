export interface User {
  id: string;
  name: string;
  email: string;
  role?: 'USER' | 'ADMIN';
}

export interface Account {
  id: string;
  agency: string;
  number: string;
  balance: number;
  status: string;
  ownerName: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  description: string;
  sourceAccountNumber: string | null;
  targetAccountNumber: string | null;
  flowableProcessId?: string | null;
  agentDecision?: AgentDecision | null;
  createdAt: string;
}

export interface TokenResponse {
  uuid: string;
  name: string;
  role: 'USER' | 'ADMIN';
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export type LoginResponse =
  | { twoFactorRequired: true; tempToken: string }
  | (TokenResponse & { twoFactorRequired?: false; tempToken?: never });

export interface PageResponse<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  numberOfElements?: number;
  empty?: boolean;
}

export interface TicketStatistics {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
}

export interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  active: boolean;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  createdAt: string;
}

export interface AdminTicketSummary {
  id: number;
  userId: string;
  customerName: string | null;
  customerEmail: string | null;
  subject: string;
  description: string;
  status: string;
  priority: string;
  ticketType: string;
  attachmentName: string | null;
  assignedAdminId: string | null;
  ownerId: string | null;
  flowableProcessId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
}

export interface AdminTaskSummary {
  id: string;
  processInstanceId: string;
  supportTicketId: number | null;
  taskType: string | null;
  status: string;
  actionType: string | null;
  description: string | null;
  assignedTo: string | null;
  escalationLevel: number;
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
  ticket: AdminTicketSummary | null;
  client: AdminUserSummary | null;
}

export interface AdminTaskDetail {
  task: AdminTaskSummary;
  metadata: Record<string, unknown> | null;
  completedAt: string | null;
}

export interface FlowableAdminTask {
  id: string;
  name: string;
  taskDefinitionKey: string;
  assignee: string | null;
  createdTime: string;
  processInstanceId: string;
}

export interface FlowableProcessSummary {
  id: string;
  processDefinitionId: string;
  processDefinitionKey?: string;
  processDefinitionName?: string;
  businessKey: string | null;
  startedAt: string | null;
  endedAt: string | null;
  endActivityId: string | null;
  deleteReason: string | null;
  active: boolean;
  activeTaskId?: string;
  activeTaskName?: string;
}

export interface FlowableProcessDetails {
  processInstanceId: string;
  variables: Record<string, unknown>;
}

export interface AdminAuditLog {
  id: string;
  userEmail: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  sessionId: string | null;
  status: string;
  createdAt: string;
}

export interface AdminSecurityEvent {
  id: string;
  userId: string;
  type: string;
  ipAddress: string | null;
  deviceId: string | null;
  resolved: boolean;
  timestamp: string;
}

export interface AdminSecurityEventResolutionRequest {
  incidentSummary: string;
  investigationFindings: string;
  correctiveActions: string;
  preventiveMeasures?: string;
}

export interface AdminSecurityEventAnalysis {
  explanation: string;
  incidentSummary: string;
  investigationFindings: string;
  correctiveActions: string;
  preventiveMeasures: string;
  aiAssessment: string | null;
  aiGenerated: boolean;
}

export interface AdminDashboardResponse {
  ticketStatistics: TicketStatistics;
  activeSessions: number;
  activeUsers: number;
  pendingTasks: number;
  recentTasks: AdminTaskSummary[];
  recentAuditLogs: AdminAuditLog[];
}

export interface RagDocument {
  id: number;
  title: string;
  content: string;
  source: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskActionRequest {
  action: 'APPROVE' | 'REJECT' | 'REVIEW' | 'ESCALATE';
  comment?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface TransactionRequest {
  amount: number;
  description?: string;
  targetAccountNumber?: string;
  sessionId?: string;
}

export interface SupportTicket {
  id: number;
  userId: string;
  subject: string;
  description: string;
  status: string;
  ticketType: string;
  priority: string;
  attachmentName?: string | null;
  attachmentType?: string | null;
  awaitingIdentityDocument?: boolean;
  assignedAdminId: string | null;
  ownerId: string | null;
  flowableProcessId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
}

export interface SessionRecord {
  id: string;
  userId: string;
  agentId: string | null;
  status: string;
  ipAddress: string | null;
  createdAt: string;
  lastActivityAt: string;
  closedAt: string | null;
}

export interface CreateSessionRequest {
  ipAddress?: string;
}

export type AgentDecision = 'AUTO_EXECUTE' | 'TRIGGER_BPMN' | 'REQUEST_INFO' | 'BLOCK';

export interface BankingAgent {
  id: string;
  sessionId: string;
  userId: string;
  context: Record<string, unknown> | null;
  lastTransactionId: string | null;
  decision: AgentDecision | null;
  defaultPolicy: AgentDecision | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentActivityTrace {
  timestamp: string;
  action: string;
  intent?: string | null;
  confidence?: number | null;
  isSensitive?: boolean | null;
  decision?: AgentDecision | null;
  parameters?: Record<string, unknown> | null;
  note?: string | null;
}

export interface AgentDecisionTrace {
  agentId: string;
  intent: string | null;
  confidence: number | null;
  decision: AgentDecision;
  reason: string;
  threshold: number;
  parameters: Record<string, unknown> | null;
}

export interface AgentDecisionResult {
  decision: AgentDecision;
  reason: string;
  trace: AgentDecisionTrace;
  agent: BankingAgent;
}

export interface DetermineAgentDecisionRequest {
  agentId: string;
  intent?: string;
  confidence: number;
  message?: string;
  parameters?: Record<string, unknown>;
  isSensitive?: boolean;
}

export interface CreateSupportTicketRequest {
  subject: string;
  description: string;
  ticketType?: string;
  priority?: string;
  attachment?: File | null;
}
