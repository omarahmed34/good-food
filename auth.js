// --- NEW CLEAN AUTH LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById("signupForm");
    const loginForm = document.getElementById("loginForm");

    if (signupForm) {
        // Remove existing listeners by cloning
        const newSignup = signupForm.cloneNode(true);
        signupForm.parentNode.replaceChild(newSignup, signupForm);
        
        newSignup.addEventListener("submit", async function (e) {
            e.preventDefault();
            const fullName = document.getElementById("fullName").value.trim();
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value.trim();
            const confirmPassword = document.getElementById("confirmPassword").value.trim();

            if (password !== confirmPassword) {
                alert("كلمة المرور غير متطابقة!");
                return;
            }

            const btn = newSignup.querySelector('button[type="submit"]');
            btn.innerHTML = 'جاري التسجيل...';
            btn.disabled = true;

            try {
                const response = await fetch('api.php?action=signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fullName, email, password })
                });
                const result = await response.json();

                if (result.success) {
                    alert("تم إنشاء الحساب بنجاح! سيتم تحويلك الآن.");
                    window.location.href = "index.html"; // Redirect to login
                } else {
                    alert("فشل التسجيل: " + (result.error || "خطأ غير معروف"));
                }
            } catch (error) {
                alert("خطأ في الاتصال بالخادم.");
            }
            btn.innerHTML = 'إنشاء حساب';
            btn.disabled = false;
        });
    }

    if (loginForm) {
        // Remove existing listeners by cloning
        const newLogin = loginForm.cloneNode(true);
        loginForm.parentNode.replaceChild(newLogin, loginForm);

        newLogin.addEventListener("submit", async function (e) {
            e.preventDefault();
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value.trim();

            const btn = newLogin.querySelector('button[type="submit"]');
            btn.innerHTML = 'جاري الدخول...';
            btn.disabled = true;

            try {
                const response = await fetch('api.php?action=login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const result = await response.json();

                if (result.success) {
                    localStorage.setItem('user', JSON.stringify(result.user));
                    window.location.href = "home.html";
                } else {
                    alert("فشل الدخول: " + (result.error || "تأكد من البريد الإلكتروني أو كلمة المرور"));
                }
            } catch (error) {
                alert("خطأ في الاتصال بالخادم.");
            }
            btn.innerHTML = 'دخول';
            btn.disabled = false;
        });
    }
});
