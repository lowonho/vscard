"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const profileImage = document.getElementById("profileImage");
  const businessCard = document.querySelector(".business-card");
  const emailLink = document.getElementById("emailLink");
  const copyStatus = document.getElementById("copyStatus");

  let statusTimer = null;

  /**
   * 프로필 이미지 로딩 실패 시 표시할 기본 이미지
   */
  function createProfileFallback() {
    const svg = `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="300"
        height="300"
        viewBox="0 0 300 300"
      >
        <rect width="300" height="300" fill="#1e2a45" />
        <circle cx="150" cy="115" r="52" fill="#b2ccff" />
        <path
          d="M55 270c10-65 52-95 95-95s85 30 95 95"
          fill="#b2ccff"
        />
      </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  /**
   * 이메일 복사 결과 메시지 표시
   */
  function showCopyStatus(message) {
    if (!copyStatus) {
      window.alert(message);
      return;
    }

    copyStatus.textContent = message;

    if (statusTimer) {
      window.clearTimeout(statusTimer);
    }

    statusTimer = window.setTimeout(() => {
      copyStatus.textContent = "";
    }, 2500);
  }

  /**
   * 클립보드에 문자열 복사
   */
  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const temporaryInput = document.createElement("textarea");

    temporaryInput.value = text;
    temporaryInput.setAttribute("readonly", "");
    temporaryInput.style.position = "fixed";
    temporaryInput.style.top = "0";
    temporaryInput.style.left = "0";
    temporaryInput.style.width = "1px";
    temporaryInput.style.height = "1px";
    temporaryInput.style.opacity = "0";
    temporaryInput.style.pointerEvents = "none";

    document.body.appendChild(temporaryInput);

    temporaryInput.focus();
    temporaryInput.select();
    temporaryInput.setSelectionRange(
      0,
      temporaryInput.value.length
    );

    const copied = document.execCommand("copy");

    temporaryInput.remove();

    if (!copied) {
      throw new Error("클립보드 복사를 지원하지 않는 환경입니다.");
    }
  }

  /**
   * 카드가 위로 떠오르는 효과
   */
  if (businessCard) {
    const defaultShadow =
      "0 0 30px rgba(178, 204, 255, 0.15)";

    const hoverShadow =
      "0 20px 50px rgba(178, 204, 255, 0.3)";

    businessCard.style.transition =
      "transform 0.3s ease, box-shadow 0.3s ease";

    businessCard.style.transform = "translateY(0)";
    businessCard.style.boxShadow = defaultShadow;
    businessCard.style.willChange = "transform, box-shadow";

    const liftCard = () => {
      businessCard.style.transform =
        "translateY(-12px) scale(1.01)";

      businessCard.style.boxShadow = hoverShadow;
    };

    const resetCard = () => {
      businessCard.style.transform =
        "translateY(0) scale(1)";

      businessCard.style.boxShadow = defaultShadow;
    };

    businessCard.addEventListener("pointerenter", liftCard);
    businessCard.addEventListener("pointerleave", resetCard);

    // 키보드로 카드 내부 링크에 접근할 때도 효과 적용
    businessCard.addEventListener("focusin", liftCard);

    businessCard.addEventListener("focusout", (event) => {
      const nextElement = event.relatedTarget;

      if (
        nextElement instanceof Node &&
        businessCard.contains(nextElement)
      ) {
        return;
      }

      resetCard();
    });
  }

  /**
   * 프로필 이미지 오류 처리
   */
  if (profileImage) {
    profileImage.addEventListener(
      "error",
      () => {
        profileImage.src = createProfileFallback();
      },
      { once: true }
    );
  }

  /**
   * 이메일 클릭 시 클립보드 복사
   */
  if (emailLink) {
    emailLink.addEventListener("click", async (event) => {
      event.preventDefault();

      const mailtoValue =
        emailLink.getAttribute("href") || "";

      const emailFromLink = mailtoValue
        .replace(/^mailto:/i, "")
        .split("?")[0]
        .trim();

      const email =
        emailFromLink || emailLink.textContent.trim();

      if (!email) {
        showCopyStatus(
          "복사할 이메일 주소를 찾을 수 없습니다."
        );
        return;
      }

      try {
        await copyText(email);

        showCopyStatus(
          "이메일 주소가 클립보드에 복사되었습니다."
        );
      } catch (error) {
        console.error("이메일 복사 실패:", error);

        showCopyStatus(
          "복사에 실패했습니다. 이메일 주소를 직접 선택해 주세요."
        );
      }
    });
  }
});