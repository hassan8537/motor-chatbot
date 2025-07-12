import React, { useRef, useState, useEffect } from "react";
import { TbSquareToggle, TbPlus } from "react-icons/tb";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import BASE_URL from "../config";
import { FiTrash } from "react-icons/fi";

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
      console.log("File details:", { name: file.name, type: file.type, size: file.size });

      // Step 1: Get presigned URL
      const presignRes = await fetch(`${BASE_URL}/api/v1/uploads/s3`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          key: file.name,
          fileType: file.type,
          // Add file size if your backend expects it
          fileSize: file.size
        }),
      });

      if (!presignRes.ok) {
        throw new Error(`Presigned URL request failed: ${presignRes.status}`);
      }

      const presignData = await presignRes.json();
      console.log("Presigned URL response:", presignData);

      const { data } = presignData;

      // Step 2: Upload to S3 - Make sure Content-Type matches exactly
      const uploadRes = await fetch(data.url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
          // Don't add any other headers that might interfere
        },
        body: file,
      });

      console.log("S3 upload response:", uploadRes.status, uploadRes.statusText);

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        console.error("S3 upload error response:", errorText);
        throw new Error(`S3 upload failed: ${uploadRes.status} - ${errorText}`);
      }

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
      if (textractStart.status !== 1) {
        throw new Error("Textract analysis failed");
      }

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
          key: data.key,
        }),
      });

      const result = await resultRes.json();
      if (result.status !== 1) {
        throw new Error("Textract results failed");
      }

      alert("✅ File uploaded and processed successfully!");
      await refreshFileList();
      setUploadedFile(null);
      setPreviewUrl(null);

    } catch (err) {
      console.error("Upload error:", err);
      alert(`❌ Upload failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to refresh the file list
  const refreshFileList = async () => {
    const token = Cookies.get("token");
    if (!token) return;

    try {
      const res = await fetch(`${BASE_URL}/api/v1/uploads/s3`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setItems(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.error("Error refreshing file list:", err);
    }
  };

  // Optimized function to handle file deletion
  const handleDelete = async (fileKey) => {
    const token = Cookies.get("token");
    if (!token) return alert("Authentication token not found. Please sign in.");

    const confirmed = window.confirm("Are you sure you want to delete this file?");
    if (!confirmed) return;

    // Show loading state for the specific item being deleted
    setItems(prevItems =>
      prevItems.map(item =>
        item.Key === fileKey
          ? { ...item, isDeleting: true }
          : item
      )
    );

    try {
      const res = await fetch(`${BASE_URL}/api/v1/uploads/s3`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key: fileKey }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const result = await res.json();

      if (result.status === 1) {
        // Optimistically remove from UI immediately
        setItems(prevItems => prevItems.filter(item => item.Key !== fileKey));
        alert("✅ File deleted successfully");
      } else {
        throw new Error(result.message || "Delete failed");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("❌ Failed to delete file");

      // Revert the loading state on error
      setItems(prevItems =>
        prevItems.map(item =>
          item.Key === fileKey
            ? { ...item, isDeleting: false }
            : item
        )
      );
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
                  style={{
                    padding: 8,
                    backgroundColor: "black",
                    borderRadius: 4,
                    color: "white",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    minHeight: "32px",
                    opacity: item.isDeleting ? 0.7 : 1, // Visual feedback for deleting state
                  }}
                >
                  <span
                    onClick={() => window.open(item.Url, "_blank")}
                    style={{
                      cursor: "pointer",
                      flex: 1,
                      marginRight: 8,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      minWidth: 0,
                    }}
                    title={item.FileName}
                  >
                    {item.FileName}
                  </span>
                  <FiTrash
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.Key);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: item.isDeleting ? "#666" : "red",
                      cursor: item.isDeleting ? "not-allowed" : "pointer",
                      fontSize: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "24px",
                      height: "24px",
                      opacity: item.isDeleting ? 0.5 : 1,
                    }}
                    title={item.isDeleting ? "Deleting..." : "Delete"}
                  />
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