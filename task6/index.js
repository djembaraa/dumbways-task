import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import pool from "./db.js"; // Pastikan path ini benar dan pool diekspor dengan benar

// Inisialisasi __dirname dan __filename untuk ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000; // Atau port pilihan Anda

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" })); // extended:true agar bisa parse nested objects jika perlu
app.use(express.static(path.join(__dirname, "public")));

// Set view engine dan folder views
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "src/views"));

// === ROUTE GET HALAMAN ===
app.get("/home", (req, res) => res.render("index"));
app.get("/my-project", (req, res) => res.render("project"));
app.get("/contact", (req, res) => res.render("contact")); // Merender form kontak
app.get("/contact-after", (req, res) => res.render("contact-after")); // Halaman setelah submit kontak

app.get("/list-project/:projectName", (req, res) => {
  const { projectName } = req.params;
  res.render("list-project", {
    pageTitle: decodeURIComponent(projectName) + " - Detail Proyek",
  });
});

// === API ROUTES UNTUK CRUD PROYEK ===
// READ: Mendapatkan semua proyek
app.get("/api/projects", async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT "project-name" as name, "start-date" as start, "end-date" as end, deskripsi as desc, teknologi, image FROM public.project ORDER BY "project-name" ASC'
    );
    const projectsFromDB = result.rows.map((project) => {
      const p = { ...project };
      if (p.image) {
        p.img = `data:image/jpeg;base64,${Buffer.from(p.image).toString(
          "base64"
        )}`;
      } else {
        p.img = null;
      }
      delete p.image;
      if (p.start && p.end) {
        const startDate = new Date(p.start);
        const endDate = new Date(p.end);
        p.duration = Math.round(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );
      } else {
        p.duration = 0;
      }
      p.techs = {
        node: p.teknologi,
        react: false,
        next: false,
        typescript: false,
      };
      p.id = p.name;
      return p;
    });
    res.json(projectsFromDB);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res
      .status(500)
      .json({ message: "Gagal mengambil data proyek", detail: error.message });
  }
});

// API: Mendapatkan detail satu proyek berdasarkan nama
app.get("/api/project-detail/:projectName", async (req, res) => {
  const { projectName } = req.params;
  try {
    const dbResult = await pool.query(
      'SELECT "project-name" as name, "start-date" as start, "end-date" as end, deskripsi as desc, teknologi, image FROM public.project WHERE "project-name" = $1',
      [projectName]
    );
    if (dbResult.rows.length > 0) {
      const project = { ...dbResult.rows[0] };
      if (project.image) {
        project.img = `data:image/jpeg;base64,${Buffer.from(
          project.image
        ).toString("base64")}`;
      } else {
        project.img = null;
      }
      delete project.image;
      if (project.start && project.end) {
        const startDate = new Date(project.start);
        const endDate = new Date(project.end);
        project.duration = Math.round(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );
      } else {
        project.duration = 0;
      }
      project.techs = {
        node: project.teknologi,
        react: false,
        next: false,
        typescript: false,
      };
      project.id = project.name;
      res.json(project);
    } else {
      res.status(404).json({ message: "Proyek tidak ditemukan" });
    }
  } catch (error) {
    console.error(
      `Error fetching project detail for API "${projectName}":`,
      error
    );
    res.status(500).json({
      message: "Server error saat mengambil detail proyek.",
      detail: error.message,
    });
  }
});

