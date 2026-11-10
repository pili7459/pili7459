// ---------------------------------------- [全域狀態物件定義] 開始 ----------------------------------------
export const state = {
  apiUrl: '/api/pos',
  allOrders: [],
  allMessages: [],
  chatGroups: {},
  currentChatPhone: null,
  currentTab: 'new-order',
  currentView: 'checkout',
  selectedOrder: null,
  tenderedAmount: '',
  appMode: 'checkout', // 'checkout' | 'expense' | 'income'
  expenseQuickWordsList: [],
  incomeQuickWordsList: [],
  employeeList: [],
  clockStatusMap: {},
  systemPassword: '1234',
  storeAnnouncement: '',
  globalSettings: {},
  appliedPromo: null,
  autoPrintedOrders: JSON.parse(localStorage.getItem('autoPrintedOrders') || '[]'),
  menuData: [],
  categories: [],
  cart: {},
  currentModalItem: null,
  currentCategoryFilter: '全部',
  totalMsgCount: -1,
  currentEditItem: null,
  msTargetItemId: null,
  msMode: '上架'
};
// ---------------------------------------- [全域狀態物件定義] 結束 ----------------------------------------