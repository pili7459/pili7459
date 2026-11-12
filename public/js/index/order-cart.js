// ---------------------------------------- [重設取餐時間選項] 開始 ----------------------------------------
window.resetTimeSelection = function() {
    const todayOver = isTodayOver();
    const rAsap = document.querySelector('input[name="timeType"][value="ASAP"]');
    const rSpec = document.querySelector('input[name="timeType"][value="SPECIFIC"]');

    if (rAsap) rAsap.checked = false;
    if (rSpec) rSpec.checked = false;

    document.getElementById("specific-time-container").style.display = "none";
    document.getElementById("pickup-time").value = "";

    if (todayOver) {
        if (rSpec) rSpec.checked = true;
        handleTimeTypeChange();
    }
};
// ---------------------------------------- [重設取餐時間選項] 結束 ----------------------------------------


// ---------------------------------------- [商品分類篩選與切換] 開始 ----------------------------------------
window.filterCategory = function(categoryName) {
    currentCategoryFilter = categoryName;
    renderNavBar(); 
    
    if (categoryName === '購物車') {
        document.getElementById("cart-section").style.display = "block";
        document.querySelectorAll(".category-section").forEach(g => g.style.display = "none");
        resetTimeSelection();
    } else {
        document.getElementById("cart-section").style.display = "none";
        document.querySelectorAll(".category-section").forEach(g => {
            g.style.display = (categoryName === '全部' || g.id === `section-${categoryName}`) ? "block" : "none";
        });
    }
    document.getElementById("main-content").scrollTop = 0; 
};
// ---------------------------------------- [商品分類篩選與切換] 結束 ----------------------------------------


// ---------------------------------------- [更新購物車品項與數量] 開始 ----------------------------------------
window.updateCart = function(cartKey, delta) {
    if (cart[cartKey]) {
        cart[cartKey].qty += delta;
        if (cart[cartKey].qty <= 0) delete cart[cartKey];
    }
    updateCartUI();
    if (typeof window.updateItemBadges === 'function') {
        window.updateItemBadges();
    }
};
// ---------------------------------------- [更新購物車品項與數量] 結束 ----------------------------------------


