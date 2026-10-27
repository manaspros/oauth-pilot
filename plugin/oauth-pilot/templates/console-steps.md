# Console steps template: {{PROVIDER}}

Fill from the guide JSON. Mark each line agent (browser) or human (login, 2FA, CAPTCHA, payment, terms, submit for review).

1. [human] Sign in to {{CONSOLE_URL}}.
2. [agent] Create app. Name: {{APP_NAME}}. Homepage: {{HOMEPAGE}}.
3. [agent] Redirect URI: https://backend.composio.dev/api/v1/auth-apps/add
4. [agent] Scopes: {{SCOPES}}
5. [human] Accept any terms; submit for review if the guide requires it.
6. [human] Copy client ID and secret into your .env as {{APP}}_CLIENT_ID / {{APP}}_CLIENT_SECRET.
