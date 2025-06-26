import React, { useRef, useState, useEffect } from "react";
import { TbSquareToggle, TbPlus } from "react-icons/tb";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import BASE_URL from "../config";

export default function Sidebar({ isOpen, onClose, onNewChat }) {
  const fileInputRef = useRef(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [loggedOut, setLoggedOut] = useState(false);

  useEffect(() => {
    if (loggedOut) navigate("/");
  }, [loggedOut, navigate]);

  const handleLogout = () => {
    Cookies.remove("token");
    setLoggedOut(true);
  };

  const handlePlusClick = () => fileInputRef.current?.click();

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFile(file);
      uploadToS3(file);
    }
  };

  const uploadToS3 = async (file) => {
    const token = Cookies.get("token");
    if (!token) return alert("Authentication token not found. Please sign in.");

    setIsLoading(true);
    try {
      // Step 1: Get presigned URL
      const presignRes = await fetch(`${BASE_URL}/api/v1/uploads/s3`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key: file.name, fileType: file.type }),
      });
      const { data } = await presignRes.json();
      alert("✅ Step 1: Presigned URL retrieved");

      // Step 2: Upload to S3
      const uploadRes = await fetch(data.url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      alert("✅ Step 2: File uploaded to S3");

      // Step 3: Start Textract analysis
      const textractRes = await fetch(`${BASE_URL}/api/v1/textract/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key: data.key }),
      });
      const textractStart = await textractRes.json();
      if (textractStart.status !== 1)
        throw new Error("Textract analysis failed");
      alert("✅ Step 3: Textract analysis started");

      // Step 4: Fetch Textract results
      const resultRes = await fetch(`${BASE_URL}/api/v1/textract/results`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          textJobId: textractStart.data.textJobId,
          analysisJobId: textractStart.data.analysisJobId,
          collectionName: "document_embeddings",
        }),
      });
      const result = await resultRes.json();
      if (result.status !== 1) throw new Error("Textract results failed");
      alert("✅ Step 4: Textract results retrieved");

      // Final success
      alert("🎉 All processing completed successfully!");
    } catch (err) {
      console.error("Upload error:", err);
      alert("❌ An error occurred while uploading or processing the file.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!uploadedFile) return setPreviewUrl(null);
    const url = URL.createObjectURL(uploadedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [uploadedFile]);

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token)
      return (
        setError("Authentication token not found. Please sign in."),
        setLoading(false)
      );

    fetch(`${BASE_URL}/api/v1/uploads/s3`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setItems(Array.isArray(data.data) ? data.data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <aside
      className={`sidebar ${isOpen ? "open" : ""}`}
      style={{
        width: isOpen ? 280 : 0,
        backgroundColor: "#202123",
        color: "white",
        overflow: "hidden",
        transition: "width 0.3s",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        className="sidebar-header"
        style={{
          padding: 16,
          display: "flex",
          justifyContent: "space-between",
          borderBottom: "1px solid #444654",
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "white",
            fontSize: 24,
          }}
        >
          <TbSquareToggle />
        </button>

        <button
          onClick={handlePlusClick}
          style={{
            backgroundColor: "#10a37f",
            border: "none",
            borderRadius: 6,
            color: "white",
            padding: 10,
            fontWeight: "bold",
          }}
        >
          Upload
        </button>

        <input
          ref={fileInputRef}
          type="file"
          style={{ display: "none" }}
          onChange={handleFileChange}
          accept="image/*,application/pdf"
        />
      </div>

      {previewUrl && (
        <div
          style={{
            marginTop: 16,
            padding: 8,
            backgroundColor: "#343541",
            borderRadius: 6,
          }}
        >
          <p style={{ margin: 0, fontWeight: "bold" }}>Document Preview:</p>
          {uploadedFile.type.startsWith("image/") ? (
            <img
              src={previewUrl}
              alt="Preview"
              style={{ maxWidth: "100%", borderRadius: 6, height: 100 }}
            />
          ) : uploadedFile.type === "application/pdf" ? (
            <embed
              src={previewUrl}
              type="application/pdf"
              width="100%"
              height="100px"
            />
          ) : (
            <p>{uploadedFile.name}</p>
          )}
        </div>
      )}

      {isLoading && (
        <div
          style={{
            padding: 16,
            backgroundColor: "#343541",
            color: "white",
            textAlign: "center",
            borderRadius: 6,
          }}
        >
          <div
            className="spinner-border text-light"
            role="status"
            style={{ width: "2.5rem", height: "2.5rem" }}
          ></div>
          <p className="mt-3">⏳ Processing document... Please wait.</p>
        </div>
      )}

      <nav
        className="sidebar-nav"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 12,
          border: "1px solid #ccc",
          borderRadius: 8,
        }}
      >
        {loading ? (
          <div className="text-center mt-3">
            <div
              className="spinner-border text-light"
              role="status"
              style={{ width: "2.5rem", height: "2.5rem" }}
            ></div>
            <p className="mt-3">Loading documents...</p>
          </div>
        ) : error ? (
          <p style={{ color: "red" }}>Error: {error}</p>
        ) : (
          <>
            <h4 style={{ marginBottom: 10, color: "#ccc", fontWeight: "bold" }}>
              Documents
            </h4>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {items.length === 0 && <li>No documents yet</li>}
              {items.map((item, index) => (
                <li
                  key={index}
                  onClick={() => window.open(item.Url, "_blank")}
                  style={{
                    padding: 8,
                    backgroundColor: "black",
                    borderRadius: 4,
                    cursor: "pointer",
                    userSelect: "none",
                    color: "white",
                  }}
                >
                  <p style={{ wordWrap: "break-word", margin: 0 }}>
                    {item.FileName}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>

      <div style={{ padding: 12, borderTop: "1px solid #444654" }}>
        <button
          onClick={() => navigate("/home")}
          style={{
            width: "100%",
            backgroundColor: "#4a90e2",
            border: "none",
            borderRadius: 6,
            color: "white",
            padding: 10,
            fontWeight: "bold",
            marginBottom: 10,
          }}
        >
          Home
        </button>

        <button
          onClick={onNewChat}
          style={{
            width: "100%",
            backgroundColor: "#10a37f",
            border: "none",
            borderRadius: 6,
            color: "white",
            padding: 10,
            fontWeight: "bold",
          }}
        >
          Chat
        </button>
      </div>

      <footer
        style={{
          padding: 16,
          fontSize: 14,
          borderTop: "1px solid #444654",
          textAlign: "center",
        }}
      >
        <div>© 2025 Your Name</div>
        <button
          onClick={handleLogout}
          className="btn btn-outline-light btn-sm mt-2 px-5"
        >
          Logout
        </button>
      </footer>
    </aside>
  );
}
