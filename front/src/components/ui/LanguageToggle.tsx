import { useState } from 'react';
import { Button, Menu, MenuItem, Tooltip } from '@mui/material';
import { useI18n } from '../../i18n/I18nContext';

export default function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const open = Boolean(anchorEl);
  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleSelect = (next: 'en' | 'fr') => {
    setLocale(next);
    handleClose();
  };

  return (
    <>
      <Tooltip title={t('common.language')}>
        <Button
          onClick={handleOpen}
          variant='contained'
          color='primary'
          size='small'
          aria-haspopup='true'
          aria-expanded={open ? 'true' : undefined}
          aria-label={t('common.language')}
          sx={{ borderRadius: 999, textTransform: 'none', px: 1.5, fontWeight: 700 }}
        >
          {locale === 'en' ? t('common.english') : t('common.french')}
        </Button>
      </Tooltip>

      <Menu anchorEl={anchorEl} open={open} onClose={handleClose} keepMounted>
        <MenuItem selected={locale === 'en'} onClick={() => handleSelect('en')}>
          {t('common.english')}
        </MenuItem>
        <MenuItem selected={locale === 'fr'} onClick={() => handleSelect('fr')}>
          {t('common.french')}
        </MenuItem>
      </Menu>
    </>
  );
}
