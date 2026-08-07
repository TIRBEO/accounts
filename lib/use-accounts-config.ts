import { useState, useEffect } from "react";

interface AccountsConfig {
  captchaForceShow: boolean;
  ui?: {
    termsLink?: string;
    privacyLink?: string;
  };
}

export function useAccountsConfig(): AccountsConfig {
  const [config, setConfig] = useState<AccountsConfig>({ captchaForceShow: false });
  return config;
}
