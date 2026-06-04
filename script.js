document.addEventListener("DOMContentLoaded", () => {
   /* ================= EXPORT CSV FIX ================= */

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
/* ================= THEME LOAD FIX ================= */

if(localStorage.getItem("theme")==="true"){
    document.body.classList.add("light");
}
/* ================= DATA ================= */

let data = JSON.parse(localStorage.getItem("finovaPro")) || [];
const currency = localStorage.getItem("currency") || "₹";

const save = () =>
localStorage.setItem("finovaPro", JSON.stringify(data));

/* ================= THEME TOGGLE FIX ================= */

window.toggleTheme = () => {

    const isLight = document.body.classList.toggle("light");

    localStorage.setItem("theme", isLight);

};
/* ================= ADD TRANSACTION ================= */

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

document.getElementById("text").value="";
document.getElementById("amount").value="";
};

/* ================= DASHBOARD ================= */

function updateDashboard(){

if(!document.getElementById("balance")) return;

let total=0,inc=0,exp=0;

data.forEach(t=>{
total+=t.amount;
t.amount>0?inc+=t.amount:exp+=Math.abs(t.amount);
});

balance.innerText=`${currency}${total}`;
income.innerText=`${currency}${inc}`;
expense.innerText=`${currency}${exp}`;

updateBudget(exp);
}

updateDashboard();

/* ================= BUDGET ================= */

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

status.innerText =
p>=100?"⚠ Budget Exceeded!"
:p>=75?"⚠ Almost at limit"
:"You are within budget 👍";
}

/* ================= TRANSACTIONS PAGE ================= */

function renderTransactions(){

if(!document.getElementById("totalCount")) return;

const main=document.querySelector(".main");

let list=document.getElementById("transactionList");

if(!list){
list=document.createElement("div");
list.id="transactionList";
list.className="transaction-list";
main.appendChild(list);
}

list.innerHTML="";

let inc=0,exp=0;

data.forEach((t,i)=>{

t.amount>0?inc++:exp++;

list.innerHTML+=`
<div class="transaction-item">
<div class="trans-left">
<div class="trans-name">${t.text}</div>
<div class="trans-date">${t.date}</div>
</div>
<div>
<span class="${t.amount>0?'amount-income':'amount-expense'}">
${currency}${Math.abs(t.amount)}
</span>
<button class="delete-btn" onclick="deleteTransaction(${i})">X</button>
</div>
</div>`;
});

totalCount.innerText=data.length;
incomeCount.innerText=inc;
expenseCount.innerText=exp;
}

window.deleteTransaction=(i)=>{
data.splice(i,1);
save();
renderTransactions();
updateDashboard();
};

renderTransactions();

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

new Chart(analysisChart,{
type:"doughnut",
data:{
labels:["Income","Expense"],
datasets:[{
data:[inc,exp],
backgroundColor:["#22c55e","#ef4444"]
}]
}
});

if(categoryChart){
new Chart(categoryChart,{
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

monthlyReport.innerText=
`Income: ${currency}${inc}
Expense: ${currency}${exp}
Savings: ${currency}${inc-exp}`;
}

/* ================= SETTINGS ================= */

if(document.getElementById("budgetInput")){

budgetInput.value=localStorage.getItem("budget")||"";
currencySelect.value=currency;

window.saveSettings=()=>{
localStorage.setItem("budget",budgetInput.value);
localStorage.setItem("currency",currencySelect.value);
alert("Settings Updated");
location.reload();
};

window.resetData=()=>{
if(confirm("Delete all data?")){
localStorage.clear();
location.href="home.html";
}
};
}

/* ================= AI ASSISTANT ================= */

window.toggleChat=()=>{
const chat=document.getElementById("aiChat");
if(!chat) return;
chat.style.display=
chat.style.display==="flex"?"none":"flex";
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
t.amount>0?income+=t.amount:expense+=Math.abs(t.amount);
});

const balance=income-expense;
message=message.toLowerCase();

if(message.includes("balance"))
return `Your balance is ${currency}${balance}`;

if(message.includes("income"))
return `Income total is ${currency}${income}`;

if(message.includes("expense"))
return `Expenses are ${currency}${expense}`;

if(message.includes("save"))
return balance>0
?"You are saving money 👍"
:"You are overspending.";

return "Ask about balance, income, expenses or savings.";
}

/* ================= LOGOUT ================= */

window.logout=()=>{
localStorage.removeItem("auth");
location.href="home.html";
};

});