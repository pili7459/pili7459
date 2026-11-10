// ---------------------------------------- [全域常數與狀態變數] 開始 ----------------------------------------
const GAS_URL = "https://script.google.com/macros/s/AKfycbxTGrRGwx5aNc6LDKOkevrQVRN4Q_n8ERZqzUgi59cuALgED4pIjkcNMFDOIdQIrkcm/exec";
const API_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "/api/pos" : GAS_URL;

let shopSettings = { closedDaysOfWeek: "3", openTime: "06:00", closeTime: "13:00", promoDiscountCode: "vip8888", promoDiscountRate: 0.9, promoDeductCode: "", promoDeductAmount: 0 };
let menuData = []; 
let categories = [];
let cart = {}; 
let allOrders = []; 
let currentModalItem = null; 
let currentCategoryFilter = '全部';
let appliedPromo = null; 
let isChatOpen = false;
let todayMMDD = "";
let tomorrowMMDD = "";
// ---------------------------------------- [全域常數與狀態變數] 結束 ----------------------------------------


// ---------------------------------------- [日期與時間輔助函式] 開始 ----------------------------------------
function getMMDD(dateObj) {
    return String(dateObj.getMonth() + 1).padStart(2, '0') + '/' + String(dateObj.getDate()).padStart(2, '0');
}

function getTodayDateString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getFormattedTime() {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}
// ---------------------------------------- [日期與時間輔助函式] 結束 ----------------------------------------


// ---------------------------------------- [營業與公休狀態檢查] 開始 ----------------------------------------
function isDayClosed(dateObj) {
    const dayOfWeek = String(dateObj.getDay());
    const restDays = (shopSettings.closedDaysOfWeek || "").split(',').map(s => s.trim());
    return restDays.includes(dayOfWeek);
}

function isTodayOver() {
    const now = new Date();
    if (isDayClosed(now)) return true;
    const [closeH, closeM] = (shopSettings.closeTime || "13:00").split(":").map(Number);
    return (now.getHours() > closeH || (now.getHours() === closeH && now.getMinutes() >= closeM));
}
// ---------------------------------------- [營業與公休狀態檢查] 結束 ----------------------------------------


// ---------------------------------------- [載入店家設定與初始化] 開始 ----------------------------------------
function fetchSettingsAndInit() {
    fetch(`${API_URL}?t=${Date.now()}`)
    .then(res => res.json())
    .then(data => {
        if (data.settings) shopSettings = { ...shopSettings, ...data.settings };
        if (data.announcement && data.announcement.trim() !== "") {
            document.getElementById("customer-announcement-banner").style.display = "block";
            document.getElementById("customer-announcement-text").innerText = data.announcement;
        }
        if (data.menu && data.menu.length > 0) {
            menuData = data.menu;
            categories = [...new Set(menuData.map(item => item.category))];
        }
        document.getElementById("loading-screen").style.display = "none";
        initApp(); 
    }).catch(err => {
        document.getElementById("loading-screen").innerHTML = `<h2>⚠️ 無法連線至店家</h2><p>請確認網路連線是否正常。</p>`;
    });
}
window.onload = fetchSettingsAndInit; 
// ---------------------------------------- [載入店家設定與初始化] 結束 ----------------------------------------


// ---------------------------------------- [顧客端應用程式初始化] 開始 ----------------------------------------
function initApp() {
    document.getElementById("menu-view").style.display = "block"; 
    document.getElementById("customer-name").value = localStorage.getItem('savedCustomerName') || "";
    document.getElementById("customer-phone").value = localStorage.getItem('savedCustomerPhone') || "";

    const todayObj = new Date();
    const tomorrowObj = new Date(); 
    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
    todayMMDD = getMMDD(todayObj);
    tomorrowMMDD = getMMDD(tomorrowObj);

    const todayOver = isTodayOver();
    const tomorrowClosed = isDayClosed(tomorrowObj);
    const bannerContainer = document.getElementById("closed-banner-container");
    const submitBtn = document.getElementById("btn-submit-order");

    if (todayOver && tomorrowClosed) {
        bannerContainer.innerHTML = `<div class="closed-danger-banner">🛑 今日營業已結束，且明日為公休日<br><span style="font-size:0.85em; font-weight:normal;">目前全面暫停線上預訂服務，感謝您的支持！</span></div>`;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = "目前暫停預訂服務";
        }
    } else if (todayOver) {
        bannerContainer.innerHTML = `<div class="closed-warning-banner">⚠️ 今日營業已結束，目前僅開放預訂【明日 (${tomorrowMMDD})】餐點</div>`;
    }

    renderPickupDateSelection(todayOver, tomorrowClosed);
    renderNavBar(); 
    renderMenu();
    updateCartUI(); 

    const savedOrders = localStorage.getItem('myBreakfastOrders');
    if (savedOrders) allOrders = JSON.parse(savedOrders);
    updateTicketFab();

    if (allOrders.length > 0) showStatusView(); else showMenuView();   
    
    loadMsgs(); 
    setInterval(() => loadMsgs(false), 5000); 
    setInterval(checkOrderStatus, 4000);
}
// ---------------------------------------- [顧客端應用程式初始化] 結束 ----------------------------------------


// ---------------------------------------- [更新浮動號碼牌按鈕與角標] 開始 ----------------------------------------
function updateTicketFab() {
    const ticketBtn = document.getElementById("fab-ticket");
    const badge = document.getElementById("ticket-badge");
    if (allOrders && allOrders.length > 0) {
        ticketBtn.style.display = "flex";
        badge.innerText = allOrders.length;
        badge.style.display = "flex";
    } else {
        ticketBtn.style.display = "none";
        badge.style.display = "none";
    }
}
// ---------------------------------------- [更新浮動號碼牌按鈕與角標] 結束 ----------------------------------------


// ---------------------------------------- [渲染取餐日期選項] 開始 ----------------------------------------
function renderPickupDateSelection(todayOver, tomorrowClosed) {
    const dateContainer = document.getElementById("date-selection");
    const labelAsap = document.getElementById("label-asap");
    let html = "";

    if (!todayOver) {
        html += `<label><input type="radio" name="pickupDate" value="${todayMMDD}" checked onchange="generateTimeOptions()"> 📅 今天 (${todayMMDD})</label>`;
        labelAsap.style.display = "flex";
    } else {
        labelAsap.style.display = "none";
    }

    if (!tomorrowClosed) {
        const checkedAttr = todayOver ? "checked" : "";
        html += `<label><input type="radio" name="pickupDate" value="${tomorrowMMDD}" ${checkedAttr} onchange="generateTimeOptions()"> 📅 明天 (${tomorrowMMDD})</label>`;
    }

    dateContainer.innerHTML = html;
}
// ---------------------------------------- [渲染取餐日期選項] 結束 ----------------------------------------