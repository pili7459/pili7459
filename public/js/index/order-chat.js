// ---------------------------------------- [顧客端客服系統] 開始 ----------------------------------------
// 1. 開啟客服對話視窗
window.openChat = function() {
    const modal = document.getElementById("chat-modal");
    if (!modal) return;

    modal.style.display = "flex";
    isChatOpen = true;

    // 清除右上角新訊息紅點提示
    const badge = document.getElementById("fab-badge");
    if (badge) badge.style.display = "none";

    const savedPhone = localStorage.getItem('chatCustomerPhone') || localStorage.getItem('savedCustomerPhone') || "";
    const savedName = localStorage.getItem('chatCustomerName') || localStorage.getItem('savedCustomerName') || "";

    if (savedPhone) {
        // 曾輸入過資訊，直接進入對話區
        document.getElementById("chat-login-area").style.display = "none";
        document.getElementById("chat-messages-area").style.display = "flex";
        document.getElementById("chat-input-area").style.display = "flex";
        loadMsgs(false);
    } else {
        // 首次使用，顯示姓名與手機填寫區
        document.getElementById("chat-login-area").style.display = "flex";
        document.getElementById("chat-messages-area").style.display = "none";
        document.getElementById("chat-input-area").style.display = "none";
        document.getElementById("chat-name").value = savedName;
        document.getElementById("chat-phone").value = savedPhone;
    }
};

// 2. 關閉客服對話視窗
window.closeChat = function() {
    const modal = document.getElementById("chat-modal");
    if (modal) modal.style.display = "none";
    isChatOpen = false;
};

// 3. 首次輸入姓名手機，進入對話
window.startChat = function() {
    const name = document.getElementById("chat-name").value.trim();
    const phone = document.getElementById("chat-phone").value.trim();

    if (!name) { alert("請輸入您的姓名"); return; }
    if (!phone) { alert("請輸入您的手機號碼"); return; }

    localStorage.setItem('chatCustomerName', name);
    localStorage.setItem('chatCustomerPhone', phone);
    localStorage.setItem('savedCustomerName', name);
    localStorage.setItem('savedCustomerPhone', phone);

    document.getElementById("chat-login-area").style.display = "none";
    document.getElementById("chat-messages-area").style.display = "flex";
    document.getElementById("chat-input-area").style.display = "flex";

    loadMsgs(false);
};

// 4. 切換身份 / 更換手機號碼
window.logoutChat = function() {
    localStorage.removeItem('chatCustomerPhone');
    document.getElementById("chat-login-area").style.display = "flex";
    document.getElementById("chat-messages-area").style.display = "none";
    document.getElementById("chat-input-area").style.display = "none";
    document.getElementById("chat-messages-area").innerHTML = "";
};

// 5. 輪詢與載入歷史對話訊息
let lastMsgCount = 0;
window.loadMsgs = function(showBadge = true) {
    const phone = localStorage.getItem('chatCustomerPhone') || localStorage.getItem('savedCustomerPhone');
    if (!phone) return;

    fetch(`${API_URL}?action=getCustomerMsgs&phone=${encodeURIComponent(phone)}&t=${Date.now()}`)
        .then(res => res.json())
        .then(data => {
            if (data.result === 'success' && Array.isArray(data.messages)) {
                const msgs = data.messages;
                const msgBox = document.getElementById("chat-messages-area");

                if (msgs.length > lastMsgCount && !isChatOpen && showBadge) {
                    const badge = document.getElementById("fab-badge");
                    if (badge) badge.style.display = "flex";
                }

                if (isChatOpen && msgBox) {
                    let html = "";
                    msgs.forEach(m => {
                        const isOwner = (m.sender === 'owner');
                        html += `
                            <div class="chat-row ${isOwner ? 'owner-side' : 'customer-side'}">
                                ${isOwner ? `<div class="chat-bubble owner">🏪 ${m.text || m.content}</div>` : `<div class="chat-bubble customer">${m.text || m.content}</div>`}
                            </div>
                        `;
                    });
                    msgBox.innerHTML = html;
                    msgBox.scrollTop = msgBox.scrollHeight;
                }
                lastMsgCount = msgs.length;
            }
        })
        .catch(() => {});
};

// 6. 顧客傳送訊息給店家
window.sendChatMsg = function() {
    const input = document.getElementById("chat-text");
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const phone = localStorage.getItem('chatCustomerPhone') || localStorage.getItem('savedCustomerPhone') || "";
    const name = localStorage.getItem('chatCustomerName') || localStorage.getItem('savedCustomerName') || "客人";

    input.value = "";

    const msgBox = document.getElementById("chat-messages-area");
    if (msgBox) {
        msgBox.innerHTML += `
            <div class="chat-row customer-side">
                <div class="chat-bubble customer">${text}</div>
            </div>
        `;
        msgBox.scrollTop = msgBox.scrollHeight;
    }

    fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            action: "sendCustomerMessage",
            customerName: name,
            customerPhone: phone,
            sender: "customer",
            content: text
        })
    })
    .then(res => res.json())
    .then(() => {
        loadMsgs(false);
    })
    .catch(() => {
        alert("訊息傳送失敗，請檢查網路連線");
    });
};
// ---------------------------------------- [顧客端客服系統] 結束 ----------------------------------------