# Wompi Payment Provider Setup

Harmonizing uses Wompi as a hosted payment-link provider for native invoices. The app never collects or stores card numbers, CVV, bank credentials, or payment-instrument secrets.

## Environment Variables

Set these in local, preview, or production as needed:

```env
WOMPI_PAYMENTS_ENABLED=true
WOMPI_ENV=sandbox
WOMPI_PRIVATE_KEY=prv_test_...
WOMPI_EVENTS_SECRET=test_events_...
WOMPI_APP_BASE_URL=http://localhost:3010
```

Use `WOMPI_PAYMENTS_ENABLED=false` to fully hide/disable online payment link creation and webhook processing.

For production, use Wompi production keys and:

```env
WOMPI_ENV=production
WOMPI_APP_BASE_URL=https://your-production-domain.example
```

## Local Sandbox Flow

1. Run the app locally at `http://localhost:3010`.
2. Add sandbox Wompi keys to the local `.env`.
3. Restart the web container so the env vars are loaded.
4. Open `/admin/invoices`.
5. Create or open a native invoice.
6. Click `Create Wompi link` or use `Open and send` after Wompi is configured.
7. Use the generated payment link to test Wompi checkout.

The admin Wompi card shows the webhook URL that must be configured in the Wompi dashboard.

## Webhooks On Localhost

Wompi requires a public HTTPS URL for real dashboard webhooks. For local development, use a tunnel such as ngrok:

```bash
ngrok http 3010
```

Then set the Wompi sandbox events URL to:

```text
https://your-ngrok-domain.ngrok-free.app/api/payments/wompi/webhook
```

Update local env while testing through the tunnel:

```env
WOMPI_APP_BASE_URL=https://your-ngrok-domain.ngrok-free.app
```

## Local Signed Webhook Test

You can test the webhook processing path without Wompi calling back by using the local helper. First create a Wompi link for an invoice, then run:

```bash
cd apps/web
npm run wompi:webhook:test -- --invoice=HA-2026-0001 --status=APPROVED
```

This posts a signed `transaction.updated` event to the local webhook using `WOMPI_EVENTS_SECRET`.

Supported status examples:

- `APPROVED`
- `DECLINED`
- `VOIDED`
- `ERROR`

## Data Written By Wompi Events

When a signed Wompi `APPROVED` event matches a native invoice payment link:

- A `NativeInvoicePayment` row is created with method `WOMPI`.
- The invoice balance is recalculated.
- The invoice becomes `PAID` automatically when the active payment total covers the invoice total.
- Duplicate webhook retries are ignored through provider transaction/event tracking.

Declined, voided, pending, and error events update provider status metadata but do not create active payment records.

## Safety Notes

- Keep sandbox and production keys separate.
- Configure separate Wompi webhook URLs for sandbox and production.
- Never expose `WOMPI_PRIVATE_KEY` or `WOMPI_EVENTS_SECRET` to the browser.
- Treat Wompi payment links as payable money actions; only generate them for invoices intended to be open and collectible.
