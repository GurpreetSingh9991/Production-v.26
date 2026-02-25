import express from "express";
import { createServer as createViteServer } from "vite";
import archiver from "archiver";
import fs from "fs";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Route to download the project as ZIP
  app.get("/api/download-project", (req, res) => {
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Sets the compression level.
    });

    res.attachment("project.zip");

    archive.on("error", (err) => {
      res.status(500).send({ error: err.message });
    });

    archive.pipe(res);

    // Append files from the root directory, excluding node_modules and other artifacts
    const rootDir = process.cwd();
    const files = fs.readdirSync(rootDir);

    files.forEach((file) => {
      const filePath = path.join(rootDir, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        if (file !== "node_modules" && file !== "dist" && file !== ".git" && file !== ".next") {
          archive.directory(filePath, file);
        }
      } else {
        // Include all files except potentially sensitive ones or large binaries if any
        archive.file(filePath, { name: file });
      }
    });

    archive.finalize();
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving logic
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
