# FoodOG

FoodOG is a free-first, full-stack tiffin ordering website rebuilt from the original **FooddManagament** project.

## Included

- Responsive customer storefront and meal plans
- One-time, weekly, and monthly price calculation
- Cash on delivery
- Razorpay Standard Checkout for UPI, cards, netbanking, and wallets
- Server-side Razorpay order creation and signature verification
- Payment webhooks for captured and failed payments
- Supabase order storage with Row Level Security enabled
- Customer order lookup and cancellation requests
- Protected kitchen dashboard with order-status controls
- Local browser demo mode when cloud services are not configured
- Accessible forms, keyboard navigation, focus states, and reduced-motion support
- Real-time Three.js/WebGL tiffin hero with drag interaction, pause control, and automatic reduced-motion/photo fallback
- Interactive 3D tiffin builder with mood presets, ingredient compartments, live nutrition, and server-validated custom pricing
- Exact 4K food masters plus optimized responsive WebP storefront images

## Local preview

For the static customer demo:

```bash
python -m http.server 8000
```

Open `http://localhost:8000`. COD orders are stored in this browser in local demo mode.

To run the serverless API locally, install the Vercel CLI and run `vercel dev` after creating `.env.local` from `.env.example`.

## Tests

```bash
npm test
npm run check
```

## Cloud setup

Follow [DEPLOYMENT.md](DEPLOYMENT.md). Never commit `.env` files, Supabase service-role keys, Razorpay secrets, or webhook secrets.

## Project layout

```text
api/                  Vercel serverless APIs
assets/               4K masters, optimized storefront images, and source credits
server/               Shared server-only validation and payment logic
supabase/             Database schema and admin setup
tests/                Pricing and signature tests
index.html             Customer storefront
admin.html             Protected kitchen dashboard
app.js                 Storefront behavior and checkout
tiffin-builder.js      Interactive custom-meal UI and Three.js tiffin scene
admin.js               Admin dashboard behavior
styles.css             Shared responsive design system
Tifin-Website-main/    Preserved original project
```

The original site remains untouched in `Tifin-Website-main/` for reference.
