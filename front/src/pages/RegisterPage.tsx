import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, ArrowRight, Loader2, ShieldCheck, User, Mail } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import ThemeToggle from '../components/ui/ThemeToggle';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, loading, error } = useAuth();
  const { locale } = useI18n();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const text = locale === 'fr'
    ? {
        openAccount: 'Ouvrir un compte',
        heroTitle1: 'Commencez votre',
        heroTitle2: 'parcours financier.',
        heroDesc: 'Creez votre compte en quelques minutes et gardez le controle total de votre argent, partout.',
        zeroFees: 'Zero frais',
        encryption: 'Chiffrement',
        support: 'Support',
        satisfaction: 'Satisfaction',
        newAccount: 'Nouveau compte',
        createAccount: 'Creer un compte',
        joinUsers: "Rejoignez des milliers d'utilisateurs aujourd'hui",
        fullName: 'Nom complet',
        emailAddress: 'Adresse e-mail',
        password: 'Mot de passe',
        createAccountBtn: 'Creer le compte',
        securityNote: 'Vos donnees sont protegees par un chiffrement 256 bits. Nous ne partageons jamais vos informations.',
        alreadyHaveAccount: 'Vous avez deja un compte ?',
        signIn: 'Se connecter',
        minChars: 'Min. 6 caracteres',
      }
    : {
        openAccount: 'Open an account',
        heroTitle1: 'Start your',
        heroTitle2: 'financial journey.',
        heroDesc: 'Create your account in minutes and take full control of your money, anywhere.',
        zeroFees: 'Zero fees',
        encryption: 'Encryption',
        support: 'Support',
        satisfaction: 'Satisfaction',
        newAccount: 'New account',
        createAccount: 'Create account',
        joinUsers: 'Join thousands of users today',
        fullName: 'Full name',
        emailAddress: 'Email address',
        password: 'Password',
        createAccountBtn: 'Create Account',
        securityNote: 'Your data is protected with 256-bit encryption. We never share your information.',
        alreadyHaveAccount: 'Already have an account?',
        signIn: 'Sign in',
        minChars: 'Min. 6 characters',
      };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await register(form);
    if (success) navigate('/dashboard');
  };

  return (
    <div className='min-h-screen flex' style={{ fontFamily: "'DM Sans', sans-serif", background: 'rgb(var(--auth-bg))' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        .fb-input {
          width: 100%;
          height: 50px;
          background: rgb(var(--auth-input-bg));
          border: 1px solid rgb(var(--auth-input-border));
          border-radius: 12px;
          padding: 0 44px 0 16px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: rgb(var(--auth-input-text));
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          font-weight: 300;
        }
        .fb-input::placeholder { color: rgb(var(--auth-muted)); }
        .fb-input:focus { border-color: #e8611a; box-shadow: 0 0 0 3px rgba(232,97,26,0.08); }

        .fb-btn {
          width: 100%;
          height: 52px;
          background: #e8611a;
          color: #fff;
          border: none;
          border-radius: 12px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.06em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: background 0.2s, transform 0.15s, opacity 0.2s;
        }
        .fb-btn:hover:not(:disabled) { background: #d45515; transform: translateY(-1px); }
        .fb-btn:active:not(:disabled) { transform: translateY(0); }
        .fb-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .geo-circle {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(232,97,26,0.15);
          pointer-events: none;
        }
        .dot-grid {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 200px;
          background-image: radial-gradient(rgba(232,97,26,0.2) 1px, transparent 1px);
          background-size: 22px 22px;
          -webkit-mask-image: linear-gradient(to top, rgba(0,0,0,0.5), transparent);
          mask-image: linear-gradient(to top, rgba(0,0,0,0.5), transparent);
          pointer-events: none;
        }
        .stat-card {
          background: rgb(var(--auth-panel) / 0.08);
          border: 0.5px solid rgb(var(--auth-panel-border) / 0.35);
          border-radius: 14px;
          padding: 16px 18px;
          transition: border-color 0.2s;
        }
        .stat-card:hover { border-color: rgba(232,97,26,0.3); }
      `}</style>

      {/* ── LEFT PANEL ── */}
      <div className='hidden lg:flex lg:w-[52%] flex-col justify-between p-10 relative overflow-hidden'
        style={{ background: 'rgb(var(--auth-left-bg))' }}>

        <div className='geo-circle' style={{ width: 420, height: 420, top: -110, left: -130 }} />
        <div className='geo-circle' style={{ width: 270, height: 270, top: 30, left: 20, borderColor: 'rgba(232,97,26,0.08)' }} />
        <div className='geo-circle' style={{ width: 180, height: 180, bottom: 60, right: -40, borderColor: 'rgba(232,97,26,0.12)' }} />
        <div className='geo-circle' style={{ width: 80, height: 80, bottom: 140, right: 40, borderColor: 'rgba(232,97,26,0.22)' }} />
        <div className='dot-grid' />

        {/* Logo */}
        <div className='flex items-center gap-3 relative z-10'>
          <div className='w-9 h-9 rounded-xl flex items-center justify-center' style={{ background: '#e8611a' }}>
            <span className='text-white font-bold text-base'>$</span>
          </div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: 'rgb(var(--auth-text))', letterSpacing: '0.01em' }}>
            FinBank
          </span>
        </div>

        {/* Tagline */}
        <div className='relative z-10'>
          <div className='flex items-center gap-2 mb-4' style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#e8611a' }}>
            <span style={{ display: 'block', width: 28, height: 1, background: '#e8611a', flexShrink: 0 }} />
            {text.openAccount}
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 44, lineHeight: 1.1, color: 'rgb(var(--auth-text))', fontWeight: 400, marginBottom: 16 }}>
            {text.heroTitle1}<br />
            <em style={{ fontStyle: 'italic', color: '#e8611a' }}>{text.heroTitle2}</em>
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(var(--auth-text),0.6)', fontWeight: 300, lineHeight: 1.65, maxWidth: 300 }}>
            {text.heroDesc}
          </p>
        </div>

        {/* Stats */}
        <div className='grid grid-cols-2 gap-3 relative z-10'>
          {[
            { label: text.zeroFees, value: '100%' },
            { label: text.encryption, value: '256-bit' },
            { label: text.support, value: '24/7' },
            { label: text.satisfaction, value: '4.9★' },
          ].map(stat => (
            <div key={stat.label} className='stat-card'>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, color: 'rgb(var(--auth-text))', fontWeight: 600, letterSpacing: '-0.01em' }}>
                {stat.value}
              </p>
              <p style={{ fontSize: 11, color: 'rgba(var(--auth-text),0.45)', marginTop: 2, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Vertical divider */}
      <div className='hidden lg:block w-px flex-shrink-0'
        style={{ background: 'linear-gradient(to bottom, transparent, rgba(232,97,26,0.25) 30%, rgba(232,97,26,0.25) 70%, transparent)' }} />

      {/* ── RIGHT PANEL ── */}
      <div className='flex-1 flex items-center justify-center p-8' style={{ background: 'rgb(var(--auth-right-bg))' }}>
        <div className='w-full max-w-sm relative'>
          <div className='absolute -top-2 right-0'>
            <ThemeToggle />
          </div>

          {/* Mobile logo */}
          <div className='lg:hidden flex items-center gap-3 mb-10'>
            <div className='w-9 h-9 rounded-xl flex items-center justify-center' style={{ background: '#e8611a' }}>
              <span className='text-white font-bold text-base'>$</span>
            </div>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: 'rgb(var(--auth-text))' }}>FinBank</span>
          </div>

          {/* Header */}
          <div className='flex items-center gap-2 mb-3' style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#e8611a' }}>
            <span style={{ display: 'block', width: 20, height: 1, background: '#e8611a', flexShrink: 0 }} />
            {text.newAccount}
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 34, color: 'rgb(var(--auth-text))', fontWeight: 400, lineHeight: 1.1, marginBottom: 6 }}>
            {text.createAccount}
          </h2>
          <p style={{ fontSize: 13, color: 'rgb(var(--auth-muted))', marginBottom: 28, fontWeight: 300 }}>
            {text.joinUsers}
          </p>

          {/* Error */}
          {error && (
            <div className='rounded-xl p-3 mb-5' style={{ background: 'rgba(220,38,38,0.08)', border: '0.5px solid rgba(220,38,38,0.25)' }}>
              <p style={{ color: '#b91c1c', fontSize: 13 }}>{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>

            {/* Name */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7a5c3e', marginBottom: 7, fontWeight: 500 }}>
                {text.fullName}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  name='name' type='text' value={form.name} onChange={handleChange}
                  className='fb-input' placeholder='John Smith' required
                />
                <User style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'rgba(var(--auth-muted),0.7)', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7a5c3e', marginBottom: 7, fontWeight: 500 }}>
                {text.emailAddress}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  name='email' type='email' value={form.email} onChange={handleChange}
                  className='fb-input' placeholder='you@email.com' required
                />
                <Mail style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'rgba(var(--auth-muted),0.7)', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* CPF removed per cahier des charges; collect account identifiers at account creation */}

            {/* Password */}
            <div style={{ marginBottom: 26 }}>
              <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7a5c3e', marginBottom: 7, fontWeight: 500 }}>
                {text.password}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  name='password' type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange}
                  className='fb-input' placeholder={text.minChars} minLength={6} required
                />
                <button type='button' onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(var(--auth-muted),0.7)', display: 'flex' }}>
                  {showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type='submit' disabled={loading} className='fb-btn'>
              {loading
                ? <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
                : <><span>{text.createAccountBtn}</span><ArrowRight style={{ width: 16, height: 16 }} /></>
              }
            </button>
          </form>

          {/* Security note */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(232,97,26,0.06)', border: '0.5px solid rgba(232,97,26,0.15)', borderRadius: 10, padding: '10px 14px', marginTop: 20 }}>
            <ShieldCheck style={{ width: 15, height: 15, color: '#e8611a', flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 11, color: '#9c7a5a', lineHeight: 1.5 }}>
              {text.securityNote}
            </span>
          </div>

          {/* Login link */}
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#9c7a5a' }}>
            {text.alreadyHaveAccount}{' '}
            <Link to='/login' style={{ color: '#e8611a', textDecoration: 'none', fontWeight: 500 }}>
              {text.signIn}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}