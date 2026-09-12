import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        name: string;
        designation: string;
        department?: string;
        state?: string;
        district?: string;
        scope?: 'NATIONAL' | 'STATE' | 'DISTRICT' | 'PROJECT';
      };
    }
  }
}
