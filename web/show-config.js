// ✏️ EDIT THIS FILE to customise the show (departments, colours, club link).
window.SHOW = {
  title: '300 phones, one button',
  // What the big display is called on phones during Power-Up ('SCREEN', 'TV' or 'PROJECTOR')
  screenWord: 'SCREEN',
  club: 'AWS Cloud Club · RGU',
  // Link students land on at the very end (Google Form / WhatsApp group / Instagram)
  joinUrl: 'https://forms.gle/REPLACE-ME',

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
