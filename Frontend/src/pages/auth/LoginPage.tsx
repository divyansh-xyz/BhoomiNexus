import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { loginSchema, type LoginFormData } from '../../schemas/auth.schema';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'officer@gov.demo',
      password: 'password123',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    await login(data.email);
    navigate('/dashboard');
  };

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '1rem', border: '1px solid #ddd' }}>
      <h2>Officer Login (Boilerplate)</h2>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ marginBottom: '1rem' }}>
          <label>Email</label>
          <input type="email" style={{ width: '100%' }} {...register('email')} />
          {errors.email && <span style={{ color: 'red' }}>{errors.email.message}</span>}
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Password</label>
          <input type="password" style={{ width: '100%' }} {...register('password')} />
          {errors.password && <span style={{ color: 'red' }}>{errors.password.message}</span>}
        </div>

        <button type="submit">Sign In</button>
      </form>
    </div>
  );
};

export default LoginPage;
