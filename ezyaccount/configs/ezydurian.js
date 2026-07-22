// =====================
// EZY DURIAN CONFIG
// =====================
const COMPANY_CONFIG = {
  id: 'ezydurian',
  name: 'Ezy Durian',
  shortName: 'EzyDurian',
  logo: null, // path to logo image if any
  themeColor: '#1a7a4a',

  // Google
  clientId: '27154479564-ufljm52nmlh4gg7ie54knphff44jvrrq.apps.googleusercontent.com',
  sheetId: '1u3H6D57vx7jahjc40S9u_qwhCXduMQ7gMTZyoP7J8Z8',
  skuSheetId: '1u3H6D57vx7jahjc40S9u_qwhCXduMQ7gMTZyoP7J8Z8',
  driveFolderName: 'EzyResit Receipts',
  driveFolderRootId: '1GmJWOikquZb-As-XdJAYgZao_EXQcfY-',

  // AI
  workerUrl: 'https://ezyresit.keyrooll.workers.dev/',

  // Access
  superAdmin: 'keyrooll@gmail.com',
  accountants: [],

  // Branches
  branches: ['Batu Caves','Shah Alam','Putrajaya','TTDI'],
  branchColors: ['#1a7a4a','#2d9e62','#3b82f6','#8b5cf6'],
  branchAddresses: {
    'Batu Caves': 'Ezydurian Batu Caves HQ\n1, Jalan TIB 1/13, Taman Industri Bolton, 68100 Batu Caves, Selangor',
    'Shah Alam': 'Ezydurian Shah Alam\n27, Jalan Opera E U2/E, Taman TTDI Jaya, 40150 Shah Alam, Selangor',
    'Putrajaya': 'Ezydurian Putrajaya\nTaman Warisan Pertanian Putrajaya, Jalan P16, Presint 16, 62000 Putrajaya',
    'TTDI': 'Ezydurian TTDI\n34, Jalan Datuk Sulaiman, Taman Tun Dr Ismail, 60000 Kuala Lumpur',
  },

  // Categories
  categories: ['COGS','UTILITIES','RENTAL','RENOVATION','MARKETING','TRANSPORTATION','GAS','MANAGEMENT','OTHERS'],
  catEmoji: {COGS:'🛒',UTILITIES:'💡',RENTAL:'🏠',RENOVATION:'🔨',MARKETING:'📣',TRANSPORTATION:'🚗',GAS:'🔥',MANAGEMENT:'📋',OTHERS:'📦'},
  catColors: {'COGS':'#1a7a4a','UTILITIES':'#f59e0b','RENTAL':'#3b82f6','RENOVATION':'#8b5cf6','MARKETING':'#ec4899','TRANSPORTATION':'#6b7280','GAS':'#ef4444','MANAGEMENT':'#14b8a6','OTHERS':'#d97706'},

  // Account codes
  accountCodes: [
    {code:'101',name:'SUPPLIER'},{code:'102',name:'PURCHASE'},{code:'103',name:'REFUND'},
    {code:'106',name:'SERVICE CHARGES'},{code:'108',name:'OTHER MONEY OUT'},{code:'202',name:'MARKETING'},
    {code:'301',name:'TRANSPORTATION'},{code:'402',name:'UPKEEP STORE'},{code:'403',name:'RENOVATION'},
    {code:'501',name:'RENTAL'},{code:'502',name:'WATER'},{code:'503',name:'INTERNET'},
    {code:'504',name:'TNB'},{code:'505',name:'PHONE'},{code:'506',name:'GAS'},
    {code:'601',name:'STAFF SALARY'},{code:'602',name:'ALLOWANCE'},{code:'603',name:'KWSP'},
    {code:'609',name:'STAFF REFRESHMENT'},{code:'701',name:'BANK CHARGES'},{code:'702',name:'GENERAL EXPENSES'}
  ],

  defaultSuppliers: []
};
