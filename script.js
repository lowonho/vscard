const profileImage = document.getElementById("profileImage");
const businessCard = document.querySelector(".business-card");
const emailLink = document.querySelector('a[href^="mailto:"]');

if (profileImage) {
  profileImage.addEventListener("error", () => {
    profileImage.src = "https://via.placeholder.com/300x300?text=Profile";
  });
}

if (businessCard) {
  businessCard.style.transition = "transform 0.3s ease, box-shadow 0.3s ease";
  businessCard.style.cursor = "default";

  businessCard.addEventListener("mouseenter", () => {
    businessCard.style.transform = "translateY(-10px)";
    businessCard.style.boxShadow = "0 18px 45px rgba(178, 204, 255, 0.25)";
  });

  businessCard.addEventListener("mouseleave", () => {
    businessCard.style.transform = "translateY(0)";
    businessCard.style.boxShadow = "0 0 30px rgba(178, 204, 255, 0.15)";
  });
}

if (emailLink) {
  emailLink.addEventListener("click", async (event) => {
    event.preventDefault();

    const email = emailLink.textContent.trim();

    try {
      await navigator.clipboard.writeText(email);
      alert("이메일이 클립보드에 복사되었습니다.");
    } catch (error) {
      console.error("이메일 복사 실패:", error);
      alert("이메일 복사에 실패했습니다.");
    }
  });
}