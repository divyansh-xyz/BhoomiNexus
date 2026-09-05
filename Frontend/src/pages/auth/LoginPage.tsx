import React from 'react';
import Component from '@/components/ui/login-1';

const DemoOne: React.FC = () => {
  return (
    <div className="login-page-root flex w-full min-h-screen justify-center items-center">
      <Component />
    </div>
  );
};

export const LoginPage: React.FC = DemoOne;
export { DemoOne };
export default LoginPage;

