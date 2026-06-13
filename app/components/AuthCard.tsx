'use client';
import { useState, useEffect } from 'react';
import { Eye, EyeOff, CheckCircle, XCircle, Loader, AlertTriangle, Key } from 'lucide-react';
import { getUser, getTokenScopes, hasOrgScope } from '@/app/lib/github';
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
  const [scopeWarning, setScopeWarning] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = getToken();
    const savedUser = getUsername();
    if (savedUser) setUsername(savedUser);
    if (savedToken) { setToken(savedToken); verifyToken(savedToken); }
  }, []);

  async function verifyToken(t = token) {
    if (!t.trim()) return;
    setStatus('checking');
    setErrorMsg('');
    setScopeWarning(null);
    try {
      const [user, scopes] = await Promise.all([getUser(t.trim()), getTokenScopes(t.trim())]);
      setUserInfo(user);
      setUsername(user.login);
      setStatus('ok');
      saveToken(t.trim());
      saveUsername(user.login);
      onAuth(t.trim(), user.login, user.avatar_url);
      if (!hasOrgScope(scopes)) {
        setScopeWarning(`Token thiếu quyền org. Cần thêm scope "read:org" để tạo repo trong Organization.`);
      }
    } catch (e) {
      setStatus('error');
      setErrorMsg((e as Error).message);
      setUserInfo(null);
    }
  }

  function handleUsernameChange(val: string) {
    setUsername(val);
    saveUsername(val);
    if (token && status === 'ok') onAuth(token, val, userInfo?.avatar_url || '');
  }

  const isOk = status === 'ok';

  return (
    <div className="card" style={{ borderColor: isOk ? 'rgba(63,185,80,0.3)' : undefined }}>
      <div className="card-header">
        <div style={{
          width: 28, height: 28,
          background: isOk ? 'var(--green-dim)' : 'var(--surface2)',
          border: `1px solid ${isOk ? 'rgba(63,185,80,0.4)' : 'var(--border)'}`,
          borderRadius: 7,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}>
          <Key size={13} color={isOk ? 'var(--green)' : 'var(--text2)'} />
        </div>
        <span className="card-title">Xác thực GitHub</span>
        {isOk && userInfo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 10px', background: 'var(--green-dim)', border: '1px solid rgba(63,185,80,0.3)', borderRadius: 100 }}>
            <img src={userInfo.avatar_url} alt="" style={{ width: 16, height: 16, borderRadius: '50%' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>@{userInfo.login}</span>
            <CheckCircle size={11} color="var(--green)" />
          </div>
        )}
      </div>

      <div className="grid-2" style={{ marginBottom: 12 }}>
        <div>
          <label>GitHub Username</label>
          <input type="text" value={username} onChange={e => handleUsernameChange(e.target.value)} placeholder="my-username" />
          <p style={{ color: 'var(--text3)', fontSize: 11, marginTop: 4 }}>Tự động điền khi xác thực token</p>
        </div>
        <div>
          <label>Personal Access Token</label>
          <div style={{ position: 'relative' }}>
            <input
              type={show ? 'text' : 'password'}
              value={token}
              onChange={e => { setToken(e.target.value); setStatus('idle'); setScopeWarning(null); }}
              placeholder="ghp_xxxxxxxxxxxx"
              style={{ paddingRight: 36 }}
              onKeyDown={e => e.key === 'Enter' && verifyToken()}
            />
            <button onClick={() => setShow(v => !v)} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 0, display: 'flex' }}>
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: (status !== 'idle' || scopeWarning) ? 12 : 0 }}>
        <button className="btn btn-primary" onClick={() => verifyToken()} disabled={!token.trim() || status === 'checking'} style={{ minWidth: 120 }}>
          {status === 'checking'
            ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Đang kiểm tra</>
            : status === 'ok' ? <><CheckCircle size={13} /> Đã xác thực</> : 'Xác thực'}
        </button>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>
          Cần quyền <code>repo</code> + <code>read:org</code> ·{' '}
          <a href="https://github.com/settings/tokens/new?scopes=repo,read:org&description=GH+Bulk+Creator" target="_blank" rel="noreferrer">Tạo token ↗</a>
        </span>
      </div>

      {status === 'error' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', background: 'var(--red-dim)', border: '1px solid rgba(248,81,73,0.25)', borderRadius: 8, fontSize: 12, color: 'var(--red)' }}>
          <XCircle size={13} style={{ flexShrink: 0 }} /> {errorMsg}
        </div>
      )}
      {scopeWarning && (
        <div style={{ padding: '9px 12px', background: 'var(--yellow-dim)', border: '1px solid rgba(210,153,34,0.25)', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--orange)' }}>
          <AlertTriangle size={13} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>{scopeWarning}{' '}<a href="https://github.com/settings/tokens/new?scopes=repo,read:org&description=GH+Bulk+Creator" target="_blank" rel="noreferrer">Tạo token mới ↗</a></span>
        </div>
      )}
    </div>
  );
}