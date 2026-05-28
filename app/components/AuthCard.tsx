'use client';
import { useState, useEffect } from 'react';
import { Eye, EyeOff, CheckCircle, XCircle, Loader } from 'lucide-react';
import { getUser } from '@/app/lib/github';
import { saveToken, getToken, saveUsername, getUsername } from '@/app/lib/storage';

interface Props {
  onAuth: (token: string, username: string, avatar: string) => void;
}

export default function AuthCard({ onAuth }: Props) {
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [userInfo, setUserInfo] = useState<{ login: string; avatar_url: string } | null>(null);

  useEffect(() => {
    const savedToken = getToken();
    const savedUser = getUsername();
    if (savedUser) setUsername(savedUser);
    if (savedToken) {
      setToken(savedToken);
      verifyToken(savedToken);
    }
  }, []);

  async function verifyToken(t = token) {
    if (!t.trim()) return;
    setStatus('checking');
    setErrorMsg('');
    try {
      const user = await getUser(t.trim());
      setUserInfo(user);
      setUsername(user.login);
      setStatus('ok');
      saveToken(t.trim());
      saveUsername(user.login);
      onAuth(t.trim(), user.login, user.avatar_url);
    } catch (e) {
      setStatus('error');
      setErrorMsg((e as Error).message);
      setUserInfo(null);
    }
  }

  function handleUsernameChange(val: string) {
    setUsername(val);
    saveUsername(val);
    // Notify parent with current token (even if not verified via API)
    if (token && status === 'ok') {
      onAuth(token, val, userInfo?.avatar_url || '');
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <svg height="20" width="20" viewBox="0 0 16 16" fill="var(--text)">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        <span style={{ fontWeight: 600, fontSize: 15 }}>Xác thực GitHub</span>
        {status === 'ok' && userInfo && (
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#2ea043' }}>
            <img src={userInfo.avatar_url} alt="" style={{ width: 20, height: 20, borderRadius: '50%' }} />
            @{userInfo.login}
            <CheckCircle size={14} />
          </span>
        )}
      </div>

      {/* Row 1: Username */}
      <div style={{ marginBottom: 10 }}>
        <label>GitHub Username</label>
        <input
          type="text"
          value={username}
          onChange={e => handleUsernameChange(e.target.value)}
          placeholder="IT-205-PYTHON"
        />
        <p style={{ color: 'var(--muted)', fontSize: 11, marginTop: 4 }}>
          VD: <code style={{ background: 'var(--surface2)', padding: '1px 4px', borderRadius: 3 }}>https://github.com/<strong style={{ color: '#79c0ff' }}>{username || 'IT-205-PYTHON'}</strong>/</code>
          &nbsp;— tự động điền khi xác thực token
        </p>
      </div>

      {/* Row 2: Token */}
      <div style={{ marginBottom: 8 }}>
        <label>Personal Access Token</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type={show ? 'text' : 'password'}
              value={token}
              onChange={e => { setToken(e.target.value); setStatus('idle'); }}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              style={{ paddingRight: 36 }}
              onKeyDown={e => e.key === 'Enter' && verifyToken()}
            />
            <button
              onClick={() => setShow(v => !v)}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0, display: 'flex' }}
            >
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <button className="btn-green" onClick={() => verifyToken()} disabled={!token.trim() || status === 'checking'} style={{ minWidth: 90 }}>
            {status === 'checking'
              ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
              : 'Xác thực'}
          </button>
        </div>
      </div>

      {status === 'error' && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6, color: 'var(--danger)', fontSize: 12 }}>
          <XCircle size={13} /> {errorMsg}
        </div>
      )}

      <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>
        Cần token với quyền <code style={{ background: 'var(--surface2)', padding: '1px 4px', borderRadius: 3 }}>repo</code>.{' '}
        <a href="https://github.com/settings/tokens/new?scopes=repo,admin:org&description=GH+Bulk+Creator" target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>
          Tạo token tại đây ↗
        </a>
      </p>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
