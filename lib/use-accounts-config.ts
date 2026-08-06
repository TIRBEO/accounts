import { useState, useEffect } from "react";

interface AccountsConfig {
  captchaForceShow: boolean;
}

export function useAccountsConfig(): AccountsConfig {
  const [config, setConfig] = useState<AccountsConfig>({ captchaForceShow: false });
  return config;
}
