// Initialize projects array (akan diisi dari server)
let projects = [];
let currentEditId = null; // Menyimpan ID client-side (Date.now().toString()) untuk item yang diedit

// --- FUNGSI UTAMA UNTUK MENGAMBIL DAN MERENDER PROYEK DARI SERVER ---
async function fetchAndRenderProjects() {
  try {
    console.log("Fetching projects from server...");
    const response = await fetch("/api/projects");
    if (!response.ok) {
      const errData = await response
        .json()
        .catch(() => ({ message: `Server error: ${response.status}` }));
      throw new Error(errData.message);
    }
    const serverProjects = await response.json();
    console.log("Projects fetched from server:", serverProjects);

    // Map server data ke struktur yang mungkin sedikit berbeda jika client punya ID sendiri
    // atau jika ada transformasi yang hanya dilakukan di client.
    // Untuk sekarang, kita asumsikan serverProjects sudah dalam format yang baik.
    // Jika server tidak mengirim 'id' client-side, kita bisa buat di sini atau tidak pakai sama sekali jika 'name' adalah PK.
    // Untuk konsistensi dengan kode edit/delete yang pakai ID client-side, kita cek.
    // Jika 'project-name' adalah PK dan unik, itu bisa jadi ID utama.
    // Client-side 'id' (timestamp) berguna untuk key di React/Vue atau operasi array sementara.
    projects = serverProjects.map((p) => ({
      ...p,
      // Jika server tidak mengirim 'id' client-side, dan Anda membutuhkannya:
      // id: p.client_side_id || p.name, // p.name sebagai fallback jika 'project-name' adalah PK
      // Jika server mengirim 'createdAt' sebagai string, ubah ke Date object jika perlu,
      // tapi untuk JSON.stringify(p) di data-project, string lebih aman.
      // Pastikan 'techs' dan 'img' (Base64) dikirim dengan benar oleh server.
      id: p.name, // Menggunakan nama proyek sebagai ID di sisi klien untuk operasi CRUD ke server
      // 'img' dari server adalah Base64, 'techs' juga dari server
    }));

    renderCards();

    // Simpan versi "ringan" (tanpa Base64 gambar) ke localStorage untuk caching atau offline sederhana
    const projectsForLocalStorage = projects.map((p) => {
      const { img, ...projectWithoutImg } = p;
      return projectWithoutImg;
    });
    localStorage.setItem(
      "allProjects",
      JSON.stringify(projectsForLocalStorage)
    );
    console.log(
      "Updated localStorage with projects from server (without image Base64)."
    );
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    alert(
      `Gagal memuat proyek dari server: ${error.message}. Mungkin coba muat dari cache lokal.`
    );
    // Fallback ke localStorage jika fetch gagal (opsional)
    try {
      const storedProjects = localStorage.getItem("allProjects");
      if (storedProjects) {
        projects = JSON.parse(storedProjects).map((p) => ({
          ...p,
          id: p.name,
        })); // Pastikan ada ID
        console.log("Loaded projects from localStorage as fallback:", projects);
        renderCards();
      }
    } catch (e) {
      console.error("Error parsing projects from localStorage on fallback:", e);
    }
  }
}

document.addEventListener("DOMContentLoaded", function () {
  fetchAndRenderProjects(); // Muat data dari server saat halaman siap
});

