import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ArrowForward, ExpandMore, SmartToy } from '@mui/icons-material';
import { agentsApi } from '../api/agents';
import type { AgentActivityTrace, AgentDecision, AgentDecisionResult, BankingAgent } from '../types';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const decisionDescriptions: Record<AgentDecision, string> = {
  AUTO_EXECUTE: 'The request can continue through the normal automated flow.',
  REQUEST_INFO: 'The request needs more information before it can continue.',
  TRIGGER_BPMN: 'The request needs a BPMN workflow or human review.',
  BLOCK: 'The request is blocked by the current policy.',
};

function shortId(id: string) {
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

function formatTimestamp(timestamp?: string | null) {
  if (!timestamp) return 'Time unavailable';
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp : date.toLocaleString();
}

function decisionSeverity(decision: AgentDecision): 'success' | 'info' | 'warning' | 'error' {
  if (decision === 'AUTO_EXECUTE') return 'success';
  if (decision === 'REQUEST_INFO') return 'info';
  if (decision === 'TRIGGER_BPMN') return 'warning';
  return 'error';
}

function AgentConfiguration({ agent, onSaved }: { agent: BankingAgent; onSaved: () => void }) {
  const [contextText, setContextText] = useState(agent.context ? JSON.stringify(agent.context, null, 2) : '');
  const [transactionId, setTransactionId] = useState(agent.lastTransactionId ?? '');
  const [decision, setDecision] = useState<AgentDecision>(agent.decision ?? agent.defaultPolicy ?? 'AUTO_EXECUTE');
  const [error, setError] = useState('');

  const updateContextMutation = useMutation({
    mutationFn: (context: Record<string, unknown>) => agentsApi.updateContext(agent.id, context),
    onSuccess: onSaved,
  });
  const updateDecisionMutation = useMutation({
    mutationFn: () => agentsApi.updateDecision(agent.id, decision),
    onSuccess: onSaved,
  });
  const recordTxMutation = useMutation({
    mutationFn: () => agentsApi.recordLastTransaction(agent.id, transactionId.trim()),
    onSuccess: onSaved,
  });

  return (
    <>
      {(updateContextMutation.isError || updateDecisionMutation.isError || recordTxMutation.isError) && (
        <Alert severity='error'>The agent could not be updated. Please try again.</Alert>
      )}
      {error && <Alert severity='error' onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{ display: 'grid', gap: 1.5 }}>
        <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>Agent information</Typography>
        <Typography variant='body2' color='text.secondary' title={agent.id}>
          Agent ID: {shortId(agent.id)}
        </Typography>
        <Typography variant='body2' color='text.secondary' title={agent.sessionId}>
          Session ID: {shortId(agent.sessionId)}
        </Typography>
        <Typography variant='body2' color='text.secondary' title={agent.lastTransactionId ?? undefined}>
          Last transaction: {agent.lastTransactionId ? shortId(agent.lastTransactionId) : 'None recorded'}
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gap: 1.5 }}>
        <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>Stored context</Typography>
        <TextField
          label='Context (JSON)'
          minRows={4}
          multiline
          value={contextText}
          onChange={(event) => setContextText(event.target.value)}
          fullWidth
        />
        <Button
          variant='outlined'
          onClick={() => {
            try {
              const parsed: unknown = contextText ? JSON.parse(contextText) : {};
              if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
                setError('Agent context must be a JSON object.');
                return;
              }
              setError('');
              void updateContextMutation.mutateAsync({ ...parsed });
            } catch {
              setError('Enter valid JSON before saving the agent context.');
            }
          }}
          disabled={updateContextMutation.isPending}
          sx={{ justifySelf: 'start' }}
        >
          {updateContextMutation.isPending ? 'Saving…' : 'Save context'}
        </Button>
      </Box>

      <Box sx={{ display: 'grid', gap: 1.5 }}>
        <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>Policy override</Typography>
        <Typography variant='body2' color='text.secondary'>
          Changes the agent's configured decision. Use the decision test below to see how risk rules affect a sample.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
          <TextField select label='Decision policy' value={decision} onChange={(event) => setDecision(event.target.value as AgentDecision)} sx={{ minWidth: 240 }}>
            <MenuItem value='AUTO_EXECUTE'>AUTO_EXECUTE</MenuItem>
            <MenuItem value='TRIGGER_BPMN'>TRIGGER_BPMN</MenuItem>
            <MenuItem value='REQUEST_INFO'>REQUEST_INFO</MenuItem>
            <MenuItem value='BLOCK'>BLOCK</MenuItem>
          </TextField>
          <Button
            variant='outlined'
            onClick={() => void updateDecisionMutation.mutateAsync()}
            disabled={updateDecisionMutation.isPending}
          >
            {updateDecisionMutation.isPending ? 'Saving…' : 'Save policy'}
          </Button>
        </Stack>
      </Box>

      <Box sx={{ display: 'grid', gap: 1.5 }}>
        <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>Record a transaction reference</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField label='Transaction ID' value={transactionId} onChange={(event) => setTransactionId(event.target.value)} fullWidth />
          <Button
            variant='outlined'
            onClick={() => void recordTxMutation.mutateAsync()}
            disabled={recordTxMutation.isPending || !transactionId.trim()}
          >
            {recordTxMutation.isPending ? 'Saving…' : 'Save reference'}
          </Button>
        </Stack>
      </Box>
    </>
  );
}

