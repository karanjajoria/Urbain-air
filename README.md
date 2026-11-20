# Urban Air Assistant

Live city air data + Gemini-written daily plan (routine, indoor hacks, swaps) with the effect of every choice explained.
Falls back to built-in rules if no Gemini key is set, so the demo never breaks.

## Stack (all free)
- Gemini API (Google AI Studio free key): https://aistudio.google.com/apikey
- Render (free plan) for hosting
- Google Fonts
- Open-Meteo air quality + geocoding (free, no key). Google's Air Quality API needs a billing account, so it is not used.

Research and design rationale: see RESEARCH.md (also served at /research.md).

## Run locally
    npm install
    GEMINI_API_KEY=your_key npm start     # http://localhost:8080

##Deployed: Render 
    https://urbain-air.onrender.com/
