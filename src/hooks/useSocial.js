import { useContext } from 'react';
import { SocialContext } from '../contexts/SocialContext.jsx';

export function useSocial() {
  const context = useContext(SocialContext);
  if (!context) {
    throw new Error('useSocial must be used within a SocialProvider');
  }
  return context;
}
export default useSocial;
