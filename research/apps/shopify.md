# Shopify evidence pack  (researched 2026-10-27 by sonnet worker T06)

Quotes are from WebFetch extractions of the pages on 2026-10-27.

## Facts
| id | fact | source url | verbatim quote (≤400 chars) | rank |
|----|------|-----------|-----------------------------|------|
| f1 | Custom distribution: one store, or stores in the same Plus organization; no app review | https://shopify.dev/docs/apps/launch/distribution | "Installed on a single Shopify store, on multiple stores that belong to the same Plus organization" (Approval: "No") | 1 |
| f2 | Custom distribution can't use Shopify app billing | https://shopify.dev/docs/apps/launch/distribution | "Can't charge merchants through Shopify's app billing system" | 1 |
| f3 | Public distribution (App Store) can be installed on many stores and requires app review | https://shopify.dev/docs/apps/launch/distribution | "Can be installed on multiple Shopify stores" (Approval: "Yes", through the app review process) | 1 |
| f4 | Distribution method is permanent once chosen | https://shopify.dev/docs/apps/launch/distribution | "You can't change the distribution method after you select it." | 1 |
| f5 | The legacy "Shopify admin" custom app route is closed for new apps | https://shopify.dev/docs/apps/launch/distribution | "no longer available for new apps" | 1 |
| f6 | Apps are created in the Dev Dashboard by a user with app development permissions; the page names no Partner account requirement | https://shopify.dev/docs/apps/build/dev-dashboard/create-apps-using-dev-dashboard | "You're a user with app development permissions." | 1 |
| f7 | An app needs a released version (with App URL and scopes) before install | https://shopify.dev/docs/apps/build/dev-dashboard/create-apps-using-dev-dashboard | "Your app needs at least one version before it can be installed." | 1 |
| f8 | Authorization code grant: redirect URI must match one configured in the Dev Dashboard | https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant | "Must exactly match a redirect URI you've configured in the Dev Dashboard" | 1 |
| f9 | Merchants can edit requested scopes at consent; verify granted scopes | same | "Merchants can modify requested scopes during authorization, so always verify before storing the token." | 1 |
| f10 | New public apps must use expiring offline tokens | same | "New public apps must use expiring offline access tokens for GraphQL Admin API requests." | 1 |
| f11 | Write scope implies read | https://shopify.dev/docs/api/usage/access-scopes | "Any scope that writes a resource also grants read access to it." | 1 |
| f12 | read_orders/write_orders cover only the last 60 days; read_all_orders extends it | https://shopify.dev/docs/api/usage/access-scopes | "Both cover orders created within the last 60 days." | 1 |
| f13 | Some scopes need Shopify approval before declaring | https://shopify.dev/docs/api/usage/access-scopes | "Shopify has to approve your app for the scope before you can declare it." | 1 |
| f14 | Public apps request protected customer data in the Partner Dashboard; name/address/email/phone are protected fields with separate requests | https://shopify.dev/docs/apps/launch/protected-customer-data | "Public apps request access to protected customer data and protected customer fields through the Partner Dashboard." | 1 |
| f15 | Dev-store-only apps can use customer data in development without review | https://shopify.dev/docs/apps/launch/protected-customer-data | "If your app is for testing or installed only on a development store, you can access customer data in development after Step 5." | 1 |
| f16 | Unapproved fields are redacted; unapproved GraphQL requests return HTTP 200 with `errors` | https://shopify.dev/docs/apps/launch/protected-customer-data | "Responses will include only approved fields, and unapproved fields will be redacted." | 1 |
| f17 | Custom apps: Level 1 always; Level 2 for admin-created custom apps depends on merchant plan | https://shopify.dev/docs/apps/launch/protected-customer-data | "access to the different levels can vary based on app types" | 1 |
| f18 | Data protection review may be requested; selection factors include installs, record volume, fields approved, retention | https://shopify.dev/docs/apps/launch/protected-customer-data | "we might ask for a detailed review of your practices" | 1 |
| f19 | App review only covers production-ready apps; OAuth grant screen redirect is mandatory | https://shopify.dev/docs/apps/launch/app-store-review/pass-app-review | "If they don't redirect merchants to the OAuth grant screen, then your app won't be approved." | 1 |
| f20 | Resubmission slows review; repeated suspensions lengthen suspensions | https://shopify.dev/docs/apps/launch/app-store-review/pass-app-review and .../submit-app-for-review | "Resubmitting your app slows down the review process." / "Repeatedly getting suspended will lead to longer suspensions." | 1 |
| f21 | App Store charges must use Shopify billing | https://shopify.dev/docs/apps/launch/app-store-review/pass-app-review | "All charges associated with apps submitted to the Shopify App Store must use Shopify's billing system." | 1 |

