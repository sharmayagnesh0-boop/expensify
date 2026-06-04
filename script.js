document.addEventListener("DOMContentLoaded", () => {
    /* ================= DATA ================= */
    let data = JSON.parse(localStorage.getItem("finovaPro")) || [];
    const currency = localStorage.getItem("currency") || "₹";

    const save = () => localStorage.setItem("finovaPro", JSON.stringify(data));

    /* ================= EXPORT CSV ================= */
    window.exportData = () => {
        let currentData = JSON.parse(localStorage.getItem("finovaPro")) || [];
        if(currentData.length === 0){
            alert("No transactions to export.");
            return;
        }

        let csv = "Name,Amount,Date\n";
        currentData.forEach(t => {
            csv += `"${t.text}",${t.amount},"${t.date}"\n`;
        });

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "transactions.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    /* ================= THEME SYSTEM ================= */
    if(localStorage.getItem("theme")==="true"){
        document.body.classList.add("light");
    }

    window.toggleTheme = () => {
        const isLight = document.body.classList.toggle("light");
        localStorage.setItem("theme", isLight);
    };

    /* ================= DASHBOARD CORE ================= */
    window.addTransaction = () => {
        const text = document.getElementById("text")?.value.trim();
        let amount = Number(document.getElementById("amount")?.value);
        const category = document.getElementById("category")?.value;

        if(!text || !amount){
            alert("Fill all fields");
            return;
        }

        data.push({
            text:`${category} ${text}`,
            amount:amount,
            date:new Date().toLocaleDateString()
        });

        save();
        updateDashboard();
        renderTransactions();
        updateScores();
        updateGoalProgress();

        document.getElementById("text").value="";
        document.getElementById("amount").value="";
    };

    function updateDashboard(){
        if(!document.getElementById("balance")) return;

        let total=0,inc=0,exp=0;

        data.forEach(t=>{
            total+=t.amount;
            t.amount>0 ? inc+=t.amount : exp+=Math.abs(t.amount);
        });

        document.getElementById("balance").innerText=`${currency}${total}`;
        document.getElementById("income").innerText=`${currency}${inc}`;
        document.getElementById("expense").innerText=`${currency}${exp}`;

        updateBudget(exp);
    }

    /* ================= BUDGET & GOALS ================= */
    function updateBudget(exp){
        const budget=Number(localStorage.getItem("budget"))||0;
        const bar=document.getElementById("progressBar");
        const percent=document.getElementById("budgetPercent");
        const status=document.getElementById("budgetStatus");

        if(!bar) return;

        if(!budget){
            bar.style.width="0%";
            percent.innerText="0%";
            status.innerText="Set limit in settings.";
            return;
        }

        let p=Math.min((exp/budget)*100,100);
        bar.style.width=p+"%";
        percent.innerText=Math.round(p)+"%";

        status.innerText = p>=100 ? "⚠ Budget Exceeded!" : p>=75 ? "⚠ Almost at limit" : "You are within budget 👍";
    }

    window.saveGoal = () => {
        const name = document.getElementById("goalName").value.trim();
        const target = Number(document.getElementById("goalAmount").value);

        if (!name || !target) {
            alert("Please enter goal name and amount.");
            return;
        }

        localStorage.setItem("goalName", name);
        localStorage.setItem("goalAmount", target);
        updateGoalProgress();
    };

    function updateGoalProgress() {
        const gBar = document.getElementById("goalBar");
        const gStatus = document.getElementById("goalStatus");
        if (!gBar) return;

        const name = localStorage.getItem("goalName");
        const target = Number(localStorage.getItem("goalAmount")) || 0;

        if (!target) {
            gStatus.innerText = "No active goals set.";
            return;
        }

        let savings = 0;
        data.forEach(t => savings += t.amount);
        if(savings < 0) savings = 0;

        let progressPercent = Math.min((savings / target) * 100, 100);
        gBar.style.width = progressPercent + "%";
        gStatus.innerText = `${name}: ${currency}${savings} / ${currency}${target} (${Math.round(progressPercent)}%)`;
    }

    /* ================= STREAK & SCORE ================= */
    function updateScores() {
        if(!document.getElementById("financeScore")) return;
        
        let totalIn = 0, totalOut = 0;
        data.forEach(t => t.amount > 0 ? totalIn += t.amount : totalOut += Math.abs(t.amount));
        
        let score = 100;
        if (totalIn > 0) {
            let ratio = totalOut / totalIn;
            score = Math.max(0, Math.round(100 - (ratio * 100)));
        } else if (totalOut > 0) {
            score = 0;
        }

        document.getElementById("financeScore").innerText = `${score}/100`;
        document.getElementById("streak").innerText = data.length > 0 ? "Local Sync Active" : "0 Days";
    }

    /* ================= TRANSACTIONS (SEARCH, FILTER, EDIT, DELETE) ================= */
    function renderTransactions() {
        if (!document.getElementById("totalCount")) return;

        const main = document.querySelector(".main");
        let list = document.getElementById("transactionList");

        if (!list) {
            list = document.createElement("div");
            list.id = "transactionList";
            list.className = "transaction-list";
            main.appendChild(list);
        }

        list.innerHTML = "";

        const searchVal = document.getElementById("searchInput")?.value.toLowerCase() || "";
        const filterVal = document.getElementById("filterType")?.value || "all";

        let inc = 0, exp = 0;

        data.forEach((t, i) => {
            t.amount > 0 ? inc++ : exp++;

            const matchesSearch = t.text.toLowerCase().includes(searchVal);
            const matchesFilter = filterVal === "all" || 
                (filterVal === "income" && t.amount > 0) || 
                (filterVal === "expense" && t.amount < 0);

            if (matchesSearch && matchesFilter) {
                list.innerHTML += `
                <div class="transaction-item">
                    <div class="trans-left">
                        <div class="trans-name">${t.text}</div>
                        <div class="trans-date">${t.date}</div>
                    </div>
                    <div>
                        <span class="${t.amount > 0 ? 'amount-income' : 'amount-expense'}">
                            ${currency}${Math.abs(t.amount)}
                        </span>
                        <button class="add-btn" style="padding:6px 10px; margin-right:5px; background:#2563eb;" onclick="openEditModal(${i})">Edit</button>
                        <button class="delete-btn" onclick="deleteTransaction(${i})">X</button>
                    </div>
                </div>`;
            }
        });

        document.getElementById("totalCount").innerText = data.length;
        document.getElementById("incomeCount").innerText = inc;
        document.getElementById("expenseCount").innerText = exp;
    }

    document.getElementById("searchInput")?.addEventListener("input", renderTransactions);
    document.getElementById("filterType")?.addEventListener("change", renderTransactions);

    window.deleteTransaction = (i) => {
        data.splice(i,1);
        save();
        renderTransactions();
        updateDashboard();
        updateScores();
        updateGoalProgress();
    };

    let currentEditIndex = null;

    window.openEditModal = (i) => {
        currentEditIndex = i;
        const t = data[i];
        const rawText = t.text.substring(3).trim(); 
        
        document.getElementById("editText").value = rawText;
        document.getElementById("editAmount").value = Math.abs(t.amount);
        document.getElementById("editModal").style.display = "flex";
    };

    window.closeModal = () => {
        document.getElementById("editModal").style.display = "none";
    };

    window.updateTransaction = () => {
        if (currentEditIndex === null) return;

        const text = document.getElementById("editText").value.trim();
        let amount = Number(document.getElementById("editAmount").value);
        const category = document.getElementById("editCategory").value;

        if (!text || !amount) {
            alert("Fields cannot be empty");
            return;
        }

        if (data[currentEditIndex].amount < 0) {
            amount = -Math.abs(amount);
        }

        data[currentEditIndex].text = `${category} ${text}`;
        data[currentEditIndex].amount = amount;

        save();
        closeModal();
        renderTransactions();
        updateDashboard();
        updateScores();
        updateGoalProgress();
    };

    /* ================= ANALYTICS ================= */
    if(document.getElementById("analysisChart")){
        let inc=0,exp=0,categories={};

        data.forEach(t=>{
            if(t.amount>0) inc+=t.amount;
            else{
                let v=Math.abs(t.amount);
                exp+=v;
                let cat=t.text.split(" ")[0];
                categories[cat]=(categories[cat]||0)+v;
            }
        });

        new Chart(document.getElementById("analysisChart"),{
            type:"doughnut",
            data:{
                labels:["Income","Expense"],
                datasets:[{
                    data:[inc,exp],
                    backgroundColor:["#22c55e","#ef4444"]
                }]
            }
        });

        if(document.getElementById("categoryChart")){
            new Chart(document.getElementById("categoryChart"),{
                type:"bar",
                data:{
                    labels:Object.keys(categories),
                    datasets:[{
                        label:"Spending",
                        data:Object.values(categories)
                    }]
                }
            });
        }

        document.getElementById("monthlyReport").innerText=
        `Income: ${currency}${inc}\nExpense: ${currency}${exp}\nSavings: ${currency}${inc-exp}`;
    }

    /* ================= SETTINGS ================= */
    if(document.getElementById("budgetInput")){
        document.getElementById("budgetInput").value=localStorage.getItem("budget")||"";
        document.getElementById("currencySelect").value=currency;

        window.saveSettings=()=>{
            localStorage.setItem("budget",document.getElementById("budgetInput").value);
            localStorage.setItem("currency",document.getElementById("currencySelect").value);
            alert("Settings Updated");
            location.reload();
        };

        window.resetData=()=>{
            if(confirm("Delete all data?")){
                localStorage.removeItem("finovaPro");
                localStorage.removeItem("goalName");
                localStorage.removeItem("goalAmount");
                location.href="home.html";
            }
        };
    }

    /* ================= AI ASSISTANT ================= */
    window.toggleChat=()=>{
        const chat=document.getElementById("aiChat");
        if(!chat) return;
        chat.style.display= chat.style.display==="flex" ? "none" : "flex";
    };

    window.sendMessage=()=>{
        const input=document.getElementById("chatInput");
        const msg=input.value.trim();
        if(!msg) return;

        addMessage(msg,"user-msg");
        input.value="";

        setTimeout(()=>{
            addMessage(generateAIReply(msg),"bot-msg");
        },500);
    };

    function addMessage(text,type){
        const box=document.getElementById("chatMessages");
        if(!box) return;

        const div=document.createElement("div");
        div.className=type;
        div.innerText=text;

        box.appendChild(div);
        box.scrollTop=box.scrollHeight;
    }

    function generateAIReply(message){
        let income=0,expense=0;

        data.forEach(t=>{
            t.amount>0 ? income+=t.amount : expense+=Math.abs(t.amount);
        });

        const balance=income-expense;
        message=message.toLowerCase();

        if(message.includes("balance")) return `Your balance is ${currency}${balance}`;
        if(message.includes("income")) return `Income total is ${currency}${income}`;
        if(message.includes("expense")) return `Expenses are ${currency}${expense}`;
        if(message.includes("save")) return balance>0 ? "You are saving money 👍" : "You are overspending.";

        return "Ask about balance, income, expenses or savings.";
    }

    /* ================= LOGOUT ================= */
    window.logout=()=>{
        localStorage.removeItem("auth");
        location.href="home.html";
    };

    /* ================= INITIALIZE DASHBOARD ================= */
    updateDashboard();
    updateScores();
    updateGoalProgress();
    renderTransactions();
});