export default function AgentsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const selected = search.get('selected') ?? undefined;
  const { isAuthenticated, userRole } = useAuth();
  const isAdmin = userRole === 'ADMIN';
  const canLoadAgents = isAuthenticated && (userRole === 'USER' || isAdmin);
  const [intent, setIntent] = useState('TRANSFER');
  const [confidence, setConfidence] = useState('0.85');
  const [message, setMessage] = useState('Test decision from the frontend');
  const [parametersText, setParametersText] = useState('{"amount": 1000}');
  const [isSensitive, setIsSensitive] = useState(false);
  const [formError, setFormError] = useState('');
  const [decisionResult, setDecisionResult] = useState<AgentDecisionResult | null>(null);

  const agentsQuery = useQuery({
    queryKey: ['my-agents'],
    queryFn: () => agentsApi.listMine(),
    enabled: canLoadAgents,
  });
  const agentQuery = useQuery({
    queryKey: ['agent', selected],
    enabled: canLoadAgents && Boolean(selected),
    queryFn: () => agentsApi.getById(selected as string),
  });
  const agent = agentQuery.data as BankingAgent | undefined;
  const activityQuery = useQuery({
    queryKey: ['agent-activity', agent?.sessionId],
    queryFn: () => agentsApi.getActivityBySession(agent!.sessionId),
    enabled: canLoadAgents && Boolean(agent?.sessionId),
    refetchInterval: 5000,
  });

  const refreshAgent = () => {
    void queryClient.invalidateQueries({ queryKey: ['my-agents'] });
    void queryClient.invalidateQueries({ queryKey: ['agent', selected] });
    if (agent?.sessionId) {
      void queryClient.invalidateQueries({ queryKey: ['agent-activity', agent.sessionId] });
    }
  };

  const determineDecisionMutation = useMutation({
    mutationFn: (payload: {
      agentId: string;
      intent?: string;
      confidence: number;
      message?: string;
      parameters?: Record<string, unknown>;
      isSensitive?: boolean;
    }) => agentsApi.determineDecision(payload),
    onSuccess: (result) => {
      setDecisionResult(result);
      refreshAgent();
    },
  });

  const agents = agentsQuery.data ?? [];
  const activity: AgentActivityTrace[] = activityQuery.data ?? [];

  if (!canLoadAgents) {
    return (
      <Box sx={{ display: 'grid', gap: 2 }}>
        <Typography variant='h5' sx={{ fontWeight: 800 }}>Banking agents</Typography>
        <Typography variant='body2' color='text.secondary'>
          Sign in as a customer or administrator to view session agents.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ maxWidth: 820 }}>
          <Typography variant='h4' sx={{ fontWeight: 800 }}>Banking agents</Typography>
          <Typography variant='body1' color='text.secondary' sx={{ mt: 1, lineHeight: 1.7 }}>
            An agent is linked to a chat session. It evaluates the request intent, confidence, and risk to decide
            whether to continue automatically, ask for more information, or send the request to a review workflow.
            This page explains and tests that routing; it does not perform a transfer.
          </Typography>
        </Box>
        <Button onClick={refreshAgent} disabled={agentsQuery.isFetching}>
          {agentsQuery.isFetching ? 'Refreshing…' : 'Refresh'}
        </Button>
      </Box>

      <Alert severity='info'>
        To start a banking conversation, use <strong>Sessions</strong> and open its chat. This page is for
        understanding or testing the agent attached to that session.
      </Alert>

      {agentsQuery.isError && <Alert severity='error'>Could not load agents. Please refresh and try again.</Alert>}
      {agentQuery.isError && <Alert severity='error'>Could not load the selected agent. It may no longer be available.</Alert>}
      {activityQuery.isError && <Alert severity='error'>Could not load the agent decision history.</Alert>}
      {formError && <Alert severity='error' onClose={() => setFormError('')}>{formError}</Alert>}
      {determineDecisionMutation.isError && (
        <Alert severity='error'>The decision test failed. Check the request values and try again.</Alert>
      )}

      <Box>
        <Typography variant='h6' sx={{ fontWeight: 750, mb: 1.5 }}>
          {isAdmin ? 'System agents' : 'Agents linked to your sessions'}
        </Typography>
        {agents.length === 0 && !agentsQuery.isLoading ? (
          <Card variant='outlined'>
            <CardContent sx={{ display: 'grid', gap: 1.5, justifyItems: 'start' }}>
              <SmartToy color='action' />
              <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>No session agents yet</Typography>
              <Typography variant='body2' color='text.secondary'>
                Create a session first. Its agent will appear here and keep the decision history for that chat.
              </Typography>
              {!isAdmin && <Button variant='contained' onClick={() => navigate('/sessions')}>Go to sessions</Button>}
            </CardContent>
          </Card>
        ) : (
          <Box sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' },
          }}>
            {agents.map((item) => {
              const currentDecision = item.decision ?? item.defaultPolicy ?? 'REQUEST_INFO';
              return (
                <Card key={item.id} variant='outlined' sx={{ minWidth: 0 }}>
                  <CardContent sx={{ display: 'grid', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant='subtitle1' sx={{ fontWeight: 750 }}>Chat session agent</Typography>
                        <Typography variant='body2' color='text.secondary' title={item.sessionId}>
                          Session {shortId(item.sessionId)}
                        </Typography>
                      </Box>
                      <Chip size='small' label={currentDecision.replaceAll('_', ' ')} color={decisionSeverity(currentDecision)} />
                    </Box>
                    <Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.6 }}>
                      {decisionDescriptions[currentDecision]}
                    </Typography>
                    {isAdmin && (
                      <Typography variant='caption' color='text.secondary' title={item.userId}>
                        Customer {shortId(item.userId)}
                      </Typography>
                    )}
                    <Button
                      variant={selected === item.id ? 'contained' : 'outlined'}
                      endIcon={<ArrowForward />}
                      onClick={() => navigate(`/agents?selected=${item.id}`)}
                      sx={{ justifySelf: 'start' }}
                    >
                      {selected === item.id ? 'Viewing agent' : 'View details'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Box>

      {selected && agentQuery.isLoading && <Typography color='text.secondary'>Loading agent…</Typography>}

      {agent && (
        <>
          <Card variant='outlined'>
            <CardContent sx={{ display: 'grid', gap: 2 }}>
              <Box>
                <Typography variant='h6' sx={{ fontWeight: 750 }}>How this agent decided</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                  Recent decisions from this session. Sensitive parameter values are not shown here.
                </Typography>
              </Box>
              {activity.length === 0 && !activityQuery.isLoading ? (
                <Typography variant='body2' color='text.secondary'>
                  No decision history has been recorded for this session yet. Start chatting from Sessions to generate activity.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {[...activity].reverse().slice(0, 10).map((entry, index) => (
                    <Box
                      key={`${entry.timestamp ?? 'unknown'}-${index}`}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) auto' },
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: 'action.hover',
                        minWidth: 0,
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
                          {entry.intent?.replaceAll('_', ' ') ?? entry.action ?? 'Agent activity'}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {formatTimestamp(entry.timestamp)}
                          {typeof entry.confidence === 'number' ? ` · Confidence ${Math.round(entry.confidence * 100)}%` : ''}
                          {entry.isSensitive ? ' · Sensitive request' : ''}
                        </Typography>
                        {entry.note && (
                          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5, overflowWrap: 'anywhere' }}>
                            {entry.note}
                          </Typography>
                        )}
                      </Box>
                      {entry.decision && (
                        <Chip size='small' label={entry.decision.replaceAll('_', ' ')} color={decisionSeverity(entry.decision)} />
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>

          <Accordion variant='outlined' disableGutters>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box>
                <Typography variant='subtitle1' sx={{ fontWeight: 750 }}>Advanced agent tools</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Edit stored context, policy, or run a controlled decision test.
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ display: 'grid', gap: 3 }}>
              <AgentConfiguration
                key={`${agent.id}-${agent.updatedAt}`}
                agent={agent}
                onSaved={refreshAgent}
              />

              <Card variant='outlined'>
                <CardContent sx={{ display: 'grid', gap: 2 }}>
                  <Box>
                    <Typography variant='subtitle1' sx={{ fontWeight: 750 }}>Test the decision rules</Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                      This sends sample data to the backend decision engine and records the result in this agent's history.
                      It does not execute a banking operation.
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
                    <TextField select label='Intent' value={intent} onChange={(event) => setIntent(event.target.value)}>
                      <MenuItem value='TRANSFER'>TRANSFER</MenuItem>
                      <MenuItem value='PAYMENT'>PAYMENT</MenuItem>
                      <MenuItem value='WITHDRAWAL'>WITHDRAWAL</MenuItem>
                      <MenuItem value='DEPOSIT'>DEPOSIT</MenuItem>
                      <MenuItem value='FRAUD'>FRAUD</MenuItem>
                      <MenuItem value='STOLEN_CARD'>STOLEN_CARD</MenuItem>
                      <MenuItem value='CLAIM'>CLAIM</MenuItem>
                      <MenuItem value='UPDATE_SENSITIVE_DATA'>UPDATE_SENSITIVE_DATA</MenuItem>
                    </TextField>
                    <TextField
                      label='Confidence'
                      type='number'
                      value={confidence}
                      onChange={(event) => setConfidence(event.target.value)}
                      slotProps={{ htmlInput: { min: 0, max: 1, step: 0.01 } }}
                      helperText='A value between 0 and 1'
                    />
                  </Box>
                  <TextField label='Sample message' value={message} onChange={(event) => setMessage(event.target.value)} fullWidth />
                  <TextField
                    label='Sample parameters (JSON)'
                    minRows={3}
                    multiline
                    value={parametersText}
                    onChange={(event) => setParametersText(event.target.value)}
                    fullWidth
                  />
                  <FormControlLabel
                    control={<Checkbox checked={isSensitive} onChange={(event) => setIsSensitive(event.target.checked)} />}
                    label='Mark this sample as sensitive'
                  />
                  <Button
                    variant='contained'
                    onClick={() => {
                      const parsedConfidence = Number(confidence);
                      if (!Number.isFinite(parsedConfidence) || parsedConfidence < 0 || parsedConfidence > 1) {
                        setFormError('Confidence must be a number between 0 and 1.');
                        return;
                      }
                      try {
                        const parsedParameters: unknown = parametersText ? JSON.parse(parametersText) : {};
                        if (!parsedParameters || Array.isArray(parsedParameters) || typeof parsedParameters !== 'object') {
                          setFormError('Sample parameters must be a JSON object.');
                          return;
                        }
                        setFormError('');
                        setDecisionResult(null);
                        void determineDecisionMutation.mutateAsync({
                          agentId: agent.id,
                          intent,
                          confidence: parsedConfidence,
                          message,
                          parameters: parsedParameters as Record<string, unknown>,
                          isSensitive,
                        });
                      } catch {
                        setFormError('Enter valid JSON for sample parameters before running the test.');
                      }
                    }}
                    disabled={determineDecisionMutation.isPending}
                    sx={{ justifySelf: 'start' }}
                  >
                    {determineDecisionMutation.isPending ? 'Testing decision…' : 'Run decision test'}
                  </Button>
                  {decisionResult && (
                    <Alert severity={decisionSeverity(decisionResult.decision)}>
                      <Typography variant='subtitle2' sx={{ fontWeight: 750 }}>
                        Result: {decisionResult.decision.replaceAll('_', ' ')}
                      </Typography>
                      <Typography variant='body2'>{decisionResult.reason}</Typography>
                      {typeof decisionResult.trace.threshold === 'number' && (
                        <Typography variant='caption' sx={{ mt: 0.5, display: 'block' }}>
                          Sensitive transaction threshold: {decisionResult.trace.threshold}
                        </Typography>
                      )}
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </AccordionDetails>
          </Accordion>
        </>
      )}
    </Box>
  );
}
