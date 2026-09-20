import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Slider,
  Tooltip,
} from '@mui/material';
import {
  CreditCard,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  X,
  Wifi,
  Sparkles,
  Lock,
  Unlock,
  RotateCw,
  Copy,
  Check,
  KeyRound,
  Sliders,
} from 'lucide-react';
import { cardsApi } from '../api/cards';
import type { CreateCardRequest, Card as BankCard } from '../api/cards';
import { formatCurrency } from '../utils/formatters';
import { useTheme } from '../theme/ThemeContext';

const brandGradients: Record<string, string> = {
  VISA: 'linear-gradient(135deg, #0d0f14 0%, #1e2230 50%, #151821 100%)',
  MASTERCARD: 'linear-gradient(135deg, #18181b 0%, #27272a 50%, #3f3f46 100%)',
  ELO: 'linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)',
  AMEX: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%)',
};

const emptyForm: CreateCardRequest = {
  cardType: 'CREDIT',
  brand: 'VISA',
  holderName: '',
  lastFour: '',
  expiryMonth: 1,
  expiryYear: 2029,
  creditLimit: 5000,
};

export default function CardsPage() {
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState<BankCard | null>(null);
  const [form, setForm] = useState<CreateCardRequest>(emptyForm);

  // Interactive Card Features State
  const [frozenCards, setFrozenCards] = useState<Record<string, boolean>>({});
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [cardLimits, setCardLimits] = useState<Record<string, number>>({});
  const [pinDialogCard, setPinDialogCard] = useState<BankCard | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['cards'],
    queryFn: cardsApi.getMyCards,
  });

  const createMutation = useMutation({
    mutationFn: cardsApi.createCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      setShowForm(false);
      setForm(emptyForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateCardRequest }) => cardsApi.updateCard(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      setEditingCard(null);
      setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: cardsApi.deleteCard,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cards'] }),
  });

  const toggleFreeze = (cardId: string) => {
    setFrozenCards((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  const toggleFlip = (cardId: string) => {
    setFlippedCards((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  const handleLimitChange = (cardId: string, newLimit: number) => {
    setCardLimits((prev) => ({ ...prev, [cardId]: newLimit }));
  };

  const handleCopy = async (card: BankCard) => {
    await navigator.clipboard.writeText(`4829 0000 0000 ${card.lastFour}`);
    setCopiedId(card.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleEdit = (card: BankCard) => {
    setEditingCard(card);
    setForm({
      cardType: card.cardType,
      brand: card.brand,
      holderName: card.holderName,
      lastFour: card.lastFour,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      creditLimit: card.creditLimit || 5000,
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (editingCard) {
      updateMutation.mutate({ id: editingCard.id, data: form });
      return;
    }
    createMutation.mutate(form);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingCard(null);
    setForm(emptyForm);
  };

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      {/* ── HEADER BANNER ── */}
      <Card
        sx={{
          borderRadius: 5,
          position: 'relative',
          overflow: 'hidden',
          background: isDark
            ? 'linear-gradient(135deg, rgba(232,97,26,0.18) 0%, rgba(24,24,27,0.95) 100%)'
            : 'linear-gradient(135deg, rgba(255,247,237,0.95) 0%, rgba(255,255,255,0.98) 50%, rgba(238,242,255,0.7) 100%)',
          border: 1,
          borderColor: isDark ? 'rgba(232,97,26,0.25)' : 'rgba(232,97,26,0.15)',
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
                <Chip
                  icon={<Sparkles className='w-3.5 h-3.5 text-primary-500' />}
                  label='Card Studio'
                  size='small'
                  sx={{
                    fontWeight: 700,
                    bgcolor: isDark ? 'rgba(232,97,26,0.18)' : '#ffedd5',
                    color: 'primary.main',
                    fontSize: 11,
                  }}
                />
                <Typography variant='caption' color='text.secondary'>
                  Virtual & Physical Cards Management
                </Typography>
              </Stack>
              <Typography variant='h4' sx={{ fontWeight: 900, letterSpacing: '-0.02em' }}>
                Cards & Security Terminal
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 1, maxWidth: 650, lineHeight: 1.7 }}>
                Configure credit limits, flip to view security codes, freeze cards instantly, and manage online authorizations.
              </Typography>
            </Box>
            <Button
              variant='contained'
              startIcon={<Plus className='h-4 w-4' />}
              onClick={() => setShowForm(true)}
              sx={{ py: 1.25, px: 2.5 }}
            >
              Add New Card
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* ── CARDS LIST ── */}
      {isLoading ? (
        <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' } }}>
          {[1, 2].map((index) => (
            <Box key={index} sx={{ height: 260, borderRadius: 5, bgcolor: 'action.hover', animation: 'pulse 1.5s infinite' }} />
          ))}
        </Box>
      ) : cards.length === 0 ? (
        <Card sx={{ borderRadius: 4, py: 6, textAlign: 'center' }}>
          <CardContent>
            <CreditCard className='h-12 w-12 mx-auto text-primary-500 opacity-60 mb-2' />
            <Typography variant='h6' sx={{ fontWeight: 800 }}>
              No cards added yet
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5, mb: 3 }}>
              Add your first card to begin making transfers, contactless purchases, and virtual payments.
            </Typography>
            <Button variant='contained' startIcon={<Plus className='h-4 w-4' />} onClick={() => setShowForm(true)}>
              Add First Card
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' } }}>
          {cards.map((card) => {
            const isFrozen = Boolean(frozenCards[card.id]);
            const isFlipped = Boolean(flippedCards[card.id]);
            const currentLimit = cardLimits[card.id] ?? (card.creditLimit || 5000);

            return (
              <Card
                key={card.id}
                sx={{
                  borderRadius: 5,
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  overflow: 'hidden',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': {
                    boxShadow: '0 16px 36px -10px rgba(0,0,0,0.12)',
                  },
                }}
              >
                <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
                  {/* 3D Flippable Virtual Card Graphic */}
                  <Box
                    className='perspective-1000'
                    sx={{
                      width: '100%',
                      height: 220,
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                    onClick={() => toggleFlip(card.id)}
                  >
                    <Box
                      className={`transform-style-3d relative w-full h-full rounded-3xl transition-transform duration-700 shadow-xl ${
                        isFlipped ? 'rotate-y-180' : ''
                      }`}
                    >
                      {/* CARD FRONT */}
                      <Box
                        className={`backface-hidden absolute inset-0 rounded-3xl p-6 flex flex-col justify-between overflow-hidden border border-white/20 ${
                          isFrozen ? 'card-frozen' : ''
                        }`}
                        sx={{
                          background: brandGradients[card.brand] || brandGradients.VISA,
                          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.4)',
                        }}
                      >
                        {/* Iridescent layer */}
                        <Box className='holographic-sheen absolute inset-0 pointer-events-none opacity-35' />

                        {/* Frosted overlay if frozen */}
                        {isFrozen && (
                          <Box
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              zIndex: 12,
                              bgcolor: 'rgba(14, 165, 233, 0.45)',
                              backdropFilter: 'blur(8px)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                            }}
                          >
                            <Lock className='w-8 h-8 text-white mb-1' />
                            <Typography variant='caption' sx={{ fontWeight: 900, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                              CARD FROZEN • PAYMENTS DISABLED
                            </Typography>
                          </Box>
                        )}

                        {/* Top: Chip + Type */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 }}>
                          <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center' }}>
                            <Box
                              sx={{
                                width: 38,
                                height: 26,
                                borderRadius: 1.5,
                                bgcolor: 'rgba(255,255,255,0.9)',
                                border: '1px solid rgba(0,0,0,0.2)',
                                backgroundImage:
                                  'linear-gradient(135deg, #fbbf24 25%, #f59e0b 25%, #f59e0b 50%, #fbbf24 50%, #fbbf24 75%, #f59e0b 75%, #f59e0b 100%)',
                                backgroundSize: '8px 8px',
                              }}
                            />
                            <Wifi className='w-4 h-4 text-white/80 rotate-90' />
                            <Chip
                              label={card.cardType}
                              size='small'
                              sx={{
                                bgcolor: 'rgba(255,255,255,0.18)',
                                color: '#ffffff',
                                fontWeight: 800,
                                fontSize: 10,
                                backdropFilter: 'blur(8px)',
                              }}
                            />
                          </Stack>
                          <Typography variant='subtitle1' sx={{ fontWeight: 900, color: '#ffffff', letterSpacing: 1 }}>
                            {card.brand}
                          </Typography>
                        </Box>

                        {/* Number */}
                        <Typography
                          variant='h5'
                          sx={{
                            fontFamily: 'monospace',
                            letterSpacing: '0.22em',
                            fontWeight: 700,
                            color: '#ffffff',
                            textShadow: '0 2px 4px rgba(0,0,0,0.4)',
                            zIndex: 2,
                            my: 1,
                          }}
                        >
                          •••• •••• •••• {card.lastFour}
                        </Typography>

                        {/* Bottom Row */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 2 }}>
                          <Box>
                            <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, textTransform: 'uppercase' }}>
                              Cardholder
                            </Typography>
                            <Typography variant='body2' sx={{ fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              {card.holderName}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, textTransform: 'uppercase' }}>
                              Expires
                            </Typography>
                            <Typography variant='body2' sx={{ fontWeight: 800, color: '#ffffff', fontFamily: 'monospace' }}>
                              {String(card.expiryMonth).padStart(2, '0')}/{card.expiryYear}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      {/* CARD BACK */}
                      <Box
                        className='backface-hidden rotate-y-180 absolute inset-0 rounded-3xl p-6 flex flex-col justify-between overflow-hidden border border-white/20'
                        sx={{
                          background: 'linear-gradient(135deg, #11141c 0%, #1a1e29 50%, #0d0f14 100%)',
                          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.4)',
                        }}
                      >
                        <Box sx={{ mx: -6, mt: 1, height: 40, bgcolor: '#000000' }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 1 }}>
                          <Box sx={{ flex: 1, height: 32, bgcolor: 'rgba(255,255,255,0.85)', borderRadius: 1, px: 2, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, color: '#09090b', letterSpacing: 2 }}>
                              941
                            </Typography>
                          </Box>
                          <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>
                            CVV / CVC
                          </Typography>
                        </Box>
                        <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>
                          Click anywhere on card to flip back. Keep CVV private.
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Card Quick Interactive Action Buttons */}
                  <Stack direction='row' spacing={1} sx={{ mt: 2.5, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <Button
                      size='small'
                      variant='outlined'
                      onClick={() => toggleFreeze(card.id)}
                      startIcon={isFrozen ? <Unlock className='w-3.5 h-3.5 text-emerald-500' /> : <Lock className='w-3.5 h-3.5 text-sky-500' />}
                      sx={{ borderRadius: 2.5, fontWeight: 700, fontSize: 11.5, py: 0.6 }}
                    >
                      {isFrozen ? 'Unfreeze Card' : 'Freeze Card'}
                    </Button>
                    <Button
                      size='small'
                      variant='outlined'
                      onClick={() => toggleFlip(card.id)}
                      startIcon={<RotateCw className='w-3.5 h-3.5' />}
                      sx={{ borderRadius: 2.5, fontWeight: 700, fontSize: 11.5, py: 0.6 }}
                    >
                      {isFlipped ? 'Show Front' : 'View CVV'}
                    </Button>
                    <Button
                      size='small'
                      variant='outlined'
                      onClick={() => setPinDialogCard(card)}
                      startIcon={<KeyRound className='w-3.5 h-3.5 text-amber-500' />}
                      sx={{ borderRadius: 2.5, fontWeight: 700, fontSize: 11.5, py: 0.6 }}
                    >
                      View PIN
                    </Button>
                    <Tooltip title={copiedId === card.id ? 'Copied!' : 'Copy Card Number'}>
                      <IconButton
                        size='small'
                        onClick={() => handleCopy(card)}
                        sx={{ border: 1, borderColor: 'divider' }}
                      >
                        {copiedId === card.id ? <Check className='w-4 h-4 text-emerald-500' /> : <Copy className='w-4 h-4' />}
                      </IconButton>
                    </Tooltip>
                    <IconButton
                      size='small'
                      onClick={() => handleEdit(card)}
                      sx={{ border: 1, borderColor: 'divider' }}
                    >
                      <Pencil className='w-4 h-4' />
                    </IconButton>
                    <IconButton
                      size='small'
                      onClick={() => deleteMutation.mutate(card.id)}
                      disabled={deleteMutation.isPending}
                      sx={{ border: 1, borderColor: 'divider', color: 'error.main' }}
                    >
                      <Trash2 className='w-4 h-4' />
                    </IconButton>
                  </Stack>

                  {/* Interactive Spending Limit Slider */}
                  <Box sx={{ mt: 2.5, p: 2, borderRadius: 3, bgcolor: 'action.hover', border: 1, borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
                        <Sliders className='w-3.5 h-3.5 text-primary-500' />
                        <Typography variant='caption' sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
                          Monthly Spending Limit
                        </Typography>
                      </Stack>
                      <Typography variant='subtitle2' sx={{ fontWeight: 900, color: 'primary.main', fontFamily: 'monospace' }}>
                        {formatCurrency(currentLimit)}
                      </Typography>
                    </Box>
                    <Slider
                      value={currentLimit}
                      min={500}
                      max={20000}
                      step={250}
                      onChange={(_, val) => handleLimitChange(card.id, val as number)}
                      sx={{
                        color: 'primary.main',
                        '& .MuiSlider-thumb': {
                          width: 18,
                          height: 18,
                          '&:hover, &.Mui-focusVisible': {
                            boxShadow: '0 0 0 8px rgba(232, 97, 26, 0.16)',
                          },
                        },
                      }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                      <Typography variant='caption' color='text.secondary'>$500 min</Typography>
                      <Typography variant='caption' color='text.secondary'>$20,000 max</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* ── VIEW PIN SECURE MODAL ── */}
      <Dialog
        open={Boolean(pinDialogCard)}
        onClose={() => setPinDialogCard(null)}
        maxWidth='xs'
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              bgcolor: 'background.paper',
              p: 1,
            },
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center' }}>
            <KeyRound className='w-5 h-5 text-amber-500' />
            <Typography variant='h6' sx={{ fontWeight: 800 }}>
              Card PIN Reveal
            </Typography>
          </Stack>
          <IconButton size='small' onClick={() => setPinDialogCard(null)}>
            <X className='w-4 h-4' />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 3 }}>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
            Your 4-digit card security PIN for ATM and terminal payments:
          </Typography>
          <Box
            sx={{
              display: 'inline-flex',
              gap: 2,
              p: 2.5,
              borderRadius: 3,
              bgcolor: 'action.hover',
              border: 1,
              borderColor: 'divider',
            }}
          >
            {['4', '9', '1', '8'].map((digit, idx) => (
              <Box
                key={idx}
                sx={{
                  width: 44,
                  height: 52,
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 900,
                  fontSize: 24,
                  fontFamily: 'monospace',
                  border: 2,
                  borderColor: 'primary.main',
                  boxShadow: 1,
                }}
              >
                {digit}
              </Box>
            ))}
          </Box>
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 2 }}>
            Never share your PIN with anyone. FinBank representatives will never ask for it.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button fullWidth variant='contained' onClick={() => setPinDialogCard(null)}>
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── ADD / EDIT CARD DIALOG WITH LIVE PREVIEW ── */}
      <Dialog
        open={showForm || Boolean(editingCard)}
        onClose={handleClose}
        fullWidth
        maxWidth='sm'
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              bgcolor: 'background.paper',
            },
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, p: 3 }}>
          <Box>
            <Typography variant='h6' sx={{ fontWeight: 800 }}>
              {editingCard ? 'Edit Card Details' : 'Issue New Card'}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Instant virtual provisioning with encrypted tokenization.
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size='small'>
            <X className='h-4 w-4' />
          </IconButton>
        </DialogTitle>

        <Box component='form' onSubmit={handleSubmit}>
          <DialogContent sx={{ display: 'grid', gap: 2.5, p: 3, pt: 1 }}>
            {/* LIVE CARD PREVIEW */}
            <Box
              sx={{
                borderRadius: 4,
                p: 3,
                color: '#ffffff',
                background: brandGradients[form.brand] || brandGradients.VISA,
                boxShadow: '0 16px 32px -8px rgba(0,0,0,0.35)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Box className='holographic-sheen absolute inset-0 pointer-events-none opacity-40' />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Box sx={{ width: 34, height: 24, borderRadius: 1, bgcolor: '#f59e0b' }} />
                  <Wifi className='w-4 h-4 text-white/80 rotate-90' />
                </Stack>
                <Typography variant='subtitle1' sx={{ fontWeight: 900 }}>
                  {form.brand}
                </Typography>
              </Box>
              <Typography variant='h6' sx={{ fontFamily: 'monospace', letterSpacing: 3, my: 1.5 }}>
                •••• •••• •••• {form.lastFour || '••••'}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mt: 2 }}>
                <Box>
                  <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>CARDHOLDER</Typography>
                  <Typography variant='body2' sx={{ fontWeight: 800, textTransform: 'uppercase' }}>
                    {form.holderName || 'CLIENT NAME'}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>EXPIRES</Typography>
                  <Typography variant='body2' sx={{ fontWeight: 800, fontFamily: 'monospace' }}>
                    {String(form.expiryMonth).padStart(2, '0')}/{form.expiryYear}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* FORM FIELDS */}
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
              <TextField
                select
                label='Card Type'
                value={form.cardType}
                onChange={(event) => setForm({ ...form, cardType: event.target.value as CreateCardRequest['cardType'] })}
              >
                <MenuItem value='CREDIT'>Credit Card</MenuItem>
                <MenuItem value='DEBIT'>Debit Card</MenuItem>
              </TextField>

              <TextField
                select
                label='Card Brand'
                value={form.brand}
                onChange={(event) => setForm({ ...form, brand: event.target.value as CreateCardRequest['brand'] })}
              >
                <MenuItem value='VISA'>Visa</MenuItem>
                <MenuItem value='MASTERCARD'>Mastercard</MenuItem>
                <MenuItem value='ELO'>Elo</MenuItem>
                <MenuItem value='AMEX'>American Express</MenuItem>
              </TextField>
            </Box>

            <TextField
              label='Cardholder Name'
              value={form.holderName}
              onChange={(event) => setForm({ ...form, holderName: event.target.value })}
              placeholder='JOHN SMITH'
              required
            />

            <TextField
              label='Last 4 Digits'
              value={form.lastFour}
              onChange={(event) => setForm({ ...form, lastFour: event.target.value })}
              placeholder='4242'
              slotProps={{ htmlInput: { maxLength: 4 } }}
              required
            />

            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              <TextField
                type='number'
                label='Expiry Month'
                value={form.expiryMonth}
                onChange={(event) => setForm({ ...form, expiryMonth: Number(event.target.value) })}
                slotProps={{ htmlInput: { min: 1, max: 12 } }}
                required
              />
              <TextField
                type='number'
                label='Expiry Year'
                value={form.expiryYear}
                onChange={(event) => setForm({ ...form, expiryYear: Number(event.target.value) })}
                slotProps={{ htmlInput: { min: 2025, max: 2035 } }}
                required
              />
            </Box>

            <TextField
              type='number'
              label='Credit Limit ($)'
              value={form.creditLimit ?? ''}
              onChange={(event) => setForm({ ...form, creditLimit: Number(event.target.value) || undefined })}
              placeholder='5000'
            />
          </DialogContent>

          <DialogActions sx={{ p: 3, pt: 0 }}>
            <Button onClick={handleClose} color='inherit'>
              Cancel
            </Button>
            <Button
              type='submit'
              variant='contained'
              disabled={createMutation.isPending || updateMutation.isPending}
              startIcon={(createMutation.isPending || updateMutation.isPending) ? <Loader2 className='h-4 w-4 animate-spin' /> : undefined}
            >
              {editingCard ? 'Save Changes' : 'Issue Card'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
