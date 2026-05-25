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
} from '@mui/material';
import { CreditCard, Plus, Trash2, Pencil, Loader2, X } from 'lucide-react';
import { cardsApi } from '../api/cards';
import type { CreateCardRequest, Card as BankCard } from '../api/cards';
import { formatCurrency } from '../utils/formatters';

const brandColors: Record<string, string> = {
  VISA: 'linear-gradient(135deg, #e8611a, #ff9a4d)',
  MASTERCARD: 'linear-gradient(135deg, #111827, #374151)',
  ELO: 'linear-gradient(135deg, #ca8a04, #f59e0b)',
  AMEX: 'linear-gradient(135deg, #1d4ed8, #60a5fa)',
};

const emptyForm: CreateCardRequest = {
  cardType: 'CREDIT',
  brand: 'VISA',
  holderName: '',
  lastFour: '',
  expiryMonth: 1,
  expiryYear: 2028,
  creditLimit: undefined,
};

export default function CardsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState<BankCard | null>(null);
  const [form, setForm] = useState<CreateCardRequest>(emptyForm);

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

  const handleEdit = (card: BankCard) => {
    setEditingCard(card);
    setForm({
      cardType: card.cardType,
      brand: card.brand,
      holderName: card.holderName,
      lastFour: card.lastFour,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      creditLimit: card.creditLimit || undefined,
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

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Card
        sx={{
          borderRadius: 5,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(232,97,26,0.12), rgba(255,255,255,0.98))',
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant='overline' sx={{ color: 'primary.main', letterSpacing: 3, fontWeight: 700 }}>
                Wallet
              </Typography>
              <Typography variant='h4' sx={{ fontWeight: 900, mt: 1 }}>
                My Cards
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 1.25, maxWidth: 700, lineHeight: 1.8 }}>
                Manage your credit and debit cards from a cleaner, premium control surface.
              </Typography>
            </Box>
            <Button variant='contained' startIcon={<Plus className='h-4 w-4' />} onClick={() => setShowForm(true)}>
              Add Card
            </Button>
          </Box>
        </CardContent>
      </Card>

      {isLoading ? (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
          {[1, 2].map(index => <Box key={index} sx={{ height: 240, borderRadius: 4, bgcolor: 'action.hover' }} />)}
        </Box>
      ) : cards.length === 0 ? (
        <Card sx={{ borderRadius: 4 }}>
          <CardContent sx={{ py: 8, textAlign: 'center' }}>
            <CreditCard className='h-12 w-12 mx-auto text-primary-500' />
            <Typography variant='h6' sx={{ fontWeight: 800, mt: 2 }}>
              No cards yet
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
              Add your first card to get started.
            </Typography>
            <Button sx={{ mt: 3 }} variant='contained' startIcon={<Plus className='h-4 w-4' />} onClick={() => setShowForm(true)}>
              Add Card
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
          {cards.map(card => (
            <Card key={card.id} sx={{ borderRadius: 5, overflow: 'hidden', color: 'common.white', background: brandColors[card.brand] || brandColors.VISA }}>
              <CardContent sx={{ p: 3, position: 'relative' }}>
                <Box sx={{ position: 'absolute', top: -26, right: -18, width: 140, height: 140, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.12)' }} />
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
                  <Box>
                    <Chip label={`${card.cardType} Card`} size='small' sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: 'common.white', fontWeight: 700 }} />
                    <Typography variant='h6' sx={{ fontWeight: 800, mt: 1 }}>
                      {card.brand}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton onClick={() => handleEdit(card)} sx={{ color: 'common.white', bgcolor: 'rgba(255,255,255,0.12)' }}>
                      <Pencil className='h-4 w-4' />
                    </IconButton>
                    <IconButton onClick={() => deleteMutation.mutate(card.id)} sx={{ color: 'common.white', bgcolor: 'rgba(255,255,255,0.12)' }}>
                      {deleteMutation.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : <Trash2 className='h-4 w-4' />}
                    </IconButton>
                  </Box>
                </Box>

                <Typography variant='h5' sx={{ fontFamily: 'monospace', letterSpacing: 2, mt: 5 }}>
                  •••• •••• •••• {card.lastFour}
                </Typography>

                <Stack direction='row' spacing={2} sx={{ mt: 4, justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.7)' }}>Card holder</Typography>
                    <Typography variant='body2' sx={{ fontWeight: 700 }}>
                      {card.holderName}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.7)' }}>Expires</Typography>
                    <Typography variant='body2' sx={{ fontWeight: 700 }}>
                      {String(card.expiryMonth).padStart(2, '0')}/{card.expiryYear}
                    </Typography>
                  </Box>
                  {card.creditLimit && (
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.7)' }}>Limit</Typography>
                      <Typography variant='body2' sx={{ fontWeight: 700 }}>
                        {formatCurrency(card.creditLimit)}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Dialog open={showForm || Boolean(editingCard)} onClose={handleClose} fullWidth maxWidth='sm'>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          {editingCard ? 'Edit Card' : 'Add New Card'}
          <IconButton onClick={handleClose}><X className='h-4 w-4' /></IconButton>
        </DialogTitle>
        <Box component='form' onSubmit={handleSubmit}>
          <DialogContent sx={{ display: 'grid', gap: 2 }}>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
              <TextField
                select
                label='Card type'
                value={form.cardType}
                onChange={(event) => setForm({ ...form, cardType: event.target.value as CreateCardRequest['cardType'] })}
              >
                <MenuItem value='CREDIT'>Credit</MenuItem>
                <MenuItem value='DEBIT'>Debit</MenuItem>
              </TextField>
              <TextField
                select
                label='Brand'
                value={form.brand}
                onChange={(event) => setForm({ ...form, brand: event.target.value as CreateCardRequest['brand'] })}
              >
                <MenuItem value='VISA'>Visa</MenuItem>
                <MenuItem value='MASTERCARD'>Mastercard</MenuItem>
                <MenuItem value='ELO'>Elo</MenuItem>
                <MenuItem value='AMEX'>Amex</MenuItem>
              </TextField>
            </Box>

            <TextField
              label='Holder name'
              value={form.holderName}
              onChange={(event) => setForm({ ...form, holderName: event.target.value })}
              placeholder='JOHN SMITH'
              required
            />

            <TextField
              label='Last 4 digits'
              value={form.lastFour}
              onChange={(event) => setForm({ ...form, lastFour: event.target.value })}
              placeholder='1234'
                slotProps={{ htmlInput: { maxLength: 4 } }}
              required
            />

            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
              <TextField
                type='number'
                label='Expiry month'
                value={form.expiryMonth}
                onChange={(event) => setForm({ ...form, expiryMonth: parseInt(event.target.value, 10) })}
                slotProps={{ htmlInput: { min: 1, max: 12 } }}
                required
              />
              <TextField
                type='number'
                label='Expiry year'
                value={form.expiryYear}
                onChange={(event) => setForm({ ...form, expiryYear: parseInt(event.target.value, 10) })}
                slotProps={{ htmlInput: { min: 2024 } }}
                required
              />
            </Box>

            {form.cardType === 'CREDIT' && (
              <TextField
                type='number'
                label='Credit limit'
                value={form.creditLimit || ''}
                onChange={(event) => setForm({ ...form, creditLimit: parseFloat(event.target.value) })}
                placeholder='5000.00'
              />
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleClose} variant='outlined'>Cancel</Button>
            <Button type='submit' variant='contained' disabled={isPending} startIcon={isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : <Plus className='h-4 w-4' />}>
              {editingCard ? 'Save Changes' : 'Add Card'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
