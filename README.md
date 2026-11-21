# Urban Air Assistant

Winter smog makes families ask the same questions every morning: can my child play outside, when should I go out, should I open a window? An AQI number does not answer those. This app takes the live air reading for your city, asks a few things about your household, and gives you a short plan for the day. Every suggestion says what it actually changes, so you can decide if it is worth doing.

Built for PromptWars, Challenge 6.
=======
## Stack (all free)
- Gemini API (Google AI Studio free key): https://aistudio.google.com/apikey
- Render (free plan) for hosting
- Google Fonts
- Open-Meteo air quality + geocoding (free, no key). Google's Air Quality API needs a billing account, so it is not used.

## What it does
- Pulls live AQI, PM2.5, PM10 and NO₂ for a city (or your location) and finds the cleanest hour in the next day.
- Shows a plain verdict, from "Good" to "Health emergency".
- Writes a plan with Gemini: a day routine, indoor air tricks, cleaner swaps, tips for vulnerable family members, and things neighbours can do together.
- Works in English and Hindi, including the offline fallback plan.
- Lets you tick things off, ask follow-up questions and share the plan on WhatsApp.

## How it fits together
    public/        the web page (index.html, app.js, i18n.js)
    src/aqi.js     air data and the best/worst hour logic
    src/gemini.js  Gemini calls and prompts
    src/rules.js   backup plan used when Gemini is down or has no key
    src/validate.js  cleaning of everything the browser sends
    src/ratelimit.js per-IP limit
    server.js      routes and security headers
    tests/         unit and API tests

If Gemini fails or no key is set, the page still gives a rule-based plan and says so.

## Run it
    npm install
    cp .env.example .env     # add your Gemini key, or leave it blank
    GEMINI_API_KEY=your_key npm start
Open http://localhost:8080.

## Tests
    npm test
The tests cover input cleaning, the forecast logic, the backup plan in both languages, the rate limiter and the API routes. They do not call Gemini or Open-Meteo, so they run offline.

## Deploy for free
**Render:** push to GitHub, create a Web Service on the Free plan, build `npm install`, start `npm start`, and add `GEMINI_API_KEY`. The first request after idle time is slow on the free plan.

**Google Cloud Run:**

    gcloud run deploy urban-air --source . --region asia-south1 --allow-unauthenticated \
      --min-instances 0 --set-env-vars GEMINI_API_KEY=your_key

## Security notes
The Gemini key stays on the server. Input is length-limited and typed, AI output is escaped before display, requests are limited to 20 a minute per IP, and a content security policy blocks inline scripts.

## Limits
- Air data is city-level and uses the US AQI scale, which differs from India's CPCB index.
- The cigarette comparison is a rough guide, not a medical measure.
- Impact statements written by the AI are estimates. This is general guidance, not medical advice.

## How AI was used
Gemini writes the plans and answers inside the app. I also used Claude (Anthropic) as a coding assistant while building the project, then reviewed and tested the result.

## Research
The reasoning behind the advice and the interface is in [RESEARCH.md](RESEARCH.md).
=======
## Deployed: Render 
    https://urbain-air.onrender.com/
