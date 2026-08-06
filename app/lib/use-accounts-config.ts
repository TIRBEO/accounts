"use client";

import { useEffect, useState } from "react";
import { API } from "./api";

export interface AccountsConfig {
  oauth: {
    google: { enabled: boolean };
    github: { enabled: boolean };
    discord: { enabled: boolean };
  };
  captcha: { forceShow: boolean };
  captchaForceShow: boolean;
  ui: {
    welcomeTitle: string;
    welcomeSubtitle: string;
    privacyLink: string;
    termsLink: string;
    helpLink: string;
  };
}

export const DEFAULT_ACCOUNTS_CONFIG: AccountsConfig = {
  oauth: {
    google: { enabled: true },
    github: { enabled: true },
    discord: { enabled: true },
  },
  captcha: { forceShow: false },
  captchaForceShow: false,
  ui: {
    welcomeTitle: "Welcome back",
    welcomeSubtitle: "Sign in to continue to TIRBEO.",
    privacyLink: "https://docs.tirbeo.app/privacy",
    termsLink: "https://docs.tirbeo.app/terms",
    helpLink: "https://docs.tirbeo.app/help",
  },
};

export function useAccountsConfig() {
  const [config, setConfig] = useState<AccountsConfig>(DEFAULT_ACCOUNTS_CONFIG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`${API}/api/public/app-config?app=accounts`)
      .then((r) => r.json())
      .then((data) => {
        if (!active || !data?.config) return;
        const c = data.config as Partial<AccountsConfig>;
        setConfig({
          oauth: {
            google: { enabled: c.oauth?.google?.enabled ?? DEFAULT_ACCOUNTS_CONFIG.oauth.google.enabled },
            github: { enabled: c.oauth?.github?.enabled ?? DEFAULT_ACCOUNTS_CONFIG.oauth.github.enabled },
            discord: { enabled: c.oauth?.discord?.enabled ?? DEFAULT_ACCOUNTS_CONFIG.oauth.discord.enabled },
          },
          captcha: { forceShow: c.captcha?.forceShow ?? DEFAULT_ACCOUNTS_CONFIG.captcha.forceShow },
          captchaForceShow: c.captchaForceShow ?? c.captcha?.forceShow ?? DEFAULT_ACCOUNTS_CONFIG.captchaForceShow,
          ui: {
            welcomeTitle: c.ui?.welcomeTitle ?? DEFAULT_ACCOUNTS_CONFIG.ui.welcomeTitle,
            welcomeSubtitle: c.ui?.welcomeSubtitle ?? DEFAULT_ACCOUNTS_CONFIG.ui.welcomeSubtitle,
            privacyLink: c.ui?.privacyLink ?? DEFAULT_ACCOUNTS_CONFIG.ui.privacyLink,
            termsLink: c.ui?.termsLink ?? DEFAULT_ACCOUNTS_CONFIG.ui.termsLink,
            helpLink: c.ui?.helpLink ?? DEFAULT_ACCOUNTS_CONFIG.ui.helpLink,
          },
        });
      })
      .catch(() => {})
      .finally(() => active && setLoaded(true));
    return () => { active = false; };
  }, []);

  return { config, loaded };
}
