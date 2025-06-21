import React, { useRef, useState, useEffect } from "react";
import { TbSquareToggle, TbPlus } from "react-icons/tb";
import Cookies from "js-cookie";
import { Navigate, useNavigate } from "react-router-dom";

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
    if (loggedOut) {
      navigate("/"); // triggers navigation after state changes
    }
  }, [loggedOut, navigate]);

  const handleLogout = () => {
    Cookies.remove("token");
    setLoggedOut(true);
  };
  const handlePlusClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFile(file);
      uploadToS3(file); // Upload after selecting
    }
  };
  const uploadToS3 = async (file) => {
    const token = Cookies.get("token");

    if (!token) {
      alert("Session expired. Please sign in.");
      return;
    }

    setIsLoading(true); // START loading

    try {
      // Step 1: Get pre-signed URL
      const presignResponse = await fetch(
        "https://ikfwwxazldg56elyxpxqutixd40kiecd.lambda-url.us-east-1.on.aws/api/v1/uploads/s3",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            key: file.name,
            fileType: file.type,
          }),
        }
      );

      const presignData = await presignResponse.json();
      const uploadUrl = presignData?.data?.url;
      const s3Key = presignData?.data?.key;

      if (!uploadUrl || !s3Key) {
        alert("Failed to get upload URL.");
        return;
      }

      // Step 2: Upload to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error("Upload failed:", errorText);
        alert(`❌ Upload failed:\n${errorText}`);
        return;
      }

      // alert(`✅ File "${file.name}" uploaded successfully!`);

      // Step 3: Trigger Textract
      const textractStartRes = await fetch(
        "https://ikfwwxazldg56elyxpxqutixd40kiecd.lambda-url.us-east-1.on.aws/api/v1/textract/start",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ key: s3Key }),
        }
      );

      const textractStartData = await textractStartRes.json();

      if (textractStartData?.status !== 1) {
        console.error("Textract start failed:", textractStartData);
        alert("❌ Textract analysis start failed.");
        return;
      }

      const { analysisJobId, textJobId } = textractStartData.data;

      // Step 4: Fetch Textract Results
      const textractResultsRes = await fetch(
        "https://ikfwwxazldg56elyxpxqutixd40kiecd.lambda-url.us-east-1.on.aws/api/v1/textract/results",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            textJobId,
            analysisJobId,
            collectionName: "document_embeddings",
          }),
        }
      );

      const textractResults = await textractResultsRes.json();

      if (textractResults?.status === 1) {
        alert(`${file?.name} uploaded successfully`);
        console.log("Textract Results:", textractResults.data);
      } else {
        console.error("Failed to get Textract results", textractResults);
        alert("❌ Failed to get Textract results.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("❌ An error occurred while uploading or processing the file.");
    } finally {
      setIsLoading(false); // STOP loading
    }
  };
  useEffect(() => {
    const token = Cookies.get("token");

    if (!token) {
      setError("Authentication token not found. Please sign in.");
      setLoading(false);
      return;
    }

    fetch(
      "https://ikfwwxazldg56elyxpxqutixd40kiecd.lambda-url.us-east-1.on.aws/api/v1/uploads/s3",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((data) => {
        // Assuming data structure has an array inside `data` property:
        setItems(Array.isArray(data.data) ? data.data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // const uploadToS3 = async (file) => {
  //     const token = Cookies.get("token");

  //     if (!token) {
  //         alert("Authentication token not found. Please sign in.");
  //         return;
  //     }

  //     try {
  //         // Step 1: Get pre-signed URL
  //         const presignResponse = await fetch(
  //             "https://ikfwwxazldg56elyxpxqutixd40kiecd.lambda-url.us-east-1.on.aws/api/v1/uploads/s3",
  //             {
  //                 method: "POST",
  //                 headers: {
  //                     "Content-Type": "application/json",
  //                     Authorization: `Bearer ${token}`,
  //                 },
  //                 body: JSON.stringify({
  //                     key: file.name,
  //                     fileType: file.type,
  //                 }),
  //             }
  //         );

  //         const presignData = await presignResponse.json();
  //         const uploadUrl = presignData?.data?.url;
  //         const s3Key = presignData?.data?.key;

  //         if (!uploadUrl || !s3Key) {
  //             alert("Failed to get upload URL.");
  //             return;
  //         }

  //         // Step 2: Upload to S3
  //         const uploadResponse = await fetch(uploadUrl, {
  //             method: "PUT",
  //             headers: {
  //                 "Content-Type": file.type,
  //             },
  //             body: file,
  //         });

  //         if (!uploadResponse.ok) {
  //             const errorText = await uploadResponse.text();
  //             console.error("Upload failed:", errorText);
  //             alert(`❌ Upload failed:\n${errorText}`);
  //             return;
  //         }

  //         alert(`✅ File "${file.name}" uploaded successfully!`);

  //         // Step 3: Trigger Textract jobs
  //         const textractStartRes = await fetch(
  //             "https://ikfwwxazldg56elyxpxqutixd40kiecd.lambda-url.us-east-1.on.aws/api/v1/textract/start",
  //             {
  //                 method: "POST",
  //                 headers: {
  //                     "Content-Type": "application/json",
  //                     Authorization: `Bearer ${token}`,
  //                 },
  //                 body: JSON.stringify({ key: s3Key }),
  //             }
  //         );

  //         const textractStartData = await textractStartRes.json();

  //         if (textractStartData?.status !== 1) {
  //             console.error("Textract start failed:", textractStartData);
  //             alert("❌ Textract analysis start failed.");
  //             return;
  //         }

  //         const { analysisJobId, textJobId } = textractStartData.data;

  //         // Step 4: Fetch Textract Results
  //         const textractResultsRes = await fetch(
  //             "https://ikfwwxazldg56elyxpxqutixd40kiecd.lambda-url.us-east-1.on.aws/api/v1/textract/results",
  //             {
  //                 method: "POST",
  //                 headers: {
  //                     "Content-Type": "application/json",
  //                     Authorization: `Bearer ${token}`,
  //                 },
  //                 body: JSON.stringify({
  //                     textJobId,
  //                     analysisJobId,
  //                     collectionName: "document_embeddings",
  //                 }),
  //             }
  //         );

  //         const textractResults = await textractResultsRes.json();

  //         if (textractResults?.status === 1) {
  //             alert("✅ Textract completed and results retrieved.");
  //             console.log("Textract Results:", textractResults.data);
  //         } else {
  //             console.error("Failed to get Textract results", textractResults);
  //             alert("❌ Failed to get Textract results.");
  //         }

  //     } catch (err) {
  //         console.error("Upload error:", err);
  //         alert("❌ An error occurred while uploading or processing the file.");
  //     }
  // };

  useEffect(() => {
    if (!uploadedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(uploadedFile);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [uploadedFile]);

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
          padding: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #444654",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close sidebar"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "white",
            fontSize: "24px",
            padding: 0,
          }}
        >
          <TbSquareToggle />
        </button>

        <button
          onClick={handlePlusClick}
          aria-label="Add Document"
          style={{
            backgroundColor: "#10a37f",
            border: "none",
            borderRadius: "6px",
            color: "white",
            cursor: "pointer",
            fontSize: "14px",
            padding: 10,
          }}
        >
          Upload PDF
        </button>

        <input
          ref={fileInputRef}
          type="file"
          style={{ display: "none" }}
          onChange={handleFileChange}
          accept="image/*,application/pdf"
        />
      </div>

      {/* Document Preview */}
      {previewUrl && (
        <div
          style={{
            marginTop: "16px",
            padding: "8px",
            backgroundColor: "#343541",
            borderRadius: "6px",
          }}
        >
          <p style={{ margin: "0 0 8px 0", fontWeight: "bold" }}>
            Document Preview:
          </p>

          {uploadedFile.type.startsWith("image/") && (
            <img
              src={previewUrl}
              alt="Preview"
              style={{
                maxWidth: "100%",
                borderRadius: "6px",
                width: "200px",
                height: "100px",
              }}
            />
          )}

          {uploadedFile.type === "application/pdf" && (
            <embed
              src={previewUrl}
              type="application/pdf"
              width="100%"
              height="100px"
            />
          )}

          {!uploadedFile.type.startsWith("image/") &&
            uploadedFile.type !== "application/pdf" && (
              <p>{uploadedFile.name}</p>
            )}
        </div>
      )}
      {isLoading && (
        <div
          style={{
            padding: "16px",
            backgroundColor: "#343541",
            color: "white",
            textAlign: "center",
            borderRadius: "6px",
          }}
        >
          <p>⏳ Processing document... Please wait.</p>
        </div>
      )}

      <nav
        className="sidebar-nav"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px",
          height: "400px", // fixed height for scroll box, adjust as needed
          border: "1px solid #ccc",
          borderRadius: "8px",
        }}
      >
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: "red" }}>Error: {error}</p>}
        {!loading && !error && (
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {items.length === 0 && <li>No items found</li>}
            {items.map((item, index) => (
              <li
                key={index}
                onClick={() => window.open(item.Url, "_blank")}
                style={{
                  padding: "8px",
                  backgroundColor: "black",
                  borderRadius: "4px",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <p
                  style={{
                    width: "190px",
                    wordWrap: "break-word",
                    overflowWrap: "break-word",
                    whiteSpace: "normal",
                    color: "aquamarine", // Optional: to make text visible on black bg
                  }}
                >
                  {item.FileName}
                </p>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <div style={{ padding: "12px", borderTop: "1px solid #444654" }}>
        <button
          onClick={onNewChat}
          style={{
            width: "100%",
            backgroundColor: "#10a37f",
            border: "none",
            borderRadius: "6px",
            color: "white",
            padding: "10px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Chat
        </button>
      </div>

      <footer
        className="sidebar-footer"
        style={{
          padding: "16px",
          fontSize: "14px",
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