// ---------------------------------------- [更新購物車介面與金額計算] 開始 ----------------------------------------
function categorizeCustomerOrderSections(item) {
    const nameLines = (item.name || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const comboTitle = nameLines[0] || '';
    const subItems = nameLines.slice(1);

    let mainItemName = '';
    let drinkItemName = '';
    let rawSideItems = [];

    if (subItems.length > 0) {
        let foundDrink = false;
        subItems.forEach(line => {
            let isDrink = line.includes('飲') || line.includes('茶') || line.includes('咖啡') || line.includes('豆漿') || line.includes('拿鐵') || line.includes('冬瓜');
            if (isDrink && !foundDrink) {
                drinkItemName = line;
                foundDrink = true;
            } else if (!foundDrink) {
                if (!mainItemName) mainItemName = line;
                else rawSideItems.push(line);
            } else {
                rawSideItems.push(line);
            }
        });
    } else {
        mainItemName = comboTitle;
    }

    let mainModifiers = [];
    let drinkModifiers = [];
    let drinkPriceAdd = 0;
    let sideGroupsMap = {};
    let extraAddons = [];

    const opts = item.structuredOptions || [];
    opts.forEach(opt => {
        const title = opt.groupTitle || '';
        let extraText = opt.price > 0 ? `+${opt.price}` : '';
        let displayMod = `${opt.name}${extraText}`;

        if (title.includes('主餐')) {
            mainModifiers.push(displayMod);
        } else if (title.includes('飲料') || title.includes('飲品')) {
            drinkItemName = opt.name;
            drinkPriceAdd = opt.price || 0;
            if (opt.subModifiers && opt.subModifiers.length > 0) {
                drinkModifiers.push(...opt.subModifiers);
            }
        } else if (title.includes('加購') || title.includes('加點')) {
            extraAddons.push(displayMod);
        } else if (title.includes('副餐')) {
            let match = title.match(/副餐(\d+)/);
            let sideIdx = match ? parseInt(match[1], 10) : 1;
            if (!sideGroupsMap[sideIdx]) sideGroupsMap[sideIdx] = [];
            sideGroupsMap[sideIdx].push(displayMod);
        } else {
            if (title.includes('口感') || title.includes('加料') || title.includes('減料') || title.includes('熟度') || title.includes('口味') || 			title.includes('醬')) {
              mainModifiers.push(displayMod);
            } else if (title.includes('冰') || title.includes('糖')) {
                drinkModifiers.push(displayMod);
            } else {
                if (!sideGroupsMap[1]) sideGroupsMap[1] = [];
                sideGroupsMap[1].push(displayMod);
            }
        }
    });

    let sideList = [];
    let maxSideCount = Math.max(rawSideItems.length, Object.keys(sideGroupsMap).length);
    for (let i = 1; i <= maxSideCount; i++) {
        let name = rawSideItems[i - 1] || (Object.keys(sideGroupsMap).length > 1 ? `副餐${i}` : '副餐');
        let mods = sideGroupsMap[i] || [];
        sideList.push({ name, mods });
    }

    return {
        isCombo: subItems.length > 0,
        comboTitle: subItems.length > 0 ? comboTitle : '',
        mainItemName,
        mainModifiers,
        drinkItemName,
        drinkPriceAdd,
        drinkModifiers,
        sideList,
        extraAddons,
        note: item.note || ''
    };
}

window.updateCartUI = function() {
    const cartDiv = document.getElementById("cart-items"); 
    const checkoutOptions = document.getElementById("checkout-options"); 
    const totalSpan = document.getElementById("total-price");
    
    let cartQty = 0;
    for(let key in cart) { cartQty += cart[key].qty; }
    const fabCart = document.getElementById("fab-cart");
    const cartBadge = document.getElementById("cart-badge");
    
    if (cartQty > 0) {
        fabCart.style.display = "flex";
        cartBadge.innerText = cartQty;
    } else {
        fabCart.style.display = "none";
    }
    
    if (Object.keys(cart).length === 0) { 
        cartDiv.innerHTML = '<p style="text-align:center; color:#94a3b8; font-weight:bold; padding:20px 0;">購物車是空的喔！</p>'; 
        totalSpan.innerText = "0"; 
        checkoutOptions.style.display = "none"; 
        document.getElementById("display-subtotal").style.display = "none";
        document.getElementById("discount-display").innerText = "";
        return; 
    }
    
    checkoutOptions.style.display = "block"; 
    cartDiv.innerHTML = ""; 
    let subtotal = 0;

    for (let cartKey in cart) {
        let item = cart[cartKey]; 
        let itemTotal = item.price * item.qty; 
        subtotal += itemTotal;
        
        const sec = categorizeCustomerOrderSections(item);
        let lines = [];

        if (sec.isCombo) {
            lines.push(`<div style="font-size:1.15em; font-weight:900; color:#0f172a; margin-bottom:4px;">${sec.comboTitle}</div>`);
            if (sec.mainItemName) {
                lines.push(`<div style="font-size:0.95em; font-weight:800; color:#1e293b; padding-left:6px;">▸ ${sec.mainItemName}</div>`);
                if (sec.mainModifiers.length > 0) {
                    lines.push(`<div style="font-size:0.88em; font-weight:700; color:#475569; padding-left:20px; margin-bottom:2px;">└ ${sec.mainModifiers.join(' / ')}</div>`);
                }
            }
        } else {
            lines.push(`<div style="font-size:1.1em; font-weight:900; color:#0f172a; margin-bottom:2px;">${sec.mainItemName}</div>`);
            if (sec.mainModifiers.length > 0) {
                lines.push(`<div style="font-size:0.9em; font-weight:700; color:#475569; padding-left:12px; margin-bottom:2px;">└ ${sec.mainModifiers.join(' / ')}</div>`);
            }
        }

        if (sec.drinkItemName) {
            let drinkAdd = sec.drinkPriceAdd > 0 ? ` +${sec.drinkPriceAdd}` : '';
            lines.push(`<div style="font-size:0.95em; font-weight:800; color:#1e293b; padding-left:${sec.isCombo ? '6px' : '0'};">▸ ${sec.drinkItemName}${drinkAdd}</div>`);
            if (sec.drinkModifiers.length > 0) {
                lines.push(`<div style="font-size:0.88em; font-weight:700; color:#475569; padding-left:${sec.isCombo ? '20px' : '12px'}; margin-bottom:2px;">└ ${sec.drinkModifiers.join(' / ')}</div>`);
            }
        }

        sec.sideList.forEach(s => {
            lines.push(`<div style="font-size:0.95em; font-weight:800; color:#1e293b; padding-left:${sec.isCombo ? '6px' : '0'};">▸ ${s.name}</div>`);
            if (s.mods.length > 0) {
                lines.push(`<div style="font-size:0.88em; font-weight:700; color:#475569; padding-left:${sec.isCombo ? '20px' : '12px'}; margin-bottom:2px;">└ ${s.mods.join(' / ')}</div>`);
            }
        });

        if (sec.extraAddons.length > 0) {
            lines.push(`<div style="font-size:0.9em; font-weight:800; color:#ea580c; margin-top:3px;">＋加購：${sec.extraAddons.join(' / ')}</div>`);
        }

        if (sec.note) {
            lines.push(`<div style="font-size:0.88em; color:#0284c7; font-weight:bold; margin-top:4px;">※ 備註：${sec.note}</div>`);
        }

        let blockHtml = lines.join('');

        cartDiv.innerHTML += `
            <div class="cart-item" style="padding:12px 4px; border-bottom:1px solid #e2e8f0;">
                <div style="width:100%; line-height:1.55; word-break:break-word;">
                    ${blockHtml}
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; padding-top:8px; border-top:1px dashed #f1f5f9;">
                    <div class="qty-control" style="display:flex; align-items:center; gap:8px;">
                        <button class="qty-btn" onclick="updateCart('${cartKey}', -1)">-</button>
                        <span class="qty-number" style="min-width:24px; text-align:center; font-weight:bold;">${item.qty}</span>
                        <button class="qty-btn" onclick="updateCart('${cartKey}', 1)">+</button>
                    </div>
                    <div style="font-weight: 900; font-size: 1.2em; color:#ea580c;">$${itemTotal}</div>
                </div>
            </div>`;
    }
    
    let finalTotal = subtotal;
    let discountAmt = 0;
    if (appliedPromo && subtotal > 0) {
        if (appliedPromo.type === 'discount') {
            discountAmt = Math.round(subtotal * (1 - appliedPromo.rate));
        } else {
            discountAmt = Math.min(subtotal, appliedPromo.amount);
        }
        finalTotal = Math.max(0, subtotal - discountAmt);
        
        document.getElementById("display-subtotal").style.display = "inline";
        document.getElementById("display-subtotal").innerText = "$" + subtotal;
        document.getElementById("discount-display").innerText = `🎟️ 優惠已折抵 -$${discountAmt}`;
    } else {
        document.getElementById("display-subtotal").style.display = "none";
        document.getElementById("discount-display").innerText = "";
    }
    
    totalSpan.innerText = finalTotal;
};
// ---------------------------------------- [更新購物車介面與金額計算] 結束 ----------------------------------------


// ---------------------------------------- [套用促銷優惠碼] 開始 ----------------------------------------
window.applyPromoCode = function() {
    const inputEl = document.getElementById("promo-code-input");
    const input = inputEl.value.trim();
    const msgDiv = document.getElementById("promo-message");
    
    inputEl.value = "";

    if (!input) { 
        msgDiv.innerText = "⚠️ 請輸入優惠碼"; 
        msgDiv.style.color = "#ef4444"; 
        appliedPromo = null; 
        updateCartUI(); 
        return; 
    }

    if (shopSettings.promoDiscountCode && input.toLowerCase() === shopSettings.promoDiscountCode.toLowerCase()) {
        appliedPromo = { type: 'discount', rate: shopSettings.promoDiscountRate, code: input };
        msgDiv.innerText = `✅ 套用成功！享整單打折優惠`;
        msgDiv.style.color = "#10b981";
    } else if (shopSettings.promoDeductCode && input.toLowerCase() === shopSettings.promoDeductCode.toLowerCase()) {
        appliedPromo = { type: 'deduct', amount: shopSettings.promoDeductAmount, code: input };
        msgDiv.innerText = `✅ 套用成功！現折 $${shopSettings.promoDeductAmount} 元`;
        msgDiv.style.color = "#10b981";
    } else {
        appliedPromo = null;
        msgDiv.innerText = "❌ 優惠碼無效或已過期";
        msgDiv.style.color = "#ef4444";
    }
    updateCartUI();
};
// ---------------------------------------- [套用促銷優惠碼] 結束 ----------------------------------------


// ---------------------------------------- [取餐時間模式切換] 開始 ----------------------------------------
window.handleTimeTypeChange = function() {
    const isSpecific = document.querySelector('input[name="timeType"]:checked')?.value === "SPECIFIC";
    document.getElementById("specific-time-container").style.display = isSpecific ? "block" : "none";
    if (isSpecific) generateTimeOptions();
};
// ---------------------------------------- [取餐時間模式切換] 結束 ----------------------------------------


// ---------------------------------------- [生成可預約取餐時間列表] 開始 ----------------------------------------
window.generateTimeOptions = function() {
    const timeSelect = document.getElementById("pickup-time");
    timeSelect.innerHTML = '<option value="" disabled selected>👉 請點此選擇時間</option>';
    const [openH, openM] = (shopSettings.openTime || "06:00").split(":").map(Number);
    const [closeH, closeM] = (shopSettings.closeTime || "13:00").split(":").map(Number);
    
    const selectedDate = document.querySelector('input[name="pickupDate"]:checked')?.value;
    const now = new Date();

    let minAllowedH = openH;
    let minAllowedM = openM;

    if (selectedDate === todayMMDD) {
        const curH = now.getHours();
        const curM = now.getMinutes() + 15;
        if (curH > openH || (curH === openH && curM > openM)) {
            minAllowedH = curH;
            minAllowedM = curM;
            if (minAllowedM >= 60) { minAllowedM -= 60; minAllowedH++; }
        }
    }

    let curH = openH;
    let curM = Math.ceil(openM / 15) * 15;
    if (curM >= 60) { curM = 0; curH++; }

    let hasValid = false;
    while (curH < closeH || (curH === closeH && curM <= closeM)) {
        if (curH > minAllowedH || (curH === minAllowedH && curM >= minAllowedM)) {
            let t = `${String(curH).padStart(2,'0')}:${String(curM).padStart(2,'0')}`;
            timeSelect.innerHTML += `<option value="${t}">${t}</option>`;
            hasValid = true;
        }
        curM += 15;
        if (curM >= 60) { curM = 0; curH++; }
    }

    if (!hasValid) {
        timeSelect.innerHTML = '<option value="" disabled selected>⚠️ 此日期已無可預約時段</option>';
    }
    document.getElementById("shop-hours-text").innerText = `※ 營業時段：${shopSettings.openTime} ~ ${shopSettings.closeTime}`;
};
// ---------------------------------------- [生成可預約取餐時間列表] 結束 ----------------------------------------


// ---------------------------------------- [送出線上訂單至後端] 開始 ----------------------------------------
window.submitOrder = function() {
    if (Object.keys(cart).length === 0) { alert("購物車是空的喔！"); return; }
    
    const timeTypeNode = document.querySelector('input[name="timeType"]:checked');
    if (!timeTypeNode) {
        alert("⚠️ 請先選擇【⏰ 取餐時間】要「盡快取餐」還是「指定預約時間」！");
        document.getElementById("datetime-container").scrollIntoView({ behavior: 'smooth' });
        return;
    }

    let pickupTimeText = "";
    let orderDateBackend = getTodayDateString();

    if (timeTypeNode.value === "SPECIFIC") {
        const pickupDate = document.querySelector('input[name="pickupDate"]:checked')?.value;
        const specificTime = document.getElementById("pickup-time").value;
        if (!specificTime) { 
            alert("⚠️ 您選擇了指定預約時間，請務必選擇具體的取餐時間！"); 
            document.getElementById("pickup-time").focus();
            return; 
        }
        pickupTimeText = ` (預訂: ${pickupDate} ${specificTime})`;

        if (pickupDate === tomorrowMMDD) {
            const tmr = new Date(); tmr.setDate(tmr.getDate() + 1);
            orderDateBackend = `${tmr.getFullYear()}-${String(tmr.getMonth() + 1).padStart(2, '0')}-${String(tmr.getDate()).padStart(2, '0')}`;
        }
    } else {
        pickupTimeText = " (盡快取餐)";
    }

    const customerName = document.getElementById("customer-name").value.trim();
    const customerPhone = document.getElementById("customer-phone").value.trim();
    if (!customerName) { alert("⚠️ 請填寫姓名！"); document.getElementById("customer-name").focus(); return; }
    if (!customerPhone) { alert("⚠️ 請填寫聯絡電話！"); document.getElementById("customer-phone").focus(); return; }
    
    localStorage.setItem('savedCustomerName', customerName);
    localStorage.setItem('savedCustomerPhone', customerPhone);

    const finalDiningType = `自取${pickupTimeText}`;
    let subtotal = 0;
    let details = "";
    let nl = "\n";

    for (let k in cart) {
        let item = cart[k];
        let itemTotal = item.price * item.qty;
        subtotal += itemTotal;

        const sec = categorizeCustomerOrderSections(item);
        let headerName = sec.isCombo ? sec.comboTitle : sec.mainItemName;
        details += `${item.qty}x ${headerName} ::: $${itemTotal}${nl}`;

        if (sec.isCombo) {
            if (sec.mainItemName) {
                details += `  ▸ ${sec.mainItemName}${nl}`;
                if (sec.mainModifiers.length > 0) details += `    └ ${sec.mainModifiers.join(' / ')}${nl}`;
            }
        } else {
            if (sec.mainModifiers.length > 0) details += `  └ ${sec.mainModifiers.join(' / ')}${nl}`;
        }

        if (sec.drinkItemName) {
            let drinkAdd = sec.drinkPriceAdd > 0 ? ` +${sec.drinkPriceAdd}` : '';
            details += `  ▸ ${sec.drinkItemName}${drinkAdd}${nl}`;
            if (sec.drinkModifiers.length > 0) details += `    └ ${sec.drinkModifiers.join(' / ')}${nl}`;
        }

        sec.sideList.forEach(s => {
            details += `  ▸ ${s.name}${nl}`;
            if (s.mods.length > 0) details += `    └ ${s.mods.join(' / ')}${nl}`;
        });

        if (sec.extraAddons.length > 0) {
            details += `  ＋加購：${sec.extraAddons.join(' / ')}${nl}`;
        }

        if (sec.note) details += `  ※ 備註：${sec.note}${nl}`;
    }
    details += `----------------------${nl}`;
    details += `小計 ::: $${subtotal}${nl}`;

    let finalTotal = subtotal;
    if (appliedPromo && subtotal > 0) {
        let discountAmt = appliedPromo.type === 'discount' ? Math.round(subtotal * (1 - appliedPromo.rate)) : Math.min(subtotal, appliedPromo.amount);
        finalTotal = Math.max(0, subtotal - discountAmt);
        details += `優惠折抵 ::: -$${discountAmt}${nl}`;
        details += `----------------------${nl}`;
    }
    details += `總額 ::: $${finalTotal}${nl}`;

    const needCutlery = document.getElementById("need-cutlery").checked ? "提供餐具" : "不提供餐具";
    const needStraw = document.getElementById("need-straw").checked ? "提供吸管" : "不提供吸管";
    details += `🍴 ${needCutlery} / 🥤 ${needStraw}${nl}`;

    const notes = document.getElementById("order-notes").value.trim();
    if (notes) details += `📝 全單備註：${notes}${nl}`;

    const backendData = {
        diningType: finalDiningType,
        tableNumber: "",
        customerName: customerName,
        customerPhone: customerPhone,
        detailsText: details,
        totalAmount: finalTotal,
        status: "⏳ 新訂單",
        orderDate: orderDateBackend
    };

    document.getElementById("loading-screen").innerHTML = `<h2>🔄 訂單傳送中...</h2><p>正在傳送給店家接單</p>`;
    document.getElementById("loading-screen").style.display = "flex";

    fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backendData)
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById("loading-screen").style.display = "none";
        if (data.result === "success") {
            const newOrder = {
                id: Date.now(),
                orderNumber: data.orderNumber,
                orderDate: orderDateBackend,
                time: getFormattedTime(),
                diningType: finalDiningType,
                detailsText: details,
                totalAmount: finalTotal,
                status: 'pending'
            };
            allOrders.unshift(newOrder);
            localStorage.setItem('myBreakfastOrders', JSON.stringify(allOrders));

            cart = {};
            appliedPromo = null;
            document.getElementById("order-notes").value = "";
            updateCartUI();
            updateTicketFab();
            showStatusView();
        } else {
            alert("送單失敗，請稍後再試！");
        }
    })
    .catch(err => {
        document.getElementById("loading-screen").style.display = "none";
        alert("網路異常，請確認連線！");
    });
};
// ---------------------------------------- [送出線上訂單至後端] 結束 ----------------------------------------