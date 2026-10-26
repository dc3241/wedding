# Recommended Connect integration

First Look is a wedding-planning SaaS. Planners and venues pay a subscription on the platform Stripe account. Couples pay those businesses on a proposal. The couple's receipt and card statement show the venue or planner. First Look does not take a percentage of that payment.

## A. Account configuration

Accounts API: `/v2/core/accounts`. Legacy account `type` is unused.

- Dashboard: Express (lightweight view for sellers)
- Fee collection: Stripe bills connected accounts
- Negative balance liability: Stripe

Each connected account uses merchant configuration (`configuration.merchant`) and requests `card_payments`. This Express + Stripe-managed pricing + Stripe-managed negative balance liability setup is in public preview and applies only to accounts created from now on. The Express versus full Dashboard choice is permanent per account. Use the current Connect preview API version ([preview changelog](https://docs.stripe.com/changelog.md?preview=true)).

## B. Charge pattern: direct charges

The proposal is the venue or planner's document. Checkout is created on their connected account. Funds never land on the platform balance, so a proposal charge cannot change a subscription.

## C. Venue and planner onboarding flow

Onboarding method: embedded.

They start from Account → Payments. First Look creates the connected account, and the embedded onboarding component collects verification in the app. The notification banner surfaces later requirements. Pay stays off until `configuration.merchant.capabilities.card_payments.status` is `active`. Signing a proposal stays available either way.

## D. Payments dashboard access for venues and planners

Embedded payments and payouts live inside First Look. An Express login link covers anything the embedded view does not. They do not get the full Stripe Dashboard.

## E. Embedded components

- `account_onboarding`
- `notification_banner` (required)
- `account_management`
- `payments`
- `payouts`

Direct charges show full payment and dispute detail in these components.

## F. Webhook integration

Use a second webhook endpoint, with its own signing secret, and verify every signature before writing payment state ([webhook signature verification](https://stripe.com/docs/webhooks/signatures)). Fulfill from `checkout.session.completed` and `checkout.session.async_payment_succeeded` only when `payment_status` is not `unpaid`. Handle `checkout.session.async_payment_failed`.

## G. Onboarding status gating

Before creating a Checkout Session, retrieve the account with `stripe.v2.core.accounts.retrieve` and require `configuration.merchant.capabilities.card_payments.status === 'active'`. Also read `configuration.merchant.capabilities.stripe_balance.payouts.status` so the payments page can show whether bank payouts are ready.

## H. Fee structure

- Platform fee model: none on the proposal payment. Monetization stays the existing venue and planner subscription.
- `application_fee_amount`: omit it.
- The couple pays the venue or planner. Stripe deducts processing fees from that connected account ([stripe.com/pricing](https://stripe.com/pricing)).

```
Couple pays the proposal amount
        │
        ▼
Venue or planner connected account
(direct charge, their name on the statement)
        │
        │ Stripe processing fee stays on their account
        ▼
They keep the remainder

First Look's subscription is a separate charge
on the platform account.
```

## I. SaaS monetization

Recurring SaaS fees stay on the platform Billing customers and prices already in use. Leave `customer_account` off this work.

## J. Implementation plan

1. Store the connected account id on the venue or planner account. Leave `subscriptions` and `app/api/stripe/webhook` on the platform account only. Ignore Connect events (`event.account`) in that webhook.
2. Embed onboarding, the notification banner, account management, payments, and payouts. Gate Pay on the capability check above.
3. Create a Checkout Session for the proposal on the connected account. The success page is a receipt. It does not mark the proposal paid.
4. Add `app/api/stripe/connect/webhook` with `STRIPE_CONNECT_WEBHOOK_SECRET`. Mark paid only from that handler, idempotently.
5. Before live mode: one onboarded test account, one proposal payment, one refund by the venue, and a check that no subscription row changed. Enable Radar for Platforms in the Dashboard.

## K. Risk and liability

**Negative balance liability: Stripe.** Unresolved negative balances on a connected account are absorbed by Stripe. That field turns on Managed Risk. It is in public preview for newly created accounts only.

**Risk management: Stripe.** Enable Radar for Platforms. Radar blocks fraudulent payments. Managed Risk covers negative balances that still get through.

## L. Why this fits

- The couple is buying the venue or planner's service, so that business is the merchant of record.
- In-app management uses Express plus embedded components.
- Direct charges plus a second webhook keep proposal money off the subscription integration.
- There is no per-payment cut, so Stripe's processing fee never comes out of First Look's balance.

## M. Open questions

- Pay stays optional after signing. A required deposit is a later change.
- Connected accounts are created for US businesses (`identity.country = US`).
