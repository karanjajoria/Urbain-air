// Thin wrapper around the Gemini REST API (Google AI Studio free tier).
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const isConfigured = () => !!process.env.GEMINI_API_KEY;

const PLAN_PROMPT = `You are an urban air-quality coach for families in cities with severe winter smog (Delhi NCR, Lahore, Dhaka, Beijing and similar).
You get live air data and a household profile. Reply with JSON only:
{"headline":string,"risk":"low|moderate|high|severe",
"routine":[{"when":string,"action":string,"why":string,"impact":string}],
"indoor":[{"hack":string,"cost":string,"why":string,"impact":string}],
"swaps":[{"instead_of":string,"try":string,"impact":string}],
"protect":[string],"community":[string]}
Give 4-5 routine items in time order, using the cleanest and dirtiest hours provided. Give 4 indoor hacks (free or under 500 INR where possible), 3 swaps that fit their commute, heating and cooking, 3 protection tips for vulnerable members, and 2 community actions.
Each "impact" must say, in concrete terms, what the choice does (for example "cuts your child's dose of fine dust by roughly a third"), and admit uncertainty. No diagnoses or invented medical claims. For asthma, heart disease or symptoms, tell them to see a doctor. Use short, plain sentences. Write every text value in the language named by respond_in.`;

const ASK_PROMPT = 'You are a practical urban air-quality coach. Answer in under 120 words, say what the suggested choice actually changes, and point to a doctor for medical worries.';

async function generate({ system, user, json }) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature: 0.4, ...(json ? { responseMimeType: 'application/json' } : {}) }
    })
  });
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('');
  if (!text) throw new Error(JSON.stringify(data.error || data).slice(0, 300));
  return json ? JSON.parse(text) : text;
}

module.exports = { isConfigured, generate, PLAN_PROMPT, ASK_PROMPT };