function populateFormForEdit(projectIdClient) {
  // projectIdClient adalah 'name' dari proyek
  // Karena kita menggunakan 'name' sebagai ID untuk server, kita cari berdasarkan 'name'
  const projectToEdit = projects.find((p) => p.name === projectIdClient);
  if (!projectToEdit) {
    console.error("Project not found for editing with name:", projectIdClient);
    return;
  }

  currentEditId = projectToEdit.name; // Simpan 'name' (PK) sebagai ID yang diedit

  document.getElementById("project-name").value = projectToEdit.name;
  // Untuk sementara, kita tidak izinkan edit nama proyek jika itu adalah Primary Key yang immutable.
  // Jika boleh, perlu penanganan khusus di server.
  // document.getElementById("project-name").disabled = true; // Contoh: disable edit nama PK

  if (projectToEdit.start) {
    document.getElementById("start-date").value = new Date(projectToEdit.start)
      .toISOString()
      .split("T")[0];
  }
  if (projectToEdit.end) {
    document.getElementById("end-date").value = new Date(projectToEdit.end)
      .toISOString()
      .split("T")[0];
  }
  document.getElementById("description").value = projectToEdit.desc;

  // Set checkboxes berdasarkan objek 'techs'
  // Pastikan projectToEdit.techs ada dan merupakan objek
  if (projectToEdit.techs && typeof projectToEdit.techs === "object") {
    document.getElementById("techNode").checked = !!projectToEdit.techs.node;
    document.getElementById("techReact").checked = !!projectToEdit.techs.react;
    document.getElementById("techNext").checked = !!projectToEdit.techs.next;
    document.getElementById("techTS").checked =
      !!projectToEdit.techs.typescript;
  } else {
    // Default jika techs tidak ada atau formatnya salah
    document.getElementById("techNode").checked = false;
    document.getElementById("techReact").checked = false;
    document.getElementById("techNext").checked = false;
    document.getElementById("techTS").checked = false;
  }

  document.getElementById("project-image").value = "";
  // Anda bisa menampilkan preview gambar projectToEdit.img di sini

  const submitButton = document
    .getElementById("project-form")
    .querySelector('button[type="submit"]');
  if (submitButton) submitButton.textContent = "Update Project";

  const projectFormEl = document.getElementById("project-form");
  if (projectFormEl) projectFormEl.scrollIntoView({ behavior: "smooth" });
}

