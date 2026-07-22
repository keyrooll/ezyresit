const COMPANY_CONFIG = {
  id: 'ezycashier',
  name: 'Ezy Cashier',
  shortName: 'EzyCashier',
  themeColor: '#16a34a',

  clientId: '27154479564-ufljm52nmlh4gg7ie54knphff44jvrrq.apps.googleusercontent.com',
  sheetId: '10zrv3S5Yetz8M3zqZDpu70bxDbJDHJWSvKOY7kNwWmE',
  skuSheetId: '10zrv3S5Yetz8M3zqZDpu70bxDbJDHJWSvKOY7kNwWmE',
  driveFolderName: 'EzyCashier',
  driveFolderRootId: '1GmJWOikquZb-As-XdJAYgZao_EXQcfY-',

  workerUrl: 'https://ezyresit.keyrooll.workers.dev/',
  superAdmin: 'keyrooll@gmail.com',
  accountants: [],

  branches: ['Batu Caves','Bangi','Shah Alam'],
  branchColors: ['#16a34a','#3b82f6','#f59e0b'],

  // Cash management config
  defaultFloat: 500,
  // Fixed non-cash payment methods tracked as receivables (accountant ticks when received)
  // key -> {label, expectedDays} (expected date = closing date + expectedDays)
  payMethods: [
    {key:'card',     label:'Card',     expectedDays:1},
    {key:'qr',       label:'QR Pay',   expectedDays:1},
    {key:'grab',     label:'Grab',     expectedDays:7},
    {key:'transfer', label:'Transfer', expectedDays:0}
  ],
  // Alert thresholds (days)
  alerts: { cashDays:3, cardDays:3, qrDays:1, grabDays:9, transferDays:1 }
};
