declare module 'qrcode.react' {
  import type { ComponentType, CSSProperties } from 'react';

  export interface QRCodeProps {
    value: string;
    size?: number;
    level?: 'L' | 'M' | 'Q' | 'H';
    bgColor?: string;
    fgColor?: string;
    includeMargin?: boolean;
    style?: CSSProperties;
  }

  const QRCode: ComponentType<QRCodeProps>;
  export default QRCode;
  export { QRCode };
}
