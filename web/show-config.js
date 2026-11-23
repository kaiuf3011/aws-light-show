// ✏️ EDIT THIS FILE to customise the show (departments, colours, club link).
window.SHOW = {
  title: '300 phones, one button',
  // What the big display is called on phones during Power-Up ('SCREEN', 'TV' or 'PROJECTOR')
  screenWord: 'SCREEN',
  club: 'AWS Cloud Club · RGU',
  // Link students land on at the very end (Google Form / WhatsApp group / Instagram)
  joinUrl: 'https://forms.gle/REPLACE-ME',

  // Tug of war fighters. Team A is the left side of the TV, team B the right.
  // Lines are picked at random; edit them freely. Images live in web/brainrot/.
  brainrot: {
    A: { name: 'SHERU BHAI', img: 'brainrot/sheru.jpg', color: '#ff1744',
         sfx: ['TADBAN', 'DHAM', 'ROAR', 'BHAI', 'GOLD', 'SHERU', 'DHISHUM'] },
    B: { name: 'TUNG TUNG TUNG SAHUR', short: 'TUNG TUNG', img: 'brainrot/tung.png', color: '#2979ff',
         sfx: ['TUNG', 'TUNG TUNG', 'SAHUR', 'DHUP', 'THAK', 'TUNG TUNG TUNG', 'BONK'] },
    // Big banners when the total number of pulls passes these numbers. {n} = the number.
    milestones: [500, 1000, 2500, 5000, 10000, 20000, 50000],
    milestoneText: ['{n} PULLS · AWS COUNTED EVERY ONE', '{n} PULLS · ZERO LOST', '{n} PULLS · STILL ZERO SERVERS', '{n} PULLS · LAMBDA IS SWEATING'],
    lines: {
      start: {
        A: ['Ye Sheru Bhai ka area hai.', 'Rope chhod de, chhotu.', 'Tadban tadban.', 'Phone pe hoon, phir bhi jeetunga.',
            'Gold chain dekhi? Ab power dekh.', 'Red team, jungle ready hai?', 'Lakdi se ladne aaya hoon? Theek hai.'],
        B: ['Tung tung tung tung SAHUR.', 'Uth jao. Sahur ka time ho gaya.', 'Bat ready hai, bhai.', 'Main lakdi hoon, par dil se strong.',
            'Blue team, alarm baj gaya.', 'Sher? Mujhe toh billi dikh rahi hai.', 'Aaj neend nahi, sirf PULL.'],
      },
      lead: {
        A: ['Dekha? Sheru Bhai kabhi nahi haarta.', 'Lakdi ka khamba, bas itna hi?', 'Chain gold ki, grip bhi gold ki.', 'Jungle ka raja kaun? Bolo.',
            'Red team, kya baat hai.', 'Ye rope ab mere area mein hai.', 'Tung tung? Ab bas tang tang.', 'Call pe bhi jeet raha hoon.',
            'Kya hua lakdi, deemak lag gayi?', 'Sheru Bhai ki marzi ke bina patta bhi nahi hilta.'],
        B: ['TUNG TUNG TUNG. Thak gaye kya?', 'Lion hai ya billi?', 'Sahur se pehle khatam karunga.', 'Sher ko bhi neend aati hai.',
            'Blue team, aur zor se TUNG.', 'Chain bech ke gym join kar le.', 'Ye lakdi tootegi nahi.', 'Tung tung tung, sher gaya jungle mein.',
            'Sahur ka power, bhai.', 'Phone rakh, rope pakad.'],
      },
      behind: {
        A: ['Ruk ja, abhi asli power aayegi.', 'Red team, aur zor se.', 'Ye sirf warm-up tha.', 'Ek minute, call khatam kar raha hoon.',
            'Sheru Bhai abhi garam ho raha hai.', 'Red team, izzat ka sawaal hai.', 'Roar loading...', 'Chain bhaari hai, isliye slow hoon.'],
        B: ['Tung... tung... blue, help karo.', 'Bat abhi bhi mere paas hai.', 'Wait, main abhi utha hi tha.', 'Battery thodi low hai.',
            'Blue team, sahur cancel mat karna.', 'Gira hoon, par bat nahi chhoda.', 'Comeback ka time.', 'Neend aa rahi hai, par haar nahi.'],
      },
      final: {
        A: ['LAST 5 SECONDS. PURA JUNGLE KHINCHO.', 'RED TEAM, ABHI NAHI TOH KABHI NAHI.', 'TADBAN TADBAN TADBAN.'],
        B: ['TUNG TUNG TUNG TUNG TUNG TUNG.', 'BLUE TEAM, FULL SAHUR MODE.', 'SAB UTHO. ABHI.'],
      },
      win: {
        A: ['Area bhi mera, rope bhi mera.', 'Jungle ka raja ek hi hai.', 'Call back karta hoon, jeet ke.', 'Red team, party Sheru Bhai ki taraf se.'],
        B: ['SAHUR WINS. Sab uth gaye.', 'Lakdi ne sher ko hila diya.', 'Tung tung tung, champion.', 'Blue team, kal sahur pe milte hain.'],
      },
      lose: {
        A: ['Rematch. Abhi ke abhi.', 'Network issue tha, bhai.', 'Sheru Bhai haara nahi, bas thak gaya.'],
        B: ['Tung... tung... so jaata hoon.', 'Deemak lag gayi thi.', 'Agli baar alarm jaldi lagaunga.'],
      },
      draw: ['Barabar? Rematch.', 'Dono king, rope confuse.', 'Ye toh tie ho gaya, bhai.'],
    },
  },

  // Shown on phones and the big screen right after a Tug of War result. {total} {phones} {seconds} {mine} are filled in.
  tugTeaser: {
    question: 'How did AWS count {total} pulls from {phones} phones without missing a single one?',
    spoiler: 'Spoiler: there is no server',
    cta: 'Find out at the AWS Cloud Club',
  },

  // Live quiz at the end: everyone answers on their phone, the TV shows the results.
  // answer = index of the right option (0 = A, 1 = B, 2 = C, 3 = D). Keep options short.
  quiz: [
    { q: 'When you scanned the QR code, which service sent your phone this page?',
      options: ['AWS Lambda', 'Amazon S3', 'DynamoDB', 'API Gateway'], answer: 1,
      why: 'S3 just stores the files and hands them out. Nothing was running.' },
    { q: 'How many servers did I set up and manage for tonight?',
      options: ['300', '12', '1', '0'], answer: 3,
      why: 'Lambda runs my code only when a message arrives. No servers to look after.' },
    { q: 'Messages reached your phones at different times. How did they still light up together?',
      options: ['Faster Wi-Fi in the front', 'Each phone synced its clock with AWS', 'Lambda sent them extra fast', 'Pure luck'], answer: 1,
      why: 'Every phone waited for the same moment on the AWS clock, then fired.' },
  ],

  // Power-up poster shown on the projector. Put your image in the web/ folder (e.g. web/poster.jpg)
  // and write its name here. Leave empty to use the built-in "AWS CLOUD CLUB" poster.
  poster: 'poster.jpg',
  // Built-in poster: big block letters (one line each) + a caption under them.
  posterBanner: ['AWS', 'CLOUD CLUB'],
  posterCaption: 'Rathinam Global University · inauguration 2026',

  departments: [
    { id: 'CSE',   color: '#2979ff' },
    { id: 'AI&ML', color: '#d500f9' },
    { id: 'ECE',   color: '#00e676' },
    { id: 'EEE',   color: '#ffea00' },
    { id: 'MECH',  color: '#ff3d00' },
    { id: 'CIVIL', color: '#00e5ff' },
    { id: 'IT',    color: '#ff4081' },
    { id: 'OTHER', color: '#ffffff' },
  ],

  zones: [
    { id: 'left',   label: 'Left side' },
    { id: 'center', label: 'Middle' },
    { id: 'right',  label: 'Right side' },
  ],
};
