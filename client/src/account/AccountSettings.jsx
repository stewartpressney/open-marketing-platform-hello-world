import { useState } from 'react';
import { supabase } from '../supabase.js';
import BackLink from '../components/BackLink.jsx';

export default function AccountSettings({ user, onBack }) {
  const [email, setEmail] = useState(user.email);
  const [emailMessage, setEmailMessage] = useState(null);
  const [emailError, setEmailError] = useState(null);
  const [emailLoading, setEmailLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleEmailUpdate = async (e) => {
    e.preventDefault();
    setEmailError(null);
    setEmailMessage(null);
    setEmailLoading(true);

    const { error } = await supabase.auth.updateUser({ email });

    if (error) {
      setEmailError(error.message);
    } else {
      // Supabase sends a confirmation email to the new address before switching.
      setEmailMessage('Confirmation sent — check your new email address to complete the change.');
    }
    setEmailLoading(false);
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordLoading(true);

    // Re-authenticate with the current password before allowing the change.
    // Supabase's updateUser doesn't require the current password, so we verify
    // it ourselves via signInWithPassword first.
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (authError) {
      setPasswordError('Current password is incorrect.');
      setPasswordLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordMessage('Password updated.');
      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
    }
    setPasswordLoading(false);
  };

  return (
    <article>
      <header>
        <BackLink onBack={onBack} label="← Back to open requests" />
        <h2 style={{ marginTop: '1rem' }}>Account settings</h2>
      </header>

      <section style={{ marginTop: '1.5rem', maxWidth: 480 }}>
        <h3>Email address</h3>
        <form onSubmit={handleEmailUpdate}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          {emailError && <p role="alert">{emailError}</p>}
          {emailMessage && <p role="status">{emailMessage}</p>}
          <button type="submit" disabled={emailLoading || email === user.email}>
            {emailLoading ? 'Saving…' : 'Update email'}
          </button>
        </form>
      </section>

      <hr style={{ margin: '2rem 0' }} />

      <section style={{ maxWidth: 480 }}>
        <h3>Change password</h3>
        <form onSubmit={handlePasswordUpdate}>
          <label>
            Current password
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <label>
            New password
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={6}
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={6}
            />
          </label>
          {passwordError && <p role="alert">{passwordError}</p>}
          {passwordMessage && <p role="status">{passwordMessage}</p>}
          <button type="submit" disabled={passwordLoading}>
            {passwordLoading ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </section>
    </article>
  );
}
