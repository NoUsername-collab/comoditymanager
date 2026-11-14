# Plata abonamentelor (Stripe Billing)

Light și PRO se plătesc lunar cu cardul, din **Setări → Abonament** (doar proprietarul). Business rămâne „Contactați-ne”: îl activează echipa Zalmox din `/platform-admin`.

## Cum funcționează

1. Proprietarul apasă „Treceți pe Light / PRO” → **Stripe Checkout** (plată cu cardul, adresa și codul fiscal al firmei).
2. Stripe trimite evenimente la `POST /api/stripe/webhook`. Zalmox verifică semnătura, aplică fiecare eveniment o singură dată (`stripe_webhook_events`) și **recitește abonamentul din Stripe**, deci ordinea evenimentelor nu contează.
3. Pensiunea trece pe planul plătit (`tenants.plan_id`, `is_paying`, `subscription_*`), iar cache-ul pensiunii se golește imediat.
4. Cardul, facturile, trecerea Light ↔ PRO și anularea se fac în **portalul clientului Stripe** („Gestionează abonamentul”).

| Starea abonamentului | Planul pensiunii |
|---|---|
| `active`, `trialing` | planul plătit |
| `past_due` (cardul a eșuat, Stripe reîncearcă) | planul plătit, cu avertisment în pagină |
| `canceled`, `unpaid`, `incomplete`, `incomplete_expired`, `paused` | Basic |
| anulat de proprietar (`cancel_at_period_end`) | planul plătit până la sfârșitul lunii, apoi Basic |

Un preț pe care Zalmox nu-l cunoaște nu dă niciun plan. Un plan pus de echipa Zalmox fără abonament Stripe (Business, transfer bancar) nu poate fi înlocuit din panou.

## Configurare în Stripe (o dată, întâi în modul Test)

1. **Produse și prețuri:** Light — 9 EUR/lună, PRO — 29 EUR/lună, recurente, **Tax behavior: Exclusive** (prețurile de pe site sunt fără TVA). Copiază ID-urile `price_…`.
2. **Stripe Tax:** activează-l, adaugă înregistrarea de TVA a firmei Zalmox (România) și setează codul de produs „SaaS – business use”. Checkout cere adresa și acceptă codul de TVA al clientului: firmele din UE cu cod valid sunt taxate invers.
3. **Facturi:** Settings → Billing → Invoices: datele firmei Zalmox, numerotarea, trimiterea facturii pe email după plată.
4. **Portalul clientului:** Settings → Billing → Customer portal: permite actualizarea cardului, vizualizarea facturilor, anularea la sfârșitul perioadei și **schimbarea planului între cele două prețuri** (Light, PRO).
5. **Webhook:** Developers → Webhooks → Add endpoint `https://<domeniul platformei>/api/stripe/webhook`, cu evenimentele:
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`, `invoice.payment_failed`. Copiază „Signing secret” (`whsec_…`).
6. **Reîncercări la plată eșuată:** Settings → Billing → Subscriptions and emails: după ultima reîncercare, abonamentul trece în **canceled** sau **unpaid** (oricare: pensiunea revine pe Basic).

## Variabile (Vercel și `.env.staging.local`)

`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_LIGHT`, `STRIPE_PRICE_PRO`. Fără toate patru, pagina Abonament spune că plata cu cardul nu e încă disponibilă și nimic nu se trimite la Stripe.

## Test înainte de producție

- Cu cheile de test pe staging: treci o pensiune de test pe PRO cu cardul `4242 4242 4242 4242`, verifică planul în panou și în `/platform-admin`.
- Din portal: schimbă pe Light, apoi anulează; pensiunea rămâne pe plan până la sfârșitul perioadei.
- Cardul `4000 0000 0000 0341` (plata eșuează după atașare) pentru starea `past_due`.
- Local, evenimentele pot fi trimise cu Stripe CLI: `stripe listen --forward-to localhost:3030/api/stripe/webhook`.

## La trecerea în producție

- Migrarea **123** aplicată, cheile **live** în Vercel, webhook-ul live creat separat (are alt `whsec_…`).
- Textul de pe pagina de prețuri („Contul pornește pe Basic; planul se activează la cerere”) se schimbă atunci în plata cu cardul din panou.
