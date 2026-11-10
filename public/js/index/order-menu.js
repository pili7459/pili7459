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
    if (item.options && item.options.length > 0) {
        openModal(itemId);
    } else {
        updateCart(item.id.toString(), item.id, item.name, item.price, "", 1);
    }
};

window.handleModalOverlayClick = function(e) {
    if (e.target.id === 'option-modal') closeModal();
};

window.openModal = function(itemId) {
    currentModalItem = menuData.find(i => i.id === itemId); 
    document.getElementById("modal-item-name").innerText = currentModalItem.name; 
    document.getElementById("modal-base-price").innerText = `$${currentModalItem.price}`;
    let optionsHtml = "";

    currentModalItem.options.forEach((group, index) => {
        let rawTitle = (group.title || group.name || '').trim();
        let isRequired = group.required === true || rawTitle.startsWith("必選");
        let isMultiple = group.multiple === true || rawTitle.startsWith("複選") || rawTitle.startsWith("多選");
        let cleanTitle = rawTitle.replace(/^(必選|單選|複選|多選)[:：]?/, '').trim() || rawTitle;

        let badge = isRequired ? '<span style="color:#ef4444; font-size:0.8em; margin-left:6px; font-weight:bold;">*必選</span>' : (isMultiple ? '<span style="color:#10b981; font-size:0.8em; margin-left:6px; font-weight:bold;">(複選)</span>' : '<span style="color:#3b82f6; font-size:0.8em; margin-left:6px; font-weight:bold;">(單選)</span>');

        optionsHtml += `<div class="option-group" data-required="${isRequired}" data-title="${cleanTitle}"><div class="option-group-title"><span>${cleanTitle}</span>${badge}</div>`;
        
        group.items.forEach((opt, optIdx) => {
            let p = parseInt(opt.price) || 0;
            let priceText = p > 0 ? `<span class="option-price">+$${p}</span>` : "";
            let inputType = isMultiple ? "checkbox" : "radio";
            let isChecked = (isRequired && optIdx === 0) ? "checked" : "";

            optionsHtml += `
                <div class="option-item">
                    <label>
                        <input type="${inputType}" name="modal_group_${index}" value="${opt.name}" data-price="${p}" ${isChecked} onchange="calcModalPrice()">
                        ${opt.name}
                    </label>
                    ${priceText}
                </div>`;
        });
        optionsHtml += `</div>`;
    });

    document.getElementById("modal-options-container").innerHTML = optionsHtml; 
    document.getElementById("option-modal").style.display = "flex"; 
    calcModalPrice(); 
};

window.closeModal = function() { 
    document.getElementById("option-modal").style.display = "none"; 
    currentModalItem = null; 
};
// ---------------------------------------- [品項點擊處理與開啟選項] 結束 ----------------------------------------


// ---------------------------------------- [選項計價與確認加入購物車] 開始 ----------------------------------------
window.calcModalPrice = function() { 
    let total = currentModalItem.price; 
    document.querySelectorAll('#modal-options-container input:checked').forEach(inp => {
        total += parseInt(inp.getAttribute("data-price") || 0);
    });
    document.getElementById("modal-calc-price").innerText = total; 
};

window.confirmOptions = function() {
    const groups = document.querySelectorAll("#modal-options-container .option-group");
    for (let g of groups) {
        if (g.getAttribute("data-required") === "true" && !g.querySelector("input:checked")) {
            alert(`⚠️ 請選擇【${g.getAttribute("data-title")}】！`);
            return;
        }
    }

    let selectedOptions = []; 
    let addedPrice = 0;

    document.querySelectorAll('#modal-options-container input:checked').forEach(inp => { 
        let p = parseInt(inp.getAttribute("data-price") || 0);
        addedPrice += p; 
        selectedOptions.push(p > 0 ? `${inp.value} +$${p}` : inp.value);
    });
    
    const optionsString = selectedOptions.join(", "); 
    const cartKey = `${currentModalItem.id}_${selectedOptions.join("_")}`; 
    const finalPrice = currentModalItem.price + addedPrice;

    updateCart(cartKey, currentModalItem.id, currentModalItem.name, finalPrice, optionsString, 1); 
    closeModal();
};
// ---------------------------------------- [選項計價與確認加入購物車] 結束 ----------------------------------------