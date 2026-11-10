// ---------------------------------------- [計算購物車商品總數] 開始 ----------------------------------------
function getItemCartCount(itemId) {
    if (typeof cart === 'undefined' || !cart || Object.keys(cart).length === 0) {
        return 0;
    }
    let total = 0;
    for (let key in cart) {
        const entry = cart[key];
        if (entry && typeof entry === 'object') {
            const matchesId = (entry.baseId !== undefined && entry.baseId !== null && String(entry.baseId) === String(itemId))
                           || (String(key).split('_')[0] === String(itemId));
            const validQty = parseInt(entry.qty, 10) || 0;
            if (matchesId && validQty > 0) {
                total += validQty;
            }
        }
    }
    return total;
}
// ---------------------------------------- [計算購物車商品總數] 結束 ----------------------------------------


// ---------------------------------------- [渲染側邊分類導航列] 開始 ----------------------------------------
window.renderNavBar = function() { 
    const navDiv = document.getElementById("side-nav"); 
    if (!navDiv) return;
    let html = `<button class="nav-btn ${currentCategoryFilter === '全部' ? 'active' : ''}" onclick="filterCategory('全部', true)">全部</button>`;
    categories.forEach(category => { 
        if (menuData.some(item => item.category === category)) {
            html += `<button class="nav-btn ${currentCategoryFilter === category ? 'active' : ''}" onclick="filterCategory('${category}', true)">${category}</button>`;
        }
    }); 
    navDiv.innerHTML = html;
};
// ---------------------------------------- [渲染側邊分類導航列] 結束 ----------------------------------------


// ---------------------------------------- [獨立更新品項角標] 開始 ----------------------------------------
window.updateItemBadges = function() {
    if (typeof menuData === 'undefined' || !menuData) return;
    menuData.forEach(item => {
        const totalQty = getItemCartCount(item.id);
        const titleEl = document.getElementById(`item-title-${item.id}`);
        if (titleEl) {
            let badge = titleEl.querySelector('.item-badge');
            if (totalQty > 0) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'item-badge';
                    titleEl.appendChild(badge);
                }
                badge.textContent = totalQty;
            } else if (badge) {
                badge.remove();
            }
        }
    });
};
// ---------------------------------------- [獨立更新品項角標] 結束 ----------------------------------------


// ---------------------------------------- [渲染菜單清單] 開始 ----------------------------------------
window.renderMenu = function() {
    const mainContent = document.getElementById("main-content");
    const currentScroll = mainContent ? mainContent.scrollTop : 0;
    const menuDiv = document.getElementById("menu"); 
    if (!menuDiv) return;

    let fullHtml = "";

    categories.forEach(category => {
        const items = menuData.filter(item => item.category === category);
        if (items.length > 0) {
            let html = `<div class="category-section" id="section-${category}"><div class="category-title">${category}</div><div class="category-items-grid">`;
            items.forEach(item => {
                const totalQty = getItemCartCount(item.id);
                const badgeHtml = totalQty > 0 ? `<span class="item-badge">${totalQty}</span>` : '';
                const isSoldOut = item.status === "售完" || (item.status && item.status.includes("完售")) || item.status === "停售";

                let rawName = item.name || '';
                let formattedTitle = rawName;
                if (!rawName.includes('\n')) {
                    if (rawName.includes('+')) formattedTitle = rawName.split('+').join('\n');
                    else if (rawName.includes(' ')) formattedTitle = rawName.split(' ').join('\n');
                }

                html += `
                    <div class="menu-item ${isSoldOut ? 'sold-out' : ''}" onclick="handleItemClick(${item.id})">
                        <div class="item-info">
                            <h3 id="item-title-${item.id}">${formattedTitle}${badgeHtml}</h3>
                        </div>
                        <span class="item-price">${isSoldOut ? '售完' : '$' + item.price}</span>
                    </div>`;
            });
            fullHtml += html + `</div></div>`;
        }
    });

    menuDiv.innerHTML = fullHtml;

    if (typeof filterCategory === 'function' && typeof currentCategoryFilter !== 'undefined') {
        filterCategory(currentCategoryFilter, false);
    }

    if (mainContent) {
        mainContent.scrollTop = currentScroll;
    }
};
// ---------------------------------------- [渲染菜單清單] 結束 ----------------------------------------


