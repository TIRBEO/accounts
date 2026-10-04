'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

/* The setup QR — a real QR of the otpauth:// provisioning URI (issuer, account
   and secret) so any authenticator app lands on the same key the panel prints
   underneath. The white plate is deliberate: a QR needs light-on-dark to scan,
   and the app's own surface is dark. */
export function TotpQr({ value, size = 200 }: { value: string; size?: number }): React.ReactElement {
  return (
    <div className="mx-auto w-fit rounded-2xl bg-white p-4">
      <QRCodeSVG value={value} size={size} level="M" marginSize={0} />
    </div>
  );
}

TotpQr.displayName = 'TotpQr';
export default TotpQr;