function getData(e) {
  console.log("Fungsi getData() dipanggil!");
  e.preventDefault();

  const name = document.getElementById("project-name").value;
  const startValue = document.getElementById("start-date").value;
  const endValue = document.getElementById("end-date").value;
  const desc = document.getElementById("description").value;
  const node = document.getElementById("techNode").checked;
  const react = document.getElementById("techReact").checked;
  const next = document.getElementById("techNext").checked;
  const typescript = document.getElementById("techTS").checked;
  const imageFile = document.getElementById("project-image").files[0];

  if (!name || !desc || !startValue || !endValue) {
    alert(
      "Nama Proyek, Tanggal Mulai, Tanggal Selesai, dan Deskripsi wajib diisi."
    );
    return;
  }

  const start = Date.parse(startValue);
  const end = Date.parse(endValue);

  if (isNaN(start) || isNaN(end) || end < start) {
    alert(
      "Format tanggal tidak valid atau tanggal selesai sebelum tanggal mulai."
    );
    return;
  }

  const techs = { node, react, next, typescript };

  const processProjectDataWithServer = (imgResultUrlForServer) => {
    // imgResultUrlForServer adalah Base64 jika ada gambar baru, atau null jika tidak ada gambar baru saat edit

    const projectPayload = {
      name: name, // Nama bisa jadi baru jika diedit (tapi PK lama tetap di currentEditId)
      start: start,
      end: end,
      desc: desc,
      techs: techs,
      img: imgResultUrlForServer, // Akan null jika tidak ada file baru dipilih saat edit
      // atau Base64 jika ada file baru untuk Add/Edit
    };

    if (currentEditId) {
      // --- UPDATE EXISTING PROJECT ---
      // currentEditId di sini adalah NAMA PROYEK LAMA (PK)
      console.log(
        `Attempting to UPDATE project with original name: ${currentEditId}`
      );
      // Jika tidak ada gambar baru dipilih (imgResultUrlForServer adalah null),
      // server akan mempertahankan gambar lama. Jika ada, server akan update gambar.
      // Jika nama proyek (PK) diedit, payloadForServer.name akan berisi nama baru.

      fetch(`/api/projects/${encodeURIComponent(currentEditId)}`, {
        // currentEditId = original project name
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectPayload), // Mengirim data lengkap termasuk potensi nama baru & img baru/null
      })
        .then((response) => {
          if (!response.ok) {
            return response.json().then((err) => {
              throw new Error(err.message || `Server error ${response.status}`);
            });
          }
          return response.json();
        })
        .then((data) => {
          alert(data.message || "Proyek berhasil diperbarui di server!");
          fetchAndRenderProjects(); // Muat ulang semua data dari server
        })
        .catch((error) => {
          console.error("Error updating project on server:", error);
          alert(`Gagal memperbarui proyek di server: ${error.message}`);
        });
    } else {
      // --- ADD NEW PROJECT ---
      if (!imgResultUrlForServer) {
        // Harus ada gambar untuk proyek baru
        alert("Gambar wajib diunggah untuk proyek baru.");
        return;
      }
      console.log("Attempting to ADD new project to server");
      fetch("/api/add-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectPayload), // img di sini adalah Base64 gambar baru
      })
        .then((response) => {
          if (!response.ok) {
            return response.json().then((err) => {
              throw new Error(err.message || `Server error ${response.status}`);
            });
          }
          return response.json();
        })
        .then((data) => {
          alert(data.message || "Proyek berhasil ditambahkan ke server!");
          fetchAndRenderProjects(); // Muat ulang semua data dari server
        })
        .catch((error) => {
          console.error("Error adding project to server:", error);
          alert(`Gagal menambahkan proyek ke server: ${error.message}`);
        });
    }

    // Reset form dan mode edit
    e.target.reset();
    document.getElementById("project-image").value = "";
    if (currentEditId) {
      currentEditId = null;
      const submitBtn = e.target.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.textContent = "Submit";
      // document.getElementById("project-name").disabled = false; // Aktifkan lagi jika di-disable
    }
  }; // Akhir processProjectDataWithServer

  // --- Image handling logic ---
  if (imageFile) {
    // Jika ada file dipilih (baik untuk Add maupun Edit dengan gambar baru)
    console.log("Gambar dipilih, memproses dengan FileReader...");
    const reader = new FileReader();
    reader.onload = function (event) {
      console.log(
        "FileReader.onload dipanggil, mengirim hasil ke processProjectDataWithServer."
      );
      processProjectDataWithServer(event.target.result); // Kirim Base64 gambar baru
    };
    reader.onerror = function () {
      console.error("FileReader.onerror dipanggil! Error:", reader.error);
      alert("Gagal membaca file gambar.");
    };
    reader.readAsDataURL(imageFile);
  } else {
    // Jika tidak ada file dipilih
    if (currentEditId) {
      // Mode Edit dan tidak ada file gambar baru dipilih
      console.log(
        "Mode EDIT, tidak ada gambar baru dipilih. Mengirim null sebagai imgResultUrl."
      );
      processProjectDataWithServer(null); // Kirim null, server akan tahu untuk tidak update gambar
    } else {
      // Mode Add dan tidak ada file (seharusnya sudah dicegat validasi sebelumnya)
      alert("Gambar wajib diunggah untuk proyek baru.");
      return;
    }
  }
} // Akhir getData

function truncate(text, max) {
  return text && text.length > max
    ? text.substring(0, max) + "..."
    : text || "";
}

