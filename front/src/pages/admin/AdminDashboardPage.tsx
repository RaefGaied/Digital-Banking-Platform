import { useMemo, useState } from 'react';
import {
  Ticket,
  Users,
  Activity,
  MessageSquareQuote,
  Clock3,
  ShieldAlert,
  Bell,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Cpu,
  Sparkles,
  RefreshCw,
  Zap,
  SlidersHorizontal,
  Database,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
  Stack,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material';
import { adminApi } from '../../api/admin';
import { notificationsApi } from '../../api/notifications';

function notificationDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
}

type SimOperation = 'TRANSFER' | 'IBAN_CHANGE' | 'BALANCE_CHECK' | 'DISPUTE';
type SimulationResult = {
  decision: string;
  level: string;
  gate: string;
  flow: string;
  badgeColor: 'success' | 'warning' | 'error';
};

function StatCard({
  label,
  value,
  sublabel,
  Icon,
  gradient,
  accentColor,
  onClick,
}: {
  label: string;
  value: number | string;
  sublabel?: string;
  Icon: LucideIcon;
  gradient: string;
  accentColor: string;
  onClick?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      sx={{
        borderRadius: 4.5,
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        border: 1,
        borderColor: 'divider',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': onClick
          ? {
              transform: 'translateY(-3px)',
              boxShadow: '0 12px 28px -6px rgba(0,0,0,0.12)',
            }
          : undefined,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '50%',
          height: '100%',
          background: gradient,
          opacity: 0.12,
          filter: 'blur(28px)',
          pointerEvents: 'none',
        }}
      />
      <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
          <Box>
            <Typography variant='overline' sx={{ color: 'text.secondary', letterSpacing: 2, fontWeight: 700 }}>
              {label}
            </Typography>
            <Typography variant='h3' sx={{ mt: 0.75, fontWeight: 900, letterSpacing: '-0.02em' }}>
              {value}
            </Typography>
            {sublabel && (
              <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                {sublabel}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              borderRadius: 3.5,
              bgcolor: `${accentColor}18`,
              color: accentColor,
              p: 1.5,
              display: 'grid',
              placeItems: 'center',
              border: 1,
              borderColor: `${accentColor}30`,
            }}
          >
            <Icon className='h-5 w-5' />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: adminApi.getDashboard,
    refetchInterval: 30000,
  });

  const notificationsQuery = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: () => notificationsApi.getNotifications(0, 6),
    refetchInterval: 30000,
  });

  const unreadCountQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationsApi.getUnreadCount,
    refetchInterval: 30000,
  });

  // ── SENSITIVE LINE LIVE SIMULATOR STATE ──
  const [simOperation, setSimOperation] = useState<SimOperation>('TRANSFER');
  const [simAmount, setSimAmount] = useState<number>(3500);

  const simResult = useMemo<SimulationResult>(() => {
    if (simOperation === 'BALANCE_CHECK') {
      return {
        decision: 'AUTO_EXECUTE',
        level: 'LOW_RISK',
        gate: 'Consultation lecture seule',
        flow: 'Exécution instantanée via Spring AI + RAG',
        badgeColor: 'success',
      };
    }
    if (simOperation === 'IBAN_CHANGE') {
      return {
        decision: 'TRIGGER_BPMN',
        level: 'HIGH_RISK',
        gate: 'Modification données sensibles (IBAN)',
        flow: 'Workflow Flowable initié · Tâche assignée au Back-Office avec contrôle d’identité',
        badgeColor: 'warning',
      };
    }
    if (simOperation === 'DISPUTE') {
      return {
        decision: 'TRIGGER_BPMN',
        level: 'CRITICAL',
        gate: 'Contestation de transaction / Fraude',
        flow: 'Processus BPMN Litige initié · Gel préventif & validation agent humain requise',
        badgeColor: 'error',
      };
    }
    // TRANSFER
    if (simAmount <= 5000) {
      return {
        decision: 'AUTO_EXECUTE',
        level: 'NORMAL',
        gate: `Montant (${simAmount} €) ≤ Seuil Sensitive Line (5 000 €)`,
        flow: 'Virement automatisé sans intervention humaine · Reçu certifié généré',
        badgeColor: 'success',
      };
    } else {
      return {
        decision: 'TRIGGER_BPMN',
        level: 'ELEVATED_RISK',
        gate: `Montant (${simAmount} €) > Seuil Sensitive Line (5 000 €)`,
        flow: 'Escalade Flowable BPMN · Processus de double validation superviseur déclenché',
        badgeColor: 'warning',
      };
    }
  }, [simOperation, simAmount]);

  const ticketStats = data?.ticketStatistics;
  const ticketTotal = ticketStats?.totalTickets || 0;
  const openRate = ticketTotal ? Math.round(((ticketStats?.openTickets ?? 0) / ticketTotal) * 100) : 0;
  const resolvedRate = ticketTotal ? Math.round(((ticketStats?.resolvedTickets ?? 0) / ticketTotal) * 100) : 0;

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      {/* ── TOP HERO BANNER: AGENT SUPERVISION ARCHITECTURE ── */}
      <Card
        sx={{
          borderRadius: 5,
          overflow: 'hidden',
          position: 'relative',
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(232,97,26,0.2) 0%, rgba(30,27,75,0.35) 50%, rgba(18,18,21,0.98) 100%)'
              : 'linear-gradient(135deg, rgba(255,247,237,0.95) 0%, rgba(240,244,255,0.85) 50%, rgba(255,255,255,0.98) 100%)',
          border: 1,
          borderColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(232,97,26,0.3)' : 'rgba(232,97,26,0.18)'),
          boxShadow: (theme) =>
            theme.palette.mode === 'dark'
              ? '0 16px 40px -10px rgba(0,0,0,0.6)'
              : '0 16px 40px -10px rgba(232,97,26,0.08)',
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: { xs: '1fr', lg: '1.4fr 1fr' },
              alignItems: 'stretch',
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <Box>
                <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
                  <Chip
                    icon={<Sparkles className='h-3.5 w-3.5 text-primary-500' />}
                    label='CENTRE DE SUPERVISION IA HYBRIDE'
                    color='primary'
                    size='small'
                    sx={{ fontWeight: 800, fontSize: 11 }}
                  />
                  <Tooltip title='Rafraîchir les métriques'>
                    <IconButton size='small' onClick={() => refetch()} sx={{ p: 0.5 }}>
                      <RefreshCw className={`h-4 w-4 text-primary-500 ${isLoading ? 'animate-spin' : ''}`} />
                    </IconButton>
                  </Tooltip>
                </Stack>

                <Typography variant='h3' sx={{ fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.02em', maxWidth: 650 }}>
                  Supervision opérationnelle des flux d’assistance & Sensitive Line.
                </Typography>
                <Typography variant='body1' color='text.secondary' sx={{ mt: 2, maxWidth: 650, lineHeight: 1.8 }}>
                  Le système combine la détection d’intention <strong>Ollama Qwen2.5:7b</strong>, la recherche documentaire{' '}
                  <strong>pgvector (RAG)</strong> et la ligne de démarcation <strong>Flowable BPMN (Sensitive Line à 5 000 €)</strong>{' '}
                  pour garantir conformité bancaire et sécurité institutionnelle.
                </Typography>
              </Box>

              {/* Status Chips */}
              <Stack direction='row' spacing={1.5} sx={{ mt: 3, flexWrap: 'wrap', gap: 1 }}>
                <Chip
                  icon={<Cpu className='h-3.5 w-3.5 text-indigo-400' />}
                  label='LLM Qwen2.5:7b (Local)'
                  size='small'
                  variant='outlined'
                  sx={{ fontWeight: 700 }}
                />
                <Chip
                  icon={<Database className='h-3.5 w-3.5 text-emerald-500' />}
                  label='RAG pgvector 768d'
                  size='small'
                  variant='outlined'
                  sx={{ fontWeight: 700 }}
                />
                <Chip
                  icon={<ShieldCheck className='h-3.5 w-3.5 text-orange-500' />}
                  label='Sensitive Line (5 000 €)'
                  size='small'
                  variant='outlined'
                  sx={{ fontWeight: 700 }}
                />
              </Stack>
            </Box>

            {/* Performance Gauges */}
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Card
                variant='outlined'
                sx={{
                  borderRadius: 4,
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(24,24,27,0.7)' : 'rgba(255,255,255,0.85)'),
                  backdropFilter: 'blur(10px)',
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                    <Box>
                      <Typography variant='overline' color='text.secondary' sx={{ fontWeight: 700 }}>
                        Taux d'automatisation IA (Auto-Execute)
                      </Typography>
                      <Typography variant='h4' sx={{ fontWeight: 900, color: 'success.main' }}>
                        {100 - openRate}%
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        Opérations sous la Sensitive Line exécutées sans délai
                      </Typography>
                    </Box>
                    <Zap className='h-7 w-7 text-emerald-500' />
                  </Box>
                  <LinearProgress
                    variant='determinate'
                    value={Math.max(15, 100 - openRate)}
                    color='success'
                    sx={{ mt: 2, height: 10, borderRadius: 999 }}
                  />
                </CardContent>
              </Card>

              <Card
                variant='outlined'
                sx={{
                  borderRadius: 4,
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(24,24,27,0.7)' : 'rgba(255,255,255,0.85)'),
                  backdropFilter: 'blur(10px)',
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                    <Box>
                      <Typography variant='overline' color='text.secondary' sx={{ fontWeight: 700 }}>
                        Taux de résolution Flowable BPMN
                      </Typography>
                      <Typography variant='h4' sx={{ fontWeight: 900, color: 'primary.main' }}>
                        {resolvedRate}%
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        Tâches validées par le superviseur back-office
                      </Typography>
                    </Box>
                    <Clock3 className='h-7 w-7 text-primary-500' />
                  </Box>
                  <LinearProgress
                    variant='determinate'
                    value={Math.max(10, resolvedRate)}
                    sx={{ mt: 2, height: 10, borderRadius: 999 }}
                  />
                </CardContent>
              </Card>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* ── KPI METRICS CARDS ── */}
      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
        }}
      >
        <StatCard
          label='Tickets ouverts'
          value={ticketStats?.openTickets ?? 0}
          sublabel='En attente de traitement'
          Icon={Ticket}
          gradient='radial-gradient(circle, #e8611a 0%, transparent 70%)'
          accentColor='#e8611a'
          onClick={() => navigate('/admin/tasks')}
        />
        <StatCard
          label='Sessions IA Actives'
          value={data?.activeSessions ?? 0}
          sublabel='Dialogues temps réel Qwen2.5:7b'
          Icon={MessageSquareQuote}
          gradient='radial-gradient(circle, #6366f1 0%, transparent 70%)'
          accentColor='#6366f1'
        />
        <StatCard
          label='Tâches Flowable BPMN'
          value={data?.pendingTasks ?? 0}
          sublabel='Escalades Sensitive Line à valider'
          Icon={Activity}
          gradient='radial-gradient(circle, #f59e0b 0%, transparent 70%)'
          accentColor='#f59e0b'
          onClick={() => navigate('/admin/tasks')}
        />
        <StatCard
          label='Utilisateurs actifs'
          value={data?.activeUsers ?? 0}
          sublabel='Clients & Opérateurs connectés'
          Icon={Users}
          gradient='radial-gradient(circle, #10b981 0%, transparent 70%)'
          accentColor='#10b981'
          onClick={() => navigate('/admin/users')}
        />
      </Box>

      {/* ── INTERACTIVE SENSITIVE LINE LIVE SIMULATOR ── */}
      <Card
        sx={{
          borderRadius: 4.5,
          border: 1,
          borderColor: 'divider',
          overflow: 'hidden',
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(232,97,26,0.1) 0%, rgba(24,24,27,0.95) 100%)'
              : 'linear-gradient(135deg, rgba(255,247,237,0.7) 0%, rgba(255,255,255,0.98) 100%)',
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 3,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <SlidersHorizontal className='h-4 w-4' />
              </Box>
              <Box>
                <Typography variant='h6' sx={{ fontWeight: 800 }}>
                  Simulateur Interactif de la Sensitive Line
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  Testez en temps réel comment l'agent IA aiguille une requête selon les seuils réglementaires (5 000 €).
                </Typography>
              </Box>
            </Stack>
            <Chip
              label='REGLE DU SEUIL : 5 000.00 EUR'
              color='primary'
              variant='outlined'
              sx={{ fontWeight: 800, fontSize: 11 }}
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              alignItems: 'center',
            }}
          >
            {/* Input Controls */}
            <Stack spacing={2.5}>
              <TextField
                select
                fullWidth
                size='small'
                label="Type d'Opération Client"
                value={simOperation}
                onChange={(e) => setSimOperation(e.target.value as SimOperation)}
              >
                <MenuItem value='TRANSFER'>Virement Bancaire (Interbancaire SEPA)</MenuItem>
                <MenuItem value='BALANCE_CHECK'>Consultation de Solde & Plafonds RAG</MenuItem>
                <MenuItem value='IBAN_CHANGE'>Modification de Coordonnées Bancaires (IBAN)</MenuItem>
                <MenuItem value='DISPUTE'>Contestation de Débit / Signalement Fraude</MenuItem>
              </TextField>

              {simOperation === 'TRANSFER' && (
                <TextField
                  fullWidth
                  size='small'
                  type='number'
                  label='Montant du Virement (€)'
                  value={simAmount}
                  onChange={(e) => setSimAmount(Number(e.target.value))}
                  helperText='Modifiez le montant pour observer le basculement automatique au-dessus de 5 000 €'
                />
              )}

              <Stack direction='row' spacing={1}>
                <Button
                  size='small'
                  variant={simAmount === 1200 && simOperation === 'TRANSFER' ? 'contained' : 'outlined'}
                  onClick={() => {
                    setSimOperation('TRANSFER');
                    setSimAmount(1200);
                  }}
                  sx={{ borderRadius: 2 }}
                >
                  Ex: 1 200 € (Auto)
                </Button>
                <Button
                  size='small'
                  variant={simAmount === 8500 && simOperation === 'TRANSFER' ? 'contained' : 'outlined'}
                  onClick={() => {
                    setSimOperation('TRANSFER');
                    setSimAmount(8500);
                  }}
                  sx={{ borderRadius: 2 }}
                >
                  Ex: 8 500 € (Escalade)
                </Button>
                <Button
                  size='small'
                  variant={simOperation === 'DISPUTE' ? 'contained' : 'outlined'}
                  onClick={() => setSimOperation('DISPUTE')}
                  sx={{ borderRadius: 2 }}
                >
                  Ex: Litige Fraude
                </Button>
              </Stack>
            </Stack>

            {/* Live Result Card */}
            <Card
              variant='outlined'
              sx={{
                p: 3,
                borderRadius: 4,
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(18,18,21,0.85)' : '#ffffff'),
                border: 2,
                borderColor:
                  simResult.decision === 'AUTO_EXECUTE' ? 'success.main' : 'warning.main',
                boxShadow: 2,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant='overline' sx={{ fontWeight: 800, letterSpacing: 1.5, color: 'text.secondary' }}>
                  Aiguillage Sensitive Line
                </Typography>
                <Chip
                  icon={
                    simResult.decision === 'AUTO_EXECUTE' ? (
                      <CheckCircle2 className='w-4 h-4' />
                    ) : (
                      <ShieldAlert className='w-4 h-4' />
                    )
                  }
                  label={simResult.decision}
                  color={simResult.badgeColor}
                  sx={{ fontWeight: 900 }}
                />
              </Box>

              <Typography variant='h6' sx={{ fontWeight: 800, color: simResult.badgeColor === 'success' ? 'success.main' : 'warning.main' }}>
                {simResult.gate}
              </Typography>

              <Typography variant='body2' sx={{ mt: 1, color: 'text.secondary', lineHeight: 1.6 }}>
                <strong>Comportement Système :</strong> {simResult.flow}
              </Typography>

              <Divider sx={{ my: 1.5 }} />

              <Stack direction='row' spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant='caption' color='text.secondary'>
                  {simResult.decision === 'AUTO_EXECUTE'
                    ? '✓ Zéro latence humaine · Spring AI Execution'
                    : '🛡️ Tâche créée dans le Workflow Flowable BPMN'}
                </Typography>
                {simResult.decision === 'TRIGGER_BPMN' && (
                  <Button
                    size='small'
                    endIcon={<ArrowRight className='h-3.5 w-3.5' />}
                    onClick={() => navigate('/admin/tasks')}
                    sx={{ fontWeight: 700 }}
                  >
                    Voir File Tâches
                  </Button>
                )}
              </Stack>
            </Card>
          </Box>
        </CardContent>
      </Card>

      {/* ── NOTIFICATIONS & REAL-TIME ALERTS ── */}
      <Card sx={{ borderRadius: 4.5, border: 1, borderColor: 'divider' }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography variant='h6' sx={{ fontWeight: 800 }}>
                Notifications & Alertes de Supervision
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Tâches Flowable BPMN en attente, alertes de sécurité et demandes clients.
              </Typography>
            </Box>
            <Chip
              icon={<Bell size={15} />}
              label={`${unreadCountQuery.data ?? 0} non lues`}
              color={(unreadCountQuery.data ?? 0) > 0 ? 'warning' : 'default'}
              variant='outlined'
              sx={{ fontWeight: 700 }}
            />
          </Box>

          <Divider sx={{ mb: 1 }} />

          {notificationsQuery.isError ? (
            <Typography variant='body2' color='error.main'>
              Erreur lors du chargement des notifications.
            </Typography>
          ) : notificationsQuery.isLoading ? (
            <Typography variant='body2' color='text.secondary'>
              Chargement des alertes en cours…
            </Typography>
          ) : notificationsQuery.data?.content.length ? (
            <List disablePadding>
              {notificationsQuery.data.content.map((notification) => (
                <ListItem
                  key={notification.id}
                  disableGutters
                  sx={{
                    py: 1.5,
                    borderBottom: 1,
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 0 },
                  }}
                >
                  <ListItemAvatar>
                    <Box
                      sx={{
                        width: 42,
                        height: 42,
                        borderRadius: 3,
                        bgcolor: notification.type.includes('SECURITY_ALERT')
                          ? 'error.light'
                          : notification.type.includes('WORKFLOW_TASK')
                          ? 'warning.light'
                          : 'action.hover',
                        color: notification.type.includes('SECURITY_ALERT')
                          ? 'error.dark'
                          : notification.type.includes('WORKFLOW_TASK')
                          ? 'warning.dark'
                          : 'primary.main',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      {notification.type.includes('SECURITY_ALERT') ? (
                        <ShieldAlert size={20} />
                      ) : notification.type.includes('WORKFLOW_TASK') ? (
                        <Activity size={20} />
                      ) : (
                        <Ticket size={20} />
                      )}
                    </Box>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span style={{ fontWeight: notification.isRead ? 600 : 800 }}>{notification.title}</span>
                        {!notification.isRead && (
                          <Chip label='NOUVEAU' size='small' color='warning' sx={{ height: 18, fontSize: 10, fontWeight: 800 }} />
                        )}
                      </Box>
                    }
                    secondary={`${notification.body} · ${notificationDate(notification.createdAt)}`}
                  />
                  {notification.type.includes('WORKFLOW_TASK') && (
                    <Button
                      size='small'
                      variant='outlined'
                      endIcon={<ChevronRight className='h-3.5 w-3.5' />}
                      onClick={() => navigate('/admin/tasks')}
                      sx={{ borderRadius: 2, ml: 2, flexShrink: 0 }}
                    >
                      Traiter
                    </Button>
                  )}
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant='body2' color='text.secondary' sx={{ py: 3, textAlign: 'center' }}>
              Aucune notification en attente. Toutes les tâches et alertes sont résolues.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* ── RECENT TASKS & RECENT ACTIVITY ── */}
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
        {/* Recent Tasks */}
        <Card sx={{ borderRadius: 4.5, border: 1, borderColor: 'divider' }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant='h6' sx={{ fontWeight: 800 }}>
                  Tâches Flowable Récentes
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  Dernières tâches générées par l'agent ou les clients
                </Typography>
              </Box>
              <Button
                size='small'
                endIcon={<ExternalLink className='h-3.5 w-3.5' />}
                onClick={() => navigate('/admin/tasks')}
                sx={{ fontWeight: 700 }}
              >
                Tout voir
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <List disablePadding>
              {(data?.recentTasks || []).slice(0, 5).map((task) => (
                <ListItem
                  key={task.id}
                  disableGutters
                  sx={{
                    py: 1.2,
                    borderBottom: 1,
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 0 },
                  }}
                >
                  <ListItemAvatar>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 3,
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        display: 'grid',
                        placeItems: 'center',
                        fontWeight: 800,
                        fontSize: 12,
                      }}
                    >
                      #{task.id}
                    </Box>
                  </ListItemAvatar>
                  <ListItemText
                    primary={<span style={{ fontWeight: 700 }}>{task.taskType || 'TASK'}</span>}
                    secondary={task.client?.name || task.ticket?.subject || 'Client Direct'}
                  />
                  <Chip
                    label={task.status}
                    size='small'
                    color={task.status === 'COMPLETED' ? 'success' : task.status === 'PENDING' ? 'warning' : 'default'}
                    variant='outlined'
                    sx={{ fontWeight: 700 }}
                  />
                </ListItem>
              ))}
              {(!data?.recentTasks || data.recentTasks.length === 0) && (
                <Typography variant='body2' color='text.secondary' sx={{ py: 2, textAlign: 'center' }}>
                  Aucune tâche active.
                </Typography>
              )}
            </List>
          </CardContent>
        </Card>

        {/* Recent Audit Activity */}
        <Card sx={{ borderRadius: 4.5, border: 1, borderColor: 'divider' }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant='h6' sx={{ fontWeight: 800 }}>
                  Journal d’Audit Réglementaire
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  Traçabilité des opérations sensibles et accès
                </Typography>
              </Box>
              <Button
                size='small'
                endIcon={<ExternalLink className='h-3.5 w-3.5' />}
                onClick={() => navigate('/admin/audit')}
                sx={{ fontWeight: 700 }}
              >
                Tout voir
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <List disablePadding>
              {(data?.recentAuditLogs || []).slice(0, 5).map((log) => (
                <ListItem
                  key={log.id}
                  disableGutters
                  sx={{
                    py: 1.2,
                    borderBottom: 1,
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 0 },
                  }}
                >
                  <ListItemAvatar>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 3,
                        bgcolor: 'action.hover',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <Activity className='h-5 w-5 text-primary-500' />
                    </Box>
                  </ListItemAvatar>
                  <ListItemText
                    primary={<span style={{ fontWeight: 700 }}>{log.action}</span>}
                    secondary={`${log.userEmail || 'system'} · ${log.entity || 'N/A'}`}
                  />
                  <Chip
                    label={log.status}
                    size='small'
                    color={log.status === 'SUCCESS' ? 'success' : 'error'}
                    variant='outlined'
                    sx={{ fontWeight: 700 }}
                  />
                </ListItem>
              ))}
              {(!data?.recentAuditLogs || data.recentAuditLogs.length === 0) && (
                <Typography variant='body2' color='text.secondary' sx={{ py: 2, textAlign: 'center' }}>
                  Aucun log récent disponible.
                </Typography>
              )}
            </List>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