// ---------------------------------------- [品項點擊處理與開啟選項] 開始 ----------------------------------------
window.handleItemClick = function(itemId) {
    const item = menuData.find(i => i.id === itemId);
    if (!item) return;
    if (item.status === "售完" || (item.status && item.status.includes("完售")) || item.status === "停售") {
        alert("⚠️ 此商品今日已售完！");
        return;
    }
    // 不管有無客製化選項，皆彈窗讓顧客確認與填寫個人備註
    openModal(itemId);
};

window.handleModalOverlayClick = function(e) {
    if (e.target.id === 'option-modal') closeModal();
};

// 自動在單點菜單中比對飲料規格（甜度/冰塊）
function findDrinkModifiers(drinkName) {
    if (!drinkName || !menuData) return [];
    const cleanName = drinkName.replace(/\(.*?\)/g, '').trim();
    const matched = menuData.find(m => {
        const mName = (m.name || '').split('\n')[0].trim();
        return mName.includes(cleanName) || cleanName.includes(mName);
    });
    return (matched && matched.options) ? matched.options : [];
}

window.openModal = function(itemId) {
    currentModalItem = JSON.parse(JSON.stringify(menuData.find(i => i.id === itemId))); 
    document.getElementById("modal-item-name").innerText = currentModalItem.name.split('\n')[0]; 
    document.getElementById("modal-base-price").innerText = `$${currentModalItem.price}`;
    
    renderModalOptionGroups();
    document.getElementById("option-modal").style.display = "flex"; 
    calcModalPrice(); 
};

function renderModalOptionGroups() {
    const item = currentModalItem;
    const container = document.getElementById("modal-options-container");
    if (!container || !item) return;
    
    let optionsHtml = "";

    (item.options || []).forEach((group, index) => {
        let rawTitle = (group.title || group.name || '').trim();
        let isRequired = group.required === true || rawTitle.startsWith("必選");
        let isMultiple = group.multiple === true || rawTitle.startsWith("複選") || rawTitle.startsWith("多選");
        let cleanTitle = rawTitle.replace(/^(必選|單選|複選|多選)[:：]?/, '').trim() || rawTitle;

        let badge = isRequired ? '<span style="color:#ef4444; font-size:0.8em; margin-left:6px; font-weight:bold;">*必選</span>' : (isMultiple ? '<span style="color:#10b981; font-size:0.8em; margin-left:6px; font-weight:bold;">(複選)</span>' : '<span style="color:#3b82f6; font-size:0.8em; margin-left:6px; font-weight:bold;">(單選)</span>');

        let isDrinkGroup = cleanTitle.includes("飲料") || cleanTitle.includes("飲品");

        optionsHtml += `<div class="option-group" data-group-index="${index}" data-required="${isRequired}" data-title="${cleanTitle}"><div class="option-group-title"><span>🍽️ ${cleanTitle}</span>${badge}</div>`;
        
        group.items.forEach((opt, optIdx) => {
            let p = parseInt(opt.price) || 0;
            let priceText = p > 0 ? `<span class="option-price">(+${p})</span>` : "";
            let inputType = isMultiple ? "checkbox" : "radio";
            let isChecked = (isRequired && optIdx === 0) ? "checked" : "";

            optionsHtml += `
                <div class="option-item" style="flex-direction:column; align-items:stretch;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <label style="flex:1; cursor:pointer;">
                            <input type="${inputType}" name="modal_group_${index}" value="${opt.name}" data-price="${p}" ${isChecked} onchange="handleModalOptionChange(${index}, '${opt.name}', ${isDrinkGroup})">
                            ${opt.name}
                        </label>
                        ${priceText}
                    </div>
                    ${isDrinkGroup ? `<div id="sub-modifiers-for-${index}-${optIdx}" class="sub-drink-box" style="margin-top:6px; padding:8px 12px; background:#f1f5f9; border-radius:8px; display:${isChecked ? 'block' : 'none'};"></div>` : ''}
                </div>`;
        });
        optionsHtml += `</div>`;
    });

    // 顧客單品專屬備註輸入框
    optionsHtml += `
        <div class="option-group" style="margin-top:16px;">
            <div class="option-group-title" style="border-left-color: #0284c7;">
                <span>📝 本項備註說明</span>
            </div>
            <input type="text" id="modal-item-note-input" class="table-input" style="margin-top:6px; font-size:1.05em;" placeholder="例如: 蛋餅焦一點、不要洋蔥、要蕃茄醬...">
        </div>
    `;

    container.innerHTML = optionsHtml;

    // 預設已選項目載入其規格
    (item.options || []).forEach((grp, idx) => {
        let cleanTitle = (grp.title || grp.name || '').replace(/^(必選|單選|複選|多選)[:：]?/, '');
        if ((cleanTitle.includes("飲料") || cleanTitle.includes("飲品")) && grp.items.length > 0) {
            setTimeout(() => {
                handleModalOptionChange(idx, grp.items[0].name, true);
            }, 0);
        }
    });
}