function renderCards() {
  console.log(
    "Fungsi renderCards() dipanggil. Jumlah projects:",
    projects.length
  );
  const container = document.getElementById("cardContainer");
  if (!container) {
    console.error("Elemen #cardContainer TIDAK ditemukan!");
    return;
  }

  if (projects.length === 0) {
    container.innerHTML =
      "<p class='text-center'>Belum ada proyek yang ditambahkan.</p>";
    return;
  }

  // Array 'projects' di sini img-nya adalah Base64 jika dari server atau baru ditambah/diedit.
  // Jika dari localStorage lama (yang tanpa img), p.img akan undefined.
  container.innerHTML = projects
    .map((p) => {
      // Pastikan p.techs ada sebelum diakses
      const techs = p.techs || {};
      const durationDisplay =
        p.duration !== undefined && p.duration !== null
          ? `${p.duration} months`
          : "N/A";
      const projectYear = p.createdAt
        ? new Date(p.createdAt).getFullYear()
        : p.start
        ? new Date(p.start).getFullYear()
        : "Tahun tidak diketahui";

      // JSON.stringify(p) untuk data-project: pastikan p tidak mengandung circular reference
      // Biasanya objek sederhana seperti ini aman.
      let projectDataString = "";
      try {
        projectDataString = JSON.stringify(p);
      } catch (jsonError) {
        console.error(
          "Error stringifying project data for data-project attribute:",
          jsonError,
          p
        );
        projectDataString = JSON.stringify({ name: p.name, id: p.id }); // Fallback
      }

      return `
        <div class="col-md-4 mb-4">
          <div class="card h-100">
            <a href="/list-project/${encodeURIComponent(p.name)}" >
              <img src="${
                p.img || "/asset/placeholder-image.png"
              }" class="card-img-top fixed-img" alt="${
        p.name || "Gambar Proyek"
      }">
            </a>
            <div class="card-body">
              <h5 class="card-title">
                <a href="/list-project/${encodeURIComponent(p.name)}" 
                   class="project-link" 
                   data-project='${projectDataString.replace(/'/g, "&apos;")}'>
                  ${p.name || "Tanpa Nama"} - ${projectYear}
                </a>
              </h5>
              <p class="card-text"><strong>Duration:</strong> ${durationDisplay}</p>
              <p class="card-text">${truncate(p.desc || "", 100)}</p>
              <div class="tech-icons mt-2">
                ${
                  techs.node
                    ? '<img class="tech-icon" src="./asset/node-js.svg" title="Node JS" />'
                    : ""
                }
                ${
                  techs.react
                    ? '<img class="tech-icon" src="./asset/react-js.svg" title="React JS" />'
                    : ""
                }
                ${
                  techs.next
                    ? '<img class="tech-icon" src="./asset/next-js.svg" title="Next JS" />'
                    : ""
                }
                ${
                  techs.typescript
                    ? '<img class="tech-icon" src="./asset/typescript.svg" title="TypeScript" />'
                    : ""
                }
              </div>
            </div>
            <div class="card-footer bg-transparent">
              <div class="d-flex justify-content-between">
                <button id="btn-edit" class="btn btn-sm edit-btn" data-id="${
                  p.name
                }">
                  Edit
                </button>
                <span class="btn-span"></span>
                <button id="btn-delete" class="btn btn-sm delete-btn" data-id="${
                  p.name
                }">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  // Re-attach event listeners
  document.querySelectorAll(".project-link").forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      try {
        const projectData = this.getAttribute("data-project");
        if (projectData) {
          const project = JSON.parse(projectData.replace(/&apos;/g, "'"));
          localStorage.setItem("selectedProject", JSON.stringify(project));
          window.location.href = this.getAttribute("href");
        }
      } catch (parseError) {
        console.error("Error parsing data-project JSON for link:", parseError);
      }
    });
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const projectName = this.getAttribute("data-id"); // Ini adalah nama proyek
      deleteProject(projectName);
    });
  });

  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const projectName = this.getAttribute("data-id"); // Ini adalah nama proyek
      populateFormForEdit(projectName);
    });
  });
}

function deleteProject(projectName) {
  // Parameter diubah menjadi projectName
  if (confirm(`Are you sure you want to delete project "${projectName}"?`)) {
    console.log(`Attempting to DELETE project with name: ${projectName}`);
    fetch(`/api/projects/${encodeURIComponent(projectName)}`, {
      method: "DELETE",
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((err) => {
            throw new Error(err.message || `Server error ${response.status}`);
          });
        }
        return response.json();
      })
      .then((data) => {
        alert(
          data.message ||
            `Proyek "${projectName}" berhasil dihapus dari server.`
        );
        fetchAndRenderProjects(); // Muat ulang semua data dari server
      })
      .catch((error) => {
        console.error("Error deleting project on server:", error);
        alert(`Gagal menghapus proyek di server: ${error.message}`);
      });
  }
}

const projectForm = document.getElementById("project-form");
if (projectForm) {
  projectForm.addEventListener("submit", getData);
} else {
  console.error("Form #project-form TIDAK ditemukan!");
}
