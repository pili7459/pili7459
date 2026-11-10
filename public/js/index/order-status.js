// ---------------------------------------- [常數設定與快取讀取] 開始 ----------------------------------------
const STATUS_API_URL = "/api/pos";

if (typeof allOrders === 'undefined') {
    try {
        window.allOrders = JSON.parse(localStorage.getItem('myBreakfastOrders') || '[]');
    } catch (e) {
        window.allOrders = [];
    }
}
// ---------------------------------------- [常數設定與快取讀取] 結束 ----------------------------------------


// ---------------------------------------- [更新浮動號碼牌 FAB 標籤] 開始 ----------------------------------------
window.updateTicketFab = function() {
    const fab = document.getElementById("ticket-fab") || document.getElementById("fab-ticket");
    const badge = document.getElementById("ticket-badge") || document.getElementById("ticket-count-badge") || document.getElementById("order-badge");
    const count = (window.allOrders || []).length;
    
    if (badge) {
        badge.innerText = count;
        badge.style.display = count > 0 ? "inline-block" : "none";
    }
    if (fab) {
        fab.style.display = count > 0 ? "flex" : "none";
    }
};
// ---------------------------------------- [更新浮動號碼牌 FAB 標籤] 結束 ----------------------------------------


// ---------------------------------------- [輪詢查詢訂單最新進度] 開始 ----------------------------------------
window.checkOrderStatus = function() {
    try {
        window.allOrders = JSON.parse(localStorage.getItem('myBreakfastOrders') || '[]');
    } catch (e) {}

    if (!window.allOrders || window.allOrders.length === 0) {
        window.updateTicketFab();
        return;
    }

    let changed = false;
    let completedIds = [];

    const checkPromises = window.allOrders.map(order => {
        if (order.status === 'cancelled') return Promise.resolve();

        const cleanOrderNum = String(order.orderNumber || '').replace(/[^0-9]/g, '').padStart(3, '0');
        const url = `${STATUS_API_URL}?orderNumber=${cleanOrderNum}&orderDate=${order.orderDate || ''}&t=${Date.now()}`;

        return fetch(url)
            .then(r => r.json())
            .then(data => {
                if (!data || data.result === 'not_found') return;

                const st = data.status || "";
                const pay = data.paymentStatus || "";
                const pickup = data.pickupStatus || "";

                const isPaid = pay.includes("已結") || pay.includes("已結帳");
                const isCooked = st.includes("完成");
                const isPickedUp = pickup.includes("已取");

                if (isPaid && isCooked && isPickedUp) {
                    completedIds.push(order.id);
                    changed = true;
                    return;
                }

                let newSt = order.status;
                if (st.includes("取消") || pay.includes("取消")) {
                    newSt = 'cancelled';
                } else if (isCooked) {
                    newSt = 'ready';
                } else if (st.includes("接單")) {
                    newSt = 'accepted';
                }

                if (newSt !== order.status) {
                    order.status = newSt;
                    changed = true;
                }
            })
            .catch(err => {
                console.error("輪詢狀態連線異常:", err);
            });
    });

    Promise.all(checkPromises).then(() => {
        if (completedIds.length > 0) {
            window.allOrders = window.allOrders.filter(o => !completedIds.includes(o.id));
            changed = true;
        }

        if (changed) {
            localStorage.setItem('myBreakfastOrders', JSON.stringify(window.allOrders));
            window.updateTicketFab();

            if (window.allOrders.length === 0) {
                alert("🎉 感謝您的光臨！您的餐點已順利領取完畢。");
                window.showMenuView();
            } else if (document.getElementById("order-status-view") && document.getElementById("order-status-view").style.display === "block") {
                window.renderOrdersList();
            }
        }
    });
};
// ---------------------------------------- [輪詢查詢訂單最新進度] 結束 ----------------------------------------


// ---------------------------------------- [切換菜單與訂單狀態檢視] 開始 ----------------------------------------
window.showMenuView = function() {
    const menuView = document.getElementById("menu-view");
    const statusView = document.getElementById("order-status-view");
    const sideNav = document.getElementById("side-nav");

    if (menuView) menuView.style.display = "block";
    if (statusView) statusView.style.display = "none";
    if (sideNav) sideNav.style.display = "flex";
    window.updateTicketFab();
};

window.showStatusView = function() {
    const menuView = document.getElementById("menu-view");
    const statusView = document.getElementById("order-status-view");
    const sideNav = document.getElementById("side-nav");

    if (menuView) menuView.style.display = "none";
    if (statusView) statusView.style.display = "block";
    if (sideNav) sideNav.style.display = "none";

    window.renderOrdersList();
    window.checkOrderStatus();
};

window.continueOrdering = function() {
    window.showMenuView();
};
// ---------------------------------------- [切換菜單與訂單狀態檢視] 結束 ----------------------------------------


// ---------------------------------------- [渲染進行中訂單明細卡片] 開始 ----------------------------------------
window.renderOrdersList = function() {
    const listDiv = document.getElementById("orders-list");
    if (!listDiv) return;

    if (!window.allOrders || window.allOrders.length === 0) {
        listDiv.innerHTML = "<p style='text-align:center; color:#94a3b8; font-weight:bold; margin-top:50px;'>目前沒有進行中的訂單喔！</p>";
        return;
    }

    listDiv.innerHTML = "";
    window.allOrders.forEach(o => {
        let statusText = "⏳ 等待店家接單";
        if (o.status === 'accepted') statusText = "👩‍🍳 店家已接單";
        if (o.status === 'ready') statusText = "🎉 餐點完成，請取餐！";
        if (o.status === 'cancelled') statusText = "❌ 店家已取消此單";

        listDiv.innerHTML += `
            <div class="order-card ${o.status}">
                <div class="order-header">
                    <div>
                        <span class="order-number">#${o.orderNumber}</span>
                        <div style="font-size:0.85em; color:#64748b; margin-top:4px;">${o.time}</div>
                    </div>
                    <span class="order-status-badge ${o.status}">${statusText}</span>
                </div>
                <div class="order-meta">${o.diningType}</div>
                <pre style="font-family:inherit; white-space:pre-wrap; line-height:1.5;">${o.detailsText}</pre>
            </div>`;
    });
};
// ---------------------------------------- [渲染進行中訂單明細卡片] 結束 ----------------------------------------


// ---------------------------------------- [啟動定時輪詢與初次檢查] 開始 ----------------------------------------
if (window.orderStatusPollingTimer) {
    clearInterval(window.orderStatusPollingTimer);
}
window.orderStatusPollingTimer = setInterval(() => {
    if (typeof window.checkOrderStatus === 'function') {
        window.checkOrderStatus();
    }
}, 3000);

window.checkOrderStatus();
// ---------------------------------------- [啟動定時輪詢與初次檢查] 結束 ----------------------------------------