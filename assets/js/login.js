const loginBtn = document.getElementById("loginBtn");

if (loginBtn) {
  loginBtn.addEventListener("click", () => {
    loginBtn.textContent = "登录中...";
    setTimeout(() => {
      window.location.href = "smart-query.html";
    }, 450);
  });
}
