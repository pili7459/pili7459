// ---------------------------------------- [顧客端客服系統] 開始 ----------------------------------------
function parseChatDateAndTime(rawTime) {
    const now = new Date();
    const todayStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
    const nowTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (!rawTime) return { date: todayStr, time: nowTimeStr };

    const str = String(rawTime).trim();
    const parts = str.split(/\s+/);
    if (parts.length >= 2) {
        let d = parts[0];
        if (/^\d{1,2}\/\d{1,2}$/.test(d)) d = `${now.getFullYear()}/${d}`;
        let t = parts[1].slice(0, 5);
        return { date: d, time: t };
    }
    return { date: todayStr, time: str.slice(0, 5) };
}

// 1. 開啟客服對話視窗
window.openChat = function() {
    const modal = document.getElementById("chat-modal");
    if (!modal) return;

    modal.style.display = "flex";
    isChatOpen = true;

    // 清除右上角新訊息紅點提示
    // 清除右上角新訊息紅點與閃爍提示
  const badge = document.getElementById("fab-badge");
  const chatFab = document.querySelector(".fab-chat");
  if (badge) badge.style.display = "none";
  if (chatFab) chatFab.classList.remove("has-unread");

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

		const ownerMsgsCount = msgs.filter(m => m.sender === 'owner').length;
                const savedReadOwnerCount = parseInt(localStorage.getItem('chatReadOwnerCount') || '-1', 10);
                const chatFab = document.querySelector(".fab-chat");
                const badge = document.getElementById("fab-badge");

                if (isChatOpen) {
                    localStorage.setItem('chatReadOwnerCount', String(ownerMsgsCount));
                    if (badge) badge.style.display = "none";
                    if (chatFab) chatFab.classList.remove("has-unread");
                } else {
                    const baseCount = savedReadOwnerCount === -1 ? (showBadge ? lastMsgCount : ownerMsgsCount) : savedReadOwnerCount;
                    const unread = Math.max(0, ownerMsgsCount - baseCount);
                    if (unread > 0) {
                        if (badge) {
                            badge.innerText = unread > 99 ? '99+' : unread;
                            badge.style.display = "flex";
                        }
                        if (chatFab) chatFab.classList.add("has-unread");
                    }
                }

                if (isChatOpen && msgBox) {
                    let html = "";
                    let lastDate = "";
                    msgs.forEach(m => {
                        const isOwner = (m.sender === 'owner');
                        const { date, time } = parseChatDateAndTime(m.time || m.timestamp || m.date);

                        if (date !== lastDate) {
                            lastDate = date;
                            html += `
                                <div style="display:flex; justify-content:center; margin:8px 0;">
                                    <span style="background:rgba(15,23,42,0.12); color:#475569; font-size:0.8em; font-weight:bold; padding:4px 14px; border-radius:16px;">${date}</span>
                                </div>
                            `;
                        }

                        html += `
                            <div class="chat-row ${isOwner ? 'owner-side' : 'customer-side'}">
                                ${isOwner 
                                    ? `<div class="chat-bubble owner">🏪 ${m.text || m.content}</div><div style="font-size:0.75em; color:#64748b; white-space:nowrap;">${time}</div>` 
                                    : `<div style="font-size:0.75em; color:#64748b; white-space:nowrap;">${time}</div><div class="chat-bubble customer">${m.text || m.content}</div>`
                                }
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
    const { date, time } = parseChatDateAndTime("");

    input.value = "";

    const msgBox = document.getElementById("chat-messages-area");
    if (msgBox) {
        if (!msgBox.innerHTML.includes(`>${date}</span>`)) {
            msgBox.innerHTML += `
                <div style="display:flex; justify-content:center; margin:8px 0;">
                    <span style="background:rgba(15,23,42,0.12); color:#475569; font-size:0.8em; font-weight:bold; padding:4px 14px; border-radius:16px;">${date}</span>
                </div>
            `;
        }
        msgBox.innerHTML += `
            <div class="chat-row customer-side">
                <div style="font-size:0.75em; color:#64748b; white-space:nowrap;">${time}</div>
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