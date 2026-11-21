"use strict";

function initializeBusinessCard() {
  const profileImage = document.getElementById("profileImage");

  for (const total of document.querySelectorAll(".personal-records details [data-record-items]")) {
    const records = total.closest("details").querySelectorAll(total.dataset.recordItems);
    total.textContent = `${records.length}개`;
  }

  const statusTimers = new WeakMap();

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
        <rect width="300" height="300" fill="#c7dfd4" />
        <circle cx="150" cy="115" r="52" fill="#193a34" />
        <path
          d="M55 270c10-65 52-95 95-95s85 30 95 95"
          fill="#193a34"
        />
      </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function showCopyStatus(link, message) {
    const status = link.closest(".detail-body")?.querySelector(".copy-status") || document.getElementById("copyStatus");
    if (!status) {
      window.alert(message);
      return;
    }
    status.textContent = message;
    window.clearTimeout(statusTimers.get(status));
    statusTimers.set(status, window.setTimeout(() => {
      status.textContent = "";
      statusTimers.delete(status);
    }, 2500));
  }

  /**
   * 문자열을 클립보드에 복사
   *
   * HTTPS 환경에서는 Clipboard API를 사용하고,
   * 로컬 파일 환경에서는 임시 textarea 방식으로 처리합니다.
   */
  async function copyText(text, source) {
    if (!text) {
      throw new Error("복사할 내용이 없습니다.");
    }

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        // Some embedded views expose the API but deny clipboard writes.
      }
    }

    const temporaryInput = document.createElement("textarea");

    temporaryInput.value = text;
    temporaryInput.setAttribute("readonly", "");
    temporaryInput.style.position = "fixed";
    temporaryInput.style.top = "-9999px";
    temporaryInput.style.left = "-9999px";
    temporaryInput.style.opacity = "0";
    temporaryInput.style.pointerEvents = "none";

    const container = source.closest("dialog[open]") || document.body;
    const previousFocus = document.activeElement;
    container.append(temporaryInput);
    try {
      temporaryInput.focus({ preventScroll: true });
      temporaryInput.select();
      if (!document.execCommand("copy")) {
        throw new Error("클립보드 복사에 실패했습니다.");
      }
    } finally {
      temporaryInput.remove();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    }
  }

  // 목록과 바다의 연락처가 각자 열린 자리에서 복사 결과를 표시합니다.
  document.addEventListener("click", async event => {
    const link = event.target.closest('.contact-list a[href^="mailto:"], .contact-list a[href^="tel:"], #emailLink, #phoneLink');
    if (!link) return;
    event.preventDefault();
    const email = link.protocol === "mailto:" || link.id === "emailLink";
    const address = link.getAttribute("href") || "";
    const value = link.textContent.trim() || decodeURIComponent(email
      ? address.replace(/^mailto:/i, "").split("?")[0]
      : address.replace(/^tel:/i, "")).trim();
    if (!value) {
      showCopyStatus(link, "복사할 정보를 찾을 수 없습니다.");
      return;
    }
    try {
      await copyText(value, link);
      showCopyStatus(link, email ? "이메일 주소가 클립보드에 복사되었습니다." : "전화번호가 클립보드에 복사되었습니다.");
    } catch (error) {
      console.error("클립보드 복사 실패:", error);
      showCopyStatus(link, "복사에 실패했습니다. 내용을 직접 선택해 주세요.");
    }
  });

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
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeBusinessCard, { once: true });
} else {
  initializeBusinessCard();
}
