import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { TbSquareToggle } from "react-icons/tb";
import { FiTrash, FiRefreshCw, FiX } from "react-icons/fi";
import { BiTime, BiTrendingUp, BiMemoryCard } from "react-icons/bi";
import { IoStatsChart } from "react-icons/io5";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import BASE_URL from "../config";

// Constants
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_FILES_PER_UPLOAD = 100;
const ALLOWED_FILE_TYPES = { "application/pdf": "pdf" };

// Toast utility function
const showToast = (message, type = "info") => {
  switch (type) {
    case "success":
      toast.success(message, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      break;
    case "error":
      toast.error(message, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      break;
    case "warning":
      toast.warning(message, {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      break;
    default:
      toast.info(message, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
  }
};

// Hooks
const useUserData = () => {
  return useMemo(() => {
    try {
      const cookie = Cookies.get("user");
      return cookie ? JSON.parse(cookie) : null;
    } catch (err) {
      console.error("Error parsing user:", err);
      return null;
    }
  }, []);
};

const useAPI = () => {
  const getHeaders = useCallback(() => {
    const token = Cookies.get("token");
    if (!token) throw new Error("No token found");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }, []);

  const apiCall = useCallback(
    async (url, options = {}) => {
      const response = await fetch(`${BASE_URL}${url}`, {
        ...options,
        headers: { ...getHeaders(), ...options.headers },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || response.statusText);
      }

      return response.json();
    },
    [getHeaders]
  );

  return { apiCall };
};

const useFileOperations = (setItems, userId) => {
  const { apiCall } = useAPI();

  const refreshFileList = useCallback(async () => {
    if (!userId) throw new Error("Missing userId");
    const data = await apiCall(`/api/v1/users/${userId}/files`);
    setItems(Array.isArray(data.data) ? data.data : []);
  }, [apiCall, setItems, userId]);

  const uploadMultipleFilesToS3 = useCallback(
    async (files, onProgress) => {
      const results = {
        successful: [],
        failed: [],
        total: files.length,
      };

      // Process files in batches to avoid overwhelming the server
      const batchSize = 3; // Process 3 files at a time
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);

        const batchPromises = batch.map(async (file, index) => {
          const globalIndex = i + index;
          try {
            // Validate file
            if (
              !ALLOWED_FILE_TYPES[file.type] ||
              !file.name.toLowerCase().endsWith(".pdf")
            ) {
              throw new Error(`${file.name}: Only PDF files allowed`);
            }

            if (file.size > MAX_FILE_SIZE) {
              throw new Error(`${file.name}: File exceeds 50MB limit`);
            }

            const key = `documents/${file.name}`;

            // Get presigned URL
            const { data } = await apiCall("/api/v1/s3/upload", {
              method: "POST",
              body: JSON.stringify({
                key,
                fileType: file.type,
                expiresIn: 3000,
              }),
            });

            // Upload to S3
            const s3Upload = await fetch(data.url, {
              method: "PUT",
              headers: { "Content-Type": file.type },
              body: file,
            });

            if (!s3Upload.ok) {
              throw new Error(`${file.name}: S3 upload failed`);
            }

            // Process the PDF
            const result = await apiCall("/api/v1/processing/pdf", {
              method: "POST",
              body: JSON.stringify({
                key: data.key,
                collectionName: "document_embeddings",
              }),
            });

            if (result.status !== 1) {
              throw new Error(
                `${file.name}: Processing error - ${result.message}`
              );
            }

            results.successful.push({
              file: file.name,
              key: data.key,
              result,
            });

            // Update progress
            onProgress &&
              onProgress({
                completed: results.successful.length + results.failed.length,
                total: results.total,
                current: file.name,
                status: "success",
              });

            return { success: true, file: file.name };
          } catch (error) {
            results.failed.push({
              file: file.name,
              error: error.message,
            });

            // Update progress
            onProgress &&
              onProgress({
                completed: results.successful.length + results.failed.length,
                total: results.total,
                current: file.name,
                status: "error",
                error: error.message,
              });

            return { success: false, file: file.name, error: error.message };
          }
        });

        // Wait for current batch to complete before processing next batch
        await Promise.all(batchPromises);
      }

      return results;
    },
    [apiCall]
  );

  const deleteFile = useCallback(
    async fileKey => {
      const result = await apiCall("/api/v1/s3", {
        method: "DELETE",
        body: JSON.stringify({ key: fileKey }),
      });

      if (result.status !== 1) throw new Error(result.message);
    },
    [apiCall]
  );

  return { refreshFileList, uploadMultipleFilesToS3, deleteFile };
};

// 📊 Custom hook for metrics - UPDATED to match backend
const useMetrics = () => {
  const { apiCall } = useAPI();
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setMetricsLoading(true);
      const response = await apiCall("/api/v1/chats/metrics");
      console.log("📊 Received metrics:", response.data);
      setMetrics(response.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
      setMetrics(null);
    } finally {
      setMetricsLoading(false);
    }
  }, [apiCall]);

  const clearCache = useCallback(
    async (type = "all") => {
      try {
        await apiCall("/api/v1/chats/clear-cache", {
          method: "POST",
          body: JSON.stringify({ type }),
        });
        // Refresh metrics after clearing cache
        setTimeout(fetchMetrics, 500);
        return true;
      } catch (error) {
        console.error("Failed to clear cache:", error);
        return false;
      }
    },
    [apiCall, fetchMetrics]
  );

  return { metrics, metricsLoading, lastUpdated, fetchMetrics, clearCache };
};

// 📊 Metrics Display Component - Same as before
const MetricsSection = ({
  metrics,
  onRefresh,
  onClearCache,
  loading,
  lastUpdated,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!metrics && !loading) return null;

  const formatTime = ms => {
    if (!ms) return "N/A";
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatMemory = bytes => {
    if (!bytes) return "N/A";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)}MB`;
  };

  const formatPercent = value => {
    if (value === null || value === undefined) return "N/A";
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatUptime = seconds => {
    if (!seconds) return "N/A";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Extract data from backend structure
  const performance = metrics?.performance || {};
  const cache = metrics?.cache || {};
  const system = metrics?.system || {};

  return (
    <div
      style={{
        margin: "12px",
        padding: "12px",
        backgroundColor: "#2a2b32",
        borderRadius: "8px",
        border: "1px solid #3a3b42",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <IoStatsChart style={{ fontSize: "18px", color: "#10a37f" }} />
          <h4 style={{ margin: 0, fontSize: "14px", color: "#e1e1e1" }}>
            Performance
          </h4>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              background: "linear-gradient(135deg, #3a3b42, #4a4b52)",
              border: "none",
              borderRadius: "6px",
              color: "#e1e1e1",
              padding: "6px 12px",
              fontSize: "11px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontWeight: "500",
            }}
            onMouseEnter={e => {
              e.target.style.background =
                "linear-gradient(135deg, #4a4b52, #5a5b62)";
              e.target.style.color = "#fff";
            }}
            onMouseLeave={e => {
              e.target.style.background =
                "linear-gradient(135deg, #3a3b42, #4a4b52)";
              e.target.style.color = "#e1e1e1";
            }}
          >
            {showDetails ? "Hide" : "Details"}
          </button>
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              background: loading
                ? "linear-gradient(135deg, #666, #777)"
                : "linear-gradient(135deg, #10a37f, #0d8a6b)",
              border: "none",
              borderRadius: "6px",
              color: "white",
              padding: "6px 8px",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: loading ? 0.6 : 1,
            }}
            onMouseEnter={e => {
              if (!loading) {
                e.target.style.background =
                  "linear-gradient(135deg, #0d8a6b, #0a7c5f)";
                e.target.style.transform = "scale(1.05)";
              }
            }}
            onMouseLeave={e => {
              if (!loading) {
                e.target.style.background =
                  "linear-gradient(135deg, #10a37f, #0d8a6b)";
                e.target.style.transform = "scale(1)";
              }
            }}
          >
            <FiRefreshCw style={{ fontSize: "12px" }} />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "#888", fontSize: "12px" }}>
          Loading metrics...
        </div>
      ) : (
        <>
          {/* Quick Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              marginBottom: showDetails ? "12px" : "0",
            }}
          >
            <div
              style={{
                backgroundColor: "#1a1b20",
                padding: "8px",
                borderRadius: "6px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#10a37f",
                }}
              >
                {performance.totalRequests || 0}
              </div>
              <div style={{ fontSize: "10px", color: "#aaa" }}>Requests</div>
            </div>
            <div
              style={{
                backgroundColor: "#1a1b20",
                padding: "8px",
                borderRadius: "6px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#4a90e2",
                }}
              >
                {formatPercent(performance.cacheHitRate)}
              </div>
              <div style={{ fontSize: "10px", color: "#aaa" }}>Cache Hits</div>
            </div>
          </div>

          {/* Detailed Stats */}
          {showDetails && (
            <div style={{ fontSize: "12px", color: "#ccc" }}>
              {/* Performance Details */}
              <div style={{ marginBottom: "12px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginBottom: "6px",
                    color: "#e1e1e1",
                    fontWeight: "bold",
                  }}
                >
                  <BiTrendingUp />
                  Performance
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span>Avg Response Time:</span>
                  <span>{formatTime(performance.averageResponseTime)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span>Cache Hit Rate:</span>
                  <span>{formatPercent(performance.cacheHitRate)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span>Total Requests:</span>
                  <span>{performance.totalRequests || 0}</span>
                </div>
              </div>

              {/* Cache Details */}
              <div style={{ marginBottom: "12px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginBottom: "6px",
                    color: "#e1e1e1",
                    fontWeight: "bold",
                  }}
                >
                  <BiMemoryCard />
                  Cache Status
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span>Embeddings:</span>
                  <span>
                    {cache.embeddingCacheSize || 0}/{cache.maxCacheSize || 100}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span>Responses:</span>
                  <span>
                    {cache.responseCacheSize || 0}/{cache.maxCacheSize || 100}
                  </span>
                </div>
              </div>

              {/* System Info */}
              <div style={{ marginBottom: "12px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginBottom: "6px",
                    color: "#e1e1e1",
                    fontWeight: "bold",
                  }}
                >
                  <BiTime />
                  System
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span>Uptime:</span>
                  <span>{formatUptime(system.uptime)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span>Memory Usage:</span>
                  <span>{formatMemory(system.memoryUsage?.rss)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span>Node Version:</span>
                  <span>{system.nodeVersion || "N/A"}</span>
                </div>
              </div>

              {/* Cache Controls */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "12px",
                }}
              >
                <button
                  onClick={() => onClearCache("embedding")}
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, #3a3b42, #4a4b52)",
                    border: "none",
                    borderRadius: "6px",
                    color: "#e1e1e1",
                    padding: "8px 4px",
                    fontSize: "10px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    fontWeight: "500",
                  }}
                  onMouseEnter={e => {
                    e.target.style.background =
                      "linear-gradient(135deg, #4a4b52, #5a5b62)";
                    e.target.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={e => {
                    e.target.style.background =
                      "linear-gradient(135deg, #3a3b42, #4a4b52)";
                    e.target.style.transform = "translateY(0)";
                  }}
                >
                  Clear Embeddings
                </button>
                <button
                  onClick={() => onClearCache("response")}
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, #3a3b42, #4a4b52)",
                    border: "none",
                    borderRadius: "6px",
                    color: "#e1e1e1",
                    padding: "8px 4px",
                    fontSize: "10px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    fontWeight: "500",
                  }}
                  onMouseEnter={e => {
                    e.target.style.background =
                      "linear-gradient(135deg, #4a4b52, #5a5b62)";
                    e.target.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={e => {
                    e.target.style.background =
                      "linear-gradient(135deg, #3a3b42, #4a4b52)";
                    e.target.style.transform = "translateY(0)";
                  }}
                >
                  Clear Responses
                </button>
                <button
                  onClick={() => onClearCache("all")}
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, #d73027, #b71c1c)",
                    border: "none",
                    borderRadius: "6px",
                    color: "white",
                    padding: "8px 4px",
                    fontSize: "10px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    fontWeight: "500",
                  }}
                  onMouseEnter={e => {
                    e.target.style.background =
                      "linear-gradient(135deg, #b71c1c, #a00000)";
                    e.target.style.transform = "translateY(-1px)";
                    e.target.style.boxShadow =
                      "0 4px 8px rgba(215, 48, 39, 0.3)";
                  }}
                  onMouseLeave={e => {
                    e.target.style.background =
                      "linear-gradient(135deg, #d73027, #b71c1c)";
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "none";
                  }}
                >
                  Clear All
                </button>
              </div>

              {/* Last Updated */}
              {lastUpdated && (
                <div
                  style={{
                    textAlign: "center",
                    fontSize: "10px",
                    color: "#666",
                    marginTop: "8px",
                  }}
                >
                  Updated: {lastUpdated.toLocaleTimeString()}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Upload Progress Component
const UploadProgress = ({ progress, onCancel }) => {
  const percentage = progress
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <div
      style={{
        margin: "12px",
        padding: "12px",
        backgroundColor: "#343541",
        borderRadius: "8px",
        border: "1px solid #3a3b42",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <h4 style={{ margin: 0, fontSize: "14px", color: "#e1e1e1" }}>
          📄 Uploading Files
        </h4>
        <button
          onClick={onCancel}
          style={{
            background: "transparent",
            border: "none",
            color: "#ff6b6b",
            cursor: "pointer",
            fontSize: "16px",
            padding: "2px",
          }}
          title="Cancel upload"
        >
          <FiX />
        </button>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          width: "100%",
          height: "8px",
          backgroundColor: "#1a1b20",
          borderRadius: "4px",
          overflow: "hidden",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            backgroundColor: "#10a37f",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* Progress Text */}
      <div style={{ fontSize: "12px", color: "#ccc", textAlign: "center" }}>
        {progress ? (
          <>
            <div>
              {progress.completed} of {progress.total} files ({percentage}%)
            </div>
            {progress.current && (
              <div
                style={{ marginTop: "4px", fontSize: "11px", color: "#aaa" }}
              >
                {progress.status === "error" ? "❌" : "📄"} {progress.current}
                {progress.error && (
                  <div style={{ color: "#ff6b6b", marginTop: "2px" }}>
                    {progress.error}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          "Preparing upload..."
        )}
      </div>
    </div>
  );
};

// File Selection Preview Component
const FileSelectionPreview = ({ files, onRemove, onClearAll }) => {
  if (!files || files.length === 0) return null;

  const formatFileSize = bytes => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div
      style={{
        margin: "12px",
        padding: "8px",
        backgroundColor: "#343541",
        borderRadius: "6px",
        border: "1px solid #3a3b42",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <h5 style={{ margin: 0, fontSize: "12px", color: "#e1e1e1" }}>
          📄 Selected Files ({files.length}/{MAX_FILES_PER_UPLOAD})
        </h5>
        <button
          onClick={onClearAll}
          style={{
            background: "transparent",
            border: "none",
            color: "#ff6b6b",
            cursor: "pointer",
            fontSize: "11px",
            padding: "2px 6px",
          }}
          title="Clear all files"
        >
          Clear All
        </button>
      </div>

      <div style={{ maxHeight: "120px", overflowY: "auto" }}>
        {files.map((file, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "4px 0",
              borderBottom:
                index < files.length - 1 ? "1px solid #2a2b32" : "none",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "11px",
                  color: "#e1e1e1",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={file.name}
              >
                {file.name}
              </div>
              <div style={{ fontSize: "10px", color: "#aaa" }}>
                {formatFileSize(file.size)}
              </div>
            </div>
            <button
              onClick={() => onRemove(index)}
              style={{
                background: "transparent",
                border: "none",
                color: "#ff6b6b",
                cursor: "pointer",
                fontSize: "12px",
                padding: "2px",
                marginLeft: "8px",
              }}
              title="Remove file"
            >
              <FiX />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main Component
export default function Sidebar({ isOpen, onClose, onNewChat }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userData = useUserData();
  const userId = userData?.userId;
  const token = useMemo(() => Cookies.get("token"), []);
  const { refreshFileList, uploadMultipleFilesToS3, deleteFile } =
    useFileOperations(setItems, userId);

  // 📊 Add metrics functionality
  const { metrics, metricsLoading, lastUpdated, fetchMetrics, clearCache } =
    useMetrics();

  const resetFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearSelectedFiles = () => {
    setSelectedFiles([]);
    resetFileInput();
  };

  useEffect(() => {
    if (!token) navigate("/");
  }, [token, navigate]);

  useEffect(() => {
    if (!token || !userId) return;
    const load = async () => {
      setLoading(true);
      try {
        await refreshFileList();
        // 📊 Fetch metrics on load
        await fetchMetrics();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, userId, refreshFileList, fetchMetrics]);

  // 📊 Auto-refresh metrics every 30 seconds
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      fetchMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, [isOpen, fetchMetrics]);

  const handleLogout = () => {
    Cookies.remove("token");
    Cookies.remove("user");
    navigate("/");
  };

  const handlePlusClick = () => {
    if (!isUploading) fileInputRef.current?.click();
  };

  const handleFileChange = event => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Validate file count
    const totalFiles = selectedFiles.length + files.length;
    if (totalFiles > MAX_FILES_PER_UPLOAD) {
      showToast(
        `Maximum ${MAX_FILES_PER_UPLOAD} files allowed. You selected ${totalFiles} files.`,
        "warning"
      );
      resetFileInput();
      return;
    }

    // Validate file types and sizes
    const validFiles = [];
    const invalidFiles = [];

    files.forEach(file => {
      if (file.type !== "application/pdf") {
        invalidFiles.push(`${file.name}: Only PDF files allowed`);
      } else if (file.size > MAX_FILE_SIZE) {
        invalidFiles.push(`${file.name}: File exceeds 50MB limit`);
      } else {
        validFiles.push(file);
      }
    });

    // Show validation errors
    if (invalidFiles.length > 0) {
      showToast(`Invalid files:\n${invalidFiles.join("\n")}`, "error");
    }

    // Add valid files to selection
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      showToast(
        `${validFiles.length} file(s) added to upload queue`,
        "success"
      );
    }

    resetFileInput();
  };

  const handleRemoveFile = index => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadFiles = async () => {
    if (selectedFiles.length === 0) {
      showToast("Please select files to upload", "warning");
      return;
    }

    setIsUploading(true);
    setUploadProgress({ completed: 0, total: selectedFiles.length });

    try {
      const results = await uploadMultipleFilesToS3(
        selectedFiles,
        setUploadProgress
      );

      // Show results
      if (results.successful.length > 0) {
        showToast(
          `✅ ${results.successful.length} file(s) uploaded successfully!`,
          "success"
        );
      }

      if (results.failed.length > 0) {
        const failedList = results.failed
          .map(f => `• ${f.file}: ${f.error}`)
          .join("\n");
        showToast(
          `❌ ${results.failed.length} file(s) failed:\n${failedList}`,
          "error"
        );
      }

      // Refresh file list and metrics
      await refreshFileList();
      setTimeout(fetchMetrics, 1000);

      // Clear selected files
      clearSelectedFiles();
    } catch (err) {
      showToast(`Upload failed: ${err.message}`, "error");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleCancelUpload = () => {
    if (window.confirm("Are you sure you want to cancel the upload?")) {
      setIsUploading(false);
      setUploadProgress(null);
      showToast("Upload cancelled", "info");
    }
  };

  // Updated handleDelete function with proper list refresh and toast messages
  const handleDelete = async (key, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;

    // Set deleting state
    setItems(prev =>
      prev.map(i => (i.Key === key ? { ...i, isDeleting: true } : i))
    );

    try {
      await deleteFile(key);

      // Show success message
      showToast(`File "${name}" deleted successfully!`, "success");

      // Refresh the entire file list from server
      await refreshFileList();

      // Also refresh metrics after successful deletion
      setTimeout(fetchMetrics, 500);
    } catch (err) {
      console.error("Delete error:", err);

      // Show error message
      showToast(`Failed to delete "${name}": ${err.message}`, "error");

      // Reset deleting state on error
      setItems(prev =>
        prev.map(i => (i.Key === key ? { ...i, isDeleting: false } : i))
      );
    }
  };

  const handleFileClick = item => {
    const encodedKey = encodeURIComponent(item.S3Key);
    const url = `https://all-media-139546185096.s3.amazonaws.com/${encodedKey}`;
    window.open(url, "_blank");
  };

  // 📊 Handle cache clearing with user feedback
  const handleClearCache = async type => {
    const success = await clearCache(type);
    if (success) {
      const cacheType = type === "all" ? "All caches" : `${type} cache`;
      showToast(`${cacheType} cleared successfully!`, "success");
    } else {
      showToast("Failed to clear cache. Please try again.", "error");
    }
  };

  if (!token || !userData) return null;

  return (
    <>
      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        toastStyle={{
          backgroundColor: "#2a2b32",
          color: "#e1e1e1",
          border: "1px solid #3a3b42",
        }}
      />

      <aside
        className={`sidebar ${isOpen ? "open" : ""}`}
        style={{
          minWidth: isOpen ? 280 : 0,
          maxWidth: isOpen ? 400 : 0,
          width: isOpen ? "20%" : 0,
          backgroundColor: "#202123",
          color: "#fff",
          transition: "all 0.3s ease",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          resize: isOpen ? "horizontal" : "none",
          position: "relative",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "12px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #444",
            backgroundColor: "#2a2b32",
            minHeight: "56px",
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "linear-gradient(135deg, #3a3b42, #4a4b52)",
              border: "none",
              borderRadius: "8px",
              color: "white",
              fontSize: "20px",
              padding: "8px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={e => {
              e.target.style.background =
                "linear-gradient(135deg, #4a4b52, #5a5b62)";
              e.target.style.transform = "scale(1.05)";
            }}
            onMouseLeave={e => {
              e.target.style.background =
                "linear-gradient(135deg, #3a3b42, #4a4b52)";
              e.target.style.transform = "scale(1)";
            }}
          >
            <TbSquareToggle aria-label="Toggle Sidebar" />
          </button>

          <button
            onClick={handlePlusClick}
            disabled={isUploading}
            aria-label="Select PDF Files"
            style={{
              background: isUploading
                ? "linear-gradient(135deg, #666, #777)"
                : "linear-gradient(135deg, #10a37f, #0d8a6b)",
              border: "none",
              borderRadius: "8px",
              color: "white",
              padding: "10px 16px",
              fontWeight: "600",
              fontSize: "13px",
              cursor: isUploading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              boxShadow: isUploading
                ? "none"
                : "0 2px 8px rgba(16, 163, 127, 0.3)",
              opacity: isUploading ? 0.7 : 1,
            }}
            onMouseEnter={e => {
              if (!isUploading) {
                e.target.style.background =
                  "linear-gradient(135deg, #0d8a6b, #0a7c5f)";
                e.target.style.transform = "translateY(-1px)";
                e.target.style.boxShadow = "0 4px 12px rgba(16, 163, 127, 0.4)";
              }
            }}
            onMouseLeave={e => {
              if (!isUploading) {
                e.target.style.background =
                  "linear-gradient(135deg, #10a37f, #0d8a6b)";
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 2px 8px rgba(16, 163, 127, 0.3)";
              }
            }}
          >
            {isUploading ? "Uploading..." : "📄 Select PDFs"}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            style={{ display: "none" }}
            onChange={handleFileChange}
            accept=".pdf,application/pdf"
            multiple
            disabled={isUploading}
          />
        </div>

        {/* 📊 Metrics Section */}
        <MetricsSection
          metrics={metrics}
          onRefresh={fetchMetrics}
          onClearCache={handleClearCache}
          loading={metricsLoading}
          lastUpdated={lastUpdated}
        />

        {/* File Selection Preview */}
        <FileSelectionPreview
          files={selectedFiles}
          onRemove={handleRemoveFile}
          onClearAll={clearSelectedFiles}
        />

        {/* Upload Button */}
        {selectedFiles.length > 0 && !isUploading && (
          <div style={{ margin: "12px", marginTop: "0" }}>
            <button
              onClick={handleUploadFiles}
              style={{
                width: "100%",
                background: "linear-gradient(135deg, #4a90e2, #357abd)",
                border: "none",
                borderRadius: "8px",
                color: "white",
                padding: "12px 16px",
                fontWeight: "600",
                fontSize: "14px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 2px 8px rgba(74, 144, 226, 0.3)",
              }}
              onMouseEnter={e => {
                e.target.style.background =
                  "linear-gradient(135deg, #357abd, #2e5d87)";
                e.target.style.transform = "translateY(-1px)";
                e.target.style.boxShadow = "0 4px 12px rgba(74, 144, 226, 0.4)";
              }}
              onMouseLeave={e => {
                e.target.style.background =
                  "linear-gradient(135deg, #4a90e2, #357abd)";
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 2px 8px rgba(74, 144, 226, 0.3)";
              }}
            >
              🚀 Upload {selectedFiles.length} File
              {selectedFiles.length > 1 ? "s" : ""}
            </button>
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && uploadProgress && (
          <UploadProgress
            progress={uploadProgress}
            onCancel={handleCancelUpload}
          />
        )}

        {/* File List */}
        <nav style={{ flex: 1, overflowY: "auto", padding: 12 }}>
          <h4 style={{ marginBottom: 10, color: "#ccc" }}>
            PDF Documents ({items.length})
          </h4>

          {loading ? (
            <div className="text-center">
              <div className="spinner-border text-light" role="status" />
              <p>Loading files...</p>
            </div>
          ) : error ? (
            <>
              <p style={{ color: "red" }}>Error: {error}</p>
              <button
                onClick={refreshFileList}
                style={{
                  padding: "8px 16px",
                  background: "linear-gradient(135deg, #10a37f, #0d8a6b)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "500",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={e => {
                  e.target.style.background =
                    "linear-gradient(135deg, #0d8a6b, #0a7c5f)";
                  e.target.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={e => {
                  e.target.style.background =
                    "linear-gradient(135deg, #10a37f, #0d8a6b)";
                  e.target.style.transform = "translateY(0)";
                }}
              >
                Retry
              </button>
            </>
          ) : (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {items.length === 0 ? (
                <li style={{ color: "#888" }}>No PDFs uploaded yet.</li>
              ) : (
                items.map(item => (
                  <li
                    key={item.S3Key}
                    style={{
                      padding: 8,
                      backgroundColor: "#000",
                      borderRadius: 4,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      border: "1px solid #333",
                      opacity: item.isDeleting ? 0.6 : 1,
                    }}
                  >
                    <span
                      onClick={() => handleFileClick(item)}
                      title={item.FileName}
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        cursor: "pointer",
                      }}
                    >
                      📄 {item.FileName}
                    </span>
                    <FiTrash
                      onClick={e => {
                        e.stopPropagation();
                        handleDelete(item.S3Key, item.FileName);
                      }}
                      style={{
                        color: item.isDeleting ? "#666" : "red",
                        cursor: item.isDeleting ? "not-allowed" : "pointer",
                      }}
                      title={item.isDeleting ? "Deleting..." : "Delete file"}
                    />
                  </li>
                ))
              )}
            </ul>
          )}
        </nav>

        {/* Footer Buttons */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid #444",
            gap: "12px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <button
            onClick={() => navigate("/home")}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, #4a90e2, #357abd)",
              border: "none",
              borderRadius: "8px",
              color: "white",
              padding: "12px 16px",
              fontWeight: "600",
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 2px 8px rgba(74, 144, 226, 0.3)",
            }}
            onMouseEnter={e => {
              e.target.style.background =
                "linear-gradient(135deg, #357abd, #2e5d87)";
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 4px 12px rgba(74, 144, 226, 0.4)";
            }}
            onMouseLeave={e => {
              e.target.style.background =
                "linear-gradient(135deg, #4a90e2, #357abd)";
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 2px 8px rgba(74, 144, 226, 0.3)";
            }}
          >
            🏠 Home
          </button>
        </div>

        {/* Logout Footer */}
        <footer
          style={{
            padding: "16px",
            textAlign: "center",
            borderTop: "1px solid #444",
            backgroundColor: "#1a1b20",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#888",
              marginBottom: "12px",
              fontWeight: "500",
            }}
          >
            © 2025 Your Name
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: "linear-gradient(135deg, #666, #555)",
              border: "1px solid #777",
              borderRadius: "8px",
              color: "#e1e1e1",
              padding: "10px 20px",
              fontSize: "13px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.2s ease",
              width: "auto",
              minWidth: "100px",
            }}
            onMouseEnter={e => {
              e.target.style.background = "linear-gradient(135deg, #777, #666)";
              e.target.style.borderColor = "#888";
              e.target.style.color = "#fff";
              e.target.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={e => {
              e.target.style.background = "linear-gradient(135deg, #666, #555)";
              e.target.style.borderColor = "#777";
              e.target.style.color = "#e1e1e1";
              e.target.style.transform = "translateY(0)";
            }}
          >
            🚪 Logout
          </button>
        </footer>
      </aside>
    </>
  );
}