// 飲料選取時動態展開甜度與冰塊規格
window.handleModalOptionChange = function(groupIndex, selectedOptName, isDrinkGroup) {
    calcModalPrice();
    if (!isDrinkGroup) return;

    const grp = currentModalItem.options[groupIndex];
    grp.items.forEach((opt, oIdx) => {
        const box = document.getElementById(`sub-modifiers-for-${groupIndex}-${oIdx}`);
        if (!box) return;

        if (opt.name === selectedOptName) {
            box.style.display = 'block';
            const drinkOpts = findDrinkModifiers(selectedOptName);

            if (drinkOpts.length === 0) {
                let isChingTea = selectedOptName.includes("青茶");
                let isMilkTea = selectedOptName.includes("奶茶");

                let iceHtml = '';
                let sugarHtml = '';

                if (isChingTea) {
                    iceHtml = `<label><input type="radio" name="sub_drink_${groupIndex}_ice" value="固定冰" checked onchange="calcModalPrice()"> 固定冰</label>`;
                    sugarHtml = `<label><input type="radio" name="sub_drink_${groupIndex}_sugar" value="固定無糖" checked onchange="calcModalPrice()"> 固定無糖</label>`;
                } else if (isMilkTea) {
                    iceHtml = `
                        <label><input type="radio" name="sub_drink_${groupIndex}_ice" value="冰" checked onchange="calcModalPrice()"> 冰</label>
                        <label><input type="radio" name="sub_drink_${groupIndex}_ice" value="溫" onchange="calcModalPrice()"> 溫</label>
                    `;
                    sugarHtml = `<label><input type="radio" name="sub_drink_${groupIndex}_sugar" value="甜度固定" checked onchange="calcModalPrice()"> 甜度固定</label>`;
                } else {
                    iceHtml = `
                        <label><input type="radio" name="sub_drink_${groupIndex}_ice" value="冰" checked onchange="calcModalPrice()"> 冰</label>
                        <label><input type="radio" name="sub_drink_${groupIndex}_ice" value="溫" onchange="calcModalPrice()"> 溫</label>
                    `;
                    sugarHtml = `
                        <label><input type="radio" name="sub_drink_${groupIndex}_sugar" value="有糖" checked onchange="calcModalPrice()"> 有糖</label>
                        <label><input type="radio" name="sub_drink_${groupIndex}_sugar" value="無糖" onchange="calcModalPrice()"> 無糖</label>
                    `;
                }

                box.innerHTML = `
                    <div style="font-size:0.85em; color:#64748b; font-weight:bold; margin-bottom:4px;">↳ 飲料客製：</div>
                    <div style="display:flex; gap:12px; flex-wrap:wrap; font-size:0.95em; font-weight:bold;">
                        ${iceHtml}
                        ${sugarHtml}
                    </div>
                `;
            } else {
                let subHtml = `<div style="font-size:0.85em; color:#64748b; font-weight:bold; margin-bottom:4px;">↳ ${selectedOptName} 規格：</div>`;
                drinkOpts.forEach((subGrp, sIdx) => {
                    const sTitle = (subGrp.title || subGrp.name || '').replace(/^(必選|單選|複選)[:：]?/, '');
                    subHtml += `<div style="margin-bottom:6px; font-size:0.9em; font-weight:bold; color:#334155;">${sTitle}：`;
                    subGrp.items.forEach((sItem, siIdx) => {
                        const chk = siIdx === 0 ? 'checked' : '';
                        subHtml += `
                            <label style="margin-right:8px; cursor:pointer;">
                                <input type="radio" name="sub_drink_${groupIndex}_${sIdx}" value="${sItem.name}" data-price="${sItem.price || 0}" ${chk} onchange="calcModalPrice()">
                                ${sItem.name}
                            </label>
                        `;
                    });
                    subHtml += `</div>`;
                });
                box.innerHTML = subHtml;
            }
        } else {
            box.style.display = 'none';
            box.innerHTML = '';
        }
    });
};

