document.addEventListener("DOMContentLoaded", async function () {
  // Jadikan fungsi event listener ini async untuk menggunakan await
  const urlParts = window.location.pathname.split("/");
  const projectNameFromURL = decodeURIComponent(urlParts[urlParts.length - 1]);

  const projectTitleEl = document.getElementById("project-title"); // Ambil elemen judul H1

  if (!projectNameFromURL || projectNameFromURL.trim() === "") {
    if (projectTitleEl) projectTitleEl.textContent = "Error";
    document.body.insertAdjacentHTML(
      "beforeend",
      "<h2 class='text-center mt-5 text-danger'>Nama proyek tidak ditemukan di URL.</h2>"
    );
    return;
  }

  // Set judul halaman awal saat loading
  if (projectTitleEl)
    projectTitleEl.textContent = `Loading ${projectNameFromURL}...`;
  document.title = `Detail ${projectNameFromURL}`;

  try {
    console.log(`Workspaceing details for project: ${projectNameFromURL}`);
    // Panggil API endpoint baru untuk mendapatkan detail proyek
    const response = await fetch(
      `/api/project-detail/${encodeURIComponent(projectNameFromURL)}`
    );

    if (!response.ok) {
      let errorMessage = `Gagal memuat proyek: Status ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // Biarkan errorMessage default jika respons bukan JSON atau parsing gagal
        console.warn("Response error bukan JSON:", await response.text());
      }
      throw new Error(errorMessage);
    }

    const project = await response.json(); // Data proyek dari server (termasuk project.img sebagai Base64)
    console.log("Data proyek diterima dari server:", project);

    // Update judul H1 dan judul tab browser dengan nama proyek yang benar dari server
    if (projectTitleEl)
      projectTitleEl.textContent = project.name || "Nama Proyek Tidak Tersedia";
    document.title = project.name || "Detail Proyek";

    // Set gambar proyek
    const imgElement = document.getElementById("project-img");
    if (imgElement) {
      if (project.img) {
        // project.img dari server adalah string Base64 Data URI
        imgElement.src = project.img;
        imgElement.alt = project.name || "Gambar Proyek";
      } else {
        imgElement.src = "/asset/placeholder-image.png"; // Sediakan gambar placeholder jika Anda punya di public/asset
        imgElement.alt = "Gambar tidak tersedia";
        console.warn(
          "Data gambar (project.img) tidak diterima dari server atau null untuk proyek:",
          project.name
        );
      }
    }

    // Tampilkan durasi
    const durationMonth = project.duration;
    const startDate = project.start ? new Date(project.start) : null;
    const endDate = project.end ? new Date(project.end) : null;

    // Penargetan elemen durasi sesuai HTML yang Anda berikan (list-project.hbs)
    const durationContainer = document.querySelector(".col-md-4 > div.mb-4");
    if (durationContainer) {
      const pElements = durationContainer.querySelectorAll("p");
      if (pElements.length >= 2) {
        if (startDate && endDate) {
          pElements[0].innerHTML = `<i class="bi bi-calendar-event me-2"></i>${formatDate(
            startDate
          )} – ${formatDate(endDate)}`;
        } else {
          pElements[0].innerHTML = `<i class="bi bi-calendar-event me-2"></i>Tanggal tidak tersedia`;
        }
        // Pastikan durationMonth adalah angka sebelum menampilkan "bulan"
        if (typeof durationMonth === "number" && !isNaN(durationMonth)) {
          pElements[1].innerHTML = `<i class="bi bi-clock me-2"></i>${durationMonth} bulan`;
        } else {
          pElements[1].innerHTML = `<i class="bi bi-clock me-2"></i>Durasi tidak tersedia`;
        }
      } else {
        console.warn(
          "Elemen <p> untuk durasi tidak ditemukan seperti yang diharapkan."
        );
      }
    } else {
      console.warn("Kontainer durasi tidak ditemukan.");
    }

    // Tampilkan teknologi
    const techMap = {
      react: {
        label: "React JS",
        icon: "https://img.icons8.com/color/48/000000/react-native.png",
      },
      typescript: {
        label: "TypeScript",
        icon: "https://img.icons8.com/color/48/000000/typescript.png",
      },
      node: {
        label: "Node JS",
        icon: "https://img.icons8.com/color/48/000000/nodejs.png",
      },
      next: {
        label: "Next JS",
        icon: "https://img.icons8.com/color/48/000000/nextjs.png",
      },
    };

    const techContainer = document.getElementById("tech-container");
    if (techContainer) {
      if (project.techs && typeof project.techs === "object") {
        techContainer.innerHTML = ""; // Bersihkan kontainer
        let techFound = false;
        for (const key in project.techs) {
          if (project.techs[key] === true && techMap[key]) {
            // Jika nilai tech true dan ada di map
            techContainer.innerHTML += `
                    <div class="col-6 d-flex align-items-center mb-2">
                    <img src="${techMap[key].icon}" class="tech-icon me-2" alt="${techMap[key].label}" />
                    <span>${techMap[key].label}</span>
                    </div>`;
            techFound = true;
          }
        }
        if (!techFound) {
          techContainer.innerHTML =
            "<div class='col-12'><p>Tidak ada teknologi spesifik yang terdaftar.</p></div>";
        }
      } else {
        console.warn("Data project.techs tidak ada atau bukan objek.");
        techContainer.innerHTML =
          "<div class='col-12'><p>Informasi teknologi tidak tersedia.</p></div>";
      }
    }

    // Tampilkan deskripsi
    const descElement = document.querySelector(".project-description");
    if (descElement) {
      const formattedDesc = project.desc
        ? project.desc.replace(/\n/g, "<br>")
        : "Deskripsi tidak tersedia.";
      descElement.innerHTML = `<p>${formattedDesc}</p>`;
    }
  } catch (error) {
    console.error("Gagal memuat detail proyek secara keseluruhan:", error);
    if (projectTitleEl) projectTitleEl.textContent = "Error Memuat Proyek";
    const mainContainer = document.querySelector(".container"); // Target kontainer utama di HBS
    if (mainContainer) {
      mainContainer.innerHTML = `<div class="alert alert-danger text-center mt-5" role="alert">Gagal memuat detail proyek: ${error.message}</div>`;
    } else {
      // Fallback jika .container tidak ada
      document.body.innerHTML = `<h2 class='text-center mt-5 text-danger'>Gagal memuat proyek: ${error.message}</h2>`;
    }
  }
});

// Helper function untuk format tanggal (pastikan ini ada dan benar)
function formatDate(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    console.warn("formatDate menerima tanggal tidak valid:", date);
    return "Tanggal Tidak Valid";
  }
  // Opsi format tanggal 'en-GB' (dd Month yyyy) atau 'id-ID' untuk format Indonesia
  const options = { day: "2-digit", month: "long", year: "numeric" };
  return date.toLocaleDateString("id-ID", options); // Menggunakan 'id-ID' untuk format Indonesia
}
