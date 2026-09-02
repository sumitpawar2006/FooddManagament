# FoodOG deployment and client handover

This setup keeps development costs at zero while the project is being prepared. Live payment processing is not completely free: the payment gateway charges a fee on successful transactions, and Vercel Hobby is limited to personal, non-commercial use.

## Free development stack

| Part | Development choice | Cost while testing |
|---|---|---|
| Source control | GitHub public repository | Free |
| Website and APIs | Vercel Hobby | Free for personal/non-commercial testing |
| Database and authentication | Supabase Free | Free within plan limits |
| Payments | Razorpay Test Mode | No real transactions |
| Local payment option | Cash on delivery | No gateway charge |

At commercial launch, move the Vercel project to a suitable paid plan or another commercial host. Razorpay has no standard setup or annual-maintenance fee, but successful live payments have transaction/platform fees plus applicable GST.

## 1. Create the Supabase project

1. Create a free project at <https://supabase.com/dashboard>.
2. Open **SQL Editor** and run `supabase/schema.sql`.
3. Open **Project Settings → API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key
4. Keep the service-role key server-side only.

## 2. Create the kitchen administrator

1. In Supabase, open **Authentication → Users**.
2. Create the owner's email/password user and mark the email confirmed.
3. Copy the new user's UUID.
4. Edit the placeholders in `supabase/create-admin.sql` and run the statement in SQL Editor.
5. The owner can now sign in at `/admin.html`.

There is intentionally no public admin registration route.

## 3. Configure Razorpay test payments

1. Create or open the merchant account at <https://dashboard.razorpay.com/>.
2. Switch to **Test Mode** and generate API keys.
3. Create a webhook pointing to:

   ```text
   https://YOUR_DOMAIN/api/payments/webhook
   ```

4. Subscribe to `payment.captured` and `payment.failed`.
5. Choose a long random webhook secret and keep it with the API secrets.

The browser receives only the Razorpay key ID. The key secret remains in the serverless environment. Prices are recalculated on the server, and payment signatures are verified before an order is marked paid.

## 4. Deploy on Vercel for development

1. Import the GitHub repository into Vercel.
2. Leave the framework preset as **Other** and the root directory as the repository root.
3. Add these environment variables from `.env.example`:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `RAZORPAY_WEBHOOK_SECRET`
   - `BUSINESS_NAME`
   - `SUPPORT_EMAIL`
4. Apply secrets to Preview and Production environments as appropriate.
5. Deploy, then test COD, online test payment, lookup, cancellation, and the admin dashboard.

If database variables are absent, the storefront clearly switches to local demo mode. If only Razorpay variables are absent, real database-backed COD remains available and online payment is disabled.

## 5. Test before accepting money

- Confirm the amount displayed in the browser matches the database amount.
- Complete a Razorpay test success and test failure.
- Confirm a captured payment changes `payment_status` to `paid`.
- Confirm the webhook also updates payment state.
- Confirm an incorrect signature is rejected.
- Confirm paid cancellation creates a request rather than silently promising a refund.
- Test on mobile, keyboard-only navigation, and a slow connection.
- Never fulfil an online order with an unverified payment.

## 6. Client launch after a year

The client, not the developer, should own all production accounts:

1. Transfer the GitHub repository or grant the client's organisation ownership.
2. Transfer the Vercel project to the client's paid commercial team, or migrate the API to their chosen host.
3. Transfer the Supabase project to the client's organisation and enable billing/backups appropriate to order volume.
4. Use a Razorpay merchant account legally owned and KYC-verified by the client.
5. Replace all test keys with live keys and create a separate live webhook secret.
6. Rotate every secret after handover.
7. Replace sample meals, prices, delivery hours, service area, business name, support details, and images.
8. Add lawyer-reviewed privacy, terms, delivery, cancellation, and refund policies before live checkout.
9. Add monitoring, database backups, rate limiting, tax/invoice rules, and a documented refund process.
10. Run a small real transaction and refund with the client before public launch.

## Security notes

- Customer tables have RLS enabled and no browser-readable policies.
- Only serverless functions use the Supabase service-role key.
- Admin API calls require a valid Supabase user token plus an `admin_profiles` record.
- Payment fulfillment relies on server-side signature verification and webhook confirmation.
- Customer lookup requires both a random order reference and the checkout mobile number.
- Add platform-level rate limiting and abuse monitoring before commercial launch.
