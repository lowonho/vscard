const profileImage = document.getElementById("profileImage");

profileImage.addEventListener("error", () => {
  profileImage.src = "https://via.placeholder.com/300x300?text=Profile";
});