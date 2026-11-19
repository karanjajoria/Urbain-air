# Urban Air Assistant

Live city air data + Gemini-written daily plan (routine, indoor hacks, swaps) with the effect of every choice explained.
Falls back to built-in rules if no Gemini key is set, so the demo never breaks.

## Stack (all free)
- Gemini API (Google AI Studio free key): https://aistudio.google.com/apikey
- Google Cloud Run (free tier) or Render (free plan) for hosting
- Google Fonts
- Open-Meteo air quality + geocoding (free, no key). Google's Air Quality API needs a billing account, so it is not used.

> Deployed web application: https://urbain-air.onrender.com/

Research and design rationale: see RESEARCH.md (also served at /research.md).

## Run locally
    npm install
    GEMINI_API_KEY=your_key npm start     # http://localhost:8080

## Deploy: Google Cloud Run
    gcloud run deploy urban-air --source . --region asia-south1 --allow-unauthenticated \
      --min-instances 0 --max-instances 2 --set-env-vars GEMINI_API_KEY=your_key
Scale-to-zero keeps it inside the free tier. For production, store the key in Secret Manager instead.

## Deploy: Render
Push to GitHub, create a Web Service (Free plan), build `npm install`, start `npm start`, add env var `GEMINI_API_KEY`. Or use render.yaml.