## Timeline facts
- App review duration: provider gives no duration (pass-app-review and submit-app-for-review pages give no days/weeks).
- Protected customer data review duration: provider gives no duration. Wording: "You'll receive updates about the status of your review by email and through your Partner Dashboard." and "Data protection reviews can occur after you've implemented the protected customer data requirements."
- Access token lifetime (Dev Dashboard client credentials): "tokens expire after 24 hours" (create-apps-using-dev-dashboard).
- Guides should mark any review time range `inferred`.

## Scope sensitivity
| scope | sensitivity | source |
|-------|-------------|--------|
| read_products / write_products | normal; cover Product, ProductVariant, Collection | https://shopify.dev/docs/api/usage/access-scopes |
| read_orders / write_orders | normal for last 60 days; protected customer data applies to customer fields in orders | access-scopes + protected-customer-data |
| read_all_orders | needs Shopify approval for apps under a Partner organization ("request Shopify approval before declaring the scope"); not for Dev Dashboard apps under a merchant organization | access-scopes |
| read_customers / write_customers | protected customer data Level 1 (without name/address/phone/email) and Level 2 (with them) | protected-customer-data |
| read_customer_payment_methods, read_shopify_payments, read_users, read_taxes/write_taxes, read_apps, read_marketplace_orders | approval-required per page list | access-scopes |

## Gotchas & blockers seen in the wild
| symptom / error text | cause | fix | source |
|----------------------|-------|-----|--------|
| HTTP 200 with `errors` entry / redacted customer fields | protected customer data not approved | request access in Partner Dashboard, complete data protection details | https://shopify.dev/docs/apps/launch/protected-customer-data |
| App rejected in review: "your app won't be approved" | app doesn't redirect to OAuth grant screen, or reinstall fails | fix install flow, test reinstall, resubmit | https://shopify.dev/docs/apps/launch/app-store-review/pass-app-review |
| redirect_uri error at authorize | redirect URI not exactly matching Dev Dashboard config | configure exact URL | authorization-code-grant page (f8) |
| 401 on Admin API | "it was revoked, the app's access scopes changed, or it lapsed sooner than expires_in implied" (page code comment); "A 401 is terminal: drop the dead token so the merchant reinstalls." | reinstall / refresh | authorization-code-grant page |
| Scope can't be declared (read_all_orders etc.) | "Shopify has to approve your app for the scope before you can declare it." | request approval first | https://shopify.dev/docs/api/usage/access-scopes |
| App suspended | failing to address reviewer issues or repeated bad resubmissions | wait for date in status banner, fix, resubmit | submit-app-for-review |
| Wrong distribution picked | can't change after selecting | create a new app | distribution page (f4) |

## Could not verify
- Whether a Partner account is required: the distribution and Dev Dashboard create-app pages don't mention one; a search snippet (not a fetched page) said shopify.dev's "Create an app" guide lists a Partner account as prerequisite. Not fetched, so unconfirmed. Search results also said apps are now created in the Dev Dashboard, from a community post (rank 5, not fetched).
- Any official app-review or protected-customer-data review duration (none found).
- The custom-distribution install-link flow (page doesn't cover it) and whether "merchant custom apps" remain creatable outside the legacy route.
- Protected-data requirements for custom distribution apps beyond the level note; the final 38k characters of the authorization-code-grant page were not read.
- Quotes come from WebFetch summaries, not raw page dumps; re-check before user-facing quoting.
