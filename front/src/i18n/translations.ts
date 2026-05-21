export type Locale = 'en' | 'fr';

export const translations = {
  en: {
    greetings: {
      morning: 'Good morning,',
      afternoon: 'Good afternoon,',
      evening: 'Good evening,',
    },
    common: {
      user: 'User',
      settings: 'Settings',
      english: 'English',
      french: 'French',
      language: 'Language',
    },
    theme: {
      light: 'Light',
      dark: 'Dark',
      toggle: 'Theme',
    },
    sidebar: {
      home: 'Home',
      cards: 'Cards',
      transfer: 'Transfer',
      invest: 'Invest',
      analytics: 'Analytics',
      profile: 'Profile',
      helpSupport: 'Help & Support',
      viewProfile: 'View profile',
      logout: 'Logout',
      digitalBanking: 'Digital Banking',
    },
  },
  fr: {
    greetings: {
      morning: 'Bonjour,',
      afternoon: 'Bon apres-midi,',
      evening: 'Bonsoir,',
    },
    common: {
      user: 'Utilisateur',
      settings: 'Parametres',
      english: 'Anglais',
      french: 'Francais',
      language: 'Langue',
    },
    theme: {
      light: 'Clair',
      dark: 'Sombre',
      toggle: 'Theme',
    },
    sidebar: {
      home: 'Accueil',
      cards: 'Cartes',
      transfer: 'Virement',
      invest: 'Investir',
      analytics: 'Analytique',
      profile: 'Profil',
      helpSupport: 'Aide et support',
      viewProfile: 'Voir le profil',
      logout: 'Se deconnecter',
      digitalBanking: 'Banque numerique',
    },
  },
} as const;

export type TranslationKey =
  | 'greetings.morning'
  | 'greetings.afternoon'
  | 'greetings.evening'
  | 'common.user'
  | 'common.settings'
  | 'common.english'
  | 'common.french'
  | 'common.language'
  | 'theme.light'
  | 'theme.dark'
  | 'theme.toggle'
  | 'sidebar.home'
  | 'sidebar.cards'
  | 'sidebar.transfer'
  | 'sidebar.invest'
  | 'sidebar.analytics'
  | 'sidebar.profile'
  | 'sidebar.helpSupport'
  | 'sidebar.viewProfile'
  | 'sidebar.logout'
  | 'sidebar.digitalBanking';
