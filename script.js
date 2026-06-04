document.addEventListener("DOMContentLoaded", async () => {
    /* ================= SUPABASE SETUP ================= */
    const SUPABASE_URL = 'https://bpwfrhlwdjkowxjhrqys.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwd2ZyaGx3ZGprb3d4amhycXlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NjI1MDEsImV4cCI6MjA5NjEzODUwMX0.u12uVOAIuIPAh2NHWPSW--Kkp3nbR1gtXBdOLt4LsUw';
    
    // Ensure the Supabase library was added to the HTML
    if (!window.supabase) {
        console.error("Supabase library is missing. Add the CDN script to your HTML.");
        return;
    }
    
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    /* ================= DATA & AUTHENTICATION ================= */
    let data = [];
    const currency = localStorage.getItem("currency") || "₹";

    // Check authentication status on page load
    const { data: authData } = await supabase.auth.getSession();
    
    // Redirect to login if user is not authenticated (and not already on login/home pages)
    if (!authData.session && !window.location.href.includes("login.html") && !window.location.href.includes("home.html")) {
        window.location.href = "login.html";
        return;
    }

    // Fetch data if user is logged in
    if (authData.session && !window.location.href.includes("login.html") && !window.location.href.includes("home.html")) {
        await fetchTransactions();
    }

    async function fetchTransactions() {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Fetch from Supabase, newest first
        const { data: fetchedData, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false });

        if (!error) {
            data = fetchedData || [];
            updateAllUI();
        } else {
            console.error("Error fetching database data:", error);
        }
    }

    function updateAllUI() {
        updateDashboard();
        updateScores();
        updateGoalProgress();
        renderTransactions();
        renderAnalytics();
    }

    /* ================= THEME & SETTINGS ================= */
    if (localStorage.getItem("theme") === "true") {
        document.body.classList.add("light");
    }

    window.toggleTheme = () => {
        const isLight = document.body.classList.toggle("light");
        localStorage.setItem("theme", isLight);
    };

    if (document.getElementById("budgetInput")) {
        document.getElementById("budgetInput").value = localStorage.getItem("budget") || "";
        document.getElementById("currencySelect").value = currency;

        window.saveSettings = () => {
            localStorage.setItem("budget", document.getElementById("budgetInput").value);
            localStorage.setItem("currency", document.getElementById("currencySelect").value);
            alert("Settings Updated");
            location.reload();
        };

        window.resetData = async () => {
            if (confirm("Warning: This will delete all your data permanently. Continue?")) {
                const { data: { user } } = await supabase.auth.getUser();
                await supabase.from('transactions').delete().eq('user_id', user.id);
                localStorage.clear();
                location.href = "home.html";
            }
        };
    }

    /* ================= LOGOUT ================= */
    window.logout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem("auth");
        window.location.href = "home.html";
    };

    /* ================= EXPORT CSV ================= */
    window.exportData = () => {
        if (data.length === 0) {
            alert("No transactions to export.");
            return;
        }

        let csv = "Name,Amount,Date\n";
        data.forEach(t => {
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

    /* ================= DASHBOARD CORE (INSERT / UPDATE / DELETE) ================= */
    window.addTransaction = async () => {
        const text = document.getElementById("text")?.value.trim();
        let amount = Number(document.getElementById("amount")?.value);
        const category = document.getElementById("category")?.value;

        if (!text || !amount) {
            alert("Fill all fields");
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        const dateStr = new Date().toLocaleDateString();
        const fullText = `${category} ${text}`;

        const { data: insertedData, error } = await supabase
            .from('transactions')
            .insert([{ 
                user_id: user.id, 
                text: fullText, 
                amount: amount, 
                date: dateStr 
            }])
            .select();

        if (!error) {
            data.unshift(insertedData[0]); // Add to beginning of array
            updateAllUI();
            document.getElementById("text").value = "";
            document.getElementById("amount").value = "";
        } else {
            alert("Error saving transaction to database.");
            console.error(error);
        }
    };

    window.deleteTransaction = async (i) => {
        const transactionId = data[i].id; 
        
        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', transactionId);
        
        if (!error) {
            data.splice(i, 1);
            updateAllUI();
        } else {
            alert("Error deleting transaction from database.");
        }
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

    window.updateTransaction = async () => {
        if (currentEditIndex === null) return;

        const text = document.getElementById("editText").value.trim();
        let amount = Number(document.getElementById("editAmount").value);
        const category = document.getElementById("editCategory").value;
        const transactionId = data[currentEditIndex].id;

        if (!text || !amount) {
            alert("Fields cannot be empty");
            return;
        }

        if (data[currentEditIndex].amount < 0) {
            amount = -Math.abs(amount);
        }

        const newText = `${category} ${text}`;

        const { error } = await supabase
            .from('transactions')
            .update({ text: newText, amount: amount })
            .eq('id', transactionId);

        if (!error) {
            data[currentEditIndex].text = newText;
            data[currentEditIndex].amount = amount;
            closeModal();
            updateAllUI();
        } else {
            alert("Error updating transaction in database.");
        }
    };

    /* ================= STATS & CALCULATIONS ================= */
    function updateDashboard() {
        if (!document.getElementById("balance")) return;

        let total = 0, inc = 0, exp = 0;

        data.forEach(t => {
            total += t.amount;
            t.amount > 0 ? inc += t.amount : exp += Math.abs(t.amount);
        });

        document.getElementById("balance").innerText = `${currency}${total}`;
        document.getElementById("income").innerText = `${currency}${inc}`;
        document.getElementById("expense").innerText = `${currency}${exp}`;

        updateBudget(exp);
    }

    function updateBudget(exp) {
        const budget = Number(localStorage.getItem("budget")) || 0;
        const bar = document.getElementById("progressBar");
        const percent = document.getElementById("budgetPercent");
        const status = document.getElementById("budgetStatus");

        if (!bar) return;

        if (!budget) {
            bar.style.width = "0%";
            percent.innerText = "0%";
            status.innerText = "Set limit in settings.";
            return;
        }

        let p = Math.min((exp / budget) * 100, 100);
        bar.style.width = p + "%";
        percent.innerText = Math.round(p) + "%";

        status.innerText = p >= 100 ? "⚠ Budget Exceeded!" : p >= 75 ? "⚠ Almost at limit" : "You are within budget 👍";
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
        if (savings < 0) savings = 0;

        let progressPercent = Math.min((savings / target) * 100, 100);
        gBar.style.width = progressPercent + "%";
        gStatus.innerText = `${name}: ${currency}${savings} / ${currency}${target} (${Math.round(progressPercent)}%)`;
    }

    function updateScores() {
        if (!document.getElementById("financeScore")) return;
        
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
        document.getElementById("streak").innerText = data.length > 0 ? "Live DB Active" : "0 Days";
    }

    /* ================= TRANSACTIONS RENDERER ================= */
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

    /* ================= ANALYTICS CHARTS ================= */
    let analysisChartInstance = null;
    let categoryChartInstance = null;

    function renderAnalytics() {
        if (!document.getElementById("analysisChart")) return;
        
        let inc = 0, exp = 0, categories = {};

        data.forEach(t => {
            if (t.amount > 0) inc += t.amount;
            else {
                let v = Math.abs(t.amount);
                exp += v;
                let cat = t.text.split(" ")[0];
                categories[cat] = (categories[cat] || 0) + v;
            }
        });

        // Destroy previous charts before redrawing to prevent overlap bugs
        if (analysisChartInstance) analysisChartInstance.destroy();
        analysisChartInstance = new Chart(document.getElementById("analysisChart"), {
            type: "doughnut",
            data: {
                labels: ["Income", "Expense"],
                datasets: [{
                    data: [inc, exp],
                    backgroundColor: ["#22c55e", "#ef4444"]
                }]
            }
        });

        if (document.getElementById("categoryChart")) {
            if (categoryChartInstance) categoryChartInstance.destroy();
            categoryChartInstance = new Chart(document.getElementById("categoryChart"), {
                type: "bar",
                data: {
                    labels: Object.keys(categories),
                    datasets: [{
                        label: "Spending",
                        data: Object.values(categories)
                    }]
                }
            });
        }

        document.getElementById("monthlyReport").innerText =
            `Income: ${currency}${inc}\nExpense: ${currency}${exp}\nSavings: ${currency}${inc - exp}`;
    }

    /* ================= AI CHAT ASSISTANT ================= */
    window.toggleChat = () => {
        const chat = document.getElementById("aiChat");
        if (!chat) return;
        chat.style.display = chat.style.display === "flex" ? "none" : "flex";
    };

    window.sendMessage = () => {
        const input = document.getElementById("chatInput");
        const msg = input.value.trim();
        if (!msg) return;

        addMessage(msg, "user-msg");
        input.value = "";

        setTimeout(() => {
            addMessage(generateAIReply(msg), "bot-msg");
        }, 500);
    };

    function addMessage(text, type) {
        const box = document.getElementById("chatMessages");
        if (!box) return;

        const div = document.createElement("div");
        div.className = type;
        div.innerText = text;

        box.appendChild(div);
        box.scrollTop = box.scrollHeight;
    }

    function generateAIReply(message) {
        let income = 0, expense = 0;

        data.forEach(t => {
            t.amount > 0 ? income += t.amount : expense += Math.abs(t.amount);
        });

        const balance = income - expense;
        message = message.toLowerCase();

        if (message.includes("balance")) return `Your balance is ${currency}${balance}`;
        if (message.includes("income")) return `Income total is ${currency}${income}`;
        if (message.includes("expense")) return `Expenses are ${currency}${expense}`;
        if (message.includes("save")) return balance > 0 ? "You are saving money 👍" : "You are overspending.";

        return "Ask about balance, income, expenses or savings.";
    }
});
