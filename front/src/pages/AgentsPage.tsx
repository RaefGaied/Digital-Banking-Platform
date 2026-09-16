import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Card, CardContent, Checkbox, FormControlLabel, Stack, TextField, Typography, MenuItem, Alert } from '@mui/material';
import { agentsApi } from '../api/agents';
import type { AgentDecisionResult, BankingAgent } from '../types';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AgentsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const selected = search.get('selected') ?? undefined;
  const { isAuthenticated, userRole } = useAuth();
  const isAdmin = userRole === 'ADMIN';
  const canLoadAgents = isAuthenticated && (userRole === 'USER' || userRole === 'ADMIN');
  const [contextText, setContextText] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [decision, setDecision] = useState<string>('AUTO_EXECUTE');
  const [intent, setIntent] = useState('TRANSFER');
  const [confidence, setConfidence] = useState('0.85');
  const [message, setMessage] = useState('Test decision from the frontend');
  const [parametersText, setParametersText] = useState('{"amount": 1000}');
  const [isSensitive, setIsSensitive] = useState(false);
  const [decisionResult, setDecisionResult] = useState<AgentDecisionResult | null>(null);

  const agentsQuery = useQuery({ queryKey: ['my-agents'], queryFn: () => agentsApi.listMine(), enabled: canLoadAgents });
  const agentQuery = useQuery({ queryKey: ['agent', selected], enabled: canLoadAgents && Boolean(selected), queryFn: () => agentsApi.getById(selected as string) });

  

  const updateContextMutation = useMutation({ mutationFn: ({ id, context }: { id: string; context: Record<string, unknown> }) => agentsApi.updateContext(id, context), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['my-agents'] }); void queryClient.invalidateQueries({ queryKey: ['agent', selected] }); } });

  const updateDecisionMutation = useMutation({ mutationFn: ({ id, decision }: { id: string; decision: string }) => agentsApi.updateDecision(id, decision), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['my-agents'] }); void queryClient.invalidateQueries({ queryKey: ['agent', selected] }); } });

  const recordTxMutation = useMutation({ mutationFn: ({ id, tx }: { id: string; tx: string }) => agentsApi.recordLastTransaction(id, tx), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['my-agents'] }); void queryClient.invalidateQueries({ queryKey: ['agent', selected] }); } });

  const determineDecisionMutation = useMutation({
    mutationFn: (payload: { agentId: string; intent?: string; confidence: number; message?: string; parameters?: Record<string, unknown>; isSensitive?: boolean }) => agentsApi.determineDecision(payload),
    onSuccess: (result) => {
      setDecisionResult(result);
      void queryClient.invalidateQueries({ queryKey: ['my-agents'] });
      void queryClient.invalidateQueries({ queryKey: ['agent', selected] });
    },
  });

  const agents = agentsQuery.data ?? [];
  const agent: BankingAgent | undefined = agentQuery.data as BankingAgent | undefined;

  useEffect(() => {
    if (agent) {
      try {
        setContextText(agent.context ? JSON.stringify(agent.context, null, 2) : '');
      } catch (e) {
        setContextText(String(agent.context ?? ''));
      }
      setTransactionId(agent.lastTransactionId ?? '');
    } else {
      setContextText('');
      setTransactionId('');
    }
  }, [agent]);

  if (!canLoadAgents) {
    return (
      <Box sx={{ display: 'grid', gap: 2 }}>
        <Typography variant='h5' sx={{ fontWeight: 800 }}>Banking Agents</Typography>
        <Typography variant='body2' color='text.secondary'>Agent tools are available for authenticated users and admins.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant='h5' sx={{ fontWeight: 800 }}>Banking Agents</Typography>
          <Typography variant='body2' color='text.secondary'>
            {isAdmin
              ? 'Review all system agents and their BPMN policy decisions.'
              : 'Manage your session-linked banking agents and their policies.'}
          </Typography>
        </Box>
        <Button onClick={() => void queryClient.invalidateQueries({ queryKey: ['my-agents'] })}>Refresh</Button>
      </Box>

      <Card>
        <CardContent>
          <Typography variant='h6' sx={{ fontWeight: 700 }}>{isAdmin ? 'System agents' : 'Your agents'}</Typography>
          <Stack spacing={2} sx={{ mt: 2 }}>
            {agents.length === 0 && (
              <Typography variant='body2' color='text.secondary'>
                {isAdmin
                  ? 'No agents are currently linked in the system.'
                  : 'No agents yet. Create a session and link an agent from the Sessions page.'}
              </Typography>
            )}
            {agents.map((a) => (
              <Box key={a.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, borderRadius: 2, border: 1, borderColor: 'divider' }}>
                <Box>
                  <Typography variant='subtitle2' sx={{ fontWeight: 700, wordBreak: 'break-word' }}>{a.id}</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {isAdmin ? `User: ${a.userId} · ` : ''}Session: {a.sessionId} · Decision: {a.decision ?? a.defaultPolicy}
                  </Typography>
                </Box>
                <Stack direction='row' spacing={1}>
                  <Button size='small' variant='outlined' onClick={() => navigate(`/agents?selected=${a.id}`)}>Open</Button>
                </Stack>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      {agent && (
        <Card>
          <CardContent>
            <Typography variant='h6' sx={{ fontWeight: 700 }}>Agent details</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>ID: {agent.id}</Typography>
            <Typography variant='body2' color='text.secondary'>Session: {agent.sessionId}</Typography>
            <Typography variant='body2' color='text.secondary'>Last transaction: {agent.lastTransactionId ?? 'N/A'}</Typography>
            <Box sx={{ display: 'grid', gap: 2, mt: 2 }}>
              <TextField label='Context (JSON)' minRows={3} multiline value={contextText} onChange={(e) => setContextText(e.target.value)} />
              <Button onClick={() => {
                try {
                  const parsed = contextText ? JSON.parse(contextText) : {};
                  void updateContextMutation.mutateAsync({ id: agent.id, context: parsed });
                } catch (e) {
                  // ignore parse error for now
                }
              }} disabled={updateContextMutation.isPending}>Update context</Button>

              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField select value={decision} onChange={(e) => setDecision(e.target.value)} size='small' sx={{ minWidth: 220 }}>
                  <MenuItem value='AUTO_EXECUTE'>AUTO_EXECUTE</MenuItem>
                  <MenuItem value='TRIGGER_BPMN'>TRIGGER_BPMN</MenuItem>
                  <MenuItem value='REQUEST_INFO'>REQUEST_INFO</MenuItem>
                  <MenuItem value='BLOCK'>BLOCK</MenuItem>
                </TextField>
                <Button onClick={() => void updateDecisionMutation.mutateAsync({ id: agent.id, decision })} disabled={updateDecisionMutation.isPending}>Set decision</Button>
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField placeholder='transaction-id' value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
                <Button onClick={() => void recordTxMutation.mutateAsync({ id: agent.id, tx: transactionId })} disabled={recordTxMutation.isPending}>Record transaction</Button>
              </Box>

              <Card variant='outlined' sx={{ borderRadius: 3 }}>
                <CardContent sx={{ display: 'grid', gap: 2 }}>
                  <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>Run decision test</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Send a sample intent to the backend decision engine and see whether it returns AUTO_EXECUTE, REQUEST_INFO, or TRIGGER_BPMN.
                  </Typography>
                  <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
                    <TextField select label='Intent' value={intent} onChange={(e) => setIntent(e.target.value)}>
                      <MenuItem value='TRANSFER'>TRANSFER</MenuItem>
                      <MenuItem value='PAYMENT'>PAYMENT</MenuItem>
                      <MenuItem value='WITHDRAWAL'>WITHDRAWAL</MenuItem>
                      <MenuItem value='DEPOSIT'>DEPOSIT</MenuItem>
                      <MenuItem value='FRAUD'>FRAUD</MenuItem>
                      <MenuItem value='STOLEN_CARD'>STOLEN_CARD</MenuItem>
                      <MenuItem value='CLAIM'>CLAIM</MenuItem>
                      <MenuItem value='UPDATE_SENSITIVE_DATA'>UPDATE_SENSITIVE_DATA</MenuItem>
                    </TextField>
                    <TextField label='Confidence' type='number' value={confidence} onChange={(e) => setConfidence(e.target.value)} />
                  </Box>
                  <TextField label='Message' value={message} onChange={(e) => setMessage(e.target.value)} fullWidth />
                  <TextField label='Parameters (JSON)' minRows={3} multiline value={parametersText} onChange={(e) => setParametersText(e.target.value)} fullWidth />
                  <FormControlLabel control={<Checkbox checked={isSensitive} onChange={(e) => setIsSensitive(e.target.checked)} />} label='Mark as sensitive' />
                  <Button
                    variant='contained'
                    onClick={() => {
                      try {
                        const parsedParameters = parametersText ? JSON.parse(parametersText) : {};
                        void determineDecisionMutation.mutateAsync({
                          agentId: agent.id,
                          intent,
                          confidence: Number(confidence),
                          message,
                          parameters: parsedParameters,
                          isSensitive,
                        });
                      } catch {
                        // ignore parse error for now
                      }
                    }}
                    disabled={determineDecisionMutation.isPending}
                  >
                    {determineDecisionMutation.isPending ? 'Running...' : 'Run decision'}
                  </Button>
                  {decisionResult && (
                    <Alert severity='success'>
                      Decision: {decisionResult.decision} · {decisionResult.reason}
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

