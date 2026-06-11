import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Result, Button, Spin } from 'antd';
import { http } from '../api/http';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    http.get(`/auth/verify-email?token=${token}`)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  if (status === 'loading') return <Spin size="large" style={{ display: 'block', marginTop: 100 }} />;

  return (
    <Result
      status={status === 'success' ? 'success' : 'error'}
      title={status === 'success' ? 'E-mail verificado!' : 'Link inválido ou expirado'}
      subTitle={status === 'success' ? 'Sua conta foi ativada. Faça login para começar.' : 'Solicite um novo link de verificação.'}
      extra={
        <Button type="primary" onClick={() => navigate('/login')}>
          Ir para o Login
        </Button>
      }
    />
  );
}