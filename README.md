<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# KamekHalal

Capacitor + React app for Halal product lookup and community submission workflows.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local`
3. Set `VITE_ADMIN_EMAILS` in `.env.local` with your production admin email list
4. Run the app:
   `npm run dev`

## Production Notes

- Build web assets with `npm run build`
- Sync Capacitor with `npm run cap:sync`
- Use [RELEASE_CHECKLIST.md](/Users/faridzhuanfirdaus/Documents/ANTIGRAVITY%20PROJECT/KamekHalal-IOSAPK/RELEASE_CHECKLIST.md) before App Store or Google Play submission
- Review [firestore.rules.example](/Users/faridzhuanfirdaus/Documents/ANTIGRAVITY%20PROJECT/KamekHalal-IOSAPK/firestore.rules.example) and apply equivalent rules in Firebase before release
