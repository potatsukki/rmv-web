import { useEffect } from 'react';

export function useAuthPageScrollbar() {
  useEffect(() => {
    document.documentElement.classList.add('auth-page-scrollbar');
    document.body.classList.add('auth-page-scrollbar');

    return () => {
      document.documentElement.classList.remove('auth-page-scrollbar');
      document.body.classList.remove('auth-page-scrollbar');
    };
  }, []);
}