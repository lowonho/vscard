"use strict";

const profileImage = document.getElementById("profileImage");
const emailLink = document.getElementById("emailLink");
const copyStatus = document.getElementById("copyStatus");

let statusTimer = null;

/**
 * 프로필 이미지 로딩에 실패했을 때 사용할 기본 이미지 생성
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
 *
 * HTTPS 환경에서는 Clipboard API를 사용하고,
 * 로컬 HTML 또는 지원하지 않는 브라우저에서는
 * 임시 textarea 방식으로 복사합니다.
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
  temporaryInput.setSelectionRange(0, temporaryInput.value.length);

  const copied = document.execCommand("copy");

  temporaryInput.remove();

  if (!copied) {
    throw new Error("클립보드 복사를 지원하지 않는 환경입니다.");
  }
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

    const mailtoValue = emailLink.getAttribute("href") || "";
    const emailFromLink = mailtoValue
      .replace(/^mailto:/i, "")
      .split("?")[0]
      .trim();

    const email = emailFromLink || emailLink.textContent.trim();

    if (!email) {
      showCopyStatus("복사할 이메일 주소를 찾을 수 없습니다.");
      return;
    }

    try {
      await copyText(email);
      showCopyStatus("이메일 주소가 클립보드에 복사되었습니다.");
    } catch (error) {
      console.error("이메일 복사 실패:", error);
      showCopyStatus(
        "복사에 실패했습니다. 이메일 주소를 직접 선택해 주세요."
      );
    }
  });
}