// CREATE: Menambahkan proyek baru
app.post("/api/add-project", async (req, res) => {
  try {
    const { name, start, end, desc, techs, img } = req.body;
    if (!name || !start || !end || !desc || !techs || !img) {
      return res.status(400).json({ message: "Semua field wajib diisi." });
    }
    const projectNameDB = name;
    const startDateDB = new Date(start);
    const endDateDB = new Date(end);
    const deskripsiDB = desc;
    const teknologiDB = !!(
      techs.node ||
      techs.react ||
      techs.next ||
      techs.typescript
    );
    const base64Prefix = /^data:image\/\w+;base64,/;
    if (!base64Prefix.test(img)) {
      return res.status(400).json({ message: "Format gambar tidak valid." });
    }
    const base64ImageData = img.replace(base64Prefix, "");
    const imageBuffer = Buffer.from(base64ImageData, "base64");
    const queryText = `
      INSERT INTO public.project ("project-name", "start-date", "end-date", "deskripsi", "teknologi", "image") 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING "project-name" as name, "start-date" as start, "end-date" as end, deskripsi as desc, teknologi;
    `;
    const values = [
      projectNameDB,
      startDateDB,
      endDateDB,
      deskripsiDB,
      teknologiDB,
      imageBuffer,
    ];
    const result = await pool.query(queryText, values);
    const newProjectData = result.rows[0];
    const projectForClient = {
      ...newProjectData,
      img,
      techs,
      id: newProjectData.name,
    };
    if (projectForClient.start && projectForClient.end) {
      const startDate = new Date(projectForClient.start);
      const endDate = new Date(projectForClient.end);
      projectForClient.duration = Math.round(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
    } else {
      projectForClient.duration = 0;
    }
    res.status(201).json({
      message: "Proyek berhasil ditambahkan!",
      project: projectForClient,
    });
  } catch (error) {
    console.error("Server error saat menambahkan proyek:", error);
    if (error.code === "23505" && error.constraint === "project_pkey") {
      return res
        .status(409)
        .json({ message: `Proyek dengan nama "${req.body.name}" sudah ada.` });
    }
    res.status(500).json({
      message: "Terjadi kesalahan pada server.",
      detail: error.message,
    });
  }
});

// UPDATE: Memperbarui proyek berdasarkan nama (Primary Key)
app.put("/api/projects/:projectName", async (req, res) => {
  try {
    const originalProjectName = req.params.projectName;
    const { name, start, end, desc, techs, img } = req.body;
    if (!name || !start || !end || !desc || !techs) {
      return res.status(400).json({
        message:
          "Field nama, tanggal, deskripsi, dan teknologi wajib diisi untuk update.",
      });
    }
    const newProjectNameDB = name;
    const startDateDB = new Date(start);
    const endDateDB = new Date(end);
    const deskripsiDB = desc;
    const teknologiDB = !!(
      techs.node ||
      techs.react ||
      techs.next ||
      techs.typescript
    );
    let imageQueryPart = "";
    const queryParams = [
      newProjectNameDB,
      startDateDB,
      endDateDB,
      deskripsiDB,
      teknologiDB,
    ];
    if (img && img.startsWith("data:image")) {
      const base64Prefix = /^data:image\/\w+;base64,/;
      if (!base64Prefix.test(img)) {
        return res
          .status(400)
          .json({ message: "Format gambar baru tidak valid." });
      }
      const base64ImageData = img.replace(base64Prefix, "");
      const imageBuffer = Buffer.from(base64ImageData, "base64");
      queryParams.push(imageBuffer);
      imageQueryPart = `, "image" = $${queryParams.length}`;
    }
    queryParams.push(originalProjectName);
    const queryText = `
      UPDATE public.project 
      SET "project-name" = $1, "start-date" = $2, "end-date" = $3, "deskripsi" = $4, "teknologi" = $5 ${imageQueryPart}
      WHERE "project-name" = $${queryParams.length}
      RETURNING "project-name" as name, "start-date" as start, "end-date" as end, deskripsi as desc, teknologi;
    `;
    const result = await pool.query(queryText, queryParams);
    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "Proyek tidak ditemukan untuk diperbarui." });
    }
    const updatedProjectData = result.rows[0];
    const projectForClient = {
      ...updatedProjectData,
      img: img && img.startsWith("data:image") ? img : null,
      techs,
      id: updatedProjectData.name,
    };
    if (projectForClient.start && projectForClient.end) {
      const startDate = new Date(projectForClient.start);
      const endDate = new Date(projectForClient.end);
      projectForClient.duration = Math.round(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
    } else {
      projectForClient.duration = 0;
    }
    res.status(200).json({
      message: "Proyek berhasil diperbarui!",
      project: projectForClient,
    });
  } catch (error) {
    console.error("Server error saat memperbarui proyek:", error);
    if (error.code === "23505") {
      return res.status(409).json({
        message: `Nama proyek "${req.body.name}" mungkin sudah digunakan atau ada konflik kunci.`,
      });
    }
    res.status(500).json({
      message: "Terjadi kesalahan pada server saat update.",
      detail: error.message,
    });
  }
});

