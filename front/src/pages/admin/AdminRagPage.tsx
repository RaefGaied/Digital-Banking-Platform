import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Upload } from 'lucide-react';
import { adminApi } from '../../api/admin';
import { aiApi } from '../../api/ai';

const emptyForm = {
  title: '',
  content: '',
  source: '',
  active: true,
};

const demoSamples = [
  {
    label: 'Transfer request',
    title: 'Bank transfer request',
    source: 'demo-upload',
    text: `Customer: Emma Robinson\nEmail: emma.robinson@example.com\nPhone: +1 415 555 0148\nAddress: 240 Market Street, San Francisco, CA\nDocument type: Bank transfer\nAmount: 3500.00\nAccount number: FR1420041010050000005026\nProduct: Current account`,
  },
  {
    label: 'Blocked card',
    title: 'Card block incident',
    source: 'demo-upload',
    text: `Name: Lucas Martin\nEmail: lucas.martin@banking.example\nPhone: +33 6 12 34 56 78\nAddress: 14 Rue de la Paix, Paris\nDocument type: Card blocked\nProduct: Credit card\nIssue: Card is blocked after suspicious activity`,
  },
];

export default function AdminRagPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [extractionStatus, setExtractionStatus] = useState('');

  const documentsQuery = useQuery({
    queryKey: ['admin-rag-documents'],
    queryFn: () => adminApi.getRagDocuments(),
  });

  const createMutation = useMutation({
    mutationFn: (payload: typeof emptyForm) => adminApi.createRagDocument(payload),
    onSuccess: async () => {
      setForm(emptyForm);
      setEditingId(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-rag-documents'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: typeof emptyForm }) => adminApi.updateRagDocument(id, payload),
    onSuccess: async () => {
      setForm(emptyForm);
      setEditingId(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-rag-documents'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteRagDocument(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-rag-documents'] });
    },
  });

  const docs = documentsQuery.data ?? [] as any[];
  const totalActive = useMemo(() => docs.filter((doc: any) => doc.active).length, [docs]);

  const handleChange = (field: keyof typeof emptyForm, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const applyExtractedFields = async (sourceLabel: string, text?: string, file?: File) => {
    try {
      setExtractionStatus('Extracting document fields...');
      const response = await aiApi.extractDocument({ text, file });
      const fields = response?.fields ?? {};

      const nextTitle = fields.documentType ? `${fields.documentType} document` : form.title;
      const nextSource = fields.source || form.source || sourceLabel;
      const nextContent = [
        fields.fullName ? `Customer name: ${fields.fullName}` : '',
        fields.email ? `Email: ${fields.email}` : '',
        fields.phone ? `Phone: ${fields.phone}` : '',
        fields.address ? `Address: ${fields.address}` : '',
        fields.amount ? `Amount: ${fields.amount}` : '',
        fields.accountNumber ? `Account number: ${fields.accountNumber}` : '',
        fields.product ? `Product: ${fields.product}` : '',
      ].filter(Boolean).join('\n');

      setForm((current) => ({
        ...current,
        title: nextTitle || current.title || sourceLabel,
        source: nextSource || current.source || sourceLabel,
        content: nextContent || current.content,
      }));
      setExtractionStatus(`Auto-filled from ${sourceLabel}`);
    } catch (error: any) {
      const message = error?.response?.data?.message
        || error?.response?.data?.error
        || error?.message
        || 'Could not extract fields from the uploaded document.';
      setExtractionStatus(message);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await applyExtractedFields(file.name, undefined, file);
    event.target.value = '';
  };

  const handleDemoSample = async (sample: (typeof demoSamples)[number]) => {
    setForm((current) => ({
      ...current,
      title: sample.title,
      source: sample.source,
      content: '',
    }));
    await applyExtractedFields(sample.label, sample.text);
  };

  const handleSubmit = () => {
    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      source: form.source.trim(),
      active: form.active,
    };

    if (!payload.title || !payload.content) {
      return;
    }

    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, payload });
      return;
    }

    createMutation.mutate(payload);
  };

  const handleEdit = (document: any) => {
    setEditingId(document.id);
    setForm({
      title: document.title,
      content: document.content,
      source: document.source ?? '',
      active: document.active,
    });
  };

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box>
        <Typography variant='h5' sx={{ fontWeight: 800 }}>
          RAG knowledge base
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          Add, edit, and deactivate knowledge documents used by the assistant and the internal search layer.
        </Typography>
      </Box>

      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ display: 'grid', gap: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant='subtitle1' sx={{ fontWeight: 800 }}>
              {editingId !== null ? 'Edit document' : 'Add document'}
            </Typography>
            <Chip label={`${totalActive} active`} color='success' variant='outlined' />
          </Box>

          <TextField
            label='Document title'
            value={form.title}
            onChange={(event) => handleChange('title', event.target.value)}
            fullWidth
          />

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                component='label'
                variant='outlined'
                startIcon={<Upload size={16} />}
              >
                Upload & extract
                <input type='file' hidden onChange={handleFileUpload} />
              </Button>
              {demoSamples.map((sample) => (
                <Button
                  key={sample.label}
                  size='small'
                  variant='text'
                  onClick={() => handleDemoSample(sample)}
                >
                  {sample.label}
                </Button>
              ))}
            </Box>
            {extractionStatus && (
              <Typography variant='caption' color='text.secondary'>
                {extractionStatus}
              </Typography>
            )}
          </Box>

          <TextField
            label='Source / origin'
            value={form.source}
            onChange={(event) => handleChange('source', event.target.value)}
            fullWidth
          />

          <TextField
            label='Knowledge content'
            value={form.content}
            onChange={(event) => handleChange('content', event.target.value)}
            multiline
            minRows={3}
            maxRows={6}
            fullWidth
          />

          <FormControlLabel
            control={
              <Switch
                checked={form.active}
                onChange={(event) => handleChange('active', event.target.checked)}
              />
            }
            label='Active document'
          />

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant='contained'
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingId !== null ? 'Update' : 'Create'}
            </Button>

            {(editingId !== null || form.title || form.content || form.source) && (
              <Button
                variant='outlined'
                color='inherit'
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                Clear
              </Button>
            )}
          </Box>

          {(createMutation.isError || updateMutation.isError || deleteMutation.isError) && (
            <Alert severity='error'>The request could not be completed.</Alert>
          )}
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ p: 0, overflowX: 'auto' }}>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {docs.map((document: any) => (
                <TableRow key={document.id} hover>
                  <TableCell>
                    <Typography variant='body2' sx={{ fontWeight: 700 }}>{document.title}</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {document.content.slice(0, 120)}{document.content.length > 120 ? '…' : ''}
                    </Typography>
                  </TableCell>
                  <TableCell>{document.source ?? '—'}</TableCell>
                  <TableCell>
                    <Chip
                      label={document.active ? 'Active' : 'Inactive'}
                      color={document.active ? 'success' : 'default'}
                      size='small'
                      variant='outlined'
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button size='small' variant='outlined' onClick={() => handleEdit(document)}>
                        Edit
                      </Button>
                      <Button
                        size='small'
                        color='error'
                        variant='outlined'
                        onClick={() => deleteMutation.mutate(document.id)}
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
}