window.closeModal = function() { 
    document.getElementById("option-modal").style.display = "none"; 
    currentModalItem = null; 
};
// ---------------------------------------- [品項點擊處理與開啟選項] 結束 ----------------------------------------


// ---------------------------------------- [選項計價與確認加入購物車] 開始 ----------------------------------------
window.calcModalPrice = function() { 
    if (!currentModalItem) return;
    let total = currentModalItem.price; 
    document.querySelectorAll('#modal-options-container input:checked').forEach(inp => {
        total += parseInt(inp.getAttribute("data-price") || 0);
    });
    document.getElementById("modal-calc-price").innerText = total; 
};

window.confirmOptions = function() {
    const groups = document.querySelectorAll("#modal-options-container .option-group[data-group-index]");
    for (let g of groups) {
        if (g.getAttribute("data-required") === "true" && !g.querySelector("input:checked")) {
            alert(`⚠️ 請選擇【${g.getAttribute("data-title")}】！`);
            return;
        }
    }

    let structuredOptions = [];
    let addedPrice = 0;

    groups.forEach((grpEl, gIdx) => {
        const title = grpEl.getAttribute("data-title");
        const checkedList = grpEl.querySelectorAll(`input[name="modal_group_${gIdx}"]:checked`);
        checkedList.forEach(inp => {
            let p = parseInt(inp.getAttribute("data-price") || 0);
            addedPrice += p;

            let subModifiers = [];
            const parentItemDiv = inp.closest('.option-item');
            if (parentItemDiv) {
                const subBox = parentItemDiv.querySelector('.sub-drink-box');
                if (subBox && subBox.style.display !== 'none') {
                    subBox.querySelectorAll('input:checked').forEach(subInp => {
                        let sp = parseInt(subInp.getAttribute("data-price") || 0);
                        addedPrice += sp;
                        subModifiers.push(subInp.value);
                    });
                }
            }

            structuredOptions.push({
                groupTitle: title,
                name: inp.value,
                price: p,
                subModifiers: subModifiers
            });
        });
    });

    const noteInput = document.getElementById("modal-item-note-input");
    const itemNote = noteInput ? noteInput.value.trim() : "";

    const cartKey = `${currentModalItem.id}_${Date.now()}`; 
    const finalPrice = currentModalItem.price + addedPrice;

    if (!cart[cartKey]) {
        cart[cartKey] = {
            baseId: currentModalItem.id,
            name: currentModalItem.name,
            price: finalPrice,
            structuredOptions: structuredOptions,
            note: itemNote,
            qty: 1
        };
    } else {
        cart[cartKey].qty += 1;
    }

    closeModal();
    updateCartUI();
    if (typeof window.updateItemBadges === 'function') {
        window.updateItemBadges();
    }
};
// ---------------------------------------- [選項計價與確認加入購物車] 結束 ----------------------------------------