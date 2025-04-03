document.addEventListener("DOMContentLoaded", async () => {
    // Check if user is logged in
    try {
        const res = await fetch("/user-info");
        const data = await res.json();

        if (data.user) {
            document.getElementById("auth").style.display = "none";
            document.getElementById("chat").style.display = "block";
            document.getElementById("user-info").innerHTML = `
                <p>Welcome <strong>${data.user.username}</strong></p>
                <img src="${data.user.image}" alt="Profile Picture" width="50" height="50" style="border-radius: 50%;">
            `;
        }
    } catch (error) {
        console.error("Error fetching user info:", error);
    }

    // Toggle profile image field for signup
    document.getElementById("signup").addEventListener("click", () => {
        document.getElementById("profile-image-container").style.display = "block";
    });

    document.getElementById("login").addEventListener("click", () => {
        document.getElementById("profile-image-container").style.display = "none";
    });

    // Signup handler
    document.getElementById("signup").addEventListener("click", async () => {
        const username = document.getElementById("username").value;
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const image = document.getElementById("image-url").value;

        try {
            const res = await fetch("/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, password, image })
            });

            const data = await res.json();
            if (res.ok) {
                alert("Signup successful! You can now log in.");
                document.getElementById("profile-image-container").style.display = "none";
            } else {
                alert(data.error);
            }
        } catch (error) {
            alert("An error occurred while signing up.");
        }
    });

    // Login handler
    document.getElementById("login").addEventListener("click", async () => {
        const username = document.getElementById("username").value;
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        try {
            const res = await fetch("/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, password })
            });

            const data = await res.json();
            if (res.ok) {
                document.getElementById("auth").style.display = "none";
                document.getElementById("chat").style.display = "block";
                document.getElementById("user-info").innerHTML = `
                    <p>Welcome <strong>${data.message.split(' ')[1]}</strong></p>
                    <img src="${data.image}" alt="Profile Picture" width="50" height="50" style="border-radius: 50%;">
                `;
            } else {
                alert(data.error);
            }
        } catch (error) {
            console.error("Login Error:", error);
            alert("An error occurred during login.");
        }
    });

    // File attachment handler
    document.getElementById("attachment").addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            document.getElementById("file-info").textContent = 
                `Selected file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
        } else {
            document.getElementById("file-info").textContent = "";
        }
    });

    // Send message handler
    document.getElementById("send").addEventListener("click", async () => {
        const receiver = document.getElementById("receiver").value;
        const message = document.getElementById("message").value;
        const fileInput = document.getElementById("attachment");

        if (!receiver || !message) {
            alert("Please enter receiver and message");
            return;
        }

        const formData = new FormData();
        formData.append("receiver_username", receiver);
        formData.append("message", message);
        
        if (fileInput.files[0]) {
            formData.append("attachment", fileInput.files[0]);
        }

        try {
            const res = await fetch("/send-message", {
                method: "POST",
                body: formData
            });

            const data = await res.json();
            if (res.ok) {
                document.getElementById("message").value = "";
                document.getElementById("attachment").value = "";
                document.getElementById("file-info").textContent = "";
                alert("Message sent successfully!");
                loadMessages(); // Refresh messages
            } else {
                alert(data.error);
            }
        } catch (error) {
            console.error("Error sending message:", error);
            alert("An error occurred while sending the message.");
        }
    });

    // Load messages handler
    async function loadMessages() {
        try {
            const res = await fetch("/get-messages");
            const data = await res.json();
            
            document.getElementById("messages").innerHTML = data.messages
                .map(m => {
                    let attachmentHtml = "";
                    if (m.attachments) {
                        if (m.attachment_name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                            attachmentHtml = `
                                <div class="attachment">
                                    <p>Attachment: ${m.attachment_name}</p>
                                    <img src="${m.attachments}" style="max-width: 300px; max-height: 200px;">
                                </div>`;
                        } else {
                            attachmentHtml = `
                                <div class="attachment">
                                    <p>Attachment: ${m.attachment_name}</p>
                                    <a href="${m.attachments}" download>Download File</a>
                                </div>`;
                        }
                    }
                    
                    return `
                    <div class="message">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <img src="${m.sender_image || 'https://via.placeholder.com/40'}" 
                                 alt="Profile Picture" 
                                 width="40" 
                                 height="40" 
                                 style="border-radius: 50%;">
                            <div>
                                <strong>${m.sender_name}</strong> 
                                <em>(${new Date(m.sent_at).toLocaleString()})</em>
                                <p>${m.message}</p>
                                ${attachmentHtml}
                            </div>
                        </div>
                    </div>`;
                })
                .join("");
        } catch (error) {
            console.error("Error fetching messages:", error);
            alert("An error occurred while fetching messages.");
        }
    }

    // Refresh messages button
    document.getElementById("see-messages").addEventListener("click", loadMessages);

    // Logout handler
    document.getElementById("logout").addEventListener("click", async () => {
        await fetch("/logout", { method: "POST" });
        location.reload();
    });

    // Password Reset Modal Functionality
    const passwordResetModal = document.getElementById("password-reset-modal");
    const closeModal = document.querySelector(".close-modal");
    const resetPasswordBtn = document.getElementById("reset-password-btn");

    // Open modal when "Forgot Password" is clicked
    document.querySelectorAll('a[href="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            if (e.target.textContent === 'Forgot Password?') {
                e.preventDefault();
                passwordResetModal.style.display = "block";
            }
        });
    });

    // Close modal
    closeModal.addEventListener('click', () => {
        passwordResetModal.style.display = "none";
        document.getElementById("reset-message").textContent = "";
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === passwordResetModal) {
            passwordResetModal.style.display = "none";
            document.getElementById("reset-message").textContent = "";
        }
    });

    // Handle password reset
    resetPasswordBtn.addEventListener('click', async () => {
        const email = document.getElementById("reset-email").value;
        const newPassword = document.getElementById("new-password").value;
        const confirmPassword = document.getElementById("confirm-password").value;
        const resetMessage = document.getElementById("reset-message");

        if (!email || !newPassword || !confirmPassword) {
            resetMessage.textContent = "All fields are required";
            resetMessage.style.color = "red";
            return;
        }

        if (newPassword !== confirmPassword) {
            resetMessage.textContent = "Passwords don't match";
            resetMessage.style.color = "red";
            return;
        }

        try {
            const response = await fetch('/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, newPassword, confirmPassword })
            });

            const data = await response.json();

            if (response.ok) {
                resetMessage.textContent = data.message;
                resetMessage.style.color = "green";
                
                // Clear fields and close modal after 2 seconds
                setTimeout(() => {
                    passwordResetModal.style.display = "none";
                    resetMessage.textContent = "";
                    document.getElementById("reset-email").value = "";
                    document.getElementById("new-password").value = "";
                    document.getElementById("confirm-password").value = "";
                }, 2000);
            } else {
                resetMessage.textContent = data.error;
                resetMessage.style.color = "red";
            }
        } catch (error) {
            console.error('Password reset error:', error);
            resetMessage.textContent = "An error occurred. Please try again.";
            resetMessage.style.color = "red";
        }
    });

    // Feedback Modal Functionality
    const feedbackModal = document.getElementById("feedback-modal");
    const closeFeedbackModal = document.querySelector(".close-feedback-modal");
    const submitFeedbackBtn = document.getElementById("submit-feedback-btn");

    // Open feedback modal when "Contact Us" is clicked
    document.querySelectorAll('a[href="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            if (e.target.textContent === 'Contact us') {
                e.preventDefault();
                feedbackModal.style.display = "block";
            }
        });
    });

    // Close feedback modal
    closeFeedbackModal.addEventListener('click', () => {
        feedbackModal.style.display = "none";
        document.getElementById("feedback-message").textContent = "";
    });

    // Close when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === feedbackModal) {
            feedbackModal.style.display = "none";
            document.getElementById("feedback-message").textContent = "";
        }
    });

    // Handle feedback submission
    submitFeedbackBtn.addEventListener('click', async () => {
        const feedback = document.getElementById("feedback-text").value;
        const feedbackMessage = document.getElementById("feedback-message");

        if (!feedback || !feedback.trim()) {
            feedbackMessage.textContent = "Please enter your feedback";
            feedbackMessage.style.color = "red";
            return;
        }

        try {
            const response = await fetch('/submit-feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feedback: feedback.trim() })
            });

            const data = await response.json();

            if (response.ok) {
                feedbackMessage.textContent = data.message;
                feedbackMessage.style.color = "green";
                
                // Clear and close after 2 seconds
                setTimeout(() => {
                    feedbackModal.style.display = "none";
                    document.getElementById("feedback-text").value = "";
                    feedbackMessage.textContent = "";
                }, 2000);
            } else {
                feedbackMessage.textContent = data.error;
                feedbackMessage.style.color = "red";
            }
        } catch (error) {
            console.error('Feedback error:', error);
            feedbackMessage.textContent = "An error occurred. Please try again.";
            feedbackMessage.style.color = "red";
        }
    });

    // Load messages on page load if logged in
    if (document.getElementById("chat").style.display === "block") {
        loadMessages();
    }
});