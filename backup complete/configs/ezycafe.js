const COMPANY_CONFIG = {
  id: 'ezycafe',
  name: 'Ezy Cafe',
  shortName: 'EzyCafe',
  themeColor: '#8b5cf6',

  clientId: '27154479564-ufljm52nmlh4gg7ie54knphff44jvrrq.apps.googleusercontent.com',
  sheetId: '185oycpZwZDn0sl8cQCTmycrPGY084vL43aJXTzy6TNY',
  skuSheetId: '185oycpZwZDn0sl8cQCTmycrPGY084vL43aJXTzy6TNY',
  driveFolderName: 'EzyCafe Receipts',
  driveFolderRootId: '1GmJWOikquZb-As-XdJAYgZao_EXQcfY-',

  workerUrl: 'https://ezyresit.keyrooll.workers.dev/',
  superAdmin: 'keyrooll@gmail.com',
  accountants: [],

  branches: ['Bangi Cafe','TTDI','Shah Alam'],
  branchColors: ['#8b5cf6','#3b82f6','#2d9e62'],

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
  defaultSuppliers: []
};
