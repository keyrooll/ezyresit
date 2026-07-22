const COMPANY_CONFIG = {
  id: 'ezybakery',
  name: 'Ezy Bakery',
  shortName: 'EzyBakery',
  themeColor: '#f59e0b',

  clientId: '27154479564-ufljm52nmlh4gg7ie54knphff44jvrrq.apps.googleusercontent.com',
  sheetId: '1tEn5oSoYrFsiDQ_CtQnLSVHMk5vplhjvdP0XOvwY_I4',
  skuSheetId: '1tEn5oSoYrFsiDQ_CtQnLSVHMk5vplhjvdP0XOvwY_I4',
  driveFolderName: 'EzyBakery Receipts',
  driveFolderRootId: '1GmJWOikquZb-As-XdJAYgZao_EXQcfY-',

  workerUrl: 'https://ezyresit.keyrooll.workers.dev/',
  superAdmin: 'keyrooll@gmail.com',
  accountants: [],

  // Sell-side customers — the Ezydurian branches EzyBakery supplies to
  branches: ['Bangi Cafe','Bangi Durian','Batu Caves','Putrajaya','Shah Alam','TTDI'],
  branchColors: ['#f59e0b','#3b82f6','#1a7a4a','#8b5cf6','#2d9e62','#ef4444'],
  branchAddresses: {
    'Bangi Cafe': 'EzyCafe Bangi\nJalan 3/69, Persiaran Universiti, Seksyen 3 Bandar Baru Bangi, Bandar Baru Bangi, Selangor',
    'Bangi Durian': 'Ezydurian Bangi\nJalan 3/69, Persiaran Universiti, Seksyen 3 Bandar Baru Bangi, Bandar Baru Bangi, Selangor',
    'Batu Caves': 'Ezydurian Batu Caves HQ\n1, Jalan TIB 1/13, Taman Industri Bolton, 68100 Batu Caves, Selangor',
    'Putrajaya': 'Ezydurian Putrajaya\nTaman Warisan Pertanian Putrajaya, Jalan P16, Presint 16, 62000 Putrajaya',
    'Shah Alam': 'Ezydurian Shah Alam\n27, Jalan Opera E U2/E, Taman TTDI Jaya, 40150 Shah Alam, Selangor',
    'TTDI': 'Ezydurian TTDI\n34, Jalan Datuk Sulaiman, Taman Tun Dr Ismail, 60000 Kuala Lumpur',
  },

  categories: ['COGS','UTILITIES','RENTAL','RENOVATION','MARKETING','TRANSPORTATION','GAS','MANAGEMENT','OTHERS'],
  catEmoji: {COGS:'🛒',UTILITIES:'💡',RENTAL:'🏠',RENOVATION:'🔨',MARKETING:'📣',TRANSPORTATION:'🚗',GAS:'🔥',MANAGEMENT:'📋',OTHERS:'📦'},
  catColors: {'COGS':'#1a7a4a','UTILITIES':'#f59e0b','RENTAL':'#3b82f6','RENOVATION':'#8b5cf6','MARKETING':'#ec4899','TRANSPORTATION':'#6b7280','GAS':'#ef4444','MANAGEMENT':'#14b8a6','OTHERS':'#d97706'},

  accountCodes: [
    {code:'101',name:'SUPPLIER'},{code:'102',name:'PURCHASE'},{code:'103',name:'REFUND'},
    {code:'106',name:'SERVICE CHARGES'},{code:'108',name:'OTHER MONEY OUT'},{code:'202',name:'MARKETING'},
    {code:'301',name:'TRANSPORTATION'},{code:'402',name:'UPKEEP STORE'},{code:'403',name:'RENOVATION'},
    {code:'501',name:'RENTAL'},{code:'502',name:'WATER'},{code:'503',name:'INTERNET'},
    {code:'504',name:'TNB'},{code:'505',name:'PHONE'},{code:'506',name:'GAS'},
    {code:'601',name:'STAFF SALARY'},{code:'602',name:'ALLOWANCE'},{code:'603',name:'KWSP'},
    {code:'609',name:'STAFF REFRESHMENT'},{code:'701',name:'BANK CHARGES'},{code:'702',name:'GENERAL EXPENSES'}
  ],

  // Category -> default account code (staff can change on the receipt)
  catToAccount: {
    'COGS':'102','UTILITIES':'502','RENTAL':'501','RENOVATION':'403','MARKETING':'202',
    'TRANSPORTATION':'301','GAS':'506','MANAGEMENT':'702','OTHERS':'108'
  },

  // AKAUN — payment sources for Bayaran routing (managed in Google Sheet 'Akaun' tab)
  paymentAccounts: [
    {id:'kad',            name:'Kad Kredit Bakery',     type:'credit_card'},
    {id:'tunai_staff',    name:'Tunai Staff',           type:'staff_claim'},
    {id:'supplier_credit',name:'Supplier Credit',       type:'supplier_credit'},
    {id:'direct',         name:'Direct (Bank/DuitNow)', type:'direct'}
  ],

  defaultSuppliers: []
};
