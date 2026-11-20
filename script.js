"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const profileImage = document.getElementById("profileImage");

  // ID가 없어도 mailto, tel 링크를 자동으로 찾습니다.
  const emailLink =
    document.getElementById("emailLink") ||
    document.querySelector('a[href^="mailto:"]');

  const phoneLink =
    document.getElementById("phoneLink") ||
    document.querySelector('a[href^="tel:"]');

  const copyStatus = document.getElementById("copyStatus");

  let statusTimer = null;

  /**
   * 프로필 이미지 로딩 실패 시 사용할 기본 이미지
   */
  function createProfileFallback() {
    const svg = `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="300"
        height="300"
        viewBox="0 0 300 300"
      >
        <rect width="300" height="300" fill="#1a2635" />
        <circle cx="150" cy="115" r="52" fill="#efbb78" />
        <path
          d="M55 270c10-65 52-95 95-95s85 30 95 95"
          fill="#efbb78"
        />
      </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  /**
   * 복사 결과 메시지 표시
   *
   * copyStatus 요소가 없으면 alert로 표시합니다.
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
   * 문자열을 클립보드에 복사
   *
   * HTTPS 환경에서는 Clipboard API를 사용하고,
   * 로컬 파일 환경에서는 임시 textarea 방식으로 처리합니다.
   */
  async function copyText(text) {
    if (!text) {
      throw new Error("복사할 내용이 없습니다.");
    }

    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const temporaryInput = document.createElement("textarea");

    temporaryInput.value = text;
    temporaryInput.setAttribute("readonly", "");
    temporaryInput.style.position = "fixed";
    temporaryInput.style.top = "-9999px";
    temporaryInput.style.left = "-9999px";
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
      throw new Error("클립보드 복사에 실패했습니다.");
    }
  }

  /**
   * 복사 이벤트 공통 등록
   */
  function addCopyEvent(linkElement, getValue, successMessage) {
    if (!linkElement) {
      return;
    }

    linkElement.addEventListener("click", async (event) => {
      event.preventDefault();

      const value = getValue(linkElement);

      if (!value) {
        showCopyStatus("복사할 정보를 찾을 수 없습니다.");
        return;
      }

      try {
        await copyText(value);
        showCopyStatus(successMessage);
      } catch (error) {
        console.error("클립보드 복사 실패:", error);

        showCopyStatus(
          "복사에 실패했습니다. 내용을 직접 선택해 주세요."
        );
      }
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
  addCopyEvent(
    emailLink,
    (link) => {
      const displayedEmail = link.textContent.trim();

      if (displayedEmail) {
        return displayedEmail;
      }

      const href = link.getAttribute("href") || "";

      return decodeURIComponent(
        href.replace(/^mailto:/i, "").split("?")[0]
      ).trim();
    },
    "이메일 주소가 클립보드에 복사되었습니다."
  );

  /**
   * 전화번호 클릭 시 클립보드 복사
   */
  addCopyEvent(
    phoneLink,
    (link) => {
      const displayedPhone = link.textContent.trim();

      if (displayedPhone) {
        return displayedPhone;
      }

      const href = link.getAttribute("href") || "";

      return decodeURIComponent(
        href.replace(/^tel:/i, "")
      ).trim();
    },
    "전화번호가 클립보드에 복사되었습니다."
  );
});
