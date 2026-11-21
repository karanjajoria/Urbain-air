// Offline advice used when Gemini is unavailable. Same shape as the AI plan.
function rulePlan(air, p, lang) {
  if (lang === 'hi') return rulePlanHi(air, p);
  const bad = air.aqi > 150, vul = p.kids || p.elderly || p.respiratory || p.pregnant;
  return {
    headline: bad ? 'Air is unhealthy today. Keep outdoor time short.' : 'Air is manageable. Stay mindful at peak hours.',
    risk: air.aqi > 300 ? 'severe' : air.aqi > 150 ? 'high' : air.aqi > 100 ? 'moderate' : 'low',
    routine: [
      { when: 'Morning', action: 'Skip outdoor exercise before 10 am; do it indoors.', why: 'Cold, still air traps smoke close to the ground at dawn.', impact: 'Heavy breathing outdoors can raise the dose of fine particles you inhale several-fold.' },
      { when: 'Cleanest window', action: `Do errands and school runs near ${air.cleanestHour?.slice(11, 16) || 'midday'}.`, why: 'Pollution dips when the sun warms and mixes the air.', impact: `Forecast shows about ${Math.round(air.cleanestPm)} vs ${Math.round(air.dirtiestPm)} µg/m³ at the worst hour.` },
      { when: 'Evening', action: 'Close windows before sunset and keep children indoors.', why: 'Smoke from cooking and heating fires builds after dark.', impact: 'Sealing gaps can keep indoor PM2.5 well below outdoor levels.' },
    ],
    indoor: [
      { hack: 'Seal door and window gaps with tape or a rolled towel.', cost: 'Free', why: 'Leaks let smog in.', impact: 'Slows outdoor air entering your home.' },
      { hack: 'Wet-mop floors instead of sweeping.', cost: 'Free', why: 'Sweeping lifts settled dust.', impact: 'Less re-suspended dust in your breathing zone.' },
      { hack: 'Build a box-fan + HEPA/MERV filter purifier.', cost: '~800 INR', why: 'Filters particles from a room.', impact: 'Can cut room PM2.5 by half or more when windows are shut.' },
    ],
    swaps: [
      { instead_of: 'Burning wood, coal or waste for warmth', try: 'Layered clothing, hot water bottle, electric heater', impact: 'Removes a major local smoke source.' },
      { instead_of: 'Short car trips', try: 'Metro, bus, or a shared ride', impact: 'Fewer tailpipe particles and NO2 on your street.' },
    ],
    protect: vul ? ['Keep a well-fitted N95/FFP2 mask for unavoidable outdoor time.', 'Keep prescribed inhalers and medicines within reach.'] : ['Use an N95 mask if you must be outside at peak hours.'],
    community: ['Ask neighbours not to burn leaves or trash.', 'Report open burning to your city helpline.']
  };
}


function rulePlanHi(air, p) {
  const bad = air.aqi > 150, vul = p.kids || p.elderly || p.respiratory || p.pregnant, hr = air.cleanestHour?.slice(11, 16) || 'दोपहर';
  return {
    headline: bad ? 'हवा आज ख़राब है। बाहर कम से कम समय बिताएँ।' : 'हवा ठीक है, फिर भी भीड़ वाले समय में सावधान रहें।',
    risk: air.aqi > 300 ? 'severe' : air.aqi > 150 ? 'high' : air.aqi > 100 ? 'moderate' : 'low',
    routine: [
      { when: 'सुबह', action: 'सुबह 10 बजे से पहले बाहर कसरत न करें; घर के अंदर करें।', why: 'ठंडी, ठहरी हवा में धुआँ ज़मीन के पास जमा रहता है।', impact: 'बाहर तेज़ साँस लेने से महीन कणों की मात्रा कई गुना बढ़ सकती है।' },
      { when: 'सबसे साफ़ समय', action: `काम और स्कूल की आवाजाही लगभग ${hr} के आसपास करें।`, why: 'धूप से हवा गर्म होकर मिलती है तो प्रदूषण घटता है।', impact: `पूर्वानुमान: सबसे साफ़ समय पर लगभग ${Math.round(air.cleanestPm)}, सबसे ख़राब समय पर ${Math.round(air.dirtiestPm)} µg/m³।` },
      { when: 'शाम', action: 'सूर्यास्त से पहले खिड़कियाँ बंद कर लें और बच्चों को घर में रखें।', why: 'अँधेरा होने के बाद खाना पकाने और अलाव का धुआँ बढ़ता है।', impact: 'दरारें बंद करने से घर के अंदर की धूल बाहर से काफ़ी कम रह सकती है।' }
    ],
    indoor: [
      { hack: 'दरवाज़े-खिड़की की दरारें टेप या लपेटे तौलिये से बंद करें।', cost: 'मुफ़्त', why: 'दरारों से स्मॉग अंदर आता है।', impact: 'बाहर की हवा का अंदर आना धीमा होता है।' },
      { hack: 'झाड़ू की जगह गीले पोंछे से फ़र्श साफ़ करें।', cost: 'मुफ़्त', why: 'झाड़ू से बैठी धूल फिर उड़ती है।', impact: 'साँस की ऊँचाई पर धूल कम रहती है।' },
      { hack: 'बॉक्स फ़ैन और HEPA/MERV फ़िल्टर से सस्ता प्यूरीफ़ायर बनाएँ।', cost: '~800 रुपये', why: 'फ़िल्टर कमरे की महीन धूल पकड़ता है।', impact: 'खिड़कियाँ बंद हों तो कमरे का PM2.5 आधा या उससे भी कम हो सकता है।' }
    ],
    swaps: [
      { instead_of: 'गर्मी के लिए लकड़ी, कोयला या कचरा जलाना', try: 'गरम कपड़ों की परतें, गरम पानी की बोतल, बिजली का हीटर', impact: 'स्थानीय धुएँ का एक बड़ा स्रोत हट जाता है।' },
      { instead_of: 'छोटी दूरी की कार यात्रा', try: 'मेट्रो, बस या साझा सवारी', impact: 'आपकी गली में धुआँ और NO₂ कम होता है।' }
    ],
    protect: vul ? ['बाहर जाना ही पड़े तो अच्छी तरह फ़िट होने वाला N95/FFP2 मास्क पहनें।', 'डॉक्टर की बताई दवाएँ और इन्हेलर पास रखें।'] : ['भीड़ वाले समय में बाहर जाना पड़े तो N95 मास्क पहनें।'],
    community: ['पड़ोसियों से पत्ते या कचरा न जलाने को कहें।', 'खुले में जलाने की शिकायत अपने शहर की हेल्पलाइन पर करें।']
  };
}

module.exports = { rulePlan };