// DELETE: Menghapus proyek berdasarkan nama
app.delete("/api/projects/:projectName", async (req, res) => {
  try {
    const { projectName } = req.params;
    const result = await pool.query(
      'DELETE FROM public.project WHERE "project-name" = $1 RETURNING "project-name"',
      [projectName]
    );
    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "Proyek tidak ditemukan untuk dihapus." });
    }
    res
      .status(200)
      .json({ message: `Proyek "${projectName}" berhasil dihapus.` });
  } catch (error) {
    console.error("Server error saat menghapus proyek:", error);
    res.status(500).json({
      message: "Terjadi kesalahan pada server saat delete.",
      detail: error.message,
    });
  }
});

// === ROUTE UNTUK FORM KONTAK ===
app.post("/contact", async (req, res) => {
  console.log(
    "CONTACT FORM - Request diterima di /contact. Method:",
    req.method
  ); // DEBUG
  console.log("CONTACT FORM - Raw req.body:", req.body); // DEBUG: Lihat apa yang diterima server

  try {
    const { name, email, phone, subject, message } = req.body; // 'subject' ada di form, tapi tidak di tabel 'person'

    // Validasi sederhana di server
    if (!name || !email || !phone || !message) {
      console.log(
        "CONTACT FORM - Validasi Gagal: Data form kontak tidak lengkap.",
        req.body
      ); // DEBUG
      return res.status(400).render("contact", {
        errorMessage: "Semua field (nama, email, telepon, pesan) wajib diisi.",
        oldValues: req.body,
      });
    }

    const phoneNumberInt = parseInt(phone, 10);
    if (isNaN(phoneNumberInt)) {
      console.log("CONTACT FORM - Validasi Gagal: Nomor telepon tidak valid.", {
        phone,
      }); // DEBUG
      return res.status(400).render("contact", {
        errorMessage: "Nomor telepon harus berupa angka.",
        oldValues: req.body,
      });
    }
    console.log("CONTACT FORM - Validasi server sukses."); // DEBUG

    const queryText = `
      INSERT INTO public.person (name, email, phone, message) 
      VALUES ($1, $2, $3, $4) 
      RETURNING "Id", name; 
    `;
    const values = [name, email, phoneNumberInt, message]; // 'subject' diabaikan

    console.log("CONTACT FORM - Mencoba insert ke DB. Values:", values); // DEBUG
    const result = await pool.query(queryText, values);
    console.log("CONTACT FORM - Insert DB sukses:", result.rows[0]); // DEBUG

    console.log("CONTACT FORM - Merender halaman contact-after..."); // DEBUG
    res.render("contact-after"); // SUKSES! Render halaman konfirmasi
  } catch (error) {
    console.error(
      "CONTACT FORM - Server error saat menyimpan data kontak:",
      error
    ); // DEBUG: Cetak error lengkap
    res.status(500).render("contact", {
      errorMessage:
        "Terjadi kesalahan teknis di server saat menyimpan data Anda. Silakan coba lagi nanti atau hubungi administrator.",
      oldValues: req.body,
    });
  }
});

// Jalankan server
app.listen(port, () => {
  console.log(`Server berjalan di port ${port}`);
});
