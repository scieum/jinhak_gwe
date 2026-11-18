import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

// button-primary: 한 화면에 하나만
export function ButtonPrimary({ className, type = 'button', ...rest }: Props) {
  return <button type={type} className={['button-primary', className].filter(Boolean).join(' ')} {...rest} />;
}

export function ButtonOutline({ className, type = 'button', ...rest }: Props) {
  return <button type={type} className={['button-outline', className].filter(Boolean).join(' ')} {...rest} />;
}
