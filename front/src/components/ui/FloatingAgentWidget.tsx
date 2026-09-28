import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Button,
  TextField,
  Chip,
  Stack,
  Tooltip,
  Fade,
} from '@mui/material';
import {
  Bot,
  Sparkles,
  X,
  Send,
  ShieldCheck,
  Cpu,
  Database,
  ArrowRight,
  MessageSquare,
  Zap,
} from 'lucide-react';

export default function FloatingAgentWidget() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [quickInput, setQuickInput] = useState('');

  const handleLaunchChat = (presetPrompt?: string) => {
    setIsOpen(false);
    if (presetPrompt) {
      navigate(`/chat?prompt=${encodeURIComponent(presetPrompt)}`);
    } else if (quickInput.trim()) {
      navigate(`/chat?prompt=${encodeURIComponent(quickInput.trim())}`);
      setQuickInput('');
    } else {
      navigate('/chat');
    }
  };

  return (
    <>
      {/* ── EXPANDED AGENT HUD DIALOG ── */}
      <Fade in={isOpen}>
        <Box
          sx={{
            position: 'fixed',
            bottom: { xs: 84, sm: 96 },
            right: { xs: 16, sm: 28 },
            zIndex: 1350,
            width: { xs: 'calc(100vw - 32px)', sm: 390 },
            maxWidth: 400,
          }}
        >
          <Card
            sx={{
              borderRadius: 5,
              overflow: 'hidden',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(18, 18, 22, 0.92)' : 'rgba(255, 255, 255, 0.94)',
              border: 1.5,
              borderColor: 'rgba(232, 97, 26, 0.3)',
              boxShadow: (theme) =>
                theme.palette.mode === 'dark'
                  ? '0 24px 60px -12px rgba(0, 0, 0, 0.8), 0 0 35px -5px rgba(232, 97, 26, 0.25)'
                  : '0 24px 60px -12px rgba(232, 97, 26, 0.2), 0 0 30px -5px rgba(99, 102, 241, 0.15)',
            }}
          >
            {/* Top Brand Banner */}
            <Box
              sx={{
                p: 2.5,
                pb: 2,
                background: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(232, 97, 26, 0.25) 0%, rgba(99, 102, 241, 0.2) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 247, 237, 0.95) 0%, rgba(238, 242, 255, 0.9) 100%)',
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Box
                    className='ai-halo-orbit'
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 3,
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      display: 'grid',
                      placeItems: 'center',
                      boxShadow: '0 4px 14px rgba(232, 97, 26, 0.4)',
                    }}
                  >
                    <Bot className='w-6 h-6' />
                  </Box>
                  <Box>
                    <Typography variant='subtitle1' sx={{ fontWeight: 900, lineHeight: 1.15 }}>
                      Assistant Client Bancaire
                    </Typography>
                    <Stack direction='row' spacing={0.75} sx={{ alignItems: 'center', mt: 0.5 }}>
                      <Box className='w-2 h-2 rounded-full bg-emerald-500 status-pulse-emerald' />
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>
                        IA Hybride en ligne · Qwen2.5:7b
                      </Typography>
                    </Stack>
                  </Box>
                </Stack>

                <IconButton size='small' onClick={() => setIsOpen(false)} sx={{ color: 'text.secondary' }}>
                  <X className='w-4 h-4' />
                </IconButton>
              </Box>

              {/* Neural Equalizer Bars */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mt: 1.5, pl: 0.5 }}>
                <Box className='ai-wave-bar' />
                <Box className='ai-wave-bar' />
                <Box className='ai-wave-bar' />
                <Box className='ai-wave-bar' />
                <Box className='ai-wave-bar' />
                <Typography sx={{ fontSize: 10, fontWeight: 700, ml: 1, color: 'text.secondary', letterSpacing: 0.5 }}>
                  AGENT NEURAL LISTENING
                </Typography>
              </Box>
            </Box>

            <CardContent sx={{ p: 2.5, display: 'grid', gap: 2 }}>
              {/* Architecture Telemetry Chips */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Chip
                  icon={<Cpu className='w-3 h-3 text-indigo-500' />}
                  label='LLM On-Premise'
                  size='small'
                  sx={{ fontSize: 10, fontWeight: 700, height: 22 }}
                />
                <Chip
                  icon={<Database className='w-3 h-3 text-emerald-500' />}
                  label='RAG Vectoriel'
                  size='small'
                  sx={{ fontSize: 10, fontWeight: 700, height: 22 }}
                />
                <Chip
                  icon={<ShieldCheck className='w-3 h-3 text-orange-500' />}
                  label='Sensitive Line (5 000 €)'
                  size='small'
                  sx={{ fontSize: 10, fontWeight: 700, height: 22 }}
                />
              </Box>

              {/* Direct Quick Prompts */}
              <Box>
                <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1 }}>
                  Actions Rapides Disponibles
                </Typography>
                <Stack spacing={1}>
                  <Box
                    onClick={() => handleLaunchChat('Je souhaite faire un virement instantané')}
                    sx={{
                      p: 1.25,
                      borderRadius: 3,
                      border: 1,
                      borderColor: 'divider',
                      bgcolor: 'action.hover',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s',
                      '&:hover': { bgcolor: 'action.selected', borderColor: 'primary.main', transform: 'translateX(3px)' },
                    }}
                  >
                    <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
                      <Zap className='w-4 h-4 text-emerald-500' />
                      <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
                        Virement sous Sensitive Line (≤ 5 000 €)
                      </Typography>
                    </Stack>
                    <ArrowRight className='w-3.5 h-3.5 text-primary-500' />
                  </Box>

                  <Box
                    onClick={() => handleLaunchChat('Quels sont mes plafonds de retrait et tarifs actuels ?')}
                    sx={{
                      p: 1.25,
                      borderRadius: 3,
                      border: 1,
                      borderColor: 'divider',
                      bgcolor: 'action.hover',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s',
                      '&:hover': { bgcolor: 'action.selected', borderColor: 'primary.main', transform: 'translateX(3px)' },
                    }}
                  >
                    <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
                      <Database className='w-4 h-4 text-indigo-500' />
                      <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
                        Consulter mes plafonds & FAQ (RAG)
                      </Typography>
                    </Stack>
                    <ArrowRight className='w-3.5 h-3.5 text-primary-500' />
                  </Box>

                  <Box
                    onClick={() => handleLaunchChat('Je conteste une opération débitée par erreur')}
                    sx={{
                      p: 1.25,
                      borderRadius: 3,
                      border: 1,
                      borderColor: 'divider',
                      bgcolor: 'action.hover',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s',
                      '&:hover': { bgcolor: 'action.selected', borderColor: 'primary.main', transform: 'translateX(3px)' },
                    }}
                  >
                    <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
                      <ShieldCheck className='w-4 h-4 text-orange-500' />
                      <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
                        Contester un débit (Workflow BPMN)
                      </Typography>
                    </Stack>
                    <ArrowRight className='w-3.5 h-3.5 text-primary-500' />
                  </Box>
                </Stack>
              </Box>

              {/* Direct Quick Input Field */}
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                <TextField
                  fullWidth
                  size='small'
                  placeholder='Posez une question à votre agent...'
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLaunchChat();
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                      fontSize: 12.5,
                    },
                  }}
                />
                <IconButton
                  color='primary'
                  onClick={() => handleLaunchChat()}
                  sx={{
                    bgcolor: 'primary.main',
                    color: '#ffffff',
                    borderRadius: 3,
                    '&:hover': { bgcolor: 'primary.dark' },
                  }}
                >
                  <Send className='w-4 h-4' />
                </IconButton>
              </Box>

              {/* Open Full Chat button */}
              <Button
                fullWidth
                variant='outlined'
                size='small'
                startIcon={<MessageSquare className='w-3.5 h-3.5' />}
                onClick={() => handleLaunchChat()}
                sx={{ borderRadius: 3, fontWeight: 700, textTransform: 'none', py: 0.8 }}
              >
                Ouvrir la session complète de chat
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Fade>

      {/* ── FLOATING AGENT TRIGGER BUTTON ── */}
      <Box
        sx={{
          position: 'fixed',
          bottom: { xs: 20, sm: 28 },
          right: { xs: 16, sm: 28 },
          zIndex: 1300,
        }}
      >
        <Tooltip title={isOpen ? 'Fermer l’assistant' : 'Assistant Client Bancaire IA (Qwen2.5:7b)'} placement='left' arrow>
          <Box
            onClick={() => setIsOpen(!isOpen)}
            className='ai-neural-glow'
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              cursor: 'pointer',
              bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(18,18,22,0.92)' : '#ffffff'),
              border: 1.5,
              borderColor: isOpen ? 'primary.main' : 'rgba(232,97,26,0.3)',
              borderRadius: 999,
              p: 0.8,
              pr: { xs: 1.8, sm: 2.2 },
              backdropFilter: 'blur(16px)',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              '&:hover': {
                transform: 'scale(1.04) translateY(-2px)',
                borderColor: 'primary.main',
              },
            }}
          >
            {/* Holographic Glowing Orb */}
            <Box
              className='ai-halo-orbit'
              sx={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: '#ffffff',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 4px 16px rgba(232, 97, 26, 0.45)',
              }}
            >
              {isOpen ? <X className='w-5 h-5' /> : <Bot className='w-5 h-5' />}
            </Box>

            {/* Label and Equalizer */}
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Stack direction='row' spacing={0.6} sx={{ alignItems: 'center' }}>
                <Typography sx={{ fontWeight: 800, fontSize: 13, color: 'text.primary', letterSpacing: '-0.01em' }}>
                  Banking Agent
                </Typography>
                <Sparkles className='w-3 h-3 text-orange-500' />
              </Stack>
              <Stack direction='row' spacing={0.75} sx={{ alignItems: 'center', mt: 0.2 }}>
                <Box className='w-1.5 h-1.5 rounded-full bg-emerald-500 status-pulse-emerald' />
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary' }}>
                  IA Active · Prêt
                </Typography>
              </Stack>
            </Box>
          </Box>
        </Tooltip>
      </Box>
    </>
  );
}
