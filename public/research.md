# Research behind the Urban Air Assistant

This note explains why the app gives the advice it does and why it looks and behaves the way it does. Each claim is tied to a source in the reference list. The authors and venues are given so you can look the papers up; please confirm exact titles and DOIs before citing them in a formal submission.

## 1. The problem
- Air pollution is one of the largest preventable health risks worldwide. The Lancet Commission follow-up estimated about 9 million pollution-related deaths in 2019 (Fuller et al., 2022).
- In India, the Global Burden of Disease analysis attributed about 1.67 million deaths to air pollution in 2019 (Pandey et al., 2021).
- Children are more vulnerable because their lungs and bodies are still developing, and they breathe more air per kilogram of body weight (WHO, 2018).
- Winter smog in north India is driven by several sources (traffic, biomass and waste burning, industry, crop-residue burning, dust) together with cold, still air that keeps pollutants near the ground (TERI-ARAI, 2018). This is why the app asks about commute, heating and cooking, and why it suggests timing outdoor trips.

## 2. Turning numbers into something people understand
- **Health thresholds.** The WHO 2021 guidelines set 15 µg/m³ as the 24-hour PM2.5 guideline value and 5 µg/m³ for the yearly average. Many winter days in Delhi are many times higher.
- **AQI bands.** The app uses the US AQI bands (EPA, 2018), because the data provider returns that scale. India's CPCB National AQI uses different breakpoints, so scores can differ. The app says so in the "How this works" section.
- **Cigarette comparison.** Rohde and Muller (2015) proposed that a PM2.5 level of about 22 µg/m³ over 24 hours is comparable to smoking one cigarette a day, in terms of mortality risk. The app presents it as a rough guide. It is a communication aid, not a clinical measurement, and it ignores differences in chemical composition.

## 3. Why the advice looks the way it does
| App advice | Evidence |
|---|---|
| Do exercise indoors on bad days | Breathing rate rises with exertion, so you inhale more particles per minute (EPA Exposure Factors Handbook). Public-health guidance such as EPA AirNow advises reducing outdoor exertion when AQI is high. |
| Go out at the cleanest hour | Pollution varies through the day. The app reads the hourly PM2.5 forecast and highlights the lowest hour. |
| Close windows, seal gaps | Indoor PM2.5 comes partly from outdoors. How much gets in depends on leaks and ventilation (Chen and Zhao, 2011). |
| Run a purifier or build a box-fan filter | Portable HEPA cleaners and DIY box-fan filters (the Corsi-Rosenthal box) remove fine particles from room air. Tests show high clean-air delivery rates, including against smoke (Stinson, Deters and Gall, 2024; Pistochini et al., 2024-2025; NCCEH review). Performance varies with build quality and filters decline over time, and new boxes release small amounts of VOCs, so the app suggests ventilating the room when first used. |
| N95-type masks, not cloth | N95 respirators are tested to filter at least 95% of 0.3 µm particles (NIOSH). Benefit depends on a good fit. Loose cloth or surgical masks filter far less. |
| Avoid wood, coal and waste burning at home | Household fuel combustion is a major indoor source of fine particles (WHO, 2014). |
| Extra care for children, older adults, people with lung disease, pregnancy | These groups are identified by WHO and EPA as more sensitive. |

## 4. Design research behind the interface
- **Action over data.** People act when they understand both the threat and what they can do about it (Rogers, 1975, Protection Motivation Theory). The first screen therefore gives a plain verdict and a next step, and every item has a "What it does" line explaining the benefit.
- **Make behaviour easy.** Behaviour happens when motivation, ability and a prompt coincide (Fogg, 2009). The plan is short, checkable, shareable by one tap, and tied to the time of day.
- **Progressive disclosure.** Show the essentials first and keep details one tap away (Nielsen, 2006). "Why?" and "How this works" are collapsed.
- **Plain language.** Labels follow the CDC Clear Communication Index: short sentences, one main message, everyday words ("fine dust" next to PM2.5).
- **Accessibility.** Large touch targets, keyboard-operable tabs, visible focus, meaning never carried by colour alone, and reduced-motion support, following WCAG 2.2.
- **Local language.** Plans can be generated in Hindi so more households can use them.

## 5. How the AI is used responsibly
- Gemini is given the live readings and a household profile and must return a fixed JSON structure, so the page can render it predictably.
- The prompt forbids diagnoses and invented medical claims, requires every suggestion to state its effect, and requires honesty about uncertainty.
- Model output is escaped before display. If Gemini is unavailable, a rule-based plan built from the same logic is shown.
- Requests are rate-limited, and personal data is not stored on the server. Checklist progress stays in the browser.

## 6. Limitations
- Air data is modelled at city scale. Your street may be better or worse.
- Effect statements, especially from the AI, are estimates and should not be read as precise.
- The app gives general guidance and does not replace medical advice.

## References
1. Fuller R. et al. (2022). Pollution and health: a progress update. *The Lancet Planetary Health*, 6(6).
2. Pandey A. et al. (2021). Health and economic impact of air pollution in the states of India: the Global Burden of Disease Study 2019. *The Lancet Planetary Health*, 5(1).
3. WHO (2021). *WHO global air quality guidelines: particulate matter (PM2.5 and PM10), ozone, nitrogen dioxide, sulfur dioxide and carbon monoxide.*
4. WHO (2018). *Air pollution and child health: prescribing clean air.*
5. WHO (2014). *WHO guidelines for indoor air quality: household fuel combustion.*
6. TERI and ARAI (2018). *Source apportionment of PM2.5 and PM10 of Delhi NCR.*
7. Rohde R.A. and Muller R.A. (2015). Air pollution in China: mapping of concentrations and sources. *PLoS ONE*, 10(8), e0135749.
8. US EPA (2018). *Technical assistance document for the reporting of daily air quality (AQI).* Also US EPA *Exposure Factors Handbook*.
9. Chen C. and Zhao B. (2011). Review of relationship between indoor and outdoor particles: I/O ratio, penetration factor, and deposition rate. *Atmospheric Environment*, 45(2), 275-288.
10. Stinson B.W., Deters A.L. and Gall E.T. (2024). Corsi-Rosenthal box performance and VOC emissions during wildfire smoke. *Indoor Environments*, article 100023.
11. Pistochini T., Jaeger G., Cappa C.D. and Corsi R.L. (2024/2025). Studies of DIY box-fan filter performance over time, *Environmental Science: Processes & Impacts* (RSC).
12. National Collaborating Centre for Environmental Health. *Do-it-yourself (DIY) air cleaners: evidence on effectiveness and considerations for safe operation.*
13. NIOSH. N95 respirator filtration requirements (42 CFR Part 84).
14. Rogers R.W. (1975). A protection motivation theory of fear appeals and attitude change. *Journal of Psychology*, 91, 93-114.
15. Fogg B.J. (2009). A behavior model for persuasive design. *Persuasive '09*.
16. Nielsen J. (2006). Progressive disclosure. Nielsen Norman Group.
17. CDC. *Clear Communication Index.*
18. W3C (2023). *Web Content Accessibility Guidelines (WCAG) 2.2.*
