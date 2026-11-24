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
    A: { name: 'SHERU BHAI', img: 'brainrot/sheru-full.png', color: '#ff1744',
         sfx: ['DHOOL', 'MASS', 'THERI', 'SEMMA', 'BHAI', 'KETHU', 'GETHU'] },
    B: { name: 'TUNG TUNG TUNG SAHUR', short: 'TUNG TUNG', img: 'brainrot/tung-full.png', color: '#2979ff',
         sfx: ['TUNG', 'TUNG TUNG', 'SAHUR', 'DHUP', 'AIYO', 'TUNG TUNG TUNG', 'BONK'] },
    // Words on the screens. {name} = a fighter, {n} = a number.
    ui: {
      go: 'PULL PANNU DA',
      finalBanner: 'KADAISI 5 SECOND',
      finalTitle: 'kadaisi 5 second',
      lead: '{name} munnadi',
      phoneWinning: 'namma munnadi · +{n}',
      phoneLosing: '{name} munnadi {n}. PULL PANNU',
      phoneLevel: 'samam samam',
      hint: 'phone-la PULL-a vegama amukku',
    },
    // Big banners when the total number of pulls passes these numbers.
    milestones: [500, 1000, 2500, 5000, 10000, 20000, 50000],
    milestoneText: ['{n} PULLS · AWS ORU PULL-AYUM MISS PANNALA', '{n} PULLS · ZERO SERVER, FULL MASS',
                    '{n} PULLS · LAMBDA-KU VERVAI KOTTUDHU', '{n} PULLS · DYNAMODB SEMMA BUSY'],
    lines: {
      start: {
        A: ['Indha area Sheru Bhai-oda area da.', 'Rope-a vidu thambi, un body thaangaadhu.', 'Phone-la pesitu irundhaalum jeyippen.',
            'Gold chain paathiya? Ippo power paaru.', 'Red team, ready-aa? Mass kaatunga.', 'Kattai kooda sanda-va? Seri da.',
            'Naan cloud-la irukken, nee ground-la.'],
        B: ['Tung tung tung tung SAHUR.', 'Ezhundhiru da, sahur time aachu.', 'Bat ready, mind ready, kai mattum konjam weak.',
            'Naan kattai thaan, aana heart full-a steel.', 'Blue team, alarm adichiduchu. Ezhundhirunga.',
            'Singam-aa? Enaku poonai maadhiri theriyudhu.', 'Inniku thookam illa, PULL mattum thaan.'],
      },
      lead: {
        A: ['Paathiya? Sheru Bhai thothadhe illa.', 'Kattai, idhu thaan un level-aa?', 'Chain gold, grip-um gold.',
            'Kaatukku raja yaaru? Sollunga.', 'Red team, vera level.', 'Rope ippo en area-la irukku.',
            'Tung tung-aa? Ippo verum tang tang.', 'Call-la irundhe jeyikkuren da.', 'Enna kattai, karaiyaan pidichiduchaa?',
            'Un score-a paathu DynamoDB-ke vekkam.'],
        B: ['TUNG TUNG TUNG. Tired-aa Bhai?', 'Singam-aa illa poonai-aa?', 'Sahur-ku munnadi mudichiduven.',
            'Singathukkum thookam varum da.', 'Blue team, innum konjam TUNG podunga.', 'Chain-a vithutu gym join pannu.',
            'Indha kattai odayaadhu.', 'Tung tung tung, singam kaatukulla odiduchu.', 'Phone-a vechitu rope-a pudi Bhai.',
            'Un Wi-Fi slow, en bat fast.'],
      },
      behind: {
        A: ['Iru da, ippo thaan real power varudhu.', 'Red team, innum konjam.', 'Idhu verum warm-up.',
            'Oru nimisham, call-a cut pannitu varen.', 'Sheru Bhai ippo thaan soodaagudhu.', 'Red team, maanam pochu da.',
            'Roar loading... 12%.', 'Chain heavy, adhaan slow.'],
        B: ['Tung... tung... blue, help pannunga.', 'Bat innum en kaila thaan irukku.', 'Wait, ippo thaan ezhundhen.',
            'Battery 2% thaan irukku.', 'Blue team, sahur-a cancel pannaadheenga.', 'Vizhundhen, aana bat-a vidala.',
            'Comeback time da.', 'Thookam varudhu, aana thoalvi illa.'],
      },
      final: {
        A: ['KADAISI 5 SECOND. FULL KAADUM IZHUNGA.', 'RED TEAM, IPPO ILLANA EPPAVUM ILLA.', 'MASS MASS MASS.'],
        B: ['TUNG TUNG TUNG TUNG TUNG TUNG.', 'BLUE TEAM, FULL SAHUR MODE.', 'ELLARUM EZHUNDHIRUNGA. IPPO.'],
      },
      win: {
        A: ['Area-um en dhaan, rope-um en dhaan.', 'Kaatukku oru raja dhaan.', 'Call back panren, jeichitu.', 'Red team, treat Sheru Bhai-oda.'],
        B: ['SAHUR JEICHIDUCHU. Ellarum ezhundhutaanga.', 'Kattai singatha aattiduchu.', 'Tung tung tung, champion da.', 'Blue team, naalaiku sahur-la meet pannalam.'],
      },
      lose: {
        A: ['Rematch. Ippove.', 'Network issue da, sathiyama.', 'Sheru Bhai thokkala, konjam tired, avlo dhaan.'],
        B: ['Tung... tung... naan thoongaporen.', 'Karaiyaan pidichiduchu.', 'Adutha thadava alarm seekiram vekkuren.'],
      },
      draw: ['Draw-aa? Rematch da.', 'Rendu perum king, rope confuse aagiduchu.', 'Idhu tie da, sathiyama.'],
    },
  },

  // Shown on phones and the big screen right after a Tug of War result. {total} {phones} {seconds} {mine} are filled in.
  tugTeaser: {
    question: '{phones} phones, {total} pulls. Oru server kooda illama AWS eppadi ellathayum count pannuchu?',
    spoiler: 'Spoiler: server-e illa da',
    cta: 'Therinjukka AWS Cloud Club-ku vaanga',
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
