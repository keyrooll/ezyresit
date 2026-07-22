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

  // Single branch for now
  branches: ['Ezy Cafe'],
  branchColors: ['#8b5cf6'],

  // Phase 1 expense categories (AI auto-categorization, staff can override)
  categories: ['COGS','CLEANING','OFFICE','STAFF MEAL','TRANSPORT','VEHICLE','REPAIR','RENOVATION','MARKETING','UTILITY','UNCLASSIFIED'],
  catEmoji: {COGS:'🛒',CLEANING:'🧼',OFFICE:'🖇️','STAFF MEAL':'🍱',TRANSPORT:'🚗',VEHICLE:'🔧',REPAIR:'🛠️',RENOVATION:'🔨',MARKETING:'📣',UTILITY:'💡',UNCLASSIFIED:'❓'},
  catColors: {COGS:'#1a7a4a',CLEANING:'#06b6d4',OFFICE:'#6366f1','STAFF MEAL':'#f59e0b',TRANSPORT:'#6b7280',VEHICLE:'#0ea5e9',REPAIR:'#8b5cf6',RENOVATION:'#a855f7',MARKETING:'#ec4899',UTILITY:'#eab308',UNCLASSIFIED:'#ef4444'},

  // Category -> default account code (staff can change on the receipt)
  catToAccount: {
    'COGS':'102','CLEANING':'401','OFFICE':'702','STAFF MEAL':'609','TRANSPORT':'301',
    'VEHICLE':'302','REPAIR':'402','RENOVATION':'403','MARKETING':'202','UTILITY':'501','UNCLASSIFIED':'108'
  },

  accountCodes: [
    {code:'101',name:'SUPPLIER'},{code:'102',name:'PURCHASE (COGS)'},{code:'103',name:'REFUND'},
    {code:'108',name:'OTHER / UNCLASSIFIED'},{code:'202',name:'MARKETING'},
    {code:'301',name:'TRANSPORT'},{code:'302',name:'VEHICLE MAINTENANCE'},
    {code:'401',name:'CLEANING SUPPLIES'},{code:'402',name:'REPAIR & MAINTENANCE'},{code:'403',name:'RENOVATION'},
    {code:'501',name:'UTILITIES'},{code:'609',name:'STAFF MEAL'},{code:'702',name:'OFFICE / GENERAL'}
  ],

  // AKAUN — payment sources. type drives how a purchase is routed for payment:
  //   credit_card    -> Credit Card Payable (settle to HQ monthly)
  //   staff_claim    -> Staff Claim / reimbursement (HQ pays staff back)
  //   supplier_credit-> Supplier outstanding + due date (default 7 days)
  //   direct         -> Paid immediately (bank/DuitNow/HQ cash)
  paymentAccounts: [
    {id:'kad',            name:'Kad Kredit Cafe',       type:'credit_card'},
    {id:'tunai_staff',    name:'Tunai Staff',           type:'staff_claim'},
    {id:'supplier_credit',name:'Supplier Credit',       type:'supplier_credit'},
    {id:'direct',         name:'Direct (Bank/DuitNow)', type:'direct'}
  ],

  defaultSuppliers: []
};
