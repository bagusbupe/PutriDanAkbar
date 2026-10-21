/**
 * The Wedding of Putri & Akbar - Whimsy Bloom
 * Interactions & Firebase Firestore Realtime Comments
 */

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyApMr0El8g6LYhNpBW2yj7ZWZpP0rHNSFo",
  authDomain: "putri-akbar2026.firebaseapp.com",
  projectId: "putri-akbar2026",
  storageBucket: "putri-akbar2026.firebasestorage.app",
  messagingSenderId: "154432298342",
  appId: "1:154432298342:web:4dcf6b568a7c22ea0b3ca7",
  measurementId: "G-1NKSPXE2D6"
};

// State Firebase
let db = null;
let wishesCollection = null;
let fbAddDoc = null;
let fbServerTimestamp = null;

// Default Wishes (kosong jika belum ada di database)
const defaultWishes = [];

function getStoredWishes() {
  try {
    const stored = localStorage.getItem("putri_akbar_wishes");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveWishesLocally(wishes) {
  try {
    localStorage.setItem("putri_akbar_wishes", JSON.stringify(wishes));
  } catch (e) {
    console.warn("Gagal simpan ke localStorage:", e);
  }
}

function renderWishes(wishes) {
  const wishesStream = document.getElementById("wishes-stream");
  if (!wishesStream) return;
  wishesStream.innerHTML = "";

  if (!wishes || wishes.length === 0) {
    wishesStream.innerHTML = `
      <div style="text-align:center;padding:28px 16px;color:rgb(101,75,98);font-family:var(--f-body);font-size:14px">
        Belum ada ucapan. Jadilah yang pertama memberikan doa restu!
      </div>
    `;
    return;
  }

  wishes.forEach((w, index) => {
    const isEven = index % 2 === 0;
    const bg = isEven ? "rgb(253, 227, 234)" : "rgb(227, 239, 251)";
    const rot = isEven ? "-0.6deg" : "0.6deg";

    const card = document.createElement("div");
    card.style.cssText = `position: relative; background: ${bg}; border-radius: 14px; box-shadow: rgba(80, 40, 70, 0.12) 0px 1px 2px, rgba(80, 40, 70, 0.12) 0px 8px 18px; padding: 14px 16px; rotate: ${rot};`;

    const badgeText = w.attendance ? `<span style="display:inline-block;margin-left:8px;font-size:11px;font-family:var(--f-body);background:rgba(168,69,106,0.15);color:rgb(168,69,106);padding:2px 8px;border-radius:999px">${escapeHtml(w.attendance)}</span>` : "";

    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <p style="margin:0;font-family:var(--f-script);font-weight:700;font-size:calc(19px * var(--s-display));line-height:1.2;letter-spacing:0px;color:rgb(131,48,79)">
          ${escapeHtml(w.name)}
        </p>
        ${badgeText}
      </div>
      <p style="margin:0;font-family:var(--f-body);font-size:14.5px;font-weight:500;line-height:1.55;color:rgb(101,75,98)">
        ${escapeHtml(w.message)}
      </p>
    `;
    wishesStream.appendChild(card);
  });
}

// ==================== INTI INISIALISASI HALAMAN ====================
function updateCoverScale() {
  const availH = window.innerHeight;
  const availW = Math.min(window.innerWidth, 440);
  const refH = 780;
  const refW = 390;
  const scale = Math.min(1, availH / refH, (availW < refW ? availW / refW : 1));
  document.documentElement.style.setProperty('--cover-scale', scale.toFixed(4));
}
updateCoverScale();
window.addEventListener('resize', updateCoverScale);
window.addEventListener('orientationchange', updateCoverScale);

function initInvitation() {
  updateCoverScale();

  // 1. Parse Nama Tamu dari URL (?to=Nama+Tamu)
  const urlParams = new URLSearchParams(window.location.search);
  const guestParam = urlParams.get("to") || urlParams.get("u") || urlParams.get("guest");
  const guestNameElement = document.getElementById("guest-name");

  if (guestParam && guestNameElement) {
    let cleanName = guestParam;
    try {
      cleanName = decodeURIComponent(guestParam.replace(/\+/g, " "));
    } catch {
      cleanName = guestParam.replace(/\+/g, " ");
    }
    guestNameElement.textContent = cleanName;
  }

  // 2. Gate / Cover Screen & Audio
  const invRoot = document.querySelector(".inv-root");
  const btnOpen = document.getElementById("btn-open");
  const bgAudio = document.getElementById("bg-audio");
  const musicBtn = document.getElementById("music-btn");

  const playMusic = () => {
    if (bgAudio) {
      bgAudio.volume = 0.7;
      bgAudio.play().then(() => {
        if (musicBtn) musicBtn.classList.remove("paused");
      }).catch((err) => {
        console.warn("Autoplay dicegah browser:", err);
        if (musicBtn) musicBtn.classList.add("paused");
      });
    }
  };

  if (btnOpen) {
    btnOpen.addEventListener("click", () => {
      // Lepas lock scroll pada body
      document.body.classList.remove("gate-active");

      // Buka cover ke atas
      if (invRoot) {
        invRoot.setAttribute("data-phase", "open");
      }

      // Picu animasi muncul untuk seksi pembuka saat cover terangkat
      setTimeout(() => {
        const splashReveals = document.querySelectorAll('[data-band="splash"] [data-reveal]');
        splashReveals.forEach((el) => el.setAttribute("data-seen", ""));
      }, 350);

      // Putar musik latar
      playMusic();
    });
  }

  // Toggle Musik
  if (musicBtn) {
    musicBtn.addEventListener("click", () => {
      if (!bgAudio) return;

      if (bgAudio.paused) {
        bgAudio.play().then(() => {
          musicBtn.classList.remove("paused");
        });
      } else {
        bgAudio.pause();
        musicBtn.classList.add("paused");
      }
    });
  }

  // 3. Countdown Timer (24 April 2027 08:00 WIB)
  const weddingDate = new Date("2027-04-24T08:00:00+07:00").getTime();
  const cdDays = document.getElementById("cd-days");
  const cdHours = document.getElementById("cd-hours");
  const cdMins = document.getElementById("cd-mins");
  const cdSecs = document.getElementById("cd-secs");

  const updateCountdown = () => {
    const now = new Date().getTime();
    const distance = weddingDate - now;

    if (distance > 0) {
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((distance % (1000 * 60)) / 1000);

      if (cdDays) cdDays.textContent = String(days);
      if (cdHours) cdHours.textContent = String(hours).padStart(2, "0");
      if (cdMins) cdMins.textContent = String(mins).padStart(2, "0");
      if (cdSecs) cdSecs.textContent = String(secs).padStart(2, "0");
    } else {
      if (cdDays) cdDays.textContent = "0";
      if (cdHours) cdHours.textContent = "00";
      if (cdMins) cdMins.textContent = "00";
      if (cdSecs) cdSecs.textContent = "00";
    }
  };

  setInterval(updateCountdown, 1000);
  updateCountdown();

  // 4. Lightbox Galeri
  const zoomBtns = document.querySelectorAll(".gallery-zoom-btn");
  const lightboxModal = document.getElementById("lightbox-modal");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxClose = document.getElementById("lightbox-close");
  const lightboxBackdrop = document.querySelector(".lightbox-backdrop");

  zoomBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const fullSrc = btn.getAttribute("data-full");
      if (fullSrc && lightboxImg && lightboxModal) {
        lightboxImg.src = fullSrc;
        lightboxModal.classList.remove("hidden");
        lightboxModal.setAttribute("aria-hidden", "false");
      }
    });
  });

  const closeLightbox = () => {
    if (lightboxModal && lightboxImg) {
      lightboxModal.classList.add("hidden");
      lightboxModal.setAttribute("aria-hidden", "true");
      lightboxImg.src = "";
    }
  };

  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  if (lightboxBackdrop) lightboxBackdrop.addEventListener("click", closeLightbox);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightboxModal && !lightboxModal.classList.contains("hidden")) {
      closeLightbox();
    }
  });

  // Tampilkan komentar awal (dari localStorage atau default)
  renderWishes(getStoredWishes());

  // 5. Handle Form Submit
  const rsvpForm = document.getElementById("rsvp-form");
  const submitBtn = document.getElementById("btn-submit-rsvp");

  if (rsvpForm) {
    rsvpForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("rsvp-name").value.trim();
      const message = document.getElementById("rsvp-message").value.trim();

      if (!name || !message) return;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.7";
        submitBtn.innerHTML = `<span>Mengirim...</span>`;
      }

      // Jika Firestore siap, kirim ke Cloud
      if (db && wishesCollection && fbAddDoc && fbServerTimestamp) {
        try {
          await fbAddDoc(wishesCollection, {
            name: name,
            attendance: currentAttendance,
            guests: currentGuests,
            message: message,
            createdAt: fbServerTimestamp()
          });

          rsvpForm.reset();
          currentGuests = 1;
          const countEl = document.getElementById("guest-count-val");
          if (countEl) countEl.textContent = "1";

          showToast("Terima kasih! Ucapan Anda telah terkirim.");
        } catch (err) {
          console.error("Gagal kirim ke Firestore:", err);
          // Fallback lokal
          saveLocalAndShow(name, message);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = "1";
            submitBtn.innerHTML = `<span style="white-space:pre-line">Kirim</span>`;
          }
        }
      } else {
        // Mode offline/lokal langsung
        saveLocalAndShow(name, message);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.style.opacity = "1";
          submitBtn.innerHTML = `<span style="white-space:pre-line">Kirim</span>`;
        }
      }
    });
  }

  function saveLocalAndShow(name, message) {
    const newWish = { name, message, attendance: currentAttendance };
    const current = getStoredWishes();
    current.unshift(newWish);
    saveWishesLocally(current);
    renderWishes(current);
    rsvpForm.reset();
    showToast("Ucapan terkirim!");
  }

  // 6. Scroll Reveal Observer (Animasi Scroll Mirip Aslinya)
  const reveals = document.querySelectorAll("[data-reveal]");
  if (reveals.length) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.setAttribute("data-seen", "");
          if (entry.target.hasAttribute("data-story-row")) {
            const dot = entry.target.querySelector("[data-story-dot]");
            if (dot) dot.setAttribute("data-story-passed", "");
          }
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      rootMargin: "0px 0px -8% 0px",
      threshold: 0.05
    });

    reveals.forEach((el) => {
      revealObserver.observe(el);
    });
  }

  // 7. Muat Firebase secara dinamis di latar belakang (tanpa memblokir halaman)
  loadFirebaseRealtime();
}

// Muat Firebase SDK secara asinkron
async function loadFirebaseRealtime() {
  try {
    const fbApp = await import("https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js");
    const fbFs = await import("https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js");

    const app = fbApp.initializeApp(firebaseConfig);
    db = fbFs.getFirestore(app);
    wishesCollection = fbFs.collection(db, "wishes");
    fbAddDoc = fbFs.addDoc;
    fbServerTimestamp = fbFs.serverTimestamp;

    // Pasang Realtime Listener
    const q = fbFs.query(wishesCollection, fbFs.orderBy("createdAt", "desc"));
    fbFs.onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const firestoreWishes = [];
        snapshot.forEach((doc) => {
          firestoreWishes.push(doc.data());
        });
        renderWishes(firestoreWishes);
      } else {
        renderWishes([]);
      }
    }, (err) => {
      console.warn("Firestore listener info:", err);
    });

    console.log("Firebase Firestore berhasil terhubung!");
  } catch (e) {
    console.warn("Firebase tidak dapat dimuat (misal protokol file:/// atau offline). Menggunakan mode lokal.", e);
  }
}

// Pastikan skrip langsung berjalan baik saat loading maupun setelah DOM siap
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initInvitation);
} else {
  initInvitation();
}

// ==================== GLOBAL HELPER FUNCTIONS ====================

// Attendance Selection
let currentAttendance = "Hadir";
window.setAttendance = function(val) {
  currentAttendance = val;
  const btnHadir = document.getElementById("btn-hadir");
  const btnTidak = document.getElementById("btn-tidakhadir");

  if (val === "Hadir") {
    btnHadir.classList.add("active");
    btnTidak.classList.remove("active");
  } else {
    btnTidak.classList.add("active");
    btnHadir.classList.remove("active");
  }
};

// Guest Counter Stepper
let currentGuests = 1;
window.changeGuestCount = function(delta) {
  const countEl = document.getElementById("guest-count-val");
  if (!countEl) return;
  currentGuests = Math.max(1, Math.min(10, currentGuests + delta));
  countEl.textContent = String(currentGuests);
};

// Salin Nomor Rekening / Alamat
window.copyAccount = function(elementId, buttonEl) {
  const target = document.getElementById(elementId);
  if (!target) return;

  const textToCopy = target.textContent.trim();

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(textToCopy).then(() => {
      triggerCopyFeedback(buttonEl);
    }).catch(() => {
      fallbackCopyText(textToCopy, buttonEl);
    });
  } else {
    fallbackCopyText(textToCopy, buttonEl);
  }
};

function fallbackCopyText(text, buttonEl) {
  const tempInput = document.createElement("textarea");
  tempInput.value = text;
  document.body.appendChild(tempInput);
  tempInput.select();
  document.execCommand("copy");
  document.body.removeChild(tempInput);
  triggerCopyFeedback(buttonEl);
}

function triggerCopyFeedback(buttonEl) {
  showToast("Berhasil disalin ke clipboard!");

  if (buttonEl) {
    const originalText = buttonEl.textContent;
    buttonEl.textContent = "Tersalin! ✓";
    setTimeout(() => {
      buttonEl.textContent = originalText;
    }, 1800);
  }
}

// Toast Notification
function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.remove("hidden");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, 2500);
}

// HTML Sanitizer
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
