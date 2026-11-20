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
